import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from "react";
import {
  Eye,
  MessageCircle,
  Share2,
  Heart,
  Mail,
  MoreVertical,
  Plus,
  ChevronDown,
  X,
} from "lucide-react";
const API_URL = "https://kitchenbrain.cucina656.workers.dev";

const DEFAULT_VIDEO =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

const DEFAULT_TITLE = "ChillaX";

const DEFAULT_LOGO =
  "https://pub-7b720214d16e45288fd32c5d88f01209.r2.dev/WhatsApp%20Image%202026-06-19%20at%207.17.57%20AM%20(1).jpeg";

// Small inline fallback so a broken feed image never falls back to a large
// profile photo (per low-memory / correctness requirements).
const IMAGE_FALLBACK_SRC =
  "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%2306101f'/%3E%3Ccircle cx='100' cy='82' r='28' fill='%23234061'/%3E%3Crect x='55' y='128' width='90' height='16' rx='8' fill='%23234061'/%3E%3C/svg%3E";

const INITIAL_PAGE_LIMIT = 5;
const LOAD_MORE_LIMIT = 5;

const WATCH_FLUSH_INTERVAL_MS = 10_000;
const MAX_WATCH_SECONDS_PER_REQUEST = 30;

const WHATSAPP_STORAGE_KEY = "feedx-whatsapp-number";

function isDirectVideoUrl(url = "") {
  const clean = String(url).toLowerCase().split("?")[0].split("#")[0];

  return (
    clean.endsWith(".mp4") ||
    clean.endsWith(".webm") ||
    clean.endsWith(".ogg") ||
    clean.endsWith(".mov") ||
    clean.endsWith(".m4v") ||
    clean.endsWith(".mkv") ||
    clean.endsWith(".avi")
  );
}

function isImageUrl(url = "") {
  const clean = String(url).toLowerCase().split("?")[0].split("#")[0];

  return (
    clean.endsWith(".jpg") ||
    clean.endsWith(".jpeg") ||
    clean.endsWith(".png") ||
    clean.endsWith(".gif") ||
    clean.endsWith(".webp") ||
    clean.endsWith(".bmp") ||
    clean.endsWith(".svg")
  );
}

function getEmbedUrl(url = "") {
  if (!url) return "";

  const youtubeMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );

  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1&mute=0&loop=1&playlist=${youtubeMatch[1]}&controls=1&rel=0&modestbranding=1`;
  }

  const shortsMatch = url.match(
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
  );

  if (shortsMatch) {
    return `https://www.youtube.com/embed/${shortsMatch[1]}?autoplay=1&mute=0&loop=1&playlist=${shortsMatch[1]}&controls=1&rel=0&modestbranding=1`;
  }

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);

  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&muted=0&loop=1&background=0`;
  }

  const dailymotionMatch = url.match(
    /dailymotion\.com\/video\/([a-zA-Z0-9]+)/
  );

  if (dailymotionMatch) {
    return `https://www.dailymotion.com/embed/video/${dailymotionMatch[1]}?autoplay=1&mute=0&loop=1`;
  }

  if (url.includes("/embed/") || url.includes("player.")) return url;

  return url;
}

function detectCreatorType(value = "") {
  const clean = value.trim().toLowerCase();

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

function buildContactUrl(type = "", value = "") {
  const clean = String(value || "").trim();

  if (!clean) return "";

  if (type === "website") {
    return clean.startsWith("http://") || clean.startsWith("https://")
      ? clean
      : `https://${clean}`;
  }

  const digits = clean.replace(/[^\d]/g, "");
  return digits ? `https://wa.me/${digits}` : "";
}

function formatCount(value = 0) {
  const number = Number(value) || 0;

  if (number >= 1_000_000) {
    return `${(number / 1_000_000).toFixed(1).replace(".0", "")}M`;
  }

  if (number >= 1_000) {
    return `${(number / 1_000).toFixed(1).replace(".0", "")}K`;
  }

  return String(number);
}

/**
 * Reusable WhatsApp / phone number normalizer.
 * This MUST stay in sync with the identical function in Worker.js.
 * It only checks structure — it never proves ownership of the number.
 */
function normalizeWhatsAppNumber(value = "") {
  const raw = String(value || "").trim();
  const compact = raw.replace(/[\s().-]/g, "");

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

function getCountryFlag(phoneOrNormalized = "") {
  const digits = String(phoneOrNormalized).replace(/[^\d+]/g, "");

  const countryPrefixes = [
    ["+250", "🇷🇼"],
    ["250", "🇷🇼"],
    ["+257", "🇧🇮"],
    ["257", "🇧🇮"],
    ["+256", "🇺🇬"],
    ["256", "🇺🇬"],
    ["+254", "🇰🇪"],
    ["254", "🇰🇪"],
    ["+255", "🇹🇿"],
    ["255", "🇹🇿"],
    ["+243", "🇨🇩"],
    ["243", "🇨🇩"],
    ["+251", "🇪🇹"],
    ["251", "🇪🇹"],
    ["+27", "🇿🇦"],
    ["27", "🇿🇦"],
    ["+44", "🇬🇧"],
    ["44", "🇬🇧"],
    ["+33", "🇫🇷"],
    ["33", "🇫🇷"],
    ["+32", "🇧🇪"],
    ["32", "🇧🇪"],
    ["+91", "🇮🇳"],
    ["91", "🇮🇳"],
    ["+86", "🇨🇳"],
    ["86", "🇨🇳"],
    ["+1", "🌎"],
    ["1", "🌎"],
  ];

  const match = countryPrefixes.find(([prefix]) => digits.startsWith(prefix));
  return match ? match[1] : "🌍";
}

/**
 * Resizes/compresses an image file in the browser before upload.
 * Keeps aspect ratio, caps dimensions, exports as WebP (falls back to JPEG).
 * Returns the original file untouched if compression fails for any reason,
 * so an upload error never freezes the page.
 */
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
      canvas.toBlob(
        (result) => resolve(result),
        "image/webp",
        quality
      );
    });

    if (!blob) return file;

    const newName = file.name
      ? file.name.replace(/\.[^/.]+$/, "") + ".webp"
      : "upload.webp";

    return new File([blob], newName, { type: "image/webp" });
  } catch (error) {
    console.warn("Image compression failed, using original file:", error);
    return file;
  }
}

