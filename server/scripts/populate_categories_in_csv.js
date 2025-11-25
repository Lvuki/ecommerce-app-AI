#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const infile = process.argv[2] || path.resolve(__dirname, '..', 'tmp', 'import-template-produkti-prov4-updated.csv');
if (!fs.existsSync(infile)) {
  console.error('Input file not found:', infile);
  process.exit(2);
}

const backup = infile + '.bak.' + Date.now();
fs.copyFileSync(infile, backup);
console.log('Backup created:', backup);

const rl = require('readline');
const inp = fs.createReadStream(infile, { encoding: 'utf8' });
const outpath = infile + '.tmp';
const out = fs.createWriteStream(outpath, { encoding: 'utf8' });

function parseCSVLine(line){
  const res = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++){
    const ch = line[i];
    if (ch === '"'){
      if (inQuotes && line[i+1] === '"'){
        cur += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes){
      res.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  res.push(cur);
  return res.map(v => {
    return v;
  });
}

function csvEscape(v){
  if (v == null) return '';
  v = String(v);
  if (v.includes('"')) v = v.replace(/"/g, '""');
  if (v.includes(',') || v.includes('"') || v.includes('\n') || v.includes('\r')) return '"' + v + '"';
  return v;
}

const rlInterface = rl.createInterface({ input: inp, crlfDelay: Infinity });
let isHeader = true;
let headers = null;
let idx = {};
let lineNo = 0;

rlInterface.on('line', line => {
  lineNo++;
  if (isHeader){
    headers = parseCSVLine(line);
    headers = headers.map(h => h.trim());
    headers.forEach((h,i)=> idx[h] = i);
    const lowerMap = {};
    headers.forEach((h,i)=> lowerMap[h.toLowerCase()] = i);
    if (!('Category_top' in idx) && ('category_top' in lowerMap)) idx['Category_top'] = lowerMap['category_top'];
    if (!('child_category1' in idx) && ('child_category1' in lowerMap)) idx['child_category1'] = lowerMap['child_category1'];
    if (!('child_category2' in idx) && ('child_category2' in lowerMap)) idx['child_category2'] = lowerMap['child_category2'];
    if (!('categories' in idx) && ('categories' in lowerMap)) idx['categories'] = lowerMap['categories'];
    if (!('category' in idx) && ('category' in lowerMap)) idx['category'] = lowerMap['category'];

    if (typeof idx['categories'] === 'undefined') {
      headers.push('categories');
      idx['categories'] = headers.length - 1;
    }
    if (typeof idx['category'] === 'undefined') {
      headers.push('category');
      idx['category'] = headers.length - 1;
    }

    out.write(headers.map(csvEscape).join(',') + '\n');
    isHeader = false;
    return;
  }

  const fields = parseCSVLine(line);
  while (fields.length < headers.length) fields.push('');

  const get = (name) => {
    const i = idx[name];
    return (typeof i === 'number' && i < fields.length) ? (fields[i] || '').trim() : '';
  };

  const top = get('Category_top');
  const c1 = get('child_category1');
  const c2 = get('child_category2');

  const cats = [];
  if (top) cats.push(top);
  if (c1) cats.push(c1);
  if (c2) cats.push(c2);

  const categoriesValue = cats.length ? JSON.stringify(cats) : '';

  const singular = c2 || c1 || top || '';

  fields[idx['categories']] = categoriesValue;
  fields[idx['category']] = singular;

  const outLine = fields.map(csvEscape).join(',');
  out.write(outLine + '\n');
});

rlInterface.on('close', () => {
  out.end();
  fs.renameSync(outpath, infile);
  console.log('Updated file written (in-place). Original backed up at:', backup);
});
