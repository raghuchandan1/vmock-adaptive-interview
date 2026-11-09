# US B-school enhancements (parked)

Parked on 2026-11-07 for after a US pilot. Each item's evidence, files to change and size are in [the US research note](research/2026-11-06-us-bschool-adaptation.md), "Changes needed"; numbers below are the note's item numbers. The Indian B-school list is `docs/TODO.md`; items that overlap it should be built once for both markets.

## Done for the pilot

- [x] **30-minute behavioural round** (item 5): length `full`, 6 topics, hiring manager and back your resume only.
- [x] **No domain-knowledge question for US consulting, brand and general roles** (part of item 8): `market: "us"` keeps the knowledge slot only for finance/banking and technical product, analytics or data roles. Set `MARKET=us` for a US deployment.

## Before a US pilot (not code)

- [ ] **Accounts and school tenancy** (A1): `GET /api/sessions` lists every interview to anyone.
- [ ] **AI disclosure and consent** (A4): the opening never says the interviewer is an AI.
- [ ] **School contract, security and accessibility reviews** (A2, A3, A5-A8): FERPA contract terms, retention, OpenAI zero data retention, HECVAT or SOC 2, WCAG 2.1 AA.

## Interviewer and feedback

- [ ] **Market setting in the UI and US wording** (item 1): a market choice in setup; US spelling; swap Indian examples ("tier-2 towns", "Indian conglomerate"). Builds on the new `market` input.
- [ ] **US stages** (item 2): first-year internship, second-year full-time, one-year or experienced, and a new "advancement" stage for part-time and EMBA.
- [ ] **"Tell me about yourself" as a scored pitch** (item 3), about 2 minutes. Same build as the IIM "Timed 'Tell me about yourself'" item, with a market-specific length.
- [ ] **Two fit questions in US hiring-manager interviews, more fit angles** (item 4).
- [ ] **"What you learned" element in the behavioural rubric** (item 6).
- [ ] **A switch is always the motivation question in the US, never a concern** (item 7).
- [ ] **Deep-dive style for McKinsey-type interviews** (item 9). Build with the IIM pushback style. Read McKinsey's own page first.
- [ ] **Optional firm attributes** (item 10).
- [ ] **Code-enforced never-ask list** (item 11): citizenship, arrests, salary history, height and weight, "where are you from".
- [ ] **Opt-in work-authorization practice** (item 12). Needs a product decision.
- [ ] **Answer-length threshold by market** (item 13). Conflicts with the IIM cut-in item if that lowers the limit for everyone.
- [ ] **Speech recognition test across accents, and a transcript check** (item 14). One harness with the IIM Indian English test.
- [ ] **US-sensitive feedback wording** (item 15).
- [ ] **Target company without a JD, sharper motivation probes, firm-specific rubric element** (item 16).
- [ ] **"Link to the role" in the behavioural rubric** (item 17).
- [ ] **Feedback on answer length and situation-heavy answers** (item 18).
- [ ] **Practise closed behavioural questions** (item 19). Needs a product decision.
- [ ] **Better end-questions feedback** (item 20).
- [ ] **Networking-pitch drill** (item 21) for the October-December networking season.
- [ ] **Story bank and next round** (item 22). Same build as the IIM "Personals round and next round" item.
- [ ] **Track presets** (item 23): consulting, banking, tech/PM, brand, rotational.

## Career-center features

- [ ] **SSO** (item 24), **admin dashboard** (item 25), **coach and peer sharing** (item 26), **school assignments** (item 27), **published accessibility, security and privacy pages** (item 28). All need accounts first.

## Later

- [ ] Canvas LTI (29), 12twenty and Handshake links (30), banking technicals (31), unlimited use and pricing (32), check McKinsey and bank pages (33), full coffee-chat simulation (34), coach-style closing line (35), marketing copy "practice before, never during" (36).

## Open from the pilot changes

- [x] **Knowledge rule leaks in the US** (six-profile test, note section 6.1): fixed 2026-11-09. The planner now states `jd.role_family` (finance, technical, other), and the engine judges any US knowledge slot for an "other" role as situational. Re-test: 27 plans across six profiles, all as intended.
- [ ] **US "other" roles still get hypothetical questions in slot 3.** The planner wrote a knowledge slot for an "other" role in about half the re-test plans (the engine turns it into a situational question), and consulting got case-like prompts ("A client says its margins are falling… How would you structure your first analysis?"). If students find these too case-like, make the planner write a past-behaviour question there.
- [ ] **"Practise" in US feedback** (2 of 6 reports). Quick part of item 1.

- [ ] The 30-minute plan can repeat a competency when the JD has only 4 must-haves (seen once in 4 real planner runs). Track presets (item 23) or more fit angles (item 4) would give the extra topics new ground.
- [ ] Design-check findings, parked with the IIM "design warnings" item (2026-11-07): cramped padding (4) and a card nested in a card on `public/student.html`; 2 more on `public/vmock/room.html`, including the 3.8:1 hover contrast on the segmented controls. All predate the pilot changes.
- [ ] Measure real 30-minute sittings: the 6-topic size is set from three real 15-minute sittings (about 20 minutes for 4 topics).
