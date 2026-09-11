import { useEffect, useRef, useState } from "react";

const ADMIN_WHATSAPP = "250788484446";
const CONNECT_API_URL = "https://kitchenbrain.cucina656.workers.dev";

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

// --- Backend helpers (mirrors the verified Meet Someone / kitchenbrain.cucina656.workers.dev contract). ---
// This file is standalone, so these are duplicated rather than imported — same pattern already
// used for ADMIN_WHATSAPP in the original version of this file.
async function connectApi(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (typeof options.body === "string") headers.set("Content-Type", "application/json");
  const response = await fetch(`${CONNECT_API_URL}${path}`, { cache: "no-store", ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) throw new Error(data.error || data.message || `Request failed (${response.status})`);
  return data;
}

async function uploadImage(file) {
  const body = new FormData();
  body.append("kind", "profile_image");
  body.append("file", file);
  const response = await fetch(`${CONNECT_API_URL}/api/connect/upload`, { method: "POST", body });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) throw new Error(data.error || data.message || "Photo upload failed.");
  return data;
}

// Uploads a file with real progress (0-100) via XMLHttpRequest — plain fetch() has no
// upload-progress event, so the video-save percentage bar needs this instead.
function uploadWithProgress(url, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && typeof onProgress === "function") {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      let data = {};
      try { data = JSON.parse(xhr.responseText || "{}"); } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && data.success !== false) {
        resolve(data);
      } else {
        const err = new Error(data.error || data.message || `Upload failed (${xhr.status})`);
        err.status = xhr.status;
        reject(err);
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(formData);
  });
}

