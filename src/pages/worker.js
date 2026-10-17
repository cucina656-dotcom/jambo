/**
 * Time Market + legacy FeedX Home Worker
 * Preserves legacy Home.jsx routes and adds Time Market provider/login/chat APIs
 *
 * Required bindings:
 *   DB -> Cloudflare D1 database
 *   MEDIA_BUCKET or BUCKET -> Cloudflare R2 bucket
 *
 * Required encrypted secrets (set in Worker Settings > Variables and Secrets):
 *   ADMIN_PIN -> at least 8 characters; the insecure value "101" is rejected
 *   KING_PIN -> separate at least 8-character secret for /api/king/* Connect admin
 *   CONNECT_VIDEO_PIN -> separate PIN required whenever Connect video is added/changed
 *   PIN_PEPPER -> long random secret used in addition to each user's PIN salt
 *   MEDIA_SIGNING_KEY -> long random secret for private chat attachment links
 *
 * Optional variables/bindings:
 *   PRIVATE_MEDIA_BUCKET -> separate private R2 bucket for chat (recommended)
 *   ANALYTICS_HASH_KEY -> secret used to pseudonymize view-deduplication data
 *   PUBLIC_MEDIA_BASE -> public post media only; never expose the private bucket
 *   CHAT_ROOMS -> Durable Object namespace bound to ConversationRoom
 *
 * Durable Object wrangler configuration (required only for instant WebSockets):
 *   [[durable_objects.bindings]]
 *   name = "CHAT_ROOMS"
 *   class_name = "ConversationRoom"
 *
 *   [[migrations]]
 *   tag = "v1"
 *   new_sqlite_classes = ["ConversationRoom"]
 */
 
const DEFAULT_PAGE_LIMIT = 5;
const MAX_PAGE_LIMIT = 20;
const MAX_COMMENT_LENGTH = 500;
const TV_MESSAGE_MAX_LENGTH = 220;
const TV_RECENT_MESSAGE_LIMIT = 30;
const TV_WATCHING_WINDOW_MS = 40 * 1000;
const TV_WATCHING_BROADCAST_MS = 5 * 1000;
const MAX_WATCH_SECONDS_PER_REQUEST = 30;
const VIEW_DEDUP_WINDOW_MS = 30 * 60 * 1000;
 
const MAX_PROFILE_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_POST_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_CHAT_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_CHAT_AUDIO_BYTES = 20 * 1024 * 1024;
const MAX_CHAT_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_CHAT_DOCUMENT_BYTES = 15 * 1024 * 1024;
const MAX_CHAT_TEXT_LENGTH = 4000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PIN_PATTERN = /^\d{8}$/;
const PIN_AUTH_METHOD = "phone_pin";
const PBKDF2_ITERATIONS = 100_000;
const LOGIN_FAILURE_LIMIT = 5;
const LOGIN_LOCK_MS = 15 * 60 * 1000;
const PHONE_REVIEW_TTL_MS = 48 * 60 * 60 * 1000;
// Generous window: approval itself can take up to about a day, then the
// person still needs time to notice the call/SMS and come back to enter it.
const ACTIVATION_CODE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PIN_RESET_TTL_MS = 30 * 60 * 1000;
const PIN_RESET_RECOVERY_TTL_MS = 10 * 60 * 1000;
const REALTIME_TICKET_TTL_MS = 60 * 1000;
const PRIVATE_MEDIA_URL_TTL_SECONDS = 10 * 60;
const CONNECT_LIST_LIMIT = 30;
const CONNECT_MESSAGE_MAX_LENGTH = 1200;
const CONNECT_NAME_MAX_LENGTH = 80;
const CONNECT_LOCATION_MAX_LENGTH = 120;
const CONNECT_OWNER_TOKEN_BYTES = 24;
const CONNECT_MEMBER_TOKEN_BYTES = 24;
const CONNECT_LIVE_ACTIVE_WINDOW_MS = 2 * 60 * 1000;
const CONNECT_LIVE_RING_TIMEOUT_MS = 45 * 1000;
const CONNECT_LIVE_ITEM_IDS = new Set([
  "tomatoes",
  "cooking-oil",
  "onions",
  "bell-pepper",
  "fresh-beans",
  "rice",
  "potatoes",
  "sweet-potatoes",
  "cassava",
  "chilli",
  "avocado",
  "sugar",
  "salt",
  "matches",
  "dodo-greens",
  "isombe",
  "cassava-ugali",
  "maize-flour",
  "nido",
  "milk-products",
  "inyange-products",
  "bicycle-delivery",
  "driver-delivery",
  "send-abroad",
  "buy-plot",
  "buy-land",
  "rent-house",
  "buy-house",
  "loan",
  "find-job",  "offer-job",
  "deal",
  "favor-exchange",
  "cook-order",
  "irembo",
  "rib",
  "medicine-help",
  "mbaza",
  "quit-drugs",
  "reconcile",
  "advice",
  "entertainment",
  "talk-person-99",
  "private-question-99",
  "match-need-99",
  "electronic-device",
  "app-website-help",
  "technology-device-help",
  "welder",
  "builder",
  "construction-helper",
  "electrician",
  "mechanic",
  "buy-bicycle",
  "buy-motorcycle",
  "buy-car",
]);
const CONNECT_ROOM_STATUSES = new Set([
  "team_forming",
  "talking",
  "ready_to_meet",
  "meeting_planned",
  "closed",
]);
const CONNECT_ITEM_STATUSES = new Set([
  "active",
  "paused",
  "matched",
  "closed",
  "hidden",
]);
const LOVE_HEARTS = new Set(["💛", "🧡", "💚", "💙", "💜", "🤍"]);
const LOVE_GENDERS = new Set(["woman", "man"]);
 
const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
 
const ALLOWED_VIDEO_MIME = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);
 
const ALLOWED_DOCUMENT_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-zip-compressed",
]);
 
const ALLOWED_DOCUMENT_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "txt",
  "csv",
  "zip",
]);
 
const memoryRateBuckets = new Map();
 
// FIX: the schema used to be (re)verified on every single /api/ request -
// ~20 sequential D1 statements (CREATE TABLE / PRAGMA table_info / ALTER
// TABLE) running before register, login, or anything else could execute.
// Under any real traffic that's slow and occasionally throws mid-batch,
// which shows up as random 500s on exactly the routes people hit first
// (register/login). We now run it once per warm isolate and cache the
// promise so every request after the first just awaits the same result.
let schemaReadyPromise = null;
 
function corsHeaders(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Admin-Pin, X-King-Pin, X-Connect-Video-Pin, X-Mission-Member-Token, X-Gwamo-Visitor-Token",    "Access-Control-Max-Age": "86400",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    ...extra,
  };
}
 
function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders({
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders,
    }),
  });
}
 
function errorResponse(message, status = 400, extra = {}) {
  return jsonResponse(
    {
      success: false,
      error: message,
      message,
      ...extra,
    },
    status
  );
}
 
function nowIso() {
  return new Date().toISOString();
}
 
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
 
function getBucket(env) {
  return env.MEDIA_BUCKET || env.BUCKET || null;
}
 
function getPrivateMediaBucket(env) {
  return env.PRIVATE_MEDIA_BUCKET || getBucket(env);
}
 
function checkRateLimit(key, limit, windowMs) {
  const now = Date.now();
  const oldBucket = memoryRateBuckets.get(key) || [];
  const recent = oldBucket.filter((time) => now - time < windowMs);
 
  if (recent.length >= limit) {
    memoryRateBuckets.set(key, recent);
    return false;
  }
 
  recent.push(now);
  memoryRateBuckets.set(key, recent);
  return true;
}
 
function normalizeWhatsAppNumber(value = "") {
  const compact = String(value || "")
    .trim()
    .replace(/[\s().-]/g, "");
 
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
 
const COUNTRY_CODE_FLAGS = [
  { code: "250", flag: "🇷🇼" },
  { code: "257", flag: "🇧🇮" },
  { code: "256", flag: "🇺🇬" },
  { code: "254", flag: "🇰🇪" },
  { code: "255", flag: "🇹🇿" },
  { code: "243", flag: "🇨🇩" },
  { code: "251", flag: "🇪🇹" },
  { code: "234", flag: "🇳🇬" },
  { code: "233", flag: "🇬🇭" },
  { code: "971", flag: "🇦🇪" },
  { code: "44", flag: "🇬🇧" },  { code: "33", flag: "🇫🇷" },
  { code: "32", flag: "🇧🇪" },
  { code: "27", flag: "🇿🇦" },
  { code: "91", flag: "🇮🇳" },
  { code: "86", flag: "🇨🇳" },
  { code: "49", flag: "🇩🇪" },
  { code: "1", flag: "🌎" },
];
 
function flagForNormalizedNumber(number) {
  const match = [...COUNTRY_CODE_FLAGS]
    .sort((a, b) => b.code.length - a.code.length)
    .find((entry) => number.startsWith(entry.code));
 
  return match ? match.flag : "🌍";
}
 
function validSubmittedCountryFlag(value = "") {
  const flag = String(value || "").trim();
  if (!flag || flag === "🌍") return "";
 
  // A country flag is exactly two Unicode regional-indicator symbols.
  return /^\p{Regional_Indicator}{2}$/u.test(flag) ? flag : "";
}
 
// A real ISO 3166-1 alpha-2 country code, e.g. "RW", "UG", "KE" - the
// frontend computes/displays the flag from this, never from a submitted
// emoji, so only the code itself needs validating here.
function normalizeCountryCode(value = "") {
  const code = String(value || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : "";
}
 
// Strips control characters and caps length. XSS is primarily prevented on
// the frontend by rendering this as plain text (React escapes it
// automatically) rather than HTML, but stripping control characters here
// is cheap defense-in-depth against garbled/hostile input either way.
function sanitizeTvMessage(value = "") {
  return String(value || "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, TV_MESSAGE_MAX_LENGTH);
}
 
// TV public-conversation identity is presentation-only. It never changes the
// authenticated provider account used for ownership, moderation, or private chat.
function normalizeTvDisplayName(value = "") {
  return String(value || "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 50);
}
 
function normalizeTvProfileImage(value = "") {
  const url = String(value || "").trim().slice(0, 2048);
  if (!url) return "";
 
  // Home.jsx uploads the TV badge through /api/home/upload with
  // kind=profile_image. Accept only one of those managed public R2 objects;
  // arbitrary remote image URLs are not trusted as TV identity photos.
  const key = managedMediaKeyFromUrl(url);
  return key.startsWith("feedx/profile_image/") ? url : "";
}
 
function normalizeFullName(value = "") {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 120);
}
 
function normalizeServiceName(value = "") {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 120);
}
 
function normalizeServiceList(value = "") {
  return String(value || "")
    .split(/[\n,;|]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 30)
    .join(", ");
}
 
function normalizeVerificationStatus(value = "") {
  const status = String(value || "").trim().toLowerCase();
  if (status === "verified" || status === "approved") return "verified";
  if (status === "rejected" || status === "blocked") return "rejected";
  return "pending";
}
 
function normalizePostType(value = "") {
  const type = String(value || "").trim().toLowerCase();
  return ["offer", "need", "exchange", "moment"].includes(type)
    ? type
    : "offer";}
 
function makeSessionToken() {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
}
 
async function hashToken(token) {
  const bytes = new TextEncoder().encode(String(token || ""));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
 
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
 
function bytesToHex(value) {
  return Array.from(new Uint8Array(value))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
 
function randomHex(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}
 
function randomVerificationCode() {
  const range = 1_000_000;
  const ceiling = Math.floor(0x1_0000_0000 / range) * range;
  const bytes = new Uint32Array(1);
  let value;
 
  do {
    crypto.getRandomValues(bytes);
    value = bytes[0];
  } while (value >= ceiling);
 
  return String(value % range).padStart(6, "0");
}
 
// Used only when an admin approves a PIN reset: an unpredictable 8-digit PIN
// generated server-side so nobody (including the requesting user) has to
// invent one. It is hashed immediately and returned in the API response
// exactly once, for the admin to read out on the call or send by SMS - it is
// never stored or logged in plaintext anywhere after that response is sent.
function randomPin() {
  const range = 100_000_000; // 10^8 possible 8-digit PINs, including leading zeros
  const ceiling = Math.floor(0x1_0000_0000 / range) * range;
  const bytes = new Uint32Array(1);
  let value;
 
  do {
    crypto.getRandomValues(bytes);
    value = bytes[0];
  } while (value >= ceiling);
 
  return String(value % range).padStart(8, "0");
}
 
function constantTimeEqual(left, right) {
  const a = String(left || "");
  const b = String(right || "");
  const length = Math.max(a.length, b.length);
  let different = a.length ^ b.length;
 
  for (let index = 0; index < length; index += 1) {
    different |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
 
  return different === 0;
}
 
function getPinPepper(env) {
  return String(env.PIN_PEPPER || "").trim();
}
 
function hasSecurePinConfiguration(env) {
  return getPinPepper(env).length >= 32;
}
 
async function derivePinHash(pin, salt, iterations, pepper) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(`${pin}:${pepper}`),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
 
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256  );
 
  return bytesToHex(bits);
}
 
async function createPinRecord(pin, env) {
  const salt = randomHex(16);
  const iterations = PBKDF2_ITERATIONS;
  const hash = await derivePinHash(
    pin,
    salt,
    iterations,
    getPinPepper(env)
  );
 
  return { hash, salt, iterations };
}
 
async function verifyProviderPin(provider, pin, env) {
  if (!provider?.pin_hash || !provider?.pin_salt) return false;
 
  const iterations = clamp(
    Number(provider.pin_iterations || PBKDF2_ITERATIONS),
    100_000,
    2_000_000
  );
 
  const candidate = await derivePinHash(
    pin,
    provider.pin_salt,
    iterations,
    getPinPepper(env)
  );
 
  return constantTimeEqual(candidate, provider.pin_hash);
}
 
async function hashVerificationSecret(secret, context, env) {
  return hashToken(
    `${context}:${String(secret || "")}:${getPinPepper(env)}`
  );
}
 
async function hmacHex(secret, value) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(value)
  );
  return bytesToHex(signature);
}
 
function getClientIp(request) {
  return String(
    request.headers.get("CF-Connecting-IP") ||
      request.headers.get("X-Forwarded-For") ||
      "unknown"
  )
    .split(",")[0]
    .trim();
}
 
function getAdminPin(env) {
  const pin = String(env.ADMIN_PIN || "").trim();
  if (pin === "101" || pin.length < 8) return "";
  return pin;
}
 
    function getRomanticPin(env) {
      const pin = String(env.ROMANTIC_PIN || "").trim();
      // Must be at least 4 characters and not the classic weak default.
      if (pin.length < 4 || pin === "101" || pin === "1234") return "";
      return pin;
    }

    function authorizeRomanticRequest(request, env, fallback = "") {
      const configured = getRomanticPin(env);
      if (!configured) {
        return errorResponse(
          "ROMANTIC_PIN is not configured or is too weak. Set a secret of at least 4 characters (not 101 or 1234) in Worker Settings.",
          503
        );
      }

      const credential = adminPinFromRequest(request, fallback);
      if (constantTimeEqual(credential, configured)) return null;

      const allowed = checkRateLimit(
        `romantic-auth:${getClientIp(request)}`,
        8,
        15 * 60_000
      );

      return errorResponse(
        allowed
          ? "Invalid Romantic Stories PIN."
          : "Too many invalid PIN attempts. Try again in 15 minutes.",
        allowed ? 403 : 429
      );
    }

function validateAdminPin(value, env) {
  const configured = getAdminPin(env);
  return Boolean(configured) && constantTimeEqual(String(value || ""), configured);
}
 
function adminPinFromRequest(request, fallback = "") {
  const header = String(request.headers.get("X-Admin-Pin") || "").trim();
  if (header) return header;
 
  const authorization = String(
    request.headers.get("Authorization") || ""
  ).trim();
  const bearer = /^Bearer\s+(.+)$/i.exec(authorization);
  if (bearer?.[1]) return bearer[1].trim();
 
  return String(fallback || "");
}
 
function requireAdminConfiguration(env) {
  if (getAdminPin(env)) return null;
  return errorResponse(
    'ADMIN_PIN is missing or insecure. Save a secret of at least 8 characters; the old value "101" is disabled.',
    503
  );}
 
function authorizeAdminRequest(request, env, fallback = "") {
  const configError = requireAdminConfiguration(env);
  if (configError) return configError;
 
  const credential = adminPinFromRequest(request, fallback);
  if (validateAdminPin(credential, env)) return null;
 
  const allowed = checkRateLimit(
    `admin-auth:${getClientIp(request)}`,
    5,
    15 * 60_000
  );
 
  return errorResponse(
    allowed
      ? "Invalid admin PIN."
      : "Too many invalid admin attempts. Try again after 15 minutes.",
    allowed ? 403 : 429
  );
}
 
 
function getKingPin(env) {
  const pin = String(env.KING_PIN || "").trim();
  if (pin.length < 8 || pin === "101") return "";
  return pin;
}
 
function getConnectVideoPin(env) {
  const pin = String(env.CONNECT_VIDEO_PIN || "").trim();
  return pin.length >= 3 ? pin : "";
}
 
function headerOrBearerCredential(request, headerName, fallback = "") {
  const header = String(request.headers.get(headerName) || "").trim();
  if (header) return header;
  const authorization = String(
    request.headers.get("Authorization") || ""
  ).trim();
  const bearer = /^Bearer\s+(.+)$/i.exec(authorization);
  if (bearer?.[1]) return bearer[1].trim();
  return String(fallback || "").trim();
}
 
function authorizeKingRequest(request, env, fallback = "") {
  const configured = getKingPin(env);
  if (!configured) {
    return errorResponse(
      "KING_PIN is missing or insecure. Configure a separate secret of at least 8 characters.",
      503
    );
  }
 
  const credential = headerOrBearerCredential(
    request,
    "X-King-Pin",
    fallback
  );
 
  if (constantTimeEqual(credential, configured)) return null;
 
  const allowed = checkRateLimit(
    `king-auth:${getClientIp(request)}`,
    5,
    15 * 60_000
  );
 
  return errorResponse(
    allowed
      ? "Invalid King PIN."
      : "Too many invalid King PIN attempts. Try again after 15 minutes.",
    allowed ? 403 : 429
  );
}
 
function authorizeConnectVideoRequest(request, env, fallback = "") {
  const configured = getConnectVideoPin(env);
  if (!configured) {
    return errorResponse(
      "CONNECT_VIDEO_PIN is not configured.",
      503
    );
  }
 
  const credential = headerOrBearerCredential(
    request,
    "X-Connect-Video-Pin",
    fallback
  );
 
  if (constantTimeEqual(credential, configured)) return null;
 
  const allowed = checkRateLimit(
    `connect-video-auth:${getClientIp(request)}`,
    8,
    15 * 60_000
  );
   return errorResponse(
    allowed ? "Wrong video PIN." : "Too many invalid video PIN attempts.",
    allowed ? 403 : 429
  );
}
 
function normalizeConnectType(value = "") {
  const type = String(value || "").trim().toLowerCase();
  return ["love", "walk", "money"].includes(type) ? type : "";
}
 
function sanitizeConnectText(value = "", maxLength = 200) {
  return String(value || "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}
 
function sanitizeConnectMessage(value = "") {
  return String(value || "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, CONNECT_MESSAGE_MAX_LENGTH);
}
 
function normalizeConnectUrl(value = "") {
  const raw = String(value || "").trim().slice(0, 2048);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return url.toString();
  } catch {
    return "";
  }
}
 
function parseJsonObject(value, fallback = {}) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  try {
    const parsed = JSON.parse(String(value || ""));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : fallback;
  } catch {
    return fallback;
  }
}
 
function makeConnectToken(byteLength = CONNECT_OWNER_TOKEN_BYTES) {
  return `${crypto.randomUUID()}${randomHex(byteLength)}`.replace(/-/g, "");
}
 
async function connectOwnerTokenMatches(item, token) {
  if (!item?.owner_token_hash || !token) return false;
  const candidate = await hashToken(String(token));
  return constantTimeEqual(candidate, item.owner_token_hash);
}
 
function publicConnectItem(item) {
  if (!item) return null;
  const publicData = parseJsonObject(item.public_data_json, {});
  return {
    id: String(item.id),
    connect_type: item.connect_type,
    creator_name: item.creator_name || "",
    creator_photo_url: item.creator_photo_url || "",
    location: item.location || "",
    video_url: item.video_url || "",
    music_url: item.music_url || "",
    status: item.status || "active",
    public_data: publicData,
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
  };
}
 
function adminConnectItem(item) {
  if (!item) return null;
  return {
    ...publicConnectItem(item),
    creator_provider_id: item.creator_provider_id || null,
    creator_whatsapp: item.creator_whatsapp || "",
    creator_photo_key: item.creator_photo_key || null,
    video_key: item.video_key || null,
    group_url: item.group_url || "",
    admin_note: item.admin_note || "",
    private_data: parseJsonObject(item.private_data_json, {}),
  };
}
 
async function getConnectItemById(db, id) {
  return await db
    .prepare(`SELECT * FROM connect_items WHERE id = ? LIMIT 1`)
    .bind(String(id || "").trim())
    .first();
} 
async function getMoneyRoomByMissionId(db, missionId) {
  return await db
    .prepare(`
      SELECT *
      FROM connect_money_rooms
      WHERE item_id = ?
      LIMIT 1
    `)
    .bind(String(missionId || "").trim())
    .first();
}
 
function missionMemberTokenFromRequest(request, fallback = "") {
  const header = String(
    request.headers.get("X-Mission-Member-Token") || ""
  ).trim();
  return header || String(fallback || "").trim();
}
 
async function getMoneyMemberByToken(db, roomId, rawToken) {
  const token = String(rawToken || "").trim();
  if (!token) return null;
  const tokenHash = await hashToken(token);
  return await db
    .prepare(`
      SELECT *
      FROM connect_money_members
      WHERE room_id = ? AND token_hash = ?
      LIMIT 1
    `)
    .bind(roomId, tokenHash)
    .first();
}
 
function connectStatus(value = "") {
  const clean = String(value || "").trim().toLowerCase();
  return CONNECT_ITEM_STATUSES.has(clean) ? clean : "";
}
 
function roomStatus(value = "") {
  const clean = String(value || "").trim().toLowerCase();
  return CONNECT_ROOM_STATUSES.has(clean) ? clean : "";
}
 
function normalizedLoveHeart(value = "") {
  const heart = String(value || "").trim();
  return LOVE_HEARTS.has(heart) ? heart : "";
}

function normalizedLoveGender(value = "") {
  const gender = String(value || "").trim().toLowerCase();
  return LOVE_GENDERS.has(gender) ? gender : "";
}
 
function safeConnectArray(value, maxItems = 12, maxLength = 160) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, maxItems)
    .map((item) => sanitizeConnectText(item, maxLength))
    .filter(Boolean);
}
 
function readBearerToken(request) {
  const header = String(request.headers.get("Authorization") || "");
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : "";
}
 
async function getAuthenticatedProvider(request, env) {
  const token = readBearerToken(request);
  if (!token) return null;
 
  const tokenHash = await hashToken(token);
 
  const row = await env.DB
    .prepare(`
      SELECT
        s.id AS session_id,
        s.provider_id,
        s.expires_at,
        p.*
      FROM time_market_sessions s
      JOIN time_market_providers p ON p.id = s.provider_id
      WHERE s.token_hash = ?
      LIMIT 1
    `)
    .bind(tokenHash)
    .first();
 
  if (!row) return null;
 
  const expiresAt = Date.parse(row.expires_at || "");
 
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    await env.DB
      .prepare(`DELETE FROM time_market_sessions WHERE id = ?`)
      .bind(row.session_id)
      .run();
 
    return null;
  }
 
  await env.DB
    .prepare(`      UPDATE time_market_sessions
      SET last_used_at = ?
      WHERE id = ?
    `)
    .bind(nowIso(), row.session_id)
    .run();
 
  return row;
}
 
function publicProvider(provider) {
  if (!provider) return null;
 
  const verificationStatus = normalizeVerificationStatus(
    provider.verification_status
  );
 
  return {
    id: String(provider.id),
    full_name: provider.full_name || "",
    phone: provider.phone || "",
    service_provider_name: provider.service_provider_name || "",
    services_offered: provider.services_offered || "",
    profile_image_url: provider.profile_image_url || "",
    verification_status: verificationStatus,
    verified: verificationStatus === "verified",
    badge: verificationStatus === "verified" ? "green" : "red",
    account_status: provider.account_status || "active",
    auth_method: PIN_AUTH_METHOD,
    pin_set: Boolean(provider.pin_hash),
    phone_verified: Boolean(provider.phone_verified_at),
    phone_verified_at: provider.phone_verified_at || null,
    requires_admin_approval:
      (provider.account_status || "active") === "pending_phone_review",
    created_at: provider.created_at || null,
    updated_at: provider.updated_at || null,
  };
}
 
function adminProvider(provider) {
  return {
    ...publicProvider(provider),
    verification_note: provider.verification_note || "",
    verified_at: provider.verified_at || null,
    phone_verification_expires_at:
      provider.phone_verification_expires_at || null,
    failed_login_attempts: Number(provider.failed_login_attempts || 0),
    login_locked_until: provider.login_locked_until || null,
  };
}
 
async function getProviderByPhone(db, phone) {
  return await db
    .prepare(`
      SELECT *
      FROM time_market_providers
      WHERE phone = ?
      LIMIT 1
    `)
    .bind(phone)
    .first();
}
 
async function getProviderById(db, providerId) {
  return await db
    .prepare(`
      SELECT *
      FROM time_market_providers
      WHERE id = ?
      LIMIT 1
    `)
    .bind(providerId)
    .first();
}
 
