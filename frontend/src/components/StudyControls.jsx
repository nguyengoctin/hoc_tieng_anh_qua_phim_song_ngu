import React from 'react';

export default function StudyControls({
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
  setBlankLevel,
  autoPauseOnBlank,
  setAutoPauseOnBlank
}) {
  return (
    <div className="study-controls-bar" onClick={(e) => e.stopPropagation()}>
      <div className="study-bar-group">
        {/* Auto-sync Edit Toggle */}
        <div className="watched-toggle-container">
          <label className="watched-toggle-label" title="Tự động mở panel chỉnh sửa phụ đề bám theo câu thoại đang phát">
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
              className="watched-checkbox"
            />
            <span className="setting-label">Auto-sync Edit</span>
          </label>
        </div>

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
            onChange={(e) => setShadowingDelay(parseFloat(e.target.value))}
            className="select-resume-delay"
          >
            <option value="-99">Tắt</option>
            <option value="999">Dừng hẳn</option>
            <option value="0.3">30% độ dài câu</option>
            <option value="0.5">50% độ dài câu</option>
            <option value="0.7">70% độ dài câu</option>
            <option value="0.8">80% độ dài câu</option>
            <option value="0.9">90% độ dài câu</option>
            <option value="1.0">100% độ dài câu</option>
            <option value="1.3">130% độ dài câu</option>
            <option value="1.5">150% độ dài câu</option>
            <option value="1.8">180% độ dài câu</option>
            <option value="2.0">200% độ dài câu</option>
            <option value="2.5">250% độ dài câu</option>
          </select>
        </div>

        {/* Blanking Level */}
        <div className="blank-level-selectors">
          <span className="setting-label">Đục lỗ:</span>
          <button className={`btn-study-mode ${blankLevel === 0 ? 'active' : ''}`} onClick={() => { setBlankLevel(0); }}>Tắt</button>
          <button className={`btn-study-mode ${blankLevel === 0.3 ? 'active' : ''}`} onClick={() => { setBlankLevel(0.3); }}>30%</button>
          <button className={`btn-study-mode ${blankLevel === 0.5 ? 'active' : ''}`} onClick={() => { setBlankLevel(0.5); }}>50%</button>
          <button className={`btn-study-mode ${blankLevel === 0.7 ? 'active' : ''}`} onClick={() => { setBlankLevel(0.7); }}>70%</button>
          <button className={`btn-study-mode ${blankLevel === 1.0 ? 'active' : ''}`} onClick={() => { setBlankLevel(1.0); }}>100%</button>
          
          {blankLevel > 0 && (
            <label className="watched-toggle-label" style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '12px', cursor: 'pointer' }}>
              <input 
                type="checkbox"
                checked={autoPauseOnBlank}
                onChange={() => setAutoPauseOnBlank(!autoPauseOnBlank)}
                className="watched-checkbox"
              />
              <span className="setting-label" style={{ marginLeft: '4px' }}>Tự dừng</span>
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
