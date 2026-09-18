import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {runInNewContext} from 'node:vm';

const source = readFileSync(new URL('../public/setup/setup.js', import.meta.url), 'utf8')
  .split('/* Capability-based BLE provisioning')[0];
const device = `navi_${'a'.repeat(32)}`;

function entry(engineering, deviceId = device) {
  const elements = new Map();
  const listeners = new Map();
  const element = name => {
    if (!elements.has(name)) elements.set(name, {hidden: false, href: '', textContent: ''});
    return elements.get(name);
  };
  let now = 100;
  const hash = `#device=${deviceId}${engineering ? '&engineering=1' : ''}`;
  const location = {hash, href: `https://harbornavi.com/setup${hash}`};
  const document = {
    body: {dataset: {}},
    querySelector: element,
    querySelectorAll: () => [],
  };
  const window = {addEventListener: (name, callback) => listeners.set(name, callback)};
  const history = {replaceState() {}, pushState() {}};
  const sessionStorage = {getItem: () => null, removeItem() {}};
  runInNewContext(source, {Date: {now: () => now}, URLSearchParams,
    document, history, location, sessionStorage, window}, {timeout: 1000});
  return {element, listeners, setNow: value => {now = value;}};
}

test('engineering QR entry refreshes the AP page URL after Safari restores the guide', () => {
  const guide = entry(true);
  assert.equal(guide.element('#open-wireless').href,
    `http://10.42.0.1/ui/setup?entry=100#device=${device}`);
  guide.setNow(101);
  guide.listeners.get('pageshow')();
  assert.equal(guide.element('#open-wireless').href,
    `http://10.42.0.1/ui/setup?entry=101#device=${device}`);
  assert.equal(guide.element('#return-home').hidden, false);
  assert.equal(guide.element('#open-home').href,
    `http://harbornavi-aaaaaaaa.local/ui/setup?handoff=wifi#device=${device}`);
});

test('production guide keeps the configured device origin', () => {
  const guide = entry(false);
  assert.equal(guide.element('#open-wireless').href,
    `https://navi-${'a'.repeat(32)}.lan.harbornavi.com/ui/setup?connection=wifi#device=${device}`);
  assert.equal(guide.element('#open-home').href,
    `https://navi-${'a'.repeat(32)}.lan.harbornavi.com/ui/setup?connection=wifi#device=${device}`);
});

test('untrusted QR data cannot expose a home-network return link', () => {
  const guide = entry(true, 'bad-device');
  assert.equal(guide.element('#return-home').hidden, true);
  assert.equal(guide.element('#open-home').href, '');
});