async function createProviderSession(env, providerId) {
  const token = makeSessionToken();
  const tokenHash = await hashToken(token);
  const sessionId = crypto.randomUUID();
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
 
  await env.DB.batch([
    env.DB
      .prepare(`DELETE FROM time_market_sessions WHERE expires_at <= ?`)
      .bind(createdAt),
    env.DB
      .prepare(`
        INSERT INTO time_market_sessions (
          id,
          provider_id,
          token_hash,
          created_at,
          last_used_at,
          expires_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .bind(
        sessionId,        providerId,
        tokenHash,
        createdAt,
        createdAt,
        expiresAt
      ),
    env.DB
      .prepare(`
        DELETE FROM time_market_sessions
        WHERE provider_id = ?
          AND id NOT IN (
            SELECT id
            FROM time_market_sessions
            WHERE provider_id = ?
            ORDER BY datetime(created_at) DESC
            LIMIT 10
          )
      `)
      .bind(providerId, providerId),
  ]);
 
  return {
    token,
    expires_at: expiresAt,
  };
}
 
async function requireProvider(request, env) {
  const provider = await getAuthenticatedProvider(request, env);
 
  if (!provider) {
    return {
      provider: null,
      response: errorResponse("Please login first.", 401),
    };
  }
 
  if ((provider.account_status || "active") !== "active") {
    return {
      provider: null,
      response: errorResponse("This account is not active.", 403),
    };
  }
 
  return {
    provider,
    response: null,
  };
}
 
async function conversationParticipant(db, conversationId, providerId) {
  const row = await db
    .prepare(`
      SELECT *
      FROM time_market_conversations
      WHERE id = ?
        AND (provider_id = ? OR customer_provider_id = ?)
      LIMIT 1
    `)
    .bind(conversationId, providerId, providerId)
    .first();
 
  return row || null;
}
 
async function deleteConversationMessageMedia(env, conversationId) {
  const result = await env.DB
    .prepare(`
      SELECT media_key
      FROM time_market_messages
      WHERE conversation_id = ?
        AND media_key IS NOT NULL
        AND media_key != ''
    `)
    .bind(conversationId)
    .all();
 
  for (const row of result.results || []) {
    await deleteR2Key(env, row.media_key);
  }
}
 
async function deletePostWithRelations(env, post) {
  if (!post?.id) return;
  const postId = String(post.id);
  const conversations = await env.DB
    .prepare(`SELECT id FROM time_market_conversations WHERE service_post_id = ?`)
    .bind(postId)
    .all();
 
  for (const conversation of conversations.results || []) {
    await deleteConversationMessageMedia(env, conversation.id);
    await env.DB
      .prepare(`DELETE FROM time_market_messages WHERE conversation_id = ?`)
      .bind(conversation.id)
      .run();
  }
 
  await env.DB.batch([
    env.DB      .prepare(`DELETE FROM time_market_conversations WHERE service_post_id = ?`)
      .bind(postId),
    env.DB.prepare(`DELETE FROM home_comments WHERE post_id = ?`).bind(postId),
    env.DB.prepare(`DELETE FROM home_reactions WHERE post_id = ?`).bind(postId),
    env.DB
      .prepare(`DELETE FROM feedx_post_analytics WHERE post_id = ?`)
      .bind(postId),
    env.DB
      .prepare(`DELETE FROM feedx_view_sessions WHERE post_id = ?`)
      .bind(postId),
    env.DB.prepare(`DELETE FROM feedx_posts WHERE id = ?`).bind(postId),
  ]);
 
  await deleteR2Key(env, post.logo_key);
  await deleteR2Key(env, post.media_key);
}
 
function getExtension(filename = "") {
  const parts = String(filename).split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}
 
function safeFileName(filename = "file") {
  return String(filename)
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);
}
 
function detectCreatorType(value = "") {
  const clean = String(value || "").trim().toLowerCase();
 
  if (!clean) return "";
 
  if (
    clean.startsWith("http://") ||
    clean.startsWith("https://") ||
    clean.includes(".")
  ) {
    return "website";
  }
 
  return "whatsapp";
}
 
function buildDestinationUrl(type = "", value = "") {
  const clean = String(value || "").trim();
 
  if (!clean) return "";
 
  if (type === "website") {
    return clean.startsWith("http://") || clean.startsWith("https://")
      ? clean
      : `https://${clean}`;
  }
 
  const normalized = normalizeWhatsAppNumber(clean);
 
  return normalized ? `https://wa.me/${normalized}` : "";
}
 
function validateUpload(file, kind) {
  if (!file || typeof file.size !== "number" || file.size <= 0) {
    return {
      valid: false,
      message: "No valid file was received.",
    };
  }
 
  if (kind === "profile_image") {
    if (!ALLOWED_IMAGE_MIME.has(file.type)) {
      return {
        valid: false,
        message: "Profile photo must be JPG, PNG, WebP, or GIF.",
      };
    }
 
    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      return {
        valid: false,
        message: "Profile photo must be smaller than 2 MB.",
      };
    }
 
    return { valid: true };
  }
 
  if (kind === "post_image") {
    if (!ALLOWED_IMAGE_MIME.has(file.type)) {
      return {
        valid: false,
        message: "Post image must be JPG, PNG, WebP, or GIF.",
      };
    }
 
    if (file.size > MAX_POST_IMAGE_BYTES) {
      return {
        valid: false,
        message: "Post image must be smaller than 6 MB.",
      };    }
 
    return { valid: true };
  }
 
  if (kind === "video") {
    if (!ALLOWED_VIDEO_MIME.has(file.type)) {
      return {
        valid: false,
        message: "Video must be MP4, WebM, or MOV.",
      };
    }
 
    if (file.size > MAX_VIDEO_BYTES) {
      return {
        valid: false,
        message: "Video must be smaller than 100 MB.",
      };
    }
 
    return { valid: true };
  }
 
  if (kind === "chat_image") {
    if (!ALLOWED_IMAGE_MIME.has(file.type)) {
      return {
        valid: false,
        message: "Chat image must be JPG, PNG, WebP, or GIF.",
      };
    }
 
    if (file.size > MAX_CHAT_IMAGE_BYTES) {
      return {
        valid: false,
        message: "Chat image must be smaller than 6 MB.",
      };
    }
 
    return { valid: true };
  }
 
  if (kind === "chat_audio") {
    if (!String(file.type || "").startsWith("audio/")) {
      return {
        valid: false,
        message: "Voice message must be an audio file.",
      };
    }
 
    if (file.size > MAX_CHAT_AUDIO_BYTES) {
      return {
        valid: false,
        message: "Voice message must be smaller than 20 MB.",
      };
    }
 
    return { valid: true };
  }
 
  if (kind === "chat_video") {
    if (!ALLOWED_VIDEO_MIME.has(file.type)) {
      return {
        valid: false,
        message: "Chat video must be MP4, WebM, or MOV.",
      };
    }
 
    if (file.size > MAX_CHAT_VIDEO_BYTES) {
      return {
        valid: false,
        message: "Chat video must be smaller than 100 MB.",
      };
    }
 
    return { valid: true };
  }
 
  if (kind === "chat_document") {
    const extension = getExtension(file.name || "");
    const submittedType = String(file.type || "").toLowerCase();
    const allowedType = ALLOWED_DOCUMENT_MIME.has(
      submittedType
    );
    const allowedExtension = ALLOWED_DOCUMENT_EXTENSIONS.has(extension);
    const genericType =
      !submittedType || submittedType === "application/octet-stream";
 
    if ((!allowedType && !genericType) || !allowedExtension) {
      return {
        valid: false,
        message:
          "Document must be PDF, Word, Excel, PowerPoint, TXT, CSV, or ZIP.",
      };
    }
 
    if (file.size > MAX_CHAT_DOCUMENT_BYTES) {
      return {
        valid: false,
        message: "Document must be smaller than 15 MB.",
      };    }
 
    return { valid: true };
  }
 
      if (kind === "romantic_photo") {
        if (!ALLOWED_IMAGE_MIME.has(file.type)) {
          return {
            valid: false,
            message: "Couple photo must be JPG, PNG, WebP, or GIF.",
          };
        }
        if (file.size > MAX_POST_IMAGE_BYTES) {
          return {
            valid: false,
            message: "Couple photo must be smaller than 6 MB.",
          };
        }
        return { valid: true };
      }

      if (kind === "romantic_song") {
        const submittedType = String(file.type || "").toLowerCase();
        const extension = getExtension(file.name || "");
        const allowedExtension = ["mp3", "m4a", "aac", "ogg", "wav"].includes(extension);
        const allowedType =
          submittedType.startsWith("audio/") ||
          !submittedType ||
          submittedType === "application/octet-stream";

        if (!allowedType || !allowedExtension) {
          return {
            valid: false,
            message: "Song must be MP3, M4A, AAC, OGG, or WAV.",
          };
        }
        if (file.size > MAX_CHAT_AUDIO_BYTES) {
          return {
            valid: false,
            message: "Song must be smaller than 20 MB.",
          };
        }
        return { valid: true };
      }

  return {
    valid: false,
    message: "Unknown upload type.",
  };
}
 
function getPublicMediaBase(request, env) {
  const configured = String(env.PUBLIC_MEDIA_BASE || "").trim();
 
  if (configured) {
    return configured.replace(/\/$/, "");
  }
 
  return new URL(request.url).origin;
}
 
function buildPublicMediaUrl(request, env, key) {
  return `${getPublicMediaBase(request, env)}/${key}`;
}
 
function managedMediaKeyFromUrl(value = "") {
  try {
    const pathname = new URL(String(value)).pathname.replace(/^\/+/, "");
    return pathname.startsWith("feedx/") || pathname.startsWith("time-market/")
      ? decodeURIComponent(pathname)
      : "";
  } catch {
    return "";
  }
}
 
async function uploadFile(request, env, file, kind) {
  const bucket = kind.startsWith("chat_")
    ? getPrivateMediaBucket(env)
    : getBucket(env);
 
  if (!bucket) {
    throw new Error(
      "R2 binding is missing. Add MEDIA_BUCKET or BUCKET to this Worker."
    );
  }
 
  const validation = validateUpload(file, kind);
 
  if (!validation.valid) {
    throw new Error(validation.message);
  }
 
  const extension =
    getExtension(file.name || "") ||
    (file.type === "image/webp"
      ? "webp"
      : file.type === "image/png"
      ? "png"
      : file.type === "image/gif"
      ? "gif"
      : file.type === "video/webm"
      ? "webm"
      : file.type === "video/quicktime"
      ? "mov"
      : file.type.startsWith("video/")
      ? "mp4"
      : "jpg");
 
  const originalName = safeFileName(
    file.name || `upload.${extension}`
  );
 
  const prefix = kind.startsWith("chat_")
    ? "time-market/chat"
    : "feedx";
 
  const key =
    `${prefix}/${kind}/${Date.now()}-` +
    `${crypto.randomUUID()}-${originalName}`;
 
  await bucket.put(key, await file.arrayBuffer(), {
    httpMetadata: {
      contentType: file.type || "application/octet-stream",
      cacheControl: kind.startsWith("chat_")
        ? "private, no-store"
        : "public, max-age=31536000, immutable",
    },
  });
 
  return {
    key,
    url: buildPublicMediaUrl(request, env, key),
  };
}
 
function getPrivateMediaSecret(env) {
  const secret = String(env.MEDIA_SIGNING_KEY || "").trim();
  return secret.length >= 32 ? secret : "";
} 
async function buildPrivateMessageMediaUrl(request, env, message) {
  if (!message?.media_key) return message?.media_url || "";
 
  const secret = getPrivateMediaSecret(env);
  if (!secret) return "";
 
  const expires =
    Math.floor(Date.now() / 1000) + PRIVATE_MEDIA_URL_TTL_SECONDS;
  const payload = `${message.id}\n${message.media_key}\n${expires}`;
  const signature = await hmacHex(secret, payload);
  const url = new URL("/api/time-market/message-media", request.url);
  url.searchParams.set("message_id", String(message.id));
  url.searchParams.set("expires", String(expires));
  url.searchParams.set("signature", signature);
  return url.toString();
}
 
async function mapMessageForResponse(request, env, message) {
  if (!message) return null;
 
  return {
    ...message,
    media_url: await buildPrivateMessageMediaUrl(request, env, message),
    sent_at: message.created_at || null,
    delivered: Boolean(message.delivered_at),
    read: Boolean(message.read_at),
  };
}
 
async function deleteR2Key(env, key) {
  const bucket = String(key || "").startsWith("time-market/chat/")
    ? getPrivateMediaBucket(env)
    : getBucket(env);
 
  if (!bucket || !key) return;
 
  try {
    await bucket.delete(key);
  } catch (error) {
    console.warn("Could not delete R2 object:", key, error);
  }
}
 
async function addMissingColumns(db, tableName, columns) {
  const info = await db
    .prepare(`PRAGMA table_info(${tableName})`)
    .all();
 
  const existing = new Set(
    (info.results || []).map((column) => column.name)
  );
 
  for (const [name, definition] of columns) {
    if (!existing.has(name)) {
      try {
        await db
          .prepare(
            `ALTER TABLE ${tableName} ADD COLUMN ${name} ${definition}`
          )
          .run();
      } catch (error) {
        const message = String(error?.message || error).toLowerCase();
        if (!message.includes("duplicate column")) throw error;
      }
    }
  }
}
 
async function ensureConversationUniqueness(db) {
  const duplicates = await db
    .prepare(`
      SELECT service_post_id, provider_id, customer_provider_id
      FROM time_market_conversations
      GROUP BY service_post_id, provider_id, customer_provider_id
      HAVING COUNT(*) > 1
    `)
    .all();
 
  for (const group of duplicates.results || []) {
    const rows = await db
      .prepare(`
        SELECT id
        FROM time_market_conversations
        WHERE service_post_id = ?
          AND provider_id = ?
          AND customer_provider_id = ?
        ORDER BY datetime(created_at) ASC, id ASC
      `)
      .bind(
        group.service_post_id,
        group.provider_id,
        group.customer_provider_id
      )
      .all();
 
    const [keeper, ...extras] = rows.results || [];
    if (!keeper) continue;
 
    for (const duplicate of extras) {      await db.batch([
        db
          .prepare(`
            UPDATE time_market_messages
            SET conversation_id = ?
            WHERE conversation_id = ?
          `)
          .bind(keeper.id, duplicate.id),
        db
          .prepare(`DELETE FROM time_market_conversations WHERE id = ?`)
          .bind(duplicate.id),
      ]);
    }
 
    await db
      .prepare(`
        UPDATE time_market_conversations
        SET last_message_at = (
              SELECT MAX(created_at)
              FROM time_market_messages
              WHERE conversation_id = ?
            ),
            updated_at = COALESCE(
              (
                SELECT MAX(created_at)
                FROM time_market_messages
                WHERE conversation_id = ?
              ),
              updated_at
            )
        WHERE id = ?
      `)
      .bind(keeper.id, keeper.id, keeper.id)
      .run();
  }
 
  await db
    .prepare(`
      CREATE UNIQUE INDEX IF NOT EXISTS
        idx_time_market_conversations_unique_participants
      ON time_market_conversations(
        service_post_id,
        provider_id,
        customer_provider_id
      )
    `)
    .run();
}
 
async function ensureSchema(db) {
  // FIX: feedx_posts must exist before time_market_conversations, which has
  // a FOREIGN KEY(service_post_id) REFERENCES feedx_posts(id). SQLite does
  // not strictly require this ordering, but some D1 builds are stricter
  // about forward references than plain SQLite is - creating dependencies
  // first removes that whole class of failure instead of hoping it's fine.
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS feedx_posts (
        id TEXT PRIMARY KEY,
        creator_name TEXT NOT NULL DEFAULT '',
        creator_identity TEXT NOT NULL DEFAULT '',
        creator_type TEXT NOT NULL DEFAULT '',
        title TEXT NOT NULL DEFAULT '',
        subtitle TEXT NOT NULL DEFAULT '',
        logo_url TEXT NOT NULL DEFAULT '',
        logo_key TEXT,
        media_url TEXT NOT NULL DEFAULT '',
        media_key TEXT,
        media_type TEXT NOT NULL DEFAULT '',
        destination_url TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'approved',
        post_type TEXT NOT NULL DEFAULT 'offer',
        service_name TEXT NOT NULL DEFAULT '',
        service_category TEXT NOT NULL DEFAULT '',
        location TEXT NOT NULL DEFAULT '',
        availability TEXT NOT NULL DEFAULT '',
        price_unit TEXT NOT NULL DEFAULT '',
        exchange_offer TEXT NOT NULL DEFAULT '',
        exchange_need TEXT NOT NULL DEFAULT '',
        allow_cash_balance INTEGER NOT NULL DEFAULT 1,
        moment_kind TEXT NOT NULL DEFAULT '',
        provider_id TEXT,
        service_charge_per_minute TEXT NOT NULL DEFAULT '',
        work_description TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `),
 
    db.prepare(`
      CREATE TABLE IF NOT EXISTS feedx_post_analytics (
        post_id TEXT PRIMARY KEY,
        watch_seconds INTEGER NOT NULL DEFAULT 0,
        iframe_exposure_seconds INTEGER NOT NULL DEFAULT 0,
        last_watched_at TEXT,
        real_views INTEGER NOT NULL DEFAULT 0,
        manual_views INTEGER NOT NULL DEFAULT 0,
        real_reactions INTEGER NOT NULL DEFAULT 0,
        manual_reactions INTEGER NOT NULL DEFAULT 0,
        envelope_clicks INTEGER NOT NULL DEFAULT 0,        last_envelope_clicked_at TEXT,
        updated_at TEXT
      )
    `),
 
    db.prepare(`
      CREATE TABLE IF NOT EXISTS home_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id TEXT NOT NULL,
        commenter_phone TEXT NOT NULL,
        country_flag TEXT NOT NULL DEFAULT '🌍',
        comment TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `),
 
    db.prepare(`
      CREATE TABLE IF NOT EXISTS home_reactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id TEXT NOT NULL,
        phone TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(post_id, phone)
      )
    `),
 
    db.prepare(`
      CREATE TABLE IF NOT EXISTS feedx_view_sessions (
        post_id TEXT NOT NULL,
        viewer_hash TEXT NOT NULL,
        window_key TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (post_id, viewer_hash, window_key)
      )
    `),
 
    // Public, ephemeral-on-screen (but persisted) TV conversation - fully
    // separate from the private Time Market messaging tables above. Reads
    // are public; only sending requires an authenticated provider (see
    // handlePostTvConversation).
    db.prepare(`
      CREATE TABLE IF NOT EXISTS tv_conversations (
        id TEXT PRIMARY KEY,
        tv_post_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL DEFAULT '',
        profile_image TEXT NOT NULL DEFAULT '',
        country_code TEXT NOT NULL DEFAULT '',
        message TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `),
 
    db.prepare(`
      CREATE TABLE IF NOT EXISTS tv_realtime_tickets (
        id TEXT PRIMARY KEY,
        token_hash TEXT NOT NULL UNIQUE,
        tv_post_id TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        used_at TEXT,
        created_at TEXT NOT NULL
      )
    `),
 
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_feedx_posts_created
      ON feedx_posts(created_at DESC)
    `),
 
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_home_comments_post
      ON home_comments(post_id, created_at DESC)
    `),
 
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_home_reactions_post
      ON home_reactions(post_id)
    `),
 
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_feedx_view_sessions_created
      ON feedx_view_sessions(created_at)
    `),
 
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_tv_conversations_post
      ON tv_conversations(tv_post_id, created_at DESC)
    `),
 
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_tv_realtime_tickets_hash
      ON tv_realtime_tickets(token_hash)
    `),
  ]);
 

      // Romantic Stories — couples storybook + background songs. Stored in the
      // worker (not the browser) so they survive a page refresh. Images and
      // songs go into R2 (MEDIA_BUCKET), never as transient blob: URLs.
      await db.batch([
        db.prepare(`
          CREATE TABLE IF NOT EXISTS romantic_couples (
            id TEXT PRIMARY KEY,
            names TEXT NOT NULL DEFAULT '',
            whatsapp TEXT NOT NULL DEFAULT '',
            flag TEXT NOT NULL DEFAULT '',
            image_url TEXT NOT NULL DEFAULT '',
            image_key TEXT,
            created_at TEXT NOT NULL
          )
        `),

        db.prepare(`
          CREATE TABLE IF NOT EXISTS romantic_songs (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL DEFAULT '',
            url TEXT NOT NULL DEFAULT '',
            r2_key TEXT,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
          )
        `),

        db.prepare(`
          CREATE TABLE IF NOT EXISTS romantic_playback (
            id TEXT PRIMARY KEY,
            song_index INTEGER NOT NULL DEFAULT 0,
            sound_on INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT NOT NULL
          )
        `),

        db.prepare(`
          CREATE INDEX IF NOT EXISTS idx_romantic_couples_created
          ON romantic_couples(created_at ASC)
        `),

        db.prepare(`
          CREATE INDEX IF NOT EXISTS idx_romantic_songs_order
          ON romantic_songs(sort_order ASC, created_at ASC)
        `),
      ]);

      await db
        .prepare(`
          INSERT INTO romantic_playback (id, song_index, sound_on, updated_at)
          VALUES ('global', 0, 0, ?)
          ON CONFLICT(id) DO NOTHING
        `)
        .bind(nowIso())
        .run();



  // Time Market tables (provider/session tables have no dependencies;
  // conversations/messages depend on feedx_posts + providers, both now created).
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS time_market_providers (        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        phone TEXT NOT NULL UNIQUE,
        service_provider_name TEXT NOT NULL DEFAULT '',
        services_offered TEXT NOT NULL DEFAULT '',
        profile_image_url TEXT NOT NULL DEFAULT '',
        verification_status TEXT NOT NULL DEFAULT 'pending',
        verification_note TEXT NOT NULL DEFAULT '',
        verified_at TEXT,
        account_status TEXT NOT NULL DEFAULT 'pending_phone_review',
        pin_hash TEXT,
        pin_salt TEXT,
        pin_iterations INTEGER NOT NULL DEFAULT 100000,
        pin_set_at TEXT,
        phone_verification_code_hash TEXT,
        phone_verification_expires_at TEXT,
        phone_verified_at TEXT,
        failed_login_attempts INTEGER NOT NULL DEFAULT 0,
        login_locked_until TEXT,
        profile_image_key TEXT,
        activation_code_hash TEXT,
        activation_code_expires_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `),
 
    db.prepare(`
      CREATE TABLE IF NOT EXISTS time_market_sessions (
        id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        last_used_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        FOREIGN KEY (provider_id)
          REFERENCES time_market_providers(id)
          ON DELETE CASCADE
      )
    `),
 
    db.prepare(`
      CREATE TABLE IF NOT EXISTS time_market_conversations (
        id TEXT PRIMARY KEY,
        service_post_id TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        customer_provider_id TEXT NOT NULL,
        last_message_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (service_post_id)
          REFERENCES feedx_posts(id)
          ON DELETE CASCADE,
        FOREIGN KEY (provider_id)
          REFERENCES time_market_providers(id)
          ON DELETE CASCADE,
        FOREIGN KEY (customer_provider_id)
          REFERENCES time_market_providers(id)
          ON DELETE CASCADE
      )
    `),
 
    db.prepare(`
      CREATE TABLE IF NOT EXISTS time_market_messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        sender_provider_id TEXT NOT NULL,
        message_type TEXT NOT NULL DEFAULT 'text',
        text_content TEXT NOT NULL DEFAULT '',
        media_url TEXT NOT NULL DEFAULT '',
        media_key TEXT,
        file_name TEXT NOT NULL DEFAULT '',
        file_size INTEGER NOT NULL DEFAULT 0,
        mime_type TEXT NOT NULL DEFAULT '',
        delivered_at TEXT,
        read_at TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (conversation_id)
          REFERENCES time_market_conversations(id)
          ON DELETE CASCADE,
        FOREIGN KEY (sender_provider_id)
          REFERENCES time_market_providers(id)
          ON DELETE CASCADE
      )
    `),
 
    db.prepare(`
      CREATE TABLE IF NOT EXISTS time_market_pin_resets (
        id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL,
        phone TEXT NOT NULL,
        verification_code_hash TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        recovery_token_hash TEXT,
        expires_at TEXT NOT NULL,
        recovery_expires_at TEXT,
        approved_at TEXT,
        rejected_at TEXT,
        used_at TEXT,
        attempts INTEGER NOT NULL DEFAULT 0,        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (provider_id)
          REFERENCES time_market_providers(id)
          ON DELETE CASCADE
      )
    `),
 
    db.prepare(`
      CREATE TABLE IF NOT EXISTS time_market_realtime_tickets (
        id TEXT PRIMARY KEY,
        token_hash TEXT NOT NULL UNIQUE,
        conversation_id TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        used_at TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (conversation_id)
          REFERENCES time_market_conversations(id)
          ON DELETE CASCADE,
        FOREIGN KEY (provider_id)
          REFERENCES time_market_providers(id)
          ON DELETE CASCADE
      )
    `),
 
    db.prepare(`
      CREATE INDEX IF NOT EXISTS
        idx_time_market_sessions_token_hash
      ON time_market_sessions(token_hash)
    `),
 
    db.prepare(`
      CREATE INDEX IF NOT EXISTS
        idx_time_market_conversations_service_post
      ON time_market_conversations(service_post_id)
    `),
 
    db.prepare(`
      CREATE INDEX IF NOT EXISTS
        idx_time_market_conversations_provider
      ON time_market_conversations(provider_id)
    `),
 
    db.prepare(`
      CREATE INDEX IF NOT EXISTS
        idx_time_market_conversations_customer
      ON time_market_conversations(customer_provider_id)
    `),
 
    db.prepare(`
      CREATE INDEX IF NOT EXISTS
        idx_time_market_messages_conversation
      ON time_market_messages(conversation_id)
    `),
 
    db.prepare(`
      CREATE INDEX IF NOT EXISTS
        idx_time_market_messages_sender
      ON time_market_messages(sender_provider_id)
    `),
 
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_time_market_pin_resets_provider
      ON time_market_pin_resets(provider_id, created_at DESC)
    `),
 
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_time_market_pin_resets_status
      ON time_market_pin_resets(status, created_at DESC)
    `),
 
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_time_market_realtime_tickets_hash
      ON time_market_realtime_tickets(token_hash)
    `),
  ]);
 
 
  // Gwamo Connect tables. These are intentionally separate from Time Market
  // and from /api/admin so the /king experience can evolve independently.
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS connect_items (
        id TEXT PRIMARY KEY,
        connect_type TEXT NOT NULL,
        creator_provider_id TEXT,
        creator_name TEXT NOT NULL DEFAULT '',
        creator_whatsapp TEXT NOT NULL DEFAULT '',
        creator_photo_url TEXT NOT NULL DEFAULT '',
        creator_photo_key TEXT,
        location TEXT NOT NULL DEFAULT '',
        video_url TEXT NOT NULL DEFAULT '',
        video_key TEXT,
        music_url TEXT NOT NULL DEFAULT '',
        group_url TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'active',
        admin_note TEXT NOT NULL DEFAULT '',
        public_data_json TEXT NOT NULL DEFAULT '{}',
        private_data_json TEXT NOT NULL DEFAULT '{}',        owner_token_hash TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `),
 
    db.prepare(`
      CREATE TABLE IF NOT EXISTS connect_walk_interests (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        member_provider_id TEXT,
        member_name TEXT NOT NULL DEFAULT '',
        member_whatsapp TEXT NOT NULL DEFAULT '',
        member_photo_url TEXT NOT NULL DEFAULT '',
        member_photo_key TEXT,
        member_token_hash TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'joined',
        created_at TEXT NOT NULL,
        FOREIGN KEY (item_id)
          REFERENCES connect_items(id)
          ON DELETE CASCADE
      )
    `),
 
    db.prepare(`
      CREATE TABLE IF NOT EXISTS connect_money_rooms (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'team_forming',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (item_id)
          REFERENCES connect_items(id)
          ON DELETE CASCADE
      )
    `),
 
    db.prepare(`
      CREATE TABLE IF NOT EXISTS connect_money_members (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'viewer',
        provider_id TEXT,
        name TEXT NOT NULL DEFAULT '',
        whatsapp TEXT NOT NULL DEFAULT '',
        photo_url TEXT NOT NULL DEFAULT '',
        photo_key TEXT,
        token_hash TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        FOREIGN KEY (room_id)
          REFERENCES connect_money_rooms(id)
          ON DELETE CASCADE
      )
    `),
 
    db.prepare(`
      CREATE TABLE IF NOT EXISTS connect_money_messages (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        member_id TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (room_id)
          REFERENCES connect_money_rooms(id)
          ON DELETE CASCADE,
        FOREIGN KEY (member_id)
          REFERENCES connect_money_members(id)
          ON DELETE CASCADE
      )
    `),
 
    db.prepare(`
      CREATE TABLE IF NOT EXISTS connect_money_events (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        event_type TEXT NOT NULL DEFAULT 'update',
        text TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (room_id)
          REFERENCES connect_money_rooms(id)
          ON DELETE CASCADE
      )
    `),
 
    db.prepare(`
      CREATE TABLE IF NOT EXISTS connect_love_matches (
        id TEXT PRIMARY KEY,
        profile_a_id TEXT NOT NULL,
        profile_b_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        reveal_to_a INTEGER NOT NULL DEFAULT 0,
        reveal_to_b INTEGER NOT NULL DEFAULT 0,
        admin_note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(profile_a_id, profile_b_id),
        FOREIGN KEY (profile_a_id)
          REFERENCES connect_items(id)
          ON DELETE CASCADE,
        FOREIGN KEY (profile_b_id)          REFERENCES connect_items(id)
          ON DELETE CASCADE
      )
    `),
 
    db.prepare(`
      CREATE TABLE IF NOT EXISTS connect_live_presence (
        id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        side TEXT NOT NULL,
        location TEXT NOT NULL DEFAULT '',
        is_available INTEGER NOT NULL DEFAULT 1,
        item_photo_url TEXT NOT NULL DEFAULT '',
        item_photo_key TEXT,
        language TEXT NOT NULL DEFAULT 'rw',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        UNIQUE(provider_id, item_id, side),
        FOREIGN KEY (provider_id)
          REFERENCES time_market_providers(id)
          ON DELETE CASCADE
      )
    `),
 
    db.prepare(`
      CREATE TABLE IF NOT EXISTS connect_live_messages (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        sender_provider_id TEXT NOT NULL,
        receiver_provider_id TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TEXT NOT NULL,
        read_at TEXT,
        FOREIGN KEY (sender_provider_id)
          REFERENCES time_market_providers(id)
          ON DELETE CASCADE,
        FOREIGN KEY (receiver_provider_id)
          REFERENCES time_market_providers(id)
          ON DELETE CASCADE
      )
    `),
 
    db.prepare(`
      CREATE TABLE IF NOT EXISTS connect_live_calls (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        caller_provider_id TEXT NOT NULL,
        callee_provider_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ringing',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        answered_at TEXT,
        ended_at TEXT,
        FOREIGN KEY (caller_provider_id)
          REFERENCES time_market_providers(id)
          ON DELETE CASCADE,
        FOREIGN KEY (callee_provider_id)
          REFERENCES time_market_providers(id)
          ON DELETE CASCADE
      )
    `),
 
    db.prepare(`
      CREATE TABLE IF NOT EXISTS connect_live_call_signals (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        id TEXT NOT NULL UNIQUE,
        call_id TEXT NOT NULL,
        sender_provider_id TEXT NOT NULL,
        signal_type TEXT NOT NULL,
        payload_json TEXT NOT NULL DEFAULT 'null',
        created_at TEXT NOT NULL,
        FOREIGN KEY (call_id)
          REFERENCES connect_live_calls(id)
          ON DELETE CASCADE,
        FOREIGN KEY (sender_provider_id)
          REFERENCES time_market_providers(id)
          ON DELETE CASCADE
      )
    `),
 
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_connect_live_presence_match
      ON connect_live_presence(item_id, side, is_available, last_seen_at DESC)
    `),
 
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_connect_live_presence_provider
      ON connect_live_presence(provider_id, updated_at DESC)
    `),
 
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_connect_live_messages_pair
      ON connect_live_messages(item_id, sender_provider_id, receiver_provider_id, created_at)
    `),
 
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_connect_live_messages_receiver
      ON connect_live_messages(receiver_provider_id, created_at DESC)    `),
 
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_connect_live_calls_callee
      ON connect_live_calls(callee_provider_id, status, created_at DESC)
    `),
 
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_connect_live_calls_participants
      ON connect_live_calls(caller_provider_id, callee_provider_id, updated_at DESC)
    `),
 
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_connect_live_call_signals_call
      ON connect_live_call_signals(call_id, seq ASC)
    `),
 
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_connect_items_type_created
      ON connect_items(connect_type, created_at DESC)
    `),
 
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_connect_items_status
      ON connect_items(status, created_at DESC)
    `),
 
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_connect_walk_interests_item
      ON connect_walk_interests(item_id, created_at DESC)
    `),
 
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_connect_money_members_room
      ON connect_money_members(room_id, created_at ASC)
    `),
 
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_connect_money_messages_room
      ON connect_money_messages(room_id, created_at ASC)
    `),
 
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_connect_money_events_room
      ON connect_money_events(room_id, created_at ASC)
    `),
 
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_connect_love_matches_a
      ON connect_love_matches(profile_a_id, created_at DESC)
    `),
 
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_connect_love_matches_b
      ON connect_love_matches(profile_b_id, created_at DESC)
    `),
  ]);
 
  // ==================== GWAMO BRAIN SUPPORT TABLES ====================
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS gwamo_brain_conversations (
        id TEXT PRIMARY KEY,
        visitor_token_hash TEXT NOT NULL UNIQUE,
        visitor_label TEXT NOT NULL DEFAULT 'Visitor',
        status TEXT NOT NULL DEFAULT 'open',
        last_message_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `),

    db.prepare(`
      CREATE TABLE IF NOT EXISTS gwamo_brain_messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        sender TEXT NOT NULL CHECK (sender IN ('visitor', 'helper')),
        text_content TEXT NOT NULL,
        media_url TEXT NOT NULL DEFAULT '',
        media_type TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        FOREIGN KEY (conversation_id)
          REFERENCES gwamo_brain_conversations(id)
          ON DELETE CASCADE
      )
    `),

    db.prepare(`
           CREATE TABLE IF NOT EXISTS gwamo_brain_messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        sender TEXT NOT NULL CHECK (sender IN ('visitor', 'helper')),
        text_content TEXT NOT NULL,
        media_url TEXT NOT NULL DEFAULT '',
        media_type TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        FOREIGN KEY (conversation_id)
          REFERENCES gwamo_brain_conversations(id)
          ON DELETE CASCADE
      )
    `),

    db.prepare(`
          CREATE INDEX IF NOT EXISTS idx_gwamo_brain_messages
      ON gwamo_brain_messages(conversation_id, created_at)
    `),

    db.prepare(`
      CREATE TABLE IF NOT EXISTS gwamo_brain_realtime_tickets (
        id TEXT PRIMARY KEY,
        token_hash TEXT NOT NULL UNIQUE,
        conversation_id TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        used_at TEXT,
        created_at TEXT NOT NULL
      )
    `),

    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_gwamo_brain_realtime_tickets_hash
      ON gwamo_brain_realtime_tickets(token_hash)
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS gwamo_brain_settings (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT 'Gwamo Brain',
        welcome_message TEXT NOT NULL DEFAULT 'Hello! How can I help you?',
        media_url TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL
      )
    `),

    db.prepare(`
      INSERT INTO gwamo_brain_settings (
        id, title, welcome_message, media_url, updated_at
      )
      VALUES (
        'main',
        'Gwamo Brain',
        'Hello! How can I help you?',
        '',
        datetime('now')
      )
      ON CONFLICT(id) DO NOTHING
    `)
  ]);
  // ==================== END GWAMO BRAIN SUPPORT TABLES ====================


   await addMissingColumns(db, "gwamo_brain_messages", [
    ["media_url", "TEXT NOT NULL DEFAULT ''"],
    ["media_type", "TEXT NOT NULL DEFAULT ''"],
  ]);

  await addMissingColumns(db, "feedx_posts", [
    ["creator_name", "TEXT NOT NULL DEFAULT ''"],
    ["creator_identity", "TEXT NOT NULL DEFAULT ''"],
    ["creator_type", "TEXT NOT NULL DEFAULT ''"],
    ["title", "TEXT NOT NULL DEFAULT ''"],
    ["subtitle", "TEXT NOT NULL DEFAULT ''"],
    ["logo_url", "TEXT NOT NULL DEFAULT ''"],
    ["logo_key", "TEXT"],
    ["media_url", "TEXT NOT NULL DEFAULT ''"],
    ["media_key", "TEXT"],
    ["media_type", "TEXT NOT NULL DEFAULT ''"],
    ["destination_url", "TEXT NOT NULL DEFAULT ''"],
    ["status", "TEXT NOT NULL DEFAULT 'approved'"],
    ["created_at", "TEXT"],
    ["updated_at", "TEXT"],
    ["provider_id", "TEXT"],
    ["service_charge_per_minute", "TEXT NOT NULL DEFAULT ''"],
    ["work_description", "TEXT NOT NULL DEFAULT ''"],
    ["post_type", "TEXT NOT NULL DEFAULT 'offer'"],
    ["service_name", "TEXT NOT NULL DEFAULT ''"],
    ["service_category", "TEXT NOT NULL DEFAULT ''"],
    ["location", "TEXT NOT NULL DEFAULT ''"],
    ["availability", "TEXT NOT NULL DEFAULT ''"],
    ["price_unit", "TEXT NOT NULL DEFAULT ''"],
    ["exchange_offer", "TEXT NOT NULL DEFAULT ''"],
    ["exchange_need", "TEXT NOT NULL DEFAULT ''"],
    ["allow_cash_balance", "INTEGER NOT NULL DEFAULT 1"],
    ["moment_kind", "TEXT NOT NULL DEFAULT ''"],
  ]);
 
  await addMissingColumns(db, "feedx_post_analytics", [
    ["watch_seconds", "INTEGER NOT NULL DEFAULT 0"],
    ["manual_watching", "INTEGER NOT NULL DEFAULT 0"],
    ["iframe_exposure_seconds", "INTEGER NOT NULL DEFAULT 0"],
    ["last_watched_at", "TEXT"],
    ["real_views", "INTEGER NOT NULL DEFAULT 0"],
    ["manual_views", "INTEGER NOT NULL DEFAULT 0"],
    ["real_reactions", "INTEGER NOT NULL DEFAULT 0"],
    ["manual_reactions", "INTEGER NOT NULL DEFAULT 0"],
    ["envelope_clicks", "INTEGER NOT NULL DEFAULT 0"],
    ["last_envelope_clicked_at", "TEXT"],
    ["updated_at", "TEXT"],
  ]); 
  await addMissingColumns(db, "time_market_providers", [
    ["pin_hash", "TEXT"],
    ["pin_salt", "TEXT"],
    ["pin_iterations", "INTEGER NOT NULL DEFAULT 100000"],
    ["pin_set_at", "TEXT"],
    ["phone_verification_code_hash", "TEXT"],
    ["phone_verification_expires_at", "TEXT"],
    ["phone_verified_at", "TEXT"],
    ["failed_login_attempts", "INTEGER NOT NULL DEFAULT 0"],
    ["login_locked_until", "TEXT"],
    ["profile_image_key", "TEXT"],
    ["activation_code_hash", "TEXT"],
    ["activation_code_expires_at", "TEXT"],
  ]);
 
  await addMissingColumns(db, "time_market_conversations", [
    ["last_message_at", "TEXT"],
  ]);
 
  await addMissingColumns(db, "time_market_messages", [
    ["file_name", "TEXT NOT NULL DEFAULT ''"],
    ["file_size", "INTEGER NOT NULL DEFAULT 0"],
    ["mime_type", "TEXT NOT NULL DEFAULT ''"],
    ["delivered_at", "TEXT"],
  ]);
 
  await ensureConversationUniqueness(db);
 
  await db.batch([
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_feedx_posts_provider
      ON feedx_posts(provider_id, created_at DESC)
    `),
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_time_market_messages_page
      ON time_market_messages(conversation_id, created_at DESC, id DESC)
    `),
    db.prepare(`
      CREATE INDEX IF NOT EXISTS idx_time_market_messages_unread
      ON time_market_messages(conversation_id, read_at, sender_provider_id)
    `),
  ]);
}
 
// FIX: cache the schema-ready promise per isolate instead of re-running the
// whole ensureSchema() batch on every request. If it ever fails, we clear
// the cache so the very next request retries cleanly instead of getting
// stuck on a rejected promise forever.
async function ensureSchemaOnce(db) {
  if (!schemaReadyPromise) {
    schemaReadyPromise = ensureSchema(db).catch((error) => {
      schemaReadyPromise = null;
      throw error;
    });
  }
 
  return schemaReadyPromise;
}
 
async function ensureAnalyticsRow(db, postId) {
  await db
    .prepare(`
      INSERT INTO feedx_post_analytics (
        post_id,
        updated_at
      )
      VALUES (?, ?)
      ON CONFLICT(post_id) DO NOTHING
    `)
    .bind(postId, nowIso())
    .run();
}
 
async function postExists(db, postId) {
  const row = await db
    .prepare(`
      SELECT id
      FROM feedx_posts
      WHERE id = ?
    `)
    .bind(postId)
    .first();
 
  return Boolean(row);
}
 
function mapPost(
  post,
  analytics = {},
  commentCount = 0,
  reactionCount = 0
) {
  const realViews = Number(analytics?.real_views || 0);
  const manualViews = Number(analytics?.manual_views || 0);
 
  const realReactions = Number(
    reactionCount ?? analytics?.real_reactions ?? 0
  );
   const manualReactions = Number(
    analytics?.manual_reactions || 0
  );
 
  return {
    id: String(post.id),
    creator_name: post.creator_name || "",
    creator_identity: post.creator_identity || "",
    creator_type: post.creator_type || "",
    title: post.title || "",
    subtitle: post.subtitle || "",
    logo_url: post.logo_url || "",
    profile_image_url: post.logo_url || "",
    media_url: post.media_url || "",
    video_url: post.media_url || "",
    media_type: post.media_type || "",
    destination_url: post.destination_url || "",
    status: post.status || "approved",
    post_type: post.post_type || "offer",
    service_name: post.service_name || "",
    service_title: post.service_name || "",
    service_category: post.service_category || "",
    location: post.location || "",
    availability: post.availability || "",
    price_unit: post.price_unit || "",
    exchange_offer: post.exchange_offer || "",
    exchange_need: post.exchange_need || "",
    allow_cash_balance: Number(post.allow_cash_balance ?? 1),
    moment_kind: post.moment_kind || "",
    created_at: post.created_at || null,
    updated_at: post.updated_at || null,
    watch_seconds: Number(analytics?.watch_seconds || 0),
    iframe_exposure_seconds: Number(
      analytics?.iframe_exposure_seconds || 0
    ),
    real_views: realViews,
    manual_views: manualViews,
    manual_watching: Number(analytics?.manual_watching || 0),
    displayed_views: realViews + manualViews,
    real_reactions: realReactions,
    manual_reactions: manualReactions,
    displayed_reactions: realReactions + manualReactions,
    comment_count: Number(commentCount || 0),
    provider_id: post.provider_id || "",
    service_provider_name: post.creator_name || "",
    service_charge_per_minute:
      post.service_charge_per_minute || post.title || "",
    work_description:
      post.work_description || post.subtitle || "",
    verification_status: normalizeVerificationStatus(
      post.verification_status || "pending"
    ),
    verified:
      normalizeVerificationStatus(
        post.verification_status || "pending"
      ) === "verified",
  };
}
 
async function getPostForPublic(db, postId) {
  const post = await db
    .prepare(`
      SELECT
        fp.*,
        p.verification_status
      FROM feedx_posts fp
      LEFT JOIN time_market_providers p
        ON p.id = fp.provider_id
      WHERE fp.id = ?
    `)
    .bind(postId)
    .first();
 
  if (!post) return null;
 
  const analytics = await db
    .prepare(`
      SELECT *
      FROM feedx_post_analytics
      WHERE post_id = ?
    `)
    .bind(postId)
    .first();
 
  const commentRow = await db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM home_comments
      WHERE post_id = ?
    `)
    .bind(postId)
    .first();
 
  const reactionRow = await db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM home_reactions
      WHERE post_id = ?
    `)
    .bind(postId)
    .first(); 
  return mapPost(
    post,
    analytics || {},
    Number(commentRow?.count || 0),
    Number(reactionRow?.count || 0)
  );
}
 
async function handleGetHome(request, env) {
  const url = new URL(request.url);
 
  const limit = clamp(
    Number.parseInt(
      url.searchParams.get("limit") ||
        String(DEFAULT_PAGE_LIMIT),
      10
    ) || DEFAULT_PAGE_LIMIT,
    1,
    MAX_PAGE_LIMIT
  );
 
  const cursorValue =
    url.searchParams.get("cursor") ||
    url.searchParams.get("offset") ||
    "0";
 
  const offset = Math.max(
    0,
    Number.parseInt(cursorValue, 10) || 0
  );
 
  const result = await env.DB
    .prepare(`
      SELECT *
      FROM feedx_posts
      WHERE COALESCE(status, 'approved') != 'blocked'
      ORDER BY datetime(created_at) DESC, id DESC
      LIMIT ? OFFSET ?
    `)
    .bind(limit + 1, offset)
    .all();
 
  const rows = result.results || [];
  const hasMore = rows.length > limit;
  const pageRows = rows.slice(0, limit);
  const posts = [];
 
  for (const row of pageRows) {
    const post = await getPostForPublic(
      env.DB,
      String(row.id)
    );
 
    if (post) {
      posts.push(post);
    }
  }
 
  return jsonResponse(
    {
      success: true,
      posts,
      next_cursor: hasMore
        ? String(offset + limit)
        : null,
      has_more: hasMore,
    },
    200,
    {
      "Cache-Control": "no-store",
    }
  );
}
 
async function handleHomeUpdate(request, env) {
  const contentType =
    request.headers.get("content-type") || "";
 
  if (
    !contentType
      .toLowerCase()
      .includes("multipart/form-data")
  ) {
    return errorResponse(
      "This endpoint requires multipart/form-data.",
      415
    );
  }
 
  let formData;
 
  try {
    formData = await request.formData();
  } catch (error) {
    return errorResponse(
      `Could not read form data: ${error.message}`,
      400
    );
  } 
  const auth = await requireProvider(request, env);
  if (auth.response) return auth.response;
  const authProvider = auth.provider;
 
  const submittedProviderId = String(
    formData.get("provider_id") || ""
  ).trim();
 
  const creatorName = String(
    formData.get("creator_name") || ""
  ).trim();
 
  const creatorIdentity = String(
    formData.get("creator_identity") || ""
  ).trim();
 
  let creatorType = String(
    formData.get("creator_type") || ""
  ).trim();
 
  if (!creatorType) {
    creatorType = detectCreatorType(creatorIdentity);
  }
 
  const title = String(
    formData.get("title") || ""
  )
    .trim()
    .slice(0, 120);
 
  const subtitle = String(
    formData.get("subtitle") || ""
  )
    .trim()
    .slice(0, 4000);
 
  const postType = normalizePostType(formData.get("post_type"));
  const serviceName = String(formData.get("service_name") || "")
    .trim()
    .slice(0, 120);
  const serviceCategory = String(
    formData.get("service_category") || ""
  )
    .trim()
    .slice(0, 120);
  const postLocation = String(formData.get("location") || "")
    .trim()
    .slice(0, 180);
  const availability = String(formData.get("availability") || "")
    .trim()
    .slice(0, 80);
  const priceUnit = String(formData.get("price_unit") || "")
    .trim()
    .slice(0, 40);
  const exchangeOffer = String(formData.get("exchange_offer") || "")
    .trim()
    .slice(0, 240);
  const exchangeNeed = String(formData.get("exchange_need") || "")
    .trim()
    .slice(0, 240);
  const allowCashBalance =
    String(formData.get("allow_cash_balance") || "1") === "0" ? 0 : 1;
  const momentKind = String(formData.get("moment_kind") || "")
    .trim()
    .slice(0, 40);
 
  let mediaType = String(
    formData.get("media_type") || ""
  ).trim();
 
  let mediaUrl = String(
    formData.get("video_url") ||
      formData.get("media_url") ||
      ""
  )
    .trim()
    .slice(0, 2000);
 
  let logoUrl = String(
    formData.get("logo_url") ||
      formData.get("profile_image_url") ||
      ""
  )
    .trim()
    .slice(0, 2000);
 
  const logoFile = formData.get("logo_file");
  const mediaFile = formData.get("media_file");
 
  const effectiveCreatorName =
    authProvider?.service_provider_name ||
    authProvider?.full_name ||
    creatorName;
 
  const effectiveIdentity =
    authProvider?.phone || creatorIdentity;
 
  const effectiveCreatorType = authProvider
    ? "whatsapp"    : creatorType;
 
  if (!effectiveCreatorName) {
    return errorResponse(
      "Service provider name is required."
    );
  }
 
  if (!effectiveIdentity) {
    return errorResponse(
      "WhatsApp number is required."
    );
  }
 
  if (submittedProviderId && !authProvider) {
    return errorResponse(
      "Please login before adding a service.",
      401
    );
  }
 
  if (
    authProvider &&
    submittedProviderId &&
    String(authProvider.id) !== submittedProviderId
  ) {
    return errorResponse(
      "You cannot create a service for another provider.",
      403
    );
  }
 
  const destinationUrl = buildDestinationUrl(
    effectiveCreatorType,
    effectiveIdentity
  );
 
  if (!destinationUrl) {
    return errorResponse(
      creatorType === "website"
        ? "Please enter a valid website."
        : "Please enter a valid WhatsApp number."
    );
  }
 
  let uploadedLogo = null;
  let uploadedMedia = null;
 
  try {
    if (
      logoFile instanceof File &&
      logoFile.size > 0
    ) {
      uploadedLogo = await uploadFile(
        request,
        env,
        logoFile,
        "profile_image"
      );
 
      logoUrl = uploadedLogo.url;
    }
 
    if (
      mediaFile instanceof File &&
      mediaFile.size > 0
    ) {
      const kind = mediaFile.type.startsWith("image/")
        ? "post_image"
        : "video";
 
      uploadedMedia = await uploadFile(
        request,
        env,
        mediaFile,
        kind
      );
 
      mediaUrl = uploadedMedia.url;
      mediaType =
        kind === "post_image" ? "image" : "video";
    }
 
    if (!mediaUrl) {
      await deleteR2Key(env, uploadedLogo?.key);
 
      return errorResponse(
        "Please enter a media link or upload a photo or video."
      );
    }
 
    if (!mediaType) {
      const lowerUrl = mediaUrl
        .toLowerCase()
        .split("?")[0]
        .split("#")[0];
 
      if (
        /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(
          lowerUrl        )
      ) {
        mediaType = "image";
      } else if (
        /\.(mp4|webm|mov|m4v|ogg)$/.test(lowerUrl)
      ) {
        mediaType = "video";
      } else {
        mediaType = "embed";
      }
    }
 
    const postId = crypto.randomUUID();
    const timestamp = nowIso();
 
    await env.DB.batch([
      env.DB
        .prepare(`
          INSERT INTO feedx_posts (
            id,
            creator_name,
            creator_identity,
            creator_type,
            title,
            subtitle,
            logo_url,
            logo_key,
            media_url,
            media_key,
            media_type,
            destination_url,
            status,
            post_type,
            service_name,
            service_category,
            location,
            availability,
            price_unit,
            exchange_offer,
            exchange_need,
            allow_cash_balance,
            moment_kind,
            created_at,
            updated_at,
            provider_id,
            service_charge_per_minute,
            work_description
          )
          VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            'approved', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?
          )
        `)
        .bind(
          postId,
          effectiveCreatorName,
          effectiveIdentity,
          effectiveCreatorType,
          title,
          subtitle,
          logoUrl ||
            authProvider?.profile_image_url ||
            "",
          uploadedLogo?.key || null,
          mediaUrl,
          uploadedMedia?.key || null,
          mediaType,
          destinationUrl,
          postType,
          serviceName,
          serviceCategory,
          postLocation,
          availability,
          priceUnit,
          exchangeOffer,
          exchangeNeed,
          allowCashBalance,
          momentKind,
          timestamp,
          timestamp,
          authProvider?.id || null,
          title,
          subtitle
        ),
 
      env.DB
        .prepare(`
          INSERT INTO feedx_post_analytics (
            post_id,
            updated_at
          )
          VALUES (?, ?)
          ON CONFLICT(post_id) DO NOTHING
        `)
        .bind(postId, timestamp),
    ]);
 
    const post = await getPostForPublic(
      env.DB,      postId
    );
 
    return jsonResponse(
      {
        success: true,
        message: "Post created successfully.",
        post,
      },
      201,
      {
        "Cache-Control": "no-store",
      }
    );
  } catch (error) {
    await deleteR2Key(env, uploadedLogo?.key);
    await deleteR2Key(env, uploadedMedia?.key);
 
    console.error("Create post error:", error);
 
    return errorResponse(
      error?.message || "Failed to create post.",
      500
    );
  }
}
 
async function handleUpload(request, env) {
  const auth = await requireProvider(request, env);
  if (auth.response) return auth.response;
 
  const contentType =
    request.headers.get("content-type") || "";
 
  if (
    !contentType
      .toLowerCase()
      .includes("multipart/form-data")
  ) {
    return errorResponse(
      "This endpoint requires multipart/form-data.",
      415
    );
  }
 
  const formData = await request.formData();
  const file = formData.get("file");
 
  const kind = String(
    formData.get("kind") || "post_image"
  );
 
  if (!["profile_image", "post_image", "video"].includes(kind)) {
    return errorResponse("Unsupported public upload type.", 400);
  }
 
  if (!(file instanceof File)) {
    return errorResponse("No file was received.");
  }
 
  try {
    const uploaded = await uploadFile(
      request,
      env,
      file,
      kind
    );
 
    return jsonResponse({
      success: true,
      url: uploaded.url,
      key: uploaded.key,
    });
  } catch (error) {
    return errorResponse(
      error.message || "Upload failed.",
      400
    );
  }
}
 
async function hashViewer(request, env) {
  const ip =
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For") ||
    "unknown-ip";
 
  const userAgent =
    request.headers.get("User-Agent") ||
    "unknown-agent";
 
  const identity = `${ip}|${userAgent}`;
  const secret = String(env.ANALYTICS_HASH_KEY || env.PIN_PEPPER || "").trim();
 
  if (secret.length >= 32) {
    return hmacHex(secret, `view-dedup:${identity}`);
  }
 
  const bytes = new TextEncoder().encode(identity);
   const digest = await crypto.subtle.digest(
    "SHA-256",
    bytes
  );
 
  return Array.from(new Uint8Array(digest))
    .map((byte) =>
      byte.toString(16).padStart(2, "0")
    )
    .join("");
}
 
async function recordViewIfNew(
  request,
  env,
  postId
) {
  const viewerHash = await hashViewer(request, env);
 
  const windowKey = String(
    Math.floor(Date.now() / VIEW_DEDUP_WINDOW_MS)
  );
 
  const inserted = await env.DB
    .prepare(`
      INSERT INTO feedx_view_sessions (
        post_id,
        viewer_hash,
        window_key,
        created_at
      )
      VALUES (?, ?, ?, ?)
      ON CONFLICT (
        post_id,
        viewer_hash,
        window_key
      ) DO NOTHING
    `)
    .bind(
      postId,
      viewerHash,
      windowKey,
      nowIso()
    )
    .run();
 
  return Number(
    inserted.meta?.changes || 0
  ) > 0;
}
 
async function getViewResponse(
  db,
  postId,
  viewRecorded = false
) {
  const analytics = await db
    .prepare(`
      SELECT
        watch_seconds,
        iframe_exposure_seconds,
        real_views,
        manual_views,
        last_watched_at
      FROM feedx_post_analytics
      WHERE post_id = ?
    `)
    .bind(postId)
    .first();
 
  const realViews = Number(
    analytics?.real_views || 0
  );
 
  const manualViews = Number(
    analytics?.manual_views || 0
  );
 
  return {
    success: true,
    post_id: postId,
    view_recorded: viewRecorded,
    watch_seconds: Number(
      analytics?.watch_seconds || 0
    ),
    iframe_exposure_seconds: Number(
      analytics?.iframe_exposure_seconds || 0
    ),
    real_views: realViews,
    manual_views: manualViews,
    displayed_views: realViews + manualViews,
    last_watched_at:
      analytics?.last_watched_at || null,
  };
}
 
async function handleView(request, env) {
  let body;
 
  try {    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.");
  }
 
  const postId = String(
    body.post_id || ""
  ).trim();
 
  if (!postId) {
    return errorResponse(
      "post_id is required."
    );
  }
 
  if (!(await postExists(env.DB, postId))) {
    return errorResponse(
      "Post not found.",
      404
    );
  }
 
  await ensureAnalyticsRow(env.DB, postId);
 
  const viewRecorded = await recordViewIfNew(
    request,
    env,
    postId
  );
 
  if (viewRecorded) {
    await env.DB
      .prepare(`
        UPDATE feedx_post_analytics
        SET real_views =
              COALESCE(real_views, 0) + 1,
            updated_at = ?
        WHERE post_id = ?
      `)
      .bind(nowIso(), postId)
      .run();
  }
 
  return jsonResponse(
    await getViewResponse(
      env.DB,
      postId,
      viewRecorded
    ),
    200,
    {
      "Cache-Control": "no-store",
    }
  );
}
 
async function handleWatch(request, env) {
  let body;
 
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.");
  }
 
  const postId = String(
    body.post_id || ""
  ).trim();
 
  const secondsNumber = Number(body.seconds);
 
  const field =
    body.field === "iframe_exposure_seconds"
      ? "iframe_exposure_seconds"
      : "watch_seconds";
 
  if (!postId) {
    return errorResponse(
      "post_id is required."
    );
  }
 
  if (
    !Number.isFinite(secondsNumber) ||
    secondsNumber <= 0
  ) {
    return errorResponse(
      "seconds must be a positive number."
    );
  }
 
  if (!(await postExists(env.DB, postId))) {
    return errorResponse(
      "Post not found.",
      404
    );
  }
 
  const seconds = Math.min(
    Math.floor(secondsNumber),    MAX_WATCH_SECONDS_PER_REQUEST
  );
 
  await ensureAnalyticsRow(env.DB, postId);
 
  const timestamp = nowIso();
 
  const viewRecorded = await recordViewIfNew(
    request,
    env,
    postId
  );
 
  const viewIncrement =
    viewRecorded ? 1 : 0;
 
  if (field === "watch_seconds") {
    await env.DB
      .prepare(`
        UPDATE feedx_post_analytics
        SET watch_seconds =
              COALESCE(watch_seconds, 0) + ?,
            real_views =
              COALESCE(real_views, 0) + ?,
            last_watched_at = ?,
            updated_at = ?
        WHERE post_id = ?
      `)
      .bind(
        seconds,
        viewIncrement,
        timestamp,
        timestamp,
        postId
      )
      .run();
  } else {
    await env.DB
      .prepare(`
        UPDATE feedx_post_analytics
        SET iframe_exposure_seconds =
              COALESCE(
                iframe_exposure_seconds,
                0
              ) + ?,
            real_views =
              COALESCE(real_views, 0) + ?,
            last_watched_at = ?,
            updated_at = ?
        WHERE post_id = ?
      `)
      .bind(
        seconds,
        viewIncrement,
        timestamp,
        timestamp,
        postId
      )
      .run();
  }
 
  return jsonResponse(
    await getViewResponse(
      env.DB,
      postId,
      viewRecorded
    ),
    200,
    {
      "Cache-Control": "no-store",
    }
  );
}
 
async function handleGetComments(
  request,
  env
) {
  const url = new URL(request.url);
 
  const postId = String(
    url.searchParams.get("post_id") || ""
  ).trim();
 
  if (!postId) {
    return errorResponse(
      "post_id is required."
    );
  }
 
  const result = await env.DB
    .prepare(`
      SELECT
        id,
        post_id,
        commenter_phone,
        country_flag,
        comment,
        created_at
      FROM home_comments      WHERE post_id = ?
      ORDER BY
        datetime(created_at) DESC,
        id DESC
    `)
    .bind(postId)
    .all();
 
  return jsonResponse(
    {
      success: true,
      comments: result.results || [],
    },
    200,
    {
      "Cache-Control": "no-store",
    }
  );
}
 
async function handlePostComment(
  request,
  env
) {
  let body;
 
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      "Invalid JSON body."
    );
  }
 
  const postId = String(
    body.post_id || ""
  ).trim();
 
  const phone = normalizeWhatsAppNumber(
    body.phone || ""
  );
 
  const comment = String(
    body.comment || ""
  ).trim();
 
  if (!postId) {
    return errorResponse(
      "post_id is required."
    );
  }
 
  if (!phone) {
    return errorResponse(
      "Please enter a valid WhatsApp number."
    );
  }
 
  if (!comment) {
    return errorResponse(
      "Comment cannot be empty."
    );
  }
 
  if (comment.length > MAX_COMMENT_LENGTH) {
    return errorResponse(
      `Comment must be ${MAX_COMMENT_LENGTH} characters or fewer.`
    );
  }
 
  if (
    !checkRateLimit(
      `comment:${phone}`,
      10,
      60_000
    )
  ) {
    return errorResponse(
      "Too many comments. Please try again shortly.",
      429
    );
  }
 
  if (!(await postExists(env.DB, postId))) {
    return errorResponse(
      "Post not found.",
      404
    );
  }
 
  const countryFlag =
    validSubmittedCountryFlag(
      body.country_flag
    ) || flagForNormalizedNumber(phone);
 
  const createdAt = nowIso();
 
  const result = await env.DB
    .prepare(`
      INSERT INTO home_comments (        post_id,
        commenter_phone,
        country_flag,
        comment,
        created_at
      )
      VALUES (?, ?, ?, ?, ?)
    `)
    .bind(
      postId,
      phone,
      countryFlag,
      comment,
      createdAt
    )
    .run();
 
  const countRow = await env.DB
    .prepare(`
      SELECT COUNT(*) AS count
      FROM home_comments
      WHERE post_id = ?
    `)
    .bind(postId)
    .first();
 
  return jsonResponse({
    success: true,
    comment: {
      id: result.meta?.last_row_id,
      post_id: postId,
      commenter_phone: phone,
      country_flag: countryFlag,
      comment,
      created_at: createdAt,
    },
    comment_count: Number(
      countRow?.count || 0
    ),
  });
}
 
async function handleReact(request, env) {
  let body;
 
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.");
  }
 
  const postId = String(
    body.post_id || ""
  ).trim();
 
  const phone = normalizeWhatsAppNumber(
    body.phone || ""
  );
 
  if (!postId) {
    return errorResponse(
      "post_id is required."
    );
  }
 
  if (!phone) {
    return errorResponse(
      "Please enter a valid WhatsApp number."
    );
  }
 
  if (
    !checkRateLimit(
      `react:${phone}`,
      20,
      60_000
    )
  ) {
    return errorResponse(
      "Too many requests. Please try again shortly.",
      429
    );
  }
 
  if (!(await postExists(env.DB, postId))) {
    return errorResponse(
      "Post not found.",
      404
    );
  }
 
  await ensureAnalyticsRow(env.DB, postId);
 
  try {
    await env.DB
      .prepare(`
        INSERT INTO home_reactions (
          post_id,
          phone,
          created_at        )
        VALUES (?, ?, ?)
      `)
      .bind(
        postId,
        phone,
        nowIso()
      )
      .run();
  } catch (error) {
    const message = String(
      error?.message || error
    ).toLowerCase();
 
    if (
      message.includes("unique") ||
      message.includes("constraint")
    ) {
      return jsonResponse({
        success: false,
        already_reacted: true,
        message:
          "This number already liked this post.",
      });
    }
 
    throw error;
  }
 
  const reactionRow = await env.DB
    .prepare(`
      SELECT COUNT(*) AS count
      FROM home_reactions
      WHERE post_id = ?
    `)
    .bind(postId)
    .first();
 
  const realReactions = Number(
    reactionRow?.count || 0
  );
 
  await env.DB
    .prepare(`
      UPDATE feedx_post_analytics
      SET real_reactions = ?,
          updated_at = ?
      WHERE post_id = ?
    `)
    .bind(
      realReactions,
      nowIso(),
      postId
    )
    .run();
 
  const analytics = await env.DB
    .prepare(`
      SELECT manual_reactions
      FROM feedx_post_analytics
      WHERE post_id = ?
    `)
    .bind(postId)
    .first();
 
  const manualReactions = Number(
    analytics?.manual_reactions || 0
  );
 
  return jsonResponse({
    success: true,
    real_reactions: realReactions,
    manual_reactions: manualReactions,
    displayed_reactions:
      realReactions + manualReactions,
  });
}
 
async function handleReactionCounts(request, env) {
  if (
    !checkRateLimit(
      `reaction-counts:${getClientIp(request)}`,
      120,
      60_000
    )
  ) {
    return errorResponse("Too many refresh requests.", 429);
  }
 
  const url = new URL(request.url);
  const ids = [
    ...new Set(
      String(url.searchParams.get("post_ids") || "")
        .split(",")
        .map((id) => id.trim())
        .filter((id) => /^[a-zA-Z0-9._:-]{1,128}$/.test(id))
    ),
  ].slice(0, 60);
 
  if (!ids.length) {    return jsonResponse(
      { success: true, counts: {} },
      200,
      { "Cache-Control": "no-store" }
    );
  }
 
  const placeholders = ids.map(() => "?").join(",");
  const result = await env.DB
    .prepare(`
      SELECT
        fp.id AS post_id,
        COUNT(hr.id) AS real_reactions,
        COALESCE(a.manual_reactions, 0) AS manual_reactions
      FROM feedx_posts fp
      LEFT JOIN home_reactions hr ON hr.post_id = fp.id
      LEFT JOIN feedx_post_analytics a ON a.post_id = fp.id
      WHERE fp.id IN (${placeholders})
      GROUP BY fp.id, a.manual_reactions
    `)
    .bind(...ids)
    .all();
 
  const counts = {};
  for (const row of result.results || []) {
    const real = Number(row.real_reactions || 0);
    const manual = Number(row.manual_reactions || 0);
    counts[String(row.post_id)] = {
      real_reactions: real,
      manual_reactions: manual,
      displayed_reactions: real + manual,
    };
  }
 
  return jsonResponse(
    { success: true, counts },
    200,
    { "Cache-Control": "no-store" }
  );
}
 
async function handleEnvelopeClick(
  request,
  env
) {
  let body;
 
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.");
  }
 
  const postId = String(
    body.post_id || ""
  ).trim();
 
  if (!postId) {
    return errorResponse(
      "post_id is required."
    );
  }
 
  const post = await env.DB
    .prepare(`
      SELECT *
      FROM feedx_posts
      WHERE id = ?
    `)
    .bind(postId)
    .first();
 
  if (!post) {
    return errorResponse(
      "Post not found.",
      404
    );
  }
 
  await ensureAnalyticsRow(env.DB, postId);
 
  const timestamp = nowIso();
 
  await env.DB
    .prepare(`
      UPDATE feedx_post_analytics
      SET envelope_clicks =
            COALESCE(envelope_clicks, 0) + 1,
          last_envelope_clicked_at = ?,
          updated_at = ?
      WHERE post_id = ?
    `)
    .bind(
      timestamp,
      timestamp,
      postId
    )
    .run();
 
  const analytics = await env.DB    .prepare(`
      SELECT
        envelope_clicks,
        last_envelope_clicked_at
      FROM feedx_post_analytics
      WHERE post_id = ?
    `)
    .bind(postId)
    .first();
 
  return jsonResponse({
    success: true,
    destination:
      post.destination_url ||
      buildDestinationUrl(
        post.creator_type,
        post.creator_identity
      ) ||
      null,
    envelope_clicks: Number(
      analytics?.envelope_clicks || 0
    ),
    last_envelope_clicked_at:
      analytics?.last_envelope_clicked_at ||
      null,
  });
}
 
// ========== TIME MARKET HANDLERS ==========
 
async function handleProviderRegister(
  request,
  env
) {
  if (!hasSecurePinConfiguration(env)) {
    return errorResponse(
      "PIN_PEPPER is missing or too short. Save a random secret of at least 32 characters before enabling registration.",
      503
    );
  }
 
  let body;
 
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.");
  }
 
  const fullName = normalizeFullName(
    body.full_name
  );
 
  const phone = normalizeWhatsAppNumber(
    body.phone || ""
  );
 
  const serviceProviderName =
    normalizeServiceName(
      body.service_provider_name || fullName
    );
 
  const servicesOffered =
    normalizeServiceList(
      body.services_offered || ""
    );
 
  const pin = String(body.pin || "").trim();
 
  if (!fullName) {
    return errorResponse(
      "Full name is required."
    );
  }
 
  if (!phone) {
    return errorResponse(
      "Please enter a valid international WhatsApp telephone number."
    );
  }
 
  if (!PIN_PATTERN.test(pin)) {
    return errorResponse("Create an 8-digit personal PIN.");
  }
 
  if (
    !checkRateLimit(
      `register:${getClientIp(request)}:${phone}`,
      5,
      15 * 60_000
    )
  ) {
    return errorResponse(
      "Too many registration attempts. Try again shortly.",
      429
    );
  }
 
  const existing = await getProviderByPhone(
    env.DB,    phone
  );
 
  const timestamp = nowIso();
  const pinRecord = await createPinRecord(pin, env);
 
  if (existing) {
    if (
      (existing.account_status || "active") === "pending_phone_review"
    ) {
      await env.DB.batch([
        env.DB
          .prepare(`
            UPDATE time_market_providers
            SET full_name = ?,
                service_provider_name = ?,
                services_offered = ?,
                pin_hash = ?,
                pin_salt = ?,
                pin_iterations = ?,
                pin_set_at = ?,
                phone_verification_code_hash = NULL,
                phone_verification_expires_at = NULL,
                verification_status = 'pending',
                account_status = 'pending_phone_review',
                updated_at = ?
            WHERE id = ?
          `)
          .bind(
            fullName,
            serviceProviderName,
            servicesOffered,
            pinRecord.hash,
            pinRecord.salt,
            pinRecord.iterations,
            timestamp,
            timestamp,
            existing.id
          ),
        env.DB
          .prepare(`DELETE FROM time_market_sessions WHERE provider_id = ?`)
          .bind(existing.id),
      ]);
 
      const pendingProvider = await getProviderById(env.DB, existing.id);
      return jsonResponse(
        {
          success: true,
          auth_method: PIN_AUTH_METHOD,
          pin_authentication_enabled: true,
          requires_admin_approval: true,
          account_status: "pending_phone_review",
          message:
            "To own a Gwamo account, the admin will contact you to verify that you are a legitimate user.",
          provider: publicProvider(pendingProvider),
        },
        202,
        { "Cache-Control": "no-store" }
      );
    }
 
    return jsonResponse(
      {
        success: false,
        already_registered: true,
        message:
          "This telephone number is already registered. Please login.",
        provider: publicProvider(existing),
      },
      409
    );
  }
 
  const id = crypto.randomUUID();
 
  await env.DB
    .prepare(`
      INSERT INTO time_market_providers (
        id,
        full_name,
        phone,
        service_provider_name,
        services_offered,
        verification_status,
        account_status,
        pin_hash,
        pin_salt,
        pin_iterations,
        pin_set_at,
        created_at,
        updated_at
      )
      VALUES (
        ?, ?, ?, ?, ?,
        'pending',
        'pending_phone_review',
        ?, ?, ?, ?,
        ?, ?
      )
    `)    .bind(
      id,
      fullName,
      phone,
      serviceProviderName,
      servicesOffered,
      pinRecord.hash,
      pinRecord.salt,
      pinRecord.iterations,
      timestamp,
      timestamp,
      timestamp
    )
    .run();
 
  const provider = await getProviderById(
    env.DB,
    id
  );
 
  return jsonResponse(
    {
      success: true,
      auth_method: PIN_AUTH_METHOD,
      pin_authentication_enabled: true,
      requires_admin_approval: true,
      account_status: "pending_phone_review",
      message:
        "To own a Gwamo account, the admin will contact you to verify that you are a legitimate user.",
      provider: publicProvider(provider),
    },
    202,
    {
      "Cache-Control": "no-store",
    }
  );
}
 
async function handleProviderLogin(
  request,
  env
) {
  if (!hasSecurePinConfiguration(env)) {
    return errorResponse(
      "PIN_PEPPER is missing or too short. Login is disabled until the Worker secret is configured.",
      503
    );
  }
 
  let body;
 
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.");
  }
 
  const phone = normalizeWhatsAppNumber(
    body.phone || ""
  );
  const pin = String(body.pin || "").trim();
 
  if (!phone) {
    return errorResponse(
      "Please enter a valid registered telephone number."
    );
  }
 
  if (!PIN_PATTERN.test(pin)) {
    return errorResponse("Enter your 8-digit personal PIN.");
  }
 
  if (
    !checkRateLimit(
      `login:${getClientIp(request)}:${phone}`,
      10,
      60_000
    )
  ) {
    return errorResponse(
      "Too many login attempts. Try again shortly.",
      429
    );
  }
 
  const provider = await getProviderByPhone(
    env.DB,
    phone
  );
 
  if (!provider) {
    await derivePinHash(
      pin,
      "00000000000000000000000000000000",
      PBKDF2_ITERATIONS,
      getPinPepper(env)
    );
    return errorResponse("Telephone number or PIN is incorrect.", 401);
  }
   const lockedUntil = Date.parse(provider.login_locked_until || "");
  if (Number.isFinite(lockedUntil) && lockedUntil > Date.now()) {
    return errorResponse(
      "Too many incorrect PIN attempts. Try again after 15 minutes or use Forgot PIN.",
      429,
      { locked_until: provider.login_locked_until }
    );
  }
 
  if (!provider.pin_hash || !provider.pin_salt) {
    return errorResponse(
      "This older account does not have a personal PIN yet. Use Forgot PIN so an admin can call your registered number and approve PIN setup.",
      409,
      { pin_setup_required: true }
    );
  }
 
  const validPin = await verifyProviderPin(provider, pin, env);
  if (!validPin) {
    const failures = Number(provider.failed_login_attempts || 0) + 1;
    const lock = failures >= LOGIN_FAILURE_LIMIT;
    const nextLockedUntil = lock
      ? new Date(Date.now() + LOGIN_LOCK_MS).toISOString()
      : null;
 
    await env.DB
      .prepare(`
        UPDATE time_market_providers
        SET failed_login_attempts = ?,
            login_locked_until = ?,
            updated_at = ?
        WHERE id = ?
      `)
      .bind(failures, nextLockedUntil, nowIso(), provider.id)
      .run();
 
    return errorResponse(
      lock
        ? "Too many incorrect PIN attempts. Login is locked for 15 minutes."
        : "Telephone number or PIN is incorrect.",
      lock ? 429 : 401,
      lock ? { locked_until: nextLockedUntil } : {}
    );
  }
 
  const accountStatus = provider.account_status || "active";
  if (accountStatus === "pending_phone_review" || !provider.phone_verified_at) {
    return errorResponse(
      "This account is waiting for the telephone verification call and admin approval.",
      403,
      {
        requires_admin_approval: true,
        account_status: "pending_phone_review",
      }
    );
  }
 
  // Custom, specific message per product requirements: explains exactly why
  // the registration was rejected (name did not match the registered
  // number) and tells the person how to fix it before trying again.
  if (accountStatus === "rejected") {
    return errorResponse(
      "We're sorry - your registration could not be approved. Our team could not confirm that this telephone number is registered under your name. Gwamo verifies every account this way, so please register again using a phone number that is registered to your name - either through your SIM registration or your WhatsApp account - and make sure the name matches exactly.",
      403,
      {
        account_rejected: true,
        account_status: "rejected",
      }
    );
  }
 
  // The admin has approved the account and generated a one-time activation
  // code (see handleAdminVerifyProvider). The person already has a valid
  // phone + PIN at this point - they just still need to enter that code,
  // delivered to them separately by call or SMS, before the account goes
  // fully active.
  if (accountStatus === "pending_activation_code") {
    return errorResponse(
      "Enter the activation code the admin gave you by phone or SMS to finish activating your account.",
      403,
      {
        requires_activation_code: true,
        account_status: "pending_activation_code",
      }
    );
  }
 
  if (accountStatus !== "active") {
    return errorResponse("This account is not active.", 403, {
      account_status: accountStatus,
    });
  }
 
  await env.DB
    .prepare(`
      UPDATE time_market_providers
      SET failed_login_attempts = 0,
          login_locked_until = NULL,
          updated_at = ?
      WHERE id = ?    `)
    .bind(nowIso(), provider.id)
    .run();
 
  const session = await createProviderSession(
    env,
    provider.id
  );
 
  return jsonResponse(
    {
      success: true,
      auth_method: PIN_AUTH_METHOD,
      pin_authentication_enabled: true,
      message: "Login successful.",
      provider: publicProvider(provider),
      session_token: session.token,
      session_expires_at:
        session.expires_at,
    },
    200,
    {
      "Cache-Control": "no-store",
    }
  );
}
 
// The activation code the admin gives out is sufficient proof of identity
// on its own - the person does NOT need to remember whatever PIN they
// typed during registration (which may have been many hours or a full day
// earlier). They set/confirm their PIN right here instead, and are logged
// straight in - no separate login round-trip required.
async function handleProviderActivate(request, env) {
  if (!hasSecurePinConfiguration(env)) {
    return errorResponse(
      "PIN activation is unavailable until PIN_PEPPER is configured.",
      503
    );
  }
 
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.");
  }
 
  const phone = normalizeWhatsAppNumber(body.phone || "");
  const code = String(body.code || "").trim();
  const newPin = String(body.new_pin || body.pin || "").trim();
 
  if (!phone) {
    return errorResponse("Please enter a valid registered telephone number.");
  }
  if (!/^\d{6}$/.test(code)) {
    return errorResponse("Enter the 6-digit activation code.");
  }
  if (!PIN_PATTERN.test(newPin)) {
    return errorResponse("Create an 8-digit personal PIN to finish activating your account.");
  }
 
  if (
    !checkRateLimit(
      `activate:${getClientIp(request)}:${phone}`,
      10,
      15 * 60_000
    )
  ) {
    return errorResponse("Too many attempts. Try again shortly.", 429);
  }
 
  const provider = await getProviderByPhone(env.DB, phone);
  if (!provider) {
    return errorResponse("Telephone number or code is incorrect.", 401);
  }
 
  if ((provider.account_status || "") !== "pending_activation_code") {
    return errorResponse(
      provider.account_status === "active"
        ? "This account is already active. Please login."
        : "This account is not waiting for an activation code.",
      409,
      { account_status: provider.account_status || "active" }
    );
  }
 
  const expiresAt = Date.parse(provider.activation_code_expires_at || "");
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return errorResponse(
      "This activation code expired. Ask the admin to approve your account again.",
      410
    );
  }
 
  const candidateHash = await hashVerificationSecret(
    code,
    `activation:${provider.id}`,
    env
  );
   if (!provider.activation_code_hash || !constantTimeEqual(candidateHash, provider.activation_code_hash)) {
    return errorResponse("The activation code is incorrect.", 403);
  }
 
  const pinRecord = await createPinRecord(newPin, env);
  const timestamp = nowIso();
 
  await env.DB
    .prepare(`
      UPDATE time_market_providers
      SET account_status = 'active',
          pin_hash = ?,
          pin_salt = ?,
          pin_iterations = ?,
          pin_set_at = ?,
          activation_code_hash = NULL,
          activation_code_expires_at = NULL,
          failed_login_attempts = 0,
          login_locked_until = NULL,
          updated_at = ?
      WHERE id = ?
    `)
    .bind(
      pinRecord.hash,
      pinRecord.salt,
      pinRecord.iterations,
      timestamp,
      timestamp,
      provider.id
    )
    .run();
 
  const updated = await getProviderById(env.DB, provider.id);
  const session = await createProviderSession(env, provider.id);
 
  return jsonResponse(
    {
      success: true,
      message: "Account activated.",
      auth_method: PIN_AUTH_METHOD,
      pin_authentication_enabled: true,
      provider: publicProvider(updated),
      session_token: session.token,
      session_expires_at: session.expires_at,
    },
    200,
    { "Cache-Control": "no-store" }
  );
}
 
async function handlePinResetRequest(request, env) {
  if (!hasSecurePinConfiguration(env)) {
    return errorResponse(
      "PIN reset is unavailable until PIN_PEPPER is configured.",
      503
    );
  }
 
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.");
  }
 
  const phone = normalizeWhatsAppNumber(body.phone || "");
  if (!phone) {
    return errorResponse("Enter your registered telephone number.");
  }
 
  if (
    !checkRateLimit(
      `pin-reset-request:${getClientIp(request)}:${phone}`,
      3,
      30 * 60_000
    )
  ) {
    return errorResponse(
      "Too many PIN reset requests. Try again in 30 minutes.",
      429
    );
  }
 
  const provider = await getProviderByPhone(env.DB, phone);
  const requestId = crypto.randomUUID();
  const verificationCode = randomVerificationCode();
  const expiresAt = new Date(Date.now() + PIN_RESET_TTL_MS).toISOString();
 
  if (!provider) {
    return jsonResponse(
      {
        success: true,
        request_id: requestId,
        verification_code: verificationCode,
        expires_at: expiresAt,
        message:
          "If this number belongs to an eligible Gwamo account, an admin can verify it by telephone.",
      },
      202,
      { "Cache-Control": "no-store" }    );
  }
 
  if ((provider.account_status || "active") === "pending_phone_review") {
    return errorResponse(
      "This registration is still waiting for its first telephone approval. Register again to receive a fresh registration code.",
      409,
      { requires_admin_approval: true }
    );
  }
 
  if ((provider.account_status || "active") !== "active") {
    return errorResponse("This account is not eligible for PIN reset.", 403);
  }
 
  const codeHash = await hashVerificationSecret(
    verificationCode,
    `pin-reset:${requestId}`,
    env
  );
  const timestamp = nowIso();
 
  await env.DB.batch([
    env.DB
      .prepare(`
        UPDATE time_market_pin_resets
        SET status = 'expired', updated_at = ?
        WHERE provider_id = ? AND status IN ('pending', 'approved')
      `)
      .bind(timestamp, provider.id),
    env.DB
      .prepare(`
        INSERT INTO time_market_pin_resets (
          id,
          provider_id,
          phone,
          verification_code_hash,
          status,
          expires_at,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)
      `)
      .bind(
        requestId,
        provider.id,
        phone,
        codeHash,
        expiresAt,
        timestamp,
        timestamp
      ),
  ]);
 
  return jsonResponse(
    {
      success: true,
      request_id: requestId,
      verification_code: verificationCode,
      expires_at: expiresAt,
      message:
        "Wait for Gwamo to call your registered number, then read this temporary code during the call.",
    },
    202,
    { "Cache-Control": "no-store" }
  );
}
 
// CHANGED: PIN resets no longer end with the user choosing their own new
// PIN client-side. Once an admin approves (see handleAdminPinResetDecision),
// a random 8-digit PIN is generated and set on the account immediately, and
// this status endpoint simply reports that it is done - the person is told
// to expect the new PIN by phone call or SMS from the admin, not to enter
// one themselves. The 'used' status is the success terminal state.
async function handlePinResetStatus(request, env) {
  const url = new URL(request.url);
  const requestId = String(url.searchParams.get("request_id") || "").trim();
 
  if (!requestId) return errorResponse("request_id is required.");
  if (
    !checkRateLimit(
      `pin-reset-status:${getClientIp(request)}:${requestId}`,
      60,
      60_000
    )
  ) {
    return errorResponse("Too many status checks. Wait a moment.", 429);
  }
 
  const reset = await env.DB
    .prepare(`SELECT * FROM time_market_pin_resets WHERE id = ? LIMIT 1`)
    .bind(requestId)
    .first();
 
  if (!reset) {
    return jsonResponse(
      { success: true, status: "pending", approved: false },
      200,
      { "Cache-Control": "no-store" }
    );  }
 
  if (
    reset.status === "pending" &&
    Date.parse(reset.expires_at || "") <= Date.now()
  ) {
    await env.DB
      .prepare(`
        UPDATE time_market_pin_resets
        SET status = 'expired', updated_at = ?
        WHERE id = ?
      `)
      .bind(nowIso(), requestId)
      .run();
    return jsonResponse(
      { success: true, status: "expired", approved: false },
      200,
      { "Cache-Control": "no-store" }
    );
  }
 
  if (reset.status === "used") {
    return jsonResponse(
      {
        success: true,
        status: "used",
        approved: true,
        pin_delivered: true,
        message:
          "Gwamo approved this reset and generated a new PIN. An admin will share it with you by phone call or SMS.",
      },
      200,
      { "Cache-Control": "no-store" }
    );
  }
 
  // 'pending', 'rejected', or a legacy 'approved' row from before this
  // change (which will simply sit here until it expires on its own).
  return jsonResponse(
    { success: true, status: reset.status, approved: false },
    200,
    { "Cache-Control": "no-store" }
  );
}
 
// Kept only for backward compatibility with any already-open client that
// still has an old-style recovery token in memory. The primary flow no
// longer produces recovery tokens (see handleAdminPinResetDecision), so a
// fresh call into this endpoint will always report the token as invalid.
async function handlePinResetComplete(request, env) {
  if (!hasSecurePinConfiguration(env)) {
    return errorResponse("PIN reset is not configured.", 503);
  }
 
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.");
  }
 
  const requestId = String(body.request_id || "").trim();
  const recoveryToken = String(body.recovery_token || "").trim();
  const newPin = String(body.new_pin || "").trim();
 
  if (!requestId || !recoveryToken) {
    return errorResponse("The approved PIN reset session is missing.");
  }
  if (!PIN_PATTERN.test(newPin)) {
    return errorResponse("Create a new 8-digit personal PIN.");
  }
 
  const reset = await env.DB
    .prepare(`SELECT * FROM time_market_pin_resets WHERE id = ? LIMIT 1`)
    .bind(requestId)
    .first();
 
  if (
    !reset ||
    reset.status !== "approved" ||
    !reset.recovery_token_hash ||
    Date.parse(reset.recovery_expires_at || "") <= Date.now()
  ) {
    return errorResponse(
      "This approved reset token is invalid or expired. Check approval again.",
      403
    );
  }
 
  const candidateHash = await hashToken(recoveryToken);
  if (!constantTimeEqual(candidateHash, reset.recovery_token_hash)) {
    return errorResponse("Invalid reset token.", 403);
  }
 
  const pinRecord = await createPinRecord(newPin, env);
  const timestamp = nowIso();
 
  await env.DB.batch([
    env.DB
      .prepare(`        UPDATE time_market_providers
        SET pin_hash = ?,
            pin_salt = ?,
            pin_iterations = ?,
            pin_set_at = ?,
            phone_verified_at = COALESCE(phone_verified_at, ?),
            failed_login_attempts = 0,
            login_locked_until = NULL,
            updated_at = ?
        WHERE id = ?
      `)
      .bind(
        pinRecord.hash,
        pinRecord.salt,
        pinRecord.iterations,
        timestamp,
        timestamp,
        timestamp,
        reset.provider_id
      ),
    env.DB
      .prepare(`DELETE FROM time_market_sessions WHERE provider_id = ?`)
      .bind(reset.provider_id),
    env.DB
      .prepare(`
        UPDATE time_market_pin_resets
        SET status = 'used',
            recovery_token_hash = NULL,
            used_at = ?,
            updated_at = ?
        WHERE id = ?
      `)
      .bind(timestamp, timestamp, requestId),
  ]);
 
  return jsonResponse(
    {
      success: true,
      auth_method: PIN_AUTH_METHOD,
      pin_authentication_enabled: true,
      sessions_revoked: true,
      message: "Your PIN was changed. All older sessions were signed out.",
    },
    200,
    { "Cache-Control": "no-store" }
  );
}
 
async function handleProviderLogout(
  request,
  env
) {
  const token = readBearerToken(request);
 
  if (!token) {
    return jsonResponse({
      success: true,
    });
  }
 
  const tokenHash = await hashToken(token);
 
  await env.DB
    .prepare(`
      DELETE FROM time_market_sessions
      WHERE token_hash = ?
    `)
    .bind(tokenHash)
    .run();
 
  return jsonResponse({
    success: true,
    message: "Logged out.",
  });
}
 
async function handleProviderMe(
  request,
  env
) {
  const auth = await requireProvider(
    request,
    env
  );
 
  if (auth.response) {
    return auth.response;
  }
 
  return jsonResponse(
    {
      success: true,
      provider: publicProvider(
        auth.provider
      ),
    },
    200,
    {
      "Cache-Control": "no-store",
    }  );
}
 
async function handleProviderProfileUpdate(
  request,
  env
) {
  const auth = await requireProvider(
    request,
    env
  );
 
  if (auth.response) {
    return auth.response;
  }
 
  let body;
 
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      "Invalid JSON body."
    );
  }
 
  const fullName = normalizeFullName(
    body.full_name ??
      auth.provider.full_name
  );
 
  const serviceProviderName =
    normalizeServiceName(
      body.service_provider_name ??
        auth.provider.service_provider_name
    );
 
  const servicesOffered =
    normalizeServiceList(
      body.services_offered ??
        auth.provider.services_offered
    );
 
  const profileImageUrl = String(
    body.profile_image_url ?? auth.provider.profile_image_url ?? ""
  )
    .trim()
    .slice(0, 2000);
  const profileImageKey = managedMediaKeyFromUrl(profileImageUrl) || null;
  const oldProfileImageKey = auth.provider.profile_image_key || null;
 
  if (!fullName) {
    return errorResponse(
      "Full name is required."
    );
  }
 
  if (!serviceProviderName) {
    return errorResponse(
      "Service provider name is required."
    );
  }
 
  await env.DB
    .prepare(`
      UPDATE time_market_providers
      SET full_name = ?,
          service_provider_name = ?,
          services_offered = ?,
          profile_image_url = ?,
          profile_image_key = ?,
          updated_at = ?
      WHERE id = ?
    `)
    .bind(
      fullName,
      serviceProviderName,
      servicesOffered,
      profileImageUrl,
      profileImageKey,
      nowIso(),
      auth.provider.id
    )
    .run();
 
  await env.DB
    .prepare(`
      UPDATE feedx_posts
      SET creator_name = ?,
          logo_url = ?,
          updated_at = ?
      WHERE provider_id = ?
    `)
    .bind(
      serviceProviderName,
      profileImageUrl,
      nowIso(),
      auth.provider.id
    )
    .run(); 
  if (oldProfileImageKey && oldProfileImageKey !== profileImageKey) {
    await deleteR2Key(env, oldProfileImageKey);
  }
 
  const provider = await getProviderById(
    env.DB,
    auth.provider.id
  );
 
  return jsonResponse({
    success: true,
    message: "Profile updated.",
    provider: publicProvider(provider),
  });
}
 
async function handleProviderAccountDelete(request, env) {
  const auth = await requireProvider(request, env);
  if (auth.response) return auth.response;
 
  const providerId = String(auth.provider.id);
  const conversations = await env.DB
    .prepare(`
      SELECT id
      FROM time_market_conversations
      WHERE provider_id = ? OR customer_provider_id = ?
    `)
    .bind(providerId, providerId)
    .all();
 
  for (const conversation of conversations.results || []) {
    await deleteConversationMessageMedia(env, conversation.id);
    await env.DB
      .prepare(`DELETE FROM time_market_messages WHERE conversation_id = ?`)
      .bind(conversation.id)
      .run();
  }
 
  await env.DB
    .prepare(`
      DELETE FROM time_market_conversations
      WHERE provider_id = ? OR customer_provider_id = ?
    `)
    .bind(providerId, providerId)
    .run();
 
  const posts = await env.DB
    .prepare(`SELECT * FROM feedx_posts WHERE provider_id = ?`)
    .bind(providerId)
    .all();
 
  for (const post of posts.results || []) {
    await deletePostWithRelations(env, post);
  }
 
  await env.DB.batch([
    env.DB
      .prepare(`DELETE FROM home_comments WHERE commenter_phone = ?`)
      .bind(auth.provider.phone),
    env.DB
      .prepare(`DELETE FROM home_reactions WHERE phone = ?`)
      .bind(auth.provider.phone),
    env.DB
      .prepare(`DELETE FROM time_market_realtime_tickets WHERE provider_id = ?`)
      .bind(providerId),
    env.DB
      .prepare(`DELETE FROM time_market_pin_resets WHERE provider_id = ?`)
      .bind(providerId),
    env.DB
      .prepare(`DELETE FROM time_market_sessions WHERE provider_id = ?`)
      .bind(providerId),
    env.DB
      .prepare(`DELETE FROM time_market_providers WHERE id = ?`)
      .bind(providerId),
  ]);
 
  await deleteR2Key(env, auth.provider.profile_image_key);
 
  return jsonResponse({
    success: true,
    message: "Your provider account and its Gwamo data were deleted.",
  });
}
 
async function handleProviderServices(
  request,
  env
) {
  const auth = await requireProvider(
    request,
    env
  );
 
  if (auth.response) {
    return auth.response;
  }
 
  const result = await env.DB
    .prepare(`      SELECT *
      FROM feedx_posts
      WHERE provider_id = ?
      ORDER BY
        datetime(created_at) DESC,
        id DESC
    `)
    .bind(auth.provider.id)
    .all();
 
  const services = [];
 
  for (const row of result.results || []) {
    const mapped = await getPostForPublic(
      env.DB,
      String(row.id)
    );
 
    if (mapped) {
      services.push(mapped);
    }
  }
 
  return jsonResponse(
    {
      success: true,
      services,
    },
    200,
    {
      "Cache-Control": "no-store",
    }
  );
}
 
async function handleProviderServiceEdit(
  request,
  env
) {
  const auth = await requireProvider(
    request,
    env
  );
 
  if (auth.response) {
    return auth.response;
  }
 
  let body;
 
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      "Invalid JSON body."
    );
  }
 
  const postId = String(
    body.post_id || ""
  ).trim();
 
  if (!postId) {
    return errorResponse(
      "post_id is required."
    );
  }
 
  const post = await env.DB
    .prepare(`
      SELECT *
      FROM feedx_posts
      WHERE id = ?
        AND provider_id = ?
    `)
    .bind(
      postId,
      auth.provider.id
    )
    .first();
 
  if (!post) {
    return errorResponse(
      "Service not found or it does not belong to you.",
      404
    );
  }
 
  const charge = String(
    body.service_charge_per_minute ??
      body.title ??
      post.title ??
      ""
  )
    .trim()
    .slice(0, 120);
 
  const description = String(
    body.work_description ??
      body.subtitle ??      post.subtitle ??
      ""
  )
    .trim()
    .slice(0, 4000);
 
  const mediaUrl = String(
    body.media_url ??
      post.media_url ??
      ""
  ).trim();
 
  const mediaType = String(
    body.media_type ??
      post.media_type ??
      ""
  ).trim();
 
  await env.DB
    .prepare(`
      UPDATE feedx_posts
      SET title = ?,
          subtitle = ?,
          service_charge_per_minute = ?,
          work_description = ?,
          media_url = ?,
          media_type = ?,
          updated_at = ?
      WHERE id = ?
        AND provider_id = ?
    `)
    .bind(
      charge,
      description,
      charge,
      description,
      mediaUrl,
      mediaType,
      nowIso(),
      postId,
      auth.provider.id
    )
    .run();
 
  return jsonResponse({
    success: true,
    message: "Service updated.",
    service: await getPostForPublic(
      env.DB,
      postId
    ),
  });
}
 
async function handleProviderServiceDelete(
  request,
  env
) {
  const auth = await requireProvider(
    request,
    env
  );
 
  if (auth.response) {
    return auth.response;
  }
 
  let body;
 
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      "Invalid JSON body."
    );
  }
 
  const postId = String(
    body.post_id || ""
  ).trim();
 
  if (!postId) {
    return errorResponse(
      "post_id is required."
    );
  }
 
  const post = await env.DB
    .prepare(`
      SELECT *
      FROM feedx_posts
      WHERE id = ?
        AND provider_id = ?
    `)
    .bind(
      postId,
      auth.provider.id
    )
    .first();
   if (!post) {
    return errorResponse(
      "Service not found or it does not belong to you.",
      404
    );
  }
 
  const conversations = await env.DB
    .prepare(`
      SELECT id
      FROM time_market_conversations
      WHERE service_post_id = ?
    `)
    .bind(postId)
    .all();
 
  for (const conversation of conversations.results || []) {
    await deleteConversationMessageMedia(
      env,
      conversation.id
    );
 
    await env.DB
      .prepare(`
        DELETE FROM time_market_messages
        WHERE conversation_id = ?
      `)
      .bind(conversation.id)
      .run();
  }
 
  await env.DB.batch([
    env.DB
      .prepare(`
        DELETE FROM time_market_conversations
        WHERE service_post_id = ?
      `)
      .bind(postId),
 
    env.DB
      .prepare(`
        DELETE FROM home_comments
        WHERE post_id = ?
      `)
      .bind(postId),
 
    env.DB
      .prepare(`
        DELETE FROM home_reactions
        WHERE post_id = ?
      `)
      .bind(postId),
 
    env.DB
      .prepare(`
        DELETE FROM feedx_post_analytics
        WHERE post_id = ?
      `)
      .bind(postId),
 
    env.DB
      .prepare(`
        DELETE FROM feedx_view_sessions
        WHERE post_id = ?
      `)
      .bind(postId),
 
    env.DB
      .prepare(`
        DELETE FROM feedx_posts
        WHERE id = ?
      `)
      .bind(postId),
  ]);
 
  await deleteR2Key(env, post.logo_key);
  await deleteR2Key(env, post.media_key);
 
  return jsonResponse({
    success: true,
    message: "Service deleted.",
  });
}
 
async function handleConversationStart(
  request,
  env
) {
  const auth = await requireProvider(
    request,
    env
  );
 
  if (auth.response) {
    return auth.response;
  }
 
  let body;
 
  try {    body = await request.json();
  } catch {
    return errorResponse(
      "Invalid JSON body."
    );
  }
 
  const postId = String(
    body.service_post_id ||
      body.post_id ||
      ""
  ).trim();
 
  if (!postId) {
    return errorResponse(
      "service_post_id is required."
    );
  }
 
  const service = await env.DB
    .prepare(`
      SELECT *
      FROM feedx_posts
      WHERE id = ?
    `)
    .bind(postId)
    .first();
 
  if (!service) {
    return errorResponse(
      "Service not found.",
      404
    );
  }
 
  if (!service.provider_id) {
    return errorResponse(
      "This legacy service is not linked to a registered provider yet.",
      409
    );
  }
 
  if (
    String(service.provider_id) ===
    String(auth.provider.id)
  ) {
    return errorResponse(
      "You cannot start a buyer chat with yourself."
    );
  }
 
  const conversationId =
    crypto.randomUUID();
 
  const timestamp = nowIso();
 
  await env.DB
    .prepare(`
      INSERT INTO time_market_conversations (
        id,
        service_post_id,
        provider_id,
        customer_provider_id,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(service_post_id, provider_id, customer_provider_id)
      DO NOTHING
    `)
    .bind(
      conversationId,
      postId,
      service.provider_id,
      auth.provider.id,
      timestamp,
      timestamp
    )
    .run();
 
  const conversation = await env.DB
    .prepare(`
      SELECT *
      FROM time_market_conversations
      WHERE service_post_id = ?
        AND provider_id = ?
        AND customer_provider_id = ?
      LIMIT 1
    `)
    .bind(postId, service.provider_id, auth.provider.id)
    .first();
 
  return jsonResponse(
    {
      success: true,
      conversation,
    },
    conversation?.id === conversationId ? 201 : 200
  );
} 
async function handleConversationList(
  request,
  env
) {
  const auth = await requireProvider(
    request,
    env
  );
 
  if (auth.response) {
    return auth.response;
  }
 
  const deliveredAt = nowIso();
 
  await env.DB
    .prepare(`
      UPDATE time_market_messages
      SET delivered_at = COALESCE(delivered_at, ?)
      WHERE sender_provider_id != ?
        AND conversation_id IN (
          SELECT id
          FROM time_market_conversations
          WHERE provider_id = ? OR customer_provider_id = ?
        )
    `)
    .bind(
      deliveredAt,
      auth.provider.id,
      auth.provider.id,
      auth.provider.id
    )
    .run();
 
  const result = await env.DB
    .prepare(`
      SELECT
        c.*,
        s.service_name,
        s.title AS service_title,
        s.creator_name
          AS service_provider_name,
        s.title
          AS service_charge_per_minute,
        s.subtitle
          AS work_description,
        s.media_url
          AS service_media_url,
        buyer.full_name
          AS customer_full_name,
        buyer.phone
          AS customer_phone,
        buyer.profile_image_url
          AS customer_profile_image_url,
        buyer.verification_status
          AS customer_verification_status,
        seller.full_name
          AS provider_full_name,
        seller.phone
          AS provider_phone,
        seller.profile_image_url
          AS provider_profile_image_url,
        seller.verification_status
          AS provider_verification_status,
        (
          SELECT COALESCE(
            NULLIF(m.text_content, ''),
            NULLIF(m.file_name, ''),
            CASE m.message_type
              WHEN 'image' THEN 'Photo'
              WHEN 'voice' THEN 'Voice message'
              WHEN 'video' THEN 'Video'
              WHEN 'document' THEN 'Document'
              ELSE 'Message'
            END
          )
          FROM time_market_messages m
          WHERE m.conversation_id = c.id
          ORDER BY
            datetime(m.created_at) DESC
          LIMIT 1
        ) AS last_message,
        (
          SELECT m.message_type
          FROM time_market_messages m
          WHERE m.conversation_id = c.id
          ORDER BY
            datetime(m.created_at) DESC
          LIMIT 1
        ) AS last_message_type,
        (
          SELECT m.created_at
          FROM time_market_messages m
          WHERE m.conversation_id = c.id
          ORDER BY datetime(m.created_at) DESC, m.id DESC
          LIMIT 1
        ) AS last_message_at,
        (
          SELECT COUNT(*)          FROM time_market_messages m
          WHERE m.conversation_id = c.id
            AND m.sender_provider_id != ?
            AND m.read_at IS NULL
        ) AS unread_count
      FROM time_market_conversations c
      LEFT JOIN feedx_posts s
        ON s.id = c.service_post_id
      LEFT JOIN time_market_providers buyer
        ON buyer.id = c.customer_provider_id
      LEFT JOIN time_market_providers seller
        ON seller.id = c.provider_id
      WHERE (c.provider_id = ? OR c.customer_provider_id = ?)
      AND EXISTS (
        SELECT 1
        FROM time_market_messages visible
        WHERE visible.conversation_id = c.id
      )
      ORDER BY datetime(COALESCE(c.last_message_at, c.updated_at)) DESC
    `)
    .bind(
      auth.provider.id,
      auth.provider.id,
      auth.provider.id
    )
    .all();
 
  return jsonResponse(
    {
      success: true,
      conversations: result.results || [],
      privacy_notice:
        "Messages are private between participants in normal use, but authorized Gwamo administrators can access conversations for safety, support, and abuse investigations as disclosed in the Privacy Policy.",
    },
    200,
    {
      "Cache-Control": "no-store",
    }
  );
}
 
async function handleConversationMessages(
  request,
  env
) {
  const auth = await requireProvider(
    request,
    env
  );
 
  if (auth.response) {
    return auth.response;
  }
 
  const url = new URL(request.url);
 
  const conversationId = String(
    url.searchParams.get(
      "conversation_id"
    ) || ""
  ).trim();
  const before = String(url.searchParams.get("before") || "").trim();
  const beforeId = String(url.searchParams.get("before_id") || "").trim();
  const limit = clamp(
    Number.parseInt(url.searchParams.get("limit") || "100", 10) || 100,
    1,
    200
  );
 
  if (!conversationId) {
    return errorResponse(
      "conversation_id is required."
    );
  }
 
  if (before && !Number.isFinite(Date.parse(before))) {
    return errorResponse("before must be a valid ISO date-time.");
  }
 
  const conversation =
    await conversationParticipant(
      env.DB,
      conversationId,
      auth.provider.id
    );
 
  if (!conversation) {
    return errorResponse(
      "Conversation not found.",
      404
    );
  }
 
  const openedAt = nowIso();
 
  await env.DB
    .prepare(`
      UPDATE time_market_messages
      SET delivered_at = COALESCE(delivered_at, ?),
          read_at = COALESCE(read_at, ?)      WHERE conversation_id = ?
        AND sender_provider_id != ?
    `)
    .bind(openedAt, openedAt, conversationId, auth.provider.id)
    .run();
 
  const result = await env.DB
    .prepare(`
      WITH message_page AS (
        SELECT
          m.*,
          p.full_name AS sender_full_name,
          p.service_provider_name AS sender_service_provider_name
        FROM time_market_messages m
        LEFT JOIN time_market_providers p ON p.id = m.sender_provider_id
        WHERE m.conversation_id = ?
          AND (
            ? = ''
            OR m.created_at < ?
            OR (m.created_at = ? AND m.id < ?)
          )
        ORDER BY m.created_at DESC, m.id DESC
        LIMIT ?
      )
      SELECT *
      FROM message_page
      ORDER BY created_at ASC, id ASC
    `)
    .bind(
      conversationId,
      before,
      before,
      before,
      beforeId,
      limit + 1
    )
    .all();
 
  const pageRows = result.results || [];
  const hasMore = pageRows.length > limit;
  const visibleRows = hasMore ? pageRows.slice(1) : pageRows;
  const messages = await Promise.all(
    visibleRows.map((message) =>
      mapMessageForResponse(request, env, message)
    )
  );
 
  await notifyConversationRoom(env, conversationId, {
    type: "read_receipt",
    conversation_id: conversationId,
    reader_provider_id: String(auth.provider.id),
    read_at: openedAt,
  });
 
  return jsonResponse(
    {
      success: true,
      conversation,
      messages,
      has_more: hasMore,
      next_cursor: hasMore ? visibleRows[0]?.created_at || null : null,
      next_before: hasMore ? visibleRows[0]?.created_at || null : null,
      next_before_id: hasMore ? visibleRows[0]?.id || null : null,
    },
    200,
    {
      "Cache-Control": "no-store",
    }
  );
}
 
async function handleConversationSend(
  request,
  env
) {
  const auth = await requireProvider(
    request,
    env
  );
 
  if (auth.response) {
    return auth.response;
  }
 
  const contentType = String(
    request.headers.get("content-type") || ""
  );
 
  let conversationId = "";
  let textContent = "";
  let requestedType = "text";
  let file = null;
 
  if (
    contentType
      .toLowerCase()
      .includes("multipart/form-data")
  ) {
    const formData = await request.formData();
     conversationId = String(
      formData.get("conversation_id") || ""
    ).trim();
 
    textContent = String(
      formData.get("text") || ""
    ).trim();
 
    requestedType = String(
      formData.get("message_type") || ""
    )
      .trim()
      .toLowerCase();
 
    file = formData.get("file");
  } else {
    let body;
 
    try {
      body = await request.json();
    } catch {
      return errorResponse(
        "Invalid JSON body."
      );
    }
 
    conversationId = String(
      body.conversation_id || ""
    ).trim();
 
    textContent = String(
      body.text ||
        body.text_content ||
        ""
    ).trim();
 
    requestedType = String(
      body.message_type || "text"
    )
      .trim()
      .toLowerCase();
  }
 
  if (!conversationId) {
    return errorResponse(
      "conversation_id is required."
    );
  }
 
  if (
    textContent.length >
    MAX_CHAT_TEXT_LENGTH
  ) {
    return errorResponse(
      `Message must be ${MAX_CHAT_TEXT_LENGTH} characters or fewer.`
    );
  }
 
  const conversation =
    await conversationParticipant(
      env.DB,
      conversationId,
      auth.provider.id
    );
 
  if (!conversation) {
    return errorResponse(
      "Conversation not found.",
      404
    );
  }
 
  if (
    !checkRateLimit(
      `chat:${auth.provider.id}`,
      60,
      60_000
    )
  ) {
    return errorResponse(
      "Too many messages. Please try again shortly.",
      429
    );
  }
 
  let messageType = "text";
  let mediaUrl = "";
  let mediaKey = null;
  let fileName = "";
  let fileSize = 0;
  let mimeType = "";
  let uploaded = null;
 
  try {
    if (
      file instanceof File &&
      file.size > 0
    ) {
      if (!getPrivateMediaSecret(env)) {
        return errorResponse(          "Private attachment signing is not configured. Add a MEDIA_SIGNING_KEY secret of at least 32 characters.",
          503
        );
      }
 
      let kind;
 
      if (file.type.startsWith("image/")) {
        kind = "chat_image";
        messageType = "image";
      } else if (
        file.type.startsWith("audio/")
      ) {
        kind = "chat_audio";
        messageType = "voice";
      } else if (
        file.type.startsWith("video/")
      ) {
        kind = "chat_video";
        messageType = "video";
      } else {
        kind = "chat_document";
        messageType = "document";
      }
 
      uploaded = await uploadFile(
        request,
        env,
        file,
        kind
      );
 
      mediaUrl = "";
      mediaKey = uploaded.key;
      fileName = safeFileName(file.name || "attachment");
      fileSize = Number(file.size || 0);
      mimeType = String(file.type || "application/octet-stream");
    } else {
      if (!textContent) {
        return errorResponse(
          "Message cannot be empty."
        );
      }
 
      messageType =
        requestedType === "text"
          ? "text"
          : "text";
    }
 
    const messageId =
      crypto.randomUUID();
 
    const timestamp = nowIso();
 
    await env.DB.batch([
      env.DB
        .prepare(`
          INSERT INTO time_market_messages (
            id,
            conversation_id,
            sender_provider_id,
            message_type,
            text_content,
            media_url,
            media_key,
            file_name,
            file_size,
            mime_type,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          messageId,
          conversationId,
          auth.provider.id,
          messageType,
          textContent,
          mediaUrl,
          mediaKey,
          fileName,
          fileSize,
          mimeType,
          timestamp
        ),
 
      env.DB
        .prepare(`
          UPDATE time_market_conversations
          SET last_message_at = ?,
              updated_at = ?
          WHERE id = ?
        `)
        .bind(
          timestamp,
          timestamp,
          conversationId
        ),
    ]); 
    const message = await env.DB
      .prepare(`
        SELECT *
        FROM time_market_messages
        WHERE id = ?
      `)
      .bind(messageId)
      .first();
 
    const publicMessage = await mapMessageForResponse(
      request,
      env,
      message
    );
 
    await notifyConversationRoom(env, conversationId, {
      type: "message",
      conversation_id: conversationId,
      message: publicMessage,
    });
 
    return jsonResponse(
      {
        success: true,
        message: publicMessage,
      },
      201,
      {
        "Cache-Control": "no-store",
      }
    );
  } catch (error) {
    await deleteR2Key(
      env,
      uploaded?.key
    );
 
    return errorResponse(
      error?.message ||
        "Could not send message.",
      400
    );
  }
}
 
