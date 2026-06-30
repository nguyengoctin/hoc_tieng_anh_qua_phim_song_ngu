import React from 'react';
import { Volume2, Star, X } from 'lucide-react';

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
        <X size={14} />
      </button>
      <div className="popover-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingRight: '20px' }}>
        <h4 className="popover-word" style={{ margin: 0 }}>{clickedWord}</h4>
        {wordDefinition && wordDefinition.audio_url && (
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
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px',
              color: '#ffca4a'
            }}
          >
            <Volume2 size={16} />
          </button>
        )}
        {wordDefinition && wordDefinition.ipa && (
          <span className="popover-ipa" style={{ color: '#8a8d98', fontSize: '12px' }}>{wordDefinition.ipa}</span>
        )}
      </div>
      {wordDefinition ? (
        <>
          {wordDefinition.part_of_speech && <span className="popover-pos-badge">{wordDefinition.part_of_speech}</span>}
          <p className="popover-def" style={{ margin: '8px 0 12px 0' }}>{wordDefinition.translation}</p>
          <button 
            className="btn-save-word" 
            onClick={saveWord}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Star size={12} fill="#ffca4a" color="#ffca4a" /> Lưu từ
          </button>
        </>
      ) : (
        <p className="popover-def">Đang dịch...</p>
      )}
    </div>
  );
}
