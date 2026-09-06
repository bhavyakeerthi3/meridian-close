// Fault injection lives only in this isolated child-process test harness.
import { DatabaseSync } from 'node:sqlite';
import { writeFileSync } from 'node:fs';
import { openStore } from '../../src/store.js';
import { approve } from '../../src/workflow.js';

const [path, boundary, marker] = process.argv.slice(2);
const store = openStore(path);
const p = store.read().investigations.at(-1);
if (boundary === 'before-commit') {
  const original = DatabaseSync.prototype.exec;
  DatabaseSync.prototype.exec = function (sql) {
    if (sql === 'COMMIT') {
      writeFileSync(marker, 'Uncommitted update reached; approval has not committed');
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0);
    }
    return original.call(this, sql);
  };
}
const result = approve(store, p.id, { reviewer: 'Crash test controller', role: 'group_controller', revision: p.revision });
if (boundary === 'after-commit') {
  writeFileSync(marker, 'Committed approval reached; response has not returned');
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0);
}
store.close();
process.stdout.write(JSON.stringify({ duplicate: result.duplicate }));
