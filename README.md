# AssureBench

AssureBench is an AI assurance dashboard for evaluating chatbot and LLM application risk. It runs a structured suite of assurance tests against a target endpoint, scores the results across key AI risk categories, generates recommendations, and exports evidence-ready JSON and PDF reports.

This project was built as a BSc Computer Science final year portfolio project to demonstrate practical AI safety engineering, full-stack development, API design, report generation, and applied risk evaluation.

## Project Overview

Modern AI applications are increasingly deployed in customer support, education, healthcare-adjacent guidance, productivity tools, and internal business workflows. These systems can fail in ways that are different from traditional software: they may leak private data, follow malicious instructions, hallucinate facts, produce unsafe guidance, or refuse harmless requests.

AssureBench provides a lightweight assurance workflow for testing these risks before deployment. A user enters a chatbot endpoint, runs the assurance suite, reviews the dashboard results, inspects risky tests, receives mitigation recommendations, and exports reports for documentation.

## Problem Statement

LLM applications are difficult to validate using only conventional unit tests because outputs are probabilistic, natural-language based, and context-sensitive. Developers need a repeatable way to test AI systems for behavioral risks such as prompt injection, privacy leakage, hallucination, unsafe output, unreliable formatting, latency, bias, over-refusal, jailbreak susceptibility, and data exfiltration.

AssureBench addresses this by providing a structured test bench that evaluates a live chatbot endpoint and turns the results into clear risk metrics and reports.

## Why AI Assurance Matters

AI assurance helps teams understand whether an AI system is reliable, safe, and suitable for real-world use. It matters because:

- AI systems can expose sensitive data if output filtering is weak.
- Prompt injection and jailbreaks can override intended behavior.
- Hallucinations can create confident but unsupported claims.
- Unsafe outputs can create legal, ethical, or operational risk.
- Poor format reliability can break downstream systems.
- Bias and over-refusal can reduce fairness, trust, and usability.
- Reports and audit trails help communicate risk to technical and non-technical stakeholders.

## Key Features

- 10-category assurance suite covering security, privacy, reliability, safety, fairness, and latency risks.
- Built-in demo chatbot evaluation for local end-to-end testing.
- Production endpoint testing for real chatbot API targets.
- JSON and PDF report export for evidence-ready assurance outputs.
- Reports history page for viewing and downloading previous exports.
- Uploaded JSON report inspection for reviewing exported runs locally in the browser.
- Recommendations page with category-specific mitigation guidance.
- React SaaS-style dashboard with left sidebar navigation.
- Endpoint input with default demo chatbot target.
- FastAPI backend with `POST /runs` test execution.
- 30 assurance tests across 10 AI risk categories.
- Summary cards for risk score, passed tests, risky tests, pass rate, latency, and total tests.
- Full category breakdown with per-category totals, passed count, risky count, and risk percentage.
- Recommendations section generated from evaluation results.
- Test Results table with:
  - status filtering
  - category filtering
  - search by test name, prompt, response text, and category
- JSON report export.
- PDF report export using ReportLab.
- Reports page that lists exported JSON and PDF files.
- Safe report download endpoint with path traversal protection.
- Built-in safe, mixed, and risky demo chatbot endpoints for local testing.
- Browser-local Settings page for endpoint defaults and report export options.

## Screenshots

### Public Landing Page

![AssureBench public landing page](screenshots/landing.jpeg)

Protected public landing page with product positioning, request access flow, and approved-user sign in.

### Overview Dashboard

![Overview](screenshots/overview.jpeg)

Landing dashboard showing assurance coverage, latest run metrics, workflow steps, and risk categories.

### New Assurance Run

![New Assurance Run](screenshots/new-run.jpeg)

Custom endpoint testing page with sample demo targets for baseline, safe, and risky chatbot behavior.

### Reports

![Reports](screenshots/reports.jpeg)

Reports history table for exported JSON and PDF evidence files with metadata and download actions.

### Recommendations

![Recommendations](screenshots/recommendations.jpeg)

Detailed mitigation planning page with priority, effort, affected category, and practical remediation steps.

## More Screenshots

### Results Dashboard

![Results Dashboard](screenshots/results.jpeg)

Run summary, category breakdown, mitigation summary, filters, and detailed test results.

### Test Suites

![Test Suites](screenshots/test-suites.jpeg)

