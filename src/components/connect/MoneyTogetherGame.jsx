import { useRef, useState } from "react";

const ADMIN_WHATSAPP = "250788484446";
const CHANGE_VIDEO_PIN = "000";

const MISSIONS = [
  ["🛍️", "Sell Something", "Find something and sell it together"],
  ["🧹", "Offer a Service", "Cleaning, repair, farming, helping and more"],
  ["🔄", "Buy & Resell", "Buy something and sell it for more"],
  ["🛠️", "Make Something", "Create a small product together"],
  ["🚚", "Delivery / Errands", "Move or deliver things for people"],
  ["📣", "Find Customers", "Promote something and earn together"],
  ["💡", "My Own Idea", "Start a different small money idea"],
];

const CONTRIBUTIONS = [
  ["⏰", "Time"],
  ["🛠️", "Skill"],
  ["💵", "Small contribution"],
  ["🚲", "Transport"],
  ["📣", "Customers"],
  ["🧠", "Idea"],
];

const DEFAULT_VIDEOS = [
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
];

function MissionCard({ emoji, title, description, active, onClick }) {
  return (
    <button
      type="button"
      className={`money-mission-card${active ? " is-active" : ""}`}
      onClick={onClick}
    >
      <span>{emoji}</span>
      <strong>{title}</strong>
      <small>{description}</small>
    </button>
  );
}

