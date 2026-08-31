import {
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
  Tv,
  Tag,
  Star,
  Paperclip,
  Image as ImageIcon,
  Video,
  FileText,
  Search,
  CheckCheck,
  Phone,
  Eye,
  EyeOff,
  ImagePlus,
  Zap,
} from "lucide-react";
const API_URL = "https://kitchenbrain.cucina656.workers.dev";
// GWAMO_TV_FULLSCREEN_PUBLIC_CONVERSATION_FINAL_20260831
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
// New in Step 1: silent background refresh intervals. Kept well inside the
// requested 10-15s / ~5s ranges so they read as "lightweight", not "live".
const REACTION_COUNTS_POLL_INTERVAL_MS = 12000;
const INBOX_POLL_INTERVAL_MS = 5000;
const PIN_RESET_STATUS_POLL_INTERVAL_MS = 4000;
const TOAST_DURATION_MS = 4200;
const PERSONAL_PIN_PATTERN = /^\d{8}$/;
const PIN_AUTH_METHOD = "phone_pin";
const CHAT_DRAFT_PREFIX = "gwamo-chat-draft:";
// Stable identity so it never causes ServicePost's memo() to think a prop
// changed - these handlers are currently unused (no-ops), so one shared
// reference for every card in the feed is exactly right.
const noop = () => {};
const CATEGORY_TABS = [
  { key: "time-market", label: "Time Market", icon: Clock },
  {
    key: "social-life",
    label: "Social Life",
    icon: Users,
  },
  {
    key: "market",
    label: "Market",
    icon: ShoppingBasket,
    href: "https://market.com/",
  },
  { key: "tv", label: "TV", icon: Tv },
];
const CATEGORY_META = {
  "social-news": {
    label: "Social News",
    blurb: "Open Social News at social.com.",
  },
  kitchen: {
    label: "Kitchen",
    blurb: "Food and kitchen services are coming to Gwamo.",
  },
  tv: {
    label: "TV",
    blurb: "Video and media content are coming to Gwamo.",
  },
  deals: {
    label: "Deals",
    blurb: "Offers, discounts and useful local deals are coming to Gwamo.",
  },
};
const INFO_CONTENT = {
  about: {
    title: "About Gwamo",
    body: "Every person has time, and that time can have economic value. Gwamo is a market for human time: show who you are, what you can do and how much your time costs, then let people discover you through the feed. Verified providers receive the blue verified badge shown beside their name.",
  },
  help: {
    title: "Help",
    body: 'To offer a service, tap the plus icon and describe what you can do. To contact a provider, tap "Contact me", write your message, then log in with your telephone number and personal PIN when you press Send. Verified providers display a blue check badge beside their name. If you forget your PIN, request a reset and wait for an admin to call your registered number and approve the code shown on your screen.',
  },
  privacy: {
    title: "Privacy Policy",
    body: 'Messages marked "Private conversation" are not public and are intended for the conversation participants. However, authorized Gwamo administrators can access and read any conversation, including one labeled "Private conversation", for moderation, user safety, fraud investigation, support or legal compliance. Gwamo therefore does not describe these chats as end-to-end encrypted. Your telephone number is used for account identity and verification calls. Your personal PIN must be stored by the server only as a secure one-way hash; Gwamo staff should never ask you to reveal the PIN. By using messaging, you acknowledge this administrator-access policy.',
  },
};
function isDirectVideoUrl(url = "") {
  const clean = String(url).toLowerCase().split("?")[0].split("#")[0];
  return (
    clean.endsWith(".mp4") ||
    clean.endsWith(".webm") ||
    clean.endsWith(".ogg") ||
    clean.endsWith(".mov") ||
    clean.endsWith(".m4v") ||
    clean.endsWith(".mkv") ||
    clean.endsWith(".avi")
  );
}
function isImageUrl(url = "") {
  const clean = String(url).toLowerCase().split("?")[0].split("#")[0];
  return (
    clean.endsWith(".jpg") ||
    clean.endsWith(".jpeg") ||
    clean.endsWith(".png") ||
    clean.endsWith(".gif") ||
    clean.endsWith(".webp") ||
    clean.endsWith(".bmp") ||
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
  if (number >= 1000000) {
    return `${(number / 1000000).toFixed(1).replace(".0", "")}M`;
  }
  if (number >= 1000) {
    return `${(number / 1000).toFixed(1).replace(".0", "")}K`;
  }
  return String(number);
}
const DESCRIPTION_PREVIEW_LENGTH = 96;
function makeDescriptionPreview(
  value = "",
  maxLength = DESCRIPTION_PREVIEW_LENGTH,
) {
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
        <a
          key={`${part}-${index}`}
          className="description-link"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
        >
          {part}
        </a>
      );
    });
}
function normalizeWhatsAppNumber(value = "") {
  const raw = String(value || "").trim();
  const compact = raw.replace(/[\s().-]/g, "");
  if (/^07[2389]\d{7}$/.test(compact)) {
    return `250${compact.slice(1)}`;
  }
  if (/^\+2507[2389]\d{7}$/.test(compact)) {
    return compact.slice(1);
  }
  if (/^2507[2389]\d{7}$/.test(compact)) {
    return compact;
  }
  if (/^\+[1-9]\d{7,14}$/.test(compact)) {
    return compact.slice(1);
  }
  if (/^[1-9]\d{7,14}$/.test(compact)) {
    return compact;
  }
  return "";
}
// Converts any valid ISO 3166-1 alpha-2 country code into its flag emoji
// locally - no server round-trip, works for every real country code, not
// just a hardcoded few.
function countryCodeToFlagEmoji(countryCode = "") {
  const code = String(countryCode || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "\u{1F310}";
  const codePoints = [...code].map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
const TV_COUNTRY_CODES = `
AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW XK
`.trim().split(/\s+/);
const TV_REGION_NAMES = (() => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    return null;
  }
})();
const TV_COUNTRY_OPTIONS = TV_COUNTRY_CODES.map((code) => [
  code,
  TV_REGION_NAMES?.of(code) || (code === "XK" ? "Kosovo" : code),
]).sort((a, b) => a[1].localeCompare(b[1]));
const TV_VISIBLE_MESSAGE_LIMIT = 8;
// Vertical spacing between the fixed "lanes" messages rise through - each
// message keeps one lane for its whole life, so two messages animating at
// the same time are always offset from one another, never overlapping.
// A message can wrap to a name line plus up to 3 text lines
// (-webkit-line-clamp: 3 on .tv-message-text), which at this font size can
// render close to ~65px tall - the lane height must comfortably clear that
// worst case or a tall message spills upward into the next lane's avatar.
const TV_MESSAGE_LANE_HEIGHT = 78;
const TV_POLL_INTERVAL_MS = 7000;
const TV_IDENTITY_KEY_PREFIX = "gwamo-tv-identity:v2:";
const TV_PUBLIC_IDENTITY_KEY = `${TV_IDENTITY_KEY_PREFIX}public-viewer`;
const TV_PUBLIC_VIEWER_ID_KEY = "gwamo-tv-public-viewer-id:v1";
function getOrCreateTvPublicViewerId() {
  try {
    const existing = localStorage.getItem(TV_PUBLIC_VIEWER_ID_KEY);
    if (existing) return existing;
    const created =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `viewer-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(TV_PUBLIC_VIEWER_ID_KEY, created);
    return created;
  } catch {
    return `viewer-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
// Never compare missing provider IDs directly: "" === "" would incorrectly
// treat an ordinary viewer as the owner of a legacy post. Prefer real IDs and
// use the registered telephone only as a safe legacy fallback.
function isSameProviderAsPost(post = {}, provider = null) {
  if (!provider) return false;
  const ownerId = String(post.provider_id || "").trim();
  const viewerId = String(provider.id || "").trim();
  if (ownerId && viewerId) return ownerId === viewerId;
  const ownerPhone = normalizeWhatsAppNumber(post.creator_identity || "");
  const viewerPhone = normalizeWhatsAppNumber(provider.phone || "");
  return Boolean(ownerPhone && viewerPhone && ownerPhone === viewerPhone);
}
// Shared Escape-to-close behavior for every modal/sheet/viewer in the app.
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
async function compressImageFile(
  file,
  { maxWidth, maxHeight, quality = 0.75 } = {},
) {
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
    const newName = file.name
      ? file.name.replace(/\.[^/.]+$/, "") + ".webp"
      : "upload.webp";
    return new File([blob], newName, { type: "image/webp" });
  } catch (error) {
    devWarn("Image compression failed, using original file:", error);
    return file;
  }
}
function getVerificationStatus(entity) {
  const rawStatus = String(entity?.verification_status || "")
    .trim()
    .toLowerCase();
  let status = "pending";
  if (
    rawStatus === "verified" ||
    rawStatus === "approved" ||
    entity?.verified === true ||
    entity?.verified === 1 ||
    entity?.verified === "1" ||
    entity?.is_verified === true ||
    entity?.is_verified === 1 ||
    entity?.is_verified === "1"
  ) {
    status = "verified";
  } else if (rawStatus === "rejected" || rawStatus === "blocked") {
    status = "rejected";
  }
  const labels = {
    verified: "Verified",
    pending: "Verification Pending",
    rejected: "Not Approved",
  };
  return {
    status,
    label: labels[status],
    verified: status === "verified",
    className: `status-${status}`,
  };
}
const VerificationTag = memo(function VerificationTag({ info, size = 14 }) {
  const Icon =
    info.status === "verified"
      ? CheckCircle
      : info.status === "rejected"
        ? ShieldX
        : Clock;
  return (
    <span className={`verification-tag ${info.className}`}>
      <Icon size={size} aria-hidden="true" />
      <span>{info.label}</span>
    </span>
  );
});
VerificationTag.displayName = "VerificationTag";
// =============================================================================
// Messaging helpers - date grouping + attachment labels (Step 1 additions)
// =============================================================================
function isSameCalendarDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
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
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}
function attachmentPreviewLabel(messageType) {
  switch (messageType) {
    case "image":
      return "Photo";
    case "video":
      return "Video";
    case "voice":
      return "Voice message";
    case "document":
      return "Document";
    default:
      return "Sent a message";
  }
}
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
        if (ref) {
          postRefs.current[index] = ref;
        } else {
          delete postRefs.current[index];
        }
      });
    }
    return postRefCallbackCache.current.get(index);
  }, []);
  const getVideoRefCallback = useCallback((index) => {
    if (!videoRefCallbackCache.current.has(index)) {
      videoRefCallbackCache.current.set(index, (ref) => {
        if (ref) {
          videoRefs.current[index] = ref;
        } else {
          delete videoRefs.current[index];
        }
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
  // Post-approval activation: the admin has approved the account and
  // generated a one-time 6-digit code (see worker.js). The code alone is
  // proof of identity - the person does not need to remember whatever PIN
  // they typed at registration. They enter their phone, the code, and a
  // PIN (new or the same one, their choice) here, and are logged in
  // immediately on success.
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [activationPhone, setActivationPhone] = useState("");
  const [activationCode, setActivationCode] = useState("");
  const [activationNewPin, setActivationNewPin] = useState("");
  const [activationConfirmPin, setActivationConfirmPin] = useState("");
  const [activationError, setActivationError] = useState("");
  const [activationLoading, setActivationLoading] = useState(false);
  // Shown when a login attempt reveals the account was rejected.
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
  // My Inbox (all of the logged-in user's conversations) - also drives the
  // real unread badge shown on every service card's envelope icon.
  const [showMyInbox, setShowMyInbox] = useState(false);
  const [myInboxFilterPostId, setMyInboxFilterPostId] = useState(null);
  const [myConversations, setMyConversations] = useState([]);
  const [myConversationsLoading, setMyConversationsLoading] = useState(false);
  const [myConversationsError, setMyConversationsError] = useState("");
  const [showInfoModal, setShowInfoModal] = useState(null);
  // Step 1: a single lightweight Gwamo toast for "new message" notices.
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
        message: response.ok
          ? ""
          : `Server returned ${response.status} ${response.statusText}`,
      };
    }
    try {
      return JSON.parse(responseText);
    } catch {
      throw new Error(
        responseText ||
          `Server returned ${response.status} ${response.statusText}`,
      );
    }
  }, []);
  // =============================================================================
  // Session Management
  // =============================================================================
  const getSessionToken = useCallback(() => {
    try {
      return localStorage.getItem(SESSION_TOKEN_KEY) || "";
    } catch {
      return "";
    }
  }, []);
  const setSessionToken = useCallback((token) => {
    try {
      if (token) {
        localStorage.setItem(SESSION_TOKEN_KEY, token);
      } else {
        localStorage.removeItem(SESSION_TOKEN_KEY);
      }
    } catch {
      // ignore
    }
  }, []);
  const getUserData = useCallback(() => {
    try {
      const data = localStorage.getItem(USER_DATA_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }, []);
  const setUserData = useCallback((userData) => {
    try {
      if (userData) {
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
      } else {
        localStorage.removeItem(USER_DATA_KEY);
      }
    } catch {
      // ignore
    }
  }, []);
  // Shared helper for authenticated requests (adds the Bearer token; never
  // forces a Content-Type so it stays safe for both JSON and FormData bodies).
  const authFetch = useCallback(
    async (path, options = {}) => {
      const token = getSessionToken();
      const headers = { ...(options.headers || {}) };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      return fetch(`${API_URL}${path}`, {
        cache: "no-store",
        ...options,
        headers,
      });
    },
    [getSessionToken],
  );
  const restoreSession = useCallback(async () => {
    const token = getSessionToken();
    if (!token) return false;
    try {
      const response = await fetch(`${API_URL}/api/time-market/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
    } catch (error) {
      devWarn("Session restore failed:", error);
    }
    setSessionToken("");
    setUserData(null);
    setUser(null);
    setIsLoggedIn(false);
    return false;
  }, [getSessionToken, readJsonSafely, setSessionToken, setUserData]);
  // Keep verification status (and anything else about the account) fresh
  // without ever trusting a stale localStorage copy as authoritative.
  useEffect(() => {
    if (!isLoggedIn) return undefined;
    const refreshProfile = async () => {
      if (document.hidden) return;
      const token = getSessionToken();
      if (!token) return;
      try {
        const response = await fetch(`${API_URL}/api/time-market/me`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!response.ok || !isMountedRef.current) return;
        const data = await readJsonSafely(response);
        if (data.success && data.provider && isMountedRef.current) {
          setUser(data.provider);
          setUserData(data.provider);
          setPosts((current) =>
            current.map((post) =>
              String(post.provider_id) === String(data.provider.id)
                ? {
                    ...post,
                    verification_status: data.provider.verification_status,
                    verified: data.provider.verified,
                  }
                : post,
            ),
          );
        }
      } catch {
        // Transient network issues shouldn't sign the person out.
      }
    };
    const intervalId = setInterval(
      refreshProfile,
      VERIFICATION_REFRESH_INTERVAL_MS,
    );
    const handleVisible = () => {
      if (!document.hidden) refreshProfile();
    };
    document.addEventListener("visibilitychange", handleVisible);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, [isLoggedIn, getSessionToken, readJsonSafely, setUserData]);
  // =============================================================================
  // Auth functions
  // =============================================================================
  const openServiceForm = useCallback(
    (provider, initialPostType = "offer") => {
      if (provider) {
        setNewCreatorName(
          provider.service_provider_name || provider.full_name || "",
        );
        setNewCreatorIdentity(provider.phone || "");
      }
      setNewMediaUrl("");
      setNewTitle("");
      setSubtitle("");
      setPostType(initialPostType);
      setPostHeadline("");
      setServiceCategory("");
      setPostLocation("");
      setPriceUnit("job");
      setAvailability("today");
      setExchangeNeed("");
      setAllowCashBalance(true);
      setMomentKind("story");
      setNewLogoFile(null);
      revokeObjectUrl(logoPreview);
      setLogoPreview("");
      setNewMediaFile(null);
      revokeObjectUrl(mediaPreview);
      setMediaPreview("");
      setMediaPreviewType("");
      setEditingServicePost(null);
      setShowEditor(true);
    },
    [logoPreview, mediaPreview, revokeObjectUrl],
  );
  const handleRegister = useCallback(async () => {
    const phone = normalizeWhatsAppNumber(authPhone);
    const fullName = authFullName.trim();
    if (!phone) {
      setAuthError("Please enter a valid phone number with country code.");
      return;
    }
    if (!fullName) {
      setAuthError("Please enter your full name.");
      return;
    }
    if (!PERSONAL_PIN_PATTERN.test(authPin)) {
      setAuthError("Create an 8-digit personal PIN.");
      return;
    }
    if (authPin !== authConfirmPin) {
      setAuthError("The two PIN entries do not match.");
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    setAuthSuccessMessage("");
    try {
      const response = await fetch(`${API_URL}/api/time-market/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          full_name: fullName,
          pin: authPin,
          auth_method: PIN_AUTH_METHOD,
        }),
      });
      const data = await readJsonSafely(response);
      if (data.already_registered) {
        setAuthMode("login");
        setAuthError("This number is already registered. Please press Login.");
        return;
      }
      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || "Registration failed.");
      }
      if (
        data.success &&
        data.auth_method !== PIN_AUTH_METHOD &&
        data.pin_authentication_enabled !== true
      ) {
        throw new Error(
          "Worker.js must be updated to phone + PIN authentication before this Home.jsx can be used securely.",
        );
      }
      if (
        data.success &&
        (data.requires_admin_approval || data.account_status === "pending_phone_review")
      ) {
        setPendingPhoneReview({
          phone,
          fullName,
        });
        setShowAuthModal(false);
        setAuthPhone("");
        setAuthFullName("");
        setAuthPin("");
        setAuthConfirmPin("");
        pendingAuthActionRef.current = null;
        return;
      }
      const provider = data.provider || data.user;
      const token = data.session_token || data.token;
      if (provider && token) {
        setUser(provider);
        setIsLoggedIn(true);
        setSessionToken(token);
        setUserData(provider);
        setShowAuthModal(false);
        setAuthPhone("");
        setAuthFullName("");
        setAuthPin("");
        setAuthConfirmPin("");
        setAuthError("");
        setAuthSuccessMessage("Registration successful! \ud83c\udf89");
        const action = pendingAuthActionRef.current;
        pendingAuthActionRef.current = null;
        if (action) setPendingAuthResolution({ action, provider });
        return;
      }
      setAuthError(data.error || data.message || "Registration failed.");
    } catch (error) {
      setAuthError(error.message || "Registration failed. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  }, [
    authPhone,
    authFullName,
    authPin,
    authConfirmPin,
    readJsonSafely,
    setSessionToken,
    setUserData,
  ]);
  const handleLogin = useCallback(async () => {
    const phone = normalizeWhatsAppNumber(authPhone);
    if (!phone) {
      setAuthError("Please enter your registered phone number.");
      return;
    }
    if (!PERSONAL_PIN_PATTERN.test(authPin)) {
      setAuthError("Enter your 8-digit personal PIN.");
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    setAuthSuccessMessage("");
    try {
      const response = await fetch(`${API_URL}/api/time-market/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          pin: authPin,
          auth_method: PIN_AUTH_METHOD,
        }),
      });
      const data = await readJsonSafely(response);
      if (!response.ok || !data.success) {
        // The account was approved and a one-time activation code was
        // generated (see worker.js) - the phone+PIN are correct, but the
        // person still needs to enter that code before they can log in.
        if (data.requires_activation_code) {
          setShowAuthModal(false);
          setActivationPhone(authPhone);
          setActivationCode("");
          setActivationNewPin("");
          setActivationConfirmPin("");
          setActivationError("");
          setShowActivationModal(true);
          setAuthLoading(false);
          return;
        }
        // The registration was rejected - surface the specific reason
        // rather than a generic "incorrect" error.
        if (data.account_rejected) {
          setShowAuthModal(false);
          setRejectedAccountInfo({
            message:
              data.error ||
              data.message ||
              "Your registration could not be approved.",
          });
          setAuthLoading(false);
          return;
        }
        setAuthError(
          data.error ||
            data.message ||
            "This number is not registered. Please register first.",
        );
        setAuthLoading(false);
        return;
      }
      if (
        data.auth_method !== PIN_AUTH_METHOD &&
        data.pin_authentication_enabled !== true
      ) {
        throw new Error(
          "Worker.js must be updated to verify the personal PIN before login.",
        );
      }
      const provider = data.provider || data.user;
      const token = data.session_token || data.token;
      if (provider && token) {
        setUser(provider);
        setIsLoggedIn(true);
        setSessionToken(token);
        setUserData(provider);
        setShowAuthModal(false);
        setAuthPhone("");
        setAuthPin("");
        setAuthError("");
        setAuthSuccessMessage("Login successful! \ud83d\udc4b");
        const action = pendingAuthActionRef.current;
        pendingAuthActionRef.current = null;
        if (action) setPendingAuthResolution({ action, provider });
        return;
      }
      setAuthError(data.error || data.message || "Login failed.");
    } catch (error) {
      setAuthError(error.message || "Login failed. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  }, [authPhone, authPin, readJsonSafely, setSessionToken, setUserData]);
  // Opens the activation screen directly - reachable from the login modal
  // even if the person doesn't remember (or never got past) their PIN. The
  // admin's 6-digit code is the actual proof of identity here.
  const openActivationModal = useCallback(() => {
    setShowAuthModal(false);
    setActivationPhone(authPhone);
    setActivationCode("");
    setActivationNewPin("");
    setActivationConfirmPin("");
    setActivationError("");
    setShowActivationModal(true);
  }, [authPhone]);
  // The admin's code alone proves identity - no dependency on remembering
  // whatever PIN was typed at registration, possibly a full day earlier.
  // The person sets/confirms their PIN right here and is logged in
  // immediately; the Worker returns a session token in the same response.
  const submitActivationCode = useCallback(async () => {
    const phone = normalizeWhatsAppNumber(activationPhone);
    if (!phone) {
      setActivationError("Enter your registered telephone number.");
      return;
    }
    if (!/^\d{6}$/.test(activationCode)) {
      setActivationError("Enter the 6-digit activation code.");
      return;
    }
    if (!PERSONAL_PIN_PATTERN.test(activationNewPin)) {
      setActivationError("Create an 8-digit personal PIN.");
      return;
    }
    if (activationNewPin !== activationConfirmPin) {
      setActivationError("The two PIN entries do not match.");
      return;
    }
    setActivationLoading(true);
    setActivationError("");
    try {
      const response = await fetch(`${API_URL}/api/time-market/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          code: activationCode,
          new_pin: activationNewPin,
        }),
        cache: "no-store",
      });
      const data = await readJsonSafely(response);
      if (!response.ok || !data.success) {
        throw new Error(
          data.error || data.message || "Could not activate your account.",
        );
      }
      const provider = data.provider || data.user;
      const token = data.session_token || data.token;
      setShowActivationModal(false);
      setActivationCode("");
      setActivationNewPin("");
      setActivationConfirmPin("");
      if (provider && token) {
        setUser(provider);
        setIsLoggedIn(true);
        setSessionToken(token);
        setUserData(provider);
        setAuthPhone("");
        setAuthPin("");
        setAuthSuccessMessage("Account activated! \ud83c\udf89");
        const action = pendingAuthActionRef.current;
        pendingAuthActionRef.current = null;
        if (action) setPendingAuthResolution({ action, provider });
      }
    } catch (error) {
      setActivationError(error.message || "Could not activate your account.");
    } finally {
      setActivationLoading(false);
    }
  }, [
    activationPhone,
    activationCode,
    activationNewPin,
    activationConfirmPin,
    readJsonSafely,
    setSessionToken,
    setUserData,
  ]);
  const handleLogout = useCallback(async () => {
    const token = getSessionToken();
    try {
      if (token) {
        await fetch(`${API_URL}/api/time-market/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
      }
    } catch {
      // Local logout must still complete when the network is unavailable.
    }
    setSessionToken("");
    setUserData(null);
    setUser(null);
    setIsLoggedIn(false);
    setMyConversations([]);
  }, [getSessionToken, setSessionToken, setUserData]);
  const openAuthModal = useCallback((mode = "login", pendingAction = null) => {
    pendingAuthActionRef.current = pendingAction;
    setAuthMode(mode);
    setAuthPhone("");
    setAuthFullName("");
    setAuthPin("");
    setAuthConfirmPin("");
    setAuthError("");
    setAuthSuccessMessage("");
    setAuthLoading(false);
    setShowAuthModal(true);
  }, []);
  // Stable reference so it never causes ServicePost/TvConversationOverlay's
  // memo() to think a prop changed on every render.
  const requireAuthForTv = useCallback(() => {
    openAuthModal("login");
  }, [openAuthModal]);
  const closeAuthModal = useCallback(() => {
    pendingAuthActionRef.current = null;
    setShowAuthModal(false);
    setAuthError("");
    setAuthSuccessMessage("");
  }, []);
  const openPinReset = useCallback(() => {
    setShowAuthModal(false);
    setShowPinResetModal(true);
    setPinResetStep("request");
    setPinResetPhone(authPhone);
    setPinResetRequest(null);
    setPinResetNewPin("");
    setPinResetConfirmPin("");
    setPinResetError("");
  }, [authPhone]);
  const closePinReset = useCallback(() => {
    setShowPinResetModal(false);
    setPinResetLoading(false);
    setPinResetError("");
  }, []);
  const requestPinReset = useCallback(async () => {
    const phone = normalizeWhatsAppNumber(pinResetPhone);
    if (!phone) {
      setPinResetError("Enter your registered telephone number.");
      return;
    }
    setPinResetLoading(true);
    setPinResetError("");
    try {
      const response = await fetch(
        `${API_URL}/api/time-market/pin-reset/request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
          cache: "no-store",
        },
      );
      const data = await readJsonSafely(response);
      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || "Could not request a PIN reset.");
      }
      setPinResetRequest({
        id: data.request_id || data.request?.id || "",
        verificationCode:
          data.verification_code || data.request?.verification_code || "",
        expiresAt: data.expires_at || data.request?.expires_at || "",
        recoveryToken: "",
      });
      setPinResetStep("waiting");
    } catch (error) {
      setPinResetError(error.message || "Could not request a PIN reset.");
    } finally {
      setPinResetLoading(false);
    }
  }, [pinResetPhone, readJsonSafely]);
  const checkPinResetStatus = useCallback(async ({ silent = false } = {}) => {
    if (!pinResetRequest?.id) {
      if (!silent) {
        setPinResetError("This reset request is missing. Please start again.");
      }
      return;
    }
    if (!silent) {
      setPinResetLoading(true);
      setPinResetError("");
    }
    try {
      const response = await fetch(
        `${API_URL}/api/time-market/pin-reset/status?request_id=${encodeURIComponent(
          pinResetRequest.id,
        )}`,
        { cache: "no-store" },
      );
      const data = await readJsonSafely(response);
      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || "Could not check the reset request.");
      }
      // Once approved, an admin has already generated and set a new 8-digit
      // PIN on the account (see worker.js) and will read it out on the call
      // or send it by SMS - there is nothing left for the person to type in.
      if (data.approved && data.pin_delivered) {
        setPinResetError("");
        setPinResetStep("delivered");
        return;
      }
      if (!data.approved) {
        // A silent background poll only needs to react once Gwamo actually
        // approves the reset - it should never interrupt the person with
        // "not approved yet" every few seconds while they're simply
        // waiting for the call. A real rejection is still worth surfacing.
        if (!silent || data.status === "rejected") {
          setPinResetError(
            data.status === "rejected"
              ? "This reset request was rejected."
              : "Gwamo has not approved this reset yet. Keep the code open and wait for the call.",
          );
        }
      }
    } catch (error) {
      if (!silent) {
        setPinResetError(error.message || "Could not check the reset request.");
      }
    } finally {
      if (!silent) setPinResetLoading(false);
    }
  }, [pinResetRequest, readJsonSafely]);
  // Auto-check approval while waiting, so the moment an admin approves by
  // phone the person is moved straight to "create a new PIN" without having
  // to remember to keep tapping "Check approval" themselves.
  useEffect(() => {
    if (!showPinResetModal || pinResetStep !== "waiting") return undefined;
    const intervalId = setInterval(() => {
      if (document.hidden) return;
      checkPinResetStatus({ silent: true });
    }, PIN_RESET_STATUS_POLL_INTERVAL_MS);
    const handleVisible = () => {
      if (!document.hidden) checkPinResetStatus({ silent: true });
    };
    document.addEventListener("visibilitychange", handleVisible);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, [showPinResetModal, pinResetStep, checkPinResetStatus]);
  const completePinReset = useCallback(async () => {
    if (!PERSONAL_PIN_PATTERN.test(pinResetNewPin)) {
      setPinResetError("Create a new 8-digit personal PIN.");
      return;
    }
    if (pinResetNewPin !== pinResetConfirmPin) {
      setPinResetError("The two PIN entries do not match.");
      return;
    }
    if (!pinResetRequest?.id || !pinResetRequest?.recoveryToken) {
      setPinResetError("The approved reset session is missing. Please start again.");
      return;
    }
    setPinResetLoading(true);
    setPinResetError("");
    try {
      const response = await fetch(
        `${API_URL}/api/time-market/pin-reset/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            request_id: pinResetRequest.id,
            recovery_token: pinResetRequest.recoveryToken,
            new_pin: pinResetNewPin,
          }),
          cache: "no-store",
        },
      );
      const data = await readJsonSafely(response);
      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || "Could not save the new PIN.");
      }
      closePinReset();
      openAuthModal("login");
      setAuthPhone(pinResetPhone);
      setAuthSuccessMessage("Your PIN was changed. Login with the new PIN.");
    } catch (error) {
      setPinResetError(error.message || "Could not save the new PIN.");
    } finally {
      setPinResetLoading(false);
    }
  }, [
    pinResetNewPin,
    pinResetConfirmPin,
    pinResetRequest,
    pinResetPhone,
    readJsonSafely,
    closePinReset,
    openAuthModal,
  ]);
  // =============================================================================
  // Plus CTA -> authenticated create-service flow
  // =============================================================================
  const handleOfferTime = useCallback((requestedPostType = "offer") => {
    const initialPostType = ["offer", "need", "exchange", "moment"].includes(
      requestedPostType,
    )
      ? requestedPostType
      : "offer";
    if (!isLoggedIn || !user) {
      openAuthModal("login", { type: "offer", postType: initialPostType });
      return;
    }
    setNewCreatorName(user.service_provider_name || user.full_name || "");
    setNewCreatorIdentity(user.phone || "");
    setNewMediaUrl("");
    setNewTitle("");
    setSubtitle("");
    setPostType(initialPostType);
    setPostHeadline("");
    setServiceCategory("");
    setPostLocation("");
    setPriceUnit("job");
    setAvailability("today");
    setExchangeNeed("");
    setAllowCashBalance(true);
    setMomentKind("story");
    setNewLogoFile(null);
    revokeObjectUrl(logoPreview);
    setLogoPreview("");
    setNewMediaFile(null);
    revokeObjectUrl(mediaPreview);
    setMediaPreview("");
    setMediaPreviewType("");
    setEditingServicePost(null);
    setShowEditor(true);
  }, [
    isLoggedIn,
    user,
    openAuthModal,
    revokeObjectUrl,
    logoPreview,
    mediaPreview,
  ]);
  // =============================================================================
  // Fetch services - PUBLIC FEED
  // =============================================================================
  const fetchAbortRef = useRef(null);
  const fetchInFlightRef = useRef(false);
  const fetchHomeData = useCallback(
    async ({ append = false, cursor = null } = {}) => {
      // Prevent duplicate/overlapping requests (e.g. fast double taps on
      // "Load more", or an initial mount racing a manual refresh).
      if (fetchInFlightRef.current) return;
      fetchInFlightRef.current = true;
      // Abort any in-flight request from a previous call so a slow, now
      // outdated response can never clobber newer state.
      if (fetchAbortRef.current) {
        fetchAbortRef.current.abort();
      }
      const controller = new AbortController();
      fetchAbortRef.current = controller;
      try {
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }
        const params = new URLSearchParams();
        params.set(
          "limit",
          String(append ? LOAD_MORE_LIMIT : INITIAL_PAGE_LIMIT),
        );
        if (cursor) params.set("cursor", cursor);
        const response = await fetch(
          `${API_URL}/api/home?${params.toString()}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const data = await readJsonSafely(response);
        if (!response.ok || !data.success) {
          throw new Error(
            data.error ||
              data.message ||
              `Failed to load services (${response.status})`,
          );
        }
        const receivedPosts = Array.isArray(data.posts) ? data.posts : [];
        if (isMountedRef.current) {
          setPosts((current) =>
            append ? [...current, ...receivedPosts] : receivedPosts,
          );
          setNextCursor(data.next_cursor || null);
          setHasMore(Boolean(data.has_more));
        }
      } catch (error) {
        if (error?.name === "AbortError") return;
        devError("Failed to fetch services:", error);
      } finally {
        fetchInFlightRef.current = false;
        if (isMountedRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [readJsonSafely],
  );
  const loadMorePosts = useCallback(() => {
    if (!hasMore || loadingMore || !nextCursor) return;
    fetchHomeData({ append: true, cursor: nextCursor });
  }, [hasMore, loadingMore, nextCursor, fetchHomeData]);
  // =============================================================================
  // Initialize
  // =============================================================================
  useEffect(() => {
    try {
      const origin = new URL(API_URL).origin;
      if (!document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) {
        const link = document.createElement("link");
        link.rel = "preconnect";
        link.href = origin;
        link.crossOrigin = "anonymous";
        document.head.appendChild(link);
      }
    } catch {
      // non-critical, safe to skip
    }
  }, []);
  useEffect(() => {
    isMountedRef.current = true;
    const init = async () => {
      await Promise.all([restoreSession(), fetchHomeData()]);
    };
    init();
    return () => {
      isMountedRef.current = false;
      if (fetchAbortRef.current) fetchAbortRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // =============================================================================
  // Intersection Observer
  // -----------------------------------------------------------------------
  // This only tracks which card is "active" (for embeds) and pauses videos
  // as they leave the screen. It does NOT auto-play video on arrival -
  // media only plays when the person actively taps it (see ServicePost's
  // onClick on the <video> element), never on its own after scrolling in.
  // =============================================================================
  useEffect(() => {
    if (!posts.length) return undefined;
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = Number(entry.target.dataset.index);
          const video = videoRefs.current[index];
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            setActivePostIndex(index);
            Object.entries(videoRefs.current).forEach(([key, item]) => {
              if (Number(key) !== index && item && !item.paused) {
                item.pause();
              }
            });
          } else if (video && !video.paused) {
            video.pause();
          }
        });
      },
      {
        threshold: [0.6],
        rootMargin: "0px 0px -10% 0px",
      },
    );
    observerRef.current = observer;
    Object.values(postRefs.current).forEach((post) => {
      if (post) observer.observe(post);
    });
    return () => {
      observer.disconnect();
    };
  }, [posts]);
  // =============================================================================
  // Media aspect ratio detection
  // =============================================================================
  const handleMediaAspectRatio = useCallback((postId, ratio) => {
    if (!ratio || !Number.isFinite(ratio) || ratio <= 0) return;
    setMediaAspectRatios((current) => {
      if (current[postId] === ratio) return current;
      return { ...current, [postId]: ratio };
    });
  }, []);
  // =============================================================================
  // Step 1: lightweight silent reaction-count refresh
  // -----------------------------------------------------------------------
  // Polls a tiny, currently-unbuilt Worker endpoint. Until Step 2 ships it,
  // every attempt below fails safely (network error or 404) and the feed
  // simply keeps whatever counts it already has - it never breaks anything.
  // =============================================================================
  const reactionPollInFlightRef = useRef(false);
  const reactionEndpointUnavailableRef = useRef(false);
  const postsRef = useRef(posts);
  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);
  useEffect(() => {
    let intervalId = null;
    const pollReactionCounts = async () => {
      if (document.hidden) return;
      if (reactionPollInFlightRef.current) return;
      if (reactionEndpointUnavailableRef.current) return;
      const ids = postsRef.current.map((post) => String(post.id)).filter(Boolean);
      if (!ids.length) return;
      reactionPollInFlightRef.current = true;
      try {
        const response = await fetch(
          `${API_URL}/api/home/reaction-counts?post_ids=${encodeURIComponent(
            ids.slice(0, 60).join(","),
          )}`,
          { cache: "no-store" },
        );
        if (response.status === 404) {
          // Endpoint not installed yet (pre Step 2) - stop polling quietly.
          reactionEndpointUnavailableRef.current = true;
          return;
        }
        if (!response.ok) return;
        const data = await readJsonSafely(response);
        if (!data || !data.success || !data.counts) return;
        if (!isMountedRef.current) return;
        setPosts((current) =>
          current.map((post) => {
            const counts = data.counts[String(post.id)];
            if (!counts) return post;
            return {
              ...post,
              real_reactions: counts.real_reactions,
              manual_reactions: counts.manual_reactions,
              displayed_reactions: counts.displayed_reactions,
            };
          }),
        );
      } catch {
        // Network hiccup - just try again on the next tick.
      } finally {
        reactionPollInFlightRef.current = false;
      }
    };
    intervalId = setInterval(
      pollReactionCounts,
      REACTION_COUNTS_POLL_INTERVAL_MS,
    );
    const handleVisible = () => {
      if (!document.hidden) pollReactionCounts();
    };
    document.addEventListener("visibilitychange", handleVisible);
    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, [readJsonSafely]);
  // =============================================================================
  // Editor modal
  // =============================================================================
  const pauseAllVideos = useCallback(() => {
    Object.entries(videoRefs.current).forEach(([postId, video]) => {
      if (video && !video.paused) {
        video.pause();
      }
    });
  }, []);
  const openEditor = useCallback(() => {
    if (!isLoggedIn || !user) {
      openAuthModal("login");
      return;
    }
    pauseAllVideos();
    setShowEditor(true);
  }, [isLoggedIn, user, openAuthModal, pauseAllVideos]);
  const closeEditor = useCallback(() => {
    setShowEditor(false);
    setUploadProgress(0);
    setNewCreatorName("");
    setNewCreatorIdentity("");
    setNewMediaUrl("");
    setNewTitle("");
    setSubtitle("");
    setNewLogoFile(null);
    revokeObjectUrl(logoPreview);
    setLogoPreview("");
    setNewMediaFile(null);
    revokeObjectUrl(mediaPreview);
    setMediaPreview("");
    setMediaPreviewType("");
    setEditingServicePost(null);
  }, [logoPreview, mediaPreview, revokeObjectUrl]);
  const handleLogoChange = useCallback(
    async (file) => {
      revokeObjectUrl(logoPreview);
      if (!file) {
        setNewLogoFile(null);
        setLogoPreview("");
        return;
      }
      setCompressingMedia(true);
      try {
        const compressed = await compressImageFile(file, {
          maxWidth: 400,
          maxHeight: 400,
          quality: 0.75,
        });
        setNewLogoFile(compressed);
        setLogoPreview(trackObjectUrl(URL.createObjectURL(compressed)));
      } catch (error) {
        devError("Profile photo processing failed:", error);
        alert(
          "This image could not be processed. Please try a different photo.",
        );
      } finally {
        setCompressingMedia(false);
      }
    },
    [logoPreview, revokeObjectUrl, trackObjectUrl],
  );
  const handleProfilePhotoChange = useCallback(
    async (file) => {
      revokeObjectUrl(profilePhotoPreview);
      if (!file) {
        setProfilePhotoFile(null);
        setProfilePhotoPreview("");
        return;
      }
      try {
        const compressed = await compressImageFile(file, {
          maxWidth: 400,
          maxHeight: 400,
          quality: 0.75,
        });
        setProfilePhotoFile(compressed);
        setProfilePhotoPreview(trackObjectUrl(URL.createObjectURL(compressed)));
      } catch (error) {
        devError("Profile photo processing failed:", error);
        alert(
          "This image could not be processed. Please try a different photo.",
        );
      }
    },
    [profilePhotoPreview, revokeObjectUrl, trackObjectUrl],
  );
  const removeProfilePhoto = useCallback(() => {
    revokeObjectUrl(profilePhotoPreview);
    setProfilePhotoFile("remove");
    setProfilePhotoPreview("");
  }, [profilePhotoPreview, revokeObjectUrl]);
  const handleMediaFileChange = useCallback(
    async (file) => {
      revokeObjectUrl(mediaPreview);
      if (!file) {
        setNewMediaFile(null);
        setMediaPreview("");
        setMediaPreviewType("");
        return;
      }
      const isImage = file.type.startsWith("image/");
      if (!isImage) {
        setNewMediaFile(file);
        setMediaPreview(trackObjectUrl(URL.createObjectURL(file)));
        setMediaPreviewType("video");
        return;
      }
      setCompressingMedia(true);
      try {
        const compressed = await compressImageFile(file, {
          maxWidth: 1080,
          quality: 0.75,
        });
        setNewMediaFile(compressed);
        setMediaPreview(trackObjectUrl(URL.createObjectURL(compressed)));
        setMediaPreviewType("image");
      } catch (error) {
        devError("Image processing failed:", error);
        alert(
          "This image could not be processed. Please try a different photo.",
        );
      } finally {
        setCompressingMedia(false);
      }
    },
    [mediaPreview, revokeObjectUrl, trackObjectUrl],
  );
  const applyChanges = useCallback(async () => {
    const providerName = newCreatorName.trim();
    const contactInfo = newCreatorIdentity.trim();
    const headline = postHeadline.trim();
    const enteredValue = newTitle.trim();
    const baseDescription = subtitle.trim();
    const wantedExchange = exchangeNeed.trim();
    const mediaToSave = newMediaUrl.trim();
    if (!providerName) {
      alert("Please enter your service provider name.");
      return;
    }
    if (!contactInfo) {
      alert("Please enter your phone number or website.");
      return;
    }
    if (!headline) {
      alert(
        postType === "offer"
          ? "Please say what work you can do."
          : postType === "need"
            ? "Please say what help you need."
            : postType === "exchange"
              ? "Please say what service you can give."
              : "Please add a short title for your moment.",
      );
      return;
    }
    if (!baseDescription) {
      alert(
        postType === "moment"
          ? "Please write your saying, story, or thought."
          : "Please add a short description.",
      );
      return;
    }
    if (postType === "offer" && !enteredValue) {
      alert("Please enter your price.");
      return;
    }
    if (postType === "exchange" && !wantedExchange) {
      alert("Please say what service you need in return.");
      return;
    }
    if (!mediaToSave && !newMediaFile) {
      alert("Please upload a photo/video or enter a media link.");
      return;
    }
    let detectedMediaType = "";
    if (newMediaFile) {
      detectedMediaType = newMediaFile.type.startsWith("image/")
        ? "image"
        : "video";
    } else if (isImageUrl(mediaToSave)) {
      detectedMediaType = "image";
    } else if (isDirectVideoUrl(mediaToSave)) {
      detectedMediaType = "video";
    } else if (mediaToSave) {
      detectedMediaType = "embed";
    }
    const detailLines = [baseDescription];
    if (postType === "exchange") {
      detailLines.push(`I can give: ${headline}`);
      detailLines.push(`I need: ${wantedExchange}`);
      detailLines.push(
        allowCashBalance
          ? "Cash can balance the difference."
          : "Service-for-service only.",
      );
    }
    if (serviceCategory && postType !== "moment") {
      detailLines.push(`Category: ${serviceCategory}`);
    }
    if (postLocation && postType !== "moment") {
      detailLines.push(`Location: ${postLocation}`);
    }
    if (postType === "offer") {
      detailLines.push(`Available: ${availability}`);
    }
    if (postType === "need") {
      detailLines.push(`Needed: ${availability}`);
    }
    const workDescription = detailLines.join("\n");
    const cardValue =
      postType === "offer"
        ? `${enteredValue} / ${priceUnit}`
        : postType === "need"
          ? enteredValue
            ? `Budget: ${enteredValue}`
            : "Budget: Let us agree"
          : postType === "exchange"
            ? "Trade skills"
            : momentKind === "song"
              ? "Song saying"
              : momentKind === "movie"
                ? "Movie saying"
                : momentKind === "recommend"
                  ? "Recommendation"
                  : "My story";
    try {
      setSaving(true);
      setUploadProgress(1);
      const formData = new FormData();
      formData.append("creator_name", providerName);
      formData.append("creator_identity", contactInfo);
      formData.append("title", cardValue);
      formData.append("subtitle", workDescription);
      formData.append("post_type", postType);
      formData.append("service_name", headline);
      formData.append("service_category", serviceCategory.trim());
      formData.append("location", postLocation.trim());
      formData.append("availability", availability);
      formData.append("price_unit", priceUnit);
      formData.append(
        "exchange_offer",
        postType === "exchange" ? headline : "",
      );
      formData.append(
        "exchange_need",
        postType === "exchange" ? wantedExchange : "",
      );
      formData.append("allow_cash_balance", allowCashBalance ? "1" : "0");
      formData.append("moment_kind", postType === "moment" ? momentKind : "");
      formData.append("media_type", detectedMediaType);
      formData.append("is_new_service", "true");
      if (user && user.id) {
        formData.append("provider_id", user.id);
      }
      if (mediaToSave) {
        formData.append("media_url", mediaToSave);
      }
      if (newLogoFile) {
        formData.append("logo_file", newLogoFile);
      }
      if (newMediaFile) {
        formData.append("media_file", newMediaFile);
      }
      const token = getSessionToken();
      const { status, statusText, responseText } = await new Promise(
        (resolve, reject) => {
          const request = new XMLHttpRequest();
          request.open("POST", `${API_URL}/api/time-market/services`);
          request.timeout = 180000;
          request.setRequestHeader("Authorization", `Bearer ${token}`);
          request.upload.onprogress = (event) => {
            if (!event.lengthComputable || !isMountedRef.current) return;
            const percentage = Math.min(
              95,
              Math.max(1, Math.round((event.loaded / event.total) * 95)),
            );
            setUploadProgress(percentage);
          };
          request.upload.onload = () => {
            if (isMountedRef.current) setUploadProgress(96);
          };
          request.onload = () => {
            resolve({
              status: request.status,
              statusText: request.statusText,
              responseText: request.responseText,
            });
          };
          request.onerror = () =>
            reject(new Error("Network error while uploading the service."));
          request.ontimeout = () =>
            reject(new Error("The upload took too long. Please try again."));
          request.onabort = () =>
            reject(new Error("The upload was cancelled."));
          request.send(formData);
        },
      );
      let data;
      try {
        data = responseText
          ? JSON.parse(responseText)
          : { success: status >= 200 && status < 300 };
      } catch {
        throw new Error(
          responseText ||
            `Server returned ${status} ${statusText}`,
        );
      }
      if (status < 200 || status >= 300 || !data.success) {
        throw new Error(
          data.error || data.message || `Failed to create service (${status})`,
        );
      }
      if (isMountedRef.current) setUploadProgress(100);
      const createdPost = data.post || data.service;
      if (createdPost && isMountedRef.current) {
        setPosts((current) => [
          createdPost,
          ...current.filter(
            (item) => String(item.id) !== String(createdPost.id),
          ),
        ]);
      } else {
        await fetchHomeData();
      }
      closeEditor();
      alert(data.message || "Your post was created successfully!");
    } catch (error) {
      devError("Failed to create service:", error);
      alert(error.message || "Failed to create service.");
    } finally {
      if (isMountedRef.current) {
        setSaving(false);
        setUploadProgress(0);
      }
    }
  }, [
    closeEditor,
    fetchHomeData,
    newCreatorName,
    newCreatorIdentity,
    newLogoFile,
    newMediaFile,
    newMediaUrl,
    newTitle,
    subtitle,
    postType,
    postHeadline,
    serviceCategory,
    postLocation,
    priceUnit,
    availability,
    exchangeNeed,
    allowCashBalance,
    momentKind,
    getSessionToken,
    user,
  ]);
  // =============================================================================
  // Edit an existing service (real PATCH to the Worker - not a placeholder)
  // =============================================================================
  const openServiceEdit = useCallback(
    (post) => {
      setEditingServicePost(post);
      setNewCreatorName(post.service_provider_name || post.creator_name || "");
      setNewCreatorIdentity(post.creator_identity || "");
      setNewTitle(post.service_charge_per_minute || post.title || "");
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
      setNewLogoFile(null);
      revokeObjectUrl(logoPreview);
      setLogoPreview("");
      setNewMediaFile(null);
      revokeObjectUrl(mediaPreview);
      if (post.media_type === "embed") {
        setMediaPreview("");
        setMediaPreviewType("");
        setNewMediaUrl(post.media_url || "");
      } else {
        setMediaPreview(post.media_url || "");
        setMediaPreviewType(post.media_type === "video" ? "video" : "image");
        setNewMediaUrl("");
      }
      setShowMyServices(false);
      setShowEditor(true);
    },
    [logoPreview, mediaPreview, revokeObjectUrl],
  );
  const saveServiceEdit = useCallback(async () => {
    if (!editingServicePost) return;
    const chargeText = newTitle.trim();
    const workDescription = subtitle.trim();
    if (!chargeText) {
      alert("Please enter how much your time costs.");
      return;
    }
    if (!workDescription) {
      alert("Please describe your service.");
      return;
    }
    setSaving(true);
    setUploadProgress(1);
    try {
      let mediaUrl = editingServicePost.media_url || "";
      let mediaType = editingServicePost.media_type || "";
      if (newMediaFile) {
        const uploadForm = new FormData();
        uploadForm.append("file", newMediaFile);
        uploadForm.append(
          "kind",
          newMediaFile.type.startsWith("image/") ? "post_image" : "video",
        );
        const uploadResponse = await authFetch("/api/home/upload", {
          method: "POST",
          body: uploadForm,
        });
        const uploadData = await readJsonSafely(uploadResponse);
        if (!uploadResponse.ok || !uploadData.success) {
          throw new Error(
            uploadData.error ||
              uploadData.message ||
              "Could not upload new media.",
          );
        }
        mediaUrl = uploadData.url;
        mediaType = newMediaFile.type.startsWith("image/") ? "image" : "video";
        setUploadProgress(70);
      } else if (
        newMediaUrl.trim() &&
        newMediaUrl.trim() !== editingServicePost.media_url
      ) {
        mediaUrl = newMediaUrl.trim();
        mediaType = isImageUrl(mediaUrl)
          ? "image"
          : isDirectVideoUrl(mediaUrl)
            ? "video"
            : "embed";
      }
      const response = await authFetch("/api/time-market/services", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: editingServicePost.id,
          service_charge_per_minute: chargeText,
          work_description: workDescription,
          media_url: mediaUrl,
          media_type: mediaType,
        }),
      });
      const data = await readJsonSafely(response);
      if (!response.ok || !data.success) {
        throw new Error(
          data.error || data.message || "Could not update this service.",
        );
      }
      setUploadProgress(100);
      const updated = data.service;
      if (updated) {
        setPosts((current) =>
          current.map((item) =>
            String(item.id) === String(updated.id) ? updated : item,
          ),
        );
        setMyServices((current) =>
          current.map((item) =>
            String(item.id) === String(updated.id) ? updated : item,
          ),
        );
      }
      closeEditor();
    } catch (error) {
      devError("Failed to update service:", error);
      alert(error.message || "Could not update this service.");
    } finally {
      if (isMountedRef.current) {
        setSaving(false);
        setUploadProgress(0);
      }
    }
  }, [
    editingServicePost,
    newTitle,
    subtitle,
    newMediaFile,
    newMediaUrl,
    authFetch,
    readJsonSafely,
    closeEditor,
  ]);
  // =============================================================================
  // Step 1: one small Gwamo toast for "new message" notices
  // =============================================================================
  const showToast = useCallback((message) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ id: `${Date.now()}`, message });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, TOAST_DURATION_MS);
  }, []);
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);
  // =============================================================================
  // My Inbox - fetches every conversation the logged-in user belongs to.
  // This is also the single source of truth for the real unread badge shown
  // on each service card's envelope icon (never ngwino_clicks).
  // =============================================================================
  const conversationsInFlightRef = useRef(false);
  const fetchMyConversations = useCallback(
    async ({ silent = false } = {}) => {
      if (!isLoggedIn) return;
      if (conversationsInFlightRef.current) return;
      conversationsInFlightRef.current = true;
      if (!silent) {
        setMyConversationsLoading(true);
        setMyConversationsError("");
      }
      try {
        const response = await authFetch("/api/time-market/conversations");
        const data = await readJsonSafely(response);
        if (!response.ok || !data.success) {
          throw new Error(
            data.error || data.message || "Could not load your conversations.",
          );
        }
        if (isMountedRef.current) {
          const nextConversations = Array.isArray(data.conversations)
            ? data.conversations
            : [];
          setMyConversations(nextConversations);
          // Toast detection: only after the very first successful load (so
          // the badge doesn't fire a toast for every pre-existing message
          // the moment someone logs in), and only for conversations whose
          // latest message we haven't already notified about.
          const nextTotalUnread = nextConversations.reduce(
            (total, conversation) =>
              total + Number(conversation.unread_count || 0),
            0,
          );
          if (
            previousTotalUnreadRef.current !== null &&
            nextTotalUnread > previousTotalUnreadRef.current
          ) {
            const candidate = [...nextConversations]
              .filter((conversation) => Number(conversation.unread_count || 0) > 0)
              .sort((a, b) => {
                const aTime = Date.parse(
                  a.last_message_at || a.updated_at || a.created_at || 0,
                ) || 0;
                const bTime = Date.parse(
                  b.last_message_at || b.updated_at || b.created_at || 0,
                ) || 0;
                return bTime - aTime;
              })[0];
            if (candidate) {
              const dedupeKey = `${candidate.id}:${
                candidate.last_message_at || candidate.updated_at || ""
              }`;
              if (!notifiedMessageKeysRef.current.has(dedupeKey)) {
                notifiedMessageKeysRef.current.add(dedupeKey);
                const iAmProvider =
                  String(candidate.provider_id) === String(user?.id);
                const partnerName = iAmProvider
                  ? candidate.customer_full_name || "Someone"
                  : candidate.provider_full_name ||
                    candidate.service_provider_name ||
                    "Someone";
                showToast(`New message from ${partnerName}`);
              }
            }
          }
          previousTotalUnreadRef.current = nextTotalUnread;
        }
      } catch (error) {
        if (isMountedRef.current && !silent) {
          setMyConversationsError(
            error.message || "Could not load your conversations.",
          );
        }
      } finally {
        conversationsInFlightRef.current = false;
        if (isMountedRef.current && !silent) setMyConversationsLoading(false);
      }
    },
    [isLoggedIn, authFetch, readJsonSafely, user, showToast],
  );
  // Fetch conversations as soon as we know who's logged in, so the envelope
  // badge on every card is correct without waiting for the inbox to be opened.
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
  // Step 1: silent Inbox polling every ~5s while logged in, paused while the
  // tab is hidden and refreshed immediately when it becomes visible again.
  useEffect(() => {
    if (!isLoggedIn) return undefined;
    let intervalId = setInterval(() => {
      if (document.hidden) return;
      fetchMyConversations({ silent: true });
    }, INBOX_POLL_INTERVAL_MS);
    const handleVisible = () => {
      if (!document.hidden) fetchMyConversations({ silent: true });
    };
    document.addEventListener("visibilitychange", handleVisible);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, [isLoggedIn, fetchMyConversations]);
  // Real unread count per service post, derived from the same conversations
  // list the inbox uses - this is what every envelope badge reads from.
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
  const totalUnreadCount = useMemo(
    () =>
      myConversations.reduce(
        (total, conversation) =>
          total + Number(conversation.unread_count || 0),
        0,
      ),
    [myConversations],
  );
  const openMyInbox = useCallback(
    (filterPostId = null) => {
      if (!isLoggedIn || !user) {
        openAuthModal("login", { type: "inbox", filterPostId });
        return;
      }
      setMyInboxFilterPostId(filterPostId);
      setShowMyInbox(true);
      fetchMyConversations();
    },
    [isLoggedIn, user, openAuthModal, fetchMyConversations],
  );
  // The envelope icon on the social rail is always the Inbox entry point,
  // never a second "Contact me" button.
  const openInboxFromRail = useCallback(() => {
    openMyInbox(null);
  }, [openMyInbox]);
  // =============================================================================
  // Chat / Messaging
  // =============================================================================
  const closeChat = useCallback(() => {
    setShowChat(false);
    setChatPartner(null);
    // Messages were marked read while the chat was open - refresh the
    // conversations list so every envelope badge updates immediately.
    if (isLoggedIn) {
      fetchMyConversations();
    }
  }, [isLoggedIn, fetchMyConversations]);
  const startChatWithPost = useCallback(
    (post) => {
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
      setShowChat(true);
      pauseAllVideos();
    },
    [pauseAllVideos],
  );
  // Calling requires login just like messaging does - no second auth system,
  // this reuses the exact same openAuthModal/pendingAuthResolution path.
  const callProvider = useCallback(
    (post) => {
      const callPhone = normalizeWhatsAppNumber(post.creator_identity || "");
      if (!callPhone) return;
      if (!isLoggedIn || !user) {
        openAuthModal("login", { type: "call", post });
        return;
      }
      window.location.href = `tel:+${callPhone}`;
    },
    [isLoggedIn, user, openAuthModal],
  );
  // "Contact me" always means a direct chat with the provider on this card.
  // A real owner cannot message themselves and uses the envelope Inbox instead.
  const openInboxForPost = useCallback(
    (post) => {
      if (isLoggedIn && user && isSameProviderAsPost(post, user)) {
        showToast("This is your post. Open the envelope Inbox to reply to customers.");
        return;
      }
      // Contact Me requires login upfront - no browsing the chat composer
      // while signed out. After a successful login, the pendingAuthResolution
      // effect below re-runs this exact call with the same post.
      if (!isLoggedIn || !user) {
        openAuthModal("login", { type: "message", post });
        return;
      }
      const viewerId = String(user?.id || "").trim();
      const ownerId = String(post.provider_id || "").trim();
      const existingConversation = isLoggedIn
        ? myConversations.find((conversation) => {
            if (
              String(conversation.service_post_id || "") !== String(post.id || "")
            ) {
              return false;
            }
            const buyerId = String(conversation.customer_provider_id || "").trim();
            const sellerId = String(conversation.provider_id || "").trim();
            return Boolean(
              viewerId &&
                buyerId === viewerId &&
                (!ownerId || sellerId === ownerId),
            );
          })
        : null;
      startChatWithPost(
        existingConversation
          ? { ...post, conversation_id: existingConversation.id }
          : post,
      );
    },
    [isLoggedIn, user, myConversations, showToast, startChatWithPost, openAuthModal],
  );
  const openConversationFromInbox = useCallback(
    (conversation) => {
      const iAmProvider = String(conversation.provider_id) === String(user?.id);
      const partnerName = iAmProvider
        ? conversation.customer_full_name || "Customer"
        : conversation.provider_full_name ||
          conversation.service_provider_name ||
          "Provider";
      const partnerAvatar = iAmProvider
        ? conversation.customer_profile_image_url || ""
        : conversation.provider_profile_image_url || "";
      const partnerVerified = iAmProvider
        ? conversation.customer_verification_status === "verified"
        : conversation.provider_verification_status === "verified";
      const partnerPhone = normalizeWhatsAppNumber(
        (iAmProvider ? conversation.customer_phone : conversation.provider_phone) || "",
      );
      setChatPartner({
        conversationId: String(conversation.id),
        servicePostId: String(conversation.service_post_id || ""),
        name: partnerName,
        avatar: partnerAvatar,
        headline: conversation.service_charge_per_minute || "",
        serviceName: conversation.service_name || "",
        serviceMediaUrl: conversation.service_media_url || "",
        verified: Boolean(partnerVerified),
        providerPhone: partnerPhone,
      });
      setShowMyInbox(false);
      setShowChat(true);
      pauseAllVideos();
    },
    [user, pauseAllVideos],
  );
  // =============================================================================
  // Provider Profile (viewing someone else's public info)
  // =============================================================================
  const openProviderProfile = useCallback((post) => {
    setProviderProfileTarget(post);
    setShowProviderProfile(true);
  }, []);
  const closeProviderProfile = useCallback(() => {
    setShowProviderProfile(false);
    setProviderProfileTarget(null);
  }, []);
  // =============================================================================
  // My Profile (account-level identity, separate from a single service post)
  // =============================================================================
  const openMyProfile = useCallback(
    (contextPost = null) => {
      if (!user) return;
      setProfileFullName(user.full_name || "");
      setProfileServiceName(user.service_provider_name || "");
      setProfileServicesOffered(user.services_offered || "");
      setProfileError("");
      setProfilePhotoFile(null);
      setProfilePhotoPreview("");
      setProfileEditContextPost(contextPost);
      setShowMyProfile(true);
    },
    [user],
  );
  const saveMyProfile = useCallback(async () => {
    setProfileSaving(true);
    setProfileError("");
    try {
      let profileImageUrl = user?.profile_image_url || "";
      if (profilePhotoFile === "remove") {
        profileImageUrl = "";
      } else if (profilePhotoFile) {
        const uploadForm = new FormData();
        uploadForm.append("file", profilePhotoFile);
        uploadForm.append("kind", "profile_image");
        const uploadResponse = await authFetch("/api/home/upload", {
          method: "POST",
          body: uploadForm,
        });
        const uploadData = await readJsonSafely(uploadResponse);
        if (!uploadResponse.ok || !uploadData.success || !uploadData.url) {
          throw new Error(
            uploadData.error ||
              uploadData.message ||
              "Could not upload your profile photo.",
          );
        }
        profileImageUrl = uploadData.url;
      }
      const response = await authFetch("/api/time-market/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: profileFullName.trim(),
          service_provider_name: profileServiceName.trim(),
          services_offered: profileServicesOffered.trim(),
          profile_image_url: profileImageUrl,
        }),
      });
      const data = await readJsonSafely(response);
      if (!response.ok || !data.success) {
        throw new Error(
          data.error || data.message || "Could not update your profile.",
        );
      }
      setUser(data.provider);
      setUserData(data.provider);
      setPosts((current) =>
        current.map((post) =>
          String(post.provider_id) === String(data.provider.id)
            ? {
                ...post,
                creator_name: data.provider.service_provider_name,
                service_provider_name: data.provider.service_provider_name,
                logo_url:
                  data.provider.profile_image_url || profileImageUrl || "",
              }
            : post,
        ),
      );
      setShowMyProfile(false);
    } catch (error) {
      setProfileError(error.message || "Could not update your profile.");
    } finally {
      if (isMountedRef.current) setProfileSaving(false);
    }
  }, [
    authFetch,
    readJsonSafely,
    user,
    profileFullName,
    profileServiceName,
    profileServicesOffered,
    profilePhotoFile,
    setUserData,
  ]);
  const deleteMyProviderAccount = useCallback(async () => {
    try {
      const response = await authFetch("/api/time-market/profile", {
        method: "DELETE",
      });
      const data = await readJsonSafely(response);
      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            data.message ||
            "Could not delete your provider profile.",
        );
      }
      setShowMyProfile(false);
      setSessionToken("");
      setUserData(null);
      setUser(null);
      setIsLoggedIn(false);
      setPosts((current) =>
        current.filter((post) => String(post.provider_id) !== String(user?.id)),
      );
    } catch (error) {
      setProfileError(
        error.message || "Could not delete your provider profile.",
      );
    } finally {
      setProfileDeleteConfirming(false);
    }
  }, [authFetch, readJsonSafely, setSessionToken, setUserData, user]);
  const openEditListingFromProfile = useCallback(() => {
    if (!profileEditContextPost) return;
    setShowMyProfile(false);
    openServiceEdit(profileEditContextPost);
  }, [profileEditContextPost, openServiceEdit]);
  // =============================================================================
  // My Services (list, edit, delete the logged-in provider's own posts)
  // =============================================================================
  const fetchMyServices = useCallback(async () => {
    setMyServicesLoading(true);
    setMyServicesError("");
    try {
      const response = await authFetch("/api/time-market/services");
      const data = await readJsonSafely(response);
      if (!response.ok || !data.success) {
        throw new Error(
          data.error || data.message || "Could not load your services.",
        );
      }
      if (isMountedRef.current) {
        setMyServices(Array.isArray(data.services) ? data.services : []);
      }
    } catch (error) {
      if (isMountedRef.current) {
        setMyServicesError(error.message || "Could not load your services.");
      }
    } finally {
      if (isMountedRef.current) setMyServicesLoading(false);
    }
  }, [authFetch, readJsonSafely]);
  const openMyServices = useCallback(() => {
    if (!isLoggedIn || !user) {
      openAuthModal("login");
      return;
    }
    setShowMyServices(true);
    fetchMyServices();
  }, [isLoggedIn, user, openAuthModal, fetchMyServices]);
  const deleteMyService = useCallback(
    async (postId) => {
      if (!window.confirm("Delete this service? This cannot be undone."))
        return;
      try {
        const response = await authFetch("/api/time-market/services", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ post_id: postId }),
        });
        const data = await readJsonSafely(response);
        if (!response.ok || !data.success) {
          throw new Error(
            data.error || data.message || "Could not delete this service.",
          );
        }
        setMyServices((current) =>
          current.filter((item) => String(item.id) !== String(postId)),
        );
        setPosts((current) =>
          current.filter((item) => String(item.id) !== String(postId)),
        );
      } catch (error) {
        alert(error.message || "Could not delete this service.");
      }
    },
    [authFetch, readJsonSafely],
  );
  // =============================================================================
  // Reactions (Stars)
  // =============================================================================
  const getReactedStorageKey = useCallback(
    (providerId) => `time-market-reacted:${providerId || "anon"}`,
    [],
  );
  const loadReactedFromStorage = useCallback(
    (providerId) => {
      try {
        const raw = localStorage.getItem(getReactedStorageKey(providerId));
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed && typeof parsed === "object" ? parsed : {};
      } catch {
        return {};
      }
    },
    [getReactedStorageKey],
  );
  const persistReacted = useCallback(
    (providerId, postId) => {
      try {
        const key = getReactedStorageKey(providerId);
        const current = loadReactedFromStorage(providerId);
        current[postId] = true;
        localStorage.setItem(key, JSON.stringify(current));
      } catch {
        // ignore
      }
    },
    [getReactedStorageKey, loadReactedFromStorage],
  );
  const sendReaction = useCallback(
    async (post) => {
      const postId = String(post?.id ?? "");
      if (!postId || !user?.phone) return;
      setReactingPostId(postId);
      try {
        const response = await fetch(`${API_URL}/api/home/react`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ post_id: postId, phone: user.phone }),
        });
        const data = await readJsonSafely(response);
        // Whether this is a brand-new star or an already-reacted repeat tap,
        // the Worker still returns the current counts - always sync them so
        // the number under the star reflects reality (including admin's
        // manual baseline), never just a locally-guessed +1.
        if (data.already_reacted) {
          setReactedPosts((current) => ({ ...current, [postId]: true }));
          persistReacted(user.id, postId);
          if (
            data.real_reactions !== undefined ||
            data.displayed_reactions !== undefined
          ) {
            setPosts((currentPosts) =>
              currentPosts.map((item) =>
                String(item.id) === postId
                  ? {
                      ...item,
                      real_reactions:
                        data.real_reactions ?? item.real_reactions,
                      manual_reactions:
                        data.manual_reactions ?? item.manual_reactions,
                      displayed_reactions:
                        data.displayed_reactions ?? item.displayed_reactions,
                    }
                  : item,
              ),
            );
          }
          return;
        }
        if (!data.success) {
          alert(
            data.error || data.message || "Failed to react to this service.",
          );
          return;
        }
        setReactedPosts((current) => ({ ...current, [postId]: true }));
        persistReacted(user.id, postId);
        setPosts((currentPosts) =>
          currentPosts.map((item) =>
            String(item.id) === postId
              ? {
                  ...item,
                  real_reactions: data.real_reactions,
                  manual_reactions: data.manual_reactions,
                  displayed_reactions: data.displayed_reactions,
                }
              : item,
          ),
        );
      } catch (error) {
        devError("Failed to react:", error);
        alert("Failed to react to this service. Please try again.");
      } finally {
        if (isMountedRef.current) {
          setReactingPostId(null);
        }
      }
    },
    [readJsonSafely, user, persistReacted],
  );
  const reactToPost = useCallback(
    (post) => {
      if (!isLoggedIn || !user) {
        openAuthModal("login", { type: "react", post });
        return;
      }
      const postId = String(post?.id ?? "");
      if (!postId || reactedPosts[postId] || reactingPostId === postId) return;
      sendReaction(post);
    },
    [
      isLoggedIn,
      user,
      openAuthModal,
      reactedPosts,
      reactingPostId,
      sendReaction,
    ],
  );
  useEffect(() => {
    if (!pendingAuthResolution || !isLoggedIn || !user) return;
    const { action, provider } = pendingAuthResolution;
    setPendingAuthResolution(null);
    if (action.type === "offer") {
      openServiceForm(provider || user, action.postType || "offer");
      return;
    }
    if (action.type === "message" && action.post) {
      openInboxForPost(action.post);
      return;
    }
    if (action.type === "call" && action.post) {
      callProvider(action.post);
      return;
    }
    if (action.type === "inbox") {
      openMyInbox(action.filterPostId || null);
      return;
    }
    if (action.type === "react" && action.post) {
      sendReaction(action.post);
    }
  }, [
    pendingAuthResolution,
    isLoggedIn,
    user,
    openServiceForm,
    openInboxForPost,
    callProvider,
    openMyInbox,
    sendReaction,
  ]);
  // The Worker's UNIQUE(post_id, phone) constraint is the real source of
  // truth for "already reacted" - this just keeps the star's visual state
  // in sync with it across reloads on the same device/browser.
  useEffect(() => {
    if (!user?.id || !posts.length) return;
    const stored = loadReactedFromStorage(user.id);
    const relevant = posts.reduce((acc, post) => {
      const postId = String(post.id);
      if (stored[postId]) acc[postId] = true;
      return acc;
    }, {});
    if (Object.keys(relevant).length) {
      setReactedPosts((current) => ({ ...relevant, ...current }));
    }
  }, [user, posts, loadReactedFromStorage]);
  // =============================================================================
  // WhatsApp Share
  // =============================================================================
  const sharePost = useCallback((post) => {
    const title = String(post?.title || "Time Market service").trim();
    const message = String(post?.subtitle || "").trim();
    const shareText = [title, message, window.location.href]
      .filter(Boolean)
      .join("\n\n");
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }, []);
  // =============================================================================
  // Rendering
  // =============================================================================
  const memoizedPosts = useMemo(() => {
    return posts.filter((post) => {
      const type = getPostType(post);
      if (activeCategory === "social-life") return type === "need";
      if (activeCategory === "tv") return type === "moment";
      return type === "offer" || type === "exchange";
    });
  }, [posts, activeCategory]);
  const emptySectionAction =
    activeCategory === "social-life"
      ? { label: "Ask for help", postType: "need" }
      : activeCategory === "tv"
        ? { label: "Share your moment", postType: "moment" }
        : { label: "Offer work or trade skills", postType: "offer" };
  let mainContent;
  if (loading) {
    mainContent = <FeedSkeleton />;
  } else if (!memoizedPosts.length) {
    mainContent = (
      <div className="empty-state">
        <p>
          {activeCategory === "social-life"
            ? "No one is asking for help yet."
            : activeCategory === "tv"
              ? "No stories or shared moments are available yet."
              : "No work offers or skill trades are available yet."}
        </p>
        <button
          type="button"
          onClick={() => handleOfferTime(emptySectionAction.postType)}
          className="empty-button"
        >
          {`\uFF0B ${emptySectionAction.label}`}
        </button>
      </div>
    );
  } else {
    mainContent = (
      <>
        <main className="home-feed">
          {memoizedPosts.map((post, index) => {
            const postId = String(post.id ?? index);
            const isOwner =
              isLoggedIn &&
              user &&
              String(post.provider_id ?? "") === String(user.id);
            return (
              <ServicePost
                key={postId}
                post={post}
                index={index}
                postId={postId}
                isActive={activePostIndex === index}
                reacted={Boolean(reactedPosts[postId])}
                reacting={reactingPostId === postId}
                unreadCount={unreadCountsByPost[postId] || 0}
                mediaAspectRatio={mediaAspectRatios[postId]}
                onMediaAspectRatio={handleMediaAspectRatio}
                isOwner={isOwner}
                postRefCallback={getPostRefCallback(index)}
                videoRefCallback={getVideoRefCallback(index)}
                onVideoPlay={noop}
                onVideoPause={noop}
                onViewProfile={openProviderProfile}
                onSellTime={handleOfferTime}
                onContactProvider={openInboxForPost}
                onCallProvider={callProvider}
                onOpenInbox={openInboxFromRail}
                onReact={reactToPost}
                onZoomImage={setZoomImage}
                isTvTab={activeCategory === "tv"}
                isSocialLife={activeCategory === "social-life"}
                showLiveConversation={
                  activeCategory === "tv" || activeCategory === "social-life"
                }
                conversationMode={
                  activeCategory === "social-life" ? "social-life" : "tv"
                }
                currentUser={isLoggedIn ? user : null}
                getSessionToken={getSessionToken}
                onRequireAuth={requireAuthForTv}
              />
            );
          })}
        </main>
        {hasMore && (
          <div className="load-more-wrap">
            <button
              type="button"
              className="load-more-button"
              onClick={loadMorePosts}
              disabled={loadingMore}
            >
              {loadingMore ? "Loading..." : "Load more services"}
            </button>
          </div>
        )}
      </>
    );
  }
  return (
    <div
      className={`home-page${activeCategory === "tv" ? " is-tv-mode" : ""}${
        activeCategory === "social-life" ? " is-social-life-mode" : ""
      }`}
    >
      <TimeMarketTopBar
        activeCategory={activeCategory}
        onCategoryChange={(category) => {
          setActivePostIndex(0);
          setActiveCategory(category);
        }}
        isLoggedIn={isLoggedIn}
        user={user}
        onLogout={handleLogout}
        onAuth={openAuthModal}
        onOpenMyProfile={() =>
          isLoggedIn ? openMyProfile() : openAuthModal("login")
        }
        onOpenMyServices={openMyServices}
        onOpenMyTime={() => setShowMyTime(true)}
        onOpenMyInbox={() => openMyInbox(null)}
        unreadCount={totalUnreadCount}
        onAddService={() => handleOfferTime(emptySectionAction.postType)}
        onOpenInfo={(topic) => setShowInfoModal(topic)}
      />
      {mainContent}
      {toast && (
        <div className="gwamo-toast" role="status" aria-live="polite">
          {toast.message}
        </div>
      )}
      {showEditor && (
        <ServiceEditorModal
          newCreatorName={newCreatorName}
          setNewCreatorName={setNewCreatorName}
          newCreatorIdentity={newCreatorIdentity}
          setNewCreatorIdentity={setNewCreatorIdentity}
          newTitle={newTitle}
          setNewTitle={setNewTitle}
          newMediaUrl={newMediaUrl}
          setNewMediaUrl={setNewMediaUrl}
          subtitle={subtitle}
          setSubtitle={setSubtitle}
          postType={postType}
          setPostType={setPostType}
          postHeadline={postHeadline}
          setPostHeadline={setPostHeadline}
          serviceCategory={serviceCategory}
          setServiceCategory={setServiceCategory}
          postLocation={postLocation}
          setPostLocation={setPostLocation}
          priceUnit={priceUnit}
          setPriceUnit={setPriceUnit}
          availability={availability}
          setAvailability={setAvailability}
          exchangeNeed={exchangeNeed}
          setExchangeNeed={setExchangeNeed}
          allowCashBalance={allowCashBalance}
          setAllowCashBalance={setAllowCashBalance}
          momentKind={momentKind}
          setMomentKind={setMomentKind}
          handleLogoChange={handleLogoChange}
          logoPreview={logoPreview}
          handleMediaFileChange={handleMediaFileChange}
          mediaPreview={mediaPreview}
          mediaPreviewType={mediaPreviewType}
          applyChanges={editingServicePost ? saveServiceEdit : applyChanges}
          closeEditor={closeEditor}
          saving={saving}
          uploadProgress={uploadProgress}
          compressingMedia={compressingMedia}
          isEdit={Boolean(editingServicePost)}
        />
      )}
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          mode={authMode}
          phone={authPhone}
          setPhone={setAuthPhone}
          fullName={authFullName}
          setFullName={setAuthFullName}
          pin={authPin}
          setPin={setAuthPin}
          confirmPin={authConfirmPin}
          setConfirmPin={setAuthConfirmPin}
          error={authError}
          successMessage={authSuccessMessage}
          loading={authLoading}
          onRegister={handleRegister}
          onLogin={handleLogin}
          onClose={closeAuthModal}
          onForgotPin={openPinReset}
          onOpenActivation={openActivationModal}
          onSwitchMode={() => {
            setAuthMode(authMode === "login" ? "register" : "login");
            setAuthError("");
            setAuthSuccessMessage("");
            setAuthPin("");
            setAuthConfirmPin("");
          }}
        />
      )}
      {showPinResetModal && (
        <PinResetModal
          step={pinResetStep}
          phone={pinResetPhone}
          setPhone={setPinResetPhone}
          request={pinResetRequest}
          newPin={pinResetNewPin}
          setNewPin={setPinResetNewPin}
          confirmPin={pinResetConfirmPin}
          setConfirmPin={setPinResetConfirmPin}
          error={pinResetError}
          loading={pinResetLoading}
          onRequest={requestPinReset}
          onCheckStatus={checkPinResetStatus}
          onComplete={completePinReset}
          onRestart={() => {
            setPinResetStep("request");
            setPinResetRequest(null);
            setPinResetError("");
            setPinResetNewPin("");
            setPinResetConfirmPin("");
          }}
          onClose={closePinReset}
        />
      )}
      {pendingPhoneReview && (
        <PendingPhoneReviewModal
          review={pendingPhoneReview}
          onClose={() => setPendingPhoneReview(null)}
        />
      )}
      {showActivationModal && (
        <ActivationCodeModal
          phone={activationPhone}
          setPhone={setActivationPhone}
          code={activationCode}
          setCode={setActivationCode}
          newPin={activationNewPin}
          setNewPin={setActivationNewPin}
          confirmPin={activationConfirmPin}
          setConfirmPin={setActivationConfirmPin}
          error={activationError}
          loading={activationLoading}
          onSubmit={submitActivationCode}
          onClose={() => {
            setShowActivationModal(false);
            setActivationCode("");
            setActivationNewPin("");
            setActivationConfirmPin("");
            setActivationError("");
          }}
        />
      )}
      {rejectedAccountInfo && (
        <RejectedAccountModal
          info={rejectedAccountInfo}
          onClose={() => setRejectedAccountInfo(null)}
          onRegisterAgain={() => {
            setRejectedAccountInfo(null);
            openAuthModal("register");
          }}
        />
      )}
      {zoomImage && (
        <ZoomableImageViewer
          src={zoomImage}
          alt="Profile"
          onClose={() => setZoomImage("")}
        />
      )}
      {showChat && chatPartner && (
        <ChatModal
          partner={chatPartner}
          currentUser={user}
          getSessionToken={getSessionToken}
          apiUrl={API_URL}
          onClose={closeChat}
          onZoomImage={setZoomImage}
          onRequireAuth={() => openAuthModal("login")}
        />
      )}
      {showProviderProfile && providerProfileTarget && (
        <ProviderProfileSheet
          post={providerProfileTarget}
          isOwner={Boolean(
            isLoggedIn &&
              user &&
              isSameProviderAsPost(providerProfileTarget, user),
          )}
          onClose={closeProviderProfile}
          onMessage={() => {
            const target = providerProfileTarget;
            closeProviderProfile();
            openInboxForPost(target);
          }}
          onShare={() => sharePost(providerProfileTarget)}
        />
      )}
      {showMyProfile && (
        <ProfileEditModal
          user={user}
          fullName={profileFullName}
          setFullName={setProfileFullName}
          serviceName={profileServiceName}
          setServiceName={setProfileServiceName}
          servicesOffered={profileServicesOffered}
          setServicesOffered={setProfileServicesOffered}
          photoPreview={profilePhotoPreview}
          onPhotoChange={handleProfilePhotoChange}
          onRemovePhoto={removeProfilePhoto}
          photoRemoved={profilePhotoFile === "remove"}
          contextPost={profileEditContextPost}
          onEditListing={openEditListingFromProfile}
          onOpenServices={() => {
            setShowMyProfile(false);
            openMyServices();
          }}
          onLogout={() => {
            setShowMyProfile(false);
            handleLogout();
          }}
          deleteConfirming={profileDeleteConfirming}
          setDeleteConfirming={setProfileDeleteConfirming}
          onDeleteAccount={deleteMyProviderAccount}
          saving={profileSaving}
          error={profileError}
          onSave={saveMyProfile}
          onClose={() => {
            setShowMyProfile(false);
            revokeObjectUrl(profilePhotoPreview);
            setProfilePhotoFile(null);
            setProfilePhotoPreview("");
            setProfileDeleteConfirming(false);
          }}
        />
      )}
      {showMyServices && (
        <MyServicesSheet
          services={myServices}
          loading={myServicesLoading}
          error={myServicesError}
          onEdit={openServiceEdit}
          onDelete={deleteMyService}
          onClose={() => setShowMyServices(false)}
          onCreateNew={() => {
            setShowMyServices(false);
            handleOfferTime();
          }}
        />
      )}
      {showMyTime && <MyTimeSheet onClose={() => setShowMyTime(false)} />}
      {showMyInbox && (
        <MyInboxSheet
          conversations={myConversations}
          loading={myConversationsLoading}
          error={myConversationsError}
          currentUserId={user?.id}
          filterServicePostId={myInboxFilterPostId}
          onOpenConversation={openConversationFromInbox}
          onClose={() => {
            setShowMyInbox(false);
            setMyInboxFilterPostId(null);
          }}
        />
      )}
      {showInfoModal && (
        <InfoModal
          topic={showInfoModal}
          onClose={() => setShowInfoModal(null)}
        />
      )}
      <HomeStyles />
    </div>
  );
}
// =============================================================================
// FeedSkeleton - shown only during the very first load (Step 1)
// =============================================================================
const FeedSkeleton = memo(function FeedSkeleton() {
  return (
    <main className="home-feed" aria-hidden="true">
      {[0, 1].map((key) => (
        <div className="service-reel-card skeleton-card" key={key}>
          <div className="skeleton-shimmer" />
        </div>
      ))}
    </main>
  );
});
FeedSkeleton.displayName = "FeedSkeleton";
// =============================================================================
// TimeMarketTopBar
// =============================================================================
const TimeMarketTopBar = memo(
  ({
    activeCategory,
    onCategoryChange,
    onOpenMyProfile,
    onOpenMyInbox,
    unreadCount,
    onAddService,
    onOpenInfo,
  }) => {
    const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
    const closeMenus = () => {
      setShowHamburgerMenu(false);
    };
    const openCategory = (tab) => {
      closeMenus();
      if (tab.href) {
        window.location.assign(tab.href);
        return;
      }
      onCategoryChange(tab.key);
    };
    return (
      <header className={`feedx-topbar${activeCategory === "tv" ? " is-tv-mode" : ""}`}>
        <div className="feedx-topbar-inner">
          <div className="gwamo-brand">
            <h1 className="feedx-logo">GWAMO</h1>
            <span className="gwamo-tagline">Your Time Has Value</span>
          </div>
          <div className="topbar-actions">
            <button
              type="button"
              className="topbar-neon-button"
              onClick={onOpenMyProfile}
              aria-label="Open your account and profile"
            >
              <User size={25} strokeWidth={2.1} aria-hidden="true" />
              <span className="topbar-action-text">Profile</span>
            </button>
            <button
              type="button"
              className="topbar-neon-button topbar-inbox-button"
              onClick={onOpenMyInbox}
              aria-label={
                unreadCount > 0
                  ? `Open inbox, ${unreadCount} unread message${unreadCount === 1 ? "" : "s"}`
                  : "Open inbox"
              }
            >
              <span className="inbox-icon-wrap">
                <Mail size={25} strokeWidth={2.1} aria-hidden="true" />
                {unreadCount > 0 && (
                  <span className="inbox-unread-badge" aria-hidden="true">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </span>
              <span className="topbar-action-text">Inbox</span>
            </button>
            <button
              type="button"
              className="topbar-neon-button topbar-add-button"
              onClick={onAddService}
              aria-label="Add your service"
            >
              <Plus size={27} strokeWidth={2.25} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="menu-button"
              onClick={() => {
                setShowHamburgerMenu((value) => !value);
              }}
              aria-label="Menu"
              aria-haspopup="true"
              aria-expanded={showHamburgerMenu}
            >
              <Menu size={24} strokeWidth={2} />
            </button>
            {showHamburgerMenu && (
              <div
                className="dropdown-backdrop"
                onClick={closeMenus}
                aria-hidden="true"
              />
            )}
            {showHamburgerMenu && (
              <div className="dropdown-menu hamburger-dropdown">
                {CATEGORY_TABS.filter((tab) => tab.href).map((tab) => (
                  <button
                    key={tab.key}
                    className="dropdown-item"
                    onClick={() => openCategory(tab)}
                  >
                    {tab.label}
                  </button>
                ))}
                <div className="dropdown-divider" />
                <button
                  className="dropdown-item"
                  onClick={() => {
                    closeMenus();
                    onOpenInfo("about");
                  }}
                >
                  About Gwamo
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    closeMenus();
                    onOpenInfo("help");
                  }}
                >
                  Help
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    closeMenus();
                    onOpenInfo("privacy");
                  }}
                >
                  Privacy Policy
                </button>
              </div>
            )}
          </div>
          <nav className="category-nav" aria-label="Gwamo sections">
            {CATEGORY_TABS.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.key}
                  type="button"
                  className={`category-tab${
                    activeCategory === tab.key ? " is-active" : ""
                  }`}
                  onClick={() => openCategory(tab)}
                  aria-current={
                    !tab.href && activeCategory === tab.key ? "page" : undefined
                  }
                >
                  <TabIcon size={15} strokeWidth={2.2} aria-hidden="true" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>
    );
  },
);
TimeMarketTopBar.displayName = "TimeMarketTopBar";
// =============================================================================
// ComingSoonPanel
// =============================================================================
const ComingSoonPanel = memo(({ category, onBack }) => {
  const meta = CATEGORY_META[category] || {
    label: "This section",
    blurb: "This section is coming soon.",
  };
  return (
    <div className="coming-soon-panel">
      <h2>{meta.label}</h2>
      <p>{meta.blurb}</p>
      <button type="button" className="empty-button" onClick={onBack}>
        Back to Time Market
      </button>
    </div>
  );
});
ComingSoonPanel.displayName = "ComingSoonPanel";
// =============================================================================
// ServicePost
// =============================================================================
const ServicePost = memo(function ServicePost({
  post,
  index,
  postId,
  isActive,
  reacted,
  reacting,
  unreadCount,
  mediaAspectRatio,
  onMediaAspectRatio,
  isOwner,
  postRefCallback,
  videoRefCallback,
  onVideoPlay,
  onVideoPause,
  onViewProfile,
  onSellTime,
  onContactProvider,
  onCallProvider,
  onOpenInbox,
  onReact,
  onZoomImage,
  isTvTab,
  isSocialLife,
  showLiveConversation,
  conversationMode,
  currentUser,
  getSessionToken,
  onRequireAuth,
}) {
  const mediaUrl = post.media_url || post.video_url || DEFAULT_VIDEO;
  const mediaType = post.media_type || "";
  const isImage = mediaType === "image" || (!mediaType && isImageUrl(mediaUrl));
  const isVideo =
    mediaType === "video" || (!mediaType && isDirectVideoUrl(mediaUrl));
  const isEmbed =
    mediaType === "embed" ||
    (!mediaType && !isImageUrl(mediaUrl) && !isDirectVideoUrl(mediaUrl));
  const verificationInfo = getVerificationStatus(post);
  const providerName =
    post.service_provider_name ||
    post.creator_name ||
    post.provider_name ||
    "Provider";
  const priceText =
    post.service_charge_per_minute || post.title || "Price not set";
  const priceSplit = priceText.split(/\/(.+)/);
  const priceMain = (priceSplit[0] || priceText).trim();
  const priceUnit = priceSplit[1] ? priceSplit[1].trim() : "";
  // Moment posts store their "Song saying / Movie saying / My story" label
  // in this same title field, not a real price - never show it here.
  const isMomentPost = getPostType(post) === "moment";
  const explicitServiceName = String(
    post.service_name || post.service_title || "",
  ).trim();
  const fullDescription = String(
    post.service_description ||
      post.description ||
      post.work_description ||
      post.subtitle ||
      post.services_offered ||
      "",
  ).trim();
  const serviceName = explicitServiceName.slice(0, 80);
  const tagline =
    fullDescription &&
    fullDescription.toLowerCase() !== serviceName.toLowerCase()
      ? fullDescription
      : "";
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const descriptionNeedsToggle = tagline.length > DESCRIPTION_PREVIEW_LENGTH;
  const visibleDescription = isDescriptionExpanded
    ? tagline
    : makeDescriptionPreview(tagline);
  const reactionCount = Number(post.displayed_reactions || 0);
  const viewCount = Number(
    post.displayed_views ??
      post.view_count ??
      post.views ??
      post.total_views ??
      post.real_views ??
      0,
  );
  const aspectClass =
    mediaAspectRatio && mediaAspectRatio < 0.85
      ? "is-portrait"
      : mediaAspectRatio && mediaAspectRatio > 1.2
        ? "is-landscape"
        : "is-square";
  const handleImageError = useCallback((event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = IMAGE_FALLBACK_SRC;
  }, []);
  const handleProfileImageError = useCallback((event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = DEFAULT_LOGO;
  }, []);
  const handleImageLoad = useCallback(
    (event) => {
      const image = event.currentTarget;
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      if (width && height) {
        onMediaAspectRatio(postId, width / height);
      }
    },
    [onMediaAspectRatio, postId],
  );
  const handleVideoLoadedMetadata = useCallback(
    (event) => {
      const video = event.currentTarget;
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (width && height) {
        onMediaAspectRatio(postId, width / height);
      }
    },
    [onMediaAspectRatio, postId],
  );
  // Media never auto-plays. A tap on the video toggles play/pause directly,
  // on top of the native controls bar, so a single touch is always enough.
  const handleVideoTap = useCallback((event) => {
    const video = event.currentTarget;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, []);
  const descriptionBlock = tagline ? (
    <div className="post-tagline-wrap">
      <p
        className={`post-tagline${isDescriptionExpanded ? " is-expanded" : ""}`}
      >
        {renderDescriptionWithLinks(visibleDescription)}
        {descriptionNeedsToggle && !isDescriptionExpanded ? "… " : " "}
        {descriptionNeedsToggle && (
          <button
            type="button"
            className="tagline-toggle-button"
            onClick={() => setIsDescriptionExpanded((current) => !current)}
            aria-expanded={isDescriptionExpanded}
          >
            {isDescriptionExpanded ? "less" : "more"}
          </button>
        )}
      </p>
    </div>
  ) : null;
  // "Call" is a second, independent way to reach the provider alongside
  // "Contact me" (chat). Built from the same public phone number the post
  // already carries (creator_identity) - not a new privacy exposure.
  const callPhone = normalizeWhatsAppNumber(post.creator_identity || "");
  const callHref = callPhone ? `tel:+${callPhone}` : "";
  return (
    <section
      ref={postRefCallback}
      data-index={index}
      className="home-post service-reel-card"
    >
      <div className="media-card">
        <div
          className={`media-viewport ${aspectClass}`}
          style={{ "--media-aspect-ratio": mediaAspectRatio || 16 / 9 }}
        >
          <div className="media-layer">
            {isTvTab && (isImage || isVideo) && (
              <div className="tv-media-backdrop" aria-hidden="true">
                {isImage ? (
                  <img src={mediaUrl} alt="" />
                ) : (
                  <video
                    src={mediaUrl}
                    muted
                    playsInline
                    preload="auto"
                    tabIndex={-1}
                  />
                )}
              </div>
            )}
            {isImage && (
              <img
                src={mediaUrl}
                alt={serviceName || tagline || DEFAULT_MEDIA_LABEL}
                className="home-media"
                loading={index === 0 ? "eager" : "lazy"}
                decoding="async"
                fetchPriority={index === 0 ? "high" : "auto"}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            )}
            {isVideo && (
              <video
                ref={videoRefCallback}
                src={mediaUrl}
                loop
                playsInline
                muted={false}
                controls
                preload="metadata"
                className="home-media"
                onPlay={() => onVideoPlay(postId)}
                onPause={() => onVideoPause(postId)}
                onLoadedMetadata={handleVideoLoadedMetadata}
                onClick={handleVideoTap}
              />
            )}
            {isEmbed &&
              (isActive ? (
                <iframe
                  src={getEmbedUrl(mediaUrl)}
                  title={serviceName || tagline || "Time Market media"}
                  className="home-media"
                  frameBorder="0"
                  allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope"
                  allowFullScreen
                  loading="lazy"
                />
              ) : (
                <div className="embed-placeholder">
                  <span className="embed-placeholder-icon">{"\u25B6"}</span>
                  {(serviceName || tagline) && (
                    <span>{serviceName || tagline}</span>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>
      <div className="service-card-gradient" aria-hidden="true" />
      <div className="glass-frame-overlay" aria-hidden="true" />
      {showLiveConversation && (
        <TvConversationOverlay
          postId={postId}
          isActive={isActive}
          apiUrl={API_URL}
          mode={conversationMode}
          viewCount={isTvTab ? viewCount : null}
          currentUser={currentUser}
          getSessionToken={getSessionToken}
          onRequireAuth={onRequireAuth}
          onZoomImage={onZoomImage}
        />
      )}
      <div className="post-info-block">
        <div className="post-provider-row">
          <button
            type="button"
            className={`service-avatar-badge ${verificationInfo.className}`}
            onClick={() => onZoomImage(post.logo_url || DEFAULT_LOGO)}
            aria-label={`View ${providerName}'s profile photo`}
          >
            <img
              src={post.logo_url || DEFAULT_LOGO}
              alt=""
              loading="lazy"
              decoding="async"
              onError={handleProfileImageError}
            />
          </button>
          <div className="post-provider-copy">
            <button
              type="button"
              className="creator-name"
              onClick={() => onViewProfile(post)}
            >
              <span>{providerName}</span>
              {verificationInfo.status === "verified" && (
                <span
                  className="verified-check-badge"
                  role="img"
                  aria-label="Verified"
                >
                  <Check size={11} strokeWidth={3.5} aria-hidden="true" />
                </span>
              )}
            </button>
            {serviceName && <h2 className="service-name">{serviceName}</h2>}
            {priceMain && !isMomentPost && (
              <div className="post-price">
                <span>{priceMain}</span>
                {priceUnit && <span className="post-price-unit"> / {priceUnit}</span>}
              </div>
            )}
            {descriptionBlock}
          </div>
        </div>
      </div>
      {!showLiveConversation && (
        <div className="service-social-rail" aria-label="Service engagement">
          <button
            type="button"
            className={`rail-action star-action${reacted ? " is-active" : ""}`}
            onClick={() => onReact(post)}
            disabled={reacting || reacted}
            aria-label={`React to this service, currently ${formatCount(reactionCount)} stars`}
            aria-pressed={reacted}
          >
            <Star
              className="gold-star"
              size={34}
              fill="currentColor"
              aria-hidden="true"
            />
            <span>{formatCount(reactionCount)}</span>
          </button>
        </div>
      )}
      {showLiveConversation ? (
        <button
          type="button"
          className="tv-private-contact-cta"
          onClick={() => onContactProvider(post)}
          aria-label={`Privately contact ${providerName}`}
          title="Private contact"
        >
          <Mail size={20} aria-hidden="true" />
        </button>
      ) : (
        <button
          type="button"
          className="contact-me-cta"
          onClick={() => onContactProvider(post)}
        >
          <Send size={20} aria-hidden="true" />
          <span>Contact me</span>
        </button>
      )}
      {(isSocialLife || !showLiveConversation) && callHref && (
        <button
          type="button"
          className={isSocialLife ? "social-life-call-cta" : "call-me-button"}
          onClick={() => onCallProvider(post)}
          aria-label={`Call ${providerName}`}
          title={isSocialLife ? "Call" : undefined}
        >
          <Phone size={20} aria-hidden="true" />
        </button>
      )}
    </section>
  );
});
ServicePost.displayName = "ServicePost";
// =============================================================================
// TvConversationOverlay - public, animated conversation floating over TV
// media. Entirely separate from private "Contact me" messaging. Reading is
// public; only sending requires login. Only the currently active/in-view
// TV card keeps a live connection (WebSocket, falling back to modest
// polling) - off-screen cards stay idle to save resources and battery.
// =============================================================================
const TvConversationOverlay = memo(function TvConversationOverlay({
  postId,
  isActive,
  apiUrl,
  mode = "tv",
  viewCount = null,
  currentUser,
  getSessionToken,
  onRequireAuth,
  onZoomImage,
}) {
  const isSocialLife = mode === "social-life";
  const [visibleMessages, setVisibleMessages] = useState([]);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerText, setComposerText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [introStep, setIntroStep] = useState("name");
  const [introName, setIntroName] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [pausedMessageIds, setPausedMessageIds] = useState(() => new Set());
  const [remoteTypingUsers, setRemoteTypingUsers] = useState({});
  const [localTyping, setLocalTyping] = useState(false);
  const [tvIdentity, setTvIdentity] = useState({
    name: "",
    photoUrl: "",
    countryCode: "",
  });
  const socketRef = useRef(null);
  const pollTimerRef = useRef(null);
  const seenIdsRef = useRef(new Set());
  const isMountedRef = useRef(true);
  const typingStopTimerRef = useRef(null);
  const remoteTypingTimersRef = useRef(new Map());
  const identityKey = TV_PUBLIC_IDENTITY_KEY;
  const [publicViewerId] = useState(() => getOrCreateTvPublicViewerId());
  const identityComplete = Boolean(
    tvIdentity.name && tvIdentity.photoUrl && tvIdentity.countryCode,
  );
  const filteredCountries = useMemo(() => {
    const query = countrySearch.trim().toLowerCase();
    if (!query) return TV_COUNTRY_OPTIONS;
    return TV_COUNTRY_OPTIONS.filter(([code, name]) =>
      `${name} ${code}`.toLowerCase().includes(query),
    );
  }, [countrySearch]);
  const circulatingMessages = useMemo(
    () => [...visibleMessages].reverse(),
    [visibleMessages],
  );
  const localTypingIdentity = useMemo(
    () =>
      localTyping && identityComplete
        ? {
            id: `self-${publicViewerId}`,
            user_name: tvIdentity.name,
            profile_image: tvIdentity.photoUrl,
            country_code: tvIdentity.countryCode,
          }
        : null,
    [localTyping, identityComplete, publicViewerId, tvIdentity],
  );
  const typingPresence = useMemo(() => {
    if (localTypingIdentity) return localTypingIdentity;
    const remote = Object.values(remoteTypingUsers);
    if (!remote.length) return null;
    remote.sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
    return remote[0];
  }, [localTypingIdentity, remoteTypingUsers]);

  const saveIdentity = useCallback(
    (nextIdentity) => {
      setTvIdentity(nextIdentity);
      try {
        localStorage.setItem(identityKey, JSON.stringify(nextIdentity));
      } catch {
        // Local persistence is a convenience only; public conversation still works.
      }
    },
    [identityKey],
  );

  useEffect(() => {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(identityKey) || "null");
    } catch {
      saved = null;
    }
    const normalized = {
      name: String(saved?.name || "").trim().slice(0, 50),
      photoUrl: String(saved?.photoUrl || "").trim(),
      countryCode: String(saved?.countryCode || "").trim().toUpperCase(),
    };
    setTvIdentity(normalized);
    setIntroName(normalized.name);
    if (!normalized.name) setIntroStep("name");
    else if (!normalized.photoUrl) setIntroStep("photo");
    else if (!normalized.countryCode) setIntroStep("country");
    else setIntroStep("message");
  }, [identityKey]);

  const laneCounterRef = useRef(0);
  const lastLiveLaunchRef = useRef(0);
  const appendMessages = useCallback((incoming, { live = false } = {}) => {
    if (!incoming || !incoming.length) return;
    setVisibleMessages((current) => {
      const merged = [...current];
      for (const rawMessage of incoming) {
        if (!rawMessage) continue;
        const fallbackId = `${rawMessage.created_at || "now"}-${rawMessage.user_name || "viewer"}-${rawMessage.message || ""}`;
        const messageId = String(rawMessage.id ?? fallbackId);
        if (seenIdsRef.current.has(messageId)) continue;
        seenIdsRef.current.add(messageId);

        const slot = laneCounterRef.current % TV_VISIBLE_MESSAGE_LIMIT;
        laneCounterRef.current += 1;

        let delay = -(slot * 6);
        if (live) {
          const now = Date.now();
          const earliest = lastLiveLaunchRef.current + 4200;
          const launchAt = Math.max(now, earliest);
          delay = Math.max(0, (launchAt - now) / 1000);
          lastLiveLaunchRef.current = launchAt;
        }

        merged.push({
          ...rawMessage,
          id: messageId,
          _tvLane: 0,
          _tvDuration: 48,
          _tvDelay: delay,
        });
      }
      return merged.length > TV_VISIBLE_MESSAGE_LIMIT
        ? merged.slice(merged.length - TV_VISIBLE_MESSAGE_LIMIT)
        : merged;
    });
  }, []);

  const normalizePublicItems = useCallback((data) => {
    const items = Array.isArray(data?.comments)
      ? data.comments
      : Array.isArray(data?.messages)
        ? data.messages
        : [];
    return items
      .map((item) => ({
        ...item,
        message: String(item?.message ?? item?.comment ?? item?.text ?? "").trim(),
      }))
      .filter((item) => item.message);
  }, []);

  const fetchPublicItems = useCallback(
    async (limit = 10) => {
      const encodedPostId = encodeURIComponent(postId);
      const candidates = [
        `${apiUrl}/api/tv/conversation?post_id=${encodedPostId}&limit=${limit}`,
      ];

      for (const url of candidates) {
        try {
          const response = await fetch(url, { cache: "no-store" });
          if ([404, 405, 501].includes(response.status)) continue;
          const data = await response.json().catch(() => ({}));
          if (!response.ok || data?.success === false) return [];
          return normalizePublicItems(data);
        } catch {
          // Try the compatibility endpoint when one exists.
        }
      }
      return [];
    },
    [apiUrl, postId, isSocialLife, normalizePublicItems],
  );

  const loadRecent = useCallback(async () => {
    const recent = await fetchPublicItems(30);
    if (isMountedRef.current) {
      appendMessages(recent.slice(-TV_VISIBLE_MESSAGE_LIMIT));
    }
  }, [fetchPublicItems, appendMessages]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return;
    pollTimerRef.current = setInterval(async () => {
      if (document.hidden || !isMountedRef.current) return;
      const items = await fetchPublicItems(10);
      if (isMountedRef.current) appendMessages(items, { live: true });
    }, TV_POLL_INTERVAL_MS);
  }, [fetchPublicItems, appendMessages]);

  const clearRemoteTyping = useCallback((key) => {
    setRemoteTypingUsers((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    const timer = remoteTypingTimersRef.current.get(key);
    if (timer) clearTimeout(timer);
    remoteTypingTimersRef.current.delete(key);
  }, []);

  const receiveTypingPresence = useCallback(
    (payload) => {
      const typing = payload?.typing ?? payload?.active ?? true;
      const userId = String(payload?.user_id || payload?.viewer_id || "");
      if (userId && String(publicViewerId) === userId) return;
      const key = userId || String(payload?.user_name || payload?.name || "viewer");
      if (!typing) {
        clearRemoteTyping(key);
        return;
      }
      const person = {
        id: key,
        user_name: payload?.user_name || payload?.name || "Someone",
        profile_image:
          payload?.profile_image || payload?.profile_image_url || DEFAULT_LOGO,
        country_code: payload?.country_code || "",
        updatedAt: Date.now(),
      };
      setRemoteTypingUsers((current) => ({ ...current, [key]: person }));
      const oldTimer = remoteTypingTimersRef.current.get(key);
      if (oldTimer) clearTimeout(oldTimer);
      const timer = setTimeout(() => clearRemoteTyping(key), 2600);
      remoteTypingTimersRef.current.set(key, timer);
    },
    [clearRemoteTyping, publicViewerId],
  );

  const connectRealtime = useCallback(async () => {
    if (isSocialLife) {
      startPolling();
      return;
    }
    try {
      const response = await fetch(`${apiUrl}/api/tv/realtime/ticket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tv_post_id: postId }),
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success || !data.websocket_url) {
        startPolling();
        return;
      }
      const socket = new WebSocket(data.websocket_url);
      socketRef.current = socket;
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.type === "tv_message" && payload.message) {
            appendMessages([payload.message], { live: true });
          } else if (payload?.type === "tv_typing") {
            receiveTypingPresence(payload);
          }
        } catch {
          // Ignore malformed frames.
        }
      };
      socket.onclose = () => {
        socketRef.current = null;
        if (isMountedRef.current) startPolling();
      };
      socket.onerror = () => {
        try {
          socket.close();
        } catch {
          /* already closing */
        }
      };
    } catch {
      startPolling();
    }
  }, [
    apiUrl,
    postId,
    appendMessages,
    startPolling,
    receiveTypingPresence,
    isSocialLife,
  ]);

  useEffect(() => {
    isMountedRef.current = true;
    if (!isActive) return undefined;
    loadRecent();
    connectRealtime();
    return () => {
      isMountedRef.current = false;
      stopPolling();
      if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
      remoteTypingTimersRef.current.forEach((timer) => clearTimeout(timer));
      remoteTypingTimersRef.current.clear();
      if (socketRef.current) {
        try {
          socketRef.current.close();
        } catch {
          /* already closing */
        }
        socketRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, postId, mode]);

  const announceTyping = useCallback(
    (active) => {
      setLocalTyping(Boolean(active));
      const socket = socketRef.current;
      if (!identityComplete || !socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }
      try {
        socket.send(
          JSON.stringify({
            type: "tv_typing",
            tv_post_id: postId,
            typing: Boolean(active),
            user_id: publicViewerId,
            user_name: tvIdentity.name,
            profile_image: tvIdentity.photoUrl,
            country_code: tvIdentity.countryCode,
          }),
        );
      } catch {
        // Typing presence is optional; sending the actual message still works.
      }
    },
    [identityComplete, postId, publicViewerId, tvIdentity],
  );

  const scheduleTypingStop = useCallback(() => {
    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    typingStopTimerRef.current = setTimeout(() => announceTyping(false), 1400);
  }, [announceTyping]);

  const beginConversation = useCallback(() => {
    setError("");
    setComposerOpen(true);
    if (!tvIdentity.name) setIntroStep("name");
    else if (!tvIdentity.photoUrl) setIntroStep("photo");
    else if (!tvIdentity.countryCode) setIntroStep("country");
    else setIntroStep("message");
  }, [tvIdentity]);

  const closeComposer = useCallback(() => {
    announceTyping(false);
    setComposerOpen(false);
    setCountrySearch("");
    setError("");
  }, [announceTyping]);

  const submitName = useCallback(() => {
    const name = introName.trim().replace(/\s+/g, " ").slice(0, 50);
    if (!name) {
      setError("Tell Gwamo what people should call you.");
      return;
    }
    setError("");
    const next = { ...tvIdentity, name };
    saveIdentity(next);
    setIntroStep("photo");
  }, [introName, tvIdentity, saveIdentity]);

  const uploadTvPhoto = useCallback(
    async (file) => {
      if (!file) return;
      if (!file.type?.startsWith("image/")) {
        setError("Choose an image for your profile picture.");
        return;
      }
      setUploadingPhoto(true);
      setError("");
      try {
        const prepared = await compressImageFile(file, {
          maxWidth: 180,
          maxHeight: 180,
          quality: 0.68,
        });

        let photoUrl = "";
        const token = getSessionToken?.() || "";
        if (token) {
          const uploadForm = new FormData();
          uploadForm.append("file", prepared);
          uploadForm.append("kind", "profile_image");
          const uploadResponse = await fetch(`${apiUrl}/api/home/upload`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: uploadForm,
            cache: "no-store",
          });
          const uploadData = await uploadResponse.json().catch(() => ({}));
          if (uploadResponse.ok && uploadData.success && uploadData.url) {
            photoUrl = uploadData.url;
          }
        }

        if (!photoUrl) {
          photoUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = () => reject(new Error("Could not read your profile picture."));
            reader.readAsDataURL(prepared);
          });
        }

        const next = { ...tvIdentity, photoUrl };
        saveIdentity(next);
        setIntroStep("country");
      } catch (err) {
        setError(err.message || "Could not upload your profile picture.");
      } finally {
        setUploadingPhoto(false);
      }
    },
    [
      getSessionToken,
      apiUrl,
      tvIdentity,
      saveIdentity,
    ],
  );

  const chooseCountry = useCallback(
    (code) => {
      const next = { ...tvIdentity, countryCode: code };
      saveIdentity(next);
      setCountrySearch("");
      setIntroStep("message");
      setError("");
    },
    [tvIdentity, saveIdentity],
  );

  const toggleMessagePause = useCallback((messageId) => {
    setPausedMessageIds((current) => {
      const next = new Set(current);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  }, []);

  const sendPublicItem = useCallback(
    async (text) => {
      const token = getSessionToken?.() || "";
      const commonPayload = {
        message: text,
        comment: text,
        country_code: tvIdentity.countryCode,
        user_name: tvIdentity.name,
        display_name: tvIdentity.name,
        profile_image: tvIdentity.photoUrl,
        profile_image_url: tvIdentity.photoUrl,
      };
      const candidates = [
        {
          url: `${apiUrl}/api/tv/conversation`,
          body: {
            ...commonPayload,
            tv_post_id: postId,
            post_id: postId,
          },
        },
      ];

      for (const candidate of candidates) {
        const response = await fetch(candidate.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(candidate.body),
          cache: "no-store",
        });
        if ([404, 405, 501].includes(response.status)) continue;
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data?.success === false) {
          throw new Error(
            data.error ||
              data.message ||
              (isSocialLife
                ? "Could not send your comment."
                : "Could not send your message."),
          );
        }
        return data;
      }
      throw new Error(
        isSocialLife
          ? "Social Life comments are not available on the server yet."
          : "Public conversation is not available right now.",
      );
    },
    [
      getSessionToken,
      tvIdentity,
      isSocialLife,
      apiUrl,
      postId,
    ],
  );

  const sendMessage = useCallback(async () => {
    const text = composerText.trim();
    if (!text) return;
    if (!identityComplete) {
      beginConversation();
      return;
    }
    announceTyping(false);
    setSending(true);
    setError("");
    try {
      const data = await sendPublicItem(text);
      setComposerText("");
      const returnedItem = data.comment || data.message || null;
      const sent = returnedItem
        ? {
            ...returnedItem,
            message: String(
              returnedItem.message ?? returnedItem.comment ?? text,
            ),
            user_name: returnedItem.user_name || tvIdentity.name,
            profile_image:
              returnedItem.profile_image ||
              returnedItem.profile_image_url ||
              tvIdentity.photoUrl,
            country_code: returnedItem.country_code || tvIdentity.countryCode,
          }
        : {
            id: `local-${Date.now()}`,
            user_name: tvIdentity.name,
            profile_image: tvIdentity.photoUrl,
            country_code: tvIdentity.countryCode,
            message: text,
            created_at: new Date().toISOString(),
          };
      appendMessages([sent], { live: true });
    } catch (err) {
      setError(
        err.message ||
          (isSocialLife
            ? "Could not send your comment."
            : "Could not send your message."),
      );
    } finally {
      setSending(false);
    }
  }, [
    composerText,
    identityComplete,
    beginConversation,
    announceTyping,
    tvIdentity,
    appendMessages,
    sendPublicItem,
    isSocialLife,
  ]);

  const renderMessage = (message) => {
    const messageId = String(message.id);
    const paused = pausedMessageIds.has(messageId);
    const lane = Number(message._tvLane || 0);
    const duration = Number(message._tvDuration || 12);
    const delay = Number(message._tvDelay || 0);
    const profileImage =
      message.profile_image || message.profile_image_url || DEFAULT_LOGO;
    return (
      <div
        className={`tv-message-item${paused ? " is-paused" : ""}`}
        key={messageId}
        style={{
          bottom: `${lane * TV_MESSAGE_LANE_HEIGHT}px`,
          "--tv-message-duration": `${duration}s`,
          "--tv-message-delay": `${delay}s`,
        }}
        onClick={(event) => {
          event.stopPropagation();
          toggleMessagePause(messageId);
        }}
        role="button"
        tabIndex={0}
        aria-pressed={paused}
        aria-label={
          paused
            ? "Resume this public conversation message"
            : "Pause this public conversation message"
        }
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleMessagePause(messageId);
          }
        }}
      >
        <button
          type="button"
          className="tv-message-avatar"
          onClick={(event) => {
            event.stopPropagation();
            onZoomImage?.(profileImage);
          }}
          aria-label={`View ${message.user_name || "viewer"}'s profile picture`}
        >
          <img
            src={profileImage}
            alt=""
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = DEFAULT_LOGO;
            }}
          />
          <span className="tv-message-flag" aria-hidden="true">
            {countryCodeToFlagEmoji(message.country_code)}
          </span>
        </button>
        <span className="tv-message-body">
          <strong className="tv-message-name">
            {message.user_name || "Someone"}
          </strong>
          <span className="tv-message-text">{message.message}</span>
          {paused && (
            <span className="tv-message-paused-mark" aria-hidden="true">
              Ⅱ
            </span>
          )}
        </span>
      </div>
    );
  };

  return (
    <>
      {!isSocialLife && (
        <div className="tv-live-anchor" aria-hidden="true">
          <span className="tv-live-dot" />
          <span>LIVE</span>
        </div>
      )}

      <div
        className={`tv-conversation-column${overlayVisible ? "" : " is-hidden"}`}
        aria-live="polite"
        aria-hidden={!overlayVisible}
      >
        {circulatingMessages.map(renderMessage)}
      </div>

      <div className="tv-public-action-dock" onClick={(event) => event.stopPropagation()}>
        {typingPresence && (
          <div className="tv-typing-presence" aria-label={`${typingPresence.user_name || "Someone"} is typing`}>
            <button
              type="button"
              className="tv-typing-avatar"
              onClick={() =>
                onZoomImage?.(
                  typingPresence.profile_image ||
                    typingPresence.profile_image_url ||
                    DEFAULT_LOGO,
                )
              }
              aria-label={`View ${typingPresence.user_name || "viewer"}'s profile picture`}
            >
              <img
                src={
                  typingPresence.profile_image ||
                  typingPresence.profile_image_url ||
                  DEFAULT_LOGO
                }
                alt=""
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = DEFAULT_LOGO;
                }}
              />
              <span>{countryCodeToFlagEmoji(typingPresence.country_code)}</span>
            </button>
            <strong>{typingPresence.user_name || "Someone"}</strong>
            <span className="tv-typing-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </div>
        )}
        <button
          type="button"
          className={`tv-public-conversation-cta${isSocialLife ? " is-social-life" : ""}`}
          onClick={beginConversation}
          aria-label={
            isSocialLife
              ? "Add a public Social Life comment"
              : "Join the public TV conversation"
          }
          title={isSocialLife ? "Comment" : "Public conversation"}
        >
          {isSocialLife ? (
            <MessageSquare
              className="tv-public-conversation-bolt"
              size={24}
              strokeWidth={2.2}
              aria-hidden="true"
            />
          ) : (
            <span className="tv-public-conversation-glyph" aria-hidden="true">
              <MessageSquare className="tv-public-conversation-bubble" size={29} strokeWidth={1.9} />
              <Zap className="tv-public-conversation-zap" size={15} strokeWidth={2.4} />
            </span>
          )}
        </button>
        <button
          type="button"
          className="tv-visibility-toggle"
          onClick={() => setOverlayVisible((value) => !value)}
          aria-pressed={overlayVisible}
          aria-label={
            overlayVisible
              ? isSocialLife
                ? "Hide comments"
                : "Hide public conversation"
              : isSocialLife
                ? "Show comments"
                : "Show public conversation"
          }
          title={
            overlayVisible
              ? isSocialLife
                ? "Hide comments"
                : "Hide conversation"
              : isSocialLife
                ? "Show comments"
                : "Show conversation"
          }
        >
          {overlayVisible ? (
            <Eye size={21} aria-hidden="true" />
          ) : (
            <EyeOff size={21} aria-hidden="true" />
          )}
        </button>
      </div>

      {composerOpen && (
        <div
          className="tv-chat-guide"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="tv-chat-guide-head">
            <span className="tv-gwamo-orb" aria-hidden="true">G</span>
            <div className="tv-chat-guide-copy">
              <strong>Gwamo</strong>
              <span>
                {introStep === "name" && "What should people call you?"}
                {introStep === "photo" && "Add your profile picture."}
                {introStep === "country" && "Where are you watching from?"}
                {introStep === "message" &&
                  (isSocialLife
                    ? "Add a public comment."
                    : "You’re live. Say something ⚡")}
              </span>
            </div>
            <button
              type="button"
              className="tv-guide-close"
              onClick={closeComposer}
              aria-label="Close public conversation"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          {introStep === "name" && (
            <div className="tv-guide-reply-row">
              <input
                type="text"
                className="tv-guide-input"
                value={introName}
                maxLength={50}
                autoFocus
                placeholder="Your name"
                onChange={(event) => setIntroName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submitName();
                }}
                aria-label={
                  isSocialLife ? "Your public comment name" : "Your public TV name"
                }
              />
              <button
                type="button"
                className="tv-guide-symbol-button"
                onClick={submitName}
                aria-label="Continue"
              >
                <Send size={17} aria-hidden="true" />
              </button>
            </div>
          )}

          {introStep === "photo" && (
            <div className="tv-guide-photo-step">
              {tvIdentity.photoUrl ? (
                <img
                  className="tv-guide-photo-preview"
                  src={tvIdentity.photoUrl}
                  alt="Your public profile"
                />
              ) : null}
              <label
                className={`tv-guide-upload-symbol${uploadingPhoto ? " is-busy" : ""}`}
                aria-label="Upload your profile picture"
                title="Upload profile picture"
              >
                <ImagePlus size={24} aria-hidden="true" />
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingPhoto}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) uploadTvPhoto(file);
                  }}
                />
              </label>
            </div>
          )}

          {introStep === "country" && (
            <div className="tv-country-picker">
              <input
                type="search"
                className="tv-country-search"
                placeholder="Search country"
                value={countrySearch}
                onChange={(event) => setCountrySearch(event.target.value)}
                aria-label="Search countries"
              />
              <div className="tv-country-list" role="listbox" aria-label="Choose your country">
                {filteredCountries.map(([code, name]) => (
                  <button
                    type="button"
                    className="tv-country-option"
                    key={code}
                    onClick={() => chooseCountry(code)}
                    role="option"
                    aria-selected={tvIdentity.countryCode === code}
                  >
                    <span className="tv-country-flag" aria-hidden="true">
                      {countryCodeToFlagEmoji(code)}
                    </span>
                    <span>{name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {introStep === "message" && (
            <div className="tv-guide-message-row">
              <button
                type="button"
                className="tv-guide-self-avatar"
                onClick={() => onZoomImage?.(tvIdentity.photoUrl || DEFAULT_LOGO)}
                aria-label="View your public profile picture"
              >
                <img src={tvIdentity.photoUrl || DEFAULT_LOGO} alt="" />
                <span aria-hidden="true">
                  {countryCodeToFlagEmoji(tvIdentity.countryCode)}
                </span>
              </button>
              <input
                type="text"
                className="tv-guide-input tv-guide-message-input"
                placeholder={isSocialLife ? "Write a comment…" : "Say something…"}
                maxLength={220}
                value={composerText}
                autoFocus
                onChange={(event) => {
                  setComposerText(event.target.value);
                  if (event.target.value.trim()) {
                    announceTyping(true);
                    scheduleTypingStop();
                  } else {
                    announceTyping(false);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") sendMessage();
                }}
                onBlur={() => announceTyping(false)}
                aria-label={
                  isSocialLife ? "Public Social Life comment" : "Public TV message"
                }
              />
              <button
                type="button"
                className="tv-guide-symbol-button"
                onClick={sendMessage}
                disabled={sending || !composerText.trim()}
                aria-label={
                  isSocialLife ? "Send public comment" : "Send public message"
                }
              >
                <Send size={17} aria-hidden="true" />
              </button>
            </div>
          )}
          {error && <div className="tv-composer-error">{error}</div>}
        </div>
      )}
    </>
  );
});
TvConversationOverlay.displayName = "TvConversationOverlay";
// =============================================================================
// ServiceEditorModal
// =============================================================================
const ServiceEditorModal = memo(
  ({
    newCreatorName,
    setNewCreatorName,
    newCreatorIdentity,
    setNewCreatorIdentity,
    newTitle,
    setNewTitle,
    newMediaUrl,
    setNewMediaUrl,
    subtitle,
    setSubtitle,
    postType,
    setPostType,
    postHeadline,
    setPostHeadline,
    serviceCategory,
    setServiceCategory,
    postLocation,
    setPostLocation,
    priceUnit,
    setPriceUnit,
    availability,
    setAvailability,
    exchangeNeed,
    setExchangeNeed,
    allowCashBalance,
    setAllowCashBalance,
    momentKind,
    setMomentKind,
    handleLogoChange,
    logoPreview,
    handleMediaFileChange,
    mediaPreview,
    mediaPreviewType,
    applyChanges,
    closeEditor,
    saving,
    uploadProgress,
    compressingMedia,
    isEdit = false,
  }) => {
    useEscapeToClose(closeEditor);
    return (
    <div className="modal-overlay" onClick={closeEditor}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {isEdit ? "\u270E Edit Post" : "\uFF0B What are you posting?"}
          </h2>
          <button
            type="button"
            onClick={closeEditor}
            className="modal-close"
            aria-label="Close"
          >
            {"\u00D7"}
          </button>
        </div>
        {!isEdit && (
          <div className="form-section post-type-section">
            <div className="section-heading">Choose one</div>
            <div
              className="post-type-grid"
              role="radiogroup"
              aria-label="Post type"
            >
              {[
                [
                  "offer",
                  "\uD83D\uDEE0\uFE0F",
                  "Offer Work",
                  "Show what you can do",
                ],
                [
                  "need",
                  "\uD83D\uDE4B",
                  "Ask for Help",
                  "Find someone to help",
                ],
                [
                  "exchange",
                  "\uD83D\uDD04",
                  "Trade Skills",
                  "Give work, get work",
                ],
                [
                  "moment",
                  "\u2728",
                  "Share a Moment",
                  "Story, song or movie saying",
                ],
              ].map(([value, icon, label, help]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={postType === value}
                  className={`post-type-choice${postType === value ? " is-selected" : ""}`}
                  onClick={() => setPostType(value)}
                >
                  <span className="post-type-icon" aria-hidden="true">
                    {icon}
                  </span>
                  <strong>{label}</strong>
                  <small>{help}</small>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="form-section">
          <div className="section-heading">
            {postType === "offer"
              ? "Your work"
              : postType === "need"
                ? "Help you need"
                : postType === "exchange"
                  ? "Your trade"
                  : "Your moment"}
          </div>
          {postType === "moment" && (
            <>
              <label>What kind of moment?</label>
              <div
                className="choice-pill-row"
                role="radiogroup"
                aria-label="Moment type"
              >
                {[
                  ["story", "My story"],
                  ["song", "Song saying"],
                  ["movie", "Movie saying"],
                  ["recommend", "Recommend someone"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={momentKind === value}
                    className={`choice-pill${momentKind === value ? " is-selected" : ""}`}
                    onClick={() => setMomentKind(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
          <label htmlFor="field-post-headline">
            {postType === "offer"
              ? "What work can you do?"
              : postType === "need"
                ? "What help do you need?"
                : postType === "exchange"
                  ? "What service can you give?"
                  : "Short title"}
          </label>
          <input
            id="field-post-headline"
            type="text"
            placeholder={
              postType === "offer"
                ? "e.g. Fast phone repair"
                : postType === "need"
                  ? "e.g. I need a plumber"
                  : postType === "exchange"
                    ? "e.g. Website design"
                    : "e.g. This movie taught me courage"
            }
            value={postHeadline}
            onChange={(event) => setPostHeadline(event.target.value)}
          />
          {postType === "exchange" && (
            <>
              <label htmlFor="field-exchange-need">
                What service do you need?
              </label>
              <input
                id="field-exchange-need"
                type="text"
                placeholder="e.g. Professional photography"
                value={exchangeNeed}
                onChange={(event) => setExchangeNeed(event.target.value)}
              />
            </>
          )}
          {postType !== "moment" && (
            <>
              <label htmlFor="field-category">Category</label>
              <select
                id="field-category"
                value={serviceCategory}
                onChange={(event) => setServiceCategory(event.target.value)}
              >
                <option value="">Choose a category</option>
                <option value="Phone repair">Phone repair</option>
                <option value="Cleaning">Cleaning</option>
                <option value="Teaching">Teaching</option>
                <option value="Construction">Construction</option>
                <option value="Cooking">Cooking</option>
                <option value="Transport">Transport</option>
                <option value="Beauty">Beauty</option>
                <option value="Computer help">Computer help</option>
                <option value="Farming">Farming</option>
                <option value="Photography">Photography</option>
                <option value="Other">Other</option>
              </select>
            </>
          )}
          <label htmlFor="field-description">
            {postType === "offer"
              ? "Tell people about your work"
              : postType === "need"
                ? "Explain the problem"
                : postType === "exchange"
                  ? "Explain your exchange"
                  : "Write your saying, story, or thought"}
          </label>
          <textarea
            id="field-description"
            placeholder={
              postType === "offer"
                ? "e.g. I fix screens, batteries and charging ports."
                : postType === "need"
                  ? "e.g. My kitchen water pipe is leaking."
                  : postType === "exchange"
                    ? "e.g. I can build a business website and I need photos for my work."
                    : "Add your own words so people understand why this matters to you."
            }
            value={subtitle}
            onChange={(event) => setSubtitle(event.target.value)}
          />
          {postType !== "moment" && (
            <>
              <label htmlFor="field-location">Where?</label>
              <input
                id="field-location"
                type="text"
                placeholder="e.g. Kigali, Gasabo"
                value={postLocation}
                onChange={(event) => setPostLocation(event.target.value)}
              />
            </>
          )}
          {postType === "offer" && (
            <div className="two-field-row">
              <div>
                <label htmlFor="field-charge">Price</label>
                <input
                  id="field-charge"
                  type="text"
                  placeholder="e.g. 5,000 RWF"
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                />
              </div>
              <div>
                <label htmlFor="field-price-unit">How do you charge?</label>
                <select
                  id="field-price-unit"
                  value={priceUnit}
                  onChange={(event) => setPriceUnit(event.target.value)}
                >
                  <option value="job">Per job</option>
                  <option value="hour">Per hour</option>
                  <option value="day">Per day</option>
                  <option value="minute">Per minute</option>
                </select>
              </div>
            </div>
          )}
          {postType === "need" && (
            <>
              <label htmlFor="field-charge">Your budget (Optional)</label>
              <input
                id="field-charge"
                type="text"
                placeholder="e.g. 15,000 RWF"
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
              />
            </>
          )}
          {postType === "exchange" && (
            <>
              <label>Can cash balance the difference?</label>
              <div
                className="choice-pill-row"
                role="radiogroup"
                aria-label="Allow cash balance"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={allowCashBalance}
                  className={`choice-pill${allowCashBalance ? " is-selected" : ""}`}
                  onClick={() => setAllowCashBalance(true)}
                >
                  Yes
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={!allowCashBalance}
                  className={`choice-pill${!allowCashBalance ? " is-selected" : ""}`}
                  onClick={() => setAllowCashBalance(false)}
                >
                  No
                </button>
              </div>
            </>
          )}
          {(postType === "offer" || postType === "need") && (
            <>
              <label>When?</label>
              <div
                className="choice-pill-row"
                role="radiogroup"
                aria-label="When"
              >
                {[
                  ["today", "Today"],
                  ["this week", "This week"],
                  ["choose date", "Choose date later"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={availability === value}
                    className={`choice-pill${availability === value ? " is-selected" : ""}`}
                    onClick={() => setAvailability(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className={`form-section${isEdit ? " form-section-last" : ""}`}>
          <div className="section-heading">Photo or video</div>
          <label className="file-picker" htmlFor="field-media-upload">
            <span>
              {compressingMedia
                ? "Processing..."
                : postType === "moment"
                  ? "\u25A3 Add a photo or short video"
                  : "\u25A3 Show the work, need, or skill"}
            </span>
            <input
              id="field-media-upload"
              type="file"
              accept="image/*,video/*"
              disabled={compressingMedia}
              onChange={(event) =>
                handleMediaFileChange(event.target.files?.[0] || null)
              }
            />
          </label>
          {mediaPreview && (
            <div className="preview-wrap">
              {mediaPreviewType === "image" ? (
                <img
                  src={mediaPreview}
                  alt="Selected media"
                  className="media-preview"
                />
              ) : (
                <video
                  src={mediaPreview}
                  className="media-preview"
                  controls
                  muted
                  playsInline
                />
              )}
            </div>
          )}
          <label htmlFor="field-media-link">Media link (Optional)</label>
          <input
            id="field-media-link"
            type="text"
            placeholder="e.g. https://youtube.com/watch?v=xxxxx"
            value={newMediaUrl}
            onChange={(event) => setNewMediaUrl(event.target.value)}
          />
          <p className="field-help">Upload media or paste a supported link.</p>
        </div>
        {!isEdit && (
          <div className="form-section form-section-last">
            <div className="section-heading">Your picture (Optional)</div>
            <label className="file-picker" htmlFor="field-profile-photo">
              <span>
                {compressingMedia
                  ? "Processing..."
                  : "\u25CE Add or change your profile photo"}
              </span>
              <input
                id="field-profile-photo"
                type="file"
                accept="image/*"
                disabled={compressingMedia}
                onChange={(event) =>
                  handleLogoChange(event.target.files?.[0] || null)
                }
              />
            </label>
            {logoPreview && (
              <div className="preview-wrap">
                <img
                  src={logoPreview}
                  alt="Profile preview"
                  className="logo-preview"
                />
              </div>
            )}
          </div>
        )}
        {saving && (
          <div
            className="upload-progress-wrap"
            role="status"
            aria-live="polite"
          >
            <div className="upload-progress-text">
              <span>
                {uploadProgress < 96
                  ? isEdit
                    ? "Saving changes..."
                    : "Uploading your post..."
                  : "Finishing up..."}
              </span>
              <strong>{uploadProgress}%</strong>
            </div>
            <div
              className="upload-progress-track"
              role="progressbar"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={uploadProgress}
            >
              <span style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={applyChanges}
          className="save-button"
          disabled={saving || compressingMedia}
        >
          {saving
            ? isEdit
              ? `Saving... ${uploadProgress}%`
              : `Creating Post... ${uploadProgress}%`
            : isEdit
              ? "Save Changes"
              : postType === "offer"
                ? "Post my work"
                : postType === "need"
                  ? "Post my request"
                  : postType === "exchange"
                    ? "Post my trade"
                    : "Share my moment"}
        </button>
        <button type="button" onClick={closeEditor} className="cancel-button">
          Cancel
        </button>
      </div>
    </div>
    );
  },
);
ServiceEditorModal.displayName = "ServiceEditorModal";
// =============================================================================
// AuthModal
// =============================================================================
const AuthModal = memo(
  ({
    isOpen,
    mode,
    phone,
    setPhone,
    fullName,
    setFullName,
    pin,
    setPin,
    confirmPin,
    setConfirmPin,
    error,
    successMessage,
    loading,
    onRegister,
    onLogin,
    onClose,
    onSwitchMode,
    onForgotPin,
    onOpenActivation,
  }) => {
    useEscapeToClose(onClose, isOpen);
    if (!isOpen) return null;
    return (
      <div className="modal-overlay auth-modal-overlay" onClick={onClose}>
        <div
          className="modal-card auth-modal-card"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="modal-header">
            <h2>{mode === "login" ? "Login" : "Register"}</h2>
            <button
              type="button"
              onClick={onClose}
              className="modal-close"
              aria-label="Close"
            >
              <X size={20} strokeWidth={2.4} aria-hidden="true" />
            </button>
          </div>
          {successMessage && (
            <div className="auth-success-message">{successMessage}</div>
          )}
          <div className="form-section">
            <label htmlFor="auth-phone">Telephone Number</label>
            <input
              id="auth-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              autoFocus
              placeholder="+250 788 123 456"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && mode === "login") onLogin();
              }}
            />
          </div>
          {mode === "register" && (
            <div className="form-section">
              <label htmlFor="auth-name">Full Name</label>
              <input
                id="auth-name"
                type="text"
                autoComplete="name"
                placeholder="e.g. John Doe"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </div>
          )}
          <div className={`form-section${mode === "login" ? " form-section-last" : ""}`}>
            <label htmlFor="auth-pin">Personal PIN</label>
            <input
              id="auth-pin"
              type="password"
              inputMode="numeric"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder="8-digit PIN"
              maxLength={8}
              pattern="[0-9]{8}"
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 8))}
              onKeyDown={(event) => {
                if (event.key === "Enter" && mode === "login") onLogin();
              }}
            />
          </div>
          {mode === "register" && (
            <div className="form-section form-section-last">
              <label htmlFor="auth-confirm-pin">Confirm PIN</label>
              <input
                id="auth-confirm-pin"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                placeholder="Repeat the 8-digit PIN"
                maxLength={8}
                pattern="[0-9]{8}"
                value={confirmPin}
                onChange={(event) =>
                  setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 8))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") onRegister();
                }}
              />
              <small className="auth-helper-text">
                Use a PIN you can remember. Gwamo staff should never ask you to reveal it.
              </small>
            </div>
          )}
          {error && <p className="auth-error">{error}</p>}
          <button
            type="button"
            className="save-button"
            onClick={mode === "login" ? onLogin : onRegister}
            disabled={loading}
          >
            {loading ? "Loading..." : mode === "login" ? "Login" : "Register"}
          </button>
          {mode === "login" && (
            <button
              type="button"
              className="forgot-pin-button"
              onClick={onForgotPin}
              disabled={loading}
            >
              Forgot PIN?
            </button>
          )}
          {mode === "login" && (
            <button
              type="button"
              className="forgot-pin-button"
              onClick={onOpenActivation}
              disabled={loading}
            >
              Have an activation code from the admin?
            </button>
          )}
          <button
            type="button"
            className="switch-mode-button"
            onClick={onSwitchMode}
          >
            {mode === "login"
              ? "Don't have an account? Register"
              : "Already have an account? Login"}
          </button>
          <button type="button" onClick={onClose} className="cancel-button">
            Cancel
          </button>
        </div>
      </div>
    );
  },
);
AuthModal.displayName = "AuthModal";
// =============================================================================
// Personal PIN recovery - approval is completed by an administrator only after
// calling the registered telephone number and matching the displayed code.
// =============================================================================
const PinResetModal = memo(
  ({
    step,
    phone,
    setPhone,
    request,
    newPin,
    setNewPin,
    confirmPin,
    setConfirmPin,
    error,
    loading,
    onRequest,
    onCheckStatus,
    onComplete,
    onRestart,
    onClose,
  }) => {
    useEscapeToClose(onClose);
    return (
    <div className="modal-overlay auth-modal-overlay" onClick={onClose}>
      <div
        className="modal-card auth-modal-card pin-reset-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2>Reset personal PIN</h2>
            <p className="modal-header-note">Protected by a call to your registered number</p>
          </div>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Close">
            <X size={20} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>
        {step === "request" && (
          <>
            <p className="pin-reset-intro">
              Enter the telephone number on your account. An admin will call that same number
              and ask for the one-time verification code shown here.
            </p>
            <div className="form-section form-section-last">
              <label htmlFor="pin-reset-phone">Registered telephone number</label>
              <input
                id="pin-reset-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                autoFocus
                placeholder="+250 788 123 456"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") onRequest();
                }}
              />
            </div>
            {error && <p className="auth-error">{error}</p>}
            <button type="button" className="save-button" onClick={onRequest} disabled={loading}>
              {loading ? "Requesting..." : "Request PIN reset"}
            </button>
          </>
        )}
        {step === "waiting" && (
          <>
            <div className="pin-verification-panel" role="status" aria-live="polite">
              <span>Your verification code</span>
              <strong>
                {request?.verificationCode || request?.verification_code || request?.code || "----"}
              </strong>
            </div>
            <p className="pin-reset-intro">
              Do not send this code in chat. Wait for the admin to call your registered number,
              then read the code during that call. The admin must approve it before you continue.
            </p>
            {error && <p className="auth-error">{error}</p>}
            <button
              type="button"
              className="save-button"
              onClick={() => onCheckStatus()}
              disabled={loading}
            >
              {loading ? "Checking..." : "Check approval"}
            </button>
            <p className="field-help" style={{ marginTop: 10, marginBottom: 0 }}>
              This checks automatically every few seconds while this screen is open.
            </p>
            <button type="button" className="switch-mode-button" onClick={onRestart}>
              Use a different number
            </button>
          </>
        )}
        {step === "delivered" && (
          <>
            <div className="auth-success-message">
              Telephone ownership approved and a new PIN was generated.
            </div>
            <p className="pin-reset-intro">
              For your safety, the new PIN is never shown in the app. Gwamo
              will share it with you directly by phone call or SMS to your
              registered number. Once you have it, log in with your
              telephone number and that PIN.
            </p>
            <button type="button" className="save-button" onClick={onClose}>
              Done
            </button>
          </>
        )}
        <button type="button" onClick={onClose} className="cancel-button">
          Cancel
        </button>
      </div>
    </div>
    );
  },
);
PinResetModal.displayName = "PinResetModal";
const PendingPhoneReviewModal = memo(({ review, onClose }) => {
  useEscapeToClose(onClose);
  return (
  <div className="modal-overlay auth-modal-overlay" onClick={onClose}>
    <div
      className="modal-card auth-modal-card pin-reset-card"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="modal-header">
        <h2>You're almost in!</h2>
        <button type="button" onClick={onClose} className="modal-close" aria-label="Close">
          <X size={20} strokeWidth={2.4} aria-hidden="true" />
        </button>
      </div>
      <p className="pin-reset-intro">
        Thank you for joining Gwamo. Your registration is now with our team
        for a quick review to confirm you're a real person with a genuine
        account.
      </p>
      <p className="pin-reset-intro">
        We're currently working through quite a few new sign-ups, so this
        can take anywhere from about 5 minutes up to a full day depending on
        how many people registered just ahead of you. Hang tight - you're in
        good hands, and we're moving through the list as quickly as we can.
      </p>
      {review?.phone && (
        <p className="auth-helper-text">
          We'll be in touch on the number you registered with once it's
          your turn.
        </p>
      )}
      <button type="button" className="save-button" onClick={onClose}>
        Got it, I'll check back soon
      </button>
    </div>
  </div>
  );
});
PendingPhoneReviewModal.displayName = "PendingPhoneReviewModal";
// =============================================================================
// ActivationCodeModal - reachable directly from the login modal, so a
// person who forgot the PIN they typed at registration is never blocked.
// The admin's 6-digit code alone proves identity; the person sets/confirms
// their PIN right here and is logged in immediately on success.
// =============================================================================
const ActivationCodeModal = memo(
  ({
    phone,
    setPhone,
    code,
    setCode,
    newPin,
    setNewPin,
    confirmPin,
    setConfirmPin,
    error,
    loading,
    onSubmit,
    onClose,
  }) => {
    useEscapeToClose(onClose);
    return (
      <div className="modal-overlay auth-modal-overlay" onClick={onClose}>
        <div
          className="modal-card auth-modal-card pin-reset-card"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="modal-header">
            <h2>Activate your account</h2>
            <button
              type="button"
              onClick={onClose}
              className="modal-close"
              aria-label="Close"
            >
              <X size={20} strokeWidth={2.4} aria-hidden="true" />
            </button>
          </div>
          <p className="pin-reset-intro">
            Your account was approved. You don't need to remember the PIN
            you typed when you registered - just enter your telephone
            number, the 6-digit code the admin gave you, and a PIN to use
            from now on.
          </p>
          <div className="form-section">
            <label htmlFor="activation-phone">Telephone number</label>
            <input
              id="activation-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              autoFocus
              placeholder="+250 788 123 456"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>
          <div className="form-section">
            <label htmlFor="activation-code">Activation code</label>
            <input
              id="activation-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              pattern="[0-9]{6}"
              placeholder="6-digit code"
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
            />
          </div>
          <div className="form-section">
            <label htmlFor="activation-new-pin">Personal PIN</label>
            <input
              id="activation-new-pin"
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              placeholder="8-digit PIN"
              maxLength={8}
              pattern="[0-9]{8}"
              value={newPin}
              onChange={(event) =>
                setNewPin(event.target.value.replace(/\D/g, "").slice(0, 8))
              }
            />
            <small className="auth-helper-text">
              You can reuse the PIN you tried at registration, or set a new
              one - whichever you'll remember.
            </small>
          </div>
          <div className="form-section form-section-last">
            <label htmlFor="activation-confirm-pin">Confirm PIN</label>
            <input
              id="activation-confirm-pin"
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              placeholder="Repeat the 8-digit PIN"
              maxLength={8}
              pattern="[0-9]{8}"
              value={confirmPin}
              onChange={(event) =>
                setConfirmPin(
                  event.target.value.replace(/\D/g, "").slice(0, 8),
                )
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") onSubmit();
              }}
            />
          </div>
          {error && <p className="auth-error">{error}</p>}
          <button
            type="button"
            className="save-button"
            onClick={onSubmit}
            disabled={loading}
          >
            {loading ? "Activating..." : "Activate my account"}
          </button>
          <button type="button" onClick={onClose} className="cancel-button">
            Cancel
          </button>
        </div>
      </div>
    );
  },
);
ActivationCodeModal.displayName = "ActivationCodeModal";
// =============================================================================
// RejectedAccountModal - shown when a login attempt reveals the account
// was rejected. Explains why in plain terms and offers a direct path to
// register again with a correctly-registered number.
// =============================================================================
const RejectedAccountModal = memo(({ info, onClose, onRegisterAgain }) => {
  useEscapeToClose(onClose);
  return (
    <div className="modal-overlay auth-modal-overlay" onClick={onClose}>
      <div
        className="modal-card auth-modal-card pin-reset-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Registration not approved</h2>
          <button
            type="button"
            onClick={onClose}
            className="modal-close"
            aria-label="Close"
          >
            <X size={20} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>
        <p className="pin-reset-intro">{info?.message}</p>
        <button
          type="button"
          className="save-button"
          onClick={onRegisterAgain}
        >
          Register again
        </button>
        <button type="button" onClick={onClose} className="cancel-button">
          Close
        </button>
      </div>
    </div>
  );
});
RejectedAccountModal.displayName = "RejectedAccountModal";
// =============================================================================
// ChatModal - real conversation-start + message contract, with polling
// =============================================================================
const ChatModal = memo(
  ({
    partner,
    currentUser,
    getSessionToken,
    apiUrl,
    onClose,
    onZoomImage,
    onRequireAuth,
  }) => {
    useEscapeToClose(onClose);
    const draftKey = `${CHAT_DRAFT_PREFIX}${
      partner.servicePostId || partner.conversationId || "new"
    }`;
    const [conversationId, setConversationId] = useState(
      partner.conversationId || "",
    );
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState(() => {
      try {
        return window.sessionStorage.getItem(draftKey) || "";
      } catch {
        return "";
      }
    });
    const [loading, setLoading] = useState(
      Boolean(partner.conversationId && currentUser),
    );
    const [sending, setSending] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [pendingFailedText, setPendingFailedText] = useState(null);
    const [pendingFailedAttachment, setPendingFailedAttachment] = useState(null);
    const [attachMenuOpen, setAttachMenuOpen] = useState(false);
    const [attachError, setAttachError] = useState("");
    const [showNewMessagesButton, setShowNewMessagesButton] = useState(false);
    const messagesEndRef = useRef(null);
    const messagesListRef = useRef(null);
    const pollRef = useRef(null);
    const isNearBottomRef = useRef(true);
    const isMountedRef = useRef(true);
    const photoInputRef = useRef(null);
    const videoInputRef = useRef(null);
    const documentInputRef = useRef(null);
    const pendingSendAfterAuthRef = useRef(false);
    const pendingAttachmentAfterAuthRef = useRef(null);
    const objectUrlsRef = useRef([]);
    const lastMessageCountRef = useRef(0);
    const trackObjectUrl = useCallback((url) => {
      objectUrlsRef.current.push(url);
      return url;
    }, []);
    const normalizeMessage = useCallback(
      (raw) => ({
        id: String(raw.id),
        senderId: String(raw.sender_provider_id ?? raw.senderId ?? ""),
        text: raw.text_content ?? raw.text ?? "",
        type: raw.message_type ?? raw.type ?? "text",
        mediaUrl: raw.media_url ?? raw.mediaUrl ?? "",
        fileName: raw.file_name ?? raw.fileName ?? "Document",
        createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
        readAt: raw.read_at ?? raw.readAt ?? null,
        deliveredAt: raw.delivered_at ?? raw.deliveredAt ?? null,
        pending: Boolean(raw.pending),
        failed: Boolean(raw.failed),
      }),
      [],
    );
    const authHeaders = useCallback(() => {
      const token = getSessionToken();
      return token ? { Authorization: `Bearer ${token}` } : {};
    }, [getSessionToken]);
    useEffect(() => {
      try {
        if (inputText) {
          window.sessionStorage.setItem(draftKey, inputText);
        } else {
          window.sessionStorage.removeItem(draftKey);
        }
      } catch {
        /* A disabled storage API must never block messaging. */
      }
    }, [draftKey, inputText]);
    const ensureConversation = useCallback(async () => {
      if (conversationId) return conversationId;
      const token = getSessionToken();
      if (!currentUser || !token) {
        throw new Error("Login with your telephone and personal PIN to send.");
      }
      const response = await fetch(`${apiUrl}/api/time-market/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          service_post_id: partner.servicePostId,
          provider_id: partner.providerId || undefined,
          provider_phone: partner.providerPhone || undefined,
        }),
      });
      const text = await response.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(text || "Could not start this conversation.");
      }
      if (!response.ok || !data.success) {
        throw new Error(
          data.error || data.message || "Could not start this conversation.",
        );
      }
      const id = String(data.conversation?.id || "");
      if (!id) throw new Error("Could not start this conversation.");
      setConversationId(id);
      return id;
    }, [
      apiUrl,
      conversationId,
      currentUser,
      getSessionToken,
      partner.providerId,
      partner.providerPhone,
      partner.servicePostId,
    ]);
    const loadMessages = useCallback(
      async (id, { silent = false } = {}) => {
        if (!id) return;
        if (!silent) setLoading(true);
        try {
          const response = await fetch(
            `${apiUrl}/api/time-market/messages?conversation_id=${encodeURIComponent(id)}`,
            {
              headers: { ...authHeaders() },
              cache: "no-store",
            },
          );
          const text = await response.text();
          let data = {};
          try {
            data = text ? JSON.parse(text) : {};
          } catch {
            throw new Error(text || "Could not load messages.");
          }
          if (!response.ok || !data.success) {
            throw new Error(
              data.error || data.message || "Could not load messages.",
            );
          }
          if (!isMountedRef.current) return;
          const normalized = (data.messages || []).map(normalizeMessage);
          setMessages((current) => {
            const pendingOnes = current.filter((message) => message.pending);
            const knownIds = new Set(normalized.map((message) => message.id));
            const merged = [...normalized];
            pendingOnes.forEach((pendingMessage) => {
              if (!knownIds.has(pendingMessage.id)) merged.push(pendingMessage);
            });
            return merged;
          });
          setLoadError("");
        } catch (error) {
          if (!silent && isMountedRef.current) {
            setLoadError(error.message || "Could not load messages.");
          }
        } finally {
          if (!silent && isMountedRef.current) setLoading(false);
        }
      },
      [apiUrl, authHeaders, normalizeMessage],
    );
    useEffect(() => {
      isMountedRef.current = true;
      if (partner.conversationId && currentUser) {
        loadMessages(String(partner.conversationId)).catch(() => {});
      } else {
        setLoading(false);
        setLoadError("");
      }
      return () => {
        isMountedRef.current = false;
      };
    }, [currentUser, loadMessages, partner.conversationId]);
    // Poll while open, stop when hidden/closed/unmounted.
    useEffect(() => {
      if (!conversationId) return undefined;
      const startPolling = () => {
        if (pollRef.current) return;
        pollRef.current = setInterval(() => {
          if (document.hidden) return;
          loadMessages(conversationId, { silent: true });
        }, MESSAGE_POLL_INTERVAL_MS);
      };
      const stopPolling = () => {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      };
      const handleVisibility = () => {
        if (document.hidden) {
          stopPolling();
        } else {
          loadMessages(conversationId, { silent: true });
          startPolling();
        }
      };
      startPolling();
      document.addEventListener("visibilitychange", handleVisibility);
      return () => {
        stopPolling();
        document.removeEventListener("visibilitychange", handleVisibility);
      };
    }, [conversationId, loadMessages]);
    // Only auto-scroll when the reader is already near the bottom; otherwise
    // surface a "New messages" button instead of yanking their scroll position.
    useEffect(() => {
      const grew = messages.length > lastMessageCountRef.current;
      lastMessageCountRef.current = messages.length;
      if (isNearBottomRef.current) {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ block: "end" });
        }
        setShowNewMessagesButton(false);
        return;
      }
      if (grew) {
        const lastMessage = messages[messages.length - 1];
        const isOwnMessage =
          lastMessage && String(lastMessage.senderId) === String(currentUser?.id);
        if (!isOwnMessage) {
          setShowNewMessagesButton(true);
        }
      }
    }, [messages, currentUser]);
    const handleScroll = useCallback(() => {
      const node = messagesListRef.current;
      if (!node) return;
      const distanceFromBottom =
        node.scrollHeight - node.scrollTop - node.clientHeight;
      isNearBottomRef.current = distanceFromBottom < 120;
      if (isNearBottomRef.current) setShowNewMessagesButton(false);
    }, []);
    const scrollToBottom = useCallback(() => {
      isNearBottomRef.current = true;
      setShowNewMessagesButton(false);
      messagesEndRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    }, []);
    const sendMessage = useCallback(async () => {
      const text = inputText.trim();
      if (!text || sending) return;
      if (!currentUser || !getSessionToken()) {
        pendingSendAfterAuthRef.current = true;
        onRequireAuth?.();
        return;
      }
      setInputText("");
      setPendingFailedText(null);
      const tempId = `pending-${Date.now()}`;
      const optimisticMessage = {
        id: tempId,
        senderId: String(currentUser?.id || ""),
        text,
        type: "text",
        mediaUrl: "",
        createdAt: new Date().toISOString(),
        readAt: null,
        pending: true,
        failed: false,
      };
      setMessages((current) => [...current, optimisticMessage]);
      isNearBottomRef.current = true;
      setSending(true);
      try {
        const id = await ensureConversation();
        const response = await fetch(`${apiUrl}/api/time-market/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({
            conversation_id: id,
            message_type: "text",
            text,
          }),
        });
        const responseText = await response.text();
        let data = {};
        try {
          data = responseText ? JSON.parse(responseText) : {};
        } catch {
          throw new Error(responseText || "Could not send message.");
        }
        if (!response.ok || !data.success) {
          throw new Error(
            data.error || data.message || "Could not send message.",
          );
        }
        const confirmed = normalizeMessage(data.message);
        setMessages((current) =>
          current.map((message) =>
            message.id === tempId ? confirmed : message,
          ),
        );
      } catch (error) {
        setMessages((current) =>
          current.map((message) =>
            message.id === tempId
              ? { ...message, pending: false, failed: true }
              : message,
          ),
        );
        setPendingFailedText({ text, tempId });
      } finally {
        if (isMountedRef.current) setSending(false);
      }
    }, [
      inputText,
      sending,
      ensureConversation,
      apiUrl,
      authHeaders,
      currentUser,
      getSessionToken,
      normalizeMessage,
      onRequireAuth,
    ]);
    useEffect(() => {
      if (!currentUser || !pendingSendAfterAuthRef.current || !inputText.trim()) return;
      pendingSendAfterAuthRef.current = false;
      sendMessage();
    }, [currentUser, inputText, sendMessage]);
    const retryFailedText = useCallback(() => {
      if (!pendingFailedText) return;
      setInputText(pendingFailedText.text);
      setPendingFailedText(null);
      setMessages((current) =>
        current.filter((message) => message.id !== pendingFailedText.tempId),
      );
    }, [pendingFailedText]);
    // =============================================================================
    // Attachments (photo, video, document), reusing the existing multipart
    // path on POST /api/time-market/messages.
    // =============================================================================
    const sendAttachment = useCallback(
      async (file, typeHint) => {
        if (!file) return;
        setAttachMenuOpen(false);
        setAttachError("");
        if (!currentUser || !getSessionToken()) {
          pendingAttachmentAfterAuthRef.current = { file, typeHint };
          onRequireAuth?.();
          return;
        }
        const tempId = `pending-${Date.now()}`;
        const previewUrl = trackObjectUrl(URL.createObjectURL(file));
        const optimisticMessage = {
          id: tempId,
          senderId: String(currentUser?.id || ""),
          text: "",
          type: typeHint,
          mediaUrl: previewUrl,
          fileName: file.name || "Attachment",
          createdAt: new Date().toISOString(),
          readAt: null,
          pending: true,
          failed: false,
        };
        setMessages((current) => [...current, optimisticMessage]);
        isNearBottomRef.current = true;
        setSending(true);
        try {
          const id = await ensureConversation();
          const formData = new FormData();
          formData.append("conversation_id", id);
          formData.append("file", file);
          formData.append("message_type", typeHint);
          const response = await fetch(`${apiUrl}/api/time-market/messages`, {
            method: "POST",
            headers: { ...authHeaders() },
            body: formData,
          });
          const responseText = await response.text();
          let data = {};
          try {
            data = responseText ? JSON.parse(responseText) : {};
          } catch {
            throw new Error(responseText || "Could not send attachment.");
          }
          if (!response.ok || !data.success) {
            throw new Error(
              data.error || data.message || "Could not send attachment.",
            );
          }
          const confirmed = normalizeMessage(data.message);
          setMessages((current) =>
            current.map((message) =>
              message.id === tempId ? confirmed : message,
            ),
          );
        } catch (error) {
          setMessages((current) =>
            current.map((message) =>
              message.id === tempId
                ? { ...message, pending: false, failed: true }
                : message,
            ),
          );
          setAttachError(error.message || "Could not send attachment.");
          setPendingFailedAttachment({ file, typeHint, tempId });
        } finally {
          if (isMountedRef.current) setSending(false);
        }
      },
      [
        apiUrl,
        authHeaders,
        currentUser,
        ensureConversation,
        getSessionToken,
        normalizeMessage,
        onRequireAuth,
        trackObjectUrl,
      ],
    );
    useEffect(() => {
      if (!currentUser || !pendingAttachmentAfterAuthRef.current) return;
      const pending = pendingAttachmentAfterAuthRef.current;
      pendingAttachmentAfterAuthRef.current = null;
      sendAttachment(pending.file, pending.typeHint);
    }, [currentUser, sendAttachment]);
    const retryFailedAttachment = useCallback(() => {
      if (!pendingFailedAttachment) return;
      const pending = pendingFailedAttachment;
      setPendingFailedAttachment(null);
      setAttachError("");
      setMessages((current) =>
        current.filter((message) => message.id !== pending.tempId),
      );
      sendAttachment(pending.file, pending.typeHint);
    }, [pendingFailedAttachment, sendAttachment]);
    const handlePickPhoto = useCallback(
      (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file) sendAttachment(file, "image");
      },
      [sendAttachment],
    );
    const handlePickVideo = useCallback(
      (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file) sendAttachment(file, "video");
      },
      [sendAttachment],
    );
    const handlePickDocument = useCallback(
      (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file) sendAttachment(file, "document");
      },
      [sendAttachment],
    );
    // The provider's phone number for the call icon in the composer (the
    // same public number used by the card-level Call button); falls back to
    // empty when a conversation was opened from the inbox for a legacy post
    // that has no linked phone.
    const callPhone = partner.providerPhone || "";
    const callHref = callPhone ? `tel:+${callPhone}` : "";
    useEffect(() => {
      return () => {
        objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      };
    }, []);
    // Group messages into Today/Yesterday/date sections for the separators.
    const groupedMessages = useMemo(() => {
      const groups = [];
      let currentLabel = null;
      for (const message of messages) {
        const label = formatDayLabel(message.createdAt);
        if (label !== currentLabel) {
          groups.push({ type: "separator", label, key: `sep-${message.id}` });
          currentLabel = label;
        }
        groups.push({ type: "message", message });
      }
      return groups;
    }, [messages]);
    return (
      <div className="chat-modal-overlay" onClick={onClose}>
        <div
          className="chat-modal"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="chat-header">
            <button
              className="chat-back"
              onClick={onClose}
              aria-label="Close chat"
            >
              <X size={20} />
            </button>
            <img
              className="chat-header-avatar"
              src={partner.avatar || DEFAULT_LOGO}
              alt=""
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = DEFAULT_LOGO;
              }}
            />
            <div className="chat-header-copy">
              <strong className="chat-header-name">
                {partner.name}
                {partner.verified && (
                  <span
                    className="verified-check-badge chat-header-verified"
                    role="img"
                    aria-label="Verified"
                  >
                    <Check size={10} strokeWidth={3.5} aria-hidden="true" />
                  </span>
                )}
              </strong>
              {partner.serviceName || partner.headline ? (
                <small>{partner.serviceName || partner.headline}</small>
              ) : null}
              <small className="chat-privacy-note">
                Private to participants; authorized Gwamo admins may review under the Privacy Policy.
              </small>
            </div>
          </div>
          <div
            className="chat-messages"
            ref={messagesListRef}
            onScroll={handleScroll}
          >
            {loading ? (
              <div className="chat-loading">Loading messages...</div>
            ) : loadError ? (
              <div className="chat-empty">{loadError}</div>
            ) : messages.length === 0 ? (
              <div className="chat-welcome">
                <img
                  src={partner.avatar || DEFAULT_LOGO}
                  alt=""
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = DEFAULT_LOGO;
                  }}
                />
                <strong>Message {partner.name || "provider"}</strong>
                <p>
                  {currentUser
                    ? "Ask about this service or send the first message below."
                    : "Write your message below. Login with telephone + PIN only when you press Send."}
                </p>
              </div>
            ) : (
              groupedMessages.map((entry) => {
                if (entry.type === "separator") {
                  return (
                    <div className="chat-date-separator" key={entry.key}>
                      <span>{entry.label}</span>
                    </div>
                  );
                }
                const msg = entry.message;
                const isOwn =
                  String(msg.senderId) === String(currentUser?.id);
                return (
                  <div
                    key={msg.id}
                    className={`chat-message ${
                      isOwn ? "sent" : "received"
                    }${msg.pending ? " is-pending" : ""}${
                      msg.failed ? " is-failed" : ""
                    }`}
                  >
                    {msg.type === "image" && msg.mediaUrl ? (
                      <img
                        src={msg.mediaUrl}
                        alt="Attachment"
                        className="chat-image-attachment"
                        onClick={() => onZoomImage?.(msg.mediaUrl)}
                      />
                    ) : null}
                    {msg.type === "video" && msg.mediaUrl ? (
                      <video
                        src={msg.mediaUrl}
                        controls
                        playsInline
                        preload="metadata"
                      />
                    ) : null}
                    {msg.type === "voice" && msg.mediaUrl ? (
                      <audio src={msg.mediaUrl} controls preload="none" />
                    ) : null}
                    {msg.type === "document" && msg.mediaUrl ? (
                      <a
                        className="chat-document-link"
                        href={msg.mediaUrl}
                        target="_blank"
                        rel="noreferrer"
                        download
                      >
                        <FileText size={19} aria-hidden="true" />
                        <span>{msg.fileName || "Open document"}</span>
                      </a>
                    ) : null}
                    {msg.text ? <p>{msg.text}</p> : null}
                    <time>
                      {msg.pending
                        ? "Sending..."
                        : msg.failed
                          ? "Not delivered"
                          : new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                      {isOwn && !msg.pending && !msg.failed && (
                        <span
                          className={`chat-read-status${msg.readAt ? " is-read" : ""}`}
                          aria-label={msg.readAt ? "Read" : msg.deliveredAt ? "Delivered" : "Sent"}
                        >
                          {msg.readAt || msg.deliveredAt ? (
                            <CheckCheck size={13} aria-hidden="true" />
                          ) : (
                            <Check size={13} aria-hidden="true" />
                          )}
                        </span>
                      )}
                    </time>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
          {showNewMessagesButton && (
            <button
              type="button"
              className="chat-new-messages-button"
              onClick={scrollToBottom}
            >
              New messages
            </button>
          )}
          {pendingFailedText ? (
            <div className="chat-retry-banner">
              <span>Message not sent.</span>
              <button type="button" onClick={retryFailedText}>
                Tap to retry
              </button>
            </div>
          ) : null}
          {attachError ? (
            <div className="chat-retry-banner">
              <span>{attachError}</span>
              <button
                type="button"
                onClick={
                  pendingFailedAttachment
                    ? retryFailedAttachment
                    : () => setAttachError("")
                }
              >
                {pendingFailedAttachment ? "Tap to retry" : "Dismiss"}
              </button>
            </div>
          ) : null}
          <div className="chat-composer">
            <div className="chat-attach-wrap">
              <button
                type="button"
                className="chat-attach-button"
                onClick={() => setAttachMenuOpen((value) => !value)}
                aria-label="Attach a photo, video or document"
                aria-haspopup="true"
                aria-expanded={attachMenuOpen}
              >
                <Paperclip size={20} aria-hidden="true" />
              </button>
              {attachMenuOpen && (
                <>
                  <div
                    className="chat-attach-backdrop"
                    onClick={() => setAttachMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="chat-attach-menu">
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                    >
                      <ImageIcon size={18} aria-hidden="true" /> Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                    >
                      <Video size={18} aria-hidden="true" /> Video
                    </button>
                    <button
                      type="button"
                      onClick={() => documentInputRef.current?.click()}
                    >
                      <FileText size={18} aria-hidden="true" /> Document
                    </button>
                  </div>
                </>
              )}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                style={{
                  display: "none",
                }}
                onChange={handlePickPhoto}
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                style={{
                  display: "none",
                }}
                onChange={handlePickVideo}
              />
              <input
                ref={documentInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,application/pdf"
                style={{
                  display: "none",
                }}
                onChange={handlePickDocument}
              />
            </div>
            <input
              type="text"
              placeholder={`Message ${partner.name || "provider"}...`}
              autoFocus
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") sendMessage();
              }}
            />
            {inputText.trim() ? (
              <button
                className="chat-send"
                onClick={sendMessage}
                disabled={sending || loading}
                aria-label="Send message"
              >
                <Send size={20} aria-hidden="true" />
              </button>
            ) : callHref ? (
              <a
                className="chat-send"
                href={callHref}
                aria-label={`Call ${partner.name || "provider"}`}
              >
                <Phone size={20} aria-hidden="true" />
              </a>
            ) : (
              <button
                type="button"
                className="chat-send"
                disabled
                aria-label="No phone number available for this provider"
              >
                <Phone size={20} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  },
);
ChatModal.displayName = "ChatModal";
// =============================================================================
// ZoomableImageViewer - double-tap, pinch, and drag-to-pan
// =============================================================================
const ZOOM_MIN_SCALE = 1;
const ZOOM_MAX_SCALE = 4;
const ZOOM_DOUBLE_TAP_SCALE = 2.75;
const ZoomableImageViewer = memo(({ src, alt = "Photo", onClose }) => {
  useEscapeToClose(onClose);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const pointersRef = useRef(new Map());
  const gestureRef = useRef(null);
  const clampTranslate = useCallback((nextScale, x, y) => {
    const node = containerRef.current;
    if (!node) return { x, y };
    const rect = node.getBoundingClientRect();
    const maxX = Math.max(0, (rect.width * (nextScale - 1)) / 2);
    const maxY = Math.max(0, (rect.height * (nextScale - 1)) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    };
  }, []);
  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);
  const zoomAt = useCallback(
    (clientX, clientY, nextScale) => {
      const node = containerRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const originX = clientX - rect.left - rect.width / 2;
      const originY = clientY - rect.top - rect.height / 2;
      const clamped = Math.min(
        ZOOM_MAX_SCALE,
        Math.max(ZOOM_MIN_SCALE, nextScale),
      );
      setScale((prevScale) => {
        const ratio = clamped / prevScale;
        setTranslate((prevTranslate) =>
          clampTranslate(
            clamped,
            originX - (originX - prevTranslate.x) * ratio,
            originY - (originY - prevTranslate.y) * ratio,
          ),
        );
        return clamped;
      });
    },
    [clampTranslate],
  );
  const handleDoubleClick = useCallback(
    (event) => {
      event.stopPropagation();
      if (scale > 1) {
        resetZoom();
      } else {
        zoomAt(event.clientX, event.clientY, ZOOM_DOUBLE_TAP_SCALE);
      }
    },
    [scale, resetZoom, zoomAt],
  );
  const handleWheel = useCallback(
    (event) => {
      event.preventDefault();
      zoomAt(
        event.clientX,
        event.clientY,
        scale - event.deltaY * 0.0015 * scale,
      );
    },
    [scale, zoomAt],
  );
  const handlePointerDown = useCallback(
    (event) => {
      event.currentTarget.setPointerCapture?.(event.pointerId);
      pointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
      if (pointersRef.current.size === 1) {
        gestureRef.current = {
          mode: "pan",
          startX: event.clientX,
          startY: event.clientY,
          startTranslate: translate,
        };
      } else if (pointersRef.current.size === 2) {
        const pts = Array.from(pointersRef.current.values());
        const distance =
          Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
        gestureRef.current = {
          mode: "pinch",
          startDistance: distance,
          startScale: scale,
          midpoint: {
            x: (pts[0].x + pts[1].x) / 2,
            y: (pts[0].y + pts[1].y) / 2,
          },
        };
      }
    },
    [translate, scale],
  );
  const handlePointerMove = useCallback(
    (event) => {
      if (!pointersRef.current.has(event.pointerId)) return;
      pointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
      const gesture = gestureRef.current;
      if (!gesture) return;
      if (gesture.mode === "pan" && scale > 1) {
        setTranslate(
          clampTranslate(
            scale,
            gesture.startTranslate.x + (event.clientX - gesture.startX),
            gesture.startTranslate.y + (event.clientY - gesture.startY),
          ),
        );
      } else if (gesture.mode === "pinch" && pointersRef.current.size === 2) {
        const pts = Array.from(pointersRef.current.values());
        const distance =
          Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
        zoomAt(
          gesture.midpoint.x,
          gesture.midpoint.y,
          gesture.startScale * (distance / gesture.startDistance),
        );
      }
    },
    [scale, clampTranslate, zoomAt],
  );
  const handlePointerUp = useCallback(
    (event) => {
      pointersRef.current.delete(event.pointerId);
      if (pointersRef.current.size === 0) {
        gestureRef.current = null;
        setScale((current) => {
          if (current < 1.02) {
            setTranslate({ x: 0, y: 0 });
            return 1;
          }
          return current;
        });
      } else if (pointersRef.current.size === 1) {
        const [[, point]] = Array.from(pointersRef.current.entries());
        gestureRef.current = {
          mode: "pan",
          startX: point.x,
          startY: point.y,
          startTranslate: translate,
        };
      }
    },
    [translate],
  );
  useEffect(() => {
    resetZoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);
  return (
    <div
      className="zoom-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Photo preview"
    >
      <button
        type="button"
        className="zoom-close-button"
        onClick={onClose}
        aria-label="Close photo preview"
      >
        <X size={26} strokeWidth={2.4} aria-hidden="true" />
      </button>
      <div
        className="zoom-image-shell"
        ref={containerRef}
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        role="presentation"
      >
        <img
          src={src}
          alt={alt}
          className="zoom-image"
          decoding="async"
          draggable={false}
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            cursor: scale > 1 ? "grab" : "zoom-in",
            touchAction: "none",
          }}
        />
      </div>
      {scale > 1 && (
        <button
          type="button"
          className="zoom-reset-button"
          onClick={(event) => {
            event.stopPropagation();
            resetZoom();
          }}
        >
          Reset zoom
        </button>
      )}
    </div>
  );
});
ZoomableImageViewer.displayName = "ZoomableImageViewer";
const ProviderProfileSheet = memo(
  ({ post, isOwner = false, onClose, onMessage, onShare }) => {
    useEscapeToClose(onClose);
    const info = getVerificationStatus(post);
    const providerName =
      post.service_provider_name || post.creator_name || "Provider";
    const headline = post.service_charge_per_minute || post.title || "";
    const description = post.work_description || post.subtitle || "";
    const postedDate = post.created_at
      ? new Date(post.created_at).toLocaleDateString([], {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "";
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-card profile-sheet-card"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="modal-header">
            <h2>{isOwner ? "Your Profile" : "Provider Profile"}</h2>
            <button
              type="button"
              onClick={onClose}
              className="modal-close"
              aria-label="Close"
            >
              <X size={20} strokeWidth={2.4} aria-hidden="true" />
            </button>
          </div>
          <div className="profile-sheet-top">
            <div className={`provider-sheet-avatar ${info.className}`}>
              <img
                src={post.logo_url || DEFAULT_LOGO}
                alt=""
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = DEFAULT_LOGO;
                }}
              />
            </div>
            <div className="profile-sheet-identity">
              <h3>{providerName}</h3>
              <VerificationTag info={info} />
            </div>
          </div>
          {headline ? <p className="profile-sheet-headline">{headline}</p> : null}
          {description ? (
            <p className="profile-sheet-description">{description}</p>
          ) : null}
          {postedDate ? (
            <p className="profile-sheet-meta">Posted {postedDate}</p>
          ) : null}
          <div className="profile-sheet-actions">
            {!isOwner && (
              <button type="button" className="save-button" onClick={onMessage}>
                <MessageSquare size={18} aria-hidden="true" />
                Message
              </button>
            )}
            <button type="button" className="cancel-button" onClick={onShare}>
              Share
            </button>
          </div>
        </div>
      </div>
    );
  },
);
ProviderProfileSheet.displayName = "ProviderProfileSheet";
// =============================================================================
// ProfileEditModal - My Profile (account-level identity fields)
// =============================================================================
const ProfileEditModal = memo(
  ({
    user,
    fullName,
    setFullName,
    serviceName,
    setServiceName,
    servicesOffered,
    setServicesOffered,
    photoPreview,
    onPhotoChange,
    onRemovePhoto,
    photoRemoved,
    contextPost,
    onEditListing,
    onOpenServices,
    onLogout,
    deleteConfirming,
    setDeleteConfirming,
    onDeleteAccount,
    saving,
    error,
    onSave,
    onClose,
  }) => {
    useEscapeToClose(onClose);
    const info = getVerificationStatus(user);
    const currentPhoto = photoRemoved
      ? ""
      : photoPreview || user?.profile_image_url || "";
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-card"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="modal-header">
            <h2>My Profile</h2>
            <button
              type="button"
              onClick={onClose}
              className="modal-close"
              aria-label="Close"
            >
              <X size={20} strokeWidth={2.4} aria-hidden="true" />
            </button>
          </div>
          <div className="account-status-row">
            <VerificationTag info={info} />
            {info.status === "pending" && (
              <p className="field-help">
                Your blue verified badge appears after Gwamo staff confirms your
                details.
              </p>
            )}
          </div>
          <div className="form-section">
            <div className="section-heading">Photo</div>
            <div className="profile-photo-row">
              <div className="profile-photo-preview">
                {currentPhoto ? (
                  <img src={currentPhoto} alt="" />
                ) : (
                  <User size={26} aria-hidden="true" />
                )}
              </div>
              <div className="profile-photo-actions">
                <label
                  className="file-picker profile-photo-picker"
                  htmlFor="profile-photo-upload"
                >
                  <span>Change Photo</span>
                  <input
                    id="profile-photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      onPhotoChange(event.target.files?.[0] || null)
                    }
                  />
                </label>
                {currentPhoto && (
                  <button
                    type="button"
                    className="cancel-button profile-photo-remove"
                    onClick={onRemovePhoto}
                  >
                    Remove Photo
                  </button>
                )}
              </div>
            </div>
            <p className="field-help">
              Use a clear square photo. It will be cropped into the circular
              profile badge.
            </p>
          </div>
          <div className="form-section">
            <label htmlFor="profile-full-name">Full name</label>
            <input
              id="profile-full-name"
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
            <p className="field-help">
              Your legal name, used for verification.
            </p>
          </div>
          <div className="form-section">
            <label htmlFor="profile-service-name">Public / service name</label>
            <input
              id="profile-service-name"
              type="text"
              value={serviceName}
              onChange={(event) => setServiceName(event.target.value)}
            />
            <p className="field-help">
              This is the name shown on your services.
            </p>
          </div>
          <div className="form-section">
            <label htmlFor="profile-services-offered">
              Services you can offer
            </label>
            <textarea
              id="profile-services-offered"
              placeholder="e.g. Phone repair, driving, English tutoring"
              value={servicesOffered}
              onChange={(event) => setServicesOffered(event.target.value)}
            />
            <p className="field-help">
              Separate different skills with a comma.
            </p>
          </div>
          {contextPost && (
            <div className="form-section">
              <div className="section-heading">This listing</div>
              <button
                type="button"
                className="cancel-button"
                onClick={onEditListing}
              >
                <Pencil size={16} aria-hidden="true" /> Edit price, description
                and media
              </button>
              <p className="field-help">
                Opens the Service Provider form for this specific listing.
              </p>
            </div>
          )}
          <div className="form-section">
            <div className="section-heading">Account</div>
            <button
              type="button"
              className="cancel-button"
              onClick={onOpenServices}
            >
              <ShoppingBasket size={16} aria-hidden="true" /> Manage all my
              services
            </button>
            <button type="button" className="cancel-button" onClick={onLogout}>
              <LogOut size={16} aria-hidden="true" /> Log out
            </button>
          </div>
          {error && <p className="auth-error">{error}</p>}
          <button
            type="button"
            className="save-button"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
          <button type="button" className="cancel-button" onClick={onClose}>
            Cancel
          </button>
          <div className="form-section form-section-last profile-danger-zone">
            <div className="section-heading">Danger zone</div>
            {deleteConfirming ? (
              <>
                <p className="field-help">
                  This deletes your provider identity, not just one listing. Are
                  you sure?
                </p>
                <button
                  type="button"
                  className="danger-button"
                  onClick={onDeleteAccount}
                >
                  Yes, delete my provider profile
                </button>
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setDeleteConfirming(false)}
                >
                  Keep my profile
                </button>
              </>
            ) : (
              <button
                type="button"
                className="danger-button"
                onClick={() => setDeleteConfirming(true)}
              >
                Delete my provider profile
              </button>
            )}
          </div>
        </div>
      </div>
    );
  },
);
ProfileEditModal.displayName = "ProfileEditModal";
// =============================================================================
// MyServicesSheet - list / edit / delete the provider's own posts
// =============================================================================
const MyServicesSheet = memo(
  ({ services, loading, error, onEdit, onDelete, onClose, onCreateNew }) => {
    useEscapeToClose(onClose);
    return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>My Services</h2>
          <button
            type="button"
            onClick={onClose}
            className="modal-close"
            aria-label="Close"
          >
            <X size={20} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>
        {loading ? (
          <p className="field-help">Loading your services...</p>
        ) : error ? (
          <p className="auth-error">{error}</p>
        ) : services.length === 0 ? (
          <div className="mysheet-empty">
            <p>You haven't added a service yet.</p>
            <button type="button" className="save-button" onClick={onCreateNew}>
              Offer your service
            </button>
          </div>
        ) : (
          <div className="myservices-list">
            {services.map((service) => {
              const info = getVerificationStatus(service);
              return (
                <div className="myservice-row" key={service.id}>
                  <img
                    src={service.logo_url || DEFAULT_LOGO}
                    alt=""
                    className="myservice-thumb"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = DEFAULT_LOGO;
                    }}
                  />
                  <div className="myservice-info">
                    <strong>
                      {service.service_charge_per_minute ||
                        service.title ||
                        "Price not set"}
                      {info.verified && (
                        <CheckCircle
                          size={14}
                          className="verified-badge verified"
                          aria-label="Verified"
                        />
                      )}
                    </strong>
                    <span>
                      {service.work_description ||
                        service.subtitle ||
                        "No description yet."}
                    </span>
                  </div>
                  <div className="myservice-actions">
                    <button
                      type="button"
                      onClick={() => onEdit(service)}
                      aria-label="Edit service"
                    >
                      <Pencil size={17} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(service.id)}
                      aria-label="Delete service"
                      className="myservice-delete"
                    >
                      <X size={17} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <button type="button" className="cancel-button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
    );
  },
);
MyServicesSheet.displayName = "MyServicesSheet";
// =============================================================================
// MyTimeSheet - honest placeholder, no fake numbers (backend not built yet)
// =============================================================================
const MyTimeSheet = memo(({ onClose }) => {
  useEscapeToClose(onClose);
  return (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-card" onClick={(event) => event.stopPropagation()}>
      <div className="modal-header">
        <h2>My Time</h2>
        <button
          type="button"
          onClick={onClose}
          className="modal-close"
          aria-label="Close"
        >
          <X size={20} strokeWidth={2.4} aria-hidden="true" />
        </button>
      </div>
      <div className="mysheet-empty">
        <Wallet size={40} className="mytime-icon" aria-hidden="true" />
        <p>
          {
            "This is where you'll track the economic value of your time on Gwamo \u2014 time offered, time exchanged, completed requests and what you've earned."
          }
        </p>
        <p className="field-help">
          {
            "These numbers arrive once Time Requests go live. Nothing to see yet \u2014 check back soon."
          }
        </p>
      </div>
      <button type="button" className="cancel-button" onClick={onClose}>
        Close
      </button>
    </div>
  </div>
  );
});
MyTimeSheet.displayName = "MyTimeSheet";
// =============================================================================
// MyInboxSheet - all of the logged-in user's conversations (redesigned, Step 1)
// =============================================================================
const MyInboxSheet = memo(
  ({
    conversations,
    loading,
    error,
    currentUserId,
    filterServicePostId,
    onOpenConversation,
    onClose,
  }) => {
    useEscapeToClose(onClose);
    const [searchTerm, setSearchTerm] = useState("");
    const visible = filterServicePostId
      ? conversations.filter(
          (conversation) =>
            String(conversation.service_post_id) ===
            String(filterServicePostId),
        )
      : conversations;
    // Newest activity first.
    const sorted = [...visible].sort((a, b) => {
      const aTime =
        Date.parse(a.last_message_at || a.updated_at || a.created_at || 0) ||
        0;
      const bTime =
        Date.parse(b.last_message_at || b.updated_at || b.created_at || 0) ||
        0;
      return bTime - aTime;
    });
    const query = searchTerm.trim().toLowerCase();
    const filtered = query
      ? sorted.filter((conversation) => {
          const iAmProvider =
            String(conversation.provider_id) === String(currentUserId);
          const partnerName = (
            iAmProvider
              ? conversation.customer_full_name
              : conversation.provider_full_name ||
                conversation.service_provider_name
          ) || "";
          const serviceName = conversation.service_name || "";
          return (
            partnerName.toLowerCase().includes(query) ||
            serviceName.toLowerCase().includes(query)
          );
        })
      : sorted;
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-card"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="modal-header">
            <h2>
              {filterServicePostId ? "Messages about this service" : "Messages"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="modal-close"
              aria-label="Close"
            >
              <X size={20} strokeWidth={2.4} aria-hidden="true" />
            </button>
          </div>
          {!filterServicePostId && conversations.length > 0 && (
            <div className="myinbox-search-wrap">
              <Search size={16} aria-hidden="true" />
              <input
                type="text"
                className="myinbox-search"
                placeholder="Search messages"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                aria-label="Search messages"
              />
            </div>
          )}
          {loading ? (
            <p className="field-help">Loading conversations...</p>
          ) : error ? (
            <p className="auth-error">{error}</p>
          ) : filtered.length === 0 ? (
            <div className="mysheet-empty">
              <p>No messages yet.</p>
              <p className="field-help">
                When someone contacts you, the message will appear here.
              </p>
            </div>
          ) : (
            <div className="myinbox-list">
              {filtered.map((conversation) => {
                const iAmProvider =
                  String(conversation.provider_id) === String(currentUserId);
                const partnerName = iAmProvider
                  ? conversation.customer_full_name || "Customer"
                  : conversation.provider_full_name ||
                    conversation.service_provider_name ||
                    "Provider";
                const partnerAvatar = iAmProvider
                  ? conversation.customer_profile_image_url || ""
                  : conversation.provider_profile_image_url || "";
                const partnerVerified = iAmProvider
                  ? conversation.customer_verification_status === "verified"
                  : conversation.provider_verification_status === "verified";
                const preview = conversation.last_message
                  ? conversation.last_message
                  : conversation.last_message_type
                    ? attachmentPreviewLabel(conversation.last_message_type)
                    : "No messages yet";
                const unread = Number(conversation.unread_count || 0);
                const lastActivity =
                  conversation.last_message_at ||
                  conversation.updated_at ||
                  conversation.created_at ||
                  "";
                const timeLabel = lastActivity
                  ? new Date(lastActivity).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "";
                return (
                  <button
                    type="button"
                    className={`myinbox-row${unread > 0 ? " has-unread" : ""}`}
                    key={conversation.id}
                    onClick={() => onOpenConversation(conversation)}
                  >
                    <span className="myinbox-avatar">
                      <img
                        src={partnerAvatar || DEFAULT_LOGO}
                        alt=""
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = DEFAULT_LOGO;
                        }}
                      />
                    </span>
                    <span className="myinbox-main">
                      <span className="myinbox-name-row">
                        <strong>{partnerName}</strong>
                        {partnerVerified && (
                          <span
                            className="verified-check-badge myinbox-verified"
                            role="img"
                            aria-label="Verified"
                          >
                            <Check size={9} strokeWidth={3.5} aria-hidden="true" />
                          </span>
                        )}
                        {timeLabel && (
                          <span className="myinbox-time">{timeLabel}</span>
                        )}
                      </span>
                      <small>
                        {conversation.service_name ||
                          conversation.service_charge_per_minute ||
                          conversation.service_provider_name ||
                          ""}
                      </small>
                      <small className="myinbox-preview">{preview}</small>
                    </span>
                    {unread > 0 && (
                      <span
                        className="myinbox-unread-badge"
                        aria-label={`${unread} unread messages`}
                      >
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          <button type="button" className="cancel-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  },
);
MyInboxSheet.displayName = "MyInboxSheet";
// =============================================================================
// InfoModal - About Gwamo / Help
// =============================================================================
const InfoModal = memo(({ topic, onClose }) => {
  useEscapeToClose(onClose);
  const content = INFO_CONTENT[topic] || INFO_CONTENT.about;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{content.title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="modal-close"
            aria-label="Close"
          >
            <X size={20} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>
        <p className="info-modal-body">{content.body}</p>
        <button type="button" className="cancel-button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
});
InfoModal.displayName = "InfoModal";
// =============================================================================
// HomeStyles
// =============================================================================
function HomeStylesInner() {
  return (
    <style>{`
      :root {
        --page-bg: #020712;
        --panel-bg: #06101f;
        --blue: #087cff;
        --blue-bright: #168bff;
        --blue-border: rgba(22, 139, 255, 0.78);
        --muted: #9ba8ba;
        --danger: #ff334f;
        --neon-red: #ff0040;
        --neon-glow: rgba(255, 0, 64, 0.8);
        --deep-orange: #ff6a00;
        --deep-orange-bright: #ff8a00;
        --deep-orange-soft: rgba(255, 106, 0, 0.34);
        --deep-orange-glow: rgba(255, 106, 0, 0.78);
        --verified-green: #1d9bf0;
      }
      * {
        box-sizing: border-box;
      }
      html,
      body,
      #root {
        min-height: 100%;
        margin: 0;
        background: var(--page-bg);
      }
      body {
        overflow-x: hidden;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system,
          BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      button,
      input,
      textarea {
        font: inherit;
      }
      .home-page {
        width: 100%;
        min-height: 100svh;
        color: #ffffff;
        overflow-x: hidden;
        background:
          radial-gradient(circle at 50% -10%, rgba(37, 99, 235, 0.20), transparent 34%),
          radial-gradient(circle at 90% 20%, rgba(124, 58, 237, 0.12), transparent 30%),
          var(--page-bg);
      }
      .feedx-topbar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 1000;
        width: 100%;
        padding-top: env(safe-area-inset-top);
        background: rgba(1, 5, 13, 0.985);
        border-bottom: 0;
        -webkit-backdrop-filter: blur(18px);
        backdrop-filter: blur(18px);
        box-shadow: none;
      }
      .feedx-topbar-inner {
        width: min(100%, 900px);
        min-height: 92px;
        margin: 0 auto;
        padding: 20px 26px 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
      }
      .gwamo-brand {
        min-width: 0;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 1px;
      }
      .feedx-logo {
        min-width: 0;
        margin: 0;
        overflow: hidden;
        color: #ffffff;
        font-family: Arial, Helvetica, sans-serif;
        font-size: clamp(34px, 6vw, 48px);
        font-weight: 900;
        line-height: 1;
        letter-spacing: 4px;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-shadow: 0 0 6px #fff, 0 0 18px rgba(8, 124, 255, .9);
      }
      .gwamo-tagline {
        color: #168bff;
        font-size: 16px;
        font-weight: 500;
        line-height: 1.1;
        white-space: nowrap;
      }
      .topbar-actions {
        position: relative;
        display: flex;
        align-items: center;
        gap: 10px;
        flex-shrink: 0;
      }
      .login-pill {
        min-height: 40px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 0 14px;
        border: 1px solid rgba(22, 139, 255, 0.42);
        border-radius: 999px;
        color: #ffffff;
        background: rgba(8, 124, 255, 0.14);
        font-size: 13px;
        font-weight: 800;
        cursor: pointer;
      }
      .verified-badge {
        flex-shrink: 0;
      }
      .verified-badge.verified { color: #1d9bf0; }
      .verified-badge.pending { color: #f59e0b; }
      .verified-badge.rejected { color: var(--muted); }
      .menu-button {
        width: 52px;
        height: 52px;
        display: grid;
        place-items: center;
        padding: 0;
        border: 0;
        border-radius: 0;
        color: #ffffff;
        background: transparent;
        cursor: pointer;
      }
      .menu-button svg {
        width: 34px;
        height: 34px;
        filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.14));
      }
      .provider-sheet-avatar {
        --ring-c1: var(--danger);
        --ring-c2: rgba(255, 51, 79, 0.32);
      }
      .provider-sheet-avatar.status-verified {
        --ring-c1: #1d9bf0;
        --ring-c2: rgba(29, 155, 240, 0.32);
      }
      .provider-sheet-avatar.status-rejected {
        --ring-c1: var(--muted);
        --ring-c2: rgba(155, 168, 186, 0.32);
      }
      .account-avatar-button {
        width: 42px;
        height: 42px;
        flex: 0 0 42px;
        position: relative;
        padding: 2px;
        overflow: hidden;
        border: 2px solid var(--blue-bright);
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.92);
        box-shadow: 0 0 0 3px rgba(22, 139, 255, 0.20), 0 3px 10px rgba(0, 0, 0, 0.38);
        cursor: pointer;
      }
      .account-avatar-button img {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: cover;
        border: 0;
        border-radius: 50%;
      }
      .dropdown-backdrop {
        position: fixed;
        inset: 0;
        z-index: 999;
      }
      .dropdown-menu {
        position: absolute;
        top: calc(100% + 10px);
        right: 0;
        min-width: 190px;
        padding: 8px;
        border-radius: 12px;
        background: #0f1a2e;
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        z-index: 1001;
      }
      .account-dropdown {
        min-width: 232px;
      }
      .account-dropdown-header {
        padding: 8px 10px 12px;
        margin-bottom: 6px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .account-dropdown-name {
        color: #ffffff;
        font-size: 14px;
        font-weight: 800;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .dropdown-divider {
        height: 1px;
        margin: 6px 4px;
        background: rgba(255, 255, 255, 0.08);
      }
      .dropdown-item {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 10px 14px;
        border: none;
        border-radius: 8px;
        color: #ffffff;
        background: transparent;
        cursor: pointer;
        font-size: 14px;
        transition: background 0.15s;
      }
      .dropdown-item:hover {
        background: rgba(255, 255, 255, 0.08);
      }
      .dropdown-item-danger {
        color: #ff8a97;
      }
      .verification-tag {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 3px 10px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
        font-size: 12px;
        font-weight: 800;
      }
      .verification-tag.status-verified { color: #55baff; }
      .verification-tag.status-pending { color: #f59e0b; }
      .verification-tag.status-rejected { color: var(--muted); }
      .category-nav {
        display: flex;
        align-items: center;
        gap: 10px;
        width: min(100%, 900px);
        margin: 0 auto;
        padding: 0 26px 16px;
        overflow-x: auto;
        overflow-y: hidden;
        scrollbar-width: none;
        -ms-overflow-style: none;
        -webkit-overflow-scrolling: touch;
      }
      .category-nav::-webkit-scrollbar {
        display: none;
      }
      .category-tab {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 54px;
        padding: 0 22px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 17px;
        color: rgba(238, 244, 255, 0.82);
        background: linear-gradient(180deg, rgba(17, 24, 42, 0.88), rgba(7, 12, 25, 0.94));
        font-size: 14px;
        font-weight: 750;
        white-space: nowrap;
        cursor: pointer;
        transition: background 160ms ease, color 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
      }
      .category-tab svg {
        flex-shrink: 0;
      }
      .category-tab.is-active {
        color: #ffffff;
        background: linear-gradient(180deg, rgba(9, 83, 178, .38), rgba(3, 20, 50, .94));
        border-color: #168bff;
        box-shadow: inset 0 0 18px rgba(8, 124, 255, .16), 0 0 18px rgba(8, 124, 255, .58);
      }
      .coming-soon-panel {
        min-height: 60vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: calc(140px + env(safe-area-inset-top)) 24px 60px;
        text-align: center;
        color: rgba(255, 255, 255, 0.72);
      }
      .coming-soon-panel h2 {
        margin: 0;
        color: #ffffff;
        font-size: 22px;
      }
      .coming-soon-panel p {
        max-width: 380px;
        margin: 0 0 8px;
        line-height: 1.5;
      }
      .home-feed {
        width: min(100%, 900px);
        margin: 0 auto;
        padding: calc(174px + env(safe-area-inset-top)) 16px 46px;
      }
      .service-reel-card {
        position: relative;
        isolation: isolate;
        width: 100%;
        height: clamp(620px, calc(100svh - 188px), 900px);
        margin: 0 auto 28px;
        overflow: hidden;
        border: 1px solid rgba(126, 119, 190, .28);
        border-radius: 28px;
        background: #020712;
        box-shadow: 0 22px 64px rgba(0, 0, 0, .56), 0 0 30px rgba(8, 124, 255, .07);
      }
      .service-reel-card .media-card,
      .service-reel-card .media-viewport,
      .service-reel-card .media-layer {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        border: 0;
        border-radius: inherit;
      }
      .media-layer {
        display: grid;
        place-items: center;
        overflow: hidden;
        background: #000000;
      }
      .home-media {
        width: 100%;
        height: 100%;
        display: block;
        border: 0;
        object-position: center;
        background: #000000;
      }
      .service-reel-card img.home-media {
        object-fit: cover;
      }
      .service-reel-card video.home-media {
        object-fit: contain;
        background: #000;
      }
      .media-layer > iframe.home-media {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        min-width: 100%;
        min-height: 100%;
      }
      .embed-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 24px;
        color: #dce7f7;
        background:
          radial-gradient(circle, rgba(8, 124, 255, 0.17), transparent 54%),
          #020712;
        text-align: center;
      }
      .embed-placeholder-icon {
        font-size: 48px;
      }
      .service-card-gradient {
        position: absolute;
        inset: 0;
        z-index: 20;
        pointer-events: none;
        background:
          linear-gradient(to bottom, transparent 48%, rgba(0,5,14,.12) 59%, rgba(0,5,14,.83) 82%, rgba(2,7,18,.98) 100%),
          linear-gradient(to right, rgba(0,0,0,.1), transparent 60%);
      }
      .service-avatar-badge {
        position: absolute;
        z-index: 45;
        top: 18px;
        right: 18px;
        width: 54px;
        height: 54px;
        padding: 2px;
        border: 0;
        border-radius: 50%;
        background: #06101f;
        cursor: pointer;
        --ring-c1: var(--danger);
        --ring-c2: rgba(255, 51, 79, 0.32);
      }
      .service-avatar-badge.status-verified {
        --ring-c1: #1d9bf0;
        --ring-c2: rgba(29, 155, 240, 0.35);
      }
      .service-avatar-badge.status-rejected {
        --ring-c1: var(--muted);
        --ring-c2: rgba(155, 168, 186, 0.32);
      }
      .service-avatar-badge::before {
        content: "";
        position: absolute;
        inset: -2px;
        z-index: 0;
        border-radius: 50%;
        background: var(--ring-c1);
        box-shadow: 0 0 14px var(--ring-c1);
      }
      .service-avatar-badge img {
        position: relative;
        z-index: 1;
        width: 100%;
        height: 100%;
        display: block;
        object-fit: cover;
        border-radius: 50%;
        border: 2px solid #06101f;
      }
      .post-info-block {
        position: absolute;
        z-index: 40;
        left: 40px;
        right: 96px;
        bottom: 150px;
        padding: 0;
      }
      .creator-name {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 15px;
        font-weight: 850;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .verified-check-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        flex-shrink: 0;
        border-radius: 50%;
        background: #1d9bf0;
        color: #ffffff;
      }
      .service-name {
        margin: 5px 0 3px;
        color: #fff;
        font-size: 14px;
        font-weight: 700;
        line-height: 1.3;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
      }
      .post-price {
        color: #22c55e;
        font-size: 14px;
        font-weight: 700;
        line-height: 1.25;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .post-price-unit {
        color: rgba(34, 197, 94, 0.72);
        font-size: .92em;
        font-weight: 600;
      }
      .post-tagline-wrap {
        margin-top: 5px;
      }
      .post-tagline {
        margin: 0;
        color: rgba(255, 255, 255, .90);
        font-size: 12.5px;
        font-weight: 400;
        line-height: 1.38;
        letter-spacing: .1px;
        text-shadow: 0 1px 5px rgba(0, 0, 0, .92);
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }
      .post-tagline.is-expanded {
        max-height: min(22svh, 180px);
        overflow-y: auto;
        overscroll-behavior: contain;
        scrollbar-width: thin;
        scrollbar-color: rgba(111, 195, 255, 0.5) transparent;
      }
      .description-link {
        color: #55b6ff;
        font-weight: 700;
        text-decoration: underline;
        text-decoration-color: rgba(85, 182, 255, 0.55);
        text-underline-offset: 2px;
        text-shadow: 0 0 8px rgba(22, 139, 255, .58);
      }
      .description-link:hover,
      .description-link:focus-visible {
        color: #9cd7ff;
        text-decoration-color: rgba(156, 215, 255, 0.95);
      }
      .tagline-toggle-button {
        display: inline-block;
        margin: 0;
        padding: 0;
        border: none;
        background: none;
        color: rgba(255, 255, 255, .78);
        font-size: inherit;
        font-weight: 700;
        letter-spacing: 0.2px;
        cursor: pointer;
        vertical-align: baseline;
      }
      .service-social-rail {
        position: absolute;
        z-index: 42;
        right: 22px;
        bottom: 158px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 18px;
      }
      .rail-action {
        width: 48px;
        min-height: 44px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 0;
        border: 0;
        color: #fff;
        background: transparent;
        font-size: 14px;
        font-weight: 750;
        cursor: pointer;
        text-shadow: 0 1px 5px rgba(0, 0, 0, .95);
      }
      .rail-action svg {
        overflow: visible;
      }
      .rail-action:disabled {
        opacity: .7;
        cursor: wait;
      }
      .gold-star {
        color: #ffd700;
        fill: #ffd700;
        stroke: #fff1a8;
        filter:
          drop-shadow(0 1px 0 rgba(255,255,255,.75))
          drop-shadow(0 0 7px rgba(255,184,0,.9))
          drop-shadow(0 0 14px rgba(255,184,0,.58));
      }
      .star-action.is-active .gold-star {
        color: #ffbf00;
        fill: #ffbf00;
        transform: scale(1.08);
      }
      .star-action.is-active:disabled {
        opacity: 1;
        cursor: default;
      }
      .star-action > span {
        display: block;
        margin-top: 2px;
        color: #ffffff;
        font-size: 12px;
        font-weight: 800;
        line-height: 1;
        text-align: center;
        text-shadow:
          0 1px 4px #000000,
          0 0 8px rgba(255, 196, 0, 0.8);
      }
      .inbox-icon-wrap {
        position: relative;
        display: inline-flex;
      }
      .inbox-unread-badge {
        position: absolute;
        top: -6px;
        right: -9px;
        min-width: 17px;
        height: 17px;
        padding: 0 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        color: #ffffff;
        background: var(--danger);
        box-shadow: 0 0 0 2px #020712, 0 0 8px rgba(255, 51, 79, .75);
        font-size: 10px;
        font-weight: 800;
        line-height: 1;
        animation: gwamoBadgePulse 1.7s ease-in-out infinite;
      }
      @keyframes gwamoBadgePulse {
        0%, 100% { box-shadow: 0 0 0 2px #020712, 0 0 8px rgba(255, 51, 79, .75); }
        50% { box-shadow: 0 0 0 2px #020712, 0 0 14px rgba(255, 51, 79, 1); }
      }
      .inbox-rail-action {
        color: #cfe8ff;
        filter: drop-shadow(0 0 3px rgba(255, 255, 255, .9)) drop-shadow(0 0 9px rgba(22, 139, 255, .95));
      }
      .plus-rail-action {
        color: #dff2ff;
        filter: drop-shadow(0 0 3px rgba(255, 255, 255, .85)) drop-shadow(0 0 10px rgba(22, 139, 255, 1));
      }
      .contact-me-cta {
        position: absolute;
        z-index: 44;
        left: 50%;
        right: auto;
        bottom: 28px;
        width: clamp(220px, 36%, 300px);
        min-height: 54px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 0 24px;
        border: 1.5px solid #37a2ff;
        border-radius: 14px;
        color: #fff;
        background: rgba(1, 8, 20, .24);
        -webkit-backdrop-filter: blur(2px);
        backdrop-filter: blur(2px);
        box-shadow: inset 0 0 14px rgba(22, 139, 255, .10), 0 0 5px rgba(255,255,255,.24), 0 0 15px rgba(22, 139, 255, .82);
        font-size: 20px;
        font-weight: 700;
        text-shadow: 0 0 5px rgba(255, 255, 255, .32), 0 0 9px rgba(22, 139, 255, .52);
        cursor: pointer;
        transform: translateX(-50%);
      }
      .contact-me-cta:hover {
        background: rgba(9, 44, 91, .28);
        box-shadow: inset 0 0 18px rgba(22, 139, 255, .14), 0 0 7px rgba(255,255,255,.28), 0 0 22px rgba(22, 139, 255, .96);
      }
      .load-more-wrap {
        display: flex;
        justify-content: center;
        padding: 6px 0 40px;
      }
      .load-more-button {
        min-height: 54px;
        padding: 0 28px;
        border: 1px solid rgba(22, 139, 255, 0.42);
        border-radius: 18px;
        color: #ffffff;
        background: rgba(8, 26, 55, 0.9);
        font-weight: 800;
        cursor: pointer;
      }
      .load-more-button:disabled {
        opacity: 0.6;
        cursor: wait;
      }
      .modal-overlay {
        position: fixed;
        inset: 0;
        z-index: 10000;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        padding: 0;
        background: rgba(0, 3, 10, 0.91);
        backdrop-filter: blur(8px);
      }
      .auth-modal-overlay {
        align-items: center;
      }
      .auth-modal-card {
        border-radius: 24px;
        max-width: 420px;
      }
      .auth-success-message {
        margin-bottom: 14px;
        padding: 10px 14px;
        border-radius: 10px;
        color: #087653;
        background: #eafaf4;
        font-size: 14px;
        font-weight: 600;
        text-align: center;
      }
      .auth-helper-text {
        display: block;
        margin-top: 8px;
        color: rgba(226, 232, 240, 0.68);
        font-size: 11.5px;
        line-height: 1.45;
      }
      .forgot-pin-button {
        width: 100%;
        min-height: 42px;
        margin-top: 7px;
        padding: 8px 12px;
        border: 0;
        color: #79c7ff;
        background: transparent;
        font-size: 13px;
        font-weight: 750;
        cursor: pointer;
      }
      .forgot-pin-button:disabled { opacity: .55; cursor: wait; }
      .pin-reset-card { max-width: 440px; }
      .modal-header-note {
        margin: 4px 0 0;
        color: rgba(226, 232, 240, .58);
        font-size: 11px;
        font-weight: 500;
        line-height: 1.35;
      }
      .pin-reset-intro {
        margin: 0 0 16px;
        color: rgba(226, 232, 240, .82);
        font-size: 13px;
        line-height: 1.55;
      }
      .pin-verification-panel {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 7px;
        margin: 5px 0 16px;
        padding: 18px;
        border: 1px solid rgba(55, 162, 255, .48);
        border-radius: 16px;
        background: rgba(2, 18, 38, .70);
        box-shadow: inset 0 0 20px rgba(22, 139, 255, .12), 0 0 16px rgba(22, 139, 255, .18);
      }
      .pin-verification-panel span {
        color: rgba(226, 232, 240, .68);
        font-size: 12px;
        font-weight: 700;
      }
      .pin-verification-panel strong {
        color: #ffffff;
        font-size: clamp(28px, 9vw, 42px);
        font-variant-numeric: tabular-nums;
        letter-spacing: .16em;
        text-shadow: 0 0 14px rgba(55, 162, 255, .72);
      }
      .modal-card {
        width: 100%;
        max-width: 520px;
        max-height: 93svh;
        overflow-y: auto;
        padding: 18px 18px 26px;
        border: 1px solid rgba(22, 139, 255, 0.30);
        border-radius: 24px 24px 0 0;
        color: #ffffff;
        background:
          radial-gradient(circle at top, rgba(8, 124, 255, 0.14), transparent 34%),
          #06101f;
        box-shadow: 0 -18px 50px rgba(0, 0, 0, 0.55);
      }
      .modal-header {
        position: sticky;
        top: -18px;
        z-index: 4;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin: -18px -18px 14px;
        padding: 18px;
        border-bottom: 1px solid rgba(22, 139, 255, 0.16);
        background: rgba(4, 13, 29, 0.96);
      }
      .modal-header h2 {
        margin: 0;
        font-size: 19px;
        font-weight: 900;
      }
      .modal-close {
        width: 38px;
        height: 38px;
        display: grid;
        place-items: center;
        padding: 0;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 50%;
        color: #ffffff;
        background: rgba(255, 255, 255, 0.05);
        font-size: 23px;
        cursor: pointer;
      }
      .form-section {
        margin-bottom: 18px;
        padding-bottom: 18px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.075);
      }
      .form-section-last {
        border-bottom: 0;
      }
      .section-heading {
        margin-bottom: 10px;
        color: #64b3ff;
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 1px;
        text-transform: uppercase;
      }
      .modal-card label {
        display: block;
        margin: 0 0 7px;
        color: #f8fafc;
        font-size: 14px;
        font-weight: 650;
      }
      .modal-card input,
      .modal-card textarea,
      .modal-card select {
        width: 100%;
        min-height: 48px;
        margin: 0 0 6px;
        padding: 13px 15px;
        border: 1px solid rgba(148, 163, 184, 0.22);
        border-radius: 16px;
        outline: none;
        color: #ffffff;
        background: rgba(1, 7, 18, 0.74);
      }
      .modal-card select {
        appearance: none;
        background-image: linear-gradient(45deg, transparent 50%, #64b3ff 50%), linear-gradient(135deg, #64b3ff 50%, transparent 50%);
        background-position: calc(100% - 19px) 20px, calc(100% - 13px) 20px;
        background-size: 6px 6px, 6px 6px;
        background-repeat: no-repeat;
      }
      .modal-card select option {
        color: #ffffff;
        background: #06101f;
      }
      .modal-card textarea {
        min-height: 120px;
        line-height: 1.6;
        resize: vertical;
      }
      .modal-card input::placeholder,
      .modal-card textarea::placeholder {
        color: rgba(226, 232, 240, 0.42);
        opacity: 1;
      }
      .modal-card input:focus,
      .modal-card textarea:focus,
      .modal-card select:focus {
        border-color: rgba(22, 139, 255, 0.78);
        box-shadow: 0 0 0 3px rgba(22, 139, 255, 0.09);
      }
      .post-type-section {
        padding-bottom: 14px;
      }
      .post-type-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }
      .post-type-choice {
        min-height: 104px;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: center;
        gap: 4px;
        padding: 13px;
        border: 1px solid rgba(148, 163, 184, 0.18);
        border-radius: 17px;
        color: #ffffff;
        background: rgba(1, 7, 18, 0.68);
        text-align: left;
        cursor: pointer;
        transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease, transform 160ms ease;
      }
      .post-type-choice:hover {
        transform: translateY(-1px);
      }
      .post-type-choice.is-selected {
        border-color: #168bff;
        background: linear-gradient(145deg, rgba(8, 124, 255, 0.24), rgba(1, 7, 18, 0.76));
        box-shadow: inset 0 0 18px rgba(8, 124, 255, 0.12), 0 0 16px rgba(8, 124, 255, 0.22);
      }
      .post-type-icon {
        font-size: 22px;
        line-height: 1;
      }
      .post-type-choice strong {
        font-size: 14px;
      }
      .post-type-choice small {
        color: rgba(226, 232, 240, 0.58);
        font-size: 11px;
        line-height: 1.35;
      }
      .choice-pill-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin: 0 0 16px;
      }
      .choice-pill {
        min-height: 40px;
        padding: 0 13px;
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 999px;
        color: rgba(255, 255, 255, 0.74);
        background: rgba(1, 7, 18, 0.7);
        font-size: 12px;
        font-weight: 800;
        cursor: pointer;
      }
      .choice-pill.is-selected {
        color: #ffffff;
        border-color: #168bff;
        background: rgba(8, 124, 255, 0.22);
        box-shadow: 0 0 12px rgba(8, 124, 255, 0.24);
      }
      .two-field-row {
        display: grid;
        grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
        gap: 10px;
      }
      .field-help {
        margin: 0 0 16px;
        color: rgba(203, 213, 225, 0.62);
        font-size: 12px;
        line-height: 1.5;
      }
      .file-picker {
        min-height: 50px;
        display: flex !important;
        align-items: center;
        padding: 12px 13px;
        border: 1px dashed rgba(22, 139, 255, 0.40);
        border-radius: 11px;
        background: rgba(8, 124, 255, 0.06);
        cursor: pointer;
      }
      .file-picker input {
        position: absolute;
        width: 1px;
        height: 1px;
        opacity: 0;
        overflow: hidden;
      }
      .profile-photo-row {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 10px;
      }
      .profile-photo-preview {
        width: 64px;
        height: 64px;
        flex: 0 0 64px;
        display: grid;
        place-items: center;
        overflow: hidden;
        border-radius: 50%;
        color: rgba(255, 255, 255, 0.5);
        background: rgba(255, 255, 255, 0.06);
      }
      .profile-photo-preview img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .profile-photo-actions {
        min-width: 0;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .profile-photo-picker {
        min-height: 42px;
        padding: 0 14px;
        justify-content: center;
      }
      .profile-photo-remove {
        min-height: 38px;
        margin-top: 0;
        padding: 0 14px;
        font-size: 13px;
      }
      .profile-danger-zone {
        margin-top: 22px;
        padding: 16px;
        border: 1px solid rgba(255, 51, 79, 0.28);
        border-radius: 14px;
        background: rgba(255, 51, 79, 0.06);
      }
      .danger-button {
        width: 100%;
        min-height: 46px;
        margin-top: 6px;
        border: 1px solid rgba(255, 51, 79, 0.4);
        border-radius: 12px;
        color: #ff8a97;
        background: rgba(255, 51, 79, 0.1);
        font-size: 14px;
        font-weight: 800;
        cursor: pointer;
      }
      .preview-wrap {
        margin: 10px 0 14px;
      }
      .media-preview {
        width: 100%;
        max-height: 220px;
        display: block;
        object-fit: contain;
        border: 1px solid rgba(22, 139, 255, 0.28);
        border-radius: 12px;
        background: #000000;
      }
      .logo-preview {
        width: 60px;
        height: 60px;
        display: block;
        object-fit: cover;
        border-radius: 50%;
      }
      .save-button,
      .cancel-button,
      .switch-mode-button {
        width: 100%;
        min-height: 50px;
        padding: 13px;
        border-radius: 13px;
        font-size: 15px;
        font-weight: 900;
        cursor: pointer;
      }
      .save-button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        border: 1px solid rgba(22, 139, 255, 0.48);
        color: #ffffff;
        background: linear-gradient(145deg, var(--blue-bright), #0064df);
      }
      .save-button:disabled {
        opacity: 0.65;
        cursor: wait;
      }
      .cancel-button {
        margin-top: 10px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        color: #d9e2ef;
        background: transparent;
      }
      .switch-mode-button {
        margin-top: 10px;
        border: none;
        color: #64b3ff;
        background: transparent;
        font-size: 14px;
        font-weight: 600;
      }
      .auth-error {
        margin: -2px 0 12px;
        color: #ff5773;
        font-size: 12px;
        font-weight: 700;
      }
      .account-status-row {
        margin-bottom: 16px;
      }
      .account-status-row .field-help {
        margin-top: 8px;
        margin-bottom: 0;
      }
      .mysheet-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        padding: 30px 10px;
        text-align: center;
        color: rgba(255, 255, 255, 0.72);
      }
      .mysheet-empty p {
        margin: 0;
        line-height: 1.5;
      }
      .mytime-icon {
        color: #64b3ff;
      }
      .myservices-list,
      .myinbox-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 16px;
      }
      .myservice-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.03);
      }
      .myservice-thumb {
        width: 52px;
        height: 52px;
        flex: 0 0 52px;
        object-fit: cover;
        border-radius: 12px;
        background: #000;
      }
      .myservice-info {
        min-width: 0;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .myservice-info strong {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 14px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .myservice-info span {
        color: rgba(255, 255, 255, 0.62);
        font-size: 12px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .myservice-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
      }
      .myservice-actions button {
        width: 36px;
        height: 36px;
        display: grid;
        place-items: center;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 10px;
        color: #ffffff;
        background: rgba(255, 255, 255, 0.05);
        cursor: pointer;
      }
      .myservice-actions .myservice-delete {
        color: #ff8a97;
        border-color: rgba(255, 51, 79, 0.28);
      }
      .myinbox-search-wrap {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 14px;
        padding: 0 14px;
        border: 1px solid rgba(148, 163, 184, 0.22);
        border-radius: 14px;
        background: rgba(1, 7, 18, 0.74);
        color: rgba(255, 255, 255, 0.5);
      }
      .myinbox-search {
        flex: 1;
        min-height: 44px;
        margin: 0;
        padding: 0;
        border: 0;
        background: transparent;
        color: #ffffff;
        font-size: 14px;
      }
      .myinbox-search::placeholder {
        color: rgba(226, 232, 240, 0.42);
      }
      .myinbox-row {
        position: relative;
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        padding: 12px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.03);
        color: #ffffff;
        text-align: left;
        cursor: pointer;
      }
      .myinbox-row.has-unread {
        border-color: rgba(22, 139, 255, 0.55);
        background: rgba(8, 124, 255, 0.1);
        box-shadow: inset 0 0 0 1px rgba(22, 139, 255, 0.18);
      }
      .myinbox-row.has-unread .myinbox-main strong {
        color: #ffffff;
      }
      .myinbox-avatar {
        width: 42px;
        height: 42px;
        flex: 0 0 42px;
        display: block;
        overflow: hidden;
        border-radius: 50%;
        background: rgba(8, 124, 255, 0.14);
      }
      .myinbox-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .myinbox-main {
        min-width: 0;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .myinbox-name-row {
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .myinbox-name-row strong {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 14px;
      }
      .myinbox-verified {
        width: 14px;
        height: 14px;
        flex-shrink: 0;
      }
      .myinbox-time {
        margin-left: auto;
        flex-shrink: 0;
        color: rgba(255, 255, 255, 0.45);
        font-size: 10.5px;
        font-weight: 600;
      }
      .myinbox-main strong,
      .myinbox-main small {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .myinbox-main strong {
        font-size: 14px;
      }
      .myinbox-main small {
        color: rgba(255, 255, 255, 0.56);
        font-size: 11px;
      }
      .myinbox-preview {
        color: rgba(255, 255, 255, 0.72) !important;
      }
      .myinbox-row.has-unread .myinbox-preview {
        color: rgba(255, 255, 255, 0.9) !important;
        font-weight: 650;
      }
      .myinbox-unread-badge {
        min-width: 22px;
        height: 22px;
        padding: 0 6px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        color: #ffffff;
        background: var(--danger);
        font-size: 12px;
        font-weight: 800;
      }
      .info-modal-body {
        margin: 0 0 18px;
        color: rgba(226, 232, 240, 0.86);
        font-size: 14px;
        line-height: 1.6;
      }
      .profile-sheet-card {
        max-width: 460px;
      }
      .profile-sheet-top {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 14px;
      }
      .provider-sheet-avatar {
        width: 72px;
        height: 72px;
        flex: 0 0 72px;
        position: relative;
        isolation: isolate;
        padding: 4px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.92);
      }
      @keyframes gwamoTireSpin {
        to { transform: rotate(360deg); }
      }
      .provider-sheet-avatar::before {
        content: "";
        position: absolute;
        inset: -2px;
        z-index: 0;
        border-radius: 50%;
        background: repeating-conic-gradient(from 0deg, var(--ring-c1) 0deg 12deg, var(--ring-c2) 12deg 18deg, var(--ring-c1) 18deg 28deg, var(--ring-c2) 28deg 34deg);
        animation: gwamoTireSpin 2.8s linear infinite;
      }
      .provider-sheet-avatar img {
        position: relative;
        z-index: 1;
        width: 100%;
        height: 100%;
        display: block;
        object-fit: cover;
        border-radius: 50%;
      }
      .profile-sheet-identity {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .profile-sheet-identity h3 {
        margin: 0;
        font-size: 18px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .profile-sheet-headline {
        margin: 0 0 8px;
        color: #ffffff;
        font-size: 16px;
        font-weight: 800;
      }
      .profile-sheet-description {
        margin: 0 0 10px;
        color: rgba(226, 232, 240, 0.82);
        font-size: 14px;
        line-height: 1.55;
        white-space: pre-wrap;
      }
      .profile-sheet-meta {
        margin: 0 0 18px;
        color: rgba(203, 213, 225, 0.56);
        font-size: 12px;
      }
      .profile-sheet-actions {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .profile-sheet-actions .save-button,
      .profile-sheet-actions .cancel-button {
        margin-top: 0;
      }
      .upload-progress-wrap {
        margin: 16px 0 10px;
      }
      .upload-progress-text {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 8px;
        color: #dbeafe;
        font-size: 13px;
        font-weight: 700;
      }
      .upload-progress-track {
        width: 100%;
        height: 10px;
        overflow: hidden;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.12);
      }
      .upload-progress-track span {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #38bdf8, #2563eb);
        transition: width 180ms ease;
      }
      .chat-modal-overlay {
        position: fixed;
        inset: 0;
        z-index: 9998;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(8px);
      }
      .chat-modal {
        width: 100%;
        max-width: 500px;
        height: 80vh;
        height: 80dvh;
        max-height: 700px;
        display: flex;
        flex-direction: column;
        border-radius: 24px 24px 0 0;
        background: #0f1a2e;
        color: #ffffff;
        overflow: hidden;
      }
      .chat-header {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        background: #0a1424;
      }
      .chat-back {
        width: 36px;
        height: 36px;
        display: grid;
        place-items: center;
        border: none;
        border-radius: 50%;
        color: #ffffff;
        background: rgba(255, 255, 255, 0.08);
        cursor: pointer;
      }
      .chat-header-avatar {
        width: 40px;
        height: 40px;
        flex: 0 0 40px;
        border-radius: 50%;
        object-fit: cover;
        background: rgba(255, 255, 255, 0.08);
      }
      .chat-header div {
        min-width: 0;
        display: flex;
        flex-direction: column;
      }
      .chat-header-name {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 16px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .chat-header-verified {
        width: 15px;
        height: 15px;
        flex-shrink: 0;
      }
      .chat-header small { font-size: 12px; color: rgba(255,255,255,0.6); }
      .chat-header-copy { flex: 1; }
      .chat-header .chat-privacy-note {
        margin-top: 3px;
        color: rgba(255,255,255,.43);
        font-size: 9.5px;
        line-height: 1.25;
        white-space: normal;
      }
      .chat-messages {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .chat-date-separator {
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 6px 0;
      }
      .chat-date-separator span {
        padding: 4px 12px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
        color: rgba(255, 255, 255, 0.66);
        font-size: 11px;
        font-weight: 700;
      }
      .chat-loading, .chat-empty {
        text-align: center;
        color: rgba(255,255,255,0.5);
        padding: 40px 0;
      }
      .chat-welcome {
        min-height: 100%;
        display: grid;
        place-items: center;
        align-content: center;
        gap: 8px;
        padding: 28px 18px;
        text-align: center;
        color: rgba(255, 255, 255, 0.72);
      }
      .chat-welcome img {
        width: 68px;
        height: 68px;
        object-fit: cover;
        border-radius: 50%;
        border: 2px solid rgba(55, 162, 255, 0.72);
        box-shadow: 0 0 18px rgba(22, 139, 255, 0.35);
      }
      .chat-welcome strong {
        color: #fff;
        font-size: 16px;
      }
      .chat-welcome p {
        max-width: 320px;
        margin: 0;
        font-size: 12px;
        line-height: 1.5;
      }
      .chat-message {
        max-width: 80%;
        padding: 10px 14px;
        border-radius: 16px;
      }
      .chat-message.sent {
        align-self: flex-end;
        background: #087cff;
      }
      .chat-message.received {
        align-self: flex-start;
        background: rgba(255, 255, 255, 0.08);
      }
      .chat-message.is-pending {
        opacity: 0.62;
      }
      .chat-message.is-failed {
        border: 1px solid var(--danger);
      }
      .chat-message p {
        margin: 0;
        font-size: 14px;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }
      .chat-message img,
      .chat-message video {
        max-width: 100%;
        border-radius: 10px;
        margin-bottom: 6px;
      }
      .chat-image-attachment {
        cursor: zoom-in;
      }
      .chat-message audio {
        width: 100%;
        margin-bottom: 6px;
      }
      .chat-document-link {
        display: flex;
        align-items: center;
        gap: 9px;
        max-width: 100%;
        padding: 10px 12px;
        border: 1px solid rgba(255, 255, 255, .14);
        border-radius: 11px;
        color: #ffffff;
        background: rgba(255, 255, 255, .08);
        text-decoration: none;
      }
      .chat-document-link span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .chat-message time {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 10px;
        opacity: 0.6;
        margin-top: 4px;
      }
      .chat-read-status {
        display: inline-flex;
        align-items: center;
        opacity: 0.75;
      }
      .chat-read-status.is-read {
        color: #7ee0ff;
        opacity: 1;
      }
      .chat-new-messages-button {
        align-self: center;
        margin: 4px 0 8px;
        padding: 7px 16px;
        border: 1px solid rgba(22, 139, 255, 0.5);
        border-radius: 999px;
        color: #ffffff;
        background: rgba(8, 124, 255, 0.28);
        font-size: 12px;
        font-weight: 800;
        cursor: pointer;
        animation: gwamoFadeIn 220ms ease-out;
      }
      @keyframes gwamoFadeIn {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .chat-retry-banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 8px 16px;
        color: #ff8a97;
        background: rgba(255, 51, 79, 0.12);
        font-size: 12px;
        font-weight: 700;
      }
      .chat-retry-banner button {
        border: none;
        background: none;
        color: #ff8a97;
        text-decoration: underline;
        cursor: pointer;
        font-size: 12px;
        font-weight: 800;
      }
      .chat-composer {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        background: #0a1424;
      }
      .chat-composer input {
        flex: 1;
        padding: 10px 14px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 20px;
        color: #ffffff;
        background: rgba(255, 255, 255, 0.06);
        outline: none;
      }
      .chat-composer input:focus {
        border-color: #087cff;
      }
      .chat-send {
        width: 40px;
        height: 40px;
        display: grid;
        place-items: center;
        border: none;
        border-radius: 50%;
        color: #ffffff;
        background: #087cff;
        cursor: pointer;
        transition: box-shadow 160ms ease;
      }
      .chat-send:not(:disabled):hover {
        box-shadow: 0 0 14px rgba(8, 124, 255, 0.65);
      }
      .chat-send:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .chat-attach-wrap {
        position: relative;
        flex-shrink: 0;
      }
      .chat-attach-button {
        width: 40px;
        height: 40px;
        display: grid;
        place-items: center;
        border: none;
        border-radius: 50%;
        color: #ffffff;
        background: rgba(255, 255, 255, 0.08);
        cursor: pointer;
      }
      .chat-attach-backdrop {
        position: fixed;
        inset: 0;
        z-index: 9;
      }
      .chat-attach-menu {
        position: absolute;
        bottom: 50px;
        left: 0;
        z-index: 10;
        min-width: 160px;
        padding: 6px;
        border-radius: 14px;
        background: #14213a;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 16px 34px rgba(0, 0, 0, 0.4);
      }
      .chat-attach-menu button {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        min-height: 42px;
        padding: 0 12px;
        border: none;
        border-radius: 9px;
        color: #ffffff;
        background: transparent;
        font-size: 14px;
        cursor: pointer;
      }
      .chat-attach-menu button:hover {
        background: rgba(255, 255, 255, 0.08);
      }
      .zoom-overlay {
        position: fixed;
        inset: 0;
        z-index: 11000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: max(20px, env(safe-area-inset-top)) 20px max(20px, env(safe-area-inset-bottom));
        background: rgba(0, 0, 0, 0.88);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        cursor: zoom-out;
        animation: zoomOverlayIn 180ms ease-out;
      }
      .zoom-image-shell {
        width: min(92vw, 760px);
        height: min(82vh, 760px);
        display: grid;
        place-items: center;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 24px;
        background: rgba(3, 7, 18, 0.72);
        box-shadow: 0 28px 80px rgba(0, 0, 0, 0.52);
        cursor: default;
      }
      .zoom-image {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: contain;
        user-select: none;
        -webkit-user-drag: none;
      }
      .zoom-close-button {
        position: fixed;
        top: max(16px, env(safe-area-inset-top));
        right: 16px;
        z-index: 11001;
        width: 46px;
        height: 46px;
        display: grid;
        place-items: center;
        padding: 0;
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 50%;
        color: #ffffff;
        background: rgba(15, 23, 42, 0.82);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.34);
        cursor: pointer;
      }
      @keyframes zoomOverlayIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .loading-state, .empty-state {
        min-height: 60vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding-top: calc(174px + env(safe-area-inset-top));
        color: rgba(255,255,255,0.6);
      }
      .empty-state p {
        margin-bottom: 20px;
      }
      .empty-button {
        min-height: 50px;
        padding: 0 28px;
        border: none;
        border-radius: 14px;
        color: #ffffff;
        background: #087cff;
        font-weight: 800;
        cursor: pointer;
        font-size: 16px;
      }
      .skeleton-card {
        pointer-events: none;
      }
      .skeleton-shimmer {
        position: absolute;
        inset: 0;
        background: linear-gradient(
          100deg,
          rgba(255, 255, 255, 0.03) 30%,
          rgba(255, 255, 255, 0.09) 50%,
          rgba(255, 255, 255, 0.03) 70%
        );
        background-size: 200% 100%;
        animation: gwamoSkeletonShimmer 1.6s ease-in-out infinite;
      }
      @keyframes gwamoSkeletonShimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
      @media (prefers-reduced-motion: reduce) {
        .skeleton-shimmer { animation: none; }
      }
      .gwamo-toast {
        position: fixed;
        left: 50%;
        top: calc(96px + env(safe-area-inset-top));
        z-index: 10500;
        max-width: min(86vw, 360px);
        padding: 11px 18px;
        border: 1px solid rgba(22, 139, 255, 0.42);
        border-radius: 999px;
        color: #ffffff;
        background: rgba(4, 13, 29, 0.92);
        -webkit-backdrop-filter: blur(14px);
        backdrop-filter: blur(14px);
        box-shadow: 0 0 0 1px rgba(22, 139, 255, 0.1), 0 12px 34px rgba(0, 0, 0, 0.5), 0 0 16px rgba(22, 139, 255, 0.3);
        font-size: 13px;
        font-weight: 700;
        text-align: center;
        transform: translateX(-50%);
        animation: gwamoToastIn 220ms ease-out;
      }
      @keyframes gwamoToastIn {
        from { opacity: 0; transform: translate(-50%, -6px); }
        to { opacity: 1; transform: translate(-50%, 0); }
      }
      @media (max-width: 700px) {
        .feedx-topbar-inner {
          min-height: 82px;
          padding: 15px 18px 10px;
        }
        .feedx-logo {
          font-size: 34px;
          letter-spacing: 3px;
        }
        .gwamo-tagline {
          display: block;
          font-size: 14px;
        }
        .category-nav {
          padding: 0 18px 14px;
          gap: 8px;
        }
        .category-tab {
          min-height: 48px;
          padding: 0 17px;
          border-radius: 15px;
        }
        .account-avatar-button {
          width: 38px;
          height: 38px;
          flex-basis: 38px;
        }
        .login-pill span {
          display: none;
        }
        .login-pill {
          min-height: 38px;
          padding: 0 11px;
        }
        .dropdown-menu {
          top: calc(100% + 8px);
        }
        .home-feed {
          padding: calc(158px + env(safe-area-inset-top)) 12px 34px;
        }
        .coming-soon-panel,
        .loading-state,
        .empty-state {
          padding-top: calc(158px + env(safe-area-inset-top));
        }
        .service-reel-card {
          height: clamp(590px, calc(100svh - 172px), 780px);
          border-radius: 22px;
        }
        .service-avatar-badge {
          top: 14px;
          right: 14px;
          width: 46px;
          height: 46px;
        }
        .post-info-block {
          left: 22px;
          right: 82px;
          bottom: 122px;
        }
        .creator-name {
          font-size: 14px;
        }
        .service-name {
          font-size: 13px;
          line-height: 1.3;
        }
        .post-price {
          font-size: 13.5px;
        }
        .post-tagline {
          font-size: 11.5px;
          font-weight: 400;
          line-height: 1.38;
        }
        .service-social-rail {
          right: 14px;
          bottom: 130px;
          gap: 18px;
        }
        .rail-action {
          width: 46px;
          font-size: 12px;
        }
        .contact-me-cta {
          left: 50%;
          right: auto;
          bottom: 20px;
          width: clamp(210px, 58vw, 260px);
          min-height: 50px;
          padding: 0 20px;
          font-size: 17px;
          transform: translateX(-50%);
        }
        .modal-card {
          border-radius: 20px 20px 0 0;
        }
        .auth-modal-card {
          border-radius: 24px;
        }
        .chat-modal {
          height: 90vh;
          height: 90dvh;
          max-height: none;
          border-radius: 20px 20px 0 0;
        }
      }
      @media (max-width: 360px) {
        .feedx-logo {
          font-size: 30px;
        }
        .account-avatar-button {
          width: 38px;
          height: 38px;
          flex-basis: 38px;
        }
        .menu-button {
          width: 46px;
          height: 46px;
        }
        .service-name {
          font-size: 12.5px;
        }
        .post-info-block {
          right: 68px;
        }
      }
      .service-avatar-badge:focus-visible,
      .rail-action:focus-visible,
      .contact-me-cta:focus-visible,
      .account-avatar-button:focus-visible,
      .login-pill:focus-visible,
      .menu-button:focus-visible,
      .category-tab:focus-visible {
        outline: 2px solid #168bff;
        outline-offset: 2px;
      }
      @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
          animation: none !important;
          transition: none !important;
        }
      }
      /* Gwamo glass reel refresh: keep the original feed, chat and media logic. */
      .feedx-topbar {
        background: linear-gradient(180deg, rgba(1, 5, 13, .92), rgba(1, 5, 13, .42), transparent);
        border-bottom: 0;
      }
      .feedx-topbar-inner {
        min-height: 70px;
        padding: 15px 24px 8px;
      }
      .feedx-logo { font-size: clamp(26px, 4vw, 36px); letter-spacing: 5px; }
      .gwamo-tagline { display: none; }
      .topbar-actions { gap: 5px; }
      .topbar-neon-button {
        min-width: 44px;
        height: 44px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 0 8px;
        border: 0;
        border-radius: 50%;
        color: #eaf8ff;
        background: transparent;
        filter: drop-shadow(0 0 7px rgba(45, 186, 255, .72));
        cursor: pointer;
      }
      .topbar-neon-button:hover { color: #ffffff; filter: drop-shadow(0 0 12px rgba(45, 186, 255, 1)); }
      .topbar-action-text { font-size: 11px; font-weight: 700; }
      .topbar-add-button { color: #ffffff; border: 1px solid rgba(255, 255, 255, .24); background: rgba(5, 17, 34, .26); }
      .category-nav { position: absolute; left: 0; right: 0; bottom: -55px; width: 100%; padding: 0 18px; gap: 7px; }
      .category-tab { min-height: 34px; padding: 0 12px; border-radius: 999px; font-size: 11px; background: rgba(3, 12, 27, .38); backdrop-filter: blur(12px); }
      .category-tab svg { width: 13px; height: 13px; }
      .home-feed { width: min(100%, 760px); padding: calc(80px + env(safe-area-inset-top)) 0 0; }
      .service-reel-card { height: calc(100svh - env(safe-area-inset-top)); min-height: 600px; margin: 0; border: 0; border-radius: 0; box-shadow: none; scroll-snap-align: start; }
      .home-page { background: #020712; }
      .service-reel-card img.home-media, .service-reel-card video.home-media { object-fit: cover; }
      .service-card-gradient { background: linear-gradient(to bottom, rgba(0, 3, 10, .48), transparent 34%, transparent 54%, rgba(0, 4, 12, .25) 66%, rgba(0, 4, 12, .94) 95%, #020712 100%); }
      .reel-type-label { position: absolute; z-index: 41; top: 118px; left: 22px; padding: 10px 14px; border: 1px solid rgba(80, 194, 255, .92); border-radius: 14px; color: #79cbff; background: rgba(3, 21, 45, .38); backdrop-filter: blur(12px); box-shadow: inset 0 0 16px rgba(20, 134, 255, .14), 0 0 17px rgba(25, 151, 255, .63); font-size: 12px; font-weight: 800; letter-spacing: .4px; }
      .service-avatar-badge { top: 112px; right: 20px; width: 48px; height: 48px; background: rgba(3, 13, 27, .4); backdrop-filter: blur(10px); }
      .post-info-block { left: 24px; right: 84px; bottom: 144px; padding: 13px 14px; border: 1px solid rgba(255, 255, 255, .14); border-radius: 18px; background: rgba(3, 12, 27, .32); backdrop-filter: blur(12px); box-shadow: 0 10px 32px rgba(0, 0, 0, .18); }
      .creator-name { font-size: 13px; font-weight: 700; color: rgba(255, 255, 255, .88); }
      .service-name { margin-top: 4px; font-size: clamp(21px, 4.3vw, 30px); font-weight: 800; line-height: 1.12; }
      .post-price { display: none; }
      .post-tagline { margin-top: 6px; font-size: 13px; line-height: 1.42; color: rgba(255, 255, 255, .84); }
      .service-social-rail { right: 16px; bottom: 148px; gap: 19px; }
      .rail-action { width: 50px; min-height: 50px; color: #e8f7ff; filter: drop-shadow(0 0 7px rgba(39, 178, 255, .74)); }
      .contact-me-cta { bottom: 28px; width: min(86vw, 380px); min-height: 58px; border-radius: 18px; background: rgba(2, 19, 38, .36); backdrop-filter: blur(14px); box-shadow: inset 0 0 20px rgba(36, 173, 255, .18), 0 0 21px rgba(23, 161, 255, .84); }
      @media (max-width: 700px) {
        .feedx-topbar-inner { min-height: 62px; padding: 13px 16px 7px; }
        .feedx-logo { font-size: 25px; }
        .topbar-action-text { display: none; }
        .category-nav { bottom: -47px; padding: 0 12px; }
        .category-tab { min-height: 30px; padding: 0 10px; font-size: 10px; }
        .home-feed { padding-top: calc(68px + env(safe-area-inset-top)); }
        .service-reel-card { min-height: 540px; }
        .reel-type-label { top: 95px; left: 16px; padding: 8px 11px; font-size: 10px; }
        .service-avatar-badge { top: 92px; right: 15px; }
        .post-info-block { left: 16px; right: 75px; bottom: 124px; padding: 10px 11px; }
        .service-name { font-size: 21px; }
        .post-tagline { font-size: 12px; }
        .service-social-rail { right: 11px; bottom: 132px; gap: 14px; }
        .contact-me-cta { bottom: 17px; min-height: 53px; font-size: 18px; }
      }
      .glass-frame-overlay {
        position: absolute;
        inset: 0;
        z-index: 30;
        width: 100%;
        height: 100%;
        border-radius: inherit;
        pointer-events: none;
        background: transparent;
        border: 1px solid rgba(116, 211, 255, .74);
        box-shadow:
          inset 0 0 0 1px rgba(255, 255, 255, .12),
          inset 0 0 22px rgba(31, 174, 255, .16),
          0 0 15px rgba(28, 167, 255, .42);
      }
      /* Final Gwamo layout: stable for both photo and video posts. */
      .feedx-topbar {
        background: #03070d;
        border-bottom: 1px solid rgba(255,255,255,.08);
      }
      .category-nav {
        z-index: 90;
        justify-content: flex-start;
        overflow-x: auto;
        overflow-y: hidden;
        padding: 8px 16px;
        background: rgba(0, 0, 0, .90);
        -webkit-backdrop-filter: blur(14px);
        backdrop-filter: blur(14px);
        scrollbar-width: none;
      }
      .category-nav::-webkit-scrollbar { display: none; }
      .category-tab {
        flex: 0 0 auto;
        min-height: 32px;
        padding: 0 12px;
        border-color: rgba(255,255,255,.10);
        background: rgba(255,255,255,.08);
      }
      .category-tab.is-active {
        background: rgba(4, 28, 56, .92);
      }
      .service-reel-card img.home-media,
      .service-reel-card video.home-media {
        object-fit: contain;
        object-position: center;
        background: #000;
      }
      .reel-type-label { display: none !important; }
      .post-info-block {
        left: 22px;
        right: 74px;
        bottom: 84px;
        max-height: min(24svh, 180px);
        padding: 0;
        overflow: visible;
        border: 0;
        border-radius: 0;
        background: transparent;
        -webkit-backdrop-filter: none;
        backdrop-filter: none;
        box-shadow: none;
        text-align: left;
      }
      .post-provider-row {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        min-width: 0;
      }
      .post-provider-copy {
        min-width: 0;
        flex: 1;
        padding-top: 1px;
      }
      .service-avatar-badge {
        position: relative;
        inset: auto;
        width: 44px;
        height: 44px;
        flex: 0 0 44px;
        padding: 2px;
      }
      .creator-name {
        width: auto;
        max-width: 100%;
        min-width: 0;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        margin: 0;
        padding: 0;
        border: 0;
        color: #fff;
        background: transparent;
        font: inherit;
        font-size: 14px;
        font-weight: 800;
        line-height: 1.25;
        text-align: left;
        text-shadow: 0 1px 5px rgba(0,0,0,.98), 0 0 12px rgba(0,0,0,.82);
        cursor: pointer;
      }
      .creator-name > span:first-child {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .verified-check-badge {
        width: 17px;
        height: 17px;
      }
      .service-name {
        margin: 4px 0 0;
        color: #fff;
        font-size: 13px;
        font-weight: 650;
        line-height: 1.3;
        text-align: left;
        text-shadow: 0 1px 5px rgba(0,0,0,.98), 0 0 12px rgba(0,0,0,.82);
        -webkit-line-clamp: 1;
      }
      .post-tagline-wrap { margin-top: 3px; }
      .post-tagline {
        margin: 0;
        color: rgba(255,255,255,.92);
        font-size: 12px;
        font-weight: 400;
        line-height: 1.36;
        text-align: left;
        text-shadow: 0 1px 5px #000, 0 0 12px rgba(0,0,0,.9);
        white-space: pre-line;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 3;
        overflow: hidden;
      }
      .post-tagline.is-expanded {
        display: block;
        max-height: min(18svh, 130px);
        overflow-y: auto;
      }
      .tagline-toggle-button {
        color: #fff;
        text-shadow: 0 1px 5px #000;
      }
      .post-price { display: none; }
      .service-social-rail {
        right: 18px;
        bottom: 92px;
        gap: 0;
      }
      .rail-action {
        width: 44px;
        min-height: 44px;
      }
      .rail-action svg { width: 31px; height: 31px; }
      .inbox-rail-action,
      .plus-rail-action { display: none !important; }
      .contact-me-cta {
        bottom: calc(22px + env(safe-area-inset-bottom));
        width: min(70%, 280px);
        min-height: 44px;
        padding: 0 18px;
        gap: 9px;
        border-radius: 14px;
        font-size: 16px;
        font-weight: 700;
        background: rgba(2, 13, 27, .38);
        -webkit-backdrop-filter: blur(9px);
        backdrop-filter: blur(9px);
        box-shadow: inset 0 0 12px rgba(36,173,255,.12), 0 0 12px rgba(23,161,255,.62);
      }
      .contact-me-cta svg { width: 18px; height: 18px; }
      .call-me-button {
        position: absolute;
        z-index: 44;
        right: 18px;
        bottom: calc(22px + env(safe-area-inset-bottom));
        width: 46px;
        height: 46px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1.5px solid #37a2ff;
        border-radius: 50%;
        color: #fff;
        background: rgba(1, 8, 20, .34);
        -webkit-backdrop-filter: blur(6px);
        backdrop-filter: blur(6px);
        box-shadow: inset 0 0 10px rgba(22,139,255,.12), 0 0 5px rgba(255,255,255,.2), 0 0 14px rgba(22,139,255,.7);
        text-decoration: none;
      }
      .call-me-button:hover {
        background: rgba(9, 44, 91, .4);
        box-shadow: inset 0 0 14px rgba(22,139,255,.16), 0 0 7px rgba(255,255,255,.24), 0 0 18px rgba(22,139,255,.9);
      }
      /* Use the Gwamo glass frame as the shared visual language for forms and chat. */
      .modal-card,
      .chat-modal {
        position: relative;
        isolation: isolate;
        border: 1px solid rgba(76, 195, 255, .52);
        background-color: #06101f;
        background-image:
          radial-gradient(circle at top, rgba(8,124,255,.16), transparent 42%),
          linear-gradient(180deg, rgba(4,14,31,.98), rgba(2,8,18,.98));
        background-position: center, center;
        background-repeat: no-repeat, no-repeat;
        background-size: cover, cover;
        box-shadow: 0 0 22px rgba(26,161,255,.38), 0 -18px 50px rgba(0,0,0,.56);
      }
      .modal-header,
      .chat-header {
        background: rgba(2, 8, 18, .86);
        -webkit-backdrop-filter: blur(15px);
        backdrop-filter: blur(15px);
      }
      .modal-card input,
      .modal-card textarea,
      .modal-card select,
      .post-type-choice {
        background-color: rgba(1, 7, 18, .78);
        -webkit-backdrop-filter: blur(10px);
        backdrop-filter: blur(10px);
      }
      @media (max-width: 700px) {
        .category-nav {
          padding: 7px 12px;
        }
        .category-tab {
          min-height: 30px;
          padding: 0 10px;
          font-size: 10px;
        }
        .post-info-block {
          left: 17px;
          right: 66px;
          bottom: 78px;
        }
        .service-avatar-badge {
          width: 41px;
          height: 41px;
          flex-basis: 41px;
        }
        .creator-name { font-size: 13.5px; }
        .service-name { font-size: 12.5px; }
        .post-tagline { font-size: 11.5px; }
        .service-social-rail {
          right: 12px;
          bottom: 84px;
        }
        .contact-me-cta {
          bottom: calc(17px + env(safe-area-inset-bottom));
          width: min(68%, 250px);
          min-height: 42px;
          font-size: 15.5px;
        }
      }
      /* Final media bounds and compact controls. */
      .service-reel-card {
        --media-top-boundary: 47px;
        --media-edge-gap: 8px;
        --media-bottom-boundary: 88px;
      }
      .service-reel-card .media-card {
        top: var(--media-top-boundary);
        right: var(--media-edge-gap);
        bottom: var(--media-bottom-boundary);
        left: var(--media-edge-gap);
        width: auto;
        height: auto;
        border-radius: 0 0 22px 22px;
      }
      .service-reel-card .media-viewport,
      .service-reel-card .media-layer {
        inset: 0;
        width: 100%;
        height: 100%;
        border-radius: inherit;
      }
      .service-reel-card .media-layer {
        background: #000;
      }
      .service-reel-card img.home-media,
      .service-reel-card video.home-media {
        width: 100%;
        height: 100%;
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        object-position: center;
      }
      .service-avatar-badge {
        padding: 0;
        border: 0;
        background: transparent;
        box-shadow: none;
      }
      .service-avatar-badge::before { display: none; }
      .service-avatar-badge img {
        border: 0;
        background: transparent;
      }
      .contact-me-cta {
        width: min(58%, 220px);
        min-height: 38px;
        padding: 0 14px;
        gap: 7px;
        border-radius: 12px;
        font-size: 14px;
      }
      .contact-me-cta svg {
        width: 16px;
        height: 16px;
      }
      .topbar-inbox-button .inbox-icon-wrap {
        position: relative;
        display: inline-flex;
      }
      .post-price {
        display: block !important;
        margin-top: 2px;
        color: #39e982;
        font-size: 12px;
        font-weight: 800;
        line-height: 1.25;
        text-shadow: 0 1px 5px rgba(0,0,0,.98), 0 0 9px rgba(23,195,105,.35);
      }
      .post-price-unit {
        color: rgba(144, 255, 191, .78);
        font-size: .92em;
      }
      @media (max-width: 700px) {
        .service-reel-card {
          --media-top-boundary: 44px;
          --media-edge-gap: 7px;
          --media-bottom-boundary: 74px;
        }
        .topbar-actions { gap: 2px; }
        .topbar-neon-button {
          min-width: 37px;
          width: 37px;
          height: 40px;
          padding: 0 4px;
        }
        .topbar-neon-button svg {
          width: 23px;
          height: 23px;
        }
        .contact-me-cta {
          width: min(56%, 205px);
          min-height: 37px;
          bottom: calc(16px + env(safe-area-inset-bottom));
          font-size: 13.5px;
        }
        .call-me-button {
          right: 12px;
          bottom: calc(16px + env(safe-area-inset-bottom));
          width: 40px;
          height: 40px;
        }
        .call-me-button svg {
          width: 17px;
          height: 17px;
        }
        /* Mobile-safe glass fallback. Some low-memory Android GPUs corrupt layers
           that combine backdrop-filter, SVG filters and fixed/absolute overlays. */
        .home-page *,
        .home-page *::before,
        .home-page *::after {
          -webkit-backdrop-filter: none !important;
          backdrop-filter: none !important;
        }
        .feedx-topbar {
          background: #03070d !important;
        }
        .category-nav {
          background: rgba(0, 0, 0, .97) !important;
        }
        .category-tab {
          background: linear-gradient(180deg, #121a2a, #070c19) !important;
        }
        .category-tab.is-active {
          background: linear-gradient(180deg, #0a4c96, #041a39) !important;
        }
        .service-reel-card,
        .modal-card,
        .chat-modal {
          background-color: #06101f !important;
        }
        .contact-me-cta {
          background: linear-gradient(180deg, rgba(5, 31, 59, .98), rgba(2, 13, 27, .98)) !important;
        }
        .gold-star,
        .rail-action,
        .topbar-neon-button {
          filter: none !important;
        }
        .glass-frame-overlay {
          contain: paint;
        }
      }
      /* =========================================================
         GWAMO TV mode: media becomes the visual background while
         controls stay light, transparent and symbol-first.
      ========================================================== */
      .home-page.is-tv-mode {
        background: #020712;
      }
      .home-page.is-tv-mode .feedx-topbar,
      .feedx-topbar.is-tv-mode {
        background: linear-gradient(
          180deg,
          rgba(1, 5, 13, .56) 0%,
          rgba(1, 5, 13, .20) 52%,
          transparent 100%
        ) !important;
        border-bottom: 0 !important;
        -webkit-backdrop-filter: none !important;
        backdrop-filter: none !important;
      }
      .home-page.is-tv-mode .category-nav {
        background: transparent !important;
        -webkit-backdrop-filter: none !important;
        backdrop-filter: none !important;
      }
      .home-page.is-tv-mode .category-tab,
      .home-page.is-tv-mode .category-tab.is-active {
        border-color: transparent !important;
        background: transparent !important;
        box-shadow: none !important;
        -webkit-backdrop-filter: none !important;
        backdrop-filter: none !important;
        color: rgba(255, 255, 255, .9);
        text-shadow: 0 1px 4px rgba(0, 0, 0, .94), 0 0 8px rgba(24, 153, 255, .35);
      }
      .home-page.is-tv-mode .category-tab.is-active {
        position: relative;
        color: #fff;
        filter: drop-shadow(0 0 6px rgba(40, 169, 255, .9));
      }
      /* Small, purely decorative marker so it's obvious at a glance that
         the TV tab is the active one - no change to nav markup, spacing,
         or behavior, just a pseudo-element dot in its corner. */
      .home-page.is-tv-mode .category-tab.is-active::after {
        content: "";
        position: absolute;
        top: 6px;
        right: 8px;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #ff3855;
        box-shadow: 0 0 6px rgba(255, 56, 85, .85);
      }
      .home-page.is-tv-mode .home-feed {
        width: min(100%, 900px);
        padding: 0;
      }
      .home-page.is-tv-mode .service-reel-card {
        height: 100svh;
        min-height: 560px;
        margin-bottom: 0;
        background: #020712 !important;
      }
      .home-page.is-tv-mode .service-reel-card .media-card {
        inset: 0 !important;
        width: 100% !important;
        height: 100% !important;
        border-radius: 0 !important;
      }
      .home-page.is-tv-mode .service-reel-card .media-viewport,
      .home-page.is-tv-mode .service-reel-card .media-layer {
        inset: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
      }
      /* The real media is shown at full quality with no cropping, no
         horizontal stretch, and no unnecessary enlargement ("contain" -
         height-first: it fills as much height as it can while never
         exceeding the card's width, preserving the source aspect ratio
         exactly). A blurred, darkened copy of the SAME image/video (see
         .tv-media-backdrop below) fills whatever space is left around it,
         so the background always looks intentional instead of empty bars,
         without ever touching the real media's own sharpness. */
      .home-page.is-tv-mode .service-reel-card img.home-media,
      .home-page.is-tv-mode .service-reel-card video.home-media {
        position: relative;
        z-index: 1;
        width: 100%;
        height: 100%;
        object-fit: contain !important;
        object-position: center;
        background: transparent !important;
      }
      .tv-media-backdrop {
        position: absolute;
        inset: 0;
        z-index: 0;
        overflow: hidden;
        pointer-events: none;
      }
      .tv-media-backdrop img,
      .tv-media-backdrop video {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
        filter: blur(38px) saturate(1.15) brightness(.58);
        transform: scale(1.18);
      }
      .tv-media-backdrop::after {
        content: "";
        position: absolute;
        inset: 0;
        background: rgba(4, 12, 26, .3);
      }
      /* Pasted links (YouTube/Vimeo) render their own player inside a
         cross-origin iframe - we can't read its pixels to build a blurred
         backdrop the way we do for uploaded media above, so instead the
         embed keeps its natural aspect ratio (no cropping, no zoom) and
         sits centered over a frosted glass panel that fills the rest of
         the card, matching the glass styling used elsewhere in Gwamo. */
      .home-page.is-tv-mode .service-reel-card .media-layer {
        display: flex;
        align-items: center;
        justify-content: center;
        background:
          radial-gradient(circle at 50% 42%, rgba(22, 139, 255, .16), transparent 62%),
          rgba(6, 16, 31, .86) !important;
        -webkit-backdrop-filter: blur(18px);
        backdrop-filter: blur(18px);
      }
      .home-page.is-tv-mode .media-layer > iframe.home-media {
        position: relative;
        z-index: 1;
        top: auto;
        left: auto;
        transform: none;
        width: 100%;
        height: auto;
        max-width: 100%;
        max-height: 100%;
        aspect-ratio: 16 / 9;
        min-width: 0;
        min-height: 0;
        border-radius: 14px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, .4);
      }
      .home-page.is-tv-mode .glass-frame-overlay {
        display: none;
      }
      .home-page.is-tv-mode .service-card-gradient {
        background:
          linear-gradient(to bottom, rgba(0, 5, 14, .18) 0%, transparent 24%, transparent 58%, rgba(0, 5, 14, .42) 82%, rgba(2, 7, 18, .82) 100%);
      }
      .home-page.is-tv-mode .post-info-block {
        left: 16px;
        right: 100px;
        bottom: 134px;
        max-height: min(22svh, 168px);
      }
      .home-page.is-tv-mode .service-social-rail {
        right: 17px;
        bottom: 134px;
      }
      .tv-private-contact-cta {
        position: absolute;
        z-index: 44;
        right: 17px;
        bottom: 61px;
        width: 42px;
        height: 42px;
        display: grid;
        place-items: center;
        padding: 0;
        border: 0;
        border-radius: 0;
        color: #fff;
        background: transparent;
        box-shadow: none;
        filter: drop-shadow(0 0 3px rgba(255, 255, 255, .8)) drop-shadow(0 0 10px rgba(37, 169, 255, .85));
        cursor: pointer;
      }
      .tv-private-contact-cta:hover,
      .tv-private-contact-cta:focus-visible {
        filter: drop-shadow(0 0 4px rgba(255, 255, 255, .95)) drop-shadow(0 0 14px rgba(37, 169, 255, 1));
      }

      .social-life-call-cta {
        position: absolute;
        z-index: 44;
        right: 17px;
        bottom: 108px;
        width: 42px;
        height: 42px;
        display: grid;
        place-items: center;
        padding: 0;
        border: 0;
        border-radius: 0;
        color: #fff;
        background: transparent;
        box-shadow: none;
        filter: drop-shadow(0 0 3px rgba(255, 255, 255, .82)) drop-shadow(0 0 10px rgba(37, 169, 255, .82));
        cursor: pointer;
      }
      .social-life-call-cta:hover,
      .social-life-call-cta:focus-visible {
        filter: drop-shadow(0 0 4px rgba(255, 255, 255, .96)) drop-shadow(0 0 14px rgba(37, 169, 255, 1));
      }

      /* Public TV conversation: separate from private Contact me. */
      .tv-live-anchor {
        position: absolute;
        z-index: 45;
        top: 111px;
        left: 17px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 24px;
        padding: 0 8px;
        border: 1px solid rgba(255, 255, 255, .18);
        border-radius: 999px;
        color: rgba(255, 255, 255, .95);
        background: rgba(2, 11, 24, .16);
        font-size: 9px;
        font-weight: 900;
        letter-spacing: 1.5px;
        text-shadow: 0 1px 4px rgba(0, 0, 0, .9);
        pointer-events: none;
      }
      .tv-live-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #ff3855;
        box-shadow: 0 0 8px rgba(255, 56, 85, .9);
        animation: tvLivePulse 1.4s ease-in-out infinite;
      }
      @keyframes tvLivePulse {
        0%, 100% { opacity: .52; transform: scale(.82); }
        50% { opacity: 1; transform: scale(1.15); }
      }
      /* On the full-bleed TV background, the topbar floats transparently
         over the media, so the LIVE badge needs real distance from it to
         read as part of the media/conversation, not as an extension of the
         nav bar above it. Social Life keeps the shared (unscoped) position
         above, since its card isn't full-bleed. */
      .home-page.is-tv-mode .tv-live-anchor {
        top: 140px;
        left: 16px;
      }
      .home-page.is-tv-mode .tv-conversation-column {
        top: 140px;
        right: 92px;
        bottom: 322px;
        left: 16px;
      }
      .tv-conversation-column {
        position: absolute;
        z-index: 41;
        top: 111px;
        right: 74px;
        bottom: 108px;
        left: 17px;
        overflow: hidden;
        pointer-events: none;
        transition: opacity 140ms ease;
      }
      .tv-conversation-column.is-hidden {
        visibility: hidden;
        opacity: 0;
      }
      .tv-conversation-column.is-hidden .tv-message-item {
        animation-play-state: paused;
      }
      .tv-message-item {
        position: absolute;
        left: 0;
        width: min(82%, 430px);
        display: flex;
        align-items: flex-start;
        gap: 8px;
        opacity: 0;
        pointer-events: auto;
        cursor: pointer;
        will-change: transform, opacity;
        animation-name: tvMessageRise;
        animation-duration: var(--tv-message-duration, 12s);
        animation-delay: var(--tv-message-delay, 0s);
        animation-timing-function: linear;
        animation-iteration-count: infinite;
        animation-fill-mode: both;
      }
      .tv-message-item.is-paused {
        animation-play-state: paused;
      }
      /* Public comments/messages circulate continuously while the post is
         visible. Every item keeps a stable lane, duration and small stagger
         delay so new arrivals join without resetting the messages already
         moving. The final fade flows directly back into the next loop. */
      @keyframes tvMessageRise {
        0% {
          opacity: 0;
          transform: translate3d(0, 14px, 0) scale(.97);
        }
        9% {
          opacity: 1;
          transform: translate3d(0, 0, 0) scale(1);
        }
        68% {
          opacity: 1;
          transform: translate3d(0, -40svh, 0) scale(1);
        }
        86% {
          opacity: .35;
          transform: translate3d(0, -52svh, 0) scale(.94);
        }
        100% {
          opacity: 0;
          transform: translate3d(0, -58svh, 0) scale(.9);
        }
      }
      .tv-message-avatar {
        position: relative;
        width: 29px;
        height: 29px;
        flex: 0 0 29px;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: transparent;
        cursor: zoom-in;
      }
      .tv-message-avatar img {
        width: 100%;
        height: 100%;
        display: block;
        border-radius: 50%;
        object-fit: cover;
        border: 1.5px solid rgba(255, 255, 255, .68);
        box-shadow: 0 0 9px rgba(22, 139, 255, .55);
      }
      .tv-message-flag {
        position: absolute;
        right: -3px;
        bottom: -3px;
        width: 15px;
        height: 15px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        background: rgba(1, 8, 20, .86);
        font-size: 10px;
        line-height: 1;
        box-shadow: 0 0 0 1.5px rgba(255, 255, 255, .58);
      }
      .tv-message-body {
        position: relative;
        min-width: 0;
        max-width: 100%;
        display: flex;
        flex-direction: column;
        gap: 1px;
        padding-top: 1px;
      }
      .tv-message-name {
        max-width: 230px;
        overflow: hidden;
        color: #fff;
        font-size: 11.5px;
        font-weight: 850;
        line-height: 1.2;
        text-overflow: ellipsis;
        text-shadow: 0 1px 4px rgba(0, 0, 0, .98), 0 0 8px rgba(22, 139, 255, .65);
        white-space: nowrap;
      }
      .tv-message-text {
        max-width: 100%;
        color: rgba(255, 255, 255, .96);
        font-size: 11.5px;
        font-weight: 560;
        line-height: 1.34;
        text-shadow: 0 1px 4px rgba(0, 0, 0, 1), 0 0 6px rgba(22, 139, 255, .35);
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 3;
        overflow: hidden;
      }
      .tv-message-paused-mark {
        position: absolute;
        top: -2px;
        right: -18px;
        color: rgba(255, 255, 255, .64);
        font-size: 9px;
        letter-spacing: -2px;
      }

      .tv-public-action-dock {
        position: absolute;
        z-index: 47;
        left: 16px;
        bottom: calc(18px + env(safe-area-inset-bottom));
        display: flex;
        align-items: center;
        gap: 8px;
        pointer-events: auto;
      }
      .tv-public-conversation-cta,
      .tv-visibility-toggle {
        position: relative;
        width: 44px;
        height: 44px;
        display: grid;
        place-items: center;
        padding: 0;
        border: 0;
        border-radius: 0;
        color: #f8fdff;
        background: transparent;
        box-shadow: none;
        cursor: pointer;
      }
      .tv-public-conversation-cta {
        filter: drop-shadow(0 0 4px rgba(255, 255, 255, .8)) drop-shadow(0 0 12px rgba(32, 164, 255, .85));
        animation: tvPublicCtaBreath 2.8s ease-in-out infinite;
      }
      .tv-public-conversation-bolt {
        color: #8eeaff;
      }
      @keyframes tvPublicCtaBreath {
        0%, 100% { filter: drop-shadow(0 0 4px rgba(255, 255, 255, .65)) drop-shadow(0 0 8px rgba(32, 164, 255, .55)); transform: scale(1); }
        50% { filter: drop-shadow(0 0 6px rgba(255, 255, 255, 1)) drop-shadow(0 0 17px rgba(32, 164, 255, 1)); transform: scale(1.06); }
      }
      .tv-visibility-toggle {
        width: 38px;
        height: 38px;
        color: rgba(255, 255, 255, .92);
        filter: drop-shadow(0 0 3px rgba(255, 255, 255, .75)) drop-shadow(0 0 10px rgba(32, 164, 255, .8));
      }
      .tv-visibility-toggle:hover,
      .tv-visibility-toggle:focus-visible {
        filter: drop-shadow(0 0 4px rgba(255, 255, 255, .95)) drop-shadow(0 0 14px rgba(32, 164, 255, 1));
      }
      .tv-view-count {
        min-width: 38px;
        height: 38px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 0;
        border: 0;
        border-radius: 0;
        color: rgba(255, 255, 255, .96);
        background: transparent;
        box-shadow: none;
        filter: drop-shadow(0 0 3px rgba(255, 255, 255, .76)) drop-shadow(0 0 10px rgba(32, 164, 255, .82));
        font-size: 10px;
        font-weight: 800;
        line-height: 1;
        pointer-events: none;
        text-shadow: 0 1px 4px rgba(0, 0, 0, .92);
      }
      .tv-view-count span {
        min-width: 0;
      }
      .tv-public-conversation-cta.is-social-life {
        filter: drop-shadow(0 0 4px rgba(255, 255, 255, .78)) drop-shadow(0 0 12px rgba(32, 164, 255, .8));
      }
      .tv-typing-presence {
        position: absolute;
        left: 0;
        bottom: 53px;
        min-width: 82px;
        max-width: 160px;
        display: grid;
        grid-template-columns: 30px minmax(0, 1fr);
        grid-template-rows: auto auto;
        align-items: center;
        column-gap: 7px;
        padding: 5px 7px 5px 5px;
        border-radius: 999px;
        color: #fff;
        background: rgba(2, 12, 28, .26);
        pointer-events: auto;
      }
      .tv-typing-avatar {
        position: relative;
        grid-row: 1 / 3;
        width: 30px;
        height: 30px;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: transparent;
        cursor: zoom-in;
      }
      .tv-typing-avatar img {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        object-fit: cover;
        border: 1px solid rgba(255, 255, 255, .68);
      }
      .tv-typing-avatar span {
        position: absolute;
        right: -4px;
        bottom: -3px;
        font-size: 10px;
      }
      .tv-typing-presence strong {
        min-width: 0;
        overflow: hidden;
        font-size: 10.5px;
        line-height: 1.1;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-shadow: 0 1px 4px #000;
      }
      .tv-typing-dots {
        display: flex;
        align-items: center;
        gap: 3px;
        height: 10px;
      }
      .tv-typing-dots i {
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: #82ddff;
        animation: tvTypingDot 1s ease-in-out infinite;
      }
      .tv-typing-dots i:nth-child(2) { animation-delay: .14s; }
      .tv-typing-dots i:nth-child(3) { animation-delay: .28s; }
      @keyframes tvTypingDot {
        0%, 70%, 100% { opacity: .28; transform: translateY(0); }
        35% { opacity: 1; transform: translateY(-2px); }
      }

      .tv-chat-guide {
        position: absolute;
        z-index: 48;
        left: 16px;
        right: 74px;
        bottom: calc(72px + env(safe-area-inset-bottom));
        max-width: 520px;
        padding: 10px;
        border: 1px solid rgba(123, 211, 255, .26);
        border-radius: 17px;
        color: #fff;
        background: rgba(2, 12, 28, .72);
        box-shadow: 0 12px 30px rgba(0, 0, 0, .28), 0 0 18px rgba(31, 164, 255, .22);
      }
      .tv-chat-guide-head {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .tv-gwamo-orb {
        width: 30px;
        height: 30px;
        flex: 0 0 30px;
        display: grid;
        place-items: center;
        border: 1px solid rgba(126, 221, 255, .7);
        border-radius: 50%;
        color: #fff;
        background: radial-gradient(circle at 35% 30%, #2fd4ff, #0a4c96 58%, #041328);
        box-shadow: 0 0 13px rgba(46, 189, 255, .55);
        font-size: 12px;
        font-weight: 950;
      }
      .tv-chat-guide-copy {
        min-width: 0;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 1px;
      }
      .tv-chat-guide-copy strong {
        color: #86ddff;
        font-size: 10.5px;
      }
      .tv-chat-guide-copy span {
        color: rgba(255, 255, 255, .96);
        font-size: 12px;
        font-weight: 720;
        line-height: 1.25;
      }
      .tv-guide-close,
      .tv-guide-symbol-button,
      .tv-guide-upload-symbol {
        display: grid;
        place-items: center;
        padding: 0;
        border: 0;
        color: #fff;
        background: transparent;
        cursor: pointer;
      }
      .tv-guide-close {
        width: 28px;
        height: 28px;
        flex: 0 0 28px;
        border-radius: 50%;
        color: rgba(255, 255, 255, .75);
      }
      .tv-guide-reply-row,
      .tv-guide-message-row {
        display: flex;
        align-items: center;
        gap: 7px;
        margin-top: 9px;
      }
      .tv-guide-input,
      .tv-country-search {
        min-width: 0;
        height: 35px;
        padding: 0 11px;
        border: 1px solid rgba(255, 255, 255, .18);
        border-radius: 999px;
        outline: none;
        color: #fff;
        background: rgba(255, 255, 255, .06);
        font-size: 12px;
      }
      .tv-guide-input {
        flex: 1;
      }
      .tv-guide-input::placeholder,
      .tv-country-search::placeholder {
        color: rgba(255, 255, 255, .48);
      }
      .tv-guide-input:focus,
      .tv-country-search:focus {
        border-color: rgba(80, 194, 255, .72);
        box-shadow: 0 0 0 2px rgba(44, 173, 255, .12);
      }
      .tv-guide-symbol-button {
        width: 34px;
        height: 34px;
        flex: 0 0 34px;
        border-radius: 50%;
        background: rgba(8, 124, 255, .84);
        box-shadow: 0 0 12px rgba(8, 124, 255, .42);
      }
      .tv-guide-symbol-button:disabled {
        opacity: .45;
        cursor: wait;
      }
      .tv-guide-photo-step {
        min-height: 70px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 11px 0 2px;
      }
      .tv-guide-photo-preview {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        object-fit: cover;
        border: 1px solid rgba(255, 255, 255, .62);
      }
      .tv-guide-upload-symbol {
        width: 48px;
        height: 48px;
        border: 1px dashed rgba(111, 215, 255, .72);
        border-radius: 50%;
        background: rgba(8, 124, 255, .12);
      }
      .tv-guide-upload-symbol.is-busy {
        opacity: .55;
        cursor: wait;
      }
      .tv-guide-upload-symbol input {
        position: absolute;
        width: 1px;
        height: 1px;
        opacity: 0;
        pointer-events: none;
      }
      .tv-country-picker {
        margin-top: 9px;
      }
      .tv-country-search {
        width: 100%;
        margin-bottom: 7px;
      }
      .tv-country-list {
        max-height: min(34svh, 260px);
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 4px;
        overflow-y: auto;
        overscroll-behavior: contain;
        padding-right: 2px;
        scrollbar-width: thin;
      }
      .tv-country-option {
        min-width: 0;
        min-height: 34px;
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 5px 8px;
        border: 1px solid transparent;
        border-radius: 9px;
        color: rgba(255, 255, 255, .92);
        background: rgba(255, 255, 255, .045);
        text-align: left;
        cursor: pointer;
      }
      .tv-country-option:hover,
      .tv-country-option[aria-selected="true"] {
        border-color: rgba(67, 190, 255, .48);
        background: rgba(8, 124, 255, .14);
      }
      .tv-country-option span:last-child {
        min-width: 0;
        overflow: hidden;
        font-size: 10.5px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .tv-country-flag {
        flex: 0 0 auto;
        font-size: 17px;
        line-height: 1;
      }
      .tv-guide-self-avatar {
        position: relative;
        width: 34px;
        height: 34px;
        flex: 0 0 34px;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: transparent;
        cursor: zoom-in;
      }
      .tv-guide-self-avatar img {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        object-fit: cover;
        border: 1px solid rgba(255, 255, 255, .62);
      }
      .tv-guide-self-avatar span {
        position: absolute;
        right: -4px;
        bottom: -3px;
        font-size: 10px;
      }
      .tv-composer-error {
        margin-top: 7px;
        padding: 5px 8px;
        border-radius: 8px;
        color: #ff9ba7;
        background: rgba(255, 51, 79, .12);
        font-size: 10px;
        font-weight: 700;
      }

      @media (max-width: 700px) {
        .home-page.is-tv-mode .feedx-topbar,
        .feedx-topbar.is-tv-mode {
          background: linear-gradient(
            180deg,
            rgba(1, 5, 13, .54) 0%,
            rgba(1, 5, 13, .16) 56%,
            transparent 100%
          ) !important;
        }
        .home-page.is-tv-mode .category-nav,
        .home-page.is-tv-mode .category-tab,
        .home-page.is-tv-mode .category-tab.is-active {
          background: transparent !important;
        }
        .home-page.is-tv-mode .service-reel-card {
          min-height: 520px;
        }
        .home-page.is-tv-mode .post-info-block {
          left: 14px;
          right: 88px;
          bottom: 118px;
          max-height: min(20svh, 148px);
        }
        .home-page.is-tv-mode .service-social-rail {
          right: 11px;
          bottom: 118px;
        }
        .tv-private-contact-cta {
          right: 11px;
          bottom: calc(58px + env(safe-area-inset-bottom));
          width: 39px;
          height: 39px;
          background: transparent !important;
        }
        .social-life-call-cta {
          right: 11px;
          bottom: calc(104px + env(safe-area-inset-bottom));
          width: 39px;
          height: 39px;
          background: transparent !important;
        }
        .tv-live-anchor {
          top: 102px;
          left: 13px;
        }
        .home-page.is-tv-mode .tv-live-anchor {
          top: 122px;
          left: 14px;
        }
        .home-page.is-tv-mode .tv-conversation-column {
          top: 122px;
          right: 78px;
          bottom: 282px;
          left: 14px;
        }
        .tv-conversation-column {
          top: 102px;
          right: 60px;
          bottom: 104px;
          left: 13px;
        }
        .tv-message-item {
          width: min(88%, 350px);
        }
        .tv-message-avatar {
          width: 26px;
          height: 26px;
          flex-basis: 26px;
        }
        .tv-message-flag {
          width: 13px;
          height: 13px;
          font-size: 9px;
        }
        .tv-message-name,
        .tv-message-text {
          font-size: 10.8px;
        }
        .tv-public-action-dock {
          left: 12px;
          bottom: calc(13px + env(safe-area-inset-bottom));
        }
        .tv-public-conversation-cta {
          width: 42px;
          height: 42px;
          background: transparent !important;
        }
        .tv-visibility-toggle {
          width: 36px;
          height: 36px;
          background: transparent !important;
        }
        .tv-view-count {
          min-width: 36px;
          height: 36px;
        }
        .tv-chat-guide {
          left: 12px;
          right: 58px;
          bottom: calc(65px + env(safe-area-inset-bottom));
          padding: 9px;
          background: rgba(2, 12, 28, .86) !important;
        }
        .tv-country-list {
          max-height: min(31svh, 220px);
          grid-template-columns: 1fr;
        }
        .tv-typing-presence {
          bottom: 50px;
        }
      }

      /* =========================================================
         FINAL TV FULLSCREEN OVERRIDE
         TikTok is used only as the media-height reference:
         Gwamo keeps its own neon/live identity and controls.
      ========================================================== */
      .home-page.is-tv-mode {
        width: 100%;
        min-height: 100svh;
        min-height: 100dvh;
        background: #000 !important;
      }

      .home-page.is-tv-mode .home-feed {
        width: min(100%, 900px) !important;
        max-width: 900px !important;
        margin: 0 auto !important;
        padding: 0 !important;
      }

      .home-page.is-tv-mode .service-reel-card {
        position: relative !important;
        width: 100% !important;
        height: 100svh !important;
        height: 100dvh !important;
        min-height: 100svh !important;
        min-height: 100dvh !important;
        margin: 0 !important;
        border: 0 !important;
        border-radius: 0 !important;
        overflow: hidden !important;
        background: #000 !important;
        box-shadow: none !important;
        scroll-snap-align: start;
      }

      .home-page.is-tv-mode .service-reel-card .media-card,
      .home-page.is-tv-mode .service-reel-card .media-viewport,
      .home-page.is-tv-mode .service-reel-card .media-layer {
        position: absolute !important;
        inset: 0 !important;
        width: 100% !important;
        height: 100% !important;
        max-width: none !important;
        max-height: none !important;
        margin: 0 !important;
        border: 0 !important;
        border-radius: 0 !important;
        overflow: hidden !important;
        background: #000 !important;
      }

      .home-page.is-tv-mode .service-reel-card img.home-media,
      .home-page.is-tv-mode .service-reel-card video.home-media {
        position: absolute !important;
        inset: 0 !important;
        z-index: 1 !important;
        width: 100% !important;
        height: 100% !important;
        min-width: 100% !important;
        min-height: 100% !important;
        max-width: none !important;
        max-height: none !important;
        object-fit: cover !important;
        object-position: center center !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: #000 !important;
        transform: none !important;
      }

      .home-page.is-tv-mode .tv-media-backdrop {
        display: none !important;
      }

      .home-page.is-tv-mode .media-layer > iframe.home-media {
        position: absolute !important;
        inset: 0 !important;
        z-index: 1 !important;
        width: 100% !important;
        height: 100% !important;
        min-width: 100% !important;
        min-height: 100% !important;
        max-width: none !important;
        max-height: none !important;
        aspect-ratio: auto !important;
        border: 0 !important;
        border-radius: 0 !important;
        box-shadow: none !important;
      }

      .home-page.is-tv-mode .feedx-topbar,
      .feedx-topbar.is-tv-mode {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        z-index: 1000 !important;
        background: linear-gradient(
          180deg,
          rgba(0, 0, 0, .38) 0%,
          rgba(0, 0, 0, .12) 60%,
          transparent 100%
        ) !important;
        border: 0 !important;
        box-shadow: none !important;
        -webkit-backdrop-filter: none !important;
        backdrop-filter: none !important;
      }

      .home-page.is-tv-mode .category-nav,
      .feedx-topbar.is-tv-mode .category-nav {
        background: transparent !important;
        border: 0 !important;
        box-shadow: none !important;
        -webkit-backdrop-filter: none !important;
        backdrop-filter: none !important;
      }

      .home-page.is-tv-mode .category-tab,
      .home-page.is-tv-mode .category-tab.is-active,
      .feedx-topbar.is-tv-mode .category-tab,
      .feedx-topbar.is-tv-mode .category-tab.is-active {
        border: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
        -webkit-backdrop-filter: none !important;
        backdrop-filter: none !important;
        text-shadow: 0 1px 5px rgba(0,0,0,.98), 0 0 10px rgba(25,155,255,.45);
      }

      .home-page.is-tv-mode .topbar-neon-button,
      .home-page.is-tv-mode .topbar-add-button,
      .home-page.is-tv-mode .menu-button {
        border: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
        -webkit-tap-highlight-color: transparent;
      }

      .home-page.is-tv-mode .service-card-gradient {
        z-index: 20 !important;
        background:
          linear-gradient(
            to bottom,
            rgba(0,0,0,.20) 0%,
            rgba(0,0,0,0) 24%,
            rgba(0,0,0,0) 58%,
            rgba(0,0,0,.18) 74%,
            rgba(0,0,0,.56) 100%
          ) !important;
        pointer-events: none;
      }

      .home-page.is-tv-mode .glass-frame-overlay {
        display: none !important;
      }

      .home-page.is-tv-mode .post-info-block {
        z-index: 43 !important;
        left: 16px !important;
        right: 78px !important;
        bottom: calc(74px + env(safe-area-inset-bottom)) !important;
        max-height: min(24svh, 190px) !important;
        padding: 0 !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
        -webkit-backdrop-filter: none !important;
        backdrop-filter: none !important;
      }

      .home-page.is-tv-mode .creator-name,
      .home-page.is-tv-mode .service-name,
      .home-page.is-tv-mode .post-tagline,
      .home-page.is-tv-mode .post-price {
        text-shadow: 0 2px 5px rgba(0,0,0,1), 0 0 10px rgba(0,0,0,.9) !important;
      }

      .home-page.is-tv-mode .tv-live-anchor {
        top: calc(116px + env(safe-area-inset-top)) !important;
        left: 15px !important;
        padding: 0 7px !important;
        border: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
        text-shadow: 0 1px 5px rgba(0,0,0,1);
      }

      .home-page.is-tv-mode .tv-conversation-column {
        top: calc(145px + env(safe-area-inset-top)) !important;
        right: 70px !important;
        bottom: calc(128px + env(safe-area-inset-bottom)) !important;
        left: 15px !important;
        overflow: hidden !important;
      }

      .home-page.is-tv-mode .tv-message-item {
        left: 0 !important;
        bottom: 0 !important;
        width: min(82%, 390px) !important;
        animation-duration: var(--tv-message-duration, 48s) !important;
        animation-timing-function: linear !important;
        animation-iteration-count: infinite !important;
        animation-fill-mode: both !important;
      }

      @keyframes tvMessageRise {
        0% {
          opacity: 0;
          transform: translate3d(0, 18px, 0) scale(.98);
        }
        5% {
          opacity: 1;
          transform: translate3d(0, 0, 0) scale(1);
        }
        76% {
          opacity: 1;
          transform: translate3d(0, -50svh, 0) scale(1);
        }
        91% {
          opacity: .32;
          transform: translate3d(0, -59svh, 0) scale(.97);
        }
        100% {
          opacity: 0;
          transform: translate3d(0, -64svh, 0) scale(.95);
        }
      }

      .home-page.is-tv-mode .tv-public-action-dock {
        left: 14px !important;
        bottom: calc(16px + env(safe-area-inset-bottom)) !important;
        gap: 13px !important;
        padding: 0 !important;
        border: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
      }

      .home-page.is-tv-mode .tv-public-conversation-cta,
      .home-page.is-tv-mode .tv-visibility-toggle,
      .home-page.is-tv-mode .tv-private-contact-cta {
        appearance: none !important;
        -webkit-appearance: none !important;
        width: auto !important;
        min-width: 0 !important;
        height: auto !important;
        min-height: 0 !important;
        padding: 5px !important;
        border: 0 !important;
        border-radius: 0 !important;
        outline: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
        -webkit-tap-highlight-color: transparent !important;
      }

      .home-page.is-tv-mode .tv-public-conversation-cta::before,
      .home-page.is-tv-mode .tv-public-conversation-cta::after,
      .home-page.is-tv-mode .tv-visibility-toggle::before,
      .home-page.is-tv-mode .tv-visibility-toggle::after,
      .home-page.is-tv-mode .tv-private-contact-cta::before,
      .home-page.is-tv-mode .tv-private-contact-cta::after {
        content: none !important;
        display: none !important;
      }

      .home-page.is-tv-mode .tv-public-conversation-cta {
        color: #9cecff !important;
        filter: drop-shadow(0 0 4px rgba(255,255,255,.82))
                drop-shadow(0 0 10px rgba(32,164,255,.92)) !important;
      }

      .tv-public-conversation-glyph {
        position: relative;
        width: 30px;
        height: 30px;
        display: inline-grid;
        place-items: center;
      }
      .tv-public-conversation-bubble {
        position: absolute;
        inset: 0;
        width: 30px;
        height: 30px;
        color: #dff8ff;
      }
      .tv-public-conversation-zap {
        position: relative;
        z-index: 1;
        color: #83e6ff;
        fill: rgba(131,230,255,.14);
      }

      .home-page.is-tv-mode .tv-visibility-toggle {
        color: #fff !important;
        filter: drop-shadow(0 0 4px rgba(255,255,255,.82))
                drop-shadow(0 0 9px rgba(32,164,255,.82)) !important;
      }

      .home-page.is-tv-mode .tv-private-contact-cta {
        right: 15px !important;
        bottom: calc(18px + env(safe-area-inset-bottom)) !important;
        color: #fff !important;
        filter: drop-shadow(0 0 4px rgba(255,255,255,.82))
                drop-shadow(0 0 10px rgba(37,169,255,.90)) !important;
      }

      .home-page.is-tv-mode .tv-private-contact-cta svg {
        width: 25px !important;
        height: 25px !important;
      }

      .home-page.is-tv-mode .tv-typing-presence {
        bottom: 45px !important;
        padding: 0 !important;
        border: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
      }

      @media (max-width: 700px) {
        .home-page.is-tv-mode .service-reel-card {
          height: 100svh !important;
          height: 100dvh !important;
          min-height: 100svh !important;
          min-height: 100dvh !important;
        }

        .home-page.is-tv-mode .feedx-topbar,
        .feedx-topbar.is-tv-mode {
          background: linear-gradient(
            180deg,
            rgba(0,0,0,.34) 0%,
            rgba(0,0,0,.08) 62%,
            transparent 100%
          ) !important;
        }

        .home-page.is-tv-mode .category-nav,
        .home-page.is-tv-mode .category-tab,
        .home-page.is-tv-mode .category-tab.is-active {
          background: transparent !important;
        }

        .home-page.is-tv-mode .post-info-block {
          left: 13px !important;
          right: 68px !important;
          bottom: calc(68px + env(safe-area-inset-bottom)) !important;
        }

        .home-page.is-tv-mode .tv-live-anchor {
          top: calc(108px + env(safe-area-inset-top)) !important;
          left: 13px !important;
        }

        .home-page.is-tv-mode .tv-conversation-column {
          top: calc(136px + env(safe-area-inset-top)) !important;
          right: 58px !important;
          bottom: calc(118px + env(safe-area-inset-bottom)) !important;
          left: 13px !important;
        }

        .home-page.is-tv-mode .tv-public-action-dock {
          left: 11px !important;
          bottom: calc(12px + env(safe-area-inset-bottom)) !important;
          gap: 11px !important;
        }

        .home-page.is-tv-mode .tv-private-contact-cta {
          right: 11px !important;
          bottom: calc(14px + env(safe-area-inset-bottom)) !important;
        }

        .home-page.is-tv-mode .tv-message-item {
          width: min(86%, 340px) !important;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .tv-message-item {
          animation-duration: .01ms !important;
        }
      }
    `}</style>
  );
}
const HomeStyles = memo(HomeStylesInner);
HomeStyles.displayName = "HomeStyles";
export default Home;