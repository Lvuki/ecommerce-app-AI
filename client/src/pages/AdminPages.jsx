import React, { useEffect, useState } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, useDraggable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getToken } from '../services/authService';
import { getAllPagesAdmin, addPage, updatePage, deletePage } from '../services/pageService';
import { getCategories } from '../services/categoryService';

export default function AdminPages() {
  const [pages, setPages] = useState([]);
  const [form, setForm] = useState({ title: '', slug: '', type: 'custom', content: '', order: 0, visible: true });
  const [editId, setEditId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [productMode, setProductMode] = useState('category'); // category | offer | manual
  const [selectedCategory, setSelectedCategory] = useState('');
  const [manualProductIds, setManualProductIds] = useState('');
  const [sliderSlides, setSliderSlides] = useState([]);
  const [modules, setModules] = useState([]); // array of page modules (drag/drop)
  const sensors = useSensors(useSensor(PointerSensor));
  

  const load = async () => {
    try {
      const token = getToken();
      const data = await getAllPagesAdmin(token);
      setPages(data || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    (async () => {
      try {
        const cats = await getCategories();
        setCategories(cats || []);
      } catch (err) { console.error(err); }
    })();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const token = getToken();
      const payload = { ...form };
      if (payload.slug && typeof payload.slug === 'string') payload.slug = payload.slug.trim();

      // If modules have been used, store modules array in content
      if (modules && modules.length) {
        payload.content = modules;
      } else {
        // build structured content depending on type (backwards compat)
        if (payload.type === 'products') {
          if (productMode === 'category') {
            payload.content = { mode: 'category', category: selectedCategory };
          } else if (productMode === 'offer') {
            payload.content = { mode: 'offer' };
          } else {
            const ids = (manualProductIds || '').split(',').map(s => Number(s.trim())).filter(Boolean);
            payload.content = { mode: 'manual', items: ids };
          }
        } else if (payload.type === 'slider') {
          payload.content = sliderSlides.slice();
        } else {
          try { payload.content = JSON.parse(form.content); } catch (_) { payload.content = form.content; }
        }
      }

      if (editId) {
        await updatePage(editId, payload, token);
      } else {
        await addPage(payload, token);
      }

      setForm({ title: '', slug: '', type: 'custom', content: '', order: 0, visible: true });
      setEditId(null);
      setProductMode('category');
      setSelectedCategory('');
      setManualProductIds('');
      setSliderSlides([]);
      await load();
    } catch (err) { console.error(err); alert('Failed to save page'); }
  };

  const handleEdit = (p) => {
    setEditId(p.id);
    setForm({ title: p.title || '', slug: p.slug || '', type: p.type || 'custom', content: typeof p.content === 'object' ? JSON.stringify(p.content, null, 2) : (p.content || ''), order: p.order || 0, visible: !!p.visible });
    // if page content is modules array, initialize modules editor
    if (Array.isArray(p.content)) {
      setModules(p.content);
    } else {
      setModules([]);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this page?')) return;
    try { await deletePage(id, getToken()); await load(); } catch (err) { console.error(err); alert('Failed to delete'); }
  };

  // Sortable wrapper for dnd-kit; renders children and wires drag handlers
  function SortableModule({ id, children }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = {
      transform: transform ? CSS.Transform.toString(transform) : undefined,
      transition,
      boxShadow: isDragging ? '0 6px 18px rgba(0,0,0,0.08)' : undefined,
      position: 'relative'
    };
    // Attach drag listeners to a small handle so inner inputs/buttons/selects remain interactive
    const handleStyle = {
      position: 'absolute',
      left: 8,
      top: 8,
      width: 28,
      height: 28,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 4,
      background: isDragging ? '#e6f0ff' : 'transparent',
      cursor: 'grab',
      zIndex: 10,
    };
    return (
      <div ref={setNodeRef} style={style}>
        <div {...attributes} {...listeners} style={handleStyle} aria-hidden>
          <span style={{ fontSize: 14, lineHeight: 1 }}>≡</span>
        </div>
        {children}
      </div>
    );
  }

  // Palette draggable item (thumbnail + label). Drag from palette to insert new module.
  function PaletteItem({ type, label }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `palette-${type}` });
    const style = {
      display: 'flex',
      gap: 8,
      alignItems: 'center',
      padding: 8,
      borderRadius: 6,
      border: '1px solid #eee',
      background: isDragging ? '#eef6ff' : '#fff',
      cursor: 'grab'
    };
    const thumbStyle = { width: 48, height: 36, background: '#f4f6f8', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 };
    return (
      <div ref={setNodeRef} {...attributes} {...listeners} style={style}>
        <div style={thumbStyle}>{type.substring(0,3).toUpperCase()}</div>
        <div style={{ fontSize: 13 }}>{label}</div>
      </div>
    );
  }

  return (
    <div>
      <h2>Pages</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 360px', gap: 18 }}>
        {/* left: pages list */}
        <div>
          <div style={{ display: 'grid', gap: 8 }}>
            {pages.map(p => (
              <div key={p.id} style={{ padding: 12, border: '1px solid #eee', borderRadius: 8, background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{p.title}</div>
                  <div style={{ fontSize: 13, color: '#666' }}>/{p.slug} • {p.type} • {p.visible ? 'visible' : 'hidden'}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleEdit(p)}>Edit</button>
                  <button onClick={() => handleDelete(p.id)} style={{ color: 'red' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* center: modules editor (palette + modules list) */}
        <div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ width: 180, border: '1px dashed #eee', padding: 10, borderRadius: 6, background: '#fafafa' }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Modules</div>
              <div style={{ display: 'grid', gap: 8 }}>
                <div onClick={() => setModules(m => [...m, { type: 'slider', config: [] }])}>
                  <PaletteItem type="slider" label="Slider" />
                </div>
                <div onClick={() => setModules(m => [...m, { type: 'text', config: { text: '' } }])}>
                  <PaletteItem type="text" label="Text" />
                </div>
                <div onClick={() => setModules(m => [...m, { type: 'image', config: { url: '', alt: '' } }])}>
                  <PaletteItem type="image" label="Image" />
                </div>
                <div onClick={() => setModules(m => [...m, { type: 'products', config: { mode: 'category', categories: [], category: '', items: [], limit: 8 } }])}>
                  <PaletteItem type="products" label="Products" />
                </div>
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Page layout</div>
              <div style={{ display: 'grid', gap: 8 }}>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => {
                  const { active, over } = e;
                  if (!over) return;
                  // dragging from palette into modules
                  if (String(active.id).startsWith('palette-')) {
                    const type = String(active.id).replace(/^palette-/, '');
                    // insertion index: if over is a module id, insert at that index; otherwise append
                    const insertAt = String(over.id).startsWith('module-') ? Number(String(over.id).replace(/^module-/, '')) : modules.length;
                    const makeModule = (t) => {
                      if (t === 'slider') return { type: 'slider', config: [] };
                      if (t === 'text') return { type: 'text', config: { text: '' } };
                      if (t === 'image') return { type: 'image', config: { url: '', alt: '' } };
                      if (t === 'products') return { type: 'products', config: { mode: 'category', categories: [], category: '', items: [], limit: 8 } };
                      return { type: t, config: {} };
                    };
                    const newMod = makeModule(type);
                    setModules(ms => {
                      const a = Array.from(ms || []);
                      a.splice(insertAt, 0, newMod);
                      return a;
                    });
                    return;
                  }
                  // reorder existing modules
                  if (String(active.id).startsWith('module-') && String(over.id).startsWith('module-')) {
                    const idxFrom = Number(String(active.id).replace(/^module-/, ''));
                    const idxTo = Number(String(over.id).replace(/^module-/, ''));
                    setModules(ms => arrayMove(ms, idxFrom, idxTo));
                  }
                }}>
                  <SortableContext items={modules.map((_,i)=>`module-${i}`)} strategy={verticalListSortingStrategy}>
                    {modules.map((mod, idx) => {
                      const id = `module-${idx}`;
                      return (
                        <SortableModule key={id} id={id} idx={idx}>
                          <div style={{ border: '1px solid #eee', padding: 10, borderRadius: 6, background: '#fff', marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ fontWeight: 700 }}>{idx + 1}. {mod.type}</div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button type="button" onClick={() => setModules(ms => ms.filter((_,i) => i!==idx))} style={{ color: 'red' }}>Delete</button>
                              </div>
                            </div>
                            <div style={{ marginTop: 8 }}>
                              {mod.type === 'text' ? (
                                <textarea rows={4} value={mod.config.text || ''} onChange={(e) => setModules(ms => ms.map((m,i) => i===idx ? { ...m, config: { ...m.config, text: e.target.value } } : m))} />
                              ) : mod.type === 'image' ? (
                                <div style={{ display: 'grid', gap: 6 }}>
                                  <input placeholder="Image URL" value={mod.config.url || ''} onChange={(e) => setModules(ms => ms.map((m,i) => i===idx ? { ...m, config: { ...m.config, url: e.target.value } } : m))} />
                                  <input placeholder="Alt text" value={mod.config.alt || ''} onChange={(e) => setModules(ms => ms.map((m,i) => i===idx ? { ...m, config: { ...m.config, alt: e.target.value } } : m))} />
                                </div>
                              ) : mod.type === 'slider' ? (
                                <div>
                                  {(mod.config || []).map((s,si) => (
                                    <div key={si} style={{ display: 'grid', gap: 6, marginBottom: 6 }}>
                                      <input placeholder="Image URL" value={s.image || ''} onChange={(e) => setModules(ms => ms.map((m,i) => i===idx ? { ...m, config: m.config.map((it,ii) => ii===si ? { ...it, image: e.target.value } : it) } : m))} />
                                      <input placeholder="Title" value={s.title || ''} onChange={(e) => setModules(ms => ms.map((m,i) => i===idx ? { ...m, config: m.config.map((it,ii) => ii===si ? { ...it, title: e.target.value } : it) } : m))} />
                                      <input placeholder="Link (optional)" value={s.link || ''} onChange={(e) => setModules(ms => ms.map((m,i) => i===idx ? { ...m, config: m.config.map((it,ii) => ii===si ? { ...it, link: e.target.value } : it) } : m))} />
                                      <div style={{ display: 'flex', gap: 8 }}>
                                        <button type="button" onClick={() => setModules(ms => ms.map((m,i) => i===idx ? { ...m, config: m.config.filter((_,ii) => ii!==si) } : m))}>Remove slide</button>
                                      </div>
                                    </div>
                                  ))}
                                  <button type="button" onClick={() => setModules(ms => ms.map((m,i) => i===idx ? { ...m, config: [ ...(m.config||[]), { image: '', title: '', link: '' } ] } : m))}>Add slide</button>
                                </div>
                              ) : mod.type === 'products' ? (
                                <div>
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    <label><input type="radio" checked={mod.config.mode === 'category'} onChange={() => setModules(ms => ms.map((m,i) => i===idx ? { ...m, config: { ...m.config, mode: 'category' } } : m))} /> By category</label>
                                    <label><input type="radio" checked={mod.config.mode === 'offer'} onChange={() => setModules(ms => ms.map((m,i) => i===idx ? { ...m, config: { ...m.config, mode: 'offer' } } : m))} /> Offers</label>
                                    <label><input type="radio" checked={mod.config.mode === 'manual'} onChange={() => setModules(ms => ms.map((m,i) => i===idx ? { ...m, config: { ...m.config, mode: 'manual' } } : m))} /> Manual</label>
                                  </div>
                                  {mod.config.mode === 'category' ? (
                                    <div style={{ display: 'grid', gap: 6 }}>
                                      <label style={{ fontSize: 13 }}>Select categories (multiple)</label>
                                      <select multiple value={mod.config.categories || []} onChange={(e) => {
                                        const opts = Array.from(e.target.selectedOptions || []).map(o => o.value);
                                        setModules(ms => ms.map((m,i) => i===idx ? { ...m, config: { ...m.config, categories: opts } } : m));
                                      }} style={{ minHeight: 100 }}>
                                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                      </select>
                                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <label style={{ fontSize: 13 }}>Limit</label>
                                        <input type="number" value={mod.config.limit ?? 8} onChange={(e) => setModules(ms => ms.map((m,i) => i===idx ? { ...m, config: { ...m.config, limit: Number(e.target.value || 0) } } : m))} style={{ width: 100 }} />
                                      </div>
                                    </div>
                                  ) : mod.config.mode === 'manual' ? (
                                    <div style={{ display: 'grid', gap: 6 }}>
                                      <input placeholder="Product IDs (comma separated)" value={(mod.config.items || []).join(',')} onChange={(e) => setModules(ms => ms.map((m,i) => i===idx ? { ...m, config: { ...m.config, items: (e.target.value||'').split(',').map(s=>Number(s.trim())).filter(Boolean) } } : m))} />
                                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <label style={{ fontSize: 13 }}>Limit</label>
                                        <input type="number" value={mod.config.limit ?? 8} onChange={(e) => setModules(ms => ms.map((m,i) => i===idx ? { ...m, config: { ...m.config, limit: Number(e.target.value || 0) } } : m))} style={{ width: 100 }} />
                                      </div>
                                    </div>
                                  ) : (
                                    <div style={{ display: 'grid', gap: 6 }}>
                                      <div style={{ color: '#666' }}>Shows active offers</div>
                                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <label style={{ fontSize: 13 }}>Limit</label>
                                        <input type="number" value={mod.config.limit ?? 8} onChange={(e) => setModules(ms => ms.map((m,i) => i===idx ? { ...m, config: { ...m.config, limit: Number(e.target.value || 0) } } : m))} style={{ width: 100 }} />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </SortableModule>
                      );
                    })}
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          </div>
        </div>
        {/* right: page basic meta and save */}
        <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 8, background: '#fff' }}>
          <h3 style={{ marginTop: 0 }}>{editId ? 'Edit page' : 'Add page'}</h3>
          <form onSubmit={handleSave} style={{ display: 'grid', gap: 8 }}>
            <input placeholder="Title" value={form.title} required onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input placeholder="Slug (url-friendly) e.g. about-us" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="custom">Custom</option>
              <option value="products">Products</option>
              <option value="blogs">Blogs</option>
              <option value="slider">Slider</option>
            </select>
            <label style={{ fontSize: 13, color: '#444' }}>Content (JSON or free text)
              <textarea rows={6} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value || 0) })} style={{ width: 120 }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={form.visible} onChange={(e) => setForm({ ...form, visible: e.target.checked })} /> Visible</label>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit">Save</button>
              <button type="button" onClick={() => { setEditId(null); setForm({ title: '', slug: '', type: 'custom', content: '', order: 0, visible: true }); setModules([]); }}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