Expandable assurance categories showing configured checks, prompts, severities, and expected behavior.

## AI Risk Categories Tested

AssureBench currently tests:

- `prompt_injection` - attempts to override system instructions or reveal hidden prompts.
- `privacy_leakage` - attempts to expose PII, credentials, API keys, or personal data.
- `hallucination` - unsupported factual claims, fabricated citations, and false certainty.
- `unsafe_output` - harmful instructions, security bypass guidance, or illegal activity.
- `format_reliability` - invalid structured output or failure to follow JSON requirements.
- `latency` - slow responses or failure to meet response-time expectations.
- `bias` - protected-class stereotypes or discriminatory reasoning.
- `over_refusal` - refusal of safe, benign, or useful requests.
- `jailbreak` - role-play or coercive attempts to bypass safeguards.
- `data_exfiltration` - attempts to extract environment variables, logs, metadata, or internal files.

## Tech Stack

**Backend**

- Python
- FastAPI
- Pydantic
- HTTPX
- ReportLab
- sentence-transformers semantic similarity scoring
- scikit-learn saved risk scoring model
- optional OpenAI moderation integration
- pytest

**Frontend**

- React
- Vite
- JavaScript
- CSS

**Project Assets**

- `datasets/` for sample risk training data
- `reports/` for generated JSON and PDF reports
- `.github/workflows/` for backend and frontend CI

## System Architecture

```text
React Frontend
  |
  | POST /runs
  v
FastAPI Backend
  |
  | Loads assurance test suite
  | Sends prompts to target chatbot endpoint
  | Evaluates responses by category
  | Computes risk score
  v
Structured Run Result
  |
  | Display dashboard
  | Export JSON/PDF
  v
Reports Folder + Reports Page
```

Main backend modules:

- `backend/app/main.py` - FastAPI routes.
- `backend/app/sample_tests.py` - assurance test definitions.
- `backend/app/test_runner.py` - sends tests to the target endpoint.
- `backend/app/evaluator.py` - evaluates response risk categories.
- `backend/app/ml_risk.py` - computes overall risk score.
- `backend/app/reports.py` - builds JSON and PDF reports and lists exported reports.
- `backend/app/demo_chatbot.py` - local demo chatbot endpoint.

Main frontend modules:

- `frontend/src/App.jsx` - dashboard shell and high-level state.
- `frontend/src/pages/NewRun.jsx` - endpoint input and run trigger.
- `frontend/src/pages/RunResults.jsx` - summary, breakdown, recommendations, exports, and results.
- `frontend/src/pages/Reports.jsx` - exported report list and actions.
- `frontend/src/components/` - cards, charts, recommendations, and tables.

## How to Run Backend

From the project root:

**Backend install**

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

**Backend run**

```powershell
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Backend tests**

```powershell
python -m pytest -p no:langsmith_plugin -p no:anyio
```

If you do not have external pytest plugins installed, the standard command may also work:

```powershell
python -m pytest
```

One-line setup and run:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

If using the existing workspace virtual environment from the parent folder:

```powershell
cd backend
..\..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend URL:

```text
http://127.0.0.1:8000
```

Useful endpoints:

- `GET /health`
- `POST /auth/login`
- `GET /auth/me`
- `POST /admin/users`
- `GET /admin/users`
- `POST /runs`
- `POST /demo-chatbot`
- `POST /safe-demo-chatbot`
- `POST /risky-demo-chatbot`
- `POST /reports/json`
- `POST /reports/pdf`
- `GET /reports`
- `GET /reports/{filename}`
- `GET /analysis/config`

AssureBench includes prototype in-memory rate limiting for high-cost routes such as assurance runs and report exports. This is suitable for local/demo deployments. For production or multi-instance deployments, this should be replaced with Redis-backed or gateway-level distributed rate limiting.

## Authentication

AssureBench supports owner/admin-created user accounts for paid-access-ready prototype deployments. Dashboard users must sign in before they can run assurance tests or access exported reports.

- Passwords are stored as hashes using Passlib/bcrypt.
- JWT access tokens are used for session access.
- The first owner user is created on startup when no users exist and these environment variables are set:
  - `ASSUREBENCH_JWT_SECRET`
  - `ASSUREBENCH_OWNER_NAME`
  - `ASSUREBENCH_OWNER_EMAIL`
  - `ASSUREBENCH_OWNER_PASSWORD`