async function notifyConversationRoom(env, conversationId, payload) {
  if (!env.CHAT_ROOMS || !conversationId) return;
 
  try {
    const id = env.CHAT_ROOMS.idFromName(String(conversationId));
    const room = env.CHAT_ROOMS.get(id);
    await room.fetch("https://chat.internal/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.warn("Realtime broadcast failed; polling remains available:", error);
  }
}
 
async function handleRealtimeTicket(request, env) {
  const auth = await requireProvider(request, env);
  if (auth.response) return auth.response;
 
  if (!env.CHAT_ROOMS) {
    return errorResponse(
      "Realtime chat is not configured. Bind CHAT_ROOMS to ConversationRoom; normal polling still works.",
      503,
      { realtime_available: false }
    );
  }
 
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.");
  }
 
  const conversationId = String(body.conversation_id || "").trim();
  if (!conversationId) return errorResponse("conversation_id is required.");
 
  const conversation = await conversationParticipant(
    env.DB,
    conversationId,
    auth.provider.id
  );
  if (!conversation) return errorResponse("Conversation not found.", 404);
 
  const rawTicket = `${crypto.randomUUID()}${randomHex(24)}`.replace(/-/g, "");
  const tokenHash = await hashToken(rawTicket);
  const ticketId = crypto.randomUUID();
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + REALTIME_TICKET_TTL_MS).toISOString();
 
  await env.DB.batch([
    env.DB
      .prepare(`        DELETE FROM time_market_realtime_tickets
        WHERE expires_at <= ? OR used_at IS NOT NULL
      `)
      .bind(createdAt),
    env.DB
      .prepare(`
        INSERT INTO time_market_realtime_tickets (
          id, token_hash, conversation_id, provider_id,
          expires_at, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .bind(
        ticketId,
        tokenHash,
        conversationId,
        auth.provider.id,
        expiresAt,
        createdAt
      ),
  ]);
 
  const socketUrl = new URL("/api/time-market/realtime/connect", request.url);
  socketUrl.protocol = socketUrl.protocol === "https:" ? "wss:" : "ws:";
  socketUrl.searchParams.set("ticket", rawTicket);
 
  return jsonResponse(
    {
      success: true,
      realtime_available: true,
      websocket_url: socketUrl.toString(),
      expires_at: expiresAt,
    },
    201,
    { "Cache-Control": "no-store" }
  );
}
 
async function handleRealtimeConnect(request, env) {
  if (!env.CHAT_ROOMS) {
    return errorResponse("Realtime chat is not configured.", 503);
  }
 
  if (String(request.headers.get("Upgrade") || "").toLowerCase() !== "websocket") {
    return errorResponse("A WebSocket upgrade is required.", 426, {
      upgrade: "websocket",
    });
  }
 
  const url = new URL(request.url);
  const rawTicket = String(url.searchParams.get("ticket") || "").trim();
  if (!rawTicket) return errorResponse("Realtime ticket is required.", 401);
 
  const tokenHash = await hashToken(rawTicket);
  const ticket = await env.DB
    .prepare(`
      SELECT t.*, c.provider_id AS seller_id,
             c.customer_provider_id AS buyer_id
      FROM time_market_realtime_tickets t
      JOIN time_market_conversations c ON c.id = t.conversation_id
      WHERE t.token_hash = ? AND t.used_at IS NULL
      LIMIT 1
    `)
    .bind(tokenHash)
    .first();
 
  if (
    !ticket ||
    Date.parse(ticket.expires_at || "") <= Date.now() ||
    ![String(ticket.seller_id), String(ticket.buyer_id)].includes(
      String(ticket.provider_id)
    )
  ) {
    return errorResponse("Realtime ticket is invalid or expired.", 401);
  }
 
  const used = await env.DB
    .prepare(`
      UPDATE time_market_realtime_tickets
      SET used_at = ?
      WHERE id = ? AND used_at IS NULL AND expires_at > ?
    `)
    .bind(nowIso(), ticket.id, nowIso())
    .run();
 
  if (Number(used?.meta?.changes || 0) !== 1) {
    return errorResponse("Realtime ticket has already been used.", 401);
  }
 
  const roomId = env.CHAT_ROOMS.idFromName(String(ticket.conversation_id));
  const room = env.CHAT_ROOMS.get(roomId);
  const headers = new Headers(request.headers);
  headers.set("X-Conversation-Id", String(ticket.conversation_id));
  headers.set("X-Provider-Id", String(ticket.provider_id));
 
  return room.fetch(
    new Request("https://chat.internal/connect", {
      method: "GET",
      headers,
    })  );
}
 
// =============================================================================
// PUBLIC TV CONVERSATION
// -----------------------------------------------------------------------
// Entirely separate from private Time Market messaging above. Reading is
// public (no auth); sending requires an authenticated provider. The provider ID
// always comes from the server-side session, while Home.jsx may supply a separate
// sanitized display name/profile photo used only for this public TV appearance.
// Real-time delivery reuses the same ConversationRoom
// Durable Object as private chat, just keyed by "tv:<post_id>" instead of a
// conversation id, so no second real-time system is needed.
// =============================================================================
async function handleGetTvConversation(request, env) {
  const url = new URL(request.url);
  const tvPostId = String(
    url.searchParams.get("post_id") ||
      url.searchParams.get("tv_post_id") ||
      ""
  ).trim();
 
  if (!tvPostId) {
    return errorResponse("post_id is required.");
  }
 
  const limit = clamp(
    Number.parseInt(
      url.searchParams.get("limit") || String(TV_RECENT_MESSAGE_LIMIT),
      10
    ) || TV_RECENT_MESSAGE_LIMIT,
    1,
    50
  );
 
  const result = await env.DB
    .prepare(`
      SELECT id, tv_post_id, user_id, user_name, profile_image,
             country_code, message, created_at
      FROM tv_conversations
      WHERE tv_post_id = ?
      ORDER BY datetime(created_at) DESC, id DESC
      LIMIT ?
    `)
    .bind(tvPostId, limit)
    .all();
 
  // Oldest first, so the client can just append in natural reading order.
  const messages = (result.results || []).slice().reverse();
 
  return jsonResponse(
    { success: true, messages },
    200,
    { "Cache-Control": "no-store" }
  );
}
 
async function handleAdminPostTvConversation(request, env) {
  // Admin PIN auth — matches the /api/admin/* convention.
  const authError = authorizeAdminRequest(request, env, "");
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.");
  }

  const tvPostId = String(body.tv_post_id || body.post_id || "").trim();
  const message = sanitizeTvMessage(body.message);
  const countryCode = normalizeCountryCode(body.country_code);

  if (!tvPostId) return errorResponse("tv_post_id is required.");
  if (!message) return errorResponse("Message cannot be empty.");
  if (!countryCode) return errorResponse("Choose a valid country.");

  if (!(await postExists(env.DB, tvPostId))) {
    return errorResponse("TV post not found.", 404);
  }

  // Admin-side display identity. Falls back gracefully if fields are missing.
  const userName =
    normalizeTvDisplayName(body.user_name || body.display_name || "") ||
    "Someone";

  const profileImage = normalizeTvProfileImage(
    body.profile_image || body.profile_image_url || ""
  );

  const id = crypto.randomUUID();
  const createdAt = nowIso();

  await env.DB
    .prepare(`
      INSERT INTO tv_conversations (
        id, tv_post_id, user_id, user_name, profile_image,
        country_code, message, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      id,
      tvPostId,
      "admin",       // admin-authored rows carry no real provider id
      userName,
      profileImage,
      countryCode,
      message,
      createdAt
    )
    .run();

  const created = {
    id,
    tv_post_id: tvPostId,
    user_id: "admin",
    user_name: userName,
    profile_image: profileImage,
    country_code: countryCode,
    message,
    created_at: createdAt,
  };

  // Live broadcast to anyone watching this TV post (same as public path).
  await notifyConversationRoom(env, `tv:${tvPostId}`, {
    type: "tv_message",
    tv_post_id: tvPostId,
    message: created,
  });

  return jsonResponse(
    {
      success: true,
      message: created,
      conversation: created,   // Admin.jsx reads result.conversation
    },
    201,
    { "Cache-Control": "no-store" }
  );
}

async function handlePostTvConversation(request, env) {
  const publicIdentity = await request.clone().json().catch(() => ({}));
const loggedInProvider = await getAuthenticatedProvider(request, env);
 
const viewerId = String(publicIdentity.viewer_id || "")
  .replace(/[\u0000-\u001F\u007F]/g, "")
  .trim()
  .slice(0, 128);
  
 
if (!loggedInProvider && !viewerId) {
  return errorResponse("Public viewer identity is missing.", 400);
}
 
const auth = {
  provider:
    loggedInProvider ||
    {
      id: viewerId,
      service_provider_name: "",
      full_name: "",
      profile_image_url: "",
    },
};
 
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.");
  }
 
  const tvPostId = String(body.tv_post_id || body.post_id || "").trim();
  const message = sanitizeTvMessage(body.message);
  const countryCode = normalizeCountryCode(body.country_code);
 
  if (!tvPostId) {
    return errorResponse("tv_post_id is required.");
  }
  if (!message) {
    return errorResponse("Message cannot be empty.");
  }
  if (!countryCode) {
    return errorResponse("Choose a valid country before sending.");  }
  if (!(await postExists(env.DB, tvPostId))) {
    return errorResponse("TV post not found.", 404);
  }
 
  // Spam protection: a short cooldown between individual sends, plus a
  // ceiling on messages per minute - both keyed to the authenticated
  // provider, never anything the client can spoof.
  if (
    !checkRateLimit(`tv-send-cooldown:${auth.provider.id}`, 1, 3_000)
  ) {
    return errorResponse(
      "Please wait a moment before sending another message.",
      429
    );
  }
  if (
    !checkRateLimit(`tv-send-minute:${auth.provider.id}`, 12, 60_000)
  ) {
    return errorResponse("Too many messages. Please slow down.", 429);
  }
 
  const id = crypto.randomUUID();
  const createdAt = nowIso();
 
  // Home.jsx's conversational TV intro lets a logged-in viewer choose a
  // public-on-TV display identity. The authenticated provider ID still remains
  // authoritative and cannot be supplied or changed by the browser.
  const submittedTvName = normalizeTvDisplayName(
    body.user_name || body.display_name || ""
  );
  const submittedTvProfileImage = normalizeTvProfileImage(
    body.profile_image || body.profile_image_url || ""
  );
 
  const userName =
    submittedTvName ||
    auth.provider.service_provider_name ||
    auth.provider.full_name ||
    "Someone";
  const profileImage =
    submittedTvProfileImage || auth.provider.profile_image_url || "";
 
  await env.DB
    .prepare(`
      INSERT INTO tv_conversations (
        id, tv_post_id, user_id, user_name, profile_image,
        country_code, message, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      id,
      tvPostId,
      auth.provider.id,
      userName,
      profileImage,
      countryCode,
      message,
      createdAt
    )
    .run();
 
  const created = {
    id,
    tv_post_id: tvPostId,
    user_id: String(auth.provider.id),
    user_name: userName,
    profile_image: profileImage,
    country_code: countryCode,
    message,
    created_at: createdAt,
  };
 
  await notifyConversationRoom(env, `tv:${tvPostId}`, {
    type: "tv_message",
    tv_post_id: tvPostId,
    message: created,
  });
 
  return jsonResponse(
    { success: true, message: created },
    201,
    { "Cache-Control": "no-store" }
  );
}
 
// Ticket issuance is intentionally public (no auth) - reading the TV
// conversation live requires no login, only sending does.
async function handleTvRealtimeTicket(request, env) {
  if (!env.CHAT_ROOMS) {
    return errorResponse(
      "Realtime TV conversation is not configured. Bind CHAT_ROOMS to ConversationRoom; the polling fallback still works.",
      503,
      { realtime_available: false }
    );
  }
 
  let body;
  try {    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.");
  }
 
  const tvPostId = String(body.tv_post_id || body.post_id || "").trim();
  if (!tvPostId) return errorResponse("tv_post_id is required.");
 
  if (
    !checkRateLimit(`tv-ticket:${getClientIp(request)}`, 30, 60_000)
  ) {
    return errorResponse("Too many requests. Try again shortly.", 429);
  }
 
  if (!(await postExists(env.DB, tvPostId))) {
    return errorResponse("TV post not found.", 404);
  }
 
  const rawTicket = `${crypto.randomUUID()}${randomHex(24)}`.replace(/-/g, "");
  const tokenHash = await hashToken(rawTicket);
  const ticketId = crypto.randomUUID();
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + REALTIME_TICKET_TTL_MS).toISOString();
 
  await env.DB.batch([
    env.DB
      .prepare(`
        DELETE FROM tv_realtime_tickets
        WHERE expires_at <= ? OR used_at IS NOT NULL
      `)
      .bind(createdAt),
    env.DB
      .prepare(`
        INSERT INTO tv_realtime_tickets (
          id, token_hash, tv_post_id, expires_at, created_at
        )
        VALUES (?, ?, ?, ?, ?)
      `)
      .bind(ticketId, tokenHash, tvPostId, expiresAt, createdAt),
  ]);
 
  const socketUrl = new URL("/api/tv/realtime/connect", request.url);
  socketUrl.protocol = socketUrl.protocol === "https:" ? "wss:" : "ws:";
  socketUrl.searchParams.set("ticket", rawTicket);
 
  return jsonResponse(
    {
      success: true,
      realtime_available: true,
      websocket_url: socketUrl.toString(),
      expires_at: expiresAt,
    },
    201,
    { "Cache-Control": "no-store" }
  );
}
 
async function handleTvRealtimeConnect(request, env) {
  if (!env.CHAT_ROOMS) {
    return errorResponse("Realtime TV conversation is not configured.", 503);
  }
  if (
    String(request.headers.get("Upgrade") || "").toLowerCase() !== "websocket"
  ) {
    return errorResponse("A WebSocket upgrade is required.", 426, {
      upgrade: "websocket",
    });
  }
 
  const url = new URL(request.url);
  const rawTicket = String(url.searchParams.get("ticket") || "").trim();
  if (!rawTicket) return errorResponse("Realtime ticket is required.", 401);
 
  const tokenHash = await hashToken(rawTicket);
  const ticket = await env.DB
    .prepare(`
      SELECT * FROM tv_realtime_tickets
      WHERE token_hash = ? AND used_at IS NULL
      LIMIT 1
    `)
    .bind(tokenHash)
    .first();
 
  if (!ticket || Date.parse(ticket.expires_at || "") <= Date.now()) {
    return errorResponse("Realtime ticket is invalid or expired.", 401);
  }
 
  const used = await env.DB
    .prepare(`
      UPDATE tv_realtime_tickets
      SET used_at = ?
      WHERE id = ? AND used_at IS NULL AND expires_at > ?
    `)
    .bind(nowIso(), ticket.id, nowIso())
    .run();
 
  if (Number(used?.meta?.changes || 0) !== 1) {
    return errorResponse("Realtime ticket has already been used.", 401);
  }
   const roomId = env.CHAT_ROOMS.idFromName(`tv:${ticket.tv_post_id}`);
  const room = env.CHAT_ROOMS.get(roomId);
  const headers = new Headers(request.headers);
  headers.set("X-Conversation-Id", `tv:${ticket.tv_post_id}`);
  headers.set("X-Provider-Id", "tv-viewer");
 
  return room.fetch(
    new Request("https://chat.internal/connect", {
      method: "GET",
      headers,
    })
  );
}
 
async function handleAdminTvConversationPhoto(request, env) {
  // 1. Authorize with admin PIN (same as every other /api/admin/* route)
  const authError = authorizeAdminRequest(request, env, "");
  if (authError) return authError;

  // 2. Require multipart form-data
  const contentType = String(request.headers.get("content-type") || "");
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return errorResponse("This endpoint requires multipart/form-data.", 415);
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size <= 0) {
    return errorResponse("No file was received.", 400);
  }

  // 3. Reuse uploadFile with kind=profile_image so the object lands under
  //    feedx/profile_image/... which normalizeTvProfileImage accepts.
  try {
    const uploaded = await uploadFile(request, env, file, "profile_image");
    return jsonResponse({
      success: true,
      url: uploaded.url,
      key: uploaded.key,
    });
  } catch (error) {
    return errorResponse(error?.message || "TV photo upload failed.", 400);
  }
}

async function handleAdminTvConversations(request, env) {
  const url = new URL(request.url);
  const authError = authorizeAdminRequest(
    request,
    env,
    url.searchParams.get("pin") || ""
  );
  if (authError) return authError;

  const tvPostId = String(
    url.searchParams.get("post_id") ||
      url.searchParams.get("tv_post_id") ||
      ""
  ).trim();
  const limit = clamp(
    Number.parseInt(url.searchParams.get("limit") || "500", 10) || 500,
    1,
    1000
  );

  let query = `
    SELECT
      tc.id,
      tc.tv_post_id,
      tc.user_id,
      tc.user_name,
      tc.profile_image,
      tc.country_code,
      tc.message,
      tc.created_at,
      fp.title AS post_title,
      fp.subtitle AS post_subtitle,
      fp.media_url AS post_media_url,
      fp.creator_name AS post_creator_name,
      p.phone AS user_phone,
      p.verification_status AS user_verification_status
    FROM tv_conversations tc
    LEFT JOIN feedx_posts fp
      ON fp.id = tc.tv_post_id
    LEFT JOIN time_market_providers p
      ON p.id = tc.user_id
  `;

  const bindings = [];
  if (tvPostId) {
    query += ` WHERE tc.tv_post_id = ? `;
    bindings.push(tvPostId);
  }
  query += `
    ORDER BY datetime(tc.created_at) DESC, tc.id DESC
    LIMIT ?
  `;
  bindings.push(limit);

  const result = await env.DB.prepare(query).bind(...bindings).all();
  const conversations = result.results || [];

  // Keep several harmless aliases for compatibility with older/newer Admin.jsx
  // builds. They all reference the same authorized TV conversation rows.
  return jsonResponse(
    {
      success: true,
      conversations,
      tv_conversations: conversations,
      messages: conversations,
      items: conversations,
      total: conversations.length,
    },
    200,
    { "Cache-Control": "no-store" }
  );
}

async function handleAdminDeleteTvConversation(request, env) {
  // Admin PIN auth — same as every other /api/admin/* route.
  const authError = authorizeAdminRequest(request, env, "");
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.");
  }

  const conversationId = String(
    body.conversation_id || body.id || ""
  ).trim();

  if (!conversationId) {
    return errorResponse("conversation_id is required.");
  }

  const row = await env.DB
    .prepare(`SELECT id, profile_image FROM tv_conversations WHERE id = ? LIMIT 1`)
    .bind(conversationId)
    .first();

  if (!row) {
    return errorResponse("TV conversation not found.", 404);
  }

  await env.DB
    .prepare(`DELETE FROM tv_conversations WHERE id = ?`)
    .bind(conversationId)
    .run();

  return jsonResponse({
    success: true,
    message:
      "TV conversation, displayed name and profile picture were removed.",
    deleted_id: conversationId,
  });
}


async function handleAdminServices(request, env) {
  const url = new URL(request.url);
  const authError = authorizeAdminRequest(
    request,
    env,
    url.searchParams.get("pin") || ""
  );
  if (authError) return authError;

  const result = await env.DB
    .prepare(`
      SELECT
        fp.*,
        p.verification_status
      FROM feedx_posts fp
      LEFT JOIN time_market_providers p
        ON p.id = fp.provider_id
      ORDER BY datetime(fp.created_at) DESC, fp.id DESC
    `)
    .all();

  const services = await Promise.all(
    (result.results || []).map(async (post) => {
      const [analytics, commentRow, reactionRow] = await Promise.all([
        env.DB
          .prepare(`
            SELECT *
            FROM feedx_post_analytics
            WHERE post_id = ?
          `)
          .bind(post.id)
          .first(),
        env.DB
          .prepare(`
            SELECT COUNT(*) AS count
            FROM home_comments
            WHERE post_id = ?
          `)
          .bind(post.id)
          .first(),
        env.DB
          .prepare(`
            SELECT COUNT(*) AS count
            FROM home_reactions
            WHERE post_id = ?
          `)
          .bind(post.id)
          .first(),
      ]);

      return mapPost(
        post,
        analytics || {},
        Number(commentRow?.count || 0),
        Number(reactionRow?.count || 0)
      );
    })
  );

  return jsonResponse(
    {
      success: true,
      services,
    },
    200,
    {
      "Cache-Control": "no-store",
    }
  );
}

async function handleAdminProviders(
  request,
  env
) {
  const url = new URL(request.url);
  const authError = authorizeAdminRequest(
    request,
    env,
    url.searchParams.get("pin") || ""
  );
  if (authError) return authError;
 
  const result = await env.DB
    .prepare(`      SELECT *
      FROM time_market_providers
      ORDER BY
        CASE verification_status
          WHEN 'pending' THEN 0
          WHEN 'verified' THEN 1
          ELSE 2
        END,
        datetime(created_at) DESC
    `)
    .all();
 
  return jsonResponse(
    {
      success: true,
      providers: (
        result.results || []
      ).map(adminProvider),
    },
    200,
    {
      "Cache-Control": "no-store",
    }
  );
}
 
async function handleAdminVerifyProvider(
  request,
  env
) {
  let body;
 
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      "Invalid JSON body."
    );
  }
 
  const authError = authorizeAdminRequest(request, env, body.pin);
  if (authError) return authError;
 
  const providerId = String(
    body.provider_id || ""
  ).trim();
 
  const status =
    normalizeVerificationStatus(
      body.status
    );
 
  const note = String(
    body.note || ""
  )
    .trim()
    .slice(0, 1000);
 
  if (!providerId) {
    return errorResponse(
      "provider_id is required."
    );
  }
 
  const provider = await getProviderById(
    env.DB,
    providerId
  );
 
  if (!provider) {
    return errorResponse(
      "Provider not found.",
      404
    );
  }
 
  const verifiedAt =
    status === "verified"
      ? nowIso()
      : null;
 
  if (status === "verified" && !provider.pin_hash) {
    return errorResponse(
      "This provider has no personal PIN yet. Ask them to use Forgot PIN before approval.",
      409
    );
  }
 
  // Approving no longer flips the account straight to active. A one-time
  // 6-digit activation code is generated instead; the account only becomes
  // fully active once the person enters that code back in the app (see
  // handleProviderActivate). This closes the loop so a wrong or
  // compromised number can't be silently approved without the real person
  // confirming they actually received the call/SMS.
  const timestamp = nowIso();
  let activationCode = null;
  let activationCodeHash = null;
  let activationCodeExpiresAt = null;
 
  if (status === "verified") {    activationCode = randomVerificationCode();
    activationCodeHash = await hashVerificationSecret(
      activationCode,
      `activation:${provider.id}`,
      env
    );
    activationCodeExpiresAt = new Date(
      Date.now() + ACTIVATION_CODE_TTL_MS
    ).toISOString();
  }
 
  // No code exchange is required for the approval decision itself - the
  // admin confirms the account owner's identity directly by telephone.
  // "Return to pending" always sends the account back to a full review,
  // regardless of any activation state it may have reached before.
  const accountStatus =
    status === "verified"
      ? "pending_activation_code"
      : status === "rejected"
      ? "rejected"
      : "pending_phone_review";
  const phoneVerifiedAt =
    status === "verified"
      ? provider.phone_verified_at || nowIso()
      : provider.phone_verified_at || null;
 
  await env.DB
    .prepare(`
      UPDATE time_market_providers
      SET verification_status = ?,
          verification_note = ?,
          verified_at = ?,
          account_status = ?,
          phone_verified_at = ?,
          phone_verification_code_hash = CASE WHEN ? = 'verified' THEN NULL ELSE phone_verification_code_hash END,
          phone_verification_expires_at = CASE WHEN ? = 'verified' THEN NULL ELSE phone_verification_expires_at END,
          activation_code_hash = ?,
          activation_code_expires_at = ?,
          updated_at = ?
      WHERE id = ?
    `)
    .bind(
      status,
      note,
      verifiedAt,
      accountStatus,
      phoneVerifiedAt,
      status,
      status,
      activationCodeHash,
      activationCodeExpiresAt,
      timestamp,
      providerId
    )
    .run();
 
  if (status !== "verified") {
    await env.DB
      .prepare(`DELETE FROM time_market_sessions WHERE provider_id = ?`)
      .bind(providerId)
      .run();
  }
 
  const updated = await getProviderById(
    env.DB,
    providerId
  );
 
  return jsonResponse({
    success: true,
    message:
      status === "verified"
        ? "Provider approved. Give the activation code to the user by call or SMS - it will not be shown again."
        : status === "rejected"
        ? "Provider rejected."
        : "Provider returned to pending review.",
    activation_code: activationCode || undefined,
    provider: adminProvider(updated),
  });
}
 
async function handleAdminPinResets(request, env) {
  const url = new URL(request.url);
  const authError = authorizeAdminRequest(
    request,
    env,
    url.searchParams.get("pin") || ""
  );
  if (authError) return authError;
 
  const result = await env.DB
    .prepare(`
      SELECT
        r.id,
        r.provider_id,
        r.phone,
        r.status,
        r.expires_at,
        r.approved_at,
        r.rejected_at,        r.used_at,
        r.attempts,
        r.created_at,
        r.updated_at,
        p.full_name,
        p.service_provider_name,
        p.account_status
      FROM time_market_pin_resets r
      JOIN time_market_providers p ON p.id = r.provider_id
      WHERE datetime(r.created_at) >= datetime('now', '-7 days')
      ORDER BY
        CASE r.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
        datetime(r.created_at) DESC
    `)
    .all();
 
  return jsonResponse(
    { success: true, requests: result.results || [] },
    200,
    { "Cache-Control": "no-store" }
  );
}
 
// CHANGED: approving a reset now immediately generates a random 8-digit PIN,
// hashes and sets it on the provider's account, and returns the plaintext
// PIN in this one response only - it is never stored or logged anywhere in
// plaintext after that. The admin reads it to the person on the same call
// (or sends it by SMS) instead of the person typing their own new PIN into
// the app later. This also fully consumes the reset request (status
// 'used'), so there is no separate "waiting for the user to finish" state.
async function handleAdminPinResetDecision(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.");
  }
 
  const authError = authorizeAdminRequest(request, env, body.pin);
  if (authError) return authError;
 
  const requestId = String(body.request_id || "").trim();
  const verificationCode = String(body.verification_code || "").trim();
  const decision = String(body.status || body.decision || "approved")
    .trim()
    .toLowerCase();
 
  if (!requestId) return errorResponse("request_id is required.");
  if (!["approved", "rejected"].includes(decision)) {
    return errorResponse("status must be approved or rejected.");
  }
 
  const reset = await env.DB
    .prepare(`SELECT * FROM time_market_pin_resets WHERE id = ? LIMIT 1`)
    .bind(requestId)
    .first();
 
  if (!reset) return errorResponse("PIN reset request not found.", 404);
  if (reset.status !== "pending") {
    return errorResponse(`This request is already ${reset.status}.`, 409);
  }
  if (Date.parse(reset.expires_at || "") <= Date.now()) {
    await env.DB
      .prepare(`UPDATE time_market_pin_resets SET status = 'expired', updated_at = ? WHERE id = ?`)
      .bind(nowIso(), requestId)
      .run();
    return errorResponse("This PIN reset code expired.", 410);
  }
 
  if (decision === "rejected") {
    const timestamp = nowIso();
    await env.DB
      .prepare(`
        UPDATE time_market_pin_resets
        SET status = 'rejected', rejected_at = ?, updated_at = ?
        WHERE id = ?
      `)
      .bind(timestamp, timestamp, requestId)
      .run();
    return jsonResponse({ success: true, status: "rejected" });
  }
 
  if (!verificationCode) {
    return errorResponse(
      "Call the registered number and enter the code the account owner reads.",
      400
    );
  }
 
  const candidateHash = await hashVerificationSecret(
    verificationCode,
    `pin-reset:${requestId}`,
    env
  );
 
  if (!constantTimeEqual(candidateHash, reset.verification_code_hash)) {
    const attempts = Number(reset.attempts || 0) + 1;
    const status = attempts >= 5 ? "rejected" : "pending";
    await env.DB
      .prepare(`        UPDATE time_market_pin_resets
        SET attempts = ?, status = ?, rejected_at = CASE WHEN ? = 'rejected' THEN ? ELSE rejected_at END, updated_at = ?
        WHERE id = ?
      `)
      .bind(attempts, status, status, nowIso(), nowIso(), requestId)
      .run();
    return errorResponse(
      attempts >= 5
        ? "Too many wrong codes. This reset request was rejected."
        : "The code does not match. Do not approve this reset.",
      403,
      { attempts_remaining: Math.max(0, 5 - attempts) }
    );
  }
 
  // Code matches - identity is confirmed. Generate a brand-new 8-digit PIN,
  // hash it, and set it on the account right now.
  const generatedPin = randomPin();
  const pinRecord = await createPinRecord(generatedPin, env);
  const timestamp = nowIso();
 
  await env.DB.batch([
    env.DB
      .prepare(`
        UPDATE time_market_providers
        SET pin_hash = ?,
            pin_salt = ?,
            pin_iterations = ?,
            pin_set_at = ?,
            phone_verified_at = COALESCE(phone_verified_at, ?),
            failed_login_attempts = 0,
            login_locked_until = NULL,
            updated_at = ?
        WHERE id = ?
      `)
      .bind(
        pinRecord.hash,
        pinRecord.salt,
        pinRecord.iterations,
        timestamp,
        timestamp,
        timestamp,
        reset.provider_id
      ),
    env.DB
      .prepare(`DELETE FROM time_market_sessions WHERE provider_id = ?`)
      .bind(reset.provider_id),
    env.DB
      .prepare(`
        UPDATE time_market_pin_resets
        SET status = 'used',
            approved_at = ?,
            used_at = ?,
            recovery_token_hash = NULL,
            updated_at = ?
        WHERE id = ?
      `)
      .bind(timestamp, timestamp, timestamp, requestId),
  ]);
 
  return jsonResponse({
    success: true,
    status: "used",
    approved: true,
    generated_pin: generatedPin,
    phone: reset.phone,
    message:
      "A new 8-digit PIN was generated and set on this account. Read it to the user now, or send it by SMS - it will not be shown again.",
  });
}
 
async function handleAdminConversations(
  request,
  env
) {
  const url = new URL(request.url);
  const authError = authorizeAdminRequest(
    request,
    env,
    url.searchParams.get("pin") || ""
  );
  if (authError) return authError;
 
  const conversationId = String(
    url.searchParams.get(
      "conversation_id"
    ) || ""
  ).trim();
 
  if (conversationId) {
    const conversation = await env.DB
      .prepare(`
        SELECT
          c.*,
          s.creator_name
            AS service_provider_name,
          s.title
            AS service_charge_per_minute,
          s.subtitle
            AS work_description,          buyer.full_name
            AS customer_full_name,
          buyer.phone
            AS customer_phone,
          seller.full_name
            AS provider_full_name,
          seller.phone
            AS provider_phone
        FROM time_market_conversations c
        LEFT JOIN feedx_posts s
          ON s.id = c.service_post_id
        LEFT JOIN time_market_providers buyer
          ON buyer.id =
             c.customer_provider_id
        LEFT JOIN time_market_providers seller
          ON seller.id = c.provider_id
        WHERE c.id = ?
      `)
      .bind(conversationId)
      .first();
 
    if (!conversation) {
      return errorResponse(
        "Conversation not found.",
        404
      );
    }
 
    const messages = await env.DB
      .prepare(`
        SELECT
          m.*,
          p.full_name
            AS sender_full_name,
          p.phone
            AS sender_phone,
          p.service_provider_name
            AS sender_service_provider_name
        FROM time_market_messages m
        LEFT JOIN time_market_providers p
          ON p.id = m.sender_provider_id
        WHERE m.conversation_id = ?
        ORDER BY
          datetime(m.created_at) ASC,
          m.id ASC
      `)
      .bind(conversationId)
      .all();
 
    const safeMessages = await Promise.all(
      (messages.results || []).map((message) =>
        mapMessageForResponse(request, env, message)
      )
    );
 
    return jsonResponse(
      {
        success: true,
        conversation,
        messages: safeMessages,
        privacy_notice:
          "Authorized Gwamo administrators can read all conversations, including those labeled private. Users are informed in the Privacy Policy.",
      },
      200,
      {
        "Cache-Control": "no-store",
      }
    );
  }
 
  const result = await env.DB
    .prepare(`
      SELECT
        c.*,
        s.creator_name
          AS service_provider_name,
        buyer.full_name
          AS customer_full_name,
        buyer.phone
          AS customer_phone,
        seller.full_name
          AS provider_full_name,
        seller.phone
          AS provider_phone,
        (
          SELECT COUNT(*)
          FROM time_market_messages m
          WHERE m.conversation_id = c.id
        ) AS message_count,
        (
          SELECT m.created_at
          FROM time_market_messages m
          WHERE m.conversation_id = c.id
          ORDER BY datetime(m.created_at) DESC
          LIMIT 1
        ) AS last_message_at
      FROM time_market_conversations c
      LEFT JOIN feedx_posts s
        ON s.id = c.service_post_id
      LEFT JOIN time_market_providers buyer        ON buyer.id = c.customer_provider_id
      LEFT JOIN time_market_providers seller
        ON seller.id = c.provider_id
      WHERE EXISTS (
        SELECT 1 FROM time_market_messages visible
        WHERE visible.conversation_id = c.id
      )
      ORDER BY datetime(c.updated_at) DESC
    `)
    .all();
 
  return jsonResponse(
    {
      success: true,
      conversations: result.results || [],
      privacy_notice:
        "Authorized Gwamo administrators can read all conversations, including those labeled private. Users are informed in the Privacy Policy.",
    },
    200,
    {
      "Cache-Control": "no-store",
    }
  );
}
 
async function handleAdminUpdateStats(
  request,
  env
) {
  let body;
 
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      "Invalid JSON body."
    );
  }
 
  const authError = authorizeAdminRequest(request, env, body.pin);
  if (authError) return authError;
 
  const postId = String(
    body.post_id || ""
  ).trim();
 
  const manualViews = Number(
    body.manual_views
  );
 
  const manualReactions = Number(
    body.manual_reactions
  );

   const manualWatching = Number(
    body.manual_watching || 0
  );
 
  if (!postId) {
    return errorResponse(
      "post_id is required."
    );
  }
 
  if (
    !Number.isSafeInteger(manualViews) ||
    manualViews < 0 ||
    !Number.isSafeInteger(manualReactions) ||
    manualReactions < 0 ||
    !Number.isSafeInteger(manualWatching) ||
    manualWatching < 0
  ) {
    return errorResponse(
      "manual_views and manual_reactions must be whole numbers of zero or more."
    );
  }
 
  if (!(await postExists(env.DB, postId))) {
    return errorResponse(
      "Post not found.",
      404
    );
  }
 
  await ensureAnalyticsRow(
    env.DB,
    postId
  );
 
  await env.DB
    .prepare(`
         UPDATE feedx_post_analytics
      SET manual_views = ?,
          manual_reactions = ?,
          manual_watching = ?,
          updated_at = ?
      WHERE post_id = ?
    `)
      .bind(
      manualViews,
      manualReactions,
      manualWatching,
      nowIso(),
      postId
    )
    .run();
 
  const post = await getPostForPublic(    env.DB,
    postId
  );
 
  return jsonResponse({
    success: true,
    post,
  });
}
 
async function handleAdminDeletePost(
  request,
  env
) {
  let body;
 
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      "Invalid JSON body."
    );
  }
 
  const authError = authorizeAdminRequest(request, env, body.pin);
  if (authError) return authError;
 
  const postId = String(
    body.post_id || ""
  ).trim();
 
  if (!postId) {
    return errorResponse(
      "post_id is required."
    );
  }
 
  const post = await env.DB
    .prepare(`
      SELECT *
      FROM feedx_posts
      WHERE id = ?
    `)
    .bind(postId)
    .first();
 
  if (!post) {
    return errorResponse(
      "Post not found.",
      404
    );
  }
 
  await deletePostWithRelations(env, post);
 
  return jsonResponse({
    success: true,
    message:
      "Post deleted successfully.",
  });
}
 
async function handleAdminReport(
  request,
  env
) {
  const url = new URL(request.url);
  const authError = authorizeAdminRequest(
    request,
    env,
    url.searchParams.get("pin") || ""
  );
  if (authError) return authError;
 
  const result = await env.DB
    .prepare(`
      SELECT *
      FROM feedx_posts
      ORDER BY
        datetime(created_at) DESC,
        id DESC
    `)
    .all();
 
  const report = [];
 
  for (const post of result.results || []) {
    const postId = String(post.id);
 
    const analytics = await env.DB
      .prepare(`
        SELECT *
        FROM feedx_post_analytics
        WHERE post_id = ?
      `)
      .bind(postId)
      .first();
 
    const comments = await env.DB
      .prepare(`        SELECT
          id,
          commenter_phone,
          country_flag,
          comment,
          created_at
        FROM home_comments
        WHERE post_id = ?
        ORDER BY
          datetime(created_at) DESC,
          id DESC
      `)
      .bind(postId)
      .all();
 
    const reactionRow = await env.DB
      .prepare(`
        SELECT COUNT(*) AS count
        FROM home_reactions
        WHERE post_id = ?
      `)
      .bind(postId)
      .first();
 
    const watchSeconds = Number(
      analytics?.watch_seconds || 0
    );
 
    const minutes = Math.floor(
      watchSeconds / 60
    );
 
    const seconds =
      watchSeconds % 60;
 
    report.push({
      ...mapPost(
        post,
        analytics || {},
        (comments.results || []).length,
        Number(
          reactionRow?.count || 0
        )
      ),
      creator_phone_or_website:
        post.creator_identity || "",
      total_watch_seconds:
        watchSeconds,
      formatted_watch_duration:
        `${minutes} minute${
          minutes === 1 ? "" : "s"
        } ${seconds} second${
          seconds === 1 ? "" : "s"
        }`,
      comments:
        comments.results || [],
      envelope_clicks: Number(
        analytics?.envelope_clicks || 0
      ),
      last_envelope_clicked_at:
        analytics
          ?.last_envelope_clicked_at ||
        null,
      last_watched_at:
        analytics?.last_watched_at ||
        null,
    });
  }
 
  return jsonResponse(
    {
      success: true,
      report,
    },
    200,
    {
      "Cache-Control": "no-store",
    }
  );
}
 
async function handlePrivateMessageMedia(request, env) {
  const secret = getPrivateMediaSecret(env);
  if (!secret) {
    return errorResponse(
      "Private media signing is not configured.",
      503
    );
  }
 
  const url = new URL(request.url);
  const messageId = String(url.searchParams.get("message_id") || "").trim();
  const expires = Number.parseInt(
    String(url.searchParams.get("expires") || ""),
    10
  );
  const signature = String(
    url.searchParams.get("signature") || ""
  ).trim();
   if (
    !messageId ||
    !Number.isSafeInteger(expires) ||
    expires <= Math.floor(Date.now() / 1000) ||
    !/^[a-f0-9]{64}$/i.test(signature)
  ) {
    return errorResponse("This private attachment link is invalid or expired.", 403);
  }
 
  const message = await env.DB
    .prepare(`
      SELECT id, media_key, file_name, mime_type
      FROM time_market_messages
      WHERE id = ? AND media_key IS NOT NULL AND media_key != ''
      LIMIT 1
    `)
    .bind(messageId)
    .first();
 
  if (!message) return errorResponse("Attachment not found.", 404);
 
  const expected = await hmacHex(
    secret,
    `${message.id}\n${message.media_key}\n${expires}`
  );
 
  if (!constantTimeEqual(signature.toLowerCase(), expected.toLowerCase())) {
    return errorResponse("This private attachment link is invalid.", 403);
  }
 
  const bucket = getPrivateMediaBucket(env);
  if (!bucket) return errorResponse("R2 binding is missing.", 500);
 
  const rangeHeader = request.headers.get("Range");
  let range;
 
  if (rangeHeader) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(rangeHeader);
    if (!match) return errorResponse("Invalid byte range.", 416);
 
    const offset = Number(match[1]);
    const end = match[2] ? Number(match[2]) : undefined;
    if (
      !Number.isSafeInteger(offset) ||
      (end !== undefined && (!Number.isSafeInteger(end) || end < offset))
    ) {
      return errorResponse("Invalid byte range.", 416);
    }
    range = end === undefined ? { offset } : { offset, length: end - offset + 1 };
  }
 
  const object = await bucket.get(
    message.media_key,
    range ? { range } : undefined
  );
  if (!object) return errorResponse("Attachment not found.", 404);
 
  const headers = new Headers(corsHeaders());
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  if (message.mime_type) headers.set("Content-Type", message.mime_type);
 
  const fileName = safeFileName(message.file_name || "attachment");
  headers.set("Content-Disposition", `inline; filename="${fileName}"`);
 
  let status = 200;
  if (range && object.range) {
    status = 206;
    const start = object.range.offset;
    const end = start + object.range.length - 1;
    headers.set("Content-Range", `bytes ${start}-${end}/${object.size}`);
    headers.set("Content-Length", String(object.range.length));
  } else if (object.size != null) {
    headers.set("Content-Length", String(object.size));
  }
 
  return new Response(object.body, { status, headers });
}
 
async function handleR2Media(
  request,
  env,
  pathname
) {
  const bucket = getBucket(env);
 
  if (!bucket) {
    return errorResponse(
      "R2 binding is missing.",
      500
    );
  }
 
  const key = decodeURIComponent(
    pathname.replace(/^\//, "")
  );
   if (
    !key.startsWith("feedx/") &&
    !key.startsWith("time-market/")
  ) {
    return errorResponse(
      "Media not found.",
      404
    );
  }
 
  const rangeHeader =
    request.headers.get("Range");
 
  let object;
  let range = null;
 
  if (rangeHeader) {
    const match =
      /^bytes=(\d+)-(\d*)$/.exec(
        rangeHeader
      );
 
    if (!match) {
      return errorResponse("Invalid byte range.", 416);
    }
 
    const offset = Number(match[1]);
 
    const end = match[2]
      ? Number(match[2])
      : undefined;
 
    if (
      !Number.isSafeInteger(offset) ||
      (end !== undefined && (!Number.isSafeInteger(end) || end < offset))
    ) {
      return errorResponse("Invalid byte range.", 416);
    }
 
    range =
      end !== undefined
        ? { offset, length: end - offset + 1 }
        : { offset };
  }
 
  object = await bucket.get(
    key,
    range ? { range } : undefined
  );
 
  if (!object) {
    return errorResponse(
      "Media not found.",
      404
    );
  }
 
  const headers = new Headers();
 
  object.writeHttpMetadata(headers);
 
  headers.set(
    "etag",
    object.httpEtag
  );
 
  headers.set(
    "Accept-Ranges",
    "bytes"
  );
 
  headers.set(
    "Access-Control-Allow-Origin",
    "*"
  );
 
  headers.set(
    "Cache-Control",
    "public, max-age=31536000, immutable"
  );
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "no-referrer");
 
  let status = 200;
 
  if (range && object.range) {
    status = 206;
 
    const start =
      object.range.offset;
 
    const end =
      start +
      object.range.length -
      1;
 
    headers.set(
      "Content-Range",
      `bytes ${start}-${end}/${object.size}`
    ); 
    headers.set(
      "Content-Length",
      String(object.range.length)
    );
  } else if (object.size != null) {
    headers.set(
      "Content-Length",
      String(object.size)
    );
  }
 
  return new Response(
    object.body,
    {
      status,
      headers,
    }
  );
}
 
 
// ==================== CONNECT LIVE MATCHING ====================
// Uses the same authenticated Gwamo provider/session as Market. Phone numbers
// stay server-side and are never returned by these routes.


async function readConnectLiveJsonBody(request) {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}

function connectLiveSide(value = "") {
  const side = String(value || "").trim().toLowerCase();
  return side === "need" || side === "offer" ? side : "";
}

function connectLiveItemId(value = "") {
  const itemId = String(value || "").trim().toLowerCase();
  return CONNECT_LIVE_ITEM_IDS.has(itemId) ? itemId : "";
}

function connectLiveActiveCutoff() {
  return new Date(Date.now() - CONNECT_LIVE_ACTIVE_WINDOW_MS).toISOString();
}

function connectLivePublicProvider(row = {}) {
  const verificationStatus = normalizeVerificationStatus(row.verification_status);
  return {
    provider_id: String(row.provider_id || row.id || ""),
    full_name:
      row.service_provider_name || row.full_name || row.name || "Gwamo member",
    profile_photo_url: row.profile_image_url || row.profile_photo_url || "",
    location: row.location || "",
    verification_status: verificationStatus,
    verified: verificationStatus === "verified",
    available: Number(row.is_available ?? 1) === 1,
    item_photo_url: row.item_photo_url || "",
  };
}

async function connectLiveRelationship(db, firstProviderId, secondProviderId, itemId) {
  return await db
    .prepare(`
      SELECT 1 AS matched
      FROM connect_live_presence a
      JOIN connect_live_presence b
        ON b.item_id = a.item_id
       AND b.side != a.side
      WHERE a.provider_id = ?
        AND b.provider_id = ?
        AND a.item_id = ?
      LIMIT 1
    `)
    .bind(firstProviderId, secondProviderId, itemId)
    .first();
}

async function getConnectLiveMatches(db, providerId, itemId, ownSide, location = "") {
  const oppositeSide = ownSide === "need" ? "offer" : "need";
  const cutoff = connectLiveActiveCutoff();
  const cleanLocation = sanitizeConnectText(location || "", CONNECT_LOCATION_MAX_LENGTH);

  const result = await db
    .prepare(`
      SELECT
        lp.provider_id,
        lp.location,
        lp.is_available,
        lp.item_photo_url,
        lp.last_seen_at,
        p.full_name,
        p.service_provider_name,
        p.profile_image_url,
        p.verification_status
      FROM connect_live_presence lp      JOIN time_market_providers p ON p.id = lp.provider_id
      WHERE lp.item_id = ?
        AND lp.side = ?
        AND lp.is_available = 1
        AND lp.provider_id != ?
        AND p.account_status = 'active'
        AND datetime(lp.last_seen_at) >= datetime(?)
      ORDER BY
        CASE
          WHEN ? != '' AND lower(lp.location) = lower(?) THEN 0
          WHEN ? != '' AND lower(lp.location) LIKE '%' || lower(?) || '%' THEN 1
          ELSE 2
        END,
        datetime(lp.last_seen_at) DESC
      LIMIT 50
    `)
    .bind(
      itemId,
      oppositeSide,
      providerId,
      cutoff,
      cleanLocation,
      cleanLocation,
      cleanLocation,
      cleanLocation
    )
    .all();

  return (result.results || []).map(connectLivePublicProvider);
}

async function handleConnectLiveCounts(request, env) {
  const url = new URL(request.url);
  const side = connectLiveSide(url.searchParams.get("side"));
  if (!side) return errorResponse("Connect side must be need or offer.");

  const cutoff = connectLiveActiveCutoff();
  const result = await env.DB
    .prepare(`
      SELECT item_id, COUNT(DISTINCT provider_id) AS count
      FROM connect_live_presence
      WHERE side = ?
        AND is_available = 1
        AND datetime(last_seen_at) >= datetime(?)
      GROUP BY item_id
    `)
    .bind(side, cutoff)
    .all();

  const counts = {};
  for (const row of result.results || []) {
    if (CONNECT_LIVE_ITEM_IDS.has(String(row.item_id || ""))) {
      counts[row.item_id] = Number(row.count || 0);
    }
  }

  return jsonResponse({ success: true, counts }, 200, {
    "Cache-Control": "no-store",
  });
}

async function handleConnectLivePresence(request, env) {
  const auth = await requireProvider(request, env);
  if (auth.response) return auth.response;

  const body = await readConnectLiveJsonBody(request);
  const itemId = connectLiveItemId(body.item_id);
  const side = connectLiveSide(body.side);
  const location = sanitizeConnectText(body.location || "", CONNECT_LOCATION_MAX_LENGTH);
  const language = String(body.language || "rw").toLowerCase() === "en" ? "en" : "rw";
  const isAvailable = body.available === false ? 0 : 1;

  if (!itemId) return errorResponse("Choose a valid Connect item.");
  if (!side) return errorResponse("Connect side must be need or offer.");
  if (!location) return errorResponse("Location is required.");

  let itemPhotoUrl = normalizeConnectUrl(body.item_photo_url || "");
  let itemPhotoKey = sanitizeConnectText(body.item_photo_key || "", 500);
  if (itemPhotoUrl) {
    const managedKey = managedMediaKeyFromUrl(itemPhotoUrl);
    if (!managedKey) {
      return errorResponse("Connect item photo must be uploaded through Gwamo.");
    }
    itemPhotoKey = managedKey;
  } else {
    itemPhotoKey = "";
  }

  const timestamp = nowIso();
  await env.DB
    .prepare(`
      INSERT INTO connect_live_presence (
        id,
        provider_id,
        item_id,
        side,
        location,
        is_available,
        item_photo_url,
        item_photo_key,        language,
        created_at,
        updated_at,
        last_seen_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(provider_id, item_id, side) DO UPDATE SET
        location = excluded.location,
        is_available = excluded.is_available,
        item_photo_url = CASE
          WHEN excluded.item_photo_url != '' THEN excluded.item_photo_url
          ELSE connect_live_presence.item_photo_url
        END,
        item_photo_key = CASE
          WHEN excluded.item_photo_key != '' THEN excluded.item_photo_key
          ELSE connect_live_presence.item_photo_key
        END,
        language = excluded.language,
        updated_at = excluded.updated_at,
        last_seen_at = excluded.last_seen_at
    `)
    .bind(
      crypto.randomUUID(),
      auth.provider.id,
      itemId,
      side,
      location,
      isAvailable,
      itemPhotoUrl,
      itemPhotoKey,
      language,
      timestamp,
      timestamp,
      timestamp
    )
    .run();

  const matches = isAvailable
    ? await getConnectLiveMatches(env.DB, auth.provider.id, itemId, side, location)
    : [];

  return jsonResponse(
    {
      success: true,
      presence: {
        item_id: itemId,
        side,
        location,
        available: Boolean(isAvailable),
        item_photo_url: itemPhotoUrl,
      },
      matches,
    },
    200,
    { "Cache-Control": "no-store" }
  );
}

async function handleConnectLiveMatches(request, env) {
  const auth = await requireProvider(request, env);
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const itemId = connectLiveItemId(url.searchParams.get("item_id"));
  const side = connectLiveSide(url.searchParams.get("side"));
  const location = sanitizeConnectText(
    url.searchParams.get("location") || "",
    CONNECT_LOCATION_MAX_LENGTH
  );

  if (!itemId) return errorResponse("Choose a valid Connect item.");
  if (!side) return errorResponse("Connect side must be need or offer.");

  const timestamp = nowIso();
  await env.DB
    .prepare(`
      UPDATE connect_live_presence
      SET last_seen_at = ?, updated_at = ?
      WHERE provider_id = ? AND item_id = ? AND side = ?
    `)
    .bind(timestamp, timestamp, auth.provider.id, itemId, side)
    .run();

  const matches = await getConnectLiveMatches(
    env.DB,
    auth.provider.id,
    itemId,
    side,
    location
  );

  return jsonResponse({ success: true, matches }, 200, {
    "Cache-Control": "no-store",
  });
}

async function handleConnectLiveMessages(request, env) {
  const auth = await requireProvider(request, env);
  if (auth.response) return auth.response;
  const url = new URL(request.url);
  const otherProviderId = String(url.searchParams.get("with_provider_id") || "").trim();
  const itemId = connectLiveItemId(url.searchParams.get("item_id"));
  if (!otherProviderId || !itemId) {
    return errorResponse("Connect person and item are required.");
  }

  const relationship = await connectLiveRelationship(
    env.DB,
    auth.provider.id,
    otherProviderId,
    itemId
  );
  if (!relationship) return errorResponse("This Connect match is not available.", 403);

  const result = await env.DB
    .prepare(`
      SELECT id, sender_provider_id, receiver_provider_id, message, created_at, read_at
      FROM connect_live_messages
      WHERE item_id = ?
        AND (
          (sender_provider_id = ? AND receiver_provider_id = ?)
          OR
          (sender_provider_id = ? AND receiver_provider_id = ?)
        )
      ORDER BY datetime(created_at) ASC
      LIMIT 250
    `)
    .bind(
      itemId,
      auth.provider.id,
      otherProviderId,
      otherProviderId,
      auth.provider.id
    )
    .all();

  await env.DB
    .prepare(`
      UPDATE connect_live_messages
      SET read_at = COALESCE(read_at, ?)
      WHERE item_id = ?
        AND sender_provider_id = ?
        AND receiver_provider_id = ?
        AND read_at IS NULL
    `)
    .bind(nowIso(), itemId, otherProviderId, auth.provider.id)
    .run();

  const messages = (result.results || []).map((row) => ({
    id: row.id,
    message: row.message || "",
    created_at: row.created_at,
    read_at: row.read_at || null,
    mine: String(row.sender_provider_id) === String(auth.provider.id),
  }));

  return jsonResponse({ success: true, messages }, 200, {
    "Cache-Control": "no-store",
  });
}

async function handleConnectLiveMessage(request, env) {
  const auth = await requireProvider(request, env);
  if (auth.response) return auth.response;

  const body = await readConnectLiveJsonBody(request);
  const otherProviderId = String(body.to_provider_id || "").trim();
  const itemId = connectLiveItemId(body.item_id);
  const message = sanitizeConnectText(body.message || "", 1000);

  if (!otherProviderId || otherProviderId === String(auth.provider.id)) {
    return errorResponse("Choose another Connect member.");
  }
  if (!itemId) return errorResponse("Choose a valid Connect item.");
  if (!message) return errorResponse("Message cannot be empty.");

  const rateKey = `connect-live-message:${auth.provider.id}`;
  if (!checkRateLimit(rateKey, 60, 60_000)) {
    return errorResponse("Too many messages. Try again shortly.", 429);
  }

  const relationship = await connectLiveRelationship(
    env.DB,
    auth.provider.id,
    otherProviderId,
    itemId
  );
  if (!relationship) return errorResponse("This Connect match is not available.", 403);

  const recipient = await getProviderById(env.DB, otherProviderId);
  if (!recipient || (recipient.account_status || "active") !== "active") {
    return errorResponse("This Connect member is unavailable.", 404);
  }

  const id = crypto.randomUUID();
  const timestamp = nowIso();
  await env.DB
    .prepare(`
      INSERT INTO connect_live_messages (        id, item_id, sender_provider_id, receiver_provider_id, message, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .bind(id, itemId, auth.provider.id, otherProviderId, message, timestamp)
    .run();

  return jsonResponse(
    {
      success: true,
      message: {
        id,
        message,
        created_at: timestamp,
        mine: true,
      },
    },
    201,
    { "Cache-Control": "no-store" }
  );
}

async function handleConnectLiveRecent(request, env) {
  const auth = await requireProvider(request, env);
  if (auth.response) return auth.response;

  const providerId = String(auth.provider.id);
  const messages = await env.DB
    .prepare(`
      SELECT
        m.item_id,
        m.created_at,
        CASE
          WHEN m.sender_provider_id = ? THEN m.receiver_provider_id
          ELSE m.sender_provider_id
        END AS other_provider_id,
        p.full_name,
        p.service_provider_name,
        p.profile_image_url,
        p.verification_status
      FROM connect_live_messages m
      JOIN time_market_providers p
        ON p.id = CASE
          WHEN m.sender_provider_id = ? THEN m.receiver_provider_id
          ELSE m.sender_provider_id
        END
      WHERE m.sender_provider_id = ? OR m.receiver_provider_id = ?
      ORDER BY datetime(m.created_at) DESC
      LIMIT 60
    `)
    .bind(providerId, providerId, providerId, providerId)
    .all();

  const calls = await env.DB
    .prepare(`
      SELECT
        c.item_id,
        c.updated_at AS created_at,
        CASE
          WHEN c.caller_provider_id = ? THEN c.callee_provider_id
          ELSE c.caller_provider_id
        END AS other_provider_id,
        p.full_name,
        p.service_provider_name,
        p.profile_image_url,
        p.verification_status
      FROM connect_live_calls c
      JOIN time_market_providers p
        ON p.id = CASE
          WHEN c.caller_provider_id = ? THEN c.callee_provider_id
          ELSE c.caller_provider_id
        END
      WHERE c.caller_provider_id = ? OR c.callee_provider_id = ?
      ORDER BY datetime(c.updated_at) DESC
      LIMIT 60
    `)
    .bind(providerId, providerId, providerId, providerId)
    .all();

  const combined = [...(messages.results || []), ...(calls.results || [])]
    .sort((a, b) => Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0));

  const seen = new Set();
  const items = [];
  for (const row of combined) {
    const key = `${row.item_id}:${row.other_provider_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      item_id: row.item_id,
      created_at: row.created_at,
      person: connectLivePublicProvider({
        provider_id: row.other_provider_id,
        full_name: row.full_name,
        service_provider_name: row.service_provider_name,
        profile_image_url: row.profile_image_url,
        verification_status: row.verification_status,
        is_available: 1,
      }),
    });    if (items.length >= 40) break;
  }

  return jsonResponse({ success: true, items }, 200, {
    "Cache-Control": "no-store",
  });
}

async function getConnectLiveCallForParticipant(db, callId, providerId) {
  return await db
    .prepare(`
      SELECT *
      FROM connect_live_calls
      WHERE id = ?
        AND (caller_provider_id = ? OR callee_provider_id = ?)
      LIMIT 1
    `)
    .bind(callId, providerId, providerId)
    .first();
}

async function expireConnectLiveCallIfNeeded(env, call) {
  if (!call || call.status !== "ringing") return call;
  const createdAt = Date.parse(call.created_at || "");
  if (!Number.isFinite(createdAt) || Date.now() - createdAt <= CONNECT_LIVE_RING_TIMEOUT_MS) {
    return call;
  }
  const timestamp = nowIso();
  await env.DB
    .prepare(`
      UPDATE connect_live_calls
      SET status = 'missed', updated_at = ?, ended_at = ?
      WHERE id = ? AND status = 'ringing'
    `)
    .bind(timestamp, timestamp, call.id)
    .run();
  return { ...call, status: "missed", updated_at: timestamp, ended_at: timestamp };
}

async function handleConnectLiveCallRequest(request, env) {
  const auth = await requireProvider(request, env);
  if (auth.response) return auth.response;

  const body = await readConnectLiveJsonBody(request);
  const otherProviderId = String(body.to_provider_id || "").trim();
  const itemId = connectLiveItemId(body.item_id);
  if (!otherProviderId || otherProviderId === String(auth.provider.id)) {
    return errorResponse("Choose another Connect member.");
  }
  if (!itemId) return errorResponse("Choose a valid Connect item.");

  const rateKey = `connect-live-call:${auth.provider.id}`;
  if (!checkRateLimit(rateKey, 12, 60_000)) {
    return errorResponse("Too many call attempts. Try again shortly.", 429);
  }

  const relationship = await connectLiveRelationship(
    env.DB,
    auth.provider.id,
    otherProviderId,
    itemId
  );
  if (!relationship) return errorResponse("This Connect match is not available.", 403);

  const recipient = await getProviderById(env.DB, otherProviderId);
  if (!recipient || (recipient.account_status || "active") !== "active") {
    return errorResponse("This Connect member is unavailable.", 404);
  }

  const cutoff = new Date(Date.now() - CONNECT_LIVE_RING_TIMEOUT_MS).toISOString();
  const existing = await env.DB
    .prepare(`
      SELECT * FROM connect_live_calls
      WHERE item_id = ?
        AND caller_provider_id = ?
        AND callee_provider_id = ?
        AND status = 'ringing'
        AND datetime(created_at) >= datetime(?)
      ORDER BY datetime(created_at) DESC
      LIMIT 1
    `)
    .bind(itemId, auth.provider.id, otherProviderId, cutoff)
    .first();

  if (existing) {
    return jsonResponse({ success: true, call_id: existing.id, status: existing.status });
  }

  const id = crypto.randomUUID();
  const timestamp = nowIso();
  await env.DB
    .prepare(`
      INSERT INTO connect_live_calls (
        id, item_id, caller_provider_id, callee_provider_id,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'ringing', ?, ?)
    `)
    .bind(id, itemId, auth.provider.id, otherProviderId, timestamp, timestamp)
    .run();
  return jsonResponse(
    { success: true, call_id: id, status: "ringing" },
    201,
    { "Cache-Control": "no-store" }
  );
}

async function handleConnectLiveCallStatus(request, env) {
  const auth = await requireProvider(request, env);
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const callId = String(url.searchParams.get("call_id") || "").trim();
  if (!callId) return errorResponse("call_id is required.");

  let call = await getConnectLiveCallForParticipant(env.DB, callId, auth.provider.id);
  if (!call) return errorResponse("Call not found.", 404);
  call = await expireConnectLiveCallIfNeeded(env, call);

  return jsonResponse(
    {
      success: true,
      call: {
        id: call.id,
        item_id: call.item_id,
        status: call.status,
        role:
          String(call.caller_provider_id) === String(auth.provider.id)
            ? "caller"
            : "callee",
        created_at: call.created_at,
        answered_at: call.answered_at || null,
        ended_at: call.ended_at || null,
      },
      status: call.status,
    },
    200,
    { "Cache-Control": "no-store" }
  );
}

async function handleConnectLiveIncomingCall(request, env) {
  const auth = await requireProvider(request, env);
  if (auth.response) return auth.response;

  const row = await env.DB
    .prepare(`
      SELECT
        c.*,
        p.full_name,
        p.service_provider_name,
        p.profile_image_url,
        p.verification_status
      FROM connect_live_calls c
      JOIN time_market_providers p ON p.id = c.caller_provider_id
      WHERE c.callee_provider_id = ? AND c.status = 'ringing'
      ORDER BY datetime(c.created_at) DESC
      LIMIT 1
    `)
    .bind(auth.provider.id)
    .first();

  if (!row) return jsonResponse({ success: true, call: null });
  const call = await expireConnectLiveCallIfNeeded(env, row);
  if (call.status !== "ringing") return jsonResponse({ success: true, call: null });

  return jsonResponse(
    {
      success: true,
      call: {
        id: call.id,
        item_id: call.item_id,
        status: call.status,
        created_at: call.created_at,
        person: connectLivePublicProvider({
          provider_id: call.caller_provider_id,
          full_name: call.full_name,
          service_provider_name: call.service_provider_name,
          profile_image_url: call.profile_image_url,
          verification_status: call.verification_status,
          is_available: 1,
        }),
      },
    },
    200,
    { "Cache-Control": "no-store" }
  );
}

async function handleConnectLiveCallRespond(request, env) {
  const auth = await requireProvider(request, env);
  if (auth.response) return auth.response;
  const body = await readConnectLiveJsonBody(request);
  const callId = String(body.call_id || "").trim();
  const action = String(body.action || "").trim().toLowerCase();
  if (!callId || !["accept", "decline"].includes(action)) {
    return errorResponse("Choose accept or decline.");
  }

  let call = await getConnectLiveCallForParticipant(env.DB, callId, auth.provider.id);  if (!call) return errorResponse("Call not found.", 404);
  call = await expireConnectLiveCallIfNeeded(env, call);
  if (String(call.callee_provider_id) !== String(auth.provider.id)) {
    return errorResponse("Only the person receiving the call can answer it.", 403);
  }
  if (call.status !== "ringing") {
    return jsonResponse({ success: true, status: call.status, call_id: call.id });
  }

  const timestamp = nowIso();
  const status = action === "accept" ? "accepted" : "declined";
  await env.DB
    .prepare(`
      UPDATE connect_live_calls
      SET status = ?, updated_at = ?, answered_at = ?, ended_at = ?
      WHERE id = ? AND status = 'ringing'
    `)
    .bind(
      status,
      timestamp,
      action === "accept" ? timestamp : null,
      action === "decline" ? timestamp : null,
      call.id
    )
    .run();

  return jsonResponse({ success: true, call_id: call.id, status });
}

async function handleConnectLiveCallEnd(request, env) {
  const auth = await requireProvider(request, env);
  if (auth.response) return auth.response;
  const body = await readConnectLiveJsonBody(request);
  const callId = String(body.call_id || "").trim();
  if (!callId) return errorResponse("call_id is required.");

  const call = await getConnectLiveCallForParticipant(env.DB, callId, auth.provider.id);
  if (!call) return errorResponse("Call not found.", 404);

  if (["ended", "declined", "missed", "failed"].includes(call.status)) {
    return jsonResponse({ success: true, call_id: call.id, status: call.status });
  }

  const timestamp = nowIso();
  await env.DB
    .prepare(`
      UPDATE connect_live_calls
      SET status = 'ended', updated_at = ?, ended_at = ?
      WHERE id = ?
    `)
    .bind(timestamp, timestamp, call.id)
    .run();

  return jsonResponse({ success: true, call_id: call.id, status: "ended" });
}

async function handleConnectLiveCallSignal(request, env) {
  const auth = await requireProvider(request, env);
  if (auth.response) return auth.response;
  const body = await readConnectLiveJsonBody(request);
  const callId = String(body.call_id || "").trim();
  const signalType = String(body.type || body.signal_type || "").trim().toLowerCase();
  if (!callId || !["offer", "answer", "ice"].includes(signalType)) {
    return errorResponse("A valid call signal is required.");
  }

  const call = await getConnectLiveCallForParticipant(env.DB, callId, auth.provider.id);
  if (!call) return errorResponse("Call not found.", 404);
  if (["ended", "declined", "missed", "failed"].includes(call.status)) {
    return errorResponse("This call is no longer active.", 409);
  }

  const payload = body.payload ?? body.data ?? null;
  const payloadJson = JSON.stringify(payload);
  if (!payloadJson || payloadJson.length > 64_000) {
    return errorResponse("Call signal is too large.");
  }

  const id = crypto.randomUUID();
  const timestamp = nowIso();
  await env.DB
    .prepare(`
      INSERT INTO connect_live_call_signals (
        id, call_id, sender_provider_id, signal_type, payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `)
    .bind(id, callId, auth.provider.id, signalType, payloadJson, timestamp)
    .run();

  const inserted = await env.DB
    .prepare(`SELECT seq FROM connect_live_call_signals WHERE id = ? LIMIT 1`)
    .bind(id)
    .first();

  if (signalType === "answer" && call.status === "accepted") {
    await env.DB
      .prepare(`
        UPDATE connect_live_calls
        SET status = 'connected', updated_at = ?
        WHERE id = ? AND status = 'accepted'      `)
      .bind(timestamp, callId)
      .run();
  }

  return jsonResponse(
    {
      success: true,
      signal: { id, seq: Number(inserted?.seq || 0), type: signalType, created_at: timestamp },
    },
    201,
    { "Cache-Control": "no-store" }
  );
}

async function handleConnectLiveCallSignals(request, env) {
  const auth = await requireProvider(request, env);
  if (auth.response) return auth.response;
  const url = new URL(request.url);
  const callId = String(url.searchParams.get("call_id") || "").trim();
  const afterSeq = Math.max(0, Number.parseInt(url.searchParams.get("after_seq") || "0", 10) || 0);
  if (!callId) return errorResponse("call_id is required.");

  const call = await getConnectLiveCallForParticipant(env.DB, callId, auth.provider.id);
  if (!call) return errorResponse("Call not found.", 404);

  const result = await env.DB
    .prepare(`
      SELECT seq, id, signal_type, payload_json, created_at
      FROM connect_live_call_signals
      WHERE call_id = ?
        AND sender_provider_id != ?
        AND seq > ?
      ORDER BY seq ASC
      LIMIT 100
    `)
    .bind(callId, auth.provider.id, afterSeq)
    .all();

  const signals = (result.results || []).map((row) => {
    let payload = null;
    try { payload = JSON.parse(row.payload_json || "null"); } catch {}
    return {
      seq: Number(row.seq || 0),
      id: row.id,
      type: row.signal_type,
      payload,
      created_at: row.created_at,
    };
  });

  return jsonResponse({ success: true, signals }, 200, {
    "Cache-Control": "no-store",
  });
}


async function handleConnectUpload(request, env) {
  const contentType = String(request.headers.get("content-type") || "");
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return errorResponse("This endpoint requires multipart/form-data.", 415);
  }
 
  const formData = await request.formData();
  const kind = String(formData.get("kind") || "profile_image").trim();
  const file = formData.get("file");
 
  if (!["profile_image", "connect_item_image", "video"].includes(kind)) {
    return errorResponse(
      "Connect upload kind must be profile_image, connect_item_image, or video."
    );
  }
 
  if (!(file instanceof File)) {
    return errorResponse("No file was received.");
  }
 
  if (kind === "connect_item_image") {
    const auth = await requireProvider(request, env);
    if (auth.response) return auth.response;
  }

  const rateKey = `connect-upload:${kind}:${getClientIp(request)}`;
  const limit = kind === "video" ? 8 : 24;
  if (!checkRateLimit(rateKey, limit, 60 * 60_000)) {
    return errorResponse("Too many Connect uploads. Try again later.", 429);
  }
 
  if (kind === "video") {
    const authError = authorizeConnectVideoRequest(
      request,
      env,
      String(formData.get("pin") || "")
    );
    if (authError) return authError;
  }
 
  try {
    const uploadKind = kind === "connect_item_image" ? "post_image" : kind;
    const uploaded = await uploadFile(request, env, file, uploadKind);    return jsonResponse(
      {
        success: true,
        kind,
        url: uploaded.url,
        key: uploaded.key,
      },
      201,
      { "Cache-Control": "no-store" }
    );
  } catch (error) {
    return errorResponse(error?.message || "Connect upload failed.", 400);
  }
}
 
async function validateConnectVideoOnCreate(request, env, body) {
  const videoUrl = normalizeConnectUrl(body.video_url || "");
  const videoKey = sanitizeConnectText(body.video_key || "", 500);
 
  if (!videoUrl && !videoKey) {
    return { video_url: "", video_key: null, response: null };
  }
 
  const authError = authorizeConnectVideoRequest(
    request,
    env,
    body.video_pin || body.pin || ""
  );
  if (authError) {
    return { video_url: "", video_key: null, response: authError };
  }
 
  if (!videoUrl) {
    return {
      video_url: "",
      video_key: null,
      response: errorResponse("A valid video_url is required."),
    };
  }
 
  return {
    video_url: videoUrl,
    video_key: videoKey || null,
    response: null,
  };
}
 
async function createConnectBaseItem(request, env, body, connectType, payload) {
  const creatorName = sanitizeConnectText(
    body.name || body.creator_name || "",
    CONNECT_NAME_MAX_LENGTH
  );
  const creatorWhatsApp = normalizeWhatsAppNumber(
    body.whatsapp || body.creator_whatsapp || ""
  );
  const creatorPhotoUrl = normalizeConnectUrl(
    body.photo_url || body.creator_photo_url || ""
  );
  const creatorPhotoKey = sanitizeConnectText(
    body.photo_key || body.creator_photo_key || "",
    500
  );
  const location = sanitizeConnectText(
    body.location || body.place || "",
    CONNECT_LOCATION_MAX_LENGTH
  );
 
  if (!creatorName) return { response: errorResponse("Name is required.") };
  if (!creatorWhatsApp) {
    return { response: errorResponse("Enter a valid WhatsApp number.") };
  }
  if (!creatorPhotoUrl) {
    return { response: errorResponse("A profile photo is required.") };
  }
  if (!location) return { response: errorResponse("Location is required.") };
 
  const video = await validateConnectVideoOnCreate(request, env, body);
  if (video.response) return { response: video.response };
 
  const loggedInProvider = await getAuthenticatedProvider(request, env);
  const id = crypto.randomUUID();
  const ownerToken = makeConnectToken(CONNECT_OWNER_TOKEN_BYTES);
  const ownerTokenHash = await hashToken(ownerToken);
  const timestamp = nowIso();
 
  await env.DB
    .prepare(`
      INSERT INTO connect_items (
        id,
        connect_type,
        creator_provider_id,
        creator_name,
        creator_whatsapp,
        creator_photo_url,
        creator_photo_key,
        location,
        video_url,
        video_key,
        music_url,
        group_url,        status,
        admin_note,
        public_data_json,
        private_data_json,
        owner_token_hash,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', 'active', '', ?, ?, ?, ?, ?)
    `)
    .bind(
      id,
      connectType,
      loggedInProvider?.id || null,
      creatorName,
      creatorWhatsApp,
      creatorPhotoUrl,
      creatorPhotoKey || null,
      location,
      video.video_url,
      video.video_key,
      normalizeConnectUrl(body.music_url || ""),
      JSON.stringify(payload.public_data || {}),
      JSON.stringify(payload.private_data || {}),
      ownerTokenHash,
      timestamp,
      timestamp
    )
    .run();
 
  const item = await getConnectItemById(env.DB, id);
  return {
    response: null,
    item,
    owner_token: ownerToken,
  };
}
 
// =====================================================================
// ROMANTIC STORIES
// Public read, admin-PIN-gated write. Backed by the romantic_couples,
// romantic_songs and romantic_playback tables, and by R2 (MEDIA_BUCKET)
// for the actual image and song files. Makes the storybook and the
// background playlist survive a page refresh, and lets the song index
// resume where it stopped.
// =====================================================================

async function handleRomanticListCouples(request, env) {
  const result = await env.DB
    .prepare(`
      SELECT id, names, whatsapp, flag, image_url, created_at
      FROM romantic_couples
      ORDER BY datetime(created_at) ASC, id ASC
    `)
    .all();

  return jsonResponse(
    { success: true, couples: result.results || [] },
    200,
    { "Cache-Control": "no-store" }
  );
}

async function handleRomanticAddCouple(request, env) {
    const authError = authorizeRomanticRequest(request, env, "");
    if (authError) return authError;

  const contentType = String(request.headers.get("content-type") || "");
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return errorResponse("This endpoint requires multipart/form-data.", 415);
  }

  let formData;
  try {
    formData = await request.formData();
  } catch (error) {
    return errorResponse(`Could not read form data: ${error.message}`, 400);
  }

  const names = String(formData.get("names") || "").trim().slice(0, 120);
  const whatsapp = normalizeWhatsAppNumber(formData.get("whatsapp") || "");
  const flag = validSubmittedCountryFlag(formData.get("flag") || "");
  const file = formData.get("file");

  if (!names) return errorResponse("Add the couple names.");
  if (!whatsapp) return errorResponse("Add a valid WhatsApp number.");
  if (!(file instanceof File) || file.size <= 0) {
    return errorResponse("Upload one couple image.");
  }

  if (
    !checkRateLimit(
      `romantic-add:${getClientIp(request)}`,
      30,
      60 * 60_000
    )
  ) {
    return errorResponse("Too many uploads. Try again later.", 429);
  }

  let uploaded = null;
  try {
    uploaded = await uploadFile(request, env, file, "romantic_photo");

    const id = crypto.randomUUID();
    const timestamp = nowIso();

    await env.DB
      .prepare(`
        INSERT INTO romantic_couples (
          id, names, whatsapp, flag, image_url, image_key, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        names,
        whatsapp,
        flag || "",
        uploaded.url,
        uploaded.key,
        timestamp
      )
      .run();

    const couple = {
      id,
      names,
      whatsapp,
      flag: flag || "",
      image_url: uploaded.url,
      created_at: timestamp,
    };

    return jsonResponse(
      { success: true, couple },
      201,
      { "Cache-Control": "no-store" }
    );
  } catch (error) {
    await deleteR2Key(env, uploaded?.key);
    return errorResponse(
      error?.message || "Could not add this couple.",
      400
    );
  }
}

async function handleRomanticDeleteCouple(request, env) {
   const authError = authorizeRomanticRequest(request, env, "");
   if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.");
  }

  const id = String(body.id || body.couple_id || "").trim();
  if (!id) return errorResponse("id is required.");

  const row = await env.DB
    .prepare(`
      SELECT id, image_key
      FROM romantic_couples
      WHERE id = ?
      LIMIT 1
    `)
    .bind(id)
    .first();

  if (!row) return errorResponse("Couple not found.", 404);

  await env.DB
    .prepare(`DELETE FROM romantic_couples WHERE id = ?`)
    .bind(id)
    .run();

  await deleteR2Key(env, row.image_key);

  return jsonResponse(
    { success: true, message: "Couple removed." },
    200,
    { "Cache-Control": "no-store" }
  );
}

async function handleRomanticUpdateCouple(request, env) {
  const authError = authorizeRomanticRequest(request, env, "");
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.");
  }

  const id = String(body.id || body.couple_id || "").trim();
  if (!id) return errorResponse("id is required.");

  const names = String(body.names || "").trim().slice(0, 120);
  const flag = validSubmittedCountryFlag(body.flag || "");

  if (!names) return errorResponse("Couple names are required.");
  if (!flag) return errorResponse("Choose a valid country.");

  const existing = await env.DB
    .prepare(`
      SELECT id
      FROM romantic_couples
      WHERE id = ?
      LIMIT 1
    `)
    .bind(id)
    .first();

  if (!existing) return errorResponse("Couple not found.", 404);

  await env.DB
    .prepare(`
      UPDATE romantic_couples
      SET names = ?, flag = ?
      WHERE id = ?
    `)
    .bind(names, flag, id)
    .run();

  const updated = await env.DB
    .prepare(`
      SELECT id, names, whatsapp, flag, image_url, created_at
      FROM romantic_couples
      WHERE id = ?
      LIMIT 1
    `)
    .bind(id)
    .first();

  return jsonResponse(
    { success: true, couple: updated },
    200,
    { "Cache-Control": "no-store" }
  );
}

async function handleRomanticListSongs(request, env) {
  const result = await env.DB
    .prepare(`
      SELECT id, name, url, sort_order, created_at
      FROM romantic_songs
      ORDER BY sort_order ASC, datetime(created_at) ASC, id ASC
    `)
    .all();

  return jsonResponse(
    { success: true, songs: result.results || [] },
    200,
    { "Cache-Control": "no-store" }
  );
}

async function handleRomanticAddSong(request, env) {
  const authError = authorizeRomanticRequest(request, env, "");
  if (authError) return authError;

  const contentType = String(request.headers.get("content-type") || "");
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return errorResponse("This endpoint requires multipart/form-data.", 415);
  }

  let formData;
  try {
    formData = await request.formData();
  } catch (error) {
    return errorResponse(`Could not read form data: ${error.message}`, 400);
  }

  const file = formData.get("file");
  const submittedName = String(formData.get("name") || "").trim().slice(0, 200);

  if (!(file instanceof File) || file.size <= 0) {
    return errorResponse("No song file was received.");
  }

  if (!checkRateLimit(`romantic-song:${getClientIp(request)}`, 30, 60 * 60_000)) {
    return errorResponse("Too many uploads. Try again later.", 429);
  }

  let uploaded = null;
  try {
    uploaded = await uploadFile(request, env, file, "romantic_song");

    const id = crypto.randomUUID();
    const timestamp = nowIso();

    const maxRow = await env.DB
      .prepare(`SELECT COALESCE(MAX(sort_order), -1) AS top FROM romantic_songs`)
      .first();
    const nextOrder = Number(maxRow?.top ?? -1) + 1;

    const name = submittedName || safeFileName(file.name || "song");

    await env.DB
      .prepare(`
        INSERT INTO romantic_songs (
          id, name, url, r2_key, sort_order, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .bind(id, name, uploaded.url, uploaded.key, nextOrder, timestamp)
      .run();

    const song = {
      id,
      name,
      url: uploaded.url,
      sort_order: nextOrder,
      created_at: timestamp,
    };

    return jsonResponse(
      { success: true, song },
      201,
      { "Cache-Control": "no-store" }
    );
  } catch (error) {
    await deleteR2Key(env, uploaded?.key);
    return errorResponse(error?.message || "Could not add this song.", 400);
  }
}

async function handleRomanticDeleteSong(request, env) {
   const authError = authorizeRomanticRequest(request, env, "");
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.");
  }

  const id = String(body.id || body.song_id || "").trim();
  if (!id) return errorResponse("id is required.");

  const row = await env.DB
    .prepare(`
      SELECT id, r2_key
      FROM romantic_songs
      WHERE id = ?
      LIMIT 1
    `)
    .bind(id)
    .first();

  if (!row) return errorResponse("Song not found.", 404);

  await env.DB
    .prepare(`DELETE FROM romantic_songs WHERE id = ?`)
    .bind(id)
    .run();

  await deleteR2Key(env, row.r2_key);

  return jsonResponse(
    { success: true, message: "Song removed." },
    200,
    { "Cache-Control": "no-store" }
  );
}

async function handleRomanticGetPlayback(request, env) {
  const row = await env.DB
    .prepare(`
      SELECT song_index, sound_on, updated_at
      FROM romantic_playback
      WHERE id = 'global'
      LIMIT 1
    `)
    .first();

  return jsonResponse(
    {
      success: true,
      playback: {
        song_index: Number(row?.song_index || 0),
        sound_on: Number(row?.sound_on || 0) === 1,
        updated_at: row?.updated_at || null,
      },
    },
    200,
    { "Cache-Control": "no-store" }
  );
}

async function handleRomanticSetPlayback(request, env) {
  // Public write on purpose: this is a single shared "current song index"
  // toggle, and it only matters for the background music player. It is not
  // sensitive (no PII, no auth-relevant data), so it is safe to accept from
  // any visitor. Range is clamped to sane values below.
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.");
  }

  if (
    !checkRateLimit(
      `romantic-playback:${getClientIp(request)}`,
      120,
      60_000
    )
  ) {
    return errorResponse("Too many playback updates. Slow down.", 429);
  }

  const rawIndex = Number(body.song_index);
  const songIndex = Number.isFinite(rawIndex)
    ? clamp(Math.floor(rawIndex), 0, 10_000)
    : 0;

  const soundOn = body.sound_on === true || body.sound_on === 1 ? 1 : 0;

  const timestamp = nowIso();

  await env.DB
    .prepare(`
      INSERT INTO romantic_playback (id, song_index, sound_on, updated_at)
      VALUES ('global', ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        song_index = excluded.song_index,
        sound_on = excluded.sound_on,
        updated_at = excluded.updated_at
    `)
    .bind(songIndex, soundOn, timestamp)
    .run();

  return jsonResponse(
    {
      success: true,
      playback: {
        song_index: songIndex,
        sound_on: soundOn === 1,
        updated_at: timestamp,
      },
    },
    200,
    { "Cache-Control": "no-store" }
  );
}

async function handleConnectCreateLove(request, env) {
  if (
    !checkRateLimit(
      `connect-love-create:${getClientIp(request)}`,
      8,
      60 * 60_000
    )
  ) {
    return errorResponse("Too many Meet Someone profiles. Try again later.", 429);
  }
 
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.");
  }
 
  if (body.adult_confirmed !== true) {
    return errorResponse("You must confirm that you are an adult.");
  }
 
  const preference = sanitizeConnectText(body.preference || "", 80);
  const heart = normalizedLoveHeart(body.heart);

  const gender = normalizedLoveGender(body.gender);

  const answersObject = parseJsonObject(body.answers, {});
  const answers = {};
 
  for (const [key, value] of Object.entries(answersObject).slice(0, 12)) {
    const cleanKey = sanitizeConnectText(key, 60);
    const cleanValue = sanitizeConnectText(value, 180);
    if (cleanKey && cleanValue) answers[cleanKey] = cleanValue;
  }
 
  if (!preference) return errorResponse("Choose who you want to meet.");
  if (!heart) return errorResponse("Choose a valid heart.");

    if (!gender) return errorResponse("Choose Miss or Mr.");
 
  const created = await createConnectBaseItem(
    request,
    env,
    body,
    "love",
    {
      public_data: {
        preference,
         gender,
        answers,
      },
      private_data: {
        heart,
      },
    }
  );
 
  if (created.response) return created.response;
 
  return jsonResponse(
    {
      success: true,
      message: "Meet Someone profile created.",
      profile: publicConnectItem(created.item),
      owner_token: created.owner_token,
    },
    201,    { "Cache-Control": "no-store" }
  );
}
 


async function handleConnectCreateWalk(request, env) {
  if (
    !checkRateLimit(
      `connect-walk-create:${getClientIp(request)}`,
      12,
      60 * 60_000
    )
  ) {
    return errorResponse("Too many Walk Together posts. Try again later.", 429);
  }
 
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.");
  }
 
  const mood = sanitizeConnectText(body.mood || "", 80);
  const duration = sanitizeConnectText(body.duration || "", 60);
  if (!mood) return errorResponse("Walk mood is required.");
  if (!duration) return errorResponse("Walk duration is required.");
 
  const created = await createConnectBaseItem(
    request,
    env,
    body,
    "walk",
    {
      public_data: { mood, duration },
      private_data: {},
    }
  );
 
  if (created.response) return created.response;
 
  return jsonResponse(
    {
      success: true,
      message: "Walk Together post created.",
      walk: publicConnectItem(created.item),
      owner_token: created.owner_token,
    },
    201,
    { "Cache-Control": "no-store" }
  );
}
 
async function handleConnectCreateMoney(request, env) {
  if (
    !checkRateLimit(
      `connect-money-create:${getClientIp(request)}`,
      10,
      60 * 60_000
    )
  ) {
    return errorResponse("Too many money missions. Try again later.", 429);
  }
 
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.");
  }
 
  const mission = sanitizeConnectText(body.mission || "", 100);
  const contribution = sanitizeConnectText(body.contribution || "", 100);
  const description = sanitizeConnectText(body.description || "", 320);
 
  if (!mission) return errorResponse("Mission is required.");
  if (!contribution) return errorResponse("Contribution is required.");
 
  const created = await createConnectBaseItem(
    request,
    env,
    body,
    "money",
    {
      public_data: {
        mission,
        contribution,
        description,
      },
      private_data: {},
    }
  );
 
  if (created.response) return created.response;
 
  const roomId = crypto.randomUUID();
  const creatorMemberId = crypto.randomUUID();
  const creatorMemberToken = makeConnectToken(CONNECT_MEMBER_TOKEN_BYTES);
  const creatorMemberTokenHash = await hashToken(creatorMemberToken);
  const creationEventId = crypto.randomUUID();
  const timestamp = nowIso(); 
  await env.DB.batch([
    env.DB
      .prepare(`
        INSERT INTO connect_money_rooms (
          id, item_id, status, created_at, updated_at
        )
        VALUES (?, ?, 'team_forming', ?, ?)
      `)
      .bind(roomId, created.item.id, timestamp, timestamp),
 
    env.DB
      .prepare(`
        INSERT INTO connect_money_members (
          id,
          room_id,
          role,
          provider_id,
          name,
          whatsapp,
          photo_url,
          photo_key,
          token_hash,
          created_at
        )
        VALUES (?, ?, 'creator', ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        creatorMemberId,
        roomId,
        created.item.creator_provider_id || null,
        created.item.creator_name,
        created.item.creator_whatsapp,
        created.item.creator_photo_url,
        created.item.creator_photo_key || null,
        creatorMemberTokenHash,
        timestamp
      ),
 
    env.DB
      .prepare(`
        INSERT INTO connect_money_events (
          id, room_id, event_type, text, created_at
        )
        VALUES (?, ?, 'room_created', ?, ?)
      `)
      .bind(
        creationEventId,
        roomId,
        "Mission Room created. Gwamo is keeping this mission active while the team forms.",
        timestamp
      ),
  ]);
 
  return jsonResponse(
    {
      success: true,
      message: "Mission created. Its Mission Room is ready.",
      mission: publicConnectItem(created.item),
      room: {
        id: roomId,
        status: "team_forming",
        member_count: 1,
      },
      owner_token: created.owner_token,
      member_token: creatorMemberToken,
    },
    201,
    { "Cache-Control": "no-store" }
  );
}
 
// Looks for another active love profile with the SAME heart and a DIFFERENT
// gender. Returns "View heart match" when one exists, otherwise "Waiting".
// Because the query requires a different gender, two Mr cards with the same
// heart never match each other, and the same is true for two Miss cards.
async function computeLoveMatchStatus(db, row) {
  const heart = String(
    parseJsonObject(row.private_data_json, {}).heart || ""
  ).trim();
  const gender = String(
    parseJsonObject(row.public_data_json, {}).gender || ""
  ).trim();

  if (!heart || !gender) return "Waiting";

  const other = await db
    .prepare(`
      SELECT 1 AS matched
      FROM connect_items
      WHERE connect_type = 'love'
        AND status = 'active'
        AND id != ?
        AND json_extract(private_data_json, '$.heart') = ?
        AND json_extract(public_data_json, '$.gender') != ?
        AND json_extract(public_data_json, '$.gender') != ''
      LIMIT 1
    `)
    .bind(String(row.id), heart, gender)
    .first();

  return other ? "View heart match" : "Waiting";
}


async function handleConnectList(request, env, connectType) {
  const url = new URL(request.url);
  const limit = clamp(
    Number.parseInt(url.searchParams.get("limit") || String(CONNECT_LIST_LIMIT), 10) ||
      CONNECT_LIST_LIMIT,
    1,
    50
  );
 
  let result;
  if (connectType === "money") {
    result = await env.DB
      .prepare(`
        SELECT
          i.*,
          COALESCE((
            SELECT COUNT(*)
            FROM connect_money_members mm
            JOIN connect_money_rooms mr ON mr.id = mm.room_id
            WHERE mr.item_id = i.id
          ), 0) AS member_count,
          COALESCE((
            SELECT mr.status
            FROM connect_money_rooms mr
            WHERE mr.item_id = i.id
            LIMIT 1
          ), 'team_forming') AS room_status
        FROM connect_items i        WHERE i.connect_type = 'money'
          AND i.status = 'active'
        ORDER BY datetime(i.created_at) DESC
        LIMIT ?
      `)
      .bind(limit)
      .all();
  } else if (connectType === "walk") {
    result = await env.DB
      .prepare(`
        SELECT
          i.*,
          COALESCE((
            SELECT COUNT(*)
            FROM connect_walk_interests wi
            WHERE wi.item_id = i.id
              AND wi.status = 'joined'
          ), 0) AS interest_count
        FROM connect_items i
        WHERE i.connect_type = 'walk'
          AND i.status = 'active'
        ORDER BY datetime(i.created_at) DESC
        LIMIT ?
      `)
      .bind(limit)
      .all();
  } else {
    result = await env.DB
      .prepare(`
        SELECT *
        FROM connect_items
        WHERE connect_type = ?
          AND status = 'active'
        ORDER BY datetime(created_at) DESC
        LIMIT ?
      `)
      .bind(connectType, limit)
      .all();
  }
 
    const items = await Promise.all(
    (result.results || []).map(async (row) => {
      const mapped = publicConnectItem(row);
      if (connectType === "money") {
        mapped.member_count = Number(row.member_count || 0);
        mapped.room_status = row.room_status || "team_forming";
      }
      if (connectType === "walk") {
        mapped.interest_count = Number(row.interest_count || 0);
      }
      if (connectType === "love") {
        mapped.match_status = await computeLoveMatchStatus(env.DB, row);
      }
      return mapped;
    })
  );
 
  return jsonResponse(
    { success: true, items },
    200,
    { "Cache-Control": "no-store" }
  );
}
 
async function handleConnectWalkJoin(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.");
  }
 
  const walkId = String(body.walk_id || body.item_id || "").trim();
  if (!walkId) return errorResponse("walk_id is required.");
 
  const item = await getConnectItemById(env.DB, walkId);
  if (!item || item.connect_type !== "walk" || item.status !== "active") {
    return errorResponse("Walk Together post not found.", 404);
  }
 
  const name = sanitizeConnectText(body.name || "", CONNECT_NAME_MAX_LENGTH);
  const photoUrl = normalizeConnectUrl(body.photo_url || "");
  const photoKey = sanitizeConnectText(body.photo_key || "", 500);
  const whatsapp = body.whatsapp
    ? normalizeWhatsAppNumber(body.whatsapp)
    : "";
 
  if (!name) return errorResponse("Your name is required.");
  if (!photoUrl) return errorResponse("Your profile photo is required.");
  if (body.whatsapp && !whatsapp) {
    return errorResponse("Enter a valid WhatsApp number.");
  }
 
  if (
    !checkRateLimit(
      `connect-walk-join:${getClientIp(request)}:${walkId}`,
      10,
      60 * 60_000
    )
  ) {
    return errorResponse("Too many join attempts. Try again later.", 429);
  }
 
  const loggedInProvider = await getAuthenticatedProvider(request, env);
  const memberToken = makeConnectToken(CONNECT_MEMBER_TOKEN_BYTES);  const tokenHash = await hashToken(memberToken);
  const id = crypto.randomUUID();
  const timestamp = nowIso();
 
  await env.DB
    .prepare(`
      INSERT INTO connect_walk_interests (
        id,
        item_id,
        member_provider_id,
        member_name,
        member_whatsapp,
        member_photo_url,
        member_photo_key,
        member_token_hash,
        status,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'joined', ?)
    `)
    .bind(
      id,
      walkId,
      loggedInProvider?.id || null,
      name,
      whatsapp,
      photoUrl,
      photoKey || null,
      tokenHash,
      timestamp
    )
    .run();
 
  const countRow = await env.DB
    .prepare(`
      SELECT COUNT(*) AS count
      FROM connect_walk_interests
      WHERE item_id = ? AND status = 'joined'
    `)
    .bind(walkId)
    .first();
 
  return jsonResponse(
    {
      success: true,
      joined: true,
      interest_id: id,
      member_token: memberToken,
      interest_count: Number(countRow?.count || 0),
      group_url: item.group_url || "",
      message: item.group_url
        ? "You joined this walk. The group link is ready."
        : "You joined this walk. Gwamo is keeping your interest with this walk while the group forms.",
    },
    201,
    { "Cache-Control": "no-store" }
  );
}
 
async function handleConnectMoneyJoin(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.");
  }
 
  const missionId = String(body.mission_id || body.item_id || "").trim();
  if (!missionId) return errorResponse("mission_id is required.");
 
  const item = await getConnectItemById(env.DB, missionId);
  if (!item || item.connect_type !== "money" || item.status !== "active") {
    return errorResponse("Mission not found.", 404);
  }
 
  const name = sanitizeConnectText(body.name || "", CONNECT_NAME_MAX_LENGTH);
  const photoUrl = normalizeConnectUrl(body.photo_url || "");
  const photoKey = sanitizeConnectText(body.photo_key || "", 500);
  const whatsapp = body.whatsapp
    ? normalizeWhatsAppNumber(body.whatsapp)
    : "";
 
  if (!name) return errorResponse("Your name is required.");
  if (!photoUrl) return errorResponse("Your profile photo is required.");
  if (body.whatsapp && !whatsapp) {
    return errorResponse("Enter a valid WhatsApp number.");
  }
 
  if (
    !checkRateLimit(
      `connect-money-join:${getClientIp(request)}:${missionId}`,
      10,
      60 * 60_000
    )
  ) {
    return errorResponse("Too many mission join attempts. Try again later.", 429);
  }
 
  let room = await getMoneyRoomByMissionId(env.DB, missionId);
  if (!room) {    const roomId = crypto.randomUUID();
    const timestamp = nowIso();
    await env.DB
      .prepare(`
        INSERT INTO connect_money_rooms (
          id, item_id, status, created_at, updated_at
        )
        VALUES (?, ?, 'team_forming', ?, ?)
      `)
      .bind(roomId, missionId, timestamp, timestamp)
      .run();
    room = await getMoneyRoomByMissionId(env.DB, missionId);
  }
 
  if (room.status === "closed") {
    return errorResponse("This Mission Room is closed.", 409);
  }
 
  const loggedInProvider = await getAuthenticatedProvider(request, env);
  const memberToken = makeConnectToken(CONNECT_MEMBER_TOKEN_BYTES);
  const tokenHash = await hashToken(memberToken);
  const memberId = crypto.randomUUID();
  const timestamp = nowIso();
 
  await env.DB
    .prepare(`
      INSERT INTO connect_money_members (
        id,
        room_id,
        role,
        provider_id,
        name,
        whatsapp,
        photo_url,
        photo_key,
        token_hash,
        created_at
      )
      VALUES (?, ?, 'viewer', ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      memberId,
      room.id,
      loggedInProvider?.id || null,
      name,
      whatsapp,
      photoUrl,
      photoKey || null,
      tokenHash,
      timestamp
    )
    .run();
 
  const countRow = await env.DB
    .prepare(`
      SELECT COUNT(*) AS count
      FROM connect_money_members
      WHERE room_id = ?
    `)
    .bind(room.id)
    .first();
 
  const memberCount = Number(countRow?.count || 0);
  const eventText =
    memberCount === 2
      ? "Gwamo connected the first two people. More interested people can still join."
      : `${name} joined this mission. ${memberCount} people are now in the Mission Room.`;
 
  await env.DB
    .prepare(`
      INSERT INTO connect_money_events (
        id, room_id, event_type, text, created_at
      )
      VALUES (?, ?, 'member_joined', ?, ?)
    `)
    .bind(crypto.randomUUID(), room.id, eventText, timestamp)
    .run();
 
  return jsonResponse(
    {
      success: true,
      joined: true,
      member_token: memberToken,
      member_id: memberId,
      room: {
        id: room.id,
        mission_id: missionId,
        status: room.status || "team_forming",
        member_count: memberCount,
      },
      message:
        memberCount === 2
          ? "You joined this mission. Gwamo connected the first two people. More interested people can still join."
          : `You joined this mission. ${memberCount} people are now in the Mission Room.`,
    },
    201,
    { "Cache-Control": "no-store" }
  );
}
 async function handleConnectMoneyRoom(request, env) {
  const url = new URL(request.url);
  const missionId = String(
    url.searchParams.get("mission_id") ||
      url.searchParams.get("item_id") ||
      ""
  ).trim();
 
  if (!missionId) return errorResponse("mission_id is required.");
 
  const item = await getConnectItemById(env.DB, missionId);
  if (!item || item.connect_type !== "money") {
    return errorResponse("Mission not found.", 404);
  }
 
  const room = await getMoneyRoomByMissionId(env.DB, missionId);
  if (!room) return errorResponse("Mission Room not found.", 404);
 
  const memberToken = missionMemberTokenFromRequest(
    request,
    url.searchParams.get("member_token") || ""
  );
  const member = await getMoneyMemberByToken(env.DB, room.id, memberToken);
  if (!member) {
    return errorResponse("Join this mission before opening its Mission Room.", 403);
  }
 
  const [membersResult, messagesResult, eventsResult] = await Promise.all([
    env.DB
      .prepare(`
        SELECT id, role, name, photo_url, created_at
        FROM connect_money_members
        WHERE room_id = ?
        ORDER BY
          CASE role WHEN 'creator' THEN 0 ELSE 1 END,
          datetime(created_at) ASC
      `)
      .bind(room.id)
      .all(),
 
    env.DB
      .prepare(`
        SELECT
          msg.id,
          msg.member_id,
          mm.name AS member_name,
          mm.photo_url AS member_photo_url,
          msg.message,
          msg.created_at
        FROM connect_money_messages msg
        JOIN connect_money_members mm ON mm.id = msg.member_id
        WHERE msg.room_id = ?
        ORDER BY datetime(msg.created_at) ASC
        LIMIT 100
      `)
      .bind(room.id)
      .all(),
 
    env.DB
      .prepare(`
        SELECT id, event_type, text, created_at
        FROM connect_money_events
        WHERE room_id = ?
        ORDER BY datetime(created_at) ASC
        LIMIT 100
      `)
      .bind(room.id)
      .all(),
  ]);
 
  return jsonResponse(
    {
      success: true,
      mission: publicConnectItem(item),
      room: {
        id: room.id,
        status: room.status || "team_forming",
        member_count: (membersResult.results || []).length,
        members: membersResult.results || [],
        messages: messagesResult.results || [],
        events: eventsResult.results || [],
      },
      you_member_id: member.id,
    },
    200,
    { "Cache-Control": "no-store" }
  );
}
 
async function handleConnectMoneyMessage(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.");
  }
 
  const missionId = String(body.mission_id || body.item_id || "").trim();
  const message = sanitizeConnectMessage(body.message);
  if (!missionId) return errorResponse("mission_id is required.");  if (!message) return errorResponse("Message cannot be empty.");
 
  const room = await getMoneyRoomByMissionId(env.DB, missionId);
  if (!room) return errorResponse("Mission Room not found.", 404);
  if (room.status === "closed") {
    return errorResponse("This Mission Room is closed.", 409);
  }
 
  const memberToken = missionMemberTokenFromRequest(
    request,
    body.member_token || ""
  );
  const member = await getMoneyMemberByToken(env.DB, room.id, memberToken);
  if (!member) return errorResponse("Mission Room membership is required.", 403);
 
  if (
    !checkRateLimit(
      `connect-money-message:${member.id}`,
      24,
      60_000
    )
  ) {
    return errorResponse("Too many messages. Please slow down.", 429);
  }
 
  const id = crypto.randomUUID();
  const timestamp = nowIso();
  await env.DB
    .prepare(`
      INSERT INTO connect_money_messages (
        id, room_id, member_id, message, created_at
      )
      VALUES (?, ?, ?, ?, ?)
    `)
    .bind(id, room.id, member.id, message, timestamp)
    .run();
 
  return jsonResponse(
    {
      success: true,
      message: {
        id,
        member_id: member.id,
        member_name: member.name,
        member_photo_url: member.photo_url || "",
        message,
        created_at: timestamp,
      },
    },
    201,
    { "Cache-Control": "no-store" }
  );
}
 
async function handleConnectLoveMatches(request, env) {
  const url = new URL(request.url);
  const profileId = String(url.searchParams.get("profile_id") || "").trim();
  const ownerToken = String(url.searchParams.get("owner_token") || "").trim();
 
  if (!profileId || !ownerToken) {
    return errorResponse("profile_id and owner_token are required.");
  }
 
  const ownProfile = await getConnectItemById(env.DB, profileId);
  if (!ownProfile || ownProfile.connect_type !== "love") {
    return errorResponse("Meet Someone profile not found.", 404);
  }
 
  if (!(await connectOwnerTokenMatches(ownProfile, ownerToken))) {
    return errorResponse("This profile token is invalid.", 403);
  }
 
  const result = await env.DB
    .prepare(`
      SELECT *
      FROM connect_love_matches
      WHERE profile_a_id = ? OR profile_b_id = ?
      ORDER BY datetime(created_at) DESC
      LIMIT 30
    `)
    .bind(profileId, profileId)
    .all();
 
  const matches = [];
  for (const match of result.results || []) {
    const ownIsA = String(match.profile_a_id) === profileId;
    const otherId = ownIsA ? match.profile_b_id : match.profile_a_id;
    const other = await getConnectItemById(env.DB, otherId);
    if (!other || other.connect_type !== "love") continue;
 
    const revealed = Boolean(
      Number(ownIsA ? match.reveal_to_a : match.reveal_to_b)
    );
    const privateData = parseJsonObject(other.private_data_json, {});
 
    matches.push({
      id: match.id,
      status: match.status || "pending",
      revealed,
      profile: {        ...publicConnectItem(other),
        ...(revealed
          ? {
              whatsapp: other.creator_whatsapp || "",
              heart: privateData.heart || "",
            }
          : {}),
      },
      created_at: match.created_at || null,
      updated_at: match.updated_at || null,
    });
  }
 
  return jsonResponse(
    { success: true, matches },
    200,
    { "Cache-Control": "no-store" }
  );
}
 
async function handleConnectVideoUpdate(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.");
  }
 
  const authError = authorizeConnectVideoRequest(
    request,
    env,
    body.pin || body.video_pin || ""
  );
  if (authError) return authError;
 
  const itemId = String(body.item_id || body.connect_id || "").trim();
  const videoUrl = normalizeConnectUrl(body.video_url || "");
  const videoKey = sanitizeConnectText(body.video_key || "", 500);
 
  if (!itemId) return errorResponse("item_id is required.");
  if (!videoUrl) return errorResponse("A valid video_url is required.");
 
  const item = await getConnectItemById(env.DB, itemId);
  if (!item) return errorResponse("Connect item not found.", 404);
 
  await env.DB
    .prepare(`
      UPDATE connect_items
      SET video_url = ?, video_key = ?, updated_at = ?
      WHERE id = ?
    `)
    .bind(videoUrl, videoKey || null, nowIso(), itemId)
    .run();
 
  if (
    item.video_key &&
    item.video_key !== videoKey &&
    (String(item.video_key).startsWith("feedx/") ||
      String(item.video_key).startsWith("connect/"))
  ) {
    await deleteR2Key(env, item.video_key);
  }
 
  const updated = await getConnectItemById(env.DB, itemId);
  return jsonResponse(
    {
      success: true,
      message: "Connect background video updated.",
      item: publicConnectItem(updated),
    },
    200,
    { "Cache-Control": "no-store" }
  );
}
 
async function handleKingOverview(request, env) {
  const url = new URL(request.url);
  const authError = authorizeKingRequest(
    request,
    env,
    url.searchParams.get("pin") || ""
  );
  if (authError) return authError;
 
  const [itemsResult, roomsResult, recentResult] = await Promise.all([
    env.DB
      .prepare(`
        SELECT connect_type, status, COUNT(*) AS count
        FROM connect_items
        GROUP BY connect_type, status
      `)
      .all(),
 
    env.DB
      .prepare(`
        SELECT status, COUNT(*) AS count
        FROM connect_money_rooms
        GROUP BY status
      `)
      .all(), 
    env.DB
      .prepare(`
        SELECT *
        FROM connect_items
        ORDER BY datetime(created_at) DESC
        LIMIT 20
      `)
      .all(),
  ]);
 
  const counts = { love: {}, walk: {}, money: {} };
  for (const row of itemsResult.results || []) {
    if (!counts[row.connect_type]) counts[row.connect_type] = {};
    counts[row.connect_type][row.status] = Number(row.count || 0);
  }
 
  const roomCounts = {};
  for (const row of roomsResult.results || []) {
    roomCounts[row.status] = Number(row.count || 0);
  }
 
  return jsonResponse(
    {
      success: true,
      counts,
      money_rooms: roomCounts,
      recent: (recentResult.results || []).map(adminConnectItem),
      king_pin_configured: Boolean(getKingPin(env)),
      connect_video_pin_configured: Boolean(getConnectVideoPin(env)),
    },
    200,
    { "Cache-Control": "no-store" }
  );
}
 
async function handleKingItems(request, env) {
  const url = new URL(request.url);
  const authError = authorizeKingRequest(
    request,
    env,
    url.searchParams.get("pin") || ""
  );
  if (authError) return authError;
 
  const type = normalizeConnectType(url.searchParams.get("type") || "");
  const status = connectStatus(url.searchParams.get("status") || "");
  const limit = clamp(
    Number.parseInt(url.searchParams.get("limit") || "100", 10) || 100,
    1,
    200
  );
 
  let sql = `SELECT * FROM connect_items WHERE 1 = 1`;
  const bindings = [];
 
  if (type) {
    sql += ` AND connect_type = ?`;
    bindings.push(type);
  }
  if (status) {
    sql += ` AND status = ?`;
    bindings.push(status);
  }
  sql += ` ORDER BY datetime(created_at) DESC LIMIT ?`;
  bindings.push(limit);
 
  const result = await env.DB.prepare(sql).bind(...bindings).all();
  return jsonResponse(
    {
      success: true,
      items: (result.results || []).map(adminConnectItem),
    },
    200,
    { "Cache-Control": "no-store" }
  );
}
 
async function handleKingItemUpdate(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.");
  }
 
  const authError = authorizeKingRequest(request, env, body.pin || "");
  if (authError) return authError;
 
  const id = String(body.id || body.item_id || "").trim();
  if (!id) return errorResponse("item id is required.");
 
  const item = await getConnectItemById(env.DB, id);
  if (!item) return errorResponse("Connect item not found.", 404);
 
  const nextStatus =
    body.status == null
      ? item.status
      : connectStatus(body.status);
   if (!nextStatus) return errorResponse("Invalid Connect item status.");
 
  const adminNote =
    body.admin_note == null
      ? item.admin_note || ""
      : sanitizeConnectText(body.admin_note, 1000);
 
  let groupUrl = item.group_url || "";
  if (body.group_url != null) {
    const raw = String(body.group_url || "").trim();
    groupUrl = raw ? normalizeConnectUrl(raw) : "";
    if (raw && !groupUrl) return errorResponse("group_url must be a valid URL.");
  }
 
  let publicData = parseJsonObject(item.public_data_json, {});
  if (body.public_data && typeof body.public_data === "object") {
    publicData = body.public_data;
  }
 
  let privateData = parseJsonObject(item.private_data_json, {});
  if (body.private_data && typeof body.private_data === "object") {
    privateData = body.private_data;
  }
 
  await env.DB
    .prepare(`
      UPDATE connect_items
      SET
        status = ?,
        admin_note = ?,
        group_url = ?,
        public_data_json = ?,
        private_data_json = ?,
        updated_at = ?
      WHERE id = ?
    `)
    .bind(
      nextStatus,
      adminNote,
      groupUrl,
      JSON.stringify(publicData),
      JSON.stringify(privateData),
      nowIso(),
      id
    )
    .run();
 
  const updated = await getConnectItemById(env.DB, id);
  return jsonResponse(
    {
      success: true,
      message: "Connect item updated.",
      item: adminConnectItem(updated),
    },
    200,
    { "Cache-Control": "no-store" }
  );
}
 
async function handleKingItemDelete(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.");
  }
 
  const authError = authorizeKingRequest(request, env, body.pin || "");
  if (authError) return authError;
 
  const id = String(body.id || body.item_id || "").trim();
  if (!id) return errorResponse("item id is required.");
 
  const item = await getConnectItemById(env.DB, id);
  if (!item) return errorResponse("Connect item not found.", 404);
 
  await env.DB
    .prepare(`DELETE FROM connect_items WHERE id = ?`)
    .bind(id)
    .run();
 
  await deleteR2Key(env, item.creator_photo_key);
  await deleteR2Key(env, item.video_key);
 
  return jsonResponse({
    success: true,
    message: "Connect item deleted.",
  });
}
 
async function handleKingWalkInterests(request, env) {
  const url = new URL(request.url);
  const authError = authorizeKingRequest(
    request,
    env,
    url.searchParams.get("pin") || ""
  );
  if (authError) return authError;
 
  const walkId = String(url.searchParams.get("walk_id") || "").trim();  if (!walkId) return errorResponse("walk_id is required.");
 
  const result = await env.DB
    .prepare(`
      SELECT *
      FROM connect_walk_interests
      WHERE item_id = ?
      ORDER BY datetime(created_at) ASC
    `)
    .bind(walkId)
    .all();
 
  return jsonResponse(
    { success: true, interests: result.results || [] },
    200,
    { "Cache-Control": "no-store" }
  );
}
 
async function handleKingMoneyRoom(request, env) {
  const url = new URL(request.url);
  const authError = authorizeKingRequest(
    request,
    env,
    url.searchParams.get("pin") || ""
  );
  if (authError) return authError;
 
  const missionId = String(url.searchParams.get("mission_id") || "").trim();
  if (!missionId) return errorResponse("mission_id is required.");
 
  const item = await getConnectItemById(env.DB, missionId);
  if (!item || item.connect_type !== "money") {
    return errorResponse("Mission not found.", 404);
  }
 
  const room = await getMoneyRoomByMissionId(env.DB, missionId);
  if (!room) return errorResponse("Mission Room not found.", 404);
 
  const [membersResult, messagesResult, eventsResult] = await Promise.all([
    env.DB
      .prepare(`
        SELECT *
        FROM connect_money_members
        WHERE room_id = ?
        ORDER BY
          CASE role WHEN 'creator' THEN 0 ELSE 1 END,
          datetime(created_at) ASC
      `)
      .bind(room.id)
      .all(),
 
    env.DB
      .prepare(`
        SELECT
          msg.*,
          mm.name AS member_name,
          mm.role AS member_role
        FROM connect_money_messages msg
        JOIN connect_money_members mm ON mm.id = msg.member_id
        WHERE msg.room_id = ?
        ORDER BY datetime(msg.created_at) ASC
        LIMIT 500
      `)
      .bind(room.id)
      .all(),
 
    env.DB
      .prepare(`
        SELECT *
        FROM connect_money_events
        WHERE room_id = ?
        ORDER BY datetime(created_at) ASC
        LIMIT 500
      `)
      .bind(room.id)
      .all(),
  ]);
 
  const members = (membersResult.results || []).map((row) => ({
    ...row,
    token_hash: undefined,
  }));
 
  return jsonResponse(
    {
      success: true,
      mission: adminConnectItem(item),
      room: {
        ...room,
        members,
        messages: messagesResult.results || [],
        events: eventsResult.results || [],
      },
    },
    200,
    { "Cache-Control": "no-store" }
  );
}
 async function handleKingMoneyRoomStatus(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.");
  }
 
  const authError = authorizeKingRequest(request, env, body.pin || "");
  if (authError) return authError;
 
  const missionId = String(body.mission_id || "").trim();
  const status = roomStatus(body.status);
  if (!missionId) return errorResponse("mission_id is required.");
  if (!status) return errorResponse("Invalid Mission Room status.");
 
  const room = await getMoneyRoomByMissionId(env.DB, missionId);
  if (!room) return errorResponse("Mission Room not found.", 404);
 
  const timestamp = nowIso();
  await env.DB
    .prepare(`
      UPDATE connect_money_rooms
      SET status = ?, updated_at = ?
      WHERE id = ?
    `)
    .bind(status, timestamp, room.id)
    .run();
 
  const statusMessages = {
    team_forming:
      "The team is still forming. Gwamo is keeping the mission active for more interested people.",
    talking:
      "The team has started talking. Agree on the smallest first action before making bigger plans.",
    ready_to_meet:
      "This mission may be ready to meet. Talk together first, then choose a safe place and time.",
    meeting_planned:
      "A meeting has been planned. The team can now prepare for the agreed first action.",
    closed:
      "This Mission Room has been closed.",
  };
 
  await env.DB
    .prepare(`
      INSERT INTO connect_money_events (
        id, room_id, event_type, text, created_at
      )
      VALUES (?, ?, 'status_changed', ?, ?)
    `)
    .bind(
      crypto.randomUUID(),
      room.id,
      statusMessages[status] || "Mission Room status changed.",
      timestamp
    )
    .run();
 
  return jsonResponse({
    success: true,
    mission_id: missionId,
    room_status: status,
    message: statusMessages[status] || "Mission Room status changed.",
  });
}
 
async function handleKingLoveMatches(request, env) {
  const url = new URL(request.url);
  const authError = authorizeKingRequest(
    request,
    env,
    url.searchParams.get("pin") || ""
  );
  if (authError) return authError;
 
  const result = await env.DB
    .prepare(`
      SELECT
        m.*,
        a.creator_name AS profile_a_name,
        a.creator_photo_url AS profile_a_photo,
        a.creator_whatsapp AS profile_a_whatsapp,
        a.private_data_json AS profile_a_private,
        b.creator_name AS profile_b_name,
        b.creator_photo_url AS profile_b_photo,
        b.creator_whatsapp AS profile_b_whatsapp,
        b.private_data_json AS profile_b_private
      FROM connect_love_matches m
      JOIN connect_items a ON a.id = m.profile_a_id
      JOIN connect_items b ON b.id = m.profile_b_id
      ORDER BY datetime(m.created_at) DESC
      LIMIT 200
    `)
    .all();
 
  const matches = (result.results || []).map((row) => ({
    ...row,
    profile_a_private: parseJsonObject(row.profile_a_private, {}),
    profile_b_private: parseJsonObject(row.profile_b_private, {}),
  }));
   return jsonResponse(
    { success: true, matches },
    200,
    { "Cache-Control": "no-store" }
  );
}
 
async function handleKingLoveMatchUpsert(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.");
  }
 
  const authError = authorizeKingRequest(request, env, body.pin || "");
  if (authError) return authError;
 
  const originalA = String(body.profile_a_id || "").trim();
  const originalB = String(body.profile_b_id || "").trim();
  if (!originalA || !originalB || originalA === originalB) {
    return errorResponse("Choose two different Meet Someone profiles.");
  }
 
  const profileA = await getConnectItemById(env.DB, originalA);
  const profileB = await getConnectItemById(env.DB, originalB);
  if (
    !profileA ||
    !profileB ||
    profileA.connect_type !== "love" ||
    profileB.connect_type !== "love"
  ) {
    return errorResponse("Both profiles must be Meet Someone profiles.", 404);
  }
 
  let profileAId = originalA;
  let profileBId = originalB;
  let revealToA = body.reveal_to_a ? 1 : 0;
  let revealToB = body.reveal_to_b ? 1 : 0;
 
  if (profileAId.localeCompare(profileBId) > 0) {
    [profileAId, profileBId] = [profileBId, profileAId];
    [revealToA, revealToB] = [revealToB, revealToA];
  }
 
  const allowedStatuses = new Set(["pending", "approved", "rejected", "closed"]);
  const status = String(body.status || "pending").trim().toLowerCase();
  if (!allowedStatuses.has(status)) {
    return errorResponse("Invalid love match status.");
  }
 
  const adminNote = sanitizeConnectText(body.admin_note || "", 1000);
  const timestamp = nowIso();
  const existing = await env.DB
    .prepare(`
      SELECT id
      FROM connect_love_matches
      WHERE profile_a_id = ? AND profile_b_id = ?
      LIMIT 1
    `)
    .bind(profileAId, profileBId)
    .first();
 
  const id = existing?.id || crypto.randomUUID();
 
  if (existing) {
    await env.DB
      .prepare(`
        UPDATE connect_love_matches
        SET
          status = ?,
          reveal_to_a = ?,
          reveal_to_b = ?,
          admin_note = ?,
          updated_at = ?
        WHERE id = ?
      `)
      .bind(
        status,
        revealToA,
        revealToB,
        adminNote,
        timestamp,
        id
      )
      .run();
  } else {
    await env.DB
      .prepare(`
        INSERT INTO connect_love_matches (
          id,
          profile_a_id,
          profile_b_id,
          status,
          reveal_to_a,
          reveal_to_b,
          admin_note,
          created_at,
          updated_at
        )        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        profileAId,
        profileBId,
        status,
        revealToA,
        revealToB,
        adminNote,
        timestamp,
        timestamp
      )
      .run();
  }
 
  const row = await env.DB
    .prepare(`SELECT * FROM connect_love_matches WHERE id = ? LIMIT 1`)
    .bind(id)
    .first();
 
  return jsonResponse(
    {
      success: true,
      message: existing ? "Love match updated." : "Love match created.",
      match: row,
    },
    existing ? 200 : 201,
    { "Cache-Control": "no-store" }
  );
}
 
