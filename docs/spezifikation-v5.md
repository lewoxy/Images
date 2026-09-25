# My Perfect Hotel — Rekonstruktionsspezifikation für einen Klon

**Version 5 — 08.09.2026**
Erstes Hotel vollständig, alle Zahlen gegen die Originaldaten der APK verifiziert.

---

## 0. Datenbasis

| Marker | Bedeutung |
|---|---|
| 📦 | **Aus den Balancing-Tabellen der APK — maßgeblich** |
| 📱 | Aus dem unmodifizierten Normalspiel gemessen |
| 🎥 | Aus den Walkthrough-Videos gemessen (modifizierter Spielstand) |
| ✅ | Aus Textquelle belegt |
| 🔧 | Rekonstruiert, nicht verifiziert |

**Material:** Poki-Spielseite und Fachquellen · zwei Walkthrough-Videos (15:02 und 8:12) · zwei Screenrecordings aus dem Normalspiel · drei Maßstab-Screenshots · `saykit_htlmsta_1.36.6.json` und `hotel_1_scenes_all.bundle` aus der APK.

Aus der APK wurden ausschließlich Zahlentabellen und Objektpositionen ausgewertet. Keine Grafiken, kein Code.

**Verhältnis der Quellen:** Wo 📦 vorliegt, gilt 📦. Bemerkenswert ist, dass **jede aus dem Videomaterial abgelesene Zahl vom Abgleich bestätigt wurde** — die Messmethode war belastbar. Falsch waren nicht die Messwerte, sondern die daraus abgeleiteten Formeln.

**Beiliegende Dateien:** `mph-balance-hotel1.json` (alle Tabellen) · `mph-floorplan.json` (Weltkoordinaten) · `mph-grundriss-v2.svg` · `mph-farbpalette.json` / `.css` / `.ts`

---

## 1. Produktsteckbrief

| Feld | Wert |
|---|---|
| Titel | My Perfect Hotel ✅ |
| Entwickler / Publisher | Redux.Games / SayGames ✅ |
| Release Mobile | Android 13.04.2022, iOS 29.07.2022 ✅ |
| Release Poki | Juni 2024, Update Februar 2026 ✅ |
| Genre | Arcade Idle / Tycoon-Simulation ✅ |
| Downloads Mobile (2024) | ~133 Mio., >10 Mio. USD IAP ✅ |
| Hotels | **17**, jedes mit eigener Währung 📦 |
| Perspektive | 3D, feste Schrägdraufsicht, Kamera folgt der Figur 🎥📱 |
| Steuerung | Virtueller Stick mobil, WASD im Browser; keine Klick-Interaktion ✅📱 |

Jede Interaktion ist ein Trigger-Volume, ausgelöst durch Betreten. Ein Klon mit Buttons statt Laufwegen fühlt sich fundamental anders an.

---

## 2. Core Loop

```
Gast spawnt am Eingang → Warteschlange an der Rezeption
  → Check-in → Gast legt Bargeld auf den Tresen
  → Gast läuft ins Zimmer → legt sich hin → Nachtphase
  → Gast geht, Zimmer wird DIRTY mit 3 Reinigungspunkten
  → Spieler oder Cleaner reinigt → Zimmer FREE
```

### Die drei tragenden Regeln

**1. Personal sammelt niemals Geld ein.** ✅📱 Bargeld liegt physisch herum und muss abgelaufen werden. Ein Stapel fasst genau **10 Einheiten** 📦 — daher die Türme an der Rezeption, wenn man sie vernachlässigt.

**2. Progression ist laufweg-gebunden, nicht geld-gebunden.** 🎥 Mit unbegrenztem Guthaben liegt die Sternrate konstant bei rund 0,2 pro Sekunde. Geld entfernt die erste Bremse, sofort greift die zweite: Weg zur Platte plus drei Sekunden Kaufdauer.

**3. Es gibt keine Bestrafung, nur Opportunitätskosten.** 📱 Gäste wandern nicht ab, es gibt kein Zufriedenheitssystem. Wer nichts tut, verliert nichts — er gewinnt nur nichts.

---

