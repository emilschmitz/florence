# Florence (Proof of Concept) 🩺

## What is this?

Named in honor of a famous [pioneering nurse](https://en.wikipedia.org/wiki/Florence_Nightingale), Florence is an agentic clinical check-in tool. It monitors patient well-being and helps patients stay on track with their treatment between health provider visits. Using AI, Florence is able to intelligently adapt its behavior to the patient's needs and current state.

https://github.com/user-attachments/assets/474f2bcb-d11e-4b31-993d-523c96b0a70a

---

## Functionality
- **Patient Check-Ins**: Patients receive push notifications at regular intervals between health provider visits to complete a *check-in*. (In this demo, we simulate that with a "patient view" toggle in the webapp)
<!-- - **Multimodal Voice Analysis**: Patients can record voice notes, which are transcribed and analyzed using `google/gemini-2.0-flash-001` via OpenRouter to cross-reference questionnaire answers, with `deepseek/deepseek-chat` rating overall mood (on a clinical 1-5 scale). -->
- **Mastra AI Clinical Agent**: An agentic assistant built with `@mastra/core` that evaluates check-in logs based on a clinician-provided natural-language protocol and executes tools to:
  1. Automatically adjust check-in frequency based on mood and health trends (`adjust_checkin_schedule`).
  2. Send direct crisis resources or clinical recommendations to the patient (`send_message_to_patient`).
  3. Email summary reports and longitudinal trend data to clinicians (`send_email_to_provider`).
- **Provider Dashboard**: Features interactive plots of patient records, medications, mood trends/charts, active alerts, care protocols.
<!-- - **Dynamic Configuration**: Clinical rules (alert triggers, dynamic schedules, check-in questions) can be configured manually or via natural language commands translated to JSON care protocols. -->

---

## Tech Stack
- **Monorepo containing frontend and backend**
- **Frontend**: SPA built using [React](https://react.dev/), [TS](https://www.typescriptlang.org/), and [Vite](https://vite.dev/).
- **Backend**: REST API built with [Express](https://expressjs.com/), [TS](https://www.typescriptlang.org/) and [Bun](https://bun.sh/).
- **Agentic Engine**: Built using [Mastra](https://mastra.ai/) to define tools and help structure LLM workflows.
- **LLMs**: Using [`deepseek/deepseek-chat`](https://openrouter.ai/deepseek/deepseek-chat) on [OpenRouter](https://openrouter.ai/) for tool calling and reasoning, and [`google/gemini-2.0-flash-001`](https://openrouter.ai/google/gemini-2.0-flash-001) for audio and multimodal chat updates.
- **Database**: Local [SQLite](https://sqlite.org/) database storing patient data, configuration records, scientific grounding materials, and patient logs. Resets on page-refresh (for demo purposes).
- **Email Notifications**: [Nodemailer](https://nodemailer.com/).

---

## Scientific Grounding

Florence is inspired by validated principles from the medical literature:

1. **Adaptive check-in frequency**
   - **Rationale**: Constant high-frequency prompting in mobile health leads to severe user fatigue and high attrition rates.
   - **Evidence**: Meta-analyses on *Ecological Momentary Assessment* (EMA) show that state-dependent adaptive prompting significantly improves protocol adherence and data quality compared to static high-frequency schedules ([*Degroote et al., 2020* (IJBNPA, Vol. 17, Art. 75, Section: Methodological Considerations)](https://ijbnpa.biomedcentral.com/articles/10.1186/s12966-020-00954-3); [*Burke et al., 2017* (JMIR, Vol. 19, No. 3, e77, Section: Adherence and Retention)](https://www.jmir.org/2017/3/e77/)).

2. **Automated Safety-Netting & Crisis Routing**
   - **Rationale**: Digital health systems must have fail-safes for acute psychiatric distress.
   - **Evidence**: Randomized controlled trials of conversational mental health agents (such as Woebot) have validated that instant safety-netting and crisis routing keep clinical outcomes safe and reduce depressive symptoms in real-world cohorts ([*Fitzpatrick et al., 2017* (JMIR Mental Health, Vol. 4, No. 2, e19, Section: Discussion: Crisis Safety)](https://mental.jmir.org/2017/2/e19/)).

3. **Adaptive questioning (as a future addition)**
   - **Rationale**: Instead of the patient filling out a form and leaving voice notes, they could converse with a voice agent. This is technology that has seen major recent advancements (see e.g. [https://thinkingmachines.ai/blog/interaction-models/](https://thinkingmachines.ai/blog/interaction-models/)). This could help capture some nuances that do not get transmitted via forms or short voice notes.
   - **Evidence**: Frameworks like *MEDIQ (Interactive Information Seeking)* demonstrate that clinical agents that query adaptively when information is incomplete show significantly higher diagnostic accuracy and safety compared to single-turn responses ([*Li et al., 2024* (MediQ paper: NeurIPS 2024, Section 3.2: Abstention and Question-Asking)](https://arxiv.org/abs/2406.00922)).


---

## Getting Started

### 1. Install Dependencies
```bash
bun install
```

### 2. Configure Environment Variables
Copy the sample environment file to `.env` and update it with your credentials:
```bash
cp .env.example .env
```
Make sure to add your `OPENROUTER_API_KEY` in the `.env` file.

### 3. Run Local SMTP Server (For Email Testing)
To test the clinician email report functionality without setting up a real mail server, you can run a local SMTP server in a separate terminal:
```bash
npx maildev
```
This starts:
- An SMTP server on `localhost:1025` (which the backend uses by default).
- A web interface on `http://localhost:1080` to inspect incoming emails.

### 4. Run in Development
Start both the Vite frontend and Express backend concurrently with:
```bash
bun run dev
```


