import React, { useState, useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import './App.css';

import AiExplainPanel from './components/AiExplainPanel';
import Sidebar from './components/Sidebar';
import VideoPlayer from './components/VideoPlayer';
import StudyControls from './components/StudyControls';

import { parseVTT, formatTime, getBlankedIndices } from './utils/helpers';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';

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
  const pausedSubRef = useRef(null);
  const updatePausedSub = (val) => {
    pausedSubRef.current = val;
    setPausedSub(val);
  };
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Custom Controls and UI Settings
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarTab, setSidebarTab] = useState('script'); // 'script' | 'vocab' | 'sentences'
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

  // Language learning states
  const [blankLevel, setBlankLevel] = useState(0); // 0, 0.3, 0.5, 1.0
  const [revealBlanked, setRevealBlanked] = useState(false);
  const [autoPauseOnBlank, setAutoPauseOnBlank] = useState(true);
  const [revealedIndices, setRevealedIndices] = useState([]); // indices of blanked words that are revealed
  const [shadowingDelay, setShadowingDelay] = useState(-99); // -99 (off), 0, 0.5, 1.0, 999 etc.
  const [resumeData, setResumeData] = useState(null); // { time, formatted }
  const [watchedEpisodes, setWatchedEpisodes] = useState([]);
  const [savedSentences, setSavedSentences] = useState(() => {
    const saved = localStorage.getItem('saved_sentences');
    return saved ? JSON.parse(saved) : [];
  });

  const [followActiveSubtitleSync, setFollowActiveSubtitleSync] = useState(false); // Chế độ tự động mở / bám theo câu thoại đang chạy
  const [syncingSegment, setSyncingSegment] = useState(null); // Trạng thái câu thoại đang được chỉnh đồng bộ/sửa chữ
  const [aiPanel, setAiPanel] = useState(null); // null | { loading: true } | { data: {...} } | { error: '...' }
  const [aiPanelSentence, setAiPanelSentence] = useState(''); // câu đang được giải thích
  const [aiPanelTranslation, setAiPanelTranslation] = useState(''); // bản dịch gốc của câu đang giải thích

  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const lastSubIndexRef = useRef(-1);
  const controlsTimeoutRef = useRef(null);
  const resumeTimeoutRef = useRef(null);
  const lastResetSubIdRef = useRef(null);
  const revealedIndicesRef = useRef([]);
  const seekTargetRef = useRef(0); 
  const autoPauseOnBlankRef = useRef(true);
  const lastSavedTimeRef = useRef(0);
  const startRectRef = useRef(null);
  const justDraggedRef = useRef(false);

  // Drag selection state (word-by-word selection)
  const [dragStartIdx, setDragStartIdx] = useState(null);
  const [dragEndIdx, setDragEndIdx] = useState(null);
  const [dragOccurred, setDragOccurred] = useState(false);

  // Global mouseup to reset drag indexes
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
      localStorage.setItem('pending_seek_time', (item.start + 0.02).toString());
    } else if (videoRef.current) {
      videoRef.current.currentTime = item.start + 0.02; // Cộng thêm 20ms để tránh lệch điểm dừng về câu trước
      if (!isPlaying) {
        videoRef.current.play().then(() => setIsPlaying(true));
      }
    }
  };

  const toggleWatched = (epId) => {
    if (!epId) return;
    const isNowWatched = !watchedEpisodes.includes(epId);
    setWatchedEpisodes(prev => isNowWatched ? [...prev, epId] : prev.filter(id => id !== epId));
    
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

  // Fetch episodes on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/episodes`)
      .then(res => res.json())
      .then(data => {
        setShowsData(data);
        const showKeys = Object.keys(data).sort();
        if (showKeys.length > 0) {
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

  // Load saved vocabulary and watched progress lists on mount
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

  // Reset blanking states synchronously during render when we transition to a different subtitle segment
  const subToUse = pausedSub || activeSub;
  if (subToUse && lastResetSubIdRef.current !== subToUse.start) {
    lastResetSubIdRef.current = subToUse.start;
    setRevealBlanked(false);
    setRevealedIndices([]);
    revealedIndicesRef.current = [];
  }

  // Sync refs to avoid stale closure in handleTimeUpdate
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
        setSubtitles(parseVTT(text));
      })
      .catch(err => console.error("Error loading subtitles:", err));
  }, [currentEpisode]);

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

  // Auto-scroll sidebar script to keep the active subtitle in viewport
  useEffect(() => {
    if (activeSidebarSub && sidebarTab === 'script') {
      const activeEl = document.querySelector('.transcript-item.active');
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }

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
    
    if (video.seeking) {
      setActiveSub(null);
      return;
    }
    
    const time = video.currentTime;
    setCurrentTime(time);

    // Save watch progress to SQLite backend (every 5 seconds)
    if (currentEpisode && video.duration && Math.abs(time - lastSavedTimeRef.current) >= 5) {
      lastSavedTimeRef.current = time;
      const totalDuration = video.duration;
      const isCompleted = (time > totalDuration - 30) || (time / totalDuration > 0.95);
      const isNearStart = time < 10;
      const savePosition = (isCompleted || isNearStart) ? 0 : time;

      fetch(`${API_BASE}/api/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episode_id: currentEpisode.id,
          last_position: parseFloat(savePosition.toFixed(3)),
          duration: parseFloat(totalDuration.toFixed(3)),
          completed: isCompleted ? 1 : 0
        })
      }).catch(err => console.error("Error auto-saving progress:", err));
    }

    const current = subtitles.find(s => time >= s.start && time <= s.end);
    const justEnded = subtitles.find(s => time >= s.end && time < s.end + 0.05);

    if (justEnded) {
      setActiveSub(justEnded);
    } else if (current) {
      setActiveSub(current);
      if (video && !video.paused) {
        setActiveSidebarSub(current);
      }
    } else {
      setActiveSub(null);
    }

    // Shadowing / Auto-pause: check if subtitle just ended
    const shouldPause = (Number(shadowingDelay) !== -99);
    if (shouldPause) {
      const endedSub = subtitles.find(s => time >= s.end && time <= s.end + 0.5);
      if (endedSub && endedSub.end > seekTargetRef.current && lastSubIndexRef.current !== endedSub.end) {
        lastSubIndexRef.current = endedSub.end;
        updatePausedSub(endedSub);
        setActiveSidebarSub(endedSub);
        video.pause();
        setIsPlaying(false);

        if (blankLevel > 0) {
          const blankedSet = getBlankedIndices(endedSub.english, blankLevel);
          if (blankedSet.size > 0) {
            const blankedArray = Array.from(blankedSet);
            const allRevealed = blankedArray.every(idx => revealedIndicesRef.current.includes(idx));
            if (!allRevealed) {
              return;
            }
          }
        }

        if (Number(shadowingDelay) === 0) {
          updatePausedSub(null);
          video.play().then(() => setIsPlaying(true));
          return;
        }

        if (Number(shadowingDelay) === 999) {
          return;
        }

        const segmentDuration = endedSub.end - endedSub.start;
        const totalPauseSeconds = Math.max(0.5, segmentDuration * shadowingDelay);

        if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
        resumeTimeoutRef.current = setTimeout(() => {
          if (videoRef.current) {
            updatePausedSub(null);
            videoRef.current.play().then(() => setIsPlaying(true));
          }
        }, totalPauseSeconds * 1000);
        return;
      }
    }
  };

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
          setSubtitles(prev => prev.map(sub => {
            if (sub.index === segmentIndex) {
              return { ...sub, vietnamese: newTranslation };
            }
            return sub;
          }));
          setAiPanelTranslation(newTranslation);
          setAiPanel(prev => ({ ...prev, applied: true }));
        } else {
          alert('Không thể áp dụng dịch nghĩa AI: ' + data.detail);
        }
      })
      .catch(err => {
        console.error('Error applying AI translation:', err);
        alert('Lỗi kết nối khi thay đổi phụ đề.');
      });
  };

  const parseMarkdown = (text) => {
    if (!text) return '';
    if (typeof text !== 'string') {
      try {
        if (typeof text === 'object') {
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
    let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/\n/g, '<br/>');
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  const togglePlay = (e) => {
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

    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
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
    if (e && !force) {
      const popoverEl = document.querySelector('.dict-popover');
      if (popoverEl && popoverEl.contains(e.target)) {
        return;
      }
    }
    setClickedWord(null);
    setWordDefinition(null);
    if (videoRef.current && isPlaying) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  };

  const translateAndShowPopover = (text, rect) => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();

    if (videoRef.current) {
      videoRef.current.playbackRate = 0.5;
    }

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
    
    fetch(`${API_BASE}/api/vocabulary/${encodeURIComponent(word)}`, {
      method: 'DELETE'
    }).catch(err => console.error("Error deleting vocab from SQLite:", err));
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
      
      if (videoRef.current.paused) {
        const newSub = subtitles.find(s => targetTime >= s.start && targetTime <= s.end);
        updatePausedSub(newSub || null);
      }
    }
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

  // Keyboard shortcut hook registration
  useKeyboardShortcuts({
    videoRef,
    activeSub,
    pausedSub,
    subtitles,
    duration,
    blankLevel,
    activeSidebarSub,
    revealedIndicesRef,
    setRevealedIndices,
    setPausedSub: updatePausedSub,
    setIsPlaying,
    togglePlay,
    resumeTimeoutRef,
    seekTargetRef,
    lastSubIndexRef,
    setActiveSidebarSub
  });

  return (
    <div className="app-container" onClick={handleClosePopover}>
      <div className="main-content">
        <div className="player-column">
          <VideoPlayer
            API_BASE={API_BASE}
            videoRef={videoRef}
            containerRef={containerRef}
            currentEpisode={currentEpisode}
            subtitles={subtitles}
            currentTime={currentTime}
            setCurrentTime={setCurrentTime}
            duration={duration}
            setDuration={setDuration}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            playbackSpeed={playbackSpeed}
            setPlaybackSpeed={setPlaybackSpeed}
            controlsVisible={controlsVisible}
            setControlsVisible={setControlsVisible}
            isSpeedFocused={isSpeedFocused}
            setIsSpeedFocused={setIsSpeedFocused}
            showEnglish={showEnglish}
            setShowEnglish={setShowEnglish}
            showVietnamese={showVietnamese}
            setShowVietnamese={setShowVietnamese}
            showSubMenu={showSubMenu}
            setShowSubMenu={setShowSubMenu}
            showSidebar={showSidebar}
            setShowSidebar={setShowSidebar}
            pausedSub={pausedSub}
            pausedSubRef={pausedSubRef}
            activeSub={activeSub}
            setPausedSub={updatePausedSub}
            resumeData={resumeData}
            setResumeData={setResumeData}
            clickedWord={clickedWord}
            wordDefinition={wordDefinition}
            popoverPos={popoverPos}
            handleClosePopover={handleClosePopover}
            saveWord={saveWord}
            togglePlay={togglePlay}
            skipTime={skipTime}
            changeSpeed={changeSpeed}
            handleTimeUpdate={handleTimeUpdate}
            handleTimelineClick={handleTimelineClick}
            handleSubtitleMouseUp={handleSubtitleMouseUp}
            handleMouseMove={handleMouseMove}
            setWatchedEpisodes={setWatchedEpisodes}
            
            // SubtitleOverlay props
            blankLevel={blankLevel}
            revealedIndices={revealedIndices}
            revealedIndicesRef={revealedIndicesRef}
            setRevealedIndices={setRevealedIndices}
            dragStartIdx={dragStartIdx}
            setDragStartIdx={setDragStartIdx}
            dragEndIdx={dragEndIdx}
            setDragEndIdx={setDragEndIdx}
            dragOccurred={dragOccurred}
            setDragOccurred={setDragOccurred}
            startRectRef={startRectRef}
            justDraggedRef={justDraggedRef}
            translateAndShowPopover={translateAndShowPopover}
          />

          <StudyControls 
            startTour={() => {
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

          <AiExplainPanel 
            aiPanel={aiPanel}
            aiPanelSentence={aiPanelSentence}
            aiPanelTranslation={aiPanelTranslation}
            onClose={() => setAiPanel(null)}
            parseMarkdown={parseMarkdown}
            onApplyTranslation={handleApplyAiTranslation}
          />
        </div>

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
          setPausedSub={updatePausedSub}
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
