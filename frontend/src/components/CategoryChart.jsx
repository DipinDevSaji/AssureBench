import React from "react";
import { formatCategoryLabel } from "../utils/categoryLabels";

function CategoryChart({ categories }) {
  return (
    <section className="chart-panel" aria-labelledby="category-chart-title">
      <div className="section-heading compact">
        <div>
          <p className="section-kicker">Category summary</p>
          <h2 id="category-chart-title">Risk Signals</h2>
        </div>
        <span className="chart-note">CSS fallback chart</span>
      </div>

      <div className="bar-chart" role="list">
        {categories.map((category) => {
          const width = `${category.riskPercentage ?? Math.round(category.score * 100)}%`;
          const count = category.riskyCount ?? category.count;
          const label = category.label || formatCategoryLabel(category.key);

          return (
            <div className="bar-row" key={category.key} role="listitem">
              <div className="bar-label">
                <span>{label}</span>
                <strong>{count}</strong>
              </div>
              <div className="bar-track" aria-hidden="true">
                <div className={count ? "bar-fill risky" : "bar-fill"} style={{ width }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default CategoryChart;
