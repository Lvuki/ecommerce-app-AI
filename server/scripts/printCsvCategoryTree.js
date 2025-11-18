const fs = require('fs');
const path = require('path');

const DEFAULT_CSV = path.resolve(process.cwd(), 'specifikat.csv');

function parseLine(line) {
  const parts = line.split(',');
  while (parts.length < 4) parts.push('');
  return parts.slice(0, 4).map(s => s.replace(/^"|"$/g, '').trim());
}

function buildTree(csvPath) {
  if (!fs.existsSync(csvPath)) {
    console.error('CSV not found:', csvPath);
    process.exit(1);
  }
  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const tree = {}; // top -> child1 -> Set(child2)

  let currentTop = null;
  let currentChild1 = null;
  let currentChild2 = null;

  for (let i = 1; i < lines.length; i++) {
    const [col0, col1, col2] = parseLine(lines[i]);
    if (col0) {
      currentTop = col0;
      currentChild1 = null;
      currentChild2 = null;
      if (!tree[currentTop]) tree[currentTop] = {};
      continue;
    }
    if (col1) {
      currentChild1 = col1;
      currentChild2 = null;
      if (!tree[currentTop]) tree[currentTop] = {};
      if (!tree[currentTop][currentChild1]) tree[currentTop][currentChild1] = new Set();
      continue;
    }
    if (col2) {
      currentChild2 = col2;
      if (!tree[currentTop]) tree[currentTop] = {};
      if (!tree[currentTop][currentChild1]) tree[currentTop][currentChild1] = new Set();
      tree[currentTop][currentChild1].add(currentChild2);
      continue;
    }
    // specs lines (col3) ignored for tree
  }

  // convert sets to arrays for printing
  const out = {};
  Object.keys(tree).forEach(top => {
    out[top] = {};
    Object.keys(tree[top]).forEach(c1 => {
      out[top][c1] = Array.from(tree[top][c1]);
    });
  });
  return out;
}

function printTree(tree) {
  const tops = Object.keys(tree);
  console.log(`Found ${tops.length} top-level categories.`);
  tops.forEach(top => {
    console.log(`\n${top}`);
    const child1s = Object.keys(tree[top]);
    child1s.forEach(c1 => {
      const c2s = tree[top][c1] || [];
      console.log(`  ├─ ${c1} (${c2s.length} level-2)`);
      c2s.forEach((c2, i) => {
        const prefix = i === c2s.length - 1 ? '  │   └─' : '  │   ├─';
        console.log(`${prefix} ${c2}`);
      });
    });
  });
}

const csvPath = process.argv[2] || DEFAULT_CSV;
const tree = buildTree(csvPath);
printTree(tree);