export default function MoneyTogetherGame({ onBack }) {
  const [stage, setStage] = useState("mission");
  const [mission, setMission] = useState("");
  const [contribution, setContribution] = useState("");
  const [place, setPlace] = useState("");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");

  const [videoIndex, setVideoIndex] = useState(0);
  const [customVideo, setCustomVideo] = useState("");
  const [showVideoPin, setShowVideoPin] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [videoMode, setVideoMode] = useState("unlock");
  const [pendingVideoUrl, setPendingVideoUrl] = useState("");
  const [profileFocused, setProfileFocused] = useState(false);
  const [joinedMission, setJoinedMission] = useState(false);
  const [missionRoomOpen, setMissionRoomOpen] = useState(false);
  const [joinIdentityOpen, setJoinIdentityOpen] = useState(false);
  const [viewerName, setViewerName] = useState("");
  const [viewerPhoto, setViewerPhoto] = useState(null);
  const [viewerPhotoPreview, setViewerPhotoPreview] = useState("");

  const videoRef = useRef(null);

  const missionData = MISSIONS.find(([, title]) => title === mission);
  const missionEmoji = missionData?.[0] || "💰";
  const missionDescription = missionData?.[2] || "";
  const missionReady = Boolean(mission);
  const teamReady = Boolean(contribution && place.trim());
  const profileReady = Boolean(name.trim() && whatsapp.trim() && photo);

  const backgroundVideo = customVideo || DEFAULT_VIDEOS[videoIndex];

  const handlePhoto = (event) => {
    const file = event.target.files?.[0] || null;
    setPhoto(file);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(file ? URL.createObjectURL(file) : "");
  };

  const requestVideoChange = () => {
    setPin("");
    setPinError("");
    setPendingVideoUrl("");
    setVideoMode("unlock");
    setShowVideoPin(true);
  };

  const verifyVideoPin = () => {
    if (pin !== CHANGE_VIDEO_PIN) {
      setPinError("Wrong PIN. Ask Gwamo Admin for the current PIN.");
      return;
    }
    setPinError("");
    setVideoMode("options");
  };

  const useNextVideo = () => {
    setCustomVideo("");
    setVideoIndex((current) => (current + 1) % DEFAULT_VIDEOS.length);
    setShowVideoPin(false);
    setPin("");
    setVideoMode("unlock");
  };

  const useCustomVideo = () => {
    const value = pendingVideoUrl.trim();
    if (!/^https?:\/\//i.test(value)) {
      setPinError("Paste a valid video URL starting with http:// or https://");
      return;
    }
    setCustomVideo(value);
    setShowVideoPin(false);
    setPin("");
    setPendingVideoUrl("");
    setVideoMode("unlock");
    setPinError("");
  };

  const askAdminForPin = () => {
    const message = [
      "Hello Gwamo Admin,",
      "Please send me the PIN to add or change my Make Money Together mission video.",
      `Mission: ${mission || "Not selected yet"}`,
      `Place: ${place || "Not entered yet"}`,
    ].join("\n");

    window.open(
      `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const restart = () => {
    setStage("mission");
    setMission("");
    setContribution("");
    setPlace("");
    setName("");
    setWhatsapp("");
    setPhoto(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview("");
    setProfileFocused(false);
    setJoinedMission(false);
    setMissionRoomOpen(false);
    setJoinIdentityOpen(false);
    setViewerName("");
    setViewerPhoto(null);
    if (viewerPhotoPreview) URL.revokeObjectURL(viewerPhotoPreview);
    setViewerPhotoPreview("");
  };

  const handleViewerPhoto = (event) => {
    const file = event.target.files?.[0] || null;
    setViewerPhoto(file);
    if (viewerPhotoPreview) URL.revokeObjectURL(viewerPhotoPreview);
    setViewerPhotoPreview(file ? URL.createObjectURL(file) : "");
  };

  const joinMission = () => {
    if (joinedMission) {
      setMissionRoomOpen(true);
      return;
    }
    setJoinIdentityOpen(true);
  };

  const confirmJoinMission = () => {
    if (!viewerName.trim() || !viewerPhoto) return;
    setJoinedMission(true);
    setJoinIdentityOpen(false);
    setMissionRoomOpen(true);
  };

  return (
    <section className="money-root">
      {stage === "mission" && (
        <>
          <button className="money-back" type="button" onClick={onBack}>← Back</button>

          <div className="money-kicker">💰 MAKE MONEY TOGETHER</div>
          <h1>How do you want to make money together?</h1>
          <p className="money-lead">
            Pick one small mission people can actually do together.
          </p>

          <div className="money-mission-grid">
            {MISSIONS.map(([emoji, title, description]) => (
              <MissionCard
                key={title}
                emoji={emoji}
                title={title}
                description={description}
                active={mission === title}
                onClick={() => setMission(title)}
              />
            ))}
          </div>

          <button
            className="money-primary"
            type="button"
            disabled={!missionReady}
            onClick={() => setStage("bring")}
          >
            Continue
          </button>
        </>
      )}

      {stage === "bring" && (
        <>
          <button className="money-back" type="button" onClick={() => setStage("mission")}>← Back</button>

          <div className="money-kicker">{missionEmoji} {mission || "MISSION"}</div>
          <h1>What can you bring to this?</h1>
          <p className="money-lead">
            You do not need to bring everything. Pick the one thing you can help with.
          </p>

          <div className="money-contribution-grid">
            {CONTRIBUTIONS.map(([emoji, label]) => (
              <button
                key={label}
                type="button"
                className={`money-contribution${contribution === label ? " is-active" : ""}`}
                onClick={() => setContribution(label)}
              >
                <span>{emoji}</span>
                <strong>{label}</strong>
              </button>
            ))}
          </div>

          <input
            className="money-input"
            value={place}
            onChange={(event) => setPlace(event.target.value)}
            placeholder="Where should this mission happen?"
          />

          {teamReady && (
            <div className="money-trigger">
              <small>FIRST CONVERSATION</small>
              <strong>“What is the smallest thing we can do first to test this idea?”</strong>
            </div>
          )}

          <button
            className="money-primary"
            type="button"
            disabled={!teamReady}
            onClick={() => setStage("profile")}
          >
            Continue to My Mission Profile
          </button>
        </>
      )}

      {stage === "profile" && (
        <>
          <button className="money-back" type="button" onClick={() => setStage("bring")}>← Back</button>

          <div className="money-kicker">YOUR MISSION PROFILE</div>
          <h1>Who wants to build this?</h1>
          <p className="money-lead">Your photo and mission will appear on the reel result.</p>

          <input
            className="money-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
            autoComplete="name"
          />

          <input
            className="money-input"
            value={whatsapp}
            onChange={(event) => setWhatsapp(event.target.value)}
            placeholder="Your WhatsApp number"
            inputMode="tel"
            autoComplete="tel"
          />

          <label className="money-photo">
            <span>{photo ? `📷 ${photo.name}` : "📷 Add your profile photo"}</span>
            <input type="file" accept="image/*" onChange={handlePhoto} />
          </label>

          <div className="money-summary">
            <span>{missionEmoji} {mission}</span>
            <span>🤝 {contribution}</span>
            <span>📍 {place}</span>
          </div>

          <button
            className="money-primary"
            type="button"
            disabled={!profileReady}
            onClick={() => setStage("result")}
          >
            Show My Mission Reel
          </button>
        </>
      )}

      {stage === "result" && (
        <>
          <button className="money-back" type="button" onClick={() => setStage("profile")}>← Back</button>

          <div className="money-reel">
            <video
              ref={videoRef}
              key={backgroundVideo}
              className="money-video"
              src={backgroundVideo}
              autoPlay
              muted
              loop
              playsInline
            />
            <div className="money-reel-shade" />

            <button
              type="button"
              className="money-video-control"
              onClick={requestVideoChange}
              aria-label="Add or change mission video"
              title="Add or change mission video"
            >
              ◈
            </button>

            <div className={`money-floating-results${profileFocused ? " is-focused" : ""}`} aria-hidden="true">
              <div className="money-float one">
                <b>{missionEmoji}</b>
                <small>{mission}</small>
              </div>
              <div className="money-float two">
                <b>🤝</b>
                <small>{contribution}</small>
              </div>
              <div className="money-float three">
                <b>📍</b>
                <small>{place}</small>
              </div>
            </div>

            <div className={`money-profile-badge${profileFocused ? " is-focused" : ""}`}>
              <button
                type="button"
                className="money-profile-ring"
                onClick={() => setProfileFocused((current) => !current)}
                aria-pressed={profileFocused}
                aria-label={profileFocused ? "Resume mission profile movement" : "Open mission details"}
              >
                {photoPreview ? <img src={photoPreview} alt={`${name} profile`} /> : <span>👤</span>}
              </button>
              <strong>{name}</strong>
              <small>BUILDING THIS MISSION</small>
            </div>

            {profileFocused && (
              <div className="money-reel-card is-open">
                <button
                  type="button"
                  className="money-reel-close"
                  onClick={() => setProfileFocused(false)}
                  aria-label="Close mission details"
                >
                  ×
                </button>

                <div className="money-reel-kicker">MISSION</div>
                <h2>{missionEmoji} {mission}</h2>
                <p>{missionDescription}</p>

                <div className="money-result-info">
                  <span>🤝 {contribution}</span>
                  <span>📍 {place}</span>
                </div>

                <div className="money-conversation">
                  <small>START THE CONVERSATION</small>
                  <strong>What is the smallest thing we can do first?</strong>
                </div>

                <button
                  type="button"
                  className={`money-join-mission${joinedMission ? " is-joined" : ""}`}
                  onClick={joinMission}
                >
                  <span>{joinedMission ? "✓" : "🤝"}</span>
                  <span>
                    <strong>{joinedMission ? "Joined — Open Mission Room" : "Join This Mission"}</strong>
                    <small>
                      {joinedMission
                        ? "See what is happening with this team"
                        : "Join people interested in building this"}
                    </small>
                  </span>
                  <b>›</b>
                </button>
              </div>
            )}

            {joinIdentityOpen && (
              <div className="money-room-layer">
                <div className="money-room-card money-join-card">
                  <button
                    type="button"
                    className="money-room-close"
                    onClick={() => setJoinIdentityOpen(false)}
                    aria-label="Close join form"
                  >
                    ×
                  </button>

                  <div className="money-room-icon">👋</div>
                  <div className="money-room-kicker">JOIN THIS MISSION</div>
                  <h2>Who is joining?</h2>
                  <p className="money-room-lead">
                    Add your name and photo so the creator can see who joined the mission.
                  </p>

                  <input
                    className="money-input"
                    value={viewerName}
                    onChange={(event) => setViewerName(event.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                  />

                  <label className="money-photo money-viewer-photo">
                    <span>{viewerPhoto ? `📷 ${viewerPhoto.name}` : "📷 Add your profile photo"}</span>
                    <input type="file" accept="image/*" onChange={handleViewerPhoto} />
                  </label>

                  <button
                    type="button"
                    className="money-room-back"
                    disabled={!viewerName.trim() || !viewerPhoto}
                    onClick={confirmJoinMission}
                  >
                    Join This Mission
                  </button>
                </div>
              </div>
            )}

            {missionRoomOpen && (
              <div className="money-room-layer">
                <div className="money-room-card">
                  <button
                    type="button"
                    className="money-room-close"
                    onClick={() => setMissionRoomOpen(false)}
                    aria-label="Close Mission Room"
                  >
                    ×
                  </button>

                  <div className="money-room-icon">🤝</div>
                  <div className="money-room-kicker">MISSION ROOM</div>
                  <h2>2 people in this mission</h2>

                  <p className="money-room-lead">
                    Gwamo connected the creator and the first interested viewer.
                    More people can still join as the team forms.
                  </p>

                  <div className="money-room-members">
                    <div className="money-room-member">
                      <div className="money-room-avatar">
                        {photoPreview ? <img src={photoPreview} alt={`${name} profile`} /> : <span>👤</span>}
                      </div>
                      <div>
                        <small>CREATOR</small>
                        <strong>{name}</strong>
                      </div>
                    </div>

                    <div className="money-room-member">
                      <div className="money-room-avatar">
                        {viewerPhotoPreview ? <img src={viewerPhotoPreview} alt={`${viewerName} profile`} /> : <span>👤</span>}
                      </div>
                      <div>
                        <small>YOU</small>
                        <strong>{viewerName}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="money-room-status">
                    <span className="money-status-dot" />
                    <div>
                      <small>STATUS</small>
                      <strong>Team forming</strong>
                    </div>
                  </div>

                  <div className="money-room-progress">
                    <div className="is-active"><span>1</span><strong>Team forming</strong></div>
                    <div><span>2</span><strong>Talking</strong></div>
                    <div><span>3</span><strong>Ready to meet</strong></div>
                    <div><span>4</span><strong>Meeting planned</strong></div>
                  </div>

                  <div className="money-room-message">
                    <strong>Gwamo connected the first two people.</strong>
                    <p>
                      More interested people can still join. When someone new arrives,
                      this room will show it so everyone can follow the mission as it grows.
                    </p>
                  </div>

                  <div className="money-room-hope">
                    Stay close. This mission is still moving.
                  </div>

                  <button
                    type="button"
                    className="money-room-back"
                    onClick={() => setMissionRoomOpen(false)}
                  >
                    Back to Mission
                  </button>
                </div>
              </div>
            )}

            {showVideoPin && (
              <div className="money-pin-layer">
                <div className="money-pin-card">
                  <div className="money-pin-symbol">◈</div>

                  {videoMode === "unlock" ? (
                    <>
                      <div className="money-kicker">MISSION VIDEO</div>
                      <h3>Admin PIN required</h3>
                      <p>Every add or change of the mission background video requires the PIN.</p>

                      <input
                        className="money-input money-pin-input"
                        type="password"
                        inputMode="numeric"
                        maxLength={3}
                        value={pin}
                        placeholder="000"
                        onChange={(event) => {
                          setPin(event.target.value.replace(/\D/g, "").slice(0, 3));
                          setPinError("");
                        }}
                      />

                      {pinError && <div className="money-pin-error">{pinError}</div>}

                      <button type="button" className="money-primary" onClick={verifyVideoPin}>
                        Unlock Video Options
                      </button>

                      <button type="button" className="money-ask-admin" onClick={askAdminForPin}>
                        💬 Ask Admin on WhatsApp
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="money-kicker">VIDEO OPTIONS</div>
                      <h3>Add or change mission video</h3>

                      <button type="button" className="money-primary" onClick={useNextVideo}>
                        Change to Next Video
                      </button>

                      <div className="money-or">OR</div>

                      <input
                        className="money-input"
                        value={pendingVideoUrl}
                        onChange={(event) => {
                          setPendingVideoUrl(event.target.value);
                          setPinError("");
                        }}
                        placeholder="Paste mission video URL"
                      />

                      {pinError && <div className="money-pin-error">{pinError}</div>}

                      <button type="button" className="money-primary secondary" onClick={useCustomVideo}>
                        Use This Video
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    className="money-cancel"
                    onClick={() => {
                      setShowVideoPin(false);
                      setPin("");
                      setPinError("");
                      setPendingVideoUrl("");
                      setVideoMode("unlock");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <button className="money-restart" type="button" onClick={restart}>Start Another Mission</button>

          <p className="money-fine">
            Gwamo helps people find each other, discuss and organize. Earnings are not guaranteed.
          </p>
        </>
      )}

      <style>{`
        .money-root { width:min(100%,560px); margin:0 auto; color:#f8fbff; }
        .money-back { margin:0 0 24px; padding:8px 0; border:0; color:rgba(220,236,250,.68); background:transparent; font-weight:750; }
        .money-kicker,.money-reel-kicker { margin-bottom:9px; color:#76d5ff; font-size:11px; font-weight:950; letter-spacing:.14em; }
        .money-root h1 { margin:0 0 10px; font-size:clamp(28px,8vw,42px); line-height:1.05; }
        .money-lead { margin:0 0 20px; color:rgba(230,239,249,.70); font-size:14px; line-height:1.5; }

        .money-mission-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
        .money-mission-card { min-height:146px; padding:15px; display:flex; flex-direction:column; align-items:flex-start; justify-content:flex-end; gap:7px; border:1px solid rgba(82,180,255,.18); border-radius:20px; color:white; background:linear-gradient(145deg,rgba(9,39,73,.90),rgba(3,15,31,.94)); text-align:left; }
        .money-mission-card>span { font-size:31px; }
        .money-mission-card>strong { font-size:14px; }
        .money-mission-card>small { min-height:30px; color:rgba(231,243,255,.58); font-size:10px; line-height:1.35; }
        .money-mission-card.is-active { border-color:rgba(67,190,255,.94); box-shadow:0 0 0 1px rgba(67,190,255,.16),0 0 28px rgba(22,139,255,.19); }

        .money-contribution-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
        .money-contribution { min-height:92px; padding:14px; display:flex; flex-direction:column; align-items:flex-start; justify-content:flex-end; gap:8px; border:1px solid rgba(96,183,255,.16); border-radius:18px; color:white; background:linear-gradient(145deg,rgba(12,43,76,.78),rgba(4,16,31,.92)); text-align:left; }
        .money-contribution span { font-size:27px; }
        .money-contribution strong { font-size:13px; }
        .money-contribution.is-active { border-color:rgba(74,190,255,.86); box-shadow:0 0 25px rgba(38,151,255,.17); }

        .money-input { width:100%; min-height:54px; margin:12px 0 0; padding:0 15px; border:1px solid rgba(118,197,255,.20); border-radius:15px; outline:none; color:white; background:rgba(3,19,37,.86); font-size:14px; box-sizing:border-box; }
        .money-primary { width:100%; min-height:54px; margin-top:15px; border:1px solid rgba(74,181,255,.48); border-radius:16px; color:white; background:linear-gradient(135deg,#087cff,#1269e9); box-shadow:0 12px 30px rgba(8,124,255,.24); font-weight:900; }
        .money-primary.secondary { background:linear-gradient(135deg,#0c9f67,#087c89); border-color:rgba(74,232,170,.48); }
        .money-primary:disabled { opacity:.35; box-shadow:none; }

        .money-trigger { margin-top:15px; padding:14px; display:flex; flex-direction:column; gap:5px; border:1px solid rgba(67,175,255,.22); border-radius:17px; background:rgba(10,63,105,.42); }
        .money-trigger small,.money-conversation small { color:#8bd6ff; font-size:9px; font-weight:950; letter-spacing:.10em; }
        .money-trigger strong,.money-conversation strong { font-size:12px; line-height:1.4; }

        .money-photo { width:100%; min-height:54px; margin-top:10px; padding:0 15px; display:flex; align-items:center; border:1px dashed rgba(82,184,255,.40); border-radius:15px; background:rgba(5,42,75,.44); box-sizing:border-box; font-size:13px; font-weight:800; }
        .money-photo input { position:absolute; width:1px; height:1px; opacity:0; }

        .money-summary,.money-result-info { display:flex; flex-wrap:wrap; gap:7px; margin-top:11px; }
        .money-summary span,.money-result-info span { padding:7px 9px; border-radius:999px; color:rgba(239,249,255,.84); background:rgba(255,255,255,.08); font-size:10px; }

        .money-reel { min-height:660px; position:relative; overflow:hidden; display:flex; align-items:flex-end; padding:14px; border:1px solid rgba(74,183,255,.28); border-radius:28px; background:#03101d; box-shadow:0 28px 70px rgba(0,0,0,.48); }
        .money-video { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
        .money-reel-shade { position:absolute; inset:0; background:radial-gradient(circle at 50% 30%,rgba(25,149,255,.08),transparent 35%),linear-gradient(to bottom,rgba(1,9,18,.08),rgba(1,9,18,.24) 42%,rgba(1,9,18,.94) 82%); }

        .money-video-control { position:absolute; z-index:8; top:14px; right:14px; width:48px; height:48px; display:grid; place-items:center; border:1px solid rgba(87,205,255,.84); border-radius:50%; color:#d7f7ff; background:rgba(2,22,35,.64); box-shadow:0 0 18px rgba(61,190,255,.52); backdrop-filter:blur(10px); font-size:22px; font-weight:950; animation:moneyPulse 2.2s ease-in-out infinite; }
        @keyframes moneyPulse { 50% { transform:scale(1.07); box-shadow:0 0 28px rgba(61,190,255,.74); } }

        .money-floating-results {
          position:absolute;
          z-index:3;
          inset:84px 8px 180px;
          pointer-events:none;
        }
        .money-float {
          position:absolute;
          min-width:88px;
          max-width:150px;
          padding:8px 10px;
          display:flex;
          align-items:center;
          gap:6px;
          border:1px solid rgba(218,244,255,.18);
          border-radius:999px;
          background:rgba(3,24,40,.62);
          backdrop-filter:blur(10px);
          animation:moneyDrift 7s ease-in-out infinite alternate;
        }
        .money-float b { font-size:18px; }
        .money-float small {
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
          font-size:9px;
          font-weight:850;
        }
        .money-float.one { left:3%; top:4%; }
        .money-float.two { right:2%; top:32%; animation-delay:-3s; }
        .money-float.three { left:6%; bottom:10%; animation-delay:-5s; }
        @keyframes moneyDrift {
          from { transform:translate3d(-3px,-5px,0) rotate(-1deg); }
          to { transform:translate3d(8px,20px,0) rotate(2deg); }
        }

        .money-profile-badge {
          position:absolute;
          z-index:5;
          left:-34px;
          top:39%;
          width:145px;
          transform:translateY(-50%);
          display:flex;
          flex-direction:column;
          align-items:center;
          text-align:center;
          animation:moneyProfileMarquee 13.6s ease-in-out infinite;
          will-change:left,transform;
        }
        @keyframes moneyProfileMarquee {
          0% { left:-34px; transform:translateY(-50%) scale(1); }
          21% { left:calc(100% - 106px); transform:translateY(-50%) scale(1); }
          27.5% { left:calc(100% - 106px); transform:translateY(-50%) scale(1); }
          30% { left:calc(100% - 124px); transform:translateY(-50%) rotate(-1.2deg) scale(1.035); }
          43% { left:calc(100% - 106px); transform:translateY(-50%) rotate(0) scale(1); }
          64% { left:-34px; transform:translateY(-50%) scale(1); }
          70.5% { left:-34px; transform:translateY(-50%) scale(1); }
          73% { left:-16px; transform:translateY(-50%) rotate(1.2deg) scale(1.035); }
          86% { left:-34px; transform:translateY(-50%) rotate(0) scale(1); }
          100% { left:-34px; transform:translateY(-50%) scale(1); }
        }
        .money-profile-badge.is-focused,
        .money-floating-results.is-focused .money-float {
          animation-play-state:paused;
        }
        .money-floating-results.is-focused .money-float {
          opacity:0;
          transform:scale(.92);
          transition:opacity .18s ease,transform .18s ease;
        }
        .money-profile-ring {
          width:92px;
          height:92px;
          padding:4px;
          display:grid;
          place-items:center;
          overflow:hidden;
          border:0;
          border-radius:50%;
          background:conic-gradient(from 180deg,#55c8ff,#78f2ff,#6ca8ff,#55c8ff);
          box-shadow:0 0 0 5px rgba(4,18,32,.42),0 0 34px rgba(63,191,255,.42);
          cursor:pointer;
          transition:transform .25s ease,box-shadow .25s ease;
        }
        .money-profile-badge.is-focused .money-profile-ring {
          transform:scale(1.58);
          box-shadow:0 0 0 5px rgba(4,18,32,.34),0 0 52px rgba(63,191,255,.66);
        }
        .money-profile-ring img { width:100%; height:100%; object-fit:cover; border-radius:50%; }
        .money-profile-ring span { width:100%; height:100%; display:grid; place-items:center; border-radius:50%; background:#102233; font-size:36px; }
        .money-profile-badge>strong { margin-top:8px; padding:5px 9px; border-radius:999px; background:rgba(2,18,32,.70); backdrop-filter:blur(8px); font-size:13px; }
        .money-profile-badge>small { margin-top:4px; color:#a6ddff; font-size:8px; font-weight:950; letter-spacing:.09em; }

        .money-reel-card {
          position:absolute;
          z-index:7;
          left:12px;
          right:12px;
          bottom:12px;
          width:auto;
          padding:18px;
          border:1px solid rgba(190,231,255,.20);
          border-radius:22px;
          background:rgba(3,17,31,.78);
          backdrop-filter:blur(15px);
          box-sizing:border-box;
          animation:moneyCardIn .22s ease-out both;
        }
        @keyframes moneyCardIn {
          from { opacity:0; transform:translateY(12px); }
          to { opacity:1; transform:translateY(0); }
        }
        .money-reel-card h2 { margin:0 34px 6px 0; font-size:28px; line-height:1.05; }
        .money-reel-card>p { margin:0; color:rgba(233,246,255,.64); font-size:12px; line-height:1.4; }
        .money-reel-close {
          position:absolute;
          top:10px;
          right:10px;
          width:30px;
          height:30px;
          display:grid;
          place-items:center;
          border:1px solid rgba(255,255,255,.14);
          border-radius:50%;
          color:rgba(255,255,255,.88);
          background:rgba(0,0,0,.28);
          font-size:20px;
          line-height:1;
        }
        .money-conversation { margin-top:13px; padding:11px 12px; display:flex; flex-direction:column; gap:4px; border-left:2px solid #62caff; border-radius:10px; background:rgba(18,91,140,.20); }

        .money-join-mission {
          width:100%;
          min-height:58px;
          margin-top:13px;
          padding:9px 12px;
          display:grid;
          grid-template-columns:40px 1fr 18px;
          align-items:center;
          gap:10px;
          border:1px solid rgba(92,211,255,.54);
          border-radius:17px;
          color:white;
          background:linear-gradient(135deg,rgba(20,125,230,.96),rgba(7,94,190,.98));
          box-shadow:0 10px 28px rgba(17,111,220,.24);
          text-align:left;
        }
        .money-join-mission>span:first-child {
          width:38px;
          height:38px;
          display:grid;
          place-items:center;
          border-radius:50%;
          background:rgba(255,255,255,.14);
          font-size:19px;
        }
        .money-join-mission>span:nth-child(2) { display:flex; flex-direction:column; gap:2px; }
        .money-join-mission strong { font-size:13px; }
        .money-join-mission small { color:rgba(255,255,255,.72); font-size:9px; }
        .money-join-mission>b { font-size:27px; font-weight:400; }
        .money-join-mission.is-joined {
          border-color:rgba(82,239,180,.55);
          background:linear-gradient(135deg,rgba(13,150,97,.96),rgba(8,112,92,.98));
          box-shadow:0 10px 28px rgba(13,150,97,.22);
        }

        .money-room-layer {
          position:fixed;
          z-index:9999;
          inset:0;
          width:100vw;
          height:100dvh;
          display:grid;
          place-items:center;
          padding:16px;
          box-sizing:border-box;
          background:rgba(0,8,15,.82);
          backdrop-filter:blur(10px);
        }
        .money-room-card {
          position:relative;
          width:min(100%,390px);
          max-height:calc(100dvh - 32px);
          overflow:auto;
          padding:22px;
          border:1px solid rgba(99,206,255,.28);
          border-radius:25px;
          background:linear-gradient(155deg,rgba(7,35,58,.99),rgba(3,15,28,.99));
          box-shadow:0 24px 70px rgba(0,0,0,.48);
          box-sizing:border-box;
        }
        .money-room-close {
          position:absolute;
          top:12px;
          right:12px;
          width:32px;
          height:32px;
          display:grid;
          place-items:center;
          border:1px solid rgba(255,255,255,.13);
          border-radius:50%;
          color:rgba(255,255,255,.85);
          background:rgba(0,0,0,.24);
          font-size:20px;
        }
        .money-room-icon {
          width:54px;
          height:54px;
          margin-bottom:12px;
          display:grid;
          place-items:center;
          border:1px solid rgba(95,210,255,.46);
          border-radius:50%;
          background:rgba(16,93,148,.26);
          box-shadow:0 0 22px rgba(57,183,255,.24);
          font-size:24px;
        }
        .money-room-kicker {
          color:#7fd5ff;
          font-size:10px;
          font-weight:950;
          letter-spacing:.14em;
        }
        .money-room-card h2 { margin:5px 34px 8px 0; font-size:27px; line-height:1.08; }
        .money-room-lead { margin:0; color:rgba(235,246,255,.70); font-size:12px; line-height:1.5; }

        .money-join-card .money-room-back:disabled {
          opacity:.35;
          box-shadow:none;
        }
        .money-viewer-photo {
          margin-top:10px;
        }
        .money-room-members {
          margin-top:16px;
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:10px;
        }
        .money-room-member {
          min-width:0;
          padding:11px;
          display:flex;
          align-items:center;
          gap:9px;
          border:1px solid rgba(106,205,255,.16);
          border-radius:16px;
          background:rgba(255,255,255,.045);
        }
        .money-room-avatar {
          width:46px;
          height:46px;
          flex:0 0 46px;
          overflow:hidden;
          display:grid;
          place-items:center;
          border:2px solid rgba(104,213,255,.42);
          border-radius:50%;
          background:#102233;
        }
        .money-room-avatar img {
          width:100%;
          height:100%;
          object-fit:cover;
        }
        .money-room-avatar span {
          font-size:21px;
        }
        .money-room-member>div:last-child {
          min-width:0;
          display:flex;
          flex-direction:column;
          gap:2px;
        }
        .money-room-member small {
          color:#7fd5ff;
          font-size:7px;
          font-weight:950;
          letter-spacing:.10em;
        }
        .money-room-member strong {
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
          font-size:12px;
        }

        .money-room-status {
          margin-top:16px;
          padding:12px;
          display:flex;
          align-items:center;
          gap:10px;
          border:1px solid rgba(79,238,177,.20);
          border-radius:15px;
          background:rgba(16,114,79,.18);
        }
        .money-status-dot {
          width:11px;
          height:11px;
          flex:0 0 auto;
          border-radius:50%;
          background:#61efb6;
          box-shadow:0 0 14px rgba(97,239,182,.75);
        }
        .money-room-status div { display:flex; flex-direction:column; gap:2px; }
        .money-room-status small { color:rgba(194,255,228,.62); font-size:8px; font-weight:900; letter-spacing:.12em; }
        .money-room-status strong { font-size:13px; }

        .money-room-progress {
          margin-top:14px;
          display:grid;
          grid-template-columns:repeat(4,minmax(0,1fr));
          gap:6px;
        }
        .money-room-progress div {
          min-width:0;
          display:flex;
          flex-direction:column;
          align-items:center;
          gap:6px;
          color:rgba(255,255,255,.35);
          text-align:center;
        }
        .money-room-progress span {
          width:27px;
          height:27px;
          display:grid;
          place-items:center;
          border:1px solid rgba(255,255,255,.12);
          border-radius:50%;
          background:rgba(255,255,255,.05);
          font-size:9px;
          font-weight:900;
        }
        .money-room-progress strong { font-size:8px; line-height:1.2; }
        .money-room-progress .is-active { color:#bfffe5; }
        .money-room-progress .is-active span {
          border-color:rgba(82,239,180,.50);
          background:rgba(17,145,94,.38);
          box-shadow:0 0 15px rgba(82,239,180,.20);
        }

        .money-room-message {
          margin-top:16px;
          padding:13px;
          border-left:2px solid #62caff;
          border-radius:11px;
          background:rgba(18,91,140,.18);
        }
        .money-room-message strong { font-size:12px; }
        .money-room-message p { margin:5px 0 0; color:rgba(235,246,255,.66); font-size:10px; line-height:1.45; }
        .money-room-hope { margin-top:12px; color:#a9e6ff; font-size:11px; font-weight:850; text-align:center; }

        .money-room-back {
          width:100%;
          min-height:48px;
          margin-top:13px;
          border:1px solid rgba(89,196,255,.34);
          border-radius:15px;
          color:white;
          background:linear-gradient(135deg,#087cff,#1269e9);
          font-weight:900;
        }

        .money-pin-layer { position:absolute; z-index:20; inset:0; display:grid; place-items:center; padding:18px; background:rgba(0,8,15,.80); backdrop-filter:blur(10px); }
        .money-pin-card { width:min(100%,360px); padding:20px; border:1px solid rgba(92,204,255,.30); border-radius:24px; background:linear-gradient(145deg,rgba(7,34,57,.99),rgba(3,14,26,.99)); box-sizing:border-box; }
        .money-pin-symbol { width:50px; height:50px; margin-bottom:12px; display:grid; place-items:center; border:1px solid rgba(94,211,255,.56); border-radius:50%; color:#d3f5ff; box-shadow:0 0 17px rgba(69,190,255,.35); font-size:22px; }
        .money-pin-card h3 { margin:0 0 5px; font-size:21px; }
        .money-pin-card p { margin:0 0 11px; color:rgba(237,248,255,.62); font-size:12px; }
        .money-pin-input { text-align:center; letter-spacing:.28em; font-size:20px; font-weight:900; }
        .money-pin-error { margin:7px 0 0; color:#ff9aad; font-size:11px; font-weight:800; }
        .money-ask-admin { width:100%; min-height:48px; margin-top:9px; border:1px solid rgba(72,192,255,.34); border-radius:15px; color:#cdefff; background:rgba(11,74,116,.42); font-weight:850; }
        .money-cancel { width:100%; min-height:42px; margin-top:5px; border:0; color:rgba(255,255,255,.56); background:transparent; }
        .money-or { margin:12px 0 0; color:rgba(255,255,255,.42); font-size:10px; font-weight:900; text-align:center; }

        .money-restart { width:100%; min-height:48px; margin-top:12px; border:1px solid rgba(82,186,255,.20); border-radius:15px; color:#cceeff; background:rgba(6,42,70,.52); font-weight:850; }
        .money-fine { margin-top:12px; color:rgba(255,255,255,.42); font-size:10px; line-height:1.45; text-align:center; }

        @media (max-width:390px) {
          .money-mission-grid,.money-contribution-grid { gap:8px; }
          .money-mission-card { min-height:138px; padding:13px; }
          .money-reel { min-height:630px; padding:11px; }
        }
        @media (prefers-reduced-motion:reduce) {
          .money-video-control,
          .money-profile-badge,
          .money-float { animation:none; }
        }
      `}</style>
    </section>
  );
}
