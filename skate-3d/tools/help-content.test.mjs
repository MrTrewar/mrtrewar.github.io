import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ALL_TRICKS, PRO_TRICKS, PHYSICS } from '../simulation.mjs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const help = html.slice(html.indexOf('<section id="help-detail"'), html.indexOf('<section id="error"'));
const decimal = value => String(value).replace('.', ',');

test('help matches the current trick pool, timing and maximum speed', () => {
  assert.ok(help.includes(`alle ${ALL_TRICKS.length} Varianten, davon ${PRO_TRICKS.length} Specials`));
  assert.ok(help.includes(`${decimal(PRO_TRICKS[0].duration)} Sekunden Flugzeit`));
  assert.ok(help.includes(`${decimal(PHYSICS.catchWindow)} Sekunden`));
  assert.ok(help.includes(`${decimal(PHYSICS.bankTime)} Sekunden`));
  assert.ok(help.includes(`${Math.round(PHYSICS.maxSpeed * 3.6)} km/h`));
  assert.ok(help.includes('SHIFT + Pfeil hoch'));
  assert.ok(help.includes('Normale Landungen brauchen keine Taste'));
  assert.ok(help.includes('R startet niemals neu'));
});
test('help explains precision targets, cosmetics and local-only progress', () => {
  for (const text of ['Gelbe Streifen', 'Kurzes Ziel', 'Weiter Transfer', 'innerhalb eines einzigen Runs', 'Freischaltung erfolgt am Run-Ende', 'rein kosmetisch', 'gleiche Sprungweite', 'Kein globales Leaderboard']) {
    assert.ok(help.includes(text), text);
  }
  assert.match(help, /id="deck-status"[^>]+role="status"/);
  assert.match(help, /id="help-close-top"[^>]+aria-label="Hilfe schließen"/);
});
