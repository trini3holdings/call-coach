// ============================================================================
// DASHBOARD — Call Coach v3.4
// Center view that shows per-brand vertical cards with:
//   - Brand identity + theme
//   - Audit value, prospect count, hot-list tiers
//   - Live "callable right now" + "next 2 hours" counts (per-brand only)
//   - Next prime window across all prospects (closest TZ alignment)
//   - "Train me" drilldown opening the deep training tab
// ============================================================================

// Cache for loaded brand intel — avoid re-fetching on every refresh tick
const DASH_CACHE = {};

// v3.6 — all shape normalization moved to validators.js (window.CCValidators)
// This loader only does the fetch + validate, then caches the canonical bundle.
async function loadBrandIntel(slug) {
  if (DASH_CACHE[slug]) return DASH_CACHE[slug];
  const base = `brands/${slug}`;
  // v3.8.8 — cache-bust JSON fetches so brand data refreshes hit instantly
  const CB = `?v=${Date.now()}`;
  const safeFetch = (file, fallback) =>
    fetch(`${base}/${file}${CB}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : fallback)
      .catch(() => fallback);
  try {
    const [prospectsRaw, scriptsRaw, objectionsRaw, callIntelRaw, hotListRaw, marketCpcRaw] = await Promise.all([
      safeFetch('prospects.json', []),
      safeFetch('scripts.json', {}),
      safeFetch('objections.json', {}),
      safeFetch('call_intel.json', null),
      safeFetch('_hot_list.json', null),
      safeFetch('market_cpc.json', null),
    ]);
    const V = window.CCValidators;
    if (!V) {
      console.error('CCValidators not loaded — falling back to raw bundle');
      DASH_CACHE[slug] = {
        prospects: Array.isArray(prospectsRaw) ? prospectsRaw : (prospectsRaw && prospectsRaw.prospects) || [],
        scripts: scriptsRaw || { _meta: {} },
        objections: [],
        callIntel: callIntelRaw, hotList: hotListRaw, marketCpc: marketCpcRaw,
        validation: { ok: false, errors: ['validators.js not loaded'], warnings: [] }
      };
      return DASH_CACHE[slug];
    }
    const result = V.validateBrandBundle(slug, {
      prospects: prospectsRaw, scripts: scriptsRaw, objections: objectionsRaw,
      callIntel: callIntelRaw, marketCpc: marketCpcRaw, hotList: hotListRaw
    });
    if (result.errors.length) console.warn('[dashboard] ' + slug + ' validation errors:', result.errors);
    if (result.warnings.length) console.info('[dashboard] ' + slug + ' validation warnings:', result.warnings);
    DASH_CACHE[slug] = Object.assign({}, result.value, {
      validation: { ok: result.ok, errors: result.errors, warnings: result.warnings }
    });
    return DASH_CACHE[slug];
  } catch (e) {
    console.error(`Failed to load intel for ${slug}:`, e);
    return {
      prospects: [], scripts: { _meta: {} }, objections: [],
      callIntel: null, hotList: { tier_1: [], tier_2: [], tier_3: [], tier_4: [], no_phone: [] }, marketCpc: {},
      validation: { ok: false, errors: ['Fetch threw: ' + (e && e.message || e)], warnings: [] }
    };
  }
}

// Filter prospects callable right now OR opening soon
function classifyProspects(prospects, callIntel, mode, refDate, lookaheadMin = 120) {
  if (!Array.isArray(prospects) || !callIntel) return { prime: [], soon: [], avoid: [], unknownTz: [] };
  const buckets = { prime: [], soon: [], avoid: [], unknownTz: [] };
  for (const p of prospects) {
    if (p.is_client) continue;
    // Only count callable prospects (must have a phone for "callable now")
    if (!p.phone) continue;
    const status = window.callabilityStatus(callIntel, p.market, refDate, lookaheadMin);
    if (status.status === 'off') buckets.unknownTz.push({ p, status });
    else if (status.status === 'prime') buckets.prime.push({ p, status });
    else if (status.status === 'soon') buckets.soon.push({ p, status });
    else if (status.status === 'avoid') buckets.avoid.push({ p, status });
  }
  return buckets;
}

function formatMinutesAway(min) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// v3.10.8 — gather per-brand call performance from local state + cloud sync
function getBrandPerf(slug) {
  try {
    const state = window.state || {};
    const localCalls = (state.calls || []).filter(c => c && c.brand === slug);
    const cloudCalls = (state.cloudCalls && state.cloudCalls[slug]) || [];
    // Merge by ts to dedupe
    const seen = new Set();
    const all = [];
    [...cloudCalls, ...localCalls].forEach(c => {
      const k = (c.ts || '') + '|' + (c.prospect_id || c.prospectN || '');
      if (!seen.has(k)) { seen.add(k); all.push(c); }
    });
    return all;
  } catch (e) {
    console.warn('getBrandPerf failed for', slug, e);
    return [];
  }
}

// ============================================================================
// v3.11 — Key Tips & Cadence panel
// Shows the follow-up playbook at the very top of every brand card:
//   - Attempts per company size (small / mid / enterprise)
//   - 5-day-a-week follow-up rhythm
//   - Quick best-practice reminders before dialing
// Collapsible so it doesn't crowd the card on every glance (state in localStorage).
// ============================================================================
function renderTipsPanel() {
  let collapsed = false;
  try { collapsed = localStorage.getItem('cc_tips_collapsed') === '1'; } catch (e) {}

  // Touch targets by company size — grounded in real cold-outreach data.
  // 95% of converted leads are reached by the 6th attempt; 80% of sales need 5+
  // follow-ups, yet most reps quit after 1–2. (LeadResponse, FreJun)
  const cadence = [
    { size: 'Small',      who: '1–50 employees',    attempts: '6–8 touches',   note: 'Owner answers — fewer touches, move fast' },
    { size: 'Mid',        who: '51–500 employees',  attempts: '10–12 touches', note: 'Gatekeepers — vary times, multi-thread' },
    { size: 'Enterprise', who: '500+ employees',    attempts: '12–15 touches', note: 'Email a 2nd contact while you keep dialing' },
  ];

  const cadenceRows = cadence.map(c => `
    <div class="dash-cadence-row">
      <div class="dcr-size">
        <span class="dcr-size-name">${c.size}</span>
        <span class="dcr-size-who">${c.who}</span>
      </div>
      <div class="dcr-attempts">${c.attempts}</div>
      <div class="dcr-note">${c.note}</div>
    </div>
  `).join('');

  // Best call windows — Tue–Thu, 10–11 AM is the #1 connect window, 4–5 PM is #2.
  // (HubSpot, Close.com). Avoid Mon AM, the 12–2 lunch dead zone, and Fri afternoon.
  const windows = [
    { label: '10–11 AM, Tue–Thu',  sub: '#1 connect window — call first',  tag: 'best' },
    { label: '4–5 PM, Tue–Thu',    sub: '#2 window — decision-makers free', tag: 'good' },
    { label: 'Mon AM · 12–2 · Fri PM', sub: 'Dead zones — skip live calls', tag: 'avoid' },
  ];
  const windowRow = windows.map(w => `
    <div class="dash-window ${w.tag}">
      <span class="dw-label">${w.label}</span>
      <span class="dw-sub">${w.sub}</span>
    </div>
  `).join('');

  // 5-day rhythm — EVERY day is a call + an email touch. Email goes to a DIFFERENT
  // contact than you're dialing (multi-thread). Multi-channel lifts conversion ~28%.
  // (GreetNow). Email copy follows Jeremy Miner / NEPQ: no "just following up".
  const week = [
    { d: 'Mon', call: 'Call DM — 10–11 AM. No voicemail words like “checking in.”',
                mail: 'Email a 2nd contact (ops/owner): “Tried reaching [name] — does this land on your desk?”' },
    { d: 'Tue', call: 'Call DM — 4–5 PM (new time of day).',
                mail: 'Email the DM, Miner pattern-interrupt: “Reached out a couple times, didn’t hear back… where should we go from here?”' },
    { d: 'Wed', call: 'Call DM — 10–11 AM. Reference the missed jobs, not the audit.',
                mail: 'Email 2nd contact: forward the 1-line revenue-gain number for their site.' },
    { d: 'Thu', call: 'Call DM — 4–5 PM. Offer Thu/Fri audit slots.',
                mail: 'Email DM: “Did you give up on getting those missed jobs back?” (their words, no pitch).' },
    { d: 'Fri', call: 'Call DM — 10–11 AM, last live attempt of the week.',
                mail: 'Breakup email to DM + cc 2nd contact: “Assuming the timing’s off — want me to close the file?”' },
  ];
  const weekRow = week.map(w => `
    <div class="dash-week-day">
      <span class="dwd-day">${w.d}</span>
      <div class="dwd-tasks">
        <span class="dwd-task call"><span class="dwd-chan">📞 Call</span> ${w.call}</span>
        <span class="dwd-task mail"><span class="dwd-chan">✉️ Email</span> ${w.mail}</span>
      </div>
    </div>
  `).join('');

  const tips = [
    'Every weekday = a call AND an email — the email goes to a <strong>different person</strong> (owner, ops, office mgr) so you’re multi-threaded.',
    'Banned words (Jeremy Miner / NEPQ): <strong>“just following up,” “checking in,” “circling back.”</strong> They trigger sales resistance — use a pattern interrupt instead.',
    'Miner’s revival email, word-for-word: <em>“Tried to reach you a few times the last couple weeks, didn’t hear back… where should we go from here?”</em>',
    'Lead every touch with what they can <strong>make</strong> (jobs/revenue gained), not what they’re losing.',
    'Log every attempt — the count only works if it’s tracked.',
  ];
  const tipsList = tips.map(t => `<li>${t}</li>`).join('');

  return `
    <div class="dash-tips ${collapsed ? 'collapsed' : ''}" data-tips-panel>
      <div class="dash-tips-head" data-action="toggle-tips">
        <span class="dash-tips-title">📌 Key Tips &amp; Follow-Up Cadence</span>
        <span class="dash-tips-toggle">${collapsed ? 'Show ▾' : 'Hide ▴'}</span>
      </div>
      <div class="dash-tips-body">
        <div class="dash-tips-sub">Touches before you stop — by company size</div>
        <div class="dash-cadence">${cadenceRows}</div>

        <div class="dash-tips-sub">Best call windows</div>
        <div class="dash-windows">${windowRow}</div>

        <div class="dash-tips-sub">5-day rhythm — every day is a call <em>and</em> an email (different contact)</div>
        <div class="dash-week">${weekRow}</div>

        <div class="dash-tips-sub">Before you dial</div>
        <ul class="dash-tips-list">${tipsList}</ul>

        <div class="dash-tips-cite">Cadence &amp; windows: LeadResponse, FreJun, HubSpot, Close.com, GreetNow · Follow-up language: Jeremy Miner (NEPQ)</div>
      </div>
    </div>
  `;
}
window.renderTipsPanel = renderTipsPanel;

// ============================================================================
// v3.12 — Per-brand Market Stats block
// A quick "know your prospect's world" snapshot per brand: market size, growth,
// typical job/ticket value, lead economics, and close rate. Gives the caller
// real numbers to anchor the revenue-gain pitch. Sourced data, per brand.
// CritterClick (wildlife removal) is built out first; others fall back gracefully.
// ============================================================================
const MARKET_STATS = {
  critterclick: {
    label: 'US Wildlife Removal Market',
    stats: [
      { k: 'Market size',    v: '~$2.8B/yr', s: 'US wildlife control industry revenue' },
      { k: 'Growth',         v: '6.9% CAGR', s: 'Fastest-growing pest segment' },
      { k: 'Avg job value',  v: '$200–$1,500', s: 'Raccoon $200–600 · bat/attic $300–1,500' },
      { k: 'Close rate',     v: '50–60%', s: 'Exclusive wildlife leads' },
      { k: 'Cost per lead',  v: '$60–$95', s: 'Typical paid wildlife CPL' },
      { k: 'Median shop',    v: '$263K rev', s: '~$124K owner earnings/yr' },
    ],
    why: 'Emergency buying: a panicked homeowner hires the first shop that\u2019s easy to reach. Every captured call is a $200\u2013$1,500 job at a 50\u201360% close rate \u2014 that\u2019s the revenue you\u2019re putting back on their calendar.',
    cite: 'Clicks Geek/NWCOA, Persistence Market Research, HomeGuide, Angi, Iron-Chess SEO, Pest Hound, BizBite',
  },
  'conversion-exotics': {
    label: 'US Exotic & Luxury Car Rental Market',
    stats: [
      { k: 'Market size',    v: '~$6.3B/yr', s: 'US luxury car rental market 2025 revenue' },
      { k: 'Growth',         v: '8.3% CAGR', s: 'Projected growth 2025–2035' },
      { k: 'Avg booking',    v: '$500–$3,500/day', s: 'Exotic car daily rental rate (Ferrari, Lambo, Rolls)' },
      { k: 'Close rate',     v: '20–35%', s: 'Inbound/paid digital booking inquiries' },
      { k: 'Cost per lead',  v: '$75–$200', s: 'Paid search CPL, luxury auto rental vertical' },
      { k: 'Median shop',    v: '$400K–$1M rev', s: 'Independent exotic rental operator annual revenue' },
    ],
    why: 'Luxury renters decide in 3 seconds — a fast, frictionless booking flow turns a browsing high-net-worth renter into a $500–$3,500/day booking. Every captured rental your fix puts back on their calendar is immediate top-line revenue.',
    cite: 'Market Research Future (US Luxury Car Rental 2025), CarRentalList.com 2026 Market Report, Startup Model Hub, Fisher Luxury Rental, ZenBusiness',
  },
  'conversionjet': {
    label: 'US Private Jet Charter Market',
    stats: [
      { k: 'Market size',    v: '~$16.4B/yr', s: 'US private jet charter services revenue 2025' },
      { k: 'Growth',         v: '7.9% CAGR', s: 'Projected growth 2026–2031' },
      { k: 'Avg charter',    v: '$15K–$75K/trip', s: 'Domestic on-demand charter, light to heavy jet' },
      { k: 'Close rate',     v: '3–8%', s: 'Click-to-inquiry; qualified inquiry-to-book ≈25–40%' },
      { k: 'Cost per lead',  v: '$300–$600', s: 'Paid search CPL, private aviation vertical' },
      { k: 'Median shop',    v: '~$12M rev', s: 'Average US charter operator annual revenue (IBISWorld)' },
    ],
    why: 'A single recovered charter booking is $15K–$75K in revenue. Quote-flow friction drops high-intent buyers — every fix to the booking funnel puts a full-fare charter back on the operator’s calendar.',
    cite: 'GlobeNewswire Private Jet Charter 2026, IBISWorld US Private Jet Charters, Future Market Report, Profitable Venture Magazine, AdShot Media',
  },
  'rme-roofing': {
    label: 'US Residential Roofing Market',
    stats: [
      { k: 'Market size',    v: '~$31.5B/yr', s: 'US roofing contractor market 2025 revenue' },
      { k: 'Growth',         v: '6.0% CAGR', s: 'Projected growth 2026–2031 (residential segment)' },
      { k: 'Avg job',        v: '$12K–$18K', s: 'Residential reroof / insurance replacement job' },
      { k: 'Close rate',     v: '20–35%', s: 'Inbound / exclusive paid leads' },
      { k: 'Cost per lead',  v: '$80–$220', s: 'Google Ads CPL, roofing contractors 2026' },
      { k: 'Median shop',    v: '~$1.5M rev', s: 'Typical small roofing contractor annual revenue' },
    ],
    why: 'A homeowner with hail damage hires the first contractor they can reach. Every lead-flow fix puts a $12K–$18K insurance job back on the operator’s calendar — and a 30–40% close rate means even modest traffic gains move real revenue.',
    cite: 'Market Data Forecast US Roofing 2025, Mordor Intelligence, Verisk 2026 Roof Report, RoofPredict CPL Benchmark, BizBite.io, Pipeline On Roofing Revenue',
  },
};

function renderMarketStats(slug) {
  const m = MARKET_STATS[slug];
  if (!m) return '';
  let collapsed = false;
  try { collapsed = localStorage.getItem('cc_market_collapsed_' + slug) === '1'; } catch (e) {}

  const cells = m.stats.map(st => `
    <div class="dash-mkt-cell">
      <div class="dmk-v">${st.v}</div>
      <div class="dmk-k">${st.k}</div>
      <div class="dmk-s">${st.s}</div>
    </div>
  `).join('');

  return `
    <div class="dash-market ${collapsed ? 'collapsed' : ''}" data-market-panel data-brand="${slug}">
      <div class="dash-market-head" data-action="toggle-market" data-brand="${slug}">
        <span class="dash-market-title">\ud83d\udcca Market Snapshot \u2014 ${m.label}</span>
        <span class="dash-market-toggle">${collapsed ? 'Show \u25be' : 'Hide \u25b4'}</span>
      </div>
      <div class="dash-market-body">
        <div class="dash-mkt-grid">${cells}</div>
        <div class="dash-mkt-why"><strong>Why it matters:</strong> ${m.why}</div>
        <div class="dash-mkt-cite">Sources: ${m.cite}</div>
      </div>
    </div>
  `;
}
window.renderMarketStats = renderMarketStats;

// ============================================================================
// v3.14 — Per-brand Follow-Up Email templates (Jeremy Miner / NEPQ style)
// 3 emails per brand: Day-1 recap, Day-3 value nudge, Day-5 breakup/revival.
// NO "just following up / checking in / circling back". Miner revival +
// "did you give up on…" breakup. Each tailored to the brand's dollar anchor.
// ============================================================================
const FOLLOWUP_EMAILS = {
  critterclick: {
    accent: 'wildlife removal',
    emails: [
      {
        when: 'Day 1 — Recap',
        subj: 'The booking leak on your wildlife site',
        body: `Hey [first name],\n\nThanks for the few minutes earlier. Quick recap of what I flagged on your site: when a panicked homeowner with something in the attic lands on your page, the booking step is losing them before they ever reach the phone.\n\nI mapped it to roughly $2,000–$6,000 a week in jobs that should be hitting your calendar — that's 5–10 recoverable jobs at your average ticket.\n\nWant me to send the 90-second sample audit so you can see exactly where it leaks? Just reply "send it."` ,
      },
      {
        when: 'Day 3 — Value nudge',
        subj: 'The one fix most wildlife shops miss',
        body: `Hey [first name],\n\nOne thing I didn't get to: the shops that win the emergency caller aren't the cheapest — they're the easiest to reach in the first 3 seconds. Your competitors who fixed their booking path are pulling the after-dark "there's a bat in my house" calls you're currently splitting with them.\n\nI'll show you the exact spot it breaks on your page. Worth a 10-minute look this week?` ,
      },
      {
        when: 'Day 5 — Breakup / revival',
        subj: 'Where should we go from here?',
        body: `Hey [first name],\n\nTried to reach you a couple times and left a message or two this week, but didn't hear back from you...\n\nWhere should we go from here?\n\n— or —\n\nDid you give up on capturing those after-hours jobs, or did something else come up?` ,
      },
    ],
  },
  'conversion-exotics': {
    accent: 'exotic & luxury car rental',
    emails: [
      {
        when: 'Day 1 — Recap',
        subj: 'The booking leak on your rental site',
        body: `Hey [first name],\n\nThanks for the time earlier. Recap: a high-end renter taps your ad, decides in ~3 seconds, and your booking flow is dropping a chunk of them before they ever reserve.\n\nI tied that to roughly $5,000–$15,000 a week in bookings that should be landing on your calendar at your $500–$3,500/day rates.\n\nWant the sample audit that shows exactly where it leaks? Reply "send it" and it's yours.` ,
      },
      {
        when: 'Day 3 — Value nudge',
        subj: 'Why luxury renters bounce in 3 seconds',
        body: `Hey [first name],\n\nOne piece I didn't cover: luxury renters don't read — they scan and decide instantly. The operators booking the Ferrari/Lambo weekends aren't the cheapest, they're the frictionless ones.\n\nThere's one spot on your page doing most of the damage. Ten minutes and I'll show you. Good this week?` ,
      },
      {
        when: 'Day 5 — Breakup / revival',
        subj: 'Where should we go from here?',
        body: `Hey [first name],\n\nTried to reach you a couple times and left a message or two this week, but didn't hear back...\n\nWhere should we go from here?\n\n— or —\n\nDid you give up on capturing those higher-ticket bookings, or did something else come up?` ,
      },
    ],
  },
  'conversionjet': {
    accent: 'private charter',
    emails: [
      {
        when: 'Day 1 — Recap',
        subj: 'The quote-flow leak on your site',
        body: `Hello [first name],\n\nThank you for the time earlier. To recap what I flagged: high-intent buyers reaching your quote page are dropping before they complete a request — the friction sits in the first screen they see.\n\nI mapped it to a meaningful share of $15,000–$75,000 trips that should be reaching your team.\n\nIf useful, I can send a brief sample audit showing exactly where it occurs. A reply of "please send" is all I need.` ,
      },
      {
        when: 'Day 3 — Value nudge',
        subj: 'One detail on your quote page',
        body: `Hello [first name],\n\nOne point I didn't reach: the operators capturing the most direct charter requests aren't the largest — they're the ones whose quote path is effortless for a serious buyer.\n\nThere is a single element on your page responsible for most of the drop. I can walk you through it in ten minutes this week if that's convenient.` ,
      },
      {
        when: 'Day 5 — Breakup / revival',
        subj: 'Where should we go from here?',
        body: `Hello [first name],\n\nI've tried to reach you a couple of times and left a message or two this week, but haven't heard back...\n\nWhere should we go from here?\n\n— or —\n\nDid you set aside recovering those direct charter requests, or did the timing simply shift?` ,
      },
    ],
  },
  'rme-roofing': {
    accent: 'roofing',
    emails: [
      {
        when: 'Day 1 — Recap',
        subj: 'The lead leak on your roofing site',
        body: `Hey [first name],\n\nThanks for the few minutes earlier. Recap: you're paying $40–$75 a click in this market, but the lead form / phone placement is letting paid traffic slip away before it becomes a job.\n\nThat's roughly $15,000–$30,000 a week in roofing jobs — 1–3 recoverable jobs at $12K–$18K each — that should be on your calendar.\n\nWant the sample audit that shows exactly where it leaks? Reply "send it."` ,
      },
      {
        when: 'Day 3 — Value nudge',
        subj: 'Buying clicks that never become jobs',
        body: `Hey [first name],\n\nOne thing I didn't get to: when a homeowner with hail damage hits your page, they hire the first contractor easy to reach. If the form fights them or the phone is buried, you paid for that click and handed the job to the next roofer.\n\nThere's one fix that moves real money. Ten minutes this week and I'll show you the spot.` ,
      },
      {
        when: 'Day 5 — Breakup / revival',
        subj: 'Where should we go from here?',
        body: `Hey [first name],\n\nTried to reach you a couple times and left a message or two this week, but didn't hear back...\n\nWhere should we go from here?\n\n— or —\n\nDid you give up on turning that paid traffic into booked jobs, or did something else come up?` ,
      },
    ],
  },
};

