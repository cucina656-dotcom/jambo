import { countryCodeToFlagEmoji } from "../../utils/countries";

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