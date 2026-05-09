import React, { useMemo, useState } from "react";
import { API_BASE, runAssurance } from "./api";
import Recommendations from "./components/Recommendations";
import NewRun from "./pages/NewRun";
import Overview from "./pages/Overview";
import Reports from "./pages/Reports";
import RunResults from "./pages/RunResults";
import Settings from "./pages/Settings";
import TargetRun from "./pages/TargetRun";
import TestSuites from "./pages/TestSuites";
import UploadedResults from "./pages/UploadedResults";
import { testSuites } from "./data/testSuites";

const DEFAULT_ENDPOINT = `${API_BASE}/demo-chatbot`;
const SETTINGS_STORAGE_KEY = "assurebench.settings";
const DEFAULT_SETTINGS = {
  defaultEndpointUrl: DEFAULT_ENDPOINT,
  enableJsonExport: true,
  enablePdfExport: true,
};

const workspaceNav = [
  "Overview",
  "New Run",
  "Results",
  "Test Suites",
  "Reports",
  "Recommendations",
  "Settings",
];

const projects = ["Demo Chatbot", "Production Endpoint", "Uploaded Results"];
const configuredTestCount = testSuites.reduce((count, suite) => count + suite.tests.length, 0);

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
  "Demo Chatbot": {
    kicker: "Built-in demo",
    title: "Demo Chatbot",
    intro: "Run assurance checks against the built-in local demo chatbot endpoint.",
  },
  "Production Endpoint": {
    kicker: "Production testing",
    title: "Production Endpoint",
    intro: "Test a real chatbot API endpoint instead of the local demo chatbot and review the assurance results.",
  },
  "Uploaded Results": {
    kicker: "Imported evidence",
    title: "Uploaded Results",
    intro: "Upload an exported AssureBench JSON report and inspect its summary, category breakdown, and test details locally.",
  },
};

function getCategory(item) {
  return item.category || item.test_id || "uncategorized";
}

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

