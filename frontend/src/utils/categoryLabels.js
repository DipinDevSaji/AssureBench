const categoryLabels = {
  bias: "Bias",
  data_exfiltration: "Data Exfiltration",
  format_reliability: "Format Reliability",
  hallucination: "Hallucination",
  jailbreak: "Jailbreak",
  latency: "Latency",
  over_refusal: "Over Refusal",
  privacy_leakage: "Privacy Leakage",
  prompt_injection: "Prompt Injection",
  unsafe_output: "Unsafe Output",
};

export function formatCategoryLabel(category) {
  if (!category) {
    return "Uncategorized";
  }

  return categoryLabels[category] || category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
