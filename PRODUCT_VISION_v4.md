# Call Coach → AI Dialer: Product & UX Analysis (v4 direction)

*Prepared for Tony · June 18, 2026. Grounds three things: (1) what the current app actually does, (2) 2025–2026 dialer + AI-sales best practice, (3) integrations you can actually wire today.*

---

## 1. The core friction (what's slowing you down today)

I audited the live app. Here's where the time bleeds, mapped to your pain points.

### A. Too many fields per call
Logging ONE call today touches **8+ inputs**:
Prospect Email → Outcome (10-option dropdown) → Objection raised → What worked → Next step → Freeform notes → (then optionally) Follow-up Enable → Date → Time → Channel → Draft message.

That's a data-entry form, not a calling tool. Industry benchmark: reps lose **~12 min per call** to manual logging + context-switching ([FreJun](https://frejun.com/crm-calling-integration-guide-3/)). The fix isn't a better form — it's **fewer fields + AI fills the rest**.

### B. Disposition taxonomy was split and inconsistent — ✅ FIXED (v3.15)
Three overlapping vocabularies used to exist (form dropdown, quick modal, dashboard map), causing mis-tagged calls and broken downstream automation. As of v3.15 there is **one unified set everywhere**, built from 2026 disposition research ([Nexdial](https://www.nexdial.com/call-disposition-codes-best-practices-the-2026-checklist-for-high-growth-sales-teams/), [SmartReach](https://smartreach.io), [Aloware](https://aloware.com)): 8-12 codes, mutually exclusive, grouped Positive/Follow-up/Negative, each mapped to a next action.

**Shipped set (11 codes):** 8 primary `BK, CB, RE, GK, VM, NA, NI, OBJ` + 3 secondary `CL, WN, DNC`. Added `DNC` (Do Not Call) for compliance — it was missing everywhere before. Legacy codes (`HU, PP, SH, DC, NL`) still render so old logged calls don't break.

### C. Notes are a cold, blank box
"Freeform notes" is a textarea you fill *after* a live call from memory. That's the most cumbersome, lowest-compliance step in any dialer. The 2026 standard: **AI drafts the note + next step from the call itself**, rep just confirms ([Aircall/Nooks/VykoTalk](https://leadsatscale.com/insights/cold-calling-ai-tools-technology-stack-review)).

### D. No actual dialing
Today it's a *coach + logger*, not a *dialer*. Reps still dial by hand (15–20 calls/hr ceiling). A power dialer that auto-launches the next number lifts talk time **200–300%** ([Kixie](https://www.kixie.com/sales-blog/sales-dialer-comparison-guide-power-dialer-vs-auto-dialer-vs-predictive-dialer/)).

---

## 2. The vision: a homegrown AI power dialer (4 brands, your rules)

Not a generic dialer — one that knows *your* scripts, *your* monthly-recoup numbers, *your* brand voice rules (ConversionJet discreet, CritterClick no kill-talk), and your call-window intelligence. That's the moat off-the-shelf tools can't match.

### Dialer mode recommendation: **Power / Progressive (1 line)**
- Predictive (multi-line) risks TCPA abandonment + sounds robotic on B2B ([Skipcall](https://skipcall.io/en/blog/auto-dialer-vs-power-dialer)).
- **Power dialer** = auto-dial next number the moment you finish, preview the prospect card first. TCPA-safe, 0% abandonment, still 3× the talk time. Right fit for a small premium team.

### The "1-tap call" loop (replaces the 8-field form)
```
[Preview card: company, script open beat, last touch, AI brief]
        ↓ press SPACE
   Twilio dials → you talk → hang up
        ↓
[ONE disposition tap]  →  AI auto-writes note + next step  →  auto-advance to next
```
Everything else (note, follow-up task, email draft, CRM sync) happens **automatically from the disposition + transcript**. The rep touches 1 button per call, not 8 fields.

### The action-signaling disposition set (shipped v3.15) → each tap fires an auto-action
| Tap | Code | Auto-action to wire |
|---|---|---|
| ✅ Booked | `BK` | Create calendar hold + send confirm email + CRM stage→Booked |
| 📅 Call Back | `CB` | Schedule auto-redial at chosen time + reminder |
| 📨 Requested Email | `RE` | Fire the Day-1 recap email (the ones we just fixed) |
| 🚪 Gatekeeper | `GK` | Retry rule + flag to find decision-maker |
| 🎙️ Voicemail | `VM` | Log + optional ringless VM drop |
| 📞 No Answer | `NA` | Auto-retry rule (next prime window) |
| 🚫 Not Interested | `NI` | Pause sequence |
| 🛑 Objection | `OBJ` | Log objection + drop to nurture |
| *(secondary)* | `CL, WN, DNC` | Closed→won · Wrong#→scrub · DNC→hard-suppress |

One vocabulary everywhere — form, modal, dashboard, and (next) CRM.

---

## 3. Where AI makes it *smarter* (not just automated)

1. **Live call brief (pre-dial):** AI reads the prospect's site + last touches and surfaces a 2-line "what to lead with" using their actual monthly-leak number. (You already compute these.)
2. **Real-time objection nudges:** transcript streams → when prospect says "we're happy with our site," surface the matching comeback from your objection library on screen ([Aircall whisper](https://leadsatscale.com/insights/cold-calling-ai-tools-technology-stack-review)).
3. **Auto-note + auto-disposition suggestion:** at hang-up, AI proposes the disposition + writes the structured note (objection / what worked / next step) from the transcript. Rep confirms in 1 tap.
4. **AI-drafted follow-up email:** conversation-aware, in the brand's voice, pre-filled and ready to copy/send ([VykoTalk](https://crm.vykotalk.com)).
5. **Best-time-to-call scoring:** you already have call-window intel — layer AI on actual connect-rate data per market to re-rank the queue each morning.
6. **Daily AI insight digest:** "Yesterday: 42 dials, 7 connects, 2 booked. Your CritterClick open beat is converting 2.1× the others. Call Phoenix before 10am — that's where your connects cluster."

---

## 4. Integrations you can wire TODAY (already in your connector list)

| Need | Connector (available now) | What it unlocks |
|---|---|---|
| **Dialing + SMS + ringless VM** | **Twilio** (Programmable Voice) | The actual auto-dialer engine + call recording |
| **Transcription + AI notes** | **Circleback** / Twilio media streams + LLM | Real-time transcript → auto-notes |
| **Calendar holds** | **Gmail / Google Calendar** | One-tap "Booked" creates the hold |
| **Follow-up email send** | Gmail, **Instantly, lemlist, Outreach, SendGrid** | Auto-fire the recap/nurture sequence |
| **CRM sync (pick one)** | **HubSpot, Salesforce, Pipedrive, Close, Attio** | Every call + disposition logged automatically |
| **Team alerts** | **Slack** | "🎉 Zack just booked an RME audit" |
| **SMS follow-up** | **SMS Messages / Twilio** | Text the Cal link mid-call |

**Recommendation:** Twilio (voice) + one CRM (Close or HubSpot are most dialer-friendly) + Gmail/Calendar + Slack covers 90% of the value. Keep the homegrown dashboard as the brain; let connectors do the plumbing.

---

## 5. Suggested build roadmap (phased, low-risk)

**Phase 0 — Quick wins (no telephony):** ✅ DONE (v3.15)
- ~~Unify the disposition set everywhere.~~ ✅ 11-code unified set shipped (form, modal, dashboard).
- ~~Collapse the call form: reveal note fields *after* a disposition is picked.~~ ✅ Progressive disclosure shipped.
- ~~Roll v3.15 card layout to all 4 brands.~~ ✅ Shipped.
- Auto-advance to next prospect after log (toggle already exists).

**Phase 1 — Click-to-call + auto-log (Twilio voice):**
- "Call" button dials via Twilio; on hang-up, open the 1-tap disposition.
- Record + store call; basic duration/outcome auto-captured.

**Phase 2 — AI notes + objection assist:**
- Transcript → AI-drafted note + suggested disposition + follow-up email.
- Live objection nudges from your library.

**Phase 3 — CRM + sequence automation:**
- Disposition fires CRM update + the right email sequence + calendar hold automatically.

**Phase 4 — Insights layer:**
- Daily AI digest, per-brand connect-rate heatmaps, best-time re-ranking, A/B on open beats.

---

## 6. Open decisions for Tony
1. **Dialer engine:** Twilio homegrown (max control, more build) vs. a connector dialer? → *Recommend Twilio.*
2. **CRM:** which one becomes the system of record? → *Recommend Close or HubSpot.*
3. ~~**Scope of Phase 0:** before or after the v3.15 commit?~~ ✅ Resolved — done as part of v3.15.
4. **Compliance:** confirm TCPA posture (B2B, consented lists) before any auto-dial goes live.

---

## 7. Twilio Q&A (answers to your three questions)

### Q1 — Can Twilio rotate area codes as we call (local presence)?
**Yes.** This is the standard "local presence" pattern. You buy a small pool of numbers — one per market you call into — and the app reads the prospect's area code, then sets a matching `callerId` on the `<Dial>` so your call shows a local number on their screen. It's ~50 lines of build-your-own logic, not a product you buy ([PhoneBurner](https://www.phoneburner.com/blog/what-is-a-local-presence-dialer), [Twilio `<Dial>` docs](https://www.twilio.com/docs/voice/twiml/dial), [Consuelo local-presence guide](https://consuelo.mintlify.app/user-guide/cli/how-tos/use-local-presence)).
- **Why it matters:** local caller ID lifts answer rates **20-40%** vs. an out-of-area or toll-free number.
- **Catch:** Twilio Trust & Safety reviews local-presence use to prevent spoofing abuse — you register your numbers and use case. Legitimate per-market pools are fine; rotating random unowned numbers is not allowed.

### Q2 — Can we share one account across the team?
**Yes — parent account + per-rep subaccounts.** Each rep gets their own subaccount with its own SID, numbers, and caller IDs, so you get **per-rep cost tracking and call attribution** out of the box ([Twilio Subaccounts](https://www.twilio.com/docs/iam/api/subaccounts)). The browser softphone fork-rings each rep's online device, so the right rep picks up. One bill, clean separation per seat.

### Q3 — What does a team account cost?
**Pay-as-you-go, no per-seat fee.** You pay for numbers + minutes, not for users ([Twilio US Voice pricing](https://www.twilio.com/en-us/voice/pricing/us), [Edesy pricing breakdown](https://edesy.in/tools/twilio-voice-pricing-us-outbound)):

| Item | Rate |
|---|---|
| US local number | ~$1.15 / month each |
| Outbound call | ~$0.013-0.014 / min |
| Inbound call | ~$0.0085 / min |

**Estimate for a 2-rep team:**
- ~15 local-presence numbers × $1.15 = **~$17/mo**
- ~13,200 outbound min/mo (2 reps, heavy dialing) × ~$0.014 = **~$185/mo**
- **≈ $200/mo all-in.** No seat licenses. Add recording/transcription/AI on top only if you turn those on.

---

## 8. Twilio dialer — build spec (Phase 1–2)

### Architecture (homegrown, sits on the existing dashboard)
```
Browser (your app)                    Backend (small)                Twilio
──────────────────                    ───────────────                ──────
Twilio Voice SDK (softphone)  ←─AccessToken─  /token endpoint
  press SPACE to dial         ───────────────→  /voice (TwiML)  ──→  <Dial callerId=local>
  1-tap disposition            ──POST call result─→  /disposition     ──→  call recording URL
  AI note panel               ←─transcript─────  /media-stream WS  ←─  real-time audio
```

### Components to build
1. **Token endpoint** (`/token`) — mints a short-lived Twilio AccessToken per rep (uses their subaccount). Powers the browser softphone.
2. **TwiML voice handler** (`/voice`) — returns `<Dial callerId={localNumberFor(prospectAreaCode)}>{prospectNumber}</Dial>`. This is where local-presence rotation lives.
3. **Local-number resolver** — map of `areaCode → owned Twilio number`; fallback to brand default if no local match. (~50 lines.)
4. **Softphone UI** — Twilio Voice JS SDK in the call screen: SPACE to dial next, mute/hangup, live timer (you already have the timer UI).
5. **Disposition webhook** (`/disposition`) — on hang-up, capture duration + recording URL, open the 1-tap disposition, write the call row (reuses your existing call-log schema: `ts, outcome, caller, company, domain, notes, next_step…`).
6. **Media-stream + AI notes** (Phase 2) — Twilio `<Start><Stream>` pipes audio to a WebSocket → transcription → LLM drafts the note + suggested disposition + follow-up email in brand voice. Rep confirms in 1 tap.
7. **Subaccount + number provisioning script** — one-time: create a subaccount per rep, buy the local-presence number pool, register the use case with Twilio Trust & Safety.

### Where it plugs into the current app
- **Call screen:** the existing timer + script panel stay; add a "Call" / SPACE-to-dial control and the softphone widget.
- **Disposition:** reuse the v3.15 quick-outcome modal — already the 11-code set — as the post-call 1-tap.
- **Call log:** reuse `getBrandPerf(slug)` schema; just add `recording_url`, `duration_sec`, `twilio_call_sid`.
- **Dashboard:** hero "Callable now" already exists — wire SPACE-to-dial straight off the queue.

### Build order
- **1a.** Token endpoint + softphone + click-to-dial (single number, no rotation). Prove a call connects from the browser.
- **1b.** Local-presence rotation (number pool + resolver).
- **1c.** Auto-log on hang-up → 1-tap disposition (reuse v3.15 modal).
- **2a.** Subaccounts per rep + per-rep cost view.
- **2b.** Media stream → AI note + suggested disposition + AI follow-up email.

### Compliance gate (before any auto-dial goes live)
- Register local-presence numbers + use case with Twilio Trust & Safety.
- Confirm TCPA posture: B2B, consented/owned lists, honor `DNC` immediately (the new code hard-suppresses).
- Call recording: two-party-consent states need a disclosure — add the standard "this call may be recorded" beat or a recording notice.
