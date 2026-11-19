// Regression guard: every gallery photo URL in Post Edits and Story Living must use the private relay.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const post = fs.readFileSync(path.join(root, 'app/post.js'), 'utf8');
const story = fs.readFileSync(path.join(root, 'app/gallery/30-story-living.js'), 'utf8');
for (const [name, source] of [['Post Edits', post], ['Story Living', story]]) {
  assert(!source.includes('lh3.googleusercontent.com'), name + ' must not construct public Googleusercontent URLs');
  assert(!source.includes('drive.google.com/thumbnail'), name + ' must not construct public Drive thumbnail URLs');
  assert(source.includes('relayPhotos'), name + ' must be able to resolve signed relay photo records');
}
assert(post.includes('function direct(id)') && post.includes('thumbUrl(id, 1600)'), 'Post Edits must load edit bitmaps through the relay URL helper');
assert(post.includes('function thumbUrl(id, w)') && post.includes('window.pgImg'), 'Post Edits thumbnail helper must use pgImg');
assert(post.includes('S.opt.recent') && post.includes('thumbUrl(id, 300)'), 'recent-photo tiles must use the relay thumbnail helper');
assert(story.includes('function imgUrl') && story.includes('relayImgUrl'), 'Story Living image fallback must use relay photo records');
assert(story.includes('function imgFallback') && story.includes('relayImgUrl'), 'Story Living fallback image path must use relay photo records');
console.log('PASS Post Edits and Story Living use private relay URLs exclusively');
