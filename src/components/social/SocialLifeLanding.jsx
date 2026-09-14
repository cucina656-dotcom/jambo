import { useEffect, useRef, useState } from "react";
import RomanticStories from "./RomanticStories";

// Meet Someone — adapted from the original Connect "LoveGame"/"BrowseLove" flow,
// wired in under Social Life > Meet Someone.
//
// IMPORTANT: the Match Game itself (steps 0-8 below: adult confirm, location,
// gender, preference, heart, free day, matters-most, profile, result) is
// UNCHANGED from the previous version of this file — including the gender
// question, the Mr/Miss wording, the matching rules sent to the backend, the
// owner token, and the API calls. Only the Browse experience was rewritten.
//
// What Browse restores from the original design:
//   1. Every card is a tall (3:4) "living" connection card with TWO trading
//      sections — a video section (top, ~55%) and the person's profile photo
//      (bottom, ~45%). The photo never disappears just because a video
//      exists — see .love-card-video-section / .love-card-profile-section.
//   2. The two sections automatically and smoothly trade space on a ~9s
//      cycle (video shrinks to 0%, photo grows to 100%, then back), using
//      the loveVideoTrade / loveProfileTrade CSS animations — paused
//      automatically for anyone with prefers-reduced-motion, and paused
//      while that card's video editor is open.
//   3. Only the single most-visible card's video plays (muted) at a time;
//      scrolling it away pauses it, the next visible card's video plays.
//      The tab going to background pauses whatever's active; coming back
//      resumes it. Leaving Browse tears everything down.
//   4. Videos can be a direct file/link or a YouTube link (played through
//      the real YouTube IFrame API so it can be muted/played/paused
//      programmatically) — YouTube players for cards below the fold mount
//      lazily as they scroll near view, so a long feed doesn't pay for
//      every embed up front.
//   5. Every card has "Add video" / "Change video". Saving a video always
//      requires the Connect video PIN (CONNECT_VIDEO_PIN) — sent to the
//      Worker via the `X-Connect-Video-Pin` header on PATCH
//      /api/connect/video, and as a `pin` form field on the /api/connect/
//      upload (kind: "video") call. The PIN is never checked in the
//      frontend — the Worker is what accepts or rejects it. Wrong PIN shows
//      "Ask for PIN", which opens WhatsApp to the admin with the profile ID.
//      Creating a normal Meet Someone profile never asks for this PIN —
//      only video add/change does, so it can't be used to bypass it.

const CONNECT_API_URL = "https://kitchenbrain.cucina656.workers.dev";
const LOVE_OWNER_KEY = "gwamo_connect_love_owner";
const ADMIN_WHATSAPP = "250788484446";
const HEARTS = ["💛", "🧡", "💚", "💙", "💜"];

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
  const text = `Hello Gwamo Admin,\nI want to view my heart match.\nProfile: ${profile?.creator_name || "Meet Someone"}\nProfile ID: ${profile?.id || ""}`;
  return `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(text)}`;
}

