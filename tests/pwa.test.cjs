// PWA contract tests: installability metadata, offline shell completeness, version sync, platform guidance.
const assert = require('assert'); const fs = require('fs'); const path = require('path');
const www = path.join(__dirname, '../www');
const P = require('../www/pwa.js');
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
const sw = fs.readFileSync(path.join(www, 'sw.js'), 'utf8');
const html = fs.readFileSync(path.join(www, 'index.html'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(www, 'manifest.webmanifest'), 'utf8'));

// platform detection and guidance
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36';
assert.strictEqual(P.platformInfo(IPHONE, false, false).kind, 'ios');
assert.ok(P.platformInfo(IPHONE, false, false).iosSafari);
assert.ok(P.platformInfo(IPHONE_CHROME, false, false).iosOtherBrowser);
assert.strictEqual(P.platformInfo(ANDROID, false, false).kind, 'android');
assert.strictEqual(P.platformInfo(ANDROID, true, false).installed, true);
assert.strictEqual(P.platformInfo(ANDROID, false, true).installed, true);
assert.strictEqual(P.installHelp(P.platformInfo(ANDROID, true, false), false), null);
assert.strictEqual(P.installHelp(P.platformInfo(ANDROID, false, false), true).mode, 'prompt');
assert.ok(/Add to Home Screen/.test(P.installHelp(P.platformInfo(IPHONE, false, false), false).text));
assert.ok(/Safari/.test(P.installHelp(P.platformInfo(IPHONE_CHROME, false, false), false).text));

// manifest is installable
assert.strictEqual(manifest.display, 'standalone'); assert.strictEqual(manifest.dir, 'rtl'); assert.strictEqual(manifest.lang, 'fa');
assert.ok(manifest.name && manifest.short_name && manifest.start_url && manifest.scope);
assert.ok(!/^\//.test(manifest.start_url) && !/^\//.test(manifest.scope), 'paths must be relative so sub-path hosting works');
const purposes = manifest.icons.map((i) => i.purpose);
assert.ok(purposes.includes('any') && purposes.includes('maskable'));
manifest.icons.forEach((i) => {
  const f = path.join(www, i.src); assert.ok(fs.existsSync(f), 'missing icon ' + i.src);
  const b = fs.readFileSync(f); assert.strictEqual(b.toString('latin1', 1, 4), 'PNG');
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20); assert.strictEqual(w + 'x' + h, i.sizes, i.src);
});
assert.ok(manifest.icons.some((i) => i.sizes === '192x192') && manifest.icons.some((i) => i.sizes === '512x512'));

// index wires everything
assert.ok(html.includes('rel="manifest" href="manifest.webmanifest"'));
assert.ok(html.includes('apple-touch-icon') && html.includes('apple-mobile-web-app-capable'));
assert.ok(html.indexOf('pwa.js') > -1 && html.indexOf('pwa.js') < html.indexOf('app.js'), 'pwa.js must load before app.js');

// service worker: version sync + shell covers every local asset the page needs
assert.ok(sw.includes("const VERSION = '" + pkg.version + "'"), 'sw.js VERSION must equal package.json version');
const shell = [...sw.slice(sw.indexOf('const SHELL'), sw.indexOf('];', sw.indexOf('const SHELL'))).matchAll(/'([^']+)'/g)].map((m) => m[1]);
const refs = [...html.matchAll(/(?:src|href)="([^"#:]+)"/g)].map((m) => m[1]);
refs.forEach((r) => assert.ok(shell.includes(r), 'not precached: ' + r));
shell.filter((s) => s !== './').forEach((s) => assert.ok(fs.existsSync(path.join(www, s)), 'precache entry missing on disk: ' + s));
assert.ok(shell.includes('./'));
const jsOnDisk = fs.readdirSync(www).filter((f) => f.endsWith('.js') && f !== 'sw.js');
jsOnDisk.forEach((f) => assert.ok(shell.includes(f), 'script not precached: ' + f));
// SW must never touch cross-origin (bridge keys) or non-GET traffic
assert.ok(/url\.origin !== self\.location\.origin\) return/.test(sw) && /req\.method !== 'GET'\) return/.test(sw));
assert.ok(!/localStorage|X-SI-Key/.test(sw));
console.log('pwa contract tests OK');
