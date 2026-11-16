export const kindOf = path => /\.(jpe?g|png)$/i.test(path) ? 'image' : /\.(mp4|m4v|mov|mkv|ts)$/i.test(path) ? 'video' : '';
const clean = value => value.trim().replace(/^"(.*)"$/, '$1').replace(/\\/g, '/');
export function parse(text, root = '') {
  const items = [], warnings = [];
  let duration = -1, fade = 1.5, title = '';
  root = clean(root).replace(/\/$/, '');
  const m3u = /^#EXT(M3U|INF:)/m.test(text.replace(/^\uFEFF/, ''));
  for (const raw of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#EXTINF:')) {
      const [seconds, ...rest] = line.slice(8).split(',');
      if (/^-?\d+(\.\d+)?$/.test(seconds.trim())) duration = Number(seconds);
      title = rest.join(','); continue;
    }
    if (line.startsWith('#EXT-X-FADE:')) {
      const n = line.slice(12).trim();
      if (/^\d+(\.\d+)?$/.test(n)) fade = Math.min(10, Number(n));
      continue;
    }
    if (line.startsWith('#')) continue;
    let path = clean(line).replace(/^ext\d+:\//i, '');
    if (root && path.toLowerCase().startsWith(root.toLowerCase() + '/')) path = path.slice(root.length + 1);
    const kind = kindOf(path);
    const invalid = /[:\r\n]/.test(path) || path.split('/').some(p => p === '..') || (!m3u && path.startsWith('/'));
    if (kind && !invalid && (m3u || !/\.(start|end)\.jpg$/i.test(path)) && !path.split('/').some(p => p.startsWith('.'))) {
      items.push({path: path.replace(/^\//, ''), kind, duration: duration > 0 ? duration : kind === 'image' ? 10 : -1, fade, title});
    } else warnings.push(line);
    duration = -1; fade = 1.5; title = '';
  }
  return {items, warnings};
}
export function serialize(items) {
  return '#EXTM3U\n' + items.map(item => {
    if (!kindOf(item.path) || /[\r\n:]/.test(item.path) || item.path.startsWith('#')) throw new Error('Invalid local path');
    const title = (item.title || item.path.split('/').pop()).replace(/[\r\n]/g, ' ');
    return `#EXTINF:${item.duration},${title}\n#EXT-X-FADE:${item.fade}\n${item.path}\n`;
  }).join('');
}
export function move(items, index, delta) {
  const next = index + delta;
  if (next >= 0 && next < items.length) [items[index], items[next]] = [items[next], items[index]];
}
export function suggestedRoot(text) {
  const first = text.split(/\r?\n/).map(clean).find(x => x && !x.startsWith('#')) || '';
  return first.match(/^[A-Za-z]:/)?.[0] || first.match(/^\/Volumes\/[^/]+/)?.[0] || '';
}

export function manualEntry(path, duration = '', fade = '1.5', title = '') {
  path = clean(path);
  if (!path || /[\r\n:]/.test(path) || path.startsWith('/') || path.startsWith('#') || path.split('/').some(p => p === '..' || p.startsWith('.'))) throw new Error('path');
  const kind = kindOf(path);
  if (!kind) throw new Error('path');
  const seconds = String(duration).trim() === '' ? (kind === 'image' ? 10 : -1) : Number(duration);
  const blend = Number(fade);
  if (!Number.isFinite(seconds) || seconds > 86400 || !(seconds > 0 || (kind === 'video' && seconds === -1))) throw new Error('duration');
  if (String(fade).trim() === '' || !Number.isFinite(blend) || blend < 0 || blend > 10) throw new Error('fade');
  return {path, kind, duration: seconds, fade: blend, title: title.replace(/[\r\n]/g, ' ')};
}
