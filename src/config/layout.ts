/**
 * Lokale Einrichtungspläne für Zimmer und Toilettenblöcke.
 * Koordinaten (u, v): u entlang +x, v zeigt zur Tür (Flurseite). Innenmaß ±3,5.
 * Umrechnung in Weltkoordinaten: floorplan.cellLocal().
 */
import { DOOR_U } from './floorplan.ts';

export const ROOM = {
  bed: { u: -1.95, v: -0.55 },
  night: { u: -3.05, v: -2.35 },
  rug: { u: -1.7, v: -0.55, w: 3.6, d: 3.0 },
  dresser: { u: 3.02, v: -1.85 },
  plant: { u: 2.95, v: -3.0 },
  armchair: { u: 1.1, v: -2.65 },
  lamp: { u: -3.05, v: 1.35 },
  picture: { u: -3.46, v: 2.2 },
  /** 📱 exakt drei Reinigungspunkte an festen Stellen */
  spots: [
    { u: -1.7, v: -0.45, y: 0.78, stand: { u: -0.05, v: -0.55 }, trig: { u: -0.35, v: -0.55 }, r: 1.25 },
    { u: 1.05, v: -2.25, y: 0.02, stand: { u: 1.0, v: -1.45 }, trig: { u: 1.05, v: -2.25 }, r: 1.05 },
    { u: -1.15, v: 2.2, y: 0.02, stand: { u: -0.4, v: 1.75 }, trig: { u: -1.15, v: 2.2 }, r: 1.05 },
  ],
  tip: { u: 0.35, v: 1.25 },
  drop: { u: 0.9, v: -0.6 },
  plate: { u: 2.35, v: 1.7, size: 2.3 },
  buildPlate: { u: 0, v: 0, size: 3.0 },
  entry: { u: DOOR_U, v: 2.5 },
  doorIn: { u: DOOR_U, v: 3.3 },
  doorOut: { u: DOOR_U, v: 4.8 },
  /** Wo ein Gast vor dem Hinlegen steht */
  bedSide: { u: -0.35, v: 0.95 },
};

export const WC = {
  stalls: [-2.33, 0, 2.33],
  toiletV: -2.95,
  sitV: -2.62,
  stallEntryV: -1.25,
  partitions: [-1.165, 1.165],
  sinks: [
    { u: -3.05, v: 0.3 },
    { u: -3.05, v: 1.55 },
  ],
  paper: { u: 2.65, v: 1.8 },
  money: { u: -1.4, v: 2.45 },
  queue: [
    { u: 0.1, v: 0.35 },
    { u: -0.25, v: 1.45 },
    { u: 0.3, v: 2.55 },
  ],
  doorU: 0,
  doorW: 2.0,
  doorOut: { u: 0, v: 4.8 },
  doorIn: { u: 0, v: 3.2 },
  buildPlate: { u: 0, v: 0, size: 3.0 },
};
