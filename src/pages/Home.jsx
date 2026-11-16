import SocialLifeLanding from "../components/social/SocialLifeLanding";
// GWAMO_HOME_CONNECT_TV_PUBLIC_FINAL_20260831
import {
  Fragment,
  useCallback,
  useEffect,
  useId,
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
  LogIn,
  LogOut,
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
  Newspaper,
  UtensilsCrossed,
  Users,
  Tag,
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
const DEFAULT_MEDIA_LABEL = "Service media";
const IS_DEV = Boolean(
  typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV,
);

function devWarn(...args) {
  if (IS_DEV) console.warn(...args);
}
function devError(...args) {
  if (IS_DEV) console.error(...args);
}

function getDisplayPostTitle(value = "") {
  const title = String(value || "").trim();
  if (!title) return "";
  const automaticTitles = new Set(["pepper", "chillax"]);
  return automaticTitles.has(title.toLowerCase()) ? "" : title;
}
function getPostType(post = {}) {
  const explicitType = String(post.post_type || "").trim().toLowerCase();
  if (["offer", "need", "exchange", "moment"].includes(explicitType)) {
    return explicitType;
  }
  const title = String(post.title || post.service_charge_per_minute || "")
    .trim()
    .toLowerCase();
  const details = String(
    post.subtitle || post.service_description || post.description || "",
  ).toLowerCase();
  if (
    post.moment_kind ||
    ["song saying", "movie saying", "recommendation", "my story"].includes(
      title,
    )
  ) {
    return "moment";
  }
  if (
    post.exchange_need ||
    title === "trade skills" ||
    details.includes("i can give:") ||
    details.includes("i need:")
  ) {
    return "exchange";
  }
  if (
    title.startsWith("budget:") ||
    details.includes("\nneeded:") ||
    details.startsWith("needed:")
  ) {
    return "need";
  }
  return "offer";
}

const DEFAULT_LOGO =
  "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' rx='100' fill='%23111827'/%3E%3Ccircle cx='100' cy='76' r='36' fill='%239CA3AF'/%3E%3Cpath d='M38 174c6-38 29-58 62-58s56 20 62 58' fill='%239CA3AF'/%3E%3C/svg%3E";
const IMAGE_FALLBACK_SRC =
  "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%2306101f'/%3E%3Ccircle cx='100' cy='82' r='28' fill='%23234061'/%3E%3Crect x='55' y='128' width='90' height='16' rx='8' fill='%23234061'/%3E%3C/svg%3E";

const INITIAL_PAGE_LIMIT = 5;
const LOAD_MORE_LIMIT = 5;
const MAX_WATCH_SECONDS_PER_REQUEST = 30;
const SESSION_TOKEN_KEY = "time-market-session-token";
const USER_DATA_KEY = "time-market-user-data";
const MESSAGE_POLL_INTERVAL_MS = 2000;
const VERIFICATION_REFRESH_INTERVAL_MS = 60000;
const REACTION_COUNTS_POLL_INTERVAL_MS = 12000;
const INBOX_POLL_INTERVAL_MS = 5000;
const PIN_RESET_STATUS_POLL_INTERVAL_MS = 4000;
const TOAST_DURATION_MS = 4200;
const PERSONAL_PIN_PATTERN = /^\d{8}$/;
const PIN_AUTH_METHOD = "phone_pin";
const CHAT_DRAFT_PREFIX = "gwamo-chat-draft:";
const noop = () => {};

const CATEGORY_TABS = [
  { key: "time-market", label: "Trendz", emoji: "📈" },
  { key: "social-life", label: "Bae & Bae", emoji: "❤️" },
];

const CATEGORY_META = {
  connect: {
    label: "Connect",
    blurb:
      "Find a friend for life, a relationship, a sponsor or supporter, a mentor, or another meaningful connection.",
  },
  "social-news": { label: "Social News", blurb: "Open Social News at social.com." },
  kitchen: { label: "Kitchen", blurb: "Food and kitchen services are coming to Gwamo." },
  deals: { label: "Deals", blurb: "Offers, discounts and useful local deals are coming to Gwamo." },
};

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
    body: 'To create a post, open the hamburger menu and choose Create a post. Add a photo or video, paste a media link, enter your telephone number, title and description, then submit. To contact a provider, tap "Contact me", write your message, then log in with your telephone number and personal PIN when you press Send. Verified providers display a blue check badge beside their name. If you forget your PIN, request a reset and wait for an admin to call your registered number and approve the code shown on your screen.',
  },
  privacy: {
    title: "Privacy Policy",
    eyebrow: "Your safety and trust matter.",
    body: "Gwamo may verify your phone number and identity to help confirm that accounts belong to real people. We take strong measures to prevent fraud, impersonation, fake accounts, scams and other misuse of the platform. Accounts that fail verification or are found to be fraudulent may be restricted or removed. Your phone number is used for account identification and verification purposes, and your personal PIN should never be shared with anyone.",
  },
};

function isDirectVideoUrl(url = "") {
  const clean = String(url).toLowerCase().split("?")[0].split("#")[0];
  return (
    clean.endsWith(".mp4") || clean.endsWith(".webm") || clean.endsWith(".ogg") ||
    clean.endsWith(".mov") || clean.endsWith(".m4v") || clean.endsWith(".mkv") ||
    clean.endsWith(".avi")
  );
}
function isImageUrl(url = "") {
  const clean = String(url).toLowerCase().split("?")[0].split("#")[0];
  return (
    clean.endsWith(".jpg") || clean.endsWith(".jpeg") || clean.endsWith(".png") ||
    clean.endsWith(".gif") || clean.endsWith(".webp") || clean.endsWith(".bmp") ||
    clean.endsWith(".svg")
  );
}
function getEmbedUrl(url = "") {
  if (!url) return "";
  const youtubeMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|live\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1&mute=0&loop=1&playlist=${youtubeMatch[1]}&controls=1&rel=0&modestbranding=1`;
  }
  const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch) {
    return `https://www.youtube.com/embed/${shortsMatch[1]}?autoplay=1&mute=0&loop=1&playlist=${shortsMatch[1]}&controls=1&rel=0&modestbranding=1`;
  }
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&muted=0&loop=1&background=0`;
  }
  if (url.includes("/embed/") || url.includes("player.")) return url;
  return url;
}
function formatCount(value = 0) {
  const number = Number(value) || 0;
  if (number >= 1000000) return `${(number / 1000000).toFixed(1).replace(".0", "")}M`;
  if (number >= 1000) return `${(number / 1000).toFixed(1).replace(".0", "")}K`;
  return String(number);
}

const DESCRIPTION_PREVIEW_LENGTH = 96;
function makeDescriptionPreview(value = "", maxLength = DESCRIPTION_PREVIEW_LENGTH) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) return text;
  const words = text.split(/\s+/);
  let preview = "";
  for (const word of words) {
    const candidate = preview ? `${preview} ${word}` : word;
    if (candidate.length > maxLength && preview) break;
    preview = candidate;
    if (preview.length >= maxLength) break;
  }
  return preview;
}

function renderDescriptionWithLinks(value = "") {
  return String(value || "")
    .split(/(https?:\/\/[^\s]+|www\.[^\s]+)/gi)
    .filter(Boolean)
    .map((part, index) => {
      if (!/^(?:https?:\/\/|www\.)/i.test(part)) return part;
      const href = /^https?:\/\//i.test(part) ? part : `https://${part}`;
      return (
        <a key={`${part}-${index}`} className="description-link" href={href} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()}>
          {part}
        </a>
      );
    });
}

function normalizeWhatsAppNumber(value = "") {
  const raw = String(value || "").trim();
  const compact = raw.replace(/[\s().-]/g, "");
  if (/^07[2389]\d{7}$/.test(compact)) return `250${compact.slice(1)}`;
  if (/^\+2507[2389]\d{7}$/.test(compact)) return compact.slice(1);
  if (/^2507[2389]\d{7}$/.test(compact)) return compact;
  if (/^\+[1-9]\d{7,14}$/.test(compact)) return compact.slice(1);
  if (/^[1-9]\d{7,14}$/.test(compact)) return compact;
  return "";
}

function isSameProviderAsPost(post = {}, provider = null) {
  if (!provider) return false;
  const ownerId = String(post.provider_id || "").trim();
  const viewerId = String(provider.id || "").trim();
  if (ownerId && viewerId) return ownerId === viewerId;
  const ownerPhone = normalizeWhatsAppNumber(post.creator_identity || "");
  const viewerPhone = normalizeWhatsAppNumber(provider.phone || "");
  return Boolean(ownerPhone && viewerPhone && ownerPhone === viewerPhone);
}

