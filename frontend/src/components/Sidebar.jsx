import React, { useEffect, useState } from "react";
import Logo from "./Logo";

function toHash(item) {
  return `#${item.toLowerCase().replaceAll(" ", "-")}`;
}

const navLabels = {
  "Demo Chatbot": "Built-in Demo",
  "Production Endpoint": "Custom Endpoint",
  "Uploaded Results": "Import Results",
};

const MOBILE_NAV_QUERY = "(max-width: 768px)";

function Sidebar({ activeNav, onLogout, onNavigate, projects, user, workspaceNav }) {
  const [isMobile, setIsMobile] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.(MOBILE_NAV_QUERY);
    if (!mediaQuery) {
      return undefined;
    }

    const handleChange = (event) => {
      setIsMobile(event.matches);
      if (!event.matches) {
        setIsMenuOpen(false);
      }
    };

    setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener?.("change", handleChange);
    return () => mediaQuery.removeEventListener?.("change", handleChange);
  }, []);

  function handleNavigate(event, item) {
    event.preventDefault();
    onNavigate(item);
    if (isMobile) {
      setIsMenuOpen(false);
    }
  }

  return (
    <aside className="sidebar" aria-label="AssureBench navigation">
      <div className="sidebar-header">
        <Logo />
        <div>
          <h2>AssureBench</h2>
          <p>AI assurance workspace</p>
        </div>
        {isMobile ? (
          <button
            aria-controls="mobile-navigation-menu"
            aria-expanded={isMenuOpen}
            className="secondary-button mobile-menu-toggle"
            onClick={() => setIsMenuOpen((current) => !current)}
            type="button"
          >
            {isMenuOpen ? "Close" : "Menu"}
          </button>
        ) : null}
      </div>

      <div
        className={isMobile && isMenuOpen ? "sidebar-menu open" : "sidebar-menu"}
        id="mobile-navigation-menu"
      >
        <nav className="sidebar-section" aria-label="Workspace">
          <p>Workspace</p>
          {workspaceNav.map((item) => (
            <a
              className={item === activeNav ? "active" : ""}
              href={toHash(item)}
              key={item}
              onClick={(event) => handleNavigate(event, item)}
            >
              {navLabels[item] || item}
            </a>
          ))}
        </nav>

        <nav className="sidebar-section" aria-label="Testing Modes">
          <p>Testing Modes</p>
          {projects.map((item) => (
            <a
              className={item === activeNav ? "active" : ""}
              href={toHash(item)}
              key={item}
              onClick={(event) => handleNavigate(event, item)}
            >
              {navLabels[item] || item}
            </a>
          ))}
        </nav>

        <div className="sidebar-footer" id="settings">
          <span>Workspace</span>
          <strong>Academic Evaluation Lab</strong>
          {user ? (
            <div className="sidebar-user">
              <span>Signed in</span>
              <strong>{user.email}</strong>
              <em className={`role-badge ${user.role}`}>{user.role}</em>
            </div>
          ) : null}
          <button className="secondary-button sidebar-logout" onClick={onLogout} type="button">
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
