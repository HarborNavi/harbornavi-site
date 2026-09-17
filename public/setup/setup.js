/* Public connection instructions only. Account and device APIs stay on Navi. */
(() => {
  'use strict';
  const EXPIRY_MS = 30 * 60 * 1000;
  const DISCOVERY_URL = 'http://harbornavi.local/ui/setup';
  const ENGINEERING_AP_URL = 'http://10.42.0.1/ui/setup';
  const ROUTES = ['choose', 'wifi', 'ethernet'];
  let identifier = null;
  let engineering = false;
  let storageKey = null;

  function readIdentifier() {
    const values = new URLSearchParams(location.hash.slice(1)).getAll('device');
    return values.length === 1 && /^navi_[a-f0-9]{32}$/.test(values[0]) ? values[0] : null;
  }

  function readEngineering() {
    const values = new URLSearchParams(location.hash.slice(1)).getAll('engineering');
    return readIdentifier() !== null && values.length === 1 && values[0] === '1';
  }

  function liveTimestamp(timestamp) {
    return Number.isSafeInteger(timestamp) && timestamp <= Date.now() && Date.now() - timestamp < EXPIRY_MS;
  }

  function restore() {
    const initial = {route: 'choose', timestamp: Date.now()};
    if (!storageKey) return initial;
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
      if (saved && Object.keys(saved).sort().join(',') === 'route,timestamp'
          && ['wifi', 'ethernet'].includes(saved.route) && liveTimestamp(saved.timestamp)) return saved;
      sessionStorage.removeItem(storageKey);
    } catch {
      try { sessionStorage.removeItem(storageKey); } catch { /* Private browsing still supports the current page. */ }
    }
    return initial;
  }
  function show(route, focus = false) {
    if (!ROUTES.includes(route)) route = 'choose';
    document.body.dataset.route = route;
    for (const name of ROUTES) document.querySelector(`#${name}-panel`).hidden = name !== route;
    if (focus) {
      document.querySelector(`#${route === 'choose' ? 'welcome' : route}-heading`).focus();
      window.scrollTo(0, 0);
    }
  }
  function save(route, timestamp = Date.now()) {
    if (!storageKey) return;
    try {
      if (route === 'choose') sessionStorage.removeItem(storageKey);
      else sessionStorage.setItem(storageKey, JSON.stringify({route, timestamp}));
    } catch { /* Continuing without browser storage remains possible. */ }
  }
  function navigate(route) {
    if (!ROUTES.includes(route)) return;
    const timestamp = Date.now();
    save(route, timestamp);
    history.pushState({naviEntry: identifier, engineering, route, timestamp}, '', location.href);
    show(route, true);
  }
  function initialize() {
    identifier = readIdentifier();
    engineering = readEngineering();
    storageKey = identifier ? `navi.setup.entry:${identifier}` : null;
    document.querySelector('#device-label').hidden = !identifier;
    document.querySelector('#device-number').textContent = identifier ? identifier.slice(-6).toUpperCase() : '';
    document.querySelector('#setup-ssid').textContent = identifier ? `Navi-Setup-${identifier.slice(-6).toUpperCase()}` : 'the Navi setup network on your card';
    document.querySelector('#scan-note').hidden = !!identifier;
    for (const [name, route] of [['open-wireless', 'wifi'], ['open-local', 'ethernet']]) {
      const production = identifier
        ? `https://${identifier.replace('_', '-')}.lan.harbornavi.com/ui/setup?connection=${route}#device=${identifier}`
        : DISCOVERY_URL;
      document.querySelector(`#${name}`).href = identifier && engineering && route === 'wifi'
        ? `${ENGINEERING_AP_URL}#device=${identifier}` : production;
    }
    const saved = restore();
    history.replaceState({naviEntry: identifier, engineering, ...saved}, '', location.href);
    show(saved.route);
  }
  document.querySelectorAll('button[data-route]').forEach(button => {
    button.addEventListener('click', () => navigate(button.dataset.route));
  });
  document.querySelectorAll('[data-back]').forEach(button => {
    button.addEventListener('click', () => navigate('choose'));
  });
  window.addEventListener('popstate', event => {
    if (readIdentifier() !== identifier || readEngineering() !== engineering) { initialize(); return; }
    const route = event.state?.naviEntry === identifier && event.state?.engineering === engineering
      && ROUTES.includes(event.state?.route)
      && liveTimestamp(event.state?.timestamp) ? event.state.route : 'choose';
    save(route, event.state?.timestamp);
    show(route, true);
  });
  window.addEventListener('hashchange', initialize);
  initialize();
})();

