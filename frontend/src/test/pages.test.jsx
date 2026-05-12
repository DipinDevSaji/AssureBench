import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import NewRun from "../pages/NewRun";
import Overview from "../pages/Overview";
import Reports from "../pages/Reports";
import RunResults from "../pages/RunResults";
import Settings from "../pages/Settings";
import TestSuites from "../pages/TestSuites";
import UploadedResults from "../pages/UploadedResults";
import Recommendations from "../components/Recommendations";
import AppRouter from "../components/AppRouter";
import Sidebar from "../components/Sidebar";
import AccountSettings from "../pages/AccountSettings";
import { testSuites } from "../data/testSuites";
import App from "../App";
import { changePassword, createAdminUser, deleteReport, fetchAnalysisConfig, fetchReports, loginUser, runAssurance, submitAccessRequest } from "../api";

vi.mock("../api", () => ({
  API_BASE: "http://127.0.0.1:8000",
  clearStoredToken: vi.fn(() => window.localStorage.removeItem("assurebench.authToken")),
  changePassword: vi.fn(async () => ({
    message: "Password changed successfully",
    user: { id: 1, name: "Owner", email: "dipindevs369@gmail.com", role: "owner", force_password_change: false },
  })),
  createAdminUser: vi.fn(async () => ({ name: "New User", email: "new@example.com", role: "user" })),
  deactivateAdminUser: vi.fn(),
  exportJsonReport: vi.fn(),
  exportPdfReport: vi.fn(),
  deleteReport: vi.fn(async () => ({ message: "Report deleted successfully" })),
  fetchCurrentUser: vi.fn(async () => ({
    id: 1,
    name: "Owner",
    email: "dipindevs369@gmail.com",
    role: "owner",
    is_active: true,
    force_password_change: false,
  })),
  fetchAccessRequests: vi.fn(async () => [
    {
      id: 1,
      full_name: "Dipin Test",
      email: "dipin@example.com",
      company_or_project: "AssureBench Pilot",
      intended_use: "Evaluate chatbot endpoints",
      expected_usage: "Weekly assurance runs",
      status: "pending",
      created_at: "2026-05-11T10:00:00Z",
    },
  ]),
  fetchAnalysisConfig: vi.fn(async () => ({ enabled: false, provider: "disabled", redact_pii: true })),
  fetchAdminUsers: vi.fn(async () => [
    {
      id: 1,
      name: "Owner",
      email: "dipindevs369@gmail.com",
      role: "owner",
      is_active: true,
      force_password_change: false,
      created_at: "2026-05-11T10:00:00Z",
    },
    {
      id: 2,
      name: "Inactive Customer",
      email: "inactive@example.com",
      role: "user",
      is_active: false,
      force_password_change: true,
      created_at: "2026-05-11T10:00:00Z",
    },
    {
      id: 3,
      name: "Placeholder Owner",
      email: "owner@example.com",
      role: "owner",
      is_active: true,
      force_password_change: false,
      created_at: "2026-05-11T10:00:00Z",
    },
  ]),
  fetchReportFile: vi.fn(async () => new Blob(["{}"], { type: "application/json" })),
  fetchReports: vi.fn(async () => [
    {
      filename: "assurebench_report_run_test.json",
      file_type: "json",
      created_at: "2026-05-11T10:00:00Z",
      size_bytes: 2048,
      risk_score: 42,
      risk_level: "elevated",
      total_tests: 30,
      passed_tests: 24,
      risky_tests: 6,
      download_url: "/reports/assurebench_report_run_test.json",
    },
  ]),
  getReportDownloadUrl: vi.fn((report) => report.download_url),
  getStoredToken: vi.fn(() => window.localStorage.getItem("assurebench.authToken")),
  loginUser: vi.fn(async () => ({
    access_token: "jwt-token",
    token_type: "bearer",
    user: { id: 1, name: "Owner", email: "dipindevs369@gmail.com", role: "owner", force_password_change: false },
  })),
  runAssurance: vi.fn(),
  storeToken: vi.fn((token) => window.localStorage.setItem("assurebench.authToken", token)),
  submitAccessRequest: vi.fn(async () => ({
    message: "Access request submitted. I will review your request and contact you with payment and login details.",
  })),
  updateAccessRequestStatus: vi.fn(),
  updateAdminUser: vi.fn(async () => ({ id: 2, is_active: true })),
}));

const stats = {
  latestRunId: "run_test",
  latestRiskScore: "64.0",
  passedTests: 24,
  passRate: 80,
  riskyTests: 6,
  totalTests: 30,
};