async function handleHealth(env) {
  const hasDb = Boolean(env.DB);
 
  const hasBucket = Boolean(
    getBucket(env)
  );
 
  return jsonResponse({
    success: true,
    worker: "gwamo-time-market",
    database_binding: hasDb,
    r2_binding: hasBucket,
    separate_private_media_bucket: Boolean(env.PRIVATE_MEDIA_BUCKET),
    pin_authentication_configured: hasSecurePinConfiguration(env),
    secure_admin_pin_configured: Boolean(getAdminPin(env)),
    king_pin_configured: Boolean(getKingPin(env)),
    connect_video_pin_configured: Boolean(getConnectVideoPin(env)),
    private_media_signing_configured: Boolean(getPrivateMediaSecret(env)),
    realtime_chat_configured: Boolean(env.CHAT_ROOMS),
    auth_method: PIN_AUTH_METHOD,
    privacy_notice:
      "Authorized Gwamo administrators may access conversations as disclosed in the Privacy Policy.",
    timestamp: nowIso(),
  }, 200, { "Cache-Control": "no-store" });
}
 
export class ConversationRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this._watchingTick = null;
  }
 
  async fetch(request) {
    const url = new URL(request.url);
 
    if (request.method === "POST" && url.pathname === "/broadcast") {
      const payload = await request.text();
      if (payload.length > 256_000) {
        return new Response("Payload too large", { status: 413 });
      }
 
      for (const socket of this.state.getWebSockets()) {
        try {
          socket.send(payload);
        } catch {
          try {
            socket.close(1011, "Delivery failed");
          } catch {
            // The hibernation runtime will clean up a closed socket.
          }
        }
      }
 
      return new Response(null, { status: 204 });
    }
 
    if (String(request.headers.get("Upgrade") || "").toLowerCase() !== "websocket") {
      return new Response("WebSocket upgrade required", { status: 426 });
    }
 
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.state.acceptWebSocket(server);
    server.serializeAttachment({
      conversation_id: request.headers.get("X-Conversation-Id") || "",
      provider_id: request.headers.get("X-Provider-Id") || "",
      connected_at: nowIso(),    });
 
    this.scheduleWatchingTick(
      String(request.headers.get("X-Conversation-Id") || "")
    );

    this.scheduleWatchingTick(
      String(request.headers.get("X-Conversation-Id") || "")
    );

    return new Response(null, { status: 101, webSocket: client });
  }
 
  async webSocketMessage(socket, message) {
    const raw = String(message || "");
    if (raw === "ping") {
      socket.send("pong");
      return;
    }
 
    // Private chat messages are written through the authenticated HTTP API and
    // broadcast into this room by /broadcast. The only client-originated JSON
    // frame accepted here is lightweight TV typing presence.
    if (raw.length > 16_000) return;
 
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }
 
     if (!payload || (payload.type !== "tv_typing" && payload.type !== "tv_watching")) {
      return;
    }
 
    let attachment = {};
    try {
      attachment = socket.deserializeAttachment?.() || {};
    } catch {
      attachment = {};
    }
 
    const conversationId = String(attachment.conversation_id || "");
    if (!conversationId.startsWith("tv:")) return;
 
    const tvPostId = conversationId.slice(3).trim();
    if (!tvPostId) return;
 
    const typing = Boolean(payload.typing ?? payload.active);
    const userName = normalizeTvDisplayName(
      payload.user_name || payload.name || ""
    );
    const countryCode = normalizeCountryCode(payload.country_code);
    const profileImage = normalizeTvProfileImage(
      payload.profile_image || payload.profile_image_url || ""
    );
    const userId = String(payload.user_id || payload.viewer_id || "")
      .replace(/[\u0000-\u001F\u007F]/g, "")
      .trim()
      .slice(0, 128);
 
    // A stop frame may omit presentation fields. A start frame must have the
    // visible identity needed by Home.jsx to render the badge correctly.
    if (typing && (!userName || !countryCode)) return;

        // A watcher heartbeat is not a typing event: it only records that
    // this socket is currently watching the post. Handle it here and
    // return, so it never reaches the typing broadcast below.
    if (payload.type === "tv_watching") {
      try {
        const currentAttachment = socket.deserializeAttachment?.() || {};
        socket.serializeAttachment({
          ...currentAttachment,
          watching_at: Date.now(),
          watching_viewer_id: String(
            payload.viewer_id || currentAttachment.watching_viewer_id || ""
          ).slice(0, 128),
        });
      } catch {
        // Attachment writes are best-effort; the next tick still counts
        // sockets whose `watching_at` is fresh.
      }
      this.broadcastWatchingCount(conversationId);
      return;
    }

 
    const outgoing = JSON.stringify({
      type: "tv_typing",
      tv_post_id: tvPostId,
      typing,
      user_id: userId,
      user_name: userName,
      profile_image: profileImage,
      country_code: countryCode,
    });
 
    // Relay presence to everybody watching this one TV post. Home.jsx ignores
    // its own user_id, so echoing to the sender is harmless and keeps this room
    // implementation simple under Durable Object hibernation.
    for (const peer of this.state.getWebSockets()) {
      try {
        peer.send(outgoing);
      } catch {
        try {
          peer.close(1011, "Delivery failed");
        } catch {
          // The hibernation runtime will clean up the closed socket.
        }
      }
    }
  }
 
  // Count sockets that have sent a heartbeat within the window and push
  // the current number to everybody in this room. `conversationId` is
  // the full room key, e.g. "tv:abc-123"; we strip the "tv:" prefix so
  // the client sees the same post id it subscribed with.
  broadcastWatchingCount(conversationId) {
    const now = Date.now();
    let count = 0;
    for (const peer of this.state.getWebSockets()) {
      try {
        const attachment = peer.deserializeAttachment?.() || {};
        const last = Number(attachment.watching_at || 0);
        if (last && now - last <= TV_WATCHING_WINDOW_MS) {
          count += 1;
        }
      } catch {
        // Ignore attachments we cannot read; they simply do not count.
      }
    }

    const payload = JSON.stringify({
      type: "tv_watching_count",
      tv_post_id: String(conversationId || "").startsWith("tv:")
        ? String(conversationId).slice(3)
        : "",
      count,
    });

    for (const peer of this.state.getWebSockets()) {
      try {
        peer.send(payload);
      } catch {
        // The hibernation runtime will clean up dead sockets.
      }
    }
  }

    // Runs every few seconds so the count falls back down naturally when
  // viewers close their tab or navigate away - without them having to
  // explicitly say goodbye. The tick only runs while there is at least
  // one socket connected; when the last viewer leaves, the timer stops
  // on its own (the Durable Object will hibernate).
  scheduleWatchingTick(conversationId) {
    if (this._watchingTick) return;
    const tick = () => {
      const hasSockets = this.state.getWebSockets().length > 0;
      if (hasSockets) {
        this.broadcastWatchingCount(conversationId);
      } else {
        // Nobody left. Stop the timer so the object can hibernate.
        if (this._watchingTick) clearTimeout(this._watchingTick);
        this._watchingTick = null;
        return;
      }
      this._watchingTick = setTimeout(
        tick,
        TV_WATCHING_BROADCAST_MS
      );
    };
    this._watchingTick = setTimeout(tick, TV_WATCHING_BROADCAST_MS);
  }


  async webSocketError(socket) {
    try {
      socket.close(1011, "Realtime connection error");
    } catch {
      // Socket may already be closed.
    }
  }

    async webSocketClose(socket, code, reason) {
    try {
      socket.close(code || 1000, reason || "Closed");
    } catch {
      // Socket may already be closed.
    }
  }
}
 

 // ==================== GWAMO BRAIN CHAT FUNCTIONS ====================

