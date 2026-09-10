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
      ac: 'Klima',
      category: 'Klasa',
      consumption: 'Prosječna potrošnja',
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
    h1: `Rent a car ${city}`,
    /** Cheapest daily rate in the fleet, read from the sheet — never hardcoded. */
    priceFrom: (price: string) => `Već od ${price} / dan`,
    heroBody: [
      'Pouzdana i čista vozila bez komplikovanih rezervacija.',
      `Preuzimanje u ${cityLoc} i na Aerodromu ${city}.`,
    ],
    trustLine: ['Bez skrivenih troškova', 'Brza potvrda', '24/7 podrška'],
    /** Brzi upit u heroju — datumi idu direktno u WhatsApp. */
    quickHeading: 'Recite nam datume',
    quickNote: 'Poruka je već napisana — vi samo pošaljete. Ništa se ne čuva na stranici.',
    heroImageAlt: `Vozilo iz flote ${brand} — rent a car ${city}`,
    fleetHeading: 'Naša flota',
    fleetSub: 'Održavana vozila svih klasa — od ekonomičnih gradskih do prostranih SUV-ova.',
    fleetAll: 'Pogledaj sva vozila',
    trustHeading: 'Zašto klijenti biraju nas',
    stepsHeading: 'Rezervacija u tri koraka',
    ctaHeading: 'Trebate vozilo danas?',
    ctaText: 'Pošaljite nam marku vozila i datume — potvrda dolazi u nekoliko minuta, bez obaveze.',
    eyebrows: {
      benefits: 'Prednosti',
      how: 'Kako radi',
      locations: 'Lokacije',
    },
    stats: {
      price: 'najniža cijena po danu',
      cars: 'vozila u floti',
      years: 'godina iskustva',
      support: 'WhatsApp podrška',
    },
    areasHeading: 'Gdje dostavljamo vozila',
    areasText: `Vozilo preuzimate u našoj poslovnici u ${cityLoc} ili vam ga dovezemo na dogovorenu adresu.`,
  },

  cars: {
    title: `Vozila u ponudi | Rent a car ${city}`,
    description: `Ponuda vozila za najam u ${cityLoc} s cijenama po danu — ekonomična vozila, limuzine, kombi i SUV. Rezervacija na WhatsApp u par minuta.`,
    h1: 'Vozila u ponudi',
    intro: `Sve cijene su po danu i uključuju osnovno osiguranje i neograničenu kilometražu. Za duži najam cijena je niža — pitajte nas na WhatsApp.`,
    empty: 'Trenutno nema objavljenih vozila. Kontaktirajte nas na WhatsApp za trenutnu dostupnost.',
    countLabel: (n: number) => (n === 1 ? '1 vozilo' : `${n} vozila`),
    filterAll: 'Sve klase',
  },

  car: {
    titleTemplate: (name: string) => `${name} — najam u ${cityLoc} | ${brand}`,
    descriptionTemplate: (name: string, price: string) =>
      `Iznajmite ${name} u ${cityLoc} od ${price} ${site.currency.symbol} po danu. Neograničena kilometraža, osiguranje uključeno, dostava na aerodrom. Rezervacija na WhatsApp.`,
    specsHeading: 'Specifikacije',
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
    h1: 'Rezervacija vozila',
    intro: 'Popunite kratki obrazac i pošaljite upit. Preporučujemo WhatsApp — tako najbrže potvrdimo dostupnost.',
    whatsappBoxHeading: 'Najbrži način: WhatsApp',
    whatsappBoxText: 'Kliknite dugme, poruka je već napisana — samo pošaljite.',
    formHeading: 'Podaci o najmu',
    labels: {
      car: 'Vozilo',
      carAny: 'Nisam siguran — predložite mi',
      pickupDate: 'Datum preuzimanja',
      returnDate: 'Datum vraćanja',
      pickupPlace: 'Mjesto preuzimanja',
      name: 'Ime i prezime',
      phone: 'Broj telefona',
      email: 'E-mail',
      note: 'Napomena',
      notePlaceholder: 'Broj vozača, dječje sjedalice, izlazak iz zemlje...',
    },
    submitWhatsapp: 'Pošalji na WhatsApp',
    submitEmail: 'Pošalji e-mailom',
    emailFallbackNote:
      'Ne koristite WhatsApp? Dugme „Pošalji e-mailom" otvara vaš program za e-mail s već napisanom porukom.',
    mailSubject: 'Rezervacija vozila',
    days: (n: number) => (n === 1 ? '1 dan' : `${n} dana`),
    estimateLabel: 'Procjena cijene',
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
