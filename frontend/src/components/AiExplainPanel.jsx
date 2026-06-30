import React from 'react';

export default function AiExplainPanel({ aiPanel, aiPanelSentence, aiPanelTranslation, onClose, parseMarkdown }) {
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
          <p className="ai-explain-translation" style={{ color: '#ffca4a', marginBottom: '20px' }}>
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
