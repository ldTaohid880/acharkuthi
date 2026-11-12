/**
 * Avatar initials as the canvas draws them: two Latin initials ("Sabrina Chowdhury" → "SC"),
 * or the first Bangla letter cluster ("সাবরিনা চৌধুরী" → "সা").
 */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0] ?? "";
  if (/^[A-Za-z]/.test(first)) {
    return words
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("");
  }
  const seg = new Intl.Segmenter("bn", { granularity: "grapheme" }).segment(first);
  for (const s of seg) return s.segment;
  return "";
}
