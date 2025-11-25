const fs = require('fs');
const path = require('path');

const TMP = path.resolve(process.cwd(), 'server', 'tmp');
const files = fs.readdirSync(TMP).filter(f => f.startsWith('preview-specs-') && f.endsWith('.json'))
  .map(f => ({ f, t: fs.statSync(path.join(TMP, f)).mtimeMs }))
  .sort((a,b) => b.t - a.t);
if (!files.length) {
  console.error('No preview-specs-*.json found in server/tmp');
  process.exit(1);
}
const previewPath = path.join(TMP, files[0].f);
console.log('Using preview specs file:', previewPath);
const data = JSON.parse(fs.readFileSync(previewPath, 'utf8'));

function normalizeName(s) {
  if (!s) return '';
  let t = String(s).trim();
  t = t.replace(/^\s*GLOBE[_\s-]*/i, '');
  t = t.replace(/_/g, ' ');
  try { t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (err) {}
  t = t.replace(/[^\p{L}\p{N}\s]/gu, '');
  t = t.replace(/\s+/g, ' ').trim().toLowerCase();
  return t;
}

const normalized = {};
for (const topKey of Object.keys(data)) {
  const nTop = normalizeName(topKey);
  normalized[nTop] = normalized[nTop] || {};
  const child1Obj = data[topKey] || {};
  for (const child1Key of Object.keys(child1Obj)) {
    const nChild1 = normalizeName(child1Key);
    normalized[nTop][nChild1] = normalized[nTop][nChild1] || {};
    const child2Obj = child1Obj[child1Key] || {};
    for (const child2Key of Object.keys(child2Obj)) {
      const nChild2 = normalizeName(child2Key);
      normalized[nTop][nChild1][nChild2] = child2Obj[child2Key];
    }
  }
}

const tests = [
  'GLOBE_ELEKTROSHTEPIAKE TE VOGLA///TE VOGLA///Aksesorë SD',
  'Elektroshtepiake te Medha///PER MONTIM///Aksesorë Built in',
  'Elektroshtepiake te Medha///QENDRIM I LIRE///Frigoriferë të Kombinuar'
];

for (const t of tests) {
  let parts = t.split('///').map(s => s && s.trim()).filter(Boolean);
  if (parts.length < 3) parts = t.split('/').map(s => s && s.trim()).filter(Boolean);
  const [top, child1, child2] = parts;
  const nTop = normalizeName(top);
  const nChild1 = normalizeName(child1);
  const nChild2 = normalizeName(child2);
  console.log('\nTEST:', t);
  console.log('normalized:', nTop, '|', nChild1, '|', nChild2);
  const found = (normalized[nTop] && normalized[nTop][nChild1] && normalized[nTop][nChild1][nChild2]) ? normalized[nTop][nChild1][nChild1] : (normalized[nTop] && normalized[nTop][nChild1] ? Object.keys(normalized[nTop][nChild1]) : null);
  // Actually print the exact child2 match if exists
  const exact = (normalized[nTop] && normalized[nTop][nChild1] && normalized[nTop][nChild1][nChild2]) ? normalized[nTop][nChild1][nChild2] : null;
  console.log('exact match:', exact ? (exact.slice ? exact.slice(0,10) : exact) : null);
  if (!exact) {
    // show available child2 keys for this top->child1 if present
    if (normalized[nTop] && normalized[nTop][nChild1]) {
      console.log('available child2 keys (sample):', Object.keys(normalized[nTop][nChild1]).slice(0,10));
    } else if (normalized[nTop]) {
      console.log('available child1 keys (sample):', Object.keys(normalized[nTop]).slice(0,10));
    } else {
      console.log('no matching top key found; available tops (sample):', Object.keys(normalized).slice(0,10));
    }
  }
}
