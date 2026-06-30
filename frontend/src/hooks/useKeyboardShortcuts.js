import { useEffect } from 'react';
import { getBlankedIndices } from '../utils/helpers';

export default function useKeyboardShortcuts({
  videoRef,
  activeSub,
  pausedSub,
  subtitles,
  duration,
  blankLevel,
  activeSidebarSub,
  revealedIndicesRef,
  setRevealedIndices,
  setPausedSub,
  setIsPlaying,
  togglePlay,
  resumeTimeoutRef,
  seekTargetRef,
  lastSubIndexRef,
  setActiveSidebarSub
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts when typing in input, textarea, select, or contenteditable
      const targetTag = e.target?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'SELECT' || targetTag === 'TEXTAREA' || e.target?.isContentEditable) {
        return;
      }

      // Ignore repeating keys (holding down keys) for sentence navigation, play/pause and tab
      if (e.repeat) {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
          return;
        }
      }

      const video = videoRef.current;
      if (!video) return;

      const subToUse = pausedSub || activeSub;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 's' || e.key === 'S' || e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        // Phím S/R: Phát lại câu đang hiển thị — ưu tiên dùng subToUse để tránh sai lệch do trôi đầu phát
        const subToRepeat = subToUse 
          || subtitles.find(s => video.currentTime >= s.start && video.currentTime <= s.end)
          || [...subtitles].reverse().find(s => s.end <= video.currentTime);
        
        if (subToRepeat) {
          if (resumeTimeoutRef.current) { clearTimeout(resumeTimeoutRef.current); resumeTimeoutRef.current = null; }
          setPausedSub(null);
          setRevealedIndices([]);
          revealedIndicesRef.current = [];
          seekTargetRef.current = subToRepeat.start; // bỏ qua tất cả subtitle kết thúc tại/trước đầu câu mục tiêu
          lastSubIndexRef.current = subToRepeat.start;
          video.currentTime = subToRepeat.start + 0.02; // Cộng thêm 20ms để tránh lệch điểm dừng về câu trước
          video.play().then(() => {
            setIsPlaying(true);
          }).catch(err => {
            console.error("[Hotkey S] Play promise rejected:", err);
          });
        }
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        // Phím A: Lùi về câu trước — ưu tiên dùng câu đang hiển thị làm mốc
        const curSub = subToUse 
          || subtitles.find(s => video.currentTime >= s.start && video.currentTime <= s.end)
          || [...subtitles].reverse().find(s => s.end <= video.currentTime);
        
        if (curSub) {
          const idx = subtitles.findIndex(s => s.start === curSub.start);
          if (idx > 0) {
            const targetSub = subtitles[idx - 1];
            if (resumeTimeoutRef.current) { clearTimeout(resumeTimeoutRef.current); resumeTimeoutRef.current = null; }
            setPausedSub(null);
            setRevealedIndices([]);
            revealedIndicesRef.current = [];
            seekTargetRef.current = targetSub.start;
            lastSubIndexRef.current = targetSub.start;
            setActiveSidebarSub(targetSub);
            video.currentTime = targetSub.start + 0.02; // Cộng thêm 20ms
            video.play().then(() => setIsPlaying(true));
          }
        }
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        // Phím D: Tiến câu tiếp theo — ưu tiên dùng câu đang hiển thị làm mốc
        const curSub = subToUse 
          || subtitles.find(s => video.currentTime >= s.start && video.currentTime <= s.end)
          || [...subtitles].reverse().find(s => s.end <= video.currentTime);
        
        if (curSub) {
          const idx = subtitles.findIndex(s => s.start === curSub.start);
          if (idx !== -1 && idx < subtitles.length - 1) {
            const targetSub = subtitles[idx + 1];
            if (resumeTimeoutRef.current) { clearTimeout(resumeTimeoutRef.current); resumeTimeoutRef.current = null; }
            setPausedSub(null);
            setRevealedIndices([]);
            revealedIndicesRef.current = [];
            seekTargetRef.current = targetSub.start;
            lastSubIndexRef.current = targetSub.start;
            setActiveSidebarSub(targetSub);
            video.currentTime = targetSub.start + 0.02; // Cộng thêm 20ms
            video.play().then(() => setIsPlaying(true));
          }
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - 10);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        video.currentTime = Math.min(duration, video.currentTime + 10);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        if (subToUse) {
          const blankedSet = getBlankedIndices(subToUse.english, blankLevel);
          const blankedArray = Array.from(blankedSet).sort((a, b) => a - b);
          
          if (blankedArray.length > 0) {
            const currentRevealed = revealedIndicesRef.current;
            const allRevealed = blankedArray.every(idx => currentRevealed.includes(idx));
            if (allRevealed) {
              // If all are already revealed, pressing Tab again resumes the video!
              if (video && video.paused) {
                video.play().then(() => setIsPlaying(true));
              }
            } else {
              // Otherwise, reveal the next word (updating ref synchronously to prevent race conditions on fast tab)
              const nextToReveal = blankedArray.find(idx => !currentRevealed.includes(idx));
              if (nextToReveal !== undefined) {
                const nextIndices = [...currentRevealed, nextToReveal];
                revealedIndicesRef.current = nextIndices;
                setRevealedIndices(nextIndices);
              }
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSub, pausedSub, subtitles, duration, blankLevel, activeSidebarSub]);
}