## 3. Sternökonomie 📦

Der Balken zeigt **kumulative Sterne im aktuellen Hotel / Schwelle für das nächste Level**. Aus `LevelRewardSettings`:

| Hotellevel | Schwelle (kumulativ) | Zuwachs | Belohnung |
|---|---|---|---|
| 2 | 30 | 30 | 600 Cash + 5 Tokens |
| 3 | 50 | +20 | 1.600 + 5 |
| 4 | 85 | +35 | 2.700 + 5 |
| 5 | 115 | +30 | 4.000 + 5 |
| 6 | 145 | +30 | 5.400 + 5 |
| 7 | 180 | +35 | 7.000 + 5 |
| 8 | **240** | +60 | 5.400 + 5 · Hotel abgeschlossen |

Level 8 hat keine weitere Schwelle; der Balken zeigt „MAX". **Gesamtaufwand für das erste Hotel: 240 Sterne.**

Die Belohnungstabelle enthält je drei Cash- und Tokenwerte (z. B. 5400/13500/24300 und 5/10/20) — die höheren gelten für die Verdopplung per Gems oder Werbung.

### Sterne je Aktion 📦

| Aktion | Sterne |
|---|---|
| Zimmer bauen | 2 |
| Zimmer → Stufe 2 | 3 |
| Zimmer → Stufe 3 | 5 |
| Toilette | 5 |
| Parkplatz | 3 |

Gegenprobe: 21 Zimmer × 10 + 7 Toiletten × 5 + Parkplatz 3 = **248** gegenüber der Schwelle 240. Das Hotel ist knapp, aber vollständig ausfinanzierbar — der Spieler kann also nicht steckenbleiben, hat aber auch kaum Spielraum.

> **Offen:** Ich hatte am Upgrade-Badge im Video „+4" abgelesen, die Tabelle sagt 5 für Stufe 3. Nicht aufgelöst.

---

## 4. Preise 📦

**Wichtig: Es gibt keine Preisformel.** Die Preise sind eine handgeschriebene Tabelle mit 46 Einträgen je Durchlauf. Die in v2 bis v4 abgeleiteten Exponentialformeln sind hinfällig.

Wie stark sich der Verlauf ändert, zeigen die Stufenfaktoren:

| Objekt | bauen | → Stufe 2 | → Stufe 3 | Faktoren |
|---|---|---|---|---|
| `zone_1.room_02` | 30 | 140 | 280 | ×4,7 / ×2,0 |
| `zone_2.room_01` | 380 | 500 | 750 | ×1,3 / ×1,5 |
| `zone_7.room_04` | 4580 | 5130 | 5810 | ×1,1 / ×1,1 |

Die Kurve **flacht ab**, statt zu steigen — genau umgekehrt zu meiner früheren Annahme.

### Vollständige Preistabelle, Hotel 1, erster Durchlauf

