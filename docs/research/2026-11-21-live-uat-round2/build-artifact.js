// Builds careerbuddy-uat-round2.html (the published artifact) from artifact.template.html + round2.json.
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const data = fs.readFileSync(path.join(dir, 'round2.json'), 'utf8').replace(/</g, '\\u003c');
const html = fs.readFileSync(path.join(dir, 'artifact.template.html'), 'utf8').replace('__DATA__', () => data);
fs.writeFileSync(path.join(dir, 'careerbuddy-uat-round2.html'), html);
console.log('wrote', html.length);
