import type { SearchResult } from "@/lib/mock-data";

export function dismissSearchResult(
  results: SearchResult[],
  screenshots: Record<number, string>,
  activeIndex: number | null,
  index: number,
) {
  if (index < 0 || index >= results.length) return { results, screenshots, activeIndex };
  const remainingScreenshots: Record<number, string> = {};
  for (const [key, value] of Object.entries(screenshots)) {
    const position = Number(key);
    if (position < index) remainingScreenshots[position] = value;
    if (position > index) remainingScreenshots[position - 1] = value;
  }
  return {
    results: results.filter((_, position) => position !== index),
    screenshots: remainingScreenshots,
    activeIndex: activeIndex === index ? null : activeIndex !== null && activeIndex > index ? activeIndex - 1 : activeIndex,
  };
}