function getYouTubeId(url) {
  if (!url) return "";
  const str = String(url);
  const patterns = [
    /youtube\.com\/watch\?[^#]*\bv=([A-Za-z0-9_-]{6,})/,
    /youtu\.be\/([A-Za-z0-9_-]{6,})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/,
  ];
  for (const pattern of patterns) {
    const match = str.match(pattern);
    if (match) return match[1];
  }
  return "";
}

let youTubeApiPromise = null;
function loadYouTubeApi() {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (youTubeApiPromise) return youTubeApiPromise;

  youTubeApiPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("YouTube API timed out")), 12000);
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timeout);
      if (typeof previousReady === "function") previousReady();
      resolve(window.YT);
    };
    if (!document.getElementById("gwamo-youtube-iframe-api")) {
      const tag = document.createElement("script");
      tag.id = "gwamo-youtube-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      tag.onerror = () => { clearTimeout(timeout); reject(new Error("Could not load YouTube API")); };
      document.head.appendChild(tag);
    }
  }).catch((err) => { youTubeApiPromise = null; throw err; });

  return youTubeApiPromise;
}

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
  const [aboutMission, setAboutMission] = useState("");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");

  // Creating the mission on the real backend (needed so the video-PIN system below has a
  // real item id to attach to, exactly like a Meet Someone profile).
  const [missionSaving, setMissionSaving] = useState(false);
  const [missionError, setMissionError] = useState("");
  const [serverMission, setServerMission] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]); // [{ name, photo_url }] — creator first, never fabricated

  // Video editor state (mirrors Meet Someone's Add/Change video flow exactly).
  const [editingVideo, setEditingVideo] = useState(false);
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [videoPin, setVideoPin] = useState("");
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoError, setVideoError] = useState("");
  const [showAskPin, setShowAskPin] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [muted, setMuted] = useState(true);
  const [ytApiError, setYtApiError] = useState("");

  // Join-this-mission flow.
  const [joinedMission, setJoinedMission] = useState(false);
  const [missionRoomOpen, setMissionRoomOpen] = useState(false);
  const [joinIdentityOpen, setJoinIdentityOpen] = useState(false);
  const [viewerName, setViewerName] = useState("");
  const [viewerWhatsapp, setViewerWhatsapp] = useState("");
  const [viewerPhoto, setViewerPhoto] = useState(null);
  const [viewerPhotoPreview, setViewerPhotoPreview] = useState("");
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinError, setJoinError] = useState("");

  const videoRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const ytPending = useRef(false);
  const stageRef = useRef(null);
  const activeRef = useRef(false);
  const mutedRef = useRef(true);

  const missionData = MISSIONS.find(([, title]) => title === mission);
  const missionEmoji = missionData?.[0] || "💰";
  const missionReady = Boolean(mission);
  const teamReady = Boolean(contribution && aboutMission.trim());
  const profileReady = Boolean(name.trim() && whatsapp.trim() && photo);

  const handlePhoto = (event) => {
    const file = event.target.files?.[0] || null;
    setPhoto(file);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(file ? URL.createObjectURL(file) : "");
  };

  const handleViewerPhoto = (event) => {
    const file = event.target.files?.[0] || null;
    setViewerPhoto(file);
    if (viewerPhotoPreview) URL.revokeObjectURL(viewerPhotoPreview);
    setViewerPhotoPreview(file ? URL.createObjectURL(file) : "");
  };

  // --- Video playback (single book card, same architecture as Meet Someone's feed) ---
  function pauseVideo() {
    if (videoRef.current) { try { videoRef.current.pause(); } catch {} }
    if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === "function") {
      try { ytPlayerRef.current.pauseVideo(); } catch {}
    }
    ytPending.current = false;
    activeRef.current = false;
  }

  function playVideo() {
    activeRef.current = true;
    const shouldMute = mutedRef.current;
    if (videoRef.current) {
      videoRef.current.muted = shouldMute;
      const attempt = videoRef.current.play();
      if (attempt && typeof attempt.then === "function") {
        attempt.then(() => setAutoplayBlocked(false)).catch(() => setAutoplayBlocked(true));
      } else {
        setAutoplayBlocked(false);
      }
      return;
    }
    const player = ytPlayerRef.current;
    if (player && typeof player.playVideo === "function") {
      try {
        if (shouldMute) { if (typeof player.mute === "function") player.mute(); }
        else if (typeof player.unMute === "function") player.unMute();
        player.playVideo();
        window.setTimeout(() => {
          try {
            const state = typeof player.getPlayerState === "function" ? player.getPlayerState() : null;
            setAutoplayBlocked(!(state === 1 || state === 3));
          } catch {}
        }, 700);
      } catch {
        setAutoplayBlocked(true);
      }
      return;
    }
    ytPending.current = true;
  }

  function toggleMute() {
    const next = !mutedRef.current;
    mutedRef.current = next;
    if (videoRef.current) videoRef.current.muted = next;
    const player = ytPlayerRef.current;
    if (player) {
      try {
        if (next) { if (typeof player.mute === "function") player.mute(); }
        else if (typeof player.unMute === "function") player.unMute();
      } catch {}
    }
    setMuted(next);
  }

  // Create/refresh the YouTube player when the mission video is a YouTube link.
  useEffect(() => {
    if (!serverMission) return undefined;
    const ytId = getYouTubeId(serverMission.video_url);
    if (!ytId) {
      if (ytPlayerRef.current) { try { ytPlayerRef.current.destroy(); } catch {} ytPlayerRef.current = null; }
      return undefined;
    }
    let cancelled = false;
    const elementId = `money-yt-${serverMission.id}`;
    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return;
        if (ytPlayerRef.current) {
          try { ytPlayerRef.current.cueVideoById(ytId); } catch {}
          return;
        }
        if (!document.getElementById(elementId)) return;
        ytPlayerRef.current = new YT.Player(elementId, {
          videoId: ytId,
          playerVars: { mute: 1, playsinline: 1, controls: 1, modestbranding: 1, rel: 0 },
          events: {
            onReady: () => { if (ytPending.current) { ytPending.current = false; playVideo(); } },
            onError: () => setMediaError("This video can't be played here. It may be private or embedding may be disabled."),
          },
        });
      })
      .catch(() => setYtApiError("YouTube playback isn't available right now."));
    return () => { cancelled = true; };
  }, [serverMission?.id, serverMission?.video_url]);

  // Auto-play/pause based on visibility of the WHOLE book card (stable-size container —
  // the flip transform on its children never changes this box, so page turns can't
  // accidentally look like a visibility change).
  useEffect(() => {
    if (!serverMission || !stageRef.current) return undefined;
    const el = stageRef.current;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          if (!activeRef.current) playVideo();
        } else if (entry.intersectionRatio < 0.25 && activeRef.current) {
          pauseVideo();
        }
      });
    }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
    observer.observe(el);
    return () => observer.disconnect();
  }, [serverMission?.id]);

  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) { if (activeRef.current) pauseVideo(); }
      else if (activeRef.current) playVideo();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    return () => {
      if (ytPlayerRef.current) { try { ytPlayerRef.current.destroy(); } catch {} }
      if (videoRef.current) { try { videoRef.current.pause(); } catch {} }
    };
  }, []);

  function openVideoEditor() {
    setEditingVideo((current) => !current);
    setVideoPin("");
    setVideoUrlInput("");
    setVideoFile(null);
    setVideoError("");
    setShowAskPin(false);
    setUploadProgress(0);
  }

  async function saveMissionVideo() {
    if (videoBusy || !serverMission) return;
    const pinValue = videoPin.trim();
    if (!pinValue) { setVideoError("Enter the Connect video PIN."); return; }
    if (!videoFile && !videoUrlInput.trim()) { setVideoError("Upload a video or paste a video link."); return; }

    setVideoBusy(true);
    setVideoError("");
    setShowAskPin(false);
    setUploadProgress(0);

    try {
      let nextVideoUrl = videoUrlInput.trim();
      let nextVideoKey = "";

      if (videoFile) {
        const form = new FormData();
        form.append("kind", "video");
        form.append("file", videoFile);
        form.append("pin", pinValue);
        const uploaded = await uploadWithProgress(`${CONNECT_API_URL}/api/connect/upload`, form, setUploadProgress);
        setUploadProgress(100);
        nextVideoUrl = uploaded.url || "";
        nextVideoKey = uploaded.key || "";
      }

      const response = await fetch(`${CONNECT_API_URL}/api/connect/video`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Connect-Video-Pin": pinValue },
        body: JSON.stringify({ item_id: serverMission.id, video_url: nextVideoUrl, video_key: nextVideoKey }),
      });
      const updated = await response.json().catch(() => ({}));
      if (!response.ok || updated.success === false) {
        const err = new Error(updated.error || updated.message || "Could not change video.");
        err.status = response.status;
        throw err;
      }

      setServerMission((current) => ({ ...current, ...updated.item }));
      setMediaError("");
      setEditingVideo(false);
      setVideoPin("");
      setVideoUrlInput("");
      setVideoFile(null);
      setShowAskPin(false);
      if (activeRef.current) window.setTimeout(() => playVideo(), 50);
    } catch (err) {
      setVideoError(err.message || "Could not change video.");
      if (err.status === 403 || /pin/i.test(err.message || "")) setShowAskPin(true);
    } finally {
      setVideoBusy(false);
      setUploadProgress(0);
    }
  }

  const askAdminForPin = () => {
    const message = [
      "Hello Gwamo Admin,",
      "Please send me the Connect video PIN to add or change my Make Money Together mission video.",
      `Mission: ${mission || "Not selected yet"}`,
      `Mission ID: ${serverMission?.id || "Not created yet"}`,
    ].join("\n");
    window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  // Creates the mission as a real backend record (connect_type "money"), mirroring the
  // verified Meet Someone profile-creation call. Only once this succeeds do we have a real
  // item id, which is what the video-PIN endpoint above needs to attach a video securely.
  async function createMission() {
    if (missionSaving) return;
    setMissionSaving(true);
    setMissionError("");
    try {
      const uploaded = await uploadImage(photo);
      const data = await connectApi("/api/connect/money", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          whatsapp: whatsapp.trim(),
          mission,
          contribution,
          photo_url: uploaded.url,
          photo_key: uploaded.key,
          answers: { about_mission: aboutMission.trim() },
        }),
      });
      const item = data.item || data.profile || null;
      if (!item || !item.id) throw new Error("The mission was created, but no mission ID was returned.");
      setServerMission(item);
      setTeamMembers([{ name: name.trim(), photo_url: item.creator_photo_url || uploaded.url }]);
      setStage("result");
    } catch (err) {
      setMissionError(err.message || "Could not create your mission. Please try again.");
    } finally {
      setMissionSaving(false);
    }
  }

  function joinMission() {
    if (joinedMission) {
      setMissionRoomOpen(true);
      return;
    }
    setJoinError("");
    setJoinIdentityOpen(true);
  }

  // NOTE ON BACKEND VERIFICATION: /api/connect/money and /api/connect/upload + /api/connect/video
  // are the same generic endpoints already verified working for Meet Someone, so mission creation
  // and the video-PIN system above are on solid ground. /api/connect/money/members below is NOT
  // verified — I found no evidence it exists (a probe returned 404) and have no way to confirm its
  // real shape without the Worker's source. It's wired here so the join form is fully functional
  // and will surface a clear error if the route is missing, rather than silently pretending to
  // save a WhatsApp number somewhere. This is the one piece of this request that needs a real
  // backend endpoint before "Join This Mission" can truly persist members and protect their numbers.
  async function confirmJoinMission() {
    if (!viewerName.trim() || !viewerWhatsapp.trim() || !viewerPhoto || joinBusy) return;
    if (!serverMission?.id) {
      setJoinError("This mission hasn't finished saving yet. Please wait a moment and try again.");
      return;
    }
    setJoinBusy(true);
    setJoinError("");
    try {
      const uploaded = await uploadImage(viewerPhoto);
      await connectApi("/api/connect/money/members", {
        method: "POST",
        body: JSON.stringify({
          item_id: serverMission.id,
          name: viewerName.trim(),
          whatsapp: viewerWhatsapp.trim(),
          photo_url: uploaded.url,
          photo_key: uploaded.key,
        }),
      });
      setTeamMembers((current) => [...current, { name: viewerName.trim(), photo_url: uploaded.url }]);
      setJoinedMission(true);
      setJoinIdentityOpen(false);
      setMissionRoomOpen(true);
    } catch (err) {
      setJoinError(err.message || "Could not save your join request. Please try again.");
    } finally {
      setJoinBusy(false);
    }
  }

  const restart = () => {
    setStage("mission");
    setMission("");
    setContribution("");
    setAboutMission("");
    setName("");
    setWhatsapp("");
    setPhoto(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview("");

    setMissionSaving(false);
    setMissionError("");
    setServerMission(null);
    setTeamMembers([]);

    setEditingVideo(false);
    setVideoFile(null);
    setVideoUrlInput("");
    setVideoPin("");
    setVideoBusy(false);
    setVideoError("");
    setShowAskPin(false);
    setUploadProgress(0);
    setAutoplayBlocked(false);
    setMediaError("");
    setMuted(true);
    mutedRef.current = true;
    setYtApiError("");

    setJoinedMission(false);
    setMissionRoomOpen(false);
    setJoinIdentityOpen(false);
    setViewerName("");
    setViewerWhatsapp("");
    setViewerPhoto(null);
    if (viewerPhotoPreview) URL.revokeObjectURL(viewerPhotoPreview);
    setViewerPhotoPreview("");
    setJoinBusy(false);
    setJoinError("");
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

          <div className="money-kicker money-about-kicker">ABOUT MISSION</div>
          <textarea
            className="money-input money-textarea"
            value={aboutMission}
            onChange={(event) => setAboutMission(event.target.value)}
            placeholder="Describe your mission — what will the team actually do, and why does it matter?"
          />

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
          <p className="money-lead">Your photo and mission will appear on the finished mission book.</p>

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
          </div>

          {missionError && <div className="money-error">{missionError}</div>}

          <button
            className="money-primary"
            type="button"
            disabled={!profileReady || missionSaving}
            onClick={createMission}
          >
            {missionSaving ? "Creating your mission..." : "Show My Mission Book"}
          </button>
        </>
      )}

      {stage === "result" && (
        <>
          <button className="money-back" type="button" onClick={() => setStage("profile")}>← Back</button>

          {ytApiError && <div className="money-error">{ytApiError}</div>}

          {serverMission && (
            <div className="money-book-row">
              <div
                className={`money-book-stage${(editingVideo || joinIdentityOpen) ? " is-paused" : ""}`}
                ref={stageRef}
              >
                <div className="money-book">
                  <div className="money-book-inside">
                    {serverMission.video_url ? (
                      getYouTubeId(serverMission.video_url) ? (
                        <div className="money-yt-wrap">
                          <div id={`money-yt-${serverMission.id}`} className="money-yt-player" />
                        </div>
                      ) : (
                        <video
                          ref={videoRef}
                          src={serverMission.video_url}
                          muted
                          loop
                          playsInline
                          preload="metadata"
                          controls
                          onError={() => setMediaError("This video couldn't be played.")}
                        />
                      )
                    ) : (
                      <div className="money-video-placeholder">
                        <span>🎬</span>
                        <small>No mission video yet</small>
                      </div>
                    )}
                    <div className="money-inside-overlay" />

                    {mediaError && <div className="money-media-error">⚠️ {mediaError}</div>}
                    {!mediaError && autoplayBlocked && serverMission.video_url && (
                      <button type="button" className="money-media-playbtn" onClick={playVideo}>▶ Play</button>
                    )}
                    {!mediaError && !autoplayBlocked && serverMission.video_url && (
                      <button
                        type="button"
                        className="money-mute-badge"
                        onClick={toggleMute}
                        aria-label={muted ? "Unmute video" : "Mute video"}
                        title={muted ? "Muted for autoplay — tap to unmute" : "Sound on — tap to mute"}
                      >
                        {muted ? "🔇" : "🔊"}
                      </button>
                    )}

                    <button
                      type="button"
                      className="money-change-video"
                      onClick={openVideoEditor}
                      aria-label={serverMission.video_url ? "Change mission video" : "Add mission video"}
                    >
                      🎥 {editingVideo ? "Close video" : (serverMission.video_url ? "Change video" : "Add video")}
                    </button>

                    <div className="money-inside-text">
                      <div className="money-inside-text-kicker">ABOUT THIS MISSION</div>
                      <p>{aboutMission || "No description added yet."}</p>
                    </div>
                  </div>

                  <div className="money-book-cover">
                    <div className="money-book-cover-shade" />

                    <div className="money-book-creator-badge">
                      {photoPreview ? <img src={photoPreview} alt={`${name} profile`} /> : <span>👤</span>}
                    </div>

                    {teamMembers.length > 1 && (
                      <div className="money-book-team-wall">
                        {teamMembers.slice(1).map((member, index) => (
                          <div className="money-book-team-photo" key={`${member.name}-${index}`}>
                            {member.photo_url ? <img src={member.photo_url} alt={`${member.name} profile`} /> : <span>👤</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="money-book-cover-info">
                      <div className="money-book-cover-emoji">{missionEmoji}</div>
                      <h2>{mission}</h2>
                      <span className="money-book-cover-chip">🤝 {contribution}</span>
                    </div>
                  </div>
                </div>
              </div>

              <button type="button" className="money-join-tab" onClick={joinMission}>
                <span>{joinedMission ? "✓" : "🤝"}</span>
                <small>{joinedMission ? "Open Mission Room" : "Join This Mission"}</small>
              </button>
            </div>
          )}

          {editingVideo && serverMission && (
            <div className="money-video-editor">
              <div className="money-video-editor-title">
                <strong>{serverMission.video_url ? "Change this mission's video" : "Add this mission's video"}</strong>
                <small>Anyone with the Connect video PIN can add or replace this video. Paste a YouTube link, a direct video link, or upload a file.</small>
              </div>
              <label className="money-video-file">
                <span>{videoFile ? `🎬 ${videoFile.name}` : "🎬 Upload video"}</span>
                <input type="file" accept="video/*" onChange={(event) => setVideoFile(event.target.files?.[0] || null)} />
              </label>
              <div className="money-video-or">OR</div>
              <input
                className="money-input"
                value={videoUrlInput}
                onChange={(event) => setVideoUrlInput(event.target.value)}
                placeholder="Paste video or YouTube link"
              />
              <input
                className="money-input"
                type="password"
                value={videoPin}
                onChange={(event) => { setVideoPin(event.target.value); setShowAskPin(false); }}
                placeholder="Connect video PIN"
                inputMode="numeric"
              />
              {videoError && <div className="money-error">{videoError}</div>}
              {videoBusy && videoFile && (
                <div className="money-upload-progress" role="progressbar" aria-valuenow={uploadProgress} aria-valuemin={0} aria-valuemax={100}>
                  <div className="money-upload-progress-bar" style={{ width: `${uploadProgress}%` }} />
                  <span className="money-upload-progress-label">{uploadProgress}%</span>
                </div>
              )}
              <button type="button" className="money-primary" onClick={saveMissionVideo} disabled={videoBusy}>
                {videoBusy
                  ? (videoFile ? (uploadProgress < 100 ? `Saving video... ${uploadProgress}%` : "Finishing...") : "Saving video...")
                  : "Save video"}
              </button>
              {showAskPin && (
                <a
                  className="money-ask-admin"
                  href={`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(`Hello Gwamo Admin, I need the Connect video PIN for a Make Money Together mission. Mission: ${mission}. Mission ID: ${serverMission.id}`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  💬 Ask Admin on WhatsApp
                </a>
              )}
              <button type="button" className="money-cancel" onClick={openVideoEditor}>Close</button>
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
                  Add your name, WhatsApp number, and photo so the creator can create a group where you can
                  learn how to do the mission in practice. Your WhatsApp number will not be shown publicly.
                </p>

                <input
                  className="money-input"
                  value={viewerName}
                  onChange={(event) => setViewerName(event.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                />

                <input
                  className="money-input"
                  value={viewerWhatsapp}
                  onChange={(event) => setViewerWhatsapp(event.target.value)}
                  placeholder="WhatsApp number, including country code"
                  inputMode="tel"
                  autoComplete="tel"
                />

                <label className="money-photo money-viewer-photo">
                  <span>{viewerPhoto ? `📷 ${viewerPhoto.name}` : "📷 Add your profile photo"}</span>
                  <input type="file" accept="image/*" onChange={handleViewerPhoto} />
                </label>

                {joinError && <div className="money-error">{joinError}</div>}

                <button
                  type="button"
                  className="money-room-back"
                  disabled={!viewerName.trim() || !viewerWhatsapp.trim() || !viewerPhoto || joinBusy}
                  onClick={confirmJoinMission}
                >
                  {joinBusy ? "Joining..." : "Join This Mission"}
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
                <h2>{teamMembers.length} {teamMembers.length === 1 ? "person" : "people"} in this mission</h2>

                <p className="money-room-lead">
                  Gwamo connected everyone who joined so far. More people can still join as the team forms.
                </p>

                <div className="money-room-members">
                  {teamMembers.map((member, index) => (
                    <div className="money-room-member" key={`${member.name}-${index}`}>
                      <div className="money-room-avatar">
                        {member.photo_url ? <img src={member.photo_url} alt={`${member.name} profile`} /> : <span>👤</span>}
                      </div>
                      <div>
                        <small>{index === 0 ? "CREATOR" : "MEMBER"}</small>
                        <strong>{member.name}</strong>
                      </div>
                    </div>
                  ))}
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
                  <strong>Gwamo connected this team.</strong>
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

          <button className="money-restart" type="button" onClick={restart}>Start Another Mission</button>

          <p className="money-fine">
            Gwamo helps people find each other, discuss and organize. Earnings are not guaranteed.
          </p>
        </>
      )}

      <style>{`
        .money-root { width:min(100%,560px); margin:0 auto; color:#f8fbff; }
        .money-back { margin:0 0 24px; padding:8px 0; border:0; color:rgba(220,236,250,.68); background:transparent; font-weight:750; }
        .money-kicker { margin-bottom:9px; color:#76d5ff; font-size:11px; font-weight:950; letter-spacing:.14em; }
        .money-about-kicker { margin-top:18px; }
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
        .money-textarea { min-height:112px; padding:14px 15px; line-height:1.5; resize:vertical; font-family:inherit; }
        .money-primary { width:100%; min-height:54px; margin-top:15px; border:1px solid rgba(74,181,255,.48); border-radius:16px; color:white; background:linear-gradient(135deg,#087cff,#1269e9); box-shadow:0 12px 30px rgba(8,124,255,.24); font-weight:900; }
        .money-primary.secondary { background:linear-gradient(135deg,#0c9f67,#087c89); border-color:rgba(74,232,170,.48); }
        .money-primary:disabled { opacity:.35; box-shadow:none; }

        .money-photo { width:100%; min-height:54px; margin-top:10px; padding:0 15px; display:flex; align-items:center; border:1px dashed rgba(82,184,255,.40); border-radius:15px; background:rgba(5,42,75,.44); box-sizing:border-box; font-size:13px; font-weight:800; position:relative; }
        .money-photo input { position:absolute; width:1px; height:1px; opacity:0; }

        .money-summary { display:flex; flex-wrap:wrap; gap:7px; margin-top:11px; }
        .money-summary span { padding:7px 9px; border-radius:999px; color:rgba(239,249,255,.84); background:rgba(255,255,255,.08); font-size:10px; }

        .money-error { margin:12px 0 0; padding:11px 13px; border:1px solid rgba(255,95,115,.35); border-radius:13px; color:#ffd6dd; background:rgba(93,16,34,.46); font-size:12px; }

        /* --- The finished mission: a book with a cover and a video "inside page" that trade places --- */
        .money-book-row { display:flex; align-items:stretch; gap:10px; }
        .money-book-stage { flex:1; min-width:0; perspective:1800px; }
        .money-book { position:relative; width:100%; aspect-ratio:3/4; min-height:420px; max-height:680px; }
        .money-book-inside, .money-book-cover { position:absolute; inset:0; border-radius:24px; overflow:hidden; border:1px solid rgba(74,183,255,.28); box-sizing:border-box; }
        .money-book-inside { background:#03101d; z-index:1; }
        .money-book-cover {
          z-index:2;
          transform-origin:left center;
          backface-visibility:hidden;
          box-shadow:10px 0 26px rgba(0,0,0,.42), inset 1px 0 0 rgba(255,255,255,.06);
          background:linear-gradient(160deg, rgba(9,39,73,.96), rgba(3,15,31,.98));
          animation: moneyBookFlip 12s ease-in-out infinite;
        }
        .money-book-stage.is-paused .money-book-cover,
        .money-book-stage.is-paused .money-inside-text { animation-play-state:paused; }

        @keyframes moneyBookFlip {
          0%, 25% { transform: rotateY(0deg); }
          33.33%, 91.67% { transform: rotateY(-165deg); }
          100% { transform: rotateY(0deg); }
        }

        .money-book-cover-shade { position:absolute; inset:0; background:linear-gradient(100deg, rgba(0,0,0,0) 58%, rgba(0,0,0,.55) 100%); pointer-events:none; }

        .money-book-creator-badge {
          position:absolute; top:16px; left:16px; z-index:3;
          width:58px; height:58px; border-radius:50%; overflow:hidden;
          border:2px solid rgba(120,220,255,.75); box-shadow:0 0 16px rgba(80,200,255,.55);
          display:flex; align-items:center; justify-content:center; background:#102233; font-size:26px;
        }
        .money-book-creator-badge img { width:100%; height:100%; object-fit:cover; }

        .money-book-team-wall { position:absolute; top:82px; left:16px; z-index:3; display:flex; flex-direction:column; gap:8px; }
        .money-book-team-photo {
          width:34px; height:42px; border-radius:4px; overflow:hidden;
          border:2px solid rgba(255,255,255,.85); box-shadow:0 3px 8px rgba(0,0,0,.4);
          background:#1b2c3f; display:flex; align-items:center; justify-content:center;
          transform:rotate(-3deg); font-size:16px;
        }
        .money-book-team-photo:nth-child(even) { transform:rotate(3deg); }
        .money-book-team-photo img { width:100%; height:100%; object-fit:cover; }

        .money-book-cover-info { position:absolute; left:16px; right:16px; bottom:20px; z-index:3; }
        .money-book-cover-emoji { font-size:40px; margin-bottom:4px; text-shadow:0 0 20px rgba(120,220,255,.6); }
        .money-book-cover-info h2 { margin:0 0 8px!important; font-size:26px!important; color:#fff; text-shadow:0 0 4px #fff, 0 0 12px #6fd8ff, 0 0 24px rgba(71,178,255,.7), 0 0 42px rgba(71,178,255,.4); }
        .money-book-cover-chip { display:inline-flex; padding:6px 12px; border-radius:999px; background:rgba(255,255,255,.12); color:#eafcff; font-size:11px; font-weight:800; text-shadow:0 0 6px rgba(120,220,255,.7); }

        .money-book-inside video { width:100%; height:100%; object-fit:cover; display:block; background:#000; }
        .money-video-placeholder { width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; color:rgba(255,255,255,.42); background:#070f1a; }
        .money-inside-overlay { position:absolute; inset:0; pointer-events:none; background:linear-gradient(to top, rgba(2,10,20,.92) 0%, rgba(2,10,20,.5) 40%, rgba(2,10,20,.05) 66%, rgba(2,10,20,0) 80%); }

        .money-inside-text { position:absolute; left:16px; right:16px; bottom:16px; z-index:2; max-height:46%; overflow:hidden; animation:moneyMissionScroll 12s ease-in-out infinite; }
        .money-inside-text-kicker { color:#8fe0ff; font-size:9px; font-weight:950; letter-spacing:.12em; margin-bottom:4px; text-shadow:0 0 8px rgba(120,220,255,.6); }
        .money-inside-text p { margin:0; color:#eafcff; font-size:13px; line-height:1.5; text-shadow:0 0 3px #fff, 0 0 10px rgba(120,220,255,.55); }
        @keyframes moneyMissionScroll {
          0%, 33.33% { transform: translateY(0%); }
          91.67% { transform: translateY(-140%); }
          100% { transform: translateY(0%); }
        }

        .money-mute-badge, .money-media-playbtn { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); z-index:4; }
        .money-mute-badge {
          width:52px; height:52px; border-radius:50%; display:flex; align-items:center; justify-content:center;
          border:1px solid rgba(120,220,255,.55); background:rgba(3,10,20,.4); backdrop-filter:blur(3px);
          font-size:22px; color:#fff;
          box-shadow:0 0 8px rgba(95,213,255,.85),0 0 20px rgba(95,213,255,.5),0 0 42px rgba(95,213,255,.3);
          animation:moneyMutePulse 2.2s ease-in-out infinite;
        }
        @keyframes moneyMutePulse { 0%,100%{box-shadow:0 0 8px rgba(95,213,255,.85),0 0 20px rgba(95,213,255,.5),0 0 42px rgba(95,213,255,.3);} 50%{box-shadow:0 0 14px rgba(95,213,255,1),0 0 32px rgba(95,213,255,.8),0 0 60px rgba(95,213,255,.5);} }
        .money-media-playbtn { display:flex; align-items:center; gap:6px; padding:10px 16px; border-radius:999px; border:1px solid rgba(255,255,255,.35); color:#fff; background:rgba(3,10,20,.72); backdrop-filter:blur(8px); font-size:12px; font-weight:900; }
        .money-media-error { position:absolute; left:10px; right:10px; top:10px; z-index:4; padding:8px 12px; border-radius:12px; color:#ffd6dd; background:rgba(93,16,34,.82); backdrop-filter:blur(6px); font-size:11px; font-weight:750; }
        .money-change-video { position:absolute; right:10px; bottom:10px; z-index:3; min-height:36px; padding:0 12px; border:1px solid rgba(255,255,255,.20); border-radius:999px; color:#fff; background:rgba(3,10,20,.78); backdrop-filter:blur(10px); font-size:10px; font-weight:900; }

        .money-yt-wrap { position:absolute; inset:0; }
        .money-yt-wrap [id^="money-yt-"] { position:absolute!important; inset:0!important; width:100%!important; height:100%!important; border:0; }

        .money-join-tab {
          flex:0 0 60px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px;
          padding:10px 4px; border:1px solid rgba(92,211,255,.54); border-radius:18px; color:#fff;
          background:linear-gradient(160deg, rgba(20,125,230,.96), rgba(7,94,190,.98));
          box-shadow:0 10px 24px rgba(17,111,220,.28);
        }
        .money-join-tab span { font-size:20px; }
        .money-join-tab small { writing-mode:vertical-rl; text-orientation:mixed; transform:rotate(180deg); font-size:11px; font-weight:900; letter-spacing:.02em; }

        .money-video-editor { margin-top:14px; padding:14px; border:1px solid rgba(74,183,255,.28); border-radius:18px; background:rgba(6,25,44,.8); }
        .money-video-editor-title { display:flex; flex-direction:column; gap:3px; margin-bottom:11px; }
        .money-video-editor-title strong { font-size:13px; }
        .money-video-editor-title small { color:rgba(255,255,255,.5); font-size:10px; }
        .money-video-file { min-height:48px; display:flex; align-items:center; padding:0 13px; border:1px dashed rgba(96,183,255,.42); border-radius:14px; color:#d7f2ff; background:rgba(10,50,80,.38); font-size:11px; font-weight:850; cursor:pointer; position:relative; }
        .money-video-file input { position:absolute; width:1px; height:1px; opacity:0; }
        .money-video-or { margin:8px 0; color:rgba(255,255,255,.3); font-size:9px; font-weight:900; text-align:center; }
        .money-upload-progress { position:relative; height:22px; margin-top:6px; border-radius:999px; overflow:hidden; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.1); }
        .money-upload-progress-bar { height:100%; border-radius:999px; background:linear-gradient(135deg,#087cff,#0c9f67); transition:width .2s ease; }
        .money-upload-progress-label { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:#fff; font-size:10px; font-weight:900; text-shadow:0 1px 3px rgba(0,0,0,.6); }
        .money-ask-admin { width:100%; min-height:48px; margin-top:9px; display:flex; align-items:center; justify-content:center; border:1px solid rgba(72,192,255,.34); border-radius:15px; color:#cdefff; background:rgba(11,74,116,.42); font-weight:850; text-decoration:none; }
        .money-cancel { width:100%; min-height:42px; margin-top:5px; border:0; color:rgba(255,255,255,.56); background:transparent; }

        .money-room-layer { position:fixed; z-index:9999; inset:0; width:100vw; height:100dvh; display:grid; place-items:center; padding:16px; box-sizing:border-box; background:rgba(0,8,15,.82); backdrop-filter:blur(10px); }
        .money-room-card { position:relative; width:min(100%,390px); max-height:calc(100dvh - 32px); overflow:auto; padding:22px; border:1px solid rgba(99,206,255,.28); border-radius:25px; background:linear-gradient(155deg,rgba(7,35,58,.99),rgba(3,15,28,.99)); box-shadow:0 24px 70px rgba(0,0,0,.48); box-sizing:border-box; }
        .money-room-close { position:absolute; top:12px; right:12px; width:32px; height:32px; display:grid; place-items:center; border:1px solid rgba(255,255,255,.13); border-radius:50%; color:rgba(255,255,255,.85); background:rgba(0,0,0,.24); font-size:20px; }
        .money-room-icon { width:54px; height:54px; margin-bottom:12px; display:grid; place-items:center; border:1px solid rgba(95,210,255,.46); border-radius:50%; background:rgba(16,93,148,.26); box-shadow:0 0 22px rgba(57,183,255,.24); font-size:24px; }
        .money-room-kicker { color:#7fd5ff; font-size:10px; font-weight:950; letter-spacing:.14em; }
        .money-room-card h2 { margin:5px 34px 8px 0; font-size:27px; line-height:1.08; }
        .money-room-lead { margin:0; color:rgba(235,246,255,.70); font-size:12px; line-height:1.5; }

        .money-join-card .money-room-back:disabled { opacity:.35; box-shadow:none; }
        .money-viewer-photo { margin-top:10px; }
        .money-room-members { margin-top:16px; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; max-height:220px; overflow:auto; }
        .money-room-member { min-width:0; padding:11px; display:flex; align-items:center; gap:9px; border:1px solid rgba(106,205,255,.16); border-radius:16px; background:rgba(255,255,255,.045); }
        .money-room-avatar { width:46px; height:46px; flex:0 0 46px; overflow:hidden; display:grid; place-items:center; border:2px solid rgba(104,213,255,.42); border-radius:50%; background:#102233; }
        .money-room-avatar img { width:100%; height:100%; object-fit:cover; }
        .money-room-avatar span { font-size:21px; }
        .money-room-member>div:last-child { min-width:0; display:flex; flex-direction:column; gap:2px; }
        .money-room-member small { color:#7fd5ff; font-size:7px; font-weight:950; letter-spacing:.10em; }
        .money-room-member strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12px; }

        .money-room-status { margin-top:16px; padding:12px; display:flex; align-items:center; gap:10px; border:1px solid rgba(79,238,177,.20); border-radius:15px; background:rgba(16,114,79,.18); }
        .money-status-dot { width:11px; height:11px; flex:0 0 auto; border-radius:50%; background:#61efb6; box-shadow:0 0 14px rgba(97,239,182,.75); }
        .money-room-status div { display:flex; flex-direction:column; gap:2px; }
        .money-room-status small { color:rgba(194,255,228,.62); font-size:8px; font-weight:900; letter-spacing:.12em; }
        .money-room-status strong { font-size:13px; }

        .money-room-progress { margin-top:14px; display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:6px; }
        .money-room-progress div { min-width:0; display:flex; flex-direction:column; align-items:center; gap:6px; color:rgba(255,255,255,.35); text-align:center; }
        .money-room-progress span { width:27px; height:27px; display:grid; place-items:center; border:1px solid rgba(255,255,255,.12); border-radius:50%; background:rgba(255,255,255,.05); font-size:9px; font-weight:900; }
        .money-room-progress strong { font-size:8px; line-height:1.2; }
        .money-room-progress .is-active { color:#bfffe5; }
        .money-room-progress .is-active span { border-color:rgba(82,239,180,.50); background:rgba(17,145,94,.38); box-shadow:0 0 15px rgba(82,239,180,.20); }

        .money-room-message { margin-top:16px; padding:13px; border-left:2px solid #62caff; border-radius:11px; background:rgba(18,91,140,.18); }
        .money-room-message strong { font-size:12px; }
        .money-room-message p { margin:5px 0 0; color:rgba(235,246,255,.66); font-size:10px; line-height:1.45; }
        .money-room-hope { margin-top:12px; color:#a9e6ff; font-size:11px; font-weight:850; text-align:center; }

        .money-room-back { width:100%; min-height:48px; margin-top:13px; border:1px solid rgba(89,196,255,.34); border-radius:15px; color:white; background:linear-gradient(135deg,#087cff,#1269e9); font-weight:900; }

        .money-restart { width:100%; min-height:48px; margin-top:12px; border:1px solid rgba(82,186,255,.20); border-radius:15px; color:#cceeff; background:rgba(6,42,70,.52); font-weight:850; }
        .money-fine { margin-top:12px; color:rgba(255,255,255,.42); font-size:10px; line-height:1.45; text-align:center; }

        @media (max-width:390px) {
          .money-mission-grid,.money-contribution-grid { gap:8px; }
          .money-mission-card { min-height:138px; padding:13px; }
          .money-book { min-height:380px; }
          .money-join-tab { flex-basis:52px; }
        }
        @media (prefers-reduced-motion:reduce) {
          .money-book-cover, .money-inside-text, .money-mute-badge { animation:none!important; }
        }
      `}</style>
    </section>
  );
}