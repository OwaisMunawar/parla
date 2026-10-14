/**
 * Bundled demo clips are named after what they say, so any prompt (a
 * scenario line, a drill, a review answer) finds its recording by text alone
 * and adding a prompt never needs a hand-maintained id.
 */
export function clipKey(language: string, text: string): string {
  const slug = text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${language}/${slug}`;
}
