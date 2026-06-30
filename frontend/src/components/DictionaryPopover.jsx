import React from 'react';

export default function DictionaryPopover({
  clickedWord,
  popoverPos,
  wordDefinition,
  handleClosePopover,
  saveWord
}) {
  if (!clickedWord) return null;

  return (
    <div 
      className="dictionary-popover"
      style={{ top: `${popoverPos.top}px`, left: `${popoverPos.left}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      <button 
        className="btn-close-popover"
        onClick={(e) => handleClosePopover(e, true)}
        title="Đóng bảng tra cứu"
      >
        ✕
      </button>
      <div className="popover-header">
        <h4 className="popover-word">{clickedWord}</h4>
        {wordDefinition && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {wordDefinition.ipa && <span className="popover-ipa">{wordDefinition.ipa}</span>}
            {wordDefinition.audio_url && (
              <button 
                className="btn-audio-pronounce"
                onClick={() => {
                  const audio = new Audio(wordDefinition.audio_url);
                  audio.play().catch(err => console.error("Audio play error:", err));
                }}
                title="Nghe phát âm"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: '2px',
                  lineHeight: 1
                }}
              >
                🔊
              </button>
            )}
          </div>
        )}
      </div>
      {wordDefinition ? (
        <>
          {wordDefinition.part_of_speech && <span className="popover-pos-badge">{wordDefinition.part_of_speech}</span>}
          <p className="popover-def">{wordDefinition.translation}</p>
          <button className="btn-save-word" onClick={saveWord}>⭐ Lưu Từ</button>
        </>
      ) : (
        <p className="popover-def">Đang dịch...</p>
      )}
    </div>
  );
}