async function brainGetSettings(env) {
  const settings = await env.DB.prepare(`
    SELECT title, welcome_message, media_url
    FROM gwamo_brain_settings
    WHERE id = 'main'
    LIMIT 1
  `).first();

  return jsonResponse({
    success: true,
    settings: settings || {
      title: "Gwamo Brain",
      welcome_message: "Hello! How can I help you?",
      media_url: ""
    }
  });
}

async function brainGetOrCreateConversation(request, env) {

    if (
    !checkRateLimit(
      `brain-conversation:${getClientIp(request)}`,
      12,
      60_000
    )
  ) {
    return errorResponse(
      "Too many support chat attempts. Please try again shortly.",
      429
    );
  }

  const suppliedToken =
    request.headers.get("X-Gwamo-Visitor-Token") || "";

  let token = suppliedToken;
  let conversation = null;

  if (token) {
    const tokenHash = await hashToken(token);

    conversation = await env.DB.prepare(`
      SELECT id, visitor_label, status
      FROM gwamo_brain_conversations
      WHERE visitor_token_hash = ?
      LIMIT 1
    `).bind(tokenHash).first();
  }

  if (!conversation) {
    token = makeSessionToken();
    const tokenHash = await hashToken(token);
    const id = crypto.randomUUID();
    const now = nowIso();

    await env.DB.prepare(`
      INSERT INTO gwamo_brain_conversations (
        id, visitor_token_hash, visitor_label,
        status, last_message_at, created_at, updated_at
      ) VALUES (?, ?, 'Visitor', 'open', ?, ?, ?)
    `).bind(id, tokenHash, now, now, now).run();

    conversation = {
      id,
      visitor_label: "Visitor",
      status: "open"
    };
  }

  return jsonResponse({
    success: true,
    conversation,
    visitor_token: token
  });
}

