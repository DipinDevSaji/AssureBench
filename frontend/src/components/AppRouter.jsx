import React from "react";
import Recommendations from "./Recommendations";
import AccountSettings from "../pages/AccountSettings";
import AdminUsers from "../pages/AdminUsers";
import NewRun from "../pages/NewRun";
import Overview from "../pages/Overview";
import Reports from "../pages/Reports";
import RunResults from "../pages/RunResults";
import Settings from "../pages/Settings";
import TargetRun from "../pages/TargetRun";
import TestSuites from "../pages/TestSuites";
import UploadedResults from "../pages/UploadedResults";

function getCategory(item) {
  return item.category || item.test_id || "uncategorized";
}

function isItemRisky(item) {
  const failedStatus = item.status_code != null && (item.status_code < 200 || item.status_code >= 300);
  return Boolean(item.risky || Number(item.risk_score || 0) > 0 || failedStatus || item.error);
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

function AppRouter({
  activeNav,
  configuredTestCount,
  currentTargetLabel,
  demoError,
  demoTargets,
  demoRun,
  demoStatus,
  endpointUrl,
  error,
  expandedSuite,
  handleDemoRun,
  handleProductionRun,
  handleRun,
  handleSaveSettings,
  handleUploadReport,
  hasRun,
  productionEndpointUrl,
  productionError,
  productionRun,
  productionStatus,
  reportsRefreshKey,
  run,
  setActiveNav,
  setEndpointUrl,
  setExpandedSuite,
  setProductionEndpointUrl,
  setReportsRefreshKey,
  setSettingsDraft,
  settings,
  settingsDraft,
  settingsMessage,
  stats,
  status,
  testSuites,
  uploadError,
  uploadedReport,
  demoEndpoint,
  user,
  onUserUpdated,
}) {
  const canAccessAdmin = ["owner", "admin"].includes(user?.role);

  if (activeNav === "Admin Users" && !canAccessAdmin) {
    return (
      <Overview
        configuredTestCount={configuredTestCount}
        currentTargetLabel={currentTargetLabel}
        hasRun={hasRun}
        onOpenCustomEndpoint={() => setActiveNav("Production Endpoint")}
        onOpenDemo={() => setActiveNav("Demo Chatbot")}
        onOpenNewRun={() => setActiveNav("New Run")}
        onOpenTestSuites={() => setActiveNav("Test Suites")}
        stats={stats}
        testSuites={testSuites}
      />
    );
  }

  if (activeNav === "Overview") {
    return (
      <Overview
        configuredTestCount={configuredTestCount}
        currentTargetLabel={currentTargetLabel}
        hasRun={hasRun}
        onOpenCustomEndpoint={() => setActiveNav("Production Endpoint")}
        onOpenDemo={() => setActiveNav("Demo Chatbot")}
        onOpenNewRun={() => setActiveNav("New Run")}
        onOpenTestSuites={() => setActiveNav("Test Suites")}
        stats={stats}
        testSuites={testSuites}
      />
    );
  }

  if (activeNav === "New Run") {
    return (
      <NewRun
        endpointUrl={endpointUrl}
        error={error}
        demoTargets={demoTargets}
        isRunning={status === "running"}
        onEndpointChange={setEndpointUrl}
        onRun={handleRun}
        status={status}
      />
    );
  }

  if (activeNav === "Demo Chatbot") {
    return (
      <TargetRun
        description="Demo Target"
        endpointProps={{ id: "demo-endpoint-url", value: demoEndpoint, readOnly: true }}
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
        title="Built-in Demo Chatbot"
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
    return <Recommendations evaluation={run?.summary?.evaluation || {}} showExports={false} variant="detailed" />;
  }

  if (activeNav === "Settings") {
    return (
      <Settings
        onSaveSettings={handleSaveSettings}
        onOpenAccountSettings={() => setActiveNav("Account Settings")}
        settingsDraft={settingsDraft}
        settingsMessage={settingsMessage}
        setSettingsDraft={setSettingsDraft}
        user={user}
      />
    );
  }

  if (activeNav === "Account Settings") {
    return (
      <AccountSettings
        forced={Boolean(user?.force_password_change)}
        onPasswordChanged={onUserUpdated}
        user={user}
      />
    );
  }

  if (activeNav === "Admin Users") {
    return <AdminUsers currentUser={user} />;
  }

  if (activeNav === "Production Endpoint") {
    return (
      <TargetRun
        description="Custom Target"
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
        panelCopy="Use this page to test a custom chatbot API endpoint instead of the built-in demo chatbot."
        readyText="Ready to test a custom endpoint."
        run={productionRun}
        settings={settings}
        status={productionStatus}
        title="Custom Endpoint"
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

  return null;
}

export default AppRouter;
