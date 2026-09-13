const fs = require('node:fs');
const path = require('node:path');
// A single process also runs on Windows hosts that restrict child processes.
for (const file of fs.readdirSync(__dirname).filter(file => file.endsWith('.test.cjs')).sort()) {
  require(path.join(__dirname, file));
}
