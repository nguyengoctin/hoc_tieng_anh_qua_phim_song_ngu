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

      const video = videoRef.current;
      if (!video) return;

      const subToUse = pausedSub || activeSub;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 's' || e.key === 'S' || e.key === 'r' || e.key === 'R') {
        // Phím S/R: Phát lại câu đang hiển thị — tìm hoàn toàn theo video.currentTime để tránh stale state
        const t = video.currentTime;
        const subToRepeat = subtitles.find(s => t >= s.start && t <= s.end)
          || [...subtitles].reverse().find(s => s.end <= t);
        if (subToRepeat) {
          if (resumeTimeoutRef.current) { clearTimeout(resumeTimeoutRef.current); resumeTimeoutRef.current = null; }
          setPausedSub(null);
          setRevealedIndices([]);
          revealedIndicesRef.current = [];
          seekTargetRef.current = subToRepeat.start; // bỏ qua tất cả subtitle kết thúc tại/trước đầu câu mục tiêu
          lastSubIndexRef.current = subToRepeat.start;
          video.currentTime = subToRepeat.start;
          video.play().then(() => setIsPlaying(true));
        }
      } else if (e.key === 'a' || e.key === 'A') {
        // Phím A: Lùi về câu trước — tìm hoàn toàn theo video.currentTime
        const t = video.currentTime;
        const curSub = subtitles.find(s => t >= s.start && t <= s.end)
          || [...subtitles].reverse().find(s => s.end <= t);
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
            video.currentTime = targetSub.start;
            video.play().then(() => setIsPlaying(true));
          }
        }
      } else if (e.key === 'd' || e.key === 'D') {
        // Phím D: Tiến câu tiếp theo — tìm hoàn toàn theo video.currentTime
        const t = video.currentTime;
        const curSub = subtitles.find(s => t >= s.start && t <= s.end)
          || [...subtitles].reverse().find(s => s.end <= t);
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
            video.currentTime = targetSub.start;
            video.play().then(() => setIsPlaying(true));
          }
        }
      } else if (e.key === 'ArrowLeft') {
        video.currentTime = Math.max(0, video.currentTime - 10);
      } else if (e.key === 'ArrowRight') {
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
                setPausedSub(null); // clear lock before playing
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