async function brainGetVisitorMessages(request, env) {
  const token =
    request.headers.get("X-Gwamo-Visitor-Token") || "";

  if (!token) {
    return errorResponse("Visitor token is required.", 401);
  }

  const tokenHash = await hashToken(token);

  const conversation = await env.DB.prepare(`
    SELECT id
    FROM gwamo_brain_conversations
    WHERE visitor_token_hash = ?
    LIMIT 1
  `).bind(tokenHash).first();

  if (!conversation) {
    return errorResponse("Conversation not found.", 404);
  }

   const result = await env.DB.prepare(`
    SELECT id, sender, text_content, media_url, media_type, created_at
    FROM gwamo_brain_messages
    WHERE conversation_id = ?
    ORDER BY created_at ASC
    LIMIT 300
  `).bind(conversation.id).all();

  return jsonResponse({
    success: true,
    messages: result.results || []
  });
}

async function brainSendVisitorMessage(request, env) {

    if (
    !checkRateLimit(
      `brain-message:${getClientIp(request)}`,
      30,
      60_000
    )
  ) {
    return errorResponse(
      "Too many messages. Please slow down.",
      429
    );
  }

  const token =
    request.headers.get("X-Gwamo-Visitor-Token") || "";

  if (!token) {
    return errorResponse("Visitor token is required.", 401);
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.", 400);
  }

  const message = String(body.text || "").trim();

  if (!message || message.length > 4000) {
    return errorResponse(
      "Message must contain 1 to 4000 characters.",
      400
    );
  }

  const tokenHash = await hashToken(token);

  const conversation = await env.DB.prepare(`
    SELECT id, status
    FROM gwamo_brain_conversations
    WHERE visitor_token_hash = ?
    LIMIT 1
  `).bind(tokenHash).first();

  if (!conversation) {
    return errorResponse("Conversation not found.", 404);
  }

  if (conversation.status !== "open") {
    return errorResponse("This conversation is closed.", 403);
  }

  const id = crypto.randomUUID();
  const now = nowIso();

  await env.DB.prepare(`
    INSERT INTO gwamo_brain_messages (
      id, conversation_id, sender, text_content, created_at
    ) VALUES (?, ?, 'visitor', ?, ?)
  `).bind(id, conversation.id, message, now).run();
  await env.DB.prepare(`
    UPDATE gwamo_brain_conversations
    SET last_message_at = ?, updated_at = ?
    WHERE id = ?
  `).bind(now, now, conversation.id).run();

  const outboundMessage = {
    id,
    sender: "visitor",
    text_content: message,
    created_at: now
  };

  await notifyConversationRoom(env, `brain:${conversation.id}`, {
    type: "brain_message",
    conversation_id: conversation.id,
    message: outboundMessage,
  });

  return jsonResponse({
    success: true,
    message: outboundMessage
  });
}
async function brainRealtimeTicket(request, env) {
  const token = request.headers.get("X-Gwamo-Visitor-Token") || "";
  if (!token) {
    return errorResponse("Visitor token is required.", 401);
  }

  if (!env.CHAT_ROOMS) {
    return errorResponse(
      "Realtime support chat is not configured. Polling still works.",
      503,
      { realtime_available: false }
    );
  }

  if (
    !checkRateLimit(
      `brain-ticket:${getClientIp(request)}`,
      30,
      60_000
    )
  ) {
    return errorResponse("Too many requests. Try again shortly.", 429);
  }

  const tokenHash = await hashToken(token);

  const conversation = await env.DB.prepare(`
    SELECT id
    FROM gwamo_brain_conversations
    WHERE visitor_token_hash = ?
    LIMIT 1
  `).bind(tokenHash).first();

  if (!conversation) {
    return errorResponse("Conversation not found.", 404);
  }

  const rawTicket = `${crypto.randomUUID()}${randomHex(24)}`.replace(/-/g, "");
  const ticketId = crypto.randomUUID();
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + 60_000).toISOString();

  await env.DB.prepare(`
    INSERT INTO gwamo_brain_realtime_tickets (
      id, token_hash, conversation_id, expires_at, used_at, created_at
    ) VALUES (?, ?, ?, ?, NULL, ?)
  `).bind(
    ticketId,
    await hashToken(rawTicket),
    conversation.id,
    expiresAt,
    createdAt
  ).run();

  const socketUrl = new URL("/api/brain/realtime/connect", request.url);
  socketUrl.protocol = socketUrl.protocol === "https:" ? "wss:" : "ws:";
  socketUrl.searchParams.set("ticket", rawTicket);

  return jsonResponse(
    {
      success: true,
      realtime_available: true,
      websocket_url: socketUrl.toString(),
      expires_at: expiresAt,
    },
    201,
    { "Cache-Control": "no-store" }
  );
}