function renderFollowupEmails(slug) {
  const e = FOLLOWUP_EMAILS[slug];
  if (!e) return '';
  let collapsed = true;
  try {
    const v = localStorage.getItem('cc_emails_collapsed_' + slug);
    if (v === '0') collapsed = false;
  } catch (err) {}

  const cards = e.emails.map((m, i) => `
    <div class="dash-email">
      <div class="de-head">
        <span class="de-when">${escapeHtml(m.when)}</span>
        <button class="de-copy" data-action="copy-email" data-brand="${slug}" data-idx="${i}">Copy</button>
      </div>
      <div class="de-subj"><span class="de-subj-k">Subject:</span> ${escapeHtml(m.subj)}</div>
      <pre class="de-body" data-email-body>${escapeHtml(m.body)}</pre>
    </div>
  `).join('');

  return `
    <div class="dash-emails ${collapsed ? 'collapsed' : ''}" data-emails-panel data-brand="${slug}">
      <div class="dash-emails-head" data-action="toggle-emails" data-brand="${slug}">
        <span class="dash-emails-title">✉️ Follow-Up Emails — ${escapeHtml(e.accent)} (Miner / NEPQ)</span>
        <span class="dash-emails-toggle">${collapsed ? 'Show ▾' : 'Hide ▴'}</span>
      </div>
      <div class="dash-emails-body">
        <div class="dash-emails-note">Swap <strong>[first name]</strong> for the contact. No "just following up." Day 5 is Miner's revival + breakup.</div>
        ${cards}
      </div>
    </div>
  `;
}
window.renderFollowupEmails = renderFollowupEmails;
window.FOLLOWUP_EMAILS = FOLLOWUP_EMAILS;

