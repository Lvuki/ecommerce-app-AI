import React from 'react';
import { useCompare } from '../context/CompareContext';
import { Link } from 'react-router-dom';
import { priceInfo } from '../utils/priceUtils';

export default function ComparePage() {
    const { comparedProducts, removeFromCompare } = useCompare();

    if (comparedProducts.length === 0) {
        return (
            <div className="page-container" style={{ textAlign: 'center', padding: '40px 20px' }}>
                <h2>Compare Products</h2>
                <p>No products selected for comparison.</p>
                <Link to="/products" style={{ display: 'inline-block', marginTop: 20, padding: '10px 20px', background: '#0b79d0', color: '#fff', textDecoration: 'none', borderRadius: 6 }}>
                    Browse Products
                </Link>
            </div>
        );
    }

    const renderSpecs = (specs) => {
        let obj = specs;
        if (typeof specs === 'string') {
            try { obj = JSON.parse(specs); } catch (_) { }
        }
        if (!obj) return <div style={{ color: '#999' }}>—</div>;
        if (typeof obj === 'string') return <div>{obj}</div>;
        return (
            <ul style={{ margin: 0, paddingLeft: 14, textAlign: 'left' }}>
                {Object.entries(obj).map(([k, v]) => (
                    <li key={k} style={{ fontSize: 13 }}><strong>{k}:</strong> {String(v)}</li>
                ))}
            </ul>
        );
    };

    return (
        <div className="page-container">
            <h2 style={{ marginBottom: 24 }}>Compare Products</h2>
            <div className="table-responsive" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800, tableLayout: 'fixed' }}>
                    <thead>
                        <tr>
                            <th style={{ width: 150, padding: 12, background: '#f9f9f9', borderBottom: '1px solid #eee' }}>Feature</th>
                            {comparedProducts.map((p) => (
                                <th key={p.id} style={{ padding: 12, borderBottom: '1px solid #eee', verticalAlign: 'top', position: 'relative' }}>
                                    <button
                                        onClick={() => removeFromCompare(p.id)}
                                        style={{ position: 'absolute', top: 5, right: 5, background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#999' }}
                                        title="Remove"
                                    >
                                        ×
                                    </button>
                                    <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                                        <img
                                            src={(p.images && p.images.length ? (p.images[0].startsWith('http') ? p.images[0] : `http://localhost:4000${p.images[0]}`) : (p.image && p.image.startsWith('http') ? p.image : `http://localhost:4000${p.image}`))}
                                            alt={p.name}
                                            style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                                        />
                                    </div>
                                    <Link to={`/products/${p.id}`} style={{ color: '#333', textDecoration: 'none', fontSize: 16 }}>
                                        {p.name}
                                    </Link>
                                </th>
                            ))}
                            {comparedProducts.length < 4 && (
                                <th style={{ padding: 12, borderBottom: '1px solid #eee', verticalAlign: 'middle', textAlign: 'center' }}>
                                    <Link to="/products" style={{ display: 'inline-block', padding: '10px 14px', background: '#f0f0f0', color: '#333', borderRadius: 6, textDecoration: 'none', fontSize: 14 }}>
                                        + Add Product
                                    </Link>
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style={{ padding: 12, fontWeight: 700, borderBottom: '1px solid #eee' }}>Price</td>
                            {comparedProducts.map((p) => {
                                const info = priceInfo(p);
                                return (
                                    <td key={p.id} style={{ padding: 12, borderBottom: '1px solid #eee', textAlign: 'center' }}>
                                        <div style={{ fontWeight: 700, color: info.isOffer || info.isSale ? '#d32' : '#111' }}>
                                            ${Number(info.display).toFixed(2)}
                                        </div>
                                    </td>
                                );
                            })}
                            {comparedProducts.length < 4 && <td style={{ borderBottom: '1px solid #eee' }}></td>}
                        </tr>
                        <tr>
                            <td style={{ padding: 12, fontWeight: 700, borderBottom: '1px solid #eee' }}>Brand</td>
                            {comparedProducts.map((p) => (
                                <td key={p.id} style={{ padding: 12, borderBottom: '1px solid #eee', textAlign: 'center' }}>
                                    {p.brand || '—'}
                                </td>
                            ))}
                            {comparedProducts.length < 4 && <td style={{ borderBottom: '1px solid #eee' }}></td>}
                        </tr>
                        <tr>
                            <td style={{ padding: 12, fontWeight: 700, borderBottom: '1px solid #eee' }}>Category</td>
                            {comparedProducts.map((p) => (
                                <td key={p.id} style={{ padding: 12, borderBottom: '1px solid #eee', textAlign: 'center' }}>
                                    {p.category || '—'}
                                </td>
                            ))}
                            {comparedProducts.length < 4 && <td style={{ borderBottom: '1px solid #eee' }}></td>}
                        </tr>
                        <tr>
                            <td style={{ padding: 12, fontWeight: 700, borderBottom: '1px solid #eee' }}>Stock</td>
                            {comparedProducts.map((p) => (
                                <td key={p.id} style={{ padding: 12, borderBottom: '1px solid #eee', textAlign: 'center' }}>
                                    {p.stock ?? '—'}
                                </td>
                            ))}
                            {comparedProducts.length < 4 && <td style={{ borderBottom: '1px solid #eee' }}></td>}
                        </tr>
                        <tr>
                            <td style={{ padding: 12, fontWeight: 700, borderBottom: '1px solid #eee', verticalAlign: 'top' }}>Specifications</td>
                            {comparedProducts.map((p) => (
                                <td key={p.id} style={{ padding: 12, borderBottom: '1px solid #eee', verticalAlign: 'top' }}>
                                    {renderSpecs(p.specs)}
                                </td>
                            ))}
                            {comparedProducts.length < 4 && <td style={{ borderBottom: '1px solid #eee' }}></td>}
                        </tr>
                        <tr>
                            <td style={{ padding: 12, borderBottom: '1px solid #eee' }}></td>
                            {comparedProducts.map((p) => (
                                <td key={p.id} style={{ padding: 12, borderBottom: '1px solid #eee', textAlign: 'center' }}>
                                    <button
                                        onClick={() => window.location.href = `/products/${p.id}`}
                                        style={{ padding: '8px 16px', background: '#0b79d0', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                                    >
                                        View Details
                                    </button>
                                </td>
                            ))}
                            {comparedProducts.length < 4 && <td style={{ borderBottom: '1px solid #eee' }}></td>}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
