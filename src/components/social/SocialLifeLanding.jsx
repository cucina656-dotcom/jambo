import { useEffect, useRef, useState } from "react";
import RomanticStories from "./RomanticStories";

// Make Friends — the friendship version of the old Meet Someone flow,
// wired in under Social Life.
//
// Friend Game (steps 0-9): adult confirm, location, own gender, who to meet
// (Anyone / Women only / Men only), interests (up to 3), vibe color, free day,
// kind of friend, profile, result.
//
// MATCHING RULES (enforced by the Worker, not here):
//   Two active profiles are a friend match when EITHER
//     a) they picked the same vibe color (sent in the `heart` field, so the
//        Worker's existing same-heart matching keeps working), OR
//     b) they share at least one interest (`interests` array).
//   AND both people's "who to meet" choice allows the other:
//     "anyone" allows everyone; "woman" / "man" only allow that gender.
//   Same-gender pairs ARE allowed — the old "never match the same gender"
//   rule must be removed from the Worker.
//
// Browse is unchanged except for wording, the interest chips on each card,
// and the match-status text.

const CONNECT_API_URL = "https://kitchenbrain.cucina656.workers.dev";
const LOVE_OWNER_KEY = "gwamo_connect_love_owner";
const ADMIN_WHATSAPP = "250788484446";

// "Your vibe today" — replaces the old hearts. Still sent as `heart` so the
// Worker's same-value matching works without renaming the field.
const VIBES = ["🟡", "🟠", "🟢", "🔵", "🟣"];
const VIBE_COLORS = {
  "🟡": "#FFD23F",
  "🟠": "#FF9F43",
  "🟢": "#45D483",
  "🔵": "#4DA3FF",
  "🟣": "#A879FF",
};
const AMBER = "#FFB547";
const TEAL = "#3DD6C6";

// What this device's own card picked, kept locally so Browse can light up
// the interests a viewer shares with each card. Never sent anywhere.
const FRIEND_ME_KEY = "gwamo_friends_me";
function readMe() {
  try {
    const raw = JSON.parse(localStorage.getItem(FRIEND_ME_KEY) || "{}");
    return { interests: Array.isArray(raw.interests) ? raw.interests : [], vibe: raw.vibe || "" };
  } catch {
    return { interests: [], vibe: "" };
  }
}
function rememberMe(interests, vibe) {
  try {
    localStorage.setItem(FRIEND_ME_KEY, JSON.stringify({ interests, vibe }));
  } catch {}
}

const SEARCH_MIN_MS = 900; // "Looking for your people..." shows at least this long
const ORBIT_MS = 4600; // whole spin: fast start, slow-motion finish
const ORBIT_MAX = 10; // photos in the ring
const ORBIT_TURNS = 4; // full turns before landing

function easeOutQuint(t) {
  return 1 - Math.pow(1 - t, 5);
}

function interestsOf(profile) {
  const list = profile?.public_data?.interests || profile?.public_data?.answers?.interests || profile?.interests || [];
  return Array.isArray(list) ? list : [];
}

// Chooses who lands at the front of the orbit: someone who shares an interest
// if possible, otherwise a random new face. This is NOT the private friend
// match (that stays admin-approved in King) — just a friendly suggestion.
function planOrbit(allItems, ownId, myInterests) {
  const others = (allItems || []).filter((p) => p && p.id !== ownId && p.creator_photo_url);
  if (others.length < 3) return null;
  const shared = others.find((p) => interestsOf(p).some((k) => myInterests.includes(k)));
  const target = shared || others[Math.floor(Math.random() * others.length)];
  const sharedKey = shared ? interestsOf(shared).find((k) => myInterests.includes(k)) : "";
  const pool = others.filter((p) => p.id !== target.id).slice(0, ORBIT_MAX - 1);
  const targetIndex = Math.floor(Math.random() * (pool.length + 1));
  pool.splice(targetIndex, 0, target);
  return {
    people: pool,
    targetIndex,
    target,
    label: sharedKey ? `You both like ${interestLabel(sharedKey)}` : "A new face to say hi to",
  };
}

