import React, { createContext, useContext, useState, useEffect } from 'react';
import API_BASE_URL from '../config';

const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
    // active currency: 'ALL', 'EUR', 'USD'
    const [currency, setCurrency] = useState('ALL');
    // rates: { ALL: 1, EUR: 100, USD: 95 } (default fallback)
    const [rates, setRates] = useState({ ALL: 1, EUR: 100, USD: 95 });

    useEffect(() => {
        // load preference
        const saved = localStorage.getItem('shop_currency');
        if (saved) setCurrency(saved);

        // fetch rates
        const fetchRates = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/settings`);
                const data = await res.json();
                const newRates = { ALL: 1 };
                if (data.exchange_rate_eur) newRates.EUR = Number(data.exchange_rate_eur);
                if (data.exchange_rate_usd) newRates.USD = Number(data.exchange_rate_usd);

                // If rates are missing/invalid, keep defaults or at least ensure ALL=1
                setRates(prev => ({ ...prev, ...newRates }));
            } catch (err) {
                console.error('Failed to load currency rates', err);
            }
        };
        fetchRates();
    }, []);

    const changeCurrency = (curr) => {
        setCurrency(curr);
        localStorage.setItem('shop_currency', curr);
    };

    const formatPrice = (valueInAll) => {
        if (valueInAll === undefined || valueInAll === null) return '';
        const num = Number(valueInAll);
        if (isNaN(num)) return valueInAll;

        if (currency === 'ALL') {
            return num.toLocaleString('sq-AL') + ' L';
        }

        // Conversion: valueInAll / rate
        // e.g. 1000 ALL / 100 (Rate EUR) = 10 EUR
        const rate = rates[currency] || 1;
        const converted = num / rate;

        // Formatting
        const fmt = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        return fmt.format(converted);
    };

    return (
        <CurrencyContext.Provider value={{ currency, rates, changeCurrency, formatPrice }}>
            {children}
        </CurrencyContext.Provider>
    );
};

export const useCurrency = () => useContext(CurrencyContext);
