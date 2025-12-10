import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getProducts } from "../services/productService";
import { getCategories } from '../services/categoryService';
import { getPosts, addPost, updatePost, deletePost } from "../services/blogService";
import { isAdmin } from "../services/authService";
import { addItem } from "../services/cartService";
import wishlistService from "../services/wishlistService";
import { getToken } from "../services/authService";
import '../styles/productCard.css';
import { useCompare } from '../context/CompareContext';
import { useCurrency } from '../context/CurrencyContext';


export default function Home() {
  const { addToCompare, removeFromCompare, isInCompare } = useCompare();
  const { formatPrice } = useCurrency();
  const [products, setProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 5;
  const [slideIdx, setSlideIdx] = useState(0);
  // banner slider state (homepage full-bleed banner under announcement)
  const [bannerIdx, setBannerIdx] = useState(0);
  const bannerImages = ['/images/hero-story.avif', '/images/hero-2.avif', '/images/hero-3.avif'];
  const isLoggedIn = useMemo(() => !!getToken(), []);

  useEffect(() => {
    getProducts().then(setProducts);
  }, []);

  // Reset to first page if products list changes (e.g., after reload)
  useEffect(() => {
    setCurrentPage(1);
  }, [products.length]);

  // Autoslide disabled: manual control preferred. To re-enable, restore the interval below.
  // useEffect(() => {
  //   const id = setInterval(() => setSlideIdx((i) => (i + 1) % Math.max(1, Math.min(5, products.length))), 4000);
  //   return () => clearInterval(id);
  // }, [products.length]);

  const featured = products.slice(0, 5);
  const current = featured[slideIdx] || {};
  const [posts, setPosts] = useState([]);
  const [blogIdx, setBlogIdx] = useState(0);
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const [cardWidth, setCardWidth] = useState(0);
  // measure viewport and compute cardWidth for 3-up layout
  useEffect(() => {
    const visible = 3;
    const measure = () => {
      const vw = viewportRef.current ? viewportRef.current.clientWidth : 0;
      setCardWidth(vw && visible ? Math.floor(vw / visible) : 0);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // clamp blogIdx when posts or card width changes
  useEffect(() => {
    const visible = 3;
    const maxStart = Math.max(0, posts.length - visible);
    setBlogIdx((i) => Math.min(i, maxStart));
  }, [posts.length, cardWidth]);


  const [categories, setCategories] = useState([]);
  // Helpers for pricing/offer visuals
  const getOfferRemaining = (p) => {
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
  };

  const priceInfo = (p) => {
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
  };
  // list of currently active offers
  const offers = products.filter(p => priceInfo(p).isOffer);
  // recommended: prefer offers, but include more items so slider can show 5 and navigate to others
  const buildRecommended = () => {
    const maxVisible = 5;
    const maxTotal = Math.min(products ? products.length : 0, 12); // keep a reasonable total pool
    const seed = [];
    if (offers && offers.length > 0) {
      // include all offers first (cap to maxTotal)
      for (let i = 0; i < Math.min(offers.length, maxTotal); i++) seed.push(offers[i]);
    }
    if (seed.length < maxTotal && products && products.length > 0) {
      // pool excludes already included items
      const pool = products.filter(p => !seed.find(s => String(s.id) === String(p.id)));
      // shuffle pool (Fisher-Yates)
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const need = Math.min(maxTotal - seed.length, pool.length);
      for (let i = 0; i < need; i++) seed.push(pool[i]);
    }
    // Ensure at least `maxVisible` items when possible
    return seed.slice(0, Math.max(seed.length, Math.min(maxTotal, maxVisible)));
  };
  const recommended = buildRecommended();
  // Offers slider refs/state (for "Recommended for you")
  const offersViewportRef = useRef(null);
  const offersTrackRef = useRef(null);
  const [offersIdx, setOffersIdx] = useState(0);
  useEffect(() => {
    const visible = 5;
    const total = recommended.length || 0;
    const maxStart = Math.max(0, total - visible);
    setOffersIdx((i) => Math.min(i, maxStart));
  }, [recommended.length]);
  // ref and hover state for offers row (removed for grid layout revert)
  const brands = useMemo(() => {
    const m = new Map();
    products.forEach(p => {
      const name = (p.brand || '').toString().trim();
      if (!name) return;
      if (!m.has(name)) m.set(name, p.image || null);
    });
    return Array.from(m.entries()).map(([name, image]) => ({ name, image }));
  }, [products]);

  // Brands carousel state
  const brandsViewportRef = useRef(null);
  const brandsTrackRef = useRef(null);
  const [brandsIdx, setBrandsIdx] = useState(0);
  useEffect(() => {
    const visible = 6;
    const list = brands.slice(0, Math.min(brands.length, 24));
    const total = list.length;
    const maxStart = Math.max(0, total - visible);
    setBrandsIdx(i => Math.min(i, maxStart));
  }, [brands.length]);
  const [showBlogForm, setShowBlogForm] = useState(false);
  const [blogForm, setBlogForm] = useState({ title: '', excerpt: '', content: '', category: '', image: '', imageFile: null });
  const admin = isAdmin();

  useEffect(() => {
    getPosts().then((p) => setPosts(p || []));
  }, []);

  // reset blog slider index if posts change
  useEffect(() => {
    setBlogIdx(0);
  }, [posts.length]);

  useEffect(() => {
    getCategories().then((c) => setCategories(c || []));
  }, []);

  const submitBlog = async (e) => {
    e.preventDefault();
    // build FormData to support file upload
    const fd = new FormData();
    fd.append('title', blogForm.title);
    fd.append('excerpt', blogForm.excerpt);
    fd.append('content', blogForm.content);
    fd.append('category', blogForm.category);
    if (blogForm.imageFile) fd.append('image', blogForm.imageFile);
    if (blogForm.id) {
      await updatePost(blogForm.id, fd);
    } else {
      await addPost(fd);
    }
    setPosts(await getPosts());
    setShowBlogForm(false);
    setBlogForm({ title: '', excerpt: '', content: '', category: '', image: '', imageFile: null });
  };

  const removeBlog = async (id) => {
    await deletePost(id);
    setPosts(await getPosts());
  };

  return (
    <div className="page-container">
      {/* Full-width banner slider under announcement (above the featured slider) */}
      <div style={{ width: '100%', position: 'relative', overflow: 'hidden', marginTop: 12, display: 'block', background: '#f6f6f6' }}>
        <div style={{ position: 'relative' }}>
          <img
            src={bannerImages[bannerIdx]}
            alt={`Promo ${bannerIdx + 1}`}
            style={{ width: '100%', height: 460, objectFit: 'cover', objectPosition: 'center center', display: 'block' }}
            onError={(e) => { try { e.currentTarget.onerror = null; e.currentTarget.src = 'https://picsum.photos/1800/460?random=1'; } catch (_) { } }}
          />

          {/* left arrow */}
          <button aria-label="Previous banner" onClick={(e) => { e.stopPropagation(); setBannerIdx(i => (i - 1 + bannerImages.length) % bannerImages.length); }}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: 22, background: 'rgba(0,0,0,0.45)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 20, fontSize: 20 }}>
            ‹
          </button>

          {/* right arrow */}
          <button aria-label="Next banner" onClick={(e) => { e.stopPropagation(); setBannerIdx(i => (i + 1) % bannerImages.length); }}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: 22, background: 'rgba(0,0,0,0.45)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 20, fontSize: 20 }}>
            ›
          </button>

          {/* overlay content centered on top of image (keeps same content) */}
          <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ maxWidth: 1440, width: '100%', padding: '0 18px', boxSizing: 'border-box', pointerEvents: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', textShadow: '0 6px 18px rgba(0,0,0,0.45)' }}>Welcome — Free shipping for orders over $50</div>
                <div style={{ flex: '0 0 auto' }}>
                  <a href="/products" style={{ background: '#ffb84d', color: '#111', padding: '10px 14px', borderRadius: 8, textDecoration: 'none', fontWeight: 700 }}>Shop Offers</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ width: '100%' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 18px', boxSizing: 'border-box' }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 48, marginBottom: 56, paddingTop: 8, paddingBottom: 8 }}>
            <h1 style={{ margin: 0 }}>Fletepalosjet &amp; Ofertat e fundit</h1>
          </div>
          {/* Two image slots (left/right) replacing previous slider area */}
          <div className="hp-two-images" style={{ display: 'flex', gap: 20, borderRadius: 12, background: 'transparent', padding: 16, alignItems: 'stretch', justifyContent: 'center', flexWrap: 'nowrap', boxSizing: 'border-box' }}>
            {/* left card with its own background - allow shrinking (minWidth: 0) so no horizontal scroll */}
            <div style={{ flex: '1 1 50%', minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 420, background: '#ffffff', borderRadius: 10, padding: 12, boxShadow: '0 6px 18px rgba(0,0,0,0.04)', boxSizing: 'border-box' }}>
              <img src="/images/homepage/shfletepalosje_online.png" alt="Shfleto fletepalosje" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: 6 }} onError={(e) => { try { e.currentTarget.onerror = null; e.currentTarget.src = 'https://picsum.photos/seed/left/800/420'; } catch (_) { } }} />
            </div>

            {/* right card with a different background - allow shrinking */}
            <div style={{ flex: '1 1 50%', minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 420, background: '#fff3e0', borderRadius: 10, padding: 12, boxShadow: '0 6px 18px rgba(0,0,0,0.04)', boxSizing: 'border-box' }}>
              <img src="/images/homepage/luaj.PNG" alt="Luaj" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: 6 }} onError={(e) => { try { e.currentTarget.onerror = null; e.currentTarget.src = 'https://picsum.photos/seed/right/800/420'; } catch (_) { } }} />
            </div>
          </div>
        </div>
      </div>
      {/* Insert blog slider (3 cards per page) under the featured slider */}
      <div style={{ width: '100%' }}>
        <div style={{ maxWidth: 1440, margin: '18px auto 0', padding: '0 18px', boxSizing: 'border-box' }}>
          <h2 style={{ marginTop: 0, marginBottom: 12, textAlign: 'center' }}>Latest blog posts</h2>
          <div style={{ position: 'relative', textAlign: 'center' }}>
            {(() => {
              const visible = 3;
              const total = posts.length;
              const maxStart = Math.max(0, total - visible);
              return (
                <>
                  <div ref={viewportRef} style={{ overflow: 'hidden', borderRadius: 10, position: 'relative', zIndex: 1, willChange: 'transform' }}>
                    <div ref={trackRef} style={{ display: 'flex', transition: 'transform 420ms ease', width: `${cardWidth * total}px`, transform: `translateX(${-(blogIdx * cardWidth)}px)`, willChange: 'transform' }}>
                      {posts.map((post, i) => (
                        <div key={post.id || i} style={{ width: cardWidth ? `${cardWidth}px` : `${100 / visible}%`, boxSizing: 'border-box', padding: 8 }}>
                          {/* image inside bordered card */}
                          <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden', background: '#fff', textAlign: 'left' }}>
                            {post.image ? <img src={post.image} alt={post.title} style={{ width: '100%', height: 250, objectFit: 'cover', display: 'block' }} /> : <div style={{ height: 250, background: '#fafafa' }} />}
                          </div>

                          {/* title moved outside the card with extra spacing */}
                          <div style={{ marginTop: 22, paddingLeft: 4 }}>
                            <Link to={`/blogs/${post.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                              <div style={{ fontWeight: 800, fontSize: 18, lineHeight: '1.15', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title}</div>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {total > visible ? (
                    <div style={{ position: 'absolute', right: 12, bottom: -18, display: 'flex', gap: 8, zIndex: 6 }}>
                      <button aria-label="Previous blog" onClick={(e) => { e.stopPropagation(); setBlogIdx(i => Math.max(0, i - 1)); }} style={{ background: '#fff', border: '1px solid #e6e6e6', width: 28, height: 28, fontSize: 16, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>‹</button>
                      <button aria-label="Next blog" onClick={(e) => { e.stopPropagation(); setBlogIdx(i => Math.min(maxStart, i + 1)); }} style={{ background: '#0b79d0', color: '#fff', border: 'none', width: 28, height: 28, fontSize: 16, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>›</button>
                    </div>
                  ) : null}

                  {total > visible ? (
                    <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', width: '100%', paddingLeft: 6, marginTop: 12, gap: 6 }}>
                      {(() => {
                        const maxDots = 4;
                        const positions = maxStart + 1;
                        if (positions <= maxDots) return Array.from({ length: positions }).map((_, i) => (
                          <button key={i} aria-label={`Go to blog ${i + 1}`} onClick={(e) => { e.stopPropagation(); setBlogIdx(i); }} style={{ width: 28, height: 4, borderRadius: 4, border: 'none', background: i === blogIdx ? '#0b79d0' : '#e6e6e6', cursor: 'pointer' }} />
                        ));

                        // positions > maxDots: show a window of up to maxDots around the current index
                        const pages = [];
                        if (blogIdx <= 1) {
                          for (let i = 0; i < maxDots; i++) pages.push(i);
                        } else if (blogIdx >= positions - 2) {
                          for (let i = positions - maxDots; i < positions; i++) pages.push(i);
                        } else {
                          // center current index where possible (current at position 2 of 4)
                          const start = Math.max(0, blogIdx - 1);
                          for (let i = start; i < start + maxDots; i++) pages.push(i);
                        }

                        return pages.map(i => (
                          <button key={i} aria-label={`Go to blog ${i + 1}`} onClick={(e) => { e.stopPropagation(); setBlogIdx(i); }} style={{ width: 28, height: 4, borderRadius: 4, border: 'none', background: i === blogIdx ? '#0b79d0' : '#e6e6e6', cursor: 'pointer' }} />
                        ));
                      })()}

                      {/* compact current / total indicator */}
                      <div style={{ marginLeft: 8, color: '#666', fontSize: 12 }}>{Math.min(blogIdx + 1, maxStart + 1)} / {maxStart + 1}</div>
                    </div>
                  ) : null}
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Promo banner (full-width) - centered text with right image, badge removed */}
      <div style={{ width: '100%', marginTop: 32 }}>
        <div style={{ width: '100%', boxSizing: 'border-box' }}>
          <div style={{ position: 'relative', overflow: 'hidden', background: '#efefef', display: 'flex', alignItems: 'center', height: 115 }}>
            {/* left orange sticker */}
            <div style={{ position: 'absolute', left: 48, top: '50%', transform: 'translateY(-50%)', background: '#ffb84d', color: '#fff', padding: '10px 12px', borderRadius: 8, fontWeight: 800, textAlign: 'center', boxShadow: '0 8px 18px rgba(0,0,0,0.08)', zIndex: 4 }}>
              <div style={{ fontSize: 16, lineHeight: 1 }}>nxitoni</div>
              <div style={{ fontSize: 18, marginTop: 4, fontWeight: 900 }}>-20%</div>
            </div>

            <div style={{ width: '100%', maxWidth: 1170, margin: '0 auto', display: 'flex', alignItems: 'center', boxSizing: 'border-box' }}>
              <div style={{ flex: 1, padding: '0 18px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#111' }}>BLI ME 0% INTERES & FILLO PAGUAJ PAS 2 MUAJSH</div>
                <div style={{ marginTop: 6, color: '#444', fontSize: 14 }}>Shiko ofertat e fundit dhe përfito zbritje ekskluzive</div>
              </div>

              <div style={{ width: 260, height: '100%', overflow: 'hidden', display: 'block' }}>
                <img src="https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=800&q=60" alt="promo" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Redesigned Offers row: horizontal scroller with badge, hover styles and CTA */}
      {recommended && recommended.length > 0 ? (
        <>
          <div style={{ width: '100%' }}>
            <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 18px', boxSizing: 'border-box' }}>
              <h2 style={{ marginTop: 48, marginBottom: 36, textAlign: 'left' }}>Recommended for you</h2>
              {(() => {
                const visible = 5;
                const list = recommended;
                const total = list.length;
                const maxStart = Math.max(0, total - visible);
                return (
                  <div className="recommended" style={{ position: 'relative', textAlign: 'center' }}>
                    <div ref={offersViewportRef} style={{ overflow: 'hidden', borderRadius: 10, position: 'relative', zIndex: 1, willChange: 'transform' }}>
                      <div ref={offersTrackRef} style={{ display: 'flex', transition: 'transform 420ms ease', width: `${(100 * total) / visible}%`, transform: `translateX(${-(offersIdx * (100 / visible))}%)`, willChange: 'transform' }}>
                        {list.map((p, i) => {
                          const info = priceInfo(p);
                          const imgSrc = (p.images && p.images.length) ? p.images[0] : p.image;
                          const displaySrc = imgSrc ? (imgSrc.startsWith('http') ? imgSrc : `http://localhost:4000${imgSrc}`) : null;
                          return (
                            <div key={p.id || i} style={{ width: `${100 / visible}%`, boxSizing: 'border-box', padding: 8 }}>
                              <Link to={`/products/${p.id}`} style={{ textDecoration: 'none' }}>
                                <div className={`product-card ${info.isOffer || info.isSale ? 'highlighted' : ''}`} style={{ position: 'relative' }}>
                                  {info.discounted ? (
                                    <div className="badge">
                                      <span className="badge-text">KURSE</span>
                                      <span className="badge-value">{formatPrice((info.original || 0) - (info.display || 0))}</span>
                                    </div>
                                  ) : null}

                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      isInCompare(p.id) ? removeFromCompare(p.id) : addToCompare(p);
                                    }}
                                    style={{
                                      position: 'absolute',
                                      top: 8,
                                      right: 8,
                                      zIndex: 10,
                                      background: isInCompare(p.id) ? '#0b79d0' : 'rgba(255,255,255,0.9)',
                                      color: isInCompare(p.id) ? '#fff' : '#333',
                                      border: '1px solid #eee',
                                      borderRadius: '50%',
                                      width: 32,
                                      height: 32,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      fontSize: 16
                                    }}
                                    title={isInCompare(p.id) ? "Remove from Compare" : "Add to Compare"}
                                  >
                                    {isInCompare(p.id) ? '✓' : '⚖️'}
                                  </button>

                                  <div className="category">{(p.category || p.brand || '').toString().toUpperCase()}</div>
                                  {displaySrc ? (
                                    <img src={displaySrc} alt={p.name} className="product-image" />
                                  ) : (
                                    <div className="product-image" style={{ background: '#fafafa' }} />
                                  )}

                                  <div style={{ padding: '0 6px' }}>
                                    <div className="product-name">{p.name}</div>
                                    <div className="price-container">
                                      {info.discounted ? <span className="old-price">{formatPrice(info.original)}</span> : null}
                                      <div className="current-price">{formatPrice(info.display)}</div>
                                    </div>
                                    <button className="buy-btn" onClick={async (e) => { e.preventDefault(); try { const priceToUse = info.display; await addItem({ id: p.id, name: p.name, price: priceToUse, image: p.image, sku: p.sku }, 1); alert('Added to cart'); } catch (err) { console.error(err); alert('Failed to add to cart'); } }}>BLI TANI</button>
                                  </div>
                                </div>
                              </Link>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {total > visible ? (
                      <div style={{ position: 'absolute', right: 12, bottom: -18, display: 'flex', gap: 8, zIndex: 6 }}>
                        <button aria-label="Previous offers" onClick={(e) => { e.stopPropagation(); setOffersIdx(i => Math.max(0, i - 1)); }} style={{ background: '#fff', border: '1px solid #e6e6e6', width: 28, height: 28, fontSize: 16, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>‹</button>
                        <button aria-label="Next offers" onClick={(e) => { e.stopPropagation(); setOffersIdx(i => Math.min(maxStart, i + 1)); }} style={{ background: '#0b79d0', color: '#fff', border: 'none', width: 28, height: 28, fontSize: 16, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>›</button>
                      </div>
                    ) : null}

                    {total > visible ? (
                      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', width: '100%', paddingLeft: 6, marginTop: 12, gap: 6 }}>
                        {(() => {
                          const maxDots = 4;
                          const positions = maxStart + 1;
                          if (positions <= maxDots) return Array.from({ length: positions }).map((_, i) => (
                            <button key={i} aria-label={`Go to offer ${i + 1}`} onClick={(e) => { e.stopPropagation(); setOffersIdx(i); }} style={{ width: 28, height: 4, borderRadius: 4, border: 'none', background: i === offersIdx ? '#0b79d0' : '#e6e6e6', cursor: 'pointer' }} />
                          ));

                          const pages = [];
                          if (offersIdx <= 1) {
                            for (let i = 0; i < maxDots; i++) pages.push(i);
                          } else if (offersIdx >= positions - 2) {
                            for (let i = positions - maxDots; i < positions; i++) pages.push(i);
                          } else {
                            const start = Math.max(0, offersIdx - 1);
                            for (let i = start; i < start + maxDots; i++) pages.push(i);
                          }

                          return pages.map(i => (
                            <button key={i} aria-label={`Go to offer ${i + 1}`} onClick={(e) => { e.stopPropagation(); setOffersIdx(i); }} style={{ width: 28, height: 4, borderRadius: 4, border: 'none', background: i === offersIdx ? '#0b79d0' : '#e6e6e6', cursor: 'pointer' }} />
                          ));
                        })()}

                        <div style={{ marginLeft: 8, color: '#666', fontSize: 12 }}>{Math.min(offersIdx + 1, maxStart + 1)} / {maxStart + 1}</div>
                      </div>
                    ) : null}
                  </div>
                );
              })()}
            </div>
          </div >
        </>
      ) : null
      }

      {/* Promo strip under Current offers (full-bleed, larger) */}
      <div className="hp-promo-strip" style={{ width: '100%', marginTop: 20, background: '#fff3e0', boxShadow: '0 6px 20px rgba(0,0,0,0.06)' }}>
        <div style={{ width: '100%', maxWidth: 1400, margin: '0 auto', boxSizing: 'border-box', padding: '12px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 6, padding: '12px 16px', height: 80, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{ fontWeight: 800, fontSize: 18 }}>Gjeni produktin më të përshtatshëm me Asistentët Tanë Dixhitalë.</div>
              <a href="/promotions" style={{ color: '#0b79d0', textDecoration: 'none', fontSize: 14 }}>Për më shumë</a>
            </div>

            {/* Right area removed image; keep space for visual balance */}
            <div style={{ width: 260, display: 'flex', justifyContent: 'flex-end' }} />
          </div>
        </div>
      </div>

      <h2 style={{ marginTop: 48, marginBottom: 24, textAlign: 'center' }}>Popular products</h2>
      <div style={{ width: '100%', maxWidth: '100%', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', alignItems: 'stretch', width: '100%', boxSizing: 'border-box', padding: '0 8px', flexWrap: 'wrap' }}>
          {products.slice(0, 6).map((p) => {
            const info = priceInfo(p);
            const imgSrc = p.image ? (p.image.startsWith('http') ? p.image : `http://localhost:4000${p.image}`) : null;
            return (
              <div key={p.id} style={{ boxSizing: 'border-box', padding: 8, display: 'flex', justifyContent: 'center' }}>
                <Link to={`/products/${p.id}`} style={{ textDecoration: 'none' }}>
                  <div className={`product-card ${info.isOffer || info.isSale ? 'highlighted' : ''}`} style={{ position: 'relative' }}>
                    {info.discounted ? (
                      <div className="badge">
                        <span className="badge-text">KURSE</span>
                        <span className="badge-value">{formatPrice((info.original || 0) - (info.display || 0))}</span>
                      </div>
                    ) : null}

                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        isInCompare(p.id) ? removeFromCompare(p.id) : addToCompare(p);
                      }}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        zIndex: 10,
                        background: isInCompare(p.id) ? '#0b79d0' : 'rgba(255,255,255,0.9)',
                        color: isInCompare(p.id) ? '#fff' : '#333',
                        border: '1px solid #eee',
                        borderRadius: '50%',
                        width: 32,
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: 16
                      }}
                      title={isInCompare(p.id) ? "Remove from Compare" : "Add to Compare"}
                    >
                      {isInCompare(p.id) ? '✓' : '⚖️'}
                    </button>

                    <div className="category">{(p.category || p.brand || '').toString().toUpperCase()}</div>
                    {imgSrc ? (
                      <img src={imgSrc} alt={p.name} className="product-image" />
                    ) : (
                      <div className="product-image" style={{ background: '#fafafa' }} />
                    )}

                    <div style={{ padding: '0 6px' }}>
                      <div className="product-name">{p.name}</div>
                      <div className="price-container">
                        {info.discounted ? <span className="old-price">{formatPrice(info.original)}</span> : null}
                        <div className="current-price">{formatPrice(info.display)}</div>
                      </div>
                      <button className="buy-btn" onClick={async (e) => { e.preventDefault(); try { const priceToUse = info.display; await addItem({ id: p.id, name: p.name, price: priceToUse, image: p.image, sku: p.sku }, 1); alert('Added to cart'); } catch (err) { console.error(err); alert('Failed to add to cart'); } }}>BLI TANI</button>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* Image marketing banner under latest blog posts */}
      <div style={{ marginTop: 42, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ position: 'relative' }}>
          <img src="https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=1400&q=80" alt="Marketing banner" style={{ width: '100%', height: 260, objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', left: 24, top: 24, color: '#fff', textShadow: '0 4px 12px rgba(0,0,0,0.6)', maxWidth: 680 }}>
            <div style={{ fontSize: 26, fontWeight: 800 }}>Discover our latest arrivals</div>
            <div style={{ marginTop: 8, fontSize: 15 }}>Handpicked products, expert tips, and exclusive deals — all in one place.</div>
            <div style={{ marginTop: 12 }}>
              <a href="/products" style={{ background: '#ff6b6b', color: '#fff', padding: '10px 14px', borderRadius: 8, textDecoration: 'none', fontWeight: 700 }}>Shop Now</a>
              <a href="/blogs" style={{ marginLeft: 12, background: 'rgba(255,255,255,0.85)', color: '#111', padding: '8px 12px', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>Read Blog</a>
            </div>
          </div>
        </div>
      </div>

      {/* Add Blog Post button moved to the Blogs page */}

      {/* Full-width categories section under the banner */}
      <section style={{ width: '100%', marginTop: 42, padding: '0 12px', boxSizing: 'border-box' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 24 }}>Shop by categories</h2>
        <div style={{ width: '100%', maxWidth: '1600px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
            {categories.slice(0, 6).map(cat => (
              <div key={cat.id} style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden', background: '#fff', display: 'flex', flexDirection: 'column' }}>
                <div style={{ height: 220, overflow: 'hidden' }}>
                  {cat.image ? (
                    <img src={cat.image.startsWith('http') ? cat.image : `http://localhost:4000${cat.image}`} alt={cat.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: 220, background: '#fafafa' }} />
                  )}
                </div>
                <div style={{ padding: 14, flex: '1 1 auto' }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{cat.name}</div>
                  <div style={{ color: '#666', fontSize: 13, marginTop: 6 }}>{cat.description}</div>
                  <div style={{ marginTop: 10, color: '#444', fontSize: 14 }}>
                    {products.filter(p => (p.category || '').toLowerCase() === (cat.name || '').toLowerCase()).slice(0, 3).map(p => (
                      <div key={p.id} style={{ marginTop: 6 }}>{p.name}</div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Brands section (thumbnails) - full width */}
      <section style={{ width: '100%', marginTop: 24, padding: '0', boxSizing: 'border-box' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 12 }}>Brands</h2>
        <div style={{ width: '100%', margin: '0 auto', padding: '0 18px', boxSizing: 'border-box' }}>
          {(() => {
            const visible = 6;
            const list = brands.slice(0, Math.min(brands.length, 24));
            const total = list.length;
            const maxStart = Math.max(0, total - visible);
            return (
              <div style={{ position: 'relative' }}>
                <div ref={brandsViewportRef} style={{ overflow: 'hidden', borderRadius: 8, position: 'relative', zIndex: 1, willChange: 'transform' }}>
                  <div ref={brandsTrackRef} style={{ display: 'flex', transition: 'transform 420ms ease', width: `${(100 * total) / visible}%`, transform: `translateX(${-(brandsIdx * (100 / visible))}%)`, willChange: 'transform' }}>
                    {list.map((b) => {
                      const productImage = b.image ? (b.image.startsWith('http') ? b.image : `http://localhost:4000${b.image}`) : null;
                      const slug = (b.name || '').toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                      const logoPath = `/uploads/brands/${slug}.png`;
                      const picsum = `https://picsum.photos/seed/${encodeURIComponent(b.name)}/300/180`;
                      const initialSrc = logoPath;
                      return (
                        <div key={b.name} style={{ width: `${100 / visible}%`, boxSizing: 'border-box', padding: 8, display: 'flex', justifyContent: 'center' }}>
                          <Link to={`/products?brand=${encodeURIComponent(b.name)}`} style={{ textDecoration: 'none' }}>
                            <div style={{ width: '100%', maxWidth: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                              <div style={{ width: '100%', height: 110, borderRadius: 8, overflow: 'hidden', border: '1px solid #eee', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <img
                                  src={initialSrc}
                                  alt={b.name}
                                  title={b.name}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                  onError={(e) => {
                                    try {
                                      const el = e.currentTarget;
                                      if (productImage && el.src !== productImage) {
                                        el.src = productImage;
                                        return;
                                      }
                                      if (el.src !== picsum) el.src = picsum;
                                    } catch (_) { /* ignore */ }
                                  }}
                                />
                              </div>
                              <div style={{ marginTop: 8, textAlign: 'center', fontSize: 14, fontWeight: 600, color: '#333' }}>{b.name}</div>
                            </div>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {total > visible ? (
                  <>
                    <button aria-label="Previous brands" onClick={(e) => { e.stopPropagation(); setBrandsIdx(i => Math.max(0, i - 1)); }} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: 18, background: '#fff', border: '1px solid #e6e6e6', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 6 }}>‹</button>
                    <button aria-label="Next brands" onClick={(e) => { e.stopPropagation(); setBrandsIdx(i => Math.min(maxStart, i + 1)); }} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: 18, background: '#0b79d0', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 6 }}>›</button>
                  </>
                ) : null}
              </div>
            );
          })()}
        </div>
      </section>

      {/* Work with us CTA section */}
      <section style={{ width: '100%', marginTop: 28, padding: '20px 12px', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', background: '#0b79d0', color: '#fff', borderRadius: 10, display: 'flex', gap: 20, alignItems: 'center', padding: 20, boxSizing: 'border-box' }}>
          <div style={{ flex: '1 1 60%' }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>Work with us</div>
            <div style={{ marginTop: 8, opacity: 0.95 }}>Looking to sell your products, collaborate, or join our team? We're always open to partnerships and great talent. Reach out and let's build something amazing together.</div>
          </div>
          <div style={{ flex: '0 0 260px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <a href="/careers" style={{ background: '#fff', color: '#0b79d0', padding: '10px 14px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, display: 'inline-block' }}>Careers</a>
            <a href="mailto:hello@shopapp.com" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '10px 14px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, display: 'inline-block', border: '1px solid rgba(255,255,255,0.12)' }}>Partner / Contact</a>
          </div>
        </div>
      </section>

      {
        showBlogForm ? (
          <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', zIndex: 80 }}>
            <div style={{ width: '90%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto', overflowX: 'hidden', background: '#fff', padding: 16, borderRadius: 8, position: 'relative' }}>
              {/* sticky header so close button remains visible while modal content scrolls */}
              <div style={{ position: 'sticky', top: 0, background: '#fff', paddingBottom: 12, marginBottom: 12, zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>{blogForm.id ? 'Edit Blog Post' : 'New Blog Post'}</h3>
                <button aria-label="Close modal" onClick={() => { setShowBlogForm(false); setBlogForm({ title: '', excerpt: '', content: '', category: '', image: '', imageFile: null }); }}
                  style={{ width: 32, height: 32, borderRadius: 16, border: '1px solid #ddd', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
                  ×
                </button>
              </div>
              <form onSubmit={submitBlog} style={{ display: 'grid', gap: 8 }}>
                <input placeholder='Title' value={blogForm.title} onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })} />
                <input placeholder='Category' value={blogForm.category} onChange={(e) => setBlogForm({ ...blogForm, category: e.target.value })} />
                <input type="file" accept="image/*" onChange={(e) => setBlogForm({ ...blogForm, imageFile: e.target.files?.[0] || null })} />
                {blogForm.image && !blogForm.imageFile ? <div style={{ marginTop: 8 }}><img src={blogForm.image} alt="blog" style={{ maxHeight: 120 }} /></div> : null}
                <input placeholder='Excerpt' value={blogForm.excerpt} onChange={(e) => setBlogForm({ ...blogForm, excerpt: e.target.value })} />
                <textarea placeholder='Content' rows={6} value={blogForm.content} onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type='submit'>Save</button>
                  <button type='button' onClick={() => setShowBlogForm(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        ) : null
      }
    </div >
  );
}


