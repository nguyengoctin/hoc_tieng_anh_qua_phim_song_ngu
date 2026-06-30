import React from 'react';
import { X, Check, Edit3 } from 'lucide-react';

export default function AiExplainPanel({ aiPanel, aiPanelSentence, aiPanelTranslation, onClose, parseMarkdown, onApplyTranslation }) {
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
                <div className="google-dict-vocab">
                  <strong>💡 Focus:</strong>{' '}
                  <span>
                    {parseMarkdown(
                      aiPanel.data.key_vocabulary || 
                      aiPanel.data.tip || 
                      aiPanel.data.idiom_slang
                    )}
                  </span>
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
