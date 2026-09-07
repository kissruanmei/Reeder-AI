export function calculateProgressPercent(chapterIndex, totalChapters) {
  const total = Number.isFinite(totalChapters) ? Math.max(0, totalChapters) : 0;
  const index = Number.isFinite(chapterIndex) ? Math.max(0, chapterIndex) : 0;
  if (total <= 1) return 0;
  return Math.min(100, Math.round((index / (total - 1)) * 100));
}