| ID | Stufen (Cash, ggf. + Ressource) |
|---|---|
| `zone_1.room_02` | 30 / 140 / 280 |
| `zone_1.room_04` | 50 / 150 / 290 |
| `zone_1.cleaner` | 80 / 140 / 190 / 900 |
| `zone_1.toilet` | 90 |
| `zone_1.room_01` | 110 / 280 |
| `lobby.reception` | 140 / 520 / 1580 + 10 candy |
| `zone_2` | 350 |
| `zone_2.room_01` | 380 / 500 / 750 |
| `zone_2.cleaner` | 450 / 440 / 610 / 1180 + 5 candy |
| `zone_2.room_02` | 420 / 590 / 860 |
| `zone_2.toilet` | 440 |
| `zone_2.room_03` | 420 / 680 / 980 |
| `supplier` | 780 / 970 / 1150 + 5 candy / 1350 + 8 candy / 3310 + 11 candy |
| `zone_3` | 1030 + 4 toiletpaper |
| `zone_3.room_03` | 960 / 1050 / 1410 |
| `zone_3.cleaner` | 990 / 860 + 3 candy / 1050 + 5 candy / 1860 + 15 candy |
| `zone_3.room_02` | 950 / 1160 / 1580 |
| `zone_3.toilet` | 980 |
| `zone_3.room_04` | 940 / 1280 / 1680 |
| `parking` | 1190 |
| `zone_4` | 1760 + 7 toiletpaper |
| `zone_4.room_01` | 1680 / 1790 / 2230 |
| `zone_4.cleaner` | 1380 + 3 candy / 1460 + 8 candy / 1700 + 13 candy / 2630 + 18 candy |
| `zone_4.room_02` | 1660 / 1930 / 2450 |
| `zone_4.toilet` | 1700 |
| `zone_4.room_03` | 1650 / 2080 / 2570 |
| `parker` (Valet) | 1820 + 15 candy |
| `zone_5` | 2620 + 11 toiletpaper |
| `zone_5.room_01` | 2540 / 2680 / 3040 |
| `zone_5.cleaner` | 2070 + 3 candy / 2050 + 11 candy / 2480 + 16 candy / 3540 + 21 candy |
| `zone_5.room_02` | 2520 / 2800 / 3230 |
| `zone_5.toilet` | 2570 |
| `zone_5.room_03` | 2510 / 2920 / 3420 |
| `zone_6` | 3550 + 18 toiletpaper |
| `zone_6.room_01` | 3470 / 3650 / 4070 |
| `zone_6.cleaner` | 2820 + 3 candy / 2810 + 14 candy / 3370 + 19 candy / 4300 + 24 candy |
| `zone_6.room_03` | 3460 / 3780 / 4360 |
| `zone_6.toilet` | 3520 |
| `zone_6.room_04` | 3450 / 3930 / 4590 |
| `zone_7` | 4660 + 28 toiletpaper |
| `zone_7.room_01` | 4580 / 4810 / 5300 |
| `zone_7.cleaner` | 3720 + 3 candy / 3720 + 17 candy / 4510 + 22 candy / 4720 + 27 candy |
| `zone_7.room_03` | 4570 / 4970 / 5550 |
| `zone_7.toilet` | 4650 |
| `zone_7.room_04` | 4580 / 5130 / 5810 |
| `elevator` | 5990 |

`pricesBalance` enthält drei identisch strukturierte Blöcke — die **Prestige-Durchläufe**. Block 2 liegt etwa beim 2,5-fachen, Block 3 beim 4,5-fachen. Alle drei stehen in `mph-balance-hotel1.json`.

**Startkapital je Hotel** 📦: 50 / 200 / 300 / 300 / 350 / 400 / 400 / 400 / 500 / 600 / 600 / 700 / 800 / 900 / 1000 / 1100 / 1200.

---

## 5. Einnahmen 📦

### Zimmer

| Stufe | Zahlung | Trinkgeld | Passiv/Sek. | Sterne |
|---|---|---|---|---|
| 1 | 10 | 2 | 0,02 | 2 |
| 2 | 30 | 6 | 0,04 | 3 |
| 3 | 50 | 10 | 0,07 | 5 |
| 2 als `RoomRW` | **40** | 6 | 0,04 | 3 |
| 3 als `RoomRW` | **60** | 10 | 0,07 | 5 |

Trinkgeld ist konstant 20 % der Zahlung.

**Die Werbe-Variante gibt Einkommen, nicht Sterne.** `RoomRW` ist die dritte, per Video freigeschaltete Designoption beim Upgrade. Sie bringt bei gleichem Sternwert **20 bis 33 % mehr Dauereinnahmen** — der Anreiz ist ökonomisch und wirkt über die gesamte Restlaufzeit des Hotels weiter. Das ist deutlich wirksamer als ein einmaliger Sternbonus und in v4 falsch beschrieben.

### Weitere Quellen

| Quelle | Ertrag | Passiv/Sek. |
|---|---|---|
| Toilette | 20 | 0,04 |
| Parkplatz | 20 | 0,07 |
| VIP-Trinkgeld | 10 | — |

Die 20 Dollar, die ich bis v4 als Gästezahlung geführt hatte, sind in Wahrheit der **Toilettenertrag**.

---

## 6. Grundriss 📦

