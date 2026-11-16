import test from 'node:test';
import assert from 'node:assert/strict';
import {collectPaths} from '../../website/assets/folder-drop.mjs';
const file = name => ({name,isFile:true});
function folder(name,batches) {return {name,isDirectory:true,createReader(){let n=0;return {readEntries(ok){ok(batches[n++]||[]);}};}};}
test('USB root stripped but nested folders preserved, all batches read',async()=>{
 const entries=[folder('USB',[[folder('videos',[[file('clip2.mp4')],[file('clip10.mp4')]]),file('photo.png')],[file('last.jpg'),folder('.hidden',[[file('secret.jpg')]])]])];
 assert.deepEqual(await collectPaths(entries,{stripRoot:true}),['last.jpg','photo.png','videos/clip2.mp4','videos/clip10.mp4']);
});
test('subfolder and multiple roots keep names when requested',async()=>{
 assert.deepEqual(await collectPaths([folder('videos',[[file('a.mp4')]]),folder('photos',[[file('b.png')]])]),['photos/b.png','videos/a.mp4']);
});
test('limit and read errors reject without returning partial data',async()=>{
 await assert.rejects(collectPaths([folder('USB',[[file('a.mp4'),file('b.mp4')]])],{limit:2}));
 await assert.rejects(collectPaths([{name:'USB',isDirectory:true,createReader(){return {readEntries(ok,fail){fail(new Error('denied'));}};}}]),/denied/);
});
