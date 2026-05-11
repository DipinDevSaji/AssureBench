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
- Built-in demo chatbot endpoint for local testing.
- Browser-local Settings page for endpoint defaults and report export options.

## Screenshots

### Overview

![Overview](screenshots/overview.jpeg)

Landing dashboard showing assurance coverage, latest run metrics, workflow steps, and risk categories.

### Results Dashboard

![Results Dashboard](screenshots/results.jpeg)

Run summary, category breakdown, mitigation summary, filters, and detailed test results.

### Test Suites

![Test Suites](screenshots/test-suites.jpeg)

Expandable assurance categories showing configured checks, prompts, severities, and expected behavior.

### Reports

![Reports](screenshots/reports.jpeg)

Reports history table for exported JSON and PDF evidence files with metadata and download actions.

### Recommendations

![Recommendations](screenshots/recommendations.jpeg)

Detailed mitigation planning page with priority, effort, affected category, and practical remediation steps.

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
- `POST /runs`
- `POST /demo-chatbot`
- `POST /reports/json`
- `POST /reports/pdf`
- `GET /reports`
- `GET /reports/{filename}`

AssureBench includes prototype in-memory rate limiting for high-cost routes such as assurance runs and report exports. This is suitable for local/demo deployments. For production or multi-instance deployments, this should be replaced with Redis-backed or gateway-level distributed rate limiting.

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

Deploy the FastAPI backend first on a service such as Render, Fly.io, Railway, or another Python-capable host. The backend must expose the same API routes used locally, including `/runs`, `/demo-chatbot`, `/reports/json`, `/reports/pdf`, and `/reports`.

After the backend is deployed, configure the frontend with the deployed backend URL:

```text
VITE_API_BASE_URL=https://your-deployed-backend.example.com
```

The local default is documented in `frontend/.env.example`:

```text
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Then build the frontend:

```powershell
cd frontend
npm install
npm run build
```

For Render/Fly.io-style deployment, the usual order is:

1. Deploy the FastAPI backend and confirm `/health` works.
2. Set `VITE_API_BASE_URL` in the frontend environment to the deployed backend URL.
3. Build the frontend with `npm run build`.
4. Serve the generated `frontend/dist` directory from a static hosting provider.

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
- The project does not yet support authentication, user accounts, or multi-tenant workspaces.
- Reports are saved to the local filesystem rather than cloud storage.
- PDF styling is functional but not yet a full enterprise reporting template.

## Future Work

- Train a supervised ML model for risk scoring using labeled evaluation data.
- Add per-test risk scores and confidence values.
- Add custom test-suite upload and editing.
- Support multiple projects and saved endpoint configurations.
- Add authentication and role-based access control.
- Add historical trend charts across runs.
- Add CI/CD integration for automated assurance checks before deployment.
- Add richer PDF branding and executive summaries.
- Add support for external LLM providers and API key management.
- Add severity-weighted category scoring.

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
