import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const API_BASE = 'http://localhost:8000';

function App() {
  const [showsData, setShowsData] = useState({});
  const [selectedShow, setSelectedShow] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [selectedEpisodeId, setSelectedEpisodeId] = useState('');
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [subtitles, setSubtitles] = useState([]);
  const [activeSub, setActiveSub] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  
  // Custom Controls and UI Settings
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('script'); // 'script' | 'vocab'
  const [savedVocab, setSavedVocab] = useState([]);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isSpeedFocused, setIsSpeedFocused] = useState(false);
  const [showEnglish, setShowEnglish] = useState(true);
  const [showVietnamese, setShowVietnamese] = useState(true);
  const [activeSidebarSub, setActiveSidebarSub] = useState(null);
  
  // Dictionary lookup state
  const [clickedWord, setClickedWord] = useState(null);
  const [wordDefinition, setWordDefinition] = useState(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });

  // New language learning states
  const [blankLevel, setBlankLevel] = useState(0); // 0, 0.3, 0.5, 1.0
  const [revealBlanked, setRevealBlanked] = useState(false);
  const [revealAll, setRevealAll] = useState(false);
  const [revealedIndices, setRevealedIndices] = useState([]); // indices of blanked words that are revealed
  const [shadowingDelay, setShadowingDelay] = useState(-99); // -99 (off), -2, -1, 0, 1, 3, 5, 7 seconds added to script duration
  const [resumeData, setResumeData] = useState(null); // { time, formatted }
  const [watchedEpisodes, setWatchedEpisodes] = useState(() => {
    const saved = localStorage.getItem('watched_episodes');
    return saved ? JSON.parse(saved) : [];
  });
  const [savedSentences, setSavedSentences] = useState(() => {
    const saved = localStorage.getItem('saved_sentences');
    return saved ? JSON.parse(saved) : [];
  });

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
  // Subtitle Hotkeys Handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
      }

      const video = videoRef.current;
      if (!video) return;

      const time = video.currentTime;

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        const current = subtitles.find(s => time >= s.start && time <= s.end);
        if (current) {
          const currentIdx = subtitles.indexOf(current);
          if (time - current.start < 1.5 && currentIdx > 0) {
            video.currentTime = subtitles[currentIdx - 1].start;
          } else {
            video.currentTime = current.start;
          }
        } else {
          const prev = [...subtitles].reverse().find(s => s.end < time);
          if (prev) {
            video.currentTime = prev.start;
          }
        }
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        const next = subtitles.find(s => s.start > time);
        if (next) {
          video.currentTime = next.start;
        }
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [subtitles, isPlaying]);

  const toggleWatched = (epId) => {
    if (!epId) return;
    setWatchedEpisodes(prev => {
      const updated = prev.includes(epId)
        ? prev.filter(id => id !== epId)
        : [...prev, epId];
      localStorage.setItem('watched_episodes', JSON.stringify(updated));
      return updated;
    });
  };

  const clearAllVocab = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa tất cả từ vựng đã lưu?")) {
      setSavedVocab([]);
      localStorage.removeItem('saved_vocab');
    }
  };

  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const lastSubIndexRef = useRef(-1);
  const controlsTimeoutRef = useRef(null);
  const resumeTimeoutRef = useRef(null);

  // Fetch episodes on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/episodes`)
      .then(res => res.json())
      .then(data => {
        setShowsData(data);
        
        // Auto-select first show, first season, first episode
        const showKeys = Object.keys(data);
        if (showKeys.length > 0) {
          const firstShowId = showKeys[0];
          setSelectedShow(firstShowId);
          
          const seasonKeys = Object.keys(data[firstShowId].seasons);
          if (seasonKeys.length > 0) {
            const firstSeasonId = seasonKeys[0];
            setSelectedSeason(firstSeasonId);
            
            const episodes = data[firstShowId].seasons[firstSeasonId].episodes;
            if (episodes.length > 0) {
              const firstEpisode = episodes[0];
              setSelectedEpisodeId(firstEpisode.id);
              setCurrentEpisode(firstEpisode);
            }
          }
        }
      })
      .catch(err => console.error("Error loading episodes:", err));

    const saved = localStorage.getItem('saved_vocab');
    if (saved) {
      setSavedVocab(JSON.parse(saved));
    }
  }, []);

  // Reset blanking states when activeSub changes
  useEffect(() => {
    setRevealBlanked(false);
    setRevealAll(false);
    setRevealedIndices([]);
  }, [activeSub]);

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

    fetch(currentEpisode.subtitle_url)
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
        const english = textLines[0] || '';
        const vietnamese = textLines[1] || '';

        parsed.push({
          index: parseInt(lines[0], 10) || parsed.length + 1,
          start: parseTime(startStr),
          end: parseTime(endStr),
          english,
          vietnamese
        });
      }
    });

    setSubtitles(parsed);
  };



  // Helper to generate blanked word indices deterministically
  const getBlankedIndices = (text, level) => {
    if (level === 0) return new Set();
    const words = text.split(/(\s+)/);
    const wordIndices = [];
    words.forEach((w, idx) => {
      if (w.trim() && /[a-zA-Z]/.test(w)) {
        wordIndices.push(idx);
      }
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

  // Keyboard shortcut handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      const video = videoRef.current;
      if (!video) return;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 's' || e.key === 'S' || e.key === 'r' || e.key === 'R') {
        if (activeSub) {
          video.currentTime = activeSub.start;
          video.play();
        }
      } else if (e.key === 'a' || e.key === 'A') {
        const currentIndex = subtitles.findIndex(s => s === activeSub);
        if (currentIndex > 0) {
          video.currentTime = subtitles[currentIndex - 1].start;
          video.play();
        }
      } else if (e.key === 'd' || e.key === 'D') {
        const currentIndex = subtitles.findIndex(s => s === activeSub);
        if (currentIndex !== -1 && currentIndex < subtitles.length - 1) {
          video.currentTime = subtitles[currentIndex + 1].start;
          video.play();
        }
      } else if (e.key === 'ArrowLeft') {
        video.currentTime = Math.max(0, video.currentTime - 10);
      } else if (e.key === 'ArrowRight') {
        video.currentTime = Math.min(duration, video.currentTime + 10);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        if (activeSub) {
          const blankedSet = getBlankedIndices(activeSub.english, blankLevel);
          const blankedArray = Array.from(blankedSet).sort((a, b) => a - b);
          const nextToReveal = blankedArray.find(idx => !revealedIndices.includes(idx));
          if (nextToReveal !== undefined) {
            setRevealedIndices(prev => [...prev, nextToReveal]);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSub, subtitles, duration, blankLevel, revealedIndices]);

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
    }
  }, [activeSidebarSub, sidebarTab]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const time = video.currentTime;
    setCurrentTime(time);

    // Save resume position
    if (currentEpisode && time > 2 && video.duration && time < video.duration - 5) {
      const savedPositions = localStorage.getItem('resume_positions');
      const positions = savedPositions ? JSON.parse(savedPositions) : {};
      positions[currentEpisode.id] = time;
      localStorage.setItem('resume_positions', JSON.stringify(positions));
    }

    const current = subtitles.find(s => time >= s.start && time <= s.end);
    if (current) {
      setActiveSub(current);
      setActiveSidebarSub(current);
    } else {
      // If the video is playing, clear the subtitles. If it's paused (shadowing), keep them visible!
      if (!video.paused) {
        setActiveSub(null);
      }
    }

    // Shadowing / Auto-pause: check if any subtitle has just ended (+0.15s past the end to let voice trail finish)
    if (shadowingDelay !== -99) {
      const endedSub = subtitles.find(s => time >= s.end + 0.15 && time <= s.end + 0.8);
      if (endedSub && lastSubIndexRef.current !== endedSub.start) {
        lastSubIndexRef.current = endedSub.start; // mark as paused for this sub
        video.pause();
        setIsPlaying(false);

        if (shadowingDelay === 999) {
          return;
        }

        const segmentDuration = endedSub.end - endedSub.start;
        const totalPauseSeconds = Math.max(0.5, segmentDuration + shadowingDelay);

        if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
        resumeTimeoutRef.current = setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.play().then(() => setIsPlaying(true));
          }
        }, totalPauseSeconds * 1000);
        return;
      }
    }
  };

  const togglePlay = () => {
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
    } else {
      video.play().then(() => setIsPlaying(true));
      setClickedWord(null);
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

  const handleWordClick = (e, word) => {
    e.stopPropagation();
    
    if (videoRef.current && isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    }

    setClickedWord(word);
    
    // Calculate tooltip coordinates inside the container Ref
    const rect = e.target.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    
    setPopoverPos({
      top: rect.top - containerRect.top - 145,
      left: rect.left - containerRect.left + rect.width / 2 - 125
    });

    fetch(`${API_BASE}/api/translate?word=${encodeURIComponent(word)}`)
      .then(res => res.json())
      .then(data => {
        setWordDefinition(data);
      })
      .catch(err => {
        console.error("Translate error:", err);
        setWordDefinition({
          word,
          translation: "Không tìm thấy nghĩa",
          ipa: `/${word}/`,
          part_of_speech: "N/A"
        });
      });
  };

  const saveWord = () => {
    if (!wordDefinition) return;
    const updated = [...savedVocab];
    if (!updated.some(item => item.word === wordDefinition.word)) {
      updated.push(wordDefinition);
      setSavedVocab(updated);
      localStorage.setItem('saved_vocab', JSON.stringify(updated));
    }
    setClickedWord(null);
  };

  const removeWord = (word) => {
    const updated = savedVocab.filter(item => item.word !== word);
    setSavedVocab(updated);
    localStorage.setItem('saved_vocab', JSON.stringify(updated));
  };

  const formatTime = (timeInSecs) => {
    const mins = Math.floor(timeInSecs / 60);
    const secs = Math.floor(timeInSecs % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTimelineClick = (e) => {
    const rect = e.target.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const clickPercentage = clickX / width;
    const targetTime = clickPercentage * duration;
    
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const renderCleanWords = (lineText) => {
    const words = lineText.split(/(\s+)/);
    const blankedIndices = getBlankedIndices(lineText, blankLevel);
    
    return words.map((chunk, idx) => {
      if (chunk.trim() === '') return chunk;
      
      const cleanWord = chunk.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"]/g, "");
      const isBlankedWord = blankedIndices.has(idx);
      const isCurrentlyRevealed = revealAll || revealedIndices.includes(idx);
      
      const displayChunk = (isBlankedWord && !isCurrentlyRevealed)
        ? chunk.replace(/[a-zA-Z]/g, "_")
        : chunk;
        
      const isShowingPlaceholder = isBlankedWord && !isCurrentlyRevealed;

      return (
        <span 
          key={idx} 
          className={`word-span ${isBlankedWord ? 'blanked' : ''} ${isCurrentlyRevealed && isBlankedWord ? 'revealed' : ''}`}
          onClick={(e) => {
            if (isShowingPlaceholder) {
              setRevealedIndices(prev => [...prev, idx]);
            } else {
              handleWordClick(e, cleanWord);
            }
          }}
          title={isShowingPlaceholder ? "Click to reveal" : "Click to translate"}
        >
          {displayChunk}
        </span>
      );
    });
  };

  return (
    <div className="app-container" onClick={() => setClickedWord(null)}>
      {/* Header */}
      <header className="app-header">
        <div className="logo">
          🍿 Friends Learning <span>Bilingual Player</span>
        </div>
        <div className="header-controls" style={{ display: 'flex', gap: '10px' }}>
          {/* Show Selector */}
          <select 
            onChange={(e) => handleShowChange(e.target.value)}
            value={selectedShow}
            title="Chọn phim"
          >
            {Object.keys(showsData).map(showId => (
              <option key={showId} value={showId}>{showsData[showId].title}</option>
            ))}
          </select>

          {/* Season Selector */}
          <select 
            onChange={(e) => handleSeasonChange(selectedShow, e.target.value)}
            value={selectedSeason}
            title="Chọn season"
            disabled={!selectedShow}
          >
            {selectedShow && Object.keys(showsData[selectedShow]?.seasons || {})
              .sort((a, b) => {
                const numA = parseInt(a.replace(/\D/g, '')) || 0;
                const numB = parseInt(b.replace(/\D/g, '')) || 0;
                return numA - numB;
              })
              .map(seasonId => (
                <option key={seasonId} value={seasonId}>
                  {showsData[selectedShow].seasons[seasonId].title}
                </option>
              ))}
          </select>

          {/* Episode Selector */}
          <select 
            onChange={(e) => handleEpisodeChange(e.target.value)}
            value={selectedEpisodeId}
            title="Chọn tập"
            disabled={!selectedSeason}
          >
            {(selectedShow && selectedSeason && showsData[selectedShow]?.seasons[selectedSeason]?.episodes || [])
              .sort((a, b) => {
                const numA = parseInt(a.id.replace(/\D/g, '')) || 0;
                const numB = parseInt(b.id.replace(/\D/g, '')) || 0;
                return numA - numB;
              })
              .map(ep => {
                const isWatched = watchedEpisodes.includes(ep.id);
                return (
                  <option key={ep.id} value={ep.id}>
                    {isWatched ? '✓ ' : ''}{ep.title}
                  </option>
                );
              })}
          </select>
        </div>
      </header>

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
                src={currentEpisode.video_url}
                onTimeUpdate={handleTimeUpdate}
                onDurationChange={() => setDuration(videoRef.current?.duration || 0)}
                onClick={togglePlay}
                onPlay={() => { if (videoRef.current) videoRef.current.playbackRate = playbackSpeed; }}
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
                    const savedPositions = localStorage.getItem('resume_positions');
                    if (savedPositions) {
                      const positions = JSON.parse(savedPositions);
                      const savedTime = positions[currentEpisode.id];
                      if (savedTime && savedTime > 5) {
                        videoRef.current.currentTime = savedTime;
                        setResumeData({ time: savedTime, formatted: formatTime(savedTime) });
                        setTimeout(() => setResumeData(null), 5000);
                      }
                    }
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
            {activeSub && (showEnglish || showVietnamese) && (
              <div className="subtitles-overlay">
                {showEnglish && (
                  <div className="sub-english">
                    {renderCleanWords(activeSub.english)}
                  </div>
                )}
                {showVietnamese && (
                  <div className="sub-vietnamese">
                    {activeSub.vietnamese}
                  </div>
                )}
              </div>
            )}

            {/* Dictionary Definition Popover */}
            {clickedWord && (
              <div 
                className="dictionary-popover"
                style={{ top: `${popoverPos.top}px`, left: `${popoverPos.left}px` }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="popover-header">
                  <h4 className="popover-word">{clickedWord}</h4>
                  {wordDefinition && <span className="popover-ipa">{wordDefinition.ipa}</span>}
                </div>
                {wordDefinition ? (
                  <>
                    <p className="popover-def">{wordDefinition.translation}</p>
                    <button className="btn-save-word" onClick={saveWord}>⭐ Lưu Từ</button>
                  </>
                ) : (
                  <p className="popover-def">Đang dịch...</p>
                )}
              </div>
            )}

            {/* Big center play icon when paused */}
            {!isPlaying && (
              <div className="center-play-button" onClick={togglePlay}>
                ▶
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
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <button className="btn-ctrl" onClick={() => skipTime(-10)} title="Rewind 10s">
                  ↩ 10s
                </button>
                <button className="btn-ctrl" onClick={() => skipTime(10)} title="Forward 10s">
                  ↪ 10s
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

                <button 
                  className={`btn-ctrl ${showEnglish ? 'active' : ''}`}
                  onClick={() => setShowEnglish(!showEnglish)}
                  title="Hiện/Ẩn phụ đề tiếng Anh"
                >
                  🇺🇸 ENG
                </button>

                <button 
                  className={`btn-ctrl ${showVietnamese ? 'active' : ''}`}
                  onClick={() => setShowVietnamese(!showVietnamese)}
                  title="Hiện/Ẩn phụ đề tiếng Việt"
                >
                  🇻🇳 VIE
                </button>




                <button 
                  className={`btn-ctrl ${showSidebar ? 'active' : ''}`}
                  onClick={() => setShowSidebar(!showSidebar)}
                  title="Toggle kịch bản phim"
                >
                  📖 Kịch bản
                </button>
              </div>
            </div>
          </div>

          {/* Study Controls Bar (Compact horizontal bar) */}
          <div className="study-controls-bar" onClick={(e) => e.stopPropagation()}>
            <div className="study-bar-left">
              <span className="study-bar-title">🎓 Học tập</span>
            </div>
            
            <div className="study-bar-group">
              {/* Progress watched checkbox */}
              <div className="watched-toggle-container">
                <label className="watched-toggle-label">
                  <input 
                    type="checkbox"
                    checked={currentEpisode ? watchedEpisodes.includes(currentEpisode.id) : false}
                    onChange={() => currentEpisode && toggleWatched(currentEpisode.id)}
                    className="watched-checkbox"
                  />
                  <span className="setting-label">Đã xem</span>
                </label>
              </div>

              {/* Shadowing Delay Selector */}
              <div className="shadowing-delay-selector">
                <span className="setting-label">Dừng tự nói:</span>
                <select 
                  value={shadowingDelay} 
                  onChange={(e) => setShadowingDelay(parseInt(e.target.value))}
                  className="select-resume-delay"
                >
                  <option value="-99">Tắt</option>
                  <option value="999">Dừng hẳn</option>
                  <option value="-2">Độ dài câu - 2s</option>
                  <option value="-1">Độ dài câu - 1s</option>
                  <option value="0">Bằng độ dài câu</option>
                  <option value="1">Độ dài câu + 1s</option>
                  <option value="3">Độ dài câu + 3s</option>
                  <option value="5">Độ dài câu + 5s</option>
                  <option value="7">Độ dài câu + 7s</option>
                </select>
              </div>


              {/* Blanking Level */}
              <div className="blank-level-selectors">
                <span className="setting-label">Đục lỗ:</span>
                <button className={`btn-study-mode ${blankLevel === 0 ? 'active' : ''}`} onClick={() => { setBlankLevel(0); setRevealAll(false); }}>Tắt</button>
                <button className={`btn-study-mode ${blankLevel === 0.3 ? 'active' : ''}`} onClick={() => { setBlankLevel(0.3); setRevealAll(false); }}>30%</button>
                <button className={`btn-study-mode ${blankLevel === 0.5 ? 'active' : ''}`} onClick={() => { setBlankLevel(0.5); setRevealAll(false); }}>50%</button>
                <button className={`btn-study-mode ${blankLevel === 1.0 ? 'active' : ''}`} onClick={() => { setBlankLevel(1.0); setRevealAll(false); }}>100%</button>
                
                {blankLevel > 0 && (
                  <button 
                    className={`btn-reveal-all ${revealAll ? 'active' : ''}`}
                    onClick={() => setRevealAll(!revealAll)}
                    title="Hiện tất cả các từ bị đục lỗ"
                  >
                    👁 Hiện tất cả
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible Sidebar */}
        <aside className={`sidebar ${showSidebar ? 'open' : ''}`}>
          <div className="sidebar-tabs">
            <button 
              className={`tab-btn ${sidebarTab === 'script' ? 'active' : ''}`}
              onClick={() => setSidebarTab('script')}
            >
              📖 Kịch bản
            </button>
            <button 
              className={`tab-btn ${sidebarTab === 'vocab' ? 'active' : ''}`}
              onClick={() => setSidebarTab('vocab')}
            >
              ⭐ Từ vựng ({savedVocab.length})
            </button>
            <button 
              className={`tab-btn ${sidebarTab === 'sentences' ? 'active' : ''}`}
              onClick={() => setSidebarTab('sentences')}
            >
              🔖 Đã lưu ({savedSentences.length})
            </button>
          </div>

          <div className="sidebar-content">
            {sidebarTab === 'script' ? (
              <div className="transcript-list">
                {subtitles.map((sub, index) => {
                  const isSaved = currentEpisode && savedSentences.some(item => item.id === `${currentEpisode.id}_${sub.start}`);
                  return (
                    <div 
                      key={index} 
                      className={`transcript-item ${activeSidebarSub === sub ? 'active' : ''}`}
                      onClick={() => {
                        if (videoRef.current) {
                          videoRef.current.currentTime = sub.start;
                          videoRef.current.play().then(() => setIsPlaying(true));
                        }
                      }}
                    >
                      <div className="transcript-header-bar">
                        <span className="transcript-time">{formatTime(sub.start)}</span>
                        <button 
                          className={`btn-save-sentence-star ${isSaved ? 'saved' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isSaved) {
                              removeSentence(`${currentEpisode.id}_${sub.start}`);
                            } else {
                              saveSentence(sub);
                            }
                          }}
                          title={isSaved ? "Xóa lưu câu thoại" : "Lưu câu thoại"}
                        >
                          {isSaved ? '★' : '☆'}
                        </button>
                      </div>
                      <p className="transcript-en">{sub.english}</p>
                      <p className="transcript-vi">{sub.vietnamese}</p>
                    </div>
                  );
                })}
              </div>
            ) : sidebarTab === 'vocab' ? (
              <div className="vocab-list">
                {savedVocab.length > 0 && (
                  <button className="btn-clear-all-vocab" onClick={clearAllVocab}>
                    🗑 Xóa tất cả từ đã lưu
                  </button>
                )}
                {savedVocab.map((item, idx) => (
                  <div key={idx} className="vocab-item">
                    <div className="vocab-word-header">
                      <span className="vocab-word">{item.word}</span>
                      <button className="btn-remove-vocab" onClick={() => removeWord(item.word)}>🗑</button>
                    </div>
                    <span className="vocab-ipa">{item.ipa}</span>
                    <p className="vocab-translation">{item.translation}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="saved-sentences-list">
                {savedSentences.length === 0 ? (
                  <p className="empty-message">Chưa có câu thoại nào được lưu.</p>
                ) : (
                  savedSentences.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="saved-sentence-item"
                      onClick={() => playSavedSentence(item)}
                      title="Nhấn để nhảy đến cảnh phim của câu này"
                    >
                      <div className="saved-sentence-header">
                        <span className="saved-sentence-episode">{item.episodeTitle}</span>
                        <div className="saved-sentence-actions">
                          <span className="saved-sentence-time">⏱ {formatTime(item.start)}</span>
                          <button 
                            className="btn-remove-saved-sentence" 
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSentence(item.id);
                            }}
                            title="Xóa câu thoại"
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                      <p className="saved-sentence-en">{item.english}</p>
                      <p className="saved-sentence-vi">{item.vietnamese}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;