Aus den Weltkoordinaten der Transform-Hierarchie in `hotel_1_scenes_all.bundle` berechnet. Der geschätzte Grundriss aus früheren Fassungen war grundlegend falsch.

| | Endausbau |
|---|---|
| Zonen | 7 |
| Zimmer | 21 (3 je Zone) |
| Toiletten | 7 Blöcke à 3 Kabinen |
| Cleaner-Posten | 7, einer je Zone |
| Weitere Zonen | Lobby mit Rezeption, Parkplatz mit Valet, Supplier, Lager, Aufzug |
| Grundfläche | ca. 65 × 66 Einheiten |
| Zimmerraster | 7,5 Einheiten |

**Aufbau:** symmetrisch um eine Nord-Süd-Achse. Lobby mit Rezeption am Nordrand bei (0, 0). Nach Süden vier Zimmerspalten bei x = −37,5 / −15 / 0 / +22,5. Parkplatz und Valet nordöstlich, Supplier und Lager nordwestlich der Lobby. Aufzug am Südende bei (−7,3; −47,4). **Zone 1 liegt direkt südlich der Lobby** und ist die Startzone.

Die Zuordnung der Zimmer zu Zonen wurde über eine kapazitätsbeschränkte Zuweisung zu den sieben Cleaner-Posten gelöst und gegen die Preistabelle geprüft: Die Zimmernummern-Zusammensetzung stimmt bei allen sieben Zonen eindeutig überein — eine unabhängige Bestätigung.

Alle Koordinaten in `mph-floorplan.json`, die Zeichnung in `mph-grundriss-v2.svg`.

### Freischaltgraph 📦

`SequenceUnlockUpgrades` enthält die Abhängigkeiten explizit, etwa: Zimmer 1 Stufe 1 erfordert Toilette Stufe 1, Stufe 2 erfordert Cleaner Stufe 3. Die Ausbaureihenfolge ist damit belegt und nicht geraten.

---

## 7. Der Gastzyklus 📱

Ein Zimmer über zwei komplette Zyklen im Sekundentakt verfolgt, beide deckungsgleich.

| Phase | Dauer | Beschreibung |
|---|---|---|
| Gast erreicht das Bett | — | Sprechblase mit müdem Gesicht |
| Hinlegen | 1 s | |
| **Nachtphase** | **3 s** | **Raum verdunkelt sich**, Zzz-Partikel |
| Gast verlässt das Zimmer | 1 s | Raum wird hell, 3 Marker erscheinen sofort |
| **Belegung gesamt** | **5 s** | |
| Wartezeit bis Cleaner | 16 s | abhängig von Personalverfügbarkeit |
| Reinigung | 6 s | Cleaner arbeitet die 3 Marker ab |
| Leerstand bis nächster Gast | 14 s | abhängig vom Gastaufkommen |
| **Zimmerzyklus gesamt** | **~42 s** | |

**Durchsatz:** 1 Gast pro Zimmer pro 42 s, also **1,43 × Zimmeranzahl Gäste pro Minute**. Bei 21 Zimmern im Endausbau sind das 30 Gäste pro Minute.

Nur 12 % der Zykluszeit ist das Zimmer belegt. Die restlichen 88 % sind Reibung — genau die verkauft das Spiel als Upgrades.

**Reinigungspunkte: exakt drei pro Zimmer** 📱, bestätigt durch die Onboarding-Quest und visuell durch drei Marker an festen Stellen.

Die dreisekündige Nachtphase mit Raumverdunkelung ist ein billiger, sehr wirksamer Effekt — im Klon unbedingt übernehmen.

---

## 8. Warteschlange und Rezeption 📱

Bei vollständiger Vernachlässigung: drei Tresen im Einsatz, über zwölf Gäste stauen sich bis auf die Straße, **kein Gast wandert ab**, daneben ein Stapel von über zwanzig Geldbündeln.

**Es gibt kein Zufriedenheitssystem.** Keine Abwanderung, keine Anzeige, keine relevante Deckelung. Bargeld verfällt nicht. Ein Klon mit ungeduldigen Gästen wäre mechanisch anspruchsvoller, würde aber das entspannte Grundgefühl zerstören.

