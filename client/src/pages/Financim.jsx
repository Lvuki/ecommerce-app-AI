import React from 'react';
import '../styles/finance.css';

export default function Financim(){
  return (
    <main className="finance-page">
      <div className="container">
        <h1 className="page-title">Bli me Këste</h1>

        <p className="lead">Bli me këste në të gjithë rrjetin e dyqaneve Globe! Tashmë nuk keni pse prisni më shumë, zbuloni se cila është mundësia më e mirë për ju dhe blini me këste produktin që dëshironi!</p>

        <section className="finance-section">
          <h2>Pagesë me këste me OTP Bank</h2>
          <p className="intro">Dokumentacioni i nevojshëm për OTP Bank që sjell klienti:</p>
          <div className="grid">
            <div className="card">
              <h3>Paga në OTP Bank</h3>
              <ul>
                <li>Dokument identifikimi i vlefshëm (pasaporte ose kartë identiteti)</li>
              </ul>
            </div>

            <div className="card">
              <h3>Paga në bankat e tjera</h3>
              <ul>
                <li>Dokument identifikimi i vlefshëm (pasaporte ose kartë identiteti)</li>
                <li>Vërtetim i pagesës mujore të sigurimeve i shkarkuar nga portali e-Albania / lëvizje llogarie për 6 muajt e fundit</li>
                <li>Vërtetim page nga punëdhënësi</li>
              </ul>
            </div>

            <div className="card">
              <h3>Të ardhura nga biznesi</h3>
              <ul>
                <li>Dokument identifikimi i vlefshëm (pasaporte ose kartë identiteti)</li>
                <li>Ekstrakt për aktivitetin tregtar nga QKB - Deklarimi i pasqyrave financiare - Pagesa e taksave për vitin e fundit</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="finance-section">
          <h2>Pagesë me këste me Raiffeisen Bank</h2>
          <p className="intro">Ju mund të aplikoni në Qendrën Globe në Rr. Kavajës nëpërmjet RAIFFEISEN BANK nga e Hëna në të Shtunë, ora 10:30 - 17:30</p>

          <div className="card">
            <h3>Dokumentacioni i nevojshëm për Raiffeisen Bank</h3>
            <ol>
              <li>
                <strong>Pagamarrës në Raiffeisen Bank</strong> (minimumi 3 muaj punë - privat, 1 muaj publik):
                <ul>
                  <li>ID ose Pashaportë Biometrike</li>
                </ul>
              </li>
              <li>
                <strong>Jo pagamarrës</strong>:
                <ul>
                  <li>ID ose Pashaportë Biometrike</li>
                  <li>Vërtetim page/të ardhurash/pune</li>
                  <li>Statement bankar</li>
                </ul>
              </li>
              <li>
                <strong>Të vetëpunësuar/pronar</strong>:
                <ul>
                  <li>ID</li>
                  <li>e-Albania</li>
                  <li>NIPT-I</li>
                </ul>
              </li>
            </ol>
            <p><em>Paga minimale duhet të jetë 28,000 lek neto dhe vlera minimale e produktit që do të blihet me këste duhet të jetë 10,000 lek.</em></p>
          </div>
        </section>

        <section className="finance-section">
          <h2>Blerje me Kartë Prima Këste - BKT</h2>
          <p>Të gjithë klientët e BKT që kanë një kartë PRIMA KËSTE mund të blejnë me këste në të gjitha POS-et BKT: 0% interes për 2 - 12 këste.</p>
        </section>

        <section className="finance-section">
          <h2>Blerje me Kartën e Kreditit Visa - CREDINS BANK</h2>
          <p>Të gjithë klientët e CREDINS BANK që kanë një Kartë Krediti Visa mund të blejnë me këste në të gjitha POS-et Credins: me 0% interes për 12 muaj.</p>
        </section>

      </div>
    </main>
  );
}
