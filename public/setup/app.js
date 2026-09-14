/* Standalone product prototype. No device APIs, analytics, WebAuthn or network calls. */
(() => {
  'use strict';
  const STORE = 'harbor.navi.setup.prototype.v1.1';
  const SCREENS = ['welcome', 'connect', 'confirm', 'wifi', 'connecting', 'owner', 'recovery', 'home', 'devices', 'device-categories', 'camera-brands'];
  const SCENARIOS = {
    wireless: ['First setup', 'Start fresh, with no Ethernet cable.'],
    wired: ['Ethernet is connected', 'Take the shorter path to your home.'],
    offline: ['No Internet', 'Use the printed card to reach local setup.'],
    'wrong-password': ['Wrong Wi-Fi password', 'Recover the hotspot, correct it and retry.'],
    'hotspot-expired': ['Setup window expired', 'Reopen the hotspot with a long touch.'],
    'wrong-network': ['Phone on the wrong Wi-Fi', 'Return to the right network and continue.'],
    'device-mismatch': ['Device number does not match', 'Check the label before proceeding.'],
    'existing-owner': ['Change your home Wi-Fi', 'Sign in as the existing Owner first.'],
  };
  const TITLES = {
    welcome: 'Welcome to Navi', connect: 'Connect to Navi', confirm: 'Confirm your Navi',
    wifi: 'Choose your home Wi-Fi', connecting: 'Connecting Navi', owner: 'Make Navi yours',
    recovery: 'Save your recovery code', home: 'Set up your home', devices: 'Add your first device',
    'device-categories': 'Add devices', 'camera-brands': 'Add a camera',
  };
  // Consumer groupings inspired by HA entity domains, not a compatibility list.
  const CATEGORIES = [
    {id:'camera', icon:'camera', title:'Camera', description:'Indoor, outdoor & doorbells'},
    {id:'lighting', icon:'light', title:'Lighting', description:'Bulbs, lights & LED strips'},
    {id:'switches', icon:'plug', title:'Switches & outlets', description:'Smart plugs & switches'},
    {id:'climate', icon:'climate', title:'Climate', description:'Thermostats, AC & fans'},
    {id:'sensors', icon:'sensor', title:'Sensors', description:'Motion, doors & temperature'},
    {id:'security', icon:'lock', title:'Locks & security', description:'Locks, alarms & sirens'},
    {id:'covers', icon:'cover', title:'Blinds & covers', description:'Curtains, blinds & shades'},
    {id:'media', icon:'media', title:'TV & audio', description:'TVs, speakers & players'},
  ];
  const NETS = ['Maple House', 'Maple House · Guest', 'Cedar House'];
  const SAMPLE_CODE = 'DEMO-NAVI-7Q3M-9K2P';
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const icon = (name) => window.NaviIcons ? window.NaviIcons(name) : '';
  const art = (name, mode) => window.NaviArt?.[name]?.(mode) || '';
  const button = (label, action, style = 'primary', extra = '') => `<button type="button" class="${style}" data-action="${action}" ${extra}>${label}</button>`;
  const message = (kind, title, body) => `<div class="info-box ${kind}" ${kind === 'danger' || kind === 'warning' ? 'role="alert"' : 'role="status"'}><span class="info-icon">${icon(kind === 'success' ? 'check' : kind === 'danger' || kind === 'warning' ? 'warning' : 'help')}</span><div class="info-copy"><strong>${title}</strong><p>${body}</p></div></div>`;
  const hero = (name, mode) => `<div class="hero-art" aria-hidden="true">${art(name, mode)}</div>`;
  const heading = (eyebrow, title, lead) => `<p class="eyebrow">${eyebrow}</p><h1 class="screen-title">${title}</h1><p class="lead">${lead}</p>`;
  const miniStep = (n, title, body) => `<div class="step-row"><span class="step-dot">${n}</span><div class="step-copy"><strong>${title}</strong><p>${body}</p></div></div>`;
  const choice = (symbol, title, body, action, extra = '') => `<button type="button" class="choice" data-action="${action}" ${extra}><span class="choice-icon">${icon(symbol)}</span><span class="choice-copy"><strong>${title}</strong><small>${body}</small></span><span class="choice-end">${icon('chevron')}</span></button>`;

  function initial() {
    return {version: 1, screen: 'welcome', scenario: 'wireless', route: 'wireless',
      hotspotConnected: false, networkGranted: false, deviceConfirmed: false,
      selectedNetwork: NETS[0], networkConfigured: false, homeConnected: false,
      ownerCreated: false, ownerAuthenticated: false, recoveryAcknowledged: false,
      networkChanged: false, completed: false, error: null, errorConsumed: false,
      family: {name: 'My home', region: 'United States', timeZone: 'America/Los_Angeles'}};
  }
  let state = initial();
  let history = [];
  let passwordVisible = false;
  let recoveryVisible = false;
  let lastFocus = null;
  const params = new URLSearchParams(location.search);
  if (params.get('capture') === '1') document.body.classList.add('capture');
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (saved?.version === 1 && SCREENS.includes(saved.screen) && SCENARIOS[saved.scenario]) {
      // Read only known demo fields. No passwords, passkeys or recovery codes are stored.
      for (const key of Object.keys(state)) if (typeof saved[key] === typeof state[key] && key !== 'family') state[key] = saved[key];
      for (const key of Object.keys(state.family)) if (typeof saved.family?.[key] === 'string') state.family[key] = saved.family[key].slice(0, 100);
      state.selectedNetwork = NETS.includes(saved.selectedNetwork) ? saved.selectedNetwork : NETS[0];
      state.error = null;
    }
  } catch (_) { /* Private browsing or a stale demo state must not prevent setup. */ }

  function persist() {
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (_) {}
  }
  function announce(text) { $('#announcement').textContent = text; }
  function go(screen, remember = true) {
    if (!SCREENS.includes(screen)) return;
    if (remember && screen !== state.screen) history.push(state.screen);
    state.screen = screen;
    state.error = null;
    passwordVisible = false;
    render();
    $('#screen').focus({preventScroll: true});
    window.scrollTo({top: 0, behavior: 'instant'});
  }
  function back() {
    const old = history.pop();
    if (old && !(state.ownerCreated && ['owner', 'recovery', 'confirm'].includes(old))) return go(old, false);
    if (state.screen === 'camera-brands') return go('device-categories', false);
    if (state.screen === 'device-categories') return go('devices', false);
    if (state.ownerCreated) return go(state.recoveryAcknowledged ? 'home' : 'recovery', false);
    const previous = {connect:'welcome', confirm:'connect', wifi:'confirm', connecting:'wifi', owner: state.route === 'wired' ? 'welcome' : 'connecting'};
    go(previous[state.screen] || 'welcome', false);
  }
  function openScenario(name) {
    if (!SCENARIOS[name]) return;
    closeDialog(); closeReview(); state = initial(); history = []; recoveryVisible = false;
    state.scenario = name;
    if (name === 'wired') state.route = 'wired';
    if (name === 'offline') { state.route = 'offline'; state.screen = 'connect'; }
    if (name === 'wrong-password') { state.screen = 'wifi'; state.hotspotConnected = true; state.networkGranted = true; }
    if (name === 'hotspot-expired') { state.screen = 'connect'; state.error = 'expired'; }
    if (name === 'wrong-network') { state.screen = 'connecting'; state.networkConfigured = true; state.networkGranted = true; }
    if (name === 'device-mismatch') { state.screen = 'confirm'; state.hotspotConnected = true; state.error = 'mismatch'; }
    if (name === 'existing-owner') { state.screen = 'connect'; state.ownerCreated = true; state.recoveryAcknowledged = true; state.family.name = 'Maple House'; }
    render();
  }
  function preview(screen) {
    if (!SCREENS.includes(screen)) return;
    closeDialog(); closeReview(); state = initial(); history = [];
    state.screen = screen;
    if (SCREENS.indexOf(screen) >= 2) state.hotspotConnected = true;
    if (SCREENS.indexOf(screen) >= 3) {state.networkGranted = true; state.deviceConfirmed = true;}
    if (SCREENS.indexOf(screen) >= 4) state.networkConfigured = true;
    if (SCREENS.indexOf(screen) >= 5) state.homeConnected = true;
    if (SCREENS.indexOf(screen) >= 6) {state.ownerCreated = true; state.ownerAuthenticated = true;}
    if (SCREENS.indexOf(screen) >= 7) state.recoveryAcknowledged = true;
    recoveryVisible = screen === 'recovery';
    render();
  }
  function setFooter(primary, secondary = '', note = '') {
    $('#footer').innerHTML = primary + secondary + (note ? `<p class="footer-note">${note}</p>` : '');
  }

  function render() {
    const stage = state.screen;
    $('#screen').dataset.screen = stage;
    $('.back-button').innerHTML = icon('back');
    $('.back-button').disabled = stage === 'welcome';
    const step = ['welcome','connect','confirm','wifi','connecting'].includes(stage) ? 1 : ['owner','recovery'].includes(stage) ? 2 : 3;
    $('#step-label').textContent = stage === 'welcome' ? 'A warm welcome' : `${step} of 3 · ${step === 1 ? 'Get connected' : step === 2 ? 'Make it yours' : 'Feel at home'}`;
    $('#progress-fill').style.width = `${stage === 'welcome' ? 8 : Math.min(100, (SCREENS.indexOf(stage) + 1) / 9 * 100)}%`;
    document.title = `${TITLES[stage]} · Navi concept`;
    let html = '';
    switch (stage) {
      case 'welcome':
        html = heading('HELLO, HOME', 'Welcome to Navi.', 'How would you like to connect Navi to your home?') + hero('hub', 'ready') +
          `<p class="section-label connection-label">CHOOSE YOUR CONNECTION</p><div class="choice-list connection-choices">${choice('wifi', 'Use Wi-Fi', 'Connect wirelessly. No Ethernet cable needed.', 'start-wireless')}${choice('ethernet', 'Use Ethernet', 'Connect Navi to your router with a cable.', 'start-wired')}</div>`;
        setFooter('', '', 'Just your phone. No app to install.');
        break;
      case 'connect': {
        const expired = state.error === 'expired';
        html = heading('GET CONNECTED', expired ? 'Let’s reconnect.' : state.ownerCreated ? 'Reconnect to your Navi.' : 'First, connect to Navi.',
          expired ? 'The setup network closes after 10 minutes. You can open it again right here.' : 'Join Navi’s temporary Wi-Fi to get started. There’s no setup password to type.') +
          (expired ? message('warning', 'Setup window closed', 'Your progress is saved. Touch and hold Navi’s fingerprint area to reopen setup.') : '') +
          hero('card') + `<div class="card-credentials"><span class="section-label">YOUR NAVI NETWORK</span><strong>Navi-Setup-A1B2C3</strong><span class="hint">No password required · Temporary setup network</span></div>` +
          `<div class="mini-steps">${miniStep('1', 'Open your phone’s Wi-Fi settings', 'Select Navi-Setup-A1B2C3. No password needed.')}${miniStep('2', 'Stay connected', 'If your phone says “No Internet”, choose to stay.')}${miniStep('3', 'Come back to this page', 'Return to your browser to confirm on Navi.')}</div>` +
          (state.route === 'offline' ? message('info', 'No Internet? You can still begin.', 'After joining Navi’s Wi-Fi, use the local setup address printed on your card.') : '') +
          (state.hotspotConnected ? message('success', 'Connected to Navi', 'Return to setup and check this device.') : '');
        setFooter(expired ? button('Reopen setup on Navi', 'reopen-hotspot') : state.hotspotConnected ? button(`Continue to Navi ${icon('arrow')}`, 'check-local') : button(`Show me how ${icon('arrow')}`, 'open-wifi-demo'),
          !expired && !state.hotspotConnected ? button('I’m already connected', 'check-local', 'text-button') : '', 'You won’t need to install an app.');
        break;
      }
      case 'confirm':
        html = heading('A QUICK CHECK', 'Is this your Navi?', 'Match the number below with the label on your Navi. Then confirm on the device.') + hero('hub', 'touch') +
          `<div class="device-line"><span>Device number</span><strong>A1B2C3</strong></div>` +
          (state.error === 'mismatch' ? message('warning', 'The numbers don’t match', 'Connect to the network shown on your own Navi’s card, then try again.') :
            `<div class="surface"><div class="summary-row">${icon('fingerprint')}<span>This confirms that your phone can set up Navi’s Wi-Fi.</span></div><p class="hint">You’ll create your home’s Owner account in the next step.</p></div>`);
        setFooter(state.error === 'mismatch' ? button('Back to connection guide', 'retry-device') : button(`Confirm on Navi ${icon('arrow')}`, 'confirm-device'),
          state.error === 'mismatch' ? '' : button('The number doesn’t match', 'mismatch', 'text-button'));
        break;
      case 'wifi':
        html = heading('YOUR HOME NETWORK', 'Where should Navi connect?', 'Choose your home Wi-Fi. Use your main network so your devices can find each other.') +
          (state.error === 'password' ? message('danger', 'That password didn’t work', 'Navi’s setup network is back. Check the password and try again — your progress is saved.') : '') +
          (state.ownerCreated ? `<span class="status-chip">${icon('lock')} Signed in as Owner</span>` : '') +
          `<div class="network-list">${NETS.map((name, index) => `<button type="button" class="network-option ${state.selectedNetwork === name ? 'selected' : ''}" data-action="choose-network" data-network="${esc(name)}" aria-pressed="${state.selectedNetwork === name}"><span class="choice-icon">${icon('wifi')}</span><span class="network-name">${esc(name)}<small class="network-meta">${index === 0 ? 'Strong signal · Secured' : index === 1 ? 'Guest network · Secured' : 'Good signal · Secured'}</small></span><span class="choice-end">${icon(state.selectedNetwork === name ? 'check' : 'lock')}</span></button>`).join('')}</div>` +
          `<div class="link-row">${button(`${icon('refresh')} Refresh networks`, 'refresh-networks', 'text-button')}</div>` +
          `<form id="wifi-form"><label class="field" for="wifi-password">Wi-Fi password</label><div class="input-wrap"><input id="wifi-password" name="wifi-password" type="password" autocomplete="off" placeholder="Enter a sample password" required minlength="8" maxlength="63" aria-describedby="password-help"><button type="button" class="password-toggle" data-action="toggle-password" aria-label="Show password">${icon('eye')}</button></div><p class="hint" id="password-help">Demo only — use any made-up password of 8+ characters.</p></form>` +
          `<div class="summary-row privacy-note">${icon('lock')}<span>Your Wi-Fi password belongs on Navi, never on the public setup page.</span></div>`;
        setFooter(`<button type="submit" form="wifi-form" class="primary" data-action="submit-wifi">Connect Navi ${icon('arrow')}</button>`);
        break;
      case 'connecting':
        html = heading('ALMOST CONNECTED', state.homeConnected ? 'You’re back together.' : 'Navi is joining your home.',
          state.homeConnected ? 'Your phone and Navi are on the same home network. You’re ready to continue.' : 'A brief disconnect is expected. Now move your phone back to your home Wi-Fi.') + hero('network') +
          `<div class="surface"><div class="summary-row">${icon('check')}<span>Navi connected to <strong>${esc(state.selectedNetwork)}</strong></span></div><div class="summary-row">${icon(state.homeConnected ? 'check' : 'phone')}<span>${state.homeConnected ? 'Your phone is connected, too.' : 'Waiting for your phone to return.'}</span></div></div>` +
          (state.error === 'wrong-network' ? message('warning', 'Your phone is on a different network', `Join ${esc(state.selectedNetwork)} in Wi-Fi settings, then come back here.`) : '') +
          (!state.homeConnected ? `<div class="mini-steps">${miniStep('1', `Join ${esc(state.selectedNetwork)}`, 'Open your phone’s Wi-Fi settings again.')}${miniStep('2', 'Return to your browser', 'Come back within two minutes to keep going.')}</div>` : '');
        setFooter(state.homeConnected ? button(`Continue ${icon('arrow')}`, 'check-home') : button('Show phone Wi-Fi steps', 'open-home-wifi-demo'),
          !state.homeConnected ? button('I’m back on home Wi-Fi', 'check-home', 'text-button') : '', 'If you lose this page, scan your Navi code again.');
        break;
      case 'owner': {
        const existing = state.ownerCreated;
        html = heading(existing ? 'WELCOME BACK' : 'MAKE IT YOURS', existing ? 'Your home, your Navi.' : 'A home that’s yours.',
          existing ? 'Sign in with your existing passkey before changing Navi’s home network.' : 'Create your home’s Owner account with a passkey. No new password to remember.') + hero('shield') +
          `<div class="surface"><div class="summary-row">${icon('fingerprint')}<span>Use your phone’s face recognition, fingerprint or screen lock.</span></div><div class="summary-row">${icon('lock')}<span>${existing ? 'Your home and devices stay in place.' : 'Your passkey stays protected by your phone.'}</span></div></div>` +
          `<p class="hint">${existing ? 'Opening the setup network does not change who owns Navi.' : 'First confirm on Navi. Then your phone will help you create a passkey.'}</p>`;
        setFooter(button(existing ? 'Sign in with passkey' : `Create my passkey ${icon('arrow')}`, 'begin-owner'),
          existing ? button('I can’t use my passkey', 'recovery-help', 'text-button') : '', 'Device A1B2C3 · Local setup');
        break;
      }
      case 'recovery':
        html = heading('KEEP A WAY BACK', 'Save your recovery code.', 'If you lose your passkey, this code helps you get back into your home.') +
          `<div class="success-mark" aria-hidden="true">${icon('key')}</div>` +
          (recoveryVisible ? `<div class="recovery-code"><span class="section-label">YOUR RECOVERY CODE</span><code id="recovery-code">${SAMPLE_CODE}</code><small>Example code · Not valid for a real Navi</small></div><div class="link-row">${button(`${icon('copy')} Copy example code`, 'copy-recovery', 'secondary')}</div>` :
            message('info', 'This code is no longer shown', 'This prototype does not store recovery codes. Reopen the passkey demonstration to generate the example again.') + button('Generate an example again', 'reissue-demo-code', 'secondary')) +
          `<p class="lead recovery-guidance">Keep it somewhere private, such as your password manager. Share it only with someone you trust to own your home.</p><label class="checkbox-row"><input type="checkbox" id="recovery-saved" ${state.recoveryAcknowledged ? 'checked' : ''}><span>I’ve saved my recovery code somewhere safe.</span></label>`;
        setFooter(button(`Continue ${icon('arrow')}`, 'continue-recovery', 'primary', state.recoveryAcknowledged ? '' : 'disabled'));
        break;
      case 'home':
        html = heading('A PLACE TO CALL HOME', 'Tell Navi about home.', 'A few details help Navi get the little things right.') +
          `<form id="home-form"><label class="field" for="home-name">Home name</label><input id="home-name" name="home-name" required maxlength="60" value="${esc(state.family.name)}" autocomplete="off"><label class="field" for="home-region">Country or region</label><select id="home-region" name="home-region">${['United States','United Kingdom','Germany','France','Italy','Spain','Japan'].map(v => `<option ${v === state.family.region ? 'selected' : ''}>${v}</option>`).join('')}</select><label class="field" for="home-timezone">Time zone</label><select id="home-timezone" name="home-timezone">${['America/Los_Angeles','America/New_York','Europe/London','Europe/Berlin','Europe/Paris','Europe/Rome','Europe/Madrid','Asia/Tokyo'].map(v => `<option ${v === state.family.timeZone ? 'selected' : ''}>${v}</option>`).join('')}</select></form>` +
          `<div class="surface storage-summary"><div class="summary-row">${icon('check')}<span><strong>Storage is ready</strong><small class="hint">120 GB available · Sample device</small></span></div></div><p class="hint">These settings stay on Navi. You can choose cloud and remote features later.</p>`;
        setFooter(`<button type="submit" form="home-form" class="primary" data-action="save-home">Save my home ${icon('arrow')}</button>`);
        break;
      case 'devices':
        html = heading(state.networkChanged ? 'BACK AT HOME' : 'YOU’RE HOME', state.networkChanged ? 'Navi is connected again.' : 'Bring your devices home.',
          state.networkChanged ? `Navi is now on ${esc(state.selectedNetwork)}. Your home and devices are still here.` : 'Your Navi is ready. Add devices to your home, or bring your existing smart home along.') +
          `<div class="status-chip">${icon('check')} ${esc(state.family.name)} · ${state.networkChanged ? 'Network updated' : 'Setup complete'}</div>` +
          `<div class="choice-list terminal-grid">${choice('devices', 'Add devices', 'Cameras, lights, sensors and more.', 'add-devices')}${choice('home', 'Move Home Assistant', 'Bring your existing home and the features you choose.', 'select-ha')}</div>` +
          `<div class="surface"><div class="summary-row">${icon('lock')}<span>You choose what Navi can see and save.</span></div></div>`;
        setFooter(button('I’ll add devices later', 'finish-later', 'secondary'), '', 'You can return to add devices whenever you’re ready.');
        break;
      case 'device-categories':
        html = heading('MAKE YOURSELF AT HOME', 'Add devices', 'What would you like to connect? Choose a device type to get started.') +
          `<div class="category-grid">${CATEGORIES.map(category => `<button type="button" class="category-card" data-action="select-category" data-category="${category.id}"><span class="choice-icon">${icon(category.icon)}</span><strong>${category.title}</strong><small>${category.description}</small></button>`).join('')}</div>`;
        setFooter(button('I’ll add devices later', 'finish-later', 'secondary'), '', 'Available brands and features vary by device.');
        break;
      case 'camera-brands':
        html = heading('ADD DEVICES / CAMERA', 'Add a camera', 'Choose your camera brand to see its setup guide.') +
          `<div class="choice-list">${choice('camera', 'Arlo', 'Connect your account and choose which cameras to add.', 'select-arlo')}</div>` +
          `<div class="surface"><div class="summary-row">${icon('lock')}<span>You choose which cameras Navi can access, and what it can see and save.</span></div></div>`;
        setFooter(button('Back to device types', 'device-types', 'secondary'));
        break;
    }
    $('#screen').innerHTML = html;
    persist();
  }

  function showDialog(title, body, footer, label = 'PROTOTYPE · SIMULATED ACTION') {
    const d = $('#demo-dialog');
    if (!d.open) lastFocus = document.activeElement;
    d.innerHTML = `<div class="dialog-panel"><div class="dialog-header"><span class="demo-note">${label}</span>${button(icon('close'), 'close-dialog', 'button-icon', 'aria-label="Close demonstration"')}</div><div class="dialog-body"><h2 id="demo-title">${title}</h2>${body}</div><div class="dialog-footer">${footer}</div></div>`;
    if (!d.open) d.showModal();
    d.querySelector('button')?.focus();
  }
  function closeDialog() {
    const d = $('#demo-dialog');
    if (d.open) d.close();
  }
  function closeReview() { if ($('#review-dialog').open) $('#review-dialog').close(); }
  function review() {
    const d = $('#review-dialog');
    d.innerHTML = `<div class="dialog-panel"><div class="dialog-header"><span class="demo-note">REVIEW TOOLS</span>${button(icon('close'), 'close-review', 'button-icon', 'aria-label="Close review tools"')}</div><div class="dialog-body"><h2 id="review-title">Explore the journey.</h2><p>Choose a starting point. This resets the current demo progress.</p><div class="scenario-list">${Object.entries(SCENARIOS).map(([name, [title,desc]]) => `<button class="choice" data-action="scenario" data-scenario="${name}"><span class="choice-copy"><strong>${title}</strong><small>${desc}</small></span><span class="choice-end">${icon('chevron')}</span></button>`).join('')}</div><details class="screen-picker"><summary>Jump to a concept screen</summary><div class="screen-links">${SCREENS.map((name,i) => button(`${String(i+1).padStart(2,'0')} · ${TITLES[name]}`, 'preview-screen', 'text-button', `data-screen="${name}"`)).join('')}</div></details></div><div class="dialog-footer">${button('Restart the prototype', 'reset', 'secondary')}</div></div>`;
    d.showModal();
  }

  async function handle(action, target) {
    switch (action) {
      case 'start-wireless': state.route = 'wireless'; go('connect'); break;
      case 'start-wired':
        state.route = 'wired';
        showDialog('Connected with Ethernet', `${hero('network')}<p>In the real setup, connect your phone to the same home Wi-Fi as Navi, then open Navi’s local setup page.</p><p class="hint">This demonstration assumes the cable and home network are ready.</p>`, button('Continue with Ethernet', 'demo-wired-ready'));
        break;
      case 'demo-wired-ready': closeDialog(); state.networkConfigured = true; state.homeConnected = true; go('owner'); break;
      case 'open-wifi-demo':
        showDialog('Join Navi’s Wi-Fi', `<div class="os-sheet"><div class="section-label">ON YOUR PHONE · WI-FI</div><div class="network-option selected"><span class="choice-icon">${icon('wifi')}</span><span class="network-name">Navi-Setup-A1B2C3<small class="network-meta">No password required</small></span>${icon('chevron')}</div><p>When asked about Internet access, choose <strong>Stay connected</strong> or <strong>Use Without Internet</strong>.</p></div><p class="hint">Then return to this browser page. This preview does not change your phone’s Wi-Fi.</p>`, button('Simulate joining Navi', 'demo-join-hotspot'));
        break;
      case 'demo-join-hotspot': closeDialog(); state.hotspotConnected = true; state.error = null; render(); announce('Demonstration: connected to Navi’s hotspot.'); break;
      case 'check-local':
        if (!state.hotspotConnected) {showDialog('Connect to Navi first', '<p>Join the network on your card, then return to this page. In this prototype, use the Wi-Fi demonstration to continue.</p>', button('Show Wi-Fi steps', 'open-wifi-demo')); break;}
        go(state.ownerCreated ? 'owner' : 'confirm'); break;
      case 'mismatch': state.error = 'mismatch'; render(); break;
      case 'retry-device': state.hotspotConnected = false; state.errorConsumed = true; go('connect'); break;
      case 'confirm-device':
        showDialog('Confirm on your Navi', `${hero('hub','touch')}<p>Touch the confirmation area on Navi when it asks. This allows this phone to configure Wi-Fi for this setup session.</p><p class="hint">This is device presence confirmation. You do not need an enrolled fingerprint.</p>`, button('Simulate confirmation', 'demo-touch')); break;
      case 'demo-touch': closeDialog(); state.networkGranted = true; state.deviceConfirmed = true; go('wifi'); break;
      case 'choose-network': state.selectedNetwork = target.dataset.network; render(); break;
      case 'refresh-networks': announce('Three example Wi-Fi networks found.'); showDialog('Networks refreshed', '<p>The three sample networks are available. Choose your main home network to continue.</p>', button('Back to networks','close-dialog')); break;
      case 'toggle-password': {
        const input = $('#wifi-password'); passwordVisible = !passwordVisible; input.type = passwordVisible ? 'text' : 'password';
        target.setAttribute('aria-label', passwordVisible ? 'Hide password' : 'Show password'); target.innerHTML = icon(passwordVisible ? 'eye-off' : 'eye'); break;
      }
      case 'open-home-wifi-demo':
        showDialog('Return to your home Wi-Fi', `<div class="os-sheet"><div class="section-label">ON YOUR PHONE · WI-FI</div><div class="network-option selected"><span class="choice-icon">${icon('wifi')}</span><span class="network-name">${esc(state.selectedNetwork)}<small class="network-meta">Your home network</small></span>${icon('check')}</div></div><p>Choose your home Wi-Fi, then return to the browser tab you were using.</p><p class="hint">This is an interaction demonstration, not your phone’s actual settings.</p>`, button('Simulate returning home', 'demo-join-home')); break;
      case 'demo-join-home': closeDialog(); state.homeConnected = true; state.error = null; render(); break;
      case 'check-home':
        if (!state.homeConnected) {state.error = 'wrong-network'; render(); break;}
        if (state.ownerCreated) {state.networkChanged = true; go('devices');} else go('owner');
        break;
      case 'begin-owner':
        if (state.ownerCreated) {
          showDialog('Sign in to your Navi', `<div class="success-mark">${icon('fingerprint')}</div><p>Your phone would now ask you to approve your existing passkey with face recognition, a fingerprint or your screen lock.</p><p class="hint">No passkey is read or created in this prototype.</p>`, button('Simulate Owner sign-in', 'demo-passkey-login'), 'PROTOTYPE · PASSKEY PROMPT');
        } else {
          showDialog('Make this Navi yours', `${hero('hub','touch')}<p>Confirm on Navi to create the Owner account for this home.</p><p class="hint">This is separate from the earlier permission to set up Wi-Fi.</p>`, button('Simulate Owner confirmation', 'demo-owner-touch'));
        }
        break;
      case 'demo-owner-touch':
        showDialog('Create a passkey', `<div class="success-mark">${icon('fingerprint')}</div><p>Your phone would offer to save a passkey for this Navi, protected by face recognition, a fingerprint or your screen lock.</p><p class="hint">This example does not open a real credential prompt.</p>`, button('Simulate creating a passkey', 'demo-passkey-create'), 'PROTOTYPE · PASSKEY PROMPT');
        break;
      case 'demo-passkey-create':
        closeDialog(); state.ownerCreated = true; state.ownerAuthenticated = true; recoveryVisible = true; history = []; go('recovery', false); break;
      case 'demo-passkey-login': closeDialog(); state.ownerAuthenticated = true; state.networkGranted = true; go('wifi'); break;
      case 'copy-recovery':
        try { await navigator.clipboard.writeText(SAMPLE_CODE); announce('Example recovery code copied.'); target.innerHTML = `${icon('check')} Copied`; }
        catch (_) { showDialog('Save this example', `<p>Clipboard access is unavailable in this preview. Select and copy the example below.</p><div class="recovery-code"><code>${SAMPLE_CODE}</code></div>`,button('Done','close-dialog')); }
        break;
      case 'reissue-demo-code':
        showDialog('Restore the code demonstration', '<p>A real Navi would ask you to authenticate before replacing a lost recovery code. Here, you can replay that step with a sample.</p>', button('Simulate creating a passkey', 'demo-passkey-create')); break;
      case 'continue-recovery': if (state.recoveryAcknowledged) {recoveryVisible = false; go('home');} break;
      case 'reopen-hotspot':
        showDialog('Reopen setup on Navi', `${hero('hub','touch')}<p>Touch and hold the fingerprint area until Navi indicates that setup is available, then release.</p><p class="hint">This opens a temporary connection window. It does not reset your home or confirm ownership. The final gesture timing needs hardware validation.</p>`, button('Simulate a long touch', 'demo-long-touch')); break;
      case 'demo-long-touch': closeDialog(); state.hotspotConnected = false; state.error = null; state.errorConsumed = true; go('connect', false); break;
      case 'add-devices': go('device-categories'); break;
      case 'device-types': back(); break;
      case 'select-category': {
        const category = CATEGORIES.find(item => item.id === target.dataset.category);
        if (!category) break;
        if (category.id === 'camera') { go('camera-brands'); break; }
        showDialog(category.title, `<p>${category.description}.</p><p>The guide will help you choose a brand, find your devices and assign rooms and permissions.</p><p class="hint">This category is a concept preview. Its brand guides are not included in this prototype.</p>`, button('Back to device types', 'close-dialog'), 'NEXT CHAPTER · CATEGORY PREVIEW');
        break;
      }
      case 'select-arlo': showDialog('Next: add your Arlo camera', '<p>The next guide will help you sign in to your dedicated Arlo account, verify access and choose cameras and permissions.</p><p class="hint">You’ve reached the end of this setup concept. Arlo sign-in is not part of this prototype.</p>', button('Back to camera brands', 'close-dialog'), 'NEXT CHAPTER · CONCEPT BOUNDARY'); break;
      case 'select-ha': showDialog('Next: bring your existing home', '<p>The next guide will help you connect to Home Assistant, review a backup and choose what to move to Navi.</p><p class="hint">You’ve reached the end of this setup concept. No backup is uploaded or restored here.</p>', button('Back to my devices', 'close-dialog'), 'NEXT CHAPTER · CONCEPT BOUNDARY'); break;
      case 'finish-later': state.completed = true; persist(); showDialog('Welcome home.', `${hero('celebration')}<p>Your setup walkthrough is complete. You can add devices whenever you’re ready.</p><p class="hint">In the product, this would take you to Home.</p>`, button('Return to the final screen', 'close-dialog'), 'PROTOTYPE · WALKTHROUGH COMPLETE'); break;
      case 'recovery-help': showDialog('Recover access to your home', '<p>A real Navi would guide you through its recovery code and physical confirmation process. Reopening the setup network never removes the existing Owner.</p><p class="hint">Account recovery is outside this concept’s scope.</p>', button('Back to sign-in', 'close-dialog')); break;
      case 'help': showDialog('A little help getting connected', `<div class="mini-steps">${miniStep('1','Keep Navi powered on','Check that Navi shows it is ready.')}${miniStep('2','Use the network on your card','Stay connected even if there is no Internet.')}${miniStep('3','Come back to your browser','Your setup progress will be here.')}</div><p>If the setup network has closed, touch and hold Navi’s fingerprint area to reopen it.</p><p class="hint">Public setup instructions: setup.harbornavi.com. Offline: use the local address on your card.</p>`,button('Back to setup','close-dialog')); break;
      case 'close-dialog': closeDialog(); break;
      case 'review': review(); break;
      case 'close-review': closeReview(); break;
      case 'scenario': openScenario(target.dataset.scenario); break;
      case 'preview-screen': preview(target.dataset.screen); break;
      case 'reset': openScenario('wireless'); break;
      case 'back': back(); break;
      case 'go-welcome':
        if (state.ownerCreated) {go(state.recoveryAcknowledged ? 'home' : 'recovery');} else go('welcome');
        break;
    }
  }

  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');
    if (!target || target.disabled) return;
    if (target.dataset.action === 'submit-wifi' || target.dataset.action === 'save-home') return;
    event.preventDefault();
    handle(target.dataset.action, target);
  });
  document.addEventListener('submit', (event) => {
    event.preventDefault();
    if (event.target.id === 'wifi-form') {
      if (!state.networkGranted || (state.ownerCreated && !state.ownerAuthenticated)) return;
      const input = $('#wifi-password');
      if (!input.reportValidity()) return;
      input.value = ''; // The sample Wi-Fi secret never enters demo state or storage.
      if (state.scenario === 'wrong-password' && !state.errorConsumed) {
        state.errorConsumed = true; state.error = 'password'; state.hotspotConnected = true; render(); return;
      }
      state.networkConfigured = true; state.homeConnected = false; go('connecting');
    } else if (event.target.id === 'home-form') {
      if (!state.ownerCreated || !state.recoveryAcknowledged) return;
      state.family = {name: $('#home-name').value.trim(), region: $('#home-region').value, timeZone: $('#home-timezone').value};
      if (!state.family.name) {$('#home-name').setCustomValidity('Give your home a name.'); $('#home-name').reportValidity(); return;}
      go('devices');
    }
  });
  document.addEventListener('input', (event) => { if (event.target.id === 'home-name') event.target.setCustomValidity(''); });
  document.addEventListener('change', (event) => {
    if (event.target.id === 'recovery-saved') {
      state.recoveryAcknowledged = event.target.checked;
      $('[data-action="continue-recovery"]').disabled = !state.recoveryAcknowledged;
      persist();
    }
  });
  $('#demo-dialog').addEventListener('close', () => {if (lastFocus?.isConnected) lastFocus.focus({preventScroll: true});});
  for (const dialog of [$('#demo-dialog'), $('#review-dialog')]) {
    dialog.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab') return;
      const items = Array.from(dialog.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex="0"]'))
        .filter((element) => element.getClientRects().length > 0);
      if (!items.length) {event.preventDefault(); return;}
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    });
  }
  window.NaviPrototype = {version:'1.1', getState: () => JSON.parse(JSON.stringify(state)), openScenario, preview, reset: () => openScenario('wireless')};
  if (SCENARIOS[params.get('scenario')]) openScenario(params.get('scenario'));
  else if (SCREENS.includes(params.get('screen'))) preview(params.get('screen'));
  else render();
})();
