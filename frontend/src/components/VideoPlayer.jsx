import React from 'react';
import { Play, Pause, RotateCcw, RotateCw, Subtitles, Menu } from 'lucide-react';
import SubtitleOverlay from './SubtitleOverlay';
import DictionaryPopover from './DictionaryPopover';
import { formatTime } from '../utils/helpers';

export default function VideoPlayer({
  API_BASE,
  videoRef,
  containerRef,
  currentEpisode,
  currentTime,
  setCurrentTime,
  duration,
  setDuration,
  isPlaying,
  setIsPlaying,
  playbackSpeed,
  setPlaybackSpeed,
  controlsVisible,
  setControlsVisible,
  isSpeedFocused,
  setIsSpeedFocused,
  showEnglish,
  setShowEnglish,
  showVietnamese,
  setShowVietnamese,
  showSubMenu,
  setShowSubMenu,
  showSidebar,
  setShowSidebar,
  pausedSub,
  activeSub,
  setPausedSub,
  resumeData,
  setResumeData,
  clickedWord,
  wordDefinition,
  popoverPos,
  handleClosePopover,
  saveWord,
  togglePlay,
  skipTime,
  changeSpeed,
  handleTimeUpdate,
  handleTimelineClick,
  handleSubtitleMouseUp,
  handleMouseMove,
  setWatchedEpisodes,
  
  // SubtitleOverlay props
  blankLevel,
  revealedIndices,
  revealedIndicesRef,
  setRevealedIndices,
  dragStartIdx,
  setDragStartIdx,
  dragEndIdx,
  setDragEndIdx,
  dragOccurred,
  setDragOccurred,
  startRectRef,
  justDraggedRef,
  translateAndShowPopover
}) {
  return (
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
                      setCurrentTime(savedTime);
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
      <SubtitleOverlay
        pausedSub={pausedSub}
        activeSub={activeSub}
        showEnglish={showEnglish}
        showVietnamese={showVietnamese}
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
        handleSubtitleMouseUp={handleSubtitleMouseUp}
      />

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
  );
}
