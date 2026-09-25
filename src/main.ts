import './ui/styles.css';
import { Game } from './game/game';

/** Einstieg: Schriften laden, Spiel aufbauen, Schleife starten. */

const fill = document.querySelector<HTMLElement>('.load-fill');
const setLoad = (p: number) => {
  if (fill) fill.style.width = `${Math.round(p * 100)}%`;
};

async function boot() {
  setLoad(0.15);
  try {
    await Promise.race([
      Promise.all([document.fonts.load('40px "Lilita One"'), document.fonts.load('500 16px "Fredoka"'), document.fonts.load('700 16px "Fredoka"')]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch {
    /* Schriften optional */
  }
  setLoad(0.45);
  await new Promise((r) => requestAnimationFrame(r));
  let game: Game;
  try {
    game = new Game();
  } catch (e) {
    const t = document.querySelector('.load-text');
    if (t) t.textContent = 'Fehler beim Start: ' + (e instanceof Error ? e.message : String(e));
    throw e;
  }
  setLoad(1);
  await new Promise((r) => setTimeout(r, 250));
  document.getElementById('loading')?.classList.add('hide');
  setTimeout(() => document.getElementById('loading')?.remove(), 700);
  game.start();

  let last = performance.now();
  let errors = 0;
  const frame = (now: number) => {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    try {
      game.update(dt);
      game.stage.render();
    } catch (e) {
      // Ein Fehler in einem Frame darf das Spiel nicht einfrieren
      if (errors++ < 5) console.error(e);
    }
  };
  requestAnimationFrame(frame);
}

void boot();