// Photos orbit around the center (tilted ring, front ones bigger and on top),
// spinning fast with a little motion blur, then slowing into slow motion and
// stopping with the chosen person at the front. Driven by requestAnimationFrame
// and direct style writes, so React doesn't re-render every frame.
function OrbitReveal({ people, targetIndex, centerPhoto, onDone }) {
  const stageRef = useRef(null);
  const faceRefs = useRef([]);
  const onDoneRef = useRef(onDone);
  const [landed, setLanded] = useState(false);
  onDoneRef.current = onDone;

  useEffect(() => {
    const n = people.length;
    if (!n) return undefined;
    const step = (Math.PI * 2) / n;
    // Front of the ring is angle PI/2 (bottom, closest to the viewer).
    const finalBase = ORBIT_TURNS * Math.PI * 2 + (Math.PI / 2 - targetIndex * step);
    let raf = 0;
    let start = null;
    let prevBase = 0;
    let prevTime = 0;

    function place(base, speed) {
      const width = stageRef.current?.clientWidth || 320;
      const radius = Math.min(width * 0.4, 160);
      const blur = Math.min(3, speed * 100);
      for (let i = 0; i < n; i += 1) {
        const el = faceRefs.current[i];
        if (!el) continue;
        const angle = base + i * step;
        const depth = (Math.sin(angle) + 1) / 2; // 1 = front, 0 = back
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius * 0.42;
        const scale = 0.55 + 0.45 * depth;
        el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${scale.toFixed(3)})`;
        el.style.zIndex = String(Math.round(depth * 100));
        el.style.opacity = String((0.4 + 0.6 * depth).toFixed(2));
        el.style.filter = blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : "none";
      }
    }

    function tick(now) {
      if (start === null) {
        start = now;
        prevTime = now;
      }
      const t = Math.min(1, (now - start) / ORBIT_MS);
      const base = finalBase * easeOutQuint(t);
      const speed = Math.abs(base - prevBase) / Math.max(1, now - prevTime);
      prevBase = base;
      prevTime = now;
      place(base, speed);
      if (t < 1) {
        raf = window.requestAnimationFrame(tick);
      } else {
        place(finalBase, 0);
        setLanded(true);
        if (typeof onDoneRef.current === "function") onDoneRef.current();
      }
    }

    place(0, 0);
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`orbit-stage${landed ? " is-landed" : ""}`} ref={stageRef} aria-hidden="true">
      <div className="orbit-center">
        <img src={centerPhoto || "/favicon.ico"} alt="" />
      </div>
      {people.map((person, i) => (
        <div
          key={person.id}
          className={`orbit-face${landed && i === targetIndex ? " is-picked" : ""}`}
          ref={(el) => {
            faceRefs.current[i] = el;
          }}
        >
          <img src={person.creator_photo_url} alt="" decoding="async" />
        </div>
      ))}
    </div>
  );
}
const CONFETTI = Array.from({ length: 14 }, (_, i) => i);

const INTERESTS = [
  { key: "sports", label: "⚽ Sports" },
  { key: "music", label: "🎵 Music" },
  { key: "reading", label: "📚 Reading" },
  { key: "cooking", label: "🍳 Cooking" },
  { key: "games", label: "🎮 Games" },
  { key: "faith", label: "🙏 Faith" },
  { key: "business", label: "💼 Business" },
  { key: "art", label: "🎨 Art" },
  { key: "outdoors", label: "🌳 Outdoors" },
  { key: "movies", label: "🎬 Movies" },
];
const MAX_INTERESTS = 3;
const INTEREST_LABELS = Object.fromEntries(INTERESTS.map((item) => [item.key, item.label]));

function interestLabel(key) {
  return INTEREST_LABELS[key] || String(key || "");
}

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

// Uploads a file with real progress (0-100) via XMLHttpRequest — plain fetch() has
// no upload-progress event, so the video-save percentage bar needs this instead.
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
      try {
        data = JSON.parse(xhr.responseText || "{}");
      } catch {}
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
  try {
    localStorage.setItem(LOVE_OWNER_KEY, JSON.stringify({ profile_id: profileId, owner_token: ownerToken }));
  } catch {}
}

function adminWhatsAppUrl(profile) {
  const text = `Hello Gwamo Admin,\nI want to see my friend match.\nProfile: ${profile?.creator_name || "Make Friends"}\nProfile ID: ${profile?.id || ""}`;
  return `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(text)}`;
}

function adminVideoPinWhatsAppUrl(profile) {
  const text = `Hello Gwamo Admin, I need the Connect video PIN for a Make Friends card. Profile: ${profile?.creator_name || ""}. Profile ID: ${profile?.id || ""}`;
  return `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(text)}`;
}

// --- Video helpers: detect YouTube links and lazily load the real YouTube IFrame API
// (so a card's video can be muted/played/paused programmatically, not just embedded). ---
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
      tag.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("Could not load YouTube API"));
      };
      document.head.appendChild(tag);
    }
  }).catch((err) => {
    youTubeApiPromise = null;
    throw err;
  });
  return youTubeApiPromise;
}

// Own gender — still needed so "Women only" / "Men only" choices can be
// respected. The internal key stays "woman"/"man" (what the Worker expects).
const GENDER_CHOICES = [
  { key: "woman", label: "Miss" },
  { key: "man", label: "Mr" },
];

// Who to meet — "anyone" is new; the Worker must accept it.
const PREFERENCE_CHOICES = [
  { key: "anyone", label: "🌍 Anyone" },
  { key: "woman", label: "Women only" },
  { key: "man", label: "Men only" },
];

const FREE_DAY_CHOICES = ["🌳 Outside", "🎵 Music", "🍽️ Food together", "🎬 Relaxing", "🚶 Walking"];

const LOOKING_FOR_CHOICES = [
  "🏃 Activity buddy",
  "📖 Study or work partner",
  "🏙️ New in town",
  "🎉 Weekend plans",
  "💬 Someone to talk to",
];

// Old profiles say "View heart match"; new ones may say "Friend match found".
const MATCH_STATUS_VALUES = ["View heart match", "Friend match found", "View friend match"];

// The Back control, fixed above the scrolling background instead of scrolling
// away with the page — same treatment as the Connect screen's fixed CTA bar.
function MeetFixedBar({ onBack }) {
  return (
    <>
      <div className="meet-fixed-bar">
        <button type="button" className="meet-back" onClick={onBack}>
          ← Back
        </button>
      </div>
      <div className="meet-fixed-bar-spacer" aria-hidden="true" />
    </>
  );
}

function MeetSomeoneGame({ onBack, initialScreen = "play" }) {
  const [screen, setScreen] = useState(initialScreen); // "play" | "browse"
  const [step, setStep] = useState(0);
  const [adult, setAdult] = useState(false);
  const [location, setLocation] = useState("");
  const [ownGender, setOwnGender] = useState("");
  const [preference, setPreference] = useState("");
  const [interests, setInterests] = useState([]);
  const [vibe, setVibe] = useState("");
  const [freeDay, setFreeDay] = useState("");
  const [lookingFor, setLookingFor] = useState("");
  const [profileName, setProfileName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [createdProfile, setCreatedProfile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [revealPhase, setRevealPhase] = useState("done"); // "searching" | "orbit" | "done"
  const [orbitData, setOrbitData] = useState(null);
  const [focusId, setFocusId] = useState("");
  const [vibeFlashKey, setVibeFlashKey] = useState(0);
  const [myInterests, setMyInterests] = useState(() => readMe().interests);
  const revealTimerRef = useRef(null);

  const [items, setItems] = useState([]);
  const [browseBusy, setBrowseBusy] = useState(false);
  const [browseError, setBrowseError] = useState("");

  // --- Browse video-management (PIN-gated) state. ---
  const [editingVideoId, setEditingVideoId] = useState("");
  const [videoPin, setVideoPin] = useState("");
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [videoFileInput, setVideoFileInput] = useState(null);
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoError, setVideoError] = useState("");
  const [showAskPin, setShowAskPin] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // --- Background-video playback state/refs for the browse feed. Kept at this
  // level (not per-card) so only one card plays with sound/motion at a time.
  const videoRefs = useRef({});
  const ytPlayers = useRef({});
  const ytVideoIds = useRef({});
  const ytPending = useRef({});
  const stageRefs = useRef({});
  const mutedMapRef = useRef({});
  const activeIdRef = useRef("");
  const ratioMapRef = useRef({});
  const [mutedMap, setMutedMap] = useState({});
  const [blockedMap, setBlockedMap] = useState({});
  const [mediaErrors, setMediaErrors] = useState({});

  useEffect(() => {
    if (screen !== "browse") return undefined;
    let live = true;
    setBrowseBusy(true);
    connectApi("/api/connect/love?limit=50")
      .then((data) => {
        if (live) setItems(data.items || []);
      })
      .catch((err) => {
        if (live) setBrowseError(err.message || "Could not load Gwamo Friends.");
      })
      .finally(() => {
        if (live) setBrowseBusy(false);
      });
    return () => {
      live = false;
    };
  }, [screen]);

  // Snap the page so one card sits fully on screen at a time.
  useEffect(() => {
    if (screen !== "browse") return undefined;
    const root = document.documentElement;
    const previous = root.style.scrollSnapType;
    root.style.scrollSnapType = editingVideoId ? "none" : "y mandatory";
    return () => {
      root.style.scrollSnapType = previous;
    };
  }, [screen, editingVideoId]);

  function toggleInterest(key) {
    setInterests((current) => {
      if (current.includes(key)) return current.filter((item) => item !== key);
      if (current.length >= MAX_INTERESTS) return current;
      return [...current, key];
    });
  }

  function isMuted(id) {
    return mutedMapRef.current[id] !== false; // muted by default — browsers require this for autoplay
  }

  function pauseMedia(id) {
    if (!id) return;
    const video = videoRefs.current[id];
    if (video) {
      try {
        video.pause();
      } catch {}
    }
    const player = ytPlayers.current[id];
    if (player && typeof player.pauseVideo === "function") {
      try {
        player.pauseVideo();
      } catch {}
    }
    ytPending.current[id] = false;
  }

  function playMedia(id) {
    if (!id) return;
    const shouldMute = isMuted(id);
    const video = videoRefs.current[id];
    if (video) {
      video.muted = shouldMute;
      const attempt = video.play();
      if (attempt && typeof attempt.then === "function") {
        attempt
          .then(() => setBlockedMap((current) => ({ ...current, [id]: false })))
          .catch(() => setBlockedMap((current) => ({ ...current, [id]: true })));
      } else {
        setBlockedMap((current) => ({ ...current, [id]: false }));
      }
      return;
    }
    const player = ytPlayers.current[id];
    if (player && typeof player.playVideo === "function") {
      try {
        if (shouldMute) {
          if (typeof player.mute === "function") player.mute();
        } else if (typeof player.unMute === "function") {
          player.unMute();
        }
        player.playVideo();
        window.setTimeout(() => {
          try {
            const state = typeof player.getPlayerState === "function" ? player.getPlayerState() : null;
            const playing = state === 1 || state === 3; // 1 = PLAYING, 3 = BUFFERING
            setBlockedMap((current) => ({ ...current, [id]: !playing }));
          } catch {}
        }, 700);
      } catch {
        setBlockedMap((current) => ({ ...current, [id]: true }));
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

  // Sound on/off badge. Every card starts muted (that's what lets it autoplay
  // at all); tapping the badge lets that one viewer turn that one card's sound on.
  function toggleMute(id) {
    const nextMuted = !isMuted(id);
    mutedMapRef.current[id] = nextMuted;
    setMutedMap((current) => ({ ...current, [id]: nextMuted }));
    const video = videoRefs.current[id];
    if (video) video.muted = nextMuted;
    const player = ytPlayers.current[id];
    if (player) {
      try {
        if (nextMuted) {
          if (typeof player.mute === "function") player.mute();
        } else if (typeof player.unMute === "function") {
          player.unMute();
        }
      } catch {}
    }
  }

  function registerStage(id, el) {
    if (el) stageRefs.current[id] = el;
    else delete stageRefs.current[id];
  }

  function openVideoEditor(profile) {
    setEditingVideoId((current) => (current === profile.id ? "" : profile.id));
    setVideoPin("");
    setVideoUrlInput("");
    setVideoFileInput(null);
    setVideoError("");
    setShowAskPin(false);
    setUploadProgress(0);
  }

  // Saves a card's video. The Connect video PIN is sent to the Worker (as a
  // header on the PATCH, and as a form field on the upload) — it is never
  // checked here. A wrong PIN comes back as an error from the Worker, which
  // this then surfaces along with "Ask for PIN".
  async function saveVideo(profile) {
    if (videoBusy) return;
    const pin = videoPin.trim();
    if (!pin) {
      setVideoError("Enter the Connect video PIN.");
      return;
    }
    if (!videoFileInput && !videoUrlInput.trim()) {
      setVideoError("Upload a video or paste a video link.");
      return;
    }
    setVideoBusy(true);
    setVideoError("");
    setShowAskPin(false);
    setUploadProgress(0);
    try {
      let nextVideoUrl = videoUrlInput.trim();
      let nextVideoKey = "";
      if (videoFileInput) {
        const form = new FormData();
        form.append("kind", "video");
        form.append("file", videoFileInput);
        form.append("pin", pin);
        const uploaded = await uploadWithProgress(`${CONNECT_API_URL}/api/connect/upload`, form, (pct) =>
          setUploadProgress(pct)
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
      setItems((current) => current.map((item) => (item.id === profile.id ? { ...item, ...updated.item } : item)));
      setMediaErrors((current) => {
        const next = { ...current };
        delete next[profile.id];
        return next;
      });
      setEditingVideoId("");
      setVideoPin("");
      setVideoUrlInput("");
      setVideoFileInput(null);
      setShowAskPin(false);
      if (activeIdRef.current === profile.id) {
        window.setTimeout(() => playMedia(profile.id), 50);
      }
    } catch (err) {
      setVideoError(err.message || "Could not change video.");
      if (err.status === 401 || err.status === 403 || /pin/i.test(err.message || "")) setShowAskPin(true);
    } finally {
      setVideoBusy(false);
      setUploadProgress(0);
    }
  }

  // Create/update/tear down YouTube IFrame players as the video on each card
  // changes. The first couple of YouTube cards mount immediately for perceived
  // speed; the rest mount lazily as they scroll near the viewport.
  useEffect(() => {
    if (screen !== "browse") return undefined;
    let cancelled = false;
    const currentYouTubeIds = new Set();
    items.forEach((profile) => {
      if (getYouTubeId(profile.video_url)) currentYouTubeIds.add(profile.id);
    });
    Object.keys(ytPlayers.current).forEach((id) => {
      if (!currentYouTubeIds.has(id)) {
        try {
          ytPlayers.current[id].destroy();
        } catch {}
        delete ytPlayers.current[id];
        delete ytVideoIds.current[id];
      }
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
                setMediaErrors((current) => ({
                  ...current,
                  [id]: "This video can't be played here. It may be private or embedding may be disabled.",
                }));
              },
            },
          });
        })
        .catch(() => {});
    }

    const stillNeeded = items.filter((profile) => getYouTubeId(profile.video_url) && !ytPlayers.current[profile.id]);
    if (!stillNeeded.length) return () => {};
    stillNeeded.slice(0, 2).forEach(createPlayer);
    const lazyTargets = stillNeeded.slice(2);
    let mountObserver = null;
    if (lazyTargets.length) {
      const byId = {};
      lazyTargets.forEach((profile) => {
        byId[profile.id] = profile;
      });
      mountObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const id = entry.target.getAttribute("data-profile-id");
            const profile = byId[id];
            if (profile) {
              createPlayer(profile);
              mountObserver.unobserve(entry.target);
            }
          });
        },
        { rootMargin: "150% 0px", threshold: 0 }
      );
      lazyTargets.forEach((profile) => {
        const el = stageRefs.current[profile.id];
        if (el) mountObserver.observe(el);
      });
    }
    return () => {
      cancelled = true;
      if (mountObserver) mountObserver.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, items]);

  // Watches which card is actually on screen and activates its video — only
  // the single most-visible card plays; scrolling it away pauses it.
  useEffect(() => {
    if (screen !== "browse" || !items.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.getAttribute("data-profile-id");
          if (id) ratioMapRef.current[id] = entry.isIntersecting ? entry.intersectionRatio : 0;
        });

        let bestId = "";
        let bestRatio = 0;
        Object.entries(ratioMapRef.current).forEach(([id, ratio]) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        });

        if (bestId && bestRatio >= 0.5) {
          activateCard(bestId);
        } else if (activeIdRef.current && (ratioMapRef.current[activeIdRef.current] || 0) < 0.25) {
          pauseMedia(activeIdRef.current);
          activeIdRef.current = "";
        }
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    Object.values(stageRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
      if (activeIdRef.current) pauseMedia(activeIdRef.current);
      activeIdRef.current = "";
      ratioMapRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, items]);

  // Pause the playing card whenever the browser tab is hidden; resume it when
  // it's shown again.
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

  // Leaving Make Friends entirely: stop everything and free the YouTube players.
  useEffect(() => {
    return () => {
      Object.values(ytPlayers.current).forEach((player) => {
        try {
          player.destroy();
        } catch {}
      });
      ytPlayers.current = {};
      Object.values(videoRefs.current).forEach((video) => {
        try {
          video.pause();
        } catch {}
      });
      activeIdRef.current = "";
      window.clearTimeout(revealTimerRef.current);
    };
  }, []);

  function pickVibe(item) {
    setVibe(item);
    setVibeFlashKey((current) => current + 1);
  }

  function scrollToCard(id) {
    const el = stageRefs.current[id];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // After "See their card": once Browse has loaded, jump to that person.
  useEffect(() => {
    if (screen !== "browse" || !focusId || !items.length) return undefined;
    const timer = window.setTimeout(() => {
      scrollToCard(focusId);
      setFocusId("");
    }, 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, focusId, items]);

  async function finishProfile() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const photo = await uploadProfilePhoto(photoFile);
      const data = await connectApi("/api/connect/love", {
        method: "POST",
        body: JSON.stringify({
          adult_confirmed: true,
          name: profileName.trim(),
          whatsapp: whatsapp.trim(),
          location: location.trim(),
          // Own gender + who to meet. preference is "anyone" | "woman" | "man".
          gender: ownGender,
          preference,
          // The vibe color goes in `heart` so the Worker's same-value matching
          // keeps working. It stays private, like the heart did.
          heart: vibe,
          vibe,
          // Interests are public (shown on the card) and also create a match
          // when two people share at least one.
          interests,
          photo_url: photo.url,
          photo_key: photo.key,
          // A video is intentionally NOT part of profile creation. Adding a
          // card's video always goes through Browse and needs the Connect
          // video PIN — letting this form set a video would bypass that.
          answers: { perfect_free_day: freeDay, looking_for: lookingFor, interests },
        }),
      });
      rememberLoveOwner(data.profile?.id, data.owner_token);
      rememberMe(interests, vibe);
      setMyInterests(interests);
      setCreatedProfile(data.profile || null);
      setOrbitData(null);
      const skipReveal =
        typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      setStep(9);
      if (skipReveal) {
        setRevealPhase("done");
      } else {
        // "Looking for your people..." while the feed loads, then the orbit.
        setRevealPhase("searching");
        const startedAt = Date.now();
        let plan = null;
        try {
          const list = await connectApi("/api/connect/love?limit=50");
          plan = planOrbit(list.items || [], data.profile?.id, interests);
        } catch {}
        const wait = Math.max(0, SEARCH_MIN_MS - (Date.now() - startedAt));
        window.clearTimeout(revealTimerRef.current);
        revealTimerRef.current = window.setTimeout(() => {
          if (plan) {
            setOrbitData(plan);
            setRevealPhase("orbit");
          } else {
            setRevealPhase("done");
          }
        }, wait);
      }
    } catch (err) {
      setError(err.message || "Could not create your friend card.");
    } finally {
      setBusy(false);
    }
  }

  if (screen === "browse") {
    // "New today" row: profiles created in the last 24h when the Worker sends
    // created_at; otherwise the first few cards (the feed is newest-first).
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const newToday = items.filter((p) => {
      const t = p.created_at ? new Date(p.created_at).getTime() : NaN;
      return Number.isFinite(t) && t >= dayAgo;
    });
    const faces = (newToday.length ? newToday : items).slice(0, 10);
    const facesLabel = newToday.length ? "New today" : "New faces";

    return (
      <section className="meet-someone-panel" style={{ colorScheme: "dark" }}>
        <MeetFixedBar onBack={() => setScreen("play")} />
        <div className="meet-browse-heading">
          <div>
            <div className="meet-kicker">👋 GWAMO FRIENDS</div>
            <h1>Browse Make Friends</h1>
          </div>
          <button
            type="button"
            className="meet-add-yours"
            onClick={() => {
              setScreen("play");
              setStep(0);
            }}
          >
            ＋ Add yours
          </button>
        </div>
        <p className="meet-lead">Matched by vibe color or a shared interest.</p>

        {faces.length > 0 && (
          <div className="friend-faces">
            <div className="friend-faces-label">{facesLabel}</div>
            <div className="friend-faces-row">
              {faces.map((profile) => (
                <button
                  type="button"
                  key={profile.id}
                  className="friend-face"
                  onClick={() => scrollToCard(profile.id)}
                  aria-label={`Go to ${profile.creator_name || "this person"}'s card`}
                >
                  <span className="friend-face-ring" aria-hidden="true" />
                  <img src={profile.creator_photo_url || "/favicon.ico"} alt="" loading="lazy" decoding="async" />
                  <span className="friend-face-name">{profile.creator_name || "Member"}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {browseError && <div className="meet-error">{browseError}</div>}
        {browseBusy && <div className="meet-browse-empty">Loading friends...</div>}
        {!browseBusy && !browseError && !items.length && (
          <div className="meet-browse-empty">
            <strong>No friend cards yet.</strong>
            <span>Be the first person to join Make Friends.</span>
          </div>
        )}

        <div className="love-card-list">
          {items.map((profile, index) => {
            const freeDay2 =
              profile.public_data?.perfect_free_day ||
              profile.public_data?.answers?.perfect_free_day ||
              "Not added";
            const cardInterests =
              profile.public_data?.interests || profile.public_data?.answers?.interests || profile.interests || [];
            const hasMatch = MATCH_STATUS_VALUES.includes(profile.match_status);
            const editingVideo = editingVideoId === profile.id;
            const hasVideo = Boolean(profile.video_url);
            const ytId = getYouTubeId(profile.video_url);
            const mediaError = mediaErrors[profile.id];
            const blocked = blockedMap[profile.id];
            const muted = isMuted(profile.id);

            return (
              <article
                className="love-connection-card"
                key={profile.id}
                style={{ animationDelay: `${Math.min(index, 6) * 70}ms` }}
              >
                <div
                  className={`love-card-stage${editingVideo ? " is-editing" : ""}`}
                  data-profile-id={profile.id}
                  ref={(el) => registerStage(profile.id, el)}
                >
                  <div className="love-card-video-section">
                    {hasVideo && !mediaError ? (
                      ytId ? (
                        <div className="love-yt-wrap">
                          <div id={`love-yt-${profile.id}`} className="love-yt-player" />
                        </div>
                      ) : (
                        <video
                          ref={(el) => {
                            if (el) videoRefs.current[profile.id] = el;
                            else delete videoRefs.current[profile.id];
                          }}
                          src={profile.video_url}
                          muted={muted}
                          loop
                          playsInline
                          preload="metadata"
                          onError={() =>
                            setMediaErrors((current) => ({ ...current, [profile.id]: "This video couldn't be played." }))
                          }
                        />
                      )
                    ) : (
                      <div className="love-video-placeholder">
                        <span>🎬</span>
                        <small>{mediaError || "No video yet"}</small>
                      </div>
                    )}

                    {hasVideo && !mediaError && blocked && (
                      <button type="button" className="love-media-playbtn" onClick={() => playMedia(profile.id)}>
                        ▶ Play
                      </button>
                    )}

                    {hasVideo && !mediaError && !blocked && (
                      <button
                        type="button"
                        className="love-mute-badge"
                        onClick={() => toggleMute(profile.id)}
                        aria-label={muted ? "Unmute video" : "Mute video"}
                        title={muted ? "Muted for autoplay — tap to unmute" : "Sound on — tap to mute"}
                      >
                        {muted ? "🔇" : "🔊"}
                      </button>
                    )}

                    <button type="button" className="love-change-video" onClick={() => openVideoEditor(profile)}>
                      🎥 {editingVideo ? "Close video" : hasVideo ? "Change video" : "Add video"}
                    </button>
                  </div>

                  <div className="love-card-profile-section">
                    <img
                      className="love-card-profile-photo"
                      src={profile.creator_photo_url || "/favicon.ico"}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="love-card-photo-overlay" />
                    <div className="love-card-photo-info">
                      <h2>{profile.creator_name || "Gwamo member"}</h2>
                      <span className="love-card-area">📍 {profile.location || "Location not added"}</span>
                      <span className="love-card-freeday">{freeDay2}</span>
                      {Array.isArray(cardInterests) && cardInterests.length > 0 && (
                        <div className="love-card-interests">
                          {cardInterests.map((key) => (
                            <span
                              className={`love-card-interest${myInterests.includes(key) ? " is-shared" : ""}`}
                              key={key}
                              title={myInterests.includes(key) ? "You both like this" : undefined}
                            >
                              {interestLabel(key)}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="love-card-status-row">
                        {hasMatch ? (
                          <a
                            className="heart-match-status found"
                            href={adminWhatsAppUrl(profile)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Friend match found · Ask admin
                          </a>
                        ) : (
                          <span className="heart-match-status">Looking</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {editingVideo && (
                  <div className="love-video-editor">
                    <div className="love-video-editor-title">
                      <strong>{hasVideo ? "Change this card's video" : "Add this card's video"}</strong>
                      <small>
                        Anyone with the Connect video PIN can add or replace this video. Paste a YouTube link, a direct
                        video link, or upload a file.
                      </small>
                    </div>
                    <label className="love-video-file">
                      <span>{videoFileInput ? `🎬 ${videoFileInput.name}` : "🎬 Upload video"}</span>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(event) => setVideoFileInput(event.target.files?.[0] || null)}
                      />
                    </label>
                    <div className="love-video-or">OR</div>
                    <input
                      className="meet-input"
                      value={videoUrlInput}
                      onChange={(event) => setVideoUrlInput(event.target.value)}
                      placeholder="Paste video or YouTube link"
                    />
                    <input
                      className="meet-input"
                      type="password"
                      value={videoPin}
                      onChange={(event) => {
                        setVideoPin(event.target.value);
                        setShowAskPin(false);
                      }}
                      placeholder="Connect video PIN"
                      inputMode="numeric"
                    />
                    {videoError && <div className="meet-error love-video-error">{videoError}</div>}
                    {videoBusy && videoFileInput && (
                      <div
                        className="love-upload-progress"
                        role="progressbar"
                        aria-valuenow={uploadProgress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div className="love-upload-progress-bar" style={{ width: `${uploadProgress}%` }} />
                        <span className="love-upload-progress-label">{uploadProgress}%</span>
                      </div>
                    )}
                    <button
                      type="button"
                      className="meet-primary love-save-video"
                      onClick={() => saveVideo(profile)}
                      disabled={videoBusy}
                    >
                      {videoBusy
                        ? videoFileInput
                          ? uploadProgress < 100
                            ? `Saving video... ${uploadProgress}%`
                            : "Finishing..."
                          : "Saving video..."
                        : "Save video"}
                    </button>
                    {showAskPin && (
                      <a
                        className="love-ask-pin"
                        href={adminVideoPinWhatsAppUrl(profile)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        💬 Ask admin for the PIN
                      </a>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <MeetSomeoneStyles />
      </section>
    );
  }

  return (
    <section className="meet-someone-panel" style={{ colorScheme: "dark" }}>
      <MeetFixedBar onBack={onBack} />
      {vibeFlashKey > 0 && step === 5 && (
        <div
          key={vibeFlashKey}
          className="meet-vibe-flash"
          style={{ background: `radial-gradient(circle at 50% 45%, ${VIBE_COLORS[vibe] || AMBER}55, transparent 62%)` }}
          aria-hidden="true"
        />
      )}
      {step >= 1 && step <= 8 && (
        <div className="meet-progress" aria-label={`Step ${step} of 8`}>
          {Array.from({ length: 8 }, (_, i) => (
            <span
              key={i}
              className={`meet-progress-dot${i < step ? " is-done" : ""}`}
              style={i < step ? { background: VIBE_COLORS[vibe] || AMBER } : undefined}
            />
          ))}
        </div>
      )}
      {error && <div className="meet-error">{error}</div>}

      {step === 0 && (
        <>
          <div className="meet-kicker">👋 MAKE FRIENDS</div>
          <h1>Your next friend might be nearby.</h1>
          <label className="meet-adult-check">
            <input type="checkbox" checked={adult} onChange={(event) => setAdult(event.target.checked)} />
            <span>I am 18 or older.</span>
          </label>
          <button className="meet-primary" disabled={!adult} onClick={() => setStep(1)}>
            Find a Friend
          </button>
          <p className="meet-fine">Gwamo finds you a friend match when you share a vibe color or an interest.</p>
          <button type="button" className="meet-browse-link" onClick={() => setScreen("browse")}>
            Browse Make Friends →
          </button>
        </>
      )}

      {step === 1 && (
        <>
          <div className="meet-step">Step 1</div>
          <h2>📍 Where are you?</h2>
          <input
            className="meet-input"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="City, district or area"
          />
          <button className="meet-primary" disabled={!location.trim()} onClick={() => setStep(2)}>
            Next
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <div className="meet-step">Step 2</div>
          <h2>About you</h2>
          <p className="meet-lead">Gwamo uses this only so everyone's "who to meet" choice is respected.</p>
          <div className="meet-option-stack">
            {GENDER_CHOICES.map((choice) => (
              <button
                type="button"
                key={choice.key}
                className={`meet-line-option${ownGender === choice.key ? " is-active" : ""}`}
                onClick={() => setOwnGender(choice.key)}
              >
                {choice.label}
              </button>
            ))}
          </div>
          <button className="meet-primary" disabled={!ownGender} onClick={() => setStep(3)}>
            Next
          </button>
        </>
      )}

      {step === 3 && (
        <>
          <div className="meet-step">Step 3</div>
          <h2>👋 Who would you like to meet?</h2>
          <div className="meet-option-stack">
            {PREFERENCE_CHOICES.map((choice) => (
              <button
                type="button"
                key={choice.key}
                className={`meet-line-option${preference === choice.key ? " is-active" : ""}`}
                onClick={() => setPreference(choice.key)}
              >
                {choice.label}
              </button>
            ))}
          </div>
          <button className="meet-primary" disabled={!preference} onClick={() => setStep(4)}>
            Next
          </button>
        </>
      )}

      {step === 4 && (
        <>
          <div className="meet-step">Step 4</div>
          <h2>What are you into?</h2>
          <p className="meet-pick-count">
            Pick up to {MAX_INTERESTS}. {interests.length}/{MAX_INTERESTS} chosen.
          </p>
          <div className="meet-interest-grid">
            {INTERESTS.map((item) => {
              const active = interests.includes(item.key);
              const full = !active && interests.length >= MAX_INTERESTS;
              return (
                <button
                  type="button"
                  key={item.key}
                  className={`meet-line-option${active ? " is-active" : ""}`}
                  onClick={() => toggleInterest(item.key)}
                  disabled={full}
                  aria-pressed={active}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          <button className="meet-primary" disabled={!interests.length} onClick={() => setStep(5)}>
            Next
          </button>
        </>
      )}

      {step === 5 && (
        <>
          <div className="meet-step">Step 5</div>
          <h2>✨ Your vibe today</h2>
          <p className="meet-lead">Pick the color that matches your mood. Same color as someone else? That's a friend match.</p>
          <div className="meet-vibe-row">
            {VIBES.map((item) => (
              <button
                type="button"
                key={item}
                className={`meet-vibe-button${vibe === item ? " is-active" : ""}`}
                onClick={() => pickVibe(item)}
                aria-pressed={vibe === item}
              >
                {item}
              </button>
            ))}
          </div>
          <button className="meet-primary" disabled={!vibe} onClick={() => setStep(6)}>
            Continue
          </button>
        </>
      )}

      {step === 6 && (
        <>
          <div className="meet-step">Quick question 1 of 2</div>
          <h2>Your perfect free day?</h2>
          <div className="meet-option-stack">
            {FREE_DAY_CHOICES.map((item) => (
              <button
                type="button"
                key={item}
                className={`meet-line-option${freeDay === item ? " is-active" : ""}`}
                onClick={() => setFreeDay(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <button className="meet-primary" disabled={!freeDay} onClick={() => setStep(7)}>
            Next
          </button>
        </>
      )}

      {step === 7 && (
        <>
          <div className="meet-step">Quick question 2 of 2</div>
          <h2>What kind of friend are you looking for?</h2>
          <div className="meet-option-stack">
            {LOOKING_FOR_CHOICES.map((item) => (
              <button
                type="button"
                key={item}
                className={`meet-line-option${lookingFor === item ? " is-active" : ""}`}
                onClick={() => setLookingFor(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <button className="meet-primary" disabled={!lookingFor} onClick={() => setStep(8)}>
            Next
          </button>
        </>
      )}

      {step === 8 && (
        <>
          <div className="meet-step">Your profile</div>
          <h2>Create your friend card.</h2>
          <p className="meet-lead">
            Your WhatsApp number and vibe color stay private. Your name, area, interests and free day are shown on the
            public card.
          </p>
          <input
            className="meet-input"
            value={profileName}
            onChange={(event) => setProfileName(event.target.value)}
            placeholder="Your name"
            autoComplete="name"
          />
          <input
            className="meet-input"
            value={whatsapp}
            onChange={(event) => setWhatsapp(event.target.value)}
            placeholder="WhatsApp number"
            inputMode="tel"
            autoComplete="tel"
          />
          <label className="meet-photo-field">
            <span>{photoFile ? `📷 ${photoFile.name}` : "📷 Add your profile photo"}</span>
            <input type="file" accept="image/*" onChange={(event) => setPhotoFile(event.target.files?.[0] || null)} />
          </label>
          <button
            className="meet-primary"
            disabled={busy || !profileName.trim() || !whatsapp.trim() || !photoFile}
            onClick={finishProfile}
          >
            {busy ? "Creating..." : "Create My Friend Card"}
          </button>
        </>
      )}

      {step === 9 && revealPhase === "searching" && (
        <div className="meet-searching" role="status">
          <div className="meet-searching-orbit" aria-hidden="true">
            {VIBES.map((item, i) => (
              <span key={item} className="meet-searching-dot" style={{ background: VIBE_COLORS[item], animationDelay: `${i * 120}ms` }} />
            ))}
          </div>
          <div className="meet-searching-tags" aria-hidden="true">
            {interests.map((key, i) => (
              <span key={key} style={{ animationDelay: `${300 + i * 180}ms` }}>
                {interestLabel(key)}
              </span>
            ))}
          </div>
          <h2>Looking for your people…</h2>
        </div>
      )}

      {step === 9 && revealPhase !== "searching" && orbitData && (
        <div className="meet-orbit-result">
          <OrbitReveal
            people={orbitData.people}
            targetIndex={orbitData.targetIndex}
            centerPhoto={createdProfile?.creator_photo_url}
            onDone={() => setRevealPhase("done")}
          />
          {revealPhase === "done" ? (
            <div className="meet-orbit-caption" role="status">
              <strong>{orbitData.target.creator_name || "Gwamo member"}</strong>
              <span>{orbitData.label}</span>
              {orbitData.target.location && <small>📍 {orbitData.target.location}</small>}
            </div>
          ) : (
            <div className="meet-orbit-caption is-spinning">Finding someone for you…</div>
          )}
          {revealPhase === "done" && (
            <div className="meet-result-card">
              <div className="meet-kicker">YOUR CARD IS LIVE</div>
              <h2>{createdProfile?.creator_name || profileName}, you are now in Gwamo Friends.</h2>
              <p>
                Your status changes from Looking to Friend match found when someone shares your vibe color or one of
                your interests.
              </p>
              <div className="meet-safety">
                🛡️ Safety first: meet new friends in a public place the first time, and tell someone you trust where
                you're going.
              </div>
              <button
                className="meet-primary"
                onClick={() => {
                  setFocusId(orbitData.target.id);
                  setScreen("browse");
                }}
              >
                See {orbitData.target.creator_name || "their"}'s card
              </button>
              <button type="button" className="meet-browse-link" onClick={() => setScreen("browse")}>
                Browse Gwamo Friends →
              </button>
            </div>
          )}
        </div>
      )}

      {step === 9 && revealPhase === "done" && !orbitData && (
        <div className="meet-result-card">
          <div className="meet-confetti" aria-hidden="true">
            {CONFETTI.map((i) => (
              <span
                key={i}
                style={{
                  background: [VIBE_COLORS[vibe] || AMBER, AMBER, TEAL][i % 3],
                  left: `${8 + ((i * 47) % 84)}%`,
                  animationDelay: `${(i % 7) * 60}ms`,
                  "--drift": `${((i % 5) - 2) * 18}px`,
                }}
              />
            ))}
          </div>
          <div className="meet-result-faces" aria-hidden="true">
            <span style={{ background: VIBE_COLORS[vibe] || AMBER }} />
            <span style={{ background: TEAL }} />
          </div>
          {MATCH_STATUS_VALUES.includes(createdProfile?.match_status) ? (
            <div className="meet-kicker">✨ FRIEND MATCH FOUND</div>
          ) : (
            <div className="meet-kicker">YOUR CARD IS LIVE</div>
          )}
          <h2>{createdProfile?.creator_name || profileName}, you are now in Gwamo Friends.</h2>
          <p>
            Your vibe color stays hidden. Your status changes from Looking to Friend match found when someone shares
            your vibe color or one of your interests.
          </p>
          <div className="meet-safety">
            🛡️ Safety first: meet new friends in a public place the first time, and tell someone you trust where
            you're going.
          </div>
          <button className="meet-primary" onClick={() => setScreen("browse")}>
            Browse Gwamo Friends
          </button>
        </div>
      )}

      <MeetSomeoneStyles />
    </section>
  );
}

function MeetSomeoneStyles() {
  return (
    <style>{`
      .meet-someone-panel {
        position: relative;
        width: min(100%, 560px);
        min-height: 100svh;
        margin: 0 auto;
        padding: 14px 16px calc(var(--nav-h, 64px) + 28px);
        color: #f4f6fb;
        background: radial-gradient(circle at 50% -12%, rgba(255,181,71,.12), transparent 34%), #0a0f1c;
        overflow-x: hidden;
      }
      .meet-fixed-bar { position: fixed; left: 50%; top: var(--top-offset, calc(64px + env(safe-area-inset-top))); transform: translateX(-50%); z-index: 20; width: min(100%, 560px); height: 46px; box-sizing: border-box; padding: 0 16px; display: flex; align-items: center; background: #0a0f1c; border-bottom: 1px solid #1c2438; }
      .meet-fixed-bar::-webkit-scrollbar { display: none; }
      .meet-fixed-bar-spacer { height: 46px; }
      .meet-back { min-height: 44px; padding: 0 4px; border: 0; color: rgba(220,230,250,.7); background: transparent; font-weight: 750; font-size: 14px; white-space: nowrap; cursor: pointer; }
      .meet-kicker { margin-bottom: 10px; color: #3dd6c6; font-size: 11px; font-weight: 900; letter-spacing: .16em; }
      .meet-someone-panel h1 { margin: 0 0 10px; font-size: clamp(28px, 8vw, 40px); line-height: 1.06; letter-spacing: -.03em; color: #fff; }
      .meet-someone-panel h2 { margin: 0 0 16px; font-size: clamp(22px, 6.5vw, 30px); line-height: 1.14; color: #fff; }
      .meet-lead { margin: 0 0 20px; color: #9aa6bf; font-size: 14px; line-height: 1.5; }
      .meet-fine { margin-top: 14px; color: rgba(255,255,255,.5); font-size: 11px; line-height: 1.45; text-align: center; }
      .meet-step { margin-bottom: 8px; color: #7ff0e3; font-size: 11px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
      .meet-adult-check { display: flex; align-items: center; gap: 10px; margin: 16px 2px 20px; color: rgba(255,255,255,.78); font-size: 13px; }
      .meet-adult-check input { width: 18px; height: 18px; accent-color: #ffb547; }
      .meet-primary { width: 100%; min-height: 54px; margin-top: 6px; border: 0; border-radius: 16px; color: #1f1400; background: #ffb547; box-shadow: 0 12px 30px rgba(255,181,71,.2); font-weight: 900; font-size: 15px; cursor: pointer; transition: transform .15s ease; }
      .meet-primary:active:not(:disabled) { transform: scale(.98); }
      .meet-primary:disabled { opacity: .36; cursor: not-allowed; box-shadow: none; }
      .meet-browse-link { display: block; width: 100%; margin-top: 16px; padding: 10px 0; border: 0; background: transparent; color: #ffb547; font-size: 12px; font-weight: 800; text-align: center; cursor: pointer; }
      .meet-input { width: 100%; min-height: 54px; margin: 2px 0 10px; padding: 0 16px; box-sizing: border-box; border: 1px solid #26304a; border-radius: 16px; outline: none; color: #fff; background: #131a2b; font-size: 15px; }
      .meet-input:focus { border-color: #ffb547; }
      .meet-photo-field { width: 100%; min-height: 54px; margin: 2px 0 10px; padding: 0 16px; box-sizing: border-box; display: flex; align-items: center; border: 1px dashed rgba(255,181,71,.45); border-radius: 16px; color: rgba(255,255,255,.85); background: rgba(255,181,71,.06); font-size: 14px; font-weight: 750; cursor: pointer; position: relative; }
      .meet-photo-field input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }

      /* Progress dots — fill with the chosen vibe color once picked */
      .meet-progress { display: flex; gap: 6px; margin: 0 0 18px; }
      .meet-progress-dot { flex: 1; height: 5px; border-radius: 999px; background: #1c2438; transition: background .35s ease; }
      .meet-progress-dot.is-done { animation: meetDotFill .35s ease both; }
      @keyframes meetDotFill { from { transform: scaleX(.3); opacity: .4; } to { transform: scaleX(1); opacity: 1; } }

      /* Vibe step */
      .meet-vibe-row { display: grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap: 7px; margin: 16px 0 6px; }
      .meet-vibe-button { aspect-ratio: 1; display: grid; place-items: center; border: 1px solid #1c2438; border-radius: 18px; background: #131a2b; font-size: clamp(28px, 9vw, 43px); cursor: pointer; transition: transform .2s ease; }
      .meet-vibe-button.is-active { transform: translateY(-4px) scale(1.06); background: #1a2338; box-shadow: 0 12px 30px rgba(0,0,0,.32); animation: meetPop .35s cubic-bezier(.3,1.6,.5,1); }
      .meet-vibe-flash { position: fixed; inset: 0; z-index: 1; pointer-events: none; animation: meetVibeFlash .9s ease-out forwards; }
      @keyframes meetVibeFlash { 0% { opacity: 0; } 25% { opacity: 1; } 100% { opacity: 0; } }

      /* Interests */
      .meet-pick-count { margin: -8px 0 14px; color: #9aa6bf; font-size: 12px; }
      .meet-interest-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 9px; margin-bottom: 6px; }
      .meet-interest-grid .meet-line-option:disabled { opacity: .38; cursor: not-allowed; }
      .meet-interest-grid .meet-line-option.is-active { animation: meetPop .35s cubic-bezier(.3,1.6,.5,1); }
      @keyframes meetPop { 0% { transform: scale(.92); } 60% { transform: scale(1.05); } 100% { transform: scale(1); } }

      .meet-option-stack { display: flex; flex-direction: column; gap: 9px; margin-bottom: 6px; }
      .meet-line-option { position: relative; z-index: 2; width: 100%; min-height: 52px; padding: 0 16px; border: 1px solid #26304a; border-radius: 16px; color: rgba(255,255,255,.92); background: #131a2b; text-align: left; font-weight: 750; font-size: 14px; cursor: pointer; transition: border-color .2s ease, background .2s ease; }
      .meet-line-option.is-active { border-color: #ffb547; background: rgba(255,181,71,.12); color: #fff; }
      .meet-error { margin: 0 0 14px; padding: 11px 13px; border: 1px solid rgba(255,95,115,.35); border-radius: 13px; color: #ffd6dd; background: rgba(93,16,34,.46); font-size: 12px; }

      /* "Looking for your people..." */
      .meet-searching { min-height: 380px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 22px; text-align: center; }
      .meet-searching h2 { margin: 0 !important; animation: meetFadeUp .5s ease both; }
      .meet-searching-orbit { display: flex; gap: 10px; }
      .meet-searching-dot { width: 26px; height: 26px; border-radius: 50%; animation: meetBounce 1s ease-in-out infinite; }
      @keyframes meetBounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
      .meet-searching-tags { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
      .meet-searching-tags span { padding: 7px 12px; border-radius: 999px; background: rgba(61,214,198,.14); color: #7ff0e3; font-size: 13px; font-weight: 800; animation: meetFadeUp .45s ease both; }
      @keyframes meetFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

      /* Orbit reveal */
      .meet-orbit-result { display: flex; flex-direction: column; gap: 14px; }
      .orbit-stage { position: relative; height: 300px; margin: 0 -8px; overflow: visible; }
      .orbit-center { position: absolute; left: 50%; top: 50%; z-index: 50; width: 118px; height: 118px; transform: translate(-50%, -50%); border-radius: 50%; padding: 4px; box-sizing: border-box; background: conic-gradient(#ffb547, #3dd6c6, #ffb547); box-shadow: 0 0 40px rgba(255,181,71,.25); }
      .orbit-center img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block; border: 3px solid #0a0f1c; box-sizing: border-box; background: #131a2b; }
      .orbit-face { position: absolute; left: 50%; top: 50%; width: 78px; height: 78px; transform: translate(-50%, -50%); will-change: transform, opacity, filter; }
      .orbit-face img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block; border: 3px solid #26304a; box-sizing: border-box; background: #131a2b; transition: transform .5s cubic-bezier(.3,1.5,.5,1), border-color .4s ease, box-shadow .4s ease; }
      .orbit-face.is-picked img { transform: scale(1.3); border-color: #3dd6c6; box-shadow: 0 0 0 4px rgba(61,214,198,.25), 0 0 34px rgba(61,214,198,.75); }
      .orbit-stage.is-landed .orbit-face:not(.is-picked) { opacity: .35 !important; transition: opacity .5s ease; }
      .meet-orbit-caption { display: flex; flex-direction: column; align-items: center; gap: 4px; min-height: 64px; text-align: center; animation: meetFadeUp .45s ease both; }
      .meet-orbit-caption strong { font-size: 22px; color: #fff; }
      .meet-orbit-caption span { padding: 5px 12px; border-radius: 999px; background: #3dd6c6; color: #04211f; font-size: 13px; font-weight: 800; }
      .meet-orbit-caption small { color: #9aa6bf; font-size: 12px; }
      .meet-orbit-caption.is-spinning { justify-content: center; color: #9aa6bf; font-size: 14px; font-weight: 700; }

      /* Result */
      .meet-result-card { position: relative; overflow: hidden; margin-top: 12px; padding: 22px; border: 1px solid #26304a; border-radius: 24px; background: #131a2b; animation: meetFadeUp .45s ease both; }
      .meet-result-faces { display: flex; margin-bottom: 14px; }
      .meet-result-faces span { width: 52px; height: 52px; border-radius: 50%; border: 3px solid #131a2b; }
      .meet-result-faces span:first-child { animation: meetMeetLeft .6s cubic-bezier(.3,1.4,.5,1) both; }
      .meet-result-faces span:last-child { margin-left: -14px; animation: meetMeetRight .6s cubic-bezier(.3,1.4,.5,1) both; }
      @keyframes meetMeetLeft { from { transform: translateX(-40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      @keyframes meetMeetRight { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      .meet-confetti { position: absolute; inset: 0; pointer-events: none; }
      .meet-confetti span { position: absolute; top: -12px; width: 8px; height: 12px; border-radius: 2px; opacity: 0; animation: meetConfetti 1.6s ease-out forwards; }
      @keyframes meetConfetti { 0% { opacity: 1; transform: translate(0, 0) rotate(0deg); } 100% { opacity: 0; transform: translate(var(--drift, 0px), 320px) rotate(540deg); } }
      .meet-result-card p { color: #c9d2e4; line-height: 1.5; }
      .meet-safety { margin: 14px 0 8px; padding: 11px 13px; border: 1px solid rgba(61,214,198,.25); border-radius: 13px; background: rgba(61,214,198,.08); color: #d9f7f3; font-size: 12px; line-height: 1.45; }

      .meet-browse-empty { min-height: 140px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 24px; border: 1px dashed #26304a; border-radius: 22px; color: #9aa6bf; background: #131a2b; text-align: center; font-size: 12px; }
      .meet-browse-empty strong { color: #fff; font-size: 15px; }

      /* --- Browse heading row --- */
      .meet-browse-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
      .meet-add-yours { flex: 0 0 auto; min-height: 40px; padding: 0 14px; border: 0; border-radius: 999px; color: #1f1400; background: #ffb547; font-size: 12px; font-weight: 900; cursor: pointer; white-space: nowrap; }

      /* --- "New today" faces row --- */
      .friend-faces { margin: -4px 0 6px; }
      .friend-faces-label { margin-bottom: 8px; color: #7ff0e3; font-size: 11px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
      .friend-faces-row { display: flex; gap: 12px; overflow-x: auto; padding: 4px 2px 8px; scrollbar-width: none; }
      .friend-faces-row::-webkit-scrollbar { display: none; }
      .friend-face { position: relative; flex: 0 0 auto; width: 66px; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 0; border: 0; background: transparent; color: #c9d2e4; cursor: pointer; }
      .friend-face-ring { position: absolute; top: 0; left: 0; width: 66px; height: 66px; border-radius: 50%; background: conic-gradient(#ffb547, #3dd6c6, #ffb547); animation: friendRing 6s linear infinite; }
      @keyframes friendRing { to { transform: rotate(360deg); } }
      .friend-face img { position: relative; width: 60px; height: 60px; margin-top: 3px; border-radius: 50%; object-fit: cover; border: 3px solid #0a0f1c; box-sizing: border-box; background: #131a2b; }
      .friend-face-name { max-width: 66px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; font-weight: 700; }

      /* --- Friend card: two trading panels (video / profile photo) --- */
      .love-card-list { display: grid; gap: 18px; margin-top: 18px; }
      .love-connection-card { overflow: hidden; border: 1px solid #26304a; border-radius: 26px; background: #131a2b; box-shadow: 0 10px 24px rgba(0,0,0,.28); animation: friendCardIn .5s ease both; scroll-snap-align: start; scroll-margin-top: calc(var(--top-offset, 64px) + 54px); }
      .meet-browse-heading { scroll-snap-align: start; scroll-margin-top: calc(var(--top-offset, 64px) + 60px); }
      @keyframes friendCardIn { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
      /* Exactly one card fills the space between the Back bar and the bottom tabs */
      .love-card-stage { position: relative; width: 100%; height: calc(100svh - var(--top-offset, 64px) - 46px - var(--nav-h, 64px) - 16px); min-height: 340px; overflow: hidden; background: #05070d; }
      @supports (height: 100dvh) {
        .love-card-stage { height: calc(100dvh - var(--top-offset, 64px) - 46px - var(--nav-h, 64px) - 16px); }
      }
      .love-card-video-section { position: absolute; top: 0; left: 0; right: 0; height: 55%; overflow: hidden; z-index: 1; background: #05070d; animation: loveVideoTrade 12s ease-in-out infinite; transition: height .4s ease; }
      .love-card-video-section video { width: 100%; height: 100%; display: block; object-fit: cover; background: #000; }
      .love-video-placeholder { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px; color: rgba(255,255,255,.45); background: #0d1324; }
      .love-video-placeholder span { font-size: 30px; }
      .love-video-placeholder small { font-size: 10px; font-weight: 800; text-align: center; padding: 0 12px; }
      .love-change-video { position: absolute; right: 10px; bottom: 10px; min-height: 36px; padding: 0 12px; border: 1px solid rgba(255,255,255,.20); border-radius: 999px; color: #fff; background: rgba(3,7,15,.78); backdrop-filter: blur(10px); font-size: 10px; font-weight: 900; z-index: 3; cursor: pointer; }
      .love-yt-wrap { position: absolute; inset: 0; }
      .love-yt-wrap [id^="love-yt-"] { position: absolute !important; inset: 0 !important; width: 100% !important; height: 100% !important; border: 0; }
      .love-media-playbtn { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); z-index: 4; display: flex; align-items: center; gap: 6px; padding: 10px 16px; border: 1px solid rgba(255,255,255,.35); border-radius: 999px; color: #fff; background: rgba(3,7,15,.72); backdrop-filter: blur(8px); font-size: 12px; font-weight: 900; cursor: pointer; }
      .love-mute-badge { position: absolute; top: 12px; right: 12px; z-index: 4; width: 46px; height: 46px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 1px solid rgba(61,214,198,.55); background: rgba(4,10,20,.55); backdrop-filter: blur(3px); font-size: 20px; line-height: 1; color: #fff; cursor: pointer; box-shadow: 0 0 14px rgba(61,214,198,.35); }
      .love-card-profile-section { position: absolute; left: 0; right: 0; bottom: 0; height: 45%; overflow: hidden; z-index: 2; animation: loveProfileTrade 12s ease-in-out infinite; transition: height .4s ease; }
      .love-card-profile-photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
      .love-card-photo-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(6,9,18,.95) 0%, rgba(6,9,18,.6) 34%, rgba(6,9,18,.08) 64%, rgba(6,9,18,0) 80%); pointer-events: none; }
      .love-card-photo-info { position: absolute; left: 0; right: 0; bottom: 0; padding: 18px 16px 15px; display: flex; flex-direction: column; gap: 4px; z-index: 2; }
      .love-card-photo-info h2 { margin: 0 0 2px !important; color: #fff; font-size: 22px !important; text-shadow: 0 2px 12px rgba(0,0,0,.6), 0 0 18px rgba(255,181,71,.35); }
      .love-card-area, .love-card-freeday { color: #dfe6f3; font-size: 12.5px; text-shadow: 0 1px 6px rgba(0,0,0,.7); }
      .love-card-interests { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 4px; }
      .love-card-interest { padding: 4px 10px; border-radius: 999px; color: #ffe2b0; background: rgba(255,181,71,.18); backdrop-filter: blur(6px); font-size: 11px; font-weight: 800; box-shadow: inset 0 0 0 1px rgba(255,181,71,.3); }
      .love-card-interest.is-shared { color: #04211f; background: #3dd6c6; box-shadow: none; animation: friendSharedGlow 1.2s ease-in-out 2; }
      @keyframes friendSharedGlow { 0%,100% { box-shadow: 0 0 0 rgba(61,214,198,0); } 50% { box-shadow: 0 0 18px rgba(61,214,198,.9); } }
      .love-card-status-row { margin-top: 7px; }
      /* Smooth both ways: video, fade to photo, hold, fade back to video */
      @keyframes loveVideoTrade {
        0%, 40%   { height: 100%; }
        50%, 90%  { height: 0%; }
        100%      { height: 100%; }
      }
      @keyframes loveProfileTrade {
        0%, 40%   { height: 0%; }
        50%, 90%  { height: 100%; }
        100%      { height: 0%; }
      }
      /* Pause the takeover while any viewer is editing this card's video (upload/link/PIN) */
      .love-card-stage.is-editing .love-card-video-section { animation: none; height: 55%; }
      .love-card-stage.is-editing .love-card-profile-section { animation: none; height: 45%; }
      .heart-match-status { width: fit-content; display: inline-flex; align-items: center; min-height: 30px; padding: 0 12px; border-radius: 999px; color: #fff; background: rgba(255,255,255,.16); backdrop-filter: blur(6px); font-size: 11px; font-weight: 900; text-decoration: none; box-shadow: inset 0 0 0 1px rgba(255,255,255,.25); }
      .heart-match-status.found { color: #04211f; background: #3dd6c6; box-shadow: 0 0 18px rgba(61,214,198,.45); }
      .love-video-editor { margin: 0 14px 14px; padding: 14px; border: 1px solid #26304a; border-radius: 18px; background: #0d1324; }
      .love-video-editor-title { display: flex; flex-direction: column; gap: 3px; margin-bottom: 11px; }
      .love-video-editor-title strong { font-size: 13px; }
      .love-video-editor-title small { color: #9aa6bf; font-size: 10px; }
      .love-video-file { min-height: 48px; display: flex; align-items: center; padding: 0 13px; border: 1px dashed rgba(255,181,71,.45); border-radius: 14px; color: #ffe2b0; background: rgba(255,181,71,.06); font-size: 11px; font-weight: 850; cursor: pointer; position: relative; margin-bottom: 8px; }
      .love-video-file input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
      .love-video-or { margin: 8px 0; color: rgba(255,255,255,.35); font-size: 9px; font-weight: 900; text-align: center; }
      .love-save-video { min-height: 48px; margin-top: 4px; }
      .love-ask-pin { min-height: 44px; margin-top: 8px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(80,215,126,.35); border-radius: 14px; color: #bff5cf; background: rgba(24,92,50,.32); font-size: 11px; font-weight: 900; text-decoration: none; }
      .love-video-error { margin-top: 3px; margin-bottom: 8px; }
      .love-upload-progress { position: relative; height: 22px; margin-top: 6px; border-radius: 999px; overflow: hidden; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.10); }
      .love-upload-progress-bar { height: 100%; border-radius: 999px; background: linear-gradient(90deg,#3dd6c6,#ffb547); transition: width .2s ease; }
      .love-upload-progress-label { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 10px; font-weight: 900; text-shadow: 0 1px 3px rgba(0,0,0,.6); }

      @media (prefers-reduced-motion: reduce) {
        .love-card-video-section, .love-card-profile-section { animation: none !important; transition: none !important; }
        .love-card-video-section { height: 55%; }
        .love-card-profile-section { height: 45%; }
        .love-connection-card, .friend-face-ring, .love-card-interest.is-shared,
        .meet-vibe-flash, .meet-progress-dot.is-done, .meet-vibe-button.is-active,
        .meet-interest-grid .meet-line-option.is-active, .meet-result-card,
        .meet-result-faces span, .meet-searching h2, .meet-orbit-caption, .meet-searching-dot, .meet-searching-tags span { animation: none !important; }
        .meet-confetti { display: none; }
      }

      @media (max-width: 390px) {
        .meet-someone-panel { padding-left: 12px; padding-right: 12px; }
        .meet-fixed-bar { padding-left: 12px; padding-right: 12px; }
      }
    `}</style>
  );
}

export default function SocialLifeLanding() {
  const [view, setView] = useState("romantic");
  const [meetScreen, setMeetScreen] = useState("play");

  function showRomanticStories() {
    setView("romantic");
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0 }));
  }

  function showMeetSomeone(screen = "play") {
    setMeetScreen(screen);
    setView("meet");
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0 }));
  }

  if (view === "meet") {
    return <MeetSomeoneGame onBack={showRomanticStories} initialScreen={meetScreen} />;
  }

  return (
    <RomanticStories
      onPlayMatchGame={() => showMeetSomeone("play")}
      onBrowseMeetSomeone={() => showMeetSomeone("browse")}
    />
  );
}