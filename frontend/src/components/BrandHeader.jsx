import React from "react";
import Logo from "./Logo";

function BrandHeader({ className = "", logoClassName = "" }) {
  return (
    <div className={`brand-header ${className}`.trim()}>
      <Logo className={logoClassName} />
      <div className="brand-header-text">
        <strong>AssureBench</strong>
        <span>AI assurance workspace</span>
      </div>
    </div>
  );
}

export default BrandHeader;
