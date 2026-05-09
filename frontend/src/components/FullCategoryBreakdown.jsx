import React from "react";
import { formatCategoryLabel } from "../utils/categoryLabels";

function FullCategoryBreakdown({ categories }) {
  return (
    <section className="breakdown-panel" aria-labelledby="full-breakdown-title">
      <div className="section-heading compact">
        <div>
          <p className="section-kicker">All categories</p>
          <h2 id="full-breakdown-title">Full Category Breakdown</h2>
        </div>
      </div>

      <div className="breakdown-grid">
        {categories.map((category) => (
          <article className={category.riskyCount ? "breakdown-card breakdown-risk" : "breakdown-card"} key={category.key}>
            <div className="breakdown-card-header">
              <h3>{formatCategoryLabel(category.key)}</h3>
              <span>{category.riskPercentage}% risk</span>
            </div>
            <div className="breakdown-stats">
              <div>
                <span>Total</span>
                <strong>{category.total}</strong>
              </div>
              <div>
                <span>Risky</span>
                <strong>{category.riskyCount}</strong>
              </div>
              <div>
                <span>Passed</span>
                <strong>{category.passedCount}</strong>
              </div>
            </div>
            <div className="breakdown-track" aria-hidden="true">
              <div className={category.riskyCount ? "breakdown-fill risky" : "breakdown-fill"} style={{ width: `${category.riskPercentage}%` }} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default FullCategoryBreakdown;
