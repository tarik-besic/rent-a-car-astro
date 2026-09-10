import { site } from '~/config/site';

const city = site.city;
const cityLoc = site.cityLocative;
const brand = site.name;

export const bs = {
  meta: {
    locale: 'bs',
    htmlLang: 'bs',
    ogLocale: 'bs_BA',
    label: 'Bosanski',
    switchLabel: 'English',
  },

  nav: {
    home: 'Početna',
    cars: 'Vozila',
    reserve: 'Rezervacija',
    faq: 'Česta pitanja',
    contact: 'Kontakt',
    mainLabel: 'Glavna navigacija',
  },

  common: {
    skipToContent: 'Preskoči na sadržaj',
    carImageAlt: (name: string) => `${name} — rent a car ${city}`,
    whatsappCta: 'Pišite nam na WhatsApp',
    whatsappShort: 'WhatsApp',
    whatsappUs: 'Pišite nam',
    askWhatsapp: 'Pitajte na WhatsApp',
    askOtherDates: 'Pitajte za druge datume',
    details: 'Detalji',
    hoursShort: 'Pon–Sub 08–20, Ned 09–17',
    whatsappHelper: 'Odgovaramo u roku od nekoliko minuta',
    callCta: 'Pozovite nas',
    viewCars: 'Pogledaj vozila',
    viewDetails: 'Detalji vozila',
    reserveCta: 'Rezerviši',
    perDay: 'dan',
    from: 'od',
    deposit: 'Depozit',
    noDeposit: 'Bez depozita',
    backToCars: 'Sva vozila',
    available: 'Dostupno',
    unavailable: 'Trenutno izdato',
    phone: 'Telefon',
    email: 'E-mail',
    address: 'Adresa',
    hours: 'Radno vrijeme',
    openMap: 'Otvori u Google Maps',
    or: 'ili',
    specs: {
      year: 'Godina',
      transmission: 'Mjenjač',
      fuel: 'Gorivo',
      seats: 'Sjedišta',
      doors: 'Vrata',
      seatsDoors: 'Sjedišta / vrata',
      ac: 'Klima',
      category: 'Klasa',
      consumption: 'Potrošnja',
    },
    values: {
      manual: 'Manuelni',
      automatic: 'Automatik',
      diesel: 'Dizel',
      petrol: 'Benzin',
      hybrid: 'Hibrid',
      electric: 'Električni',
      lpg: 'Plin',
      yes: 'Da',
      no: 'Ne',
    },
  },

  home: {
    title: `Rent a Car ${city} | Najam automobila od ${'{price}'} ${site.currency.symbol}/dan`,
    description: `Iznajmljivanje automobila u ${cityLoc} bez skrivenih troškova. Dostava na aerodrom, neograničena kilometraža, osiguranje. Rezervacija na WhatsApp.`,
    eyebrow: `${city} · dostava na aerodrom i u gradu`,
    /** Cheapest daily rate in the fleet, read from D1 — never hardcoded. */
    priceFrom: (price: string) => `od ${price}/dan`,
    /** One entry per rendered line of the headline. */
    h1Lines: ['Vaše vozilo', 'je spremno.'],
    heroBody:
      'Pošaljite nam datume na WhatsApp. U jednom odgovoru dobijete vozilo, cijenu i mjesto preuzimanja, obično za deset minuta. Bez registracije i sistema za rezervacije.',
    heroCta: 'Započnite WhatsApp razgovor',
    orCall: (phone: string) => `ili pozovite ${phone}`,
    /** Brzi upit u heroju — datumi idu direktno u WhatsApp. */
    quickHeading: 'Recite nam datume',
    quickLabels: { pickup: 'Preuzimanje', ret: 'Vraćanje', car: 'Vozilo — neobavezno' },
    quickAny: 'Bilo koje dostupno vozilo',
    quickSubmit: 'Pošalji datume na WhatsApp',
    quickNote: 'Poruka je već napisana — vi samo pošaljete. Ništa se ne čuva na stranici.',
    heroImageAlt: `Vozilo iz flote ${brand} — rent a car ${city}`,
    fleetHeading: 'Naša flota',
    fleetAll: (n: number) => `Pogledaj sva vozila (${n})`,
    fleetAllShort: (n: number) => `Sva (${n})`,
    ctaHeading: 'Sve se dogovara u razgovoru.',
    ctaText:
      'Datumi, dostava na aerodrom, depozit, cijene za duži najam. Jedan razgovor, jedna osoba koja odgovara.',
  },

  cars: {
    title: `Vozila u ponudi | Rent a car ${city}`,
    description: `Ponuda vozila za najam u ${cityLoc} s cijenama po danu — ekonomična vozila, limuzine, kombi i SUV. Rezervacija na WhatsApp u par minuta.`,
    h1: 'Naša flota',
    sub: 'cijene po danu, niže od 3 i 7 dana',
    empty: 'Trenutno nema objavljenih vozila. Kontaktirajte nas na WhatsApp za trenutnu dostupnost.',
    countLabel: (n: number) => (n === 1 ? '1 vozilo' : `${n} vozila`),
    filterAll: 'Sva',
  },

  car: {
    titleTemplate: (name: string) => `${name} — najam u ${cityLoc} | ${brand}`,
    descriptionTemplate: (name: string, price: string) =>
      `Iznajmite ${name} u ${cityLoc} od ${price} ${site.currency.symbol} po danu. Neograničena kilometraža, osiguranje uključeno, dostava na aerodrom. Rezervacija na WhatsApp.`,
    specsHeading: 'Specifikacije',
    /** "1–2 dana", "7+ dana" — redovi tabele s cijenama. */
    tier: (from: number, to: number | null) => (to === null ? `${from}+ dana` : `${from}–${to} dana`),
    whatsappCta: 'WhatsApp upit za ovo vozilo',
    reserveLink: 'ili popunite obrazac za rezervaciju',
    featuresHeading: 'Oprema',
    pricingHeading: 'Cjenovnik',
    pricingDay: 'Dnevni najam',
    pricing3: 'Od 3 dana',
    pricing7: 'Od 7 dana',
    pricingNote: 'Cijene su po danu, u markama, s uključenim osiguranjem i neograničenom kilometražom.',
    relatedHeading: 'Slična vozila',
    includedHeading: 'Uključeno u cijenu',
    included: [
      'Neograničena kilometraža',
      'Osnovno osiguranje (CDW)',
      'Zimska/ljetna guma prema sezoni',
      'Podrška 24/7 tokom najma',
      'Dostava u gradu i na aerodrom',
    ],
    galleryLabel: 'Fotografije vozila',
  },

  reserve: {
    title: `Rezervacija vozila | Rent a car ${city}`,
    description: `Rezervišite vozilo u ${cityLoc} u dva klika. Popunite datume i pošaljite upit na WhatsApp ili e-mailom — potvrda dolazi odmah.`,
    h1: 'Pošaljite upit',
    intro: 'Ništa se ne čuva na stranici. Obrazac otvara WhatsApp s već napisanom porukom.',
    labels: {
      car: 'Vozilo',
      carAny: 'Nisam siguran — predložite mi',
      pickupDate: 'Preuzimanje',
      returnDate: 'Vraćanje',
      pickupPlace: 'Mjesto preuzimanja',
      name: 'Ime',
      namePlaceholder: 'Vaše ime',
      phone: 'Telefon',
      phonePlaceholder: '+387 …',
      email: 'E-mail',
      note: 'Napomena — neobavezno',
      notePlaceholder: 'Preuzimanje na aerodromu, dječje sjedalo…',
    },
    submitWhatsapp: 'Pošalji na WhatsApp',
    submitEmail: 'Pošalji e-mailom',
    mailSubject: 'Rezervacija vozila',
    days: (n: number) => (n === 1 ? '1 dan' : `${n} dana`),
    estimateLabel: 'Procjena',
    rates: { day: 'dnevna cijena', d3: 'cijena od 3 dana', d7: 'cijena od 7 dana' },
    estimateNote: 'Samo procjena.',
    /** `{price}` se zamjenjuje u pregledniku. */
    depositNote: 'Depozit {price}, vraća se pri povratku vozila.',
  },

  faq: {
    title: `Česta pitanja o najmu vozila | Rent a car ${city}`,
    description: `Odgovori na česta pitanja o najmu vozila u ${cityLoc}: dokumenti, depozit, godine vozača, osiguranje i izlazak iz Bosne i Hercegovine.`,
    h1: 'Česta pitanja',
    intro: 'Nema odgovora na vaše pitanje? Pišite nam na WhatsApp, odgovorimo u nekoliko minuta.',
    items: [
      {
        q: 'Koji dokumenti su potrebni za najam vozila?',
        a: 'Potrebna je važeća vozačka dozvola (izdata najmanje dvije godine), lična karta ili pasoš. Za strane državljane iz zemalja izvan EU preporučujemo i međunarodnu vozačku dozvolu.',
      },
      {
        q: 'Koliko iznosi depozit?',
        a: `Depozit zavisi od klase vozila i najčešće se kreće od 100 do 300 ${site.currency.symbol}. Depozit se vraća u cijelosti pri vraćanju vozila u istom stanju. Za dio vozila depozit nije potreban — pitajte nas na WhatsApp.`,
      },
      {
        q: 'Koja je minimalna starost vozača?',
        a: 'Minimalna starost je 21 godina, uz vozačku dozvolu staru najmanje dvije godine. Za pojedina vozila više klase minimalna starost je 25 godina.',
      },
      {
        q: 'Je li kilometraža ograničena?',
        a: 'Nije. Sve naše cijene uključuju neograničenu kilometražu unutar Bosne i Hercegovine.',
      },
      {
        q: 'Mogu li vozilom izaći iz Bosne i Hercegovine?',
        a: 'Da. Uz prethodnu najavu izdajemo zeleni karton i ovlaštenje za izlazak iz zemlje. Za zemlje regiona naknada je simbolična, a za putovanja u EU nas kontaktirajte prije rezervacije.',
      },
      {
        q: 'Dostavljate li vozilo na aerodrom?',
        a: `Da. Dostava na Međunarodni aerodrom ${city} i na adresu u gradu je moguća, uz dogovor termina. Preuzimanje i vraćanje van radnog vremena je također moguće.`,
      },
      {
        q: 'Šta je uključeno u cijenu najma?',
        a: 'Osnovno osiguranje (CDW), neograničena kilometraža, sezonske gume, tehnički pregled i registracija, kao i podrška tokom cijelog trajanja najma.',
      },
      {
        q: 'Kako se plaća najam?',
        a: 'Plaćanje je moguće gotovinom ili karticom pri preuzimanju vozila. Za pravna lica izdajemo fakturu s odgodom plaćanja.',
      },
      {
        q: 'Šta ako se vozilo pokvari tokom najma?',
        a: 'Odmah nas kontaktirajte na WhatsApp ili telefon. Organizujemo pomoć na putu, a u slučaju duže neispravnosti dobijate zamjensko vozilo bez dodatnog troška.',
      },
      {
        q: 'Koliko unaprijed treba rezervisati vozilo?',
        a: 'Što ranije, tim bolje — posebno u sezoni od juna do septembra. Vozila su često dostupna i za isti dan, pa nas svakako pitajte.',
      },
    ],
  },

  trust: [
    {
      title: 'Sve preko WhatsApp-a',
      text: 'Bez registracije i beskrajnih formulara. Napišete datume, dobijete cijenu i potvrdu.',
    },
    {
      title: 'Cijena bez skrivenih troškova',
      text: 'Osiguranje, neograničena kilometraža i sezonske gume su uključeni u cijenu koju vidite.',
    },
    {
      title: 'Dostava na aerodrom i adresu',
      text: `Vozilo vas čeka gdje vam odgovara — u ${cityLoc}, na aerodromu ili pred hotelom.`,
    },
    {
      title: 'Održavana i čista vozila',
      text: 'Redovan servis, tehnički pregled i detaljno čišćenje prije svakog najma.',
    },
  ],

  steps: [
    { title: 'Odaberite vozilo', text: 'Pregledajte flotu i cijene po danu. Ako niste sigurni, predložimo vam vozilo.' },
    { title: 'Pošaljite poruku', text: 'Jedan klik na WhatsApp — poruka s vozilom i datumima je već pripremljena.' },
    { title: 'Preuzmite auto', text: 'Potvrdimo dostupnost, dogovorimo mjesto preuzimanja i vozilo je vaše.' },
  ],

  footer: {
    tagline: `Najam vozila u ${cityLoc} i okolini. Brza komunikacija, jasne cijene, vozila u koja se možete pouzdati.`,
    quickLinks: 'Brzi linkovi',
    contactHeading: 'Kontakt',
    rights: 'Sva prava zadržana.',
    sitemap: 'Mapa stranice',
    seoLine: `${brand} — rent a car ${city}, najam automobila, iznajmljivanje vozila.`,
  },

  notFound: {
    title: 'Stranica nije pronađena',
    h1: 'Ova stranica ne postoji',
    text: 'Link je možda star ili pogrešno napisan. Pogledajte ponudu vozila ili nam pišite direktno.',
  },

  whatsapp: {
    generic: `Zdravo! Zanima me najam vozila. Možete li mi poslati više informacija?`,
    car: (name: string) => `Zdravo! Zanima me najam vozila ${name}. Da li je dostupno?`,
    reservation: 'Zdravo! Želim rezervisati vozilo:',
    fields: {
      car: 'Vozilo',
      pickup: 'Preuzimanje',
      ret: 'Vraćanje',
      place: 'Mjesto',
      name: 'Ime',
      phone: 'Telefon',
      email: 'E-mail',
      note: 'Napomena',
    },
  },
};

export type Dict = typeof bs;