function renderBrandCard(slug, brand, intel, mode) {
  const { prospects = [], scripts = {}, callIntel, hotList, marketCpc, validation } = intel || {};
  const theme = brand.theme || { ink: '#1a1a1a', gold: '#888', cream: '#f4f0e8', highlight: '#fff8e8' };

  // v3.6 — if validation fully failed, render an error card and exit
  if (validation && validation.errors && validation.errors.length && prospects.length === 0) {
    return `
      <div class="dash-brand-card dash-brand-card-error" data-brand="${slug}" style="--brand-ink:${theme.ink};--brand-gold:${theme.gold};">
        <div class="dash-brand-head">
          <div class="dash-brand-short">${brand.short || '?'}</div>
          <div class="dash-brand-meta">
            <div class="dash-brand-name">${escapeHtml(brand.name || slug)}</div>
            <div class="dash-brand-sub">Failed to load brand data</div>
          </div>
        </div>
        <div class="dash-error-body">
          <div class="dash-error-title">⚠️ Data validation failed</div>
          <ul class="dash-error-list">
            ${validation.errors.slice(0, 5).map(e => `<li>${escapeHtml(e)}</li>`).join('')}
          </ul>
          <div class="dash-error-help">Check brands/${slug}/ JSON files in the repo.</div>
        </div>
      </div>`;
  }

  const meta = (scripts._meta) || {};
  const auditValue = meta.audit_value || 3000;
  const industry = meta.industry || 'unspecified';
  const totalProspects = prospects.filter(p => !p.is_client).length;
  // v3.8.9 — strict phone check: 'Not published', 'Form only', 'support via app only' etc. don't count
  const looksLikeRealPhone = (ph) => {
    if (!ph) return false;
    const s = String(ph).trim();
    if (!s) return false;
    if (/not\s*publish|form\s*only|app\s*only|chat\s*only|none|n\/?a|tbd|unknown|123[-\s]?456/i.test(s)) return false;
    // Require at least 7 digits
    return (s.match(/\d/g) || []).length >= 7;
  };
  const withPhone = prospects.filter(p => !p.is_client && looksLikeRealPhone(p.phone)).length;
  const withoutPhone = totalProspects - withPhone;

  // v3.6 — canonical unified hot list tiers
  const t1 = hotList?.tier_1?.length || 0;
  const t2 = hotList?.tier_2?.length || 0;
  const t3 = hotList?.tier_3?.length || 0;
  const t4 = hotList?.tier_4?.length || 0;
  const noPhone = hotList?.no_phone?.length || 0;

  // v3.6 — only badge for actionable warnings; suppress internal shape-normalization notices.
  const NOISE_PATTERNS = [
    /used wrapper shape/i,
    /used flat A\/B\/C shape/i,
    /call_intel\.json missing/i,
    /unwrapped/i,
  ];
  const actionableWarnings = (validation?.warnings || []).filter(w =>
    !NOISE_PATTERNS.some(rx => rx.test(w))
  );
  const warnBadge = actionableWarnings.length
    ? `<span class="dash-warn-badge" title="${escapeHtml(actionableWarnings.join(' · '))}">!</span>`
    : '';

  // Live classification
  const buckets = classifyProspects(prospects, callIntel, mode, new Date());
  const primeCount = buckets.prime.length;
  const soonCount = buckets.soon.length;
  const avoidCount = buckets.avoid.length;
  const liveCount = mode === 'soon' ? primeCount + soonCount : primeCount;
  const liveLabel = mode === 'soon' ? 'callable now or within 2h' : 'callable right now';

  // Build sample callable prospects (top 5 by tier)
  const samplePool = mode === 'soon' ? [...buckets.prime, ...buckets.soon] : [...buckets.prime];
  const sample = samplePool.slice(0, 5).map(({ p, status }) => `
    <div class="dash-sample-row" data-id="${p.id}" data-brand="${slug}">
      <div class="dsr-main">
        <div class="dsr-company">${escapeHtml(p.company || p.domain || p.id)}</div>
        <div class="dsr-market">${escapeHtml(p.market || '')} · ${status.localTime || ''}</div>
      </div>
      <div class="dsr-meta">
        <span class="dsr-risk risk-${(p.risk || 'low').toLowerCase()}">${p.risk || 'LOW'}</span>
        <span class="dsr-status status-${status.status}">${status.status === 'prime' ? '● PRIME' : status.status === 'soon' ? `◐ ${status.opensIn}m` : status.status}</span>
      </div>
    </div>
  `).join('') || `<div class="dash-empty">No prospects in window. Try the toggle, or wait for the next prime block.</div>`;

  // ---- Performance snapshot from local + cloud call log ----
  const brandCalls = getBrandPerf(slug);
  const now = new Date();
  const todayKey = now.toDateString();
  const last7Cutoff = now.getTime() - 7 * 86400000;
  const todayCalls = brandCalls.filter(c => c.ts && new Date(c.ts).toDateString() === todayKey);
  const last7 = brandCalls.filter(c => c.ts && new Date(c.ts).getTime() >= last7Cutoff);
  const BOOKED_SET = new Set(['BK', 'SH', 'CL']);
  const bookedAll = brandCalls.filter(c => BOOKED_SET.has(c.outcome));
  const bookedToday = todayCalls.filter(c => BOOKED_SET.has(c.outcome)).length;
  const bookedLast7 = last7.filter(c => BOOKED_SET.has(c.outcome)).length;
  const totalCalls = brandCalls.length;
  const bookRate = totalCalls > 0 ? Math.round((bookedAll.length / totalCalls) * 100) : 0;
  const bookRateClass = bookRate >= 15 ? 'good' : bookRate >= 7 ? 'warn' : (totalCalls > 0 ? 'bad' : '');
  // Pipeline value = total booked closes × audit value
  const pipelineVal = bookedAll.length * auditValue;
  // Top variant by book rate
  const variantStats = {};
  brandCalls.forEach(c => {
    if (!c.variant) return;
    if (!variantStats[c.variant]) variantStats[c.variant] = { calls: 0, booked: 0 };
    variantStats[c.variant].calls++;
    if (BOOKED_SET.has(c.outcome)) variantStats[c.variant].booked++;
  });
  let topVar = null;
  Object.entries(variantStats).forEach(([v, s]) => {
    if (s.calls < 2) return;
    const rate = s.booked / s.calls;
    if (!topVar || rate > topVar.rate) topVar = { v, rate, calls: s.calls };
  });
  const topVarLabel = topVar ? `${topVar.v} · ${Math.round(topVar.rate * 100)}%` : '—';

  const perfBlock = `
    <div class="dash-kpi-row">
      <div class="dash-kpi">
        <div class="dk-num">${totalCalls}</div>
        <div class="dk-label">Calls logged</div>
        <div class="dk-sub">${todayCalls.length} today</div>
      </div>
      <div class="dash-kpi">
        <div class="dk-num ${bookedAll.length > 0 ? 'good' : ''}">${bookedAll.length}</div>
        <div class="dk-label">Booked</div>
        <div class="dk-sub">${bookedLast7} in 7d</div>
      </div>
      <div class="dash-kpi">
        <div class="dk-num ${bookRateClass}">${totalCalls > 0 ? bookRate + '%' : '—'}</div>
        <div class="dk-label">Book rate</div>
        <div class="dk-sub">Top: ${topVarLabel}</div>
      </div>
      <div class="dash-kpi">
        <div class="dk-num">$${(pipelineVal / 1000).toFixed(pipelineVal >= 10000 ? 0 : 1)}k</div>
        <div class="dk-label">Pipeline</div>
        <div class="dk-sub">at $${auditValue.toLocaleString()}/audit</div>
      </div>
    </div>`;

  // ---- Last call row ----
  const lastCall = brandCalls.length > 0 ? brandCalls.reduce((a, b) => (a.ts > b.ts ? a : b)) : null;
  let lastCallBlock = '';
  if (lastCall) {
    const lastTs = new Date(lastCall.ts);
    const ageMin = Math.floor((Date.now() - lastTs.getTime()) / 60000);
    const ageStr = ageMin < 60 ? `${ageMin}m ago` : ageMin < 1440 ? `${Math.floor(ageMin / 60)}h ago` : `${Math.floor(ageMin / 1440)}d ago`;
    const outc = lastCall.outcome || '?';
    const isBooked = BOOKED_SET.has(outc);
    const isDeclined = ['DC', 'NI', 'NL'].includes(outc);
    const pillClass = isBooked ? 'booked' : isDeclined ? 'declined' : '';
    const company = (lastCall.company || lastCall.prospect_id || lastCall.prospectN || '').toString().slice(0, 28);
    lastCallBlock = `
      <div class="dash-last-call">
        <div>
          <div class="dlc-label">Last call</div>
          <div class="dlc-val">${escapeHtml(company || '—')} · ${escapeHtml(lastCall.caller || '?')} · ${ageStr}</div>
        </div>
        <span class="dlc-pill ${pillClass}">${escapeHtml(outc)}${lastCall.variant ? ' · ' + escapeHtml(lastCall.variant) : ''}</span>
      </div>`;
  } else {
    lastCallBlock = `
      <div class="dash-last-call">
        <div>
          <div class="dlc-label">Last call</div>
          <div class="dlc-val" style="color:#999;font-weight:400">No calls logged yet — click Enter to start</div>
        </div>
      </div>`;
  }

  // ---- 14-day activity strip (bar = call count per day, green = had a booking) ----
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  const maxCount = Math.max(1, ...days.map(d => brandCalls.filter(c => new Date(c.ts).toDateString() === d.toDateString()).length));
  const activityBars = days.map(d => {
    const dayCalls = brandCalls.filter(c => new Date(c.ts).toDateString() === d.toDateString());
    const count = dayCalls.length;
    const hadBooking = dayCalls.some(c => BOOKED_SET.has(c.outcome));
    const heightPct = count > 0 ? Math.max(20, Math.round((count / maxCount) * 100)) : 0;
    const cls = hadBooking ? 'booked' : count > 0 ? 'has' : '';
    const tip = `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${count} call${count === 1 ? '' : 's'}${hadBooking ? ' · booked' : ''}`;
    return `<div class="dash-act-bar ${cls}" style="height:${heightPct}%" title="${escapeHtml(tip)}"></div>`;
  }).join('');
  const activityBlock = `
    <div class="dash-section">
      <h4 class="dash-section-title">14-day activity</h4>
      <div class="dash-activity-strip">${activityBars}</div>
      <div class="dash-act-legend">
        <span>${days[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
        <span>Today</span>
      </div>
    </div>`;

  // Compute next prime window for sample of resolved prospects (use first prospect with TZ as anchor)
  const anchor = prospects.find(p => !p.is_client && p.phone && window.resolveMarketTZ(p.market));
  let nextWindow = null;
  if (anchor && callIntel) {
    nextWindow = window.nextPrimeWindow(callIntel, anchor.market, new Date());
  }

  // Best block summary
  const primaryBlocks = (callIntel?.primary_blocks || []).map(pb => `
    <div class="dash-block-row">
      <span class="dbr-label">${pb.label}</span>
      <span class="dbr-time">${window.to12h(pb.start)}–${window.to12h(pb.end)}</span>
      <span class="dbr-days">${(pb.days || []).join(' · ')}</span>
    </div>
  `).join('');

  // Top markets (by prospect count, with CPC)
  const marketCounts = {};
  for (const p of prospects) {
    if (p.is_client || !p.market || p.market === 'Unknown') continue;
    marketCounts[p.market] = (marketCounts[p.market] || 0) + 1;
  }
  const topMarkets = Object.entries(marketCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([m, n]) => {
      const cpc = marketCpc?.[m];
      const cpcStr = cpc ? `$${cpc.cpc_low}–$${cpc.cpc_high}` : '—';
      return `<div class="dash-market-row"><span class="dmr-name">${escapeHtml(m)}</span><span class="dmr-count">${n}</span><span class="dmr-cpc">${cpcStr}</span></div>`;
    }).join('');

  // ---- v3.11 — Key Tips & Cadence panel (top of every brand card) ----
  const tipsBlock = window.renderTipsPanel ? window.renderTipsPanel() : '';
  const marketBlock = window.renderMarketStats ? window.renderMarketStats(slug) : '';
  const emailsBlock = window.renderFollowupEmails ? window.renderFollowupEmails(slug) : '';

  return `
    <article class="dash-card" data-brand="${slug}" style="--ink:${theme.ink};--gold:${theme.gold};--cream:${theme.cream};--highlight:${theme.highlight};">
      <header class="dash-card-head">
        <div class="dch-left">
          <div class="dch-logo">${escapeHtml(brand.short || slug.slice(0,2).toUpperCase())}</div>
          <div class="dch-meta">
            <h3 class="dch-name">${escapeHtml(brand.name)}${warnBadge}</h3>
            <div class="dch-sub">${escapeHtml(brand.sub || '')}</div>
          </div>
        </div>
        <button class="dash-enter-btn" data-action="enter" data-brand="${slug}">Enter Call Coach →</button>
      </header>

      <div class="dash-card-body">

        <!-- Key tips & cadence (top of card) -->
        ${tipsBlock}

        <!-- Per-brand market snapshot -->
        ${marketBlock}

        <!-- Per-brand follow-up email templates -->
        ${emailsBlock}

        <!-- Live status banner -->
        <div class="dash-live">
          <div class="dash-live-num">${liveCount}</div>
          <div class="dash-live-label">${liveLabel}</div>
          ${mode === 'now' && soonCount > 0 ? `<div class="dash-live-sub">+${soonCount} more in next 2 hours</div>` : ''}
          ${nextWindow ? `<div class="dash-live-sub">Next prime: ${nextWindow.weekday} ${nextWindow.hhmm12 || window.to12h(nextWindow.hhmm)} (${formatMinutesAway(nextWindow.opensInMinutes)} away)</div>` : ''}
        </div>

        <!-- Brand stats grid -->
        <div class="dash-stats-grid">
          <div class="dash-stat"><div class="ds-num">${totalProspects}</div><div class="ds-label">Total prospects</div></div>
          <div class="dash-stat"><div class="ds-num">${withPhone}</div><div class="ds-label">📞 Callable now</div></div>
          <div class="dash-stat"><div class="ds-num" style="color:#f59e0b">${withoutPhone}</div><div class="ds-label">No phone yet</div></div>
          <div class="dash-stat"><div class="ds-num">$${auditValue.toLocaleString()}</div><div class="ds-label">Audit value</div></div>
          <div class="dash-stat"><div class="ds-num">${Object.keys(scripts).filter(k => !k.startsWith('_')).length}</div><div class="ds-label">Script variants</div></div>
        </div>

        <!-- Performance KPI row -->
        ${perfBlock}

        <!-- Last call -->
        ${lastCallBlock}

        <!-- 14-day activity strip -->
        ${activityBlock}

        <!-- Hot list tiers -->
        <div class="dash-section">
          <h4 class="dash-section-title">Hot list tiers</h4>
          <div class="dash-tiers">
            <div class="dash-tier tier-1"><span class="dt-num">${t1}</span><span class="dt-label">T1 · top</span></div>
            <div class="dash-tier tier-2"><span class="dt-num">${t2}</span><span class="dt-label">T2 · caution</span></div>
            <div class="dash-tier tier-3"><span class="dt-num">${t3}</span><span class="dt-label">T3 · solid</span></div>
            <div class="dash-tier tier-4"><span class="dt-num">${t4}</span><span class="dt-label">T4 · warm</span></div>
            <div class="dash-tier tier-x"><span class="dt-num">${noPhone}</span><span class="dt-label">No phone</span></div>
          </div>
        </div>

        <!-- Callable sample -->
        <div class="dash-section">
          <h4 class="dash-section-title">Top callable ${mode === 'soon' ? 'soon' : 'now'}</h4>
          <div class="dash-samples">${sample}</div>
        </div>

        <!-- Top markets -->
        <div class="dash-section">
          <h4 class="dash-section-title">Top markets · CPC band</h4>
          <div class="dash-markets">${topMarkets || '<div class="dash-empty">No market data.</div>'}</div>
        </div>

        <!-- Primary blocks summary -->
        <div class="dash-section">
          <h4 class="dash-section-title">Primary call blocks (prospect local time)</h4>
          <div class="dash-blocks">${primaryBlocks || '<div class="dash-empty">No call intel loaded.</div>'}</div>
        </div>

        <!-- Footer actions -->
        <footer class="dash-card-foot">
          <button class="dash-train-btn" data-action="train" data-brand="${slug}">Train me on this brand →</button>
        </footer>

      </div>
    </article>
  `;
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Render the full dashboard
async function renderDashboard(mode = 'now') {
  const root = document.getElementById('dashboardRoot');
  if (!root) return;

  // Header + global toggle
  const tonyLocal = window.localTimeIn('America/Chicago');
  const tonyLocalDisplay = tonyLocal ? (tonyLocal.hhmm12 || tonyLocal.hhmm) : '';
  root.innerHTML = `
    <div class="dash-topnav">
      <div class="dash-topnav-left">
        <div class="dash-title">Call Coach Dashboard</div>
        <div class="dash-sub">Per-brand call intelligence · ${tonyLocal ? `Central time ${tonyLocalDisplay} (${tonyLocal.weekday})` : ''}</div>
      </div>
      <div class="dash-topnav-right">
        <div class="dash-mode-toggle">
          <button class="dmt-btn ${mode === 'now' ? 'active' : ''}" data-mode="now">Right now</button>
          <button class="dmt-btn ${mode === 'soon' ? 'active' : ''}" data-mode="soon">Next 2 hours</button>
        </div>
        <button class="dash-refresh-btn" data-action="refresh">↻ Refresh</button>
      </div>
    </div>
    <div class="dash-cards-grid" id="dashCardsGrid">
      <div class="dash-loading">Loading brand intel…</div>
    </div>
  `;

  // Load every active brand
  const brandSlugs = Object.keys(window.BRANDS).filter(k => window.BRANDS[k].active);
  const intels = await Promise.all(brandSlugs.map(s => loadBrandIntel(s)));
  const cardsHtml = brandSlugs.map((slug, i) => renderBrandCard(slug, window.BRANDS[slug], intels[i], mode)).join('');
  document.getElementById('dashCardsGrid').innerHTML = cardsHtml || '<div class="dash-empty">No active brands.</div>';

  // Wire toggle
  root.querySelectorAll('.dmt-btn').forEach(btn => {
    btn.addEventListener('click', () => renderDashboard(btn.dataset.mode));
  });
  root.querySelector('[data-action="refresh"]')?.addEventListener('click', () => renderDashboard(mode));

  // Wire enter / train / sample buttons
  root.querySelectorAll('[data-action="enter"]').forEach(b => {
    b.addEventListener('click', () => window.enterBrand && window.enterBrand(b.dataset.brand));
  });
  root.querySelectorAll('[data-action="train"]').forEach(b => {
    b.addEventListener('click', () => openTrainingTab(b.dataset.brand));
  });
  root.querySelectorAll('.dash-sample-row').forEach(row => {
    row.addEventListener('click', () => {
      const slug = row.dataset.brand;
      const id = row.dataset.id;
      window.enterBrand && window.enterBrand(slug, id);
    });
  });

  // v3.11 — wire Key Tips collapse toggle (syncs all cards + persists)
  root.querySelectorAll('[data-action="toggle-tips"]').forEach(head => {
    head.addEventListener('click', () => {
      const panel = head.closest('[data-tips-panel]');
      const nowCollapsed = !panel.classList.contains('collapsed');
      root.querySelectorAll('[data-tips-panel]').forEach(p => {
        p.classList.toggle('collapsed', nowCollapsed);
        const tog = p.querySelector('.dash-tips-toggle');
        if (tog) tog.textContent = nowCollapsed ? 'Show ▾' : 'Hide ▴';
      });
      try { localStorage.setItem('cc_tips_collapsed', nowCollapsed ? '1' : '0'); } catch (e) {}
    });
  });

  // v3.12 — wire per-brand Market Snapshot collapse toggle (independent per card)
  root.querySelectorAll('[data-action="toggle-market"]').forEach(head => {
    head.addEventListener('click', () => {
      const panel = head.closest('[data-market-panel]');
      if (!panel) return;
      const slug = panel.getAttribute('data-brand') || '';
      const nowCollapsed = !panel.classList.contains('collapsed');
      panel.classList.toggle('collapsed', nowCollapsed);
      const tog = panel.querySelector('.dash-market-toggle');
      if (tog) tog.textContent = nowCollapsed ? 'Show ▾' : 'Hide ▴';
      try { localStorage.setItem('cc_market_collapsed_' + slug, nowCollapsed ? '1' : '0'); } catch (e) {}
    });
  });

  // Follow-up emails: collapse toggle
  root.querySelectorAll('[data-action="toggle-emails"]').forEach(head => {
    head.addEventListener('click', () => {
      const panel = head.closest('[data-emails-panel]');
      if (!panel) return;
      const slug = panel.getAttribute('data-brand') || '';
      const nowCollapsed = !panel.classList.contains('collapsed');
      panel.classList.toggle('collapsed', nowCollapsed);
      const tog = panel.querySelector('.dash-emails-toggle');
      if (tog) tog.textContent = nowCollapsed ? 'Show \u25be' : 'Hide \u25b4';
      try { localStorage.setItem('cc_emails_collapsed_' + slug, nowCollapsed ? '1' : '0'); } catch (e) {}
    });
  });

  // Follow-up emails: copy a single email (subject + body) to clipboard
  root.querySelectorAll('[data-action="copy-email"]').forEach(btn => {
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const slug = btn.getAttribute('data-brand');
      const idx = parseInt(btn.getAttribute('data-idx'), 10);
      const e = (window.FOLLOWUP_EMAILS || {})[slug];
      if (!e || !e.emails[idx]) return;
      const m = e.emails[idx];
      const text = 'Subject: ' + m.subj + '\n\n' + m.body;
      const done = () => { const o = btn.textContent; btn.textContent = 'Copied \u2713'; btn.classList.add('copied'); setTimeout(() => { btn.textContent = o; btn.classList.remove('copied'); }, 1400); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(() => {});
      } else {
        const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); done(); } catch (e2) {} document.body.removeChild(ta);
      }
    });
  });
}