async function brainRealtimeConnect(request, env) {
  if (!env.CHAT_ROOMS) {
    return errorResponse("Realtime support chat is not configured.", 503);
  }

  if (String(request.headers.get("Upgrade") || "").toLowerCase() !== "websocket") {
    return errorResponse("A WebSocket upgrade is required.", 426, {
      upgrade: "websocket",
    });
  }

  const url = new URL(request.url);
  const rawTicket = String(url.searchParams.get("ticket") || "").trim();
  if (!rawTicket) return errorResponse("Realtime ticket is required.", 401);

  const tokenHash = await hashToken(rawTicket);

  const ticket = await env.DB.prepare(`
    SELECT *
    FROM gwamo_brain_realtime_tickets
    WHERE token_hash = ? AND used_at IS NULL
    LIMIT 1
  `).bind(tokenHash).first();

  if (!ticket || Date.parse(ticket.expires_at || "") <= Date.now()) {
    return errorResponse("Realtime ticket is invalid or expired.", 401);
  }

  const used = await env.DB.prepare(`
    UPDATE gwamo_brain_realtime_tickets
    SET used_at = ?
    WHERE id = ? AND used_at IS NULL AND expires_at > ?
  `).bind(nowIso(), ticket.id, nowIso()).run();

  if (Number(used?.meta?.changes || 0) !== 1) {
    return errorResponse("Realtime ticket has already been used.", 401);
  }

  const roomId = env.CHAT_ROOMS.idFromName(`brain:${ticket.conversation_id}`);
  const room = env.CHAT_ROOMS.get(roomId);
  const headers = new Headers(request.headers);
  headers.set("X-Conversation-Id", `brain:${ticket.conversation_id}`);
  headers.set("X-Provider-Id", "brain-visitor");

  return room.fetch(
    new Request("https://chat.internal/connect", {
      method: "GET",
      headers,
    })
  );
}

