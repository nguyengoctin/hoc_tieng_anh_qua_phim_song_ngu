import React, { useState } from 'react';
import { BookOpen, Star, Bookmark, Play, Trash2, Edit2, Copy, Bot, Sparkles, Volume2, Eye, EyeOff } from 'lucide-react';

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
  setSavedVocab,
  clearAllVocab,
  removeWord,
  playSavedSentence
}) {
  const [revealedSrsWords, setRevealedSrsWords] = useState(new Set());
  const [fadingWords, setFadingWords] = useState({});
  const [vocabSearch, setVocabSearch] = useState('');

  const toggleRevealSrsWord = (word) => {
    setRevealedSrsWords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(word)) {
        newSet.delete(word);
      } else {
        newSet.add(word);
      }
      return newSet;
    });
  };

  const handleSrsReview = (word, quality) => {
    // Start fade-out transition
    setFadingWords(prev => ({ ...prev, [word]: true }));

    setTimeout(() => {
      fetch(`${API_BASE}/api/vocabulary/${encodeURIComponent(word)}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quality })
      })
      .then(res => res.json())
      .then(json => {
        if (json.status === 'ok') {
          setSavedVocab(prev => prev.map(item => {
            if (item.word === word) {
              return { ...item, ...json.data };
            }
            return item;
          }));
          setRevealedSrsWords(prev => {
            const newSet = new Set(prev);
            newSet.delete(word);
            return newSet;
          });
          setFadingWords(prev => {
            const newObj = { ...prev };
            delete newObj[word];
            return newObj;
          });
        }
      })
      .catch(err => {
        console.error("Error submitting SRS review:", err);
        setFadingWords(prev => {
          const newObj = { ...prev };
          delete newObj[word];
          return newObj;
        });
      });
    }, 350); // Matches the CSS transition time of 0.35s
  };

  const formatNextReview = (isoString) => {
    if (!isoString) return 'Chưa ôn';
    const date = new Date(isoString);
    const now = new Date();
    const d1 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const d2 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffTime = d1 - d2;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 'Đến hạn';
    return `Sau ${diffDays} ngày`;
  };

  const srsDueCount = savedVocab.filter(item => !item.next_review || new Date(item.next_review) <= new Date()).length;

  return (
    <aside className={`sidebar ${showSidebar ? 'open' : ''}`}>
      {/* Sidebar Selectors */}
      <div className="sidebar-selectors">
        <select 
          onChange={(e) => handleShowChange(e.target.value)}
          value={selectedShow}
          tabIndex="-1"
          title="Chọn phim"
        >
          {Object.keys(showsData).map(showId => (
            <option key={showId} value={showId}>{showsData[showId].title}</option>
          ))}
        </select>

        <select 
          onChange={(e) => handleSeasonChange(selectedShow, e.target.value)}
          value={selectedSeason}
          tabIndex="-1"
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
          tabIndex="-1"
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
          tabIndex="-1"
        >
          <BookOpen size={13} style={{ marginRight: '4px' }} />
          Kịch bản
        </button>
        <button 
          className={`tab-btn ${sidebarTab === 'vocab' ? 'active' : ''}`}
          onClick={() => setSidebarTab('vocab')}
          tabIndex="-1"
        >
          <Star size={13} style={{ marginRight: '4px' }} />
          Sổ từ ({savedVocab.length})
        </button>
        <button 
          className={`tab-btn ${sidebarTab === 'srs' ? 'active' : ''}`}
          onClick={() => setSidebarTab('srs')}
          tabIndex="-1"
          style={{ position: 'relative' }}
        >
          <Sparkles size={13} style={{ marginRight: '4px' }} />
          Ôn tập {srsDueCount > 0 && `(${srsDueCount})`}
        </button>
        <button 
          className={`tab-btn ${sidebarTab === 'sentences' ? 'active' : ''}`}
          onClick={() => setSidebarTab('sentences')}
          tabIndex="-1"
        >
          <Bookmark size={13} style={{ marginRight: '4px' }} />
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
                    videoRef.current.currentTime = sub.start + 0.02; // Cộng thêm 20ms để tránh lệch điểm dừng về câu trước
                    videoRef.current.play().then(() => setIsPlaying(true));
                  }
                }}
              >
                <div className="transcript-header-bar">
                  <span className="transcript-time">{formatTime(sub.start)}</span>
                  <div className="transcript-actions" onClick={(e) => e.stopPropagation()}>
                    <button 
                      className="btn-sub-copy-compact"
                      tabIndex="-1"
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
                      tabIndex="-1"
                      onClick={() => handleCopySubtitle(sub, index, 'raw')}
                      title="Sao chép câu thoại gốc tiếng Anh"
                    >
                      <Copy size={12} />
                    </button>
                    <button
                      className="btn-sub-copy-compact btn-sidebar-ai"
                      tabIndex="-1"
                      onClick={() => handleAiExplain(sub)}
                      title="AI giải nghĩa và phân tích nhanh ngữ cảnh"
                    >
                      <Sparkles size={12} />
                    </button>
                    <button 
                      className={`btn-save-sentence-star ${isSaved ? 'saved' : ''}`}
                      tabIndex="-1"
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
                        <button className="btn-adjust-minimal" tabIndex="-1" onClick={() => {
                          if (followActiveSubtitleSync) {
                            handleSaveTimeSync(sub.index, Math.max(0, sub.start - 0.5), sub.end, sub.english, sub.vietnamese);
                          } else {
                            setSyncingSegment(prev => ({ ...prev, start: Math.max(0, prev.start - 0.5) }));
                          }
                        }}>-0.5s</button>
                        <button className="btn-adjust-minimal" tabIndex="-1" onClick={() => {
                          if (followActiveSubtitleSync) {
                            handleSaveTimeSync(sub.index, Math.max(0, sub.start - 0.1), sub.end, sub.english, sub.vietnamese);
                          } else {
                            setSyncingSegment(prev => ({ ...prev, start: Math.max(0, prev.start - 0.1) }));
                          }
                        }}>-0.1s</button>
                        <button className="btn-adjust-minimal" tabIndex="-1" onClick={() => {
                          if (followActiveSubtitleSync) {
                            handleSaveTimeSync(sub.index, Math.min(sub.end - 0.05, sub.start + 0.1), sub.end, sub.english, sub.vietnamese);
                          } else {
                            setSyncingSegment(prev => ({ ...prev, start: Math.min(prev.end - 0.05, prev.start + 0.1) }));
                          }
                        }}>+0.1s</button>
                        <button className="btn-adjust-minimal" tabIndex="-1" onClick={() => {
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
                        <button className="btn-adjust-minimal" tabIndex="-1" onClick={() => {
                          if (followActiveSubtitleSync) {
                            handleSaveTimeSync(sub.index, sub.start, Math.max(sub.start + 0.05, sub.end - 0.5), sub.english, sub.vietnamese);
                          } else {
                            setSyncingSegment(prev => ({ ...prev, end: Math.max(prev.start + 0.05, prev.end - 0.5) }));
                          }
                        }}>-0.5s</button>
                        <button className="btn-adjust-minimal" tabIndex="-1" onClick={() => {
                          if (followActiveSubtitleSync) {
                            handleSaveTimeSync(sub.index, sub.start, Math.max(sub.start + 0.05, sub.end - 0.1), sub.english, sub.vietnamese);
                          } else {
                            setSyncingSegment(prev => ({ ...prev, end: Math.max(prev.start + 0.05, prev.end - 0.1) }));
                          }
                        }}>-0.1s</button>
                        <button className="btn-adjust-minimal" tabIndex="-1" onClick={() => {
                          if (followActiveSubtitleSync) {
                            handleSaveTimeSync(sub.index, sub.start, sub.end + 0.1, sub.english, sub.vietnamese);
                          } else {
                            setSyncingSegment(prev => ({ ...prev, end: prev.end + 0.1 }));
                          }
                        }}>+0.1s</button>
                        <button className="btn-adjust-minimal" tabIndex="-1" onClick={() => {
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
                      <button className="btn-sync-cancel-minimal" tabIndex="-1" onClick={() => {
                        if (followActiveSubtitleSync) {
                          setFollowActiveSubtitleSync(false);
                        } else {
                          setSyncingSegment(null);
                        }
                      }}>{followActiveSubtitleSync ? 'Tắt Auto' : 'Hủy'}</button>
                      {!followActiveSubtitleSync && (
                        <button className="btn-sync-save-minimal" tabIndex="-1" onClick={() => handleSaveTimeSync(sub.index, syncingSegment.start, syncingSegment.end, syncingSegment.english, syncingSegment.vietnamese)}>Lưu</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Tab 2: Sổ từ (vocab) */}
        <div className="vocab-list" style={{ display: sidebarTab === 'vocab' ? 'block' : 'none' }}>
          {savedVocab.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
              {/* Search input */}
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Tìm kiếm từ vựng..."
                  value={vocabSearch}
                  onChange={e => setVocabSearch(e.target.value)}
                  tabIndex="-1"
                  style={{
                    width: '100%',
                    padding: '8px 32px 8px 12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(167, 139, 250, 0.4)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
                {vocabSearch && (
                  <button
                    onClick={() => setVocabSearch('')}
                    tabIndex="-1"
                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                  >
                    ✕
                  </button>
                )}
              </div>
              <button 
                className="btn-clear-all-vocab" 
                style={{ margin: 0, padding: '8px', borderRadius: '8px', fontSize: '11px', background: 'rgba(255, 77, 79, 0.08)', color: '#ff4d4f', borderColor: 'rgba(255, 77, 79, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} 
                tabIndex="-1" 
                onClick={clearAllVocab}
              >
                <Trash2 size={12} style={{ marginRight: '6px' }} />
                Xóa tất cả từ đã lưu
              </button>
            </div>
          )}

          {savedVocab.length === 0 ? (
            <p className="empty-message">Sổ từ hiện đang trống.</p>
          ) : (() => {
            const filtered = savedVocab.filter(item => {
              const q = vocabSearch.trim().toLowerCase();
              if (!q) return true;
              return (
                item.word?.toLowerCase().includes(q) ||
                item.translation?.toLowerCase().includes(q) ||
                item.ipa?.toLowerCase().includes(q)
              );
            });
            if (filtered.length === 0) return (
              <p className="empty-message" style={{ opacity: 0.5 }}>Không tìm thấy từ nào.</p>
            );
            return filtered.map((item, idx) => (
              <div key={idx} className="vocab-item">
                <div className="vocab-word-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="vocab-word">{item.word}</span>
                    {item.part_of_speech && (
                      <span className="popover-pos-badge" style={{ margin: 0 }}>
                        {item.part_of_speech}
                      </span>
                    )}
                    {item.audio_url && (
                      <button 
                        className="btn-audio-pronounce"
                        tabIndex="-1"
                        onClick={() => {
                          const audio = new Audio(item.audio_url);
                          audio.play().catch(err => console.error("Audio play error:", err));
                        }}
                        title="Nghe phát âm"
                      >
                        <Volume2 size={14} />
                      </button>
                    )}
                  </div>
                  <button className="btn-remove-vocab" tabIndex="-1" onClick={() => removeWord(item.word)}>
                    <Trash2 size={12} />
                  </button>
                </div>
                {item.ipa && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span className="vocab-ipa">{item.ipa}</span>
                  </div>
                )}
                <p className="vocab-translation" style={{ marginTop: '4px' }}>
                  {item.translation}
                </p>
                
                {/* SRS statistics panel */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed rgba(255,255,255,0.05)', fontSize: '11px' }}>
                  {item.repetitions > 0 ? (
                    <>
                      <span style={{ color: '#2ed573', fontWeight: '600' }}>Ôn: {item.repetitions}</span>
                      <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
                      <span style={{ color: 'rgba(255,255,255,0.45)' }}>
                        {formatNextReview(item.next_review)}
                      </span>
                    </>
                  ) : (
                    <span style={{ color: '#ffca4a', background: 'rgba(255, 202, 74, 0.08)', padding: '2px 6px', borderRadius: '4px', fontWeight: '600', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Mới</span>
                  )}
                </div>
              </div>
            ));
          })()}
        </div>

        {/* Tab 3: Ôn tập (srs) */}
        <div className="srs-list" style={{ display: sidebarTab === 'srs' ? 'block' : 'none' }}>
          {savedVocab.filter(item => !item.next_review || new Date(item.next_review) <= new Date()).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', background: 'rgba(46, 213, 115, 0.04)', borderRadius: '12px', border: '1px solid rgba(46, 213, 115, 0.15)', marginTop: '8px' }}>
              <h4 style={{ margin: '0 0 6px 0', color: '#2ed573', fontSize: '14px', fontWeight: '700' }}>Hoàn thành mục tiêu</h4>
              <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5' }}>Bạn đã ôn tập hết từ vựng của ngày hôm nay. Hãy tiếp tục xem phim để tích lũy thêm nhé!</p>
            </div>
          ) : (
            savedVocab
              .filter(item => !item.next_review || new Date(item.next_review) <= new Date())
              .map((item, idx) => {
                const isSrsRevealed = revealedSrsWords.has(item.word);
                const isFading = fadingWords[item.word];

                return (
                  <div 
                    key={idx} 
                    className={`vocab-item ${isFading ? 'fade-out' : ''}`}
                    onClick={() => !isSrsRevealed && toggleRevealSrsWord(item.word)}
                    style={{ cursor: !isSrsRevealed ? 'pointer' : 'default', transition: 'all 0.25s ease' }}
                  >
                    <div className="vocab-word-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className="vocab-word">{item.word}</span>
                        {item.part_of_speech && (
                          <span className="popover-pos-badge" style={{ margin: 0 }}>
                            {item.part_of_speech}
                          </span>
                        )}
                        {item.audio_url && (
                          <button 
                            className="btn-audio-pronounce"
                            tabIndex="-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              const audio = new Audio(item.audio_url);
                              audio.play().catch(err => console.error("Audio play error:", err));
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', padding: '2px', color: '#ffca4a' }}
                          >
                            <Volume2 size={14} />
                          </button>
                        )}
                      </div>
                      <button 
                        className="btn-remove-vocab" 
                        tabIndex="-1" 
                        onClick={(e) => {
                          e.stopPropagation();
                          removeWord(item.word);
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    
                    {item.ipa && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: isSrsRevealed ? '12px' : 0 }}>
                        <span className="vocab-ipa" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>{item.ipa}</span>
                      </div>
                    )}

                    {!isSrsRevealed ? (
                      <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11px', color: 'rgba(255,255,255,0.25)', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px' }}>
                        <span>Chạm vào thẻ để hiện nghĩa</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '12px' }}>
                        <p 
                          className="vocab-translation" 
                          style={{ margin: 0, fontSize: '13px', color: '#bdc1c6', fontWeight: '500', lineHeight: '1.4' }}
                        >
                          {item.translation}
                        </p>
                        
                        {item.repetitions > 0 && (
                          <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.3)', display: 'flex', gap: '6px', marginTop: '2px' }}>
                            <span>Ôn: {item.repetitions}</span>
                            <span>•</span>
                            <span>Hệ số: {item.efactor?.toFixed(1) || '2.5'}</span>
                          </div>
                        )}
                        
                        <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleSrsReview(item.word, 1); }}
                            className="btn-srs-action srs-again"
                            title="Không nhớ - Ôn lại ngay sau 1 ngày"
                          >
                            Quên
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleSrsReview(item.word, 2); }}
                            className="btn-srs-action srs-hard"
                            title="Nhớ mang máng/Khó - Ôn lại sau 3 ngày"
                          >
                            Khó
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleSrsReview(item.word, 3); }}
                            className="btn-srs-action srs-easy"
                            title="Nhớ tốt/Dễ - Ôn lại sau 6+ ngày"
                          >
                            Dễ
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
          )}
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
                      tabIndex="-1"
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
