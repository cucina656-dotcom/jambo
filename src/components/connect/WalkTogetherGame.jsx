import { useRef, useState } from "react";

const ADMIN_WHATSAPP = "250788484446";
const CHANGE_VIDEO_PIN = "000";

const WALK_MOODS = [
  ["🌅", "Morning peace"],
  ["🌿", "Nature"],
  ["🗣️", "Talk and walk"],
  ["⚡", "Fast energy"],
  ["😌", "Slow and relaxed"],
];

const VIDEO_BACKGROUNDS = [
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
];

const BACKGROUND_MUSIC =
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3";

// Backend will later replace this with the exact group invite for each walk.
const WALK_GROUP_INVITE_URL = "";

function Choice({ emoji, label, active, onClick }) {
  return (
    <button
      type="button"
      className={`walk-choice${active ? " is-active" : ""}`}
      onClick={onClick}
    >
      <span>{emoji}</span>
      <strong>{label}</strong>
    </button>
  );
}

export default function WalkTogetherGame({ onBack }) {
  const [stage, setStage] = useState("choose");
  const [mood, setMood] = useState("");
  const [place, setPlace] = useState("");
  const [duration, setDuration] = useState("");

  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");

  const [scene, setScene] = useState(0);
  const [musicOn, setMusicOn] = useState(false);
  const [videoUnlocked, setVideoUnlocked] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [profileFocused, setProfileFocused] = useState(false);
  const [joinVisible, setJoinVisible] = useState(false);
  const audioRef = useRef(null);

  const moodLabel =
    WALK_MOODS.find(([emoji]) => emoji === mood)?.[1] || "Walk";

  const chooseReady = Boolean(mood && place.trim() && duration);
  const profileReady = Boolean(name.trim() && whatsapp.trim() && photo);
  const toggleProfileFocus = () => {
    setProfileFocused((current) => {
      const next = !current;
      if (!next) setJoinVisible(false);
      return next;
    });
  };

  const closeProfileFocus = () => {
    setProfileFocused(false);
    setJoinVisible(false);
  };


  const handlePhoto = (event) => {
    const file = event.target.files?.[0] || null;
    setPhoto(file);

    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(file ? URL.createObjectURL(file) : "");
  };

  const askAdminForPin = () => {
    const message = [
      "Hello Gwamo Admin,",
      "Please send me the PIN to change my Walk Together video background.",
      `Walk: ${moodLabel}`,
      `Place: ${place}`,
      `Duration: ${duration}`,
    ].join("\n");

    window.open(
      `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const changeVideo = () => {
    if (!videoUnlocked) {
      setPin("");
      setPinError("");
      setShowPin(true);
      return;
    }

    setScene((current) => (current + 1) % VIDEO_BACKGROUNDS.length);
  };

  const unlockVideo = () => {
    if (pin !== CHANGE_VIDEO_PIN) {
      setPinError("Wrong PIN. Ask Gwamo Admin for the current PIN.");
      return;
    }

    setVideoUnlocked(true);
    setPinError("");
    setShowPin(false);
    setScene((current) => (current + 1) % VIDEO_BACKGROUNDS.length);
  };

  const toggleMusic = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio.play().then(() => setMusicOn(true)).catch(() => setMusicOn(false));
    } else {
      audio.pause();
      setMusicOn(false);
    }
  };

  const joinWhatsAppGroup = () => {
    if (WALK_GROUP_INVITE_URL) {
      window.open(WALK_GROUP_INVITE_URL, "_blank", "noopener,noreferrer");
      return;
    }

    const message = [
      "Hello Gwamo Admin,",
      "I want to join this Walk Together WhatsApp group.",
      `Name: ${name}`,
      `Walk: ${moodLabel}`,
      `Place: ${place}`,
      `Duration: ${duration}`,
    ].join("\n");

    window.open(
      `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <section className="walk-root">
      {stage === "choose" && (
        <>
          <button className="walk-back" type="button" onClick={onBack}>
            ← Back
          </button>

          <div className="walk-kicker">🚶 WALK TOGETHER</div>
          <h1>What kind of walk feels right today?</h1>
          <p className="walk-lead">
            Pick your mood, place and time. Gwamo turns your choice into a walk
            result people can join.
          </p>

          <div className="walk-grid">
            {WALK_MOODS.map(([emoji, label]) => (
              <Choice
                key={label}
                emoji={emoji}
                label={label}
                active={mood === emoji}
                onClick={() => setMood(emoji)}
              />
            ))}
          </div>

          <input
            className="walk-input"
            value={place}
            onChange={(event) => setPlace(event.target.value)}
            placeholder="Where do you want to walk?"
          />

          <div className="walk-chips">
            {["15 min", "30 min", "1 hour", "Longer"].map((item) => (
              <button
                type="button"
                key={item}
                className={duration === item ? "is-active" : ""}
                onClick={() => setDuration(item)}
              >
                {item}
              </button>
            ))}
          </div>

          {chooseReady && (
            <div className="walk-trigger">
              <small>FIRST CONVERSATION</small>
              <strong>
                “What is one place around here you think more people should know?”
              </strong>
            </div>
          )}

          <button
            className="walk-primary"
            type="button"
            disabled={!chooseReady}
            onClick={() => setStage("profile")}
          >
            Continue to My Walk Profile
          </button>
        </>
      )}

      {stage === "profile" && (
        <>
          <button
            className="walk-back"
            type="button"
            onClick={() => setStage("choose")}
          >
            ← Back
          </button>

          <div className="walk-kicker">YOUR WALK PROFILE</div>
          <h1>Who is joining this walk?</h1>
          <p className="walk-lead">
            Your photo becomes your moving profile badge on the result screen.
          </p>

          <input
            className="walk-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
            autoComplete="name"
          />

          <input
            className="walk-input"
            value={whatsapp}
            onChange={(event) => setWhatsapp(event.target.value)}
            placeholder="Your WhatsApp number"
            inputMode="tel"
            autoComplete="tel"
          />

          <label className="walk-photo">
            <span>{photo ? `📷 ${photo.name}` : "📷 Add your profile photo"}</span>
            <input type="file" accept="image/*" onChange={handlePhoto} />
          </label>

          <div className="walk-summary">
            <span>{mood} {moodLabel}</span>
            <span>📍 {place}</span>
            <span>⏱ {duration}</span>
          </div>

          <button
            className="walk-primary"
            type="button"
            disabled={!profileReady}
            onClick={() => setStage("result")}
          >
            Show My Walk Result
          </button>
        </>
      )}

      {stage === "result" && (
        <>
          <button
            className="walk-back"
            type="button"
            onClick={() => setStage("profile")}
          >
            ← Back
          </button>

          <div className="walk-stage">
            <video
              key={scene}
              className="walk-video"
              src={VIDEO_BACKGROUNDS[scene]}
              autoPlay
              muted
              loop
              playsInline
            />

            <div className="walk-shade" />
            <audio ref={audioRef} src={BACKGROUND_MUSIC} loop preload="none" />

            <div className="walk-controls">
              <button
                type="button"
                className={`walk-neon${videoUnlocked ? " unlocked" : ""}`}
                onClick={changeVideo}
                aria-label="Change video background"
                title="Change video background"
              >
                ◈
              </button>

              <button
                type="button"
                className={`walk-neon${musicOn ? " playing" : ""}`}
                onClick={toggleMusic}
                aria-label="Play or pause background music"
                title="Play or pause background music"
              >
                {musicOn ? "♫" : "♪"}
              </button>
            </div>

            <div
              className={`walk-floating-results${profileFocused ? " is-focused" : ""}`}
              aria-hidden="true"
            >
              <div className="walk-float one">
                <b>{mood}</b>
                <small>{moodLabel}</small>
              </div>
              <div className="walk-float two">
                <b>📍</b>
                <small>{place}</small>
              </div>
              <div className="walk-float three">
                <b>⏱</b>
                <small>{duration}</small>
              </div>
              <button
                type="button"
                className="walk-float four walk-ready-bubble"
                onClick={() => {
                  setProfileFocused(true);
                  setJoinVisible(true);
                }}
                aria-label="Ready to meet"
              >
                <b>💬</b>
                <small>Ready to meet</small>
              </button>
            </div>

            <div
              className={`walk-profile-badge${profileFocused ? " is-focused" : ""}`}
            >
              <button
                type="button"
                className="walk-profile-ring"
                onClick={toggleProfileFocus}
                aria-pressed={profileFocused}
                aria-label={profileFocused ? "Resume profile movement" : "Zoom profile and show results"}
              >
                {photoPreview ? (
                  <img src={photoPreview} alt={`${name} profile`} />
                ) : (
                  <span>👤</span>
                )}
              </button>
              <strong>{name}</strong>
              <small>INTERESTED IN THIS WALK</small>
            </div>

            {profileFocused && (
              <div className="walk-result-card is-open">
                {photoPreview && (
                  <>
                    <div
                      className="walk-result-photo-bg"
                      style={{ backgroundImage: `url("${photoPreview}")` }}
                    />
                    <img
                      className="walk-result-person"
                      src={photoPreview}
                      alt=""
                      aria-hidden="true"
                    />
                  </>
                )}

                <div className="walk-result-card-shade" />

                <button
                  type="button"
                  className="walk-result-close"
                  onClick={closeProfileFocus}
                  aria-label="Close walk result"
                >
                  ×
                </button>

                <div className="walk-result-content">
                <div className="walk-kicker">INTEREST</div>
                  <h2>{mood} {moodLabel}</h2>

                  <div className="walk-result-info">
                    <span>📍 {place}</span>
                    <span>⏱ {duration}</span>
                    
                  </div>

                  {joinVisible && (
                    <button
                      type="button"
                      className="walk-join"
                      onClick={joinWhatsAppGroup}
                    >
                      <span className="walk-join-icon">💬</span>
                      <span>
                        <strong>Join WhatsApp Group</strong>
                        <small>Meet people joining this walk</small>
                      </span>
                      <b>›</b>
                    </button>
                  )}
                </div>
              </div>
            )}

            {showPin && (
              <div className="walk-pin-layer">
                <div className="walk-pin-card">
                  <div className="walk-pin-symbol">◈</div>
                  <div className="walk-kicker">CHANGE VIDEO</div>
                  <h3>Enter the background PIN</h3>
                  <p>Ask Gwamo Admin if you do not have it.</p>

                  <input
                    className="walk-input walk-pin-input"
                    type="password"
                    inputMode="numeric"
                    maxLength={3}
                    value={pin}
                    placeholder="000"
                    onChange={(event) => {
                      setPin(
                        event.target.value.replace(/\D/g, "").slice(0, 3)
                      );
                      setPinError("");
                    }}
                  />

                  {pinError && <div className="walk-pin-error">{pinError}</div>}

                  <button
                    type="button"
                    className="walk-primary"
                    onClick={unlockVideo}
                  >
                    Unlock & Change Video
                  </button>

                  <button
                    type="button"
                    className="walk-ask-admin"
                    onClick={askAdminForPin}
                  >
                    💬 Ask Admin on WhatsApp
                  </button>

                  <button
                    type="button"
                    className="walk-cancel"
                    onClick={() => setShowPin(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <style>{`
        .walk-root {
          width: min(100%, 560px);
          margin: 0 auto;
          color: #f8fbff;
        }
        .walk-back {
          margin: 0 0 24px;
          padding: 8px 0;
          border: 0;
          color: rgba(220,236,250,.68);
          background: transparent;
          font-weight: 750;
        }
        .walk-kicker {
          margin-bottom: 9px;
          color: #8df0bf;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: .14em;
        }
        .walk-root h1 {
          margin: 0 0 10px;
          font-size: clamp(28px,8vw,42px);
          line-height: 1.05;
        }
        .walk-root h2 {
          margin: 0 0 10px;
          font-size: 27px;
        }
        .walk-lead {
          margin: 0 0 20px;
          color: rgba(230,239,249,.70);
          font-size: 14px;
          line-height: 1.5;
        }
        .walk-grid {
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 10px;
        }
        .walk-choice {
          min-height: 104px;
          padding: 15px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: flex-end;
          gap: 10px;
          border: 1px solid rgba(122,229,186,.16);
          border-radius: 19px;
          color: white;
          background: linear-gradient(145deg,rgba(11,55,46,.80),rgba(4,17,26,.92));
          text-align: left;
        }
        .walk-choice span { font-size: 29px; }
        .walk-choice strong { font-size: 13px; }
        .walk-choice.is-active {
          border-color: rgba(81,244,183,.82);
          box-shadow: 0 0 25px rgba(61,230,166,.17);
        }
        .walk-input {
          width: 100%;
          min-height: 54px;
          margin: 12px 0 0;
          padding: 0 15px;
          border: 1px solid rgba(138,210,184,.20);
          border-radius: 15px;
          outline: none;
          color: white;
          background: rgba(3,19,27,.84);
          font-size: 14px;
          box-sizing: border-box;
        }
        .walk-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 11px 0 4px;
        }
        .walk-chips button {
          min-height: 39px;
          padding: 0 13px;
          border: 1px solid rgba(134,213,183,.17);
          border-radius: 999px;
          color: rgba(244,255,251,.76);
          background: rgba(6,34,39,.76);
        }
        .walk-chips button.is-active {
          border-color: rgba(72,239,177,.72);
          color: white;
          background: rgba(15,104,77,.74);
        }
        .walk-trigger {
          margin-top: 15px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 5px;
          border: 1px solid rgba(78,235,174,.18);
          border-radius: 17px;
          background: rgba(8,65,48,.42);
        }
        .walk-trigger small {
          color: #8ff2c8;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: .10em;
        }
        .walk-trigger strong {
          font-size: 12px;
          line-height: 1.4;
        }
        .walk-primary {
          width: 100%;
          min-height: 54px;
          margin-top: 15px;
          border: 1px solid rgba(74,232,170,.48);
          border-radius: 16px;
          color: white;
          background: linear-gradient(135deg,#0c9f67,#087c89);
          box-shadow: 0 12px 30px rgba(12,159,103,.22);
          font-weight: 900;
        }
        .walk-primary:disabled {
          opacity: .35;
          box-shadow: none;
        }
        .walk-photo {
          width: 100%;
          min-height: 54px;
          margin-top: 10px;
          padding: 0 15px;
          display: flex;
          align-items: center;
          border: 1px dashed rgba(76,232,171,.39);
          border-radius: 15px;
          background: rgba(5,45,34,.46);
          box-sizing: border-box;
          font-size: 13px;
          font-weight: 800;
        }
        .walk-photo input {
          position: absolute;
          width: 1px;
          height: 1px;
          opacity: 0;
        }
        .walk-summary,
        .walk-result-info {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 11px;
        }
        .walk-summary span,
        .walk-result-info span {
          padding: 7px 9px;
          border-radius: 999px;
          color: rgba(239,255,249,.80);
          background: rgba(255,255,255,.06);
          font-size: 10px;
        }
        .walk-stage {
          min-height: 650px;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: flex-end;
          padding: 14px;
          border: 1px solid rgba(94,235,186,.26);
          border-radius: 28px;
          background: #03120f;
          box-shadow: 0 28px 70px rgba(0,0,0,.48);
        }
        .walk-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .walk-shade {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 50% 34%,rgba(17,230,153,.08),transparent 34%),
            linear-gradient(to bottom,rgba(1,9,12,.10),rgba(1,9,12,.30) 43%,rgba(1,9,12,.94) 82%);
        }
        .walk-controls {
          position: absolute;
          z-index: 8;
          top: 14px;
          right: 14px;
          display: flex;
          gap: 9px;
        }
        .walk-neon {
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(90,246,203,.78);
          border-radius: 50%;
          color: #caffed;
          background: rgba(2,24,21,.62);
          box-shadow: 0 0 12px rgba(68,255,203,.52);
          backdrop-filter: blur(10px);
          font-size: 21px;
          font-weight: 950;
          animation: walkPulse 2.2s ease-in-out infinite;
        }
        .walk-neon.unlocked {
          border-color: rgba(94,211,255,.86);
          color: #d7f6ff;
        }
        .walk-neon.playing {
          border-color: rgba(255,233,112,.90);
          color: #fff2a5;
        }
        @keyframes walkPulse {
          50% {
            transform: scale(1.07);
            box-shadow: 0 0 24px rgba(68,255,203,.75);
          }
        }
        .walk-floating-results {
          position: absolute;
          z-index: 3;
          inset: 75px 7px 240px;
          pointer-events: none;
        }
        .walk-floating-results .walk-ready-bubble {
          pointer-events: auto;
        }
        .walk-float {
          position: absolute;
          min-width: 85px;
          max-width: 145px;
          padding: 8px 10px;
          display: flex;
          align-items: center;
          gap: 6px;
          border: 1px solid rgba(218,255,243,.18);
          border-radius: 999px;
          background: rgba(3,29,26,.61);
          backdrop-filter: blur(10px);
          animation: walkDrift 7s ease-in-out infinite alternate;
        }
        .walk-float b { font-size: 18px; }
        .walk-float small {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 9px;
          font-weight: 850;
        }
        .walk-float.one { left: 3%; top: 7%; }
        .walk-float.two { right: 1%; top: 26%; animation-delay: -3s; }
        .walk-float.three { left: 7%; bottom: 19%; animation-delay: -5s; }
        .walk-float.four { right: 2%; bottom: 1%; animation-delay: -2s; }
        @keyframes walkDrift {
          from { transform: translate3d(-3px,-5px,0) rotate(-1deg); }
          to { transform: translate3d(8px,23px,0) rotate(2deg); }
        }
        .walk-profile-badge {
          position: absolute;
          z-index: 5;
          left: -36px;
          top: 39%;
          width: 145px;
          transform: translateY(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          cursor: pointer;
          outline: none;
          animation: walkBadgeEdgeMarquee 13.6s ease-in-out infinite;
          will-change: left, transform;
        }
        @keyframes walkBadgeEdgeMarquee {
          0% {
            left: -36px;
            transform: translateY(-50%) scale(1);
          }
          21% {
            left: calc(100% - 108px);
            transform: translateY(-50%) scale(1);
          }
          27.5% {
            left: calc(100% - 108px);
            transform: translateY(-50%) scale(1);
          }
          30% {
            left: calc(100% - 126px);
            transform: translateY(-50%) rotate(-1.2deg) scale(1.035);
          }
          43% {
            left: calc(100% - 108px);
            transform: translateY(-50%) rotate(0deg) scale(1);
          }
          64% {
            left: -36px;
            transform: translateY(-50%) scale(1);
          }
          70.5% {
            left: -36px;
            transform: translateY(-50%) scale(1);
          }
          73% {
            left: -18px;
            transform: translateY(-50%) rotate(1.2deg) scale(1.035);
          }
          86% {
            left: -36px;
            transform: translateY(-50%) rotate(0deg) scale(1);
          }
          100% {
            left: -36px;
            transform: translateY(-50%) scale(1);
          }
        }
        .walk-profile-badge.is-focused {
          animation-play-state: paused;
        }
        .walk-floating-results.is-focused .walk-float {
          animation-play-state: paused;
        }
        .walk-profile-badge.is-focused::after {
          content: "\\25B6";
          position: absolute;
          top: -7px;
          right: 6px;
          width: 22px;
          height: 22px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(132,255,216,.42);
          border-radius: 50%;
          color: #eafff8;
          background: rgba(2,18,20,.78);
          box-shadow: 0 0 10px rgba(74,255,201,.28);
          font-size: 9px;
          pointer-events: none;
        }
        .walk-profile-ring {
          width: 100px;
          height: 100px;
          padding: 4px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          overflow: hidden;
          background: conic-gradient(from 180deg,#55ffd1,#58b9ff,#d2ff75,#55ffd1);
          box-shadow: 0 0 0 5px rgba(4,23,25,.44),0 0 35px rgba(62,255,200,.48);
          border: 0;
          cursor: pointer;
          transition: transform .28s ease, box-shadow .28s ease;
        }
        .walk-profile-badge.is-focused .walk-profile-ring {
          transform: scale(1.42);
          box-shadow:
            0 0 0 5px rgba(4,23,25,.36),
            0 0 46px rgba(62,255,200,.58);
        }
        .walk-ready-bubble {
          pointer-events: auto;
          cursor: pointer;
          color: #f5fff9;
          font: inherit;
        }
        .walk-result-card.is-open {
          overflow: hidden;
          background-color: rgba(2,17,20,.84);
        }
        .walk-result-photo-bg {
          position: absolute;
          inset: -12px;
          z-index: 0;
          background-size: cover;
          background-position: center;
          filter: blur(12px) brightness(.62);
          transform: scale(1.08);
          opacity: .72;
        }
        .walk-result-person {
          position: absolute;
          inset: 0;
          z-index: 1;
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: center bottom;
          pointer-events: none;
        }
        .walk-result-card-shade {
          position: absolute;
          inset: 0;
          z-index: 2;
          background:
            linear-gradient(
              to bottom,
              rgba(2,10,12,.08) 0%,
              rgba(2,10,12,.16) 42%,
              rgba(2,10,12,.76) 72%,
              rgba(2,10,12,.94) 100%
            );
          pointer-events: none;
        }
        .walk-result-content {
          position: relative;
          z-index: 3;
          width: 100%;
          padding: 16px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          box-sizing: border-box;
          text-align: left;
        }
        .walk-result-content .walk-kicker {
          margin-bottom: 6px;
        }
        .walk-result-content h2 {
          width: 100%;
          margin: 0 0 10px;
          font-size: 24px;
          line-height: 1.08;
          text-align: left;
        }
        .walk-result-content .walk-result-info {
          width: 100%;
          margin: 0;
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-start;
          gap: 7px;
        }
        .walk-result-content .walk-result-info span {
          white-space: nowrap;
        }
        .walk-result-content .walk-join {
          margin-top: 12px;
        }
        .walk-result-close {
          z-index: 5;
        }
        .walk-result-card.is-open .walk-join {
          animation: walkJoinReveal .22s ease-out both;
        }
        @keyframes walkJoinReveal {
          from { opacity: 0; transform: translateY(8px) scale(.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .walk-profile-ring img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }
        .walk-profile-ring span {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #102b2c;
          font-size: 38px;
        }
        .walk-profile-badge > strong {
          max-width: 145px;
          margin-top: 9px;
          padding: 5px 9px;
          border-radius: 999px;
          background: rgba(2,18,20,.72);
          backdrop-filter: blur(9px);
          font-size: 13px;
        }
        .walk-profile-badge > small {
          margin-top: 5px;
          color: #aaffdd;
          font-size: 8px;
          font-weight: 950;
          letter-spacing: .10em;
        }
        .walk-result-card {
          position: absolute;
          z-index: 9;
          left: 12px;
          right: 12px;
          bottom: 12px;
          width: auto;
          min-height: 320px;
          padding: 0;
          overflow: hidden;
          display: flex;
          align-items: flex-end;
          border: 1px solid rgba(190,255,232,.22);
          border-radius: 22px;
          background: #061416;
          box-shadow: 0 18px 45px rgba(0,0,0,.42);
          animation: walkTrayIn .22s ease-out both;
        }
        @keyframes walkTrayIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .walk-result-close {
          position: absolute;
          top: 9px;
          right: 10px;
          width: 30px;
          height: 30px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 50%;
          color: rgba(255,255,255,.82);
          background: rgba(0,0,0,.22);
          font-size: 20px;
          line-height: 1;
        }
        .walk-result-title-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding-right: 34px;
        }
        .walk-result-title-row h2 {
          margin: 0;
          font-size: 21px;
          line-height: 1.1;
        }
        .walk-result-mini-badge {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(104,241,193,.22);
          border-radius: 50%;
          background: rgba(29,111,82,.26);
          font-size: 17px;
        }
        .walk-first-line {
          margin-top: 9px;
          padding: 8px 10px;
          display: flex;
          flex-direction: column;
          gap: 3px;
          border-left: 2px solid #5ff0bd;
          border-radius: 9px;
          background: rgba(26,112,81,.16);
        }
        .walk-first-line small {
          color: #8ff2ca;
          font-size: 8px;
          font-weight: 950;
          letter-spacing: .1em;
        }
        .walk-first-line strong {
          color: rgba(255,255,255,.84);
          font-size: 10px;
          line-height: 1.35;
        }
        .walk-trigger.compact {
          margin-top: 11px;
          padding: 10px 11px;
        }
        .walk-join {
          width: 100%;
          min-height: 56px;
          margin-top: 9px;
          padding: 9px 12px;
          display: grid;
          grid-template-columns: 42px 1fr 18px;
          align-items: center;
          gap: 9px;
          border: 1px solid rgba(76,255,158,.56);
          border-radius: 17px;
          color: white;
          background: linear-gradient(135deg,rgba(21,171,91,.96),rgba(9,128,84,.97));
          box-shadow: 0 10px 28px rgba(15,184,92,.25);
          text-align: left;
        }
        .walk-join-icon {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: rgba(255,255,255,.15);
          font-size: 20px;
        }
        .walk-join > span:nth-child(2) {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .walk-join strong { font-size: 13px; }
        .walk-join small {
          color: rgba(255,255,255,.74);
          font-size: 9px;
        }
        .walk-join > b {
          font-size: 27px;
          font-weight: 400;
        }
        .walk-preview-note {
          margin: 8px 1px 0;
          color: rgba(255,255,255,.42);
          font-size: 9px;
          line-height: 1.35;
        }
        .walk-pin-layer {
          position: absolute;
          z-index: 20;
          inset: 0;
          display: grid;
          place-items: center;
          padding: 18px;
          background: rgba(0,8,10,.76);
          backdrop-filter: blur(10px);
        }
        .walk-pin-card {
          width: min(100%,360px);
          padding: 20px;
          border: 1px solid rgba(101,246,199,.26);
          border-radius: 24px;
          background: linear-gradient(145deg,rgba(7,40,36,.98),rgba(3,16,25,.99));
          box-sizing: border-box;
        }
        .walk-pin-symbol {
          width: 50px;
          height: 50px;
          margin-bottom: 12px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(94,255,205,.54);
          border-radius: 50%;
          color: #b7ffe5;
          box-shadow: 0 0 17px rgba(69,255,204,.35);
          font-size: 22px;
        }
        .walk-pin-card h3 {
          margin: 0 0 5px;
          font-size: 21px;
        }
        .walk-pin-card p {
          margin: 0 0 11px;
          color: rgba(237,255,249,.62);
          font-size: 12px;
        }
        .walk-pin-input {
          text-align: center;
          letter-spacing: .28em;
          font-size: 20px;
          font-weight: 900;
        }
        .walk-pin-error {
          margin: 6px 0 0;
          color: #ff9aad;
          font-size: 11px;
          font-weight: 800;
        }
        .walk-ask-admin {
          width: 100%;
          min-height: 48px;
          margin-top: 9px;
          border: 1px solid rgba(72,255,160,.34);
          border-radius: 15px;
          color: #caffdf;
          background: rgba(11,94,57,.40);
          font-weight: 850;
        }
        .walk-cancel {
          width: 100%;
          min-height: 42px;
          margin-top: 4px;
          border: 0;
          color: rgba(255,255,255,.56);
          background: transparent;
        }
        @media (max-width:390px) {
          .walk-grid { gap: 8px; }
          .walk-choice { min-height: 98px; padding: 13px; }
          .walk-stage { min-height: 620px; padding: 11px; }
        }
        @media (prefers-reduced-motion:reduce) {
          .walk-neon,
          .walk-float,
          .walk-profile-badge {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}