// ==================== END GWAMO BRAIN CHAT FUNCTIONS ====================


 // ==================== GWAMO BRAIN ADMIN FUNCTIONS ====================

async function brainAdminConversations(request, env) {
  const authError = authorizeAdminRequest(request, env, "");
  if (authError) return authError;

  const result = await env.DB.prepare(`
    SELECT
      c.id,
      c.visitor_label,
      c.status,
      c.last_message_at,
      c.created_at,
      (
        SELECT m.text_content
        FROM gwamo_brain_messages m
        WHERE m.conversation_id = c.id
        ORDER BY m.created_at DESC
        LIMIT 1
      ) AS last_message
    FROM gwamo_brain_conversations c
    ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
    LIMIT 200
  `).all();

  return jsonResponse({
    success: true,
    conversations: result.results || []
  });
}

async function brainAdminMessages(request, env) {
  const authError = authorizeAdminRequest(request, env, "");
  if (authError) return authError;

  const url = new URL(request.url);
  const conversationId = url.searchParams.get("conversation_id");

  if (!conversationId) {
    return errorResponse("Conversation ID is required.", 400);
  }

  const conversation = await env.DB.prepare(`
    SELECT id, visitor_label, status
    FROM gwamo_brain_conversations
    WHERE id = ?
    LIMIT 1
  `).bind(conversationId).first();

  if (!conversation) {
    return errorResponse("Conversation not found.", 404);
  }

   const result = await env.DB.prepare(`
    SELECT id, sender, text_content, media_url, media_type, created_at
    FROM gwamo_brain_messages
    WHERE conversation_id = ?
    ORDER BY created_at ASC
    LIMIT 500
  `).bind(conversationId).all();

  return jsonResponse({
    success: true,
    conversation,
    messages: result.results || []
  });
}

async function brainAdminUpload(request, env) {
  const authError = authorizeAdminRequest(request, env, "");
  if (authError) return authError;

  const contentType = String(request.headers.get("content-type") || "");
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return errorResponse("This endpoint requires multipart/form-data.", 415);
  }

  if (
    !checkRateLimit(
      `brain-upload:${getClientIp(request)}`,
      20,
      60_000
    )
  ) {
    return errorResponse("Too many uploads. Please slow down.", 429);
  }

  let formData;
  try {
    formData = await request.formData();
  } catch (error) {
    return errorResponse(`Could not read form data: ${error.message}`, 400);
  }

  const conversationId = String(formData.get("conversation_id") || "").trim();
  if (!conversationId) {
    return errorResponse("conversation_id is required.", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size <= 0) {
    return errorResponse("No file was received.", 400);
  }

  const conversation = await env.DB.prepare(`
    SELECT id, status
    FROM gwamo_brain_conversations
    WHERE id = ?
    LIMIT 1
  `).bind(conversationId).first();

  if (!conversation) {
    return errorResponse("Conversation not found.", 404);
  }

  let kind;
  if (file.type.startsWith("image/")) {
    kind = "post_image";
  } else if (file.type.startsWith("video/")) {
    kind = "video";
  } else {
    return errorResponse("Only photos and videos can be sent.", 400);
  }

  try {
    const uploaded = await uploadFile(request, env, file, kind);
    const mediaType = kind === "post_image" ? "image" : "video";
    return jsonResponse(
      {
        success: true,
        url: uploaded.url,
        key: uploaded.key,
        media_type: mediaType,
      },
      201,
      { "Cache-Control": "no-store" }
    );
  } catch (error) {
    return errorResponse(error?.message || "Upload failed.", 400);
  }
}
async function brainAdminReply(request, env) {
  const authError = authorizeAdminRequest(request, env, "");
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.", 400);
  }

  const conversationId = String(body.conversation_id || "").trim();
  const message = String(body.text || "").trim();
  const mediaUrl = String(body.media_url || "").trim().slice(0, 2048);
  const mediaType = String(body.media_type || "").trim().toLowerCase();

  if (!conversationId) {
    return errorResponse("Conversation ID is required.", 400);
  }

  if (!message && !mediaUrl) {
    return errorResponse(
      "A message or an attachment is required.",
      400
    );
  }

  if (message.length > 4000) {
    return errorResponse(
      "Message must be 4000 characters or fewer.",
      400
    );
  }

  if (mediaUrl && !/^https:\/\//i.test(mediaUrl)) {
    return errorResponse("Media URL must use HTTPS.", 400);
  }

  const cleanMediaType =
    mediaType === "image" || mediaType === "video" ? mediaType : "";

  if (mediaUrl && !cleanMediaType) {
    return errorResponse("Media type must be image or video.", 400);
  }

  const conversation = await env.DB.prepare(`
    SELECT id, status
    FROM gwamo_brain_conversations
    WHERE id = ?
    LIMIT 1
  `).bind(conversationId).first();

  if (!conversation) {
    return errorResponse("Conversation not found.", 404);
  }

  if (conversation.status !== "open") {
    return errorResponse("This conversation is closed.", 403);
  }

  const id = crypto.randomUUID();
  const now = nowIso();

  await env.DB.prepare(`
    INSERT INTO gwamo_brain_messages (
      id, conversation_id, sender, text_content,
      media_url, media_type, created_at
    ) VALUES (?, ?, 'helper', ?, ?, ?, ?)
  `).bind(
    id,
    conversationId,
    message,
    mediaUrl,
    cleanMediaType,
    now
  ).run();
  await env.DB.prepare(`
    UPDATE gwamo_brain_conversations
    SET last_message_at = ?, updated_at = ?
    WHERE id = ?
  `).bind(now, now, conversationId).run();

  const outboundMessage = {
    id,
    sender: "helper",
    text_content: message,
    media_url: mediaUrl,
    media_type: cleanMediaType,
    created_at: now
  };

  await notifyConversationRoom(env, `brain:${conversationId}`, {
    type: "brain_message",
    conversation_id: conversationId,
    message: outboundMessage,
  });

  return jsonResponse({
    success: true,
    message: outboundMessage
  });
}

async function brainAdminUpdateSettings(request, env) {
  const authError = authorizeAdminRequest(request, env, "");
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.", 400);
  }

  const title = String(body.title ?? "").trim();
  const welcomeMessage = String(body.welcome_message ?? "").trim();
  const mediaUrl = String(body.media_url ?? "").trim();

  if (
    !title || title.length > 100 ||
    !welcomeMessage || welcomeMessage.length > 2000 ||
    mediaUrl.length > 2000
  ) {
    return errorResponse("The title, welcome message, or media URL is invalid.", 400);
  }

  if (mediaUrl && !/^https:\/\//i.test(mediaUrl)) {
    return errorResponse("Media URL must use HTTPS.", 400);
  }

  await env.DB.prepare(`
    UPDATE gwamo_brain_settings
    SET title = ?, welcome_message = ?, media_url = ?, updated_at = ?
    WHERE id = 'main'
  `).bind(title, welcomeMessage, mediaUrl, nowIso()).run();

  return jsonResponse({
    success: true,
    settings: {
      title,
      welcome_message: welcomeMessage,
      media_url: mediaUrl
    }
  });
}

// ==================== END GWAMO BRAIN ADMIN FUNCTIONS ====================




export default {
  async fetch(request, env) {
    const url = new URL(request.url);
 
    const pathname =
      url.pathname.replace(/\/+$/, "") ||
      "/";
 
    const method =      request.method.toUpperCase();
 
    if (method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }
 
    try {
      // Media routes
      if (
        method === "GET" &&
        (
          pathname.startsWith(
            "/feedx/"
          ) ||
          pathname.startsWith(
            "/time-market/"
          )
        )
      ) {
        if (pathname.startsWith("/time-market/chat/")) {
          return errorResponse("Private attachment links must be signed.", 404);
        }
 
        return await handleR2Media(
          request,
          env,
          pathname
        );
      }
 
      // Health check
      if (
        pathname === "/" ||
        pathname === "/health"
      ) {
        return await handleHealth(env);
      }
 
      // Check the D1 binding
      if (
        !env.DB &&
        pathname.startsWith("/api/")
      ) {
        return errorResponse(
          "D1 binding DB is missing from this Worker. Add a [[d1_databases]] block in wrangler.toml with binding = \"DB\" and your real database_id, then redeploy.",
          500
        );
      }
 
      // Ensure tables exist (FIX: cached per isolate, not re-run every request)
      if (
        pathname.startsWith("/api/")
      ) {
        try {
          await ensureSchemaOnce(env.DB);
        } catch (schemaError) {
          console.error(
            "Schema initialization failed:",
            schemaError
          );
 
          return errorResponse(
            `Database schema setup failed: ${
              schemaError?.message ||
              "unknown error"
            }`,
            500
          );
        }
      }
 
      
    // ==================== GWAMO BRAIN VISITOR ROUTES ====================

    if (
        pathname === "/api/brain/settings" &&
        method === "GET"
    ) {
        return await brainGetSettings(env);
    }

    if (
        pathname === "/api/brain/conversation" &&
        method === "POST"
    ) {
        return await brainGetOrCreateConversation(request, env);
    }

    if (
        pathname === "/api/brain/messages" &&
        method === "GET"
    ) {
        return await brainGetVisitorMessages(request, env);
    }

     if (
        pathname === "/api/brain/message" &&
        method === "POST"
    ) {
        return await brainSendVisitorMessage(request, env);
    }

    if (
        pathname === "/api/brain/realtime/ticket" &&
        method === "POST"
    ) {
        return await brainRealtimeTicket(request, env);
    }

    if (
        pathname === "/api/brain/realtime/connect" &&
        method === "GET"
    ) {
        return await brainRealtimeConnect(request, env);
    }

    // ==================== END GWAMO BRAIN VISITOR ROUTES ====================


    
    // ==================== GWAMO BRAIN ADMIN ROUTES ====================

    if (
        pathname === "/api/brain/admin/conversations" &&
        method === "GET"
    ) {
        return await brainAdminConversations(request, env);
    }

    if (
        pathname === "/api/brain/admin/messages" &&
        method === "GET"
    ) {
        return await brainAdminMessages(request, env);
    }

       if (
        pathname === "/api/brain/admin/upload" &&
        method === "POST"
    ) {
        return await brainAdminUpload(request, env);
    }

    if (
        pathname === "/api/brain/admin/reply" &&
        method === "POST"
    ) {
        return await brainAdminReply(request, env);
    }

    if (
        pathname === "/api/brain/admin/settings" &&
        method === "POST"
    ) {
        return await brainAdminUpdateSettings(request, env);
    }

    // ==================== END GWAMO BRAIN ADMIN ROUTES ====================

      // ==================== GWAMO CONNECT ====================
      // Public/user Connect routes. Private phone numbers and love-heart data
      // are intentionally omitted from public list responses.
      if (pathname === "/api/connect/live/counts" && method === "GET") {
        return await handleConnectLiveCounts(request, env);
      }

      if (pathname === "/api/connect/live/presence" && method === "POST") {
        return await handleConnectLivePresence(request, env);
      }

      if (pathname === "/api/connect/live/matches" && method === "GET") {
        return await handleConnectLiveMatches(request, env);
      }

      if (pathname === "/api/connect/live/messages" && method === "GET") {
        return await handleConnectLiveMessages(request, env);
      }

      if (pathname === "/api/connect/live/message" && method === "POST") {
        return await handleConnectLiveMessage(request, env);
      }

      if (pathname === "/api/connect/live/recent" && method === "GET") {
        return await handleConnectLiveRecent(request, env);      }

      if (pathname === "/api/connect/live/call/request" && method === "POST") {
        return await handleConnectLiveCallRequest(request, env);
      }

      if (pathname === "/api/connect/live/call/status" && method === "GET") {
        return await handleConnectLiveCallStatus(request, env);
      }

      if (pathname === "/api/connect/live/call/incoming" && method === "GET") {
        return await handleConnectLiveIncomingCall(request, env);
      }

      if (pathname === "/api/connect/live/call/respond" && method === "POST") {
        return await handleConnectLiveCallRespond(request, env);
      }

      if (pathname === "/api/connect/live/call/end" && method === "POST") {
        return await handleConnectLiveCallEnd(request, env);
      }

      if (pathname === "/api/connect/live/call/signal" && method === "POST") {
        return await handleConnectLiveCallSignal(request, env);
      }

      if (pathname === "/api/connect/live/call/signals" && method === "GET") {
        return await handleConnectLiveCallSignals(request, env);
      }

      if (
        pathname === "/api/connect/upload" &&
        method === "POST"
      ) {
        return await handleConnectUpload(request, env);
      }
 
      if (
        pathname === "/api/connect/love" &&
        method === "POST"
      ) {
        return await handleConnectCreateLove(request, env);
      }
 
      if (
        pathname === "/api/connect/love" &&
        method === "GET"
      ) {
        return await handleConnectList(request, env, "love");
      }
 
      if (
        pathname === "/api/connect/love/matches" &&
        method === "GET"
      ) {
        return await handleConnectLoveMatches(request, env);
      }
 
      if (
        pathname === "/api/connect/walk" &&
        method === "POST"
      ) {
        return await handleConnectCreateWalk(request, env);
      }
 
      if (
        pathname === "/api/connect/walk" &&
        method === "GET"
      ) {
        return await handleConnectList(request, env, "walk");
      }
 
      if (
        pathname === "/api/connect/walk/join" &&
        method === "POST"
      ) {
        return await handleConnectWalkJoin(request, env);
      }
 
      if (
        pathname === "/api/connect/money" &&
        method === "POST"
      ) {
        return await handleConnectCreateMoney(request, env);
      }
 
      if (
        pathname === "/api/connect/money" &&
        method === "GET"
      ) {
        return await handleConnectList(request, env, "money");
      }
 
      if (
        pathname === "/api/connect/money/join" &&
        method === "POST"
      ) {
        return await handleConnectMoneyJoin(request, env);
      }
       if (
        pathname === "/api/connect/money/room" &&
        method === "GET"
      ) {
        return await handleConnectMoneyRoom(request, env);
      }
 
      if (
        pathname === "/api/connect/money/room/message" &&
        method === "POST"
      ) {
        return await handleConnectMoneyMessage(request, env);
      }
 
      if (
        pathname === "/api/connect/video" &&
        method === "PATCH"
      ) {
        return await handleConnectVideoUpdate(request, env);
      }
 
      // /king admin API is intentionally separate from /api/admin/*.
      if (
        pathname === "/api/king/overview" &&
        method === "GET"
      ) {
        return await handleKingOverview(request, env);
      }
 
      if (
        pathname === "/api/king/items" &&
        method === "GET"
      ) {
        return await handleKingItems(request, env);
      }
 
      if (
        pathname === "/api/king/item" &&
        method === "PATCH"
      ) {
        return await handleKingItemUpdate(request, env);
      }
 
      if (
        pathname === "/api/king/item" &&
        method === "DELETE"
      ) {
        return await handleKingItemDelete(request, env);
      }
 
      if (
        pathname === "/api/king/walk/interests" &&
        method === "GET"
      ) {
        return await handleKingWalkInterests(request, env);
      }
 
      if (
        pathname === "/api/king/money/room" &&
        method === "GET"
      ) {
        return await handleKingMoneyRoom(request, env);
      }
 
      if (
        pathname === "/api/king/money/room/status" &&
        method === "PATCH"
      ) {
        return await handleKingMoneyRoomStatus(request, env);
      }
 
      if (
        pathname === "/api/king/love/matches" &&
        method === "GET"
      ) {
        return await handleKingLoveMatches(request, env);
      }
 
      if (
        pathname === "/api/king/love/match" &&
        method === "POST"
      ) {
        return await handleKingLoveMatchUpsert(request, env);
      }
 
                // ==================== ROMANTIC STORIES ====================
          if (
            pathname === "/api/romantic/couples" &&
            method === "GET"
          ) {
            return await handleRomanticListCouples(request, env);
          }

          if (
            pathname === "/api/romantic/couples" &&
            method === "POST"
          ) {
            return await handleRomanticAddCouple(request, env);
          }

          if (
            pathname === "/api/romantic/couples" &&
            method === "DELETE"
          ) {
            return await handleRomanticDeleteCouple(request, env);
          }

          if (
            pathname === "/api/romantic/couples" &&
            method === "PATCH"
          ) {
            return await handleRomanticUpdateCouple(request, env);
          }

          if (
            pathname === "/api/romantic/songs" &&
            method === "GET"
          ) {
            return await handleRomanticListSongs(request, env);
          }

          if (
            pathname === "/api/romantic/songs" &&
            method === "POST"
          ) {
            return await handleRomanticAddSong(request, env);
          }

          if (
            pathname === "/api/romantic/songs" &&
            method === "DELETE"
          ) {
            return await handleRomanticDeleteSong(request, env);
          }

          if (
            pathname === "/api/romantic/playback" &&
            method === "GET"
          ) {
            return await handleRomanticGetPlayback(request, env);
          }

          if (
            pathname === "/api/romantic/playback" &&
            method === "POST"
          ) {
            return await handleRomanticSetPlayback(request, env);
          }


      // Provider registration
      if (
        pathname ===
          "/api/time-market/register" &&
        method === "POST"
      ) {
        return await handleProviderRegister(
          request,
          env
        );
      }
 
      // Provider login
      if (
        pathname ===          "/api/time-market/login" &&
        method === "POST"
      ) {
        return await handleProviderLogin(
          request,
          env
        );
      }
 
      // Post-approval activation: the admin already confirmed the account
      // by phone and generated a one-time code; this finishes the loop.
      if (
        pathname === "/api/time-market/activate" &&
        method === "POST"
      ) {
        return await handleProviderActivate(request, env);
      }
 
      // PIN recovery: user requests, admin confirms by telephone and
      // generates the new PIN, admin delivers it by call or SMS
      if (
        pathname === "/api/time-market/pin-reset/request" &&
        method === "POST"
      ) {
        return await handlePinResetRequest(request, env);
      }
 
      if (
        pathname === "/api/time-market/pin-reset/status" &&
        method === "GET"
      ) {
        return await handlePinResetStatus(request, env);
      }
 
      if (
        pathname === "/api/time-market/pin-reset/complete" &&
        method === "POST"
      ) {
        return await handlePinResetComplete(request, env);
      }
 
      // Provider logout
      if (
        pathname ===
          "/api/time-market/logout" &&
        method === "POST"
      ) {
        return await handleProviderLogout(
          request,
          env
        );
      }
 
      // Current provider account
      if (
        pathname ===
          "/api/time-market/me" &&
        method === "GET"
      ) {
        return await handleProviderMe(
          request,
          env
        );
      }
 
      // Update provider profile
      if (
        pathname ===
          "/api/time-market/profile" &&
        method === "PATCH"
      ) {
        return await handleProviderProfileUpdate(
          request,
          env
        );
      }
 
      if (
        pathname === "/api/time-market/profile" &&
        method === "DELETE"
      ) {
        return await handleProviderAccountDelete(request, env);
      }
 
      // Get provider services
      if (
        pathname ===
          "/api/time-market/services" &&
        method === "GET"
      ) {
        const serviceId =
          url.searchParams.get("id");
 
        if (serviceId) {
          const post =
            await getPostForPublic(
              env.DB,
              serviceId
            );
           if (!post) {
            return errorResponse(
              "Service not found.",
              404
            );
          }
 
          return jsonResponse({
            success: true,
            service: post,
          });
        }
 
        return await handleProviderServices(
          request,
          env
        );
      }
 
      // Create a service
      if (
        pathname ===
          "/api/time-market/services" &&
        method === "POST"
      ) {
        return await handleHomeUpdate(
          request,
          env
        );
      }
 
      // Edit a service
      if (
        pathname ===
          "/api/time-market/services" &&
        method === "PATCH"
      ) {
        return await handleProviderServiceEdit(
          request,
          env
        );
      }
 
      // Delete a service
      if (
        pathname ===
          "/api/time-market/services" &&
        method === "DELETE"
      ) {
        return await handleProviderServiceDelete(
          request,
          env
        );
      }
 
      // Start a conversation
      if (
        pathname ===
          "/api/time-market/conversations" &&
        method === "POST"
      ) {
        return await handleConversationStart(
          request,
          env
        );
      }
 
      // Get provider conversations
      if (
        pathname ===
          "/api/time-market/conversations" &&
        method === "GET"
      ) {
        return await handleConversationList(
          request,
          env
        );
      }
 
      // Get conversation messages
      if (
        pathname ===
          "/api/time-market/messages" &&
        method === "GET"
      ) {
        return await handleConversationMessages(
          request,
          env
        );
      }
 
      if (
        pathname === "/api/time-market/message-media" &&
        method === "GET"
      ) {
        return await handlePrivateMessageMedia(request, env);
      }
 
      if (
        pathname === "/api/time-market/realtime/ticket" &&        method === "POST"
      ) {
        return await handleRealtimeTicket(request, env);
      }
 
      if (
        pathname === "/api/time-market/realtime/connect" &&
        method === "GET"
      ) {
        return await handleRealtimeConnect(request, env);
      }
 
      // Send a conversation message
      if (
        pathname ===
          "/api/time-market/messages" &&
        method === "POST"
      ) {
        return await handleConversationSend(
          request,
          env
        );
      }
 
// Admin: public TV conversations - GET (list)
if (
  pathname === "/api/admin/tv-conversations" &&
  method === "GET"
) {
  return await handleAdminTvConversations(request, env);
}

// Admin: public TV conversations - POST (create)
if (
  pathname === "/api/admin/tv-conversations" &&
  method === "POST"
) {
  return await handleAdminPostTvConversation(request, env);
}

// Admin: public TV conversations - DELETE (remove)
if (
  pathname === "/api/admin/tv-conversations" &&
  method === "DELETE"
) {
  return await handleAdminDeleteTvConversation(request, env);
}

// Admin: TV conversation profile photo upload
if (
  pathname === "/api/admin/tv-conversation-photo" &&
  method === "POST"
) {
  return await handleAdminTvConversationPhoto(request, env);
}
     




      // Admin: services / listings
      if (
        pathname ===
          "/api/admin/time-market/services" &&
        method === "GET"
      ) {
        return await handleAdminServices(
          request,
          env
        );
      }

      // Admin: providers
      if (
        pathname ===
          "/api/admin/time-market/providers" &&
        method === "GET"
      ) {
        return await handleAdminProviders(
          request,
          env
        );
      }
 
      // Admin: verify provider
      if (
        pathname ===
          "/api/admin/time-market/verify" &&
        method === "POST"
      ) {
        return await handleAdminVerifyProvider(
          request,
          env
        );
      }
 
      // Admin: conversations
      if (
        pathname ===
          "/api/admin/time-market/conversations" &&
        method === "GET"
      ) {
        return await handleAdminConversations(
          request,
          env
        );
      }
 
      if (
        pathname === "/api/admin/time-market/pin-resets" &&
        method === "GET"
      ) {
        return await handleAdminPinResets(request, env);
      }
 
      if (
        pathname === "/api/admin/time-market/pin-reset/decision" &&
        method === "POST"
      ) {
        return await handleAdminPinResetDecision(request, env);
      }
 
      // Public home page—no login required
      if (
        pathname === "/api/home" &&
        method === "GET"
      ) {
        return await handleGetHome(
          request,
          env
        );
      }
 
      if (
        pathname ===          "/api/home/update" &&
        method === "POST"
      ) {
        return await handleHomeUpdate(
          request,
          env
        );
      }
 
      if (
        pathname ===
          "/api/home/upload" &&
        method === "POST"
      ) {
        return await handleUpload(
          request,
          env
        );
      }
 
      if (
        pathname ===
          "/api/home/watch" &&
        method === "POST"
      ) {
        return await handleWatch(
          request,
          env
        );
      }
 
      if (
        pathname ===
          "/api/home/view" &&
        method === "POST"
      ) {
        return await handleView(
          request,
          env
        );
      }
 
      if (
        pathname ===
          "/api/home/comments" &&
        method === "GET"
      ) {
        return await handleGetComments(
          request,
          env
        );
      }
 
      if (
        pathname ===
          "/api/home/comment" &&
        method === "POST"
      ) {
        return await handlePostComment(
          request,
          env
        );
      }
 
      if (
        pathname ===
          "/api/home/react" &&
        method === "POST"
      ) {
        return await handleReact(
          request,
          env
        );
      }
 
      if (
        pathname === "/api/home/reaction-counts" &&
        method === "GET"
      ) {
        return await handleReactionCounts(request, env);
      }
 
      // Public TV conversation - separate from private Time Market
      // messaging above. Reading requires no login; sending does.
      if (
        pathname === "/api/tv/conversation" &&
        method === "GET"
      ) {
        return await handleGetTvConversation(request, env);
      }
 
      if (
        pathname === "/api/tv/conversation" &&
        method === "POST"
      ) {
        return await handlePostTvConversation(request, env);
      }
 
      if (
        pathname === "/api/tv/realtime/ticket" &&        method === "POST"
      ) {
        return await handleTvRealtimeTicket(request, env);
      }
 
      if (
        pathname === "/api/tv/realtime/connect" &&
        method === "GET"
      ) {
        return await handleTvRealtimeConnect(request, env);
      }
 
      if (
        pathname ===
          "/api/home/ngwino-click" &&
        method === "POST"
      ) {
        return await handleEnvelopeClick(
          request,
          env
        );
      }
 
      if (
        pathname ===
          "/api/admin/update-feedx-stats" &&
        method === "POST"
      ) {
        return await handleAdminUpdateStats(
          request,
          env
        );
      }
 
      if (
        pathname ===
          "/api/admin/delete-feedx-post" &&
        method === "POST"
      ) {
        return await handleAdminDeletePost(
          request,
          env
        );
      }
 
      if (
        pathname ===
          "/api/admin/feedx-report" &&
        method === "GET"
      ) {
        return await handleAdminReport(
          request,
          env
        );
      }
 
      return errorResponse(
        "Not found.",
        404
      );
    } catch (error) {
      console.error(
        "Worker error:",
        error
      );
 
      return errorResponse(
        error?.message ||
          "Internal server error.",
        500
      );
    }
  },
};
