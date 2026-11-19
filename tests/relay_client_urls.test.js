// Regression guard: every gallery photo URL in Post Edits and Story Living must use the private relay.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const post = fs.readFileSync(path.join(root, 'app/post.js'), 'utf8');
const story = fs.readFileSync(path.join(root, 'app/gallery/30-story-living.js'), 'utf8');
for (const [name, source] of [['Post Edits', post], ['Story Living', story]]) {
  assert(!/https?:\\/\\/(?:lh3\\.googleusercontent\\.com|drive\\.google\\.com\\/thumbnail)/i.test(source), name + ' must not construct public Google media URLs');
  assert(/relayPhotos/.test(source), name + ' must be able to resolve signed relay photo records');
}
assert(/function direct\\(id\\)[\\s\\S]*?thumbUrl\\(id, 1600\\)/.test(post), 'Post Edits must load edit bitmaps through the relay thumbnail URL helper');
assert(/function thumbUrl\\(id, w\\)[\\s\\S]*?window\\.pgImg/.test(post), 'Post Edits thumbnail helper must use pgImg');
assert(/S\\.opt\\.recent[\\s\\S]*?thumbUrl\\(id, 300\\)/.test(post), 'recent-photo tiles must use the relay thumbnail helper');
assert(/function imgUrl[\\s\\S]*?relayImgUrl/.test(story), 'Story Living image fallback must use relay photo records');
assert(/function imgFallback[\\s\\S]*?relayImgUrl/.test(story), 'Story Living fallback image path must use relay photo records');
console.log('PASS Post Edits and Story Living use private relay URLs exclusively');
