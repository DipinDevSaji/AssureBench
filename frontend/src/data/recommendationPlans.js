export const detailedMitigationPlans = {
  prompt_injection: {
    why: "Prompt injection can cause a chatbot to ignore instruction hierarchy, reveal hidden prompts, or follow attacker-controlled content. This matters most when the assistant has access to tools, private context, or privileged instructions.",
    steps: [
      "Separate system, developer, retrieved, and user-controlled content before constructing prompts.",
      "Add detection for instruction override attempts, hidden prompt requests, and role-confusion patterns.",
      "Add refusal and safe-completion templates for requests that ask the model to reveal prompts, secrets, or policies.",
    ],
    checklist: [
      "Known prompt-injection tests are refused without leaking hidden context.",
      "Retrieved documents are quoted or summarized without becoming instructions.",
      "System and developer instructions are never returned in responses.",
    ],
    owner: "Security / ML",
    priority: "High",
    effort: "Medium",
  },
  privacy_leakage: {
    why: "Privacy leakage can expose personal data, credentials, or customer-sensitive content. It creates compliance, trust, and incident-response risk.",
    steps: [
      "Add pre-response scanning for emails, secrets, API keys, credentials, and personal data.",
      "Redact or block responses that contain sensitive values unless explicitly authorized.",
      "Limit retrieved context and tool outputs to the minimum data required for the answer.",
    ],
    checklist: [
      "PII examples are redacted or refused in test outputs.",
      "Secrets and API-key-like strings are blocked before response delivery.",
      "Logs avoid storing raw sensitive responses.",
    ],
    owner: "Security / Backend",
    priority: "High",
    effort: "High",
  },
  hallucination: {
    why: "Hallucination can produce unsupported claims with false confidence. In assurance contexts this can mislead users and damage trust in the product.",
    steps: [
      "Require uncertainty language when evidence is missing or retrieval returns no support.",
      "Add grounding checks for factual claims and citations.",
      "Penalize confident claims that cannot be traced to retrieved or verified evidence.",
    ],
    checklist: [
      "Unknown factual prompts produce uncertainty rather than invented facts.",
      "Citations point to available evidence.",
      "Unsupported confident claims are flagged in evaluation.",
    ],
    owner: "ML / Product",
    priority: "Medium",
    effort: "Medium",
  },
  unsafe_output: {
    why: "Unsafe outputs can provide harmful, illegal, or security-bypass guidance. Even a small number of unsafe completions can make a chatbot unsuitable for public deployment.",
    steps: [
      "Add a safety classifier before and after generation for harmful requests and outputs.",
      "Use refusal templates for illegal activity, security bypasses, and harmful instructions.",
      "Log unsafe attempts with enough metadata for review without storing sensitive content.",
    ],
    checklist: [
      "Unsafe instruction prompts are refused.",
      "Responses avoid actionable harmful steps.",
      "Unsafe attempts are visible in review logs.",
    ],
    owner: "Security / Backend",
    priority: "High",
    effort: "Medium",
  },
  format_reliability: {
    why: "Format failures break downstream integrations that expect structured JSON or schema-compliant output. This is especially important for automation and report pipelines.",
    steps: [
      "Validate structured responses against a JSON schema before returning them.",
      "Retry or repair invalid responses with a constrained format prompt.",
      "Add tests for required keys, array shapes, and invalid fallback strings.",
    ],
    checklist: [
      "Required keys are present for structured prompts.",
      "Invalid JSON strings are repaired or retried.",
      "Schema failures are reported clearly.",
    ],
    owner: "Backend / ML",
    priority: "Medium",
    effort: "Low",
  },
  bias: {
    why: "Bias can produce discriminatory or stereotyping responses about protected classes. This creates fairness, reputational, and compliance risk.",
    steps: [
      "Add protected-class test prompts and review outputs for stereotyping or unfair assumptions.",
      "Require responses to use task-relevant evidence rather than demographic generalizations.",
      "Track bias regressions separately during prompt, model, or policy changes.",
    ],
    checklist: [
      "Protected-class prompts avoid stereotypes.",
      "Advice is based on relevant facts or asks for more context.",
      "Bias checks are included in release validation.",
    ],
    owner: "ML / Product",
    priority: "High",
    effort: "Medium",
  },
  jailbreak: {
    why: "Jailbreak attempts try to bypass safety rules through role-play, coercion, or instruction hierarchy attacks. They are common against public chatbot systems.",
    steps: [
      "Detect role-play, no-rules personas, coercive framing, and policy override language.",
      "Keep system policy isolated and reinforce instruction hierarchy in prompts.",
      "Maintain regression tests for known jailbreak patterns and variants.",
    ],
    checklist: [
      "Role-play bypass prompts do not override policy.",
      "Forbidden requests remain refused after rephrasing.",
      "Jailbreak variants are tracked across releases.",
    ],
    owner: "Security / ML",
    priority: "High",
    effort: "Medium",
  },
  data_exfiltration: {
    why: "Data exfiltration attempts try to extract logs, environment variables, metadata, secrets, or hidden tool outputs. This is critical when a chatbot is connected to internal systems.",
    steps: [
      "Apply least-privilege access to retrieved context, tools, logs, and environment metadata.",
      "Block outputs that mention internal files, secrets, environment variables, or hidden tool data.",
      "Audit tool outputs and retrieved context before they reach the model.",
    ],
    checklist: [
      "Environment and log extraction prompts are refused.",
      "Tool outputs are filtered before model use.",
      "Internal metadata is never exposed in user responses.",
    ],
    owner: "Security / Backend",
    priority: "High",
    effort: "High",
  },
  over_refusal: {
    why: "Over-refusal blocks safe, benign user requests and reduces usefulness. It can make the system feel unreliable even when it is technically safe.",
    steps: [
      "Separate benign requests from genuinely unsafe requests in refusal policy.",
      "Add examples that reward helpful answers to low-risk prompts.",
      "Tune refusal templates so they provide safe alternatives instead of blanket denial.",
    ],
    checklist: [
      "Benign translation, summarization, and explanation prompts are answered.",
      "Safety refusals are limited to genuinely unsafe content.",
      "Safe alternatives are offered when partial help is possible.",
    ],
    owner: "Product / ML",
    priority: "Medium",
    effort: "Medium",
  },
  latency: {
    why: "High latency damages user experience and can indicate slow retrieval, tool calls, model routing, or infrastructure bottlenecks. It also increases cost and timeout risk.",
    steps: [
      "Track p95 latency by endpoint, category, and run.",
      "Profile slow retrieval, tool calls, model selection, and network paths.",
      "Add timeouts, caching, streaming, or faster fallback routes where appropriate.",
    ],
    checklist: [
      "p95 latency stays within the chosen service target.",
      "Slow categories are visible in reports.",
      "Timeout and fallback behavior is tested.",
    ],
    owner: "Backend / Platform",
    priority: "Medium",
    effort: "Medium",
  },
};
