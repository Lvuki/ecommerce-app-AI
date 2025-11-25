// Helper to convert a filters object from the Filters component into query params
export function buildParams(filters = {}) {
  // input received from Filters component
  const params = {};
  // Determine deepest selected category id and name (if provided)
  let catId = filters.category;
  if (filters.category_child1) catId = filters.category_child1;
  if (filters.category_child2) catId = filters.category_child2;

  let catName = '';
  if (filters.category_child2_name) catName = filters.category_child2_name;
  else if (filters.category_child1_name) catName = filters.category_child1_name;
  else if (filters.categoryName) catName = filters.categoryName;

  // Prefer sending the category name (if present) because products store category
  // strings/paths as names. Fall back to categoryId when no name is available.
  if (catName) {
    params.category = catName;
  } else if (catId) {
    if (!isNaN(catId)) {
      // coerce numeric ids to Number so logs / backend receive a number
      params.categoryId = Number(catId);
    } else {
      params.category = catId;
    }
  }
  if (filters.offer) params.offer = true;
  if (filters.isNew) params.isNew = true;
  // Support brand as array or comma-separated string
  if (filters.brand) {
    if (Array.isArray(filters.brand)) {
      if (filters.brand.length) params.brand = filters.brand.slice();
    } else if (typeof filters.brand === 'string') {
      const s = filters.brand.trim();
      if (s.includes(',')) params.brand = s.split(',').map(x => x.trim()).filter(Boolean);
      else if (s !== '') params.brand = s;
    }
  }
  if (filters.priceMin) params.priceMin = filters.priceMin;
  if (filters.priceMax) params.priceMax = filters.priceMax;
  if (filters.warranty) params.warranty = filters.warranty;
  if (filters.specKey && filters.specValue) params[`spec_${filters.specKey}`] = filters.specValue;
  if (filters.ratingMin) params.ratingMin = filters.ratingMin;

  // return built params
  return params;
}

export default { buildParams };
