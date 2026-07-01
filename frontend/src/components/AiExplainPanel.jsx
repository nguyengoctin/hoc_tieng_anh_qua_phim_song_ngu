import React from 'react';
import { X, Check, Edit3, RotateCw, Plus } from 'lucide-react';

export default function AiExplainPanel({ 
  aiPanel, 
  aiPanelSentence, 
  aiPanelTranslation, 
  onClose, 
  parseMarkdown, 
  onApplyTranslation, 
  onRegenerate,
  savedVocab = [],
  onSaveFocusWord
}) {
  if (!aiPanel) return null;

  return (
    <div className="ai-explain-panel" onClick={(e) => e.stopPropagation()}>
      <div className="ai-explain-body">
        {/* Hàng đầu tiên: Câu thoại tiếng Anh + Nút áp dụng kịch bản + Nút đóng (X) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '15px', marginBottom: '8px', flexWrap: 'wrap' }}>
          <p className="ai-explain-sentence" style={{ margin: 0, flex: 1 }}>
            <strong>Câu thoại:</strong> "{aiPanelSentence}"
          </p>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {!aiPanel.loading && !aiPanel.error && aiPanel.data?.translation && (
              <button 
                className={`btn-sub-copy-compact ${aiPanel.applied ? 'copied' : ''}`}
                style={{ 
                  fontSize: '11px', 
                  padding: '4px 10px', 
                  borderRadius: '4px', 
                  border: aiPanel.applied ? '1px solid rgba(46, 213, 115, 0.3)' : '1px solid rgba(255, 202, 74, 0.3)', 
                  background: aiPanel.applied ? 'rgba(46, 213, 115, 0.08)' : 'rgba(255, 202, 74, 0.08)', 
                  color: aiPanel.applied ? '#2ed573' : '#ffca4a', 
                  fontWeight: '600', 
                  cursor: aiPanel.applied ? 'default' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  width: 'auto',
                  height: 'auto',
                  whiteSpace: 'nowrap'
                }}
                onClick={() => {
                  if (aiPanel.applied) return;
                  onApplyTranslation(
                    aiPanel.segmentIndex,
                    aiPanel.start,
                    aiPanel.end,
                    aiPanel.english,
                    aiPanel.data.translation
                  );
                }}
                disabled={aiPanel.applied}
                title="Cập nhật bản dịch này của AI làm phụ đề chính của phim"
              >
                {aiPanel.applied ? <Check size={12} /> : <Edit3 size={12} />}
                {aiPanel.applied ? 'Đã áp dụng kịch bản' : 'Áp dụng kịch bản'}
              </button>
            )}

            {!aiPanel.loading && !aiPanel.error && aiPanel.data && (
              <button 
                className="btn-sub-copy-compact"
                style={{ 
                  fontSize: '11px', 
                  padding: '4px 10px', 
                  borderRadius: '4px', 
                  border: '1px solid rgba(255, 255, 255, 0.15)', 
                  background: 'rgba(255, 255, 255, 0.05)', 
                  color: '#fff', 
                  fontWeight: '600', 
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  width: 'auto',
                  height: 'auto',
                  whiteSpace: 'nowrap'
                }}
                onClick={onRegenerate}
                title="Yêu cầu AI giải thích lại từ đầu (bỏ qua cache)"
              >
                <RotateCw size={12} />
                Tạo lại
              </button>
            )}

            <button 
              className="btn-close-ai" 
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'rgba(255, 255, 255, 0.4)', 
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px',
                transition: 'color 0.15s ease'
              }}
              onClick={onClose}
              title="Đóng bảng giải thích AI"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Hàng thứ hai: Dịch nghĩa */}
        {!aiPanel.loading && !aiPanel.error && aiPanel.data?.translation && (
          <p className="ai-explain-translation" style={{ color: '#ffca4a', margin: '0 0 16px 0', fontSize: '13.5px' }}>
            <strong>Dịch nghĩa:</strong> {aiPanel.data.translation}
          </p>
        )}
        {aiPanel.loading ? (
          <div className="ai-loading">
            <span className="spinner"></span> Đang kết nối AI giáo viên...
          </div>
        ) : aiPanel.error ? (
          <div className="ai-error">⚠️ {aiPanel.error}</div>
        ) : (
          <div className="ai-content">
            {/* Google-Style Dictionary Card Layout */}
            <div className="google-dict-card">
              <div className="google-dict-meta">
                {aiPanel.data?.tone && (
                  <span className="google-tone-badge">{aiPanel.data.tone}</span>
                )}
                <span className="google-dict-type">câu thoại</span>
              </div>

              {(aiPanel.data?.definition || aiPanel.data?.meaning) && (
                <div className="google-dict-definition">
                  <span className="google-number">1.</span>
                  <span className="google-def-text">
                    {parseMarkdown(aiPanel.data.definition || aiPanel.data.meaning)}
                  </span>
                </div>
              )}

              {(aiPanel.data?.key_vocabulary || aiPanel.data?.tip || aiPanel.data?.idiom_slang) && (
                <div className="google-dict-vocab" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <strong>💡 Focus:</strong>
                  {(() => {
                    const vocabData = aiPanel.data.key_vocabulary || aiPanel.data.tip || aiPanel.data.idiom_slang;
                    if (typeof vocabData === 'object' && vocabData !== null) {
                      return (
                        <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px', listStyleType: 'disc' }}>
                          {Object.entries(vocabData).map(([k, v], idx) => {
                            const isSaved = savedVocab.some(item => item.word.toLowerCase() === k.toLowerCase());
                            return (
                              <li key={idx} style={{ marginBottom: '8px', lineHeight: '1.4', fontSize: '13px' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                                  <span style={{ flex: 1 }}>
                                    <strong style={{ color: '#ffca4a' }}>{k}</strong>: {parseMarkdown(v)}
                                  </span>
                                  {onSaveFocusWord && (
                                    <button
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        color: isSaved ? '#2ed573' : 'rgba(255, 255, 255, 0.3)',
                                        cursor: 'pointer',
                                        padding: '0 4px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'color 0.15s ease'
                                      }}
                                      onClick={() => onSaveFocusWord(k, v)}
                                      title={isSaved ? "Xóa khỏi sổ từ vựng" : "Lưu vào sổ từ vựng"}
                                    >
                                      {isSaved ? <Check size={13} style={{ strokeWidth: 3 }} /> : <Plus size={13} style={{ strokeWidth: 3 }} />}
                                    </button>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      );
                    }
                    return <span>{parseMarkdown(vocabData)}</span>;
                  })()}
                </div>
              )}

              {aiPanel.data?.example && (
                <div className="google-dict-example-box">
                  <p className="google-example-eng">"{aiPanel.data.example}"</p>
                  {aiPanel.data?.example_translation && (
                    <p className="google-example-vi">→ {aiPanel.data.example_translation}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
