import React, { useEffect, useState, useRef } from 'react';
import { DndContext, rectIntersection, PointerSensor, MouseSensor, TouchSensor, useSensor, useSensors, useDraggable, DragOverlay, useDroppable } from '@dnd-kit/core';
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
  // debug state removed
  const modulesNodeRef = useRef(null);
  const isDraggingRef = useRef(false);
  const [insertionTop, setInsertionTop] = useState(null);
  const [insertionIndex, setInsertionIndex] = useState(null);

  // pointer move handler used during drag to compute insertion position
  function handlePointerMove(e) {
    if (!isDraggingRef.current) return;
    const x = e.clientX; const y = e.clientY;
    if (!modulesNodeRef.current) return;
    const containerRect = modulesNodeRef.current.getBoundingClientRect();
    // if pointer is outside the container, hide marker
    if (x < containerRect.left || x > containerRect.right || y < containerRect.top || y > containerRect.bottom) {
      setInsertionTop(null);
      setInsertionIndex(null);
      return;
    }
    const items = Array.from(modulesNodeRef.current.querySelectorAll('.module-row'));
    if (items.length === 0) {
      // place marker near top inside container
      const top = 8;
      setInsertionTop(top);
      setInsertionIndex(0);
      return;
    }
    // find the first item whose midpoint is below the pointer -> insert before it
    let found = false;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const r = it.getBoundingClientRect();
      const mid = (r.top + r.bottom) / 2;
      if (y < mid) {
        const top = r.top - containerRect.top;
        setInsertionTop(top);
        setInsertionIndex(i);
        found = true;
        break;
      }
    }
    if (!found) {
      const last = items[items.length - 1].getBoundingClientRect();
      const top = last.bottom - containerRect.top;
      setInsertionTop(top);
      setInsertionIndex(items.length);
    }
  }
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(MouseSensor),
    useSensor(TouchSensor)
  );
  const [activeId, setActiveId] = useState(null);
  const activeType = activeId && String(activeId).startsWith('palette-') ? String(activeId).replace(/^palette-/, '') : null;
  // stable id generator for modules
  const createId = () => `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
  const createModule = (t) => {
    if (t === 'slider') return { id: createId(), type: 'slider', config: [] };
    if (t === 'text') return { id: createId(), type: 'text', config: { text: '' } };
    if (t === 'image') return { id: createId(), type: 'image', config: { url: '', alt: '' } };
    if (t === 'products') return { id: createId(), type: 'products', config: { mode: 'category', categories: [], category: '', items: [], limit: 8 } };
    if (t === 'blogs') return { id: createId(), type: 'blogs', config: { mode: 'category', categories: [], category: '', items: [], limit: 8 } };
    return { id: createId(), type: t, config: {} };
  };
  const { isOver: isModulesOver, setNodeRef: setModulesRef } = useDroppable({ id: 'modules-container' });
  

  const load = async () => {
    try {
      const token = getToken();
      const data = await getAllPagesAdmin(token);
      // guard against unexpected API responses (could be an error object)
      if (Array.isArray(data)) {
        setPages(data);
      } else if (data && Array.isArray(data.pages)) {
        setPages(data.pages);
      } else {
        console.warn('Unexpected pages response, expected array but got:', data);
        setPages([]);
      }
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
      // ensure each module has a stable id
      setModules(p.content.map(m => m && m.id ? m : { ...(m||{}), id: createId() }));
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

  // Local editable textarea that avoids committing on every keystroke to prevent
  // caret loss from frequent parent re-renders. Commits on blur or Ctrl+Enter.
  function TextEditor({ value, onCommit }) {
    const [local, setLocal] = React.useState(value || '');
    React.useEffect(() => { setLocal(value || ''); }, [value]);
    return (
      <textarea
        rows={6}
        style={{ width: '100%', minHeight: 120, resize: 'vertical' }}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => onCommit(local)}
        onKeyDown={(e) => {
          // commit on Ctrl+Enter
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            onCommit(local);
          }
        }}
        onPointerDown={(e) => e.stopPropagation()}
      />
    );
  }

  // Generic local-input that buffers edits locally and only commits on blur or Ctrl+Enter
  function LocalInput({ value, onCommit, placeholder, style, type = 'text' }) {
    const [local, setLocal] = useState(value ?? '');
    useEffect(() => { setLocal(value ?? ''); }, [value]);
    return (
      <input
        type={type}
        placeholder={placeholder}
        value={local}
        style={style}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => onCommit(local)}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onCommit(local); }}
        onPointerDown={(e) => e.stopPropagation()}
      />
    );
  }

  function LocalNumberInput({ value, onCommit, placeholder, style }) {
    const [local, setLocal] = useState(value ?? '');
    useEffect(() => { setLocal(value ?? ''); }, [value]);
    return (
      <input
        type="number"
        placeholder={placeholder}
        value={local}
        style={style}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => onCommit(Number(local || 0))}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onCommit(Number(local || 0)); }}
        onPointerDown={(e) => e.stopPropagation()}
      />
    );
  }

  function LocalSelectMultiple({ value, options, onCommit, style }) {
    const [local, setLocal] = useState(Array.isArray(value) ? value.slice() : []);
    useEffect(() => { setLocal(Array.isArray(value) ? value.slice() : []); }, [value]);
    return (
      <select multiple value={local} style={style}
        onChange={(e) => setLocal(Array.from(e.target.selectedOptions || []).map(o => o.value))}
        onBlur={() => onCommit(local)}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    );
  }

  // Slide editor for slider modules: buffers slide fields locally and commits per-field
  function SlideEditor({ slide, onCommit, onRemove }) {
    const [local, setLocal] = useState(slide || { image: '', title: '', link: '' });
    useEffect(() => { setLocal(slide || { image: '', title: '', link: '' }); }, [slide]);
    const commitField = (patch) => {
      const next = { ...local, ...patch };
      setLocal(next);
      onCommit && onCommit(next);
    };
    return (
      <div style={{ display: 'grid', gap: 6, marginBottom: 6 }}>
        <LocalInput placeholder="Image URL" value={local.image} onCommit={(v) => commitField({ image: v })} />
        <LocalInput placeholder="Title" value={local.title} onCommit={(v) => commitField({ title: v })} />
        <LocalInput placeholder="Link (optional)" value={local.link} onCommit={(v) => commitField({ link: v })} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={onRemove}>Remove slide</button>
        </div>
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
          <DndContext sensors={sensors} collisionDetection={rectIntersection}
            onDragStart={(e) => {
              setActiveId(e.active?.id ?? null);
              // attach pointermove listener for visual insertion guidance
              isDraggingRef.current = true;
              window.addEventListener('pointermove', handlePointerMove);
            }}
            onDragMove={() => { /* no-op for now */ }}
            onDragEnd={(e) => {
              const { active, over } = e;
              // detach pointermove listener
              isDraggingRef.current = false;
              window.removeEventListener('pointermove', handlePointerMove);
              // Some collision detection setups return null for `over` when dropping into
              // an empty droppable area. Fall back to the droppable's isOver state.
              const overIdRaw = over?.id ?? (isModulesOver ? 'modules-container' : null);
              // If we don't have an `over` target from the event, try the insertionIndex we computed
              // from pointermove as a fallback.
              let resolvedOverId = overIdRaw;
              if (!resolvedOverId && insertionIndex !== null) {
                // treat insertion into the empty container as modules-container
                resolvedOverId = 'modules-container';
              }
              if (!resolvedOverId) { setActiveId(null); return; }
              const overIdStr = String(resolvedOverId);
              // dragging from palette into modules
              if (String(active.id).startsWith('palette-')) {
                const type = String(active.id).replace(/^palette-/, '');
                let insertAt = modules.length;
                if (overIdStr.startsWith('module-')) {
                  const overId = overIdStr.replace(/^module-/, '');
                  const idx = modules.findIndex(m => m.id === overId);
                  insertAt = idx >= 0 ? idx : modules.length;
                } else if (overIdStr === 'modules-container') {
                  // use insertionIndex if available
                  insertAt = insertionIndex !== null ? insertionIndex : modules.length;
                }
                // clear marker before DOM changes to avoid visual overlap
                setInsertionTop(null);
                setInsertionIndex(null);
                const newMod = createModule(type);
                setModules(ms => {
                  const a = Array.from(ms || []);
                  a.splice(insertAt, 0, newMod);
                  return a;
                });
                setActiveId(null);
                return;
              }
              // reorder existing modules
              if (String(active.id).startsWith('module-')) {
                const fromId = String(active.id).replace(/^module-/, '');
                const idxFrom = modules.findIndex(m => m.id === fromId);
                if (insertionIndex !== null && idxFrom >= 0) {
                  // perform reorder using splice so insertionIndex (which is a position between items)
                  // maps correctly. Adjust index if removing an earlier item.
                  // clear marker before DOM changes
                  const ins = insertionIndex;
                  setInsertionTop(null);
                  setInsertionIndex(null);
                  setModules(ms => {
                    const a = Array.from(ms || []);
                    const item = a.splice(idxFrom, 1)[0];
                    let insertAtIdx = ins;
                    if (insertAtIdx > idxFrom) insertAtIdx = insertAtIdx - 1;
                    if (insertAtIdx < 0) insertAtIdx = 0;
                    if (insertAtIdx > a.length) insertAtIdx = a.length;
                    a.splice(insertAtIdx, 0, item);
                    return a;
                  });
                } else if (overIdStr.startsWith('module-')) {
                  const toId = overIdStr.replace(/^module-/, '');
                  const idxTo = modules.findIndex(m => m.id === toId);
                  if (idxFrom >= 0 && idxTo >= 0) setModules(ms => arrayMove(ms, idxFrom, idxTo));
                }
              }
              setActiveId(null);
              // ensure marker cleared
              setInsertionTop(null);
              setInsertionIndex(null);
            }}
            onDragCancel={() => setActiveId(null)}
          >
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ width: 180, border: '1px dashed #eee', padding: 10, borderRadius: 6, background: '#fafafa' }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Modules</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  <div onClick={() => setModules(m => [...m, createModule('slider')])}>
                    <PaletteItem type="slider" label="Slider" />
                  </div>
                  <div onClick={() => setModules(m => [...m, createModule('text')])}>
                    <PaletteItem type="text" label="Text" />
                  </div>
                  <div onClick={() => setModules(m => [...m, createModule('image')])}>
                    <PaletteItem type="image" label="Image" />
                  </div>
                  <div onClick={() => setModules(m => [...m, createModule('products')])}>
                    <PaletteItem type="products" label="Products" />
                  </div>
                  <div onClick={() => setModules(m => [...m, createModule('blogs')])}>
                    <PaletteItem type="blogs" label="Blogs" />
                  </div>
                </div>
              </div>

              <div style={{ flex: 1, position: 'relative' }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Page layout</div>
                <div style={{ display: 'grid', gap: 8, minHeight: 120, border: isModulesOver ? '2px dashed #70a1ff' : undefined, padding: isModulesOver ? 8 : undefined, position: 'relative' }} ref={(node) => { setModulesRef(node); modulesNodeRef.current = node; }} id="modules-container">
                  <SortableContext items={modules.map(m=>`module-${m.id}`)} strategy={verticalListSortingStrategy}>
                    {modules.map((mod, idx) => {
                      const id = `module-${mod.id}`;
                      return (
                        <SortableModule key={id} id={id} idx={idx}>
                          <div className="module-row" style={{ border: '1px solid #eee', padding: 10, borderRadius: 6, background: '#fff', marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ fontWeight: 700 }}>{idx + 1}. {mod.type}</div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button type="button" onClick={() => setModules(ms => ms.filter((_,i) => i!==idx))} style={{ color: 'red' }}>Delete</button>
                              </div>
                            </div>
                            <div style={{ marginTop: 8 }}>
                              {mod.type === 'text' ? (
                                <TextEditor
                                  value={mod.config.text || ''}
                                  onCommit={(val) => setModules(ms => ms.map((m,i) => i===idx ? { ...m, config: { ...m.config, text: val } } : m))}
                                />
                              ) : mod.type === 'image' ? (
                                <div style={{ display: 'grid', gap: 6 }}>
                                  <LocalInput placeholder="Image URL" value={mod.config.url || ''} onCommit={(v) => setModules(ms => ms.map((m,i) => i===idx ? { ...m, config: { ...m.config, url: v } } : m))} />
                                  <LocalInput placeholder="Alt text" value={mod.config.alt || ''} onCommit={(v) => setModules(ms => ms.map((m,i) => i===idx ? { ...m, config: { ...m.config, alt: v } } : m))} />
                                </div>
                              ) : mod.type === 'slider' ? (
                                <div>
                                  {(mod.config || []).map((s,si) => (
                                    <div key={si} style={{ display: 'grid', gap: 6, marginBottom: 6 }}>
                                      <SlideEditor
                                        slide={s}
                                        onCommit={(updated) => setModules(ms => ms.map((m,i) => i===idx ? { ...m, config: m.config.map((it,ii) => ii===si ? updated : it) } : m))}
                                        onRemove={() => setModules(ms => ms.map((m,i) => i===idx ? { ...m, config: m.config.filter((_,ii) => ii!==si) } : m))}
                                      />
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
                                      <LocalSelectMultiple
                                        value={mod.config.categories || []}
                                        options={categories.map(c => ({ value: c.name, label: c.name }))}
                                        onCommit={(opts) => setModules(ms => ms.map((m,i) => i===idx ? { ...m, config: { ...m.config, categories: opts } } : m))}
                                        style={{ minHeight: 100 }}
                                      />
                                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <label style={{ fontSize: 13 }}>Limit</label>
                                        <LocalNumberInput value={mod.config.limit ?? 8} onCommit={(v) => setModules(ms => ms.map((m,i) => i===idx ? { ...m, config: { ...m.config, limit: v } } : m))} style={{ width: 100 }} />
                                      </div>
                                    </div>
                                  ) : mod.config.mode === 'manual' ? (
                                    <div style={{ display: 'grid', gap: 6 }}>
                                      <LocalInput
                                        placeholder="Product IDs (comma separated)"
                                        value={(mod.config.items || []).join(',')}
                                        onCommit={(v) => {
                                          const items = (v || '').split(',').map(s => Number(s.trim())).filter(Boolean);
                                          setModules(ms => ms.map((m,i) => i===idx ? { ...m, config: { ...m.config, items } } : m));
                                        }}
                                      />
                                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <label style={{ fontSize: 13 }}>Limit</label>
                                        <LocalNumberInput value={mod.config.limit ?? 8} onCommit={(v) => setModules(ms => ms.map((m,i) => i===idx ? { ...m, config: { ...m.config, limit: v } } : m))} style={{ width: 100 }} />
                                      </div>
                                    </div>
                                  ) : (
                                    <div style={{ display: 'grid', gap: 6 }}>
                                      <div style={{ color: '#666' }}>Shows active offers</div>
                                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <label style={{ fontSize: 13 }}>Limit</label>
                                        <LocalNumberInput value={mod.config.limit ?? 8} onCommit={(v) => setModules(ms => ms.map((m,i) => i===idx ? { ...m, config: { ...m.config, limit: v } } : m))} style={{ width: 100 }} />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : null}
                              {mod.type === 'blogs' ? (
                                <div>
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    <label><input type="radio" checked={mod.config.mode === 'category'} onChange={() => setModules(ms => ms.map((m,i) => i===idx ? { ...m, config: { ...m.config, mode: 'category' } } : m))} /> By category</label>
                                    <label><input type="radio" checked={mod.config.mode === 'offer'} onChange={() => setModules(ms => ms.map((m,i) => i===idx ? { ...m, config: { ...m.config, mode: 'offer' } } : m))} /> Offers</label>
                                    <label><input type="radio" checked={mod.config.mode === 'manual'} onChange={() => setModules(ms => ms.map((m,i) => i===idx ? { ...m, config: { ...m.config, mode: 'manual' } } : m))} /> Manual</label>
                                  </div>
                                  {mod.config.mode === 'category' ? (
                                    <div style={{ display: 'grid', gap: 6 }}>
                                      <label style={{ fontSize: 13 }}>Select categories (multiple)</label>
                                      <LocalSelectMultiple
                                        value={mod.config.categories || []}
                                        options={categories.map(c => ({ value: c.name, label: c.name }))}
                                        onCommit={(opts) => setModules(ms => ms.map((m,i) => i===idx ? { ...m, config: { ...m.config, categories: opts } } : m))}
                                        style={{ minHeight: 100 }}
                                      />
                                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <label style={{ fontSize: 13 }}>Limit</label>
                                        <LocalNumberInput value={mod.config.limit ?? 8} onCommit={(v) => setModules(ms => ms.map((m,i) => i===idx ? { ...m, config: { ...m.config, limit: v } } : m))} style={{ width: 100 }} />
                                      </div>
                                    </div>
                                  ) : mod.config.mode === 'manual' ? (
                                    <div style={{ display: 'grid', gap: 6 }}>
                                      <LocalInput
                                        placeholder="Blog IDs (comma separated)"
                                        value={(mod.config.items || []).join(',')}
                                        onCommit={(v) => {
                                          const items = (v || '').split(',').map(s => Number(s.trim())).filter(Boolean);
                                          setModules(ms => ms.map((m,i) => i===idx ? { ...m, config: { ...m.config, items } } : m));
                                        }}
                                      />
                                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <label style={{ fontSize: 13 }}>Limit</label>
                                        <LocalNumberInput value={mod.config.limit ?? 8} onCommit={(v) => setModules(ms => ms.map((m,i) => i===idx ? { ...m, config: { ...m.config, limit: v } } : m))} style={{ width: 100 }} />
                                      </div>
                                    </div>
                                  ) : (
                                    <div style={{ display: 'grid', gap: 6 }}>
                                      <div style={{ color: '#666' }}>Shows active offers</div>
                                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <label style={{ fontSize: 13 }}>Limit</label>
                                        <LocalNumberInput value={mod.config.limit ?? 8} onCommit={(v) => setModules(ms => ms.map((m,i) => i===idx ? { ...m, config: { ...m.config, limit: v } } : m))} style={{ width: 100 }} />
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
                  {/* insertion marker */}
                  {insertionTop !== null && (
                    <div style={{ position: 'absolute', left: 8, right: 8, top: insertionTop, height: 4, background: '#0b74ff', borderRadius: 2, zIndex: 40, pointerEvents: 'none' }} />
                  )}
                  <DragOverlay>
                    {activeType ? (
                      <div style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd', background: '#fff', display: 'flex', gap: 8, alignItems: 'center', boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
                        <div style={{ width: 64, height: 44, background: '#f4f6f8', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{activeType.substring(0,3).toUpperCase()}</div>
                        <div style={{ fontWeight: 700 }}>{activeType.charAt(0).toUpperCase() + activeType.slice(1)}</div>
                      </div>
                    ) : null}
                  </DragOverlay>
                </div>
              {/* debug badge removed */}
              </div>
            </div>
          </DndContext>
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
