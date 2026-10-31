const test = require('node:test');
const assert = require('node:assert');
const { pidUitNetstat, naamUitTasklist } = require('../src/poortgebruiker');

test('netstat: vindt het proces dat op poort 3000 luistert', () => {
  const uit = `
Active Connections

  Proto  Local Address          Foreign Address        State           PID
  TCP    0.0.0.0:135            0.0.0.0:0              LISTENING       1100
  TCP    192.168.0.169:30000    1.2.3.4:443            ESTABLISHED     77
  TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       4242
  TCP    [::]:3000              [::]:0                 LISTENING       4242
`;
  assert.strictEqual(pidUitNetstat(uit, 3000), 4242);
  assert.strictEqual(pidUitNetstat(uit, 3001), null);
});

test('tasklist: leest de programmanaam', () => {
  assert.strictEqual(naamUitTasklist('"node.exe","4242","Console","1","52.000 K"\r\n'), 'node.exe');
  assert.strictEqual(naamUitTasklist('INFO: No tasks are running'), null);
});