function getCategoryBreakdown(details, evaluation) {
  const grouped = details.reduce((acc, item) => {
    const category = getCategory(item);
    acc[category] = acc[category] || [];
    acc[category].push(item);
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([key, items]) => {
      const total = items.length;
      const riskyCount = items.filter(isItemRisky).length;
      const passedCount = Math.max(0, total - riskyCount);

      return {
        key,
        total,
        riskyCount,
        passedCount,
        riskPercentage: total ? Math.round((riskyCount / total) * 100) : 0,
        score: Number(evaluation?.[key] || 0),
      };
    })
    .sort((a, b) => a.key.localeCompare(b.key));
}

function getReportStats(report) {
  if (!report) {
    return {
      passRate: 0,
      passedTests: 0,
      riskLevel: "--",
      riskScore: "--",
      riskyTests: 0,
      totalTests: 0,
    };
  }

  const details = report.details || [];
  const summary = report.summary || {};
  const totalTests = summary.test_count ?? details.length;
  const riskyTests = report.failed_or_risky_tests?.length ?? details.filter(isItemRisky).length;
  const passedTests = Math.max(0, totalTests - riskyTests);

  return {
    passRate: totalTests ? Math.round((passedTests / totalTests) * 100) : 0,
    passedTests,
    riskLevel: report.risk_level || summary.risk_level || "--",
    riskScore: report.risk_score ?? summary.risk_score ?? "--",
    riskyTests,
    totalTests,
  };
}

function loadStoredSettings() {
  try {
    const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function App() {
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
  const stats = useMemo(() => getRunStats(run), [run]);

  const lastRunLabel = useMemo(() => {
    if (!run?.run_id) {
      return "No completed run yet";
    }
    return `Latest run: ${run.run_id}`;
  }, [run]);

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
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settingsDraft));
    setSettings(settingsDraft);
    setEndpointUrl(settingsDraft.defaultEndpointUrl);
    setSettingsMessage("Settings saved locally.");
  }

  function renderNewRunPage() {
    return (
      <NewRun
        endpointUrl={endpointUrl}
        error={error}
        isRunning={status === "running"}
        onEndpointChange={setEndpointUrl}
        onRun={handleRun}
        status={status}
      />
    );
  }

  function renderRecommendationsPage() {
    return <Recommendations evaluation={run?.summary?.evaluation || {}} showExports={false} variant="detailed" />;
  }

  function renderActivePage() {
    if (activeNav === "Overview") {
      return (
        <Overview
          configuredTestCount={configuredTestCount}
          hasRun={hasRun}
          onOpenDemo={() => setActiveNav("Demo Chatbot")}
          onOpenNewRun={() => setActiveNav("New Run")}
          onOpenTestSuites={() => setActiveNav("Test Suites")}
          stats={stats}
          testSuites={testSuites}
        />
      );
    }
    if (activeNav === "New Run") {
      return renderNewRunPage();
    }
    if (activeNav === "Demo Chatbot") {
      return (
        <TargetRun
          description="Demo Target"
          endpointProps={{ id: "demo-endpoint-url", value: DEFAULT_ENDPOINT, readOnly: true }}
          error={demoError}
          isRunning={demoStatus === "running"}
          onReportExported={() => setReportsRefreshKey((key) => key + 1)}
          onRun={handleDemoRun}
          onViewRecommendations={() => setActiveNav("Recommendations")}
          panelCopy="Run assurance checks against the built-in local demo chatbot endpoint."
          readyText="Ready to test the local demo chatbot."
          run={demoRun}
          settings={settings}
          status={demoStatus}
          title="Demo Chatbot"
          titleId="demo-chatbot-title"
        />
      );
    }
    if (activeNav === "Results") {
      return (
        <RunResults
          hasRun={hasRun}
          onReportExported={() => setReportsRefreshKey((key) => key + 1)}
          onViewRecommendations={() => setActiveNav("Recommendations")}
          run={run}
          settings={settings}
        />
      );
    }
    if (activeNav === "Test Suites") {
      return (
        <TestSuites
          configuredTestCount={configuredTestCount}
          expandedSuite={expandedSuite}
          onToggleSuite={setExpandedSuite}
          run={run}
          testSuites={testSuites}
        />
      );
    }
    if (activeNav === "Reports") {
      return <Reports refreshKey={reportsRefreshKey} />;
    }
    if (activeNav === "Recommendations") {
      return renderRecommendationsPage();
    }
    if (activeNav === "Settings") {
      return (
        <Settings
          onSaveSettings={handleSaveSettings}
          settingsDraft={settingsDraft}
          settingsMessage={settingsMessage}
          setSettingsDraft={setSettingsDraft}
        />
      );
    }
    if (activeNav === "Production Endpoint") {
      return (
        <TargetRun
          description="Production Target"
          endpointProps={{
            id: "production-endpoint-url",
            value: productionEndpointUrl,
            onChange: (event) => setProductionEndpointUrl(event.target.value),
            placeholder: "https://your-api.example.com/chat",
          }}
          error={productionError}
          isRunDisabled={!productionEndpointUrl}
          isRunning={productionStatus === "running"}
          onReportExported={() => setReportsRefreshKey((key) => key + 1)}
          onRun={handleProductionRun}
          onViewRecommendations={() => setActiveNav("Recommendations")}
          panelCopy="Use this page to test a real chatbot API endpoint instead of the built-in demo chatbot."
          readyText="Ready to test a production endpoint."
          run={productionRun}
          settings={settings}
          status={productionStatus}
          title="Production Endpoint"
          titleId="production-endpoint-title"
        />
      );
    }
    if (activeNav === "Uploaded Results") {
      const details = uploadedReport?.details || [];
      const evaluation = uploadedReport?.summary?.evaluation || {};
      return (
        <UploadedResults
          breakdown={getCategoryBreakdown(details, evaluation)}
          onUploadReport={handleUploadReport}
          stats={getReportStats(uploadedReport)}
          uploadError={uploadError}
          uploadedReport={uploadedReport}
        />
      );
    }

    return (
      <Overview
        configuredTestCount={configuredTestCount}
        hasRun={hasRun}
        onOpenDemo={() => setActiveNav("Demo Chatbot")}
        onOpenNewRun={() => setActiveNav("New Run")}
        onOpenTestSuites={() => setActiveNav("Test Suites")}
        stats={stats}
        testSuites={testSuites}
      />
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="AssureBench navigation">
        <div className="sidebar-header">
          <div className="brand-mark">A</div>
          <div>
            <h2>AssureBench</h2>
            <p>AI assurance workspace</p>
          </div>
        </div>

        <nav className="sidebar-section" aria-label="Workspace">
          <p>Workspace</p>
          {workspaceNav.map((item) => (
            <a
              className={item === activeNav ? "active" : ""}
              href={`#${item.toLowerCase().replaceAll(" ", "-")}`}
              key={item}
              onClick={() => setActiveNav(item)}
            >
              {item}
            </a>
          ))}
        </nav>

        <nav className="sidebar-section" aria-label="Projects">
          <p>Projects</p>
          {projects.map((item) => (
            <a
              className={item === activeNav ? "active" : ""}
              href={`#${item.toLowerCase().replaceAll(" ", "-")}`}
              key={item}
              onClick={() => setActiveNav(item)}
            >
              {item}
            </a>
          ))}
        </nav>

        <div className="sidebar-footer" id="settings">
          <span>Workspace</span>
          <strong>Academic Evaluation Lab</strong>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="topbar" id={activeNav.toLowerCase().replaceAll(" ", "-")}>
          <div>
            <p className="eyebrow">{pageCopy[activeNav].kicker}</p>
            <h1>{pageCopy[activeNav].title}</h1>
            <p className="intro">
              {pageCopy[activeNav].intro}
            </p>
            {activeNav === "Overview" ? (
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
            <span className="workspace-pill">Demo Chatbot</span>
          </div>
        </header>

        {renderActivePage()}
      </main>
    </div>
  );
}

export default App;

