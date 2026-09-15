import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('../../', import.meta.url);
const home = readFileSync(new URL('index.html', root), 'utf8');
const classic = readFileSync(new URL('game.html', root), 'utf8');
const game = readFileSync(new URL('skate-3d/index.html', root), 'utf8');

test('homepage opens the 3D game without losing query or fragment', () => {
  const script = home.match(/<script>([\s\S]*?)<\/script>/)[1];
  for (const href of ['https://wiegero.com/', 'https://wiegero.com/index.html?from=home#play', 'http://127.0.0.1:4173/?next=https://example.com/#local']) {
    const original = new URL(href);
    let destination;
    vm.runInNewContext(script, { URL, window: { location: { href, search: original.search, hash: original.hash, replace: value => { destination = new URL(value); } } } });
    assert.equal(destination.origin, original.origin);
    assert.equal(destination.pathname, '/skate-3d/');
    assert.equal(destination.search, original.search);
    assert.equal(destination.hash, original.hash);
  }
  assert.ok(!home.includes('id="game-area"'));
  assert.match(home, /<noscript><meta http-equiv="refresh" content="0; url=skate-3d\/">/);
});
test('the original game remains playable at game.html instead of redirecting', () => {
  assert.ok(classic.includes('id="game-area"'));
  assert.ok(!classic.includes('http-equiv="refresh"'));
  assert.ok(!classic.includes('location.replace'));
  for (const match of classic.matchAll(/(?:src|href)="((?:js|css|assets)\/[^"?#]+)"/g)) {
    assert.ok(existsSync(new URL(match[1], root)), match[1]);
  }
});
test('3D navigation and WebGL fallback preserve the classic, training and shared board', () => {
  for (const path of ['game.html', 'gym-tracker/', 'board.html']) {
    assert.ok(game.includes(`href="../${path}"`));
    assert.ok(existsSync(new URL(path, root)), path);
  }
  assert.match(game, /href="\.\.\/game.html" class="secondary">ZUM 2D-SPIEL/);
});
