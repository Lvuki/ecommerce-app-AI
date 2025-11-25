const { Category } = require('../models');

const listCategories = async (req, res) => {
  try {
    // Fetch all categories and build a recursive tree in JS so we can return arbitrary depth
    // We'll fetch without ordering and then order according to a preferred list so the
    // frontend shows categories in the exact order the user requested.
    const rows = await Category.findAll();

    // Preferred top-level ordering (exact strings). Add or reorder entries here to
    // control how top-level categories are displayed. User-provided order:
    const preferredOrder = [
      'ELEKTROSHTEPIAKE TE MEDHA',
      'ELEKTROSHTEPIAKE TE VOGLA',
      'TELEFONIA',
      'TV & AUDIO',
      'FTOHJE & NGROHJE',
      'KOMPJUTERA',
      'KUJDESI PERSONAL',
      'PASTRIMI & HEKUROSJA',
      'FOTO & VIDEO',
      'LOJRA & HOBI & GADGETS',
      'SIGURIA & MBIKQYRJA',
      'BATERI & LLAMPA',
    ];

    // Preferred ordering for subcategories per parent (optional). If a parent
    // name is present here, its children will be sorted in the specified order.
    // Add entries here for any parent where you want a deterministic child order.
    const preferredChildren = {
      'ELEKTROSHTEPIAKE TE MEDHA': [
        'FRIGORIFERE',
        'LAVATRICE',
        'LAVASTOVILJE',
        'ASPIRATORE',
        'PERGATITJA E KAFESE',
        'SOBA & MIKROVALE',
        'THARESE RROBASH',
        'AKSESORE GATIMI',
        'ELEKTROSHTEPIAKE INKASO'
      ]
    };
    // child ordering for FRIGORIFERE (level-2 under ELEKTROSHTEPIAKE TE MEDHA)
    preferredChildren['FRIGORIFERE'] = [
      'FRIGORIFER BANAK',
      'FRIGORIFER FTOHES',
      'FRIGORIFER I KOMBINUAR',
      'FRIGORIFER MINI BAR',
      'FRIGORIFER MULTI DOOR',
      'FRIGORIFER NGRIRES',
      'FRIGORIFER SBS',
      'FRIGORIFER VERE',
      'AKSESORE FRIGORIFERI'
    ];
    // child ordering for ELEKTROSHTEPIAKE TE VOGLA
    preferredChildren['ELEKTROSHTEPIAKE TE VOGLA'] = [
      'GATIMI',
      'PERGATITJA E KAFESE',
      'PERGATITJA E USHQIMIT',
      'ENE KUZHINE'
    ];
    // explicit ordering for the level-2 children under ELEKTROSHTEPIAKE TE VOGLA
    preferredChildren['GATIMI'] = [
      'FRITEZA',
      'FURRA',
      'GATUES',
      'GRILLA',
      'MAKINE PRODHUES AKULLI',
      'MIKROVALE',
      'PIANURA'
    ];
    preferredChildren['PERGATITJA E KAFESE'] = [
      'AKSESORE',
      'EKSPRESE',
      'MAKINE KAFEJE',
      'MULLINJ KAFEJE',
      'XHEZVE'
    ];
    preferredChildren['PERGATITJA E USHQIMIT'] = [
      'AKSESORE',
      'APARATE VAKUMI',
      'BLENDERA',
      'GRIRESE',
      'MIKSERA',
      'NGROHES UJI',
      'PESHORE USHQIMI',
      'SHTRYDHESE',
      'THEKESE',
      'TOSTIERE'
    ];
    preferredChildren['ENE KUZHINE'] = [
      'AKSESORE KUZHINE',
      'CAJNIK',
      'TAVA PJEKJE',
      'TENXHERE',
      'TIGANE'
    ];

    const nameToIndex = new Map();
    preferredOrder.forEach((n, i) => nameToIndex.set(String(n).toLowerCase(), i));

    // build child-name -> index maps for parents that have explicit child ordering
    const childIndexByParent = {};
    Object.keys(preferredChildren).forEach(parent => {
      const arr = preferredChildren[parent] || [];
      const m = new Map();
      arr.forEach((n, i) => m.set(String(n).toLowerCase(), i));
      childIndexByParent[String(parent).toLowerCase()] = m;
    });

    // comparator supports optional parentName context so we can apply a specific
    // ordering for subcategories of a given parent when available.
    const cmpByPreferred = (a, b, parentName) => {
      if (!a || !b) return 0;
      const na = String(a.name || a).toLowerCase();
      const nb = String(b.name || b).toLowerCase();

      // if parent-specific ordering exists, try it first
      if (parentName) {
        const pm = childIndexByParent[String(parentName).toLowerCase()];
        if (pm) {
          const ia = pm.has(na) ? pm.get(na) : Number.POSITIVE_INFINITY;
          const ib = pm.has(nb) ? pm.get(nb) : Number.POSITIVE_INFINITY;
          if (ia !== ib) return ia - ib;
        }
      }

      const ia = nameToIndex.has(na) ? nameToIndex.get(na) : Number.POSITIVE_INFINITY;
      const ib = nameToIndex.has(nb) ? nameToIndex.get(nb) : Number.POSITIVE_INFINITY;
      if (ia !== ib) return ia - ib;
      // fallback to alphabetical
      return na.localeCompare(nb);
    };

    // map by id
    const map = {};
    rows.forEach(r => {
      map[r.id] = { ...r.toJSON(), subcategories: [] };
    });

    const roots = [];
    rows.forEach(r => {
      const node = map[r.id];
      if (r.parentId && map[r.parentId]) {
        map[r.parentId].subcategories.push(node);
      } else {
        roots.push(node);
      }
    });

    // sort subcategories recursively using the preferred comparator
    // recursive sort which passes parent name down so children can be sorted
    // according to parent-specific order when provided
    const sortRecursive = (nodes, parentName = null) => {
      nodes.sort((a, b) => cmpByPreferred(a, b, parentName));
      nodes.forEach(n => {
        if (Array.isArray(n.subcategories) && n.subcategories.length) sortRecursive(n.subcategories, n.name);
      });
    };

    sortRecursive(roots, null);
    
    res.json(roots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getCategory = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createCategory = async (req, res) => {
  try {
    const body = { ...req.body };
    // normalize specs: accept JSON string or newline-separated string
    if (body.specs && typeof body.specs === 'string') {
      try { body.specs = JSON.parse(body.specs); } catch (_) {
        body.specs = body.specs.split('\n').map(s => s.trim()).filter(Boolean);
      }
    }
    // normalize parentId (may come as string from FormData)
    if (body.parentId) body.parentId = Number.isNaN(parseInt(body.parentId, 10)) ? null : parseInt(body.parentId, 10);
    if (req.file) {
      body.image = `/uploads/${req.file.filename}`;
    }

    // prevent cycle: parentId cannot equal this new category id (not known yet) but
    // ensure parentId, if provided, exists
    if (body.parentId) {
      const parent = await Category.findByPk(body.parentId);
      if (!parent) return res.status(400).json({ error: 'parentId does not exist' });
    }

    const cat = await Category.create(body);
    res.json(cat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const body = { ...req.body };
    // normalize specs: accept JSON string or newline-separated string
    if (body.specs && typeof body.specs === 'string') {
      try { body.specs = JSON.parse(body.specs); } catch (_) {
        body.specs = body.specs.split('\n').map(s => s.trim()).filter(Boolean);
      }
    }
    if (body.parentId) body.parentId = Number.isNaN(parseInt(body.parentId, 10)) ? null : parseInt(body.parentId, 10);
    if (req.file) body.image = `/uploads/${req.file.filename}`;

    // validation: cannot set parentId to itself or to a descendant (would create a cycle)
    if (body.parentId) {
      const parentId = body.parentId;
      const myId = parseInt(id, 10);
      if (parentId === myId) return res.status(400).json({ error: 'parentId cannot be the same as category id' });

      // walk up from parentId to ensure we don't encounter myId
      let current = await Category.findByPk(parentId);
      while (current) {
        if (current.id === myId) return res.status(400).json({ error: 'parentId cannot be a descendant of this category' });
        if (!current.parentId) break;
        current = await Category.findByPk(current.parentId);
      }
    }

    await Category.update(body, { where: { id } });
    const updated = await Category.findByPk(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    await Category.destroy({ where: { id } });
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { listCategories, getCategory, createCategory, updateCategory, deleteCategory };