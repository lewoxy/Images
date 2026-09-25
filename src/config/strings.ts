/** Alle sichtbaren Texte (Deutsch). Eigene Formulierungen – §18: konkrete Texte des Originals sind geschützt. */

export const GAME_TITLE = 'Hotel Hektik';
export const HOTEL_NAMES = [
  'Pension Seeblick',
  'Berghütte Edelweiß',
  'Stadthotel Metropol',
  'Wüstenoase',
  'Palmenresort',
  'Schloss Wolkenstein',
  'Lodge Polarstern',
  'Urwald-Lodge',
  'Hafenhotel Anker',
  'Vulkan-Spa',
  'Sternwarten-Hotel',
  'Kirschblüten-Ryokan',
  'Savannen-Camp',
  'Korallen-Suite',
  'Mondbasis-Hotel',
  'Märchenschloss',
  'Grandhotel Royal',
];
export const HOTEL_SHORT = 'PENSION';

/** Ressourcen-Darstellung je Hotel (§12: intern candy/toiletpaper, pro Hotel anders dargestellt) */
export const RES_NAMES = {
  candy: 'Bonbons',
  toiletpaper: 'Seife',
};

export const T = {
  loading: 'Lädt …',
  tapToStart: 'Tippen zum Starten',
  controlsHintTouch: 'Ziehe irgendwo auf dem Bildschirm, um zu laufen',
  controlsHintKeys: 'Laufen mit WASD / Pfeiltasten – oder mit der Maus ziehen',
  max: 'MAX',
  level: 'Level',
  noRoom: 'Kein Zimmer frei',
  noPaper: 'Kein Papier!',
  full: 'Voll',
  handsFull: 'Hände voll',

  // Platten
  plate: {
    room: 'Zimmer',
    roomUp: 'Stufe',
    cleaner: 'Reinigung',
    cleanerUp: 'Tempo+',
    toilet: 'WC',
    zone: 'Neuer Bereich',
    reception: 'Rezeption',
    receptionUp: 'Tempo+',
    receptionDesk2: '2. Tresen',
    supplier: 'Lieferant',
    supplierSpeed: 'Tempo+',
    supplierCarry: 'Tragen+',
    parking: 'Parkplatz',
    parker: 'Parkwächter',
    elevator: 'Aufzug',
  },

  // Level-Up
  levelUp: 'NEUES LEVEL!',
  nowAvailable: 'JETZT VERFÜGBAR',
  reward: 'BELOHNUNG',
  collect: 'Einsammeln',
  double: 'Verdoppeln',
  hotelComplete: 'Hotel komplett ausgebaut!',

  // Zimmer-Design
  upgradeRoom: 'ZIMMER VERBESSERN',
  designNames: ['Klassisch', 'Gemütlich', 'Deluxe'],
  designHint: ['Standard-Einrichtung', 'Andere Farben, gleicher Ertrag', 'Mehr Umsatz pro Gast'],
  choose: 'Wählen',

  // Offline
  welcomeBack: 'WILLKOMMEN ZURÜCK!',
  offlineText: (mins: string) => `Während deiner Abwesenheit (${mins}) haben Gäste weiter gezahlt:`,

  // Tabs
  tabs: ['Hotelbuch', 'Karte', 'Hotel', 'Figur', 'Erfolge'],

  // Tutorial
  tutorial: [
    'Stell dich auf die Platte und baue dein erstes Zimmer',
    'Stell dich hinter den Tresen und checke den Gast ein',
    'Sammle das Geld an der Rezeption ein',
    'Reinige das Zimmer – lauf über alle 3 Schmutzstellen',
    'Baue ein zweites Zimmer',
    'Stelle eine Reinigungskraft ein',
    'Baue eine Toilette',
    'Hol Klopapier aus dem Lager',
    'Bring das Klopapier zur Toilette',
  ],
  tutorialDone: 'Super! Ab jetzt findest du neue Aufträge im Auftragsbuch.',
  tutorialNeedCash: (n: string) => `Noch ${n} Bargeld – checke Gäste ein und sammle ihr Geld`,

  // Quests
  quests: 'AUFTRÄGE',
  questTemplates: {
    checkin: (n: number) => `Checke ${n} Gäste ein`,
    clean: (n: number) => `Reinige ${n} Zimmer`,
    collect: (n: string) => `Sammle ${n} Bargeld ein`,
    paper: (n: number) => `Fülle ${n} Rollen Klopapier auf`,
    buy: (n: number) => `Kaufe ${n} Verbesserungen`,
    special: () => `Erfülle 2 Sonderwünsche`,
    park: (n: number) => `Lass ${n} Autos parken`,
    vip: () => `Checke einen VIP-Gast ein`,
  },
  claim: 'Abholen',
  done: 'Erledigt',

  // Erfolge
  achievements: 'ERFOLGE',

  // Figur
  character: 'DEINE FIGUR',
  upgradeKinds: {
    speed: 'Lauftempo +12 %',
    carry: 'Tragkraft +1',
    magnet: 'Geldmagnet',
  },
  backpack: 'Rucksack',
  backpackText: 'Jede Stufe: +1 Tragkraft',
  buy: 'Kaufen',
  owned: 'Gekauft',

  // Karte
  map: 'WELTKARTE',
  youAreHere: 'DU BIST HIER',
  comingSoon: 'Bald verfügbar',

  // Hotelbuch
  ledger: 'HOTELBUCH',
  run: 'Durchlauf',
  prestige: 'Hotel neu eröffnen',
  prestigeText:
    'Starte das Hotel neu – mit höheren Preisen, aber auch mehr Einnahmen und größeren Belohnungen. Gems, Tokens und Figur-Upgrades bleiben erhalten.',

  // Shop
  shop: 'SHOP',
  shopItems: {
    scooter: 'Roller (3 Min +50 % Tempo)',
    helper: 'Aushilfe (5 Min Reinigung überall)',
    cashPack: 'Geldkoffer',
    candyPack: '10 Bonbons',
    toiletpaperPack: '5 Seifen',
    gift: 'Gratis-Geschenk',
  },

  // Einstellungen
  settings: 'EINSTELLUNGEN',
  sound: 'Soundeffekte',
  vibration: 'Vibration',
  quality: 'Hohe Grafikqualität',
  showFps: 'FPS anzeigen',
  reset: 'Spielstand löschen',
  resetConfirm: 'Wirklich alles löschen? Das kann nicht rückgängig gemacht werden.',
  about:
    'Hotel Hektik ist ein eigenständiger Fan-Nachbau der Spielmechanik von Arcade-Idle-Hotelspielen. Alle Grafiken, Figuren und Sounds werden prozedural erzeugt.',

  // Sondergäste
  special: {
    arrives: (name: string) => `${name} ist angekommen!`,
    wants: 'wünscht sich',
    thanks: 'Danke!',
    left: 'ist abgereist',
    items: {
      champagne: 'Champagner',
      flowers: 'Blumen',
      towel: 'Handtuch',
      coffee: 'Kaffee',
      luggage: 'Gepäck aufs Zimmer',
    } as Record<string, string>,
  },
  vipArrives: 'Ein VIP-Gast wartet an der Rezeption!',
  scooterFound: 'Roller! +50 % Tempo',
  newQuest: 'Neuer Auftrag',
};

