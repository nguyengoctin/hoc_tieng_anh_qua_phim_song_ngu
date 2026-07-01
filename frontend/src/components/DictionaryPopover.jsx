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

      {/* Row 1: Word + Audio */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', paddingRight: '20px' }}>
        <h4 className="popover-word" style={{ margin: 0 }}>{clickedWord}</h4>
        {wordDefinition?.audio_url && (
          <button 
            className="btn-audio-pronounce"
            onClick={() => {
              const audio = new Audio(wordDefinition.audio_url);
              audio.play().catch(err => console.error("Audio play error:", err));
            }}
            title="Nghe phát âm"
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', padding: '4px', color: 'rgba(255,255,255,0.3)', transition: 'color 0.2s ease' }}
            onMouseEnter={e => e.currentTarget.style.color = '#ffca4a'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
          >
            <Volume2 size={15} />
          </button>
        )}
      </div>

      {/* Row 2: POS badge + IPA */}
      {wordDefinition && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          {wordDefinition.part_of_speech && (
            <span className="popover-pos-badge">{wordDefinition.part_of_speech}</span>
          )}
          {wordDefinition.ipa && (
            <span className="popover-ipa">{wordDefinition.ipa}</span>
          )}
        </div>
      )}

      {wordDefinition ? (
        <>
          {/* Row 3: Translation */}
          <p className="popover-def" style={{ margin: '0 0 14px 0' }}>{wordDefinition.translation}</p>

          {/* Row 4: Save button */}
          <button 
            className="btn-save-word" 
            onClick={saveWord}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
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
