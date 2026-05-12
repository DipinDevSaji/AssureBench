import React from "react";

function Logo({ className = "" }) {
  return (
    <span className={`brand-logo ${className}`.trim()} aria-label="AssureBench logo" role="img">
      <svg aria-hidden="true" viewBox="0 0 48 48" focusable="false">
        <path
          d="M24 5.5 38.5 11v12.8c0 8.9-5.8 15.4-14.5 18.7C15.3 39.2 9.5 32.7 9.5 23.8V11L24 5.5Z"
          fill="url(#assurebench-logo-gradient)"
        />
        <path
          d="m15.8 24.2 5.6 5.7 11.3-12.1"
          fill="none"
          stroke="white"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4.6"
        />
        <defs>
          <linearGradient id="assurebench-logo-gradient" x1="8" x2="40" y1="6" y2="42" gradientUnits="userSpaceOnUse">
            <stop stopColor="#164e63" />
            <stop offset="0.56" stopColor="#1d6f8f" />
            <stop offset="1" stopColor="#14b8a6" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
}

export default Logo;
