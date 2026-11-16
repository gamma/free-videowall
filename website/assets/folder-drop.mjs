// Read entry names recursively; media file contents are never opened.
export async function collectPaths(entries, {stripRoot = false, limit = 10000} = {}) {
  const paths = [];
  let visited = 0;
  async function walk(entry, parent, depth = 0) {
    if (++visited > limit || depth > 100) throw new Error('Too many entries');
    if (entry.name.startsWith('.')) return;
    const path = parent ? `${parent}/${entry.name}` : entry.name;
    if (entry.isFile) {paths.push(path);return;}
    if (!entry.isDirectory) return;
    const reader = entry.createReader();
    // Chromium can return batches of only 100 entries. Read until exhausted.
    for (;;) {
      const batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
      if (!batch.length) break;
      for (const child of batch) await walk(child, stripRoot && depth === 0 ? '' : path, depth + 1);
    }
  }
  for (const entry of entries) await walk(entry, '');
  return paths.sort((a,b) => a.localeCompare(b, undefined, {numeric:true}));
}
