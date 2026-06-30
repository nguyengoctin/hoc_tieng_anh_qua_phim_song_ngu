import React from 'react';

export default function AiExplainPanel({ aiPanel, aiPanelSentence, aiPanelTranslation, onClose, parseMarkdown, onApplyTranslation }) {
  if (!aiPanel) return null;

  return (
    <div className="ai-explain-panel" style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
      <button 
        className="btn-close-ai" 
        style={{ position: 'absolute', top: '12px', right: '15px', fontSize: '18px', zIndex: 10 }}
        onClick={onClose}
      >
        ✕
      </button>
      <div className="ai-explain-body" style={{ paddingTop: '10px' }}>
        <p className="ai-explain-sentence"><strong>Câu thoại:</strong> "{aiPanelSentence}"</p>
        {!aiPanel.loading && !aiPanel.error && aiPanel.data?.translation && (
          <p className="ai-explain-translation" style={{ color: '#ffca4a', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '15px', flexWrap: 'wrap' }}>
            <span><strong>Dịch nghĩa:</strong> {aiPanel.data.translation}</span>
            <button 
              className={`btn-sub-copy-compact ${aiPanel.applied ? 'copied' : ''}`}
              style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(255,202,74,0.3)', background: 'rgba(255,202,74,0.08)', color: '#ffca4a', fontWeight: '600', cursor: aiPanel.applied ? 'default' : 'pointer' }}
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
              {aiPanel.applied ? '✓ Đã áp dụng kịch bản' : '✍️ Áp dụng kịch bản'}
            </button>
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
                {aiPanel.data.tone && (
                  <span className="google-tone-badge">{aiPanel.data.tone}</span>
                )}
                <span className="google-dict-type">câu thoại</span>
              </div>

              {aiPanel.data.definition && (
                <div className="google-dict-definition">
                  <span className="google-number">1.</span>
                  <span className="google-def-text">{parseMarkdown(aiPanel.data.definition)}</span>
                </div>
              )}

              {aiPanel.data.key_vocabulary && (
                <div className="google-dict-vocab">
                  <strong>💡 Focus:</strong> <span>{parseMarkdown(aiPanel.data.key_vocabulary)}</span>
                </div>
              )}

              {aiPanel.data.example && (
                <div className="google-dict-example-box">
                  <p className="google-example-eng">"{aiPanel.data.example}"</p>
                  {aiPanel.data.example_translation && (
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
