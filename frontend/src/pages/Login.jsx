import React, { useRef, useState } from "react";
import { submitAccessRequest } from "../api";
import BrandHeader from "../components/BrandHeader";

function Login({ error, isLoading, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showAccessRequest, setShowAccessRequest] = useState(false);
  const [requestForm, setRequestForm] = useState({
    full_name: "",
    email: "",
    company_or_project: "",
    intended_use: "",
    expected_usage: "",
    message: "",
  });
  const [requestStatus, setRequestStatus] = useState("idle");
  const [requestMessage, setRequestMessage] = useState("");
  const [requestError, setRequestError] = useState("");
  function openAccessRequest() {
    setShowAccessRequest(true);
  }

  function closeAccessRequest() {
    setShowAccessRequest(false);
  }

  function handleSubmit(event) {
    event.preventDefault();
    onLogin(email, password);
  }

  function updateRequestField(field, value) {
    setRequestForm((current) => ({ ...current, [field]: value }));
  }

  async function handleAccessRequestSubmit(event) {
    event.preventDefault();
    setRequestStatus("submitting");
    setRequestMessage("");
    setRequestError("");

    const requiredFields = [
      requestForm.full_name,
      requestForm.email,
      requestForm.intended_use,
      requestForm.expected_usage,
    ];
    if (requiredFields.some((value) => !value.trim())) {
      setRequestError("Please complete all required fields.");
      setRequestStatus("error");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(requestForm.email.trim())) {
      setRequestError("Please enter a valid email address.");
      setRequestStatus("error");
      return;
    }

    try {
      const result = await submitAccessRequest({
        ...requestForm,
        full_name: requestForm.full_name.trim(),
        email: requestForm.email.trim(),
        company_or_project: requestForm.company_or_project.trim(),
        intended_use: requestForm.intended_use.trim(),
        expected_usage: requestForm.expected_usage.trim(),
        message: requestForm.message.trim(),
      });
      setRequestMessage(result.message);
      setRequestForm({
        full_name: "",
        email: "",
        company_or_project: "",
        intended_use: "",
        expected_usage: "",
        message: "",
      });
      setRequestStatus("complete");
    } catch (err) {
      setRequestError(err.message || "Unable to submit access request.");
      setRequestStatus("error");
    }
  }

  return (
    <main className="login-page">
      <div className="login-layout">
        <section className="login-product-panel" aria-labelledby="product-title">
          <div className="hero-content">
            <BrandHeader className="hero-brand-header" logoClassName="hero-logo" />
            <p className="hero-badge">Protected AI Assurance Workspace</p>
            <h1 id="product-title">Test chatbot safety before users do.</h1>
            <p className="login-product-lede">
              Connect a chatbot endpoint, run structured AI assurance tests, detect risky behavior, and export evidence-ready JSON/PDF reports.
            </p>
            <p className="login-value-statement">
              Run assurance checks, review risk scores, generate evidence reports, and get mitigation recommendations before deploying your chatbot.
            </p>
            <div className="hero-value-badges" aria-label="AssureBench value areas">
              <span>Endpoint testing</span>
              <span>Risk scoring</span>
              <span>Evidence reports</span>
            </div>
            <div className="hero-cta-row">
              <button className="primary-button" onClick={openAccessRequest} type="button">
                Request Access
              </button>
              <a className="secondary-button sign-in-link" href="#login-how-title">
                See how it works
              </a>
            </div>
          </div>

          <section className="dashboard-preview-card" aria-label="Static dashboard preview">
            <div className="preview-header">
              <span>Assurance Preview</span>
              <strong>Static demo</strong>
            </div>
            <div className="preview-score-row">
              <div>
                <span>Risk Score</span>
                <strong>64.0</strong>
              </div>
              <div className="preview-meter" aria-hidden="true">
                <span />
              </div>
            </div>
            <div className="preview-stat-grid">
              <div>
                <strong>30</strong>
                <span>Checks</span>
              </div>
              <div>
                <strong>10</strong>
                <span>Categories</span>
              </div>
              <div>
                <strong>JSON/PDF</strong>
                <span>Reports</span>
              </div>
            </div>
            <div className="preview-bars" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </section>

          <div className="login-value-grid" aria-label="AssureBench capabilities">
            <article>
              <span className="feature-badge">ST</span>
              <h2>Safety Testing</h2>
              <p>Detect risky outputs, unsafe responses, and jailbreak behavior.</p>
            </article>
            <article>
              <span className="feature-badge">PC</span>
              <h2>Privacy Checks</h2>
              <p>Identify possible personal data or secret leakage.</p>
            </article>
            <article>
              <span className="feature-badge">RS</span>
              <h2>Risk Scoring</h2>
              <p>Review category-level risk signals and pass/fail summaries.</p>
            </article>
            <article>
              <span className="feature-badge">ER</span>
              <h2>Evidence Reports</h2>
              <p>Export JSON and PDF reports for review, audit, or portfolio evidence.</p>
            </article>
            <article>
              <span className="feature-badge">MP</span>
              <h2>Mitigation Planning</h2>
              <p>Get practical recommendations for reducing chatbot risk.</p>
            </article>
          </div>

          <section className="login-how-it-works" aria-labelledby="login-how-title">
            <p className="section-kicker">How it works</p>
            <h2 id="login-how-title">From access request to assurance report</h2>
            <ol>
              <li>Request access</li>
              <li>Get approved</li>
              <li>Add endpoint</li>
              <li>Run tests</li>
              <li>Export report</li>
            </ol>
          </section>

          <section className="login-preview" aria-label="Product preview">
            <div>
              <strong>10</strong>
              <span>risk categories</span>
            </div>
            <div>
              <strong>30</strong>
              <span>built-in checks</span>
            </div>
            <div>
              <strong>JSON/PDF</strong>
              <span>reports</span>
            </div>
            <div>
              <strong>Protected</strong>
              <span>rate-limited runs</span>
            </div>
          </section>

          <p className="login-trust-note">
            AssureBench is a protected AI assurance workspace for evaluating chatbot behavior and generating evidence-ready reports.
          </p>
        </section>

        <section className="login-card" aria-labelledby="login-title">
          <div className="login-card-brand">
            <BrandHeader className="login-brand-header" logoClassName="login-card-logo" />
            <p className="section-kicker">Protected workspace</p>
          </div>
          <span className="login-role-label">Owner, admin, or approved user login</span>
          <h1 id="login-title">Sign in to AssureBench</h1>
          <p className="login-helper-text">Already approved? Sign in with your email and password.</p>

          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              autoComplete="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />

            <button className="primary-button" disabled={isLoading || !email || !password} type="submit">
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {error ? <p className="error-message">{error}</p> : null}

          <div className="request-access-note">
            New here? Request access and I will review your use case.
            <br />
            Access is manually approved. If accepted, you will receive payment and login details.
          </div>

          <button
            className="secondary-button request-access-toggle"
            onClick={openAccessRequest}
            type="button"
          >
            Request Access
          </button>
        </section>
      </div>

      {showAccessRequest ? (
        <div className="access-modal-backdrop" role="presentation">
          <section className="access-modal" aria-labelledby="access-request-title">
            <div className="access-modal-heading">
              <div>
                <p className="section-kicker">Manual approval</p>
                <h2 id="access-request-title">Request Access</h2>
                <p>Tell us how you plan to use AssureBench. Accounts are created manually after review.</p>
              </div>
              <button className="modal-close-button" onClick={closeAccessRequest} type="button" aria-label="Close access request">
                X
              </button>
            </div>

            <form className="access-request-form" noValidate onSubmit={handleAccessRequestSubmit}>
              <label htmlFor="access-full-name">Full name *</label>
              <input
                id="access-full-name"
                placeholder="Your full name"
                value={requestForm.full_name}
                onChange={(event) => updateRequestField("full_name", event.target.value)}
              />

              <label htmlFor="access-email">Email *</label>
              <input
                id="access-email"
                placeholder="you@example.com"
                type="email"
                value={requestForm.email}
                onChange={(event) => updateRequestField("email", event.target.value)}
              />

              <label htmlFor="access-company">Company or project</label>
              <input
                id="access-company"
                placeholder="Team, company, or final year project"
                value={requestForm.company_or_project}
                onChange={(event) => updateRequestField("company_or_project", event.target.value)}
              />

              <label htmlFor="access-intended-use">Intended use *</label>
              <input
                id="access-intended-use"
                placeholder="What chatbot or AI workflow do you want to evaluate?"
                value={requestForm.intended_use}
                onChange={(event) => updateRequestField("intended_use", event.target.value)}
              />

              <label htmlFor="access-expected-usage">Expected usage *</label>
              <input
                id="access-expected-usage"
                placeholder="One-off audit, weekly checks, client demo, etc."
                value={requestForm.expected_usage}
                onChange={(event) => updateRequestField("expected_usage", event.target.value)}
              />

              <label htmlFor="access-message">Message</label>
              <textarea
                id="access-message"
                placeholder="Add any context that would help with approval."
                value={requestForm.message}
                onChange={(event) => updateRequestField("message", event.target.value)}
                rows={4}
              />

              <button className="primary-button" disabled={requestStatus === "submitting"} type="submit">
                {requestStatus === "submitting" ? "Submitting..." : "Submit Access Request"}
              </button>
              {requestMessage ? <p className="export-success">{requestMessage}</p> : null}
              {requestError ? <p className="error-message">{requestError}</p> : null}
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}

export default Login;