export const SPECIAL_GUESTS = [
  { name: 'Dr. Rosa Rot', role: 'Ärztin' },
  { name: 'Rocky Riff', role: 'Rockstar' },
  { name: 'Chef Paolo', role: 'Koch' },
  { name: 'Lady Lavendel', role: 'Adelige' },
  { name: 'Kapitän Kurt', role: 'Seefahrer' },
  { name: 'Profi Pia', role: 'Tennisstar' },
];

export function fmt(n: number): string {
  const v = Math.floor(n);
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1).replace('.', ',') + ' Mio';
  if (v >= 100_000) return Math.round(v / 1000) + 'K';
  return v.toLocaleString('de-DE');
}

export function fmtTime(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}Std ${String(m).padStart(2, '0')}m`;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

/** „JETZT VERFÜGBAR“ im Level-Up-Fenster (§14) */
export const LEVEL_FEATURES: Record<number, { icon: string; text: string }[]> = {
  2: [
    { icon: 'zone', text: 'Neuer Bereich: Zone 2' },
    { icon: 'star', text: 'Sondergäste mit Wünschen' },
    { icon: 'scooter', text: 'Roller im Flur' },
  ],
  3: [
    { icon: 'zone', text: 'Neuer Bereich: Zone 3' },
    { icon: 'crown', text: 'VIP-Gäste' },
  ],
  4: [
    { icon: 'zone', text: 'Neuer Bereich: Zone 4' },
    { icon: 'parking', text: 'Parkplatz' },
  ],
  5: [{ icon: 'zone', text: 'Neuer Bereich: Zone 5' }],
  6: [{ icon: 'zone', text: 'Neuer Bereich: Zone 6' }],
  7: [{ icon: 'zone', text: 'Neuer Bereich: Zone 7' }],
  8: [
    { icon: 'trophy', text: 'Hotel komplett!' },
    { icon: 'elevator', text: 'Aufzug & Lounge' },
    { icon: 'hotel', text: 'Neuer Durchlauf (nach dem Aufzug)' },
  ],
};
