/* Official HarborNavi product photography, plus original non-product interface illustrations.
 * See assets/provenance.json. Product assets are unchanged byte-for-byte copies. */
(function () {
  'use strict';
  var sequence = 0;
  var paths = {
    devices: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    light: '<path d="M8 15c0-1.5-3-3.4-3-6a7 7 0 0 1 14 0c0 2.6-3 4.5-3 6v2H8v-2Zm1 5h6m-5 2h4m-2-5v-5m-3-3 3 3 3-3"/>',
    plug: '<rect x="5" y="2" width="14" height="20" rx="3"/><circle cx="12" cy="12" r="5"/><path d="M10 10v2m4-2v2m-3 3h2"/>',
    climate: '<path d="M10 14.5V5a3 3 0 0 1 6 0v9.5a5 5 0 1 1-6 0Z"/><path d="M13 8v9m6-12h2m-2 4h2"/><circle cx="13" cy="18" r="1.5" fill="currentColor" stroke="none"/>',
    sensor: '<circle cx="12" cy="12" r="2.5"/><path d="M7.4 7.4a6.5 6.5 0 0 0 0 9.2m9.2-9.2a6.5 6.5 0 0 1 0 9.2M4.6 4.6a10.5 10.5 0 0 0 0 14.8M19.4 4.6a10.5 10.5 0 0 1 0 14.8"/>',
    cover: '<rect x="3" y="3" width="16" height="4" rx="1"/><path d="M4 7v12h14V7M4 11h14M4 15h14m3-8v10"/><circle cx="21" cy="19" r="1.5"/>',
    media: '<rect x="6" y="2" width="12" height="20" rx="2"/><circle cx="12" cy="15" r="3.5"/><circle cx="12" cy="6.5" r="1"/>',
    wifi: '<path d="M3 8.5a14.5 14.5 0 0 1 18 0M6.3 12a9 9 0 0 1 11.4 0M9.5 15.4a3.9 3.9 0 0 1 5 0"/><circle cx="12" cy="19" r=".9" fill="currentColor" stroke="none"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    back: '<path d="M19 12H5m6-6-6 6 6 6"/>',
    check: '<path d="m5 12 4.5 4.5L19 7"/>',
    lock: '<rect x="5.5" y="10" width="13" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
    eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>',
    'eye-off': '<path d="m3 3 18 18M9.5 6.3A12.1 12.1 0 0 1 12 6c6.5 0 10 6 10 6a15 15 0 0 1-3.2 3.6M6 7.7A17.7 17.7 0 0 0 2 12s3.5 6 10 6c1.5 0 2.8-.3 4-.8M10.2 10.2a2.5 2.5 0 0 0 3.6 3.6"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 .2c0 1.7-2.5 2.1-2.5 3.8m0 3h.01"/>',
    ethernet: '<path d="M8 3h8v4h4v10H4V7h4V3Zm0 9v5m4-5v5m4-5v5m-4 0v4"/>',
    phone: '<rect x="6.5" y="2" width="11" height="20" rx="3"/><path d="M10 5h4m-3 14h2"/>',
    home: '<path d="m3 10 9-7 9 7M5.5 9v11h13V9M9.5 20v-7h5v7"/>',
    camera: '<rect x="3" y="7" width="18" height="13" rx="3"/><path d="m8 7 1.5-3h5L16 7"/><circle cx="12" cy="13.5" r="3.5"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    refresh: '<path d="M20 9a8 8 0 0 0-13.9-3L3 9m0-6v6h6m-5 6a8 8 0 0 0 13.9 3L21 15m0 6v-6h-6"/>',
    fingerprint: '<path d="M5 8a7.4 7.4 0 0 1 14 3c0 5-1.1 8-3 10M2.5 12c0-1 .1-1.9.3-2.7M5 12c0 4-.6 5.8-1.6 7M8 18c.7-1.7 1-3.7 1-6a3 3 0 0 1 6 0c0 4-1 7.4-2.6 10M8 7.8A5.2 5.2 0 0 1 12 6c3.5 0 6 2.5 6 6M12 12c0 3.7-.6 6.7-2 9m11-9c0 2.8-.3 5-.9 7"/>',
    globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 6.5h14M5 17.5h14"/>',
    copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    key: '<circle cx="8" cy="9" r="5"/><path d="m12 12 9 9m-4-4 3-3m-6 0 3-3"/><circle cx="7" cy="8" r=".7" fill="currentColor" stroke="none"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
    warning: '<path d="m10.3 4-8 14a2 2 0 0 0 1.7 3h16a2 2 0 0 0 1.7-3l-8-14a2 2 0 0 0-3.4 0Z"/><path d="M12 9v5m0 3h.01"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
    'arrow-up-right': '<path d="M6 18 18 6M6 6h12v12"/>',
    router: '<rect x="3" y="12" width="18" height="8" rx="2"/><path d="M6 12V5m12 7V5m-11 11h.01m3 0h.01m5 0h3M9 6a5 5 0 0 1 6 0m-8-3a8 8 0 0 1 10 0"/>',
    settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="var(--surface, white)"/><circle cx="15" cy="17" r="3" fill="var(--surface, white)"/>',
    sparkles: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Zm7-2 .8 2.2L22 4l-2.2.8L19 7l-.8-2.2L16 4l2.2-.8L19 1Z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
    storage: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7"/>',
    hub: '<path d="m3 9 5-5h12l1 9-5 5H4a1 1 0 0 1-1-1V9Zm0 0h13l4-5m-4 5v9M3 13h13l5-5"/><path d="M8 16h3"/>',
    bluetooth: '<path d="m12 2 6 5-12 10 6 5V2Zm0 10 6 5-6 5M6 7l6 5"/>'
  };
  window.NaviIcons = function (name) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || paths.sparkles) + '</svg>';
  };
  function wrap(content, title) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="310" height="210" viewBox="0 0 310 210" fill="none" role="img" aria-label="' + title + '">' + content + '</svg>';
  }
  function definitions(id) {
    return '<defs>' +
      '<linearGradient id="' + id + '-ground" x1="55" y1="75" x2="255" y2="180" gradientUnits="userSpaceOnUse"><stop stop-color="#EFEBFD"/><stop offset="1" stop-color="#E9E3FB" stop-opacity=".28"/></linearGradient>' +
      '</defs>';
  }
  window.NaviArt = {
    hub: function (mode) {
      var touch = mode === 'touch' || mode === 'confirm';
      var file = touch ? 'harbornavi-touch.webp' : 'harbornavi-hardware.webp';
      var alt = touch
        ? 'Official HarborNavi image showing a person touching the fingerprint control on the top of the rectangular device'
        : 'Official HarborNavi product image: a low rectangular black device with a forged-carbon-fiber top, fingerprint control, front infrared window and purple status light';
      return '<div class="official-product-art' + (touch ? ' product-touch' : '') + '"><img src="assets/' + file + '" width="1536" height="1024" alt="' + alt + '" decoding="async"></div>';
    },
    network: function () {
      return '<div class="official-product-art product-network"><img src="assets/harbornavi-hardware.webp" width="1536" height="1024" alt="Official HarborNavi rectangular home hub connecting to your phone" decoding="async"><span class="product-art-badge">' + window.NaviIcons('phone') + window.NaviIcons('wifi') + '<span>Your phone + Navi</span></span></div>';
    },
    card: function () {
      var id = 'navi-art-' + (++sequence);
      return wrap(definitions(id) +
        '<ellipse cx="155" cy="159" rx="116" ry="27" fill="url(#' + id + '-ground)"/>' +
        '<g transform="rotate(-7 155 105)"><rect x="61" y="30" width="188" height="139" rx="13" fill="#FFFFFF" stroke="#DAD1EB"/>' +
        '<path d="M79 51h25" stroke="#5B3FD6" stroke-width="4" stroke-linecap="round"/><path d="M80 70h72m-72 9h53" stroke="#D8D0E7" stroke-width="3" stroke-linecap="round"/>' +
        '<rect x="79" y="97" width="49" height="49" rx="6" fill="#F4F0FC"/>' +
        '<g stroke="#79649E" stroke-width="2"><path d="M87 105h11v11H87zM109 105h11v11h-11zM87 127h11v11H87z"/><path d="M106 125h7v6h7m-15 8h8v-5m7 1v5M104 113v8h-5m15 0h6m-33 2h5"/></g>' +
        '<path d="M141 106h32m-32 9h74m-74 16h25m-25 9h59" stroke="#D8D0E7" stroke-width="3" stroke-linecap="round"/>' +
        '<rect x="177" y="47" width="53" height="20" rx="6" fill="#EEEAFE"/><path d="M187 57h33" stroke="#AA96D6" stroke-width="2.5" stroke-linecap="round"/></g>' +
        '<path d="M265 119v-8m-4 4h8M42 66v-6m-3 3h6" stroke="#C3B5E6" stroke-width="1.2" stroke-linecap="round"/>',
        'A quick start card carries the Navi network details and setup code');
    },
    shield: function () {
      var id = 'navi-art-' + (++sequence);
      return wrap(definitions(id) +
        '<ellipse cx="155" cy="151" rx="100" ry="31" fill="url(#' + id + '-ground)"/>' +
        '<path d="m155 24 61 25v48c0 38-29 62-61 77-32-15-61-39-61-77V49l61-25Z" fill="#F3EFFD" stroke="#D9CEEF" stroke-width="1.5"/>' +
        '<path d="m155 37 48 20v41c0 28-20 50-48 64-28-14-48-36-48-64V57l48-20Z" fill="#FFFFFF"/>' +
        '<rect x="133" y="86" width="44" height="34" rx="10" fill="#EEEAFE" stroke="#A38BCF" stroke-width="1.3"/>' +
        '<path d="M143 86V76a12 12 0 0 1 24 0v10" stroke="#9579C4" stroke-width="2"/>' +
        '<circle cx="155" cy="100" r="3" fill="#7957BD"/><path d="M155 103v6" stroke="#7957BD" stroke-width="2" stroke-linecap="round"/>' +
        '<g transform="translate(211 118)"><circle cx="13" cy="13" r="17" fill="#FFFFFF"/><circle cx="13" cy="13" r="13" fill="#E7F3EB"/><path d="m7 13 4 4 8-8" stroke="#23774B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></g>' +
        '<path d="M62 100v-8m-4 4h8M244 60v-6m-3 3h6" stroke="#C3B5E6" stroke-width="1.2" stroke-linecap="round"/><circle cx="232" cy="92" r="2.5" fill="#D2C7F0"/>',
        'A shield and lock represent your private household and passkey');
    },
    celebration: function () {
      return '<div class="official-product-art product-ready"><img src="assets/harbornavi-hardware.webp" width="1536" height="1024" alt="Official HarborNavi rectangular home hub, ready for your household" decoding="async"><span class="product-art-badge">' + window.NaviIcons('check') + '<span>Welcome home</span></span></div>';
    }
  };
}());
