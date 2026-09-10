import { site } from '~/config/site';
import type { Dict } from './bs';

const city = site.city;
const brand = site.name;

export const en: Dict = {
  meta: {
    locale: 'en',
    htmlLang: 'en',
    ogLocale: 'en_US',
    label: 'English',
    switchLabel: 'Bosanski',
  },

  nav: {
    home: 'Home',
    cars: 'Cars',
    reserve: 'Reservation',
    faq: 'FAQ',
    contact: 'Contact',
    mainLabel: 'Main navigation',
  },

  common: {
    skipToContent: 'Skip to content',
    carImageAlt: (name: string) => `${name} — rent a car ${city}`,
    whatsappCta: 'Message us on WhatsApp',
    whatsappShort: 'WhatsApp',
    whatsappHelper: 'We usually reply within minutes',
    callCta: 'Call us',
    viewCars: 'Browse cars',
    viewDetails: 'View details',
    reserveCta: 'Reserve',
    perDay: 'day',
    from: 'from',
    deposit: 'Deposit',
    noDeposit: 'No deposit',
    backToCars: 'All cars',
    available: 'Available',
    unavailable: 'Currently rented',
    phone: 'Phone',
    email: 'E-mail',
    address: 'Address',
    hours: 'Opening hours',
    openMap: 'Open in Google Maps',
    or: 'or',
    specs: {
      year: 'Year',
      transmission: 'Transmission',
      fuel: 'Fuel',
      seats: 'Seats',
      doors: 'Doors',
      ac: 'Air conditioning',
      category: 'Class',
      consumption: 'Average consumption',
    },
    values: {
      manual: 'Manual',
      automatic: 'Automatic',
      diesel: 'Diesel',
      petrol: 'Petrol',
      hybrid: 'Hybrid',
      electric: 'Electric',
      lpg: 'LPG',
      yes: 'Yes',
      no: 'No',
    },
  },

  home: {
    title: `Rent a Car ${city} | Car Rental from ${'{price}'} ${site.currency.symbol}/day`,
    description: `Rent a car in ${city} with no hidden fees. Airport delivery, unlimited mileage, insurance included. Book in one WhatsApp message.`,
    h1: `Rent a car in ${city}`,
    priceFrom: (price: string) => `From ${price} / day`,
    heroBody: [
      'Reliable, clean cars without complicated bookings.',
      `Pick-up in ${city} and at ${city} Airport.`,
    ],
    trustLine: ['No hidden fees', 'Fast confirmation', '24/7 support'],
    /** Hero quick enquiry — dates go straight to WhatsApp. */
    quickHeading: 'Tell us the dates',
    quickNote: 'The message is written for you — you only press send. Nothing is stored on this site.',
    heroImageAlt: `A car from the ${brand} rental fleet in ${city}`,
    fleetHeading: 'Our fleet',
    fleetSub: 'Maintained cars in every class — from economical city cars to spacious SUVs.',
    fleetAll: 'See all cars',
    trustHeading: 'Why travellers pick us',
    stepsHeading: 'Booking in three steps',
    ctaHeading: 'Need a car today?',
    ctaText: 'Send us the model and your dates — you get a confirmation within minutes, no commitment.',
    eyebrows: {
      benefits: 'Benefits',
      how: 'How it works',
      locations: 'Locations',
    },
    stats: {
      price: 'lowest daily rate',
      cars: 'cars in the fleet',
      years: 'years of experience',
      support: 'WhatsApp support',
    },
    areasHeading: 'Where we deliver',
    areasText: `Pick the car up at our office in ${city} or we bring it to any address you choose.`,
  },

  cars: {
    title: `Available cars | Rent a car ${city}`,
    description: `The rental fleet in ${city} with daily prices — economy cars, sedans, vans and SUVs. Book over WhatsApp in a couple of minutes.`,
    h1: 'Available cars',
    intro: `All prices are per day and include basic insurance and unlimited mileage. Longer rentals cost less per day — just ask on WhatsApp.`,
    empty: 'No cars are published right now. Message us on WhatsApp for current availability.',
    countLabel: (n: number) => (n === 1 ? '1 car' : `${n} cars`),
    filterAll: 'All classes',
  },

  car: {
    titleTemplate: (name: string) => `${name} rental in ${city} | ${brand}`,
    descriptionTemplate: (name: string, price: string) =>
      `Rent a ${name} in ${city} from ${price} ${site.currency.symbol} per day. Unlimited mileage, insurance included, airport delivery. Book on WhatsApp.`,
    specsHeading: 'Specifications',
    featuresHeading: 'Equipment',
    pricingHeading: 'Pricing',
    pricingDay: 'Daily rate',
    pricing3: '3 days or more',
    pricing7: '7 days or more',
    pricingNote: 'Prices are per day, insurance and unlimited mileage included.',
    relatedHeading: 'Similar cars',
    includedHeading: 'Included in the price',
    included: [
      'Unlimited mileage',
      'Basic insurance (CDW)',
      'Seasonal tyres',
      '24/7 support during the rental',
      'Delivery in the city and to the airport',
    ],
    galleryLabel: 'Car photos',
  },

  reserve: {
    title: `Car reservation | Rent a car ${city}`,
    description: `Reserve a car in ${city} in two clicks. Fill in your dates and send the request over WhatsApp or by e-mail — we confirm immediately.`,
    h1: 'Car reservation',
    intro: 'Fill in the short form and send your request. WhatsApp is fastest — we confirm availability right away.',
    whatsappBoxHeading: 'Fastest way: WhatsApp',
    whatsappBoxText: 'Tap the button — the message is already written, just hit send.',
    formHeading: 'Rental details',
    labels: {
      car: 'Car',
      carAny: 'Not sure — recommend one',
      pickupDate: 'Pick-up date',
      returnDate: 'Return date',
      pickupPlace: 'Pick-up location',
      name: 'Full name',
      phone: 'Phone number',
      email: 'E-mail',
      note: 'Note',
      notePlaceholder: 'Additional drivers, child seats, crossing the border...',
    },
    submitWhatsapp: 'Send on WhatsApp',
    submitEmail: 'Send by e-mail',
    emailFallbackNote:
      "Don't use WhatsApp? The \u201cSend by e-mail\u201d button opens your mail app with the message already written.",
    mailSubject: 'Car reservation',
    days: (n: number) => (n === 1 ? '1 day' : `${n} days`),
    estimateLabel: 'Estimated total',
  },

  faq: {
    title: `Car rental FAQ | Rent a car ${city}`,
    description: `Answers to common car rental questions in ${city}: documents, deposit, driver age, insurance and taking the car out of Bosnia and Herzegovina.`,
    h1: 'Frequently asked questions',
    intro: "Can't find your answer? Message us on WhatsApp and we reply within minutes.",
    items: [
      {
        q: 'Which documents do I need to rent a car?',
        a: 'A valid driving licence held for at least two years, plus an ID card or passport. Drivers from outside the EU should also bring an international driving permit.',
      },
      {
        q: 'How much is the deposit?',
        a: `The deposit depends on the car class and is usually between 100 and 300 ${site.currency.symbol}. It is refunded in full when the car is returned in the same condition. Some cars require no deposit at all — ask us on WhatsApp.`,
      },
      {
        q: 'What is the minimum driver age?',
        a: 'The minimum age is 21, with a licence held for at least two years. Some higher-class cars require the driver to be 25 or older.',
      },
      {
        q: 'Is the mileage limited?',
        a: 'No. Every price includes unlimited mileage within Bosnia and Herzegovina.',
      },
      {
        q: 'Can I take the car out of Bosnia and Herzegovina?',
        a: 'Yes. With advance notice we issue a green card and a cross-border authorisation letter. There is a small fee for neighbouring countries; for trips into the EU please contact us before booking.',
      },
      {
        q: 'Do you deliver cars to the airport?',
        a: `Yes. We deliver to ${city} International Airport and to any address in the city by appointment. Out-of-hours pick-up and drop-off are also possible.`,
      },
      {
        q: 'What is included in the rental price?',
        a: 'Basic insurance (CDW), unlimited mileage, seasonal tyres, road tax and registration, plus support for the whole duration of the rental.',
      },
      {
        q: 'How can I pay?',
        a: 'Cash or card on pick-up. For companies we issue an invoice with deferred payment.',
      },
      {
        q: 'What happens if the car breaks down?',
        a: 'Contact us immediately on WhatsApp or by phone. We arrange roadside assistance and, if the car cannot be repaired quickly, a replacement car at no extra cost.',
      },
      {
        q: 'How far in advance should I book?',
        a: 'The earlier the better, especially between June and September. Cars are often available same-day, so it is always worth asking.',
      },
    ],
  },

  trust: [
    {
      title: 'Everything over WhatsApp',
      text: 'No accounts, no endless forms. Send your dates, get the price and a confirmation.',
    },
    {
      title: 'No hidden fees',
      text: 'Insurance, unlimited mileage and seasonal tyres are part of the price you see.',
    },
    {
      title: 'Airport and hotel delivery',
      text: `The car waits wherever suits you — in ${city}, at the airport or in front of your hotel.`,
    },
    {
      title: 'Maintained, clean cars',
      text: 'Regular servicing, valid inspection and a thorough clean before every rental.',
    },
  ],

  steps: [
    { title: 'Pick a car', text: 'Browse the fleet and the daily rates. Not sure? We will recommend one.' },
    { title: 'Send a message', text: 'One tap on WhatsApp — the message with the car and your dates is pre-written.' },
    { title: 'Collect the keys', text: 'We confirm availability, agree the pick-up spot and the car is yours.' },
  ],

  footer: {
    tagline: `Car rental in ${city} and the surrounding area. Fast replies, clear prices, cars you can rely on.`,
    quickLinks: 'Quick links',
    contactHeading: 'Contact',
    rights: 'All rights reserved.',
    seoLine: `${brand} — rent a car ${city}, car hire, vehicle rental.`,
  },

  notFound: {
    title: 'Page not found',
    h1: 'This page does not exist',
    text: 'The link may be outdated or mistyped. Have a look at the fleet or contact us directly.',
  },

  whatsapp: {
    generic: `Hello! I would like to rent a car. Could you send me more information?`,
    car: (name: string) => `Hello! I am interested in renting the ${name}. Is it available?`,
    reservation: 'Hello! I would like to reserve a car:',
    fields: {
      car: 'Car',
      pickup: 'Pick-up',
      ret: 'Return',
      place: 'Location',
      name: 'Name',
      phone: 'Phone',
      email: 'E-mail',
      note: 'Note',
    },
  },
};
