const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const root = path.resolve(__dirname, '../plugin/site-inspector-bridge/tests');
if (!fs.existsSync(root)) { console.log('Bridge source is in its separate repository; PHP plugin tests are run by the Bridge workflow.'); process.exit(0); }
const tests = [
  'agent-policy.php', 'research-reader-policy.php', 'agent-taxonomy-policy.php', 'agent-content-batch.php', 'device-growth-policy.php',
  'autopilot-policy.php', 'growth-autopilot-policy.php', 'crawler-policy.php', 'integrations-security.php',
  'product-variation-context.php', 'research-parser.php', 'transport-security.php', 'event-policy.php', 'commerce-catalog-policy.php'
];
for (const file of tests) {
  const run = spawnSync('php', [path.join(root, file)], { encoding: 'utf8' });
  if (run.error) throw new Error('اجرای PHP ممکن نیست: ' + run.error.message);
  if (run.status !== 0) throw new Error(file + ' failed:\n' + (run.stdout || '') + (run.stderr || ''));
  process.stdout.write(run.stdout || (file + ' OK\n'));
}
