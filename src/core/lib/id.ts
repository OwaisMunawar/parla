/**
 * Sortable, collision-resistant ids without a native dependency: a base36
 * timestamp keeps rows in creation order, the random tail keeps two ids made in
 * the same millisecond apart. The generator is injectable so tests get stable ids.
 */
export type IdGenerator = (prefix: string) => string;

export function createIdGenerator(random: () => number = Math.random): IdGenerator {
  let last = 0;
  let counter = 0;
  return (prefix) => {
    const now = Date.now();
    counter = now === last ? counter + 1 : 0;
    last = now;
    const tail = Math.floor(random() * 36 ** 6)
      .toString(36)
      .padStart(6, '0');
    return `${prefix}_${now.toString(36)}${counter.toString(36)}${tail}`;
  };
}

export function createSequentialIds(): IdGenerator {
  const counters = new Map<string, number>();
  return (prefix) => {
    const next = (counters.get(prefix) ?? 0) + 1;
    counters.set(prefix, next);
    return `${prefix}_${next}`;
  };
}