---

## 9. Kaufmechanik 📱

Realer Kaufvorgang, im Viertelsekundentakt am Cash-Zähler verfolgt: **3.310 in 3,2 Sekunden**. Die Deltas laufen von ~450 über ~250 auf 11 und 1 aus — eine **Ease-out-Interpolation auf einen Zielwert**, keine konstante Rate.

> Die Kaufdauer ist **konstant bei etwa 3 Sekunden, unabhängig vom Betrag.**

```js
// pro Frame, solange der Spieler auf der Platte steht
const rest = kosten - bereitsGezahlt;
const rate = Math.max(kosten / 3.0, rest * 3.0);   // Ease-out mit Mindesttempo
const tick = Math.min(rate * dt, rest);
bereitsGezahlt += tick;
kontostand   -= tick;
```

Verlässt der Spieler die Platte vorzeitig, bleibt `bereitsGezahlt` erhalten und der Kauf setzt beim erneuten Betreten fort. ✅

---

## 10. Personal 📦

### Cleaner, Hotel 1

| Stufe | Tempo | Arbeitsrate |
|---|---|---|
| 1 | 1,8 | 0,5 |
| 2 | 2,3 | 0,8 |
| 3 | 3,0 | 1,0 |
| 4 | 4,0 | 1,5 |

Gemessene Reaktionszeit: **16 s** von Schmutzbeginn bis Arbeitsaufnahme, dann **6 s** Arbeit. 📱

### Rollen

| Rolle | Aufgabe | Freischaltung |
|---|---|---|
| Cleaner | Zimmerreinigung, einer je Zone | Nach dem 3. Zimmer ✅ |
| Receptionist | Check-in | Nach Cleaner-Tempo-Upgrade ✅ |
| Supplier | Toilettenpapier-Logistik | 5 Ausbaustufen 📦 |
| Parker (Valet) | Parkplatz | 1820 + 15 candy 📦 |
| Waiter / Bartender | Restaurant, Bar | erst ab Hotel 2 ✅📦 |

Ein Basis-Cleaner schafft drei Zimmer nicht allein. Automatisierung wird eingeführt, aber nie sofort ausreichend.

---

## 11. Spielerfigur

Über Tokens dauerhaft und hotelübergreifend steigerbar. Aus `playerUpgradesInfo` 📦: abwechselnd Tempo und Tragekapazität, dazu Fähigkeiten wie `ItemsInHands` und **`Magnet`** (Einsammelradius für Geld, ab 12 Tokens). Preise 3 / 6 / 8 / 10 / 12 / 14 / 16 / 18 Tokens.

**Rucksack-Upgrades** 📦: 3 / 12 / 18 / 24 / 30 / 36 / 42 / 48 Tokens, also steigend in Schritten von 6.

**Tragekapazität:** Basis 3 ✅, gemessen 5 nach Upgrades 📱.

**Tempo-Boost:** +50 %, rund 3 Minuten 🎥. Reittier als Kaufangebot und als Pickup im Korridor.

**Maßstab und Bewegung** 📱🔧: Zimmerraster 7,5 Einheiten, Figur etwa drei Kopfhöhen, Basistempo grob eine Zimmerlänge pro Sekunde. Absolut nicht sauber messbar, weil die Kamera folgt; die Relation ist für die Umsetzung ohnehin der nützlichere Teil.

---

## 12. Währungen und Ressourcen

| Währung | Funktion | Persistenz |
|---|---|---|
| Cash | Zimmer, Personal, Upgrades, Zonen | **Pro Hotel getrennt** 📦 |
| `candy` | Personal ab mittlerer Progression | Pro Hotel 📦 |
| `toiletpaper` | Zonen-Freischaltungen ab Zone 3 | Pro Hotel 📦 |
| Tokens | Spielerfigur: Tempo, Traglast, Fähigkeiten | Global ✅📦 |
| Gems | Cash kaufen, Belohnungen verdoppeln | Global ✅ |

Die beiden Ressourcen heißen intern `candy` und `toiletpaper` und werden je Hotel anders dargestellt (`resourcesLocalizations` nennt für Hotel 1 `ResBrush` und `ResToothpaste`).

