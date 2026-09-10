import { useEffect, useRef, useState } from "react";
import WalkTogetherGame from "./WalkTogetherGame";
import MoneyTogetherGame from "./MoneyTogetherGame";

const HEARTS = ["💛", "🧡", "💚", "💙", "💜"];

const CONNECT_API_URL = "https://kitchenbrain.cucina656.workers.dev";
const ADMIN_WHATSAPP = "250788484446";
const LOVE_OWNER_KEY = "gwamo_connect_love_owner";

async function connectApi(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (typeof options.body === "string") headers.set("Content-Type", "application/json");
  const response = await fetch(`${CONNECT_API_URL}${path}`, { cache: "no-store", ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) throw new Error(data.error || data.message || `Request failed (${response.status})`);
  return data;
}

async function uploadProfilePhoto(file) {
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

function rememberLoveOwner(profileId, ownerToken) {
  if (!profileId || !ownerToken) return;
  try { localStorage.setItem(LOVE_OWNER_KEY, JSON.stringify({ profile_id: profileId, owner_token: ownerToken })); } catch {}
}

function readLoveOwner() {
  try {
    const saved = JSON.parse(localStorage.getItem(LOVE_OWNER_KEY) || "null");
    return saved?.profile_id ? saved : null;
  } catch {
    return null;
  }
}

function adminWhatsAppUrl(profile) {
  const text = `Hello Gwamo Admin,\nI want to view my heart match.\nProfile: ${profile?.creator_name || "Meet Someone"}\nProfile ID: ${profile?.id || ""}`;
  return `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(text)}`;
}

// --- Meet Someone video helpers: detect YouTube links and lazily load the YouTube IFrame API. ---
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

// --- Generic helpers for rendering "public_data" fields we don't have a fixed schema for (Money Teams). ---
function flattenPublicData(obj, prefix = "") {
  const out = [];
  Object.entries(obj || {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    if (typeof value === "object" && !Array.isArray(value)) {
      out.push(...flattenPublicData(value, `${prefix}${key}.`));
    } else if (!Array.isArray(value)) {
      out.push([`${prefix}${key}`, value]);
    }
  });
  return out;
}

function formatFieldLabel(key) {
  return key.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function Choice({ emoji, label, active, onClick }) {
  return (
    <button
      type="button"
      className={`connect-choice${active ? " is-active" : ""}`}
      onClick={onClick}
    >
      <span className="connect-choice-emoji">{emoji}</span>
      <span>{label}</span>
    </button>
  );
}

function Back({ onClick }) {
  return (
    <button type="button" className="connect-back" onClick={onClick}>
      ← Back
    </button>
  );
}

function ConnectHome({ setScreen }) {
  return (
    <section className="connect-panel">
      <div className="connect-kicker">GWAMO CONNECT</div>
      <h1>Find your people.</h1>
      <p className="connect-lead">For love or earning together.</p>

      <h3 className="connect-home-subtitle">Explore</h3>
      <div className="connect-grid">
        <Choice emoji="💰" label="Browse Money Teams" onClick={() => setScreen("browse-money")} />
        <Choice emoji="🤍" label="Browse People" onClick={() => setScreen("browse-love")} />
      </div>

      <h3 className="connect-home-subtitle">Join in</h3>
      <div className="connect-grid">
        <Choice emoji="💰" label="Earn Together" onClick={() => setScreen("money")} />
        <Choice emoji="🤍" label="Meet Someone" onClick={() => setScreen("love")} />
      </div>
    </section>
  );
}

function LoveGame({ onBack, onBrowse }) {
  const [step, setStep] = useState(0);
  const [adult, setAdult] = useState(false);
  const [location, setLocation] = useState("");
  const [preference, setPreference] = useState("");
  const [heart, setHeart] = useState("");
  const [freeDay, setFreeDay] = useState("");
  const [matters, setMatters] = useState("");
  const [profileName, setProfileName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [createdProfile, setCreatedProfile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function finishProfile() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const photo = await uploadProfilePhoto(photoFile);
      const data = await connectApi("/api/connect/love", {
        method: "POST",
        body: JSON.stringify({
          adult_confirmed: true, name: profileName.trim(), whatsapp: whatsapp.trim(),
          location: location.trim(), preference, heart, photo_url: photo.url, photo_key: photo.key,
          answers: { perfect_free_day: freeDay, matters_most: matters },
        }),
      });
      rememberLoveOwner(data.profile?.id, data.owner_token);
      setCreatedProfile(data.profile || null);
      setStep(7);
    } catch (err) {
      setError(err.message || "Could not create your connection card.");
    } finally { setBusy(false); }
  }

  return (
    <section className="connect-panel love-panel">
      <Back onClick={onBack} />
      {error && <div className="connect-error">{error}</div>}

      {step === 0 && (<>
        <div className="connect-kicker love">❤️ MEET SOMEONE</div>
        <h1>Maybe somebody is looking for someone like you.</h1>
        <div className="love-story-box"><span className="love-float one">❤️</span><span className="love-float two">✨</span><strong>Love Stories</strong><small>Real Gwamo couples can appear here after both people choose to share their story.</small></div>
        <label className="adult-check"><input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} /><span>I am 18 or older.</span></label>
        <button className="connect-primary love-button" disabled={!adult} onClick={() => setStep(1)}>Play the Match Game</button>
        <p className="connect-fine">Your heart choice is the only thing Gwamo uses to find a heart match.</p>
      </>)}

      {step === 1 && (<>
        <div className="connect-step">Step 1</div><h2>📍 Where are you?</h2>
        <input className="connect-input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, district or area" />
        <button className="connect-primary love-button" disabled={!location.trim()} onClick={() => setStep(2)}>Next</button>
      </>)}

      {step === 2 && (<>
        <div className="connect-step">Step 2</div><h2>❤️ Who would you like to meet?</h2>
        <div className="option-stack">{["A woman","A man","Open to either"].map((item) => <button type="button" key={item} className={`line-option${preference===item?" is-active":""}`} onClick={() => setPreference(item)}>{item}</button>)}</div>
        <button className="connect-primary love-button" disabled={!preference} onClick={() => setStep(3)}>Next</button>
      </>)}

      {step === 3 && (<>
        <div className="connect-step">Step 3</div><h2>Choose the heart that feels like you today.</h2>
        <p className="connect-lead">This heart alone decides your heart match.</p>
        <div className="heart-row">{HEARTS.map((item) => <button type="button" key={item} className={`heart-button${heart===item?" is-active":""}`} onClick={() => setHeart(item)}>{item}</button>)}</div>
        <button className="connect-primary love-button" disabled={!heart} onClick={() => setStep(4)}>Continue</button>
      </>)}

      {step === 4 && (<>
        <div className="connect-step">Quick question 1 of 2</div><h2>Your perfect free day?</h2>
        <div className="option-stack">{["🌳 Outside","🎵 Music","🍽️ Food together","🎬 Relaxing","🚶 Walking"].map((item) => <button type="button" key={item} className={`line-option${freeDay===item?" is-active":""}`} onClick={() => setFreeDay(item)}>{item}</button>)}</div>
        <button className="connect-primary love-button" disabled={!freeDay} onClick={() => setStep(5)}>Next</button>
      </>)}

      {step === 5 && (<>
        <div className="connect-step">Quick question 2 of 2</div><h2>What matters most to you?</h2>
        <div className="option-stack">{["❤️ Love","🤝 Trust","😂 Fun","💬 Good conversation","🏠 Building a future"].map((item) => <button type="button" key={item} className={`line-option${matters===item?" is-active":""}`} onClick={() => setMatters(item)}>{item}</button>)}</div>
        <button className="connect-primary love-button" disabled={!matters} onClick={() => setStep(6)}>Next</button>
      </>)}

      {step === 6 && (<>
        <div className="connect-step">Your profile</div><h2>Create your connection card.</h2>
        <p className="connect-lead">Your WhatsApp number and heart stay private. They are not shown on the public card.</p>
        <input className="connect-input" value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="Your name" autoComplete="name" />
        <input className="connect-input" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="WhatsApp number" inputMode="tel" autoComplete="tel" />
        <label className="connect-photo-field"><span>{photoFile ? `📷 ${photoFile.name}` : "📷 Add your profile photo"}</span><input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} /></label>
        <button className="connect-primary love-button" disabled={busy || !profileName.trim() || !whatsapp.trim() || !photoFile} onClick={finishProfile}>{busy ? "Creating..." : "Create My Connection Card"}</button>
      </>)}

      {step === 7 && (
        <div className="result-card love-result">
          <div className="result-symbol">❤️</div><div className="connect-kicker love">YOUR CARD IS LIVE</div>
          <h2>{createdProfile?.creator_name || profileName}, you are now in Gwamo Connections.</h2>
          <p>Your heart stays hidden. Your public status changes from Waiting to View heart match when another active profile has the same heart.</p>
          <button className="connect-primary love-button" onClick={onBrowse}>Browse Gwamo Connections</button>
        </div>
      )}
    </section>
  );
}

function BrowseLove({ onBack, onJoin }) {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [owner] = useState(() => readLoveOwner());
  const [editingVideoId, setEditingVideoId] = useState("");
  const [videoPin, setVideoPin] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoError, setVideoError] = useState("");
  const [showAskPin, setShowAskPin] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState({});
  const [mediaErrors, setMediaErrors] = useState({});
  const [ytApiError, setYtApiError] = useState("");
  const [mutedMap, setMutedMap] = useState({});
  const [uploadProgress, setUploadProgress] = useState(0);

  // Playback plumbing for the auto-playing, one-at-a-time card feed.
  const videoRefs = useRef({});
  const ytPlayers = useRef({});
  const ytVideoIds = useRef({});
  const ytPending = useRef({});
  const stageRefs = useRef({});
  const visibilityRatios = useRef({});
  const activeIdRef = useRef("");
  // Mirrors mutedMap synchronously so playback callbacks (set up once per items change)
  // never read a stale mute preference from an old render's closure.
  const mutedMapRef = useRef({});

  function pauseMedia(id) {
    if (!id) return;
    const video = videoRefs.current[id];
    if (video) { try { video.pause(); } catch {} }
    const player = ytPlayers.current[id];
    if (player && typeof player.pauseVideo === "function") { try { player.pauseVideo(); } catch {} }
    ytPending.current[id] = false;
  }

  function playMedia(id) {
    if (!id) return;
    const shouldMute = mutedMapRef.current[id] !== false; // muted by default — browsers require it for autoplay
    const video = videoRefs.current[id];
    if (video) {
      video.muted = shouldMute;
      const attempt = video.play();
      if (attempt && typeof attempt.then === "function") {
        attempt
          .then(() => setAutoplayBlocked((current) => ({ ...current, [id]: false })))
          .catch(() => setAutoplayBlocked((current) => ({ ...current, [id]: true })));
      } else {
        setAutoplayBlocked((current) => ({ ...current, [id]: false }));
      }
      return;
    }

    const player = ytPlayers.current[id];
    if (player && typeof player.playVideo === "function") {
      try {
        if (shouldMute) { if (typeof player.mute === "function") player.mute(); }
        else if (typeof player.unMute === "function") player.unMute();
        player.playVideo();
        window.setTimeout(() => {
          try {
            const state = typeof player.getPlayerState === "function" ? player.getPlayerState() : null;
            const playing = state === 1 || state === 3; // 1 = PLAYING, 3 = BUFFERING
            setAutoplayBlocked((current) => ({ ...current, [id]: !playing }));
          } catch {}
        }, 700);
      } catch {
        setAutoplayBlocked((current) => ({ ...current, [id]: true }));
      }
      return;
    }

    // The YouTube player for this card isn't ready yet — play as soon as it is.
    ytPending.current[id] = true;
  }

  function activateCard(id) {
    if (activeIdRef.current === id) return;
    if (activeIdRef.current) pauseMedia(activeIdRef.current);
    activeIdRef.current = id;
    if (id) playMedia(id);
  }

  // Browsers require muted playback for autoplay, so every card starts muted with a
  // neon mute badge over it; tapping the badge lets that one viewer turn its sound on.
  function toggleMute(id) {
    const wasMuted = mutedMapRef.current[id] !== false;
    const nextMuted = !wasMuted;
    mutedMapRef.current[id] = nextMuted;
    const video = videoRefs.current[id];
    if (video) video.muted = nextMuted;
    const player = ytPlayers.current[id];
    if (player) {
      try {
        if (nextMuted) { if (typeof player.mute === "function") player.mute(); }
        else if (typeof player.unMute === "function") player.unMute();
      } catch {}
    }
    setMutedMap((current) => ({ ...current, [id]: nextMuted }));
  }

  async function saveVideo(profile) {
    if (videoBusy) return;
    const pin = videoPin.trim();
    if (!pin) {
      setVideoError("Enter the Connect video PIN.");
      return;
    }
    if (!videoFile && !videoUrl.trim()) {
      setVideoError("Upload a video or paste a video link.");
      return;
    }

    setVideoBusy(true);
    setVideoError("");
    setShowAskPin(false);
    setUploadProgress(0);

    try {
      let nextVideoUrl = videoUrl.trim();
      let nextVideoKey = "";

      if (videoFile) {
        const form = new FormData();
        form.append("kind", "video");
        form.append("file", videoFile);
        form.append("pin", pin);

        const uploaded = await uploadWithProgress(
          `${CONNECT_API_URL}/api/connect/upload`,
          form,
          (pct) => setUploadProgress(pct)
        );
        setUploadProgress(100);
        nextVideoUrl = uploaded.url || "";
        nextVideoKey = uploaded.key || "";
      }

      const response = await fetch(`${CONNECT_API_URL}/api/connect/video`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Connect-Video-Pin": pin,
        },
        body: JSON.stringify({
          item_id: profile.id,
          video_url: nextVideoUrl,
          video_key: nextVideoKey,
        }),
      });
      const updated = await response.json().catch(() => ({}));
      if (!response.ok || updated.success === false) {
        const err = new Error(updated.error || updated.message || "Could not change video.");
        err.status = response.status;
        throw err;
      }

      setItems((current) =>
        current.map((item) => item.id === profile.id ? { ...item, ...updated.item } : item)
      );
      setMediaErrors((current) => { const next = { ...current }; delete next[profile.id]; return next; });
      setEditingVideoId("");
      setVideoPin("");
      setVideoUrl("");
      setVideoFile(null);
      setShowAskPin(false);

      // If this card is already the active one, resume playback on the freshly saved video
      // once the item update above has propagated through the native <video>/YouTube setup.
      if (activeIdRef.current === profile.id) {
        window.setTimeout(() => playMedia(profile.id), 50);
      }
    } catch (err) {
      setVideoError(err.message || "Could not change video.");
      if (err.status === 403 || /pin/i.test(err.message || "")) setShowAskPin(true);
    } finally {
      setVideoBusy(false);
      setUploadProgress(0);
    }
  }

  function openVideoEditor(profile) {
    setEditingVideoId((current) => current === profile.id ? "" : profile.id);
    setVideoPin("");
    setVideoUrl("");
    setVideoFile(null);
    setVideoError("");
    setShowAskPin(false);
    setUploadProgress(0);
  }

  useEffect(() => {
    let live = true;
    connectApi("/api/connect/love?limit=50")
      .then((data) => { if (live) setItems(data.items || []); })
      .catch((err) => { if (live) setError(err.message || "Could not load Gwamo Connections."); })
      .finally(() => { if (live) setBusy(false); });
    return () => { live = false; };
  }, []);

  // Create/update/tear down YouTube IFrame players as the video on each card changes.
  // For page-load speed, only the first couple of YouTube cards mount immediately — the
  // rest mount lazily as they scroll near the viewport, so a long feed doesn't pay the
  // cost (network + JS) of every YouTube embed up front.
  useEffect(() => {
    let cancelled = false;
    const currentYouTubeIds = new Set();
    items.forEach((profile) => {
      if (getYouTubeId(profile.video_url)) currentYouTubeIds.add(profile.id);
    });

    Object.keys(ytPlayers.current).forEach((id) => {
      if (!currentYouTubeIds.has(id)) {
        try { ytPlayers.current[id].destroy(); } catch {}
        delete ytPlayers.current[id];
        delete ytVideoIds.current[id];
      }
    });

    const toUpdate = items.filter((profile) => {
      const ytId = getYouTubeId(profile.video_url);
      return ytId && ytPlayers.current[profile.id] && ytVideoIds.current[profile.id] !== ytId;
    });
    toUpdate.forEach((profile) => {
      const ytId = getYouTubeId(profile.video_url);
      try {
        ytPlayers.current[profile.id].cueVideoById(ytId);
        ytVideoIds.current[profile.id] = ytId;
      } catch {}
    });

    function createPlayer(profile) {
      const id = profile.id;
      if (ytPlayers.current[id]) return;
      const elementId = `love-yt-${id}`;
      const ytId = getYouTubeId(profile.video_url);
      if (!ytId || !document.getElementById(elementId)) return;
      ytVideoIds.current[id] = ytId;
      loadYouTubeApi()
        .then((YT) => {
          if (cancelled || ytPlayers.current[id] || !document.getElementById(elementId)) return;
          ytPlayers.current[id] = new YT.Player(elementId, {
            videoId: ytId,
            playerVars: { mute: 1, playsinline: 1, controls: 1, modestbranding: 1, rel: 0 },
            events: {
              onReady: () => {
                if (ytPending.current[id]) {
                  ytPending.current[id] = false;
                  playMedia(id);
                }
              },
              onError: () => {
                setMediaErrors((current) => ({ ...current, [id]: "This video can't be played here. It may be private or embedding may be disabled." }));
              },
            },
          });
        })
        .catch(() => setYtApiError("YouTube playback isn't available right now."));
    }

    const stillNeeded = items.filter((profile) => getYouTubeId(profile.video_url) && !ytPlayers.current[profile.id]);
    if (!stillNeeded.length) return () => { cancelled = true; };

    // Mount the first two right away (likely above the fold on first load) so the feed
    // feels instant; everything else mounts only once it scrolls near the viewport.
    stillNeeded.slice(0, 2).forEach(createPlayer);
    const lazyTargets = stillNeeded.slice(2);

    let mountObserver = null;
    if (lazyTargets.length) {
      const byId = {};
      lazyTargets.forEach((profile) => { byId[profile.id] = profile; });
      mountObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.dataset.profileId;
          const profile = byId[id];
          if (profile) {
            createPlayer(profile);
            mountObserver.unobserve(entry.target);
          }
        });
      }, { rootMargin: "150% 0px", threshold: 0 });

      lazyTargets.forEach((profile) => {
        const el = stageRefs.current[profile.id];
        if (el) mountObserver.observe(el);
      });
    }

    return () => {
      cancelled = true;
      if (mountObserver) mountObserver.disconnect();
    };
  }, [items]);

  // Auto-play the most visible card's video (muted) and pause every other card.
  useEffect(() => {
    if (!items.length) return undefined;
    const ratios = visibilityRatios.current;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const id = entry.target.dataset.profileId;
        if (id) ratios[id] = entry.isIntersecting ? entry.intersectionRatio : 0;
      });

      let bestId = "";
      let bestRatio = 0;
      Object.keys(ratios).forEach((id) => {
        if (ratios[id] > bestRatio) { bestRatio = ratios[id]; bestId = id; }
      });

      if (bestId && bestRatio >= 0.5) {
        activateCard(bestId);
      } else if (activeIdRef.current && (ratios[activeIdRef.current] || 0) < 0.25) {
        pauseMedia(activeIdRef.current);
        activeIdRef.current = "";
      }
    }, { threshold: [0, 0.25, 0.5, 0.75, 1] });

    Object.values(stageRefs.current).forEach((el) => { if (el) observer.observe(el); });

    return () => observer.disconnect();
  }, [items]);

  // Pause the playing card whenever the browser tab is hidden; resume it when it's shown again.
  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) {
        if (activeIdRef.current) pauseMedia(activeIdRef.current);
      } else if (activeIdRef.current) {
        playMedia(activeIdRef.current);
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Leaving Meet Someone entirely: stop everything and free the YouTube players.
  useEffect(() => {
    return () => {
      Object.values(ytPlayers.current).forEach((player) => { try { player.destroy(); } catch {} });
      ytPlayers.current = {};
      Object.values(videoRefs.current).forEach((video) => { try { video.pause(); } catch {} });
      activeIdRef.current = "";
    };
  }, []);

  return (
    <section className="connect-panel browse-love-panel">
      <Back onClick={onBack} />
      <div className="browse-love-heading">
        <div><div className="connect-kicker love">❤️ GWAMO CONNECTIONS</div><h1>Browse Meet Someone</h1></div>
        <button type="button" className="browse-join-button" onClick={onJoin}>＋ Add yours</button>
      </div>
      <p className="connect-lead">Public cards show the person, area, perfect free day and heart-match status.</p>

      {error && <div className="connect-error">{error}</div>}
      {ytApiError && <div className="connect-error">{ytApiError}</div>}
      {busy && <div className="browse-empty">Loading connections...</div>}
      {!busy && !error && !items.length && <div className="browse-empty"><strong>No connection cards yet.</strong><span>Be the first person to join Meet Someone.</span></div>}

      <div className="love-card-list">
        {items.map((profile) => {
          const freeDay = profile.public_data?.perfect_free_day || profile.public_data?.answers?.perfect_free_day || "Not added";
          const hasMatch = profile.match_status === "View heart match";
          const editingVideo = editingVideoId === profile.id;
          const hasVideo = Boolean(profile.video_url);
          const ytId = getYouTubeId(profile.video_url);
          const mediaError = mediaErrors[profile.id];
          const blocked = autoplayBlocked[profile.id];
          return (
            <article className="love-connection-card" key={profile.id}>
              <div
                className={`love-card-stage${editingVideo ? " is-editing" : ""}`}
                data-profile-id={profile.id}
                ref={(el) => { if (el) stageRefs.current[profile.id] = el; else delete stageRefs.current[profile.id]; }}
              >
                <div className="love-card-video-section">
                  {hasVideo ? (
                    ytId ? (
                      <div className="love-yt-wrap">
                        <div id={`love-yt-${profile.id}`} className="love-yt-player" />
                      </div>
                    ) : (
                      <video
                        ref={(el) => { if (el) videoRefs.current[profile.id] = el; else delete videoRefs.current[profile.id]; }}
                        src={profile.video_url}
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        controls
                        onError={() => setMediaErrors((current) => ({ ...current, [profile.id]: "This video couldn't be played." }))}
                      />
                    )
                  ) : (
                    <div className="love-video-placeholder"><span>🎬</span><small>No video yet</small></div>
                  )}
                  {mediaError && <div className="love-media-error">⚠️ {mediaError}</div>}
                  {!mediaError && blocked && hasVideo && (
                    <button type="button" className="love-media-playbtn" onClick={() => playMedia(profile.id)}>▶ Play</button>
                  )}
                  {!mediaError && !blocked && hasVideo && (
                    <button
                      type="button"
                      className="love-mute-badge"
                      onClick={() => toggleMute(profile.id)}
                      aria-label={mutedMap[profile.id] === false ? "Mute video" : "Unmute video"}
                      title={mutedMap[profile.id] === false ? "Sound on — tap to mute" : "Muted for autoplay — tap to unmute"}
                    >
                      {mutedMap[profile.id] === false ? "🔊" : "🔇"}
                    </button>
                  )}
                  <button type="button" className="love-change-video" onClick={() => openVideoEditor(profile)}>
                    🎥 {editingVideo ? "Close video" : (hasVideo ? "Change video" : "Add video")}
                  </button>
                </div>
                <div className="love-card-profile-section">
                  <img className="love-card-profile-photo" src={profile.creator_photo_url || "/favicon.ico"} alt="" loading="lazy" decoding="async" />
                  <div className="love-card-photo-overlay" />
                  <div className="love-card-photo-info">
                    <h2>{profile.creator_name || "Gwamo member"}</h2>
                    <span className="love-card-area">📍 {profile.location || "Location not added"}</span>
                    <span className="love-card-freeday">{freeDay}</span>
                    <div className="love-card-status-row">
                      {hasMatch ? <a className="heart-match-status found" href={adminWhatsAppUrl(profile)} target="_blank" rel="noreferrer">View heart match</a> : <span className="heart-match-status">Waiting</span>}
                    </div>
                  </div>
                </div>
              </div>
              {editingVideo && (
                <div className="love-video-editor">
                  <div className="love-video-editor-title">
                    <strong>{hasVideo ? "Change this card's video" : "Add this card's video"}</strong>
                    <small>Anyone with the Connect video PIN can add or replace this video. Paste a YouTube link, a direct video link, or upload a file.</small>
                  </div>
                  <label className="love-video-file">
                    <span>{videoFile ? `🎬 ${videoFile.name}` : "🎬 Upload video"}</span>
                    <input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
                  </label>
                  <div className="love-video-or">OR</div>
                  <input className="connect-input" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Paste video or YouTube link" />
                  <input className="connect-input" type="password" value={videoPin} onChange={(e) => { setVideoPin(e.target.value); setShowAskPin(false); }} placeholder="Connect video PIN" inputMode="numeric" />
                  {videoError && <div className="connect-error video-error">{videoError}</div>}
                  {videoBusy && videoFile && (
                    <div className="love-upload-progress" role="progressbar" aria-valuenow={uploadProgress} aria-valuemin={0} aria-valuemax={100}>
                      <div className="love-upload-progress-bar" style={{ width: `${uploadProgress}%` }} />
                      <span className="love-upload-progress-label">{uploadProgress}%</span>
                    </div>
                  )}
                  <button type="button" className="connect-primary love-button love-save-video" onClick={() => saveVideo(profile)} disabled={videoBusy}>
                    {videoBusy
                      ? (videoFile ? (uploadProgress < 100 ? `Saving video... ${uploadProgress}%` : "Finishing...") : "Saving video...")
                      : "Save video"}
                  </button>
                  {showAskPin && (
                    <a className="love-ask-pin" href={`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(`Hello Gwamo Admin, I need the Connect video PIN for a Meet Someone card. Profile: ${profile.creator_name || ""}. Profile ID: ${profile.id}`)}`} target="_blank" rel="noreferrer">
                      Ask for PIN
                    </a>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function BrowseMoney({ onBack, onJoin }) {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    connectApi("/api/connect/money?limit=50")
      .then((data) => { if (live) setItems(data.items || []); })
      .catch((err) => { if (live) setError(err.message || "Could not load Money Teams."); })
      .finally(() => { if (live) setBusy(false); });
    return () => { live = false; };
  }, []);

  return (
    <section className="connect-panel browse-love-panel">
      <Back onClick={onBack} />
      <div className="browse-love-heading">
        <div><div className="connect-kicker">💰 MONEY TEAMS</div><h1>Browse Money Teams</h1></div>
        <button type="button" className="browse-join-button" onClick={onJoin}>＋ Add yours</button>
      </div>
      <p className="connect-lead">See people already earning together and what they're building.</p>

      {error && <div className="connect-error">{error}</div>}
      {busy && <div className="browse-empty">Loading money teams...</div>}
      {!busy && !error && !items.length && <div className="browse-empty"><strong>No money teams yet.</strong><span>Be the first to start one.</span></div>}

      <div className="money-card-list">
        {items.map((item) => {
          const details = flattenPublicData(item.public_data);
          return (
            <article className="money-card" key={item.id}>
              <div className="money-card-media">
                {item.creator_photo_url ? <img src={item.creator_photo_url} alt="" loading="lazy" decoding="async" /> : <div className="money-card-media-fallback">💰</div>}
              </div>
              <div className="money-card-body">
                <h2>{item.creator_name || "Gwamo team"}</h2>
                {item.location && <span className="money-card-location">📍 {item.location}</span>}
                {details.length > 0 && (
                  <div className="chip-row">
                    {details.map(([key, value]) => (
                      <span className="chip" key={key}>{formatFieldLabel(key)}: {String(value)}</span>
                    ))}
                  </div>
                )}
                {item.video_url && (
                  <video className="money-card-video" src={item.video_url} controls playsInline preload="metadata" />
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function StartSomething({ onBack, setScreen }) {
  return (
    <section className="connect-panel">
      <Back onClick={onBack} />
      <div className="connect-kicker">＋ START SOMETHING</div>
      <h1>What kind of thing do you want to start?</h1>
      <p className="connect-lead">Choose the experience first. Gwamo can ask the details step by step after that.</p>
      <div className="connect-grid">
        <Choice emoji="💰" label="Money Team" onClick={() => setScreen("money")} />
        <Choice emoji="🚶" label="Walk" onClick={() => setScreen("walk")} />
        <Choice emoji="❤️" label="Meet Someone" onClick={() => setScreen("love")} />
      </div>
    </section>
  );
}

export default function ConnectExperience() {
  const [screen, setScreen] = useState("home");
  const home = () => setScreen("home");

  return (
    <div className="gwamo-connect-root">
      {screen === "home" && <ConnectHome setScreen={setScreen} />}
      {screen === "love" && <LoveGame onBack={home} onBrowse={() => setScreen("browse-love")} />}
      {screen === "browse-love" && <BrowseLove onBack={home} onJoin={() => setScreen("love")} />}
      {screen === "browse-money" && <BrowseMoney onBack={home} onJoin={() => setScreen("money")} />}
      {screen === "walk" && <WalkTogetherGame onBack={home} />}
      {screen === "money" && <MoneyTogetherGame onBack={home} />}
      {screen === "start" && <StartSomething onBack={home} setScreen={setScreen} />}

      <style>{`
        .gwamo-connect-root {
          width: 100%; min-height: 100svh;
          padding: calc(154px + env(safe-area-inset-top)) 16px 40px;
          color: #f8fbff;
          background: radial-gradient(circle at 50% -10%, rgba(22,139,255,.20), transparent 34%), radial-gradient(circle at 90% 15%, rgba(123,64,255,.12), transparent 28%), #020712;
        }
        .connect-panel { width: min(100%, 560px); margin: 0 auto; }
        .connect-kicker { margin-bottom: 10px; color: #73c5ff; font-size: 11px; font-weight: 900; letter-spacing: .16em; }
        .connect-kicker.love { color: #ff86a6; }
        .connect-panel h1 { margin: 0 0 10px; font-size: clamp(28px, 8vw, 42px); line-height: 1.05; letter-spacing: -.03em; }
        .connect-panel h2 { margin: 0 0 18px; font-size: clamp(24px, 7vw, 34px); line-height: 1.12; }
        .connect-panel h3 { margin: 24px 0 12px; font-size: 16px; }
        .connect-lead { margin: 0 0 22px; color: rgba(230,239,249,.70); font-size: 14px; line-height: 1.55; }
        .connect-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px; }
        .connect-choice { min-height: 110px; display: flex; flex-direction: column; align-items: flex-start; justify-content: flex-end; gap: 12px; padding: 16px; border: 1px solid rgba(148,191,255,.16); border-radius: 20px; color: #f8fbff; background: linear-gradient(145deg, rgba(16,37,69,.86), rgba(4,12,27,.88)); box-shadow: 0 12px 34px rgba(0,0,0,.28); text-align: left; font-size: 14px; font-weight: 800; cursor: pointer; }
        .connect-choice.is-active { border-color: rgba(71,178,255,.92); box-shadow: 0 0 0 1px rgba(71,178,255,.18), 0 0 26px rgba(22,139,255,.18); }
        .connect-choice-emoji { font-size: 31px; }
        .connect-start { width: 100%; min-height: 54px; margin-top: 12px; border: 1px dashed rgba(116,194,255,.36); border-radius: 16px; color: #b9e3ff; background: rgba(5,19,39,.56); font-weight: 850; }
        .connect-bottom-line, .connect-fine { color: rgba(255,255,255,.42); font-size: 11px; line-height: 1.45; text-align: center; }
        .connect-bottom-line { margin-top: 28px; }
        .connect-back { margin: 0 0 24px; padding: 8px 0; border: 0; color: rgba(220,236,250,.68); background: transparent; font-weight: 750; }
        .connect-primary { width: 100%; min-height: 54px; margin-top: 16px; border: 1px solid rgba(70,181,255,.48); border-radius: 16px; color: #fff; background: linear-gradient(135deg, #087cff, #1269e9); box-shadow: 0 12px 30px rgba(8,124,255,.24); font-weight: 900; }
        .connect-primary:disabled { opacity: .36; cursor: not-allowed; box-shadow: none; }
        .love-button { border-color: rgba(255,95,147,.50); background: linear-gradient(135deg, #e83670, #b62358); box-shadow: 0 12px 30px rgba(232,54,112,.22); }
        .love-story-box { min-height: 150px; margin: 20px 0; position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-end; gap: 6px; padding: 18px; border: 1px solid rgba(255,109,154,.18); border-radius: 24px; background: radial-gradient(circle at 20% 20%, rgba(255,91,143,.24), transparent 30%), radial-gradient(circle at 80% 80%, rgba(106,71,255,.20), transparent 34%), rgba(15,8,24,.86); }
        .love-story-box strong { font-size: 20px; }
        .love-story-box small { max-width: 360px; color: rgba(255,236,243,.68); line-height: 1.45; }
        .love-float { position: absolute; right: 22px; top: 20px; font-size: 38px; opacity: .55; animation: connectFloat 6s ease-in-out infinite alternate; }
        .love-float.two { right: 78px; top: 62px; font-size: 24px; animation-delay: -2s; }
        @keyframes connectFloat { from { transform: translateY(0) scale(.95); } to { transform: translateY(8px) scale(1.08); } }
        .adult-check { display: flex; align-items: center; gap: 10px; margin: 16px 2px 4px; color: rgba(255,255,255,.76); font-size: 13px; }
        .adult-check input { width: 18px; height: 18px; accent-color: #e83670; }
        .connect-step { margin-bottom: 8px; color: rgba(124,201,255,.72); font-size: 11px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
        .connect-input { width: 100%; min-height: 54px; margin: 2px 0 10px; padding: 0 16px; border: 1px solid rgba(145,188,235,.20); border-radius: 16px; outline: none; color: #fff; background: rgba(3,12,27,.80); font-size: 15px; }
        .connect-photo-field { width: 100%; min-height: 54px; margin: 2px 0 10px; padding: 0 16px; display: flex; align-items: center; border: 1px dashed rgba(255,119,160,.42); border-radius: 16px; color: rgba(255,255,255,.82); background: rgba(30,8,21,.58); font-size: 14px; font-weight: 750; cursor: pointer; }
        .connect-photo-field input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
        .option-stack { display: flex; flex-direction: column; gap: 9px; }
        .line-option { width: 100%; min-height: 52px; padding: 0 16px; border: 1px solid rgba(153,190,229,.14); border-radius: 16px; color: rgba(255,255,255,.90); background: rgba(8,22,44,.72); text-align: left; font-weight: 750; }
        .line-option.is-active { border-color: rgba(75,182,255,.82); background: rgba(15,58,98,.78); }
        .heart-row { display: grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap: 7px; margin: 16px 0 6px; }
        .heart-button { aspect-ratio: 1; display: grid; place-items: center; border: 1px solid rgba(255,255,255,.08); border-radius: 18px; background: rgba(255,255,255,.035); font-size: clamp(28px, 9vw, 43px); }
        .heart-button.is-active { transform: translateY(-4px) scale(1.04); background: rgba(255,255,255,.08); box-shadow: 0 12px 30px rgba(0,0,0,.32), 0 0 24px rgba(255,90,145,.12); }
        .chip-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
        .chip { min-height: 39px; padding: 0 13px; display: inline-flex; align-items: center; border: 1px solid rgba(155,196,235,.15); border-radius: 999px; color: rgba(244,249,255,.78); background: rgba(7,20,40,.70); font-size: 12px; font-weight: 750; }
        .chip.is-active { border-color: rgba(78,183,255,.70); color: #fff; background: rgba(13,62,106,.78); }
        .trigger-card, .result-card { margin-top: 18px; padding: 18px; border: 1px solid rgba(97,187,255,.18); border-radius: 20px; background: linear-gradient(145deg, rgba(10,36,67,.78), rgba(4,13,29,.90)); }
        .trigger-card { display: flex; flex-direction: column; gap: 7px; }
        .trigger-card small { color: #75c9ff; font-size: 10px; font-weight: 900; letter-spacing: .1em; }
        .result-symbol { margin-bottom: 10px; font-size: 52px; }
        .love-result { border-color: rgba(255,106,151,.22); background: radial-gradient(circle at top right, rgba(255,78,137,.18), transparent 34%), linear-gradient(145deg, rgba(43,13,31,.86), rgba(9,9,23,.94)); }
        .summary-chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0 4px; }
        .summary-chips span { padding: 7px 10px; border-radius: 999px; color: rgba(255,255,255,.76); background: rgba(255,255,255,.05); font-size: 11px; }

        .connect-home-subtitle{margin:24px 0 12px!important;color:rgba(255,255,255,.72);font-size:13px!important}
        .browse-love-entry{width:100%;min-height:92px;display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:center;padding:15px 16px;border:1px solid rgba(255,107,153,.30);border-radius:22px;color:#fff;background:linear-gradient(145deg,rgba(46,14,34,.92),rgba(8,14,30,.94));text-align:left;box-shadow:0 16px 36px rgba(0,0,0,.28)}
        .browse-love-entry-icon{width:50px;height:50px;display:grid;place-items:center;border-radius:17px;background:rgba(255,255,255,.06);font-size:27px}
        .browse-love-entry span:nth-child(2){display:flex;flex-direction:column;gap:4px}.browse-love-entry small{color:rgba(255,232,241,.58);font-size:11px}.browse-love-entry b{color:#ff8eae;font-size:30px;font-weight:400}
        .connect-error{margin:0 0 14px;padding:11px 13px;border:1px solid rgba(255,95,115,.35);border-radius:13px;color:#ffd6dd;background:rgba(93,16,34,.46);font-size:12px}
        .browse-love-panel{width:min(100%,720px)}.browse-love-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:8px}.browse-love-heading h1{margin-bottom:0}
        .browse-join-button{flex:0 0 auto;min-height:42px;padding:0 13px;border:1px solid rgba(255,105,151,.38);border-radius:999px;color:#ffd9e5;background:rgba(84,20,45,.48);font-size:11px;font-weight:850}
        .browse-empty{min-height:140px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:24px;border:1px dashed rgba(255,255,255,.12);border-radius:22px;color:rgba(255,255,255,.52);background:rgba(255,255,255,.025);text-align:center;font-size:12px}.browse-empty strong{color:#fff;font-size:15px}

        .love-card-list{display:grid;gap:18px}
        .love-connection-card{overflow:hidden;border:1px solid rgba(255,109,153,.22);border-radius:26px;background:linear-gradient(160deg,rgba(35,12,28,.96),rgba(5,12,27,.98));box-shadow:0 20px 46px rgba(0,0,0,.32)}

        /* --- Meet Someone connection card: two trading panels (video / profile photo) --- */
        .love-card-stage{position:relative;width:100%;aspect-ratio:3/4;min-height:360px;max-height:640px;overflow:hidden;background:#05070d}

        .love-card-video-section{position:absolute;top:0;left:0;right:0;height:55%;overflow:hidden;z-index:1;background:#05070d;animation:loveVideoTrade 9s ease-in-out infinite;transition:height .4s ease}
        .love-card-video-section video{width:100%;height:100%;display:block;object-fit:cover;background:#000}
        .love-video-placeholder{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;color:rgba(255,255,255,.42);background:#070a11}
        .love-video-placeholder span{font-size:30px}
        .love-video-placeholder small{font-size:10px;font-weight:800}
        .love-change-video{position:absolute;right:10px;bottom:10px;min-height:36px;padding:0 12px;border:1px solid rgba(255,255,255,.20);border-radius:999px;color:#fff;background:rgba(3,7,15,.78);backdrop-filter:blur(10px);font-size:10px;font-weight:900;z-index:3}

        .love-yt-wrap{position:absolute;inset:0}
        .love-yt-wrap [id^="love-yt-"]{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;border:0}
        .love-media-error{position:absolute;left:10px;right:10px;top:10px;z-index:4;padding:8px 12px;border-radius:12px;color:#ffd6dd;background:rgba(93,16,34,.82);backdrop-filter:blur(6px);font-size:11px;font-weight:750}
        .love-media-playbtn{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:4;display:flex;align-items:center;gap:6px;padding:10px 16px;border:1px solid rgba(255,255,255,.35);border-radius:999px;color:#fff;background:rgba(3,7,15,.72);backdrop-filter:blur(8px);font-size:12px;font-weight:900}

        /* Sound is muted for autoplay (browsers require it) — a centered neon badge makes that obvious and lets a tap unmute. */
        .love-mute-badge{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:4;width:54px;height:54px;display:flex;align-items:center;justify-content:center;border-radius:50%;border:1px solid rgba(120,240,255,.55);background:rgba(4,10,20,.40);backdrop-filter:blur(3px);font-size:23px;line-height:1;color:#fff;box-shadow:0 0 8px rgba(95,242,255,.85),0 0 20px rgba(95,242,255,.55),0 0 42px rgba(95,242,255,.30);animation:loveNeonMutePulse 2.2s ease-in-out infinite}
        @keyframes loveNeonMutePulse{0%,100%{box-shadow:0 0 8px rgba(95,242,255,.85),0 0 20px rgba(95,242,255,.55),0 0 42px rgba(95,242,255,.30)}50%{box-shadow:0 0 14px rgba(95,242,255,1),0 0 32px rgba(95,242,255,.85),0 0 60px rgba(95,242,255,.5)}}

        .love-card-profile-section{position:absolute;left:0;right:0;bottom:0;height:45%;overflow:hidden;z-index:2;animation:loveProfileTrade 9s ease-in-out infinite;transition:height .4s ease}
        .love-card-profile-photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
        .love-card-photo-overlay{position:absolute;inset:0;background:linear-gradient(to top, rgba(4,3,9,.94) 0%, rgba(4,3,9,.62) 34%, rgba(4,3,9,.08) 64%, rgba(4,3,9,0) 80%);pointer-events:none}
        .love-card-photo-info{position:absolute;left:0;right:0;bottom:0;padding:18px 16px 15px;display:flex;flex-direction:column;gap:4px;z-index:2}
        .love-card-photo-info h2{margin:0 0 2px!important;color:#fff;font-size:21px!important;text-shadow:0 0 4px #fff,0 0 11px #ff6fb0,0 0 22px #ff2d95,0 0 40px rgba(255,45,149,.65);animation:loveNeonText 2.6s ease-in-out infinite}
        .love-card-area,.love-card-freeday{color:#eaf7ff;font-size:12.5px;text-shadow:0 0 3px #fff,0 0 8px #7fd7ff,0 0 16px rgba(71,178,255,.85),0 0 30px rgba(71,178,255,.4);animation:loveNeonText 2.6s ease-in-out infinite}
        .love-card-status-row{margin-top:7px}

        @keyframes loveVideoTrade{0%,66.67%{height:55%}72.22%,94.44%{height:0%}100%{height:55%}}
        @keyframes loveProfileTrade{0%,66.67%{height:45%}72.22%,94.44%{height:100%}100%{height:45%}}
        @keyframes loveNeonText{0%,100%{filter:brightness(1)}50%{filter:brightness(1.22)}}

        /* Pause the takeover while any viewer is editing this card's video (upload/link/PIN) */
        .love-card-stage.is-editing .love-card-video-section{animation:none;height:55%}
        .love-card-stage.is-editing .love-card-profile-section{animation:none;height:45%}

        .heart-match-status{width:fit-content;display:inline-flex;align-items:center;min-height:28px;padding:0 10px;border-radius:999px;color:rgba(255,255,255,.92);background:rgba(255,255,255,.16);backdrop-filter:blur(6px);font-size:10px;font-weight:900;text-decoration:none;text-shadow:0 0 6px rgba(255,255,255,.85);box-shadow:0 0 10px rgba(255,255,255,.22),inset 0 0 0 1px rgba(255,255,255,.25)}
        .heart-match-status.found{color:#fff;background:linear-gradient(135deg,#ee3e79,#b9285c);text-shadow:0 0 8px #fff,0 0 16px rgba(255,255,255,.7);box-shadow:0 0 18px rgba(238,62,121,.65),0 0 34px rgba(238,62,121,.35)}

        .love-video-editor{margin:0 14px 4px;padding:14px;border:1px solid rgba(255,108,153,.22);border-radius:18px;background:rgba(20,8,19,.78)}.love-video-editor-title{display:flex;flex-direction:column;gap:3px;margin-bottom:11px}.love-video-editor-title strong{font-size:13px}.love-video-editor-title small{color:rgba(255,255,255,.48);font-size:10px}
        .love-video-file{min-height:48px;display:flex;align-items:center;padding:0 13px;border:1px dashed rgba(255,118,160,.42);border-radius:14px;color:#ffe4ec;background:rgba(70,17,39,.38);font-size:11px;font-weight:850;cursor:pointer}.love-video-file input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}.love-video-or{margin:8px 0;color:rgba(255,255,255,.30);font-size:9px;font-weight:900;text-align:center}
        .love-video-editor .connect-input{min-height:48px;margin-bottom:8px}.love-save-video{min-height:48px;margin-top:4px}.love-ask-pin{min-height:44px;margin-top:8px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(80,215,126,.35);border-radius:14px;color:#bff5cf;background:rgba(24,92,50,.32);font-size:11px;font-weight:900;text-decoration:none}.video-error{margin-top:3px;margin-bottom:8px}
        .love-upload-progress{position:relative;height:22px;margin-top:6px;border-radius:999px;overflow:hidden;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.10)}
        .love-upload-progress-bar{height:100%;border-radius:999px;background:linear-gradient(135deg,#087cff,#e83670);transition:width .2s ease}
        .love-upload-progress-label{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:900;text-shadow:0 1px 3px rgba(0,0,0,.6)}

        .money-card-list{display:grid;gap:14px}
        .money-card{display:flex;gap:14px;padding:14px;border:1px solid rgba(255,255,255,.10);border-radius:22px;background:linear-gradient(160deg,rgba(14,34,24,.92),rgba(5,12,27,.97));box-shadow:0 16px 36px rgba(0,0,0,.28)}
        .money-card-media{width:74px;height:74px;flex:0 0 auto;border-radius:18px;overflow:hidden;background:rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center}
        .money-card-media img{width:100%;height:100%;object-fit:cover}
        .money-card-media-fallback{font-size:28px}
        .money-card-body{min-width:0;display:flex;flex-direction:column;gap:6px}
        .money-card-body h2{margin:0!important;color:#fff;font-size:17px!important}
        .money-card-location{color:rgba(230,239,249,.62);font-size:12px}
        .money-card-video{margin-top:6px;width:100%;max-height:180px;border-radius:14px;background:#000}

        @media (max-width: 390px) { .gwamo-connect-root { padding-left: 12px; padding-right: 12px; } .connect-choice { min-height: 104px; padding: 14px; } }
        @media (prefers-reduced-motion: reduce) {
          .love-float { animation: none; }
          .love-card-video-section, .love-card-profile-section { animation: none !important; }
          .love-mute-badge, .love-card-photo-info h2, .love-card-area, .love-card-freeday { animation: none !important; }
        }
      `}</style>
    </div>
  );
}