/* Capability-based BLE provisioning; unsupported browsers use hotspot setup. */
(() => {
  'use strict';
  const get = name => document.getElementById(`ble-${name}`);
  let client, timer, job, approved = false, busy = false, generation = 0;
  function notice(value) { get('status').textContent = value; }
  function cancelPoll() { clearTimeout(timer); timer = undefined; }
  function schedule() { cancelPoll(); timer = setTimeout(poll, 2000); }
  function reset() {
    generation++; busy = false;
    cancelPoll(); client?.disconnect(); client = null; job = null; approved = false;
    get('password').value = '';
    for (const name of ['network', 'confirm', 'continue', 'cancel']) get(name).hidden = true;
    for (const name of ['connect', 'join', 'scan', 'confirm', 'cancel']) get(name).disabled = false;
    get('continue').removeAttribute('href');
    const identifiers = new URLSearchParams(location.hash.slice(1)).getAll('device');
    const identifier = identifiers.length === 1 ? identifiers[0] : null;
    get('setup').hidden = !(typeof navigator.bluetooth?.requestDevice === 'function'
      && window.isSecureContext && /^navi_[0-9a-f]{32}$/.test(identifier || ''));
    document.getElementById('hotspot-fallback').hidden = !get('setup').hidden;
    notice('');
  }
  async function action(work) {
    if (busy) return;
    const current = generation;
    busy = true;
    get('connect').disabled = get('join').disabled = get('scan').disabled = get('confirm').disabled = get('cancel').disabled = true;
    try { await work(); }
    catch (error) {
      if (current !== generation) return;
      const messages = {
        BLE_DEVICE_MISMATCH: 'This is not the Navi on your card. Select the device with the matching number.',
        BLE_SETUP_UNAVAILABLE: 'Bluetooth setup is unavailable or closed on this Navi. Use the hotspot steps below or Ethernet.',
        PHYSICAL_INPUT_CONFIGURATION_UNAVAILABLE: 'Navi’s physical setup control is not ready for Bluetooth confirmation. Use the hotspot steps below or Ethernet.',
        PHYSICAL_CONFIRMATION_REQUIRED: 'Confirm this phone using Navi’s setup control, then continue here.',
        BLE_SESSION_BUSY: 'Another phone is setting up Navi. Finish or cancel that setup first.',
        WIFI_PASSWORD_INVALID: 'Check the Wi-Fi password. Navi currently supports passwords with 8–63 standard keyboard characters.',
        WIFI_NETWORK_NOT_READY: 'Navi has not obtained a usable network connection yet. Wait and retry.',
        WIFI_TRIAL_ALREADY_ACTIVE: 'A Wi-Fi connection is already in progress. Wait for its result.',
      };
      notice(messages[error.message] || 'Bluetooth setup was interrupted. Reconnect to check progress, or use the hotspot steps below.');
      document.getElementById('hotspot-fallback').hidden = false;
      get('password').value = '';
      cancelPoll();
    } finally {
      if (current === generation) {
        busy = false;
        get('connect').disabled = get('join').disabled = get('scan').disabled = get('confirm').disabled = get('cancel').disabled = false;
      }
    }
  }
  async function scan() {
    const active = client;
    const result = await active.command('scan');
    if (active !== client) return;
    get('ssid').replaceChildren();
    for (const network of result.networks) {
      const option = document.createElement('option');
      option.value = network.ssid; option.textContent = network.ssid;
      option.disabled = network.supported === false;
      get('ssid').append(option);
    }
    get('network').hidden = false;
    notice(result.networks.length ? 'Choose your home Wi-Fi.' : 'No supported Wi-Fi networks found. Refresh or use Ethernet.');
  }
  async function poll() {
    if (!client) return;
    if (busy) { schedule(); return; }
    await action(async () => {
      const active = client;
      const result = await active.command('get_status');
      if (active !== client) return;
      job = result.job || null;
      if (!result.presence?.approved) {
        approved = false;
        get('network').hidden = true;
        get('confirm').hidden = true;
        get('continue').hidden = true;
        get('password').value = '';
        notice('Use Navi’s setup control to confirm this phone. A touch confirms your presence, not your identity.');
        schedule();
        return;
      } else if (!approved) {
        approved = true;
        if (!job || ['idle', 'failed'].includes(job.status)) await scan();
        if (active !== client) return;
      }
      if (job?.status === 'preparing' || job?.status === 'connecting') {
        get('network').hidden = true; notice('Navi is connecting to your home Wi-Fi…');
      } else if (job?.status === 'awaiting_confirmation') {
        get('network').hidden = true;
        get('confirm').hidden = !result.network_ready;
        notice(result.network_ready ? 'Navi is connected. Confirm that this is your home network within two minutes.' : 'Waiting for Navi’s network address…');
      } else if (job?.status === 'succeeded') {
        get('confirm').hidden = get('network').hidden = true;
        get('continue').href = `https://${client.identifier.replace('_', '-')}.lan.harbornavi.com/ui/setup#device=${client.identifier}`;
        get('continue').hidden = false;
        notice('Navi is connected. Keep your phone on the same home Wi-Fi and continue account setup.');
        return;
      } else if (job?.status === 'failed' || job?.status === 'recovery_required') {
        get('confirm').hidden = true; get('network').hidden = false;
        notice(job.status === 'recovery_required' ? 'Navi needs network recovery. Use Ethernet to continue.' : 'Navi could not keep this connection. Check the Wi-Fi details and retry.');
        return;
      }
      schedule();
    });
  }
  get('connect').addEventListener('click', () => action(async () => {
    cancelPoll();
    if (!client) client = new NaviBLE.Client(new URLSearchParams(location.hash.slice(1)).get('device'));
    const active = client;
    notice('Select the Navi with the device number on your card.');
    await active.connect();
    if (active !== client) return;
    get('cancel').hidden = false; schedule();
    document.getElementById('hotspot-fallback').hidden = true;
  }));
  get('scan').addEventListener('click', () => action(scan));
  get('join').addEventListener('click', () => action(async () => {
    cancelPoll();
    const password = get('password').value; get('password').value = '';
    const active = client;
    const result = await active.command('connect', {ssid: get('ssid').value, password});
    if (active !== client) return;
    job = result.job; notice('Navi is connecting…'); schedule();
  }));
  get('confirm').addEventListener('click', () => action(async () => {
    const active = client;
    const result = await active.command('confirm', {job_id: job.job_id, connected_confirmed: true});
    if (active !== client) return;
    job = result.job; schedule();
  }));
  get('cancel').addEventListener('click', () => action(async () => {
    cancelPoll();
    const active = client;
    await active.command('cancel', {job_id: job?.job_id || null});
    if (active !== client) return;
    reset(); notice('Bluetooth setup cancelled. You can use the hotspot steps below.');
  }));
  window.addEventListener('hashchange', reset);
  window.addEventListener('pagehide', reset);
  reset();
})();