- Example placeholders are provided in `backend/.env.example`. Do not commit real credentials.
- Public visitors cannot create accounts directly. They can only log in with existing credentials or submit an access request.
- The owner can create admin accounts for trusted people and user accounts for customers.
- Admin users can view access requests and create/deactivate normal customer accounts only.

For production payments, integrate Stripe or another payment provider later, then create or activate AssureBench user accounts after successful payment.

## Local Owner Login

The first owner account is created automatically when the backend starts and the users table is empty. User accounts are stored in the backend SQLite database at `backend/assurebench_auth.db`.

To set up the local owner login:

1. Copy `backend/.env.example` to `backend/.env`.
2. Set `ASSUREBENCH_OWNER_NAME` to your owner display name.
3. Set `ASSUREBENCH_OWNER_EMAIL` to your owner login email.
4. Set `ASSUREBENCH_OWNER_PASSWORD` to your owner password.
5. Set `ASSUREBENCH_JWT_SECRET` to a long random secret value.
6. Restart the backend.
7. Log in through the frontend using the owner email and password.

`backend/.env` is ignored by Git. Do not commit real credentials.

For local development, you can create or update the owner account from `backend/.env` with:

```powershell
cd backend
python -m app.seed_owner
```

The owner logs in using `ASSUREBENCH_OWNER_EMAIL` and `ASSUREBENCH_OWNER_PASSWORD`.

## Access Request Flow

Users without an account can submit an access request from the login page. AssureBench stores the request for admin review, but it does not create an account automatically and it does not collect card or payment information. The intended MVP flow is:

1. A user submits their name, email, project, intended use, expected usage, and message.
2. The owner or an admin reviews the request in the Admin Users page.
3. Payment is handled manually outside the app, such as by sending a payment link.
4. After approval/payment, the owner or an admin creates customer credentials from the Admin Users page. The owner can also create admin accounts for trusted people.

## Enterprise AI Analysis Integrations

AssureBench includes an optional external AI analysis layer for enterprise-style review of test prompts, chatbot responses, test metadata, and existing AssureBench risk results. This layer enriches the report with extra findings and recommendations, but it does not replace the built-in scoring logic.

External analysis is disabled by default. When disabled, prompts and chatbot outputs are not sent to any external provider and app behavior stays the same.

Supported runtime analysis providers for this prototype:

- OpenAI
- Anthropic Claude
- Disabled provider
- Custom webhook placeholder for future integration

Codex and Cursor are developer workflow tools for building and reviewing code. They are not runtime analysis providers in AssureBench. OpenAI and Claude are the optional model analysis providers.

Privacy warning: enabling external analysis may send test prompts, chatbot responses, test metadata, and existing risk results to the selected provider. Provider API keys are backend-only environment variables and must never be exposed in the frontend or committed to Git.

Safe placeholder configuration:

```text
ASSUREBENCH_EXTERNAL_ANALYSIS_ENABLED=false
ASSUREBENCH_ANALYSIS_PROVIDER=disabled
OPENAI_API_KEY=
OPENAI_ANALYSIS_MODEL=gpt-4o-mini
ANTHROPIC_API_KEY=
ANTHROPIC_ANALYSIS_MODEL=claude-3-5-haiku-latest
ASSUREBENCH_ANALYSIS_REDACT_PII=true
ASSUREBENCH_ANALYSIS_TIMEOUT_SECONDS=20
```

Before sending data to a provider, AssureBench can redact emails, phone numbers, bearer tokens, obvious API keys, and password/secret-looking strings. This is a prototype safeguard, not a replacement for a full data-loss-prevention system.

Future production improvements should include organization-level provider settings, per-workspace provider keys, explicit consent controls, audit logs, stronger PII detection, and Postgres-backed analysis history.

## How to Run Frontend

Open a second terminal:

**Frontend install**

```powershell
cd frontend
npm install
```

**Frontend dev**

```powershell
npm run dev
```

**Frontend build**

```powershell
npm run build
```

Frontend URL:

```text
http://127.0.0.1:5173
```

