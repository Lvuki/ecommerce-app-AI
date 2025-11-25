import React, { useState } from 'react';
import '../styles/services.css';

const Section = ({ id, title, intro, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <section className="service-section" id={id}>
      <h3 className="service-title">{title}</h3>
      <p className="service-intro">{intro}</p>
      <div className="service-actions">
        <button className="read-more" onClick={() => setOpen(s => !s)}>{open ? 'Mbyll' : 'Më shumë'}</button>
      </div>
      {open ? <div className="service-details">{children}</div> : null}
    </section>
  );
};

export default function Sherbimet() {
  return (
    <main className="services-page">
      <div className="container">
        <h1 className="page-title">Sherbimet</h1>

        <p className="lead">
          Ne Globe, nuk gjeni vetem teknologjine me te fundit nga markat me te njohura – por edhe nje game
          te gjere sherbimesh qe ju ndihmojne te perfitoni maksimumin nga cdo produkt qe blini. Zbuloni se si Globe ju ndihmon ne cdo hap te pervojes suaj te blerjes – qe nga zgjedhja e produktit deri te perdorimi i tij i perditshem.
        </p>

        <Section
          id="konsulence"
          title="Konsulence per Blerje — Ne dyqan dhe Online"
          intro={`Mos u ngaterroni mes opsioneve te shumta – ekspertet tane jane gjithmone te gatshem t’ju ndihmojne te zgjidhni produktin e duhur, sipas nevojave dhe buxhetit tuaj.`}
        >
          <p>
            Nese nuk jeni te sigurt cili produkt ju pershtatet me shume, stafi yne eshte i trajnuar per t’ju ofruar keshillim
            profesional per cdo kategori produkti. Ju ofrojme te gjitha informacionet qe ju nevojiten per te bere zgjedhjen e
            duhur, duke marre parasysh:
          </p>
          <ul>
            <li>Hapesiren tuaj ne shtepi</li>
            <li>Nevojat teknike dhe perdorimin ditor</li>
            <li>Buxhetin</li>
            <li>Etj</li>
          </ul>
          <div className="service-links">
            <button className="link-btn">Lidhu me agjentin online</button>
            <button className="link-btn">Konsulence sipas pikes se shitjes</button>
          </div>
        </Section>

        <Section
          id="delivery"
          title="Dergesa ne Shtepi — Blini lehtesisht dhe pa shqetesim"
          intro={`Ne sjellim produktin ne adresen tuaj, me transport te organizuar dhe te garantuar, kudo ne Shqiperi.`}
        >
          <p>
            Globe ofron sherbim te organizuar transporti per te gjitha blerjet tuaja, ne te gjithe territorin e Shqiperise. Ne
            kujdesemi per:
          </p>
          <ul>
            <li>Transportin e sigurt dhe te mbrojtur te pajisjeve</li>
            <li>Koordinim paraprak per oraret e dorezimit</li>
            <li>Shkarkim te kujdesshem nga personeli yne dhe ngjitje deri ne banese</li>
            <li>Kontrollin fizik te pajisjeve pas heqjes se ambalazhit</li>
          </ul>
          <div className="service-links">
            <button className="link-btn">Informacion mbi tarifat</button>
          </div>
        </Section>

        <Section
          id="instalimi"
          title="Sherbime Instalimi — Ne dyqan dhe ne shtepi"
          intro={`Ne sigurojme instalimin e sigurt dhe te sakte per nje sere pajisjesh elektroshtepiake, nga teknike te certifikuar.`}
        >
          <p>
            Globe ofron sherbim profesional instalimi per nje game te gjere pajisjesh. Cfare perfitoni?
          </p>
          <ul>
            <li>Cmontimin e produktit qe do te zevendesohet (nese ka)</li>
            <li>Instalim te sakte dhe te sigurt sipas standardeve teknike</li>
            <li>Informacion baze mbi perdorimin e produktit</li>
            <li>Pastrimin e zones ku eshte kryer instalimi</li>
          </ul>
          <div className="service-links">
            <button className="link-btn">Informacion mbi tarifat</button>
            <button className="link-btn">Percakto nje sherbim ne shtepine tuaj</button>
          </div>
        </Section>

        <Section
          id="garanci"
          title="Garanci e Shtuar — Ne dyqan dhe online"
          intro={`Globe ofron mundesi per zgjatje te garancise pertej afatit standard, per me shume siguri dhe qetesi mendore.`}
        >
          <p>
            Mbrojtje pertej standardit - Globe ju ofron jo vetem garancine zyrtare te produktit, por edhe mundesi per garanci
            te zgjatur +3 vite, ne varesi te produktit apo kategorise.
          </p>
          <ul>
            <li>Mbulim i defekteve te fabrikimit per me shume vite</li>
            <li>Riparim ose zevendesim pa kosto</li>
            <li>Zevendesim i pajisjes me nje te re, ne rast se riparimi nuk eshte i mundur</li>
          </ul>
          <div className="service-links">
            <button className="link-btn">Produktet e perfshira</button>
            <button className="link-btn">Informacion mbi tarifat</button>
          </div>
        </Section>

        <Section
          id="manual"
          title="Manual Perdorimi & Mbeshtetje — Ne dyqan, online dhe ne shtepi"
          intro={`Per cdo produkt ofrojme udhezime te qarta perdorimi, si dhe asistence te dedikuar nese ju nevojitet ndihme.`}
        >
          <p>
            Per cdo produkt te blere ne Globe, ofrojme manualin e perdorimit ne gjuhen shqipe ose anglisht, si dhe udhezime
            te detajuara per perdorimin e funksioneve kryesore.
          </p>
          <div className="service-links">
            <button className="link-btn">Kerko manual perdorimi per pajisjen tuaj</button>
            <button className="link-btn">Kerko asistence ne shtepine tuaj</button>
          </div>
        </Section>

        <Section
          id="riparim"
          title="Riparim i Shpejte — Ne servis dhe ne shtepi"
          intro={`Globe ofron zgjidhje te shpejta dhe profesionale, ne bashkepunim me serviset zyrtare te autorizuara.`}
        >
          <p>
            Nese pajisja juaj has nje problem, Globe ofron sherbim te shpejte dhe te besueshem per riparimin e produkteve.
          </p>
          <ul>
            <li>Diagnostikim te sakte dhe profesional</li>
            <li>Perdorim te pjeseve origjinale</li>
            <li>Pajisje perdorimi gjate kohes qe pajisja juaj riparohet</li>
            <li>Kohe minimale te qendrimit ne servis apo riparimit ne adresen tuaj</li>
          </ul>
          <div className="service-links">
            <button className="link-btn">Kontakto qendren e servisimit</button>
            <button className="link-btn">Percakto nje sherbim ne shtepine tuaj</button>
            <button className="link-btn">Kerko pjese kembimi</button>
          </div>
        </Section>

      </div>
    </main>
  );
}
