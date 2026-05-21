export interface TocEntry {
  level: number;
  text: string;
  id: string;
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'section'
  );
}

function stripMarkdownInline(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .trim();
}

/** Extract ATX headings (h1–h6), skipping fenced code blocks. */
export function extractHeadings(markdown: string): TocEntry[] {
  const lines = markdown.split('\n');
  const entries: TocEntry[] = [];
  const slugCounts = new Map<string, number>();
  let inCodeBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = /^(#{1,6})\s+(.+?)(?:\s+#*)?\s*$/.exec(line);
    if (!match) continue;

    const level = match[1].length;
    const text = stripMarkdownInline(match[2]);
    if (!text) continue;

    const base = slugify(text);
    const count = slugCounts.get(base) ?? 0;
    slugCounts.set(base, count + 1);
    const id = count === 0 ? base : `${base}-${count}`;

    entries.push({ level, text, id });
  }

  return entries;
}
