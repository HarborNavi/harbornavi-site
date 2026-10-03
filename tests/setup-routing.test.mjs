import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const html = readFileSync(new URL('../public/setup/index.html', import.meta.url), 'utf8');

test('setup routes cannot redirect against global trailing-slash normalization', () => {
  assert.equal(config.trailingSlash, false);
  assert.equal(config.redirects.some(rule => rule.source === '/setup' && rule.destination === '/setup/'), false);
  assert.equal(config.rewrites.find(rule => rule.source === '/setup')?.destination, '/setup/index.html');
  assert.ok(config.headers.some(rule => rule.source === '/setup/:path*'), 'Privacy headers must cover /setup without a trailing slash');
});

test('factory QR host root redirects before static homepage resolution', () => {
  const applies = rule => rule.has?.some(condition => condition.type === 'host' && condition.value === 'setup.harbornavi.com');
  const redirect = config.redirects.find(rule => rule.source === '/' && applies(rule));
  assert.equal(redirect?.destination, '/setup');
  assert.equal(redirect?.permanent, false);
  assert.equal(config.rewrites.some(rule => rule.source === '/' && applies(rule)), false);
  const headers = config.headers.find(applies)?.headers;
  assert.equal(headers?.find(header => header.key === 'Referrer-Policy')?.value, 'no-referrer');
  assert.match(headers?.find(header => header.key === 'Content-Security-Policy')?.value, /connect-src 'none'/);
  for (const match of html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css|webp))"/g)) {
    assert.ok(match[1].startsWith('/setup/'), `Root and subpath must share asset URLs: ${match[1]}`);
  }
});
