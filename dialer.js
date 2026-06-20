/* ===========================================================================
 * dialer.js — Call Coach browser softphone (Phase 1a)
 *
 * Uses the Twilio Voice JS SDK (loaded from CDN in index.html) to place
 * outbound calls from the rep's browser. Talks to the dialer backend:
 *
 *   GET  {DIALER_URL}/dialer/token?identity=<rep>   -> { token }
 *   POST {DIALER_URL}/dialer/sms                     -> send text follow-up
 *   GET  {DIALER_URL}/dialer/summary/:callSid        -> transcript + summary
 *
 * The dialer backend base URL defaults to the same host as state.backendUrl
 * but WITHOUT the /port/5000/ path (Render serves at root). It can be
 * overridden by setting state.dialerUrl in Settings.
 *
 * Graceful degradation: if the SDK isn't loaded or the backend has no Twilio
 * env configured, the dialer shows an "offline / setup needed" state instead
 * of erroring. Nothing here touches the existing sync/log code.
 * ======================================================================== */
(function () {
  'use strict';

  var Dialer = {
    device: null,
    activeCall: null,
    ready: false,
    identity: null,
    status: 'idle', // idle | connecting | ready | oncall | offline | error
  };

  function dialerBase() {
    // Prefer explicit override.
    if (window.state && state.dialerUrl) return String(state.dialerUrl).replace(/\/$/, '');
    // Derive from backendUrl: strip a trailing /port/NNNN/ segment.
    var b = (window.state && state.backendUrl) || '';
    b = b.replace(/\/port\/\d+\/?$/, '').replace(/\/$/, '');
    return b;
  }

  function repIdentity() {
    return (window.state && (state.caller || state.repName)) ||
           (localStorage.getItem('cc_caller')) || 'rep';
  }

  function setStatus(s, msg) {
    Dialer.status = s;
    var pill = document.getElementById('dialerStatus');
    if (pill) {
      var labels = {
        idle: '○ Dialer', connecting: '◌ Connecting…', ready: '● Ready',
        oncall: '● On call', offline: '○ Setup needed', error: '⚠ Dialer error',
      };
      pill.textContent = labels[s] || s;
      pill.className = 'dialer-status dialer-' + s;
      if (msg) pill.title = msg;
    }
    var callBtn = document.getElementById('dialerCallBtn');
    var hangBtn = document.getElementById('dialerHangBtn');
    if (callBtn) callBtn.disabled = (s !== 'ready');
    if (hangBtn) hangBtn.disabled = (s !== 'oncall');
  }

  // ---- bootstrap the Twilio Device --------------------------------------
  Dialer.init = async function () {
    if (!window.Twilio || !window.Twilio.Device) {
      setStatus('offline', 'Twilio Voice SDK not loaded');
      return;
    }
    var base = dialerBase();
    if (!base) { setStatus('offline', 'No dialer backend configured'); return; }

    setStatus('connecting');
    try {
      // Check backend config first so we fail with a clear message.
      var cfg = await fetch(base + '/dialer/config').then(function (r) { return r.json(); }).catch(function () { return null; });
      if (cfg && cfg.missing && cfg.missing.length) {
        setStatus('offline', 'Backend missing: ' + cfg.missing.join(', '));
        return;
      }
      Dialer.identity = repIdentity();
      var tokRes = await fetch(base + '/dialer/token?identity=' + encodeURIComponent(Dialer.identity))
        .then(function (r) { return r.json(); });
      if (!tokRes || !tokRes.token) {
        setStatus('offline', (tokRes && tokRes.error) || 'No token returned');
        return;
      }
      Dialer.device = new window.Twilio.Device(tokRes.token, { codecPreferences: ['opus', 'pcmu'], logLevel: 'error' });
      Dialer.device.on('registered', function () { Dialer.ready = true; setStatus('ready'); });
      Dialer.device.on('error', function (e) { setStatus('error', e && e.message); });
      Dialer.device.on('incoming', function (call) { call.reject(); }); // outbound only in 1a
      await Dialer.device.register();
    } catch (e) {
      setStatus('error', String((e && e.message) || e));
    }
  };

  // ---- place a call ------------------------------------------------------
  Dialer.call = async function (toNumber, opts) {
    opts = opts || {};
    if (!Dialer.device || !Dialer.ready) { Dialer.init(); return; }
    var to = normalizeNumber(toNumber || currentProspectNumber());
    if (!to) { toast('No phone number for this prospect.'); return; }
    try {
      setStatus('oncall');
      Dialer.activeCall = await Dialer.device.connect({
        params: {
          To: to,
          brand: (window.state && state.brand) || opts.brand || '',
          caller: Dialer.identity || '',
        },
      });
      Dialer.activeCall.on('disconnect', function () {
        Dialer.activeCall = null;
        setStatus('ready');
        if (typeof opts.onEnd === 'function') opts.onEnd();
        if (window.renderCallLog) try { window.renderCallLog(); } catch (e) {}
      });
      Dialer.activeCall.on('error', function (e) { setStatus('ready', e && e.message); });
    } catch (e) {
      setStatus('ready', String((e && e.message) || e));
      toast('Call failed: ' + ((e && e.message) || e));
    }
  };

  Dialer.hangup = function () {
    if (Dialer.activeCall) { try { Dialer.activeCall.disconnect(); } catch (e) {} }
    if (Dialer.device) { try { Dialer.device.disconnectAll(); } catch (e) {} }
    setStatus('ready');
  };

  Dialer.mute = function (on) {
    if (Dialer.activeCall) { try { Dialer.activeCall.mute(!!on); } catch (e) {} }
  };

  // ---- send the SMS follow-up the voicemails reference -------------------
  Dialer.sendSms = async function (to, body) {
    var base = dialerBase();
    if (!base) { toast('No dialer backend configured.'); return null; }
    try {
      var res = await fetch(base + '/dialer/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: normalizeNumber(to), body: body }),
      }).then(function (r) { return r.json(); });
      if (res && res.ok) { toast('Text sent.'); return res.sid; }
      toast('Text failed: ' + ((res && res.error) || 'unknown'));
      return null;
    } catch (e) { toast('Text failed: ' + ((e && e.message) || e)); return null; }
  };

  // ---- pull transcript + VI summary for a finished call ------------------
  Dialer.fetchSummary = async function (callSid) {
    var base = dialerBase();
    if (!base || !callSid) return null;
    try {
      return await fetch(base + '/dialer/summary/' + encodeURIComponent(callSid))
        .then(function (r) { return r.json(); });
    } catch (e) { return null; }
  };

  // ---- helpers -----------------------------------------------------------
  function currentProspectNumber() {
    var el = document.querySelector('#phone, [name="phone"], #prospectPhone');
    return el ? el.value : '';
  }
  function normalizeNumber(n) {
    if (!n) return '';
    var digits = String(n).replace(/[^\d+]/g, '');
    if (digits[0] === '+') return digits;
    if (digits.length === 10) return '+1' + digits;          // US default
    if (digits.length === 11 && digits[0] === '1') return '+' + digits;
    return digits ? '+' + digits : '';
  }
  function toast(msg) {
    if (window.showToast) return window.showToast(msg);
    if (window.toast) return window.toast(msg);
    console.log('[dialer]', msg);
  }

  // expose
  window.Dialer = Dialer;

  // auto-init once the page + state are ready (deferred so app.js loads first)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(Dialer.init, 1200); });
  } else {
    setTimeout(Dialer.init, 1200);
  }
})();
