# Company input and company details lookup

Date: 2026-11-19. Status: built (branch `worktree-company-input`).

## Why

"Why this company?" is near-universal in IIM placement interviews (`docs/research/2026-11-06-iim-placement-interview-questions.md`). Before this change, the company came only from the JD (`plan.jd.company`). Without a JD, the interview had no company at all, and nothing about what the company does reached the interviewer or the feedback.

## Decisions (user)

- With a JD, the role and company come from the JD. Without one, the student may type a target role and a company, both optional.
- Company details come from **model knowledge**, on **both paths**: a typed company, or a real company the JD names.
- Fallback: when the company is not found, unsure, a placeholder, or the lookup fails, the interview uses the name only, as before.
- No company values for now. They are rarely asked as such; when they are, it is through behavioural stories. The JD's `stated_values` is still extracted and still unused.

## Goals, non-goals, anti-goals

- Goals:
  - The greeting and brief name the typed company.
  - The "why this company" question uses it.
  - The interviewer can say what the company does when asked.
  - Feedback can judge whether a motivation reason fits the company.
  - Rewrites may name what the company does.
- Non-goals:
  - Web search (revisit using the found rate in `session.company_lookup`).
  - Showing the details on screen.
  - A company field in CV Deep Dive.
  - Company values.
- Anti-goals:
  - Invented facts spoken by the interviewer: no numbers, news, leaders, pay, culture or values.
  - A lookup that slows or breaks the interview.

## Approaches considered

1. **Model knowledge, both paths, in parallel with the planner** (picked).
   - No added wait.
   - Campus recruiters are mostly large, well-known firms.
   - The JD path reuses the same call.
2. Model knowledge, typed company only.
   - Smaller, but JDs that name a company with a thin "About" section get nothing.
3. Model, then web search when unknown.
   - Covers startups.
   - Needs a new API path, costs more per search, and brings untrusted web text into prompts.

## Design

- **Input:**
  - `company` (`server.js` `createInterview`, 100-character cap) goes to the planner as `company`.
  - `checkAndShapePlan` sets `plan.jd.company` to it after the `PLACEHOLDER_COMPANY` check.
  - Before the plan, `openingText` and `preBrief` use it.
  - Setup pages:
    - Dashboard: shown only when `needsRoleAndDomain()`.
    - /vmock: shown only on the resume-only path.
    - `/student` and `/`: always shown, optional.
  - The rooms carry it in a hidden `#company`.
- **Lookup:**
  - `prompts/company.md`, schema `companyProfileSchema` (`company`, `found`, `industry`, `summary`, `businesses` up to 5).
  - Uses the turn model and effort through `withFallback('turn', …)`.
  - Runs alongside the planner when there is a typed company or a JD.
  - With early start, it attaches whenever it finishes (`engine.attachCompany`); with `EARLY_START=0`, it is awaited together with the planner.
  - An error is stored as `{ found: false, error }`.
- **Use:**
  - `engine.companyProfile(session)` returns the profile only when the lookup found the company and its name matches the session's final company. Otherwise it returns null.
  - Turn input: `interview.company_profile`.
  - Feedback input: `company_profile`.
  - Grounding: added to its input and to the source text.
  - The planner gets the profile for a typed company with no JD. It waits at most `COMPANY_WAIT_MS` (8 s); a slower lookup leaves it the name only. With a JD it never waits, and gets `company_profile: null`.
- **Another source:** a company API can replace the model in `runCompany` if it returns the `companyProfileSchema` shape. On the JD path it would need the company's name first (from the model or from `plan.jd.company`).

## Calls made by the builder

- The lookup uses the turn model, with no new setting.
- The planner waits for the profile only on the no-JD path, where it otherwise knows nothing about the company. The wait is capped so a slow lookup never holds up the interview.
- The feedback cache version is unchanged. The change only affects new interviews.