function Home() {
  const videoRefs = useRef({});
  const postRefs = useRef({});
  const observerRef = useRef(null);
  const isMountedRef = useRef(true);

  // ---- Watch-time accumulation refs (not state — these change too often
  // to justify a re-render on every tick) ----
  const watchAccumulatorRef = useRef({}); // { [postId]: secondsPendingFlush }
  const watchTimerRef = useRef({}); // { [postId]: intervalId while playing }
  const iframeExposureAccumulatorRef = useRef({}); // { [postId]: seconds }
  const iframeExposureTimerRef = useRef(null);
  const tabHiddenRef = useRef(false);

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [activePostIndex, setActivePostIndex] = useState(0);

  const [showEditor, setShowEditor] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [loadingComments, setLoadingComments] = useState(false);

  const [newCreatorName, setNewCreatorName] = useState("");
  const [newCreatorIdentity, setNewCreatorIdentity] = useState("");
  const [newMediaUrl, setNewMediaUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [newLogoFile, setNewLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [newMediaFile, setNewMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState("");
  const [mediaPreviewType, setMediaPreviewType] = useState("");
  const [saving, setSaving] = useState(false);
  const [compressingMedia, setCompressingMedia] = useState(false);
  const [zoomImage, setZoomImage] = useState("");

  // Comments are now backed by the D1 database, keyed by post id.
  const [commentsByPost, setCommentsByPost] = useState({});
  const [commentPhone, setCommentPhone] = useState("");
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // Reactions: D1 is the source of truth. We only keep a small map of
  // "pending" UI state so the heart can respond instantly.
  const [reactedPosts, setReactedPosts] = useState({});
  const [reactingPostId, setReactingPostId] = useState(null);

  // WhatsApp number modal, shown once per device before the first like.
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneModalValue, setPhoneModalValue] = useState("");
  const [phoneModalError, setPhoneModalError] = useState("");
  const [phoneModalTargetPost, setPhoneModalTargetPost] = useState(null);

  // Envelope "unread dot" state — purely a per-device localStorage concern.
  const [openedEnvelopes, setOpenedEnvelopes] = useState({});

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
    const text = await response.text();

    try {
      return JSON.parse(text);
    } catch {
      throw new Error(text || "Server did not return JSON");
    }
  }, []);

  // ---------------------------------------------------------------------
  // Saved WhatsApp number convenience (device-level, not verified ownership)
  // ---------------------------------------------------------------------

  const getSavedWhatsAppNumber = useCallback(() => {
    try {
      return localStorage.getItem(WHATSAPP_STORAGE_KEY) || "";
    } catch {
      return "";
    }
  }, []);

  const saveWhatsAppNumber = useCallback((normalized) => {
    try {
      localStorage.setItem(WHATSAPP_STORAGE_KEY, normalized);
    } catch {
      // localStorage may be unavailable (private mode, quota) — non-fatal.
    }
  }, []);

  // ---------------------------------------------------------------------
  // Envelope opened state (per device, per post)
  // ---------------------------------------------------------------------

  const isEnvelopeOpened = useCallback(
    (postId) => {
      if (openedEnvelopes[postId]) return true;
      try {
        return localStorage.getItem(`feedx-envelope-opened-${postId}`) === "true";
      } catch {
        return false;
      }
    },
    [openedEnvelopes]
  );

  const markEnvelopeOpened = useCallback((postId) => {
    try {
      localStorage.setItem(`feedx-envelope-opened-${postId}`, "true");
    } catch {
      // ignore storage failures — dot will just reappear on next load
    }
    setOpenedEnvelopes((current) => ({ ...current, [postId]: true }));
  }, []);

  // ---------------------------------------------------------------------
  // Fetching the feed (with pagination)
  // ---------------------------------------------------------------------

  const fetchHomeData = useCallback(
    async ({ append = false, cursor = null } = {}) => {
      try {
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }

        const params = new URLSearchParams();
        params.set("limit", String(append ? LOAD_MORE_LIMIT : INITIAL_PAGE_LIMIT));
        if (cursor) params.set("cursor", cursor);

        const response = await fetch(`${API_URL}/api/home?${params.toString()}`, {
          cache: "no-store",
        });

        const data = await readJsonSafely(response);

        if (!data.success) {
          throw new Error(data.message || "Failed to load posts");
        }

        if (Array.isArray(data.posts) && data.posts.length > 0) {
          if (isMountedRef.current) {
            setPosts((current) => (append ? [...current, ...data.posts] : data.posts));
            setNextCursor(data.next_cursor || null);
            setHasMore(Boolean(data.has_more));
          }
          return;
        }

        if (!append && isMountedRef.current) {
          setPosts([
            {
              id: 0,
              creator_name: data.creator_name || "",
              creator_identity: data.creator_identity || "",
              creator_type: data.creator_type || "",
              title: data.title || DEFAULT_TITLE,
              subtitle: data.subtitle || "",
              logo_url: data.logo_url || DEFAULT_LOGO,
              media_url: data.video_url || DEFAULT_VIDEO,
              media_type: data.media_type || "",
              watch_seconds: 0,
              comment_count: 0,
              share_count: 0,
              real_views: 0,
              manual_views: 0,
              real_reactions: 0,
              manual_reactions: 0,
            },
          ]);
          setHasMore(false);
          setNextCursor(null);
        } else if (append && isMountedRef.current) {
          setHasMore(false);
        }
      } catch (error) {
        console.error("Failed to fetch home data:", error);
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [readJsonSafely]
  );

  const loadMorePosts = useCallback(() => {
    if (!hasMore || loadingMore || !nextCursor) return;
    fetchHomeData({ append: true, cursor: nextCursor });
  }, [hasMore, loadingMore, nextCursor, fetchHomeData]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchHomeData();

    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------
  // Intersection observer — drives active post, video autoplay, and
  // iframe exposure-time tracking (visible time only, never claimed as
  // exact watch time).
  // ---------------------------------------------------------------------

  useEffect(() => {
    if (!posts.length) return undefined;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = Number(entry.target.dataset.index);
          const video = videoRefs.current[index];

          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            setActivePostIndex(index);

            Object.entries(videoRefs.current).forEach(([key, item]) => {
              if (Number(key) !== index && item && !item.paused) {
                item.pause();
              }
            });

            if (video && video.paused) {
              video.play().catch(() => {});
            }
          } else if (video && !video.paused) {
            video.pause();
          }
        });
      },
      {
        threshold: [0.6],
        rootMargin: "0px 0px -10% 0px",
      }
    );

    observerRef.current = observer;

    Object.values(postRefs.current).forEach((post) => {
      if (post) observer.observe(post);
    });

    return () => {
      observer.disconnect();
    };
  }, [posts]);

  // ---------------------------------------------------------------------
  // Watch-time tracking (direct video only)
  // ---------------------------------------------------------------------

  const flushWatchSeconds = useCallback(
    (postId, { useBeacon = false } = {}) => {
      const pending = Math.floor(watchAccumulatorRef.current[postId] || 0);
      if (pending <= 0) return; // never send a zero-second request

      const seconds = Math.min(pending, MAX_WATCH_SECONDS_PER_REQUEST);
      watchAccumulatorRef.current[postId] = pending - seconds;

      const payload = JSON.stringify({
        post_id: String(postId),
        seconds,
        field: "watch_seconds",
      });

      if (useBeacon && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon(`${API_URL}/api/home/watch`, blob);
        return;
      }

      fetch(`${API_URL}/api/home/watch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch((error) => {
        console.warn("Failed to send watch time:", error);
      });
    },
    []
  );

  const startWatchTimer = useCallback(
    (postId) => {
      if (watchTimerRef.current[postId]) return; // already running

      watchAccumulatorRef.current[postId] = watchAccumulatorRef.current[postId] || 0;

      watchTimerRef.current[postId] = setInterval(() => {
        watchAccumulatorRef.current[postId] = (watchAccumulatorRef.current[postId] || 0) + 1;

        // Send accumulated watch time every 10 seconds while still playing.
        if (watchAccumulatorRef.current[postId] >= 10) {
          flushWatchSeconds(postId);
        }
      }, 1000);
    },
    [flushWatchSeconds]
  );

  const stopWatchTimer = useCallback(
    (postId, { flush = true, useBeacon = false } = {}) => {
      if (watchTimerRef.current[postId]) {
        clearInterval(watchTimerRef.current[postId]);
        delete watchTimerRef.current[postId];
      }
      if (flush) {
        flushWatchSeconds(postId, { useBeacon });
      }
    },
    [flushWatchSeconds]
  );

  const handleVideoPlay = useCallback(
    (postId) => {
      startWatchTimer(postId);
    },
    [startWatchTimer]
  );

  const handleVideoPause = useCallback(
    (postId) => {
      stopWatchTimer(postId, { flush: true });
    },
    [stopWatchTimer]
  );

  // Stop counting when the tab becomes hidden; resume bookkeeping (but not
  // counting) when it becomes visible again — the IntersectionObserver /
  // video "play" event naturally restarts the timer once truly playing.
  useEffect(() => {
    const handleVisibilityChange = () => {
      const hidden = document.hidden;
      tabHiddenRef.current = hidden;

      if (hidden) {
        Object.keys(watchTimerRef.current).forEach((postId) => {
          stopWatchTimer(postId, { flush: true, useBeacon: true });
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [stopWatchTimer]);

  // Flush any unsaved seconds (all posts) when the page is about to close.
  useEffect(() => {
    const handlePageHide = () => {
      Object.keys(watchTimerRef.current).forEach((postId) => {
        stopWatchTimer(postId, { flush: true, useBeacon: true });
      });
      Object.keys(iframeExposureAccumulatorRef.current).forEach((postId) => {
        flushIframeExposure(postId, { useBeacon: true });
      });
    };

    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handlePageHide);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handlePageHide);
      handlePageHide();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------
  // Embedded iframe exposure-time tracking (visible time only — never
  // presented as exact "watch time" since we don't control the player).
  // ---------------------------------------------------------------------

  const flushIframeExposure = useCallback((postId, { useBeacon = false } = {}) => {
    const pending = Math.floor(iframeExposureAccumulatorRef.current[postId] || 0);
    if (pending <= 0) return;

    const seconds = Math.min(pending, MAX_WATCH_SECONDS_PER_REQUEST);
    iframeExposureAccumulatorRef.current[postId] = pending - seconds;

    const payload = JSON.stringify({
      post_id: String(postId),
      seconds,
      field: "iframe_exposure_seconds",
    });

    if (useBeacon && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(`${API_URL}/api/home/watch`, blob);
      return;
    }

    fetch(`${API_URL}/api/home/watch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }, []);

  // Ticks once per second for whichever post is both active AND an embed,
  // as long as the tab is visible.
  useEffect(() => {
    if (iframeExposureTimerRef.current) {
      clearInterval(iframeExposureTimerRef.current);
      iframeExposureTimerRef.current = null;
    }

    const activePost = posts[activePostIndex];
    if (!activePost) return undefined;

    const mediaUrl = activePost.media_url || activePost.video_url || "";
    const mediaType = activePost.media_type || "";
    const isEmbed =
      mediaType === "embed" ||
      (!mediaType && !isImageUrl(mediaUrl) && !isDirectVideoUrl(mediaUrl));

    if (!isEmbed) return undefined;

    const postId = String(activePost.id ?? activePostIndex);

    iframeExposureTimerRef.current = setInterval(() => {
      if (tabHiddenRef.current) return;

      iframeExposureAccumulatorRef.current[postId] =
        (iframeExposureAccumulatorRef.current[postId] || 0) + 1;

      if (iframeExposureAccumulatorRef.current[postId] >= 10) {
        flushIframeExposure(postId);
      }
    }, 1000);

    return () => {
      if (iframeExposureTimerRef.current) {
        clearInterval(iframeExposureTimerRef.current);
        iframeExposureTimerRef.current = null;
      }
      flushIframeExposure(postId);
    };
  }, [activePostIndex, posts, flushIframeExposure]);

  // ---------------------------------------------------------------------
  // Editor modal
  // ---------------------------------------------------------------------

  const pauseAllVideos = useCallback(() => {
    Object.entries(videoRefs.current).forEach(([postId, video]) => {
      if (video && !video.paused) {
        video.pause();
      }
    });
    Object.keys(watchTimerRef.current).forEach((postId) => {
      stopWatchTimer(postId, { flush: true });
    });
  }, [stopWatchTimer]);

  const openEditor = useCallback(() => {
    pauseAllVideos();
    setShowEditor(true);
  }, [pauseAllVideos]);

  const closeEditor = useCallback(() => {
    setShowEditor(false);
    setNewCreatorName("");
    setNewCreatorIdentity("");
    setNewMediaUrl("");
    setNewTitle("");
    setSubtitle("");
    setNewLogoFile(null);
    revokeObjectUrl(logoPreview);
    setLogoPreview("");
    setNewMediaFile(null);
    revokeObjectUrl(mediaPreview);
    setMediaPreview("");
    setMediaPreviewType("");
  }, [logoPreview, mediaPreview, revokeObjectUrl]);

  const handleLogoChange = useCallback(
    async (file) => {
      revokeObjectUrl(logoPreview);

      if (!file) {
        setNewLogoFile(null);
        setLogoPreview("");
        return;
      }

      setCompressingMedia(true);
      try {
        const compressed = await compressImageFile(file, {
          maxWidth: 400,
          maxHeight: 400,
          quality: 0.75,
        });
        setNewLogoFile(compressed);
        setLogoPreview(trackObjectUrl(URL.createObjectURL(compressed)));
      } catch (error) {
        console.error("Profile photo processing failed:", error);
        alert("This image could not be processed. Please try a different photo.");
      } finally {
        setCompressingMedia(false);
      }
    },
    [logoPreview, revokeObjectUrl, trackObjectUrl]
  );

  const handleMediaFileChange = useCallback(
    async (file) => {
      revokeObjectUrl(mediaPreview);

      if (!file) {
        setNewMediaFile(null);
        setMediaPreview("");
        setMediaPreviewType("");
        return;
      }

      const isImage = file.type.startsWith("image/");

      if (!isImage) {
        // Videos are never compressed in the browser (per requirement).
        setNewMediaFile(file);
        setMediaPreview(trackObjectUrl(URL.createObjectURL(file)));
        setMediaPreviewType("video");
        return;
      }

      setCompressingMedia(true);
      try {
        const compressed = await compressImageFile(file, {
          maxWidth: 1080,
          quality: 0.75,
        });
        setNewMediaFile(compressed);
        setMediaPreview(trackObjectUrl(URL.createObjectURL(compressed)));
        setMediaPreviewType("image");
      } catch (error) {
        console.error("Image processing failed:", error);
        alert("This image could not be processed. Please try a different photo.");
      } finally {
        setCompressingMedia(false);
      }
    },
    [mediaPreview, revokeObjectUrl, trackObjectUrl]
  );

  const applyChanges = useCallback(async () => {
    const creatorName = newCreatorName.trim();
    const identity = newCreatorIdentity.trim();
    const mediaToSave = newMediaUrl.trim();

    if (!creatorName) {
      alert("Please enter a creator name.");
      return;
    }

    if (!identity) {
      alert("Please enter your WhatsApp number or website.");
      return;
    }

    if (!mediaToSave && !newMediaFile) {
      alert("Please enter a media link or upload a photo or video.");
      return;
    }

    let detectedMediaType = "";

    if (newMediaFile) {
      detectedMediaType = newMediaFile.type.startsWith("image/")
        ? "image"
        : "video";
    } else if (isImageUrl(mediaToSave)) {
      detectedMediaType = "image";
    } else if (isDirectVideoUrl(mediaToSave)) {
      detectedMediaType = "video";
    } else if (mediaToSave) {
      detectedMediaType = "embed";
    }

    try {
      setSaving(true);

      const formData = new FormData();

      formData.append("creator_name", creatorName);
      formData.append("creator_identity", identity);
      formData.append("creator_type", detectCreatorType(identity));
      formData.append("title", newTitle.trim() || DEFAULT_TITLE);
      formData.append("subtitle", subtitle.trim());
      formData.append("media_type", detectedMediaType);
      formData.append("is_new_post", "true");

      if (mediaToSave) {
        formData.append("video_url", mediaToSave);
      }

      if (newLogoFile) {
        formData.append("logo_file", newLogoFile);
      }

      if (newMediaFile) {
        formData.append("media_file", newMediaFile);
      }

      const response = await fetch(`${API_URL}/api/home/update`, {
        method: "POST",
        body: formData,
      });

      const data = await readJsonSafely(response);

      if (!data.success) {
        alert(data.message || "Failed to create post.");
        return;
      }

      if (Array.isArray(data.posts)) {
        if (isMountedRef.current) {
          setPosts(data.posts);
        }
      } else {
        await fetchHomeData();
      }

      closeEditor();
      alert("Post created successfully!");
    } catch (error) {
      console.error("Failed to create home post:", error);
      alert("Failed to create post.");
    } finally {
      if (isMountedRef.current) {
        setSaving(false);
      }
    }
  }, [
    closeEditor,
    fetchHomeData,
    newCreatorName,
    newCreatorIdentity,
    newLogoFile,
    newMediaFile,
    newMediaUrl,
    newTitle,
    readJsonSafely,
    subtitle,
  ]);

  // ---------------------------------------------------------------------
  // Envelope click (inbox)
  // ---------------------------------------------------------------------

  const openCreatorInbox = useCallback(
    async (post) => {
      const postId = String(post.id ?? "");
      let destination = buildContactUrl(
        post.creator_type,
        post.creator_identity
      );

      // Hide the red dot immediately and remember it on this device.
      if (postId) {
        markEnvelopeOpened(postId);
      }

      if (postId) {
        try {
          const response = await fetch(`${API_URL}/api/home/ngwino-click`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ post_id: postId }),
          });

          const data = await readJsonSafely(response);

          if (data.success && data.destination) {
            destination = data.destination;
          }
        } catch (error) {
          console.warn("Could not record inbox click:", error);
        }
      }

      if (!destination) {
        alert("This creator did not add contact information.");
        return;
      }

      window.open(destination, "_blank", "noopener,noreferrer");
    },
    [markEnvelopeOpened, readJsonSafely]
  );

  // ---------------------------------------------------------------------
  // Comments (persisted in D1)
  // ---------------------------------------------------------------------

  const loadComments = useCallback(
    async (postId) => {
      setLoadingComments(true);
      try {
        const response = await fetch(
          `${API_URL}/api/home/comments?post_id=${encodeURIComponent(postId)}`,
          { cache: "no-store" }
        );
        const data = await readJsonSafely(response);

        if (data.success && Array.isArray(data.comments)) {
          setCommentsByPost((current) => ({
            ...current,
            [postId]: data.comments,
          }));
        }
      } catch (error) {
        console.warn("Failed to load comments:", error);
      } finally {
        setLoadingComments(false);
      }
    },
    [readJsonSafely]
  );

  const openComments = useCallback(
    (post) => {
      pauseAllVideos();
      const postId = String(post.id ?? "0");
      setSelectedPost(post);
      setCommentPhone(getSavedWhatsAppNumber());
      setCommentText("");
      setShowComments(true);
      loadComments(postId);
    },
    [pauseAllVideos, getSavedWhatsAppNumber, loadComments]
  );

  const closeComments = useCallback(() => {
    setShowComments(false);
    setSelectedPost(null);
    setCommentPhone("");
    setCommentText("");
  }, []);

  const submitComment = useCallback(async () => {
    const normalizedPhone = normalizeWhatsAppNumber(commentPhone);
    const text = commentText.trim();

    if (!normalizedPhone) {
      alert("Please enter a valid WhatsApp number (with country code).");
      return;
    }

    if (!text) {
      alert("Please write your comment.");
      return;
    }

    if (!selectedPost) return;

    const postId = String(selectedPost.id ?? "0");

    try {
      setSubmittingComment(true);

      const response = await fetch(`${API_URL}/api/home/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: postId,
          phone: normalizedPhone,
          comment: text,
        }),
      });

      const data = await readJsonSafely(response);

      if (!data.success) {
        alert(data.error || data.message || "Failed to post comment.");
        return;
      }

      saveWhatsAppNumber(normalizedPhone);

      setCommentsByPost((current) => ({
        ...current,
        [postId]: [data.comment, ...(current[postId] || [])],
      }));

      setPosts((currentPosts) =>
        currentPosts.map((item) =>
          String(item.id) === postId
            ? { ...item, comment_count: data.comment_count ?? (Number(item.comment_count) || 0) + 1 }
            : item
        )
      );

      setCommentText("");
    } catch (error) {
      console.error("Failed to submit comment:", error);
      alert("Failed to post comment. Please try again.");
    } finally {
      if (isMountedRef.current) {
        setSubmittingComment(false);
      }
    }
  }, [commentPhone, commentText, selectedPost, readJsonSafely, saveWhatsAppNumber]);

  // ---------------------------------------------------------------------
  // Reactions (likes) — require a validated WhatsApp number
  // ---------------------------------------------------------------------

  const sendReaction = useCallback(
    async (post, normalizedPhone) => {
      const postId = String(post?.id ?? "");
      if (!postId) return;

      setReactingPostId(postId);

      try {
        const response = await fetch(`${API_URL}/api/home/react`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ post_id: postId, phone: normalizedPhone }),
        });

        const data = await readJsonSafely(response);

        if (data.already_reacted) {
          setReactedPosts((current) => ({ ...current, [postId]: true }));
          return;
        }

        if (!data.success) {
          alert(data.error || data.message || "Failed to like this post.");
          return;
        }

        saveWhatsAppNumber(normalizedPhone);
        setReactedPosts((current) => ({ ...current, [postId]: true }));

        setPosts((currentPosts) =>
          currentPosts.map((item) =>
            String(item.id) === postId
              ? {
                  ...item,
                  real_reactions: data.real_reactions,
                  manual_reactions: data.manual_reactions,
                  displayed_reactions: data.displayed_reactions,
                }
              : item
          )
        );
      } catch (error) {
        console.error("Failed to react to post:", error);
        alert("Failed to like this post. Please try again.");
      } finally {
        if (isMountedRef.current) {
          setReactingPostId(null);
        }
      }
    },
    [readJsonSafely, saveWhatsAppNumber]
  );

  const reactToPost = useCallback(
    (post) => {
      const postId = String(post?.id ?? "");
      if (!postId || reactedPosts[postId] || reactingPostId === postId) return;

      const savedNumber = getSavedWhatsAppNumber();

      if (savedNumber && normalizeWhatsAppNumber(savedNumber)) {
        sendReaction(post, normalizeWhatsAppNumber(savedNumber));
        return;
      }

      // First like on this device — ask for a WhatsApp number via a real
      // modal (never window.prompt()).
      pauseAllVideos();
      setPhoneModalTargetPost(post);
      setPhoneModalValue("");
      setPhoneModalError("");
      setShowPhoneModal(true);
    },
    [reactedPosts, reactingPostId, getSavedWhatsAppNumber, sendReaction, pauseAllVideos]
  );

  const closePhoneModal = useCallback(() => {
    setShowPhoneModal(false);
    setPhoneModalTargetPost(null);
    setPhoneModalValue("");
    setPhoneModalError("");
  }, []);

  const confirmPhoneModal = useCallback(() => {
    const normalized = normalizeWhatsAppNumber(phoneModalValue);

    if (!normalized) {
      setPhoneModalError("Please enter a valid phone number, including the country code.");
      return;
    }

    if (phoneModalTargetPost) {
      sendReaction(phoneModalTargetPost, normalized);
    }

    setShowPhoneModal(false);
    setPhoneModalTargetPost(null);
    setPhoneModalValue("");
    setPhoneModalError("");
  }, [phoneModalValue, phoneModalTargetPost, sendReaction]);

  // ---------------------------------------------------------------------
  // Share
  // ---------------------------------------------------------------------

  const sharePost = useCallback(async (post) => {
    const shareData = {
      title: post.title || "Post",
      text: post.subtitle || "",
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        alert("Post link copied!");
      } else {
        alert(window.location.href);
      }
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.error("Share failed:", error);
      }
    }
  }, []);

  const memoizedPosts = useMemo(() => posts, [posts]);

  // ---------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------

  if (loading) {
    return (
      <div className="home-page">
        <FeedXTopBar openEditor={openEditor} />
        <div className="loading-state">Loading...</div>
        <HomeStyles />
      </div>
    );
  }

  if (!memoizedPosts.length) {
    return (
      <div className="home-page">
        <FeedXTopBar openEditor={openEditor} />

        <div className="empty-state">
          <p>No posts yet. Create your first post!</p>

          <button type="button" onClick={openEditor} className="empty-button">
            ＋ Create Post
          </button>
        </div>

        {showEditor && (
          <EditorModal
            newCreatorName={newCreatorName}
            setNewCreatorName={setNewCreatorName}
            newCreatorIdentity={newCreatorIdentity}
            setNewCreatorIdentity={setNewCreatorIdentity}
            newTitle={newTitle}
            setNewTitle={setNewTitle}
            newMediaUrl={newMediaUrl}
            setNewMediaUrl={setNewMediaUrl}
            subtitle={subtitle}
            setSubtitle={setSubtitle}
            handleLogoChange={handleLogoChange}
            logoPreview={logoPreview}
            handleMediaFileChange={handleMediaFileChange}
            mediaPreview={mediaPreview}
            mediaPreviewType={mediaPreviewType}
            applyChanges={applyChanges}
            closeEditor={closeEditor}
            saving={saving}
            compressingMedia={compressingMedia}
          />
        )}

        <HomeStyles />
      </div>
    );
  }

  return (
    <div className="home-page">
      <FeedXTopBar openEditor={openEditor} />

      <main className="home-feed">
        {memoizedPosts.map((post, index) => {
          const postId = String(post.id ?? index);

          return (
            <HomePost
              key={postId}
              post={post}
              index={index}
              postId={postId}
              isActive={activePostIndex === index}
              localCommentCount={(commentsByPost[postId] || []).length}
              reacted={Boolean(reactedPosts[postId])}
              reacting={reactingPostId === postId}
              envelopeOpened={isEnvelopeOpened(postId)}
              postRefCallback={(ref) => {
                if (ref) {
                  postRefs.current[index] = ref;
                } else {
                  delete postRefs.current[index];
                }
              }}
              videoRefCallback={(ref) => {
                if (ref) {
                  videoRefs.current[index] = ref;
                } else {
                  delete videoRefs.current[index];
                }
              }}
              onVideoPlay={handleVideoPlay}
              onVideoPause={handleVideoPause}
              onOpenInbox={openCreatorInbox}
              onOpenComments={openComments}
              onShare={sharePost}
              onReact={reactToPost}
              onZoomImage={setZoomImage}
            />
          );
        })}
      </main>

      {hasMore && (
        <div className="load-more-wrap">
          <button
            type="button"
            className="load-more-button"
            onClick={loadMorePosts}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading..." : "Load more"}
          </button>
        </div>
      )}

      {showEditor && (
        <EditorModal
          newCreatorName={newCreatorName}
          setNewCreatorName={setNewCreatorName}
          newCreatorIdentity={newCreatorIdentity}
          setNewCreatorIdentity={setNewCreatorIdentity}
          newTitle={newTitle}
          setNewTitle={setNewTitle}
          newMediaUrl={newMediaUrl}
          setNewMediaUrl={setNewMediaUrl}
          subtitle={subtitle}
          setSubtitle={setSubtitle}
          handleLogoChange={handleLogoChange}
          logoPreview={logoPreview}
          handleMediaFileChange={handleMediaFileChange}
          mediaPreview={mediaPreview}
          mediaPreviewType={mediaPreviewType}
          applyChanges={applyChanges}
          closeEditor={closeEditor}
          saving={saving}
          compressingMedia={compressingMedia}
        />
      )}

      {showComments && selectedPost && (
        <CommentsModal
          post={selectedPost}
          comments={commentsByPost[String(selectedPost.id ?? "0")] || []}
          loadingComments={loadingComments}
          phone={commentPhone}
          setPhone={setCommentPhone}
          text={commentText}
          setText={setCommentText}
          submitComment={submitComment}
          submitting={submittingComment}
          closeComments={closeComments}
        />
      )}

      {showPhoneModal && (
        <PhoneNumberModal
          value={phoneModalValue}
          setValue={setPhoneModalValue}
          error={phoneModalError}
          onConfirm={confirmPhoneModal}
          onClose={closePhoneModal}
        />
      )}

      {zoomImage && (
        <div
          className="zoom-overlay"
          onClick={() => setZoomImage("")}
          role="presentation"
        >
          <img
            src={zoomImage}
            alt="Profile"
            className="zoom-image"
            loading="lazy"
            decoding="async"
          />
        </div>
      )}

      <HomeStyles />
    </div>
  );
}

// ===========================================================================
// Memoized single-post component. Extracting this stops every post from
// re-rendering whenever one like, comment, or envelope-dot state changes.
// ===========================================================================

const HomePost = memo(function HomePost({
  post,
  index,
  postId,
  isActive,
  localCommentCount,
  reacted,
  reacting,
  envelopeOpened,
  postRefCallback,
  videoRefCallback,
  onVideoPlay,
  onVideoPause,
  onOpenInbox,
  onOpenComments,
  onShare,
  onReact,
  onZoomImage,
}) {
  const mediaUrl = post.media_url || post.video_url || DEFAULT_VIDEO;
  const mediaType = post.media_type || "";

  const isImage = mediaType === "image" || (!mediaType && isImageUrl(mediaUrl));
  const isVideo = mediaType === "video" || (!mediaType && isDirectVideoUrl(mediaUrl));
  const isEmbed =
    mediaType === "embed" ||
    (!mediaType && !isImageUrl(mediaUrl) && !isDirectVideoUrl(mediaUrl));

  // Views/reactions must come from real + manual totals, never from
  // watch_seconds or any other proxy value.
  const viewerCount = Number(post.real_views || 0) + Number(post.manual_views || 0);
  const reactionCount =
    Number(post.real_reactions || 0) + Number(post.manual_reactions || 0);
  const commentCount = Number(post.comment_count || 0) + localCommentCount;
  const creatorDisplayName =
    post.creator_name?.trim() || post.brand_name?.trim() || "Creator";

  const handleImageError = useCallback((event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = IMAGE_FALLBACK_SRC;
  }, []);

  const handleProfileImageError = useCallback((event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = DEFAULT_LOGO;
  }, []);

  return (
    <section
      ref={postRefCallback}
      data-index={index}
      className="home-post crt-screen"
    >
      <header className="post-header">
        <button
          type="button"
          className="profile-picture-button"
          onClick={() => onZoomImage(post.logo_url || DEFAULT_LOGO)}
          aria-label="Open profile picture"
        >
          <img
            src={post.logo_url || DEFAULT_LOGO}
            alt=""
            className="profile-picture"
            loading="lazy"
            decoding="async"
            onError={handleProfileImageError}
          />
        </button>

        <div className="profile-details">
          <div className="creator-name">{creatorDisplayName}</div>
        </div>

        <button
          type="button"
          className="inbox-button"
          onClick={() => onOpenInbox(post)}
          aria-label="Open creator message"
          title="Open creator message"
        >
          <Mail className="inbox-envelope" size={58} strokeWidth={2} aria-hidden="true" />
          {!envelopeOpened && <span className="unread-dot" aria-hidden="true" />}
        </button>

        <button
          type="button"
          className="post-menu-button"
          aria-label="Post options"
          title="Post options"
        >
          <MoreVertical size={38} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </header>

      <div className="post-copy">
        {post.title && <h1 className="post-title">{post.title}</h1>}
        {post.subtitle && <p className="post-message">{post.subtitle}</p>}
      </div>

      <div className="media-viewport">
        <div className="media-layer">
          {isImage && (
            <img
              src={mediaUrl}
              alt={post.title || DEFAULT_TITLE}
              className="home-media"
              loading="lazy"
              decoding="async"
              width={1080}
              height={608}
              onError={handleImageError}
            />
          )}

          {isVideo &&
            (isActive ? (
              <video
                ref={videoRefCallback}
                src={mediaUrl}
                loop
                playsInline
                muted={false}
                controls
                preload="none"
                className="home-media"
                onPlay={() => onVideoPlay(postId)}
                onPause={() => onVideoPause(postId)}
              />
            ) : (
              <div className="media-placeholder" aria-hidden="true">
                <span className="embed-placeholder-icon">▶</span>
              </div>
            ))}

          {isEmbed &&
            (isActive ? (
              <iframe
                src={getEmbedUrl(mediaUrl)}
                title={post.title || DEFAULT_TITLE}
                className="home-media"
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope"
                allowFullScreen
                loading="lazy"
              />
            ) : (
              <div className="embed-placeholder">
                <span className="embed-placeholder-icon">▶</span>
                <span>{post.title || DEFAULT_TITLE}</span>
              </div>
            ))}
        </div>
      </div>

      <div className="social-action-bar">
        <div className="metric-pill" title="Views">
          <Eye className="action-icon" size={40} strokeWidth={2} aria-hidden="true" />
          <span>{formatCount(viewerCount)}</span>
        </div>

        <button
          type="button"
          className="action-pill"
          onClick={() => onOpenComments(post)}
          aria-label="Open comments"
        >
          <MessageCircle className="action-icon" size={40} strokeWidth={2} aria-hidden="true" />
          <span>{formatCount(commentCount)}</span>
        </button>

        <button
          type="button"
          className="action-pill"
          onClick={() => onShare(post)}
          aria-label="Share post"
        >
          <Share2 className="action-icon" size={40} strokeWidth={2} aria-hidden="true" />
          <span>Share</span>
        </button>

        <button
          type="button"
          className={`action-pill heart-action${reacted ? " heart-action-active" : ""}`}
          onClick={() => onReact(post)}
          aria-label="Like post"
          disabled={reacting}
        >
          <Heart
            className="heart-icon"
            size={40}
            strokeWidth={2}
            fill="currentColor"
            aria-hidden="true"
          />
          <span>{formatCount(reactionCount)}</span>
        </button>
      </div>

      <div className="screen-scanlines" aria-hidden="true" />
      <div className="screen-reflection" aria-hidden="true" />
      <div className="screen-vignette" aria-hidden="true" />
    </section>
  );
});

HomePost.displayName = "HomePost";

const FeedXTopBar = memo(({ openEditor }) => (
  <header className="feedx-topbar">
    <h1 className="feedx-logo">
      Feed<span>X</span>
    </h1>

    <button
      type="button"
      className="top-create-button"
      onClick={openEditor}
      aria-label="Create post"
      title="Create post"
    >
      <Plus size={42} strokeWidth={2} aria-hidden="true" />
    </button>
  </header>
));

FeedXTopBar.displayName = "FeedXTopBar";

const EditorModal = memo(
  ({
    newCreatorName,
    setNewCreatorName,
    newCreatorIdentity,
    setNewCreatorIdentity,
    newTitle,
    setNewTitle,
    newMediaUrl,
    setNewMediaUrl,
    subtitle,
    setSubtitle,
    handleLogoChange,
    logoPreview,
    handleMediaFileChange,
    mediaPreview,
    mediaPreviewType,
    applyChanges,
    closeEditor,
    saving,
    compressingMedia,
  }) => (
    <div className="modal-overlay" onClick={closeEditor}>
      <div
        className="modal-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2>＋ Create New Post</h2>

          <button
            type="button"
            onClick={closeEditor}
            className="modal-close"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="form-section">
          <div className="section-heading">Public profile</div>

          <label htmlFor="field-creator-name">Creator Name</label>
          <input
            id="field-creator-name"
            type="text"
            placeholder="Madman Official"
            value={newCreatorName}
            onChange={(event) => setNewCreatorName(event.target.value)}
          />

          <p className="field-help">
            This is the public name shown on your post.
          </p>
        </div>

        <div className="form-section">
          <div className="section-heading">Private contact</div>

          <label htmlFor="field-contact">Contact</label>
          <input
            id="field-contact"
            type="text"
            placeholder="+250788123456 or https://mywebsite.com"
            value={newCreatorIdentity}
            onChange={(event) =>
              setNewCreatorIdentity(event.target.value)
            }
          />

          <p className="field-help">
            This opens when a viewer taps the envelope.
          </p>
        </div>

        <div className="form-section">
          <div className="section-heading">Post</div>

          <label htmlFor="field-title">Post Title (Optional)</label>
          <input
            id="field-title"
            type="text"
            placeholder="Morning in Kigali"
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
          />

          <p className="field-help">
            This title will appear in bold.
          </p>

          <label htmlFor="field-message">Message (Optional)</label>
          <textarea
            id="field-message"
            placeholder={"Welcome everyone!\nEnjoy today's video."}
            value={subtitle}
            onChange={(event) => setSubtitle(event.target.value)}
          />

          <p className="field-help">
            This message will appear below the bold title.
          </p>
        </div>

        <div className="form-section">
          <div className="section-heading">Media</div>

          <label
            className="file-picker"
            htmlFor="field-media-upload"
          >
            <span>
              {compressingMedia ? "Processing..." : "▣ Choose a photo or video"}
            </span>

            <input
              id="field-media-upload"
              type="file"
              accept="image/*,video/*"
              disabled={compressingMedia}
              onChange={(event) =>
                handleMediaFileChange(
                  event.target.files?.[0] || null
                )
              }
            />
          </label>

          {mediaPreview && (
            <div className="preview-wrap">
              {mediaPreviewType === "image" ? (
                <img
                  src={mediaPreview}
                  alt="Selected media"
                  className="media-preview"
                />
              ) : (
                <video
                  src={mediaPreview}
                  className="media-preview"
                  controls
                  muted
                  playsInline
                />
              )}
            </div>
          )}

          <label htmlFor="field-media-link">
            Media Link (Optional)
          </label>

          <input
            id="field-media-link"
            type="text"
            placeholder="https://youtube.com/..."
            value={newMediaUrl}
            onChange={(event) =>
              setNewMediaUrl(event.target.value)
            }
          />

          <p className="field-help">
            Upload media or paste a supported link.
          </p>
        </div>

        <div className="form-section form-section-last">
          <div className="section-heading">Profile</div>

          <label
            className="file-picker"
            htmlFor="field-profile-photo"
          >
            <span>
              {compressingMedia ? "Processing..." : "◎ Choose a profile photo"}
            </span>

            <input
              id="field-profile-photo"
              type="file"
              accept="image/*"
              disabled={compressingMedia}
              onChange={(event) =>
                handleLogoChange(event.target.files?.[0] || null)
              }
            />
          </label>

          {logoPreview && (
            <div className="preview-wrap">
              <img
                src={logoPreview}
                alt="Profile preview"
                className="logo-preview"
              />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={applyChanges}
          className="save-button"
          disabled={saving || compressingMedia}
        >
          {saving ? "Saving..." : "Create Post"}
        </button>

        <button
          type="button"
          onClick={closeEditor}
          className="cancel-button"
        >
          Cancel
        </button>
      </div>
    </div>
  )
);

EditorModal.displayName = "EditorModal";

const CommentsModal = memo(
  ({
    post,
    comments,
    loadingComments,
    phone,
    setPhone,
    text,
    setText,
    submitComment,
    submitting,
    closeComments,
  }) => (
    <div className="modal-overlay comments-overlay" onClick={closeComments}>
      <section
        className="comments-sheet"
        onClick={(event) => event.stopPropagation()}
        aria-label="Comments"
      >
        <header className="comments-sheet-header">
          <div>
            <h2>
              Comments <span>({comments.length})</span>
            </h2>
            <p>{post.title || DEFAULT_TITLE}</p>
          </div>

          <button
            type="button"
            onClick={closeComments}
            className="comments-collapse-button"
            aria-label="Close comments"
          >
            <ChevronDown size={46} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </header>

        <div className="comments-list">
          {loadingComments ? (
            <div className="no-comments">
              <span>Loading comments...</span>
            </div>
          ) : comments.length === 0 ? (
            <div className="no-comments">
              <MessageCircle size={44} strokeWidth={1.8} aria-hidden="true" />
              <strong>No comments yet</strong>
              <span>Be the first viewer to comment.</span>
            </div>
          ) : (
            comments.map((comment) => (
              <article className="comment-item" key={comment.id}>
                <div className="comment-avatar" aria-hidden="true">
                  <span>{comment.country_flag || "🌍"}</span>
                </div>

                <div className="comment-content">
                  <div className="comment-topline">
                    <strong>Viewer from</strong>
                    <time>
                      {comment.created_at
                        ? new Date(comment.created_at).toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : ""}
                    </time>
                  </div>

                  <p>{comment.comment}</p>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="comment-composer">
          <div className="comment-composer-identity">
            <div className="comment-flag-preview" aria-hidden="true">
              <span>{getCountryFlag(phone)}</span>
            </div>

            <div className="comment-phone-field">
              <label htmlFor="comment-phone">Phone number</label>
              <input
                id="comment-phone"
                type="tel"
                inputMode="tel"
                placeholder="+250 788 123 456"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </div>
          </div>

          <div className="comment-compose-row">
            <textarea
              id="comment-message"
              placeholder="Write your comment..."
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={2}
              maxLength={500}
            />

            <button
              type="button"
              className="comment-send-button"
              onClick={submitComment}
              disabled={submitting}
            >
              {submitting ? "Sending..." : "Send"}
            </button>
          </div>

          <p className="comment-privacy">
            Your phone number stays private. Only its country flag is shown.
            We only check the number's format — we don't verify you own it.
          </p>
        </div>
      </section>
    </div>
  )
);

CommentsModal.displayName = "CommentsModal";

/**
 * A proper modal (never window.prompt()) asking for a WhatsApp number
 * before a viewer's first like on this device.
 */
const PhoneNumberModal = memo(({ value, setValue, error, onConfirm, onClose }) => (
  <div className="modal-overlay phone-modal-overlay" onClick={onClose}>
    <div
      className="modal-card phone-modal-card"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="modal-header">
        <h2>Enter your WhatsApp number</h2>

        <button
          type="button"
          onClick={onClose}
          className="modal-close"
          aria-label="Close"
        >
          <X size={20} strokeWidth={2.4} aria-hidden="true" />
        </button>
      </div>

      <div className="form-section form-section-last">
        <label htmlFor="phone-modal-input">WhatsApp number</label>
        <input
          id="phone-modal-input"
          type="tel"
          inputMode="tel"
          autoFocus
          placeholder="+250 788 123 456"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onConfirm();
          }}
        />

        {error && <p className="phone-modal-error">{error}</p>}

        <p className="field-help">
          We only check that this looks like a real phone number — we don't
          verify that you own it, and no OTP code is sent.
        </p>
      </div>

      <button type="button" onClick={onConfirm} className="save-button">
        Confirm &amp; Like
      </button>

      <button type="button" onClick={onClose} className="cancel-button">
        Cancel
      </button>
    </div>
  </div>
));

PhoneNumberModal.displayName = "PhoneNumberModal";

function HomeStyles() {
  return (
    <style>{`
      :root {
        --page-bg: #020712;
        --panel-bg: #06101f;
        --blue: #087cff;
        --blue-bright: #168bff;
        --blue-border: rgba(22, 139, 255, 0.78);
        --muted: #9ba8ba;
        --danger: #ff334f;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body,
      #root {
        min-height: 100%;
        margin: 0;
        background: var(--page-bg);
      }

      body {
        overflow-x: hidden;
      }

      button,
      input,
      textarea {
        font: inherit;
      }

      .home-page {
        width: 100%;
        min-height: 100svh;
        color: #ffffff;
        background:
          radial-gradient(circle at 50% -12%, rgba(8, 124, 255, 0.13), transparent 34%),
          var(--page-bg);
      }

      .feedx-topbar {
        width: min(calc(100% - 32px), 880px);
        min-height: 118px;
        margin: 0 auto;
        padding: max(24px, env(safe-area-inset-top)) 18px 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .feedx-logo {
        margin: 0;
        color: #ffffff;
        font-family: Arial, Helvetica, sans-serif;
        font-size: clamp(44px, 6vw, 70px);
        font-weight: 900;
        line-height: 1;
        letter-spacing: -2px;
      }

      .feedx-logo span {
        color: var(--blue);
      }

      .top-create-button {
        width: 94px;
        height: 94px;
        flex: 0 0 94px;
        display: grid;
        place-items: center;
        padding: 0;
        border: 0;
        border-radius: 50%;
        color: #ffffff;
        background: linear-gradient(145deg, #1d8cff, #0067ee);
        cursor: pointer;
        box-shadow:
          0 0 12px rgba(22, 139, 255, 0.9),
          0 0 30px rgba(22, 139, 255, 0.45),
          inset 0 0 16px rgba(255, 255, 255, 0.18);
      }

      .home-feed {
        width: 100%;
        padding: 0 0 max(40px, env(safe-area-inset-bottom));
      }

      .home-post {
        width: min(calc(100% - 32px), 880px);
        margin: 0 auto 28px;
        padding: 0 0 24px;
        position: relative;
        overflow: hidden;
        isolation: isolate;
        border: 1px solid var(--blue-border);
        border-radius: 36px;
        background:
          linear-gradient(180deg, rgba(7, 19, 36, 0.995), rgba(2, 10, 22, 0.995));
        box-shadow:
          0 22px 50px rgba(0, 0, 0, 0.58),
          0 0 24px rgba(8, 124, 255, 0.10);
      }

      .crt-screen {
        animation: screenFlicker 8s infinite;
      }

      .post-header {
        position: relative;
        z-index: 10;
        min-height: 184px;
        display: flex;
        align-items: center;
        gap: 26px;
        padding: 28px 34px 24px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        background: rgba(4, 14, 29, 0.42);
      }

      .profile-picture-button {
        width: 122px;
        height: 122px;
        flex: 0 0 122px;
        padding: 0;
        overflow: hidden;
        border: 0;
        border-radius: 50%;
        background: transparent;
        cursor: pointer;
      }

      .profile-picture {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: cover;
        border-radius: 50%;
      }

      .profile-details {
        min-width: 0;
        flex: 1;
        display: flex;
        align-items: center;
      }

      .creator-name {
        overflow: hidden;
        color: #ffffff;
        font-family: Arial, Helvetica, sans-serif;
        font-size: clamp(28px, 4vw, 42px);
        font-weight: 800;
        line-height: 1.1;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-shadow:
          0 0 6px rgba(22, 139, 255, 1),
          0 0 20px rgba(22, 139, 255, 0.72);
      }

      .inbox-button,
      .post-menu-button {
        border: 0;
        color: #ffffff;
        background: transparent;
        cursor: pointer;
      }

      .inbox-button {
        width: 132px;
        height: 98px;
        flex: 0 0 132px;
        position: relative;
        display: grid;
        place-items: center;
        padding: 0;
      }

      .inbox-envelope {
        color: #ffffff;
        filter:
          drop-shadow(0 0 7px rgba(22, 139, 255, 1))
          drop-shadow(0 0 22px rgba(22, 139, 255, 0.95));
      }

      .unread-dot {
        width: 32px;
        height: 32px;
        position: absolute;
        top: 2px;
        right: 16px;
        border: 3px solid #06101f;
        border-radius: 50%;
        background: var(--danger);
        box-shadow:
          0 0 8px rgba(255, 51, 79, 1),
          0 0 18px rgba(255, 51, 79, 0.72);
      }

      .post-menu-button {
        width: 48px;
        height: 70px;
        flex: 0 0 48px;
        display: grid;
        place-items: center;
        padding: 0;
      }

      .post-copy {
        position: relative;
        z-index: 5;
        padding: 34px 36px 26px;
        text-align: left;
      }

      .post-title {
        margin: 0 0 20px;
        color: #ffffff;
        font-family: Arial, Helvetica, sans-serif;
        font-size: clamp(34px, 5vw, 52px);
        font-weight: 800;
        line-height: 1.18;
        letter-spacing: -0.5px;
        overflow-wrap: anywhere;
      }

      .post-message {
        margin: 0;
        color: #c5cedb;
        font-family: Arial, Helvetica, sans-serif;
        font-size: clamp(24px, 3vw, 34px);
        font-weight: 400;
        line-height: 1.45;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }

      .media-viewport {
        width: calc(100% - 64px);
        min-height: 360px;
        max-height: 72svh;
        aspect-ratio: 16 / 9;
        position: relative;
        z-index: 4;
        overflow: hidden;
        margin: 0 32px;
        border: 1px solid rgba(22, 139, 255, 0.22);
        border-radius: 28px;
        background: #000000;
        box-shadow: 0 16px 38px rgba(0, 0, 0, 0.48);
      }

      .media-layer {
        width: 100%;
        height: 100%;
        display: grid;
        place-items: center;
      }

      .home-media {
        width: 100%;
        height: 100%;
        display: block;
        border: 0;
        object-fit: contain;
        background: #000000;
      }

      .embed-placeholder,
      .media-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 24px;
        color: #dce7f7;
        background:
          radial-gradient(circle, rgba(8, 124, 255, 0.17), transparent 54%),
          #020712;
        text-align: center;
      }

      .embed-placeholder-icon {
        font-size: 48px;
      }

      .social-action-bar {
        position: relative;
        z-index: 8;
        width: calc(100% - 64px);
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 18px;
        margin: 24px 32px 0;
      }

      .metric-pill,
      .action-pill {
        min-width: 0;
        min-height: 94px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 14px;
        padding: 0 18px;
        border: 1px solid rgba(22, 139, 255, 0.38);
        border-radius: 28px;
        color: #ffffff;
        background:
          linear-gradient(180deg, rgba(8, 26, 55, 0.96), rgba(2, 10, 23, 0.96));
        font-family: Arial, Helvetica, sans-serif;
        font-size: clamp(22px, 2.6vw, 32px);
        font-weight: 800;
        box-shadow:
          inset 0 0 15px rgba(22, 139, 255, 0.06),
          0 8px 20px rgba(0, 0, 0, 0.35);
      }

      .action-pill {
        cursor: pointer;
      }

      .action-pill:disabled {
        opacity: 0.6;
        cursor: default;
      }

      .heart-action-active .heart-icon {
        color: #ff5773;
      }

      .action-icon {
        color: #ffffff;
        filter:
          drop-shadow(0 0 6px rgba(22, 139, 255, 1))
          drop-shadow(0 0 18px rgba(22, 139, 255, 0.82));
      }

      .heart-icon {
        color: #ff3156;
        filter:
          drop-shadow(0 0 6px rgba(255, 49, 86, 1))
          drop-shadow(0 0 18px rgba(255, 49, 86, 0.74));
      }

      .post-menu-button svg,
      .comments-collapse-button svg,
      .top-create-button svg {
        display: block;
      }

      .screen-scanlines,
      .screen-reflection,
      .screen-vignette {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }

      .screen-scanlines {
        z-index: 30;
        opacity: 0.025;
        background:
          repeating-linear-gradient(
            to bottom,
            transparent 0,
            transparent 5px,
            rgba(255, 255, 255, 0.12) 6px
          );
      }

      .screen-reflection {
        z-index: 31;
        opacity: 0.08;
        background:
          linear-gradient(
            118deg,
            rgba(255, 255, 255, 0.10) 0%,
            rgba(255, 255, 255, 0.018) 22%,
            transparent 43%
          );
      }

      .screen-vignette {
        z-index: 32;
        border-radius: inherit;
        box-shadow: inset 0 0 30px rgba(0, 0, 0, 0.30);
      }

      .load-more-wrap {
        display: flex;
        justify-content: center;
        padding: 6px 0 40px;
      }

      .load-more-button {
        min-height: 54px;
        padding: 0 28px;
        border: 1px solid rgba(22, 139, 255, 0.42);
        border-radius: 18px;
        color: #ffffff;
        background: rgba(8, 26, 55, 0.9);
        font-weight: 800;
        cursor: pointer;
      }

      .load-more-button:disabled {
        opacity: 0.6;
        cursor: wait;
      }

      .modal-overlay {
        position: fixed;
        inset: 0;
        z-index: 10000;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        padding: 0;
        background: rgba(0, 3, 10, 0.91);
        backdrop-filter: blur(8px);
      }

      .modal-card {
        width: 100%;
        max-width: 520px;
        max-height: 93svh;
        overflow-y: auto;
        padding: 18px 18px 26px;
        border: 1px solid rgba(22, 139, 255, 0.30);
        border-radius: 24px 24px 0 0;
        color: #ffffff;
        background:
          radial-gradient(circle at top, rgba(8, 124, 255, 0.14), transparent 34%),
          #06101f;
        box-shadow: 0 -18px 50px rgba(0, 0, 0, 0.55);
      }

      .phone-modal-overlay {
        align-items: center;
      }

      .phone-modal-card {
        border-radius: 24px;
      }

      .phone-modal-error {
        margin: -2px 0 12px;
        color: #ff5773;
        font-size: 12px;
        font-weight: 700;
      }

      .modal-header {
        position: sticky;
        top: -18px;
        z-index: 4;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin: -18px -18px 14px;
        padding: 18px;
        border-bottom: 1px solid rgba(22, 139, 255, 0.16);
        background: rgba(4, 13, 29, 0.96);
      }

      .modal-header h2 {
        margin: 0;
        font-size: 19px;
        font-weight: 900;
      }

      .modal-close {
        width: 38px;
        height: 38px;
        display: grid;
        place-items: center;
        padding: 0;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 50%;
        color: #ffffff;
        background: rgba(255, 255, 255, 0.05);
        font-size: 23px;
        cursor: pointer;
      }

      .form-section {
        margin-bottom: 18px;
        padding-bottom: 18px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.075);
      }

      .form-section-last {
        border-bottom: 0;
      }

      .section-heading {
        margin-bottom: 10px;
        color: #64b3ff;
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 1px;
        text-transform: uppercase;
      }

      .modal-card label {
        display: block;
        margin: 0 0 6px;
        color: #e8eef8;
        font-size: 13px;
        font-weight: 700;
      }

      .modal-card input,
      .modal-card textarea {
        width: 100%;
        min-height: 48px;
        margin: 0 0 6px;
        padding: 12px 13px;
        border: 1px solid rgba(22, 139, 255, 0.22);
        border-radius: 11px;
        outline: none;
        color: #ffffff;
        background: rgba(1, 7, 18, 0.74);
      }

      .modal-card textarea {
        min-height: 88px;
        resize: vertical;
      }

      .modal-card input:focus,
      .modal-card textarea:focus {
        border-color: rgba(22, 139, 255, 0.78);
        box-shadow: 0 0 0 3px rgba(22, 139, 255, 0.09);
      }

      .field-help {
        margin: 0 0 12px;
        color: var(--muted);
        font-size: 11px;
        line-height: 1.45;
      }

      .file-picker {
        min-height: 50px;
        display: flex !important;
        align-items: center;
        padding: 12px 13px;
        border: 1px dashed rgba(22, 139, 255, 0.40);
        border-radius: 11px;
        background: rgba(8, 124, 255, 0.06);
        cursor: pointer;
      }

      .file-picker input {
        position: absolute;
        width: 1px;
        height: 1px;
        opacity: 0;
        overflow: hidden;
      }

      .preview-wrap {
        margin: 10px 0 14px;
      }

      .media-preview {
        width: 100%;
        max-height: 220px;
        display: block;
        object-fit: contain;
        border: 1px solid rgba(22, 139, 255, 0.28);
        border-radius: 12px;
        background: #000000;
      }

      .logo-preview {
        width: 60px;
        height: 60px;
        display: block;
        object-fit: cover;
        border-radius: 50%;
      }

      .save-button,
      .cancel-button {
        width: 100%;
        min-height: 50px;
        padding: 13px;
        border-radius: 13px;
        font-size: 15px;
        font-weight: 900;
        cursor: pointer;
      }

      .save-button {
        border: 1px solid rgba(22, 139, 255, 0.48);
        color: #ffffff;
        background: linear-gradient(145deg, var(--blue-bright), #0064df);
      }

      .save-button:disabled {
        opacity: 0.65;
        cursor: wait;
      }

      .cancel-button {
        margin-top: 10px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        color: #d9e2ef;
        background: transparent;
      }

      .comments-overlay {
        align-items: flex-end;
        padding: 0;
      }

      .comments-sheet {
        width: min(calc(100% - 32px), 880px);
        max-height: 88svh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border: 1px solid rgba(22, 139, 255, 0.48);
        border-radius: 32px 32px 0 0;
        color: #ffffff;
        background:
          radial-gradient(circle at 15% 0%, rgba(22, 139, 255, 0.10), transparent 30%),
          linear-gradient(180deg, #06101f 0%, #020814 100%);
        box-shadow:
          0 -22px 60px rgba(0, 0, 0, 0.68),
          0 0 26px rgba(8, 124, 255, 0.14);
      }

      .comments-sheet-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 24px;
        padding: 30px 34px 24px;
      }

      .comments-sheet-header h2 {
        margin: 0;
        color: #ffffff;
        font-family: Arial, Helvetica, sans-serif;
        font-size: clamp(31px, 4vw, 46px);
        font-weight: 900;
        line-height: 1.05;
        letter-spacing: -0.7px;
      }

      .comments-sheet-header h2 span {
        color: #8d9aaf;
        font-weight: 500;
      }

      .comments-sheet-header p {
        margin: 13px 0 0;
        color: #8d9aaf;
        font-size: clamp(17px, 2vw, 23px);
        line-height: 1.35;
      }

      .comments-collapse-button {
        width: 64px;
        height: 64px;
        flex: 0 0 64px;
        display: grid;
        place-items: center;
        padding: 0;
        border: 0;
        color: #c6cfdd;
        background: transparent;
        cursor: pointer;
      }

      .comments-list {
        min-height: 0;
        flex: 1;
        overflow-y: auto;
        padding: 0 34px;
        scrollbar-width: thin;
        scrollbar-color: rgba(22, 139, 255, 0.42) transparent;
      }

      .no-comments {
        min-height: 240px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 9px;
        color: #8d9aaf;
        text-align: center;
      }

      .no-comments svg {
        color: #168bff;
        filter: drop-shadow(0 0 10px rgba(22, 139, 255, 0.42));
      }

      .no-comments strong {
        color: #ffffff;
        font-size: 20px;
      }

      .comment-item {
        display: grid;
        grid-template-columns: 96px minmax(0, 1fr);
        gap: 24px;
        align-items: start;
        padding: 28px 0;
        border-bottom: 1px solid rgba(22, 139, 255, 0.17);
      }

      .comment-avatar,
      .comment-flag-preview {
        display: grid;
        place-items: center;
        overflow: hidden;
        border: 0;
        border-radius: 50%;
        background: transparent;
      }

      .comment-avatar {
        width: 92px;
        height: 92px;
        font-size: 74px;
        line-height: 1;
      }

      .comment-avatar span,
      .comment-flag-preview span {
        width: 100%;
        height: 100%;
        display: grid;
        place-items: center;
        line-height: 1;
        transform: scale(1.48);
      }

      .comment-content {
        min-width: 0;
      }

      .comment-topline {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
      }

      .comment-topline strong {
        color: #2196ff;
        font-size: clamp(19px, 2.4vw, 27px);
        font-weight: 900;
      }

      .comment-topline time {
        flex: 0 0 auto;
        color: #8d9aaf;
        font-size: clamp(15px, 1.8vw, 20px);
      }

      .comment-content p {
        margin: 12px 0 0;
        color: #ffffff;
        font-size: clamp(22px, 2.7vw, 31px);
        font-weight: 400;
        line-height: 1.4;
        overflow-wrap: anywhere;
      }

      .comment-composer {
        padding: 22px 34px max(26px, env(safe-area-inset-bottom));
        border-top: 1px solid rgba(22, 139, 255, 0.18);
        background: rgba(2, 8, 20, 0.98);
        box-shadow: 0 -16px 30px rgba(0, 0, 0, 0.28);
      }

      .comment-composer-identity {
        display: grid;
        grid-template-columns: 66px minmax(0, 1fr);
        gap: 16px;
        align-items: end;
        margin-bottom: 14px;
      }

      .comment-flag-preview {
        width: 62px;
        height: 62px;
        font-size: 49px;
      }

      .comment-phone-field {
        min-width: 0;
      }

      .comment-phone-field label {
        display: block;
        margin: 0 0 7px;
        color: #dce5f2;
        font-size: 13px;
        font-weight: 800;
      }

      .comment-phone-field input {
        width: 100%;
        min-height: 52px;
        padding: 12px 15px;
        border: 1px solid rgba(22, 139, 255, 0.32);
        border-radius: 14px;
        outline: none;
        color: #ffffff;
        background: rgba(0, 5, 14, 0.92);
      }

      .comment-phone-field input:focus,
      .comment-compose-row textarea:focus {
        border-color: rgba(22, 139, 255, 0.9);
        box-shadow: 0 0 0 3px rgba(22, 139, 255, 0.10);
      }

      .comment-compose-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 14px;
        align-items: stretch;
      }

      .comment-compose-row textarea {
        width: 100%;
        min-height: 72px;
        max-height: 150px;
        padding: 16px;
        resize: vertical;
        border: 1px solid rgba(22, 139, 255, 0.32);
        border-radius: 17px;
        outline: none;
        color: #ffffff;
        background: rgba(0, 5, 14, 0.92);
      }

      .comment-send-button {
        min-width: 128px;
        padding: 0 26px;
        border: 1px solid rgba(82, 169, 255, 0.7);
        border-radius: 17px;
        color: #ffffff;
        background: linear-gradient(145deg, #2092ff, #0874ed);
        font-weight: 900;
        cursor: pointer;
        box-shadow:
          0 9px 22px rgba(8, 124, 255, 0.22),
          inset 0 0 12px rgba(255, 255, 255, 0.10);
      }

      .comment-send-button:disabled {
        opacity: 0.65;
        cursor: wait;
      }

      .comment-send-button:active {
        transform: scale(0.98);
      }

      .comment-privacy {
        margin: 10px 2px 0;
        color: #7f8ba0;
        font-size: 11px;
        line-height: 1.4;
        text-align: center;
      }

      @media (max-width: 700px) {
        .comments-sheet {
          width: 100%;
          max-height: 90svh;
          border-right: 0;
          border-left: 0;
          border-bottom: 0;
          border-radius: 25px 25px 0 0;
        }

        .comments-sheet-header {
          padding: 20px 20px 16px;
        }

        .comments-sheet-header h2 {
          font-size: 28px;
        }

        .comments-sheet-header p {
          margin-top: 8px;
          font-size: 14px;
        }

        .comments-collapse-button {
          width: 46px;
          height: 46px;
          flex-basis: 46px;
        }

        .comments-list {
          padding: 0 20px;
        }

        .comment-item {
          grid-template-columns: 64px minmax(0, 1fr);
          gap: 15px;
          padding: 20px 0;
        }

        .comment-avatar {
          width: 62px;
          height: 62px;
          font-size: 50px;
        }

        .comment-topline {
          gap: 10px;
        }

        .comment-topline strong {
          font-size: 17px;
        }

        .comment-topline time {
          font-size: 12px;
        }

        .comment-content p {
          margin-top: 8px;
          font-size: 18px;
        }

        .comment-composer {
          padding: 14px 16px max(16px, env(safe-area-inset-bottom));
        }

        .comment-composer-identity {
          grid-template-columns: 50px minmax(0, 1fr);
          gap: 10px;
          margin-bottom: 10px;
        }

        .comment-flag-preview {
          width: 48px;
          height: 48px;
          font-size: 38px;
        }

        .comment-phone-field input {
          min-height: 44px;
          padding: 10px 12px;
        }

        .comment-compose-row {
          gap: 9px;
        }

        .comment-compose-row textarea {
          min-height: 58px;
          padding: 13px;
        }

        .comment-send-button {
          min-width: 88px;
          padding: 0 16px;
        }
      }

      .zoom-overlay {
        position: fixed;
        inset: 0;
        z-index: 10001;
        display: grid;
        place-items: center;
        padding: 18px;
        background: rgba(0, 0, 0, 0.95);
        cursor: zoom-out;
      }

      .zoom-image {
        max-width: 92vw;
        max-height: 90vh;
        display: block;
        object-fit: contain;
        border-radius: 16px;
      }

      .loading-state,
      .empty-state {
        width: min(88%, 420px);
        margin: 110px auto 0;
        color: #bcd9ff;
        text-align: center;
      }

      .empty-button {
        min-height: 48px;
        margin-top: 12px;
        padding: 0 18px;
        border: 1px solid rgba(22, 139, 255, 0.50);
        border-radius: 15px;
        color: #ffffff;
        background: #087cff;
        font-weight: 900;
        cursor: pointer;
      }

      @keyframes screenFlicker {
        0%, 19%, 21%, 54%, 100% { filter: brightness(1); }
        20% { filter: brightness(0.994); }
        55% { filter: brightness(1.004); }
      }

      @media (max-width: 700px) {
        .feedx-topbar {
          width: min(calc(100% - 20px), 680px);
          min-height: 76px;
          padding: max(10px, env(safe-area-inset-top)) 4px 9px;
        }

        .feedx-logo {
          font-size: clamp(36px, 10vw, 48px);
        }

        .top-create-button {
          width: 56px;
          height: 56px;
          flex-basis: 56px;
        }

        .home-post {
          width: min(calc(100% - 16px), 680px);
          margin-bottom: 18px;
          padding-bottom: 12px;
          border-radius: 24px;
        }

        .post-header {
          min-height: 78px;
          gap: 9px;
          padding: 11px 10px 10px;
        }

        .profile-picture-button {
          width: 56px;
          height: 56px;
          flex-basis: 56px;
        }

        .creator-name {
          font-size: clamp(18px, 5vw, 22px);
        }

        .inbox-button {
          width: 58px;
          height: 50px;
          flex-basis: 58px;
        }

        .inbox-envelope {
          width: 34px;
          height: 34px;
        }

        .unread-dot {
          width: 18px;
          height: 18px;
          top: 1px;
          right: 1px;
          border-width: 2px;
        }

        .post-menu-button {
          width: 30px;
          height: 44px;
          flex-basis: 30px;
        }

        .post-menu-button svg {
          width: 26px;
          height: 26px;
        }

        .post-copy {
          padding: 16px 18px 14px;
          text-align: center;
        }

        .post-title {
          margin-bottom: 10px;
          font-size: clamp(20px, 6vw, 25px);
        }

        .post-message {
          font-size: clamp(16px, 4.6vw, 19px);
        }

        .media-viewport {
          width: calc(100% - 24px);
          min-height: 220px;
          max-height: 58svh;
          aspect-ratio: 9 / 12;
          margin: 0 12px;
          border-radius: 22px;
        }

        .social-action-bar {
          width: calc(100% - 24px);
          gap: 6px;
          margin: 12px 12px 0;
        }

        .metric-pill,
        .action-pill {
          min-height: 48px;
          gap: 5px;
          padding: 0 5px;
          border-radius: 16px;
          font-size: clamp(12px, 3.5vw, 15px);
        }

        .action-icon,
        .heart-icon {
          width: 23px;
          height: 23px;
        }

        .comments-sheet {
          width: 100%;
          max-height: 88svh;
          border-radius: 24px 24px 0 0;
        }

        .comments-sheet-header {
          padding: 18px 18px 14px;
        }

        .comments-sheet-header h2 {
          font-size: 22px;
        }

        .comments-sheet-header p {
          font-size: 12px;
        }

        .comments-collapse-button {
          width: 42px;
          height: 42px;
        }

        .comments-list {
          padding: 0 18px;
        }

        .comment-item {
          gap: 12px;
          padding: 16px 0;
        }

        .comment-avatar,
        .comment-flag-preview {
          width: 52px;
          height: 52px;
          flex-basis: 52px;
          font-size: 40px;
        }

        .comment-country {
          font-size: 14px;
        }

        .comment-body p {
          font-size: 16px;
        }

        .comment-composer {
          padding: 14px 16px max(16px, env(safe-area-inset-bottom));
        }

        .comment-composer-top {
          gap: 10px;
          margin-bottom: 10px;
        }

        .comment-phone-field input {
          min-height: 44px;
          padding: 10px 12px;
        }

        .comment-compose-row {
          gap: 10px;
        }

        .comment-compose-row textarea {
          min-height: 58px;
        }

        .comment-send-button {
          min-width: 92px;
          padding: 0 18px;
        }
      }

      /* Low-memory / low-power device optimizations: disable heavy CRT
         effects on small screens. */
      @media (max-width: 600px) {
        .crt-screen {
          animation: none !important;
        }

        .screen-scanlines,
        .screen-reflection,
        .screen-vignette {
          display: none !important;
        }

        .home-post {
          box-shadow: none;
          border-radius: 20px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
          animation: none !important;
          transition: none !important;
        }
      }
    `}</style>
  );
}

export default Home;
