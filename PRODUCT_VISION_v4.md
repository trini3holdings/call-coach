# Call Coach → AI Dialer: Product & UX Analysis (v4 direction)

*Prepared for Tony · June 18, 2026. Grounds three things: (1) what the current app actually does, (2) 2025–2026 dialer + AI-sales best practice, (3) integrations you can actually wire today.*

---

## 1. The core friction (what's slowing you down today)

I audited the live app. Here's where the time bleeds, mapped to your pain points.

### A. Too many fields per call
Logging ONE call today touches **8+ inputs**:
Prospect Email → Outcome (10-option dropdown) → Objection raised → What worked → Next step → Freeform notes → (then optionally) Follow-up Enable → Date → Time → Channel → Draft message.

That's a data-entry form, not a calling tool. Industry benchmark: reps lose **~12 min per call** to manual logging + context-switching ([FreJun](https://frejun.com/crm-calling-integration-guide-3/)). The fix isn't a better form — it's **fewer fields + AI fills the rest**.

### B. Disposition taxonomy is split and inconsistent
- The **form dropdown** uses: `NA, VM, HU, NI, PP, OBJ, RE, BK, SH, CL`
- The **quick-outcome modal** uses: `BK, PP, NA, NI, VM, HU, OBJ, RE, SH, CL`
- The **dashboard** maps a *different* set: `BK, SH, CL, CB, VM, GK, NI, DC, NL, WN`

Three overlapping vocabularies = confusion, mis-tagged calls, and broken automation downstream. Best practice: **one short disposition set where each code signals the next action** ([MarketBetter](https://marketbetter.ai/blog/tags/hubspot-calling/)).

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

### Cut dispositions to ONE action-signaling set (6 primary + 4 secondary)
| Tap | Code | Auto-action fired |
|---|---|---|
| ✅ Booked | `BK` | Create calendar hold + send confirm email + CRM stage→Booked |
| 📅 Callback | `CB` | Schedule auto-redial at chosen time + reminder |
| 📨 Send Audit | `RE` | Fire the Day-1 recap email (the ones we just fixed) |
| 🚫 Not Now | `NI` | Drop to nurture sequence (Day-3/Day-5) |
| 📞 No Answer | `NA` | Auto-retry rule (next prime window) |
| 🎙️ Voicemail | `VM` | Log + optional ringless VM drop |
| *(secondary)* | `GK, HU, WN, CL` | tucked behind "More" |

One vocabulary everywhere — form, modal, dashboard, CRM.

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

**Phase 0 — Quick wins (this week, no telephony):**
- Unify the disposition set to the 6+4 action-signaling list everywhere.
- Collapse the call form: show ONLY disposition buttons; reveal note fields *after* a disposition is picked, pre-filled where possible.
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
3. **Scope of Phase 0:** do the friction fixes (fields + dispositions) *before* the v3.15 commit, or after?
4. **Compliance:** confirm TCPA posture (B2B, consented lists) before any auto-dial goes live.