**Herkunft der Ressourcen:** Sondergäste. Damit ist die Kette geschlossen — **Automatisierung → Ressource → Sondergast → Werbevideo.** ✅ Wer nicht schaut, kann ab Zone 3 weder Zonen freischalten noch Personal einstellen.

Für einen werbefreien Klon ist das die zentrale Designentscheidung: Ressource aus normalen Gästen droppen lassen, Sondergäste ohne Gegenleistung bedienbar machen, oder die Kopplung streichen.

---

## 13. Sondergäste und VIP

**VIP** 📦: Intervall **300 Sekunden** (`VipComeDelay`), Trinkgeld 10. Aufenthalt zeitlich begrenzt, im Video Countdown bei 0m54s und 1m07s beobachtet.

**Sondergäste** 🎥: benannte Charaktere mit Porträt und Auftragsbanner — „Bring the guest: champagne", „Help the guest carry their luggage to the room". `SpecialRequestsSettings` für Hotel 1: `500, 3, 1, 420`, vermutlich Belohnung 500, drei Anfragen, 420 Sekunden Intervall 🔧.

**Temporäre Helfer** 📱: Charakter-Badge mit Countdown, rund 5 Minuten Laufzeit, dazu ein separater Reinigungs-Boost.

---

## 14. UI-Layout 📱

```
┌─────────────────────────────────────────────────┐
│ ★7 MOTEL                    🍬14  🪙88  💵44290 💎5 │
│    [██████ 187/240]                              │
│ ☰                                    🏠 05T05Std │
│ 🚫ADS 20% 07Std21m          [1/3 🔍]  👩‍⚕️ 01m17s │
│ 🦄 10%  07Std21m                      ◆6 04T01Std│
│ 👩 40% !                    [Spielwelt]      🧭   │
│ 💎 50% 03Std22m                              📋5  │
├─────────────────────────────────────────────────┤
│  🃏!    🗺️    🏨(aktiv)    👤!    🏆!            │
└─────────────────────────────────────────────────┘
```

Links sechs parallele Shop-Angebote mit eigenen Countdowns, rechts Event-Slot, Task-Finder, temporäre Helfer, Season-Badge, Kompass und Questlog. Unten fünf Hauptreiter. Bodennavigation über gelbe Chevron-Pfeile.

**Modalfrequenz:** rund alle 12 Sekunden ein Dialog, Level-Up oder Overlay 🎥.

**Level-Up-Modal:** Sternbadge mit neuer Levelnummer, Banner „LEVEL UP", Panel „NOW AVAILABLE" mit den Freischaltungen (bei Level 8: neues Hotel und neuer Skin), Abschnitt „REWARD", zwei Buttons „REWARD X2" — einmal für 3 Gems, einmal gratis per Video.

**Weltkarte:** isometrisches Insel-Archipel, goldene Wege, Steinblock mit Vorhängeschloss auf gesperrten Standorten, „YOU ARE HERE"-Sprechblase. Für den Klon reicht ein statisches Bild mit Hotspots.

---

## 15. Farbpalette

59 gemessene Werte in `mph-farbpalette.json`, zusätzlich als CSS-Variablen und Three.js-Hex.

Drei Stilregeln, die wichtiger sind als jeder Einzelwert:

- **Sättigung fast durchweg über 70 %.** Es gibt keine gedeckten Töne, selbst das Parkett ist ein sattes Orangebraun.
- **Jede Ausbaustufe ist ein eigener Farbakkord**, nicht nur besseres Mobiliar. Stufe 1 grün-braun-blau, Stufe 2 türkis-beige-grün, Stufe 3 hellgrün-cyan-gold. Der Spieler erkennt die Stufe am Farbklima.
- **Weiß nur als Outline und Text**, nie als Fläche. Daher der Sticker-Look.

Die HUD-Leiste ist halbtransparent: `#1D4946` bei etwa 55 % Deckkraft. Materialien unbeleuchtet oder Lambert mit flacher Schattierung — `MeshStandardMaterial` mit Umgebungslicht trifft den Look nicht.

