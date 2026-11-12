import TvMedia from "../components/tv/TvMedia";
import SocialLifeLanding from "../components/social/SocialLifeLanding";
import {
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
  X,
  Menu,
  Send,
  MessageSquare,
  User,
  Pencil,
  Check,
  CheckCircle,
  Clock,
  ShieldX,
  Wallet,
  Inbox,
  Mail,
  Plus,
  Star,
  Paperclip,
  Image as ImageIcon,
  Video,
  FileText,
  Search,
  CheckCheck,
  Phone,
  Heart,
  Info,
  HelpCircle,
  ShieldCheck,
  Trash2,
} from "lucide-react";

const API_URL = "https://kitchenbrain.cucina656.workers.dev";
const DEFAULT_VIDEO =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
const IS_DEV = Boolean(
  typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV,
);

function devWarn(...args) {
  if (IS_DEV) console.warn(...args);
}
function devError(...args) {
  if (IS_DEV) console.error(...args);
}

// ==========================================
// NOTIFICATION RING (Web Audio API)
// ==========================================
let audioCtx;
function playNotificationRing() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const playTone = (freq, startTime, duration) => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + startTime);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime + startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + startTime + duration);
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start(audioCtx.currentTime + startTime);
      osc.stop(audioCtx.currentTime + startTime + duration);
    };
    playTone(880, 0, 0.4);
    playTone(1174.66, 0.2, 0.6);
  } catch (err) {
    devWarn("Could not play notification ring", err);
  }
}

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
const MESSAGE_POLL_INTERVAL_MS = 2000;
const REACTION_COUNTS_POLL_INTERVAL_MS = 12000;
const TOAST_DURATION_MS = 4200;
const noop = () => {};

const CATEGORY_TABS = [
  { key: "time-market", label: "Chat", icon: MessageSquare },
  { key: "social-life", label: "Heart", icon: Heart },
  { key: "tv", label: "TV", icon: Tv },
];

const INFO_CONTENT = {
  about: {
    title: "About Gwamo",
    eyebrow: "Your time has value.",
    body: "Gwamo is a marketplace built around the value of human time. It helps people turn skills, experience, availability and useful abilities into real connections and opportunities.",
    sections: [
      { title: "Show your value", body: "Create a clear presence that shows who you are, what you can do and the value of your time." },
      { title: "Get discovered", body: "Use the Gwamo feed to reach people looking for skills, services, support, collaboration or meaningful opportunities." },
      { title: "Build trust", body: "Connect with real people and build confidence through Gwamo verification. Verified members are identified by a blue verification badge." },
    ],
  },
  help: {
    title: "Help",
    body: 'To offer a service, tap the plus icon and describe what you can do. To contact a provider, tap "Contact me", write your message, then log in with your telephone number and personal PIN when you press Send. Verified providers display a blue check badge beside their name. If you forget your PIN, request a reset and wait for an admin to call your registered number and approve the code shown on your screen.',
  },
  privacy: {
    title: "Privacy Policy",
    eyebrow: "Your safety and trust matter.",
    body: "Gwamo may verify your phone number and identity to help confirm that accounts belong to real people. We take strong measures to prevent fraud, impersonation, fake accounts, scams and other misuse of the platform. Accounts that fail verification or are found to be fraudulent may be restricted or removed. Your phone number is used for account identification and verification purposes, and your personal PIN should never be shared with anyone.",
  },
};

