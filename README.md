### Beyond Her: Cyberpsychological Security and Privacy in Role-play AI Companions

- `RAC_Platform/` 
- `user_study/` – survey exports, and interview protocols for Study I and Study II.



---

## Quick Directory Tour

| Path | Description |
| ---- | ----------- |
| `RAC_Platform/RAC` | Minimal Next.js + Supabase app with health‑check APIs, admin dashboards, and emoji survey logic. Use this when demoing the cleaned RAC experience. |
| `RAC_Platform/persona/generated_characters.jsonl` | Persona definitions (name, summary, prompts) that feed the character picker. |
| `user_study/StudyI` | Interview protocol and participant‑facing PDFs for the first qualitative study. |
| `user_study/StudyII` | Google Form exports (`SurveyI/II/III.html`) plus Markdown summaries that contain only titles + question/option text. |

---

## Running the RAC sample

1. **Install dependencies**

   ```bash
   cd Materials/RAC_Platform/RAC
   npm install
   ```

2. **Environment**

   - Copy `.env.local.example` to `.env.local`.
   - Provide temporary API keys (OpenAI or compatible) and Supabase credentials.
   - Keys must not contain PII; use test accounts only.

3. **Database**

   The stripped project keeps only schema migrations under `supabase/migrations/`.  
   Run them against an empty Supabase project:

   ```bash
   npx supabase db reset
   ```

4. **Start the dev server**

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000/<locale>/<workspaceId>/chat` after logging in.  
   The admin dashboard lives at `/admin/dashboard`.

---

## Persona data

- `RAC_Platform/persona/generated_characters.jsonl` stores newline‑delimited JSON.
- Each row includes:
  - `character_name`
  - `short_description`
  - `system_prompt`
  - Optional conversation starters.
- When editing personas, keep descriptions in English and avoid real names.

---

## Study materials

### Study I
- Interview protocol PDF (`user_study/StudyI/Interview_protocol.pdf`).
- Use for qualitative sessions only; no response data is stored here.

### Study II
- Raw Google Form exports (`SurveyI.html`, `SurveyII.html`, `SurveyIII.html`).
- Markdown summaries (`SurveyI.md`, etc.) list only question and option text.
- Emoji survey assets (`MentalShield_study2/…`) remain outside this `Materials` folder to keep the published bundle small.

---

## Contribution rules

1. **No PII** – scrub emails, names, or IDs before committing.
2. **English only** – translate comments/labels so collaborators can read them.
3. **Keep it minimal** – this repo is for reference builds and documentation, not production secrets.
4. **Document changes** – update this README when adding new top‑level assets.

---

## Need help?

- For questions about the RAC prototype: ping the platform team.
- For Study I/II protocol clarifications: reach out to the research ops lead.
- For access to the full MentalShield analytics repo: see `/fred/oz401/zdeng/MentalShield_study2`.

Happy collaborating!
