# Navi setup concept review

Published review entry: https://harbornavi.com/setup/
Page gallery: https://harbornavi.com/setup/gallery.html

Revision: 2026-09-14 r2 (prototype 1.1). This is a static, explicitly labeled
interactive concept using fictional household data. It performs no device,
account, Wi-Fi, Arlo or production API operations. Passkeys and physical
confirmation are simulated; temporary hotspot password removal is a proposed
experience, not an implemented HarborOS policy change.

The opening screen offers equally prominent Wi-Fi and Ethernet choices.
Add devices opens eight consumer categories inspired by Home Assistant entity
domains. Camera then opens an Arlo brand guide preview; other categories have
concept endpoints. Home Assistant migration remains separate.

The bundled product photographs are unchanged official assets:
- https://harbornavi.com/assets/home-v7-v8-hardware-id.webp
- https://harbornavi.com/assets/home-v7-v8-trust-boundary-id.webp

The source prototype passed 19 browser checks, including 320/390/430px layouts,
wireless/wired/recovery paths, keyboard access, refresh/resume, category
navigation and asset decoding. Eleven main-screen PNGs and five exception
screens were rendered from that same revision. These checks do not constitute
phone hardware, local HTTPS or radio acceptance.

Deployment copies only the reviewed static assets into public/setup. Entry
rewrites and an explicit /setup/ base URL support both slashless and trailing
slash links without changing site-wide routing rules. Review pages request
no indexing. No local provenance paths or credentials are bundled.

Use the existing production deployment workflow after merge. Validate anonymously
that both entry URLs render, assets and gallery load, Camera leads to Arlo,
and the official homepage and Privacy page still load.