function isDirectVideoUrl(url = "") {
  const clean = String(url).toLowerCase().split("?")[0].split("#")[0];
  return clean.endsWith(".mp4") || clean.endsWith(".webm") || clean.endsWith(".ogg") || clean.endsWith(".mov") || clean.endsWith(".m4v") || clean.endsWith(".mkv") || clean.endsWith(".avi");
}
function isImageUrl(url = "") {
  const clean = String(url).toLowerCase().split("?")[0].split("#")[0];
  return clean.endsWith(".jpg") || clean.endsWith(".jpeg") || clean.endsWith(".png") || clean.endsWith(".gif") || clean.endsWith(".webp") || clean.endsWith(".bmp") || clean.endsWith(".svg");
}
function getEmbedUrl(url = "") {
  if (!url) return "";
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|live\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=0&loop=1&playlist=${ytMatch[1]}&controls=1&rel=0&modestbranding=1`;
  const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch) return `https://www.youtube.com/embed/${shortsMatch[1]}?autoplay=1&mute=0&loop=1&playlist=${shortsMatch[1]}&controls=1&rel=0&modestbranding=1`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&muted=0&loop=1&background=0`;
  if (url.includes("/embed/") || url.includes("player.")) return url;
  return url;
}
function formatCount(value = 0) {
  const number = Number(value) || 0;
  if (number >= 1000000) return `${(number / 1000000).toFixed(1).replace(".0", "")}M`;
  if (number >= 1000) return `${(number / 1000).toFixed(1).replace(".0", "")}K`;
  return String(number);
}
function normalizeWhatsAppNumber(value = "") {
  const compact = String(value || "").trim().replace(/[\s().-]/g, "");
  if (/^07[2389]\d{7}$/.test(compact)) return `250${compact.slice(1)}`;
  if (/^\+2507[2389]\d{7}$/.test(compact)) return compact.slice(1);
  if (/^2507[2389]\d{7}$/.test(compact)) return compact;
  if (/^\+[1-9]\d{7,14}$/.test(compact)) return compact.slice(1);
  if (/^[1-9]\d{7,14}$/.test(compact)) return compact;
  return "";
}
function getVerificationStatus(entity) {
  const raw = String(entity?.verification_status || "").trim().toLowerCase();
  let status = "pending";
  if (raw === "verified" || raw === "approved" || entity?.verified === true || entity?.verified === 1 || entity?.verified === "1") status = "verified";
  else if (raw === "rejected" || raw === "blocked") status = "rejected";
  return { status, label: status === "verified" ? "Verified" : status === "rejected" ? "Rejected" : "Pending", verified: status === "verified", className: `status-${status}` };
}
function useEscapeToClose(onClose, isOpen = true) {
  useEffect(() => {
    if (!isOpen || !onClose) return undefined;
    const handleKeyDown = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);
}
async function compressImageFile(file, { maxWidth, maxHeight, quality = 0.75 } = {}) {
  if (!file || !file.type || !file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    const scale = Math.min(1, (maxWidth || width) / width, (maxHeight || height) / height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    return new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", { type: "image/webp" });
  } catch { return file; }
}

// ==========================================
// GWAMO BRAIN WIDGET
// ==========================================
function GwamoBrainWidget({ apiUrl }) {
  const [settings, setSettings] = useState({ title: "Gwamo Brain", welcome_message: "Hello!", media_url: "" });
  const [visitorToken, setVisitorToken] = useState("");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);
  const visitorTokenRef = useRef("");
  const api = `${apiUrl}/api/brain`;

  const readResponse = async (response) => {
    let data = {};
    try { data = await response.json(); } catch {}
    if (!response.ok || data.success === false) throw new Error(data.error || data.message || `Request failed`);
    return data;
  };

  const loadVisitorMessages = useCallback(async () => {
    if (!visitorTokenRef.current) return;
    try {
      const res = await fetch(`${api}/messages`, { headers: { "X-Gwamo-Visitor-Token": visitorTokenRef.current }, cache: "no-store" });
      const data = await readResponse(res);
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (err) { setError(err.message); }
  }, [api]);

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch(`${api}/settings`);
        const data = await readResponse(res);
        if (data.settings) setSettings(data.settings);
        let token = localStorage.getItem("gwamo-brain-visitor-token") || "";
        const convRes = await fetch(`${api}/conversation`, { method: "POST", headers: token ? { "X-Gwamo-Visitor-Token": token } : {} });
        const convData = await readResponse(convRes);
        visitorTokenRef.current = convData.visitor_token;
        setVisitorToken(convData.visitor_token);
        localStorage.setItem("gwamo-brain-visitor-token", convData.visitor_token);
        setLoading(false);
        loadVisitorMessages();
      } catch (err) { setError(err.message); setLoading(false); }
    }
    init();
  }, [api, loadVisitorMessages]);

  useEffect(() => {
    if (!visitorToken) return;
    const id = setInterval(loadVisitorMessages, 1500);
    return () => clearInterval(id);
  }, [visitorToken, loadVisitorMessages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    try {
      await fetch(`${api}/message`, { method: "POST", headers: { "Content-Type": "application/json", "X-Gwamo-Visitor-Token": visitorTokenRef.current }, body: JSON.stringify({ text: draft }) });
      setDraft("");
      loadVisitorMessages();
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="gbw-panel" style={{ height: "100svh", display: "flex", flexDirection: "column", background: "#090f1b", color: "#fff" }}>
      <header style={{ padding: "14px", borderBottom: "1px solid #ffffff1a", display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ width: "40px", height: "40px", borderRadius: "12px", border: "2px solid #ff0040", display: "grid", placeItems: "center", color: "#ff0040" }}><MessageSquare size={20} /></div>
        <div><strong style={{ display: "block" }}>{settings.title}</strong><small style={{ color: "#9ca3af" }}>{settings.subtitle || "Private"}</small></div>
      </header>
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {loading && <div style={{ textAlign: "center", color: "#9ca3af" }}>Loading...</div>}
        {messages.map((m) => (
          <div key={m.id} style={{ alignSelf: m.sender === "visitor" ? "flex-end" : "flex-start", maxWidth: "80%", padding: "10px 14px", borderRadius: "16px", background: m.sender === "visitor" ? "linear-gradient(135deg,#00b0ff,#0078ff)" : "#1f2937", fontSize: "14px" }}>
            {m.text_content}
          </div>
        ))}
      </div>
      {error && <div style={{ color: "#ff8e9c", padding: "10px", textAlign: "center" }}>{error}</div>}
      <form onSubmit={sendMessage} style={{ padding: "12px", display: "flex", gap: "8px", borderTop: "1px solid #ffffff1a" }}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a message..." style={{ flex: 1, padding: "12px", borderRadius: "999px", border: "1px solid #00b0ff", background: "transparent", color: "#fff" }} />
        <button type="submit" style={{ width: "44px", height: "44px", borderRadius: "50%", background: "#ff0040", color: "#fff", border: "none", display: "grid", placeItems: "center" }}><Send size={18} /></button>
      </form>
    </div>
  );
}

// ==========================================
// TV COMMENT CAROUSEL
// ==========================================
const VerticalCommentCarousel = ({ messages, onZoomImage }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (isPaused || !messages || messages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % messages.length);
      setExpanded(false);
    }, 8000);
    return () => clearInterval(interval);
  }, [isPaused, messages.length]);

  if (!messages || messages.length === 0) {
    return <div style={{ padding: "20px", textAlign: "center", fontSize: "12px", color: "#9ca3af" }}>No conversations yet.</div>;
  }

  const current = messages[currentIndex];
  const next = messages[(currentIndex + 1) % messages.length];
  const prev = messages[(currentIndex - 1 + messages.length) % messages.length];

  return (
    <div 
      style={{ padding: "12px", display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between", background: "#151d2e", overflow: "hidden" }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Top small preview */}
      <div style={{ fontSize: "10px", color: "#9ca3af", opacity: 0.5, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", padding: "2px 0", transform: "translateY(-4px)" }}>
        {prev.user_name || "User"} · {prev.message?.slice(0, 30)}...
      </div>

      {/* Current Active Message */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", animation: "slideUpIn 0.4s ease-out forwards" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
          <button onClick={() => onZoomImage?.(current.profile_image || DEFAULT_LOGO)} style={{ padding: 0, border: "none", background: "transparent", cursor: "pointer" }}>
            <img src={current.profile_image || DEFAULT_LOGO} alt="" style={{ width: "24px", height: "24px", borderRadius: "50%", objectFit: "cover", border: "1px solid #ffffff33" }} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#9ca3af" }}>
            <strong style={{ color: "#fff" }}>{current.user_name || "Anonymous"}</strong>
            <span>{current.country_code || "🌍"}</span>
          </div>
        </div>
        
        <p className={`reel-comment-body ${expanded ? "expanded" : ""}`}>
          {current.message}
        </p>
        
        {current.message?.length > 80 && (
          <button className="reel-comment-readmore" onClick={() => setExpanded(!expanded)}>
            {expanded ? "Show less" : "Read more"}
          </button>
        )}
      </div>

      {/* Bottom small preview */}
      <div style={{ fontSize: "10px", color: "#9ca3af", opacity: 0.5, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", padding: "2px 0", transform: "translateY(4px)" }}>
        {next.user_name || "User"} · {next.message?.slice(0, 30)}...
      </div>
    </div>
  );
};

const TvCommentFetcher = ({ postId, onZoomImage }) => {
  const [messages, setMessages] = useState([]);
  useEffect(() => {
    let alive = true;
    const fetchComments = async () => {
      try {
        const res = await fetch(`${API_URL}/api/tv/conversation?post_id=${encodeURIComponent(postId)}&limit=15`);
        const data = await res.json();
        if (alive && data.success && data.messages) setMessages(data.messages);
      } catch {}
    };
    fetchComments();
    const interval = setInterval(fetchComments, 7000);
    return () => { alive = false; clearInterval(interval); };
  }, [postId]);

  return <VerticalCommentCarousel messages={messages} onZoomImage={onZoomImage} />;
};

// ==========================================
// MAIN HOME COMPONENT
// ==========================================
function Home() {
  const videoRefs = useRef({});
  const postRefs = useRef({});
  const observerRef = useRef(null);
  const isMountedRef = useRef(true);

  const user = null; 
  const isLoggedIn = false;

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [activePostIndex, setActivePostIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState("time-market");
  
  const [showChat, setShowChat] = useState(false);
  const [chatPartner, setChatPartner] = useState(null);
  
  const [showMyProfile, setShowMyProfile] = useState(false);
  const [profileFullName, setProfileFullName] = useState("");
  const [profileServiceName, setProfileServiceName] = useState("");
  const [profileServicesOffered, setProfileServicesOffered] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState("");
  const [profileEditContextPost, setProfileEditContextPost] = useState(null);
  const [profileDeleteConfirming, setProfileDeleteConfirming] = useState(false);
  
  const [showMyServices, setShowMyServices] = useState(false);
  const [myServices, setMyServices] = useState([]);
  const [myServicesLoading, setMyServicesLoading] = useState(false);
  const [myServicesError, setMyServicesError] = useState("");
  const [showMyTime, setShowMyTime] = useState(false);
  
  const [showInfoModal, setShowInfoModal] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const [zoomImage, setZoomImage] = useState("");
  const [mediaAspectRatios, setMediaAspectRatios] = useState({});
  const [reactedPosts, setReactedPosts] = useState({});
  const [reactingPostId, setReactingPostId] = useState(null);
  
  const objectUrlsRef = useRef(new Set());

  const readJsonSafely = useCallback(async (response) => {
    const text = await response.text();
    if (!text) return { success: response.ok };
    try { return JSON.parse(text); } catch { throw new Error(text); }
  }, []);

  const getSessionToken = useCallback(() => localStorage.getItem(SESSION_TOKEN_KEY) || "", []);
  const setSessionToken = useCallback((token) => { if (token) localStorage.setItem(SESSION_TOKEN_KEY, token); else localStorage.removeItem(SESSION_TOKEN_KEY); }, []);
  const setUserData = useCallback((userData) => { if (userData) localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData)); else localStorage.removeItem(USER_DATA_KEY); }, []);

  const handleOfferTime = useCallback((requestedPostType = "offer") => {
    if (activeCategory === "tv" || requestedPostType === "moment") {
      setToast({ id: Date.now(), message: "TV moments are published by Gwamo. Check back soon." });
      toastTimerRef.current = setTimeout(() => setToast(null), 3500);
      return;
    }
    setChatPartner({
      servicePostId: "", conversationId: "", providerId: "", providerPhone: "250788484366",
      name: "Gwamo Support", avatar: DEFAULT_LOGO, headline: "Direct Support", serviceName: "", serviceMediaUrl: "", verified: true,
    });
    setShowChat(true);
  }, [activeCategory]);

  const fetchAbortRef = useRef(null);
  const fetchInFlightRef = useRef(false);
  const fetchHomeData = useCallback(async ({ append = false, cursor = null } = {}) => {
    if (fetchInFlightRef.current) return;
    fetchInFlightRef.current = true;
    if (fetchAbortRef.current) fetchAbortRef.current.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;
    try {
      if (append) setLoadingMore(true); else setLoading(true);
      const params = new URLSearchParams();
      params.set("limit", String(append ? LOAD_MORE_LIMIT : INITIAL_PAGE_LIMIT));
      if (cursor) params.set("cursor", cursor);
      const response = await fetch(`${API_URL}/api/home?${params.toString()}`, { cache: "no-store", signal: controller.signal });
      const data = await readJsonSafely(response);
      if (!response.ok || !data.success) throw new Error(data.error || `Failed to load`);
      const receivedPosts = Array.isArray(data.posts) ? data.posts : [];
      if (isMountedRef.current) {
        setPosts((current) => append ? [...current, ...receivedPosts] : receivedPosts);
        setNextCursor(data.next_cursor || null);
        setHasMore(Boolean(data.has_more));
      }
    } catch (error) {
      if (error?.name === "AbortError") return;
      devError(error);
    } finally {
      if (fetchAbortRef.current === controller) { fetchAbortRef.current = null; fetchInFlightRef.current = false; }
      if (isMountedRef.current) { setLoading(false); setLoadingMore(false); }
    }
  }, [readJsonSafely]);

  const loadMorePosts = useCallback(() => {
    if (!hasMore || loadingMore || !nextCursor) return;
    fetchHomeData({ append: true, cursor: nextCursor });
  }, [hasMore, loadingMore, nextCursor, fetchHomeData]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchHomeData();
    return () => { isMountedRef.current = false; };
  }, [fetchHomeData]);

  useEffect(() => {
    if (!posts.length) return undefined;
    if (observerRef.current) observerRef.current.disconnect();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const index = Number(entry.target.dataset.index);
        const video = videoRefs.current[index];
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          setActivePostIndex(index);
          Object.entries(videoRefs.current).forEach(([key, item]) => {
            if (Number(key) !== index && item && !item.paused) item.pause();
          });
        } else if (video && !video.paused) {
          video.pause();
        }
      });
    }, { threshold: [0.6], rootMargin: "0px 0px -10% 0px" });
    observerRef.current = observer;
    Object.values(postRefs.current).forEach((post) => { if (post) observer.observe(post); });
    return () => { observer.disconnect(); };
  }, [posts]);

  const handleMediaAspectRatio = useCallback((postId, ratio) => {
    if (!ratio || !Number.isFinite(ratio) || ratio <= 0) return;
    setMediaAspectRatios((current) => current[postId] === ratio ? current : { ...current, [postId]: ratio });
  }, []);

  const pauseAllVideos = useCallback(() => {
    Object.entries(videoRefs.current).forEach(([postId, video]) => { if (video && !video.paused) video.pause(); });
  }, []);

  const closeChat = useCallback(() => { setShowChat(false); setChatPartner(null); }, []);

  const startChatWithPost = useCallback((post) => {
    setChatPartner({
      servicePostId: String(post.id), conversationId: post.conversation_id ? String(post.conversation_id) : "",
      providerId: String(post.provider_id || "").trim(), providerPhone: normalizeWhatsAppNumber(post.creator_identity || ""),
      name: post.creator_name || "Provider", avatar: post.logo_url || "", headline: post.service_charge_per_minute || post.title || "",
      serviceName: post.service_name || "", serviceMediaUrl: post.media_url || "", verified: Boolean(post.verified),
    });
    setShowChat(true); pauseAllVideos();
  }, [pauseAllVideos]);

  const callProvider = useCallback((post) => {
    const phone = normalizeWhatsAppNumber(post.creator_identity || "");
    if (phone) window.location.href = `tel:+${phone}`;
  }, []);

  const openInboxForPost = useCallback((post) => { startChatWithPost(post); }, [startChatWithPost]);

  const reactToPost = useCallback(async (post) => {
    const postId = String(post?.id ?? "");
    if (!postId || reactedPosts[postId] || reactingPostId === postId) return;
    setReactingPostId(postId);
    try {
      const res = await fetch(`${API_URL}/api/home/react`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ post_id: postId, phone: "" }) });
      const data = await readJsonSafely(res);
      if (data.already_reacted || data.success) {
        setReactedPosts((p) => ({ ...p, [postId]: true }));
        if (data.real_reactions !== undefined) {
          setPosts((p) => p.map((item) => String(item.id) === postId ? { ...item, real_reactions: data.real_reactions, displayed_reactions: data.displayed_reactions } : item));
        }
      }
    } catch { } finally { if (isMountedRef.current) setReactingPostId(null); }
  }, [readJsonSafely, reactedPosts, reactingPostId]);

  const memoizedPosts = useMemo(() => {
    return posts.filter((post) => {
      const type = getPostType(post);
      if (activeCategory === "social-life") return type === "need";
      if (activeCategory === "tv") return type === "moment";
      return type === "offer" || type === "exchange";
    });
  }, [posts, activeCategory]);

  const emptySectionAction = activeCategory === "social-life" ? { label: "Ask for help", postType: "need" } : activeCategory === "tv" ? { label: "Share your moment", postType: "moment" } : { label: "Offer work or trade skills", postType: "offer" };

  let mainContent;
  
  if (activeCategory === "time-market") {
    mainContent = <GwamoBrainWidget apiUrl={API_URL} />;
  } else if (activeCategory === "social-life") {
    mainContent = <SocialLifeLanding />;
  } else if (loading) {
    mainContent = <FeedSkeleton />;
  } else if (!memoizedPosts.length) {
    mainContent = (
      <div className="empty-state">
        <p>{activeCategory === "social-life" ? "No one is asking for help yet." : activeCategory === "tv" ? "No stories or shared moments are available yet." : "No work offers or skill trades are available yet."}</p>
        <button type="button" onClick={() => handleOfferTime(emptySectionAction.postType)} className="empty-button">＋ {emptySectionAction.label}</button>
      </div>
    );
  } else {
    mainContent = (
      <>
        <main className="home-feed">
          {memoizedPosts.map((post, index) => (
            <ServicePost 
              key={String(post.id ?? index)} post={post} index={index} postId={String(post.id ?? index)}
              isActive={activePostIndex === index} reacted={Boolean(reactedPosts[String(post.id)])}
              reacting={reactingPostId === String(post.id)} mediaAspectRatio={mediaAspectRatios[String(post.id)]}
              onMediaAspectRatio={handleMediaAspectRatio} postRefCallback={(ref) => { if (ref) postRefs.current[index] = ref; }}
              videoRefCallback={(ref) => { if (ref) videoRefs.current[index] = ref; }}
              onViewProfile={noop} onContactProvider={openInboxForPost} onCallProvider={callProvider}
              onReact={reactToPost} onZoomImage={setZoomImage} isTvTab={activeCategory === "tv"}
              isSocialLife={activeCategory === "social-life"} showLiveConversation={activeCategory === "tv" || activeCategory === "social-life"}
            />
          ))}
        </main>
        {hasMore && (
          <div className="load-more-wrap">
            <button type="button" className="load-more-button" onClick={loadMorePosts} disabled={loadingMore}>{loadingMore ? "Loading..." : "Load more"}</button>
          </div>
        )}
      </>
    );
  }

  return (
    <div className={`home-page${activeCategory === "tv" ? " is-tv-mode" : ""}${activeCategory === "social-life" ? " is-social-life-mode" : ""}`}>
      <TimeMarketTopBar activeCategory={activeCategory} onOpenInfo={(topic) => setShowInfoModal(topic)} />
      {mainContent}
      {toast && <div className="gwamo-toast" role="status">{toast.message}</div>}
      {zoomImage && <ZoomableImageViewer src={zoomImage} onClose={() => setZoomImage("")} />}
      {showChat && chatPartner && <ChatModal partner={chatPartner} currentUser={null} getSessionToken={getSessionToken} apiUrl={API_URL} onClose={closeChat} onZoomImage={setZoomImage} onRequireAuth={noop} />}
      {showInfoModal && <InfoModal topic={showInfoModal} onClose={() => setShowInfoModal(null)} />}
      
      <nav className="bottom-nav" aria-label="Primary">
        <div className="bottom-nav-scroll">
          {CATEGORY_TABS.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeCategory === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                className={`bottom-nav-item${isActive ? " is-active" : ""}`}
                onClick={() => { setActivePostIndex(0); setActiveCategory(tab.key); window.scrollTo(0, 0); }}
              >
                <span className="bottom-nav-icon"><TabIcon size={20} strokeWidth={isActive ? 2.4 : 2} /></span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <HomeStyles />
    </div>
  );
}

