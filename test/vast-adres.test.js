// Het schoolnetwerk geeft de bord-pc soms een nieuw adres: LANcelot ziet dat en helpt een vast adres vragen.
const test = require('node:test');
const assert = require('node:assert');
const { volg, eerder, mac } = require('../src/vast-adres');

test('eerste keer: adres onthouden, geen tip', () => {
  assert.deepEqual(volg(undefined, '192.168.1.234'), { adressen: ['192.168.1.234'], vorig: '', nieuw: true });
});

test('zelfde adres: niets te doen', () => {
  assert.equal(volg(['192.168.1.234'], '192.168.1.234').nieuw, false);
});

test('nieuw adres in hetzelfde netwerk: tip met het vorige adres', () => {
  const r = volg(['192.168.1.241', '192.168.1.234'], '192.168.1.109');
  assert.equal(r.vorig, '192.168.1.241');
  assert.deepEqual(r.adressen, ['192.168.1.109', '192.168.1.241', '192.168.1.234']);
  assert.deepEqual(eerder(r.adressen, '192.168.1.109'), ['192.168.1.241', '192.168.1.234']);
});

test('ander netwerk (laptop thuis): geen tip', () => {
  const r = volg(['192.168.1.241'], '10.0.0.5');
  assert.equal(r.vorig, '');
  assert.deepEqual(eerder(r.adressen, '10.0.0.5'), []);
});

test('terug op school na thuis: tip vergelijkt met het vorige schooladres', () => {
  assert.equal(volg(['10.0.0.5', '192.168.1.241'], '192.168.1.109').vorig, '192.168.1.241');
});

test('MAC-adres zoals Windows het toont', () => {
  assert.equal(mac('b0:47:e9:be:65:9f'), 'B0-47-E9-BE-65-9F');
  assert.equal(mac('00:00:00:00:00:00'), '');
});
