import { Link, useLocation } from "react-router-dom";

function Header() {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const getTopNavItemStyle = (path) => ({
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: isActive(path) ? "#FFD700" : "#A0A0A0",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: isActive(path) ? "700" : "500",
    padding: "6px 12px",
    borderRadius: "20px",
    background: isActive(path)
      ? "rgba(255, 215, 0, 0.1)"
      : "transparent",
    whiteSpace: "nowrap",
    transition: "all 0.2s ease",
    WebkitTapHighlightColor: "transparent",
  });

  return (
    <>
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          background: "rgba(0, 0, 0, 0.9)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          gap: "16px",
        }}
      >
        {/* Gwamo brand and homepage link */}
        <Link
          to="/"
          aria-label="Gwamo home"
          title="Gwamo Home"
          style={{
            color: "white",
            textDecoration: "none",
            fontWeight: "900",
            fontSize: "20px",
            letterSpacing: "0.5px",
            textShadow: isActive("/")
              ? "0 0 10px rgba(255,215,0,0.4)"
              : "none",
            flexShrink: 0,
          }}
        >
          Feed<span style={{ color: "#FFD700" }}>X</span>
        </Link>

        {/* Main website navigation */}
        <nav
          aria-label="Main navigation"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            overflowX: "auto",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <style>{`
            nav::-webkit-scrollbar {
              display: none;
            }
          `}</style>

          <Link
            to="/tv"
            aria-label="Watch song dedications on Gwamo TV"
            title="Gwamo TV Song Dedications"
            style={getTopNavItemStyle("/tv")}
          >
            <span aria-hidden="true" style={{ fontSize: "16px" }}>
              📺
            </span>

            <span>Susuruka</span>
          </Link>
        </nav>
      </header>

      <div aria-hidden="true" style={{ height: "54px" }} />
    </>
  );
}

export default Header;
