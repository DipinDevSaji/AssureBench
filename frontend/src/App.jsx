import React, { useEffect, useMemo, useState } from "react";
import {
  API_BASE,
  clearStoredToken,
  fetchCurrentUser,
  getStoredToken,
  loginUser,
  runAssurance,
  storeToken,
} from "./api";
import AppRouter from "./components/AppRouter";
import Sidebar from "./components/Sidebar";
import Login from "./pages/Login";
import { testSuites } from "./data/testSuites";

const DEFAULT_ENDPOINT = `${API_BASE}/demo-chatbot`;
const SAFE_DEMO_ENDPOINT = `${API_BASE}/safe-demo-chatbot`;
const RISKY_DEMO_ENDPOINT = `${API_BASE}/risky-demo-chatbot`;
const SETTINGS_STORAGE_KEY = "assurebench.settings";
const DEFAULT_SETTINGS = {
  defaultEndpointUrl: DEFAULT_ENDPOINT,
  enableJsonExport: true,
  enablePdfExport: true,
};

const baseWorkspaceNav = [
  "Overview",
  "New Run",
  "Results",
  "Test Suites",
  "Reports",
  "Recommendations",
  "Settings",
  "Account Settings",
];

const projects = ["Demo Chatbot", "Production Endpoint", "Uploaded Results"];
const configuredTestCount = testSuites.reduce((count, suite) => count + suite.tests.length, 0);

const demoTargets = [
  {
    title: "Built-in Demo",
    endpoint: DEFAULT_ENDPOINT,
    note: "Balanced local chatbot behavior for baseline assurance runs.",
  },
  {
    title: "Safe Demo",
    endpoint: SAFE_DEMO_ENDPOINT,
    note: "Privacy-safe refusal style responses that should mostly pass.",
  },
  {
    title: "Risky Demo sample",
    endpoint: RISKY_DEMO_ENDPOINT,
    note: "Intentionally risky behavior for stress testing the dashboard.",
  },
];

function getTargetLabel(endpointUrl, activeNav) {
  if (endpointUrl === SAFE_DEMO_ENDPOINT) {
    return "Safe Demo";
  }
  if (endpointUrl === RISKY_DEMO_ENDPOINT) {
    return "Risky Demo";
  }
  if (endpointUrl === DEFAULT_ENDPOINT || activeNav === "Demo Chatbot") {
    return "Built-in Demo";
  }
  if (activeNav === "Production Endpoint" || endpointUrl) {
    return "Custom Endpoint";
  }
  return "Built-in Demo";
}

const pageCopy = {
  Overview: {
    kicker: "AI assurance dashboard",
    title: "AssureBench",
    intro: "Evaluate chatbot endpoints for prompt injection, privacy leakage, hallucination, unsafe output, format reliability, bias, jailbreak, data exfiltration, and latency risks.",
  },
  "New Run": {
    kicker: "Target configuration",
    title: "New Assurance Run",
    intro: "Choose the chatbot endpoint you want to evaluate and run the configured assurance test suite.",
  },
  Results: {
    kicker: "Run analysis",
    title: "Results",
    intro: "Review risk score, category breakdowns, suggested mitigations, and detailed test outputs for the latest run.",
  },
  "Test Suites": {
    kicker: "Assurance coverage",
    title: "Test Suites",
    intro: "Review the AI risk categories covered by the current built-in assurance suite.",
  },
  Reports: {
    kicker: "Evidence exports",
    title: "Reports",
    intro: "View and download exported JSON and PDF reports from previous assurance runs.",
  },
  Recommendations: {
    kicker: "Mitigation planning",
    title: "Recommendations",
    intro: "Review suggested mitigations generated from the latest assurance evaluation.",
  },
  Settings: {
    kicker: "Workspace configuration",
    title: "Settings",
    intro: "Manage default endpoint, reporting, risk scoring, and project information placeholders.",
  },
  "Account Settings": {
    kicker: "Account security",
    title: "Account Settings",
    intro: "Change your account password and review your signed-in role.",
  },
  "Admin Users": {
    kicker: "Access control",
    title: "Admin Users",
    intro: "Create and deactivate AssureBench user accounts for protected dashboard access.",
  },
  "Demo Chatbot": {
    kicker: "Built-in demo",
    title: "Built-in Demo Chatbot",
    intro: "Run assurance checks against the built-in local demo chatbot endpoint.",
  },
  "Production Endpoint": {
    kicker: "Custom testing",
    title: "Custom Endpoint",
    intro: "Test a real chatbot API endpoint instead of the local demo chatbot and review the assurance results.",
  },
  "Uploaded Results": {
    kicker: "Imported evidence",
    title: "Import Results",
    intro: "Upload an exported AssureBench JSON report and inspect its summary, category breakdown, and test details locally.",
  },
};

