import React from 'react';
import { BookOpen, Star, Bookmark, Play, Trash2, Edit2, Copy, Bot, Sparkles, Volume2 } from 'lucide-react';

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
  handleCopySubtitlePrompt,
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
          <BookOpen size={14} style={{ marginRight: '6px' }} />
          Kịch bản
        </button>
        <button 
          className={`tab-btn ${sidebarTab === 'vocab' ? 'active' : ''}`}
          onClick={() => setSidebarTab('vocab')}
        >
          <Star size={14} style={{ marginRight: '6px' }} />
          Từ vựng ({savedVocab.length})
        </button>
        <button 
          className={`tab-btn ${sidebarTab === 'sentences' ? 'active' : ''}`}
          onClick={() => setSidebarTab('sentences')}
        >
          <Bookmark size={14} style={{ marginRight: '6px' }} />
          Đã lưu ({savedSentences.length})
        </button>
      </div>

      <div className="sidebar-content">
        <div className="transcript-list" style={{ display: sidebarTab === 'script' ? 'block' : 'none' }}>
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
                      title="Chỉnh sửa và đồng bộ thời gian phụ đề"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button 
                      className={`btn-sub-copy-compact ${copyFeedback === `${sub.start}_raw` ? 'copied' : ''}`}
                      onClick={() => handleCopySubtitle(sub, index, 'raw')}
                      title="Sao chép câu thoại gốc tiếng Anh"
                    >
                      <Copy size={12} />
                    </button>
                    <button 
                      className={`btn-sub-copy-compact ${copyFeedback === `${sub.start}_prompt` ? 'copied' : ''}`}
                      onClick={() => handleCopySubtitle(sub, index, 'prompt')}
                      title="Sao chép Prompt học từ vựng gửi Gemini"
                    >
                      <Bot size={12} />
                    </button>
                    <button
                      className="btn-sub-copy-compact btn-sidebar-ai"
                      onClick={() => handleAiExplain(sub)}
                      title="AI giải nghĩa và phân tích nhanh ngữ cảnh"
                    >
                      <Sparkles size={12} />
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
                      title={isSaved ? "Xóa khỏi danh sách câu thoại đã lưu" : "Lưu câu thoại này"}
                    >
                      <Star size={12} fill={isSaved ? "#ffca4a" : "none"} color={isSaved ? "#ffca4a" : "#8a8d98"} />
                    </button>
                  </div>
                </div>
                <p className="transcript-en">{sub.english}</p>
                <p className="transcript-vi">{sub.vietnamese}</p>

                {/* Subtitle Sync Editor Panel */}
                {((syncingSegment && syncingSegment.index === sub.index) || followActiveSubtitleSync) && (
                  <div className="sub-sync-editor-panel" onClick={(e) => e.stopPropagation()}>
                    {/* Start Time row */}
                    <div className="sync-editor-row-compact">
                      <span className="sync-time-label">Bắt đầu ({followActiveSubtitleSync ? sub.start.toFixed(2) : syncingSegment?.start.toFixed(2)}s)</span>
                      <div className="sync-btn-group-compact">
                        <button className="btn-adjust-minimal" onClick={() => {
                          if (followActiveSubtitleSync) {
                            handleSaveTimeSync(sub.index, Math.max(0, sub.start - 0.5), sub.end, sub.english, sub.vietnamese);
                          } else {
                            setSyncingSegment(prev => ({ ...prev, start: Math.max(0, prev.start - 0.5) }));
                          }
                        }}>-0.5s</button>
                        <button className="btn-adjust-minimal" onClick={() => {
                          if (followActiveSubtitleSync) {
                            handleSaveTimeSync(sub.index, Math.max(0, sub.start - 0.1), sub.end, sub.english, sub.vietnamese);
                          } else {
                            setSyncingSegment(prev => ({ ...prev, start: Math.max(0, prev.start - 0.1) }));
                          }
                        }}>-0.1s</button>
                        <button className="btn-adjust-minimal" onClick={() => {
                          if (followActiveSubtitleSync) {
                            handleSaveTimeSync(sub.index, Math.min(sub.end - 0.05, sub.start + 0.1), sub.end, sub.english, sub.vietnamese);
                          } else {
                            setSyncingSegment(prev => ({ ...prev, start: Math.min(prev.end - 0.05, prev.start + 0.1) }));
                          }
                        }}>+0.1s</button>
                        <button className="btn-adjust-minimal" onClick={() => {
                          if (followActiveSubtitleSync) {
                            handleSaveTimeSync(sub.index, Math.min(sub.end - 0.05, sub.start + 0.5), sub.end, sub.english, sub.vietnamese);
                          } else {
                            setSyncingSegment(prev => ({ ...prev, start: Math.min(prev.end - 0.05, prev.start + 0.5) }));
                          }
                        }}>+0.5s</button>
                      </div>
                    </div>

                    {/* End Time row */}
                    <div className="sync-editor-row-compact">
                      <span className="sync-time-label">Kết thúc ({followActiveSubtitleSync ? sub.end.toFixed(2) : syncingSegment?.end.toFixed(2)}s)</span>
                      <div className="sync-btn-group-compact">
                        <button className="btn-adjust-minimal" onClick={() => {
                          if (followActiveSubtitleSync) {
                            handleSaveTimeSync(sub.index, sub.start, Math.max(sub.start + 0.05, sub.end - 0.5), sub.english, sub.vietnamese);
                          } else {
                            setSyncingSegment(prev => ({ ...prev, end: Math.max(prev.start + 0.05, prev.end - 0.5) }));
                          }
                        }}>-0.5s</button>
                        <button className="btn-adjust-minimal" onClick={() => {
                          if (followActiveSubtitleSync) {
                            handleSaveTimeSync(sub.index, sub.start, Math.max(sub.start + 0.05, sub.end - 0.1), sub.english, sub.vietnamese);
                          } else {
                            setSyncingSegment(prev => ({ ...prev, end: Math.max(prev.start + 0.05, prev.end - 0.1) }));
                          }
                        }}>-0.1s</button>
                        <button className="btn-adjust-minimal" onClick={() => {
                          if (followActiveSubtitleSync) {
                            handleSaveTimeSync(sub.index, sub.start, sub.end + 0.1, sub.english, sub.vietnamese);
                          } else {
                            setSyncingSegment(prev => ({ ...prev, end: prev.end + 0.1 }));
                          }
                        }}>+0.1s</button>
                        <button className="btn-adjust-minimal" onClick={() => {
                          if (followActiveSubtitleSync) {
                            handleSaveTimeSync(sub.index, sub.start, sub.end + 0.5, sub.english, sub.vietnamese);
                          } else {
                            setSyncingSegment(prev => ({ ...prev, end: prev.end + 0.5 }));
                          }
                        }}>+0.5s</button>
                      </div>
                    </div>
                    
                    {/* Text inputs */}
                    <input 
                      type="text" 
                      className="sync-text-input-minimal" 
                      placeholder="Sửa phụ đề tiếng Anh..."
                      value={followActiveSubtitleSync ? sub.english : (syncingSegment?.english || '')} 
                      onChange={(e) => {
                        if (followActiveSubtitleSync) {
                          handleSaveTimeSync(sub.index, sub.start, sub.end, e.target.value, sub.vietnamese);
                        } else {
                          setSyncingSegment(prev => ({ ...prev, english: e.target.value }));
                        }
                      }}
                    />
                    <input 
                      type="text" 
                      className="sync-text-input-minimal" 
                      placeholder="Sửa dịch tiếng Việt..."
                      value={followActiveSubtitleSync ? sub.vietnamese : (syncingSegment?.vietnamese || '')} 
                      onChange={(e) => {
                        if (followActiveSubtitleSync) {
                          handleSaveTimeSync(sub.index, sub.start, sub.end, sub.english, e.target.value);
                        } else {
                          setSyncingSegment(prev => ({ ...prev, vietnamese: e.target.value }));
                        }
                      }}
                    />

                    <div className="sync-editor-actions-minimal">
                      <button className="btn-sync-cancel-minimal" onClick={() => {
                        if (followActiveSubtitleSync) {
                          setFollowActiveSubtitleSync(false);
                        } else {
                          setSyncingSegment(null);
                        }
                      }}>{followActiveSubtitleSync ? 'Tắt Auto' : 'Hủy'}</button>
                      {!followActiveSubtitleSync && (
                        <button className="btn-sync-save-minimal" onClick={() => handleSaveTimeSync(sub.index, syncingSegment.start, syncingSegment.end, syncingSegment.english, syncingSegment.vietnamese)}>Lưu</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="vocab-list" style={{ display: sidebarTab === 'vocab' ? 'block' : 'none' }}>
          {savedVocab.length > 0 && (
            <button className="btn-clear-all-vocab" onClick={clearAllVocab}>
              <Trash2 size={12} style={{ marginRight: '6px' }} />
              Xóa tất cả từ đã lưu
            </button>
          )}
          {savedVocab.map((item, idx) => (
            <div key={idx} className="vocab-item">
              <div className="vocab-word-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="vocab-word">{item.word}</span>
                  {item.audio_url && (
                    <button 
                      className="btn-audio-pronounce"
                      onClick={() => {
                        const audio = new Audio(item.audio_url);
                        audio.play().catch(err => console.error("Audio play error:", err));
                      }}
                      title="Nghe phát âm"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '2px',
                        color: '#ffca4a'
                      }}
                    >
                      <Volume2 size={14} />
                    </button>
                  )}
                </div>
                <button className="btn-remove-vocab" onClick={() => removeWord(item.word)}>
                  <Trash2 size={12} />
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <span className="vocab-ipa">{item.ipa}</span>
                {item.part_of_speech && (
                  <span className="popover-pos-badge" style={{ margin: 0, fontSize: '9px', padding: '1px 4px' }}>
                    {item.part_of_speech}
                  </span>
                )}
              </div>
              <p className="vocab-translation">{item.translation}</p>
            </div>
          ))}
        </div>

        <div className="saved-sentences-list" style={{ display: sidebarTab === 'sentences' ? 'block' : 'none' }}>
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
                    <span className="saved-sentence-time">
                      <Play size={10} style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }} />
                      {formatTime(item.start)}
                    </span>
                    <button 
                      className="btn-remove-saved-sentence" 
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSentence(item.id);
                      }}
                      title="Xóa câu thoại"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <p className="saved-sentence-en">{item.english}</p>
                <p className="saved-sentence-vi">{item.vietnamese}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
