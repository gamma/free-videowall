import test from 'node:test';
import assert from 'node:assert/strict';
import {parse, serialize, move, suggestedRoot} from '../../website/assets/playlist-core.mjs';

test('M3U roundtrip preserves timing, folders, repeated entries and titles', () => {
  const text = '\uFEFF#EXTM3U\r\n#EXTINF:-1,Film, part one\r\n#EXT-X-FADE:2.5\r\nvideos/a.mp4\r\n#EXTINF:8,Zwischenbild\r\npictures/ü space.png\r\nvideos/a.mp4';
  const result = parse(text);
  assert.equal(result.items.length,3);
  assert.deepEqual(result.warnings,[]);
  assert.equal(result.items[0].fade,2.5);
  assert.equal(result.items[1].fade,1.5);
  assert.equal(result.items[1].duration,8);
  assert.equal(result.items[2].duration,-1);
  assert.deepEqual(parse(serialize(result.items)).items, result.items.map(item => ({...item,title:item.title || item.path.split('/').pop()})));
});
test('Explorer and Finder paths become USB-relative without losing folders', () => {
  assert.equal(suggestedRoot('"E:\\videos\\A.mp4"'),'E:');
  assert.equal(parse('"E:\\videos\\A.mp4"\n"E:\\photos\\B.jpg"','E:').items[0].path,'videos/A.mp4');
  assert.equal(suggestedRoot('/Volumes/My USB/videos/a.mp4'),'/Volumes/My USB');
  assert.equal(parse('/Volumes/My USB/videos/a.mp4','/Volumes/My USB').items[0].path,'videos/a.mp4');
  assert.equal(parse('/Volumes/Other/videos/a.mp4','/Volumes/My USB').items.length,0);
});
test('Unsupported and helper files do not leak duration/fade to next entry', () => {
  const result = parse('#EXTM3U\n#EXTINF:99,x\n#EXT-X-FADE:9\nmissing.txt\nphoto.jpg');
  assert.equal(result.items[0].duration,10);assert.equal(result.items[0].fade,1.5);
  assert.equal(parse('movie.mp4\nmovie.mp4.start.jpg\nmovie.mp4.end.jpg\n._movie.mp4').items.length,1);
  assert.equal(parse('#EXTM3U\nposter.start.jpg').items.length,1);
});
test('Invalid fade uses default, excessive fade is clamped; zero is a cut', () => {
  const result = parse('#EXTM3U\n#EXT-X-FADE:-2\na.mp4\n#EXT-X-FADE:100\nb.mp4\n#EXT-X-FADE:0\nc.mp4');
  assert.deepEqual(result.items.map(i=>i.fade),[1.5,10,0]);
});
test('Rejects network, absolute computer and traversal paths', () => {
  for (const path of ['https://host/a.mp4','C:\\a.mp4','/Users/me/a.mp4','../a.mp4']) assert.equal(parse(path).items.length,0,path);
  assert.equal(parse('#EXTM3U\n/films/a.mp4\next1:/photo.png').items.length,2);
  assert.throws(()=>serialize([{path:'a.mp4\n#EXTINF:4,x',duration:-1,fade:1.5}]),/Invalid/);
});
test('Reorder keeps item metadata and loop order intact', () => {
  const items = parse('one.mp4\ntwo.jpg\nthree.mkv').items;
  items[1].duration=17;move(items,1,-1);move(items,0,-1);
  assert.deepEqual(items.map(i=>i.path),['two.jpg','one.mp4','three.mkv']);
  assert.equal(parse(serialize(items)).items[0].duration,17);
});

test('manual entries default by kind, keep metadata and allow repeated paths', async () => {
  const {manualEntry} = await import('../../website/assets/playlist-core.mjs');
  const items = [manualEntry('videos/a.mp4'),manualEntry('pictures/ü space.jpg','8','2','Interlude'),manualEntry('videos/a.mp4','12','0')];
  assert.equal(items[0].duration,-1);assert.equal(manualEntry('slide.png').duration,10);
  const result=parse(serialize(items)).items;
  assert.equal(result.length,3);assert.equal(result[1].duration,8);assert.equal(result[1].fade,2);assert.equal(result[2].fade,0);
  for (const args of [['../a.mp4'],['https://host/a.mp4'],['/Users/a.mp4'],['no.txt'],['a.mp4\nb.mp4'],['a.jpg','-1'],['a.mp4','0'],['a.mp4','5','11']]) assert.throws(()=>manualEntry(...args));
});
