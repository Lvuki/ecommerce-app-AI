import React from 'react';
import '../styles/shkarko.css';
import { Link } from 'react-router-dom';

export default function ShkarkoAplikacionin() {
  return (
    <main className="shkarko-page">
      <section className="shkarko-hero">
        <div className="shkarko-inner">
          <h1>Shkarko aplikacionin tonë</h1>
          <p className="lead">Bëni blerjet më të lehta dhe përfitoni oferta ekskluzive direkt nga telefoni juaj.</p>
          <div className="shkarko-actions">
            <a className="btn btn-android" href="#" aria-label="Shkarko për Android (Play Store)">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden style={{display:'block'}}>
                <g>
                  <path fill="#00A0FF" d="M3.6 1.7L14.1 12.2 9.9 16.4 3.6 10.1z" />
                  <path fill="#34A853" d="M14.1 12.2L3.6 22.7 9.9 16.4 14.1 12.2z" />
                  <path fill="#FBBC05" d="M14.1 12.2L20.4 18.1 16.2 22.3 9.9 16.4z" />
                  <path fill="#EA4335" d="M20.4 5.3L14.1 12.2 20.4 18.1z" />
                </g>
              </svg>
              <span>Shkarko për Android</span>
            </a>
            <a className="btn btn-apple" href="#" aria-label="Shkarko për iPhone (App Store)">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden style={{display:'block'}}>
                <path fill="currentColor" d="M16.365 1.43c0 1.02-.4 2.01-1.05 2.75-.66.75-1.77 1.5-2.86 1.34-.17-1.08.31-2.2 1.04-2.88.72-.69 1.94-1.38 2.87-.61.12.11.1.4.1.4zM12 5.6c.95 0 2.06.64 2.72 1.45.8 1 1.2 2.66.52 4.12-.43.93-1.08 1.98-2.07 1.98-.85 0-1.08-.53-2.02-.53-.94 0-1.2.53-2.06.53-1 0-1.7-1.02-2.14-1.98C5.6 10.2 5.9 8 7.03 6.88 8.23 5.7 10.3 5.6 11.35 5.6c.6 0 1.05.08 1.65 0z" />
              </svg>
              <span>Shkarko për iPhone</span>
            </a>
          </div>
        </div>
      </section>

      <section className="shkarko-cards">
        <div className="card">
          <div className="card-left">
            <h3>Android (Google Play)</h3>
            <p>Shkarkoni aplikacionin për pajisjet Android dhe shijoni blaerjet e shpejta, njoftimet për oferta dhe pagesë të sigurtë.</p>
            <ul>
              <li>Shfletim i shpejtë i katalogut</li>
              <li>Njoftime për ofertat dhe zbritjet</li>
              <li>Pagesë e sigurtë dhe e shpejtë</li>
            </ul>
            <a className="store-link" href="#"><span className="sr-only">Hapni në Google Play</span></a>
          </div>
          <div className="card-right">
            <div className="qr-placeholder">QR</div>
            <small>Skano për të shkarkuar</small>
          </div>
        </div>

        <div className="card reverse">
          <div className="card-left">
            <h3>iPhone (App Store)</h3>
            <p>Shkarkoni për iPhone dhe përdorni funksionet tona ekskluzive për përdoruesit mobile.</p>
            <ul>
              <li>Ueb & aplikacion i sinkronizuar</li>
              <li>Ruajtja e preferencave dhe historikut</li>
              <li>Shërbim i shpejtë për klientët</li>
            </ul>
            <a className="store-link" href="#"><span className="sr-only">Hapni në App Store</span></a>
          </div>
          <div className="card-right">
            <div className="qr-placeholder">QR</div>
            <small>Skano për të shkarkuar</small>
          </div>
        </div>
      </section>

      <section className="shkarko-help">
        <h4>Probleme me shkarkimin?</h4>
        <p>Nëse hasni vështirësi, na kontaktoni në <Link to="/pages/contact">Faqja e Kontaktit</Link> ose dërgoni email në suport@shembull.com.</p>
      </section>
    </main>
  );
}