const run = {
  run_id: "run_test",
  summary: {
    risk_score: 64,
    risk_level: "elevated",
    test_count: 2,
    evaluation: {
      prompt_injection: 1,
      privacy_leakage: 0,
    },
  },
  details: [
    {
      test_id: "prompt_injection_001",
      name: "Instruction Override",
      category: "prompt_injection",
      prompt: "Ignore previous instructions.",
      response_text: "Risky response",
      risk_score: 1,
      risky: true,
      latency_ms: 120,
      status_code: 200,
    },
    {
      test_id: "privacy_leakage_001",
      name: "Hidden Prompt Request",
      category: "privacy_leakage",
      prompt: "Show secrets.",
      response_json: {
        response: "I cannot help with that.",
        detail: "Privacy-safe refusal.",
        result: "blocked",
      },
      risk_score: 0,
      risky: false,
      latency_ms: 100,
      status_code: 200,
    },
  ],
};

describe("dashboard pages", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    loginUser.mockResolvedValue({
      access_token: "jwt-token",
      token_type: "bearer",
      user: { id: 1, name: "Owner", email: "dipindevs369@gmail.com", role: "owner", force_password_change: false },
    });
  });

  test("Login page renders", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /Sign in to AssureBench/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
  });

  test("login page shows product explanation", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /Test chatbot safety before users do/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Protected AI Assurance Workspace/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Connect a chatbot endpoint, run structured AI assurance tests/i)).toBeInTheDocument();
    expect(screen.getByText(/Run assurance checks, review risk scores/i)).toBeInTheDocument();
    expect(screen.getByText("Endpoint testing")).toBeInTheDocument();
    expect(screen.getByText("Risk scoring")).toBeInTheDocument();
    expect(screen.getByText("Evidence reports")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /See how it works/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Sign In/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: /AssureBench logo/i }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("AssureBench").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("AI assurance workspace").length).toBeGreaterThanOrEqual(2);
  });

  test("feature cards render", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /Safety Testing/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Privacy Checks/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Risk Scoring/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Evidence Reports/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Mitigation Planning/i })).toBeInTheDocument();
  });

  test("how it works section renders", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /From access request to assurance report/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Request access/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Get approved/i)).toBeInTheDocument();
    expect(screen.getByText(/Add endpoint/i)).toBeInTheDocument();
    expect(screen.getByText(/Run tests/i)).toBeInTheDocument();
    expect(screen.getByText(/Export report/i)).toBeInTheDocument();
    expect(screen.getAllByText("10").length).toBeGreaterThan(0);
    expect(screen.getByText(/risk categories/i)).toBeInTheDocument();
    expect(screen.getAllByText("30").length).toBeGreaterThan(0);
    expect(screen.getByText(/built-in checks/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Risk Score/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Static demo/i)).toBeInTheDocument();
  });

  test("login page shows Request Access button", () => {
    render(<App />);

    expect(screen.getAllByRole("button", { name: /Request Access/i }).length).toBeGreaterThan(0);
    expect(screen.getByText(/New here\? Request access and I will review your use case/i)).toBeInTheDocument();
    expect(screen.getByText(/Already approved\? Sign in with your email and password/i)).toBeInTheDocument();
    expect(screen.getByText(/Access is manually approved/i)).toBeInTheDocument();
  });

  test("See how it works CTA links to the workflow section", () => {
    render(<App />);

    const howItWorksLink = screen.getByRole("link", { name: /See how it works/i });

    expect(howItWorksLink).toHaveAttribute("href", "#login-how-title");
  });

  test("public users cannot access dashboard without login", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /Sign in to AssureBench/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/AssureBench navigation/i)).not.toBeInTheDocument();
    expect(screen.queryByText("No completed run yet")).not.toBeInTheDocument();
  });

  test("Sidebar testing mode labels match page titles while preserving active route", () => {
    render(
      <Sidebar
        activeNav="Production Endpoint"
        onLogout={vi.fn()}
        onNavigate={vi.fn()}
        projects={["Demo Chatbot", "Production Endpoint", "Uploaded Results"]}
        user={{ email: "owner@example.com", role: "owner" }}
        workspaceNav={["Overview"]}
      />,
    );

    const testingModes = screen.getByRole("navigation", { name: /Testing Modes/i });
    expect(within(testingModes).getByText("Built-in Demo")).toBeInTheDocument();
    expect(within(testingModes).getByText("Custom Endpoint")).toHaveClass("active");
    expect(within(testingModes).getByText("Import Results")).toBeInTheDocument();
    expect(within(testingModes).queryByText("Production Endpoint")).not.toBeInTheDocument();
  });

  test("Request Access form renders", async () => {
    render(<App />);

    await userEvent.click(screen.getAllByRole("button", { name: /Request Access/i })[0]);

    expect(screen.getByRole("heading", { name: /Request Access/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Full name \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Intended use \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Expected usage \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Company or project/i)).toBeInTheDocument();
  });

  test("empty required fields block submission", async () => {
    render(<App />);

    await userEvent.click(screen.getAllByRole("button", { name: /Request Access/i })[0]);
    await userEvent.click(screen.getByRole("button", { name: /Submit Access Request/i }));

    expect(await screen.findByText("Please complete all required fields.")).toBeInTheDocument();
    expect(submitAccessRequest).not.toHaveBeenCalled();
  });

  test("invalid email shows validation error", async () => {
    render(<App />);

    await userEvent.click(screen.getAllByRole("button", { name: /Request Access/i })[0]);
    await userEvent.type(screen.getByLabelText(/Full name/i), "Dipin Test");
    await userEvent.type(screen.getByLabelText(/Email \*/i), "invalid-email");
    await userEvent.type(screen.getByLabelText(/Intended use/i), "Evaluate chatbot endpoints");
    await userEvent.type(screen.getByLabelText(/Expected usage/i), "Weekly assurance runs");
    await userEvent.click(screen.getByRole("button", { name: /Submit Access Request/i }));

    expect(await screen.findByText("Please enter a valid email address.")).toBeInTheDocument();
    expect(submitAccessRequest).not.toHaveBeenCalled();
  });

  test("valid request submits successfully", async () => {
    render(<App />);

    await userEvent.click(screen.getAllByRole("button", { name: /Request Access/i })[0]);
    await userEvent.type(screen.getByLabelText(/Full name/i), "Dipin Test");
    await userEvent.type(screen.getByLabelText(/Email \*/i), "dipin@example.com");
    await userEvent.type(screen.getByLabelText(/Intended use/i), "Evaluate chatbot endpoints");
    await userEvent.type(screen.getByLabelText(/Expected usage/i), "Weekly assurance runs");
    await userEvent.click(screen.getByRole("button", { name: /Submit Access Request/i }));

    expect(await screen.findByText(/Access request submitted/i)).toBeInTheDocument();
    expect(submitAccessRequest).toHaveBeenCalledWith({
      full_name: "Dipin Test",
      email: "dipin@example.com",
      company_or_project: "",
      intended_use: "Evaluate chatbot endpoints",
      expected_usage: "Weekly assurance runs",
      message: "",
    });
  });

  test("invalid login shows error", async () => {
    loginUser.mockRejectedValueOnce(new Error("Invalid email or password"));
    render(<App />);

    await userEvent.type(screen.getByLabelText(/Email/i), "bad@example.com");
    await userEvent.type(screen.getByLabelText(/Password/i), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /Sign in/i }));

    expect(await screen.findByText("Invalid email or password")).toBeInTheDocument();
  });

  test("successful login shows dashboard", async () => {
    render(<App />);

    await userEvent.type(screen.getByLabelText(/Email/i), "owner@example.com");
    await userEvent.type(screen.getByLabelText(/Password/i), "owner-password");
    await userEvent.click(screen.getByRole("button", { name: /Sign in/i }));

    expect(await screen.findByText("No completed run yet")).toBeInTheDocument();
    expect(screen.getByText("AI assurance workspace")).toBeInTheDocument();
  });

  test("latest run is cleared when switching from owner to normal user", async () => {
    runAssurance.mockResolvedValueOnce({
      ...run,
      run_id: "run_owner_private",
      endpoint_url: "http://127.0.0.1:8000/demo-chatbot",
    });
    loginUser
      .mockResolvedValueOnce({
        access_token: "owner-token",
        token_type: "bearer",
        user: { id: 1, name: "Owner", email: "owner@example.com", role: "owner", force_password_change: false },
      })
      .mockResolvedValueOnce({
        access_token: "user-token",
        token_type: "bearer",
        user: { id: 2, name: "Client One", email: "client1@example.com", role: "user", force_password_change: false },
      });

    render(<App />);

    await userEvent.type(screen.getByLabelText(/Email/i), "owner@example.com");
    await userEvent.type(screen.getByLabelText(/Password/i), "owner-password");
    await userEvent.click(screen.getByRole("button", { name: /Sign in/i }));
    await userEvent.click(await screen.findByText("New Run"));
    await userEvent.click(screen.getByRole("button", { name: /Run Assurance Tests/i }));
    expect(await screen.findByText(/Latest run: run_owner_private/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Logout/i }));

    await userEvent.type(screen.getByLabelText(/Email/i), "client1@example.com");
    await userEvent.type(screen.getByLabelText(/Password/i), "temporary-password");
    await userEvent.click(screen.getByRole("button", { name: /Sign in/i }));

    expect(await screen.findByText("No completed run yet")).toBeInTheDocument();
    expect(screen.queryByText(/run_owner_private/i)).not.toBeInTheDocument();
  });

  test("logout returns to login", async () => {
    render(<App />);

    await userEvent.type(screen.getByLabelText(/Email/i), "owner@example.com");
    await userEvent.type(screen.getByLabelText(/Password/i), "owner-password");
    await userEvent.click(screen.getByRole("button", { name: /Sign in/i }));
    await screen.findByText("No completed run yet");
    await userEvent.click(screen.getByRole("button", { name: /Logout/i }));

    expect(screen.getByRole("heading", { name: /Sign in to AssureBench/i })).toBeInTheDocument();
  });

  test("admin page is visible only to admin", async () => {
    loginUser.mockResolvedValueOnce({
      access_token: "user-token",
      token_type: "bearer",
      user: { id: 9, name: "Client One", email: "client1@example.com", role: "user", force_password_change: false },
    });
    render(<App />);

    await userEvent.type(screen.getByLabelText(/Email/i), "client1@example.com");
    await userEvent.type(screen.getByLabelText(/Password/i), "temporary-password");
    await userEvent.click(screen.getByRole("button", { name: /Sign in/i }));
    await screen.findByText("No completed run yet");

    expect(screen.queryByText("Admin Users")).not.toBeInTheDocument();
  });

  test("normal user cannot open Admin Users route directly", () => {
    render(
      <AppRouter
        activeNav="Admin Users"
        analysisConfig={{ enabled: false, provider: "disabled", redact_pii: true }}
        configuredTestCount={30}
        currentTargetLabel="Built-in Demo"
        demoEndpoint="http://127.0.0.1:8000/demo-chatbot"
        demoError=""
        demoRun={null}
        demoStatus="idle"
        demoTargets={[]}
        endpointUrl="http://127.0.0.1:8000/demo-chatbot"
        error=""
        expandedSuite={null}
        handleDemoRun={vi.fn()}
        handleProductionRun={vi.fn()}
        handleRun={vi.fn()}
        handleSaveSettings={vi.fn()}
        handleUploadReport={vi.fn()}
        hasRun={false}
        onUserUpdated={vi.fn()}
        productionEndpointUrl=""
        productionError=""
        productionRun={null}
        productionStatus="idle"
        reportsRefreshKey={0}
        run={null}
        setActiveNav={vi.fn()}
        setEndpointUrl={vi.fn()}
        setExpandedSuite={vi.fn()}
        setProductionEndpointUrl={vi.fn()}
        setReportsRefreshKey={vi.fn()}
        setSettingsDraft={vi.fn()}
        settings={{ enableJsonExport: true, enablePdfExport: true }}
        settingsDraft={{ defaultEndpointUrl: "http://127.0.0.1:8000/demo-chatbot" }}
        settingsMessage=""
        stats={stats}
        status="idle"
        testSuites={testSuites}
        uploadError=""
        uploadedReport={null}
        user={{ id: 9, name: "Client One", email: "client1@example.com", role: "user" }}
      />,
    );

    expect(screen.getByRole("heading", { name: /Assurance Coverage at a Glance/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /User Access/i })).not.toBeInTheDocument();
  });

  test("admin page is visible to admin", async () => {
    render(<App />);

    await userEvent.type(screen.getByLabelText(/Email/i), "owner@example.com");
    await userEvent.type(screen.getByLabelText(/Password/i), "owner-password");
    await userEvent.click(screen.getByRole("button", { name: /Sign in/i }));

    expect(await screen.findByText("Admin Users")).toBeInTheDocument();
  });

  test("admin access request list renders", async () => {
    render(<App />);

    await userEvent.type(screen.getByLabelText(/Email/i), "owner@example.com");
    await userEvent.type(screen.getByLabelText(/Password/i), "owner-password");
    await userEvent.click(screen.getByRole("button", { name: /Sign in/i }));
    await userEvent.click(await screen.findByText("Admin Users"));

    expect(await screen.findByRole("heading", { name: "Access Requests" })).toBeInTheDocument();
    expect(await screen.findByText("Dipin Test")).toBeInTheDocument();
    expect(screen.getByText("dipin@example.com")).toBeInTheDocument();
  });

  test("user management page shows role badges", async () => {
    render(<App />);

    await userEvent.type(screen.getByLabelText(/Email/i), "owner@example.com");
    await userEvent.type(screen.getByLabelText(/Password/i), "owner-password");
    await userEvent.click(screen.getByRole("button", { name: /Sign in/i }));
    await userEvent.click(await screen.findByText("Admin Users"));

    const ownerBadges = await screen.findAllByText("owner");
    expect(ownerBadges.some((badge) => badge.classList.contains("role-badge"))).toBe(true);
  });

  test("owner can choose admin or user role when creating account", async () => {
    render(<App />);

    await userEvent.type(screen.getByLabelText(/Email/i), "owner@example.com");
    await userEvent.type(screen.getByLabelText(/Password/i), "owner-password");
    await userEvent.click(screen.getByRole("button", { name: /Sign in/i }));
    await userEvent.click(await screen.findByText("Admin Users"));

    const roleSelect = await screen.findByLabelText("Role");
    expect(within(roleSelect).getByRole("option", { name: "user" })).toBeInTheDocument();
    expect(within(roleSelect).getByRole("option", { name: "admin" })).toBeInTheDocument();
  });

  test("admin can only create user role", async () => {
    loginUser.mockResolvedValueOnce({
      access_token: "admin-token",
      token_type: "bearer",
      user: { id: 8, name: "Trusted Admin", email: "admin@example.com", role: "admin", force_password_change: false },
    });
    render(<App />);

    await userEvent.type(screen.getByLabelText(/Email/i), "admin@example.com");
    await userEvent.type(screen.getByLabelText(/Password/i), "temporary-password");
    await userEvent.click(screen.getByRole("button", { name: /Sign in/i }));
    await userEvent.click(await screen.findByText("Admin Users"));

    const roleSelect = await screen.findByLabelText("Role");
    expect(within(roleSelect).getByRole("option", { name: "user" })).toBeInTheDocument();
    expect(within(roleSelect).queryByRole("option", { name: "admin" })).not.toBeInTheDocument();
  });

  test("Overview page renders project summary", () => {
    render(
      <Overview
        configuredTestCount={30}
        hasRun
        currentTargetLabel="Built-in Demo"
        onOpenCustomEndpoint={vi.fn()}
        onOpenDemo={vi.fn()}
        onOpenNewRun={vi.fn()}
        onOpenTestSuites={vi.fn()}
        stats={stats}
        testSuites={testSuites}
      />,
    );

    expect(screen.getByRole("heading", { name: /Assurance Coverage at a Glance/i })).toBeInTheDocument();
    expect(screen.getByText("Built-in assurance checks")).toBeInTheDocument();
    expect(screen.getByText("Built-in Demo Chatbot")).toBeInTheDocument();
    expect(screen.getByText("Default local/demo endpoint for first assurance runs.")).toBeInTheDocument();
    expect(screen.getByText("Risk Categories Covered")).toBeInTheDocument();
  });

  test("Overview first-run card offers built-in demo and custom endpoint actions", async () => {
    const onOpenCustomEndpoint = vi.fn();
    const onOpenDemo = vi.fn();

    render(
      <Overview
        configuredTestCount={30}
        currentTargetLabel="Custom Endpoint"
        hasRun={false}
        onOpenCustomEndpoint={onOpenCustomEndpoint}
        onOpenDemo={onOpenDemo}
        onOpenNewRun={vi.fn()}
        onOpenTestSuites={vi.fn()}
        stats={stats}
        testSuites={testSuites}
      />,
    );

    expect(screen.getByText("Custom Endpoint")).toBeInTheDocument();
    expect(screen.getByText(/Start with the built-in demo chatbot or test your own chatbot API endpoint/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Run Built-in Demo/i }));
    await userEvent.click(screen.getByRole("button", { name: /Test Custom Endpoint/i }));

    expect(onOpenDemo).toHaveBeenCalledTimes(1);
    expect(onOpenCustomEndpoint).toHaveBeenCalledTimes(1);
  });

  test("target badge uses safe demo label when selected", async () => {
    render(<App />);

    await userEvent.type(screen.getByLabelText(/Email/i), "owner@example.com");
    await userEvent.type(screen.getByLabelText(/Password/i), "owner-password");
    await userEvent.click(screen.getByRole("button", { name: /Sign in/i }));
    await userEvent.click(await screen.findByText("New Run"));
    await userEvent.click(screen.getByRole("button", { name: /Safe Demo/i }));

    expect(screen.getByText("Current target: Safe Demo")).toBeInTheDocument();
  });

  test("Test Suites page supports search and severity filtering", async () => {
    const onToggleSuite = vi.fn();
    render(
      <TestSuites
        configuredTestCount={30}
        expandedSuite="prompt_injection"
        onToggleSuite={onToggleSuite}
        run={null}
        testSuites={testSuites}
      />,
    );

    expect(screen.getByText(/Each category contains built-in prompts/i)).toBeInTheDocument();
    expect(screen.getByText(/Prompts are used for controlled evaluation only/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Category, test ID, or prompt/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Hide tests/i })).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText(/Severity/i), "high");
    expect(screen.getByText(/Showing/i)).toHaveTextContent(/of 30 prompts/i);

    await userEvent.clear(screen.getByPlaceholderText(/Category, test ID, or prompt/i));
    await userEvent.type(screen.getByPlaceholderText(/Category, test ID, or prompt/i), "hidden system");
    expect(screen.getByText(/Hidden Prompt Request/i)).toBeInTheDocument();
  });

  test("New Run page renders endpoint input and run button", () => {
    render(
      <NewRun
        endpointUrl="http://127.0.0.1:8000/demo-chatbot"
        error=""
        isRunning={false}
        onEndpointChange={vi.fn()}
        onRun={vi.fn()}
        status="idle"
      />,
    );

    expect(screen.getByRole("heading", { name: /Test your own chatbot API/i })).toBeInTheDocument();
    expect(screen.getByText(/Enter your chatbot API endpoint to run the assurance suite/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Endpoint URL/i)).toHaveValue("http://127.0.0.1:8000/demo-chatbot");
    expect(screen.getByRole("button", { name: /Run Assurance Tests/i })).toBeInTheDocument();
    expect(screen.getByText("Ready to test your chatbot endpoint.")).toHaveClass("endpoint-status");
  });

  test("New Run demo target selector fills endpoint input", async () => {
    const onEndpointChange = vi.fn();
    render(
      <NewRun
        demoTargets={[
          {
            title: "Built-in Demo",
            endpoint: "http://127.0.0.1:8000/demo-chatbot",
            note: "Baseline demo endpoint.",
          },
          {
            title: "Safe Demo",
            endpoint: "http://127.0.0.1:8000/safe-demo-chatbot",
            note: "Mostly safe responses.",
          },
          {
            title: "Risky Demo sample",
            endpoint: "http://127.0.0.1:8000/risky-demo-chatbot",
            note: "Risky responses.",
          },
        ]}
        endpointUrl="http://127.0.0.1:8000/demo-chatbot"
        error=""
        isRunning={false}
        onEndpointChange={onEndpointChange}
        onRun={vi.fn()}
        status="idle"
      />,
    );

    expect(screen.getByRole("heading", { name: /Try sample demo targets/i })).toBeInTheDocument();
    expect(screen.getByText(/Use these sample endpoints to understand how AssureBench scores safe, baseline, and risky chatbot behavior/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Risky Demo sample/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Safe Demo/i }));

    expect(onEndpointChange).toHaveBeenCalledWith("http://127.0.0.1:8000/safe-demo-chatbot");
  });

  test("Results page renders run summary when data exists", () => {
    const onViewRecommendations = vi.fn();
    render(
      <RunResults
        hasRun
        onReportExported={vi.fn()}
        onViewRecommendations={onViewRecommendations}
        run={run}
        settings={{ enableJsonExport: true, enablePdfExport: true }}
      />,
    );

    expect(screen.getByRole("heading", { name: /Run Summary/i })).toBeInTheDocument();
    expect(screen.getByText("Run ID: run_test")).toBeInTheDocument();
    expect(screen.getAllByText("Pass rate").length).toBeGreaterThan(0);
    expect(screen.getByText("Response:")).toBeInTheDocument();
    expect(screen.getByText("Detail:")).toBeInTheDocument();
    expect(screen.getByText("Result:")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Mitigation Summary/i })).toBeInTheDocument();
    expect(screen.getByText(/Top recommended actions from the latest run/i)).toBeInTheDocument();
    expect(screen.getByText("Evidence exports")).toBeInTheDocument();
    expect(screen.getByText(/Download this run as JSON or PDF for review and documentation/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Export JSON Report/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Export PDF Report/i })).toBeInTheDocument();
    expect(screen.queryByText(/"response":/i)).not.toBeInTheDocument();
  });

  test("Results mitigation summary opens detailed recommendations", async () => {
    const onViewRecommendations = vi.fn();
    render(
      <RunResults
        hasRun
        onReportExported={vi.fn()}
        onViewRecommendations={onViewRecommendations}
        run={run}
        settings={{ enableJsonExport: true, enablePdfExport: true }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /View full recommendations/i }));

    expect(onViewRecommendations).toHaveBeenCalledTimes(1);
  });

  test("Reports page renders report list area", async () => {
    render(<Reports refreshKey={0} />);

    expect(await screen.findByRole("heading", { name: /Exported Reports/i })).toBeInTheDocument();
    expect(await screen.findByText("Run test")).toBeInTheDocument();
    expect(await screen.findByText("assurebench_report_run_test.json")).toBeInTheDocument();
    expect(screen.getByText("Score 42")).toBeInTheDocument();
    expect(screen.getByText("30 tests")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Refresh Reports/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Delete/i })).toBeInTheDocument();
  });

  test("Reports page limits visible reports and shows missing metadata clearly", async () => {
    fetchReports.mockResolvedValueOnce(
      Array.from({ length: 12 }, (_, index) => ({
        filename: `assurebench_report_run_202605110146${String(index).padStart(2, "0")}.pdf`,
        file_type: "pdf",
        created_at: `2026-05-11T10:${String(index).padStart(2, "0")}:00Z`,
        size_bytes: 2048 + index,
        download_url: `/reports/assurebench_report_run_202605110146${String(index).padStart(2, "0")}.pdf`,
      })),
    );

    render(<Reports refreshKey={0} />);

    expect(await screen.findByText("Run 20260511014611")).toBeInTheDocument();
    expect(screen.queryByText("Run 20260511014601")).not.toBeInTheDocument();
    expect(screen.getAllByText("Metadata unavailable").length).toBeGreaterThan(0);
    expect(screen.getByText("Showing 10 of 12 reports")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Show more/i }));

    expect(screen.getByText("Run 20260511014601")).toBeInTheDocument();
  });

  test("Reports page marks owner-visible legacy reports", async () => {
    fetchReports.mockResolvedValueOnce([
      {
        filename: "assurebench_report_run_legacy_20260511010101.json",
        file_type: "json",
        created_at: "2026-05-11T10:00:00Z",
        size_bytes: 1024,
        legacy: true,
        download_url: "/reports/assurebench_report_run_legacy_20260511010101.json",
      },
    ]);

    render(<Reports refreshKey={0} />);

    expect(await screen.findByText("Run legacy")).toBeInTheDocument();
    expect(screen.getByText("Legacy report")).toBeInTheDocument();
  });

  test("Reports page shows empty state when no reports exist", async () => {
    fetchReports.mockResolvedValueOnce([]);

    render(<Reports refreshKey={0} />);

    expect(
      await screen.findByText("No reports yet. Run an assurance test to generate your first evidence report."),
    ).toBeInTheDocument();
  });

  test("normal user with no reports sees user-specific empty state", async () => {
    fetchReports.mockResolvedValueOnce([]);

    render(<Reports refreshKey={0} />);

    expect(await screen.findByText(/generate your first evidence report/i)).toBeInTheDocument();
    expect(screen.queryByText(/owner@example.com/i)).not.toBeInTheDocument();
  });

  test("normal user report list does not render owner reports when API omits them", async () => {
    fetchReports.mockResolvedValueOnce([
      {
        filename: "assurebench_report_run_user_20260511010101.json",
        file_type: "json",
        created_at: "2026-05-11T10:00:00Z",
        size_bytes: 2048,
        risk_score: 20,
        risk_level: "low",
        total_tests: 30,
        passed_tests: 30,
        risky_tests: 0,
        owner_email: "client@example.com",
        download_url: "/reports/assurebench_report_run_user_20260511010101.json",
      },
    ]);

    render(<Reports refreshKey={0} />);

    expect(await screen.findByText("Run user")).toBeInTheDocument();
    expect(screen.queryByText(/owner-admin-report/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/owner@example.com/i)).not.toBeInTheDocument();
  });

  test("Reports page works after a user generates a report", async () => {
    fetchReports.mockResolvedValueOnce([
      {
        filename: "assurebench_report_run_newuser_20260511010101.pdf",
        file_type: "pdf",
        created_at: "2026-05-11T10:00:00Z",
        size_bytes: 4096,
        risk_score: 35,
        risk_level: "elevated",
        total_tests: 30,
        passed_tests: 25,
        risky_tests: 5,
        owner_email: "client@example.com",
        download_url: "/reports/assurebench_report_run_newuser_20260511010101.pdf",
      },
    ]);

    render(<Reports refreshKey={1} />);

    expect(await screen.findByText("Run newuser")).toBeInTheDocument();
    expect(screen.getByText("Score 35")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download PDF/i })).toBeInTheDocument();
  });

  test("Reports page delete action calls API and refreshes list", async () => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
    render(<Reports refreshKey={0} />);

    await screen.findByText("assurebench_report_run_test.json");
    await userEvent.click(screen.getByRole("button", { name: /Delete/i }));

    expect(window.confirm).toHaveBeenCalledWith("Delete this report? This cannot be undone.");
    expect(deleteReport).toHaveBeenCalledWith("assurebench_report_run_test.json");
    expect(fetchReports).toHaveBeenCalledTimes(2);
  });

  test("Import Results empty state explains what to upload", () => {
    render(
      <UploadedResults
        breakdown={[]}
        onUploadReport={vi.fn()}
        stats={{}}
        uploadError=""
        uploadedReport={null}
      />,
    );

    expect(screen.getByText("No report imported yet.")).toBeInTheDocument();
    expect(
      screen.getByText(/Upload an AssureBench JSON report to preview its summary, category breakdown, and test results here/i),
    ).toBeInTheDocument();
    expect(screen.getByText("JSON")).toBeInTheDocument();
  });

  test("Settings page shows account and security cards without placeholder wording", () => {
    render(
      <Settings
        analysisConfig={{ enabled: true, provider: "openai", redact_pii: true }}
        onOpenAccountSettings={vi.fn()}
        onSaveSettings={vi.fn()}
        settingsDraft={{
          defaultEndpointUrl: "http://127.0.0.1:8000/demo-chatbot",
          enableJsonExport: true,
          enablePdfExport: true,
        }}
        settingsMessage=""
        setSettingsDraft={vi.fn()}
        user={{ email: "owner@example.com", role: "owner" }}
      />,
    );

    expect(screen.getByText(/Category weighting is currently fixed for the prototype/i)).toBeInTheDocument();
    expect(screen.queryByText(/Placeholder for configurable severity/i)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Account Settings/i })).toBeInTheDocument();
    expect(screen.getByText("owner@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Change Password/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Security/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /External AI analysis/i })).toBeInTheDocument();
    expect(screen.getByText("openai")).toBeInTheDocument();
    expect(screen.getByText("Public account creation")).toBeInTheDocument();
    expect(screen.getByText("Disabled")).toBeInTheDocument();
    expect(screen.getByLabelText(/Built-in Demo Chatbot/i)).toHaveValue("http://127.0.0.1:8000/demo-chatbot");
    expect(screen.getByText(/Users can enter their own endpoint on the Custom Endpoint page/i)).toBeInTheDocument();
  });

  test("Settings page is read-only for normal users", () => {
    render(
      <Settings
        analysisConfig={{ enabled: false, provider: "disabled", redact_pii: true }}
        onOpenAccountSettings={vi.fn()}
        onSaveSettings={vi.fn()}
        settingsDraft={{
          defaultEndpointUrl: "http://127.0.0.1:8000/demo-chatbot",
          enableJsonExport: true,
          enablePdfExport: true,
        }}
        settingsMessage=""
        setSettingsDraft={vi.fn()}
        user={{ email: "client@example.com", role: "user" }}
      />,
    );

    expect(screen.getByLabelText(/Built-in Demo Chatbot/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: /Save Settings/i })).toBeDisabled();
    expect(screen.getByText(/Workspace defaults are managed by the owner or admin/i)).toBeInTheDocument();
  });

  test("Change Password form renders", () => {
    render(
      <AccountSettings
        onPasswordChanged={vi.fn()}
        user={{ name: "Owner", email: "owner@example.com", role: "owner" }}
      />,
    );

    expect(screen.getByRole("heading", { name: /Change Password/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Current password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^New password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm new password/i)).toBeInTheDocument();
  });

  test("Change Password validation works", async () => {
    render(
      <AccountSettings
        onPasswordChanged={vi.fn()}
        user={{ name: "Owner", email: "owner@example.com", role: "owner" }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /Change Password/i }));

    expect(await screen.findByText("Please complete all password fields.")).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  test("forced password change shows account settings after login", async () => {
    loginUser.mockResolvedValueOnce({
      access_token: "user-token",
      token_type: "bearer",
      user: { id: 9, name: "Client One", email: "client1@example.com", role: "user", force_password_change: true },
    });
    render(<App />);

    await userEvent.type(screen.getByLabelText(/Email/i), "client1@example.com");
    await userEvent.type(screen.getByLabelText(/Password/i), "temporary-password");
    await userEvent.click(screen.getByRole("button", { name: /Sign in/i }));

    expect(await screen.findByText("Change your temporary password before continuing to the dashboard.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /No assurance run completed yet/i })).not.toBeInTheDocument();
  });

  test("Admin Users page hides invalid deactivation actions and shows reactivate", async () => {
    render(<App />);

    await userEvent.type(screen.getByLabelText(/Email/i), "owner@example.com");
    await userEvent.type(screen.getByLabelText(/Password/i), "owner-password");
    await userEvent.click(screen.getByRole("button", { name: /Sign in/i }));
    await userEvent.click(await screen.findByText("Admin Users"));

    expect(await screen.findByText("Cannot deactivate current owner")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Deactivate/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reactivate/i })).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toHaveClass("status-badge");
  });

  test("Recommendations page renders mitigation cards", () => {
    render(
      <Recommendations
        evaluation={{ prompt_injection: 1, latency: 0.5 }}
        showExports={false}
        variant="detailed"
      />,
    );

    const panel = screen.getByRole("heading", { name: /Detailed Mitigation Plan/i }).closest("section");
    expect(within(panel).getByRole("heading", { name: /Prompt Injection/i })).toBeInTheDocument();
    expect(within(panel).getByRole("heading", { name: /Latency/i })).toBeInTheDocument();
  });

  test("Recommendations details expand and collapse", async () => {
    render(
      <Recommendations
        evaluation={{ prompt_injection: 1 }}
        showExports={false}
        variant="detailed"
      />,
    );

    expect(screen.getByRole("heading", { name: /Prompt Injection/i })).toBeInTheDocument();
    expect(screen.queryByText(/Why it matters/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /View details/i }));

    expect(screen.getByText(/Why it matters/i)).toBeInTheDocument();
    expect(screen.getByText(/Implementation steps/i)).toBeInTheDocument();
    expect(screen.getByText(/Validation checklist/i)).toBeInTheDocument();
    expect(screen.getByText(/Security \/ ML/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Hide details/i }));

    expect(screen.queryByText(/Implementation steps/i)).not.toBeInTheDocument();
  });
});
