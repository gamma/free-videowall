import {parse, serialize, move, suggestedRoot} from './playlist-core.mjs';
const de = document.documentElement.lang === 'de';
const t = (en, german) => de ? german : en;
const $ = id => document.getElementById(id);
const demo = '#EXTM3U\n#EXTINF:-1,Welcome\nvideos/welcome.mp4\n#EXTINF:8,A moment between clips\npictures/interlude.jpg\n#EXTINF:-1,Our story\nvideos/story.mp4\n';
let items = [], playing = false, index = 0, started = 0, ticker = null;
const status = message => { $('editor-status').textContent = message; };
function stop() {
  playing = false; clearInterval(ticker); ticker = null;
  $('preview-play').textContent = t('Play preview', 'Vorschau starten');
  $('preview-progress').value = 0;
}
function sync() {
  stop(); $('m3u-output').value = serialize(items);
  $('item-count').textContent = `${items.length} ${t('items', 'Einträge')}`;
  $('download').disabled = $('copy').disabled = $('preview-play').disabled = !items.length;
  if (items.length) show(0, false);
  else { $('scene-current').replaceChildren(); $('scene-old').replaceChildren(); $('preview-caption').textContent = t('Your playlist will appear here.', 'Hier erscheint deine Playlist.'); }
}
function button(text, label, action, disabled = false) {
  const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.setAttribute('aria-label', label); b.title = label; b.disabled = disabled; b.addEventListener('click', action); return b;
}
function render() {
  const list = $('playlist-list'); list.replaceChildren();
  items.forEach((item, i) => {
    const card = document.createElement('li'); card.className = `playlist-card ${item.kind}`;
    const thumbnail = document.createElement('div'); thumbnail.className = 'mini-thumb'; thumbnail.textContent = item.kind === 'image' ? '▧' : '▶'; thumbnail.setAttribute('aria-hidden', 'true');
    const fields = document.createElement('div'); fields.className = 'item-fields';
    const type = document.createElement('small'); type.textContent = `${String(i + 1).padStart(2, '0')} · ${item.kind === 'image' ? t('PICTURE', 'BILD') : 'VIDEO'}`;
    const pathLabel = document.createElement('label'); pathLabel.textContent = t('USB file path', 'Dateipfad auf dem Stick');
    const path = document.createElement('input'); path.type = 'text'; path.value = item.path;
    path.addEventListener('change', () => {
      const result = parse(path.value);
      if (result.items.length !== 1) { path.value = item.path; status(t('Use a local supported filename. No internet links or computer paths.', 'Bitte einen unterstützten lokalen Dateipfad verwenden. Keine Internetlinks oder Rechnerpfade.')); return; }
      const next = result.items[0]; item.path = next.path;
      if (item.kind !== next.kind) {item.kind = next.kind; item.duration = next.duration;}
      sync(); render();
    }); pathLabel.append(path);
    const timing = document.createElement('div'); timing.className = 'item-timing';
    const durationLabel = document.createElement('label'); durationLabel.textContent = item.kind === 'image' ? t('Show for (seconds)', 'Anzeigen (Sekunden)') : t('Video limit (−1 = full)', 'Videolimit (−1 = ganz)');
    const duration = document.createElement('input'); duration.type = 'number'; duration.min = item.kind === 'image' ? '0.1' : '-1'; duration.max = '86400'; duration.step = 'any'; duration.value = item.duration;
    duration.addEventListener('change', () => { const n = Number(duration.value); if (!Number.isFinite(n) || n > 86400 || !(n > 0 || (item.kind === 'video' && n === -1))) {duration.value = item.duration; return;} item.duration = n; sync(); }); durationLabel.append(duration);
    const fadeLabel = document.createElement('label'); fadeLabel.textContent = t('Outgoing blend (seconds)', 'Ausgehende Blende (Sekunden)');
    const fade = document.createElement('input'); fade.type = 'number'; fade.min = '0'; fade.max = '10'; fade.step = '0.1'; fade.value = item.fade;
    fade.addEventListener('change', () => {const n = Number(fade.value); if (!Number.isFinite(n) || n < 0 || n > 10) {fade.value = item.fade;return;} item.fade = n;sync();}); fadeLabel.append(fade);
    timing.append(durationLabel, fadeLabel);fields.append(type, pathLabel, timing);
    const controls = document.createElement('div'); controls.className = 'item-controls';
    controls.append(button('↑', t('Move up', 'Nach oben'), () => {move(items, i, -1);sync();render();}, i === 0), button('↓', t('Move down', 'Nach unten'), () => {move(items, i, 1);sync();render();}, i === items.length - 1), button('×', t('Remove', 'Entfernen'), () => {items.splice(i, 1);sync();render();}));
    card.append(thumbnail, fields, controls); list.append(card);
  });
}
function importText(text, append = false) {
  if (text.length > 1024 * 1024) {status(t('List is too large (limit: 1 MB).', 'Liste zu groß (maximal 1 MB).'));return;}
  const root = $('usb-root').value.trim() || suggestedRoot(text);
  if (!$('usb-root').value) $('usb-root').value = root;
  const result = parse(text, root);
  if (!result.items.length) {status(t('No supported entries found. Use one filename per line or paste an M3U. Check the USB root for full computer paths.', 'Keine unterstützten Einträge gefunden. Ein Dateiname pro Zeile oder eine M3U. Bei vollständigen Rechnerpfaden das USB-Hauptverzeichnis prüfen.'));return;}
  items = append ? [...items, ...result.items] : result.items;
  sync(); render();
  status(`${root ? t('Check USB root: ', 'USB-Hauptverzeichnis prüfen: ') + root + '. ' : ''}${result.items.length} ${t('entries imported.', 'Einträge übernommen.')} ${result.warnings.length ? `${result.warnings.length} ${t('lines skipped (unsupported files, helper images or invalid paths).', 'Zeilen übersprungen (unbekannte Dateien, Hilfsbilder oder ungültige Pfade).')}` : ''}`);
}
async function fileImport(files, folder = false) {
  try {
    const all = Array.from(files), playlist = all.find(file => /\.m3u8?$/i.test(file.name));
    if (playlist && !folder) {
      if (playlist.size > 1024 * 1024) {status(t('Playlist is too large (limit: 1 MB).', 'Playlist zu groß (maximal 1 MB).'));return;}
      $('import-text').value = await playlist.text(); importText($('import-text').value); return;
    }
    // Only filenames are read for media. No media file contents or object URLs.
    const names = all.map(file => folder ? file.webkitRelativePath.split('/').slice(1).join('/') : file.name).sort((a,b) => a.localeCompare(b, undefined, {numeric: true}));
    $('import-text').value = names.join('\n'); importText($('import-text').value, true);
  } catch {status(t('Could not read the selected playlist.', 'Die gewählte Playlist konnte nicht gelesen werden.'));}
}
$('import-replace').onclick = () => importText($('import-text').value);
$('import-add').onclick = () => importText($('import-text').value, true);
$('load-demo').onclick = () => { $('usb-root').value = ''; $('import-text').value = demo; importText(demo); };
$('clear').onclick = () => {items = [];sync();render();status(t('Playlist cleared.', 'Playlist geleert.'));};
$('media-files').onchange = e => {fileImport(e.target.files); e.target.value = '';};
$('folder-files').onchange = e => {fileImport(e.target.files, true);e.target.value = '';};
$('paste-zone').addEventListener('paste', event => {
  if (event.clipboardData?.files.length && !event.clipboardData.getData('text/plain')) {event.preventDefault();fileImport(event.clipboardData.files);}
});
$('paste-zone').addEventListener('dragover', e => {e.preventDefault();});
$('paste-zone').addEventListener('drop', e => {
  e.preventDefault();
  const entries = Array.from(e.dataTransfer.items || []).map(item => item.webkitGetAsEntry?.());
  if (entries.some(entry => entry?.isDirectory)) {status(t('For folders, use “Choose USB folder” to preserve subfolders.', 'Für Ordner bitte „USB-Ordner wählen“ verwenden, damit Unterordner erhalten bleiben.'));return;}
  if (e.dataTransfer.files.length) fileImport(e.dataTransfer.files);
  else { $('import-text').value = e.dataTransfer.getData('text/plain'); }
});
$('download').onclick = () => {
  const url = URL.createObjectURL(new Blob([serialize(items)], {type:'audio/x-mpegurl;charset=utf-8'}));
  const a = document.createElement('a'); a.href = url; a.download = 'playlist.m3u'; a.click();setTimeout(() => URL.revokeObjectURL(url), 1000);
  status(t('Save playlist.m3u in the USB root beside your media folders.', 'playlist.m3u im USB-Hauptverzeichnis neben den Medienordnern speichern.'));
};
$('copy').onclick = async () => {
  try {await navigator.clipboard.writeText(serialize(items));status(t('M3U copied.', 'M3U kopiert.'));}
  catch { $('m3u-output').focus();$('m3u-output').select();status(t('Press Ctrl+C / Cmd+C to copy the selected M3U.', 'Mit Strg+C / Cmd+C die markierte M3U kopieren.')); }
};
function scene(item, n) {
  const wrap = document.createElement('div');wrap.className = `placeholder-scene scene-${n % 3}`;
  const icon = document.createElement('span');icon.className = 'scene-symbol';icon.textContent = item.kind === 'image' ? '▧' : '▶';
  const name = document.createElement('strong');name.textContent = item.title || item.path.split('/').pop();
  const label = document.createElement('small'); label.textContent = t('ILLUSTRATIVE PLACEHOLDER', 'SYMBOLISCHE VORSCHAU');wrap.append(icon, name, label);return wrap;
}
function show(n, blend) {
  const previous = index; index = n;
  $('scene-old').replaceChildren(...Array.from($('scene-current').childNodes));
  $('scene-current').replaceChildren(scene(items[n], n));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const seconds = blend && !reduce ? Math.min(items[previous].fade, shownDuration(items[n])) / Number($('preview-speed').value) : 0;
  $('scene-old').getAnimations().forEach(animation => animation.cancel());
  if (seconds) $('scene-old').animate([{opacity:1},{opacity:0}],{duration:seconds*1000,fill:'forwards'});
  else $('scene-old').style.opacity = '0';
  $('preview-caption').textContent = `${n+1} / ${items.length} · ${items[n].path}`;
}
function shownDuration(item) {return item.duration > 0 ? item.duration : 8;}
$('preview-play').onclick = () => {
  if (playing) {stop();return;}
  if (!items.length) return;
  playing = true; show(0, false); started = performance.now();$('preview-play').textContent = t('Stop preview', 'Vorschau stoppen');
  ticker = setInterval(() => {
    const elapsed = (performance.now()-started)/1000*Number($('preview-speed').value);
    $('preview-progress').value = Math.min(1,elapsed/shownDuration(items[index]));
    if (elapsed >= shownDuration(items[index])) {show((index+1)%items.length,true);started=performance.now();}
  },100);
};
$('preview-speed').onchange = stop;
document.addEventListener('visibilitychange', () => {if (document.hidden) stop();});
sync(); render();
