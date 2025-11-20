const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const INPUT = path.join(ROOT, 'server', 'tmp', 'import-template-produkti-prov4-updated.csv');

function parseCSV(text){
  const rows = [];
  let i=0, len=text.length; let field=''; let row=[]; let inQuotes=false;
  while(i<len){
    const ch = text[i];
    if(inQuotes){
      if(ch==='"'){
        if(i+1<len && text[i+1]==='"'){ field+='"'; i+=2; continue; }
        inQuotes=false; i++; continue;
      } else { field+=ch; i++; continue; }
    }
    if(ch==='"'){ inQuotes=true; i++; continue; }
    if(ch===','){ row.push(field); field=''; i++; continue; }
    if(ch==='\r'){ i++; continue; }
    if(ch==='\n'){ row.push(field); rows.push(row); row=[]; field=''; i++; continue; }
    field+=ch; i++;
  }
  if(field!=='' || row.length>0){ row.push(field); rows.push(row); }
  return rows;
}

function stringifyCSV(rows){
  return rows.map(r=> r.map(c=>{
    if(c==null) return '';
    const s = String(c);
    if(s.includes('"')||s.includes(',')||s.includes('\n')) return '"'+s.replace(/"/g,'""')+'"';
    return s;
  }).join(',')).join('\n');
}

if(!fs.existsSync(INPUT)){ console.error('Input CSV not found:', INPUT); process.exit(1); }
const raw = fs.readFileSync(INPUT,'utf8');
const rows = parseCSV(raw);
const header = rows[0].map(h=>h.trim());
const data = rows.slice(1);
const idx = {}; header.forEach((h,i)=> idx[h]=i);

const topKey = 'category_top';
const c1Key = 'category_child1';
const c2Key = 'category_child2';
if(idx[topKey]==null && idx[c1Key]==null && idx[c2Key]==null){ console.log('No category columns found; nothing to do'); process.exit(0); }

// ensure category and categories columns exist
if(idx['category']==null){ idx['category']=header.length; header.push('category'); data.forEach(r=>{ while(r.length<header.length) r.push(''); }); }
if(idx['categories']==null){ idx['categories']=header.length; header.push('categories'); data.forEach(r=>{ while(r.length<header.length) r.push(''); }); }

let changed=0;
for(let i=0;i<data.length;i++){
  const r = data[i];
  const top = (idx[topKey]!=null ? (r[idx[topKey]]||'').trim() : '');
  const c1 = (idx[c1Key]!=null ? (r[idx[c1Key]]||'').trim() : '');
  const c2 = (idx[c2Key]!=null ? (r[idx[c2Key]]||'').trim() : '');
  const cats = [top,c1,c2].filter(x=>x && x.length>0);
  const catVal = cats.length>0 ? cats[cats.length-1] : '';
  const catsJson = JSON.stringify(cats);
  if((r[idx['category']]||'') !== catVal || (r[idx['categories']]||'') !== catsJson){
    r[idx['category']] = catVal;
    r[idx['categories']] = catsJson;
    changed++;
  }
}

const out = [header].concat(data);
fs.writeFileSync(INPUT, stringifyCSV(out), 'utf8');
console.log('Wrote', INPUT, 'updated rows:', changed);

// finished
process.exit(0);