// Training drill-down — opens a modal with the full call_intel.json content
async function openTrainingTab(slug) {
  const intel = await loadBrandIntel(slug);
  const callIntel = intel?.callIntel;
  const brand = window.BRANDS[slug];
  if (!callIntel) {
    alert('No call intel loaded for ' + brand.name);
    return;
  }

  const m = callIntel._meta || {};
  const renderList = (arr, key = 'label') => (arr || []).map(item => `
    <div class="train-row">
      <div class="tr-head">
        <span class="tr-label">${escapeHtml(item[key] || '')}</span>
        ${item.start ? `<span class="tr-time">${window.to12h(item.start)}–${window.to12h(item.end)}</span>` : ''}
        ${item.day ? `<span class="tr-time">${item.day}</span>` : ''}
        ${item.days ? `<span class="tr-time">${(item.days || []).join(' · ')}</span>` : ''}
      </div>
      ${item.note || item.reason ? `<div class="tr-note">${escapeHtml(item.note || item.reason)}</div>` : ''}
    </div>
  `).join('');

  const modal = document.getElementById('trainingModal');
  modal.querySelector('.modal-body').innerHTML = `
    <div class="train-head" style="--ink:${brand.theme?.ink || '#1a1a1a'};--gold:${brand.theme?.gold || '#888'};">
      <h3>${escapeHtml(brand.name)} · Call training</h3>
      <div class="train-vertical">${escapeHtml(m.vertical || '')}</div>
      <div class="train-audience">${escapeHtml(m.audience || '')}</div>
    </div>

    <div class="train-section">
      <h4>🎯 Best calling windows (prospect local time)</h4>
      ${renderList(callIntel.core_windows)}
    </div>

    <div class="train-section">
      <h4>📅 Primary blocks · ${(callIntel.best_days || []).join(' · ')} preferred</h4>
      ${renderList(callIntel.primary_blocks)}
    </div>

    <div class="train-section">
      <h4>🧪 Experimental blocks</h4>
      ${renderList(callIntel.experimental_blocks) || '<div class="dash-empty">None defined.</div>'}
    </div>

    <div class="train-section train-warn">
      <h4>⛔ Avoid windows</h4>
      ${renderList(callIntel.avoid_windows)}
    </div>

    <div class="train-section train-warn">
      <h4>⛔ Avoid days</h4>
      ${renderList(callIntel.avoid_days, 'day')}
    </div>

    <div class="train-section">
      <h4>🏠 Audience nuances</h4>
      <ul class="train-bullets">
        ${(callIntel.homeowner_nuances || []).map(n => `<li>${escapeHtml(n)}</li>`).join('')}
      </ul>
    </div>

    <div class="train-section">
      <h4>📊 Metrics to track</h4>
      <ul class="train-bullets">
        ${(callIntel.metrics_to_track || []).map(n => `<li>${escapeHtml(n)}</li>`).join('')}
      </ul>
    </div>

    <div class="train-section train-meta">
      <em>${escapeHtml(m.source_note || '')}</em>
    </div>

    <div class="form-actions" style="margin-top:18px;">
      <button class="btn btn-gold" data-action="enter-brand" data-brand="${slug}">Enter ${escapeHtml(brand.name)} Call Coach →</button>
      <button class="btn btn-ghost" data-close="trainingModal">Close</button>
    </div>
  `;
  modal.classList.remove('hidden');
  modal.querySelector('[data-action="enter-brand"]')?.addEventListener('click', () => {
    modal.classList.add('hidden');
    window.enterBrand && window.enterBrand(slug);
  });
}

window.renderDashboard = renderDashboard;
window.openTrainingTab = openTrainingTab;
