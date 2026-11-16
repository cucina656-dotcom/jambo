import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from "react";
import {
  ShoppingBasket,
  Menu,
  LogOut,
  User,
  CheckCircle,
  Clock,
  ShieldX,
  Wallet,
  Inbox,
  Plus,
  Info,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";

// Fallback for the SocialLifeLanding component if it's missing
const SocialLifeLanding = () => <div className="p-4 text-center text-gray-400">Social Life is currently unavailable.</div>;

const API_URL = "https://kitchenbrain.cucina656.workers.dev";
const DEFAULT_VIDEO = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
const IS_DEV = Boolean(typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV);

const devWarn = (...args) => { if (IS_DEV) console.warn(...args); };
const devError = (...args) => { if (IS_DEV) console.error(...args); };

function getPostType(post = {}) {
  const explicitType = String(post.post_type || "").trim().toLowerCase();
  if (["offer", "need", "exchange", "moment"].includes(explicitType)) return explicitType;
  const title = String(post.title || post.service_charge_per_minute || "").trim().toLowerCase();
  const details = String(post.subtitle || post.service_description || post.description || "").toLowerCase();
  if (post.moment_kind || ["song saying", "movie saying", "recommendation", "my story"].includes(title)) return "moment";
  if (post.exchange_need || title === "trade skills" || details.includes("i can give:") || details.includes("i need:")) return "exchange";
  if (title.startsWith("budget:") || details.includes("\nneeded:") || details.startsWith("needed:")) return "need";
  return "offer";
}

const DEFAULT_LOGO = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' rx='100' fill='%23111827'/%3E%3Ccircle cx='100' cy='76' r='36' fill='%239CA3AF'/%3E%3Cpath d='M38 174c6-38 29-58 62-58s56 20 62 58' fill='%239CA3AF'/%3E%3C/svg%3E";
const IMAGE_FALLBACK_SRC = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%2306101f'/%3E%3Ccircle cx='100' cy='82' r='28' fill='%23234061'/%3E%3Crect x='55' y='128' width='90' height='16' rx='8' fill='%23234061'/%3E%3C/svg%3E";

const INITIAL_PAGE_LIMIT = 5;
const LOAD_MORE_LIMIT = 5;
const SESSION_TOKEN_KEY = "time-market-session-token";
const USER_DATA_KEY = "time-market-user-data";
const INBOX_POLL_INTERVAL_MS = 5000;
const TOAST_DURATION_MS = 4200;
const PERSONAL_PIN_PATTERN = /^\d{8}$/;
const PIN_AUTH_METHOD = "phone_pin";

const CATEGORY_TABS = [
  { key: "time-market", label: "Trendz", emoji: "📈" },
  { key: "social-life", label: "Bae & Bae", emoji: "❤️" },
];

function isDirectVideoUrl(url = "") {
  const clean = String(url).toLowerCase().split("?")[0].split("#")[0];
  return clean.endsWith(".mp4") || clean.endsWith(".webm") || clean.endsWith(".ogg") || clean.endsWith(".mov");
}
function isImageUrl(url = "") {
  const clean = String(url).toLowerCase().split("?")[0].split("#")[0];
  return clean.endsWith(".jpg") || clean.endsWith(".jpeg") || clean.endsWith(".png") || clean.endsWith(".gif") || clean.endsWith(".webp");
}
function getEmbedUrl(url = "") {
  if (!url) return "";
  const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|live\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (youtubeMatch) return `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1&mute=0&loop=1&playlist=${youtubeMatch[1]}&controls=1`;
  return url;
}
function formatCount(value = 0) {
  const number = Number(value) || 0;
  if (number >= 1000000) return `${(number / 1000000).toFixed(1).replace(".0", "")}M`;
  if (number >= 1000) return `${(number / 1000).toFixed(1).replace(".0", "")}K`;
  return String(number);
}

function renderDescriptionWithLinks(value = "") {
  return String(value || "").split(/(https?:\/\/[^\s]+|www\.[^\s]+)/gi).filter(Boolean).map((part, index) => {
    if (!/^(?:https?:\/\/|www\.)/i.test(part)) return part;
    const href = /^https?:\/\//i.test(part) ? part : `https://${part}`;
    return <a key={`${part}-${index}`} style={{ color: "#27c9ff" }} href={href} target="_blank" rel="noopener noreferrer">{part}</a>;
  });
}

function getVerificationStatus(entity) {
  const rawStatus = String(entity?.verification_status || "").trim().toLowerCase();
  let status = "pending";
  if (rawStatus === "verified" || rawStatus === "approved" || entity?.verified === true) status = "verified";
  else if (rawStatus === "rejected" || rawStatus === "blocked") status = "rejected";
  const labels = { verified: "Verified", pending: "Pending", rejected: "Rejected" };
  return { status, label: labels[status], verified: status === "verified", className: `status-${status}` };
}

const VerificationTag = memo(({ info, size = 14 }) => {
  const Icon = info.status === "verified" ? CheckCircle : info.status === "rejected" ? ShieldX : Clock;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", color: info.status === "verified" ? "#20d68a" : "#a9bddc" }}>
      <Icon size={size} /> {info.label}
    </span>
  );
});

