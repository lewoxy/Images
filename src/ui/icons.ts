/**
 * Eigenes Icon-Set (viewBox 0 0 64 64). Dieselben Pfade werden im DOM als SVG
 * und auf den Kaufplatten per Path2D auf Canvas gezeichnet – so sehen HUD und
 * Spielwelt einheitlich aus.
 */

export interface IconPart {
  d: string;
  fill?: string;
  stroke?: string;
  sw?: number;
}

const O = '#2b1457'; // Kontur
const W = '#ffffff';

const star5 = (cx: number, cy: number, R: number, r: number) => {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? R : r;
    d += (i === 0 ? 'M' : 'L') + (cx + Math.cos(a) * rad).toFixed(1) + ' ' + (cy + Math.sin(a) * rad).toFixed(1);
  }
  return d + 'Z';
};

const circle = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0Z`;
const rrect = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;

const plus = (cx: number, cy: number, s: number): IconPart[] => [
  { d: `M${cx - s} ${cy - s / 3}h${s * 2 / 3}v${-s * 2 / 3}h${s * 2 / 3}v${s * 2 / 3}h${s * 2 / 3}v${s * 2 / 3}h${-s * 2 / 3}v${s * 2 / 3}h${-s * 2 / 3}v${-s * 2 / 3}h${-s * 2 / 3}Z`, fill: '#3bd65a', stroke: O, sw: 3 },
];

const arrowUp = (cx: number, cy: number, s: number, fill = '#3bd65a'): IconPart[] => [
  { d: `M${cx} ${cy - s}L${cx + s} ${cy}H${cx + s / 2.2}V${cy + s}H${cx - s / 2.2}V${cy}H${cx - s}Z`, fill, stroke: O, sw: 3 },
];

const personHead = (cx: number, cy: number, s: number, skin = '#ffd0a8', body = '#7b2ff7'): IconPart[] => [
  { d: `M${cx - s * 1.05} ${cy + s * 2.3}Q${cx - s * 1.05} ${cy + s * 0.9} ${cx} ${cy + s * 0.9}Q${cx + s * 1.05} ${cy + s * 0.9} ${cx + s * 1.05} ${cy + s * 2.3}Z`, fill: body, stroke: O, sw: 3 },
  { d: circle(cx, cy, s * 0.72), fill: skin, stroke: O, sw: 3 },
];

export const ICONS: Record<string, IconPart[]> = {
  cash: [
    { d: rrect(6, 26, 46, 26, 4), fill: '#1b9c3b', stroke: O, sw: 3 },
    { d: rrect(12, 16, 46, 26, 4), fill: '#3bd65a', stroke: O, sw: 3 },
    { d: circle(35, 29, 7), fill: '#bff5a8' },
    { d: 'M33 25h5v2h-4v2h3q2 0 2 2t-2 2h-5v-2h4v-1h-3q-2 0-2-2t2-3z', fill: '#1b9c3b' },
    { d: 'M16 21h6M48 37h6', stroke: '#bff5a8', sw: 3 },
  ],
  gem: [
    { d: 'M16 10H48L60 26L32 58L4 26Z', fill: '#39a9ff', stroke: O, sw: 3 },
    { d: 'M16 10L24 26L32 10ZM48 10L40 26L32 10ZM4 26H60', fill: '#8fd3ff', stroke: O, sw: 2 },
    { d: 'M24 26L32 58L40 26Z', fill: '#1f86e8', stroke: O, sw: 2 },
  ],
  token: [
    { d: circle(32, 34, 25), fill: '#e68600', stroke: O, sw: 3 },
    { d: circle(32, 30, 25), fill: '#ffc62b', stroke: O, sw: 3 },
    { d: circle(32, 30, 18), fill: '#ffdd6b' },
    { d: star5(32, 31, 13, 5.5), fill: '#e68600' },
  ],
  star: [{ d: star5(32, 34, 30, 13), fill: '#ffc62b', stroke: O, sw: 3.5 }, { d: star5(32, 34, 17, 7.5), fill: '#ffdf6e' }],
  candy: [
    { d: 'M14 32L3 22V42Z', fill: '#ff8fc4', stroke: O, sw: 3 },
    { d: 'M50 32L61 22V42Z', fill: '#ff8fc4', stroke: O, sw: 3 },
    { d: circle(32, 32, 18), fill: '#ff5fa8', stroke: O, sw: 3 },
    { d: 'M22 20Q32 32 22 44M32 14Q42 32 32 50M42 20Q52 32 42 44', stroke: '#ffd3e8', sw: 4 },
  ],
  toiletpaper: [
    { d: rrect(8, 22, 48, 28, 12), fill: '#5fd0ff', stroke: O, sw: 3 },
    { d: rrect(14, 27, 36, 9, 4), fill: '#b9ecff' },
    { d: circle(46, 14, 6), fill: '#e6f8ff', stroke: O, sw: 2 },
    { d: circle(54, 22, 4), fill: '#e6f8ff', stroke: O, sw: 2 },
    { d: circle(38, 9, 3.5), fill: '#e6f8ff', stroke: O, sw: 2 },
  ],
  bed: [
    { d: rrect(6, 18, 10, 34, 3), fill: '#f07b28', stroke: O, sw: 3 },
    { d: rrect(10, 32, 46, 14, 3), fill: '#f07b28', stroke: O, sw: 3 },
    { d: rrect(16, 24, 12, 8, 3), fill: W, stroke: O, sw: 2.5 },
    { d: rrect(28, 26, 26, 8, 3), fill: '#4a7fe8', stroke: O, sw: 2.5 },
    { d: 'M12 46v6M52 46v6', stroke: O, sw: 4 },
  ],
  person: [...personHead(32, 20, 12)],
  receptionist: [
    ...personHead(32, 20, 12, '#ffd0a8', '#e8423a'),
    { d: 'M26 36L32 40L38 36L38 44L32 40L26 44Z', fill: '#2b1457' },
  ],
  cleaner: [
    ...personHead(26, 20, 11, '#ffd0a8', '#2ec98c'),
    { d: 'M46 8L52 44', stroke: '#b98a55', sw: 4 },
    { d: 'M42 44H60L58 56H44Z', fill: '#4fb3ff', stroke: O, sw: 3 },
  ],
  supplier: [
    ...personHead(24, 22, 10, '#ffd0a8', '#ff9a2e'),
    { d: 'M14 16Q24 6 34 16Z', fill: '#ffd23a', stroke: O, sw: 2.5 },
    { d: rrect(36, 30, 22, 20, 3), fill: '#d9964a', stroke: O, sw: 3 },
    { d: 'M36 38h22', stroke: O, sw: 2 },
  ],
  parker: [
    ...personHead(20, 18, 9, '#ffd0a8', '#2b4fb8'),
    { d: rrect(28, 34, 32, 14, 5), fill: '#ff5a3c', stroke: O, sw: 3 },
    { d: 'M33 34L37 26H52L56 34Z', fill: '#8fe3ff', stroke: O, sw: 2.5 },
    { d: circle(35, 50, 4.5) + circle(53, 50, 4.5), fill: O },
  ],
  speed: [
    { d: circle(32, 36, 22), fill: W, stroke: O, sw: 3.5 },
    { d: rrect(27, 6, 10, 8, 2), fill: '#ff5a3a', stroke: O, sw: 3 },
    { d: 'M32 36L32 22M32 36L42 42', stroke: '#ff5a3a', sw: 4 },
    { d: 'M4 30h8M2 40h9M6 50h8', stroke: '#39a9ff', sw: 4 },
  ],
  carry: [
    { d: rrect(10, 26, 44, 30, 4), fill: '#d9964a', stroke: O, sw: 3 },
    { d: 'M10 36h44', stroke: O, sw: 2.5 },
    ...arrowUp(32, 14, 11),
  ],
  wc: [
    { d: rrect(14, 6, 26, 18, 4), fill: '#ffe27a', stroke: O, sw: 3 },
    { d: 'M10 28H48Q48 44 36 46L38 58H20L22 46Q10 42 10 28Z', fill: '#ffe27a', stroke: O, sw: 3 },
    { d: 'M14 30H44', stroke: '#e6b800', sw: 3 },
  ],
  paper: [
    { d: rrect(10, 10, 34, 44, 8), fill: '#f6f3ea', stroke: O, sw: 3 },
    { d: circle(27, 32, 7), fill: '#b9a88a', stroke: O, sw: 2 },
    { d: 'M44 38H56V54H44', fill: '#f6f3ea', stroke: O, sw: 3 },
  ],
  zone: [
    { d: 'M6 6H22L16 12L24 20L20 24L12 16L6 22Z', fill: '#3bd65a', stroke: O, sw: 2.5 },
    { d: 'M58 6H42L48 12L40 20L44 24L52 16L58 22Z', fill: '#3bd65a', stroke: O, sw: 2.5 },
    { d: 'M6 58H22L16 52L24 44L20 40L12 48L6 42Z', fill: '#3bd65a', stroke: O, sw: 2.5 },
    { d: 'M58 58H42L48 52L40 44L44 40L52 48L58 42Z', fill: '#3bd65a', stroke: O, sw: 2.5 },
  ],
  bell: [
    { d: 'M10 46H54L50 40Q48 20 32 18Q16 20 14 40Z', fill: '#ffc42e', stroke: O, sw: 3 },
    { d: rrect(6, 46, 52, 8, 3), fill: '#e68600', stroke: O, sw: 3 },
    { d: circle(32, 13, 4), fill: '#ffc42e', stroke: O, sw: 2.5 },
  ],
  parking: [
    { d: rrect(6, 26, 52, 20, 7), fill: '#39a9ff', stroke: O, sw: 3 },
    { d: 'M14 26L20 14H44L50 26Z', fill: '#8fe3ff', stroke: O, sw: 3 },
    { d: circle(18, 48, 6) + circle(46, 48, 6), fill: O },
    { d: 'M8 34h6M50 34h6', stroke: '#fff3a8', sw: 4 },
  ],
  elevator: [
    { d: rrect(8, 6, 48, 52, 4), fill: '#b8c2d0', stroke: O, sw: 3 },
    { d: 'M14 14H31V52H14ZM33 14H50V52H33Z', fill: '#e8eef8', stroke: O, sw: 2.5 },
    { d: 'M58 22L63 28H53ZM58 42L63 36H53Z', fill: '#3bd65a', stroke: O, sw: 1.5 },
  ],
  menu: [{ d: 'M14 18H50M14 32H50M14 46H50', stroke: W, sw: 7 }],
  search: [
    { d: circle(27, 27, 15), fill: '#bfeaff', stroke: W, sw: 6 },
    { d: 'M38 38L54 54', stroke: W, sw: 8 },
  ],
  quests: [
    { d: rrect(12, 10, 40, 48, 6), fill: '#fff6e6', stroke: O, sw: 3 },
    { d: rrect(22, 6, 20, 10, 4), fill: '#ffb02e', stroke: O, sw: 3 },
    { d: 'M20 28L25 33L33 24M20 44L25 49L33 40', stroke: '#3bd65a', sw: 4.5 },
    { d: 'M37 30H45M37 46H45', stroke: '#a38bc9', sw: 4 },
  ],
  map: [
    { d: 'M6 14L22 8L42 14L58 8V50L42 56L22 50L6 56Z', fill: '#8fe3ff', stroke: O, sw: 3 },
    { d: 'M22 8V50M42 14V56', stroke: O, sw: 2.5 },
    { d: 'M30 20Q38 20 38 28Q38 34 30 42Q22 34 22 28Q22 20 30 20Z', fill: '#ff5a3a', stroke: O, sw: 2.5 },
    { d: circle(30, 28, 3.5), fill: W },
  ],
  trophy: [
    { d: 'M18 8H46V22Q46 38 32 40Q18 38 18 22Z', fill: '#ffc62b', stroke: O, sw: 3 },
    { d: 'M18 14H8Q8 28 20 30M46 14H56Q56 28 44 30', stroke: O, sw: 3.5, fill: 'none' },
    { d: 'M28 40H36V48H28Z', fill: '#e68600', stroke: O, sw: 2.5 },
    { d: rrect(18, 48, 28, 10, 3), fill: '#9b4dff', stroke: O, sw: 3 },
    { d: star5(32, 22, 7, 3), fill: '#fff3a8' },
  ],
  book: [
    { d: 'M8 12Q20 8 32 14Q44 8 56 12V52Q44 48 32 54Q20 48 8 52Z', fill: '#ff8a3d', stroke: O, sw: 3 },
    { d: 'M32 14V54', stroke: O, sw: 3 },
    { d: 'M14 22Q20 20 26 22M14 30Q20 28 26 30M38 22Q44 20 50 22M38 30Q44 28 50 30', stroke: '#fff3d6', sw: 3 },
  ],
  hotel: [
    { d: 'M8 26L32 8L56 26V56H8Z', fill: '#ff8a3d', stroke: O, sw: 3 },
    { d: rrect(26, 38, 12, 18, 2), fill: '#8a4b2a', stroke: O, sw: 2.5 },
    { d: rrect(14, 30, 8, 8, 2) + rrect(42, 30, 8, 8, 2), fill: '#8fe3ff', stroke: O, sw: 2.5 },
    { d: star5(32, 24, 6, 2.6), fill: '#ffd23a', stroke: O, sw: 1.5 },
  ],
  character: [
    { d: circle(32, 34, 20), fill: '#ffd0a8', stroke: O, sw: 3 },
    { d: 'M18 20Q32 4 46 20V24H18Z', fill: '#7b2ff7', stroke: O, sw: 3 },
    { d: rrect(16, 20, 32, 6, 2), fill: '#ffc933', stroke: O, sw: 2 },
    { d: circle(25, 36, 3) + circle(39, 36, 3), fill: O },
    { d: 'M27 45Q32 49 37 45', stroke: O, sw: 2.5, fill: 'none' },
  ],
  gift: [
    { d: rrect(8, 26, 48, 30, 4), fill: '#ff5fa8', stroke: O, sw: 3 },
    { d: rrect(5, 18, 54, 12, 3), fill: '#ff8fc4', stroke: O, sw: 3 },
    { d: 'M28 18H36V56H28Z', fill: '#ffd23a', stroke: O, sw: 2.5 },
    { d: 'M32 18Q20 4 16 14Q16 20 32 18Q48 20 48 14Q44 4 32 18Z', fill: '#ffd23a', stroke: O, sw: 2.5 },
  ],
  scooter: [
    { d: 'M10 46H46L50 22', stroke: '#9b4dff', sw: 6, fill: 'none' },
    { d: 'M44 18H56', stroke: O, sw: 5 },
    { d: circle(14, 48, 7) + circle(48, 48, 7), fill: '#2b1457' },
    { d: circle(14, 48, 3) + circle(48, 48, 3), fill: '#c9d1dc' },
    { d: 'M14 40L22 30H34', stroke: '#ff5fa8', sw: 5, fill: 'none' },
  ],
  helper: [
    ...personHead(28, 22, 11, '#ffd0a8', '#ffc42e'),
    { d: star5(50, 14, 9, 4), fill: '#fff3a8', stroke: O, sw: 2 },
    { d: 'M52 30L48 54', stroke: '#b98a55', sw: 4 },
  ],
  close: [{ d: 'M18 18L46 46M46 18L18 46', stroke: W, sw: 8 }],
  check: [{ d: 'M12 34L26 48L52 18', stroke: W, sw: 9, fill: 'none' }],
  lock: [
    { d: 'M20 28V20Q20 8 32 8Q44 8 44 20V28', stroke: O, sw: 6, fill: 'none' },
    { d: rrect(12, 26, 40, 30, 6), fill: '#ffc62b', stroke: O, sw: 3 },
    { d: circle(32, 40, 4), fill: O },
  ],
  crown: [
    { d: 'M8 48L4 18L20 30L32 10L44 30L60 18L56 48Z', fill: '#ffc42e', stroke: O, sw: 3 },
    { d: rrect(8, 46, 48, 10, 3), fill: '#e68600', stroke: O, sw: 3 },
    { d: circle(32, 36, 4), fill: '#e8203a' },
  ],
  key: [
    { d: circle(20, 32, 12), fill: '#ffc42e', stroke: O, sw: 3 },
    { d: circle(20, 32, 4), fill: '#fff3a8' },
    { d: 'M30 30H58V36H52V44H46V36H30Z', fill: '#ffc42e', stroke: O, sw: 3 },
  ],
  sleepy: [
    { d: circle(28, 36, 22), fill: '#ffd0a8', stroke: O, sw: 3 },
    { d: 'M16 36Q21 40 26 36M32 36Q37 40 42 36', stroke: O, sw: 3, fill: 'none' },
    { d: circle(29, 47, 3.5), fill: O },
    { d: 'M44 6H56L44 18H56', stroke: '#39a9ff', sw: 3.5, fill: 'none' },
  ],
  warning: [
    { d: 'M32 6L60 56H4Z', fill: '#ffc62b', stroke: O, sw: 3.5 },
    { d: 'M32 22V40', stroke: O, sw: 6 },
    { d: circle(32, 48, 3.5), fill: O },
  ],
  noPaper: [
    { d: circle(32, 32, 26), fill: W, stroke: '#f2303f', sw: 6 },
    { d: rrect(18, 20, 22, 26, 6), fill: '#f6f3ea', stroke: O, sw: 2.5 },
    { d: circle(29, 33, 4), fill: '#b9a88a' },
    { d: 'M14 14L50 50', stroke: '#f2303f', sw: 6 },
  ],
  noBed: [
    { d: circle(32, 32, 26), fill: W, stroke: '#f2303f', sw: 6 },
    { d: rrect(14, 26, 36, 12, 3), fill: '#4a7fe8', stroke: O, sw: 2.5 },
    { d: rrect(14, 20, 8, 22, 2), fill: '#f07b28', stroke: O, sw: 2.5 },
    { d: 'M14 14L50 50', stroke: '#f2303f', sw: 6 },
  ],
  champagne: [
    { d: 'M26 58H38V30Q38 22 34 18V8H30V18Q26 22 26 30Z', fill: '#2e8b3a', stroke: O, sw: 3 },
    { d: rrect(28, 4, 8, 7, 2), fill: '#ffc42e', stroke: O, sw: 2 },
    { d: rrect(26, 34, 12, 12, 2), fill: '#fff3a8', stroke: O, sw: 2 },
  ],
  flowers: [
    { d: 'M24 58L32 34L40 58Z', fill: '#46c97a', stroke: O, sw: 3 },
    { d: circle(22, 22, 8), fill: '#ff5fa8', stroke: O, sw: 2.5 },
    { d: circle(42, 22, 8), fill: '#ffd23a', stroke: O, sw: 2.5 },
    { d: circle(32, 14, 8), fill: '#b57bff', stroke: O, sw: 2.5 },
    { d: circle(32, 30, 7), fill: '#ff7a3d', stroke: O, sw: 2.5 },
  ],
  towel: [
    { d: rrect(8, 18, 48, 30, 6), fill: '#39a9ff', stroke: O, sw: 3 },
    { d: 'M8 28H56M8 38H56', stroke: '#8fd3ff', sw: 3 },
  ],
  coffee: [
    { d: 'M12 22H46V42Q46 54 29 54Q12 54 12 42Z', fill: W, stroke: O, sw: 3 },
    { d: 'M46 28Q56 28 56 36Q56 44 46 42', stroke: O, sw: 3, fill: 'none' },
    { d: 'M16 26H42', stroke: '#8a4b2a', sw: 4 },
    { d: 'M22 16Q20 10 24 6M32 16Q30 10 34 6', stroke: '#b8c2d0', sw: 3, fill: 'none' },
  ],
  luggage: [
    { d: rrect(12, 18, 40, 38, 6), fill: '#9b4dff', stroke: O, sw: 3 },
    { d: 'M24 18V10H40V18', stroke: O, sw: 4, fill: 'none' },
    { d: 'M22 18V56M42 18V56', stroke: '#ffc42e', sw: 4 },
  ],
  arrowL: [{ d: 'M40 10L18 32L40 54', stroke: W, sw: 8, fill: 'none' }],
  arrowR: [{ d: 'M24 10L46 32L24 54', stroke: W, sw: 8, fill: 'none' }],
  sound: [
    { d: 'M8 24H20L34 12V52L20 40H8Z', fill: W, stroke: O, sw: 3 },
    { d: 'M42 22Q50 32 42 42M48 16Q60 32 48 48', stroke: W, sw: 4, fill: 'none' },
  ],
  gear: [
    { d: 'M28 4h8l2 8 7 3 7-4 6 6-4 7 3 7 8 2v8l-8 2-3 7 4 7-6 6-7-4-7 3-2 8h-8l-2-8-7-3-7 4-6-6 4-7-3-7-8-2v-8l8-2 3-7-4-7 6-6 7 4 7-3z', fill: W, stroke: O, sw: 2.5 },
    { d: circle(32, 32, 9), fill: '#7b2ff7' },
  ],
  thumb: [
    { d: 'M14 28H24V56H14Z', fill: '#39a9ff', stroke: O, sw: 3 },
    { d: 'M24 30L34 10Q40 10 40 18L38 26H52Q58 28 56 34L52 52Q50 56 46 56H24Z', fill: '#ffd0a8', stroke: O, sw: 3 },
  ],
  sparkle: [{ d: 'M32 4L38 26L60 32L38 38L32 60L26 38L4 32L26 26Z', fill: '#fff3a8', stroke: O, sw: 2.5 }],
  broom: [
    { d: 'M44 6L30 34', stroke: '#b98a55', sw: 5 },
    { d: 'M22 30L38 38L30 58L10 50Z', fill: '#ffc42e', stroke: O, sw: 3 },
    { d: 'M16 50L20 42M22 53L26 44M28 55L31 47', stroke: '#e68600', sw: 2.5 },
  ],
};

/** Zusammengesetzte Plate-/UI-Icons */
ICONS.bedPlus = [...ICONS.bed, ...plus(50, 14, 10)];
ICONS.bedUp = [...ICONS.bed, ...arrowUp(50, 14, 10)];
ICONS.cleanerPlus = [...ICONS.cleaner, ...plus(12, 8, 8)];
ICONS.cleanerSpeed = [...ICONS.cleaner.map((p) => ({ ...p })), { d: 'M2 44h8M0 52h9', stroke: '#39a9ff', sw: 4 }, ...arrowUp(12, 10, 8)];
ICONS.receptionPlus = [...ICONS.receptionist, ...plus(12, 10, 8)];
ICONS.receptionSpeed = [...ICONS.receptionist, ...arrowUp(12, 10, 8)];
ICONS.supplierPlus = [...ICONS.supplier, ...plus(52, 12, 8)];
ICONS.supplierSpeed = [...ICONS.supplier, ...arrowUp(52, 12, 8)];
ICONS.supplierCarry = [...ICONS.supplier, ...arrowUp(52, 12, 8, '#ffb02e')];
ICONS.parkerPlus = [...ICONS.parker, ...plus(52, 12, 8)];
ICONS.wcPlus = [...ICONS.wc, ...plus(52, 12, 9)];
ICONS.desk2 = [...ICONS.bell, ...plus(52, 12, 9)];

export function svg(name: string, cls = ''): string {
  const parts = ICONS[name] ?? ICONS.star;
  let s = `<svg viewBox="0 0 64 64" class="${cls}" aria-hidden="true">`;
  for (const p of parts) {
    s += `<path d="${p.d}" fill="${p.fill ?? 'none'}"${p.stroke ? ` stroke="${p.stroke}" stroke-width="${p.sw ?? 2}" stroke-linejoin="round" stroke-linecap="round"` : ''}/>`;
  }
  return s + '</svg>';
}

const pathCache = new Map<string, Path2D>();
function path(d: string): Path2D {
  let p = pathCache.get(d);
  if (!p) {
    p = new Path2D(d);
    pathCache.set(d, p);
  }
  return p;
}

/** Icon auf Canvas zeichnen (Kaufplatten, Schilder) */
export function drawIcon(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, size: number) {
  const parts = ICONS[name] ?? ICONS.star;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 64, size / 64);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const p of parts) {
    const pp = path(p.d);
    if (p.fill && p.fill !== 'none') {
      ctx.fillStyle = p.fill;
      ctx.fill(pp);
    }
    if (p.stroke) {
      ctx.strokeStyle = p.stroke;
      ctx.lineWidth = p.sw ?? 2;
      ctx.stroke(pp);
    }
  }
  ctx.restore();
}
