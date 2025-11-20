// Helper to convert a filters object from the Filters component into query params
export function buildParams(filters = {}) {
  const params = {};
  if (filters.category) params.category = filters.category;
  if (filters.category_child1) params.category_child1 = filters.category_child1;
  if (filters.category_child2) params.category_child2 = filters.category_child2;
  if (filters.offer) params.offer = true;
  if (filters.isNew) params.isNew = true;
  if (filters.brand) params.brand = filters.brand;
  if (filters.priceMin) params.priceMin = filters.priceMin;
  if (filters.priceMax) params.priceMax = filters.priceMax;
  if (filters.warranty) params.warranty = filters.warranty;
  if (filters.specKey && filters.specValue) params[`spec_${filters.specKey}`] = filters.specValue;
  if (filters.ratingMin) params.ratingMin = filters.ratingMin;
  return params;
}

export default { buildParams };