function adminVideoPinWhatsAppUrl(profile) {
  const text = `Hello Gwamo Admin, I need the Connect video PIN for a Meet Someone card. Profile: ${profile?.creator_name || ""}. Profile ID: ${profile?.id || ""}`;
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

// Own gender / preference choices — plain text, exactly two each, no "other"
// catch-all. The internal `key` stays "woman"/"man" (that's the value sent to
// the backend — see the Worker's LOVE_GENDERS set); only the visible label
// changed to "Miss"/"Mr". UNCHANGED from the previous version of this file.
const GENDER_CHOICES = [
  { key: "woman", label: "Miss" },
  { key: "man", label: "Mr" },
];

const PREFERENCE_CHOICES = [
  { key: "woman", label: "Miss" },
  { key: "man", label: "Mr" },
];

// The Back control, fixed above the scrolling background instead of scrolling
// away with the page — same treatment as the Connect screen's fixed CTA bar.
// UNCHANGED from the previous version of this file.
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
  const [heart, setHeart] = useState("");
  const [freeDay, setFreeDay] = useState("");
  const [matters, setMatters] = useState("");
  const [profileName, setProfileName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [createdProfile, setCreatedProfile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
        if (live) setBrowseError(err.message || "Could not load Gwamo Connections.");
      })
      .finally(() => {
        if (live) setBrowseBusy(false);
      });
    return () => {
      live = false;
    };
  }, [screen]);

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

  // Sound on/off badge — the "mic sign" toggle. Every card starts muted (that's
  // what lets it autoplay at all); tapping the badge lets that one viewer turn
  // that one card's sound on.
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
  // speed; the rest mount lazily as they scroll near the viewport so a long
  // feed doesn't pay for every YouTube embed up front.
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

  // Leaving Meet Someone entirely: stop everything and free the YouTube players.
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
    };
  }, []);

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
          // Both fields below are required for gender-aware matching.
          // MATCHING NOTE (backend): two profiles must never be matched if they
          // report the same gender — unconditionally, with no opt-out, since
          // neither step here has an "other"/opt-out choice. (The Worker patch
          // sent earlier has a now fully unreachable "Open to Neither" bypass
          // around this check — harmless dead code, safe to delete whenever
          // convenient.)
          gender: ownGender,
          preference,
          heart,
          photo_url: photo.url,
          photo_key: photo.key,
          // Note: a video is intentionally NOT part of normal profile creation.
          // Adding/changing a card's video always goes through "Add video" /
          // "Change video" in Browse, which requires the Connect video PIN —
          // letting this form set a video directly would bypass that.
          answers: { perfect_free_day: freeDay, matters_most: matters },
        }),
      });
      rememberLoveOwner(data.profile?.id, data.owner_token);
      setCreatedProfile(data.profile || null);
      setStep(8);
    } catch (err) {
      setError(err.message || "Could not create your connection card.");
    } finally {
      setBusy(false);
    }
  }

  if (screen === "browse") {
    return (
      <section className="meet-someone-panel" style={{ colorScheme: "dark" }}>
        <MeetFixedBar onBack={() => setScreen("play")} />
        <div className="meet-browse-heading">
          <div>
            <div className="meet-kicker">❤️ GWAMO CONNECTIONS</div>
            <h1>Browse Meet Someone</h1>
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
        <p className="meet-lead">Public cards show the person, area, perfect free day and heart-match status.</p>

        {browseError && <div className="meet-error">{browseError}</div>}
        {browseBusy && <div className="meet-browse-empty">Loading connections...</div>}
        {!browseBusy && !browseError && !items.length && (
          <div className="meet-browse-empty">
            <strong>No connection cards yet.</strong>
            <span>Be the first person to join Meet Someone.</span>
          </div>
        )}

        <div className="love-card-list">
          {items.map((profile) => {
            const freeDay2 =
              profile.public_data?.perfect_free_day ||
              profile.public_data?.answers?.perfect_free_day ||
              "Not added";
            const hasMatch = profile.match_status === "View heart match";
            const editingVideo = editingVideoId === profile.id;
            const hasVideo = Boolean(profile.video_url);
            const ytId = getYouTubeId(profile.video_url);
            const mediaError = mediaErrors[profile.id];
            const blocked = blockedMap[profile.id];
            const muted = isMuted(profile.id);

            return (
              <article className="love-connection-card" key={profile.id}>
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
                      <div className="love-card-status-row">
                        {hasMatch ? (
                          <a
                            className="heart-match-status found"
                            href={adminWhatsAppUrl(profile)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View heart match
                          </a>
                        ) : (
                          <span className="heart-match-status">Waiting</span>
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
      {error && <div className="meet-error">{error}</div>}

      {step === 0 && (
        <>
          <div className="meet-kicker">❤️ MEET SOMEONE</div>
          <h1>Maybe somebody is looking for someone like you.</h1>
          <label className="meet-adult-check">
            <input type="checkbox" checked={adult} onChange={(event) => setAdult(event.target.checked)} />
            <span>I am 18 or older.</span>
          </label>
          <button className="meet-primary" disabled={!adult} onClick={() => setStep(1)}>
            Play the Match Game
          </button>
          <p className="meet-fine">Your heart choice is the only thing Gwamo uses to find a heart match.</p>
          <button type="button" className="meet-browse-link" onClick={() => setScreen("browse")}>
            Browse Meet Someone →
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
          <h2>About you — what's your gender?</h2>
          <p className="meet-lead">Gwamo uses this only to keep your matches accurate.</p>
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
          <h2>❤️ Who would you like to meet?</h2>
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
          <h2>Choose the heart that feels like you today.</h2>
          <p className="meet-lead">This heart alone decides your heart match.</p>
          <div className="meet-heart-row">
            {HEARTS.map((item) => (
              <button
                type="button"
                key={item}
                className={`meet-heart-button${heart === item ? " is-active" : ""}`}
                onClick={() => setHeart(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <button className="meet-primary" disabled={!heart} onClick={() => setStep(5)}>
            Continue
          </button>
        </>
      )}

      {step === 5 && (
        <>
          <div className="meet-step">Quick question 1 of 2</div>
          <h2>Your perfect free day?</h2>
          <div className="meet-option-stack">
            {["🌳 Outside", "🎵 Music", "🍽️ Food together", "🎬 Relaxing", "🚶 Walking"].map((item) => (
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
          <button className="meet-primary" disabled={!freeDay} onClick={() => setStep(6)}>
            Next
          </button>
        </>
      )}

      {step === 6 && (
        <>
          <div className="meet-step">Quick question 2 of 2</div>
          <h2>What matters most to you?</h2>
          <div className="meet-option-stack">
            {["❤️ Love", "🤝 Trust", "😂 Fun", "💬 Good conversation", "🏠 Building a future"].map((item) => (
              <button
                type="button"
                key={item}
                className={`meet-line-option${matters === item ? " is-active" : ""}`}
                onClick={() => setMatters(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <button className="meet-primary" disabled={!matters} onClick={() => setStep(7)}>
            Next
          </button>
        </>
      )}

      {step === 7 && (
        <>
          <div className="meet-step">Your profile</div>
          <h2>Create your connection card.</h2>
          <p className="meet-lead">Your WhatsApp number and heart stay private. They are not shown on the public card.</p>
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
            {busy ? "Creating..." : "Create My Connection Card"}
          </button>
        </>
      )}

      {step === 8 && (
        <div className="meet-result-card">
          <div className="meet-result-symbol">❤️</div>
          <div className="meet-kicker">YOUR CARD IS LIVE</div>
          <h2>{createdProfile?.creator_name || profileName}, you are now in Gwamo Connections.</h2>
          <p>Your heart stays hidden. Your public status changes from Waiting to View heart match when another active profile has the same heart.</p>
          <button className="meet-primary" onClick={() => setScreen("browse")}>
            Browse Gwamo Connections
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
        width: min(100%, 560px);
        min-height: 100svh;
        margin: 0 auto;
        padding: calc(150px + env(safe-area-inset-top)) 16px calc(42px + env(safe-area-inset-bottom));
        color: #f7fbff;
        background: radial-gradient(circle at 50% -12%, rgba(255,86,140,.16), transparent 34%), #020711;
      }
      .meet-fixed-bar { position: fixed; left: 50%; top: calc(124px + env(safe-area-inset-top)); transform: translateX(-50%); z-index: 20; width: min(100%, 560px); box-sizing: border-box; padding: 8px 16px; overflow-x: auto; overflow-y: hidden; scrollbar-width: none; background: linear-gradient(180deg, rgba(2,7,17,.92) 70%, transparent); backdrop-filter: blur(10px); }
      .meet-fixed-bar::-webkit-scrollbar { display: none; }
      .meet-fixed-bar-spacer { height: 46px; }
      .meet-back { padding: 8px 0; border: 0; color: rgba(220,236,250,.68); background: transparent; font-weight: 750; font-size: 14px; white-space: nowrap; cursor: pointer; }
      .meet-kicker { margin-bottom: 10px; color: #ff86a6; font-size: 11px; font-weight: 900; letter-spacing: .16em; }
      .meet-someone-panel h1 { margin: 0 0 10px; font-size: clamp(28px, 8vw, 40px); line-height: 1.06; letter-spacing: -.03em; color: #fff; }
      .meet-someone-panel h2 { margin: 0 0 16px; font-size: clamp(22px, 6.5vw, 30px); line-height: 1.14; color: #fff; }
      .meet-lead { margin: 0 0 20px; color: rgba(230,239,249,.70); font-size: 14px; line-height: 1.5; }
      .meet-fine { margin-top: 14px; color: rgba(255,255,255,.42); font-size: 11px; line-height: 1.45; text-align: center; }
      .meet-step { margin-bottom: 8px; color: rgba(255,134,166,.75); font-size: 11px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
      .meet-adult-check { display: flex; align-items: center; gap: 10px; margin: 16px 2px 20px; color: rgba(255,255,255,.76); font-size: 13px; }
      .meet-adult-check input { width: 18px; height: 18px; accent-color: #e83670; }
      .meet-primary { width: 100%; min-height: 54px; margin-top: 6px; border: 1px solid rgba(255,95,147,.5); border-radius: 16px; color: #fff; background: linear-gradient(135deg, #e83670, #b62358); box-shadow: 0 12px 30px rgba(232,54,112,.22); font-weight: 900; font-size: 15px; cursor: pointer; }
      .meet-primary:disabled { opacity: .36; cursor: not-allowed; box-shadow: none; }
      .meet-browse-link { display: block; width: 100%; margin-top: 16px; padding: 10px 0; border: 0; background: transparent; color: #87dcff; font-size: 12px; font-weight: 800; text-align: center; cursor: pointer; }
      .meet-input { width: 100%; min-height: 54px; margin: 2px 0 10px; padding: 0 16px; border: 1px solid rgba(145,188,235,.20); border-radius: 16px; outline: none; color: #fff; background: rgba(3,12,27,.80); font-size: 15px; }
      .meet-photo-field { width: 100%; min-height: 54px; margin: 2px 0 10px; padding: 0 16px; display: flex; align-items: center; border: 1px dashed rgba(255,119,160,.42); border-radius: 16px; color: rgba(255,255,255,.82); background: rgba(30,8,21,.58); font-size: 14px; font-weight: 750; cursor: pointer; position: relative; }
      .meet-photo-field input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
      .meet-heart-row { display: grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap: 7px; margin: 16px 0 6px; }
      .meet-heart-button { aspect-ratio: 1; display: grid; place-items: center; border: 1px solid rgba(255,255,255,.08); border-radius: 18px; background: rgba(255,255,255,.035); font-size: clamp(28px, 9vw, 43px); cursor: pointer; }
      .meet-heart-button.is-active { transform: translateY(-4px) scale(1.04); background: rgba(255,255,255,.08); box-shadow: 0 12px 30px rgba(0,0,0,.32), 0 0 24px rgba(255,90,145,.12); }
      .meet-option-stack { display: flex; flex-direction: column; gap: 9px; margin-bottom: 6px; }
      .meet-line-option { width: 100%; min-height: 52px; padding: 0 16px; border: 1px solid rgba(153,190,229,.14); border-radius: 16px; color: rgba(255,255,255,.90); background: rgba(8,22,44,.72); text-align: left; font-weight: 750; font-size: 14px; cursor: pointer; }
      .meet-line-option.is-active { border-color: rgba(255,95,147,.7); background: rgba(70,17,39,.68); }
      .meet-error { margin: 0 0 14px; padding: 11px 13px; border: 1px solid rgba(255,95,115,.35); border-radius: 13px; color: #ffd6dd; background: rgba(93,16,34,.46); font-size: 12px; }
      .meet-result-card { margin-top: 12px; padding: 22px; border: 1px solid rgba(255,106,151,.22); border-radius: 24px; background: radial-gradient(circle at top right, rgba(255,78,137,.18), transparent 34%), linear-gradient(145deg, rgba(43,13,31,.86), rgba(9,9,23,.94)); }
      .meet-result-symbol { margin-bottom: 10px; font-size: 48px; }
      .meet-browse-empty { min-height: 140px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 24px; border: 1px dashed rgba(255,255,255,.12); border-radius: 22px; color: rgba(255,255,255,.52); background: rgba(255,255,255,.025); text-align: center; font-size: 12px; }
      .meet-browse-empty strong { color: #fff; font-size: 15px; }

      /* --- Browse heading row --- */
      .meet-browse-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
      .meet-add-yours { flex: 0 0 auto; min-height: 38px; padding: 0 14px; border: 1px solid rgba(86,183,255,.35); border-radius: 999px; color: #bce4ff; background: rgba(86,183,255,.10); font-size: 11.5px; font-weight: 900; cursor: pointer; white-space: nowrap; }

      /* --- Meet Someone connection card: two trading panels (video / profile photo) --- */
      .love-card-list { display: grid; gap: 18px; margin-top: 18px; }
      .love-connection-card { overflow: hidden; border: 1px solid rgba(255,109,153,.22); border-radius: 26px; background: linear-gradient(160deg, rgba(35,12,28,.96), rgba(5,12,27,.98)); box-shadow: 0 20px 46px rgba(0,0,0,.32); }
      .love-card-stage { position: relative; width: 100%; aspect-ratio: 3/4; min-height: 360px; max-height: 640px; overflow: hidden; background: #05070d; }
      .love-card-video-section { position: absolute; top: 0; left: 0; right: 0; height: 55%; overflow: hidden; z-index: 1; background: #05070d; animation: loveVideoTrade 9s ease-in-out infinite; transition: height .4s ease; }
      .love-card-video-section video { width: 100%; height: 100%; display: block; object-fit: cover; background: #000; }
      .love-video-placeholder { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px; color: rgba(255,255,255,.42); background: #070a11; }
      .love-video-placeholder span { font-size: 30px; }
      .love-video-placeholder small { font-size: 10px; font-weight: 800; text-align: center; padding: 0 12px; }
      .love-change-video { position: absolute; right: 10px; bottom: 10px; min-height: 36px; padding: 0 12px; border: 1px solid rgba(255,255,255,.20); border-radius: 999px; color: #fff; background: rgba(3,7,15,.78); backdrop-filter: blur(10px); font-size: 10px; font-weight: 900; z-index: 3; cursor: pointer; }
      .love-yt-wrap { position: absolute; inset: 0; }
      .love-yt-wrap [id^="love-yt-"] { position: absolute !important; inset: 0 !important; width: 100% !important; height: 100% !important; border: 0; }
      .love-media-error { position: absolute; left: 10px; right: 10px; top: 10px; z-index: 4; padding: 8px 12px; border-radius: 12px; color: #ffd6dd; background: rgba(93,16,34,.82); backdrop-filter: blur(6px); font-size: 11px; font-weight: 750; }
      .love-media-playbtn { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); z-index: 4; display: flex; align-items: center; gap: 6px; padding: 10px 16px; border: 1px solid rgba(255,255,255,.35); border-radius: 999px; color: #fff; background: rgba(3,7,15,.72); backdrop-filter: blur(8px); font-size: 12px; font-weight: 900; cursor: pointer; }
      /* Sound is muted for autoplay (browsers require it) — a centered neon badge makes that obvious and lets a tap unmute. */
      .love-mute-badge { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); z-index: 4; width: 54px; height: 54px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 1px solid rgba(120,240,255,.55); background: rgba(4,10,20,.40); backdrop-filter: blur(3px); font-size: 23px; line-height: 1; color: #fff; cursor: pointer; box-shadow: 0 0 8px rgba(95,242,255,.85), 0 0 20px rgba(95,242,255,.55), 0 0 42px rgba(95,242,255,.30); animation: loveNeonMutePulse 2.2s ease-in-out infinite; }
      @keyframes loveNeonMutePulse { 0%,100% { box-shadow: 0 0 8px rgba(95,242,255,.85), 0 0 20px rgba(95,242,255,.55), 0 0 42px rgba(95,242,255,.30); } 50% { box-shadow: 0 0 14px rgba(95,242,255,1), 0 0 32px rgba(95,242,255,.85), 0 0 60px rgba(95,242,255,.5); } }
      .love-card-profile-section { position: absolute; left: 0; right: 0; bottom: 0; height: 45%; overflow: hidden; z-index: 2; animation: loveProfileTrade 9s ease-in-out infinite; transition: height .4s ease; }
      .love-card-profile-photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
      .love-card-photo-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(4,3,9,.94) 0%, rgba(4,3,9,.62) 34%, rgba(4,3,9,.08) 64%, rgba(4,3,9,0) 80%); pointer-events: none; }
      .love-card-photo-info { position: absolute; left: 0; right: 0; bottom: 0; padding: 18px 16px 15px; display: flex; flex-direction: column; gap: 4px; z-index: 2; }
      .love-card-photo-info h2 { margin: 0 0 2px !important; color: #fff; font-size: 21px !important; text-shadow: 0 0 4px #fff, 0 0 11px #ff6fb0, 0 0 22px #ff2d95, 0 0 40px rgba(255,45,149,.65); animation: loveNeonText 2.6s ease-in-out infinite; }
      .love-card-area, .love-card-freeday { color: #eaf7ff; font-size: 12.5px; text-shadow: 0 0 3px #fff, 0 0 8px #7fd7ff, 0 0 16px rgba(71,178,255,.85), 0 0 30px rgba(71,178,255,.4); animation: loveNeonText 2.6s ease-in-out infinite; }
      .love-card-status-row { margin-top: 7px; }
      @keyframes loveVideoTrade { 0%,66.67% { height: 55%; } 72.22%,94.44% { height: 0%; } 100% { height: 55%; } }
      @keyframes loveProfileTrade { 0%,66.67% { height: 45%; } 72.22%,94.44% { height: 100%; } 100% { height: 45%; } }
      @keyframes loveNeonText { 0%,100% { filter: brightness(1); } 50% { filter: brightness(1.22); } }
      /* Pause the takeover while any viewer is editing this card's video (upload/link/PIN) */
      .love-card-stage.is-editing .love-card-video-section { animation: none; height: 55%; }
      .love-card-stage.is-editing .love-card-profile-section { animation: none; height: 45%; }
      @media (prefers-reduced-motion: reduce) {
        .love-card-video-section, .love-card-profile-section { animation: none !important; transition: none !important; }
        .love-card-video-section { height: 55%; }
        .love-card-profile-section { height: 45%; }
        .love-mute-badge { animation: none; }
        .love-card-photo-info h2, .love-card-area, .love-card-freeday { animation: none; }
      }
      .heart-match-status { width: fit-content; display: inline-flex; align-items: center; min-height: 28px; padding: 0 10px; border-radius: 999px; color: rgba(255,255,255,.92); background: rgba(255,255,255,.16); backdrop-filter: blur(6px); font-size: 10px; font-weight: 900; text-decoration: none; text-shadow: 0 0 6px rgba(255,255,255,.85); box-shadow: 0 0 10px rgba(255,255,255,.22), inset 0 0 0 1px rgba(255,255,255,.25); }
      .heart-match-status.found { color: #fff; background: linear-gradient(135deg,#ee3e79,#b9285c); text-shadow: 0 0 8px #fff, 0 0 16px rgba(255,255,255,.7); box-shadow: 0 0 18px rgba(238,62,121,.65), 0 0 34px rgba(238,62,121,.35); }
      .love-video-editor { margin: 0 14px 14px; padding: 14px; border: 1px solid rgba(255,108,153,.22); border-radius: 18px; background: rgba(20,8,19,.78); }
      .love-video-editor-title { display: flex; flex-direction: column; gap: 3px; margin-bottom: 11px; }
      .love-video-editor-title strong { font-size: 13px; }
      .love-video-editor-title small { color: rgba(255,255,255,.48); font-size: 10px; }
      .love-video-file { min-height: 48px; display: flex; align-items: center; padding: 0 13px; border: 1px dashed rgba(255,118,160,.42); border-radius: 14px; color: #ffe4ec; background: rgba(70,17,39,.38); font-size: 11px; font-weight: 850; cursor: pointer; position: relative; margin-bottom: 8px; }
      .love-video-file input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
      .love-video-or { margin: 8px 0; color: rgba(255,255,255,.30); font-size: 9px; font-weight: 900; text-align: center; }
      .love-save-video { min-height: 48px; margin-top: 4px; }
      .love-ask-pin { min-height: 44px; margin-top: 8px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(80,215,126,.35); border-radius: 14px; color: #bff5cf; background: rgba(24,92,50,.32); font-size: 11px; font-weight: 900; text-decoration: none; }
      .love-video-error { margin-top: 3px; margin-bottom: 8px; }
      .love-upload-progress { position: relative; height: 22px; margin-top: 6px; border-radius: 999px; overflow: hidden; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.10); }
      .love-upload-progress-bar { height: 100%; border-radius: 999px; background: linear-gradient(135deg,#087cff,#e83670); transition: width .2s ease; }
      .love-upload-progress-label { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 10px; font-weight: 900; text-shadow: 0 1px 3px rgba(0,0,0,.6); }

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