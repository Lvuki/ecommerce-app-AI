export function getOfferRemaining(p) {
  try {
    if (!p || !p.offerTo) return null;
    const t = new Date(p.offerTo).getTime();
    const now = Date.now();
    if (isNaN(t) || t <= now) return null;
    let diff = Math.max(0, t - now);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    diff -= days * (1000 * 60 * 60 * 24);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    diff -= hours * (1000 * 60 * 60);
    const mins = Math.floor(diff / (1000 * 60));
    if (days > 0) return `Ends in ${days}d ${hours}h`;
    if (hours > 0) return `Ends in ${hours}h ${mins}m`;
    return `Ends in ${mins}m`;
  } catch (_) { return null; }
}

export function priceInfo(p) {
  const price = p && p.price ? Number(p.price) : 0;
  const sale = p && p.salePrice ? Number(p.salePrice) : 0;
  const offer = p && p.offerPrice ? Number(p.offerPrice) : 0;
  const useOffer = offer && offer > 0 && p.offerTo && new Date(p.offerTo).getTime() > Date.now();
  // Show sale when salePrice is provided; mark invalidSale when sale >= price
  const useSale = !useOffer && sale && sale > 0;
  const isInvalidSale = !!(sale && sale > 0 && price && sale >= price);
  const display = useOffer ? offer : (useSale ? sale : price);
  const discounted = useOffer || (useSale && !isInvalidSale);
  return { display, original: price, isOffer: useOffer, isSale: useSale, isInvalidSale, discounted, remaining: useOffer ? getOfferRemaining(p) : null };
}

export default priceInfo;
