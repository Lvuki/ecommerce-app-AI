import React, { createContext, useContext, useState, useEffect } from 'react';

const CompareContext = createContext();

export const useCompare = () => useContext(CompareContext);

export const CompareProvider = ({ children }) => {
    const [comparedProducts, setComparedProducts] = useState(() => {
        try {
            const saved = localStorage.getItem('comparedProducts');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Failed to load compared products', error);
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('comparedProducts', JSON.stringify(comparedProducts));
        } catch (error) {
            console.error('Failed to save compared products', error);
        }
    }, [comparedProducts]);

    const addToCompare = (product) => {
        setComparedProducts((prev) => {
            if (prev.find((p) => p.id === product.id)) return prev;
            if (prev.length >= 4) {
                alert('You can compare up to 4 products at a time.');
                return prev;
            }
            return [...prev, product];
        });
    };

    const removeFromCompare = (productId) => {
        setComparedProducts((prev) => prev.filter((p) => p.id !== productId));
    };

    const isInCompare = (productId) => {
        return comparedProducts.some((p) => p.id === productId);
    };

    const clearCompare = () => {
        setComparedProducts([]);
    };

    return (
        <CompareContext.Provider value={{ comparedProducts, addToCompare, removeFromCompare, isInCompare, clearCompare }}>
            {children}
        </CompareContext.Provider>
    );
};