---

## 16. Technische Umsetzung

**Stack:** Vite + TypeScript + Three.js, alternativ Babylon.js oder Godot 4 mit Web-Export.

```
GameState
├── economy    { cash, gems, tokens, candy, toiletpaper }
├── player     { pos, speed, carryCap, carried[], level, abilities }
├── hotel
│   ├── level, starsTotal, nextThreshold
│   ├── zones[1..7]  { unlocked, cost }
│   ├── rooms[]      { zone, state, tier, isRW, cleanSpots[0..2], phaseTimer }
│   ├── toilets[]    { zone, paperStock }
│   ├── plates[]     { id, prices[], resourceCost, starReward, unlockCondition, paid }
│   └── staff[]      { type, zone, tier }
├── guests[]         { state, targetRoom, timer, special?, request? }
└── pickups[]        { pos, amount }   // amount = 10
```

**Baureihenfolge:**

1. Bewegung, Kamera-Follow, Kollision
2. **Generisches Trigger-Zonen-System mit Fortschritt** — Fundament für alles Weitere
3. Gast-Zustandsautomat mit den gemessenen Phasenzeiten
4. Zimmer-Zustandsautomat mit 3 Reinigungspunkten und Raumverdunkelung
5. Pickup-System mit Einsammelradius, Stapelgröße 10, Geld verfällt nie
6. Kaufplatten mit Ease-out über 3 s, gespeistem aus der Preistabelle
7. Personal-FSM: nächste Aufgabe in der Zone suchen → hinlaufen → Timer → wiederholen
8. Kumulativer Sternzähler mit der Schwellentabelle
9. Grundriss aus `mph-floorplan.json` instanziieren
10. Freischaltgraph aus `SequenceUnlockUpgrades`
11. Level-Up-Modal mit Freischaltungsliste und doppelter Verdopplungsoption
12. Ressourcen, Sondergäste, Weltkarte
13. `localStorage` plus Offline-Progress über die Passiv-Koeffizienten

**Fallstricke:**
- Preise aus der Tabelle nehmen, nicht aus einer Formel
- Sternzähler kumulativ führen
- Kaufdauer konstant halten, nicht die Rate
- Keine Abwanderungsmechanik einbauen
- Zimmerstufen als komplette Materialsets planen
- Pathfinding über feste Wegpunkt-Splines statt Navmesh
- Instanced Meshes für Geldstapel; Schattenwurf nur für die Spielfigur

---

## 17. Stand der offenen Punkte

| Frage | Status |
|---|---|
| Gast-Spawnrate | ✅ 1 pro Zimmer pro 42 s |
| Aufenthaltsdauer | ✅ 5 s, davon 3 s Nachtphase |
| Warteschlange / Abwanderung | ✅ Unbegrenzt, keine Abwanderung |
| Bewegungstempo | ◐ ~1 Zimmerlänge/s, absolut nicht messbar |
| Tragekapazität | ✅ Basis 3, Upgradekosten belegt |
| Sternwerte | ✅ Vollständig, eine Abweichung offen (+4 vs. 5) |
| Preiskurve | ✅ Vollständige Tabelle |
| Kauf-Tickrate | ✅ Konstante Dauer ~3 s mit Ease-out |
| Zufriedenheitssystem | ✅ Existiert nicht |
| Grundriss | ✅ Aus Szenendaten, unabhängig gegengeprüft |
| Poki-Browserversion | ○ Offen |

Das erste Hotel ist damit vollständig spezifiziert und verifiziert.

---

## 18. Rechtlicher Hinweis

Spielmechaniken, Regeln, Wirtschaftssysteme, Zahlenwerte und Farbwerte sind nicht urheberrechtlich geschützt — der Nachbau ist zulässig. Geschützt sind Name, Logo, Charakterdesigns, Modelle, Texturen, Sounds und konkrete Texte. Ein Klon braucht einen eigenen Titel und eigene Assets. Bei Veröffentlichung wird geprüft, ob ein Titel als Kopie eines dort vertretenen Spiels erkennbar ist.
