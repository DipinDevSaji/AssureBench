import React from "react";

function RiskCard({ score }) {
  const normalizedScore = Number(score || 0);
  const label = normalizedScore >= 70 ? "High risk" : normalizedScore >= 35 ? "Elevated risk" : "Low risk";

  return (
    <article className={`risk-card ${normalizedScore >= 35 ? "risk-card-alert" : ""}`}>
      <span>Overall risk score</span>
      <strong>{score != null ? normalizedScore.toFixed(1) : "--"}</strong>
      <p>{label}</p>
    </article>
  );
}

export default RiskCard;
