import React from 'react';

export default function StudyControls({
  startTour,
  followActiveSubtitleSync,
  setFollowActiveSubtitleSync,
  setShowSidebar,
  setSidebarTab,
  setSyncingSegment,
  currentEpisode,
  watchedEpisodes,
  toggleWatched,
  shadowingDelay,
  setShadowingDelay,
  blankLevel,
  setBlankLevel
}) {
  return (
    <div className="study-controls-bar" onClick={(e) => e.stopPropagation()}>
      <div className="study-bar-left">
        {/* Auto-sync Edit Toggle */}
        <label className="premium-compact-switch tour-auto-edit" title="Tự động mở panel chỉnh sửa phụ đề bám theo câu thoại đang phát">
          <input 
            type="checkbox"
            checked={followActiveSubtitleSync}
            onChange={(e) => {
              setFollowActiveSubtitleSync(e.target.checked);
              if (e.target.checked) {
                setShowSidebar(true);
                setSidebarTab('script');
              } else {
                setSyncingSegment(null);
              }
            }}
          />
          <span className="compact-switch-slider"></span>
          <span className="setting-label">Tự động sửa</span>
        </label>

        {/* Progress watched checkbox */}
        <label className="premium-compact-switch tour-watched-status" title="Đánh dấu tập phim này đã hoàn thành">
          <input 
            type="checkbox"
            checked={currentEpisode ? watchedEpisodes.includes(currentEpisode.id) : false}
            onChange={() => currentEpisode && toggleWatched(currentEpisode.id)}
          />
          <span className="compact-switch-slider"></span>
          <span className="setting-label">Đã xem</span>
        </label>
      </div>

      <div className="study-bar-center">
        {/* Shadowing Delay Selector */}
        <div className="shadowing-delay-selector-modern tour-shadowing">
          <span className="setting-label">Tự dừng sau mỗi câu</span>
          <select 
            value={shadowingDelay} 
            onChange={(e) => setShadowingDelay(parseFloat(e.target.value))}
            className="select-modern"
          >
            <option value="-99">Tắt</option>
            <option value="0">0%</option>
            <option value="0.3">30% câu</option>
            <option value="0.5">50% câu</option>
            <option value="0.7">70% câu</option>
            <option value="1">100% câu</option>
            <option value="1.2">120% câu</option>
            <option value="1.5">150% câu</option>
            <option value="999">Dừng hẳn</option>
          </select>
        </div>

        <div className="bar-separator"></div>

        {/* Blanking Level */}
        <div className="blank-level-selectors-modern tour-blanking">
          <span className="setting-label">Đục lỗ</span>
          <div className="segmented-controls">
            <button className={`btn-segment ${blankLevel === 0 ? 'active' : ''}`} onClick={() => setBlankLevel(0)}>Tắt</button>
            <button className={`btn-segment ${blankLevel === 0.3 ? 'active' : ''}`} onClick={() => setBlankLevel(0.3)}>30%</button>
            <button className={`btn-segment ${blankLevel === 0.5 ? 'active' : ''}`} onClick={() => setBlankLevel(0.5)}>50%</button>
            <button className={`btn-segment ${blankLevel === 0.7 ? 'active' : ''}`} onClick={() => setBlankLevel(0.7)}>70%</button>
            <button className={`btn-segment ${blankLevel === 1.0 ? 'active' : ''}`} onClick={() => setBlankLevel(1.0)}>100%</button>
          </div>
        </div>
      </div>

      <div className="study-bar-right">
        <button 
          className="btn-help-bottom-toggle"
          onClick={startTour}
          title="Xem hướng dẫn sử dụng nhanh"
        >
          ❓ Hướng dẫn
        </button>
      </div>
    </div>
  );
}
