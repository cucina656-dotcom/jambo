import { countryCodeToFlagEmoji } from "../../utils/countries";

// Neon palette. Every message gets one of these. The exact shade is chosen
// from a hash of the sender's phone (or viewer id), so the same person
// always shows in the same colour and regulars become recognisable.
const TV_NEON_PALETTE = [
  "#28d7ff", // cyan (blue)
  "#3b82f6", // blue
  "#60a5fa", // light blue
  "#0ea5e9", // sky blue
  
  "#22d3ee", // aqua
  "#4ade80", // green
  "#ffd93b", // gold
];

// Simple, stable string hash. We do NOT need cryptographic strength here -
// only that the same key produces the same index every time, forever.
function hashNeonIndex(key = "") {
  const text = String(key || "");
  if (!text) return 0;
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % TV_NEON_PALETTE.length;
}

function TvConversationMessage({
  message,
  paused,
  laneHeight,
  defaultLogo,
  onTogglePause,
  onZoomImage,
}) {
  const messageId = String(message.id);
  const lane = Number(message._tvLane || 0);
  const duration = Number(message._tvDuration || 36);
  const delay = Number(message._tvDelay || 0);

  // Colour is derived from the sender, not from arrival order, so the same
  // person stays visually consistent across messages and reloads.
  const colourKey =
    message.sender_key ||
    message.user_id ||
    message.user_name ||
    messageId;
  const neonColour = TV_NEON_PALETTE[hashNeonIndex(colourKey)];

  const profileImage =
    message.profile_image ||
    message.profile_image_url ||
    defaultLogo;

  const togglePause = () => {
    onTogglePause(messageId);
  };

  return (
    <div
      className={`tv-message-item${paused ? " is-paused" : ""}`}
      style={{
        bottom: `${lane * laneHeight}px`,
        "--tv-message-duration": `${duration}s`,
        "--tv-message-delay": `${delay}s`,
        "--tv-neon": neonColour,
      }}
      onClick={(event) => {
        event.stopPropagation();
        togglePause();
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
          togglePause();
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
        aria-label={`View ${
          message.user_name || "viewer"
        }'s profile picture`}
      >
        <img
          src={profileImage}
          alt=""
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = defaultLogo;
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

        <span className="tv-message-text">
          {message.message}
        </span>

        {paused && (
          <span
            className="tv-message-paused-mark"
            aria-hidden="true"
          >
            {"\u2161"}
          </span>
        )}
      </span>
    </div>
  );
}

export default TvConversationMessage;