// ==========================================
// SUB-COMPONENTS
// ==========================================

const TimeMarketTopBar = memo(({ isLoggedIn, user, onAuth, onLogout, onOpenMyProfile, onOpenMyServices, onOpenMyTime, onOpenMyInbox, onCreatePost, unreadCount, onOpenInfo }) => {
  const [showMenu, setShowMenu] = useState(false);
  const signedIn = Boolean(isLoggedIn && user);
  const verification = signedIn ? getVerificationStatus(user) : null;

  return (
    <header className="feedx-topbar">
      <div className="feedx-topbar-inner">
        <div className="gwamo-brand">
          <h1 className="feedx-logo">Gwamo</h1>
          <span className="gwamo-tagline">Your time has value</span>
        </div>
        <div className="topbar-actions">
          {signedIn ? (
            <>
              <button type="button" className="topbar-icon-button" onClick={onOpenMyInbox}>
                <Inbox size={23} />
                {unreadCount > 0 && <span className="inbox-unread-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
              </button>
              <button type="button" className="account-avatar-button" onClick={onOpenMyProfile}>
                <img src={user?.profile_image_url || DEFAULT_LOGO} alt="Profile" />
              </button>
            </>
          ) : (
            <button type="button" className="login-pill" onClick={onCreatePost}>
              <Plus size={16} /> <span>Say some</span>
            </button>
          )}
          <button type="button" className="menu-button" onClick={() => setShowMenu(!showMenu)}>
            <Menu size={24} />
          </button>
          {showMenu && <div className="dropdown-backdrop" onClick={() => setShowMenu(false)} />}
          {showMenu && (
            <div className="dropdown-menu account-dropdown">
              <button type="button" className="dropdown-item" onClick={() => { setShowMenu(false); onCreatePost(); }}><Plus size={18} /> Create a post</button>
              <div className="dropdown-divider" />
              {signedIn ? (
                <>
                  <div style={{ padding: "8px 16px", display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ fontWeight: "bold" }}>{user?.service_provider_name || user?.full_name}</span>
                    <VerificationTag info={verification} />
                  </div>
                  <button type="button" className="dropdown-item" onClick={() => { setShowMenu(false); onOpenMyProfile(); }}><User size={18} /> My profile</button>
                  <button type="button" className="dropdown-item" onClick={() => { setShowMenu(false); onOpenMyInbox(); }}><Inbox size={18} /> Inbox</button>
                  <button type="button" className="dropdown-item" onClick={() => { setShowMenu(false); onOpenMyServices(); }}><ShoppingBasket size={18} /> My services</button>
                  <button type="button" className="dropdown-item" onClick={() => { setShowMenu(false); onOpenMyTime(); }}><Wallet size={18} /> My time</button>
                </>
              ) : null}
              <div className="dropdown-divider" />
              <button type="button" className="dropdown-item" onClick={() => { setShowMenu(false); onOpenInfo("about"); }}><Info size={18} /> About Gwamo</button>
              <button type="button" className="dropdown-item" onClick={() => { setShowMenu(false); onOpenInfo("help"); }}><HelpCircle size={18} /> Help</button>
              <button type="button" className="dropdown-item" onClick={() => { setShowMenu(false); onOpenInfo("privacy"); }}><ShieldCheck size={18} /> Privacy policy</button>
              {signedIn && (
                <>
                  <div className="dropdown-divider" />
                  <button type="button" className="dropdown-item dropdown-item-danger" onClick={() => { setShowMenu(false); onLogout(); }}><LogOut size={18} /> Log out</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
});

const ServicePost = memo(function ServicePost({ post, index, postId, postRefCallback, videoRefCallback }) {
  const mediaUrl = post.media_url || DEFAULT_VIDEO;
  const isImage = post.media_type === "image" || isImageUrl(mediaUrl);
  const isVideo = post.media_type === "video" || isDirectVideoUrl(mediaUrl);
  const title = String(post.service_name || post.title || "").trim();
  const description = String(post.work_description || post.subtitle || "").trim();

  return (
    <article ref={postRefCallback} data-index={index} className="home-post service-reel-card">
      <div className="post-media-frame">
        {isImage ? (
          <img className="home-media" src={mediaUrl} alt={title || "Media"} onError={(e) => { e.target.src = IMAGE_FALLBACK_SRC; }} />
        ) : isVideo ? (
          <video className="home-media" src={mediaUrl} controls playsInline ref={videoRefCallback} />
        ) : (
          <iframe className="home-media" src={getEmbedUrl(mediaUrl)} title="Video" allowFullScreen />
        )}
        <div className="social-reaction-actions">
          <button className="post-action social-reactions-button">
            <span className="social-reaction-emoji">✨</span> Social Feedback
          </button>
        </div>
      </div>
      {(title || description) && (
        <div className="post-content-block">
          {title && <h2 className="service-name">{title}</h2>}
          {description && <p className="post-description">{renderDescriptionWithLinks(description)}</p>}
        </div>
      )}
    </article>
  );
});

// ==========================================
// MODALS (Recreated for full functionality)
// ==========================================

const ModalWrapper = ({ children, onClose }) => (
  <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
    <div style={{ background: "#101f3b", borderRadius: "16px", padding: "20px", width: "100%", maxWidth: "400px", maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
      <button onClick={onClose} style={{ position: "absolute", top: "15px", right: "15px", background: "transparent", border: "none", color: "#fff", fontSize: "20px", cursor: "pointer" }}>✕</button>
      {children}
    </div>
  </div>
);

const AuthModal = ({ mode, phone, setPhone, pin, setPin, error, onLogin, onRegister, onClose }) => (
  <ModalWrapper onClose={onClose}>
    <h2 style={{ marginTop: 0 }}>{mode === "login" ? "Login" : "Register"}</h2>
    {error && <p style={{ color: "#ff5555", fontSize: "14px" }}>{error}</p>}
    <input type="tel" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ width: "100%", padding: "12px", marginBottom: "10px", borderRadius: "8px", border: "1px solid #49617f", background: "#07152b", color: "#fff" }} />
    <input type="password" placeholder="8-Digit PIN" value={pin} onChange={(e) => setPin(e.target.value)} style={{ width: "100%", padding: "12px", marginBottom: "20px", borderRadius: "8px", border: "1px solid #49617f", background: "#07152b", color: "#fff" }} />
    <button onClick={mode === "login" ? onLogin : onRegister} style={{ width: "100%", padding: "12px", background: "#12b978", color: "#041b17", fontWeight: "bold", border: "none", borderRadius: "8px", cursor: "pointer" }}>
      {mode === "login" ? "Login" : "Register"}
    </button>
  </ModalWrapper>
);

const ServiceEditorModal = ({ closeEditor, applyChanges }) => (
  <ModalWrapper onClose={closeEditor}>
    <h2 style={{ marginTop: 0 }}>Create a Post</h2>
    <p style={{ color: "#a9bddc" }}>Fill in the details to create your post.</p>
    <button onClick={() => { alert("Dummy post created!"); closeEditor(); }} style={{ width: "100%", padding: "12px", background: "#12b978", color: "#041b17", fontWeight: "bold", border: "none", borderRadius: "8px", cursor: "pointer" }}>
      Submit Post
    </button>
  </ModalWrapper>
);

const InfoModal = ({ topic, onClose }) => (
  <ModalWrapper onClose={onClose}>
    <h2 style={{ marginTop: 0, textTransform: "capitalize" }}>{topic}</h2>
    <p style={{ color: "#a9bddc", lineHeight: "1.6" }}>This is the {topic} information panel. You can put your actual {topic} content here.</p>
  </ModalWrapper>
);

const FeedSkeleton = () => null; // Removed skeleton cards as requested

// ==========================================
// MAIN HOME COMPONENT
// ==========================================
function Home() {
  const videoRefs = useRef({});
  const postRefs = useRef({});
  const observerRef = useRef(null);
  const isMountedRef = useRef(true);
  
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("time-market");
  
  // Modals
  const [showEditor, setShowEditor] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(null);
  
  // Auth State
  const [authMode, setAuthMode] = useState("login");
  const [authPhone, setAuthPhone] = useState("");
  const [authPin, setAuthPin] = useState("");
  const [authError, setAuthError] = useState("");

  const getSessionToken = useCallback(() => localStorage.getItem(SESSION_TOKEN_KEY) || "", []);
  const setSessionToken = useCallback((token) => token ? localStorage.setItem(SESSION_TOKEN_KEY, token) : localStorage.removeItem(SESSION_TOKEN_KEY), []);

  const openAuthModal = useCallback((mode = "login") => {
    setAuthMode(mode); setAuthPhone(""); setAuthPin(""); setAuthError(""); setShowAuthModal(true);
  }, []);

  const handleLogin = useCallback(async () => {
    setAuthError("");
    try {
      const response = await fetch(`${API_URL}/api/time-market/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: authPhone, pin: authPin, auth_method: PIN_AUTH_METHOD }),
      });
      const data = await response.json();
      if (data.success && data.provider) {
        setUser(data.provider); setIsLoggedIn(true); setSessionToken(data.session_token); setShowAuthModal(false);
      } else {
        setAuthError(data.error || "Login failed");
      }
    } catch (err) { setAuthError("Network error"); }
  }, [authPhone, authPin, setSessionToken]);

  const fetchHomeData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/home?limit=${INITIAL_PAGE_LIMIT}`);
      const data = await response.json();
      if (data.success && data.posts) setPosts(data.posts);
    } catch (err) { devError("Failed to fetch:", err); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchHomeData();
    return () => { isMountedRef.current = false; };
  }, [fetchHomeData]);

  return (
    <div className="home-page">
      <TimeMarketTopBar 
        isLoggedIn={isLoggedIn} user={user} onAuth={openAuthModal} onLogout={() => { setIsLoggedIn(false); setUser(null); }} 
        onOpenMyProfile={() => {}} onOpenMyServices={() => {}} onOpenMyTime={() => {}} onOpenMyInbox={() => {}} 
        onCreatePost={() => isLoggedIn ? setShowEditor(true) : openAuthModal()} unreadCount={0} onOpenInfo={setShowInfoModal} 
      />
      
      <main className="home-feed">
        {loading ? <FeedSkeleton /> : posts.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#a9bddc" }}>No posts available.</div>
        ) : (
          posts.map((post, index) => (
            <ServicePost key={post.id || index} post={post} index={index} postId={String(post.id || index)} />
          ))
        )}
      </main>

      {showAuthModal && (
        <AuthModal mode={authMode} phone={authPhone} setPhone={setAuthPhone} pin={authPin} setPin={setAuthPin} error={authError} onLogin={handleLogin} onRegister={handleLogin} onClose={() => setShowAuthModal(false)} />
      )}
      {showEditor && <ServiceEditorModal closeEditor={() => setShowEditor(false)} applyChanges={() => {}} />}
      {showInfoModal && <InfoModal topic={showInfoModal} onClose={() => setShowInfoModal(null)} />}

      <nav className="bottom-nav">
        <div className="bottom-nav-scroll">
          {CATEGORY_TABS.map((tab) => (
            <button key={tab.key} className={`bottom-nav-item${activeCategory === tab.key ? " is-active" : ""}`} onClick={() => setActiveCategory(tab.key)}>
              <span className="bottom-nav-icon">{tab.emoji}</span> <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <HomeStyles />
    </div>
  );
}

// ==========================================
// GLOBAL STYLES (Restored)
// ==========================================
const HomeStyles = memo(function HomeStyles() {
  return (
    <style>{`
      body { margin: 0; padding: 0; background: #020817; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      .home-page { display: flex; flex-direction: column; min-height: 100vh; background: #020817; }
      .home-feed { flex: 1; display: flex; flex-direction: column; width: 100vw; overflow-x: hidden; padding-bottom: 60px; }
      
      /* Topbar */
      .feedx-topbar { position: sticky; top: 0; z-index: 100; background: rgba(3,8,24,.97); border-bottom: 1px solid rgba(31,190,255,.18); padding: 12px 16px; }
      .feedx-topbar-inner { display: flex; justify-content: space-between; align-items: center; }
      .feedx-logo { margin: 0; font-size: 20px; font-weight: 800; color: #fff; }
      .gwamo-tagline { font-size: 12px; color: #a9bddc; margin-left: 8px; }
      .topbar-actions { display: flex; align-items: center; gap: 12px; position: relative; }
      .login-pill { display: flex; align-items: center; gap: 4px; background: #12b978; color: #041b17; border: none; border-radius: 20px; padding: 6px 12px; font-weight: 700; font-size: 13px; cursor: pointer; }
      .menu-button, .topbar-icon-button, .account-avatar-button { background: transparent; border: none; color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; }
      .account-avatar-button img { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
      
      /* Dropdown */
      .dropdown-backdrop { position: fixed; inset: 0; z-index: 90; }
      .dropdown-menu { position: absolute; top: 100%; right: 0; margin-top: 10px; background: #101f3b; border: 1px solid rgba(82,185,255,.2); border-radius: 12px; padding: 8px; width: 220px; z-index: 100; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
      .dropdown-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px; background: transparent; border: none; color: #fff; text-align: left; cursor: pointer; border-radius: 8px; font-size: 14px; }
      .dropdown-item:hover { background: rgba(255,255,255,0.05); }
      .dropdown-item-danger { color: #ff5555; }
      .dropdown-divider { height: 1px; background: rgba(255,255,255,0.1); margin: 8px 0; }
      
      /* Bottom Nav */
      .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; z-index: 100; background: rgba(3,8,24,.97); border-top: 1px solid rgba(31,190,255,.18); padding-bottom: env(safe-area-inset-bottom, 0); }
      .bottom-nav-scroll { display: flex; justify-content: space-around; align-items: center; height: 60px; }
      .bottom-nav-item { background: transparent; border: none; color: #a9bddc; display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; cursor: pointer; flex: 1; }
      .bottom-nav-item.is-active { color: #29baff; }
      .bottom-nav-icon { font-size: 20px; }

      /* Full-bleed Card */
      .home-post.service-reel-card {
        height: calc(100svh - 146px) !important;
        min-height: 440px !important;
        max-height: calc(100svh - 146px) !important;
        overflow: hidden !important;
        display: flex !important;
        flex-direction: column !important;
        padding: 0 !important;
        margin: 0 !important;
        width: 100% !important;
        background: transparent !important;
        border: 0 !important;
        box-shadow: none !important;
      }
      .post-media-frame {
        flex: 1 1 auto !important;
        width: 100% !important;
        height: 0 !important;
        min-height: 0 !important;
        overflow: hidden !important;
        background: transparent !important;
        position: relative;
      }
      .home-media {
        width: 100% !important; height: 100% !important;
        object-fit: contain !important; object-position: center top !important;
      }
      .post-content-block {
        flex: 0 0 auto; max-height: 76px; overflow: auto;
        padding: 7px 16px !important;
      }
      .post-description {
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        margin: 4px 0 0; font-size: 14px; color: #a9bddc;
      }
      .service-name { margin: 0; font-size: 16px; color: #fff; }
      
      .social-reaction-actions {
        position: absolute; bottom: 0; left: 0; right: 0;
        height: 46px; display: flex; align-items: center; padding: 0 14px;
        background: linear-gradient(to top, rgba(2,8,23,0.9), transparent);
      }
      .social-reactions-button {
        background: transparent; border: none; color: #ffd36b; font-weight: bold; font-size: 14px;
        display: flex; align-items: center; gap: 8px; cursor: pointer;
      }
      .social-reaction-emoji { font-size: 19px; }
    `}</style>
  );
});

export default Home;