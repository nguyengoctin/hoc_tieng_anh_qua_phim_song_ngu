/**
 * Helper to format seconds into MM:SS format.
 */
export const formatTime = (timeInSecs) => {
  const mins = Math.floor(timeInSecs / 60);
  const secs = Math.floor(timeInSecs % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Helper to generate blanked word indices deterministically based on text hash and blank level.
 */
export const getBlankedIndices = (text, level) => {
  if (!text || level <= 0) return new Set();
  
  // Simple hash function for determinism based on the text content
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const words = text.split(/(\s+)/);
  const wordIndices = [];
  
  const fillerWords = new Set(['oh', 'hey', 'um', 'uh', 'ah', 'yeah', 'yep', 'okay', 'ok', 'ooh', 'wow']);
  
  words.forEach((chunk, idx) => {
    if (chunk.trim() === '') return;
    
    const cleanWord = chunk.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"]/g, "");
    if (!cleanWord) return;
    
    // Check if candidate is speaker tag, inside brackets/parens, proper noun or filler word
    const isSpeakerTag = cleanWord.endsWith(':') || (idx < words.length - 2 && words[idx + 2] === ':');
    const insideBrackets = chunk.startsWith('[') || chunk.endsWith(']');
    const insideParens = chunk.startsWith('(') || chunk.endsWith(')');
    const isProperNoun = cleanWord[0] === cleanWord[0].toUpperCase() && cleanWord[0] !== cleanWord[0].toLowerCase() && idx > 0;
    const isFiller = fillerWords.has(cleanWord.toLowerCase());
    
    const shouldExclude = isSpeakerTag || insideBrackets || insideParens || isProperNoun || isFiller;
    if (!shouldExclude) {
      wordIndices.push(idx);
    }
  });
  
  const count = Math.max(1, Math.round(wordIndices.length * level));
  
  const blankedIndices = new Set();
  let attempts = 0;
  while (blankedIndices.size < count && attempts < 100 && wordIndices.length > 0) {
    const pseudoRandomIndex = Math.abs((hash + blankedIndices.size * 31) % wordIndices.length);
    blankedIndices.add(wordIndices[pseudoRandomIndex]);
    attempts++;
  }
  return blankedIndices;
};

/**
 * Helper to parse WebVTT subtitle text into structured objects.
 */
export const parseVTT = (vttText) => {
  // Normalize newlines and remove BOM
  vttText = vttText.replace("\ufeff", "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const blocks = vttText.split("\n\n");
  const parsed = [];

  const parseTime = (timeStr) => {
    const parts = timeStr.trim().split(':');
    const secondsParts = parts[2].split('.');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseInt(secondsParts[0], 10);
    const ms = parseInt(secondsParts[1], 10) || 0;
    return hours * 3600 + minutes * 60 + seconds + ms / 1000;
  };

  blocks.forEach(block => {
    const lines = block.split("\n");
    if (lines.length >= 2 && lines[1].includes('-->')) {
      const timeLine = lines[1];
      const [startStr, endStr] = timeLine.split('-->');
      
      const textLines = lines.slice(2);
      let english = textLines[0] || '';
      let vietnamese = textLines[1] || '';

      // Clean up broken Unicode replacement characters
      english = english.replace(/\uFFFD/g, "'");
      vietnamese = vietnamese.replace(/\uFFFD/g, "'");

      parsed.push({
        index: parseInt(lines[0], 10) || parsed.length + 1,
        start: parseTime(startStr),
        end: parseTime(endStr),
        english,
        vietnamese
      });
    }
  });

  return parsed;
};