const FeedSkeleton = memo(() => (
  <main className="home-feed">
    {[0, 1].map((key) => (
      <div className="service-reel-card skeleton-card" key={key}><div className="skeleton-shimmer" /></div>
    ))}
  </main>
));

const TimeMarketTopBar = memo(({ activeCategory, onOpenInfo }) => {
  const [showMenu, setShowMenu] = useState(false);
  const closeMenu = () => setShowMenu(false);
  const run = (action) => () => { closeMenu(); action(); };
  return (
    <header className={`feedx-topbar${activeCategory === "tv" ? " is-tv-mode" : ""}`}>
      <div className="feedx-topbar-inner">
        <div className="gwamo-brand">
          <h1 className="feedx-logo">Gwamo</h1>
          <span className="gwamo-tagline">Your time has value</span>
        </div>
        <div className="topbar-actions">
          <button type="button" className="menu-button" onClick={() => setShowMenu((v) => !v)}>
            <Menu size={24} strokeWidth={2} />
          </button>
          {showMenu && <div className="dropdown-backdrop" onClick={closeMenu} />}
          {showMenu && (
            <div className="dropdown-menu account-dropdown">
              <button type="button" className="dropdown-item" onClick={run(() => onOpenInfo("about"))}><Info size={18} />About Gwamo</button>
              <button type="button" className="dropdown-item" onClick={run(() => onOpenInfo("help"))}><HelpCircle size={18} />Help</button>
              <button type="button" className="dropdown-item" onClick={run(() => onOpenInfo("privacy"))}><ShieldCheck size={18} />Privacy policy</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
});

const ServicePost = memo(function ServicePost({
  post, index, postId, isActive, reacted, reacting, mediaAspectRatio,
  onMediaAspectRatio, postRefCallback, videoRefCallback, onContactProvider, onCallProvider,
  onReact, onZoomImage, isTvTab, isSocialLife, showLiveConversation,
}) {
  const mediaUrl = post.media_url || post.video_url || DEFAULT_VIDEO;
  const mediaType = post.media_type || "";
  const isImage = mediaType === "image" || (!mediaType && isImageUrl(mediaUrl));
  const isVideo = mediaType === "video" || (!mediaType && isDirectVideoUrl(mediaUrl));
  const isEmbed = mediaType === "embed" || (!mediaType && !isImageUrl(mediaUrl) && !isDirectVideoUrl(mediaUrl));
  const verificationInfo = getVerificationStatus(post);
  const providerName = post.service_provider_name || post.creator_name || "Provider";
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const reactionCount = Number(post.displayed_reactions || 0);
  
  const handleVideoLoadedMetadata = useCallback((event) => { const v = event.currentTarget; if (v.videoWidth && v.videoHeight) onMediaAspectRatio(postId, v.videoWidth / v.videoHeight); }, [onMediaAspectRatio, postId]);
  const callPhone = normalizeWhatsAppNumber(post.creator_identity || "");

  return (
    <section ref={postRefCallback} data-index={index} className={`home-post service-reel-card${isActive ? " is-active-reel" : ""}`} style={{ display: "flex", flexDirection: "column" }}>
      
      {/* Media Section (65%) */}
      <div className="reel-media-wrapper" style={{ flex: "0 0 65%", position: "relative", background: "#000", overflow: "hidden" }}>
        <TvMedia mediaUrl={mediaUrl} embedUrl={getEmbedUrl(mediaUrl)} isTvTab={isTvTab} isImage={isImage} isVideo={isVideo} isEmbed={isEmbed} isActive={isActive} mediaAspectRatio={mediaAspectRatio} postId={postId} videoRefCallback={videoRefCallback} onVideoLoadedMetadata={handleVideoLoadedMetadata} />
        <div className="service-card-gradient" />
        
        <div className="post-info-block">
          <div className="post-provider-row">
            <button type="button" className={`service-avatar-badge ${verificationInfo.className}`} onClick={() => onZoomImage(post.logo_url || DEFAULT_LOGO)}>
              <img src={post.logo_url || DEFAULT_LOGO} alt="" onError={(e) => { e.currentTarget.src = DEFAULT_LOGO; }} />
            </button>
            <div className="post-provider-copy">
              <span className="creator-name">{providerName}</span>
              {post.service_name && <h2 className="service-name">{post.service_name}</h2>}
            </div>
          </div>
        </div>
        
        {!showLiveConversation && (
          <div className="service-social-rail" style={{ bottom: "20px" }}>
            <button type="button" className={`rail-action star-action${reacted ? " is-active" : ""}`} onClick={() => onReact(post)} disabled={reacting || reacted}>
              <Star className="gold-star" size={34} fill="currentColor" />
              <span>{formatCount(reactionCount)}</span>
            </button>
          </div>
        )}
        {showLiveConversation && (
          <button type="button" className="tv-private-contact-cta" style={{ bottom: "20px" }} onClick={() => onContactProvider(post)}><Mail size={20} /></button>
        )}
      </div>

      {/* Comments Section (35%) - Only on TV/Heart */}
      {showLiveConversation ? (
        <div style={{ flex: 1, background: "#151d2e", borderTop: "1px solid #ffffff1a", overflow: "hidden", position: "relative" }}>
          <TvCommentFetcher postId={postId} onZoomImage={onZoomImage} />
        </div>
      ) : (
        <div style={{ flex: 1, background: "#151d2e", borderTop: "1px solid #ffffff1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <button type="button" className="contact-me-cta" style={{ position: "relative", width: "90%", left: "auto", right: "auto" }} onClick={() => onContactProvider(post)}>
            <Send size={20} /><span>Contact me</span>
          </button>
        </div>
      )}
    </section>
  );
});

const ChatModal = memo(({ partner, currentUser, onClose, onZoomImage }) => {
  useEscapeToClose(onClose);
  return (
    <div className="chat-modal-overlay" onClick={onClose}>
      <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
        <div className="chat-header">
          <button className="chat-back" onClick={onClose}><X size={20} /></button>
          <img className="chat-header-avatar" src={partner.avatar || DEFAULT_LOGO} alt="" />
          <div className="chat-header-copy">
            <strong className="chat-header-name">{partner.name}</strong>
            <small className="chat-privacy-note">Private conversation</small>
          </div>
        </div>
        <div className="chat-messages" style={{ display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", color: "#9ca3af" }}>
          <p>Login has been removed. Please contact support via WhatsApp.</p>
        </div>
      </div>
    </div>
  );
});

const ZoomableImageViewer = memo(({ src, onClose }) => {
  useEscapeToClose(onClose);
  return (
    <div className="zoom-overlay" onClick={onClose}>
      <button type="button" className="zoom-close-button" onClick={onClose}><X size={26} /></button>
      <div className="zoom-image-shell" onClick={(e) => e.stopPropagation()}>
        <img src={src} alt="" className="zoom-image" />
      </div>
    </div>
  );
});

const InfoModal = memo(({ topic, onClose }) => {
  useEscapeToClose(onClose);
  const content = INFO_CONTENT[topic] || INFO_CONTENT.about;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{content.title}</h2>
          <button type="button" onClick={onClose} className="modal-close"><X size={20} /></button>
        </div>
        <div className="info-modal-content">
          {content.eyebrow && <p className="info-modal-lead">{content.eyebrow}</p>}
          <p className="info-modal-body">{content.body}</p>
        </div>
        <button type="button" className="cancel-button" onClick={onClose}>Close</button>
      </div>
    </div>
  );
});

function HomeStylesInner() {
  return (
    <style>{`
      @import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=DM+Sans:opsz,wght@9..40,400..700&display=swap");

      :root {
        --page-bg: #0d1320; --panel-bg: #151d2e; --blue: #087cff; --blue-bright: #168bff;
        --blue-border: rgba(22, 139, 255, 0.78); --muted: #9aa6ba; --danger: #ff5c70;
        --verified-green: #2aa3ff;
      }
      .home-page {
        --ink: #0d1320; --surface: #151d2e; --surface-2: #1e2840; --surface-3: #283450;
        --line: rgba(255, 255, 255, 0.09); --line-strong: rgba(255, 255, 255, 0.16);
        --text: #f3f5f9; --text-dim: #9aa6ba; --amber: #ffb938; --amber-strong: #ffc766;
        --amber-ink: #1b1303; --amber-soft: rgba(255, 185, 56, 0.15); --verified: #2aa3ff;
        --ok: #3ddc97; --bad: #ff5c70;
        --font-display: "Bricolage Grotesque", "DM Sans", ui-sans-serif, system-ui, sans-serif;
        --font-body: "DM Sans", ui-sans-serif, system-ui, sans-serif;
        --top-h: 60px; --top-offset: calc(var(--top-h) + env(safe-area-inset-top, 0px));
        --nav-h: calc(58px + env(safe-area-inset-bottom, 0px));
        --reel-h: calc(100svh - var(--top-offset) - var(--nav-h) - 20px);
        --r-sheet: 28px; --r-card: 16px; --r-field: 14px;
      }
      @media (min-width: 700px) { .home-page { --top-h: 64px; } }

      * { box-sizing: border-box; }
      html, body, #root { min-height: 100%; margin: 0; background: var(--page-bg); }
      body { overflow-x: hidden; font-family: var(--font-body); -webkit-font-smoothing: antialiased; }
      button, input, textarea, select { font: inherit; }
      button { -webkit-tap-highlight-color: transparent; }

      .home-page {
        width: 100%; min-height: 100svh; padding-bottom: var(--nav-h);
        overflow-x: hidden; overflow-x: clip; color: var(--text); background: var(--ink);
      }
      .home-page :focus-visible { outline: 2px solid var(--amber); outline-offset: 2px; }

      /* TOP BAR */
      .feedx-topbar {
        position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
        padding-top: env(safe-area-inset-top, 0px);
        background: rgba(13, 19, 32, 0.96); border-bottom: 1px solid var(--line);
      }
      .feedx-topbar.is-tv-mode {
        background: linear-gradient(180deg, rgba(13, 19, 32, 0.78) 0%, rgba(13, 19, 32, 0.34) 62%, transparent 100%);
        border-bottom-color: transparent;
      }
      .feedx-topbar-inner {
        width: min(100%, 900px); height: var(--top-h); margin: 0 auto;
        padding: 0 8px 0 18px; display: flex; align-items: center; justify-content: space-between; gap: 12px;
      }
      .gwamo-brand { min-width: 0; display: flex; align-items: baseline; gap: 10px; }
      .feedx-logo {
        margin: 0; display: inline-flex; align-items: baseline; gap: 3px;
        color: var(--text); font-family: var(--font-display); font-size: 28px; font-weight: 800; line-height: 1;
      }
      .feedx-logo::after { content: ""; width: 7px; height: 7px; flex-shrink: 0; border-radius: 50%; background: var(--amber); transform: translateY(-1px); }
      .gwamo-tagline { display: none; color: var(--text-dim); font-size: 13px; font-weight: 500; }
      @media (min-width: 700px) { .gwamo-tagline { display: block; } }
      .topbar-actions { position: relative; display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
      .menu-button { width: 44px; height: 44px; display: grid; place-items: center; padding: 0; border: 0; border-radius: 50%; color: var(--text); background: transparent; cursor: pointer; }
      .dropdown-backdrop { position: fixed; inset: 0; z-index: 999; }
      .dropdown-menu { position: absolute; top: calc(100% + 6px); right: 6px; z-index: 1001; min-width: 236px; padding: 6px; border: 1px solid var(--line-strong); border-radius: var(--r-card); background: var(--surface); box-shadow: 0 18px 44px rgba(0,0,0,0.5); }
      .dropdown-item { width: 100%; display: flex; align-items: center; gap: 12px; padding: 11px 12px; border: 0; border-radius: 10px; color: var(--text); background: transparent; font-size: 14.5px; font-weight: 500; text-align: left; cursor: pointer; }

      /* BOTTOM NAV */
      .bottom-nav {
        position: fixed; left: 0; right: 0; bottom: 0; z-index: 950;
        padding-bottom: env(safe-area-inset-bottom, 0px); background: transparent;
      }
      .bottom-nav-scroll {
        width: min(100%, 520px); height: 58px; margin: 0 auto; padding: 0 4px;
        display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: center;
      }
      .bottom-nav-item {
        height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
        padding: 0; border: 0; color: var(--text-dim); background: transparent; font-size: 10px; font-weight: 600; cursor: pointer;
      }
      .bottom-nav-item.is-active { color: var(--text); font-weight: 700; }
      .bottom-nav-icon { width: 44px; height: 26px; display: grid; place-items: center; border-radius: 13px; }
      .bottom-nav-item.is-active .bottom-nav-icon { color: var(--amber); }

      /* FEED LAYOUT */
      .home-feed { width: min(100%, max(300px, calc(var(--reel-h) * 9 / 16))); margin: 0 auto; padding: calc(var(--top-offset) + 10px) 0 10px; }
      .service-reel-card {
        position: relative; isolation: isolate; width: min(100%, max(300px, calc(var(--reel-h) * 9 / 16)));
        aspect-ratio: 9 / 16; margin: 0 auto; overflow: hidden; background: var(--ink);
        scroll-snap-align: start; scroll-margin-top: calc(var(--top-offset) + 10px);
      }
      .skeleton-card { pointer-events: none; background: var(--surface); }
      .skeleton-shimmer { position: absolute; inset: 0; background: linear-gradient(100deg, rgba(255,255,255,0.02) 30%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.02) 70%); background-size: 200% 100%; animation: gwamoSkeletonShimmer 1.6s ease-in-out infinite; }

      .reel-media-wrapper { position: relative; overflow: hidden; width: 100%; }
      .reel-media-wrapper .media-card, .reel-media-wrapper .media-viewport, .reel-media-wrapper .media-layer { position: absolute; inset: 0; width: 100%; height: 100%; }
      .reel-media-wrapper img, .reel-media-wrapper video, .reel-media-wrapper iframe { width: 100%; height: 100%; object-fit: cover; }
      .service-card-gradient { position: absolute; inset: 0; z-index: 20; pointer-events: none; background: linear-gradient(to bottom, transparent 40%, rgba(13,19,32,0.85) 100%); }
      
      .post-info-block { position: absolute; z-index: 40; left: 12px; right: 12px; bottom: 16px; }
      .post-provider-row { display: flex; align-items: center; gap: 8px; }
      .post-provider-copy { min-width: 0; flex: 1; display: flex; flex-direction: column; }
      .service-avatar-badge { width: 34px; height: 34px; border-radius: 50%; padding: 0; border: none; background: transparent; cursor: pointer; }
      .service-avatar-badge img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
      .creator-name { color: #fff; font-size: 13px; font-weight: 700; text-shadow: 0 1px 4px rgba(0,0,0,0.8); }
      .service-name { margin: 2px 0 0; color: #fff; font-size: 15px; font-weight: 700; text-shadow: 0 1px 4px rgba(0,0,0,0.8); }

      .service-social-rail { position: absolute; z-index: 42; right: 12px; }
      .rail-action { display: flex; flex-direction: column; align-items: center; padding: 0; border: none; background: transparent; color: #fff; cursor: pointer; }
      .gold-star { color: var(--amber); fill: var(--amber); }

      .tv-private-contact-cta { position: absolute; z-index: 44; right: 14px; width: 44px; height: 44px; border-radius: 50%; background: rgba(13,19,32,0.7); color: #fff; border: 1px solid var(--line-strong); display: grid; place-items: center; }
      .contact-me-cta { display: flex; align-items: center; justify-content: center; gap: 8px; height: 44px; border-radius: var(--r-field); background: var(--amber); color: var(--amber-ink); font-weight: 700; border: none; cursor: pointer; }

      /* COMMENTS CAROUSEL */
      @keyframes slideUpIn {
        from { opacity: 0; transform: translateY(12px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .reel-comment-body {
        font-size: 13px; line-height: 1.4; color: var(--text); display: -webkit-box;
        -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        margin: 0; transition: all 0.3s ease;
      }
      .reel-comment-body.expanded {
        display: block; -webkit-line-clamp: unset; overflow-y: auto; max-height: 100px;
      }
      .reel-comment-readmore {
        background: none; border: none; color: var(--amber); font-size: 11px; font-weight: 700;
        padding: 0; margin-top: 4px; cursor: pointer; text-align: left;
      }

      /* MODALS */
      .modal-overlay { position: fixed; inset: 0; z-index: 10000; display: flex; align-items: flex-end; justify-content: center; padding: 0; background: rgba(6,9,16,0.76); }
      .modal-card { width: 100%; max-width: 520px; max-height: 92dvh; overflow-y: auto; padding: 0 20px calc(24px + env(safe-area-inset-bottom, 0px)); border-radius: var(--r-sheet) var(--r-sheet) 0 0; background: var(--surface); }
      .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px 12px; margin: 0 -20px 14px; background: var(--surface); border-bottom: 1px solid var(--line); }
      .modal-close { background: var(--surface-2); border: none; width: 38px; height: 38px; border-radius: 50%; color: #fff; display: grid; place-items: center; cursor: pointer; }
      .cancel-button { width: 100%; min-height: 52px; margin-top: 10px; border: 1px solid var(--line-strong); color: var(--text); background: transparent; border-radius: var(--r-field); cursor: pointer; }

      .chat-modal-overlay { position: fixed; inset: 0; z-index: 9998; display: flex; align-items: flex-end; justify-content: center; background: rgba(6,9,16,0.76); }
      .chat-modal { width: 100%; max-width: 500px; height: 88vh; display: flex; flex-direction: column; overflow: hidden; border-radius: var(--r-sheet) var(--r-sheet) 0 0; background: var(--surface); }
      .chat-header { padding: 14px 16px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--line); }
      .chat-back { width: 38px; height: 38px; border-radius: 50%; background: var(--surface-2); border: none; color: #fff; cursor: pointer; }
      .chat-header-avatar { width: 42px; height: 42px; border-radius: 50%; object-fit: cover; }
      .chat-header-copy strong { display: block; font-size: 16px; }
      .chat-header-copy small { color: var(--text-dim); font-size: 11px; }
      .chat-messages { flex: 1; padding: 16px; overflow-y: auto; }

      .zoom-overlay { position: fixed; inset: 0; z-index: 11000; display: flex; align-items: center; justify-content: center; background: rgba(6,9,16,0.92); }
      .zoom-image-shell { width: 90vw; height: 80vh; display: grid; place-items: center; }
      .zoom-image { max-width: 100%; max-height: 100%; object-fit: contain; }
      .zoom-close-button { position: fixed; top: 20px; right: 20px; background: rgba(30,40,64,0.9); border: none; border-radius: 50%; width: 46px; height: 46px; color: #fff; cursor: pointer; }

      .gwamo-toast { position: fixed; left: 50%; top: calc(var(--top-offset) + 8px); z-index: 10500; padding: 11px 18px; border-radius: 999px; background: var(--surface-2); color: #fff; transform: translateX(-50%); font-size: 14px; }
    `}</style>
  );
}
const HomeStyles = memo(HomeStylesInner);
export default Home;