import React from "react";

export default function Footer() {
  const linkStyle = { display: 'block', marginBottom: 18, textDecoration: 'underline', color: '#111', fontWeight: 600 };
  const smallLink = { display: 'block', marginBottom: 10, textDecoration: 'underline', color: '#111' };

  return (
    <footer style={{ marginTop: 40, padding: '48px 20px', background: '#f4f6f8', color: '#111' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 40, alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        {/* left column */}
        <div style={{ flex: '1 1 220px' }}>
          <a href="#about" style={linkStyle}>Rreth kompanisë</a>
          <a href="#support" style={smallLink}>Ne suportojmë</a>
          <a href="#careers" style={smallLink}>Karriera</a>
          <a href="#finance" style={smallLink}>Financim</a>
        </div>

        {/* center column (policies) */}
        <div style={{ flex: '1 1 220px' }}>
          <a href="#privacy" style={linkStyle}>Politika e privatësisë</a>
          <a href="#recruitment" style={smallLink}>Politikat e privatësisë së rekrutimit</a>
          <a href="#terms" style={smallLink}>Kushtet e përdorimit</a>
          <a href="#cookies" style={smallLink}>Cookies</a>
        </div>

        {/* right column (contact + social) */}
        <div style={{ flex: '1 1 300px' }}>
          <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>NA KONTAKTO</div>
          <div style={{ marginBottom: 8 }}><span style={{ fontWeight: 700 }}>N:</span> <a href="tel:+35544806061" style={{ textDecoration: 'underline', color: '#111' }}>+355 44 806 061</a></div>
          <div style={{ marginBottom: 8 }}><span style={{ fontWeight: 700 }}>E:</span> <a href="mailto:info@globe.al" style={{ textDecoration: 'underline', color: '#111' }}>info@globe.al</a></div>
          <div style={{ marginBottom: 16 }}><span style={{ fontWeight: 700 }}>A:</span> Rruga e Kavajes, Tirane 1023, Albania</div>

          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            {/** Social icon button - Facebook */}
            <a href="#fb" aria-label="Facebook" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 8, border: '2px solid #1aa3d6', background: '#fff', textDecoration: 'none' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 12C22 6.48 17.52 2 12 2S2 6.48 2 12c0 5 3.66 9.12 8.44 9.88v-6.99H7.9v-2.89h2.54V9.41c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.62.77-1.62 1.56v1.87h2.77l-.44 2.89h-2.33V22C18.34 21.12 22 17 22 12z" fill="#1aa3d6"/>
              </svg>
            </a>

            {/** Instagram */}
            <a href="#ig" aria-label="Instagram" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 8, border: '2px solid #1aa3d6', background: '#fff', textDecoration: 'none' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="3" width="18" height="18" rx="4" stroke="#1aa3d6" strokeWidth="1.2" fill="none" />
                <path d="M12 7.2a4.8 4.8 0 100 9.6 4.8 4.8 0 000-9.6z" stroke="#1aa3d6" strokeWidth="1.2" fill="none" />
                <circle cx="17.5" cy="6.5" r="0.6" fill="#1aa3d6" />
              </svg>
            </a>

            {/** WhatsApp */}
            <a href="#wa" aria-label="WhatsApp" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 8, border: '2px solid #1aa3d6', background: '#fff', textDecoration: 'none' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20.52 3.48A11.93 11.93 0 0012 .5 11.93 11.93 0 003.48 3.48 11.93 11.93 0 00.5 12c0 2.1.55 4.12 1.6 5.9L.5 23.5l5.02-1.32A11.93 11.93 0 0012 23.5c6.62 0 11.98-5.36 11.98-11.98 0-3.2-1.25-6.2-3.46-8.04z" fill="#1aa3d6"/>
                <path d="M17.1 14.2c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.33.22-.62.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.6.13-.13.3-.33.45-.5.15-.17.2-.28.3-.47.1-.2.05-.37-.02-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5-.17 0-.37 0-.57 0-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.06 2.87 1.21 3.07.15.2 2.1 3.2 5.07 4.36 2.97 1.15 2.97.77 3.5.72.53-.05 1.76-.72 2.01-1.41.24-.68.24-1.26.17-1.41-.07-.15-.26-.23-.57-.38z" fill="#fff"/>
              </svg>
            </a>

            {/** LinkedIn */}
            <a href="#li" aria-label="LinkedIn" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 8, border: '2px solid #1aa3d6', background: '#fff', textDecoration: 'none' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4.98 3.5C4.98 4.6 4.1 5.5 3 5.5S1 4.6 1 3.5 1.88 1.5 3 1.5s1.98.9 1.98 2zM.5 8h4.99V24H.5zM9.5 8h4.78v2.16h.07c.66-1.25 2.27-2.56 4.68-2.56C23.8 7.6 24 11 24 15.16V24h-5v-7.44c0-1.77-.03-4.06-2.47-4.06-2.48 0-2.86 1.93-2.86 3.93V24h-5V8z" fill="#1aa3d6"/>
              </svg>
            </a>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '24px auto 0 auto', color: '#666', fontSize: 13, textAlign: 'center' }}>
        © {new Date().getFullYear()} Globe. All rights reserved.
      </div>
    </footer>
  );
}


