import { Link, useLocation } from "react-router-dom";

function Header() {
  const location = useLocation();

  // Helper to check active route for styling
  const isActive = (path) => location.pathname === path;

  // Nav Item Styles for the Top Bar Link Elements
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
    background: isActive(path) ? "rgba(255, 215, 0, 0.1)" : "transparent",
    whiteSpace: "nowrap",
    transition: "all 0.2s ease",
    WebkitTapHighlightColor: "transparent",
  });

  return (
    <>
      {/* Top Header Bar */}
      <div
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
        {/* Brand Identity */}
        <Link
          to="/"
          style={{
            color: "white",
            textDecoration: "none",
            fontWeight: "900",
            fontSize: "20px",
            letterSpacing: "0.5px",
            textShadow: isActive("/") ? "0 0 10px rgba(255,215,0,0.4)" : "none",
            flexShrink: 0,
          }}
        >
          feed<span style={{ color: "#FFD700" }}>X</span>
        </Link>

        {/* Right side inline-scrollable horizontal container for specific links */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            overflowX: "auto",
            scrollbarWidth: "none", // Hides default scrollbar in Firefox
            msOverflowStyle: "none", // Hides default scrollbar in IE/Edge
            WebkitOverflowScrolling: "touch",
          }}
        >
          {/* Internal Inline style block to hide Webkit scrollbars completely */}
          <style>{`
            div::-webkit-scrollbar {
              display: none;
            }
          `}</style>

          <Link to="/kitchen" style={getTopNavItemStyle("/kitchen")}>
            <span style={{ fontSize: "16px" }}>🍲</span>
            <span>Igikoni</span>
          </Link>
          
          <Link to="/tv" style={getTopNavItemStyle("/tv")}>
            <span style={{ fontSize: "16px" }}>📺</span>
            <span>Hobe TV</span>
          </Link>
        </div>
      </div>
      
      {/* Top spacer to ensure core content elements clear the top header height boundary */}
      <div style={{ height: "54px" }} />
    </>
  );
}

export default Header;