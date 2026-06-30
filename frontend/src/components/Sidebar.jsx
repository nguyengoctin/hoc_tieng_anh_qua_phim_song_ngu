import React from 'react';

export default function Sidebar({
  showSidebar,
  sidebarTab,
  setSidebarTab,
  selectedShow,
  selectedSeason,
  selectedEpisodeId,
  showsData,
  watchedEpisodes,
  handleShowChange,
  handleSeasonChange,
  handleEpisodeChange,
  subtitles,
  savedSentences,
  currentEpisode,
  activeSidebarSub,
  videoRef,
  setPausedSub,
  setRevealedIndices,
  setIsPlaying,
  formatTime,
  setSyncingSegment,
  copyFeedback,
  handleCopySubtitle,
  handleAiExplain,
  removeSentence,
  saveSentence,
  syncingSegment,
  followActiveSubtitleSync,
  handleSaveTimeSync,
  setFollowActiveSubtitleSync,
  savedVocab,
  clearAllVocab,
  removeWord,
  playSavedSentence
}) {
  return (
    <aside className={`sidebar ${showSidebar ? 'open' : ''}`}>
      {/* Sidebar Selectors */}
      <div className="sidebar-selectors">
        <select 
          onChange={(e) => handleShowChange(e.target.value)}
          value={selectedShow}
          title="Chọn phim"
        >
          {Object.keys(showsData).map(showId => (
            <option key={showId} value={showId}>{showsData[showId].title}</option>
          ))}
        </select>

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
                      setPausedSub(null);
                      setRevealedIndices([]);
                      videoRef.current.currentTime = sub.start;
                      videoRef.current.play().then(() => setIsPlaying(true));
                    }
                  }}
                >
                  <div className="transcript-header-bar">
                    <span className="transcript-time">{formatTime(sub.start)}</span>
                    <div className="transcript-actions" onClick={(e) => e.stopPropagation()}>
                      <button 
                        className="btn-sub-copy-compact"
                        onClick={() => setSyncingSegment({
                          index: sub.index,
                          start: sub.start,
                          end: sub.end,
                          english: sub.english,
                          vietnamese: sub.vietnamese
                        })}
                        title="Chỉnh đồng bộ và sửa chữ câu thoại này"
                      >
                        ✏️
                      </button>
                      <button 
                        className={`btn-sub-copy-compact ${copyFeedback === `${sub.start}_raw` ? 'copied' : ''}`}
                        onClick={() => handleCopySubtitle(sub, index, 'raw')}
                        title="Sao chép câu thoại gốc"
                      >
                        {copyFeedback === `${sub.start}_raw` ? '✓' : 'Sub'}
                      </button>
                      <button 
                        className={`btn-sub-copy-compact ${copyFeedback === `${sub.start}_prompt` ? 'copied' : ''}`}
                        onClick={() => handleCopySubtitle(sub, index, 'prompt')}
                        title="Sao chép Prompt Gemini"
                      >
                        {copyFeedback === `${sub.start}_prompt` ? '✓' : 'Gem'}
                      </button>
                      <button
                        className="btn-sub-copy-compact btn-sidebar-ai"
                        onClick={() => handleAiExplain(sub)}
                        title="Giải thích nhanh với AI"
                      >
                        ✨ AI
                      </button>
                      <button 
                        className={`btn-save-sentence-star ${isSaved ? 'saved' : ''}`}
                        onClick={() => {
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
                  </div>
                  <p className="transcript-en">{sub.english}</p>
                  <p className="transcript-vi">{sub.vietnamese}</p>

                  {/* Subtitle Sync Editor Panel */}
                  {((syncingSegment && syncingSegment.index === sub.index) || followActiveSubtitleSync) && (
                    <div className="sub-sync-editor-panel" onClick={(e) => e.stopPropagation()}>
                      <div className="sync-editor-row">
                        <button className="btn-sync-adjust" onClick={() => {
                          if (followActiveSubtitleSync) {
                            handleSaveTimeSync(sub.index, Math.max(0, sub.start - 0.5), sub.end, sub.english, sub.vietnamese);
                          } else {
                            setSyncingSegment(prev => ({ ...prev, start: Math.max(0, prev.start - 0.5) }));
                          }
                        }}>-0.5s</button>
                        <button className="btn-sync-adjust" onClick={() => {
                          if (followActiveSubtitleSync) {
                            handleSaveTimeSync(sub.index, Math.max(0, sub.start - 0.3), sub.end, sub.english, sub.vietnamese);
                          } else {
                            setSyncingSegment(prev => ({ ...prev, start: Math.max(0, prev.start - 0.3) }));
                          }
                        }}>-0.3s</button>
                        <button className="btn-sync-adjust" onClick={() => {
                          if (followActiveSubtitleSync) {
                            handleSaveTimeSync(sub.index, Math.max(0, sub.start - 0.1), sub.end, sub.english, sub.vietnamese);
                          } else {
                            setSyncingSegment(prev => ({ ...prev, start: Math.max(0, prev.start - 0.1) }));
                          }
                        }}>-0.1s</button>
                        <span className="sync-time-val">⏱ {followActiveSubtitleSync ? sub.start.toFixed(3) : syncingSegment?.start.toFixed(3)}s</span>
                        <button className="btn-sync-adjust" onClick={() => {
                          if (followActiveSubtitleSync) {
                            handleSaveTimeSync(sub.index, Math.min(sub.end - 0.05, sub.start + 0.1), sub.end, sub.english, sub.vietnamese);
                          } else {
                            setSyncingSegment(prev => ({ ...prev, start: Math.min(prev.end - 0.05, prev.start + 0.1) }));
                          }
                        }}>+0.1s</button>
                        <button className="btn-sync-adjust" onClick={() => {
                          if (followActiveSubtitleSync) {
                            handleSaveTimeSync(sub.index, Math.min(sub.end - 0.05, sub.start + 0.3), sub.end, sub.english, sub.vietnamese);
                          } else {
                            setSyncingSegment(prev => ({ ...prev, start: Math.min(prev.end - 0.05, prev.start + 0.3) }));
                          }
                        }}>+0.3s</button>
                        <button className="btn-sync-adjust" onClick={() => {
                          if (followActiveSubtitleSync) {
                            handleSaveTimeSync(sub.index, Math.min(sub.end - 0.05, sub.start + 0.5), sub.end, sub.english, sub.vietnamese);
                          } else {
                            setSyncingSegment(prev => ({ ...prev, start: Math.min(prev.end - 0.05, prev.start + 0.5) }));
                          }
                        }}>+0.5s</button>
                      </div>
                      <div className="sync-editor-row">
                        <button className="btn-sync-adjust" onClick={() => {
                          if (followActiveSubtitleSync) {
                            handleSaveTimeSync(sub.index, sub.start, Math.max(sub.start + 0.05, sub.end - 0.5), sub.english, sub.vietnamese);
                          } else {
                            setSyncingSegment(prev => ({ ...prev, end: Math.max(prev.start + 0.05, prev.end - 0.5) }));
                          }
                        }}>-0.5s</button>
                        <button className="btn-sync-adjust" onClick={() => {
                          if (followActiveSubtitleSync) {
                            handleSaveTimeSync(sub.index, sub.start, Math.max(sub.start + 0.05, sub.end - 0.3), sub.english, sub.vietnamese);
                          } else {
                            setSyncingSegment(prev => ({ ...prev, end: Math.max(prev.start + 0.05, prev.end - 0.3) }));
                          }
                        }}>-0.3s</button>
                        <button className="btn-sync-adjust" onClick={() => {
                          if (followActiveSubtitleSync) {
                            handleSaveTimeSync(sub.index, sub.start, Math.max(sub.start + 0.05, sub.end - 0.1), sub.english, sub.vietnamese);
                          } else {
                            setSyncingSegment(prev => ({ ...prev, end: Math.max(prev.start + 0.05, prev.end - 0.1) }));
                          }
                        }}>-0.1s</button>
                        <span className="sync-time-val">🛑 {followActiveSubtitleSync ? sub.end.toFixed(3) : syncingSegment?.end.toFixed(3)}s</span>
                        <button className="btn-sync-adjust" onClick={() => {
                          if (followActiveSubtitleSync) {
                            handleSaveTimeSync(sub.index, sub.start, sub.end + 0.1, sub.english, sub.vietnamese);
                          } else {
                            setSyncingSegment(prev => ({ ...prev, end: prev.end + 0.1 }));
                          }
                        }}>+0.1s</button>
                        <button className="btn-sync-adjust" onClick={() => {
                          if (followActiveSubtitleSync) {
                            handleSaveTimeSync(sub.index, sub.start, sub.end + 0.3, sub.english, sub.vietnamese);
                          } else {
                            setSyncingSegment(prev => ({ ...prev, end: prev.end + 0.3 }));
                          }
                        }}>+0.3s</button>
                        <button className="btn-sync-adjust" onClick={() => {
                          if (followActiveSubtitleSync) {
                            handleSaveTimeSync(sub.index, sub.start, sub.end + 0.5, sub.english, sub.vietnamese);
                          } else {
                            setSyncingSegment(prev => ({ ...prev, end: prev.end + 0.5 }));
                          }
                        }}>+0.5s</button>
                      </div>
                      
                      {/* Text Inputs for English & Vietnamese */}
                      <div className="sync-editor-text-row">
                        <input 
                          type="text" 
                          className="sync-text-input" 
                          placeholder="Sửa nội dung phụ đề tiếng Anh..."
                          value={followActiveSubtitleSync ? sub.english : (syncingSegment?.english || '')} 
                          onChange={(e) => {
                            if (followActiveSubtitleSync) {
                              handleSaveTimeSync(sub.index, sub.start, sub.end, e.target.value, sub.vietnamese);
                            } else {
                              setSyncingSegment(prev => ({ ...prev, english: e.target.value }));
                            }
                          }}
                        />
                      </div>
                      <div className="sync-editor-text-row">
                        <input 
                          type="text" 
                          className="sync-text-input" 
                          placeholder="Sửa dịch phụ đề tiếng Việt..."
                          value={followActiveSubtitleSync ? sub.vietnamese : (syncingSegment?.vietnamese || '')} 
                          onChange={(e) => {
                            if (followActiveSubtitleSync) {
                              handleSaveTimeSync(sub.index, sub.start, sub.end, sub.english, e.target.value);
                            } else {
                              setSyncingSegment(prev => ({ ...prev, vietnamese: e.target.value }));
                            }
                          }}
                        />
                      </div>

                      <div className="sync-editor-actions">
                        <button className="btn-sync-cancel" onClick={() => {
                          if (followActiveSubtitleSync) {
                            setFollowActiveSubtitleSync(false);
                          } else {
                            setSyncingSegment(null);
                          }
                        }}>{followActiveSubtitleSync ? 'Tắt Auto' : 'Hủy'}</button>
                        {!followActiveSubtitleSync && (
                          <button className="btn-sync-save" onClick={() => handleSaveTimeSync(sub.index, syncingSegment.start, syncingSegment.end, syncingSegment.english, syncingSegment.vietnamese)}>Lưu vĩnh viễn</button>
                        )}
                      </div>
                    </div>
                  )}
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
  );
}
