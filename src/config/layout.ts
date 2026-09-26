/**
 * Lokale Einrichtungspläne für Zimmer und Toilettenblöcke.
 * Koordinaten (u, v): v zeigt zur Tür (Flurseite), u quer dazu. Innenmaß ±3,6 m
 * (Zelle 7,5 m, Wand 0,3 m). Umrechnung in Weltkoordinaten: floorplan.cellLocal().
 *
 * Möbel sind wie im Original gegenüber der Architektur überdimensioniert
 * (Stilhandbuch §2: Bett 2,8 × 3,0 m, „alles etwa 1,5-fach über Realmaß“).
 */
import { DOOR_U } from './floorplan.ts';

export const IN = 3.6;

export const ROOM = {
  /** Bettmitte; Kopfteil an der Rückwand, Längsachse entlang v */
  bed: { u: -1.05, v: -2.05, w: 2.8, l: 3.0 },
  nightL: { u: -3.02, v: -3.2 },
  nightR: { u: 0.95, v: -3.2 },
  rug: { u: -1.05, v: 0.3, w: 3.4, d: 2.0 },
  dresser: { u: 3.18, v: -1.35 },
  plant: { u: 3.0, v: -3.05 },
  window: { u: 2.2, w: 1.7 },
  armchair: { u: 2.55, v: 0.75 },
  clock: { u: -3.12, v: 2.95 },
  picture: { u: -IN, v: -0.2 },
  /** 📱 exakt drei Reinigungspunkte an festen Stellen */
  spots: [
    { u: -1.05, v: -1.75, y: 0.98, stand: { u: -1.1, v: 0.35 }, trig: { u: -1.2, v: 0.25 }, r: 1.1 },
    { u: 2.4, v: -0.45, y: 0.02, stand: { u: 1.7, v: -0.25 }, trig: { u: 2.4, v: -0.45 }, r: 1.05 },
    { u: -2.5, v: 1.3, y: 0.02, stand: { u: -1.7, v: 1.25 }, trig: { u: -2.5, v: 1.3 }, r: 1.05 },
  ],
  tip: { u: -2.45, v: 2.85 },
  drop: { u: 0.6, v: -0.1 },
  plate: { u: 0.55, v: 1.95, size: 2.2 },
  buildPlate: { u: 0, v: 0, size: 3.0 },
  entry: { u: DOOR_U, v: 2.2 },
  doorIn: { u: DOOR_U, v: 3.3 },
  doorOut: { u: DOOR_U, v: 4.95 },
  /** Wo ein Gast vor dem Hinlegen steht */
  bedSide: { u: 0.75, v: -0.35 },
};

export const WC = {
  stalls: [-2.35, 0, 2.35],
  toiletV: -3.1,
  sitV: -2.75,
  stallEntryV: -1.2,
  partitions: [-1.175, 1.175],
  sinks: [
    { u: -3.15, v: 0.35 },
    { u: -3.15, v: 1.6 },
  ],
  paper: { u: 2.75, v: 1.85 },
  money: { u: -1.4, v: 2.6 },
  queue: [
    { u: 0.1, v: 0.35 },
    { u: -0.25, v: 1.45 },
    { u: 0.3, v: 2.55 },
  ],
  doorU: 0,
  doorW: 2.0,
  doorOut: { u: 0, v: 4.95 },
  doorIn: { u: 0, v: 3.3 },
  buildPlate: { u: 0, v: 0, size: 3.0 },
};
