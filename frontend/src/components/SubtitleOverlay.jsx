import React from 'react';
import { getBlankedIndices } from '../utils/helpers';

export default function SubtitleOverlay({
  pausedSub,
  activeSub,
  showEnglish,
  showVietnamese,
  blankLevel,
  revealedIndices,
  revealedIndicesRef,
  setRevealedIndices,
  dragStartIdx,
  setDragStartIdx,
  dragEndIdx,
  setDragEndIdx,
  dragOccurred,
  setDragOccurred,
  startRectRef,
  justDraggedRef,
  translateAndShowPopover,
  handleSubtitleMouseUp
}) {
  const subToUse = pausedSub || activeSub;

  if (!subToUse || (!showEnglish && !showVietnamese)) return null;

  const renderCleanWords = (lineText) => {
    const words = lineText.split(/(\s+)/);
    const blankedIndices = getBlankedIndices(lineText, blankLevel);
    
    const isSelecting = dragStartIdx !== null && dragEndIdx !== null;
    const minIdx = isSelecting ? Math.min(dragStartIdx, dragEndIdx) : -1;
    const maxIdx = isSelecting ? Math.max(dragStartIdx, dragEndIdx) : -1;

    return words.map((chunk, idx) => {
      if (chunk.trim() === '') return chunk;
      
      const cleanWord = chunk.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"]/g, "");
      const isBlankedWord = blankedIndices.has(idx);
      const isCurrentlyRevealed = revealedIndices.includes(idx);
      
      const displayChunk = (isBlankedWord && !isCurrentlyRevealed)
        ? chunk.replace(/[a-zA-Z]/g, "_")
        : chunk;
         
      const isShowingPlaceholder = isBlankedWord && !isCurrentlyRevealed;
      const isSelected = isSelecting && idx >= minIdx && idx <= maxIdx;

      return (
        <span 
          key={idx} 
          className={`word-span ${isBlankedWord ? 'blanked' : ''} ${isCurrentlyRevealed && isBlankedWord ? 'revealed' : ''} ${isSelected ? 'word-selected' : ''}`}
          onMouseDown={(e) => {
            if (isShowingPlaceholder) return;
            e.preventDefault();
            e.stopPropagation();
            setDragStartIdx(idx);
            setDragEndIdx(idx);
            setDragOccurred(false);
            startRectRef.current = e.currentTarget.getBoundingClientRect();
          }}
          onMouseEnter={() => {
            if (dragStartIdx !== null) {
              setDragEndIdx(idx);
              setDragOccurred(true);
            }
          }}
          onMouseUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (dragStartIdx !== null && dragEndIdx !== null && dragOccurred) {
              const start = Math.min(dragStartIdx, dragEndIdx);
              const end = Math.max(dragStartIdx, dragEndIdx);
              
              const selectedChunks = words.slice(start, end + 1);
              const selectedText = selectedChunks.join('').trim();
              const cleanText = selectedText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"]/g, "");
              
              const endRect = e.currentTarget.getBoundingClientRect();
              const startRect = startRectRef.current || endRect;
              
              const unionRect = {
                left: Math.min(startRect.left, endRect.left),
                top: Math.min(startRect.top, endRect.top),
                right: Math.max(startRect.right, endRect.right),
                bottom: Math.max(startRect.bottom, endRect.bottom)
              };
              unionRect.width = unionRect.right - unionRect.left;
              unionRect.height = unionRect.bottom - unionRect.top;
              
              justDraggedRef.current = true;
              translateAndShowPopover(cleanText, unionRect);
            }
            setDragStartIdx(null);
            setDragEndIdx(null);
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (isShowingPlaceholder) {
              const nextIndices = [...revealedIndicesRef.current, idx];
              revealedIndicesRef.current = nextIndices;
              setRevealedIndices(nextIndices);
            } else if (!dragOccurred) {
              const rect = e.currentTarget.getBoundingClientRect();
              translateAndShowPopover(cleanWord, rect);
            }
            setDragOccurred(false);
          }}
          title={isShowingPlaceholder ? "Click to reveal" : "Click to translate / Hold & drag to select phrase"}
        >
          {displayChunk}
        </span>
      );
    });
  };

  return (
    <div className="subtitles-overlay" onMouseUp={handleSubtitleMouseUp}>
      {showEnglish && (
        <div className="sub-english">
          {renderCleanWords(subToUse.english)}
        </div>
      )}
      {showVietnamese && (
        <div className="sub-vietnamese">
          {subToUse.vietnamese}
        </div>
      )}
    </div>
  );
}