function useEscapeToClose(onClose, isOpen = true) {
  useEffect(() => {
    if (!isOpen || !onClose) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);
}

async function compressImageFile(file, { maxWidth, maxHeight, quality = 0.75 } = {}) {
  if (!file || !file.type || !file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    const widthLimit = maxWidth || width;
    const heightLimit = maxHeight || height;
    const scale = Math.min(1, widthLimit / width, heightLimit / height);
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    const blob = await new Promise((resolve) => {
      canvas.toBlob((result) => resolve(result), "image/webp", quality);
    });
    if (!blob) return file;
    const newName = file.name ? file.name.replace(/\.[^/.]+$/, "") + ".webp" : "upload.webp";
    return new File([blob], newName, { type: "image/webp" });
  } catch (error) {
    devWarn("Image compression failed, using original file:", error);
    return file;
  }
}

function getVerificationStatus(entity) {
  const rawStatus = String(entity?.verification_status || "").trim().toLowerCase();
  let status = "pending";
  if (
    rawStatus === "verified" || rawStatus === "approved" || entity?.verified === true ||
    entity?.verified === 1 || entity?.verified === "1" || entity?.is_verified === true ||
    entity?.is_verified === 1 || entity?.is_verified === "1"
  ) {
    status = "verified";
  } else if (rawStatus === "rejected" || rawStatus === "blocked") {
    status = "rejected";
  }
  const labels = { verified: "Verified", pending: "Verification Pending", rejected: "Not Approved" };
  return { status, label: labels[status], verified: status === "verified", className: `status-${status}` };
}

const VerificationTag = memo(function VerificationTag({ info, size = 14 }) {
  const Icon = info.status === "verified" ? CheckCircle : info.status === "rejected" ? ShieldX : Clock;
  return (
    <span className={`verification-tag ${info.className}`}>
      <Icon size={size} aria-hidden="true" />
      <span>{info.label}</span>
    </span>
  );
});
VerificationTag.displayName = "VerificationTag";

function isSameCalendarDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function formatDayLabel(dateInput) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameCalendarDay(date, now)) return "Today";
  if (isSameCalendarDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString([], {
    month: "short", day: "numeric", year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function attachmentPreviewLabel(messageType) {
  switch (messageType) {
    case "image": return "Photo";
    case "video": return "Video";
    case "voice": return "Voice message";
    case "document": return "Document";
    default: return "Sent a message";
  }
}

// ==========================================
// MAIN HOME COMPONENT
// ==========================================
function Home() {
  const videoRefs = useRef({});
  const postRefs = useRef({});
  const observerRef = useRef(null);
  const isMountedRef = useRef(true);
  const postRefCallbackCache = useRef(new Map());
  const videoRefCallbackCache = useRef(new Map());

  const getPostRefCallback = useCallback((index) => {
    if (!postRefCallbackCache.current.has(index)) {
      postRefCallbackCache.current.set(index, (ref) => {
        if (ref) postRefs.current[index] = ref;
        else delete postRefs.current[index];
      });
    }
    return postRefCallbackCache.current.get(index);
  }, []);

  const getVideoRefCallback = useCallback((index) => {
    if (!videoRefCallbackCache.current.has(index)) {
      videoRefCallbackCache.current.set(index, (ref) => {
        if (ref) videoRefs.current[index] = ref;
        else delete videoRefs.current[index];
      });
    }
    return videoRefCallbackCache.current.get(index);
  }, []);

  // User state
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // UI state
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [activePostIndex, setActivePostIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState("time-market");
  const [showEditor, setShowEditor] = useState(false);
  const [editingServicePost, setEditingServicePost] = useState(null);
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authPhone, setAuthPhone] = useState("");
  const [authFullName, setAuthFullName] = useState("");
  const [authPin, setAuthPin] = useState("");
  const [authConfirmPin, setAuthConfirmPin] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authSuccessMessage, setAuthSuccessMessage] = useState("");
  
  const [showPinResetModal, setShowPinResetModal] = useState(false);
  const [pinResetStep, setPinResetStep] = useState("request");
  const [pinResetPhone, setPinResetPhone] = useState("");
  const [pinResetRequest, setPinResetRequest] = useState(null);
  const [pinResetNewPin, setPinResetNewPin] = useState("");
  const [pinResetConfirmPin, setPinResetConfirmPin] = useState("");
  const [pinResetError, setPinResetError] = useState("");
  const [pinResetLoading, setPinResetLoading] = useState(false);
  
  const [pendingPhoneReview, setPendingPhoneReview] = useState(null);
  
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [activationPhone, setActivationPhone] = useState("");
  const [activationCode, setActivationCode] = useState("");
  const [activationNewPin, setActivationNewPin] = useState("");
  const [activationConfirmPin, setActivationConfirmPin] = useState("");
  const [activationError, setActivationError] = useState("");
  const [activationLoading, setActivationLoading] = useState(false);
  const [rejectedAccountInfo, setRejectedAccountInfo] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [chatPartner, setChatPartner] = useState(null);
  const [showProviderProfile, setShowProviderProfile] = useState(false);
  const [providerProfileTarget, setProviderProfileTarget] = useState(null);
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
  
  const [showMyInbox, setShowMyInbox] = useState(false);
  const [myInboxFilterPostId, setMyInboxFilterPostId] = useState(null);
  const [myConversations, setMyConversations] = useState([]);
  const [myConversationsLoading, setMyConversationsLoading] = useState(false);
  const [myConversationsError, setMyConversationsError] = useState("");
  const [showInfoModal, setShowInfoModal] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  const notifiedMessageKeysRef = useRef(new Set());
  const previousTotalUnreadRef = useRef(0);

  // Editor state
  const [newCreatorName, setNewCreatorName] = useState("");
  const [newCreatorIdentity, setNewCreatorIdentity] = useState("");
  const [newMediaUrl, setNewMediaUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [postType, setPostType] = useState("offer");
  const [postHeadline, setPostHeadline] = useState("");
  const [serviceCategory, setServiceCategory] = useState("");
  const [postLocation, setPostLocation] = useState("");
  const [priceUnit, setPriceUnit] = useState("job");
  const [availability, setAvailability] = useState("today");
  const [exchangeNeed, setExchangeNeed] = useState("");
  const [allowCashBalance, setAllowCashBalance] = useState(true);
  const [momentKind, setMomentKind] = useState("story");
  const [newLogoFile, setNewLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [newMediaFile, setNewMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState("");
  const [mediaPreviewType, setMediaPreviewType] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [compressingMedia, setCompressingMedia] = useState(false);
  
  const [zoomImage, setZoomImage] = useState("");
  const [mediaAspectRatios, setMediaAspectRatios] = useState({});
  const [reactedPosts, setReactedPosts] = useState({});
  const [reactingPostId, setReactingPostId] = useState(null);
  const pendingAuthActionRef = useRef(null);
  const [pendingAuthResolution, setPendingAuthResolution] = useState(null);
  
  const objectUrlsRef = useRef(new Set());
  const trackObjectUrl = useCallback((url) => {
    if (url) objectUrlsRef.current.add(url);
    return url;
  }, []);
  const revokeObjectUrl = useCallback((url) => {
    if (url && objectUrlsRef.current.has(url)) {
      URL.revokeObjectURL(url);
      objectUrlsRef.current.delete(url);
    }
  }, []);

  const readJsonSafely = useCallback(async (response) => {
    const responseText = await response.text();
    if (!responseText) {
      return {
        success: response.ok,
        message: response.ok ? "" : `Server returned ${response.status} ${response.statusText}`,
      };
    }
    try {
      return JSON.parse(responseText);
    } catch {
      throw new Error(responseText || `Server returned ${response.status} ${response.statusText}`);
    }
  }, []);

  // Session Management
  const getSessionToken = useCallback(() => {
    try { return localStorage.getItem(SESSION_TOKEN_KEY) || ""; } catch { return ""; }
  }, []);
  const setSessionToken = useCallback((token) => {
    try {
      if (token) localStorage.setItem(SESSION_TOKEN_KEY, token);
      else localStorage.removeItem(SESSION_TOKEN_KEY);
    } catch { /* ignore */ }
  }, []);
  const getUserData = useCallback(() => {
    try {
      const data = localStorage.getItem(USER_DATA_KEY);
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  }, []);
  const setUserData = useCallback((userData) => {
    try {
      if (userData) localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
      else localStorage.removeItem(USER_DATA_KEY);
    } catch { /* ignore */ }
  }, []);

  const authFetch = useCallback(async (path, options = {}) => {
    const token = getSessionToken();
    const headers = { ...(options.headers || {}) };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return fetch(`${API_URL}${path}`, { cache: "no-store", ...options, headers });
  }, [getSessionToken]);

  const restoreSession = useCallback(async () => {
    const token = getSessionToken();
    if (!token) return false;
    try {
      const response = await fetch(`${API_URL}/api/time-market/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await readJsonSafely(response);
        const provider = data.provider || data.user;
        if (data.success && provider) {
          setUser(provider);
          setIsLoggedIn(true);
          setUserData(provider);
          return true;
        }
      }
    } catch (error) { devWarn("Session restore failed:", error); }
    setSessionToken("");
    setUserData(null);
    setUser(null);
    setIsLoggedIn(false);
    return false;
  }, [getSessionToken, readJsonSafely, setSessionToken, setUserData]);

  useEffect(() => {
    if (!isLoggedIn) return undefined;
    const refreshProfile = async () => {
      if (document.hidden) return;
      const token = getSessionToken();
      if (!token) return;
      try {
        const response = await fetch(`${API_URL}/api/time-market/me`, {
          headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
        });
        if (!response.ok || !isMountedRef.current) return;
        const data = await readJsonSafely(response);
        if (data.success && data.provider && isMountedRef.current) {
          setUser(data.provider);
          setUserData(data.provider);
          setPosts((current) => current.map((post) =>
            String(post.provider_id) === String(data.provider.id)
              ? { ...post, verification_status: data.provider.verification_status, verified: data.provider.verified }
              : post
          ));
        }
      } catch { /* Transient network issues shouldn't sign the person out. */ }
    };
    const intervalId = setInterval(refreshProfile, VERIFICATION_REFRESH_INTERVAL_MS);
    const handleVisible = () => { if (!document.hidden) refreshProfile(); };
    document.addEventListener("visibilitychange", handleVisible);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, [isLoggedIn, getSessionToken, readJsonSafely, setUserData]);

  // Auth functions
  const openServiceForm = useCallback((provider, initialPostType = "offer") => {
    if (provider) {
      setNewCreatorName(provider.service_provider_name || provider.full_name || "");
      setNewCreatorIdentity(provider.phone || "");
    }
    setNewMediaUrl(""); setNewTitle(""); setSubtitle("");
    setPostType(initialPostType); setPostHeadline(""); setServiceCategory("");
    setPostLocation(""); setPriceUnit("job"); setAvailability("today");
    setExchangeNeed(""); setAllowCashBalance(true); setMomentKind("story");
    setNewLogoFile(null); revokeObjectUrl(logoPreview); setLogoPreview("");
    setNewMediaFile(null); revokeObjectUrl(mediaPreview); setMediaPreview("");
    setMediaPreviewType(""); setEditingServicePost(null); setShowEditor(true);
  }, [logoPreview, mediaPreview, revokeObjectUrl]);

  const handleRegister = useCallback(async () => {
    const phone = normalizeWhatsAppNumber(authPhone);
    const fullName = authFullName.trim();
    if (!phone) return setAuthError("Please enter a valid phone number with country code.");
    if (!fullName) return setAuthError("Please enter your full name.");
    if (!PERSONAL_PIN_PATTERN.test(authPin)) return setAuthError("Create an 8-digit personal PIN.");
    if (authPin !== authConfirmPin) return setAuthError("The two PIN entries do not match.");
    setAuthLoading(true); setAuthError(""); setAuthSuccessMessage("");
    try {
      const response = await fetch(`${API_URL}/api/time-market/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, full_name: fullName, pin: authPin, auth_method: PIN_AUTH_METHOD }),
      });
      const data = await readJsonSafely(response);
      if (data.already_registered) {
        setAuthMode("login");
        setAuthError("This number is already registered. Please press Login.");
        return;
      }
      if (!response.ok || !data.success) throw new Error(data.error || data.message || "Registration failed.");
      
      if (data.requires_admin_approval || data.account_status === "pending_phone_review") {
        setPendingPhoneReview({ phone, fullName });
        setShowAuthModal(false); setAuthPhone(""); setAuthFullName(""); setAuthPin(""); setAuthConfirmPin("");
        pendingAuthActionRef.current = null;
        return;
      }
      
      const provider = data.provider || data.user;
      const token = data.session_token || data.token;
      if (provider && token) {
        setUser(provider); setIsLoggedIn(true); setSessionToken(token); setUserData(provider);
        setShowAuthModal(false); setAuthPhone(""); setAuthFullName(""); setAuthPin(""); setAuthConfirmPin("");
        setAuthError(""); setAuthSuccessMessage("Registration successful! 🎉");
        const action = pendingAuthActionRef.current;
        pendingAuthActionRef.current = null;
        if (action) setPendingAuthResolution({ action, provider });
        return;
      }
      setAuthError(data.error || data.message || "Registration failed.");
    } catch (error) {
      setAuthError(error.message || "Registration failed. Please try again.");
    } finally { setAuthLoading(false); }
  }, [authPhone, authFullName, authPin, authConfirmPin, readJsonSafely, setSessionToken, setUserData]);

  const handleLogin = useCallback(async () => {
    const phone = normalizeWhatsAppNumber(authPhone);
    if (!phone) return setAuthError("Please enter your registered phone number.");
    if (!PERSONAL_PIN_PATTERN.test(authPin)) return setAuthError("Enter your 8-digit personal PIN.");
    setAuthLoading(true); setAuthError(""); setAuthSuccessMessage("");
    try {
      const response = await fetch(`${API_URL}/api/time-market/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin: authPin, auth_method: PIN_AUTH_METHOD }),
      });
      const data = await readJsonSafely(response);
      
      if (!response.ok || !data.success) {
        if (data.requires_activation_code) {
          setShowAuthModal(false); setActivationPhone(authPhone); setActivationCode("");
          setActivationNewPin(""); setActivationConfirmPin(""); setActivationError("");
          setShowActivationModal(true); setAuthLoading(false);
          return;
        }
        if (data.account_rejected) {
          setShowAuthModal(false);
          setRejectedAccountInfo({ message: data.error || data.message || "Your registration could not be approved." });
          setAuthLoading(false);
          return;
        }
        setAuthError(data.error || data.message || "This number is not registered. Please register first.");
        setAuthLoading(false);
        return;
      }
      
      const provider = data.provider || data.user;
      const token = data.session_token || data.token;
      if (provider && token) {
        setUser(provider); setIsLoggedIn(true); setSessionToken(token); setUserData(provider);
        setShowAuthModal(false); setAuthPhone(""); setAuthPin(""); setAuthError(""); setAuthSuccessMessage("Login successful! 👋");
        const action = pendingAuthActionRef.current;
        pendingAuthActionRef.current = null;
        if (action) setPendingAuthResolution({ action, provider });
        return;
      }
      setAuthError(data.error || data.message || "Login failed.");
    } catch (error) {
      setAuthError(error.message || "Login failed. Please try again.");
    } finally { setAuthLoading(false); }
  }, [authPhone, authPin, readJsonSafely, setSessionToken, setUserData]);

  const openActivationModal = useCallback(() => {
    setShowAuthModal(false); setActivationPhone(authPhone); setActivationCode("");
    setActivationNewPin(""); setActivationConfirmPin(""); setActivationError("");
    setShowActivationModal(true);
  }, [authPhone]);

  const submitActivationCode = useCallback(async () => {
    const phone = normalizeWhatsAppNumber(activationPhone);
    if (!phone) return setActivationError("Enter your registered telephone number.");
    if (!/^\d{6}$/.test(activationCode)) return setActivationError("Enter the 6-digit activation code.");
    if (!PERSONAL_PIN_PATTERN.test(activationNewPin)) return setActivationError("Create an 8-digit personal PIN.");
    if (activationNewPin !== activationConfirmPin) return setActivationError("The two PIN entries do not match.");
    setActivationLoading(true); setActivationError("");
    try {
      const response = await fetch(`${API_URL}/api/time-market/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: activationCode, new_pin: activationNewPin }),
        cache: "no-store",
      });
      const data = await readJsonSafely(response);
      if (!response.ok || !data.success) throw new Error(data.error || data.message || "Could not activate your account.");
      const provider = data.provider || data.user;
      const token = data.session_token || data.token;
      setShowActivationModal(false); setActivationCode(""); setActivationNewPin(""); setActivationConfirmPin("");
      
      if (provider && token) {
        setUser(provider); setIsLoggedIn(true); setSessionToken(token); setUserData(provider);
        setAuthPhone(""); setAuthPin(""); setAuthSuccessMessage("Account activated! 🎉");
        const action = pendingAuthActionRef.current;
        pendingAuthActionRef.current = null;
        if (action) setPendingAuthResolution({ action, provider });
      }
    } catch (error) {
      setActivationError(error.message || "Could not activate your account.");
    } finally { setActivationLoading(false); }
  }, [activationPhone, activationCode, activationNewPin, activationConfirmPin, readJsonSafely, setSessionToken, setUserData]);

  const handleLogout = useCallback(async () => {
    const token = getSessionToken();
    try {
      if (token) {
        await fetch(`${API_URL}/api/time-market/logout`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      }
    } catch { /* Local logout must still complete when the network is unavailable. */ }
    setSessionToken(""); setUserData(null); setUser(null); setIsLoggedIn(false); setMyConversations([]);
  }, [getSessionToken, setSessionToken, setUserData]);

  const openAuthModal = useCallback((mode = "login", pendingAction = null) => {
    pendingAuthActionRef.current = pendingAction;
    setAuthMode(mode); setAuthPhone(""); setAuthFullName(""); setAuthPin("");
    setAuthConfirmPin(""); setAuthError(""); setAuthSuccessMessage("");
    setAuthLoading(false); setShowAuthModal(true);
  }, []);

  const requireAuthForTv = useCallback(() => { openAuthModal("login"); }, [openAuthModal]);
  const requireAuthForConnect = useCallback(() => { openAuthModal("login"); }, [openAuthModal]);
  
  const closeAuthModal = useCallback(() => {
    pendingAuthActionRef.current = null;
    setShowAuthModal(false); setAuthError(""); setAuthSuccessMessage("");
  }, []);

  const openPinReset = useCallback(() => {
    setShowAuthModal(false); setShowPinResetModal(true); setPinResetStep("request");
    setPinResetPhone(authPhone); setPinResetRequest(null); setPinResetNewPin("");
    setPinResetConfirmPin(""); setPinResetError("");
  }, [authPhone]);

  const closePinReset = useCallback(() => {
    setShowPinResetModal(false); setPinResetLoading(false); setPinResetError("");
  }, []);

  const requestPinReset = useCallback(async () => {
    const phone = normalizeWhatsAppNumber(pinResetPhone);
    if (!phone) return setPinResetError("Enter your registered telephone number.");
    setPinResetLoading(true); setPinResetError("");
    try {
      const response = await fetch(`${API_URL}/api/time-market/pin-reset/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }), cache: "no-store",
      });
      const data = await readJsonSafely(response);
      if (!response.ok || !data.success) throw new Error(data.error || data.message || "Could not request a PIN reset.");
      setPinResetRequest({
        id: data.request_id || data.request?.id || "",
        verificationCode: data.verification_code || data.request?.verification_code || "",
        expiresAt: data.expires_at || data.request?.expires_at || "",
        recoveryToken: "",
      });
      setPinResetStep("waiting");
    } catch (error) {
      setPinResetError(error.message || "Could not request a PIN reset.");
    } finally { setPinResetLoading(false); }
  }, [pinResetPhone, readJsonSafely]);

  const checkPinResetStatus = useCallback(async ({ silent = false } = {}) => {
    if (!pinResetRequest?.id) {
      if (!silent) setPinResetError("This reset request is missing. Please start again.");
      return;
    }
    if (!silent) { setPinResetLoading(true); setPinResetError(""); }
    try {
      const response = await fetch(`${API_URL}/api/time-market/pin-reset/status?request_id=${encodeURIComponent(pinResetRequest.id)}`, { cache: "no-store" });
      const data = await readJsonSafely(response);
      if (!response.ok || !data.success) throw new Error(data.error || data.message || "Could not check the reset request.");
      if (data.approved && data.pin_delivered) {
        setPinResetError(""); setPinResetStep("delivered"); return;
      }
      if (!data.approved) {
        if (!silent || data.status === "rejected") {
          setPinResetError(data.status === "rejected" ? "This reset request was rejected." : "Gwamo has not approved this reset yet. Keep the code open and wait for the call.");
        }
      }
    } catch (error) {
      if (!silent) setPinResetError(error.message || "Could not check the reset request.");
    } finally {
      if (!silent) setPinResetLoading(false);
    }
  }, [pinResetRequest, readJsonSafely]);

  useEffect(() => {
    if (!showPinResetModal || pinResetStep !== "waiting") return undefined;
    const intervalId = setInterval(() => { if (!document.hidden) checkPinResetStatus({ silent: true }); }, PIN_RESET_STATUS_POLL_INTERVAL_MS);
    const handleVisible = () => { if (!document.hidden) checkPinResetStatus({ silent: true }); };
    document.addEventListener("visibilitychange", handleVisible);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, [showPinResetModal, pinResetStep, checkPinResetStatus]);

  const completePinReset = useCallback(async () => {
    if (!PERSONAL_PIN_PATTERN.test(pinResetNewPin)) return setPinResetError("Create a new 8-digit personal PIN.");
    if (pinResetNewPin !== pinResetConfirmPin) return setPinResetError("The two PIN entries do not match.");
    if (!pinResetRequest?.id || !pinResetRequest?.recoveryToken) return setPinResetError("The approved reset session is missing. Please start again.");
    setPinResetLoading(true); setPinResetError("");
    try {
      const response = await fetch(`${API_URL}/api/time-market/pin-reset/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: pinResetRequest.id, recovery_token: pinResetRequest.recoveryToken, new_pin: pinResetNewPin }),
        cache: "no-store",
      });
      const data = await readJsonSafely(response);
      if (!response.ok || !data.success) throw new Error(data.error || data.message || "Could not save the new PIN.");
      closePinReset(); openAuthModal("login"); setAuthPhone(pinResetPhone);
      setAuthSuccessMessage("Your PIN was changed. Login with the new PIN.");
    } catch (error) {
      setPinResetError(error.message || "Could not save the new PIN.");
    } finally { setPinResetLoading(false); }
  }, [pinResetNewPin, pinResetConfirmPin, pinResetRequest, pinResetPhone, readJsonSafely, closePinReset, openAuthModal]);

  const handleOfferTime = useCallback((requestedPostType = "offer") => {
    const initialPostType = ["offer", "need", "exchange", "moment"].includes(requestedPostType) ? requestedPostType : "offer";
    if (!isLoggedIn || !user) {
      openAuthModal("login", { type: "offer", postType: initialPostType });
      return;
    }
    setNewCreatorName(user.service_provider_name || user.full_name || "");
    setNewCreatorIdentity(user.phone || "");
    setNewMediaUrl(""); setNewTitle(""); setSubtitle("");
    setPostType(initialPostType); setPostHeadline(""); setServiceCategory("");
    setPostLocation(""); setPriceUnit("job"); setAvailability("today"); setExchangeNeed("");
    setAllowCashBalance(true); setMomentKind("story");
    setNewLogoFile(null); revokeObjectUrl(logoPreview); setLogoPreview("");
    setNewMediaFile(null); revokeObjectUrl(mediaPreview); setMediaPreview(""); setMediaPreviewType("");
    setEditingServicePost(null); setShowEditor(true);
  }, [isLoggedIn, user, openAuthModal, revokeObjectUrl, logoPreview, mediaPreview]);

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
      if (!response.ok || !data.success) throw new Error(data.error || data.message || `Failed to load services (${response.status})`);
      
      const receivedPosts = Array.isArray(data.posts) ? data.posts : [];
      if (isMountedRef.current) {
        setPosts((current) => append ? [...current, ...receivedPosts] : receivedPosts);
        setNextCursor(data.next_cursor || null);
        setHasMore(Boolean(data.has_more));
      }
    } catch (error) {
      if (error?.name === "AbortError") return;
      devError("Failed to fetch services:", error);
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
    try {
      const origin = new URL(API_URL).origin;
      if (!document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) {
        const link = document.createElement("link");
        link.rel = "preconnect"; link.href = origin; link.crossOrigin = "anonymous";
        document.head.appendChild(link);
      }
    } catch { /* non-critical, safe to skip */ }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    const init = async () => { await Promise.all([restoreSession(), fetchHomeData()]); };
    init();
    return () => {
      isMountedRef.current = false;
      const controller = fetchAbortRef.current;
      fetchAbortRef.current = null; fetchInFlightRef.current = false;
      if (controller) controller.abort();
    };
  }, []);

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
    setMediaAspectRatios((current) => {
      if (current[postId] === ratio) return current;
      return { ...current, [postId]: ratio };
    });
  }, []);

  const reactionPollInFlightRef = useRef(false);
  const reactionEndpointUnavailableRef = useRef(false);
  const postsRef = useRef(posts);
  useEffect(() => { postsRef.current = posts; }, [posts]);

  useEffect(() => {
    let intervalId = null;
    const pollReactionCounts = async () => {
      if (document.hidden || reactionPollInFlightRef.current || reactionEndpointUnavailableRef.current) return;
      const ids = postsRef.current.map((post) => String(post.id)).filter(Boolean);
      if (!ids.length) return;
      reactionPollInFlightRef.current = true;
      try {
        const response = await fetch(`${API_URL}/api/home/reaction-counts?post_ids=${encodeURIComponent(ids.slice(0, 60).join(","))}`, { cache: "no-store" });
        if (response.status === 404) { reactionEndpointUnavailableRef.current = true; return; }
        if (!response.ok) return;
        const data = await readJsonSafely(response);
        if (!data || !data.success || !data.counts) return;
        if (!isMountedRef.current) return;
        setPosts((current) => current.map((post) => {
          const counts = data.counts[String(post.id)];
          if (!counts) return post;
          return { ...post, real_reactions: counts.real_reactions, manual_reactions: counts.manual_reactions, displayed_reactions: counts.displayed_reactions };
        }));
      } catch { /* Network hiccup */ } finally { reactionPollInFlightRef.current = false; }
    };
    intervalId = setInterval(pollReactionCounts, REACTION_COUNTS_POLL_INTERVAL_MS);
    const handleVisible = () => { if (!document.hidden) pollReactionCounts(); };
    document.addEventListener("visibilitychange", handleVisible);
    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, [readJsonSafely]);

  const pauseAllVideos = useCallback(() => {
    Object.entries(videoRefs.current).forEach(([postId, video]) => { if (video && !video.paused) video.pause(); });
  }, []);

  const openEditor = useCallback(() => {
    pauseAllVideos();
    setShowEditor(true);
  }, [pauseAllVideos]);

  const closeEditor = useCallback(() => {
    setShowEditor(false); setUploadProgress(0); setNewCreatorName(""); setNewCreatorIdentity("");
    setNewMediaUrl(""); setNewTitle(""); setSubtitle(""); setNewLogoFile(null);
    revokeObjectUrl(logoPreview); setLogoPreview("");
    setNewMediaFile(null); revokeObjectUrl(mediaPreview); setMediaPreview(""); setMediaPreviewType("");
    setEditingServicePost(null);
  }, [logoPreview, mediaPreview, revokeObjectUrl]);

  const handleLogoChange = useCallback(async (file) => {
    revokeObjectUrl(logoPreview);
    if (!file) { setNewLogoFile(null); setLogoPreview(""); return; }
    setCompressingMedia(true);
    try {
      const compressed = await compressImageFile(file, { maxWidth: 400, maxHeight: 400, quality: 0.75 });
      setNewLogoFile(compressed);
      setLogoPreview(trackObjectUrl(URL.createObjectURL(compressed)));
    } catch (error) {
      devError("Profile photo processing failed:", error);
      alert("This image could not be processed. Please try a different photo.");
    } finally { setCompressingMedia(false); }
  }, [logoPreview, revokeObjectUrl, trackObjectUrl]);

  const handleProfilePhotoChange = useCallback(async (file) => {
    revokeObjectUrl(profilePhotoPreview);
    if (!file) { setProfilePhotoFile(null); setProfilePhotoPreview(""); return; }
    try {
      const compressed = await compressImageFile(file, { maxWidth: 400, maxHeight: 400, quality: 0.75 });
      setProfilePhotoFile(compressed);
      setProfilePhotoPreview(trackObjectUrl(URL.createObjectURL(compressed)));
    } catch (error) {
      devError("Profile photo processing failed:", error);
      alert("This image could not be processed. Please try a different photo.");
    }
  }, [profilePhotoPreview, revokeObjectUrl, trackObjectUrl]);

  const removeProfilePhoto = useCallback(() => {
    revokeObjectUrl(profilePhotoPreview);
    setProfilePhotoFile("remove"); setProfilePhotoPreview("");
  }, [profilePhotoPreview, revokeObjectUrl]);

  const handleMediaFileChange = useCallback(async (file) => {
    revokeObjectUrl(mediaPreview);
    if (!file) { setNewMediaFile(null); setMediaPreview(""); setMediaPreviewType(""); return; }
    const isImage = file.type.startsWith("image/");
    if (!isImage) {
      setNewMediaFile(file); setMediaPreview(trackObjectUrl(URL.createObjectURL(file))); setMediaPreviewType("video");
      return;
    }
    setCompressingMedia(true);
    try {
      const compressed = await compressImageFile(file, { maxWidth: 1080, quality: 0.75 });
      setNewMediaFile(compressed); setMediaPreview(trackObjectUrl(URL.createObjectURL(compressed))); setMediaPreviewType("image");
    } catch (error) {
      devError("Image processing failed:", error);
      alert("This image could not be processed. Please try a different photo.");
    } finally { setCompressingMedia(false); }
  }, [mediaPreview, revokeObjectUrl, trackObjectUrl]);

  const applyChanges = useCallback(async () => {
    const providerName = newCreatorName.trim();
    const contactInfo = newCreatorIdentity.trim();
    const headline = postHeadline.trim();
    const enteredValue = newTitle.trim();
    const baseDescription = subtitle.trim();
    const wantedExchange = exchangeNeed.trim();
    const mediaToSave = newMediaUrl.trim();
    if (!contactInfo) return alert("Please enter your telephone number.");
    if (!baseDescription) return alert("Please add a description.");
    if (postType === "exchange" && !wantedExchange) return alert("Please say what service you need in return.");
    if (!mediaToSave && !newMediaFile) return alert("Please upload a photo/video or enter a media link.");
    let detectedMediaType = "";
    if (newMediaFile) detectedMediaType = newMediaFile.type.startsWith("image/") ? "image" : "video";
    else if (isImageUrl(mediaToSave)) detectedMediaType = "image";
    else if (isDirectVideoUrl(mediaToSave)) detectedMediaType = "video";
    else if (mediaToSave) detectedMediaType = "embed";
    const detailLines = [baseDescription];
    if (postType !== "exchange") {
      if (serviceCategory && postType !== "moment") detailLines.push(`Category: ${serviceCategory}`);
      if (postLocation && postType !== "moment") detailLines.push(`Location: ${postLocation}`);
      if (postType === "offer") detailLines.push(`Available: ${availability}`);
      if (postType === "need") detailLines.push(`Needed: ${availability}`);
    }
    const workDescription = detailLines.join("\n");
    
    const cardValue = headline || "";
    try {
      setSaving(true); setUploadProgress(1);
      const formData = new FormData();
      formData.append("creator_name", providerName); formData.append("creator_identity", contactInfo);
      formData.append("title", cardValue); formData.append("subtitle", workDescription);
      formData.append("post_type", postType); formData.append("service_name", headline);
      formData.append("service_category", serviceCategory.trim()); formData.append("location", postLocation.trim());
      formData.append("availability", availability); formData.append("price_unit", priceUnit);
      formData.append("exchange_offer", postType === "exchange" ? headline : "");
      formData.append("exchange_need", postType === "exchange" ? wantedExchange : "");
      formData.append("allow_cash_balance", allowCashBalance ? "1" : "0");
      formData.append("moment_kind", postType === "moment" ? momentKind : "");
      formData.append("media_type", detectedMediaType); formData.append("is_new_service", "true");
      if (mediaToSave) formData.append("media_url", mediaToSave);
      if (newLogoFile) formData.append("logo_file", newLogoFile);
      if (newMediaFile) formData.append("media_file", newMediaFile);
      const { status, statusText, responseText } = await new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("POST", `${API_URL}/api/home/update`);
        request.timeout = 180000;
        request.upload.onprogress = (event) => {
          if (!event.lengthComputable || !isMountedRef.current) return;
          const percentage = Math.min(95, Math.max(1, Math.round((event.loaded / event.total) * 95)));
          setUploadProgress(percentage);
        };
        request.upload.onload = () => { if (isMountedRef.current) setUploadProgress(96); };
        request.onload = () => resolve({ status: request.status, statusText: request.statusText, responseText: request.responseText });
        request.onerror = () => reject(new Error("Network error while uploading the service."));
        request.ontimeout = () => reject(new Error("The upload took too long. Please try again."));
        request.onabort = () => reject(new Error("The upload was cancelled."));
        request.send(formData);
      });
      let data;
      try { data = responseText ? JSON.parse(responseText) : { success: status >= 200 && status < 300 }; } catch {
        throw new Error(responseText || `Server returned ${status} ${statusText}`);
      }
      if (status < 200 || status >= 300 || !data.success) throw new Error(data.error || data.message || `Failed to create service (${status})`);
      
      if (isMountedRef.current) setUploadProgress(100);
      const createdPost = data.post || data.service;
      if (createdPost && isMountedRef.current) {
        setPosts((current) => [createdPost, ...current.filter((item) => String(item.id) !== String(createdPost.id))]);
      } else { await fetchHomeData(); }
      closeEditor(); alert(data.message || "Your post was created successfully!");
    } catch (error) {
      devError("Failed to create service:", error);
      alert(error.message || "Failed to create service.");
    } finally {
      if (isMountedRef.current) { setSaving(false); setUploadProgress(0); }
    }
  }, [closeEditor, fetchHomeData, newCreatorName, newCreatorIdentity, newLogoFile, newMediaFile, newMediaUrl, newTitle, subtitle, postType, postHeadline, serviceCategory, postLocation, priceUnit, availability, exchangeNeed, allowCashBalance, momentKind]);

  const openServiceEdit = useCallback((post) => {
    setEditingServicePost(post);
    setNewCreatorName(post.service_provider_name || post.creator_name || "");
    setNewCreatorIdentity(post.creator_identity || "");
    setNewTitle("");
    setSubtitle(post.work_description || post.subtitle || "");
    setPostType(post.post_type || "offer");
    setPostHeadline(post.service_name || post.service_title || "");
    setServiceCategory(post.service_category || post.category || "");
    setPostLocation(post.location || "");
    setPriceUnit(post.price_unit || "job");
    setAvailability(post.availability || "today");
    setExchangeNeed(post.exchange_need || "");
    setAllowCashBalance(post.allow_cash_balance !== 0);
    setMomentKind(post.moment_kind || "story");
    setNewLogoFile(null); revokeObjectUrl(logoPreview); setLogoPreview("");
    setNewMediaFile(null); revokeObjectUrl(mediaPreview);
    
    if (post.media_type === "embed") {
      setMediaPreview(""); setMediaPreviewType(""); setNewMediaUrl(post.media_url || "");
    } else {
      setMediaPreview(post.media_url || ""); setMediaPreviewType(post.media_type === "video" ? "video" : "image"); setNewMediaUrl("");
    }
    setShowMyServices(false); setShowEditor(true);
  }, [logoPreview, mediaPreview, revokeObjectUrl]);

  const saveServiceEdit = useCallback(async () => {
    if (!editingServicePost) return;
    const chargeText = newTitle.trim();
    const workDescription = subtitle.trim();
    if (!workDescription) return alert("Please describe your service.");
    setSaving(true); setUploadProgress(1);
    
    try {
      let mediaUrl = editingServicePost.media_url || "";
      let mediaType = editingServicePost.media_type || "";
      if (newMediaFile) {
        const uploadForm = new FormData();
        uploadForm.append("file", newMediaFile);
        uploadForm.append("kind", newMediaFile.type.startsWith("image/") ? "post_image" : "video");
        const uploadResponse = await authFetch("/api/home/upload", { method: "POST", body: uploadForm });
        const uploadData = await readJsonSafely(uploadResponse);
        if (!uploadResponse.ok || !uploadData.success) throw new Error(uploadData.error || uploadData.message || "Could not upload new media.");
        mediaUrl = uploadData.url; mediaType = newMediaFile.type.startsWith("image/") ? "image" : "video"; setUploadProgress(70);
      } else if (newMediaUrl.trim() && newMediaUrl.trim() !== editingServicePost.media_url) {
        mediaUrl = newMediaUrl.trim();
        mediaType = isImageUrl(mediaUrl) ? "image" : isDirectVideoUrl(mediaUrl) ? "video" : "embed";
      }
      const response = await authFetch("/api/time-market/services", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: editingServicePost.id, work_description: workDescription, media_url: mediaUrl, media_type: mediaType }),
      });
      const data = await readJsonSafely(response);
      if (!response.ok || !data.success) throw new Error(data.error || data.message || "Could not update this service.");
      
      setUploadProgress(100);
      const updated = data.service;
      if (updated) {
        setPosts((current) => current.map((item) => String(item.id) === String(updated.id) ? updated : item));
        setMyServices((current) => current.map((item) => String(item.id) === String(updated.id) ? updated : item));
      }
      closeEditor();
    } catch (error) {
      devError("Failed to update service:", error);
      alert(error.message || "Could not update this service.");
    } finally {
      if (isMountedRef.current) { setSaving(false); setUploadProgress(0); }
    }
  }, [editingServicePost, newTitle, subtitle, newMediaFile, newMediaUrl, authFetch, readJsonSafely, closeEditor]);

  const showToast = useCallback((message) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ id: `${Date.now()}`, message });
    toastTimerRef.current = setTimeout(() => { setToast(null); toastTimerRef.current = null; }, TOAST_DURATION_MS);
  }, []);
  useEffect(() => { return () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }; }, []);

  const conversationsInFlightRef = useRef(false);
  const fetchMyConversations = useCallback(async ({ silent = false } = {}) => {
    if (!isLoggedIn || conversationsInFlightRef.current) return;
    conversationsInFlightRef.current = true;
    if (!silent) { setMyConversationsLoading(true); setMyConversationsError(""); }
    try {
      const response = await authFetch("/api/time-market/conversations");
      const data = await readJsonSafely(response);
      if (!response.ok || !data.success) throw new Error(data.error || data.message || "Could not load your conversations.");
      
      if (isMountedRef.current) {
        const nextConversations = Array.isArray(data.conversations) ? data.conversations : [];
        setMyConversations(nextConversations);
        
        const nextTotalUnread = nextConversations.reduce((total, conversation) => total + Number(conversation.unread_count || 0), 0);
        if (previousTotalUnreadRef.current !== null && nextTotalUnread > previousTotalUnreadRef.current) {
          const candidate = [...nextConversations].filter((conversation) => Number(conversation.unread_count || 0) > 0).sort((a, b) => {
            const aTime = Date.parse(a.last_message_at || a.updated_at || a.created_at || 0) || 0;
            const bTime = Date.parse(b.last_message_at || b.updated_at || b.created_at || 0) || 0;
            return bTime - aTime;
          })[0];
          
          if (candidate) {
            const dedupeKey = `${candidate.id}:${candidate.last_message_at || candidate.updated_at || ""}`;
            if (!notifiedMessageKeysRef.current.has(dedupeKey)) {
              notifiedMessageKeysRef.current.add(dedupeKey);
              const iAmProvider = String(candidate.provider_id) === String(user?.id);
              const partnerName = iAmProvider ? candidate.customer_full_name || "Someone" : candidate.provider_full_name || candidate.service_provider_name || "Someone";
              showToast(`New message from ${partnerName}`);
            }
          }
        }
        previousTotalUnreadRef.current = nextTotalUnread;
      }
    } catch (error) {
      if (isMountedRef.current && !silent) setMyConversationsError(error.message || "Could not load your conversations.");
    } finally {
      conversationsInFlightRef.current = false;
      if (isMountedRef.current && !silent) setMyConversationsLoading(false);
    }
  }, [isLoggedIn, authFetch, readJsonSafely, user, showToast]);

  useEffect(() => {
    if (isLoggedIn) {
      previousTotalUnreadRef.current = null;
      notifiedMessageKeysRef.current = new Set();
      fetchMyConversations();
    } else {
      setMyConversations([]);
      previousTotalUnreadRef.current = 0;
    }
  }, [isLoggedIn, fetchMyConversations]);

  useEffect(() => {
    if (!isLoggedIn) return undefined;
    let intervalId = setInterval(() => { if (!document.hidden) fetchMyConversations({ silent: true }); }, INBOX_POLL_INTERVAL_MS);
    const handleVisible = () => { if (!document.hidden) fetchMyConversations({ silent: true }); };
    document.addEventListener("visibilitychange", handleVisible);
    return () => { clearInterval(intervalId); document.removeEventListener("visibilitychange", handleVisible); };
  }, [isLoggedIn, fetchMyConversations]);

  const unreadCountsByPost = useMemo(() => {
    const counts = {};
    for (const conversation of myConversations) {
      const postId = String(conversation.service_post_id || "");
      if (!postId) continue;
      const unread = Number(conversation.unread_count || 0);
      counts[postId] = (counts[postId] || 0) + unread;
    }
    return counts;
  }, [myConversations]);

  const totalUnreadCount = useMemo(() => myConversations.reduce((total, conversation) => total + Number(conversation.unread_count || 0), 0), [myConversations]);

  const openMyInbox = useCallback((filterPostId = null) => {
    if (!isLoggedIn || !user) { openAuthModal("login", { type: "inbox", filterPostId }); return; }
    setMyInboxFilterPostId(filterPostId); setShowMyInbox(true); fetchMyConversations();
  }, [isLoggedIn, user, openAuthModal, fetchMyConversations]);

  const openInboxFromRail = useCallback(() => { openMyInbox(null); }, [openMyInbox]);

  const closeChat = useCallback(() => {
    setShowChat(false); setChatPartner(null);
    if (isLoggedIn) fetchMyConversations();
  }, [isLoggedIn, fetchMyConversations]);

  const startChatWithPost = useCallback((post) => {
    setChatPartner({
      servicePostId: String(post.id),
      conversationId: post.conversation_id ? String(post.conversation_id) : "",
      providerId: String(post.provider_id || "").trim(),
      providerPhone: normalizeWhatsAppNumber(post.creator_identity || ""),
      name: post.creator_name || post.service_provider_name || "Provider",
      avatar: post.logo_url || "",
      headline: post.service_charge_per_minute || post.title || "",
      serviceName: post.service_name || post.service_title || "",
      serviceMediaUrl: post.media_url || "",
      verified: Boolean(post.verified),
    });
    setShowChat(true); pauseAllVideos();
  }, [pauseAllVideos]);

  const callProvider = useCallback((post) => {
    const callPhone = normalizeWhatsAppNumber(post.creator_identity || "");
    if (!callPhone) return;
    if (!isLoggedIn || !user) { openAuthModal("login", { type: "call", post }); return; }
    window.location.href = `tel:+${callPhone}`;
  }, [isLoggedIn, user, openAuthModal]);

  const openInboxForPost = useCallback((post) => {
    if (isLoggedIn && user && isSameProviderAsPost(post, user)) {
      showToast("This is your post. Open the envelope Inbox to reply to customers.");
      return;
    }
    if (!isLoggedIn || !user) { openAuthModal("login", { type: "message", post }); return; }
    const viewerId = String(user?.id || "").trim();
    const ownerId = String(post.provider_id || "").trim();
    const existingConversation = isLoggedIn ? myConversations.find((conversation) => {
      if (String(conversation.service_post_id || "") !== String(post.id || "")) return false;
      const buyerId = String(conversation.customer_provider_id || "").trim();
      const sellerId = String(conversation.provider_id || "").trim();
      return Boolean(viewerId && buyerId === viewerId && (!ownerId || sellerId === ownerId));
    }) : null;
    startChatWithPost(existingConversation ? { ...post, conversation_id: existingConversation.id } : post);
  }, [isLoggedIn, user, myConversations, showToast, startChatWithPost, openAuthModal]);

  const openConversationFromInbox = useCallback((conversation) => {
    const iAmProvider = String(conversation.provider_id) === String(user?.id);
    const partnerName = iAmProvider ? conversation.customer_full_name || "Customer" : conversation.provider_full_name || conversation.service_provider_name || "Provider";
    const partnerAvatar = iAmProvider ? conversation.customer_profile_image_url || "" : conversation.provider_profile_image_url || "";
    const partnerVerified = iAmProvider ? conversation.customer_verification_status === "verified" : conversation.provider_verification_status === "verified";
    const partnerPhone = normalizeWhatsAppNumber((iAmProvider ? conversation.customer_phone : conversation.provider_phone) || "");
    setChatPartner({
      conversationId: String(conversation.id),
      servicePostId: String(conversation.service_post_id || ""),
      name: partnerName, avatar: partnerAvatar,
      headline: conversation.service_charge_per_minute || "",
      serviceName: conversation.service_name || "",
      serviceMediaUrl: conversation.service_media_url || "",
      verified: Boolean(partnerVerified),
      providerPhone: partnerPhone,
    });
    setShowMyInbox(false); setShowChat(true); pauseAllVideos();
  }, [user, pauseAllVideos]);

  const openProviderProfile = useCallback((post) => { setProviderProfileTarget(post); setShowProviderProfile(true); }, []);
  const closeProviderProfile = useCallback(() => { setShowProviderProfile(false); setProviderProfileTarget(null); }, []);

  const openMyProfile = useCallback((contextPost = null) => {
    if (!user) return;
    setProfileFullName(user.full_name || ""); setProfileServiceName(user.service_provider_name || "");
    setProfileServicesOffered(user.services_offered || ""); setProfileError("");
    setProfilePhotoFile(null); setProfilePhotoPreview(""); setProfileEditContextPost(contextPost);
    setShowMyProfile(true);
  }, [user]);

  const saveMyProfile = useCallback(async () => {
    setProfileSaving(true); setProfileError("");
    try {
      let profileImageUrl = user?.profile_image_url || "";
      if (profilePhotoFile === "remove") {
        profileImageUrl = "";
      } else if (profilePhotoFile) {
        const uploadForm = new FormData();
        uploadForm.append("file", profilePhotoFile); uploadForm.append("kind", "profile_image");
        const uploadResponse = await authFetch("/api/home/upload", { method: "POST", body: uploadForm });
        const uploadData = await readJsonSafely(uploadResponse);
        if (!uploadResponse.ok || !uploadData.success || !uploadData.url) throw new Error(uploadData.error || uploadData.message || "Could not upload your profile photo.");
        profileImageUrl = uploadData.url;
      }
      const response = await authFetch("/api/time-market/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: profileFullName.trim(), service_provider_name: profileServiceName.trim(), services_offered: profileServicesOffered.trim(), profile_image_url: profileImageUrl }),
      });
      const data = await readJsonSafely(response);
      if (!response.ok || !data.success) throw new Error(data.error || data.message || "Could not update your profile.");
      setUser(data.provider); setUserData(data.provider);
      setPosts((current) => current.map((post) => String(post.provider_id) === String(data.provider.id) ? { ...post, creator_name: data.provider.service_provider_name, service_provider_name: data.provider.service_provider_name, logo_url: data.provider.profile_image_url || profileImageUrl || "" } : post));
      setShowMyProfile(false);
    } catch (error) {
      setProfileError(error.message || "Could not update your profile.");
    } finally {
      if (isMountedRef.current) setProfileSaving(false);
    }
  }, [authFetch, readJsonSafely, user, profileFullName, profileServiceName, profileServicesOffered, profilePhotoFile, setUserData]);

  const deleteMyProviderAccount = useCallback(async () => {
    try {
      const response = await authFetch("/api/time-market/profile", { method: "DELETE" });
      const data = await readJsonSafely(response);
      if (!response.ok || !data.success) throw new Error(data.error || data.message || "Could not delete your provider profile.");
      setShowMyProfile(false); setSessionToken(""); setUserData(null); setUser(null); setIsLoggedIn(false);
      setPosts((current) => current.filter((post) => String(post.provider_id) !== String(user?.id)));
    } catch (error) {
      setProfileError(error.message || "Could not delete your provider profile.");
    } finally { setProfileDeleteConfirming(false); }
  }, [authFetch, readJsonSafely, setSessionToken, setUserData, user]);

  const openEditListingFromProfile = useCallback(() => {
    if (!profileEditContextPost) return;
    setShowMyProfile(false); openServiceEdit(profileEditContextPost);
  }, [profileEditContextPost, openServiceEdit]);

  const fetchMyServices = useCallback(async () => {
    setMyServicesLoading(true); setMyServicesError("");
    try {
      const response = await authFetch("/api/time-market/services");
      const data = await readJsonSafely(response);
      if (!response.ok || !data.success) throw new Error(data.error || data.message || "Could not load your services.");
      if (isMountedRef.current) setMyServices(Array.isArray(data.services) ? data.services : []);
    } catch (error) {
      if (isMountedRef.current) setMyServicesError(error.message || "Could not load your services.");
    } finally {
      if (isMountedRef.current) setMyServicesLoading(false);
    }
  }, [authFetch, readJsonSafely]);

  const openMyServices = useCallback(() => {
    if (!isLoggedIn || !user) { openAuthModal("login"); return; }
    setShowMyServices(true); fetchMyServices();
  }, [isLoggedIn, user, openAuthModal, fetchMyServices]);

  const deleteMyService = useCallback(async (postId) => {
    if (!window.confirm("Delete this service? This cannot be undone.")) return;
    try {
      const response = await authFetch("/api/time-market/services", {
        method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ post_id: postId }),
      });
      const data = await readJsonSafely(response);
      if (!response.ok || !data.success) throw new Error(data.error || data.message || "Could not delete this service.");
      setMyServices((current) => current.filter((item) => String(item.id) !== String(postId)));
      setPosts((current) => current.filter((item) => String(item.id) !== String(postId)));
    } catch (error) { alert(error.message || "Could not delete this service."); }
  }, [authFetch, readJsonSafely]);

  const getReactedStorageKey = useCallback((providerId) => `time-market-reacted:${providerId || "anon"}`, []);
  const loadReactedFromStorage = useCallback((providerId) => {
    try { const raw = localStorage.getItem(getReactedStorageKey(providerId)); const parsed = raw ? JSON.parse(raw) : {}; return parsed && typeof parsed === "object" ? parsed : {}; } catch { return {}; }
  }, [getReactedStorageKey]);

  const persistReacted = useCallback((providerId, postId) => {
    try {
      const key = getReactedStorageKey(providerId);
      const current = loadReactedFromStorage(providerId);
      current[postId] = true;
      localStorage.setItem(key, JSON.stringify(current));
    } catch { /* ignore */ }
  }, [getReactedStorageKey, loadReactedFromStorage]);

  const sendReaction = useCallback(async (post) => {
    const postId = String(post?.id ?? "");
    if (!postId || !user?.phone) return;
    setReactingPostId(postId);
    try {
      const response = await fetch(`${API_URL}/api/home/react`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ post_id: postId, phone: user.phone }),
      });
      const data = await readJsonSafely(response);
      
      if (data.already_reacted) {
        setReactedPosts((current) => ({ ...current, [postId]: true }));
        persistReacted(user.id, postId);
        if (data.real_reactions !== undefined || data.displayed_reactions !== undefined) {
          setPosts((currentPosts) => currentPosts.map((item) => String(item.id) === postId ? { ...item, real_reactions: data.real_reactions ?? item.real_reactions, manual_reactions: data.manual_reactions ?? item.manual_reactions, displayed_reactions: data.displayed_reactions ?? item.displayed_reactions } : item));
        }
        return;
      }
      if (!data.success) { alert(data.error || data.message || "Failed to react to this service."); return; }
      
      setReactedPosts((current) => ({ ...current, [postId]: true }));
      persistReacted(user.id, postId);
      setPosts((currentPosts) => currentPosts.map((item) => String(item.id) === postId ? { ...item, real_reactions: data.real_reactions, manual_reactions: data.manual_reactions, displayed_reactions: data.displayed_reactions } : item));
    } catch (error) {
      devError("Failed to react:", error); alert("Failed to react to this service. Please try again.");
    } finally { if (isMountedRef.current) setReactingPostId(null); }
  }, [readJsonSafely, user, persistReacted]);

  const reactToPost = useCallback((post) => {
    if (!isLoggedIn || !user) { openAuthModal("login", { type: "react", post }); return; }
    const postId = String(post?.id ?? "");
    if (!postId || reactedPosts[postId] || reactingPostId === postId) return;
    sendReaction(post);
  }, [isLoggedIn, user, openAuthModal, reactedPosts, reactingPostId, sendReaction]);

  useEffect(() => {
    if (!pendingAuthResolution || !isLoggedIn || !user) return;
    const { action, provider } = pendingAuthResolution;
    setPendingAuthResolution(null);
    if (action.type === "offer") { openServiceForm(provider || user, action.postType || "offer"); return; }
    if (action.type === "message" && action.post) { openInboxForPost(action.post); return; }
    if (action.type === "call" && action.post) { callProvider(action.post); return; }
    if (action.type === "inbox") { openMyInbox(action.filterPostId || null); return; }
    if (action.type === "react" && action.post) { sendReaction(action.post); }
  }, [pendingAuthResolution, isLoggedIn, user, openServiceForm, openInboxForPost, callProvider, openMyInbox, sendReaction]);

  useEffect(() => {
    if (!user?.id || !posts.length) return;
    const stored = loadReactedFromStorage(user.id);
    const relevant = posts.reduce((acc, post) => {
      const postId = String(post.id);
      if (stored[postId]) acc[postId] = true;
      return acc;
    }, {});
    if (Object.keys(relevant).length) setReactedPosts((current) => ({ ...relevant, ...current }));
  }, [user, posts, loadReactedFromStorage]);

  const sharePost = useCallback((post) => {
    const title = String(post?.title || "Market service").trim();
    const message = String(post?.subtitle || "").trim();
    const shareText = [title, message, window.location.href].filter(Boolean).join("\n\n");
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }, []);

  const memoizedPosts = useMemo(() => {
    return posts.filter((post) => {
      const type = getPostType(post);
      if (activeCategory === "social-life") return type === "need";
      return type !== "need";
    });
  }, [posts, activeCategory]);

  const emptySectionAction = activeCategory === "social-life" ? { label: "Ask for help", postType: "need" } : { label: "Create a post", postType: "offer" };

  let mainContent;
  
  if (activeCategory === "social-life") {
    mainContent = <SocialLifeLanding />;
  } else if (loading) {
    mainContent = <FeedSkeleton />;
  } else if (!memoizedPosts.length) {
    mainContent = (
      <div className="empty-state">
        <p>{activeCategory === "social-life" ? "No one is asking for help yet." : "No media posts are available yet."}</p>
      </div>
    );
  } else {
    mainContent = (
      <>
        <main className="home-feed">
          {memoizedPosts.map((post, index) => {
            const postId = String(post.id ?? index);
            const isOwner = isLoggedIn && user && String(post.provider_id ?? "") === String(user.id);
            return (
              <ServicePost key={postId} post={post} index={index} postId={postId} isActive={activePostIndex === index} reacted={Boolean(reactedPosts[postId])} reacting={reactingPostId === postId} unreadCount={unreadCountsByPost[postId] || 0} mediaAspectRatio={mediaAspectRatios[postId]} onMediaAspectRatio={handleMediaAspectRatio} isOwner={isOwner} postRefCallback={getPostRefCallback(index)} videoRefCallback={getVideoRefCallback(index)} onVideoPlay={noop} onVideoPause={noop} onViewProfile={openProviderProfile} onSellTime={handleOfferTime} onContactProvider={openInboxForPost} onCallProvider={callProvider} onOpenInbox={openInboxFromRail} onReact={reactToPost} onZoomImage={setZoomImage} onShare={sharePost} isSocialLife={activeCategory === "social-life"} />
            );
          })}
        </main>
        {hasMore && (
          <div className="load-more-wrap">
            <button type="button" className="load-more-button" onClick={loadMorePosts} disabled={loadingMore}>{loadingMore ? "Loading..." : "Load more services"}</button>
          </div>
        )}
      </>
    );
  }

  return (
    <div className={`home-page${activeCategory === "social-life" ? " is-social-life-mode" : ""}`}>
      <TimeMarketTopBar activeCategory={activeCategory} isLoggedIn={isLoggedIn} user={user} onAuth={openAuthModal} onLogout={handleLogout} onOpenMyProfile={() => (isLoggedIn ? openMyProfile() : openAuthModal("login"))} onOpenMyServices={openMyServices} onOpenMyTime={() => setShowMyTime(true)} onOpenMyInbox={() => openMyInbox(null)} onCreatePost={openEditor} unreadCount={totalUnreadCount} onOpenInfo={(topic) => setShowInfoModal(topic)} />
      {mainContent}
      {toast && <div className="gwamo-toast" role="status" aria-live="polite">{toast.message}</div>}
      {showEditor && (
        <ServiceEditorModal newCreatorName={newCreatorName} setNewCreatorName={setNewCreatorName} newCreatorIdentity={newCreatorIdentity} setNewCreatorIdentity={setNewCreatorIdentity} newTitle={newTitle} setNewTitle={setNewTitle} newMediaUrl={newMediaUrl} setNewMediaUrl={setNewMediaUrl} subtitle={subtitle} setSubtitle={setSubtitle} postType={postType} setPostType={setPostType} postHeadline={postHeadline} setPostHeadline={setPostHeadline} serviceCategory={serviceCategory} setServiceCategory={setServiceCategory} postLocation={postLocation} setPostLocation={setPostLocation} priceUnit={priceUnit} setPriceUnit={setPriceUnit} availability={availability} setAvailability={setAvailability} exchangeNeed={exchangeNeed} setExchangeNeed={setExchangeNeed} allowCashBalance={allowCashBalance} setAllowCashBalance={setAllowCashBalance} momentKind={momentKind} setMomentKind={setMomentKind} handleLogoChange={handleLogoChange} logoPreview={logoPreview} handleMediaFileChange={handleMediaFileChange} mediaPreview={mediaPreview} mediaPreviewType={mediaPreviewType} applyChanges={editingServicePost ? saveServiceEdit : applyChanges} closeEditor={closeEditor} saving={saving} uploadProgress={uploadProgress} compressingMedia={compressingMedia} isEdit={Boolean(editingServicePost)} />
      )}
      {showAuthModal && (
        <AuthModal isOpen={showAuthModal} mode={authMode} phone={authPhone} setPhone={setAuthPhone} fullName={authFullName} setFullName={setAuthFullName} pin={authPin} setPin={setAuthPin} confirmPin={authConfirmPin} setConfirmPin={setAuthConfirmPin} error={authError} successMessage={authSuccessMessage} loading={authLoading} onRegister={handleRegister} onLogin={handleLogin} onClose={closeAuthModal} onForgotPin={openPinReset} onOpenActivation={openActivationModal} onSwitchMode={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthError(""); setAuthSuccessMessage(""); setAuthPin(""); setAuthConfirmPin(""); }} />
      )}
      {showPinResetModal && (
        <PinResetModal step={pinResetStep} phone={pinResetPhone} setPhone={setPinResetPhone} request={pinResetRequest} newPin={pinResetNewPin} setNewPin={setPinResetNewPin} confirmPin={pinResetConfirmPin} setConfirmPin={setPinResetConfirmPin} error={pinResetError} loading={pinResetLoading} onRequest={requestPinReset} onCheckStatus={checkPinResetStatus} onComplete={completePinReset} onRestart={() => { setPinResetStep("request"); setPinResetRequest(null); setPinResetError(""); setPinResetNewPin(""); setPinResetConfirmPin(""); }} onClose={closePinReset} />
      )}
      {pendingPhoneReview && (
        <PendingPhoneReviewModal review={pendingPhoneReview} onClose={() => setPendingPhoneReview(null)} />
      )}
      {showActivationModal && (
        <ActivationCodeModal phone={activationPhone} setPhone={setActivationPhone} code={activationCode} setCode={setActivationCode} newPin={activationNewPin} setNewPin={setActivationNewPin} confirmPin={activationConfirmPin} setConfirmPin={setActivationConfirmPin} error={activationError} loading={activationLoading} onSubmit={submitActivationCode} onClose={() => { setShowActivationModal(false); setActivationCode(""); setActivationNewPin(""); setActivationConfirmPin(""); setActivationError(""); }} />
      )}
      {rejectedAccountInfo && (
        <RejectedAccountModal info={rejectedAccountInfo} onClose={() => setRejectedAccountInfo(null)} onRegisterAgain={() => { setRejectedAccountInfo(null); openAuthModal("register"); }} />
      )}
      {zoomImage && (
        <ZoomableImageViewer src={zoomImage} alt="Profile" onClose={() => setZoomImage("")} />
      )}
      {showChat && chatPartner && (
        <ChatModal partner={chatPartner} currentUser={user} getSessionToken={getSessionToken} apiUrl={API_URL} onClose={closeChat} onZoomImage={setZoomImage} onRequireAuth={() => openAuthModal("login")} />
      )}
      {showProviderProfile && providerProfileTarget && (
        <ProviderProfileSheet post={providerProfileTarget} isOwner={Boolean(isLoggedIn && user && isSameProviderAsPost(providerProfileTarget, user))} onClose={closeProviderProfile} onMessage={() => { const target = providerProfileTarget; closeProviderProfile(); openInboxForPost(target); }} onShare={() => sharePost(providerProfileTarget)} />
      )}
      {showMyProfile && (
        <ProfileEditModal user={user} fullName={profileFullName} setFullName={setProfileFullName} serviceName={profileServiceName} setServiceName={setProfileServiceName} servicesOffered={profileServicesOffered} setServicesOffered={setProfileServicesOffered} photoPreview={profilePhotoPreview} onPhotoChange={handleProfilePhotoChange} onRemovePhoto={removeProfilePhoto} photoRemoved={profilePhotoFile === "remove"} contextPost={profileEditContextPost} onEditListing={openEditListingFromProfile} onOpenServices={() => { setShowMyProfile(false); openMyServices(); }} onLogout={() => { setShowMyProfile(false); handleLogout(); }} deleteConfirming={profileDeleteConfirming} setDeleteConfirming={setProfileDeleteConfirming} onDeleteAccount={deleteMyProviderAccount} saving={profileSaving} error={profileError} onSave={saveMyProfile} onClose={() => { setShowMyProfile(false); revokeObjectUrl(profilePhotoPreview); setProfilePhotoFile(null); setProfilePhotoPreview(""); setProfileDeleteConfirming(false); }} />
      )}
      {showMyServices && (
        <MyServicesSheet services={myServices} loading={myServicesLoading} error={myServicesError} onEdit={openServiceEdit} onDelete={deleteMyService} onClose={() => setShowMyServices(false)} onCreateNew={() => { setShowMyServices(false); handleOfferTime(); }} />
      )}
      {showMyTime && <MyTimeSheet onClose={() => setShowMyTime(false)} />}
      {showMyInbox && (
        <MyInboxSheet conversations={myConversations} loading={myConversationsLoading} error={myConversationsError} currentUserId={user?.id} filterServicePostId={myInboxFilterPostId} onOpenConversation={openConversationFromInbox} onClose={() => { setShowMyInbox(false); setMyInboxFilterPostId(null); }} />
      )}
      {showInfoModal && (
        <InfoModal topic={showInfoModal} onClose={() => setShowInfoModal(null)} />
      )}
      <nav className="bottom-nav" aria-label="Primary">
        <div className="bottom-nav-scroll">
          {CATEGORY_TABS.map((tab, tabIndex) => {
            const isActive = activeCategory === tab.key;
            const navItem = (
              <button
                type="button"
                className={`bottom-nav-item${isActive ? " is-active" : ""}`}
                onClick={() => { setActivePostIndex(0); setActiveCategory(tab.key); window.scrollTo(0, 0); }}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="bottom-nav-icon" aria-hidden="true">{tab.emoji}</span>
                <span>{tab.label}</span>
              </button>
            );
            return <Fragment key={tab.key}>{navItem}</Fragment>;
          })}
        </div>
      </nav>

      <HomeStyles />
    </div>
  );
}

