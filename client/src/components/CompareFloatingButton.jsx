import React from 'react';
import { Link } from 'react-router-dom';
import { useCompare } from '../context/CompareContext';

const CompareFloatingButton = () => {
    const { comparedProducts } = useCompare();

    if (!comparedProducts || comparedProducts.length === 0) {
        return null;
    }

    return (
        <Link
            to="/compare"
            style={{
                position: 'fixed',
                bottom: 30,
                right: 30,
                backgroundColor: '#0b79d0',
                color: '#fff',
                padding: '12px 24px',
                borderRadius: '30px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                textDecoration: 'none',
                fontWeight: 'bold',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
            <span>⚖️</span>
            <span>Compare ({comparedProducts.length})</span>
        </Link>
    );
};

export default CompareFloatingButton;