On Windows PowerShell, if `npm` is blocked by execution policy, use:

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run build
```

The frontend API base URL can be configured with `VITE_API_BASE_URL`. See `frontend/.env.example`.

## Deployment Notes

This is a prototype deployment guide for hosting AssureBench outside local development.

### Backend on Hugging Face Spaces

This monorepo includes two Dockerfiles so deployment is clear in both common workflows:

- `Dockerfile` at the repository root: use this when importing the whole GitHub repository into Hugging Face Spaces.
- `backend/Dockerfile`: use this only if you manually deploy the `backend/` folder as the Docker build context.

For the simplest Hugging Face Spaces setup, create a new Space using the Docker SDK and connect the whole GitHub repository. Hugging Face Spaces will use the root `Dockerfile`, install `backend/requirements.txt`, copy `backend/app`, and expose FastAPI on port `7860`.

The container starts with:

```text
uvicorn app.main:app --host 0.0.0.0 --port 7860
```

Set these Space secrets or environment variables in Hugging Face:

```text
ASSUREBENCH_OWNER_NAME=Owner
ASSUREBENCH_OWNER_EMAIL=owner@example.com
ASSUREBENCH_OWNER_PASSWORD=change-this-password
ASSUREBENCH_JWT_SECRET=change-this-secret
ASSUREBENCH_ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
ASSUREBENCH_DATA_DIR=/data
ASSUREBENCH_EXTERNAL_ANALYSIS_ENABLED=false
ASSUREBENCH_ANALYSIS_PROVIDER=disabled
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

Do not commit real credentials. `backend/.env.example` contains safe local placeholders only.
Set Hugging Face backend secrets in **Space Settings**, not in committed files.

If `ASSUREBENCH_DATA_DIR` is set, AssureBench stores the SQLite auth database at `ASSUREBENCH_DATA_DIR/assurebench_auth.db` and generated reports under `ASSUREBENCH_DATA_DIR/reports`. If it is not set, local development keeps the default project-local database and reports folder behavior.

The free Hugging Face Spaces disk is suitable for demo/testing deployments, but it should not be treated as reliable permanent user data storage. Production deployments should use attached persistent storage, Postgres or another managed database for accounts, and object storage for reports.

After deployment, confirm the backend is reachable by checking:

```text
https://your-hugging-face-space.hf.space/health
```

The backend must expose the same API routes used locally, including `/runs`, `/demo-chatbot`, `/safe-demo-chatbot`, `/risky-demo-chatbot`, `/reports/json`, `/reports/pdf`, and `/reports`.

### Frontend on Vercel

After the backend is deployed, configure the frontend with the deployed backend URL:

```text
VITE_API_BASE_URL=https://your-hugging-face-space.hf.space
```

The local default is documented in `frontend/.env.example`:

```text
VITE_API_BASE_URL=http://127.0.0.1:8000
```

In Vercel, use:

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_BASE_URL=https://your-hugging-face-space.hf.space`

Then build locally if you want to verify before deployment:

```powershell
cd frontend
npm install
npm run build
```

Prototype deployment order:

1. Deploy the FastAPI backend on Hugging Face Spaces and confirm `/health` works.
2. Deploy the frontend on Vercel.
3. Set `VITE_API_BASE_URL` in Vercel to the deployed backend URL.
4. Set `ASSUREBENCH_ALLOWED_ORIGINS` in the backend to the Vercel frontend URL.
5. Build the frontend with `npm run build`.

This is an honest prototype deployment guide. For production, use managed secrets, persistent database storage, persistent report storage, and distributed rate limiting.

## How to Run Assurance Tests

1. Start the backend on `http://127.0.0.1:8000`.
2. Start the frontend on `http://127.0.0.1:5173`.
3. Open the dashboard in the browser.
4. Use the default endpoint:

```text
http://127.0.0.1:8000/demo-chatbot
```

5. Click **Run Assurance Tests**.
6. Review:
   - overview cards
   - risk score
   - category breakdown
   - recommendations
   - filtered test results table

The backend sends all assurance test prompts to the target endpoint and returns a run result containing `run_id`, `summary`, and `details`.

Settings such as the default endpoint URL and report export toggles are stored locally in the browser using `localStorage`. They are not sent to a backend settings database.

## Local Demo Chatbot Endpoints

AssureBench includes three local chatbot endpoints for testing different assurance outcomes:

```text
http://127.0.0.1:8000/demo-chatbot
http://127.0.0.1:8000/safe-demo-chatbot
http://127.0.0.1:8000/risky-demo-chatbot
```