// ==========================================
// SUB-COMPONENTS & MODALS
// ==========================================
const FeedSkeleton = memo(function FeedSkeleton() {
  return null;
});
FeedSkeleton.displayName = "FeedSkeleton";

const TimeMarketTopBar = memo(({ activeCategory, isLoggedIn, user, onAuth, onLogout, onOpenMyProfile, onOpenMyServices, onOpenMyTime, onOpenMyInbox, onCreatePost, unreadCount, onOpenInfo }) => {
  const [showMenu, setShowMenu] = useState(false);
  const closeMenu = () => setShowMenu(false);
  const run = (action) => () => { closeMenu(); action(); };
  const signedIn = Boolean(isLoggedIn && user);
  const verification = signedIn ? getVerificationStatus(user) : null;
  const displayName = user?.service_provider_name || user?.full_name || "My account";
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
              <button type="button" className="topbar-icon-button" onClick={onOpenMyInbox} aria-label={unreadCount > 0 ? `Inbox, ${unreadCount} unread` : "Inbox"}>
                <span className="inbox-icon-wrap">
                  <Inbox size={23} strokeWidth={2} aria-hidden="true" />
                  {unreadCount > 0 && <span className="inbox-unread-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
                </span>
              </button>
              <button type="button" className={`account-avatar-button ${verification.className}`} onClick={onOpenMyProfile} aria-label="My profile">
                <img src={user?.profile_image_url || DEFAULT_LOGO} alt="" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = DEFAULT_LOGO; }} />
              </button>
            </>
          ) : (
            <button type="button" className="login-pill" onClick={onCreatePost}>
              <Plus size={16} aria-hidden="true" />
              <span>Say some</span>
            </button>
          )}
          <button type="button" className="menu-button" onClick={() => setShowMenu((value) => !value)} aria-label="Menu" aria-haspopup="true" aria-expanded={showMenu}>
            <Menu size={24} strokeWidth={2} />
          </button>
          {showMenu && <div className="dropdown-backdrop" onClick={closeMenu} aria-hidden="true" />}
          {showMenu && (
            <div className="dropdown-menu account-dropdown">
              <button type="button" className="dropdown-item dropdown-create-post" onClick={run(onCreatePost)}><Plus size={18} aria-hidden="true" />Create a post</button>
              <div className="dropdown-divider" />
              {signedIn ? (
                <>
                  <div className="account-dropdown-header">
                    <span className="account-dropdown-name">{displayName}</span>
                    <VerificationTag info={verification} size={13} />
                  </div>
                  <button type="button" className="dropdown-item" onClick={run(onOpenMyProfile)}><User size={18} aria-hidden="true" />My profile</button>
                  <button type="button" className="dropdown-item" onClick={run(onOpenMyInbox)}>
                    <Inbox size={18} aria-hidden="true" />Inbox
                    {unreadCount > 0 && <span className="dropdown-item-count">{unreadCount > 99 ? "99+" : unreadCount}</span>}
                  </button>
                  <button type="button" className="dropdown-item" onClick={run(onOpenMyServices)}><ShoppingBasket size={18} aria-hidden="true" />My services</button>
                  <button type="button" className="dropdown-item" onClick={run(onOpenMyTime)}><Wallet size={18} aria-hidden="true" />My time</button>
                </>
              ) : null}
              <div className="dropdown-divider" />
              <button type="button" className="dropdown-item" onClick={run(() => onOpenInfo("about"))}><Info size={18} aria-hidden="true" />About Gwamo</button>
              <button type="button" className="dropdown-item" onClick={run(() => onOpenInfo("help"))}><HelpCircle size={18} aria-hidden="true" />Help</button>
              <button type="button" className="dropdown-item" onClick={run(() => onOpenInfo("privacy"))}><ShieldCheck size={18} aria-hidden="true" />Privacy policy</button>
              {signedIn && (
                <>
                  <div className="dropdown-divider" />
                  <button type="button" className="dropdown-item dropdown-item-danger" onClick={run(onLogout)}><LogOut size={18} aria-hidden="true" />Log out</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
});
TimeMarketTopBar.displayName = "TimeMarketTopBar";

const ComingSoonPanel = memo(({ category, onBack }) => {
  const meta = CATEGORY_META[category] || { label: "This section", blurb: "This section is coming soon." };
  return (
    <div className="coming-soon-panel">
      <h2>{meta.label}</h2>
      <p>{meta.blurb}</p>
      <button type="button" className="empty-button" onClick={onBack}>Back to Market</button>
    </div>
  );
});
ComingSoonPanel.displayName = "ComingSoonPanel";

const ServicePost = memo(function ServicePost({
  post, index, postId, isActive, reacted, reacting, mediaAspectRatio,
  onMediaAspectRatio, postRefCallback, videoRefCallback, onReact,
  onShare, onContactProvider, onCallProvider, isSocialLife,
}) {
  const mediaUrl = post.media_url || post.video_url || DEFAULT_VIDEO;
  const mediaType = String(post.media_type || "").toLowerCase();
  const isImage = mediaType === "image" || (!mediaType && isImageUrl(mediaUrl));
  const isVideo = mediaType === "video" || (!mediaType && isDirectVideoUrl(mediaUrl));
  const isEmbed = mediaType === "embed" || (!isImage && !isVideo);
  const title = String(post.service_name || post.service_title || post.title || "").trim();
  const description = String(post.service_description || post.description || post.work_description || post.subtitle || post.services_offered || "").trim();
  const incomingComments = Array.isArray(post.comments) ? post.comments : Array.isArray(post.recent_comments) ? post.recent_comments : Array.isArray(post.comment_list) ? post.comment_list : [];
  const [comments, setComments] = useState(incomingComments);
  const [commentIndex, setCommentIndex] = useState(0);
  const [rotationPaused, setRotationPaused] = useState(false);
  const [replyExpanded, setReplyExpanded] = useState(false);
  const [avatarZoomOpen, setAvatarZoomOpen] = useState(false);
  const [replyStep, setReplyStep] = useState(0);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyName, setReplyName] = useState("");
  const [replyFlag, setReplyFlag] = useState("🇷🇼");
  const [replyMessage, setReplyMessage] = useState("");
  const [replyPhoto, setReplyPhoto] = useState(null);
  const [replySending, setReplySending] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [saved, setSaved] = useState(() => {
    try { return JSON.parse(localStorage.getItem("gwamo-saved-posts") || "[]").includes(String(post.id)); }
    catch { return false; }
  });
  const [expanded, setExpanded] = useState(false);
  const dateValue = post.created_at || post.posted_at || post.createdAt || post.date || "";
  const dateLabel = dateValue && !Number.isNaN(new Date(dateValue).getTime())
    ? new Date(dateValue).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
    : "";
  const reactionCount = Number(post.displayed_reactions || post.real_reactions || 0);
  const commentCount = Math.max(Number(post.comment_count || 0), comments.length);
  const aspectClass = mediaAspectRatio && mediaAspectRatio < 0.85 ? "is-portrait" : mediaAspectRatio && mediaAspectRatio > 1.2 ? "is-landscape" : "is-square";
  const mediaRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/home/comments?post_id=${encodeURIComponent(String(postId))}`)
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled && data?.success && Array.isArray(data.comments)) {
          setComments(data.comments);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [postId]);

  useEffect(() => {
    setCommentIndex(0);
    if (comments.length < 2 || rotationPaused) return undefined;
    const timer = window.setInterval(() => { setCommentIndex((current) => (current + 1) % comments.length); setReplyExpanded(false); }, 5500);
    return () => window.clearInterval(timer);
  }, [postId, comments.length, rotationPaused]);

  const handleMediaLoad = useCallback((event) => {
    const element = event.currentTarget;
    const width = element.naturalWidth || element.videoWidth;
    const height = element.naturalHeight || element.videoHeight;
    if (width && height) onMediaAspectRatio(postId, width / height);
  }, [onMediaAspectRatio, postId]);
  const handleSave = useCallback(() => {
    try {
      const current = JSON.parse(localStorage.getItem("gwamo-saved-posts") || "[]");
      const next = saved ? current.filter((id) => String(id) !== String(post.id)) : [...current.filter((id) => String(id) !== String(post.id)), String(post.id)];
      localStorage.setItem("gwamo-saved-posts", JSON.stringify(next));
      setSaved(!saved);
    } catch { setSaved(!saved); }
  }, [post.id, saved]);
  const submitReply = useCallback(async (event) => {
    event.preventDefault();
    const name = replyName.trim();
    const message = replyMessage.trim();
    if (!name || !message) { setReplyError("Please complete your name and message."); return; }
    if (replyPhoto && replyPhoto.size > 5 * 1024 * 1024) {
      setReplyError("Maximum profile picture size is 5 MB. Choose a smaller file or continue without a picture.");
      return;
    }
    if (message.length > 500) { setReplyError("Please keep your message under 500 characters."); return; }
    setReplySending(true); setReplyError("");
    try {
      const form = new FormData();
      form.append("post_id", String(postId));
      form.append("name", name);
      form.append("country_flag", replyFlag);
      form.append("comment", message);
      if (replyPhoto) form.append("profile_image", replyPhoto);
      const response = await fetch(`${API_URL}/api/home/comment`, { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.error || data.message || `Reply failed (${response.status}).`);
      const savedReply = data.comment || {
        id: `local-${Date.now()}`, post_id: postId, commenter_name: name,
        country_flag: replyFlag, comment: message, profile_image_url: ""
      };
      setComments((current) => [savedReply, ...current]);
      setCommentIndex(0);
      setReplyMessage(""); setReplyPhoto(null); setReplyStep(0); setReplyOpen(false);
    } catch (error) { setReplyError(error.message || "Could not send your reply. Please try again."); }
    finally { setReplySending(false); }
  }, [postId, replyName, replyFlag, replyMessage, replyPhoto]);
  const activeComment = comments.length ? comments[commentIndex % comments.length] : null;
  const commentText = activeComment?.text_content || activeComment?.comment || activeComment?.body || activeComment?.text || "";
  const commentName = activeComment?.commenter_name || activeComment?.full_name || activeComment?.name || activeComment?.author_name || "Gwamo member";
  const commentAvatar = activeComment?.profile_image_url || activeComment?.avatar_url || activeComment?.avatar || DEFAULT_LOGO;
  const phone = String(activeComment?.phone || activeComment?.telephone || "");
  const country = String(activeComment?.country_code || activeComment?.country || "").toUpperCase();
  const flag = ({ RW: "🇷🇼", KE: "🇰🇪", UG: "🇺🇬", TZ: "🇹🇿", BI: "🇧🇮", CD: "🇨🇩", US: "🇺🇸", GB: "🇬🇧" })[country]
    || (phone.startsWith("+250") || phone.startsWith("250") ? "🇷🇼" : phone.startsWith("+254") ? "🇰🇪" : phone.startsWith("+256") ? "🇺🇬" : phone.startsWith("+255") ? "🇹🇿" : phone.startsWith("+257") ? "🇧🇮" : phone.startsWith("+243") ? "🇨🇩" : "🌍");
  const postDate = dateLabel || "Recently posted";

  return (
    <article ref={postRefCallback} data-index={index} className="home-post service-reel-card" data-post-id={postId}>
      <div className="post-date-row"><Clock size={15} aria-hidden="true" /><time dateTime={dateValue || undefined}>{postDate}</time></div>
      <div className={`post-media-frame ${aspectClass}`} ref={mediaRef}>
        {isImage ? (
          <img className="home-media" src={mediaUrl} alt={title || "Gwamo post media"} loading="lazy" onLoad={handleMediaLoad} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = IMAGE_FALLBACK_SRC; }} />
        ) : isVideo ? (
          <video className="home-media" src={mediaUrl} controls playsInline preload="metadata" ref={videoRefCallback} onLoadedMetadata={handleMediaLoad} />
        ) : (
          <iframe className="home-media post-embed-media" src={getEmbedUrl(mediaUrl)} title={title || "Gwamo media"} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
        )}
      <div className="post-actions-row social-reaction-actions" aria-label="Social feedback">
        <button
          type="button"
          className="post-action social-reactions-button"
          onClick={() => { setReplyOpen((open) => !open); setReplyStep(0); setReplyError(""); }}
          aria-expanded={replyOpen}
        >
          <span className="social-reaction-emoji" aria-hidden="true">✨</span>
          <span>{replyOpen ? "Close Social Feedback" : "Social Feedback"}</span>
          {commentCount > 0 && <small>{formatCount(commentCount)}</small>}
        </button>
      </div>\n      </div>
      {(title || description) && (
        <div className="post-content-block">
          {title && <h2 className="service-name">{title}</h2>}
          {description && <p className={`post-description${expanded ? " is-expanded" : ""}`}>{renderDescriptionWithLinks(expanded ? description : makeDescriptionPreview(description, 240))}{description.length > 240 && <button type="button" className="tagline-toggle-button" onClick={() => setExpanded((value) => !value)}>{expanded ? " less" : " more"}</button>}</p>}
        </div>
      )}


      <style>{`
        /* Full-bleed card: media frame touches left and right screen edges, card has no background. */
        .home-post.service-reel-card{
          height:calc(100svh - 146px)!important;
          min-height:440px!important;
          max-height:calc(100svh - 146px)!important;
          overflow:hidden!important;
          display:flex!important;
          flex-direction:column!important;
          padding:0!important;
          margin:0!important;
          width:100%!important;
          max-width:100%!important;
          background:transparent!important;
          border:0!important;
          box-shadow:none!important;
          border-radius:0!important;
          scroll-snap-align:start;
        }
        .home-post .post-media-frame{
          flex:1 1 auto!important;
          width:100%!important;
          height:0!important;
          min-height:0!important;
          max-height:none!important;
          aspect-ratio:auto!important;
          overflow:hidden!important;
          margin:0!important;
          padding:0!important;
          background:transparent!important;
        }
        .home-post .post-media-frame .home-media{
          width:100%!important;
          height:100%!important;
          object-fit:contain!important;
          object-position:center top!important;
        }
        .home-post .post-content-block{
          flex:0 0 auto;
          max-height:76px;
          overflow:auto;
          padding-top:7px!important;
          padding-bottom:7px!important;
        }
        .home-post .post-description{
          display:-webkit-box;
          -webkit-line-clamp:2;
          -webkit-box-orient:vertical;
          overflow:hidden;
        }
        .social-reaction-actions{
          flex:0 0 46px!important;
          min-height:46px!important;
          height:46px!important;
          display:flex!important;
          align-items:center!important;
          justify-content:space-between!important;
          gap:8px!important;
          padding:0 14px!important;
          background:transparent!important;
          border:0!important;
          border-top:1px solid rgba(50,190,255,.14)!important;
        }
        .social-reaction-actions .post-action{
          min-height:40px!important;
          width:auto!important;
          border:0!important;
          border-radius:0!important;
          padding:5px 0!important;
          background:transparent!important;
          box-shadow:none!important;
          white-space:nowrap!important;
        }
        .social-reactions-button{
          justify-content:flex-start!important;
          color:#ffd36b!important;
          text-shadow:0 0 8px rgba(255,190,55,.32);
        }
        .social-reaction-emoji{font-size:19px!important}
        .comment-rotation-dots,.reply-rotation-dots{display:none!important}
        .post-replies-chat{padding:14px 16px 10px;background:linear-gradient(145deg,rgba(8,24,52,.96),rgba(5,16,38,.98));border-top:1px solid rgba(70,190,255,.12)}
        .post-replies-chat .rotating-comment{display:flex;align-items:flex-start;gap:11px;padding:13px;border:1px solid rgba(82,185,255,.2);border-radius:16px 16px 16px 5px;background:rgba(17,38,72,.82)}
        .post-replies-chat .comment-avatar-zoom{display:block!important;width:68px!important;height:68px!important;min-width:68px!important;min-height:68px!important;flex:0 0 68px!important;padding:0!important;margin:0!important;overflow:hidden!important;border:2px solid #1caaff!important;border-radius:50%!important;background:#07152b!important;box-shadow:0 0 10px rgba(28,170,255,.28)!important;cursor:zoom-in!important;line-height:0!important}
        .post-replies-chat .comment-avatar-zoom .comment-avatar{display:block!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;min-width:0!important;min-height:0!important;flex:none!important;object-fit:cover!important;object-position:center!important;border:0!important;border-radius:50%!important;margin:0!important;padding:0!important;background:#07152b!important}
        .post-replies-chat .comment-copy{min-width:0;flex:1;margin:0;padding:0}
        .post-replies-chat .comment-copy p{margin:3px 0 2px;line-height:1.45;overflow-wrap:anywhere;color:#e7efff;text-align:left;font-size:clamp(16px,3.6vw,20px)}
        .post-replies-chat .comment-author-row{display:flex;align-items:center;gap:8px;color:#fff;margin:0 0 3px}
        .post-replies-chat .comment-country-flag{font-size:17px}
        .reply-avatar-lightbox{position:fixed;inset:0;z-index:3000;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,.88);backdrop-filter:blur(8px)}
        .reply-avatar-lightbox img{display:block;max-width:min(92vw,680px);max-height:86svh;width:auto;height:auto;object-fit:contain;border-radius:14px;box-shadow:0 18px 70px rgba(0,0,0,.5)}
        .reply-avatar-lightbox button{position:absolute;top:20px;right:20px;width:44px;height:44px;border:0;border-radius:50%;background:#fff;color:#111;font-size:30px;line-height:1}
        .post-reply-chat-form{margin:0 14px 16px;padding:16px;border:1px solid rgba(45,190,255,.35);border-radius:18px;background:linear-gradient(150deg,#101f3b,#07152d);box-shadow:0 12px 30px rgba(0,0,0,.22);color:#eef5ff}
        .reply-chat-topline{display:flex;justify-content:space-between;gap:8px;font-size:13px;font-weight:700;color:#a9c8ed}
        .reply-chat-progress{height:4px;margin:10px 0 16px;background:#253957;border-radius:9px;overflow:hidden}
        .reply-chat-progress span{display:block;height:100%;background:linear-gradient(90deg,#20d68a,#29baff);border-radius:9px;transition:width .2s ease}
        .reply-chat-step{display:flex;flex-direction:column;gap:12px}
        .reply-bot-bubble,.reply-user-bubble{max-width:88%;padding:11px 14px;border-radius:16px;line-height:1.4;font-size:14px}
        .reply-bot-bubble{align-self:flex-start;background:#1a3154;color:#e8f2ff;border-bottom-left-radius:5px}
        .reply-user-bubble{align-self:flex-end;background:#075f49;color:#fff;border-bottom-right-radius:5px}
        .reply-chat-step input:not([type=file]),.reply-chat-step select,.reply-chat-step textarea{width:100%;box-sizing:border-box;min-height:46px;border:1px solid #49617f;border-radius:12px;padding:12px 13px;background:#07152b;color:#fff;font:inherit;font-size:15px;outline:none}
        .reply-chat-step textarea{resize:vertical;min-height:105px}
        .reply-chat-step input:focus,.reply-chat-step select:focus,.reply-chat-step textarea:focus{border-color:#27c9ff;box-shadow:0 0 0 3px rgba(39,201,255,.12)}
        .reply-chat-step button{min-height:43px;border:0;border-radius:12px;padding:10px 16px;background:#12b978;color:#041b17;font-weight:800;font-size:14px}
        .reply-chat-step button:disabled{opacity:.45}
        .reply-chat-buttons{display:flex;gap:9px;justify-content:flex-end}
        .reply-chat-step .reply-back-button{background:#263c5b;color:#eaf2ff}
        .reply-chat-step .reply-skip-button{background:transparent;color:#a9c8ed;min-height:32px;padding:5px;text-decoration:underline}
        .reply-photo-picker{display:flex;align-items:center;justify-content:center;min-height:48px;border:1px dashed #5b789c;border-radius:12px;color:#cde4ff;font-weight:700}
        .reply-photo-picker input{display:none}
        .reply-message-meta{align-self:flex-end;color:#9fb5d3;font-size:12px}
        .reply-chat-error{margin:12px 0 0;padding:10px 12px;border-radius:10px;background:rgba(255,85,85,.12);color:#ffbcbc;font-size:13px}
        @media(max-width:600px){
          .home-post .post-media-frame{max-height:calc(100svh - 245px);min-height:190px}
          .post-replies-chat{padding:12px}
          .post-replies-chat .rotating-comment{min-height:130px;padding:14px}
          .social-reaction-actions{padding:0 10px}
          .social-reaction-actions .post-action{padding:8px 10px;font-size:12px}
        }
        @media(max-width:480px){.post-reply-chat-form{margin:0 10px 14px;padding:13px}.post-replies-chat{padding:12px 11px 8px}}
        .bottom-nav{
          background:rgba(3,8,24,.97)!important;
          border-top:1px solid rgba(31,190,255,.18)!important;
        }
      `}</style>
    </article>
  );
});
ServicePost.displayName = "ServicePost";

export default Home;