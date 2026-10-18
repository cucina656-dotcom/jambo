import TvMedia from "../components/tv/TvMedia";
import TvConversationOverlay from "../components/tv/TvConversationOverlay";
import ConnectExperience from "../components/connect/ConnectExperience";
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
  { key: "time-market", label: "Chat", icon: MessageSquare },
  { key: "connect", label: "Connect", icon: Users },
  { key: "social-life", label: "Heart", icon: Heart },
  { key: "tv", label: "TV", icon: Tv },
];

const CATEGORY_META = {
  connect: {
    label: "Connect",
    blurb:
      "Find a friend for life, a relationship, a sponsor or supporter, a mentor, or another meaningful connection.",
  },
  "social-news": { label: "Social News", blurb: "Open Social News at social.com." },
  kitchen: { label: "Kitchen", blurb: "Food and kitchen services are coming to Gwamo." },
  tv: { label: "TV", blurb: "Video and media content are coming to Gwamo." },
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
// GWAMO BRAIN WIDGET (INTEGRATED DIRECTLY)
// ==========================================
function GwamoBrainWidget({ apiUrl }) {
  const [open, setOpen] = useState(true); 
  const [settings, setSettings] = useState({
    title: "Gwamo Brain",
    welcome_message: "Hello! How can I help you today?",
    media_url: "",
  });
  const [visitorToken, setVisitorToken] = useState("");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  
  const [helperMode, setHelperMode] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState("");
  const [adminMessages, setAdminMessages] = useState([]);
  const [adminDraft, setAdminDraft] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminBusy, setAdminBusy] = useState(false);
  
  const scrollRef = useRef(null);
  const adminScrollRef = useRef(null);
  const visitorTokenRef = useRef("");

  const api = `${apiUrl}/api/brain`;

  const visitorHeaders = useCallback(() => ({
    "X-Gwamo-Visitor-Token": visitorTokenRef.current,
  }), []);

  const adminHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    "X-Admin-Pin": adminPin,
  }), [adminPin]);

  const readResponse = useCallback(async (response) => {
    let data = {};
    try { data = await response.json(); } catch { /* handled below */ }
    if (!response.ok || data.success === false) {
      throw new Error(data.error || data.message || `Request failed (${response.status})`);
    }
    return data;
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const response = await fetch(`${api}/settings`, { cache: "no-store" });
      const data = await readResponse(response);
      if (data.settings) setSettings((current) => ({ ...current, ...data.settings }));
    } catch (err) {
      console.warn("Could not load brain settings", err);
    }
  }, [api, readResponse]);

  const loadVisitorMessages = useCallback(async (showSpinner = false) => {
    if (!visitorTokenRef.current) return;
    if (showSpinner) setLoading(true);
    try {
      const response = await fetch(`${api}/messages`, {
        headers: visitorHeaders(), cache: "no-store",
      });
      const data = await readResponse(response);
      setMessages(Array.isArray(data.messages) ? data.messages : []);
      setError("");
    } catch (err) {
      setError(err.message || "Could not load your support messages.");
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [api, visitorHeaders, readResponse]);

  const initializeVisitor = useCallback(async () => {
    try {
      await loadSettings();
      let savedToken = "";
      try { savedToken = localStorage.getItem("gwamo-brain-visitor-token") || ""; } catch { /* storage unavailable */ }
      
      const headers = savedToken ? { "X-Gwamo-Visitor-Token": savedToken } : {};
      const response = await fetch(`${api}/conversation`, {
        method: "POST", headers, cache: "no-store",
      });
      const data = await readResponse(response);
      const token = String(data.visitor_token || savedToken || "");
      if (!token) throw new Error("The support service did not return a visitor token.");
      
      visitorTokenRef.current = token;
      setVisitorToken(token);
      try { localStorage.setItem("gwamo-brain-visitor-token", token); } catch { /* storage unavailable */ }
      await loadVisitorMessages(true);
    } catch (err) {
      setError(err.message || "Support chat is temporarily unavailable.");
    }
  }, [api, loadSettings, loadVisitorMessages, readResponse]);

  useEffect(() => { initializeVisitor(); }, [initializeVisitor]);

  useEffect(() => {
    if (!open || helperMode || !visitorToken) return undefined;
    const id = window.setInterval(() => loadVisitorMessages(false), 3000);
    return () => window.clearInterval(id);
  }, [open, helperMode, visitorToken, loadVisitorMessages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    if (adminScrollRef.current) adminScrollRef.current.scrollTop = adminScrollRef.current.scrollHeight;
  }, [adminMessages]);

  const sendVisitorMessage = useCallback(async (event) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || sending || !visitorTokenRef.current) return;
    setSending(true); setError("");
    try {
      const response = await fetch(`${api}/message`, {
        method: "POST",
        headers: { ...visitorHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await readResponse(response);
      if (data.message) setMessages((current) => [...current, data.message]);
      setDraft("");
      await loadVisitorMessages(false);
    } catch (err) {
      setError(err.message || "Your message could not be sent.");
    } finally { setSending(false); }
  }, [api, draft, sending, visitorHeaders, readResponse, loadVisitorMessages]);

  const loadAdminConversations = useCallback(async () => {
    const response = await fetch(`${api}/admin/conversations`, {
      headers: { "X-Admin-Pin": adminPin }, cache: "no-store",
    });
    const data = await readResponse(response);
    setConversations(Array.isArray(data.conversations) ? data.conversations : []);
  }, [api, adminPin, readResponse]);

  const loadAdminMessages = useCallback(async (conversationId) => {
    if (!conversationId) { setAdminMessages([]); return; }
    const response = await fetch(`${api}/admin/messages?conversation_id=${encodeURIComponent(conversationId)}`, {
      headers: { "X-Admin-Pin": adminPin }, cache: "no-store",
    });
    const data = await readResponse(response);
    setAdminMessages(Array.isArray(data.messages) ? data.messages : []);
  }, [api, adminPin, readResponse]);

  const loginHelper = useCallback(async (event) => {
    event?.preventDefault(); setAdminError(""); setAdminBusy(true);
    try {
      const response = await fetch(`${api}/admin/conversations`, {
        headers: { "X-Admin-Pin": adminPin }, cache: "no-store",
      });
      const data = await readResponse(response);
      setConversations(Array.isArray(data.conversations) ? data.conversations : []);
      setAdminAuthed(true);
      setSelectedConversation(""); setAdminMessages([]);
    } catch (err) {
      setAdminError(err.message || "Admin PIN was not accepted.");
    } finally { setAdminBusy(false); }
  }, [api, adminPin, readResponse]);

  useEffect(() => {
    if (!helperMode || !adminAuthed) return undefined;
    const id = window.setInterval(async () => {
      try {
        await loadAdminConversations();
        if (selectedConversation) await loadAdminMessages(selectedConversation);
      } catch (err) { setAdminError(err.message || "Could not refresh helper inbox."); }
    }, 3000);
    return () => window.clearInterval(id);
  }, [helperMode, adminAuthed, selectedConversation, loadAdminConversations, loadAdminMessages]);

  const sendHelperReply = useCallback(async (event) => {
    event?.preventDefault();
    const text = adminDraft.trim();
    if (!text || !selectedConversation || adminBusy) return;
    setAdminBusy(true); setAdminError("");
    try {
      const response = await fetch(`${api}/admin/reply`, {
        method: "POST", headers: adminHeaders(),
        body: JSON.stringify({ conversation_id: selectedConversation, text }),
      });
      const data = await readResponse(response);
      if (data.message) setAdminMessages((current) => [...current, data.message]);
      setAdminDraft("");
      await loadAdminConversations();
    } catch (err) { setAdminError(err.message || "Reply could not be sent."); }
    finally { setAdminBusy(false); }
  }, [api, adminDraft, selectedConversation, adminBusy, adminHeaders, readResponse, loadAdminConversations]);

  // Helper uploads video directly to the background settings
  const uploadHelperBackgroundVideo = async (file) => {
    if (!file) return;
    setAdminBusy(true); setAdminError("");
    
    try {
      // 1. First, upload the file to the generic brain upload endpoint
      const formData = new FormData();
      formData.append("file", file);
      formData.append("conversation_id", selectedConversation);
      
      const uploadRes = await fetch(`${api}/admin/upload`, {
        method: "POST",
        headers: { "X-Admin-Pin": adminPin },
        body: formData,
      });
      const uploadData = await readResponse(uploadRes);
      
      if (!uploadData.url) throw new Error("Upload failed, no URL returned.");

      // 2. Save the returned URL as the background media_url in the settings
      const settingsRes = await fetch(`${api}/admin/settings`, {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ 
          title: settings.title, 
          welcome_message: settings.welcome_message, 
          media_url: uploadData.url 
        }),
      });
      await readResponse(settingsRes);
      
      // 3. Update the local state so the background changes immediately
      setSettings((curr) => ({ ...curr, media_url: uploadData.url }));
      alert("Background video updated successfully!");
      
    } catch (err) {
      setAdminError(err.message || "Failed to set background video.");
    } finally {
      setAdminBusy(false);
    }
  };

  const deleteBackgroundVideo = async () => {
    if (!window.confirm("Remove background video for all users?")) return;
    try {
      setAdminBusy(true);
      const res = await fetch(`${api}/admin/settings`, {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ title: settings.title, welcome_message: settings.welcome_message, media_url: "" }),
      });
      await readResponse(res);
      setSettings((current) => ({ ...current, media_url: "" }));
    } catch (err) {
      setAdminError(err.message || "Failed to remove video.");
    } finally {
      setAdminBusy(false);
    }
  };

  const mediaUrl = String(settings.media_url || "").trim();
  const isVideo = /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(mediaUrl);

  return (
    <div className="gwamo-brain-container">
      <style>{`
      .gwamo-brain-container {
        display: flex; flex-direction: column; align-items: center;
        width: 100%; max-width: 640px; margin: 0 auto;
        height: calc(100svh - var(--nav-h, 64px));
        padding: calc(var(--top-offset, 60px) + 8px) 12px 12px;
      }
      @supports (height: 100dvh) {
        .gwamo-brain-container { height: calc(100dvh - var(--nav-h, 64px)); }
      }
      .gbw-panel {
        width: 100%; flex: 1; min-height: 0;
        display: flex; flex-direction: column;
        overflow: hidden;
        border: 1px solid var(--line);
        border-radius: 24px;
        background: var(--surface);
        font-family: var(--font-body, system-ui, sans-serif);
        position: relative;
      }
      
      /* Chat Background Video */
      .gbw-chat-background {
        position: absolute; inset: 0; z-index: 0; pointer-events: none;
      }
      .gbw-chat-background video, .gbw-chat-background img {
        width: 100%; height: 100%; object-fit: cover; opacity: 0.25;
      }
      .gbw-chat-background::after {
        content: ""; position: absolute; inset: 0;
        background: linear-gradient(to bottom, rgba(13, 19, 32, 0.8), rgba(13, 19, 32, 0.95));
      }
      
      .gbw-head { position: relative; z-index: 1; display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid var(--line); }
      .gbw-logo { width: 42px; height: 42px; flex-shrink: 0; display: grid; place-items: center; border-radius: 14px; color: var(--amber-ink); background: var(--amber); }
      .gbw-headcopy { flex: 1; min-width: 0; }
      .gbw-headcopy strong { display: block; color: var(--text); font-family: var(--font-display, inherit); font-size: 17px; font-weight: 700; letter-spacing: -0.02em; }
      .gbw-headcopy small { display: block; margin-top: 2px; color: var(--text-dim); font-size: 12.5px; }
      
      .gbw-welcome { position: relative; z-index: 1; margin: 14px 16px 0; padding: 12px 14px; border-radius: 14px; color: var(--text); background: var(--amber-soft); font-size: 14px; line-height: 1.5; }
      
      .gbw-messages { position: relative; z-index: 1; flex: 1; min-height: 0; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; scroll-behavior: smooth; }
      .gbw-messages::-webkit-scrollbar, .gbw-adminmessages::-webkit-scrollbar { width: 6px; }
      .gbw-messages::-webkit-scrollbar-thumb, .gbw-adminmessages::-webkit-scrollbar-thumb { border-radius: 10px; background: rgba(255, 255, 255, 0.12); }
      .gbw-bubble { position: relative; max-width: 82%; padding: 10px 14px; font-size: 15px; line-height: 1.45; white-space: pre-wrap; overflow-wrap: anywhere; }
      .gbw-bubble.visitor { align-self: flex-end; border-radius: 18px 18px 5px 18px; color: var(--amber-ink); background: var(--amber); }
      .gbw-bubble.helper { align-self: flex-start; border-radius: 18px 18px 18px 5px; color: var(--text); background: var(--surface-2); }
      .gbw-time { display: block; margin-top: 4px; font-size: 10.5px; text-align: right; opacity: 0.65; }

      .gbw-compose { position: relative; z-index: 1; display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-top: 1px solid var(--line); background: rgba(21,29,46,0.85); backdrop-filter: blur(8px); }
      .gbw-compose input, .gbw-form input, .gbw-form textarea, .gbw-adminlogin input {
        flex: 1; width: 100%; min-width: 0;
        padding: 12px 16px;
        border: 1px solid var(--line);
        border-radius: 999px;
        outline: none;
        color: var(--text);
        background: var(--surface-2);
        font: inherit; font-size: 15px;
        transition: border-color 150ms ease;
      }
      .gbw-compose input:focus, .gbw-form textarea:focus, .gbw-adminlogin input:focus { border-color: var(--amber); }
      .gbw-compose input::placeholder, .gbw-form textarea::placeholder, .gbw-adminlogin input::placeholder { color: rgba(154, 166, 186, 0.75); }
      .gbw-compose button, .gbw-primary {
        width: 44px; height: 44px; flex-shrink: 0;
        display: grid; place-items: center;
        border: 0; border-radius: 50%;
        color: var(--amber-ink); background: var(--amber);
        font-weight: 700; cursor: pointer;
        transition: background 150ms ease, opacity 150ms ease;
      }
      .gbw-compose button:hover:not(:disabled), .gbw-primary:hover:not(:disabled) { background: var(--amber-strong); }
      .gbw-primary { width: 100%; height: auto; padding: 12px; border-radius: 14px; font-size: 15px; }
      .gbw-compose button:disabled, .gbw-primary:disabled { opacity: 0.45; cursor: not-allowed; }
      .gbw-helperlink { position: relative; z-index: 1; align-self: center; padding: 4px 12px 12px; border: 0; color: rgba(154, 166, 186, 0.7); background: transparent; font-size: 12px; cursor: pointer; }
      .gbw-helperlink:hover { color: var(--text); }
      .gbw-empty { padding: 36px 20px; color: var(--text-dim); font-size: 14px; line-height: 1.5; text-align: center; }
      .gbw-error { position: relative; z-index: 1; padding: 10px 16px; color: #ff8e9c; background: rgba(255, 92, 112, 0.1); font-size: 13px; text-align: center; }

      .gbw-adminlogin { position: relative; z-index: 1; max-width: 400px; height: 100%; margin: 0 auto; padding: 30px 24px; display: flex; flex-direction: column; justify-content: center; gap: 14px; }
      .gbw-adminlogin h3 { margin: 0; color: var(--text); font-family: var(--font-display, inherit); font-size: 22px; text-align: center; }
      
      .gbw-admin { position: relative; z-index: 1; flex: 1; min-height: 0; display: grid; grid-template-columns: 220px minmax(0, 1fr); }
      .gbw-convos { overflow-y: auto; border-right: 1px solid var(--line); background: rgba(13,19,32,0.6); }
      .gbw-convo { display: block; width: 100%; padding: 13px 14px; border: 0; border-bottom: 1px solid var(--line); border-left: 3px solid transparent; color: var(--text); background: transparent; text-align: left; cursor: pointer; transition: background 140ms ease; }
      .gbw-convo:hover { background: rgba(255, 255, 255, 0.04); }
      .gbw-convo.active { border-left-color: var(--amber); background: var(--amber-soft); }
      .gbw-convo strong, .gbw-convo small, .gbw-convo span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .gbw-convo strong { font-size: 14px; font-weight: 700; }
      .gbw-convo small { margin-top: 3px; color: var(--amber); font-size: 11.5px; }
      .gbw-convo span { margin-top: 3px; color: var(--text-dim); font-size: 12.5px; }
      
      .gbw-adminright { min-width: 0; min-height: 0; display: flex; flex-direction: column; background: rgba(21,29,46,0.4); }
      .gbw-adminmessages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
      
      .gbw-form { display: flex; gap: 10px; padding: 12px 14px; border-top: 1px solid var(--line); background: var(--surface); }
      .gbw-form textarea { min-height: 44px; max-height: 100px; border-radius: 14px; resize: none; }
      .gbw-form .gbw-primary { width: auto; padding: 0 18px; border-radius: 14px; white-space: nowrap; }
      
      .gbw-back { position: relative; z-index: 1; padding: 12px 20px; border: 0; border-top: 1px solid var(--line); color: var(--text-dim); background: transparent; font-size: 13.5px; text-align: center; cursor: pointer; }
      .gbw-back:hover { color: var(--text); }
      .gbw-iconbtn { padding: 7px 12px; border: 0; border-radius: 10px; color: var(--text); background: var(--surface-3); font-size: 12.5px; font-weight: 600; cursor: pointer; }
      .gbw-iconbtn.danger { color: #ff8e9c; background: rgba(255, 92, 112, 0.15); }

      @media (max-width: 600px) {
        .gwamo-brain-container { padding: calc(var(--top-offset, 60px) + 4px) 0 0; }
        .gbw-panel { border-width: 1px 0 0; border-radius: 22px 22px 0 0; }
        .gbw-admin { grid-template-columns: 120px minmax(0, 1fr); }
        .gbw-bubble { max-width: 88%; }
      }
      `}</style>

      <section className="gbw-panel">
        
        {/* BACKGROUND VIDEO LAYER */}
        {mediaUrl && (
          <div className="gbw-chat-background" aria-hidden="true">
            {isVideo ? (
              <video src={mediaUrl} autoPlay loop muted playsInline />
            ) : (
              <img src={mediaUrl} alt="" />
            )}
          </div>
        )}

        <header className="gbw-head">
          <div className="gbw-logo" aria-hidden="true"><MessageSquare size={22} strokeWidth={2.2} /></div>
          <div className="gbw-headcopy">
            <strong>{helperMode ? "Gwamo Brain Helper" : (settings.title || "Gwamo Brain")}</strong>
            <small>{helperMode ? (adminAuthed ? "Private helper inbox" : "Authorized helper access") : "Human support · Private conversation"}</small>
          </div>
          {helperMode && adminAuthed && (
            <button className="gbw-iconbtn" type="button" onClick={() => { setAdminAuthed(false); setAdminPin(""); setConversations([]); setAdminMessages([]); setSelectedConversation(""); }}>Log out</button>
          )}
        </header>

        {!helperMode ? (
          <>
            <div className="gbw-welcome">{settings.welcome_message || "Hello! How can I help you?"}</div>
            
            <div className="gbw-messages" ref={scrollRef} aria-live="polite">
              {loading && messages.length === 0 && <div className="gbw-empty">Loading your conversation...</div>}
              
              {messages.map((message) => {
                const isMsgVideo = (message.media_type === "video" || message.message_type === "video") && (message.media_url || message.mediaUrl);
                const videoUrl = message.media_url || message.mediaUrl;

                return (
                  <div key={message.id} className={`gbw-bubble ${message.sender === "visitor" ? "visitor" : "helper"}`}>
                    {isMsgVideo && (
                      <video 
                        src={videoUrl} 
                        controls 
                        playsInline 
                        style={{ width: "100%", borderRadius: "12px", marginBottom: "8px", display: "block" }} 
                      />
                    )}
                    {message.text_content}
                    <span className="gbw-time">{message.sender === "helper" ? "Gwamo helper" : "You"} · {message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                  </div>
                );
              })}

              {!loading && messages.length === 0 && <div className="gbw-empty">Send a message to start. You do not need an account.</div>}
            </div>
            {error && <div className="gbw-error" role="status">{error}</div>}
            
            <form className="gbw-compose" onSubmit={sendVisitorMessage}>
              <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a message..." maxLength={4000} aria-label="Your support message" />
              <button type="submit" disabled={!draft.trim() || sending || !visitorToken}>{sending ? "..." : <Send size={18}/>}</button>
            </form>
            <button className="gbw-helperlink" type="button" onClick={() => { setHelperMode(true); setAdminError(""); }}>Helper login</button>
          </>
        ) : !adminAuthed ? (
          <form className="gbw-adminlogin" onSubmit={loginHelper}>
            <h3>Helper login</h3>
            <p style={{ margin: 0, fontSize: 13, color: "#c5e5d1" }}>Enter your PIN to respond to Gwamo visitors</p>
            <input type="password" value={adminPin} onChange={(event) => setAdminPin(event.target.value)} placeholder="Admin PIN" autoComplete="current-password" required />
            <button className="gbw-primary" style={{ minHeight: '44px' }} type="submit" disabled={!adminPin || adminBusy}>{adminBusy ? "Checking..." : "Open private inbox"}</button>
            <button className="gbw-back" type="button" onClick={() => { setHelperMode(false); setAdminError(""); }}>← Back to visitor chat</button>
            {adminError && <div className="gbw-error">{adminError}</div>}
          </form>
        ) : (
          <>
            <div className="gbw-admin">
              <aside className="gbw-convos" aria-label="Visitor conversations">
                {conversations.length === 0 && <div className="gbw-empty">No conversations yet.</div>}
                {conversations.map((conversation) => (
                  <button type="button" key={conversation.id} className={`gbw-convo ${selectedConversation === conversation.id ? "active" : ""}`} onClick={async () => {
                    setSelectedConversation(conversation.id); setAdminError("");
                    try { await loadAdminMessages(conversation.id); } catch (err) { setAdminError(err.message || "Could not load messages."); }
                  }}>
                    <strong>{conversation.visitor_label || "Visitor"}</strong>
                    <small>{conversation.status || "open"}</small>
                    <span>{conversation.last_message || "No messages yet"}</span>
                  </button>
                ))}
              </aside>
              <div className="gbw-adminright">
                {!selectedConversation ? (
                  <div className="gbw-empty">Choose a visitor to read and reply.</div>
                ) : (
                  <>
                    <div className="gbw-adminmessages" ref={adminScrollRef}>
                      {adminMessages.map((message) => {
                        const isMsgVideo = (message.media_type === "video" || message.message_type === "video") && (message.media_url || message.mediaUrl);
                        const videoUrl = message.media_url || message.mediaUrl;

                        return (
                          <div key={message.id} className={`gbw-bubble ${message.sender === "visitor" ? "visitor" : "helper"}`}>
                            {isMsgVideo && (
                              <video 
                                src={videoUrl} 
                                controls 
                                playsInline 
                                style={{ width: "100%", borderRadius: "12px", marginBottom: "8px", display: "block" }} 
                              />
                            )}
                            {message.text_content}
                            <span className="gbw-time">{message.sender === "helper" ? "You" : "Visitor"} · {message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Background Video Deletion Option */}
                    {mediaUrl && (
                      <div style={{ padding: "8px 14px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255, 92, 112, 0.1)" }}>
                        <span style={{ fontSize: "12px", color: "#ff8e9c" }}>Background Video Active</span>
                        <button onClick={deleteBackgroundVideo} className="gbw-iconbtn danger" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Trash2 size={14} /> Remove
                        </button>
                      </div>
                    )}

                    <form className="gbw-form" onSubmit={sendHelperReply} style={{ position: 'relative' }}>
                      <textarea value={adminDraft} onChange={(event) => setAdminDraft(event.target.value)} placeholder="Write your reply..." maxLength={4000} required />
                      
                      {/* Helper Video Uploader - Now uploads to background! */}
                      <button 
                        type="button" 
                        onClick={() => document.getElementById('helper-video-upload').click()} 
                        style={{ width: '44px', height: '44px', background: 'var(--surface-3)', color: 'var(--text)', borderRadius: '14px', display: 'grid', placeItems: 'center', flexShrink: 0 }}
                        disabled={adminBusy}
                        aria-label="Upload Background Video"
                        title="Upload Background Video"
                      >
                        <Video size={20} />
                      </button>
                      <input 
                        id="helper-video-upload" 
                        type="file" 
                        accept="video/*" 
                        style={{ display: 'none' }} 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) uploadHelperBackgroundVideo(file);
                        }} 
                      />
                      <button className="gbw-primary" style={{ minHeight: '44px' }} type="submit" disabled={!adminDraft.trim() || adminBusy}>{adminBusy ? "Sending..." : "Send reply"}</button>
                    </form>
                  </>
                )}
              </div>
            </div>
            {adminError && <div className="gbw-status" role="status" style={{ color: '#ffc0b8', padding: '10px', background: 'rgba(255, 92, 112, 0.1)', textAlign: 'center' }}>{adminError}</div>}
            <button className="gbw-back" type="button" onClick={() => { setHelperMode(false); setAdminAuthed(false); setAdminPin(""); setAdminError(""); }}>← Return to visitor chat</button>
          </>
        )}
      </section>
    </div>
  );
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
    if (!isLoggedIn || !user) { openAuthModal("login"); return; }
    pauseAllVideos(); setShowEditor(true);
  }, [isLoggedIn, user, openAuthModal, pauseAllVideos]);

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
    if (!providerName) return alert("Please enter your service provider name.");
    if (!contactInfo) return alert("Please enter your phone number or website.");
    if (!headline) return alert(postType === "offer" ? "Please say what work you can do." : postType === "need" ? "Please say what help you need." : postType === "exchange" ? "Please say what service you can give." : "Please add a short title for your moment.");
    if (!baseDescription) return alert(postType === "moment" ? "Please write your saying, story, or thought." : "Please add a short description.");
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
    
    const cardValue = postType === "offer" ? headline : postType === "need" ? (enteredValue ? `Budget: ${enteredValue}` : "Budget: Let us agree") : postType === "exchange" ? "Trade skills" : momentKind === "song" ? "Song saying" : momentKind === "movie" ? "Movie saying" : momentKind === "recommend" ? "Recommendation" : "My story";
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
      if (user && user.id) formData.append("provider_id", user.id);
      if (mediaToSave) formData.append("media_url", mediaToSave);
      if (newLogoFile) formData.append("logo_file", newLogoFile);
      if (newMediaFile) formData.append("media_file", newMediaFile);
      const token = getSessionToken();
      const { status, statusText, responseText } = await new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("POST", `${API_URL}/api/time-market/services`);
        request.timeout = 180000;
        request.setRequestHeader("Authorization", `Bearer ${token}`);
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
  }, [closeEditor, fetchHomeData, newCreatorName, newCreatorIdentity, newLogoFile, newMediaFile, newMediaUrl, newTitle, subtitle, postType, postHeadline, serviceCategory, postLocation, priceUnit, availability, exchangeNeed, allowCashBalance, momentKind, getSessionToken, user]);

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
      if (activeCategory === "tv") return type === "moment";
      return type === "offer" || type === "exchange";
    });
  }, [posts, activeCategory]);

  const emptySectionAction = activeCategory === "social-life" ? { label: "Ask for help", postType: "need" } : activeCategory === "tv" ? { label: "Share your moment", postType: "moment" } : { label: "Offer work or trade skills", postType: "offer" };

  let mainContent;
  
  // REPLACED MARKET TAB WITH GWAMO BRAIN
  if (activeCategory === "time-market") {
    mainContent = <GwamoBrainWidget apiUrl={API_URL} />;
  } else if (activeCategory === "social-life") {
    mainContent = <SocialLifeLanding />;
  } else if (activeCategory === "connect") {
    mainContent = <ConnectExperience user={user} isLoggedIn={isLoggedIn} onRequireAuth={requireAuthForConnect} />;
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
          {memoizedPosts.map((post, index) => {
            const postId = String(post.id ?? index);
            const isOwner = isLoggedIn && user && String(post.provider_id ?? "") === String(user.id);
            return (
              <ServicePost key={postId} post={post} index={index} postId={postId} isActive={activePostIndex === index} reacted={Boolean(reactedPosts[postId])} reacting={reactingPostId === postId} unreadCount={unreadCountsByPost[postId] || 0} mediaAspectRatio={mediaAspectRatios[postId]} onMediaAspectRatio={handleMediaAspectRatio} isOwner={isOwner} postRefCallback={getPostRefCallback(index)} videoRefCallback={getVideoRefCallback(index)} onVideoPlay={noop} onVideoPause={noop} onViewProfile={openProviderProfile} onSellTime={handleOfferTime} onContactProvider={openInboxForPost} onCallProvider={callProvider} onOpenInbox={openInboxFromRail} onReact={reactToPost} onZoomImage={setZoomImage} isTvTab={activeCategory === "tv"} isSocialLife={activeCategory === "social-life"} showLiveConversation={activeCategory === "tv" || activeCategory === "social-life"} conversationMode={activeCategory === "social-life" ? "social-life" : "tv"} currentUser={isLoggedIn ? user : null} getSessionToken={getSessionToken} onRequireAuth={requireAuthForTv} />
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
    <div className={`home-page${activeCategory === "tv" ? " is-tv-mode" : ""}${activeCategory === "social-life" ? " is-social-life-mode" : ""}`}>
      <TimeMarketTopBar activeCategory={activeCategory} isLoggedIn={isLoggedIn} user={user} onAuth={openAuthModal} onLogout={handleLogout} onOpenMyProfile={() => (isLoggedIn ? openMyProfile() : openAuthModal("login"))} onOpenMyServices={openMyServices} onOpenMyTime={() => setShowMyTime(true)} onOpenMyInbox={() => openMyInbox(null)} unreadCount={totalUnreadCount} onOpenInfo={(topic) => setShowInfoModal(topic)} />
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
            const TabIcon = tab.icon;
            const isActive = activeCategory === tab.key;
            const navItem = (
              <button
                type="button"
                className={`bottom-nav-item${isActive ? " is-active" : ""}`}
                onClick={() => { setActivePostIndex(0); setActiveCategory(tab.key); window.scrollTo(0, 0); }}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="bottom-nav-icon"><TabIcon size={22} strokeWidth={isActive ? 2.4 : 2} aria-hidden="true" /></span>
                <span>{tab.label}</span>
              </button>
            );
            if (tabIndex !== 1) return <Fragment key={tab.key}>{navItem}</Fragment>;
            return (
              <Fragment key={tab.key}>
                {navItem}
                <div className="bottom-nav-plus-wrap">
                  <button type="button" className="bottom-nav-plus" onClick={() => handleOfferTime(emptySectionAction.postType)} aria-label={emptySectionAction.label} title={emptySectionAction.label}>
                    <Plus size={26} strokeWidth={2.6} aria-hidden="true" />
                  </button>
                </div>
              </Fragment>
            );
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

const TimeMarketTopBar = memo(({ activeCategory, isLoggedIn, user, onAuth, onLogout, onOpenMyProfile, onOpenMyServices, onOpenMyTime, onOpenMyInbox, unreadCount, onOpenInfo }) => {
  const [showMenu, setShowMenu] = useState(false);
  const closeMenu = () => setShowMenu(false);
  const run = (action) => () => { closeMenu(); action(); };
  const signedIn = Boolean(isLoggedIn && user);
  const verification = signedIn ? getVerificationStatus(user) : null;
  const displayName = user?.service_provider_name || user?.full_name || "My account";
  return (
    <header className={`feedx-topbar${activeCategory === "tv" ? " is-tv-mode" : ""}`}>
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
            <button type="button" className="login-pill" onClick={() => onAuth("login")}>
              <LogIn size={16} aria-hidden="true" />
              <span>Log in</span>
            </button>
          )}
          <button type="button" className="menu-button" onClick={() => setShowMenu((value) => !value)} aria-label="Menu" aria-haspopup="true" aria-expanded={showMenu}>
            <Menu size={24} strokeWidth={2} />
          </button>
          {showMenu && <div className="dropdown-backdrop" onClick={closeMenu} aria-hidden="true" />}
          {showMenu && (
            <div className="dropdown-menu account-dropdown">
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
              ) : (
                <>
                  <button type="button" className="dropdown-item" onClick={run(() => onAuth("login"))}><LogIn size={18} aria-hidden="true" />Log in</button>
                  <button type="button" className="dropdown-item" onClick={run(() => onAuth("register"))}><Plus size={18} aria-hidden="true" />Create an account</button>
                </>
              )}
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
  post, index, postId, isActive, reacted, reacting, unreadCount, mediaAspectRatio,
  onMediaAspectRatio, isOwner, postRefCallback, videoRefCallback, onVideoPlay,
  onVideoPause, onViewProfile, onSellTime, onContactProvider, onCallProvider,
  onOpenInbox, onReact, onZoomImage, isTvTab, isSocialLife, showLiveConversation,
  conversationMode, currentUser, getSessionToken, onRequireAuth,
}) {
  const mediaUrl = post.media_url || post.video_url || DEFAULT_VIDEO;
  const mediaType = post.media_type || "";
  const isImage = mediaType === "image" || (!mediaType && isImageUrl(mediaUrl));
  const isVideo = mediaType === "video" || (!mediaType && isDirectVideoUrl(mediaUrl));
  const isEmbed = mediaType === "embed" || (!mediaType && !isImageUrl(mediaUrl) && !isDirectVideoUrl(mediaUrl));
  
  const verificationInfo = getVerificationStatus(post);
  const providerName = post.service_provider_name || post.creator_name || post.provider_name || "Provider";
  const isMomentPost = getPostType(post) === "moment";
  const postKind = getPostType(post);
  const explicitServiceName = String(post.service_name || post.service_title || "").trim();
  const fullDescription = String(post.service_description || post.description || post.work_description || post.subtitle || post.services_offered || "").trim();
  const serviceName = explicitServiceName.slice(0, 80);
  const tagline = fullDescription && fullDescription.toLowerCase() !== serviceName.toLowerCase() ? fullDescription : "";
  const exchangeOfferText = postKind === "exchange" ? String(post.exchange_offer || post.service_name || "").trim() : "";
  const exchangeNeedText = postKind === "exchange" ? String(post.exchange_need || "").trim() : "";
  const hasStructuredTrade = postKind === "exchange" && Boolean(exchangeOfferText || exchangeNeedText);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const descriptionNeedsToggle = tagline.length > DESCRIPTION_PREVIEW_LENGTH;
  const visibleDescription = isDescriptionExpanded ? tagline : makeDescriptionPreview(tagline);
  
  const reactionCount = Number(post.displayed_reactions || 0);
  const viewCount = Number(post.displayed_views ?? post.view_count ?? post.views ?? post.total_views ?? post.real_views ?? 0);
  const aspectClass = mediaAspectRatio && mediaAspectRatio < 0.85 ? "is-portrait" : mediaAspectRatio && mediaAspectRatio > 1.2 ? "is-landscape" : "is-square";
  const handleImageError = useCallback((event) => { event.currentTarget.onerror = null; event.currentTarget.src = IMAGE_FALLBACK_SRC; }, []);
  const handleProfileImageError = useCallback((event) => { event.currentTarget.onerror = null; event.currentTarget.src = DEFAULT_LOGO; }, []);
  const handleImageLoad = useCallback((event) => { const image = event.currentTarget; const width = image.naturalWidth; const height = image.naturalHeight; if (width && height) onMediaAspectRatio(postId, width / height); }, [onMediaAspectRatio, postId]);
  const handleVideoLoadedMetadata = useCallback((event) => { const video = event.currentTarget; const width = video.videoWidth; const height = video.videoHeight; if (width && height) onMediaAspectRatio(postId, width / height); }, [onMediaAspectRatio, postId]);
  const handleVideoTap = useCallback((event) => { const video = event.currentTarget; if (video.paused) video.play().catch(() => {}); else video.pause(); }, []);
  const descriptionBlock = tagline ? (
    <div className="post-tagline-wrap">
      <p className={`post-tagline${isDescriptionExpanded ? " is-expanded" : ""}`}>
        {renderDescriptionWithLinks(visibleDescription)}
        {descriptionNeedsToggle && !isDescriptionExpanded ? "... " : " "}
        {descriptionNeedsToggle && (
          <button type="button" className="tagline-toggle-button" onClick={() => setIsDescriptionExpanded((current) => !current)} aria-expanded={isDescriptionExpanded}>
            {isDescriptionExpanded ? "less" : "more"}
          </button>
        )}
      </p>
    </div>
  ) : null;
  const tradeSkillsBlock = hasStructuredTrade ? (
    <div className="trade-skills-blocks">
      {exchangeOfferText ? (
        <div className="trade-skill-block">
          <span className="trade-skill-label">I can give</span>
          <span className="trade-skill-value">{renderDescriptionWithLinks(exchangeOfferText)}</span>
        </div>
      ) : null}
      {exchangeNeedText ? (
        <div className="trade-skill-block">
          <span className="trade-skill-label">I need</span>
          <span className="trade-skill-value">{renderDescriptionWithLinks(exchangeNeedText)}</span>
        </div>
      ) : null}
    </div>
  ) : null;
  const callPhone = normalizeWhatsAppNumber(post.creator_identity || "");
  const callHref = callPhone ? `tel:+${callPhone}` : "";
  return (
    <section ref={postRefCallback} data-index={index} className="home-post service-reel-card">
      <TvMedia mediaUrl={mediaUrl} embedUrl={getEmbedUrl(mediaUrl)} isTvTab={isTvTab} isImage={isImage} isVideo={isVideo} isEmbed={isEmbed} isActive={isActive} aspectClass={aspectClass} mediaAspectRatio={mediaAspectRatio} serviceName={serviceName} tagline={tagline} index={index} postId={postId} videoRefCallback={videoRefCallback} onImageLoad={handleImageLoad} onImageError={handleImageError} onVideoPlay={onVideoPlay} onVideoPause={onVideoPause} onVideoLoadedMetadata={handleVideoLoadedMetadata} onVideoTap={handleVideoTap} />
      <div className="service-card-gradient" aria-hidden="true" />
      
      {showLiveConversation && (
        <TvConversationOverlay postId={postId} isActive={isActive} apiUrl={API_URL} mode={conversationMode} viewCount={isTvTab ? viewCount : null} currentUser={currentUser} getSessionToken={getSessionToken} onRequireAuth={onRequireAuth} onZoomImage={onZoomImage} compressImageFile={compressImageFile} defaultLogo={DEFAULT_LOGO} />
      )}
      
      <div className="post-info-block">
        <div className="post-provider-row">
          <button type="button" className={`service-avatar-badge ${verificationInfo.className}`} onClick={() => onZoomImage(post.logo_url || DEFAULT_LOGO)} aria-label={`View ${providerName}'s profile photo`}>
            <img src={post.logo_url || DEFAULT_LOGO} alt="" loading="lazy" decoding="async" onError={handleProfileImageError} />
          </button>
          <div className="post-provider-copy">
            <button type="button" className="creator-name" onClick={() => onViewProfile(post)}>
              <span>{providerName}</span>
              {verificationInfo.status === "verified" && (
                <span className="verified-check-badge" role="img" aria-label="Verified"><Check size={11} strokeWidth={3.5} aria-hidden="true" /></span>
              )}
            </button>
            {serviceName && <h2 className="service-name">{serviceName}</h2>}
            {tradeSkillsBlock}
            {descriptionBlock}
          </div>
        </div>
      </div>
      {!showLiveConversation && (
        <div className="service-social-rail" aria-label="Service engagement">
          <button type="button" className={`rail-action star-action${reacted ? " is-active" : ""}`} onClick={() => onReact(post)} disabled={reacting || reacted} aria-label={`React to this service, currently ${formatCount(reactionCount)} stars`} aria-pressed={reacted}>
            <Star className="gold-star" size={34} fill="currentColor" aria-hidden="true" />
            <span>{formatCount(reactionCount)}</span>
          </button>
        </div>
      )}
      {showLiveConversation ? (
        <button type="button" className="tv-private-contact-cta" onClick={() => onContactProvider(post)} aria-label={`Privately contact ${providerName}`} title="Private contact"><Mail size={20} aria-hidden="true" /></button>
      ) : (
        <button type="button" className="contact-me-cta" onClick={() => onContactProvider(post)}><Send size={20} aria-hidden="true" /><span>Contact me</span></button>
      )}
      {(isSocialLife || !showLiveConversation) && callHref && (
        <button type="button" className={isSocialLife ? "social-life-call-cta" : "call-me-button"} onClick={() => onCallProvider(post)} aria-label={`Call ${providerName}`} title={isSocialLife ? "Call" : undefined}><Phone size={20} aria-hidden="true" /></button>
      )}
    </section>
  );
});
ServicePost.displayName = "ServicePost";

const ServiceEditorModal = memo(({
  newCreatorName, setNewCreatorName, newCreatorIdentity, setNewCreatorIdentity,
  newTitle, setNewTitle, newMediaUrl, setNewMediaUrl, subtitle, setSubtitle,
  postType, setPostType, postHeadline, setPostHeadline, serviceCategory,
  setServiceCategory, postLocation, setPostLocation, priceUnit, setPriceUnit,
  availability, setAvailability, exchangeNeed, setExchangeNeed, allowCashBalance,
  setAllowCashBalance, momentKind, setMomentKind, handleLogoChange, logoPreview,
  handleMediaFileChange, mediaPreview, mediaPreviewType, applyChanges, closeEditor,
  saving, uploadProgress, compressingMedia, isEdit = false,
}) => {
  useEscapeToClose(closeEditor);
  return (
    <div className="modal-overlay" onClick={closeEditor}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? "✎ Edit Post" : "＋ What are you posting?"}</h2>
          <button type="button" onClick={closeEditor} className="modal-close" aria-label="Close">×</button>
        </div>
        
        {!isEdit && (
          <div className="form-section post-type-section">
            <div className="section-heading">Choose one</div>
            <div className="post-type-grid" role="radiogroup" aria-label="Post type">
              {[
                ["offer", "🛠️", "Offer Work", "Show what you can do"],
                ["exchange", "🔄", "Trade Skills", "Give work, get work"],
                ["moment", "✨", "Share a Moment", "Story, song or movie saying"],
              ].map(([value, icon, label, help]) => (
                <button key={value} type="button" role="radio" aria-checked={postType === value} className={`post-type-choice${postType === value ? " is-selected" : ""}`} onClick={() => setPostType(value)}>
                  <span className="post-type-icon" aria-hidden="true">{icon}</span>
                  <strong>{label}</strong>
                  <small>{help}</small>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="form-section">
          <div className="section-heading">
            {postType === "offer" ? "Your work" : postType === "need" ? "Help you need" : postType === "exchange" ? "Your trade" : "Your moment"}
          </div>
          {postType === "moment" && (
            <>
              <label>What kind of moment?</label>
              <div className="choice-pill-row" role="radiogroup" aria-label="Moment type">
                {[["story", "My story"], ["song", "Song saying"], ["movie", "Movie saying"], ["recommend", "Recommend someone"]].map(([value, label]) => (
                  <button key={value} type="button" role="radio" aria-checked={momentKind === value} className={`choice-pill${momentKind === value ? " is-selected" : ""}`} onClick={() => setMomentKind(value)}>{label}</button>
                ))}
              </div>
            </>
          )}
          {postType === "exchange" ? (
            <div className="trade-skills-fields">
              <div className="form-field">
                <label htmlFor="field-exchange-give">What skill/service can you give?</label>
                <input id="field-exchange-give" type="text" value={postHeadline} onChange={(event) => setPostHeadline(event.target.value)} />
              </div>
              <div className="form-field">
                <label htmlFor="field-exchange-need">What skill/service do you need?</label>
                <input id="field-exchange-need" type="text" value={exchangeNeed} onChange={(event) => setExchangeNeed(event.target.value)} />
              </div>
            </div>
          ) : (
            <>
              <label htmlFor="field-post-headline">{postType === "offer" ? "What work can you do?" : postType === "need" ? "What help do you need?" : "Short title"}</label>
              <input id="field-post-headline" type="text" value={postHeadline} onChange={(event) => setPostHeadline(event.target.value)} />
            </>
          )}
          {postType !== "moment" && postType !== "exchange" && (
            <>
              <label htmlFor="field-category">Category</label>
              <input id="field-category" type="text" value={serviceCategory} onChange={(event) => setServiceCategory(event.target.value)} />
            </>
          )}
          <label htmlFor="field-description">{postType === "offer" ? "Tell people about your work" : postType === "need" ? "Explain the problem" : postType === "exchange" ? "Explain your exchange (optional)" : "Write your saying, story, or thought"}</label>
          <textarea id="field-description" value={subtitle} onChange={(event) => setSubtitle(event.target.value)} />
          {postType !== "moment" && postType !== "exchange" && (
            <>
              <label htmlFor="field-location">Where?</label>
              <input id="field-location" type="text" value={postLocation} onChange={(event) => setPostLocation(event.target.value)} />
            </>
          )}
          {postType === "exchange" && (
            <>
              <label>Can cash balance the difference?</label>
              <div className="choice-pill-row" role="radiogroup" aria-label="Allow cash balance">
                <button type="button" role="radio" aria-checked={allowCashBalance} className={`choice-pill${allowCashBalance ? " is-selected" : ""}`} onClick={() => setAllowCashBalance(true)}>Yes</button>
                <button type="button" role="radio" aria-checked={!allowCashBalance} className={`choice-pill${!allowCashBalance ? " is-selected" : ""}`} onClick={() => setAllowCashBalance(false)}>No</button>
              </div>
            </>
          )}
          {(postType === "offer" || postType === "need") && (
            <>
              <label>When?</label>
              <div className="choice-pill-row" role="radiogroup" aria-label="When">
                {[["today", "Today"], ["this week", "This week"], ["choose date", "Choose date later"]].map(([value, label]) => (
                  <button key={value} type="button" role="radio" aria-checked={availability === value} className={`choice-pill${availability === value ? " is-selected" : ""}`} onClick={() => setAvailability(value)}>{label}</button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className={`form-section${isEdit ? " form-section-last" : ""}`}>
          <div className="section-heading">Photo or video</div>
          <label className="file-picker" htmlFor="field-media-upload">
            <span>{compressingMedia ? "Processing..." : postType === "moment" ? "▣ Add a photo or short video" : "▣ Show the work, need, or skill"}</span>
            <input id="field-media-upload" type="file" accept="image/*,video/*" disabled={compressingMedia} onChange={(event) => handleMediaFileChange(event.target.files?.[0] || null)} />
          </label>
          {mediaPreview && (
            <div className="preview-wrap">
              {mediaPreviewType === "image" ? <img src={mediaPreview} alt="Selected media" className="media-preview" /> : <video src={mediaPreview} className="media-preview" controls muted playsInline />}
            </div>
          )}
          <label htmlFor="field-media-link">Media link (Optional)</label>
          <input id="field-media-link" type="text" value={newMediaUrl} onChange={(event) => setNewMediaUrl(event.target.value)} />
          <p className="field-help">Upload media or paste a supported link.</p>
        </div>
        {!isEdit && (
          <div className="form-section form-section-last">
            <div className="section-heading">Your picture (Optional)</div>
            <label className="file-picker" htmlFor="field-profile-photo">
              <span>{compressingMedia ? "Processing..." : "◎ Add or change your profile photo"}</span>
              <input id="field-profile-photo" type="file" accept="image/*" disabled={compressingMedia} onChange={(event) => handleLogoChange(event.target.files?.[0] || null)} />
            </label>
            {logoPreview && <div className="preview-wrap"><img src={logoPreview} alt="Profile preview" className="logo-preview" /></div>}
          </div>
        )}
        {saving && (
          <div className="upload-progress-wrap" role="status" aria-live="polite">
            <div className="upload-progress-text">
              <span>{uploadProgress < 96 ? (isEdit ? "Saving changes..." : "Uploading your post...") : "Finishing up..."}</span>
              <strong>{uploadProgress}%</strong>
            </div>
            <div className="upload-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={uploadProgress}><span style={{ width: `${uploadProgress}%` }} /></div>
          </div>
        )}
        <button type="button" onClick={applyChanges} className="save-button" disabled={saving || compressingMedia}>
          {saving ? (isEdit ? `Saving... ${uploadProgress}%` : `Creating Post... ${uploadProgress}%`) : isEdit ? "Save Changes" : postType === "offer" ? "Post my work" : postType === "need" ? "Post my request" : postType === "exchange" ? "Post my trade" : "Share my moment"}
        </button>
        <button type="button" onClick={closeEditor} className="cancel-button">Cancel</button>
      </div>
    </div>
  );
});
ServiceEditorModal.displayName = "ServiceEditorModal";

const AuthModal = memo(({ isOpen, mode, phone, setPhone, fullName, setFullName, pin, setPin, confirmPin, setConfirmPin, error, successMessage, loading, onRegister, onLogin, onClose, onSwitchMode, onForgotPin, onOpenActivation }) => {
  useEscapeToClose(onClose, isOpen);
  if (!isOpen) return null;
  return (
    <div className="modal-overlay auth-modal-overlay" onClick={onClose}>
      <div className="modal-card auth-modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{mode === "login" ? "Login" : "Register"}</h2>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Close"><X size={20} strokeWidth={2.4} aria-hidden="true" /></button>
        </div>
        {successMessage && <div className="auth-success-message">{successMessage}</div>}
        <div className="form-section">
          <label htmlFor="auth-phone">Telephone Number</label>
          <input id="auth-phone" type="tel" inputMode="tel" autoComplete="tel" autoFocus placeholder="+250 788 123 456" value={phone} onChange={(event) => setPhone(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && mode === "login") onLogin(); }} />
        </div>
        {mode === "register" && (
          <div className="form-section">
            <label htmlFor="auth-name">Full Name</label>
            <input id="auth-name" type="text" autoComplete="name" placeholder="e.g. John Doe" value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </div>
        )}
        <div className={`form-section${mode === "login" ? " form-section-last" : ""}`}>
          <label htmlFor="auth-pin">Personal PIN</label>
          <input id="auth-pin" type="password" inputMode="numeric" autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="8-digit PIN" maxLength={8} pattern="[0-9]{8}" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 8))} onKeyDown={(event) => { if (event.key === "Enter" && mode === "login") onLogin(); }} />
        </div>
        {mode === "register" && (
          <div className="form-section form-section-last">
            <label htmlFor="auth-confirm-pin">Confirm PIN</label>
            <input id="auth-confirm-pin" type="password" inputMode="numeric" autoComplete="new-password" placeholder="Repeat the 8-digit PIN" maxLength={8} pattern="[0-9]{8}" value={confirmPin} onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 8))} onKeyDown={(event) => { if (event.key === "Enter") onRegister(); }} />
            <small className="auth-helper-text">Use a PIN you can remember. Gwamo staff should never ask you to reveal it.</small>
          </div>
        )}
        {error && <p className="auth-error">{error}</p>}
        <button type="button" className="save-button" onClick={mode === "login" ? onLogin : onRegister} disabled={loading}>{loading ? "Loading..." : mode === "login" ? "Login" : "Register"}</button>
        {mode === "login" && <button type="button" className="forgot-pin-button" onClick={onForgotPin} disabled={loading}>Forgot PIN?</button>}
        {mode === "login" && <button type="button" className="forgot-pin-button" onClick={onOpenActivation} disabled={loading}>Have an activation code from the admin?</button>}
        <button type="button" className="switch-mode-button" onClick={onSwitchMode}>{mode === "login" ? "Don't have an account? Register" : "Already have an account? Login"}</button>
        <button type="button" onClick={onClose} className="cancel-button">Cancel</button>
      </div>
    </div>
  );
});
AuthModal.displayName = "AuthModal";

const PinResetModal = memo(({ step, phone, setPhone, request, newPin, setNewPin, confirmPin, setConfirmPin, error, loading, onRequest, onCheckStatus, onComplete, onRestart, onClose }) => {
  useEscapeToClose(onClose);
  return (
    <div className="modal-overlay auth-modal-overlay" onClick={onClose}>
      <div className="modal-card auth-modal-card pin-reset-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Reset personal PIN</h2>
            <p className="modal-header-note">Protected by a call to your registered number</p>
          </div>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Close"><X size={20} strokeWidth={2.4} aria-hidden="true" /></button>
        </div>
        
        {step === "request" && (
          <>
            <p className="pin-reset-intro">Enter the telephone number on your account. An admin will call that same number and ask for the one-time verification code shown here.</p>
            <div className="form-section form-section-last">
              <label htmlFor="pin-reset-phone">Registered telephone number</label>
              <input id="pin-reset-phone" type="tel" inputMode="tel" autoComplete="tel" autoFocus placeholder="+250 788 123 456" value={phone} onChange={(event) => setPhone(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") onRequest(); }} />
            </div>
            {error && <p className="auth-error">{error}</p>}
            <button type="button" className="save-button" onClick={onRequest} disabled={loading}>{loading ? "Requesting..." : "Request PIN reset"}</button>
          </>
        )}
        {step === "waiting" && (
          <>
            <div className="pin-verification-panel" role="status" aria-live="polite">
              <span>Your verification code</span>
              <strong>{request?.verificationCode || request?.verification_code || request?.code || "-----"}</strong>
            </div>
            <p className="pin-reset-intro">Do not send this code in chat. Wait for the admin to call your registered number, then read the code during that call. The admin must approve it before you continue.</p>
            {error && <p className="auth-error">{error}</p>}
            <button type="button" className="save-button" onClick={() => onCheckStatus()} disabled={loading}>{loading ? "Checking..." : "Check approval"}</button>
            <p className="field-help" style={{ marginTop: 10, marginBottom: 0 }}>This checks automatically every few seconds while this screen is open.</p>
            <button type="button" className="switch-mode-button" onClick={onRestart}>Use a different number</button>
          </>
        )}
        {step === "delivered" && (
          <>
            <div className="auth-success-message">Telephone ownership approved and a new PIN was generated.</div>
            <p className="pin-reset-intro">For your safety, the new PIN is never shown in the app. Gwamo will share it with you directly by phone call or SMS to your registered number. Once you have it, log in with your telephone number and that PIN.</p>
            <button type="button" className="save-button" onClick={onClose}>Done</button>
          </>
        )}
        <button type="button" onClick={onClose} className="cancel-button">Cancel</button>
      </div>
    </div>
  );
});
PinResetModal.displayName = "PinResetModal";

const PendingPhoneReviewModal = memo(({ review, onClose }) => {
  useEscapeToClose(onClose);
  return (
    <div className="modal-overlay auth-modal-overlay" onClick={onClose}>
      <div className="modal-card auth-modal-card pin-reset-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>You're almost in!</h2>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Close"><X size={20} strokeWidth={2.4} aria-hidden="true" /></button>
        </div>
        <p className="pin-reset-intro">Thank you for joining Gwamo. Your registration is now with our team for a quick review to confirm you're a real person with a genuine account.</p>
        <p className="pin-reset-intro">We're currently working through quite a few new sign-ups, so this can take anywhere from about 5 minutes up to a full day depending on how many people registered just ahead of you. Hang tight - you're in good hands, and we're moving through the list as quickly as we can.</p>
        {review?.phone && <p className="auth-helper-text">We'll be in touch on the number you registered with once it's your turn.</p>}
        <button type="button" className="save-button" onClick={onClose}>Got it, I'll check back soon</button>
      </div>
    </div>
  );
});
PendingPhoneReviewModal.displayName = "PendingPhoneReviewModal";

const ActivationCodeModal = memo(({ phone, setPhone, code, setCode, newPin, setNewPin, confirmPin, setConfirmPin, error, loading, onSubmit, onClose }) => {
  useEscapeToClose(onClose);
  return (
    <div className="modal-overlay auth-modal-overlay" onClick={onClose}>
      <div className="modal-card auth-modal-card pin-reset-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>Activate your account</h2>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Close"><X size={20} strokeWidth={2.4} aria-hidden="true" /></button>
        </div>
        <p className="pin-reset-intro">Your account was approved. You don't need to remember the PIN you typed when you registered - just enter your telephone number, the 6-digit code the admin gave you, and a PIN to use from now on.</p>
        <div className="form-section">
          <label htmlFor="activation-phone">Telephone number</label>
          <input id="activation-phone" type="tel" inputMode="tel" autoComplete="tel" autoFocus placeholder="+250 788 123 456" value={phone} onChange={(event) => setPhone(event.target.value)} />
        </div>
        <div className="form-section">
          <label htmlFor="activation-code">Activation code</label>
          <input id="activation-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" placeholder="6-digit code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} />
        </div>
        <div className="form-section">
          <label htmlFor="activation-new-pin">Personal PIN</label>
          <input id="activation-new-pin" type="password" inputMode="numeric" autoComplete="new-password" placeholder="8-digit PIN" maxLength={8} pattern="[0-9]{8}" value={newPin} onChange={(event) => setNewPin(event.target.value.replace(/\D/g, "").slice(0, 8))} />
          <small className="auth-helper-text">You can reuse the PIN you tried at registration, or set a new one - whichever you'll remember.</small>
        </div>
        <div className="form-section form-section-last">
          <label htmlFor="activation-confirm-pin">Confirm PIN</label>
          <input id="activation-confirm-pin" type="password" inputMode="numeric" autoComplete="new-password" placeholder="Repeat the 8-digit PIN" maxLength={8} pattern="[0-9]{8}" value={confirmPin} onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 8))} onKeyDown={(event) => { if (event.key === "Enter") onSubmit(); }} />
        </div>
        {error && <p className="auth-error">{error}</p>}
        <button type="button" className="save-button" onClick={onSubmit} disabled={loading}>{loading ? "Activating..." : "Activate my account"}</button>
        <button type="button" onClick={onClose} className="cancel-button">Cancel</button>
      </div>
    </div>
  );
});
ActivationCodeModal.displayName = "ActivationCodeModal";

const RejectedAccountModal = memo(({ info, onClose, onRegisterAgain }) => {
  useEscapeToClose(onClose);
  return (
    <div className="modal-overlay auth-modal-overlay" onClick={onClose}>
      <div className="modal-card auth-modal-card pin-reset-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>Registration not approved</h2>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Close"><X size={20} strokeWidth={2.4} aria-hidden="true" /></button>
        </div>
        <p className="pin-reset-intro">{info?.message}</p>
        <button type="button" className="save-button" onClick={onRegisterAgain}>Register again</button>
        <button type="button" onClick={onClose} className="cancel-button">Close</button>
      </div>
    </div>
  );
});
RejectedAccountModal.displayName = "RejectedAccountModal";

const ChatModal = memo(({ partner, currentUser, getSessionToken, apiUrl, onClose, onZoomImage, onRequireAuth }) => {
  useEscapeToClose(onClose);
  const draftKey = `${CHAT_DRAFT_PREFIX}${partner.servicePostId || partner.conversationId || "new"}`;
  const [conversationId, setConversationId] = useState(partner.conversationId || "");
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState(() => { try { return window.sessionStorage.getItem(draftKey) || ""; } catch { return ""; } });
  const [loading, setLoading] = useState(Boolean(partner.conversationId && currentUser));
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
  const trackObjectUrl = useCallback((url) => { objectUrlsRef.current.push(url); return url; }, []);
  const normalizeMessage = useCallback((raw) => ({
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
  }), []);
  const authHeaders = useCallback(() => { const token = getSessionToken(); return token ? { Authorization: `Bearer ${token}` } : {}; }, [getSessionToken]);
  useEffect(() => {
    try {
      if (inputText) window.sessionStorage.setItem(draftKey, inputText);
      else window.sessionStorage.removeItem(draftKey);
    } catch { /* A disabled storage API must never block messaging. */ }
  }, [draftKey, inputText]);
  const ensureConversation = useCallback(async () => {
    if (conversationId) return conversationId;
    const token = getSessionToken();
    if (!currentUser || !token) throw new Error("Login with your telephone and personal PIN to send.");
    
    const response = await fetch(`${apiUrl}/api/time-market/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ service_post_id: partner.servicePostId, provider_id: partner.providerId || undefined, provider_phone: partner.providerPhone || undefined }),
    });
    
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { throw new Error(text || "Could not start this conversation."); }
    if (!response.ok || !data.success) throw new Error(data.error || data.message || "Could not start this conversation.");
    
    const id = String(data.conversation?.id || "");
    if (!id) throw new Error("Could not start this conversation.");
    setConversationId(id);
    return id;
  }, [apiUrl, conversationId, currentUser, getSessionToken, partner.providerId, partner.providerPhone, partner.servicePostId]);
  const loadMessages = useCallback(async (id, { silent = false } = {}) => {
    if (!id) return;
    if (!silent) setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/time-market/messages?conversation_id=${encodeURIComponent(id)}`, { headers: { ...authHeaders() }, cache: "no-store" });
      const text = await response.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch { throw new Error(text || "Could not load messages."); }
      if (!response.ok || !data.success) throw new Error(data.error || data.message || "Could not load messages.");
      if (!isMountedRef.current) return;
      
      const normalized = (data.messages || []).map(normalizeMessage);
      setMessages((current) => {
        const pendingOnes = current.filter((message) => message.pending);
        const knownIds = new Set(normalized.map((message) => message.id));
        const merged = [...normalized];
        pendingOnes.forEach((pendingMessage) => { if (!knownIds.has(pendingMessage.id)) merged.push(pendingMessage); });
        return merged;
      });
      setLoadError("");
    } catch (error) {
      if (!silent && isMountedRef.current) setLoadError(error.message || "Could not load messages.");
    } finally { if (!silent && isMountedRef.current) setLoading(false); }
  }, [apiUrl, authHeaders, normalizeMessage]);
  useEffect(() => {
    isMountedRef.current = true;
    if (partner.conversationId && currentUser) loadMessages(String(partner.conversationId)).catch(() => {});
    else { setLoading(false); setLoadError(""); }
    return () => { isMountedRef.current = false; };
  }, [currentUser, loadMessages, partner.conversationId]);
  useEffect(() => {
    if (!conversationId) return undefined;
    const startPolling = () => {
      if (pollRef.current) return;
      pollRef.current = setInterval(() => { if (document.hidden) return; loadMessages(conversationId, { silent: true }); }, MESSAGE_POLL_INTERVAL_MS);
    };
    const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
    const handleVisibility = () => {
      if (document.hidden) stopPolling();
      else { loadMessages(conversationId, { silent: true }); startPolling(); }
    };
    startPolling();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => { stopPolling(); document.removeEventListener("visibilitychange", handleVisibility); };
  }, [conversationId, loadMessages]);
  useEffect(() => {
    const grew = messages.length > lastMessageCountRef.current;
    lastMessageCountRef.current = messages.length;
    if (isNearBottomRef.current) {
      if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ block: "end" });
      setShowNewMessagesButton(false);
      return;
    }
    if (grew) {
      const lastMessage = messages[messages.length - 1];
      const isOwnMessage = lastMessage && String(lastMessage.senderId) === String(currentUser?.id);
      if (!isOwnMessage) setShowNewMessagesButton(true);
    }
  }, [messages, currentUser]);
  const handleScroll = useCallback(() => {
    const node = messagesListRef.current;
    if (!node) return;
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    isNearBottomRef.current = distanceFromBottom < 120;
    if (isNearBottomRef.current) setShowNewMessagesButton(false);
  }, []);
  const scrollToBottom = useCallback(() => {
    isNearBottomRef.current = true; setShowNewMessagesButton(false);
    messagesEndRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, []);
  const sendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    if (!currentUser || !getSessionToken()) { pendingSendAfterAuthRef.current = true; onRequireAuth?.(); return; }
    setInputText(""); setPendingFailedText(null);
    
    const tempId = `pending-${Date.now()}`;
    const optimisticMessage = { id: tempId, senderId: String(currentUser?.id || ""), text, type: "text", mediaUrl: "", createdAt: new Date().toISOString(), readAt: null, pending: true, failed: false };
    setMessages((current) => [...current, optimisticMessage]);
    isNearBottomRef.current = true; setSending(true);
    
    try {
      const id = await ensureConversation();
      const response = await fetch(`${apiUrl}/api/time-market/messages`, {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ conversation_id: id, message_type: "text", text }),
      });
      const responseText = await response.text();
      let data = {};
      try { data = responseText ? JSON.parse(responseText) : {}; } catch { throw new Error(responseText || "Could not send message."); }
      if (!response.ok || !data.success) throw new Error(data.error || data.message || "Could not send message.");
      
      const confirmed = normalizeMessage(data.message);
      setMessages((current) => current.map((message) => message.id === tempId ? confirmed : message));
    } catch (error) {
      setMessages((current) => current.map((message) => message.id === tempId ? { ...message, pending: false, failed: true } : message));
      setPendingFailedText({ text, tempId });
    } finally { if (isMountedRef.current) setSending(false); }
  }, [inputText, sending, ensureConversation, apiUrl, authHeaders, currentUser, getSessionToken, normalizeMessage, onRequireAuth]);
  useEffect(() => {
    if (!currentUser || !pendingSendAfterAuthRef.current || !inputText.trim()) return;
    pendingSendAfterAuthRef.current = false; sendMessage();
  }, [currentUser, inputText, sendMessage]);
  const retryFailedText = useCallback(() => {
    if (!pendingFailedText) return;
    setInputText(pendingFailedText.text); setPendingFailedText(null);
    setMessages((current) => current.filter((message) => message.id !== pendingFailedText.tempId));
  }, [pendingFailedText]);
  const sendAttachment = useCallback(async (file, typeHint) => {
    if (!file) return;
    setAttachMenuOpen(false); setAttachError("");
    if (!currentUser || !getSessionToken()) { pendingAttachmentAfterAuthRef.current = { file, typeHint }; onRequireAuth?.(); return; }
    
    const tempId = `pending-${Date.now()}`;
    const previewUrl = trackObjectUrl(URL.createObjectURL(file));
    const optimisticMessage = { id: tempId, senderId: String(currentUser?.id || ""), text: "", type: typeHint, mediaUrl: previewUrl, fileName: file.name || "Attachment", createdAt: new Date().toISOString(), readAt: null, pending: true, failed: false };
    setMessages((current) => [...current, optimisticMessage]);
    isNearBottomRef.current = true; setSending(true);
    
    try {
      const id = await ensureConversation();
      const formData = new FormData();
      formData.append("conversation_id", id); formData.append("file", file); formData.append("message_type", typeHint);
      
      const response = await fetch(`${apiUrl}/api/time-market/messages`, { method: "POST", headers: { ...authHeaders() }, body: formData });
      const responseText = await response.text();
      let data = {};
      try { data = responseText ? JSON.parse(responseText) : {}; } catch { throw new Error(responseText || "Could not send attachment."); }
      if (!response.ok || !data.success) throw new Error(data.error || data.message || "Could not send attachment.");
      
      const confirmed = normalizeMessage(data.message);
      setMessages((current) => current.map((message) => message.id === tempId ? confirmed : message));
    } catch (error) {
      setMessages((current) => current.map((message) => message.id === tempId ? { ...message, pending: false, failed: true } : message));
      setAttachError(error.message || "Could not send attachment."); setPendingFailedAttachment({ file, typeHint, tempId });
    } finally { if (isMountedRef.current) setSending(false); }
  }, [apiUrl, authHeaders, currentUser, ensureConversation, getSessionToken, normalizeMessage, onRequireAuth, trackObjectUrl]);
  useEffect(() => {
    if (!currentUser || !pendingAttachmentAfterAuthRef.current) return;
    const pending = pendingAttachmentAfterAuthRef.current;
    pendingAttachmentAfterAuthRef.current = null; sendAttachment(pending.file, pending.typeHint);
  }, [currentUser, sendAttachment]);
  const retryFailedAttachment = useCallback(() => {
    if (!pendingFailedAttachment) return;
    const pending = pendingFailedAttachment;
    setPendingFailedAttachment(null); setAttachError("");
    setMessages((current) => current.filter((message) => message.id !== pending.tempId));
    sendAttachment(pending.file, pending.typeHint);
  }, [pendingFailedAttachment, sendAttachment]);
  const handlePickPhoto = useCallback((event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) sendAttachment(file, "image"); }, [sendAttachment]);
  const handlePickVideo = useCallback((event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) sendAttachment(file, "video"); }, [sendAttachment]);
  const handlePickDocument = useCallback((event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) sendAttachment(file, "document"); }, [sendAttachment]);
  const callPhone = partner.providerPhone || "";
  const callHref = callPhone ? `tel:+${callPhone}` : "";
  useEffect(() => { return () => { objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url)); }; }, []);
  const groupedMessages = useMemo(() => {
    const groups = [];
    let currentLabel = null;
    for (const message of messages) {
      const label = formatDayLabel(message.createdAt);
      if (label !== currentLabel) { groups.push({ type: "separator", label, key: `sep-${message.id}` }); currentLabel = label; }
      groups.push({ type: "message", message });
    }
    return groups;
  }, [messages]);
  return (
    <div className="chat-modal-overlay" onClick={onClose}>
      <div className="chat-modal" onClick={(event) => event.stopPropagation()}>
        <div className="chat-header">
          <button className="chat-back" onClick={onClose} aria-label="Close chat"><X size={20} /></button>
          <img className="chat-header-avatar" src={partner.avatar || DEFAULT_LOGO} alt="" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = DEFAULT_LOGO; }} />
          <div className="chat-header-copy">
            <strong className="chat-header-name">
              {partner.name}
              {partner.verified && <span className="verified-check-badge chat-header-verified" role="img" aria-label="Verified"><Check size={10} strokeWidth={3.5} aria-hidden="true" /></span>}
            </strong>
            {partner.serviceName || partner.headline ? <small>{partner.serviceName || partner.headline}</small> : null}
            <small className="chat-privacy-note">Private conversation · Privacy Policy applies</small>
          </div>
        </div>
        
        <div className="chat-messages" ref={messagesListRef} onScroll={handleScroll}>
          {loading ? (
            <div className="chat-loading">Loading messages...</div>
          ) : loadError ? (
            <div className="chat-empty">{loadError}</div>
          ) : messages.length === 0 ? (
            <div className="chat-welcome">
              <img src={partner.avatar || DEFAULT_LOGO} alt="" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = DEFAULT_LOGO; }} />
              <strong>Message {partner.name || "provider"}</strong>
              <p>{currentUser ? "Ask about this service or send the first message below." : "Write your message below. Login with telephone + PIN only when you press Send."}</p>
            </div>
          ) : (
            groupedMessages.map((entry) => {
              if (entry.type === "separator") return <div className="chat-date-separator" key={entry.key}><span>{entry.label}</span></div>;
              const msg = entry.message;
              const isOwn = String(msg.senderId) === String(currentUser?.id);
              return (
                <div key={msg.id} className={`chat-message ${isOwn ? "sent" : "received"}${msg.pending ? " is-pending" : ""}${msg.failed ? " is-failed" : ""}`}>
                  {msg.type === "image" && msg.mediaUrl ? <img src={msg.mediaUrl} alt="Attachment" className="chat-image-attachment" onClick={() => onZoomImage?.(msg.mediaUrl)} /> : null}
                  {msg.type === "video" && msg.mediaUrl ? <video src={msg.mediaUrl} controls playsInline preload="metadata" /> : null}
                  {msg.type === "voice" && msg.mediaUrl ? <audio src={msg.mediaUrl} controls preload="none" /> : null}
                  {msg.type === "document" && msg.mediaUrl ? (
                    <a className="chat-document-link" href={msg.mediaUrl} target="_blank" rel="noreferrer" download>
                      <FileText size={19} aria-hidden="true" /><span>{msg.fileName || "Open document"}</span>
                    </a>
                  ) : null}
                  {msg.text ? <p>{msg.text}</p> : null}
                  <time>
                    {msg.pending ? "Sending..." : msg.failed ? "Not delivered" : new Date(msg.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    {isOwn && !msg.pending && !msg.failed && (
                      <span className={`chat-read-status${msg.readAt ? " is-read" : ""}`} aria-label={msg.readAt ? "Read" : msg.deliveredAt ? "Delivered" : "Sent"}>
                        {msg.readAt || msg.deliveredAt ? <CheckCheck size={13} aria-hidden="true" /> : <Check size={13} aria-hidden="true" />}
                      </span>
                    )}
                  </time>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
        {showNewMessagesButton && <button type="button" className="chat-new-messages-button" onClick={scrollToBottom}>New messages</button>}
        
        {pendingFailedText ? (
          <div className="chat-retry-banner">
            <span>Message not sent.</span>
            <button type="button" onClick={retryFailedText}>Tap to retry</button>
          </div>
        ) : null}
        {attachError ? (
          <div className="chat-retry-banner">
            <span>{attachError}</span>
            <button type="button" onClick={pendingFailedAttachment ? retryFailedAttachment : () => setAttachError("")}>{pendingFailedAttachment ? "Tap to retry" : "Dismiss"}</button>
          </div>
        ) : null}
        <div className="chat-composer">
          <div className="chat-attach-wrap">
            <button type="button" className="chat-attach-button" onClick={() => setAttachMenuOpen((value) => !value)} aria-label="Attach a photo, video or document" aria-haspopup="true" aria-expanded={attachMenuOpen}>
              <Paperclip size={20} aria-hidden="true" />
            </button>
            {attachMenuOpen && (
              <>
                <div className="chat-attach-backdrop" onClick={() => setAttachMenuOpen(false)} aria-hidden="true" />
                <div className="chat-attach-menu">
                  <button type="button" onClick={() => photoInputRef.current?.click()}><ImageIcon size={18} aria-hidden="true" /> Photo</button>
                  <button type="button" onClick={() => videoInputRef.current?.click()}><Video size={18} aria-hidden="true" /> Video</button>
                  <button type="button" onClick={() => documentInputRef.current?.click()}><FileText size={18} aria-hidden="true" /> Document</button>
                </div>
              </>
            )}
            <input ref={photoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePickPhoto} />
            <input ref={videoInputRef} type="file" accept="video/*" style={{ display: "none" }} onChange={handlePickVideo} />
            <input ref={documentInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,application/pdf" style={{ display: "none" }} onChange={handlePickDocument} />
          </div>
          <input type="text" placeholder={`Message ${partner.name || "provider"}...`} autoFocus value={inputText} onChange={(event) => setInputText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") sendMessage(); }} />
          {inputText.trim() ? (
            <button className="chat-send" onClick={sendMessage} disabled={sending || loading} aria-label="Send message"><Send size={20} aria-hidden="true" /></button>
          ) : callHref ? (
            <a className="chat-send" href={callHref} aria-label={`Call ${partner.name || "provider"}`}><Phone size={20} aria-hidden="true" /></a>
          ) : (
            <button type="button" className="chat-send" disabled aria-label="No phone number available for this provider"><Phone size={20} aria-hidden="true" /></button>
          )}
        </div>
      </div>
    </div>
  );
});
ChatModal.displayName = "ChatModal";

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
    return { x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) };
  }, []);
  const resetZoom = useCallback(() => { setScale(1); setTranslate({ x: 0, y: 0 }); }, []);
  const zoomAt = useCallback((clientX, clientY, nextScale) => {
    const node = containerRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const originX = clientX - rect.left - rect.width / 2;
    const originY = clientY - rect.top - rect.height / 2;
    const clamped = Math.min(ZOOM_MAX_SCALE, Math.max(ZOOM_MIN_SCALE, nextScale));
    setScale((prevScale) => {
      const ratio = clamped / prevScale;
      setTranslate((prevTranslate) => clampTranslate(clamped, originX - (originX - prevTranslate.x) * ratio, originY - (originY - prevTranslate.y) * ratio));
      return clamped;
    });
  }, [clampTranslate]);
  const handleDoubleClick = useCallback((event) => {
    event.stopPropagation();
    if (scale > 1) resetZoom();
    else zoomAt(event.clientX, event.clientY, ZOOM_DOUBLE_TAP_SCALE);
  }, [scale, resetZoom, zoomAt]);
  const handleWheel = useCallback((event) => {
    event.preventDefault();
    zoomAt(event.clientX, event.clientY, scale - event.deltaY * 0.0015 * scale);
  }, [scale, zoomAt]);
  const handlePointerDown = useCallback((event) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    
    if (pointersRef.current.size === 1) {
      gestureRef.current = { mode: "pan", startX: event.clientX, startY: event.clientY, startTranslate: translate };
    } else if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      const distance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
      gestureRef.current = { mode: "pinch", startDistance: distance, startScale: scale, midpoint: { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 } };
    }
  }, [translate, scale]);
  const handlePointerMove = useCallback((event) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const gesture = gestureRef.current;
    if (!gesture) return;
    
    if (gesture.mode === "pan" && scale > 1) {
      setTranslate(clampTranslate(scale, gesture.startTranslate.x + (event.clientX - gesture.startX), gesture.startTranslate.y + (event.clientY - gesture.startY)));
    } else if (gesture.mode === "pinch" && pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      const distance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
      zoomAt(gesture.midpoint.x, gesture.midpoint.y, gesture.startScale * (distance / gesture.startDistance));
    }
  }, [scale, clampTranslate, zoomAt]);
  const handlePointerUp = useCallback((event) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size === 0) {
      gestureRef.current = null;
      setScale((current) => { if (current < 1.02) { setTranslate({ x: 0, y: 0 }); return 1; } return current; });
    } else if (pointersRef.current.size === 1) {
      const [[, point]] = Array.from(pointersRef.current.entries());
      gestureRef.current = { mode: "pan", startX: point.x, startY: point.y, startTranslate: translate };
    }
  }, [translate]);
  useEffect(() => { resetZoom(); }, [src]);
  return (
    <div className="zoom-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Photo preview">
      <button type="button" className="zoom-close-button" onClick={onClose} aria-label="Close photo preview"><X size={26} strokeWidth={2.4} aria-hidden="true" /></button>
      <div className="zoom-image-shell" ref={containerRef} onClick={(event) => event.stopPropagation()} onDoubleClick={handleDoubleClick} onWheel={handleWheel} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} role="presentation">
        <img src={src} alt={alt} className="zoom-image" decoding="async" draggable={false} style={{ transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`, cursor: scale > 1 ? "grab" : "zoom-in", touchAction: "none" }} />
      </div>
      {scale > 1 && <button type="button" className="zoom-reset-button" onClick={(event) => { event.stopPropagation(); resetZoom(); }}>Reset zoom</button>}
    </div>
  );
});
ZoomableImageViewer.displayName = "ZoomableImageViewer";

const ProviderProfileSheet = memo(({ post, isOwner = false, onClose, onMessage, onShare }) => {
  useEscapeToClose(onClose);
  const info = getVerificationStatus(post);
  const providerName = post.service_provider_name || post.creator_name || "Provider";
  const headline = post.service_charge_per_minute || post.title || "";
  const description = post.work_description || post.subtitle || "";
  const postedDate = post.created_at ? new Date(post.created_at).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" }) : "";
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card profile-sheet-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{isOwner ? "Your Profile" : "Provider Profile"}</h2>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Close"><X size={20} strokeWidth={2.4} aria-hidden="true" /></button>
        </div>
        <div className="profile-sheet-top">
          <div className={`provider-sheet-avatar ${info.className}`}>
            <img src={post.logo_url || DEFAULT_LOGO} alt="" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = DEFAULT_LOGO; }} />
          </div>
          <div className="profile-sheet-identity">
            <h3>{providerName}</h3>
            <VerificationTag info={info} />
          </div>
        </div>
        {headline ? <p className="profile-sheet-headline">{headline}</p> : null}
        {description ? <p className="profile-sheet-description">{description}</p> : null}
        {postedDate ? <p className="profile-sheet-meta">Posted {postedDate}</p> : null}
        <div className="profile-sheet-actions">
          {!isOwner && <button type="button" className="save-button" onClick={onMessage}><MessageSquare size={18} aria-hidden="true" /> Message</button>}
          <button type="button" className="cancel-button" onClick={onShare}>Share</button>
        </div>
      </div>
    </div>
  );
});
ProviderProfileSheet.displayName = "ProviderProfileSheet";

const ProfileEditModal = memo(({
  user, fullName, setFullName, serviceName, setServiceName, servicesOffered, setServicesOffered,
  photoPreview, onPhotoChange, onRemovePhoto, photoRemoved, contextPost, onEditListing,
  onOpenServices, onLogout, deleteConfirming, setDeleteConfirming, onDeleteAccount,
  saving, error, onSave, onClose,
}) => {
  useEscapeToClose(onClose);
  const info = getVerificationStatus(user);
  const currentPhoto = photoRemoved ? "" : photoPreview || user?.profile_image_url || "";
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>My Profile</h2>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Close"><X size={20} strokeWidth={2.4} aria-hidden="true" /></button>
        </div>
        <div className="account-status-row">
          <VerificationTag info={info} />
          {info.status === "pending" && <p className="field-help">Your blue verified badge appears after Gwamo staff confirms your details.</p>}
        </div>
        <div className="form-section">
          <div className="section-heading">Photo</div>
          <div className="profile-photo-row">
            <div className="profile-photo-preview">
              {currentPhoto ? <img src={currentPhoto} alt="" /> : <User size={26} aria-hidden="true" />}
            </div>
            <div className="profile-photo-actions">
              <label className="file-picker profile-photo-picker" htmlFor="profile-photo-upload">
                <span>Change Photo</span>
                <input id="profile-photo-upload" type="file" accept="image/*" onChange={(event) => onPhotoChange(event.target.files?.[0] || null)} />
              </label>
              {currentPhoto && <button type="button" className="cancel-button profile-photo-remove" onClick={onRemovePhoto}>Remove Photo</button>}
            </div>
          </div>
          <p className="field-help">Use a clear square photo. It will be cropped into the circular profile badge.</p>
        </div>
        <div className="form-section">
          <label htmlFor="profile-full-name">Full name</label>
          <input id="profile-full-name" type="text" value={fullName} onChange={(event) => setFullName(event.target.value)} />
          <p className="field-help">Your legal name, used for verification.</p>
        </div>
        <div className="form-section">
          <label htmlFor="profile-service-name">Public / service name</label>
          <input id="profile-service-name" type="text" value={serviceName} onChange={(event) => setServiceName(event.target.value)} />
          <p className="field-help">This is the name shown on your services.</p>
        </div>
        <div className="form-section">
          <label htmlFor="profile-services-offered">Services you can offer</label>
          <textarea id="profile-services-offered" placeholder="e.g. Phone repair, driving, English tutoring" value={servicesOffered} onChange={(event) => setServicesOffered(event.target.value)} />
          <p className="field-help">Separate different skills with a comma.</p>
        </div>
        {contextPost && (
          <div className="form-section">
            <div className="section-heading">This listing</div>
            <button type="button" className="cancel-button" onClick={onEditListing}><Pencil size={16} aria-hidden="true" /> Edit price, description and media</button>
            <p className="field-help">Opens the Service Provider form for this specific listing.</p>
          </div>
        )}
        <div className="form-section">
          <div className="section-heading">Account</div>
          <button type="button" className="cancel-button" onClick={onOpenServices}><ShoppingBasket size={16} aria-hidden="true" /> Manage all my services</button>
          <button type="button" className="cancel-button" onClick={onLogout}><LogOut size={16} aria-hidden="true" /> Log out</button>
        </div>
        {error && <p className="auth-error">{error}</p>}
        <button type="button" className="save-button" onClick={onSave} disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
        <button type="button" className="cancel-button" onClick={onClose}>Cancel</button>
        <div className="form-section form-section-last profile-danger-zone">
          <div className="section-heading">Danger zone</div>
          {deleteConfirming ? (
            <>
              <p className="field-help">This deletes your provider identity, not just one listing. Are you sure?</p>
              <button type="button" className="danger-button" onClick={onDeleteAccount}>Yes, delete my provider profile</button>
              <button type="button" className="cancel-button" onClick={() => setDeleteConfirming(false)}>Keep my profile</button>
            </>
          ) : (
            <button type="button" className="danger-button" onClick={() => setDeleteConfirming(true)}>Delete my provider profile</button>
          )}
        </div>
      </div>
    </div>
  );
});
ProfileEditModal.displayName = "ProfileEditModal";

const MyServicesSheet = memo(({ services, loading, error, onEdit, onDelete, onClose, onCreateNew }) => {
  useEscapeToClose(onClose);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>My Services</h2>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Close"><X size={20} strokeWidth={2.4} aria-hidden="true" /></button>
        </div>
        {loading ? (
          <p className="field-help">Loading your services...</p>
        ) : error ? (
          <p className="auth-error">{error}</p>
        ) : services.length === 0 ? (
          <div className="mysheet-empty">
            <p>You haven't added a service yet.</p>
            <button type="button" className="save-button" onClick={onCreateNew}>Offer your service</button>
          </div>
        ) : (
          <div className="myservices-list">
            {services.map((service) => {
              const info = getVerificationStatus(service);
              return (
                <div className="myservice-row" key={service.id}>
                  <img src={service.logo_url || DEFAULT_LOGO} alt="" className="myservice-thumb" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = DEFAULT_LOGO; }} />
                  <div className="myservice-info">
                    <strong>{service.service_charge_per_minute || service.title || "Price not set"}{info.verified && <CheckCircle size={14} className="verified-badge verified" aria-label="Verified" />}</strong>
                    <span>{service.work_description || service.subtitle || "No description yet."}</span>
                  </div>
                  <div className="myservice-actions">
                    <button type="button" onClick={() => onEdit(service)} aria-label="Edit service"><Pencil size={17} /></button>
                    <button type="button" onClick={() => onDelete(service.id)} aria-label="Delete service" className="myservice-delete"><X size={17} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <button type="button" className="cancel-button" onClick={onClose}>Close</button>
      </div>
    </div>
  );
});
MyServicesSheet.displayName = "MyServicesSheet";

const MyTimeSheet = memo(({ onClose }) => {
  useEscapeToClose(onClose);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>My Time</h2>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Close"><X size={20} strokeWidth={2.4} aria-hidden="true" /></button>
        </div>
        <div className="mysheet-empty">
          <Wallet size={40} className="mytime-icon" aria-hidden="true" />
          <p>This is where you'll track the economic value of your time on Gwamo --- time offered, time exchanged, completed requests and what you've earned.</p>
          <p className="field-help">These numbers arrive once Time Requests go live. Nothing to see yet --- check back soon.</p>
        </div>
        <button type="button" className="cancel-button" onClick={onClose}>Close</button>
      </div>
    </div>
  );
});
MyTimeSheet.displayName = "MyTimeSheet";

const MyInboxSheet = memo(({ conversations, loading, error, currentUserId, filterServicePostId, onOpenConversation, onClose }) => {
  useEscapeToClose(onClose);
  const [searchTerm, setSearchTerm] = useState("");
  const visible = filterServicePostId ? conversations.filter((conversation) => String(conversation.service_post_id) === String(filterServicePostId)) : conversations;
  const sorted = [...visible].sort((a, b) => {
    const aTime = Date.parse(a.last_message_at || a.updated_at || a.created_at || 0) || 0;
    const bTime = Date.parse(b.last_message_at || b.updated_at || b.created_at || 0) || 0;
    return bTime - aTime;
  });
  
  const query = searchTerm.trim().toLowerCase();
  const filtered = query ? sorted.filter((conversation) => {
    const iAmProvider = String(conversation.provider_id) === String(currentUserId);
    const partnerName = (iAmProvider ? conversation.customer_full_name : conversation.provider_full_name || conversation.service_provider_name) || "";
    const serviceName = conversation.service_name || "";
    return partnerName.toLowerCase().includes(query) || serviceName.toLowerCase().includes(query);
  }) : sorted;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{filterServicePostId ? "Messages about this service" : "Messages"}</h2>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Close"><X size={20} strokeWidth={2.4} aria-hidden="true" /></button>
        </div>
        
        {!filterServicePostId && conversations.length > 0 && (
          <div className="myinbox-search-wrap">
            <Search size={16} aria-hidden="true" />
            <input type="text" className="myinbox-search" placeholder="Search messages" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} aria-label="Search messages" />
          </div>
        )}
        {loading ? (
          <p className="field-help">Loading conversations...</p>
        ) : error ? (
          <p className="auth-error">{error}</p>
        ) : filtered.length === 0 ? (
          <div className="mysheet-empty">
            <p>No messages yet.</p>
            <p className="field-help">When someone contacts you, the message will appear here.</p>
          </div>
        ) : (
          <div className="myinbox-list">
            {filtered.map((conversation) => {
              const iAmProvider = String(conversation.provider_id) === String(currentUserId);
              const partnerName = iAmProvider ? conversation.customer_full_name || "Customer" : conversation.provider_full_name || conversation.service_provider_name || "Provider";
              const partnerAvatar = iAmProvider ? conversation.customer_profile_image_url || "" : conversation.provider_profile_image_url || "";
              const partnerVerified = iAmProvider ? conversation.customer_verification_status === "verified" : conversation.provider_verification_status === "verified";
              const preview = conversation.last_message ? conversation.last_message : conversation.last_message_type ? attachmentPreviewLabel(conversation.last_message_type) : "No messages yet";
              const unread = Number(conversation.unread_count || 0);
              const lastActivity = conversation.last_message_at || conversation.updated_at || conversation.created_at || "";
              const timeLabel = lastActivity ? new Date(lastActivity).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
              return (
                <button type="button" className={`myinbox-row${unread > 0 ? " has-unread" : ""}`} key={conversation.id} onClick={() => onOpenConversation(conversation)}>
                  <span className="myinbox-avatar">
                    <img src={partnerAvatar || DEFAULT_LOGO} alt="" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = DEFAULT_LOGO; }} />
                  </span>
                  <span className="myinbox-main">
                    <span className="myinbox-name-row">
                      <strong>{partnerName}</strong>
                      {partnerVerified && <span className="verified-check-badge myinbox-verified" role="img" aria-label="Verified"><Check size={9} strokeWidth={3.5} aria-hidden="true" /></span>}
                      {timeLabel && <span className="myinbox-time">{timeLabel}</span>}
                    </span>
                    <small>{conversation.service_name || conversation.service_charge_per_minute || conversation.service_provider_name || ""}</small>
                    <small className="myinbox-preview">{preview}</small>
                  </span>
                  {unread > 0 && <span className="myinbox-unread-badge" aria-label={`${unread} unread messages`}>{unread > 99 ? "99+" : unread}</span>}
                </button>
              );
            })}
          </div>
        )}
        <button type="button" className="cancel-button" onClick={onClose}>Close</button>
      </div>
    </div>
  );
});
MyInboxSheet.displayName = "MyInboxSheet";

const InfoModal = memo(({ topic, onClose }) => {
  useEscapeToClose(onClose);
  const content = INFO_CONTENT[topic] || INFO_CONTENT.about;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{content.title}</h2>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Close"><X size={20} strokeWidth={2.4} aria-hidden="true" /></button>
        </div>
        <div className="info-modal-content">
          {content.eyebrow ? <p className="info-modal-lead">{content.eyebrow}</p> : null}
          <p className="info-modal-body">{content.body}</p>
          {content.sections?.length ? (
            <div className="info-modal-sections">
              {content.sections.map((section) => (
                <div className="info-modal-section" key={section.title}>
                  <h3>{section.title}</h3>
                  <p>{section.body}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <button type="button" className="cancel-button" onClick={onClose}>Close</button>
      </div>
    </div>
  );
});
InfoModal.displayName = "InfoModal";

function HomeStylesInner() {
  return (
    <style>{`
      @import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=DM+Sans:opsz,wght@9..40,400..700&display=swap");

      /* ------------------------------------------------------------------
         GWAMO DESIGN SYSTEM
         Ink-blue surfaces, one warm "time" amber accent, blue reserved for
         verification. Bricolage Grotesque for voice, DM Sans for reading.
         ------------------------------------------------------------------ */
      :root {
        /* legacy tokens, kept so child components (Connect, Heart Zone, TV) keep working */
        --page-bg: #0d1320;
        --panel-bg: #151d2e;
        --blue: #087cff;
        --blue-bright: #168bff;
        --blue-border: rgba(22, 139, 255, 0.78);
        --muted: #9aa6ba;
        --danger: #ff5c70;
        --neon-red: #ff0040;
        --neon-glow: rgba(255, 0, 64, 0.8);
        --deep-orange: #ff6a00;
        --deep-orange-bright: #ff8a00;
        --deep-orange-soft: rgba(255, 106, 0, 0.34);
        --deep-orange-glow: rgba(255, 106, 0, 0.78);
        --verified-green: #2aa3ff;
      }
      .home-page {
        --ink: #0d1320;
        --surface: #151d2e;
        --surface-2: #1e2840;
        --surface-3: #283450;
        --line: rgba(255, 255, 255, 0.09);
        --line-strong: rgba(255, 255, 255, 0.16);
        --text: #f3f5f9;
        --text-dim: #9aa6ba;
        --amber: #ffb938;
        --amber-strong: #ffc766;
        --amber-ink: #1b1303;
        --amber-soft: rgba(255, 185, 56, 0.15);
        --verified: #2aa3ff;
        --ok: #3ddc97;
        --bad: #ff5c70;
        --font-display: "Bricolage Grotesque", "DM Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
        --font-body: "DM Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
        --top-h: 60px;
        --top-offset: calc(var(--top-h) + env(safe-area-inset-top, 0px));
        --nav-h: calc(64px + env(safe-area-inset-bottom, 0px));
        --reel-h: calc(100svh - var(--nav-h));
        --r-sheet: 28px;
        --r-card: 16px;
        --r-field: 14px;
      }
      @supports (height: 100dvh) {
        .home-page { --reel-h: calc(100dvh - var(--nav-h)); }
      }
      @media (min-width: 700px) {
        .home-page { --top-h: 64px; }
      }

      * { box-sizing: border-box; }
      html, body, #root { min-height: 100%; margin: 0; background: var(--page-bg); }
      html:has(.home-page.is-tv-mode) { scroll-snap-type: y proximity; }
      body { overflow-x: hidden; font-family: "DM Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; -webkit-font-smoothing: antialiased; }
      button, input, textarea, select { font: inherit; }
      button { -webkit-tap-highlight-color: transparent; }

      .home-page {
        width: 100%;
        min-height: 100svh;
        padding-bottom: var(--nav-h);
        overflow-x: hidden;
        overflow-x: clip;
        color: var(--text);
        font-family: var(--font-body);
        background: var(--ink);
      }
      .home-page :focus-visible { outline: 2px solid var(--amber); outline-offset: 2px; }

      /* ------------------------------ TOP BAR ------------------------------ */
      .feedx-topbar {
        position: fixed;
        top: 0; left: 0; right: 0;
        z-index: 1000;
        padding-top: env(safe-area-inset-top, 0px);
        background: rgba(13, 19, 32, 0.96);
        border-bottom: 1px solid var(--line);
      }
      .feedx-topbar.is-tv-mode {
        background: linear-gradient(180deg, rgba(13, 19, 32, 0.78) 0%, rgba(13, 19, 32, 0.34) 62%, transparent 100%);
        border-bottom-color: transparent;
      }
      .feedx-topbar-inner {
        width: min(100%, 900px);
        height: var(--top-h);
        margin: 0 auto;
        padding: 0 8px 0 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .gwamo-brand { min-width: 0; display: flex; align-items: baseline; gap: 10px; }
      .feedx-logo {
        margin: 0;
        display: inline-flex;
        align-items: baseline;
        gap: 3px;
        color: var(--text);
        font-family: var(--font-display);
        font-size: 28px;
        font-weight: 800;
        line-height: 1;
        letter-spacing: -0.03em;
      }
      .feedx-logo::after {
        content: "";
        width: 7px; height: 7px;
        flex-shrink: 0;
        border-radius: 50%;
        background: var(--amber);
        transform: translateY(-1px);
      }
      .gwamo-tagline { display: none; color: var(--text-dim); font-size: 13px; font-weight: 500; white-space: nowrap; }
      @media (min-width: 700px) { .gwamo-tagline { display: block; } }

      .topbar-actions { position: relative; display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
      .topbar-icon-button, .menu-button {
        position: relative;
        width: 44px; height: 44px;
        display: grid; place-items: center;
        padding: 0;
        border: 0;
        border-radius: 50%;
        color: var(--text);
        background: transparent;
        cursor: pointer;
        transition: background 160ms ease;
      }
      .topbar-icon-button:hover, .menu-button:hover { background: rgba(255, 255, 255, 0.08); }
      .feedx-topbar.is-tv-mode .topbar-icon-button svg,
      .feedx-topbar.is-tv-mode .menu-button svg { filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.7)); }
      .inbox-icon-wrap { position: relative; display: inline-flex; }
      .inbox-unread-badge {
        position: absolute; top: -6px; right: -8px;
        min-width: 18px; height: 18px;
        padding: 0 5px;
        display: flex; align-items: center; justify-content: center;
        border-radius: 999px;
        color: var(--amber-ink);
        background: var(--amber);
        box-shadow: 0 0 0 2px var(--ink);
        font-size: 10.5px; font-weight: 800; line-height: 1;
      }
      .login-pill {
        min-height: 36px;
        display: inline-flex; align-items: center; gap: 6px;
        margin-right: 2px;
        padding: 0 14px;
        border: 1px solid var(--amber);
        border-radius: 999px;
        color: var(--amber);
        background: transparent;
        font-size: 13px; font-weight: 700;
        cursor: pointer;
        transition: background 160ms ease, color 160ms ease;
      }
      .login-pill:hover { color: var(--amber-ink); background: var(--amber); }
      .account-avatar-button {
        --ring: var(--amber);
        width: 38px; height: 38px; flex: 0 0 38px;
        margin: 0 4px;
        padding: 0;
        overflow: visible;
        border: 0;
        border-radius: 50%;
        background: var(--surface-2);
        box-shadow: 0 0 0 2px var(--ring);
        cursor: pointer;
      }
      .account-avatar-button.status-verified { --ring: var(--verified); }
      .account-avatar-button.status-rejected { --ring: var(--muted); }
      .account-avatar-button img { width: 100%; height: 100%; display: block; object-fit: cover; border-radius: 50%; }

      .dropdown-backdrop { position: fixed; inset: 0; z-index: 999; }
      .dropdown-menu {
        position: absolute; top: calc(100% + 6px); right: 6px;
        z-index: 1001;
        min-width: 236px;
        padding: 6px;
        border: 1px solid var(--line-strong);
        border-radius: var(--r-card);
        background: var(--surface);
        box-shadow: 0 18px 44px rgba(0, 0, 0, 0.5);
      }
      .account-dropdown-header { display: flex; flex-direction: column; gap: 6px; margin-bottom: 4px; padding: 10px 12px 12px; border-bottom: 1px solid var(--line); }
      .account-dropdown-name { overflow: hidden; color: var(--text); font-family: var(--font-display); font-size: 16px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
      .dropdown-divider { height: 1px; margin: 5px 6px; background: var(--line); }
      .dropdown-item {
        width: 100%;
        display: flex; align-items: center; gap: 12px;
        padding: 11px 12px;
        border: 0;
        border-radius: 10px;
        color: var(--text);
        background: transparent;
        font-size: 14.5px; font-weight: 500; text-align: left;
        cursor: pointer;
        transition: background 140ms ease;
      }
      .dropdown-item svg { flex-shrink: 0; color: var(--text-dim); }
      .dropdown-item:hover { background: var(--surface-2); }
      .dropdown-item-count { margin-left: auto; min-width: 22px; padding: 2px 7px; border-radius: 999px; color: var(--amber-ink); background: var(--amber); font-size: 11.5px; font-weight: 800; text-align: center; }
      .dropdown-item-danger, .dropdown-item-danger svg { color: #ff8e9c; }

      .verification-tag { display: inline-flex; align-items: center; gap: 6px; width: fit-content; padding: 4px 10px; border-radius: 999px; background: rgba(255, 255, 255, 0.07); font-size: 12px; font-weight: 700; }
      .verification-tag.status-verified { color: #62bdff; }
      .verification-tag.status-pending { color: var(--amber); }
      .verification-tag.status-rejected { color: var(--text-dim); }
      .verified-badge { flex-shrink: 0; }
      .verified-badge.verified { color: var(--verified); }
      .verified-badge.pending { color: var(--amber); }
      .verified-badge.rejected { color: var(--muted); }

      /* ---------------------------- BOTTOM NAV ----------------------------- */
      .bottom-nav {
        position: fixed;
        left: 0; right: 0; bottom: 0;
        z-index: 950;
        padding-bottom: env(safe-area-inset-bottom, 0px);
        background: rgba(13, 19, 32, 0.98);
        border-top: 1px solid var(--line);
      }
      .bottom-nav-scroll {
        width: min(100%, 520px);
        height: 64px;
        margin: 0 auto;
        padding: 0 6px;
        display: grid;
        grid-template-columns: 1fr 1fr 78px 1fr 1fr;
        align-items: center;
      }
      .bottom-nav-item {
        height: 100%;
        display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
        padding: 0;
        border: 0;
        color: var(--text-dim);
        background: transparent;
        font-size: 11.5px; font-weight: 600; line-height: 1;
        cursor: pointer;
        transition: color 160ms ease;
      }
      .bottom-nav-icon { width: 56px; height: 30px; display: grid; place-items: center; border-radius: 15px; transition: background 180ms ease, color 180ms ease; }
      .bottom-nav-item:hover { color: var(--text); }
      .bottom-nav-item.is-active { color: var(--text); font-weight: 700; }
      .bottom-nav-item.is-active .bottom-nav-icon { color: var(--amber); background: var(--amber-soft); }
      .bottom-nav-plus-wrap { display: grid; place-items: center; }
      .bottom-nav-plus {
        width: 56px; height: 56px;
        margin-top: -20px;
        display: grid; place-items: center;
        padding: 0;
        border: 4px solid var(--ink);
        border-radius: 22px;
        color: var(--amber-ink);
        background: var(--amber);
        box-shadow: 0 6px 18px rgba(255, 185, 56, 0.28);
        cursor: pointer;
        transition: transform 160ms ease, background 160ms ease;
      }
      .bottom-nav-plus:hover { background: var(--amber-strong); }
      .bottom-nav-plus:active { transform: scale(0.94); }

      /* ------------------------------- FEED -------------------------------- */
      .home-feed { width: min(100%, 520px); margin: 0 auto; padding: 0; }
      .service-reel-card {
        position: relative;
        isolation: isolate;
        width: 100%;
        height: var(--reel-h);
        min-height: 520px;
        margin: 0;
        overflow: hidden;
        background: var(--ink);
        scroll-snap-align: start;
        content-visibility: auto;
        contain-intrinsic-size: 360px 720px;
      }
      .service-reel-card .media-card,
      .service-reel-card .media-viewport,
      .service-reel-card .media-layer { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; border-radius: 0; }
      .media-layer { display: grid; place-items: center; overflow: hidden; background: #000; }
      .home-media { width: 100%; height: 100%; display: block; border: 0; object-position: center; background: #000; }
      .service-reel-card img.home-media, .service-reel-card video.home-media { position: absolute; inset: 0; z-index: 1; object-fit: cover; }
      .media-layer > iframe.home-media { position: absolute; inset: 0; width: 100%; height: 100%; min-width: 100%; min-height: 100%; }
      .embed-placeholder { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 24px; color: var(--text); background: var(--surface); text-align: center; }
      .embed-placeholder-icon { font-size: 44px; }

      .service-card-gradient {
        position: absolute; inset: 0; z-index: 20;
        pointer-events: none;
        background: linear-gradient(to bottom, rgba(13, 19, 32, 0.55) 0%, transparent 20%, transparent 46%, rgba(13, 19, 32, 0.6) 74%, rgba(13, 19, 32, 0.97) 100%);
      }

      .post-info-block { position: absolute; z-index: 40; left: 14px; right: 76px; bottom: 80px; max-height: min(34svh, 260px); }
      .post-provider-row { display: flex; align-items: flex-start; gap: 12px; min-width: 0; }
      .post-provider-copy { min-width: 0; flex: 1; padding-top: 1px; }
      .service-avatar-badge {
        --ring: var(--amber);
        position: relative;
        width: 46px; height: 46px; flex: 0 0 46px;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: var(--surface-2);
        box-shadow: 0 0 0 2px var(--ring), 0 0 0 4px rgba(13, 19, 32, 0.55);
        cursor: pointer;
      }
      .service-avatar-badge.status-verified { --ring: var(--verified); }
      .service-avatar-badge.status-rejected { --ring: var(--muted); }
      .service-avatar-badge img { width: 100%; height: 100%; display: block; object-fit: cover; border-radius: 50%; }
      .creator-name {
        max-width: 100%; min-width: 0;
        display: inline-flex; align-items: center; gap: 6px;
        margin: 0; padding: 0;
        border: 0;
        color: #fff;
        background: transparent;
        font-size: 15px; font-weight: 700; line-height: 1.25; text-align: left;
        text-shadow: 0 1px 6px rgba(0, 0, 0, 0.85);
        cursor: pointer;
      }
      .creator-name > span:first-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .verified-check-badge { width: 17px; height: 17px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 50%; color: #fff; background: var(--verified); }
      .service-name {
        margin: 4px 0 0;
        color: #fff;
        font-family: var(--font-display);
        font-size: 21px; font-weight: 700; line-height: 1.14; letter-spacing: -0.015em;
        text-shadow: 0 1px 8px rgba(0, 0, 0, 0.7);
        display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden;
      }
      .post-tagline-wrap { margin-top: 6px; }
      .post-tagline {
        margin: 0;
        color: rgba(255, 255, 255, 0.92);
        font-size: 13.5px; line-height: 1.42;
        text-shadow: 0 1px 5px rgba(0, 0, 0, 0.9);
        white-space: pre-line; overflow-wrap: anywhere;
        display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden;
      }
      .post-tagline.is-expanded { display: block; max-height: min(22svh, 170px); overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: rgba(255, 255, 255, 0.4) transparent; }
      .tagline-toggle-button { display: inline; margin: 0; padding: 0; border: 0; color: var(--amber); background: none; font-size: inherit; font-weight: 700; cursor: pointer; text-shadow: 0 1px 5px rgba(0, 0, 0, 0.9); }
      .description-link { color: var(--amber-strong); font-weight: 700; text-decoration: underline; text-decoration-color: rgba(255, 199, 102, 0.5); text-underline-offset: 2px; }
      .description-link:hover { text-decoration-color: var(--amber-strong); }
      .post-price { margin-top: 3px; color: var(--ok); font-size: 13px; font-weight: 700; text-shadow: 0 1px 5px rgba(0, 0, 0, 0.9); }
      .post-price-unit { color: rgba(61, 220, 151, 0.8); font-weight: 600; }

      .trade-skills-blocks { display: flex; flex-direction: column; gap: 6px; margin-top: 7px; }
      .trade-skill-block { display: flex; flex-direction: column; gap: 1px; }
      .trade-skill-label { color: var(--amber); font-size: 11.5px; font-weight: 700; text-shadow: 0 1px 5px rgba(0, 0, 0, 0.9); }
      .trade-skill-value { color: #fff; font-size: 13.5px; font-weight: 500; line-height: 1.35; overflow-wrap: anywhere; text-shadow: 0 1px 5px rgba(0, 0, 0, 0.9); }
      .trade-skills-fields { display: flex; flex-direction: column; gap: 12px; }
      .trade-skills-fields .form-field { display: flex; flex-direction: column; }

      .service-social-rail { position: absolute; z-index: 42; right: 12px; bottom: 92px; display: flex; flex-direction: column; align-items: center; gap: 16px; }
      .rail-action { width: 48px; min-height: 48px; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 0; border: 0; color: #fff; background: transparent; font-size: 12px; font-weight: 700; cursor: pointer; text-shadow: 0 1px 5px rgba(0, 0, 0, 0.9); }
      .rail-action:disabled { opacity: 0.75; cursor: wait; }
      .gold-star { color: var(--amber); fill: var(--amber); stroke: var(--amber-strong); filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.55)); transition: transform 180ms ease; }
      .star-action.is-active .gold-star { transform: scale(1.1); }
      .star-action.is-active:disabled { opacity: 1; cursor: default; }
      .star-action > span { color: #fff; font-size: 12px; font-weight: 700; line-height: 1; }

      .contact-me-cta {
        position: absolute; z-index: 44;
        left: 14px; right: 14px; bottom: 14px;
        height: 48px;
        display: flex; align-items: center; justify-content: center; gap: 9px;
        padding: 0 20px;
        border: 0;
        border-radius: var(--r-field);
        color: var(--amber-ink);
        background: var(--amber);
        font-size: 16px; font-weight: 700;
        cursor: pointer;
        transition: background 160ms ease, transform 160ms ease;
      }
      .contact-me-cta:hover { background: var(--amber-strong); }
      .contact-me-cta:active { transform: scale(0.985); }
      .contact-me-cta:has(~ .call-me-button) { right: 72px; }
      .call-me-button {
        position: absolute; z-index: 44;
        right: 14px; bottom: 14px;
        width: 48px; height: 48px;
        display: flex; align-items: center; justify-content: center;
        border: 1px solid var(--line-strong);
        border-radius: var(--r-field);
        color: #fff;
        background: rgba(21, 29, 46, 0.78);
        cursor: pointer;
        transition: background 160ms ease;
      }
      .call-me-button:hover { background: var(--surface-3); }

      .load-more-wrap { display: flex; justify-content: center; padding: 18px 0 28px; }
      .load-more-button { min-height: 46px; padding: 0 22px; border: 1px solid var(--line-strong); border-radius: 999px; color: var(--text); background: var(--surface); font-size: 14px; font-weight: 700; cursor: pointer; }
      .load-more-button:hover { background: var(--surface-2); }
      .load-more-button:disabled { opacity: 0.6; cursor: wait; }

      .loading-state, .empty-state, .coming-soon-panel {
        min-height: 70dvh;
        display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
        padding: calc(var(--top-offset) + 24px) 28px 40px;
        color: var(--text-dim);
        text-align: center;
      }
      .empty-state p, .coming-soon-panel p { max-width: 320px; margin: 0 0 10px; font-size: 15px; line-height: 1.5; }
      .coming-soon-panel h2 { margin: 0; color: var(--text); font-family: var(--font-display); font-size: 24px; }
      .empty-button { min-height: 48px; padding: 0 22px; border: 0; border-radius: var(--r-field); color: var(--amber-ink); background: var(--amber); font-size: 15px; font-weight: 700; cursor: pointer; }
      .empty-button:hover { background: var(--amber-strong); }
      .skeleton-card { pointer-events: none; background: var(--surface); }
      .skeleton-shimmer { position: absolute; inset: 0; background: linear-gradient(100deg, rgba(255, 255, 255, 0.02) 30%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.02) 70%); background-size: 200% 100%; animation: gwamoSkeletonShimmer 1.6s ease-in-out infinite; }
      @keyframes gwamoSkeletonShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

      .gwamo-toast {
        position: fixed; left: 50%; top: calc(var(--top-offset) + 8px);
        z-index: 10500;
        max-width: min(88vw, 380px);
        padding: 11px 18px;
        border: 1px solid var(--line-strong);
        border-radius: 999px;
        color: var(--text);
        background: var(--surface-2);
        box-shadow: 0 12px 34px rgba(0, 0, 0, 0.5);
        font-size: 14px; font-weight: 600; text-align: center;
        transform: translateX(-50%);
        animation: gwamoToastIn 220ms ease-out;
      }
      @keyframes gwamoToastIn { from { opacity: 0; transform: translate(-50%, -6px); } to { opacity: 1; transform: translate(-50%, 0); } }

      /* ------------------------ SHEETS, MODALS, FORMS ----------------------- */
      .modal-overlay { position: fixed; inset: 0; z-index: 10000; display: flex; align-items: flex-end; justify-content: center; padding: 0; background: rgba(6, 9, 16, 0.76); }
      .auth-modal-overlay { align-items: center; padding: 16px; }
      .modal-card {
        position: relative;
        width: 100%; max-width: 520px; max-height: 92dvh;
        overflow-y: auto; overscroll-behavior: contain;
        padding: 0 20px calc(24px + env(safe-area-inset-bottom, 0px));
        border: 1px solid var(--line);
        border-bottom: 0;
        border-radius: var(--r-sheet) var(--r-sheet) 0 0;
        color: var(--text);
        background: var(--surface);
        box-shadow: 0 -20px 60px rgba(0, 0, 0, 0.5);
      }
      .modal-card::before { content: ""; display: block; width: 40px; height: 4px; margin: 8px auto 0; border-radius: 2px; background: var(--line-strong); }
      .auth-modal-card { max-width: 420px; padding-bottom: 24px; border-bottom: 1px solid var(--line); border-radius: var(--r-sheet); }
      .auth-modal-card::before { display: none; }
      .modal-header { position: sticky; top: 0; z-index: 4; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 0 -20px 14px; padding: 14px 20px 12px; background: var(--surface); }
      .modal-header h2 { margin: 0; font-family: var(--font-display); font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
      .modal-header-note { margin: 4px 0 0; color: var(--text-dim); font-size: 12px; line-height: 1.4; }
      .modal-close { width: 38px; height: 38px; flex-shrink: 0; display: grid; place-items: center; padding: 0; border: 0; border-radius: 50%; color: var(--text); background: var(--surface-2); cursor: pointer; }
      .modal-close:hover { background: var(--surface-3); }

      .form-section { margin-bottom: 18px; }
      .form-section-last { margin-bottom: 0; }
      .section-heading { margin-bottom: 10px; color: var(--text); font-family: var(--font-display); font-size: 16px; font-weight: 700; }
      .modal-card label { display: block; margin: 0 0 7px; color: var(--text-dim); font-size: 13px; font-weight: 600; }
      .modal-card input, .modal-card textarea, .modal-card select {
        width: 100%; min-height: 50px;
        margin: 0 0 6px;
        padding: 13px 15px;
        border: 1px solid var(--line);
        border-radius: var(--r-field);
        outline: none;
        color: var(--text);
        background: var(--surface-2);
        font-size: 15px;
        transition: border-color 140ms ease, box-shadow 140ms ease;
      }
      .modal-card select { appearance: none; background-image: linear-gradient(45deg, transparent 50%, var(--text-dim) 50%), linear-gradient(135deg, var(--text-dim) 50%, transparent 50%); background-position: calc(100% - 20px) 22px, calc(100% - 14px) 22px; background-size: 6px 6px, 6px 6px; background-repeat: no-repeat; }
      .modal-card select option { color: #fff; background: var(--surface); }
      .modal-card textarea { min-height: 120px; line-height: 1.55; resize: vertical; }
      .modal-card input::placeholder, .modal-card textarea::placeholder { color: rgba(154, 166, 186, 0.7); opacity: 1; }
      .modal-card input:focus, .modal-card textarea:focus, .modal-card select:focus { border-color: var(--amber); box-shadow: 0 0 0 3px var(--amber-soft); }
      .field-help { margin: 0 0 16px; color: var(--text-dim); font-size: 12.5px; line-height: 1.5; }
      .two-field-row { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr); gap: 10px; }

      .post-type-section { padding-bottom: 6px; }
      .post-type-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
      .post-type-choice {
        min-height: 88px;
        display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: 3px;
        padding: 12px 14px;
        border: 1.5px solid var(--line);
        border-radius: var(--r-card);
        color: var(--text);
        background: var(--surface-2);
        text-align: left;
        cursor: pointer;
        transition: border-color 150ms ease, background 150ms ease;
      }
      .post-type-choice:hover { border-color: var(--line-strong); }
      .post-type-choice.is-selected { border-color: var(--amber); background: var(--amber-soft); }
      .post-type-icon { font-size: 20px; line-height: 1; }
      .post-type-choice strong { font-size: 14px; }
      .post-type-choice small { color: var(--text-dim); font-size: 11.5px; line-height: 1.35; }
      .choice-pill-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 16px; }
      .choice-pill { min-height: 40px; padding: 0 14px; border: 1.5px solid var(--line); border-radius: 999px; color: var(--text-dim); background: transparent; font-size: 13px; font-weight: 600; cursor: pointer; }
      .choice-pill.is-selected { color: var(--amber-ink); border-color: var(--amber); background: var(--amber); }

      .file-picker { min-height: 52px; display: flex !important; align-items: center; gap: 8px; padding: 12px 14px; border: 1.5px dashed var(--line-strong); border-radius: var(--r-field); color: var(--text); background: transparent; font-size: 14px; font-weight: 600; cursor: pointer; }
      .file-picker:hover { border-color: var(--amber); }
      .file-picker input { position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden; }
      .profile-photo-row { display: flex; align-items: center; gap: 14px; margin-bottom: 10px; }
      .profile-photo-preview { width: 68px; height: 68px; flex: 0 0 68px; display: grid; place-items: center; overflow: hidden; border-radius: 50%; color: var(--text-dim); background: var(--surface-2); }
      .profile-photo-preview img { width: 100%; height: 100%; object-fit: cover; }
      .profile-photo-actions { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 8px; }
      .profile-photo-picker { min-height: 44px; justify-content: center; }
      .profile-photo-remove { min-height: 40px; margin-top: 0; font-size: 13px; }
      .preview-wrap { margin: 10px 0 14px; }
      .media-preview { width: 100%; max-height: 220px; display: block; object-fit: contain; border: 1px solid var(--line); border-radius: var(--r-card); background: #000; }
      .logo-preview { width: 60px; height: 60px; display: block; object-fit: cover; border-radius: 50%; }

      .save-button, .cancel-button, .switch-mode-button, .danger-button { width: 100%; min-height: 52px; padding: 12px 16px; display: flex; align-items: center; justify-content: center; gap: 8px; border-radius: var(--r-field); font-size: 15.5px; font-weight: 700; cursor: pointer; transition: background 150ms ease, border-color 150ms ease; }
      .save-button { border: 0; color: var(--amber-ink); background: var(--amber); }
      .save-button:hover:not(:disabled) { background: var(--amber-strong); }
      .save-button:disabled { opacity: 0.6; cursor: wait; }
      .cancel-button { margin-top: 10px; border: 1px solid var(--line-strong); color: var(--text); background: transparent; }
      .cancel-button:hover { background: var(--surface-2); }
      .switch-mode-button { min-height: 44px; margin-top: 8px; border: 0; color: var(--amber); background: transparent; font-size: 14.5px; font-weight: 600; }
      .forgot-pin-button { width: 100%; min-height: 42px; margin-top: 6px; padding: 8px 12px; border: 0; color: var(--amber); background: transparent; font-size: 13.5px; font-weight: 600; cursor: pointer; }
      .forgot-pin-button:disabled { opacity: 0.55; cursor: wait; }
      .danger-button { min-height: 48px; margin-top: 6px; border: 1px solid rgba(255, 92, 112, 0.4); color: #ff8e9c; background: rgba(255, 92, 112, 0.08); font-size: 14.5px; }
      .danger-button:hover { background: rgba(255, 92, 112, 0.16); }
      .profile-danger-zone { margin-top: 24px; padding: 16px; border: 1px solid rgba(255, 92, 112, 0.28); border-radius: var(--r-card); background: rgba(255, 92, 112, 0.05); }
      .auth-error { margin: -2px 0 12px; color: #ff8e9c; font-size: 13px; font-weight: 600; }
      .auth-success-message { margin-bottom: 14px; padding: 11px 14px; border-radius: var(--r-field); color: #0a5c3c; background: #d9f7e8; font-size: 14px; font-weight: 600; text-align: center; }
      .auth-helper-text { display: block; margin-top: 8px; color: var(--text-dim); font-size: 12px; line-height: 1.45; }
      .account-status-row { margin-bottom: 16px; }
      .account-status-row .field-help { margin-top: 8px; margin-bottom: 0; }
      .pin-reset-card { max-width: 440px; }
      .pin-reset-intro { margin: 0 0 16px; color: var(--text-dim); font-size: 14px; line-height: 1.55; }
      .pin-verification-panel { display: flex; flex-direction: column; align-items: center; gap: 6px; margin: 4px 0 16px; padding: 20px; border: 1px solid var(--amber); border-radius: var(--r-card); background: var(--amber-soft); }
      .pin-verification-panel span { color: var(--text-dim); font-size: 13px; font-weight: 600; }
      .pin-verification-panel strong { color: var(--amber-strong); font-family: var(--font-display); font-size: clamp(32px, 10vw, 44px); font-variant-numeric: tabular-nums; letter-spacing: 0.14em; }

      .upload-progress-wrap { margin: 16px 0 10px; }
      .upload-progress-text { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; color: var(--text); font-size: 13px; font-weight: 600; }
      .upload-progress-track { width: 100%; height: 8px; overflow: hidden; border-radius: 999px; background: var(--surface-3); }
      .upload-progress-track span { display: block; height: 100%; border-radius: inherit; background: var(--amber); transition: width 180ms ease; }

      .mysheet-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 36px 10px; color: var(--text-dim); text-align: center; }
      .mysheet-empty p { margin: 0; line-height: 1.5; }
      .mytime-icon { color: var(--amber); }
      .myservices-list, .myinbox-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
      .myservice-row, .myinbox-row { display: flex; align-items: center; gap: 12px; padding: 11px; border: 1px solid var(--line); border-radius: var(--r-card); background: var(--surface-2); }
      .myservice-thumb { width: 54px; height: 54px; flex: 0 0 54px; object-fit: cover; border-radius: 12px; background: #000; }
      .myservice-info { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 3px; }
      .myservice-info strong { display: flex; align-items: center; gap: 6px; overflow: hidden; font-size: 14.5px; text-overflow: ellipsis; white-space: nowrap; }
      .myservice-info span { overflow: hidden; color: var(--text-dim); font-size: 12.5px; text-overflow: ellipsis; white-space: nowrap; }
      .myservice-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
      .myservice-actions button { width: 38px; height: 38px; display: grid; place-items: center; border: 0; border-radius: 10px; color: var(--text); background: var(--surface-3); cursor: pointer; }
      .myservice-actions .myservice-delete { color: #ff8e9c; background: rgba(255, 92, 112, 0.12); }
      .myinbox-search-wrap { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; padding: 0 14px; border: 1px solid var(--line); border-radius: var(--r-field); color: var(--text-dim); background: var(--surface-2); }
      .modal-card .myinbox-search { flex: 1; min-height: 46px; margin: 0; padding: 0; border: 0; border-radius: 0; background: transparent; box-shadow: none; font-size: 15px; }
      .myinbox-row { position: relative; width: 100%; color: var(--text); text-align: left; cursor: pointer; transition: background 140ms ease; }
      .myinbox-row:hover { background: var(--surface-3); }
      .myinbox-row.has-unread { border-color: rgba(255, 185, 56, 0.5); background: var(--amber-soft); }
      .myinbox-avatar { width: 44px; height: 44px; flex: 0 0 44px; display: block; overflow: hidden; border-radius: 50%; background: var(--surface-3); }
      .myinbox-avatar img { width: 100%; height: 100%; object-fit: cover; }
      .myinbox-main { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 2px; }
      .myinbox-name-row { display: flex; align-items: center; gap: 5px; }
      .myinbox-name-row strong { min-width: 0; overflow: hidden; font-size: 14.5px; text-overflow: ellipsis; white-space: nowrap; }
      .myinbox-verified { width: 14px; height: 14px; flex-shrink: 0; }
      .myinbox-time { margin-left: auto; flex-shrink: 0; color: var(--text-dim); font-size: 11px; font-weight: 600; }
      .myinbox-main small { overflow: hidden; color: var(--text-dim); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
      .myinbox-preview { color: rgba(243, 245, 249, 0.78) !important; }
      .myinbox-row.has-unread .myinbox-preview { color: #fff !important; font-weight: 600; }
      .myinbox-unread-badge { min-width: 22px; height: 22px; padding: 0 6px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border-radius: 999px; color: var(--amber-ink); background: var(--amber); font-size: 12px; font-weight: 800; }

      .info-modal-content { text-align: left; }
      .info-modal-lead { margin: 2px 0 10px; color: var(--text); font-family: var(--font-display); font-size: 22px; font-weight: 700; line-height: 1.2; letter-spacing: -0.02em; }
      .info-modal-body { margin: 0 0 16px; color: var(--text-dim); font-size: 15px; line-height: 1.65; }
      .info-modal-sections { display: grid; gap: 10px; margin: 4px 0 20px; }
      .info-modal-section { padding: 14px 16px; border-radius: var(--r-card); background: var(--surface-2); }
      .info-modal-section h3 { margin: 0 0 5px; color: var(--text); font-size: 15px; font-weight: 700; line-height: 1.3; }
      .info-modal-section p { margin: 0; color: var(--text-dim); font-size: 14px; line-height: 1.55; }

      .profile-sheet-card { max-width: 460px; }
      .profile-sheet-top { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; }
      .provider-sheet-avatar { --ring: var(--amber); width: 76px; height: 76px; flex: 0 0 76px; border-radius: 50%; box-shadow: 0 0 0 3px var(--ring), 0 0 0 6px var(--surface); }
      .provider-sheet-avatar.status-verified { --ring: var(--verified); }
      .provider-sheet-avatar.status-rejected { --ring: var(--muted); }
      .provider-sheet-avatar img { width: 100%; height: 100%; display: block; object-fit: cover; border-radius: 50%; }
      .profile-sheet-identity { min-width: 0; display: flex; flex-direction: column; gap: 6px; }
      .profile-sheet-identity h3 { margin: 0; overflow: hidden; font-family: var(--font-display); font-size: 21px; text-overflow: ellipsis; white-space: nowrap; }
      .profile-sheet-headline { margin: 0 0 8px; color: var(--text); font-size: 17px; font-weight: 700; }
      .profile-sheet-description { margin: 0 0 10px; color: var(--text-dim); font-size: 14.5px; line-height: 1.6; white-space: pre-wrap; }
      .profile-sheet-meta { margin: 0 0 18px; color: var(--text-dim); font-size: 12.5px; }
      .profile-sheet-actions { display: flex; flex-direction: column; gap: 10px; }
      .profile-sheet-actions .save-button, .profile-sheet-actions .cancel-button { margin-top: 0; }

      /* ----------------------------- PRIVATE CHAT ---------------------------- */
      .chat-modal-overlay { position: fixed; inset: 0; z-index: 9998; display: flex; align-items: flex-end; justify-content: center; background: rgba(6, 9, 16, 0.76); }
      .chat-modal { width: 100%; max-width: 500px; height: 88vh; height: 88dvh; max-height: 740px; display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--line); border-bottom: 0; border-radius: var(--r-sheet) var(--r-sheet) 0 0; color: var(--text); background: var(--surface); box-shadow: 0 -20px 60px rgba(0, 0, 0, 0.5); }
      .chat-header { flex-shrink: 0; display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid var(--line); background: var(--surface); }
      .chat-back { width: 38px; height: 38px; display: grid; place-items: center; border: 0; border-radius: 50%; color: var(--text); background: var(--surface-2); cursor: pointer; }
      .chat-header-avatar { width: 42px; height: 42px; flex: 0 0 42px; border-radius: 50%; object-fit: cover; background: var(--surface-2); }
      .chat-header div { min-width: 0; display: flex; flex-direction: column; }
      .chat-header-copy { flex: 1; }
      .chat-header-name { display: flex; align-items: center; gap: 5px; overflow: hidden; font-size: 16px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
      .chat-header-verified { width: 15px; height: 15px; flex-shrink: 0; }
      .chat-header small { color: var(--text-dim); font-size: 12.5px; }
      .chat-header .chat-privacy-note { margin-top: 3px; color: var(--text-dim); font-size: 10.5px; line-height: 1.3; white-space: normal; }
      .chat-messages { flex: 1; min-height: 0; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 6px; background: var(--ink); }
      .chat-date-separator { display: flex; justify-content: center; margin: 8px 0; }
      .chat-date-separator span { padding: 4px 12px; border-radius: 999px; color: var(--text-dim); background: var(--surface); font-size: 11.5px; font-weight: 600; }
      .chat-loading, .chat-empty { padding: 40px 0; color: var(--text-dim); text-align: center; }
      .chat-welcome { min-height: 100%; display: grid; place-items: center; align-content: center; gap: 8px; padding: 28px 18px; color: var(--text-dim); text-align: center; }
      .chat-welcome img { width: 68px; height: 68px; object-fit: cover; border-radius: 50%; box-shadow: 0 0 0 3px var(--amber); }
      .chat-welcome strong { color: var(--text); font-family: var(--font-display); font-size: 18px; }
      .chat-welcome p { max-width: 320px; margin: 0; font-size: 13.5px; line-height: 1.5; }
      .chat-message { max-width: 80%; padding: 9px 13px; border-radius: 18px; }
      .chat-message.sent { align-self: flex-end; border-bottom-right-radius: 5px; color: var(--amber-ink); background: var(--amber); }
      .chat-message.received { align-self: flex-start; border-bottom-left-radius: 5px; color: var(--text); background: var(--surface-2); }
      .chat-message.is-pending { opacity: 0.62; }
      .chat-message.is-failed { outline: 1.5px solid var(--bad); }
      .chat-message p { margin: 0; font-size: 15px; line-height: 1.4; white-space: pre-wrap; overflow-wrap: anywhere; }
      .chat-message img, .chat-message video { max-width: 100%; margin-bottom: 6px; border-radius: 12px; }
      .chat-image-attachment { cursor: zoom-in; }
      .chat-message audio { width: 100%; margin-bottom: 6px; }
      .chat-document-link { display: flex; align-items: center; gap: 9px; max-width: 100%; padding: 10px 12px; border-radius: 12px; color: inherit; background: rgba(255, 255, 255, 0.08); text-decoration: none; }
      .chat-message.sent .chat-document-link { background: rgba(27, 19, 3, 0.12); }
      .chat-document-link span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .chat-message time { display: flex; align-items: center; justify-content: flex-end; gap: 4px; margin-top: 3px; font-size: 10.5px; opacity: 0.65; }
      .chat-read-status { display: inline-flex; align-items: center; opacity: 0.8; }
      .chat-read-status.is-read { color: #7ee0ff; opacity: 1; }
      .chat-message.sent .chat-read-status.is-read { color: #0a4e8a; }
      .chat-new-messages-button { align-self: center; margin: 4px 0 8px; padding: 7px 16px; border: 0; border-radius: 999px; color: var(--amber-ink); background: var(--amber); font-size: 12.5px; font-weight: 700; cursor: pointer; animation: gwamoFadeIn 220ms ease-out; }
      @keyframes gwamoFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      .chat-retry-banner { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 16px; color: #ff8e9c; background: rgba(255, 92, 112, 0.12); font-size: 13px; font-weight: 600; }
      .chat-retry-banner button { border: 0; color: #ff8e9c; background: none; font-size: 13px; font-weight: 700; text-decoration: underline; cursor: pointer; }
      .chat-composer { flex-shrink: 0; display: flex; align-items: center; gap: 8px; padding: 10px 14px calc(10px + env(safe-area-inset-bottom, 0px)); border-top: 1px solid var(--line); background: var(--surface); }
      .chat-composer input { flex: 1; min-width: 0; padding: 11px 16px; border: 1px solid var(--line); border-radius: 999px; outline: none; color: var(--text); background: var(--surface-2); font-size: 15px; }
      .chat-composer input:focus { border-color: var(--amber); }
      .chat-send { width: 42px; height: 42px; flex-shrink: 0; display: grid; place-items: center; border: 0; border-radius: 50%; color: var(--amber-ink); background: var(--amber); cursor: pointer; }
      .chat-send:disabled { opacity: 0.45; cursor: not-allowed; }
      .chat-attach-wrap { position: relative; flex-shrink: 0; }
      .chat-attach-button { width: 42px; height: 42px; display: grid; place-items: center; border: 0; border-radius: 50%; color: var(--text); background: var(--surface-2); cursor: pointer; }
      .chat-attach-backdrop { position: fixed; inset: 0; z-index: 9; }
      .chat-attach-menu { position: absolute; bottom: 52px; left: 0; z-index: 10; min-width: 170px; padding: 6px; border: 1px solid var(--line-strong); border-radius: var(--r-card); background: var(--surface-2); box-shadow: 0 16px 34px rgba(0, 0, 0, 0.45); }
      .chat-attach-menu button { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 44px; padding: 0 12px; border: 0; border-radius: 10px; color: var(--text); background: transparent; font-size: 14.5px; cursor: pointer; }
      .chat-attach-menu button:hover { background: var(--surface-3); }

      .zoom-overlay { position: fixed; inset: 0; z-index: 11000; display: flex; align-items: center; justify-content: center; padding: max(20px, env(safe-area-inset-top)) 20px max(20px, env(safe-area-inset-bottom)); background: rgba(6, 9, 16, 0.92); cursor: zoom-out; animation: zoomOverlayIn 180ms ease-out; }
      .zoom-image-shell { width: min(92vw, 760px); height: min(82vh, 760px); display: grid; place-items: center; overflow: hidden; border-radius: 24px; background: #000; cursor: default; }
      .zoom-image { width: 100%; height: 100%; display: block; object-fit: contain; user-select: none; -webkit-user-drag: none; }
      .zoom-close-button { position: fixed; top: max(16px, env(safe-area-inset-top)); right: 16px; z-index: 11001; width: 46px; height: 46px; display: grid; place-items: center; padding: 0; border: 0; border-radius: 50%; color: #fff; background: rgba(30, 40, 64, 0.9); cursor: pointer; }
      @keyframes zoomOverlayIn { from { opacity: 0; } to { opacity: 1; } }
      .zoom-reset-button { position: fixed; left: 50%; bottom: max(24px, env(safe-area-inset-bottom)); z-index: 11001; min-height: 42px; padding: 0 18px; border: 0; border-radius: 999px; color: #fff; background: rgba(30, 40, 64, 0.92); font-size: 14px; font-weight: 700; transform: translateX(-50%); cursor: pointer; }

      /* -------------------------- TV MODE (immersive) ------------------------ */
      .home-page.is-tv-mode .home-feed { width: min(100%, 520px); }
      .home-page.is-tv-mode .service-reel-card .media-layer { background: radial-gradient(circle at 50% 42%, rgba(42, 163, 255, 0.12), transparent 62%), var(--surface); }
      .home-page.is-tv-mode .service-reel-card img.home-media,
      .home-page.is-tv-mode .service-reel-card video.home-media { object-fit: cover; object-position: center; background: transparent; }
      .tv-media-backdrop { position: absolute; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
      .tv-media-backdrop img, .tv-media-backdrop video { width: 100%; height: 100%; object-fit: cover; object-position: center; filter: blur(38px) saturate(1.15) brightness(0.58); transform: scale(1.18); }
      .tv-media-backdrop::after { content: ""; position: absolute; inset: 0; background: rgba(13, 19, 32, 0.3); }
      .home-page.is-tv-mode .media-layer > iframe.home-media {
        position: absolute; z-index: 1; top: 50%; left: 50%;
        width: calc(var(--reel-h) * 1.77778); height: var(--reel-h);
        min-width: 100%; min-height: 100%; max-width: none; max-height: none;
        transform: translate(-50%, -50%);
        border: 0; border-radius: 0;
      }
      @media (orientation: landscape) {
        .home-page.is-tv-mode .media-layer > iframe.home-media { width: 100vw; height: 56.25vw; }
      }
      .home-page.is-tv-mode .service-card-gradient { background: linear-gradient(to bottom, rgba(13, 19, 32, 0.5) 0%, transparent 22%, transparent 55%, rgba(13, 19, 32, 0.45) 78%, rgba(13, 19, 32, 0.92) 100%); }
      .home-page.is-tv-mode .post-info-block { left: 14px; right: 14px; bottom: 76px; max-height: min(26svh, 190px); }

      .tv-live-anchor { position: absolute; z-index: 45; top: calc(var(--top-offset) + 4px); left: 14px; display: inline-flex; align-items: center; gap: 8px; min-height: 26px; padding: 0 10px; border-radius: 999px; color: #fff; background: rgba(13, 19, 32, 0.55); font-size: 11px; font-weight: 800; letter-spacing: 0.04em; pointer-events: none; }
      .tv-live-anchor .tv-live-watchers { font-variant-numeric: tabular-nums; font-weight: 700; letter-spacing: 0; }
      .tv-live-dot { width: 7px; height: 7px; border-radius: 50%; background: #ff4560; animation: tvLivePulse 1.4s ease-in-out infinite; }
      @keyframes tvLivePulse { 0%, 100% { opacity: 0.55; transform: scale(0.85); } 50% { opacity: 1; transform: scale(1.15); } }

      .tv-conversation-column { position: absolute; z-index: 41; top: calc(var(--top-offset) + 42px); right: 76px; bottom: calc(86px + min(26svh, 190px)); left: 14px; overflow: hidden; pointer-events: none; transition: opacity 140ms ease; }
      .tv-conversation-column.is-hidden { visibility: hidden; opacity: 0; }
      .tv-conversation-column.is-hidden .tv-message-item { animation-play-state: paused; }
      .tv-message-item { position: absolute; left: 0; width: min(88%, 380px); display: grid; grid-template-columns: 32px minmax(0, 1fr); align-items: start; column-gap: 9px; padding: 0; opacity: 0; pointer-events: auto; cursor: pointer; will-change: transform, opacity; animation: tvMessageRise var(--tv-message-duration, 30s) linear var(--tv-message-delay, 0s) infinite both; }
      .tv-message-item.is-paused { animation-play-state: paused; }
      @keyframes tvMessageRise { 0% { opacity: 0; transform: translate3d(0, 18px, 0); } 14% { opacity: 0; transform: translate3d(0, 18px, 0); } 20% { opacity: 1; } 82% { opacity: 1; } 100% { opacity: 0; transform: translate3d(0, -72svh, 0); } }
      .tv-message-avatar { position: relative; width: 32px; height: 32px; margin-top: 3px; padding: 0; border: 0; border-radius: 50%; background: transparent; cursor: zoom-in; }
      .tv-message-avatar img { width: 100%; height: 100%; display: block; object-fit: cover; border-radius: 50%; border: 1.5px solid rgba(255, 255, 255, 0.7); }
      .tv-message-flag { position: absolute; right: -4px; bottom: -4px; width: 18px; height: 13px; display: grid; place-items: center; overflow: hidden; border: 0; border-radius: 2px; background: transparent; font-size: 13px; line-height: 1; }
      .tv-message-body { position: relative; min-width: 0; width: fit-content; max-width: 100%; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: 2px; padding: 5px 6px 6px 0; text-align: left; }
      .tv-message-name { order: 1; max-width: 100%; overflow: hidden; color: var(--tv-neon, #ffc766); font-size: 11.5px; font-weight: 800; line-height: 1.15; text-overflow: ellipsis; white-space: nowrap; text-shadow: 0 1px 2px #000, 0 2px 6px #000, 0 0 12px rgba(0, 0, 0, 0.9); }
      .tv-message-text { order: 2; max-width: 100%; color: #fff; font-size: 12.5px; font-weight: 520; line-height: 1.34; overflow-wrap: anywhere; text-shadow: 0 1px 2px #000, 0 2px 6px #000, 0 0 12px rgba(0, 0, 0, 0.9); display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; }
      .tv-message-paused-mark { position: absolute; top: -2px; right: -18px; color: rgba(255, 255, 255, 0.64); font-size: 9px; letter-spacing: -2px; }

      .tv-public-action-dock { position: absolute; z-index: 47; left: 14px; bottom: 14px; display: flex; align-items: center; gap: 8px; pointer-events: auto; }
      .tv-public-conversation-cta, .tv-visibility-toggle, .tv-private-contact-cta, .social-life-call-cta {
        position: relative;
        width: 48px; height: 48px;
        display: grid; place-items: center;
        padding: 0;
        border: 1px solid var(--line-strong);
        border-radius: var(--r-field);
        color: #fff;
        background: rgba(21, 29, 46, 0.78);
        cursor: pointer;
        transition: background 150ms ease;
      }
      .tv-public-conversation-cta { color: var(--amber-ink); border-color: transparent; background: var(--amber); animation: tvPublicCtaBreath 2.8s ease-in-out infinite; }
      .tv-public-conversation-cta:hover { background: var(--amber-strong); }
      .tv-public-conversation-bolt { color: var(--amber-ink); }
      @keyframes tvPublicCtaBreath { 0%, 100% { box-shadow: 0 0 0 0 rgba(255, 185, 56, 0.45); } 50% { box-shadow: 0 0 0 8px rgba(255, 185, 56, 0); } }
      .tv-visibility-toggle { width: 42px; height: 42px; border-radius: 50%; }
      .tv-visibility-toggle:hover, .tv-private-contact-cta:hover, .social-life-call-cta:hover { background: var(--surface-3); }
      .tv-public-conversation-cta.is-social-life { color: var(--amber-ink); background: var(--amber); }
      .tv-view-count { min-width: 42px; height: 42px; display: inline-flex; align-items: center; justify-content: center; gap: 4px; padding: 0 10px; border-radius: 999px; color: #fff; background: rgba(21, 29, 46, 0.78); font-size: 12px; font-weight: 700; line-height: 1; pointer-events: none; }
      .tv-private-contact-cta { position: absolute; z-index: 44; right: 14px; bottom: 14px; }
      .social-life-call-cta { position: absolute; z-index: 44; right: 14px; bottom: 72px; }

      .tv-typing-presence { position: absolute; left: 0; bottom: 56px; min-width: 82px; max-width: 170px; display: grid; grid-template-columns: 30px minmax(0, 1fr); grid-template-rows: auto auto; align-items: center; column-gap: 7px; padding: 5px 9px 5px 5px; border-radius: 999px; color: #fff; background: rgba(13, 19, 32, 0.6); pointer-events: auto; }
      .tv-typing-avatar { position: relative; grid-row: 1 / 3; width: 30px; height: 30px; padding: 0; border: 0; border-radius: 50%; background: transparent; cursor: zoom-in; }
      .tv-typing-avatar img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 1px solid rgba(255, 255, 255, 0.68); }
      .tv-typing-avatar span { position: absolute; right: -4px; bottom: -3px; font-size: 10px; }
      .tv-typing-presence strong { min-width: 0; overflow: hidden; font-size: 11px; line-height: 1.1; text-overflow: ellipsis; white-space: nowrap; }
      .tv-typing-dots { display: flex; align-items: center; gap: 3px; height: 10px; }
      .tv-typing-dots i { width: 4px; height: 4px; border-radius: 50%; background: var(--amber); animation: tvTypingDot 1s ease-in-out infinite; }
      .tv-typing-dots i:nth-child(2) { animation-delay: 0.14s; }
      .tv-typing-dots i:nth-child(3) { animation-delay: 0.28s; }
      @keyframes tvTypingDot { 0%, 70%, 100% { opacity: 0.3; transform: translateY(0); } 35% { opacity: 1; transform: translateY(-2px); } }

      .tv-chat-guide { position: absolute; z-index: 48; left: 14px; right: 14px; bottom: 74px; max-width: 520px; padding: 12px; border: 1px solid var(--line-strong); border-radius: var(--r-card); color: #fff; background: rgba(21, 29, 46, 0.96); box-shadow: 0 14px 34px rgba(0, 0, 0, 0.4); }
      .tv-chat-guide-head { display: flex; align-items: center; gap: 9px; }
      .tv-gwamo-orb { width: 32px; height: 32px; flex: 0 0 32px; display: grid; place-items: center; border-radius: 50%; color: var(--amber-ink); background: var(--amber); font-family: var(--font-display); font-size: 14px; font-weight: 800; }
      .tv-chat-guide-copy { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 1px; }
      .tv-chat-guide-copy strong { color: var(--amber); font-size: 11.5px; }
      .tv-chat-guide-copy span { color: #fff; font-size: 13px; font-weight: 600; line-height: 1.3; }
      .tv-guide-close, .tv-guide-symbol-button, .tv-guide-upload-symbol { display: grid; place-items: center; padding: 0; border: 0; color: #fff; background: transparent; cursor: pointer; }
      .tv-guide-close { width: 30px; height: 30px; flex: 0 0 30px; border-radius: 50%; color: var(--text-dim); }
      .tv-guide-reply-row, .tv-guide-message-row { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
      .tv-guide-input, .tv-country-search { min-width: 0; height: 38px; padding: 0 14px; border: 1px solid var(--line); border-radius: 999px; outline: none; color: #fff; background: var(--surface-2); font-size: 13px; }
      .tv-guide-input { flex: 1; }
      .tv-guide-input::placeholder, .tv-country-search::placeholder { color: rgba(154, 166, 186, 0.8); }
      .tv-guide-input:focus, .tv-country-search:focus { border-color: var(--amber); }
      .tv-guide-symbol-button { width: 38px; height: 38px; flex: 0 0 38px; border-radius: 50%; color: var(--amber-ink); background: var(--amber); }
      .tv-guide-symbol-button:disabled { opacity: 0.45; cursor: wait; }
      .tv-guide-photo-step { min-height: 70px; display: flex; align-items: center; justify-content: center; gap: 12px; padding: 11px 0 2px; }
      .tv-guide-photo-preview { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 1px solid rgba(255, 255, 255, 0.62); }
      .tv-guide-upload-symbol { position: relative; width: 48px; height: 48px; border: 1.5px dashed var(--amber); border-radius: 50%; background: var(--amber-soft); }
      .tv-guide-upload-symbol.is-busy { opacity: 0.55; cursor: wait; }
      .tv-guide-upload-symbol input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
      .tv-country-picker { margin-top: 10px; }
      .tv-country-search { width: 100%; margin-bottom: 8px; }
      .tv-country-list { max-height: min(34svh, 260px); display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; overflow-y: auto; overscroll-behavior: contain; padding-right: 2px; scrollbar-width: thin; }
      .tv-country-option { min-width: 0; min-height: 36px; display: flex; align-items: center; gap: 7px; padding: 5px 9px; border: 1px solid transparent; border-radius: 10px; color: #fff; background: var(--surface-2); text-align: left; cursor: pointer; }
      .tv-country-option:hover, .tv-country-option[aria-selected="true"] { border-color: var(--amber); background: var(--amber-soft); }
      .tv-country-option span:last-child { min-width: 0; overflow: hidden; font-size: 11.5px; text-overflow: ellipsis; white-space: nowrap; }
      .tv-country-flag { flex: 0 0 auto; font-size: 17px; line-height: 1; }
      .tv-guide-self-avatar { position: relative; width: 38px; height: 38px; flex: 0 0 38px; padding: 0; border: 0; border-radius: 50%; background: transparent; cursor: zoom-in; }
      .tv-guide-self-avatar img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 1px solid rgba(255, 255, 255, 0.62); }
      .tv-guide-self-avatar span { position: absolute; right: -4px; bottom: -3px; font-size: 10px; }
      .tv-composer-error { margin-top: 8px; padding: 6px 10px; border-radius: 8px; color: #ff9ba7; background: rgba(255, 92, 112, 0.12); font-size: 11.5px; font-weight: 600; }

      /* ------------------------------ RESPONSIVE ----------------------------- */
      @media (max-width: 380px) {
        .feedx-logo { font-size: 25px; }
        .service-name { font-size: 19px; }
        .bottom-nav-icon { width: 48px; }
      }
      @media (min-width: 700px) {
        .home-feed, .home-page.is-tv-mode .home-feed { border-left: 1px solid var(--line); border-right: 1px solid var(--line); }
      }
      @media (prefers-reduced-motion: reduce) {
        .skeleton-shimmer, .tv-live-dot, .tv-typing-dots i, .tv-public-conversation-cta, .gwamo-toast, .chat-new-messages-button { animation: none; }
        .tv-message-item { animation-duration: 48s; }
        .home-page * { transition-duration: 0.01ms !important; }
      }
      @media (prefers-reduced-data: reduce) {
        .tv-media-backdrop img, .tv-media-backdrop video { filter: none; }
      }
    `}</style>
  );
}
const HomeStyles = memo(HomeStylesInner);
HomeStyles.displayName = "HomeStyles";
export default Home;