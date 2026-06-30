import React, { useState, useEffect, useRef, useCallback } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { Play, Pause, RotateCcw, RotateCw, Subtitles, Menu } from 'lucide-react';
import './App.css';
import AiExplainPanel from './components/AiExplainPanel';
import StudyControls from './components/StudyControls';
import DictionaryPopover from './components/DictionaryPopover';
import Sidebar from './components/Sidebar';

const API_BASE = 'http://localhost:8000';

function App() {
  const [showsData, setShowsData] = useState({});
  const [selectedShow, setSelectedShow] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [selectedEpisodeId, setSelectedEpisodeId] = useState('');
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [subtitles, setSubtitles] = useState([]);
  const [activeSub, setActiveSub] = useState(null);
  const [pausedSub, setPausedSub] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  
  // Custom Controls and UI Settings
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarTab, setSidebarTab] = useState('script'); // 'script' | 'vocab'
  const [savedVocab, setSavedVocab] = useState([]);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [copyFeedback, setCopyFeedback] = useState(''); // 'raw' | 'prompt' | ''
  const [isSpeedFocused, setIsSpeedFocused] = useState(false);
  const [showEnglish, setShowEnglish] = useState(true);
  const [showVietnamese, setShowVietnamese] = useState(true);
  const [activeSidebarSub, setActiveSidebarSub] = useState(null);
  const [showSubMenu, setShowSubMenu] = useState(false);
  
  // Dictionary lookup state
  const [clickedWord, setClickedWord] = useState(null);
  const [wordDefinition, setWordDefinition] = useState(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });

  // New language learning states
  const [blankLevel, setBlankLevel] = useState(0); // 0, 0.3, 0.5, 1.0
  const [revealBlanked, setRevealBlanked] = useState(false);
  const [autoPauseOnBlank, setAutoPauseOnBlank] = useState(true);
  const [revealedIndices, setRevealedIndices] = useState([]); // indices of blanked words that are revealed
  const [shadowingDelay, setShadowingDelay] = useState(-99); // -99 (off), -2, -1, 0, 1, 3, 5, 7 seconds added to script duration
  const [resumeData, setResumeData] = useState(null); // { time, formatted }
  const [watchedEpisodes, setWatchedEpisodes] = useState([]);
  const [savedSentences, setSavedSentences] = useState(() => {
    const saved = localStorage.getItem('saved_sentences');
    return saved ? JSON.parse(saved) : [];
  });

  const lastSavedTimeRef = useRef(0);

  const [followActiveSubtitleSync, setFollowActiveSubtitleSync] = useState(false); // Chế độ tự động mở / bám theo câu thoại đang chạy
  const [syncingSegment, setSyncingSegment] = useState(null); // Trạng thái câu thoại đang được chỉnh đồng bộ/sửa chữ

  // AI Explain panel state
  const [aiPanel, setAiPanel] = useState(null); // null | { loading: true } | { data: {...} } | { error: '...' }
  const [aiPanelSentence, setAiPanelSentence] = useState(''); // câu đang được giải thích
  const [aiPanelTranslation, setAiPanelTranslation] = useState(''); // bản dịch gốc của câu đang giải thích

  // Drag selection state (word-by-word selection)
  const [dragStartIdx, setDragStartIdx] = useState(null);
  const [dragEndIdx, setDragEndIdx] = useState(null);
  const [dragOccurred, setDragOccurred] = useState(false);
  const startRectRef = useRef(null);
  const justDraggedRef = useRef(false);
  const autoPauseOnBlankRef = useRef(true);
  const revealedIndicesRef = useRef([]);
  const seekTargetRef = useRef(0); // Thời điểm seek cuối cùng — bỏ qua auto-pause với mọi subtitle kết thúc tại/trước đây

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setDragStartIdx(null);
      setDragEndIdx(null);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const handleSaveTimeSync = (segmentIndex, newStart, newEnd, newEnglish, newVietnamese) => {
    if (!currentEpisode) return;
    fetch(`${API_BASE}/api/subtitles/update-segment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        episode_id: currentEpisode.id,
        segment_index: segmentIndex,
        new_start: parseFloat(newStart.toFixed(3)),
        new_end: parseFloat(newEnd.toFixed(3)),
        new_english: newEnglish,
        new_vietnamese: newVietnamese
      }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          // Update local state subtitles to reflect changes instantly without page reload
          setSubtitles(prev => prev.map(sub => {
            if (sub.index === segmentIndex) {
              return { ...sub, start: newStart, end: newEnd, english: newEnglish, vietnamese: newVietnamese };
            }
            return sub;
          }));
          setSyncingSegment(null);
        } else {
          alert('Không thể lưu đồng bộ phụ đề: ' + data.detail);
        }
      })
      .catch(err => {
        console.error('Error updating subtitles:', err);
        alert('Lỗi kết nối khi đồng bộ phụ đề.');
      });
  };

  const saveSentence = (sub) => {
    if (!sub || !currentEpisode) return;
    const newSentence = {
      id: `${currentEpisode.id}_${sub.start}`,
      episodeId: currentEpisode.id,
      episodeTitle: currentEpisode.title,
      english: sub.english,
      vietnamese: sub.vietnamese,
      start: sub.start
    };
    setSavedSentences(prev => {
      if (prev.some(item => item.id === newSentence.id)) return prev;
      const updated = [...prev, newSentence];
      localStorage.setItem('saved_sentences', JSON.stringify(updated));
      return updated;
    });
  };

  const removeSentence = (id) => {
    setSavedSentences(prev => {
      const updated = prev.filter(item => item.id !== id);
      localStorage.setItem('saved_sentences', JSON.stringify(updated));
      return updated;
    });
  };

  const playSavedSentence = (item) => {
    if (currentEpisode && currentEpisode.id !== item.episodeId) {
      handleEpisodeChange(item.episodeId);
      localStorage.setItem('pending_seek_time', item.start.toString());
    } else if (videoRef.current) {
      videoRef.current.currentTime = item.start;
      if (!isPlaying) {
        videoRef.current.play().then(() => setIsPlaying(true));
      }
    }
  };
  // Keydown handling has been consolidated into a single keyboard shortcut handler below.

  const toggleWatched = (epId) => {
    if (!epId) return;
    const isNowWatched = !watchedEpisodes.includes(epId);
    
    // Cập nhật local state nhanh
    setWatchedEpisodes(prev => isNowWatched ? [...prev, epId] : prev.filter(id => id !== epId));
    
    // Gửi đồng bộ lên SQLite Backend
    fetch(`${API_BASE}/api/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        episode_id: epId,
        last_position: 0,
        duration: duration || 0,
        completed: isNowWatched ? 1 : 0
      })
    }).catch(err => console.error("Error toggling watched progress:", err));
  };

  const clearAllVocab = async () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa tất cả từ vựng đã lưu?")) {
      const items = [...savedVocab];
      setSavedVocab([]);
      for (const item of items) {
        try {
          await fetch(`${API_BASE}/api/vocabulary/${encodeURIComponent(item.word)}`, { method: 'DELETE' });
        } catch (err) {
          console.error("Error clearing item:", item.word, err);
        }
      }
    }
  };

  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const lastSubIndexRef = useRef(-1);
  const controlsTimeoutRef = useRef(null);
  const resumeTimeoutRef = useRef(null);
  const lastResetSubIdRef = useRef(null);

  // Fetch episodes on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/episodes`)
      .then(res => res.json())
      .then(data => {
        setShowsData(data);
        
        // Sort keys alphabetically/numerically to avoid random filesystem order
        const showKeys = Object.keys(data).sort();
        if (showKeys.length > 0) {
          // Check localStorage for last watched episode
          const savedLastWatched = localStorage.getItem('last_watched_episode');
          let lastWatched = null;
          try {
            if (savedLastWatched) lastWatched = JSON.parse(savedLastWatched);
          } catch(e) {
            console.error("Error parsing last watched episode:", e);
          }

          let targetShow = showKeys[0];
          let targetSeason = '';
          let targetEpisode = null;

          if (lastWatched && data[lastWatched.showId]) {
            targetShow = lastWatched.showId;
            const seasonKeys = Object.keys(data[targetShow].seasons).sort();
            if (seasonKeys.includes(lastWatched.seasonId)) {
              targetSeason = lastWatched.seasonId;
              const episodes = data[targetShow].seasons[targetSeason].episodes;
              const savedEp = episodes.find(e => e.id === lastWatched.episodeId);
              if (savedEp) {
                targetEpisode = savedEp;
              } else if (episodes.length > 0) {
                targetEpisode = episodes[0];
              }
            }
          }

          // Fallback to first sorted show, season, episode if not restored
          if (!targetSeason || !targetEpisode) {
            const seasonKeys = Object.keys(data[targetShow].seasons).sort();
            if (seasonKeys.length > 0) {
              targetSeason = seasonKeys[0];
              const episodes = data[targetShow].seasons[targetSeason].episodes;
              if (episodes.length > 0) {
                targetEpisode = episodes[0];
              }
            }
          }

          setSelectedShow(targetShow);
          if (targetSeason) setSelectedSeason(targetSeason);
          if (targetEpisode) {
            setSelectedEpisodeId(targetEpisode.id);
            setCurrentEpisode(targetEpisode);
          }
        }
      })
      .catch(err => console.error("Error loading episodes:", err));
  }, []);

  // Save last watched episode details to localStorage
  useEffect(() => {
    if (currentEpisode && selectedShow && selectedSeason) {
      localStorage.setItem('last_watched_episode', JSON.stringify({
        showId: selectedShow,
        seasonId: selectedSeason,
        episodeId: currentEpisode.id
      }));
    }
  }, [currentEpisode, selectedShow, selectedSeason]);

  // Load saved vocabulary and watched progress lists on mount from SQLite database
  useEffect(() => {
    fetch(`${API_BASE}/api/vocabulary`)
      .then(res => res.json())
      .then(json => {
        if (json.status === 'ok') {
          setSavedVocab(json.data);
        }
      })
      .catch(err => console.error("Error loading vocabulary:", err));

    fetch(`${API_BASE}/api/progress/watched`)
      .then(res => res.json())
      .then(json => {
        if (json.status === 'ok') {
          setWatchedEpisodes(json.data);
        }
      })
      .catch(err => console.error("Error loading watched progress:", err));
  }, []);

  // Reset blanking states only when we transition to a different, non-null subtitle segment
  useEffect(() => {
    const subToUse = pausedSub || activeSub;
    if (subToUse) {
      if (lastResetSubIdRef.current !== subToUse.start) {
        lastResetSubIdRef.current = subToUse.start;
        setRevealBlanked(false);
        setRevealedIndices([]);
      }
    }
  }, [activeSub, pausedSub]);

  // Sync refs để tránh stale closure trong handleTimeUpdate
  useEffect(() => { autoPauseOnBlankRef.current = autoPauseOnBlank; }, [autoPauseOnBlank]);
  useEffect(() => { revealedIndicesRef.current = revealedIndices; }, [revealedIndices]);





  const handleShowChange = (showId) => {
    setSelectedShow(showId);
    const seasons = showsData[showId]?.seasons || {};
    const seasonKeys = Object.keys(seasons);
    if (seasonKeys.length > 0) {
      handleSeasonChange(showId, seasonKeys[0]);
    } else {
      setSelectedSeason('');
      setSelectedEpisodeId('');
      setCurrentEpisode(null);
    }
  };

  const handleSeasonChange = (showId, seasonId) => {
    setSelectedSeason(seasonId);
    const eps = showsData[showId]?.seasons[seasonId]?.episodes || [];
    if (eps.length > 0) {
      const firstEpisode = eps[0];
      setSelectedEpisodeId(firstEpisode.id);
      setCurrentEpisode(firstEpisode);
      setIsPlaying(false);
    } else {
      setSelectedEpisodeId('');
      setCurrentEpisode(null);
    }
  };

  const handleEpisodeChange = (episodeId) => {
    setSelectedEpisodeId(episodeId);
    const eps = showsData[selectedShow]?.seasons[selectedSeason]?.episodes || [];
    const ep = eps.find(e => e.id === episodeId);
    if (ep) {
      setCurrentEpisode(ep);
      setIsPlaying(false);
    }
  };

  // Fetch and parse subtitles
  useEffect(() => {
    if (!currentEpisode || !currentEpisode.subtitle_url) return;

    setActiveSub(null);
    setActiveSidebarSub(null);

    fetch(`${API_BASE}${currentEpisode.subtitle_url}`)
      .then(res => res.text())
      .then(text => {
        parseVTT(text);
      })
      .catch(err => console.error("Error loading subtitles:", err));
  }, [currentEpisode]);

  const parseVTT = (vttText) => {
    // Normalize newlines and remove BOM
    vttText = vttText.replace("\ufeff", "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const blocks = vttText.split("\n\n");
    const parsed = [];

    const parseTime = (timeStr) => {
      const parts = timeStr.trim().split(':');
      const secondsParts = parts[2].split('.');
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      const seconds = parseInt(secondsParts[0], 10);
      const ms = parseInt(secondsParts[1], 10) || 0;
      return hours * 3600 + minutes * 60 + seconds + ms / 1000;
    };

    blocks.forEach(block => {
      const lines = block.split("\n");
      if (lines.length >= 2 && lines[1].includes('-->')) {
        const timeLine = lines[1];
        const [startStr, endStr] = timeLine.split('-->');
        
        const textLines = lines.slice(2);
        let english = textLines[0] || '';
        let vietnamese = textLines[1] || '';

        // Clean up broken Unicode replacement characters () caused by source database corruptions
        english = english.replace(/\uFFFD/g, "'");
        vietnamese = vietnamese.replace(/\uFFFD/g, "'");

        parsed.push({
          index: parseInt(lines[0], 10) || parsed.length + 1,
          start: parseTime(startStr),
          end: parseTime(endStr),
          english,
          vietnamese
        });
      }
    });

    // Optimize subtitle timestamps for shadowing experience
    for (let i = 0; i < parsed.length; i++) {
      const current = parsed[i];
      if (i < parsed.length - 1) {
        const next = parsed[i + 1];
        const gap = next.start - current.end;

        if (gap >= 0.5) {
          // Rule 1: Nếu khoảng cách >= 0.5s, kéo dài thêm 0.4s để giữ trọn vẹn âm đuôi
          current.end += 0.4;
        } else {
          // Rule 2 & 3: Nếu hẹp (< 0.5s) hoặc đè chồng, ép sát mép an toàn trước câu kế tiếp
          current.end = next.start - 0.05;
        }
      }
    }

    setSubtitles(parsed);
  };



  // Helper to generate blanked word indices deterministically
  const getBlankedIndices = (text, level) => {
    if (level === 0) return new Set();
    const words = text.split(/(\s+)/);
    const wordIndices = [];
    
    // Proper noun, sound effect, and speaker tag avoidance system
    let isSentenceStart = true;
    let insideBrackets = false;
    let insideParens = false;
    const fillerWords = new Set(['oh', 'hey', 'um', 'uh', 'ah', 'yeah', 'yep', 'okay', 'ok', 'ooh', 'wow']);

    words.forEach((w, idx) => {
      const trimmed = w.trim();
      
      // Update brackets/parentheses state
      if (trimmed.includes('[') || trimmed.includes('{')) {
        insideBrackets = true;
      }
      if (trimmed.includes('(')) {
        insideParens = true;
      }

      const cleanWord = trimmed.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
      if (!cleanWord || !/[a-zA-Z]/.test(cleanWord)) {
        if (/[.!?]/.test(w)) {
          isSentenceStart = true;
        }
        // Update brackets/parentheses state if closed
        if (trimmed.includes(']') || trimmed.includes('}')) {
          insideBrackets = false;
        }
        if (trimmed.includes(')')) {
          insideParens = false;
        }
        return;
      }

      // Check if candidate is speaker tag, inside brackets/parens, proper noun or filler word
      const isSpeakerTag = trimmed.endsWith(':');
      const isI = cleanWord === 'I' || cleanWord.startsWith("I'");
      const startsWithCap = /^[A-Z]/.test(cleanWord);
      const isProperNoun = startsWithCap && !isSentenceStart && !isI;
      const isFiller = fillerWords.has(cleanWord.toLowerCase());

      const shouldExclude = isSpeakerTag || insideBrackets || insideParens || isProperNoun || isFiller;

      if (!shouldExclude) {
        wordIndices.push(idx);
      }

      // Post-word update for closing brackets/parens in case they are attached to the word
      if (trimmed.includes(']') || trimmed.includes('}')) {
        insideBrackets = false;
      }
      if (trimmed.includes(')')) {
        insideParens = false;
      }

      isSentenceStart = false;
    });
    
    const count = Math.ceil(wordIndices.length * level);
    
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const blankedIndices = new Set();
    let attempts = 0;
    while (blankedIndices.size < count && attempts < 100 && wordIndices.length > 0) {
      const pseudoRandomIndex = Math.abs((hash + blankedIndices.size * 31) % wordIndices.length);
      blankedIndices.add(wordIndices[pseudoRandomIndex]);
      attempts++;
    }
    return blankedIndices;
  };

  // Keyboard shortcut handlers (Consolidated and optimized)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts when typing in input, textarea, select, or contenteditable
      const targetTag = e.target?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'SELECT' || targetTag === 'TEXTAREA' || e.target?.isContentEditable) {
        return;
      }

      const video = videoRef.current;
      if (!video) return;

      const subToUse = pausedSub || activeSub;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 's' || e.key === 'S' || e.key === 'r' || e.key === 'R') {
        // Phím S/R: Phát lại câu đang hiển thị — tìm hoàn toàn theo video.currentTime để tránh stale state
        const t = video.currentTime;
        const subToRepeat = subtitles.find(s => t >= s.start && t <= s.end)
          || [...subtitles].reverse().find(s => s.end <= t);
        if (subToRepeat) {
          if (resumeTimeoutRef.current) { clearTimeout(resumeTimeoutRef.current); resumeTimeoutRef.current = null; }
          setPausedSub(null);
          setRevealedIndices([]);
          revealedIndicesRef.current = [];
          seekTargetRef.current = subToRepeat.start; // bỏ qua tất cả subtitle kết thúc tại/trước đầu câu mục tiêu
          lastSubIndexRef.current = subToRepeat.start;
          video.currentTime = subToRepeat.start;
          video.play().then(() => setIsPlaying(true));
        }
      } else if (e.key === 'a' || e.key === 'A') {
        // Phím A: Lùi về câu trước — tìm hoàn toàn theo video.currentTime
        const t = video.currentTime;
        const curSub = subtitles.find(s => t >= s.start && t <= s.end)
          || [...subtitles].reverse().find(s => s.end <= t);
        if (curSub) {
          const idx = subtitles.findIndex(s => s.start === curSub.start);
          if (idx > 0) {
            const targetSub = subtitles[idx - 1];
            if (resumeTimeoutRef.current) { clearTimeout(resumeTimeoutRef.current); resumeTimeoutRef.current = null; }
            setPausedSub(null);
            setRevealedIndices([]);
            revealedIndicesRef.current = [];
            seekTargetRef.current = targetSub.start;
            lastSubIndexRef.current = targetSub.start;
            setActiveSidebarSub(targetSub);
            video.currentTime = targetSub.start;
            video.play().then(() => setIsPlaying(true));
          }
        }
      } else if (e.key === 'd' || e.key === 'D') {
        // Phím D: Tiến câu tiếp theo — tìm hoàn toàn theo video.currentTime
        const t = video.currentTime;
        const curSub = subtitles.find(s => t >= s.start && t <= s.end)
          || [...subtitles].reverse().find(s => s.end <= t);
        if (curSub) {
          const idx = subtitles.findIndex(s => s.start === curSub.start);
          if (idx !== -1 && idx < subtitles.length - 1) {
            const targetSub = subtitles[idx + 1];
            if (resumeTimeoutRef.current) { clearTimeout(resumeTimeoutRef.current); resumeTimeoutRef.current = null; }
            setPausedSub(null);
            setRevealedIndices([]);
            revealedIndicesRef.current = [];
            seekTargetRef.current = targetSub.start;
            lastSubIndexRef.current = targetSub.start;
            setActiveSidebarSub(targetSub);
            video.currentTime = targetSub.start;
            video.play().then(() => setIsPlaying(true));
          }
        }
      } else if (e.key === 'ArrowLeft') {
        video.currentTime = Math.max(0, video.currentTime - 10);
      } else if (e.key === 'ArrowRight') {
        video.currentTime = Math.min(duration, video.currentTime + 10);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        if (subToUse) {
          const blankedSet = getBlankedIndices(subToUse.english, blankLevel);
          const blankedArray = Array.from(blankedSet).sort((a, b) => a - b);
          
          if (blankedArray.length > 0) {
            const currentRevealed = revealedIndicesRef.current;
            const allRevealed = blankedArray.every(idx => currentRevealed.includes(idx));
            if (allRevealed) {
              // If all are already revealed, pressing Tab again resumes the video!
              if (video && video.paused) {
                setPausedSub(null); // clear lock before playing
                video.play().then(() => setIsPlaying(true));
              }
            } else {
              // Otherwise, reveal the next word (updating ref synchronously to prevent race conditions on fast tab)
              const nextToReveal = blankedArray.find(idx => !currentRevealed.includes(idx));
              if (nextToReveal !== undefined) {
                const nextIndices = [...currentRevealed, nextToReveal];
                revealedIndicesRef.current = nextIndices;
                setRevealedIndices(nextIndices);
              }
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSub, pausedSub, subtitles, duration, blankLevel, activeSidebarSub]);

  // Netflix-style control bar auto-hide
  const handleMouseMove = () => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (!isSpeedFocused) {
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying) {
          setControlsVisible(false);
        }
      }, 2500);
    }
  };

  useEffect(() => {
    if (isSpeedFocused) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      setControlsVisible(true);
    }
  }, [isSpeedFocused]);

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  // Auto-scroll sidebar script to keep the active subtitle in center/viewport
  useEffect(() => {
    if (activeSidebarSub && sidebarTab === 'script') {
      const activeEl = document.querySelector('.transcript-item.active');
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }

      // Tự động đồng bộ và hiển thị panel chỉnh sửa nếu bật Auto-sync Edit
      if (followActiveSubtitleSync) {
        setSyncingSegment({
          index: activeSidebarSub.index,
          start: activeSidebarSub.start,
          end: activeSidebarSub.end,
          english: activeSidebarSub.english,
          vietnamese: activeSidebarSub.vietnamese
        });
      }
    }
  }, [activeSidebarSub, sidebarTab, followActiveSubtitleSync]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const time = video.currentTime;
    setCurrentTime(time);

    // Save watch progress to SQLite backend using debounced rule (every 5 seconds)
    if (currentEpisode && video.duration && Math.abs(time - lastSavedTimeRef.current) >= 5) {
      lastSavedTimeRef.current = time;
      
      const totalDuration = video.duration;
      const isCompleted = (time > totalDuration - 30) || (time / totalDuration > 0.95);
      const isNearStart = time < 10;
      
      const savePosition = (isCompleted || isNearStart) ? 0 : time;
      
      // Update local completed state visually
      if (isCompleted && !watchedEpisodes.includes(currentEpisode.id)) {
        setWatchedEpisodes(prev => [...prev, currentEpisode.id]);
      }

      fetch(`${API_BASE}/api/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episode_id: currentEpisode.id,
          last_position: parseFloat(savePosition.toFixed(3)),
          duration: parseFloat(totalDuration.toFixed(3)),
          completed: isCompleted ? 1 : 0
        })
      }).catch(err => console.error("Error auto-saving watch progress:", err));
    }

    const current = subtitles.find(s => time >= s.start && time <= s.end);
    // Keep displaying the ended subtitle for a tiny window (50ms) to ensure smooth transition
    const justEnded = subtitles.find(s => time >= s.end && time < s.end + 0.05);

    if (justEnded) {
      setActiveSub(justEnded);
    } else if (current) {
      setActiveSub(current);
      // Chỉ cập nhật tiêu điểm Sidebar kịch bản khi video đang phát thực tế
      if (video && !video.paused) {
        setActiveSidebarSub(current);
      }
    } else {
      setActiveSub(null);
    }

    // Shadowing / Auto-pause: check if any subtitle has just ended
    const shouldPause = (Number(shadowingDelay) !== -99);
    if (shouldPause) {
      const endedSub = subtitles.find(s => time >= s.end && time <= s.end + 0.5);
      // Bỏ qua mọi subtitle kết thúc tại/trước thời điểm seek — tránh false trigger khi replay
      if (endedSub && endedSub.end > seekTargetRef.current && lastSubIndexRef.current !== endedSub.end) {
        lastSubIndexRef.current = endedSub.end;
        setPausedSub(endedSub);
        setActiveSidebarSub(endedSub);
        video.pause();
        setIsPlaying(false);

        // Check if there are blanked words and auto-pause is enabled via shadowingDelay
        if (blankLevel > 0) {
          const blankedSet = getBlankedIndices(endedSub.english, blankLevel);
          if (blankedSet.size > 0) {
            const blankedArray = Array.from(blankedSet);
            const allRevealed = blankedArray.every(idx => revealedIndicesRef.current.includes(idx));
            if (!allRevealed) {
              // Phải nhấn Tab hoặc click giải đố hết các ô trống thì video mới chạy tiếp
              return;
            }
          }
        }

        // Nếu là mức 0% (Chỉ dừng giải đố đục lỗ)
        if (Number(shadowingDelay) === 0) {
          setPausedSub(null);
          video.play().then(() => setIsPlaying(true));
          return;
        }

        // Nếu dừng tự nói là Dừng hẳn
        if (Number(shadowingDelay) === 999) {
          return;
        }

        // Tính thời gian dừng theo tỷ lệ % độ dài câu thoại (ví dụ: shadowingDelay = 0.5 tương đương 50% độ dài câu thoại)
        const segmentDuration = endedSub.end - endedSub.start;
        const totalPauseSeconds = Math.max(0.5, segmentDuration * shadowingDelay);

        if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
        resumeTimeoutRef.current = setTimeout(() => {
          if (videoRef.current) {
            setPausedSub(null);
            videoRef.current.play().then(() => setIsPlaying(true));
          }
        }, totalPauseSeconds * 1000);
        return;
      }
    }
  };

  // ─── AI Explain ─────────────────────────────────────────────────────────────
  const handleAiExplain = async (sub, focusWord = '') => {
    if (!sub) return;
    const sentence = sub.english;
    const vietnamese = sub.vietnamese || '';
    setAiPanelSentence(sentence);
    setAiPanelTranslation(vietnamese);
    setAiPanel({ 
      loading: true, 
      segmentIndex: sub.index,
      start: sub.start,
      end: sub.end,
      english: sub.english
    });
    try {
      const res = await fetch(`${API_BASE}/api/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentence, vietnamese, word: focusWord }),
      });
      if (res.status === 429) {
        setAiPanel(prev => ({ ...prev, loading: false, error: 'Đã hết quota Gemini hôm nay 😅 Thử lại ngày mai nhé!' }));
        return;
      }
      if (!res.ok) throw new Error('Lỗi server');
      const json = await res.json();
      setAiPanel(prev => ({ ...prev, loading: false, data: json.data }));
    } catch (err) {
      setAiPanel(prev => ({ ...prev, loading: false, error: 'Không kết nối được với AI. Kiểm tra backend đang chạy chưa?' }));
    }
  };

  const handleApplyAiTranslation = (segmentIndex, start, end, english, newTranslation) => {
    if (!currentEpisode) return;
    fetch(`${API_BASE}/api/subtitles/update-segment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        episode_id: currentEpisode.id,
        segment_index: segmentIndex,
        new_start: start,
        new_end: end,
        new_english: english,
        new_vietnamese: newTranslation
      }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          // Cập nhật state subtitles ngay lập tức để đồng bộ UI
          setSubtitles(prev => prev.map(sub => {
            if (sub.index === segmentIndex) {
              return { ...sub, vietnamese: newTranslation };
            }
            return sub;
          }));
          
          // Cập nhật UI hiển thị dòng Dịch gốc trong video/panel phụ đề
          setAiPanelTranslation(newTranslation);
          
          // Cập nhật trạng thái nút đã áp dụng
          setAiPanel(prev => ({
            ...prev,
            applied: true
          }));
        } else {
          alert('Không thể áp dụng dịch nghĩa AI: ' + data.detail);
        }
      })
      .catch(err => {
        console.error('Error applying AI translation:', err);
        alert('Lỗi kết nối khi thay đổi phụ đề.');
      });
  };

  // Helper đơn giản để parse in đậm (**) và in nghiêng (*) từ text trả về của AI
  const parseMarkdown = (text) => {
    if (!text) return '';
    
    // Nếu text là Object/Array (do Gemini trả về sai định dạng)
    if (typeof text !== 'string') {
      try {
        if (typeof text === 'object') {
          // Chuyển object {key: value} thành dạng danh sách dòng có dấu đầu dòng "• key: value"
          text = Object.entries(text)
            .map(([k, v]) => `• **${k}**: ${v}`)
            .join('\n');
        } else {
          text = String(text);
        }
      } catch (e) {
        text = String(text);
      }
    }

    // Xử lý **text** -> <strong>text</strong>
    let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Xử lý *text* -> <em>text</em>
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Xử lý xuống dòng thành thẻ <br/>
    html = html.replace(/\n/g, '<br/>');
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  const togglePlay = (e) => {
    // Nếu popover đang hiển thị, click vào video chỉ đóng popover chứ không pause/play video
    if (clickedWord) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      handleClosePopover(e, true);
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    // Clear any active resume timeouts
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
      
      // Lưu tiến độ ngay lập tức khi tạm dừng
      if (currentEpisode && video.duration) {
        const time = video.currentTime;
        const totalDuration = video.duration;
        const isCompleted = (time > totalDuration - 30) || (time / totalDuration > 0.95);
        const isNearStart = time < 10;
        const savePosition = (isCompleted || isNearStart) ? 0 : time;
        lastSavedTimeRef.current = time;

        fetch(`${API_BASE}/api/progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            episode_id: currentEpisode.id,
            last_position: parseFloat(savePosition.toFixed(3)),
            duration: parseFloat(totalDuration.toFixed(3)),
            completed: isCompleted ? 1 : 0
          })
        }).catch(err => console.error("Error saving progress on pause:", err));
      }
    } else {
      setPausedSub(null); // clear lock on manual play
      video.play().then(() => setIsPlaying(true));
      handleClosePopover();
    }
  };

  const skipTime = (amount) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + amount));
    }
  };

  const changeSpeed = (speed) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleClosePopover = (e, force = false) => {
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      if (!force) return;
    }

    // Nếu force = true (bấm nút đóng), bỏ qua các kiểm tra để đóng ngay lập tức
    if (!force) {
      const selectedText = window.getSelection().toString().trim();
      if (selectedText) {
        return;
      }

      // Nếu click bên trong dictionary popover, bỏ qua không đóng
      if (e && e.target && e.target.closest('.dictionary-popover')) {
        return;
      }
    }

    setClickedWord(null);
    setWordDefinition(null);
    try {
      window.getSelection().removeAllRanges(); // Xóa bôi đen lựa chọn chữ
    } catch (err) {}
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  };

  const translateAndShowPopover = (text, rect) => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();

    if (videoRef.current) {
      videoRef.current.playbackRate = 0.5; // Giảm tốc độ xuống 0.5x khi tra cứu
    }

    // Giới hạn để popover không lệch ra ngoài biên trái/phải của màn hình video
    const popoverLeft = rect.left - containerRect.left + rect.width / 2;
    const clampedLeft = Math.max(135, Math.min(containerRect.width - 135, popoverLeft));

    setPopoverPos({
      top: rect.top - containerRect.top,
      left: clampedLeft
    });

    setClickedWord(text);
    setWordDefinition(null);

    fetch(`${API_BASE}/api/translate?word=${encodeURIComponent(text)}`)
      .then(res => res.json())
      .then(data => {
        setWordDefinition(data);
      })
      .catch(err => {
        console.error("Translate error:", err);
        setWordDefinition({
          word: text,
          translation: "Không tìm thấy nghĩa",
          ipa: text.includes(" ") ? "" : `/${text}/`,
          part_of_speech: text.includes(" ") ? "phrase" : "N/A"
        });
      });
  };

  const saveWord = () => {
    if (!wordDefinition) return;
    const updated = [...savedVocab];
    if (!updated.some(item => item.word === wordDefinition.word)) {
      updated.push(wordDefinition);
      setSavedVocab(updated);
      
      // Gửi lên SQLite backend
      fetch(`${API_BASE}/api/vocabulary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: wordDefinition.word,
          ipa: wordDefinition.ipa || '',
          translation: wordDefinition.translation,
          part_of_speech: wordDefinition.part_of_speech || null,
          audio_url: wordDefinition.audio_url || null
        })
      }).catch(err => console.error("Error saving vocab to SQLite:", err));
    }
    handleClosePopover();
  };

  const removeWord = (word) => {
    const updated = savedVocab.filter(item => item.word !== word);
    setSavedVocab(updated);
    
    // Gửi DELETE request lên SQLite backend
    fetch(`${API_BASE}/api/vocabulary/${encodeURIComponent(word)}`, {
      method: 'DELETE'
    }).catch(err => console.error("Error deleting vocab from SQLite:", err));
  };

  const formatTime = (timeInSecs) => {
    const mins = Math.floor(timeInSecs / 60);
    const secs = Math.floor(timeInSecs % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTimelineClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const clickPercentage = Math.max(0, Math.min(1, clickX / width));
    const targetTime = clickPercentage * duration;
    
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
      
      // Update pausedSub immediately if the video is paused
      if (videoRef.current.paused) {
        const newSub = subtitles.find(s => targetTime >= s.start && targetTime <= s.end);
        setPausedSub(newSub || null);
      }
    }
  };

  const renderCleanWords = (lineText) => {
    const words = lineText.split(/(\s+)/);
    const blankedIndices = getBlankedIndices(lineText, blankLevel);
    
    // Tìm phạm vi đang được kéo chọn từ (word-by-word drag selection)
    const isSelecting = dragStartIdx !== null && dragEndIdx !== null;
    const minIdx = isSelecting ? Math.min(dragStartIdx, dragEndIdx) : -1;
    const maxIdx = isSelecting ? Math.max(dragStartIdx, dragEndIdx) : -1;

    return words.map((chunk, idx) => {
      if (chunk.trim() === '') return chunk;
      
      const cleanWord = chunk.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"]/g, "");
      const isBlankedWord = blankedIndices.has(idx);
      const isCurrentlyRevealed = revealedIndices.includes(idx);
      
      const displayChunk = (isBlankedWord && !isCurrentlyRevealed)
        ? chunk.replace(/[a-zA-Z]/g, "_")
        : chunk;
         
      const isShowingPlaceholder = isBlankedWord && !isCurrentlyRevealed;
      const isSelected = isSelecting && idx >= minIdx && idx <= maxIdx;

      return (
        <span 
          key={idx} 
          className={`word-span ${isBlankedWord ? 'blanked' : ''} ${isCurrentlyRevealed && isBlankedWord ? 'revealed' : ''} ${isSelected ? 'word-selected' : ''}`}
          onMouseDown={(e) => {
            if (isShowingPlaceholder) return;
            e.preventDefault();
            e.stopPropagation();
            setDragStartIdx(idx);
            setDragEndIdx(idx);
            setDragOccurred(false);
            startRectRef.current = e.currentTarget.getBoundingClientRect();
          }}
          onMouseEnter={() => {
            if (dragStartIdx !== null) {
              setDragEndIdx(idx);
              setDragOccurred(true);
            }
          }}
          onMouseUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (dragStartIdx !== null && dragEndIdx !== null && dragOccurred) {
              const start = Math.min(dragStartIdx, dragEndIdx);
              const end = Math.max(dragStartIdx, dragEndIdx);
              
              const selectedChunks = words.slice(start, end + 1);
              const selectedText = selectedChunks.join('').trim();
              const cleanText = selectedText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"]/g, "");
              
              const endRect = e.currentTarget.getBoundingClientRect();
              const startRect = startRectRef.current || endRect;
              
              const unionRect = {
                left: Math.min(startRect.left, endRect.left),
                top: Math.min(startRect.top, endRect.top),
                right: Math.max(startRect.right, endRect.right),
                bottom: Math.max(startRect.bottom, endRect.bottom)
              };
              unionRect.width = unionRect.right - unionRect.left;
              unionRect.height = unionRect.bottom - unionRect.top;
              
              justDraggedRef.current = true;
              translateAndShowPopover(cleanText, unionRect);
            }
            setDragStartIdx(null);
            setDragEndIdx(null);
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (isShowingPlaceholder) {
              const nextIndices = [...revealedIndicesRef.current, idx];
              revealedIndicesRef.current = nextIndices;
              setRevealedIndices(nextIndices);
            } else if (!dragOccurred) {
              // Nếu chỉ click bình thường vào một từ (không phải kéo thả để chọn cụm từ)
              const rect = e.currentTarget.getBoundingClientRect();
              translateAndShowPopover(cleanWord, rect);
            }
            setDragOccurred(false);
          }}
          title={isShowingPlaceholder ? "Click to reveal" : "Click to translate / Hold & drag to select phrase"}
        >
          {displayChunk}
        </span>
      );
    });
  };
 
  const handleSubtitleMouseUp = (e) => {
    e.stopPropagation();
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    if (!selectedText) return;
 
    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const cleanText = selectedText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"]/g, "");
      if (cleanText) {
        justDraggedRef.current = true;
        translateAndShowPopover(cleanText, rect);
      }
    } catch (err) {
      console.error("Error getting selection rect:", err);
    }
  };

  const handleCopySubtitle = (sub, index, type) => {
    if (!sub) return;

    let textToCopy = '';
    if (type === 'raw') {
      textToCopy = sub.english;
    } else if (type === 'prompt') {
      const prevSub = index > 0 ? subtitles[index - 1] : null;
      const nextSub = index < subtitles.length - 1 ? subtitles[index + 1] : null;

      let contextText = '';
      if (prevSub) contextText += `- Câu thoại trước đó: "${prevSub.english}"\n`;
      contextText += `- Câu thoại cần học: "${sub.english}" (Hãy tập trung giải thích chính xác câu này)\n`;
      if (nextSub) contextText += `- Câu thoại tiếp sau: "${nextSub.english}"\n`;

      textToCopy = `Tôi đang xem phim và muốn học câu thoại này:\n"${sub.english}"\n\nDưới đây là ngữ cảnh đoạn hội thoại xung quanh để bạn hiểu rõ hoàn cảnh:\n${contextText}\nHãy đóng vai một Gia sư Tiếng Anh thân thiện, phân tích súc tích câu thoại cần học ở trên theo cấu trúc phân cấp (markdown) chính xác dưới đây (tổng cộng dưới 130 từ, tuyệt đối không viết tràn lan):\n\n### 1. Ý nghĩa & Ngữ cảnh\n- **Nghĩa**: [Giải nghĩa đơn giản, thực tế]\n- **Sắc thái**: [Thân mật / Trang trọng / Mỉa mai (Sarcastic) / Tiếng lóng (Slang)...]\n\n### 2. Từ khóa & Cấu trúc chính\n- **[Cụm từ đáng học]**: [Giải thích nhanh cụm từ hoặc cấu trúc dùng trong câu]\n\n### 3. Cách nói tương đương tự nhiên\n- "[Câu tiếng Anh thay thế ngắn gọn, thông dụng]"\n\n---\n*👉 Thử thách học tập:* Hãy đặt 1 câu sử dụng cấu trúc trên và gửi cho tôi để tôi kiểm tra giúp bạn nhé!`;
    }

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopyFeedback(`${sub.start}_${type}`);
      setTimeout(() => setCopyFeedback(''), 1500);
    }).catch(err => {
      console.error("Failed to copy text:", err);
    });
  };

  return (
    <div className="app-container" onClick={handleClosePopover}>

      {/* Main Content */}
      <div className="main-content">
        {/* Player Area */}
        <div className="player-column">
          <div 
            ref={containerRef}
            className="video-container"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => isPlaying && !isSpeedFocused && setControlsVisible(false)}
          >
            {currentEpisode && (
              <video
                ref={videoRef}
                src={`${API_BASE}${currentEpisode.video_url}`}
                onTimeUpdate={handleTimeUpdate}
                onDurationChange={() => setDuration(videoRef.current?.duration || 0)}
                onClick={togglePlay}
                onPlay={() => {
                  setIsPlaying(true);
                  setPausedSub(null);
                  if (videoRef.current) videoRef.current.playbackRate = playbackSpeed;
                }}
                onPause={() => {
                  setIsPlaying(false);
                  if (videoRef.current && activeSub) {
                    setPausedSub(activeSub);
                  }
                }}
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    videoRef.current.playbackRate = playbackSpeed;
                    const pendingSeek = localStorage.getItem('pending_seek_time');
                    if (pendingSeek) {
                      const seekTime = parseFloat(pendingSeek);
                      videoRef.current.currentTime = seekTime;
                      localStorage.removeItem('pending_seek_time');
                      videoRef.current.play().then(() => setIsPlaying(true));
                      return;
                    }
                    // Fetch watch progress from SQLite backend
                    fetch(`${API_BASE}/api/progress/${encodeURIComponent(currentEpisode.id)}`)
                      .then(res => res.json())
                      .then(json => {
                        if (json.status === 'ok' && json.data) {
                          const savedTime = json.data.last_position;
                          if (savedTime && savedTime > 10 && !json.data.completed) {
                            videoRef.current.currentTime = savedTime;
                            lastSavedTimeRef.current = savedTime;
                            setResumeData({ time: savedTime, formatted: formatTime(savedTime) });
                            setTimeout(() => setResumeData(null), 6000);
                          }
                        }
                      })
                      .catch(err => console.error("Error loading resume time:", err));
                  }
                }}
                onEnded={() => {
                  if (currentEpisode) {
                    setWatchedEpisodes(prev => {
                      const updated = prev.includes(currentEpisode.id) ? prev : [...prev, currentEpisode.id];
                      localStorage.setItem('watched_episodes', JSON.stringify(updated));
                      return updated;
                    });
                  }
                }}
              />
            )}

            {resumeData && (
              <div className="resume-toast-banner" onClick={(e) => e.stopPropagation()}>
                <span>Đã khôi phục vị trí cũ: {resumeData.formatted}</span>
                <button className="btn-resume-restart" onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = 0;
                    const saved = localStorage.getItem('resume_positions');
                    if (saved) {
                      const positions = JSON.parse(saved);
                      delete positions[currentEpisode.id];
                      localStorage.setItem('resume_positions', JSON.stringify(positions));
                    }
                  }
                  setResumeData(null);
                }}>
                  Xem lại từ đầu
                </button>
              </div>
            )}

            {/* Cinematic Overlay Gradient top/bottom */}
            <div className={`cinematic-overlay-top ${controlsVisible ? 'visible' : ''}`} />
            <div className={`cinematic-overlay-bottom ${controlsVisible ? 'visible' : ''}`} />

            {/* Custom Subtitles Overlay */}
            {(pausedSub || activeSub) && (showEnglish || showVietnamese) && (
              <div className="subtitles-overlay" onMouseUp={handleSubtitleMouseUp}>
                {showEnglish && (
                  <div className="sub-english">
                    {renderCleanWords((pausedSub || activeSub).english)}
                  </div>
                )}
                {showVietnamese && (
                  <div className="sub-vietnamese">
                    {(pausedSub || activeSub).vietnamese}
                  </div>
                )}
              </div>
            )}

            {/* Dictionary Definition Popover */}
            <DictionaryPopover 
              clickedWord={clickedWord}
              popoverPos={popoverPos}
              wordDefinition={wordDefinition}
              handleClosePopover={handleClosePopover}
              saveWord={saveWord}
            />

            {/* Big center play icon when paused */}
            {!isPlaying && (
              <div className="center-play-button" onClick={togglePlay}>
                <Play size={48} fill="#fff" />
              </div>
            )}

            {/* Video Controls overlay */}
            <div className={`progress-bar-container ${controlsVisible ? 'visible' : ''}`} onClick={handleTimelineClick}>
              <div 
                className="progress-bar-fill"
                style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
              />
            </div>

            <div className={`video-controls ${controlsVisible ? 'visible' : ''}`}>
              <div className="controls-left">
                <button className="btn-ctrl" onClick={togglePlay}>
                  {isPlaying ? <Pause size={16} fill="#dfdfdf" /> : <Play size={16} fill="#dfdfdf" />}
                </button>
                <button className="btn-ctrl" onClick={() => skipTime(-10)} title="Tua lại 10s">
                  <RotateCcw size={16} /> <span style={{fontSize: '11px', marginLeft: '4px'}}>10s</span>
                </button>
                <button className="btn-ctrl" onClick={() => skipTime(10)} title="Tua tiếp 10s">
                  <RotateCw size={16} /> <span style={{fontSize: '11px', marginLeft: '4px'}}>10s</span>
                </button>
                <span className="time-display">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
              
              <div className="controls-right">
                {/* Playback Speed selector */}
                <div className="speed-control">
                  <select 
                    value={playbackSpeed} 
                    onChange={(e) => changeSpeed(parseFloat(e.target.value))}
                    className="select-speed"
                    onFocus={() => setIsSpeedFocused(true)}
                    onBlur={() => setIsSpeedFocused(false)}
                  >
                    <option value="0.75">0.75x</option>
                    <option value="1">1.0x (Chuẩn)</option>
                    <option value="1.25">1.25x</option>
                    <option value="1.5">1.5x</option>
                  </select>
                </div>

                {/* CC Dropdown Menu (Netflix style) */}
                <div className="cc-control-container">
                  <button 
                    className={`btn-ctrl btn-cc ${showEnglish || showVietnamese ? 'active' : ''}`}
                    onClick={() => setShowSubMenu(!showSubMenu)}
                    title="Cài đặt phụ đề"
                  >
                    <Subtitles size={16} style={{ marginRight: '6px' }} />
                    Phụ đề
                  </button>
                  {showSubMenu && (
                    <div className="cc-dropdown-menu">
                      <div className="cc-menu-title">Tùy chỉnh phụ đề</div>
                      <label className="cc-menu-item">
                        <span>Tiếng Anh</span>
                        <div className="premium-switch">
                          <input 
                            type="checkbox" 
                            checked={showEnglish} 
                            onChange={() => setShowEnglish(!showEnglish)} 
                          />
                          <span className="switch-slider"></span>
                        </div>
                      </label>
                      <label className="cc-menu-item">
                        <span>Tiếng Việt</span>
                        <div className="premium-switch">
                          <input 
                            type="checkbox" 
                            checked={showVietnamese} 
                            onChange={() => setShowVietnamese(!showVietnamese)} 
                          />
                          <span className="switch-slider"></span>
                        </div>
                      </label>
                    </div>
                  )}
                </div>

                <button 
                  className={`btn-ctrl btn-sidebar-toggle ${showSidebar ? 'active' : ''}`}
                  onClick={() => setShowSidebar(!showSidebar)}
                  title="Bật/Tắt kịch bản phim"
                >
                  <Menu size={16} style={{ marginRight: '6px' }} />
                  Kịch bản
                </button>
              </div>
            </div>
          </div>

          {/* Study Controls Bar Component */}
          <StudyControls 
            startTour={() => {
              // 1. Lưu trữ trạng thái giao diện gốc để khôi phục khi kết thúc
              const originalSyncing = syncingSegment;
              const originalAiPanel = aiPanel;

              setShowSidebar(true);
              setSidebarTab('script');

              setTimeout(() => {
                const d = driver({
                  showProgress: true,
                  animate: true,
                  allowClose: true,
                  nextBtnText: 'Tiếp tục',
                  prevBtnText: 'Quay lại',
                  doneBtnText: 'Hoàn tất',
                  onDestroyed: () => {
                    // Khôi phục lại trạng thái ban đầu của người dùng khi tắt Tour
                    setSyncingSegment(originalSyncing);
                    setAiPanel(originalAiPanel);
                  },
                  steps: [
                    { 
                      element: '.subtitles-overlay', 
                      popover: { 
                        title: 'Tra cứu từ vựng tức thì', 
                        description: 'Chỉ cần click chuột trực tiếp vào bất kỳ từ nào trên phụ đề video. Hệ thống sẽ ngay lập tức dịch nghĩa, phát âm từ đó và cho phép bạn thêm nhanh vào Sổ từ vựng.',
                        side: "top", 
                        align: 'start' 
                      } 
                    },
                    { 
                      element: '.sidebar-selectors', 
                      popover: { 
                        title: 'Chọn Phim và Tập', 
                        description: 'Dễ dàng chuyển đổi giữa các bộ phim, mùa phim và các tập phim khác nhau để theo dõi tiến độ học tập.',
                        side: "left", 
                        align: 'start' 
                      } 
                    },
                    { 
                      element: '.transcript-list', 
                      popover: { 
                        title: 'Kịch bản và Tương tác câu thoại', 
                        description: 'Click vào câu thoại bất kỳ để tua video đến phân cảnh đó. Bạn có thể lưu câu, yêu cầu Giáo viên AI giải thích nghĩa ngữ cảnh hoặc bấm nút biên tập để sửa phụ đề.',
                        side: "left", 
                        align: 'start' 
                      },
                      onHighlightStarted: () => {
                        setSidebarTab('script');
                        setAiPanel(null);
                        setSyncingSegment({
                          index: 1,
                          start: 3.21,
                          end: 7.21,
                          english: "There's nothing to tell. It's just some guy I work with.",
                          vietnamese: "Không có gì đáng nói cả. Chỉ là một anh chàng làm chung thôi."
                        });
                      }
                    },
                    { 
                      element: '.sub-sync-editor-panel', 
                      popover: { 
                        title: 'Bộ công cụ sửa và căn khớp phụ đề', 
                        description: 'Khi click vào biểu tượng chiếc bút chì bên cạnh câu thoại, bảng điều khiển này sẽ xuất hiện giúp bạn tinh chỉnh chính xác từng giây bắt đầu, kết thúc hoặc sửa đổi trực tiếp phần chữ phụ đề.',
                        side: "left", 
                        align: 'start' 
                      },
                      onHighlightStarted: () => {
                        setSidebarTab('script');
                        setAiPanel({
                          loading: false,
                          error: null,
                          applied: false,
                          segmentIndex: 1,
                          start: 3.21,
                          end: 7.21,
                          english: "There's nothing to tell. It's just some guy I work with.",
                          data: {
                            translation: "Không có gì đáng nói cả. Chỉ là một anh chàng làm chung thôi.",
                            tone: "Né tránh, Suồng sã",
                            definition: "Dùng để gạt đi mối quan tâm của người khác về một mối quan hệ mới, giảm nhẹ tầm quan trọng của đối phương.",
                            key_vocabulary: {
                              "nothing to tell": "Không có gì đáng kể để kể lại hoặc chia sẻ thêm.",
                              "some guy": "Một gã/anh chàng nào đó bình thường, không có mối quan hệ thân thiết hay đặc biệt gì."
                            },
                            example: "Don't ask me about him, he's just some guy I work with.",
                            example_translation: "Đừng hỏi tôi về anh ta, chỉ là một gã làm cùng công ty thôi mà."
                          }
                        });
                      }
                    },
                    { 
                      element: '.ai-explain-panel', 
                      popover: { 
                        title: 'Trợ lý Giáo viên AI giải nghĩa câu', 
                        description: 'Hộp thoại giải nghĩa chi tiết ngữ cảnh bao gồm:\n' +
                          '- Sắc thái (Tone): Nhận diện tông giọng giao tiếp như Thân mật, Né tránh...\n' +
                          '- Định nghĩa (Definition): Giải nghĩa cốt lõi của câu thoại trong ngữ cảnh phim.\n' +
                          '- Focus: Giải thích chi tiết các từ lóng, cụm từ quan trọng dạng danh sách.\n' +
                          '- Ví dụ (Example): Cung cấp câu ví dụ thực tế tương tự kèm dịch nghĩa.',
                        side: "top", 
                        align: 'start' 
                      },
                      onHighlightStarted: () => {
                        setSidebarTab('script');
                        setSyncingSegment(null);
                      }
                    },
                    { 
                      element: '.vocab-list', 
                      popover: { 
                        title: 'Sổ từ vựng cá nhân', 
                        description: 'Nơi lưu trữ các từ mới bạn đã click tra cứu trực tiếp trên phụ đề. Bạn có thể nghe phát âm chuẩn bản xứ, xem giải nghĩa chi tiết và quản lý từ đã lưu.',
                        side: "left", 
                        align: 'start' 
                      },
                      onHighlightStarted: () => {
                        setSidebarTab('vocab');
                        setSyncingSegment(null);
                        setAiPanel(null);
                      }
                    },
                    { 
                      element: '.saved-sentences-list', 
                      popover: { 
                        title: 'Câu thoại đã lưu', 
                        description: 'Nơi lưu lại các câu thoại tâm đắc hoặc các câu khó. Click vào nút Play ở mỗi câu để tự động tua video đến câu thoại đó và luyện nghe nói.',
                        side: "left", 
                        align: 'start' 
                      },
                      onHighlightStarted: () => {
                        setSidebarTab('sentences');
                        setSyncingSegment(null);
                        setAiPanel(null);
                      }
                    },
                    { 
                      element: '.study-bar-left', 
                      popover: { 
                        title: 'Cài đặt biên tập phụ đề', 
                        description: 'Tự động sửa: Tự động mở kịch bản và bảng biên tập phụ đề bám sát câu thoại đang phát để sửa đổi nhanh.',
                        side: "top", 
                        align: 'start' 
                      },
                      onHighlightStarted: () => {
                        setSidebarTab('script');
                        setSyncingSegment(null);
                        setAiPanel(null);
                      }
                    },
                    { 
                      element: '.study-bar-center', 
                      popover: { 
                        title: 'Luyện nghe nói phản xạ chuyên sâu', 
                        description: '- Tự dừng sau mỗi câu: Video tự tạm dừng ở cuối câu để bạn luyện Shadowing nhại giọng.\n- Đục lỗ: Che chữ phụ đề theo tỷ lệ để rèn luyện phản xạ đoán từ.',
                        side: "top", 
                        align: 'start' 
                      } 
                    },
                    { 
                      element: '.btn-help-bottom-toggle', 
                      popover: { 
                        title: 'Hệ thống phím tắt phản xạ', 
                        description: '- Space: Tạm dừng / Phát video\n- Phím S: Phát lại câu thoại hiện tại\n- Phím A / D: Lùi về câu trước hoặc tiến tới câu sau nhanh chóng.\n- Phím Tab: Mở từ bị đục lỗ tiếp theo, hoặc tiếp tục phát video khi đã mở hết.',
                        side: "top", 
                        align: 'end' 
                      } 
                    }
                  ]
                });
                d.drive();
              }, 200);
            }}
            followActiveSubtitleSync={followActiveSubtitleSync}
            setFollowActiveSubtitleSync={setFollowActiveSubtitleSync}
            setShowSidebar={setShowSidebar}
            setSidebarTab={setSidebarTab}
            setSyncingSegment={setSyncingSegment}
            currentEpisode={currentEpisode}
            watchedEpisodes={watchedEpisodes}
            toggleWatched={toggleWatched}
            shadowingDelay={shadowingDelay}
            setShadowingDelay={setShadowingDelay}
            blankLevel={blankLevel}
            setBlankLevel={setBlankLevel}
          />

          {/* AI Explain Panel Component */}
          <AiExplainPanel 
            aiPanel={aiPanel}
            aiPanelSentence={aiPanelSentence}
            aiPanelTranslation={aiPanelTranslation}
            onClose={() => setAiPanel(null)}
            parseMarkdown={parseMarkdown}
            onApplyTranslation={handleApplyAiTranslation}
          />
        </div>

        {/* Modular Sidebar Component */}
        <Sidebar 
          showSidebar={showSidebar}
          sidebarTab={sidebarTab}
          setSidebarTab={setSidebarTab}
          selectedShow={selectedShow}
          selectedSeason={selectedSeason}
          selectedEpisodeId={selectedEpisodeId}
          showsData={showsData}
          watchedEpisodes={watchedEpisodes}
          handleShowChange={handleShowChange}
          handleSeasonChange={handleSeasonChange}
          handleEpisodeChange={handleEpisodeChange}
          subtitles={subtitles}
          savedSentences={savedSentences}
          currentEpisode={currentEpisode}
          activeSidebarSub={activeSidebarSub}
          videoRef={videoRef}
          setPausedSub={setPausedSub}
          setRevealedIndices={setRevealedIndices}
          setIsPlaying={setIsPlaying}
          formatTime={formatTime}
          setSyncingSegment={setSyncingSegment}
          copyFeedback={copyFeedback}
          handleCopySubtitle={handleCopySubtitle}
          handleAiExplain={handleAiExplain}
          removeSentence={removeSentence}
          saveSentence={saveSentence}
          syncingSegment={syncingSegment}
          followActiveSubtitleSync={followActiveSubtitleSync}
          handleSaveTimeSync={handleSaveTimeSync}
          setFollowActiveSubtitleSync={setFollowActiveSubtitleSync}
          savedVocab={savedVocab}
          clearAllVocab={clearAllVocab}
          removeWord={removeWord}
          playSavedSentence={playSavedSentence}
        />
      </div>
    </div>
  );
}

export default App;