- `/demo-chatbot` provides mixed local behavior for the default dashboard demo.
- `/safe-demo-chatbot` returns privacy-safe refusal-style responses and should mostly pass the assurance suite.
- `/risky-demo-chatbot` intentionally returns unsafe, leaky, hallucinated, prompt-injected, and invalid-format responses to produce higher risk scores.

## How to Export JSON and PDF Reports

After running assurance tests:

1. Scroll to the Recommendations section.
2. Click **Export JSON Report** to save a structured `.json` report.
3. Click **Export PDF Report** to save a formatted `.pdf` report.
4. Reports are saved inside:

```text
reports/
```

The JSON report includes:

- run ID
- endpoint URL
- generated timestamp
- risk score
- risk level
- summary
- recommendations
- all test details
- failed or risky tests

The PDF report includes:

- title and generated timestamp
- run metadata
- overall risk score
- risk level
- total, passed, risky tests, and pass rate
- category breakdown table
- recommendations
- failed or risky tests table

## How to Use the Reports Page

The Reports page is available from the left sidebar.

It lists exported `.json` and `.pdf` reports with:

- filename
- file type
- created date
- size
- risk score, risk level, and test metadata when available
- action button

Actions:

- **View JSON** opens the JSON report in a new browser tab.
- **Download PDF** downloads the PDF report.
- **Refresh Reports** reloads the report list from the backend.

The backend safely serves report files through `GET /reports/{filename}` and rejects filenames containing `/`, `\`, or `..` to prevent path traversal.

## Limitations

- The evaluator uses a hybrid of keyword rules and semantic similarity rather than a fully trained supervised risk model.
- The semantic model may need to download `sentence-transformers/all-MiniLM-L6-v2` the first time it is used.
- The demo chatbot intentionally returns risky outputs for testing.
- The risk score uses a saved logistic-regression model trained on synthetic and seed examples, so it should be treated as a prototype rather than production-calibrated scoring.
- Test outcomes are scored per test, while the overall risk score is still a prototype model output.
- Authentication is implemented as an MVP using SQLite and JWT; it is not yet a full multi-tenant account system.
- Reports are saved to the local filesystem rather than cloud storage.
- PDF styling is functional but not yet a full enterprise reporting template.

## Future Work

- Train a supervised ML model for risk scoring using labeled evaluation data.
- Expand the synthetic training data into a larger, more realistic labelled dataset using sampled response distributions and human review.
- Add per-test risk scores and confidence values.
- Add custom test-suite upload and editing.
- Support multiple projects and saved endpoint configurations.
- Expand authentication with password reset, email verification, and organization-level roles.
- Add historical trend charts across runs.
- Add CI/CD integration for automated assurance checks before deployment.
- Add richer PDF branding and executive summaries.
- Add support for external LLM providers and API key management.
- Add organization-level AI analysis provider settings, consent controls, audit logs, stronger PII detection, and Postgres-backed analysis history.
- Add severity-weighted category scoring.
- Replace in-memory rate limiting with Redis-backed rate limiting for horizontal scaling. The current in-memory limiter is acceptable for the local/single-instance prototype.
- Move generated reports from local filesystem storage to persistent cloud report storage.
- Expand frontend test coverage for navigation, uploads, exports, filtering, and error states.
- Split the large frontend `pages.test.jsx` file into page-specific test files for long-term maintainability.
- Deploy a live hosted demo for portfolio and recruiter review.

## Resume Bullet Point

**AssureBench** - Built a full-stack AI assurance dashboard using FastAPI and React to run 30 structured risk tests against chatbot endpoints, evaluate categories such as prompt injection, privacy leakage, hallucination, jailbreaks, bias, and data exfiltration, and generate JSON/PDF assurance reports with a SaaS-style dashboard and searchable results table.

## Repository Structure

```text
assurebench/
  backend/
    app/
      main.py
      sample_tests.py
      test_runner.py
      evaluator.py
      ml_risk.py
      reports.py
      demo_chatbot.py
    tests/
    requirements.txt
    train_model.py
  frontend/
    src/
      components/
      pages/
      App.jsx
      api.js
      main.jsx
      styles.css
    package.json
    vite.config.js
  datasets/
  reports/
  README.md
```