function isItemRisky(item) {
  const failedStatus = item.status_code != null && (item.status_code < 200 || item.status_code >= 300);
  return Boolean(item.risky || Number(item.risk_score || 0) > 0 || failedStatus || item.error);
}

function getRunStats(run) {
  const summary = run?.summary || {};
  const evaluation = summary.evaluation || {};
  const details = run?.details || [];
  const totalTests = summary.test_count ?? details.length;
  const riskyTests = details.filter(isItemRisky).length;
  const passedTests = Math.max(0, totalTests - riskyTests);
  const passRate = totalTests ? Math.round((passedTests / totalTests) * 100) : 0;

  return {
    latestRunId: run?.run_id || "No run yet",
    latestRiskScore: summary.risk_score != null ? Number(summary.risk_score).toFixed(1) : "--",
    passedTests,
    passRate,
    riskyTests,
    totalTests,
  };
}

function loadStoredSettings() {
  try {
    const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!stored) {
      return DEFAULT_SETTINGS;
    }
    const parsed = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    const oldLocalDemoEndpoint = "http://127.0.0.1:8000/demo-chatbot";
    if (parsed.defaultEndpointUrl === oldLocalDemoEndpoint && DEFAULT_ENDPOINT !== oldLocalDemoEndpoint) {
      return { ...parsed, defaultEndpointUrl: DEFAULT_ENDPOINT };
    }
    return parsed;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function App() {
  const [user, setUser] = useState(null);
  const [authStatus, setAuthStatus] = useState(() => (getStoredToken() ? "checking" : "logged-out"));
  const [loginError, setLoginError] = useState("");
  const [settings, setSettings] = useState(loadStoredSettings);
  const [settingsDraft, setSettingsDraft] = useState(loadStoredSettings);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [endpointUrl, setEndpointUrl] = useState(() => loadStoredSettings().defaultEndpointUrl);
  const [demoRun, setDemoRun] = useState(null);
  const [demoStatus, setDemoStatus] = useState("idle");
  const [demoError, setDemoError] = useState("");
  const [productionEndpointUrl, setProductionEndpointUrl] = useState("");
  const [productionRun, setProductionRun] = useState(null);
  const [productionStatus, setProductionStatus] = useState("idle");
  const [productionError, setProductionError] = useState("");
  const [uploadedReport, setUploadedReport] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [run, setRun] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [activeNav, setActiveNav] = useState("Overview");
  const [expandedSuite, setExpandedSuite] = useState(null);
  const [reportsRefreshKey, setReportsRefreshKey] = useState(0);

  const hasRun = Boolean(run);
  const workspaceNav = useMemo(
    () => (["owner", "admin"].includes(user?.role) ? [...baseWorkspaceNav, "Admin Users"] : baseWorkspaceNav),
    [user],
  );
  const stats = useMemo(() => getRunStats(run), [run]);

  useEffect(() => {
    if (!getStoredToken()) {
      return;
    }

    fetchCurrentUser()
      .then((currentUser) => {
        setUser(currentUser);
        setAuthStatus("logged-in");
      })
      .catch(() => {
        clearStoredToken();
        setUser(null);
        setAuthStatus("logged-out");
      });
  }, []);

  const lastRunLabel = useMemo(() => {
    if (!run?.run_id) {
      return "No completed run yet";
    }
    return `Latest run: ${run.run_id}`;
  }, [run]);

  const currentTargetLabel = useMemo(() => {
    const activeTargetEndpoint = activeNav === "New Run" ? endpointUrl : run?.endpoint_url || endpointUrl;
    return getTargetLabel(activeTargetEndpoint, activeNav);
  }, [activeNav, endpointUrl, run]);

  async function handleRun() {
    setStatus("running");
    setError("");

    try {
      const result = await runAssurance(endpointUrl);
      setRun({ ...result, endpoint_url: endpointUrl });
      setStatus("complete");
    } catch (err) {
      setStatus("error");
      setError(err.message || "Unable to run assurance tests.");
    }
  }

  async function handleDemoRun() {
    setDemoStatus("running");
    setDemoError("");

    try {
      const result = await runAssurance(DEFAULT_ENDPOINT);
      setDemoRun({ ...result, endpoint_url: DEFAULT_ENDPOINT });
      setRun({ ...result, endpoint_url: DEFAULT_ENDPOINT });
      setDemoStatus("complete");
    } catch (err) {
      setDemoStatus("error");
      setDemoError(err.message || "Unable to run assurance tests.");
    }
  }

  async function handleProductionRun() {
    setProductionStatus("running");
    setProductionError("");

    try {
      const result = await runAssurance(productionEndpointUrl);
      setProductionRun({ ...result, endpoint_url: productionEndpointUrl });
      setRun({ ...result, endpoint_url: productionEndpointUrl });
      setProductionStatus("complete");
    } catch (err) {
      setProductionStatus("error");
      setProductionError(err.message || "Unable to run assurance tests.");
    }
  }

  function handleUploadReport(event) {
    const file = event.target.files?.[0];
    setUploadError("");

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const summary = parsed.summary || {};
        setUploadedReport({
          ...parsed,
          summary: {
            ...summary,
            risk_score: summary.risk_score ?? parsed.risk_score,
            risk_level: summary.risk_level ?? parsed.risk_level,
          },
        });
      } catch {
        setUploadedReport(null);
        setUploadError("Unable to parse this file. Please upload a valid AssureBench JSON report.");
      }
    };
    reader.readAsText(file);
  }

  function handleSaveSettings() {
    if (!["owner", "admin"].includes(user?.role)) {
      setSettingsMessage("Workspace settings are read-only for user accounts.");
      return;
    }
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settingsDraft));
    setSettings(settingsDraft);
    setEndpointUrl(settingsDraft.defaultEndpointUrl);
    setSettingsMessage("Settings saved locally.");
  }

  async function handleLogin(email, password) {
    setAuthStatus("checking");
    setLoginError("");
    try {
      const result = await loginUser(email, password);
      storeToken(result.access_token);
      setUser(result.user);
      setActiveNav(result.user?.force_password_change ? "Account Settings" : "Overview");
      setAuthStatus("logged-in");
    } catch (err) {
      clearStoredToken();
      setUser(null);
      setAuthStatus("logged-out");
      setLoginError(err.message || "Login failed.");
    }
  }

  function handleLogout() {
    clearStoredToken();
    setUser(null);
    setActiveNav("Overview");
    setAuthStatus("logged-out");
  }

  if (authStatus !== "logged-in") {
    return <Login error={loginError} isLoading={authStatus === "checking"} onLogin={handleLogin} />;
  }

  const effectiveActiveNav = user?.force_password_change ? "Account Settings" : activeNav;

  return (
    <div className="app-shell">
        <Sidebar
        activeNav={effectiveActiveNav}
        onLogout={handleLogout}
        onNavigate={setActiveNav}
        projects={projects}
        user={user}
        workspaceNav={workspaceNav}
      />

      <main className="dashboard-main">
        <header className="topbar" id={effectiveActiveNav.toLowerCase().replaceAll(" ", "-")}>
          <div>
            <p className="eyebrow">{pageCopy[effectiveActiveNav].kicker}</p>
            <h1>{pageCopy[effectiveActiveNav].title}</h1>
            <p className="intro">
              {pageCopy[effectiveActiveNav].intro}
            </p>
            {effectiveActiveNav === "Overview" ? (
              <div className="hero-actions">
                <button className="primary-button" onClick={() => setActiveNav("New Run")}>
                  Start New Run
                </button>
                <button className="secondary-button" onClick={() => setActiveNav("Test Suites")}>
                  View Test Suites
                </button>
              </div>
            ) : null}
          </div>
          <div className="hero-meta">
            <span className="run-pill">{lastRunLabel}</span>
            <span className="workspace-pill">Current target: {currentTargetLabel}</span>
            {user?.role ? <span className={`role-badge ${user.role}`}>{user.role}</span> : null}
          </div>
        </header>

        <AppRouter
          activeNav={effectiveActiveNav}
          configuredTestCount={configuredTestCount}
          currentTargetLabel={currentTargetLabel}
          demoEndpoint={DEFAULT_ENDPOINT}
          demoTargets={demoTargets}
          demoError={demoError}
          demoRun={demoRun}
          demoStatus={demoStatus}
          endpointUrl={endpointUrl}
          error={error}
          expandedSuite={expandedSuite}
          handleDemoRun={handleDemoRun}
          handleProductionRun={handleProductionRun}
          handleRun={handleRun}
          handleSaveSettings={handleSaveSettings}
          handleUploadReport={handleUploadReport}
          hasRun={hasRun}
          productionEndpointUrl={productionEndpointUrl}
          productionError={productionError}
          productionRun={productionRun}
          productionStatus={productionStatus}
          reportsRefreshKey={reportsRefreshKey}
          run={run}
          setActiveNav={setActiveNav}
          setEndpointUrl={setEndpointUrl}
          setExpandedSuite={setExpandedSuite}
          setProductionEndpointUrl={setProductionEndpointUrl}
          setReportsRefreshKey={setReportsRefreshKey}
          setSettingsDraft={setSettingsDraft}
          settings={settings}
          settingsDraft={settingsDraft}
          settingsMessage={settingsMessage}
          stats={stats}
          status={status}
          testSuites={testSuites}
          uploadError={uploadError}
          uploadedReport={uploadedReport}
          user={user}
          onUserUpdated={setUser}
        />
      </main>
    </div>
  );
}

export default App;

