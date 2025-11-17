const { Category } = require('../models');

(async function main(){
  try {
    const rows = await Category.findAll();
    const map = {};
    rows.forEach(r => map[r.id] = { ...r.toJSON(), subcategories: [] });
    const roots = [];
    rows.forEach(r => {
      const node = map[r.id];
      if (r.parentId && map[r.parentId]) map[r.parentId].subcategories.push(node);
      else roots.push(node);
    });

    // find SIGURIA & MBIKQYRJA root
    const siguria = roots.find(r => r.name === 'SIGURIA & MBIKQYRJA');
    if (!siguria) {
      console.log('SIGURIA & MBIKQYRJA not found');
      process.exit(0);
    }

    // find BATERI & LLAMPA under it
    const bateri = siguria.subcategories.find(c => c.name === 'BATERI & LLAMPA');
    if (!bateri) {
      console.log('BATERI & LLAMPA not found under SIGURIA & MBIKQYRJA');
      process.exit(0);
    }

    // print subtree
    function printNode(n, indent = 0) {
      console.log(' '.repeat(indent) + `- ${n.name} (id=${n.id})`);
      if (n.subcategories && n.subcategories.length) {
        n.subcategories.forEach(s => printNode(s, indent + 2));
      }
    }

    console.log('Subtree for BATERI & LLAMPA:');
    printNode(bateri, 0);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(2);
  }
})();
