import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Eye,
  EyeOff,
  ImagePlus,
  MessageSquare,
  Send,
  X,
  Zap,
} from "lucide-react";

import {
  countryCodeToFlagEmoji,
  TV_COUNTRY_OPTIONS,
} from "../../utils/countries";

import TvConversationMessage from "./TvConversationMessage";

const TV_VISIBLE_MESSAGE_LIMIT = 8;
const TV_MESSAGE_LANE_HEIGHT = 78;
const TV_POLL_INTERVAL_MS = 7000;
const TV_MESSAGE_DURATION_SECONDS = 30;
const TV_MESSAGE_STAGGER_SECONDS = 3.75;

// How often we tell the server "I'm still watching this post". 12 s is
// chosen so a 40 s server-side TTL covers two missed heartbeats before the
// viewer is considered gone.
const TV_WATCH_HEARTBEAT_MS = 12000;

const TV_IDENTITY_KEY_PREFIX = "gwamo-tv-identity:v2:";
const TV_PUBLIC_IDENTITY_KEY =
  `${TV_IDENTITY_KEY_PREFIX}public-viewer`;

const TV_PUBLIC_VIEWER_ID_KEY =
  "gwamo-tv-public-viewer-id:v1";

function getOrCreateTvPublicViewerId() {
  try {
    const existing =
      localStorage.getItem(TV_PUBLIC_VIEWER_ID_KEY);

    if (existing) return existing;

    const generated =
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
        ? `viewer-${crypto.randomUUID()}`
        : `viewer-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 10)}`;

    localStorage.setItem(
      TV_PUBLIC_VIEWER_ID_KEY,
      generated,
    );

    return generated;
  } catch {
    return `viewer-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
  }
}

// Smoothly animate a viewer count so it never jumps, never drops to zero
// while we still believe someone is watching, and never rises faster than
// a small step. This is purely visual smoothing on top of a real number -
// it never invents viewers.
function useSmoothedViewerCount(target) {
  const [displayed, setDisplayed] = useState(target || 0);
  const displayedRef = useRef(target || 0);

  useEffect(() => {
    const goal = Math.max(0, Number(target) || 0);
    let cancelled = false;
    let stepTimer = null;

    const tick = () => {
      if (cancelled) return;
      const current = displayedRef.current;
      const diff = goal - current;
      if (diff === 0) return;
      // Move toward the goal in modest steps. Small changes take a few
      // seconds; big jumps take a bit longer but never stall.
      const magnitude = Math.max(1, Math.ceil(Math.abs(diff) / 6));
      const next =
        diff > 0
          ? Math.min(goal, current + magnitude)
          : Math.max(goal, current - magnitude);
      displayedRef.current = next;
      setDisplayed(next);
      stepTimer = setTimeout(tick, 900);
    };

    stepTimer = setTimeout(tick, 400);
    return () => {
      cancelled = true;
      if (stepTimer) clearTimeout(stepTimer);
    };
  }, [target]);

  return displayed;
}

const TvConversationOverlay = memo(function TvConversationOverlay({
  postId,
  isActive,
  apiUrl,
  mode = "tv",
  viewCount = null,
  currentUser,
  getSessionToken,
  onRequireAuth,
  onZoomImage,
  compressImageFile,
  defaultLogo,
}) {
  const isSocialLife = mode === "social-life";
  const [visibleMessages, setVisibleMessages] = useState([]);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerText, setComposerText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [introStep, setIntroStep] = useState("name");
  const [introName, setIntroName] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [pausedMessageIds, setPausedMessageIds] = useState(() => new Set());
  const [remoteTypingUsers, setRemoteTypingUsers] = useState({});
  const [localTyping, setLocalTyping] = useState(false);
  const [liveWatchers, setLiveWatchers] = useState(null);
  const [tvIdentity, setTvIdentity] = useState({
    name: "",
    photoUrl: "",
    countryCode: "",
  });
  const socketRef = useRef(null);
  const pollTimerRef = useRef(null);
  const watcherTimerRef = useRef(null);
  const seenIdsRef = useRef(new Set());
  const isMountedRef = useRef(true);
  const typingStopTimerRef = useRef(null);
  const remoteTypingTimersRef = useRef(new Map());
  const publicViewerId = useMemo(() => getOrCreateTvPublicViewerId(), []);
  const identityKey = TV_PUBLIC_IDENTITY_KEY;
  const identityComplete = Boolean(
    tvIdentity.name && tvIdentity.photoUrl && tvIdentity.countryCode,
  );
  const filteredCountries = useMemo(() => {
    const query = countrySearch.trim().toLowerCase();
    if (!query) return TV_COUNTRY_OPTIONS;
    return TV_COUNTRY_OPTIONS.filter(([code, name]) =>
      `${name} ${code}`.toLowerCase().includes(query),
    );
  }, [countrySearch]);
  const circulatingMessages = useMemo(
    () => visibleMessages,
    [visibleMessages],
  );
  const localTypingIdentity = useMemo(
    () =>
      localTyping && identityComplete
        ? {
            id: publicViewerId,
            user_name: tvIdentity.name,
            profile_image: tvIdentity.photoUrl,
            country_code: tvIdentity.countryCode,
          }
        : null,
    [localTyping, identityComplete, publicViewerId, tvIdentity],
  );
  const typingPresence = useMemo(() => {
    if (localTypingIdentity) return localTypingIdentity;
    const remote = Object.values(remoteTypingUsers);
    if (!remote.length) return null;
    remote.sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
    return remote[0];
  }, [localTypingIdentity, remoteTypingUsers]);

  // The viewer count shown next to the LIVE badge. If the parent does not
  // provide one (e.g. Social Life), we fall back to the live watcher count
  // broadcast by the Worker. Smoothing keeps the number from jumping.
  const rawViewerCount = useMemo(() => {
    if (typeof viewCount === "number" && Number.isFinite(viewCount)) {
      return viewCount;
    }
    if (liveWatchers === null) return null;
    return liveWatchers;
  }, [viewCount, liveWatchers]);
  const smoothedViewerCount = useSmoothedViewerCount(rawViewerCount ?? 0);
  const showViewerCount =
    !isSocialLife && rawViewerCount !== null && rawViewerCount > 0;

  const saveIdentity = useCallback(
    (nextIdentity) => {
      setTvIdentity(nextIdentity);
      try {
        localStorage.setItem(identityKey, JSON.stringify(nextIdentity));
      } catch {
        // Local persistence is a convenience only; live chat still works.
      }
    },
    [identityKey],
  );

  useEffect(() => {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(identityKey) || "null");
    } catch {
      saved = null;
    }
    const normalized = {
      name: String(saved?.name || "").trim().slice(0, 50),
      photoUrl: String(saved?.photoUrl || "").trim(),
      countryCode: String(saved?.countryCode || "").trim().toUpperCase(),
    };
    setTvIdentity(normalized);
    setIntroName(normalized.name);
    if (!normalized.name) setIntroStep("name");
    else if (!normalized.photoUrl) setIntroStep("photo");
    else if (!normalized.countryCode) setIntroStep("country");
    else setIntroStep("message");
  }, [identityKey]);

  const laneCounterRef = useRef(0);
  const lastLiveLaunchRef = useRef(0);
  const appendMessages = useCallback((incoming, { live = false } = {}) => {
    if (!incoming || !incoming.length) return;

    const additions = [];

    for (const rawMessage of incoming) {
      if (!rawMessage) continue;

      const fallbackId =
        `${rawMessage.created_at || "now"}-` +
        `${rawMessage.user_name || "viewer"}-` +
        `${rawMessage.message || ""}`;

      const messageId = String(rawMessage.id ?? fallbackId);

      if (seenIdsRef.current.has(messageId)) continue;

      seenIdsRef.current.add(messageId);

      const slot =
        laneCounterRef.current % TV_VISIBLE_MESSAGE_LIMIT;

      laneCounterRef.current += 1;

      const assignedLane = slot;

      let delay = -(slot * TV_MESSAGE_STAGGER_SECONDS);

      if (live) {
        const nowSeconds = Date.now() / 1000;
        const previousLaunch = Number(lastLiveLaunchRef.current || 0);
        const secondsSincePrevious = previousLaunch
          ? Math.max(0, nowSeconds - previousLaunch)
          : TV_MESSAGE_STAGGER_SECONDS;

        delay = -Math.max(
          0,
          TV_MESSAGE_STAGGER_SECONDS - secondsSincePrevious,
        );
        lastLiveLaunchRef.current = nowSeconds;
      }

      // sender_key gives TvConversationMessage a stable handle to colour
      // the message from. Real senders have a phone; public viewers have a
      // viewer id; anonymous messages fall back to their name.
      const senderKey =
        rawMessage.phone ||
        rawMessage.user_phone ||
        rawMessage.user_id ||
        rawMessage.user_name ||
        messageId;

      additions.push({
        ...rawMessage,
        id: messageId,
        sender_key: String(senderKey),
        _tvLane: assignedLane,
        _tvDuration: TV_MESSAGE_DURATION_SECONDS,
        _tvDelay: delay,
      });
    }

    if (!additions.length) return;

    setVisibleMessages((current) => {
      const merged = [...current, ...additions];

      return merged.length > TV_VISIBLE_MESSAGE_LIMIT
        ? merged.slice(-TV_VISIBLE_MESSAGE_LIMIT)
        : merged;
    });
  }, []);
  const normalizePublicItems = useCallback((data) => {
    const items = Array.isArray(data?.comments)
      ? data.comments
      : Array.isArray(data?.messages)
        ? data.messages
        : [];
    return items
      .map((item) => ({
        ...item,
        message: String(item?.message ?? item?.comment ?? item?.text ?? "").trim(),
      }))
      .filter((item) => item.message);
  }, []);

  const fetchPublicItems = useCallback(
    async (limit = 10) => {
      const encodedPostId = encodeURIComponent(postId);
      const url = `${apiUrl}/api/tv/conversation?post_id=${encodedPostId}&limit=${limit}`;
      try {
        const response = await fetch(url, { cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data?.success === false) return [];
        return normalizePublicItems(data);
      } catch {
        return [];
      }
    },
    [apiUrl, postId, normalizePublicItems],
  );

  const loadRecent = useCallback(async () => {
    const recent = await fetchPublicItems(30);
    if (isMountedRef.current) {
      appendMessages(recent.slice(-TV_VISIBLE_MESSAGE_LIMIT));
    }
  }, [fetchPublicItems, appendMessages]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return;
    pollTimerRef.current = setInterval(async () => {
      if (document.hidden || !isMountedRef.current) return;
      const items = await fetchPublicItems(10);
      if (isMountedRef.current) appendMessages(items, { live: true });
    }, TV_POLL_INTERVAL_MS);
  }, [fetchPublicItems, appendMessages]);

  const clearRemoteTyping = useCallback((key) => {
    setRemoteTypingUsers((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    const timer = remoteTypingTimersRef.current.get(key);
    if (timer) clearTimeout(timer);
    remoteTypingTimersRef.current.delete(key);
  }, []);

  const receiveTypingPresence = useCallback(
    (payload) => {
      const typing = payload?.typing ?? payload?.active ?? true;
      const userId = String(payload?.viewer_id || payload?.user_id || "");
      if (userId && publicViewerId === userId) return;
      const key = userId || String(payload?.user_name || payload?.name || "viewer");
      if (!typing) {
        clearRemoteTyping(key);
        return;
      }
      const person = {
        id: key,
        user_name: payload?.user_name || payload?.name || "Someone",
        profile_image:
          payload?.profile_image || payload?.profile_image_url || defaultLogo,
        country_code: payload?.country_code || "",
        updatedAt: Date.now(),
      };
      setRemoteTypingUsers((current) => ({ ...current, [key]: person }));
      const oldTimer = remoteTypingTimersRef.current.get(key);
      if (oldTimer) clearTimeout(oldTimer);
      const timer = setTimeout(() => clearRemoteTyping(key), 2600);
      remoteTypingTimersRef.current.set(key, timer);
    },
    [clearRemoteTyping, publicViewerId, defaultLogo],
  );

  // Send a tiny presence heartbeat so the Worker can keep a real list of
  // who is watching this post right now. We only do this over the
  // WebSocket, since polling does not carry presence.
  const sendWatcherHeartbeat = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    try {
      socket.send(
        JSON.stringify({
          type: "tv_watching",
          tv_post_id: postId,
          viewer_id: publicViewerId,
        }),
      );
    } catch {
      // Presence is optional; the count just stays where it was.
    }
  }, [postId, publicViewerId]);

  const connectRealtime = useCallback(async () => {
    if (isSocialLife) {
      startPolling();
      return;
    }
    try {
      const response = await fetch(`${apiUrl}/api/tv/realtime/ticket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tv_post_id: postId }),
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success || !data.websocket_url) {
        startPolling();
        return;
      }
      const socket = new WebSocket(data.websocket_url);
      socketRef.current = socket;
      socket.onopen = () => {
        // Announce ourselves immediately so the count updates right away.
        sendWatcherHeartbeat();
      };
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.type === "tv_message" && payload.message) {
            appendMessages([payload.message], { live: true });
          } else if (payload?.type === "tv_typing") {
            receiveTypingPresence(payload);
          } else if (
            payload?.type === "tv_watching_count" &&
            typeof payload.count === "number"
          ) {
            if (isMountedRef.current) setLiveWatchers(payload.count);
          }
        } catch {
          // Ignore malformed frames.
        }
      };
      socket.onclose = () => {
        socketRef.current = null;
        if (isMountedRef.current) {
          startPolling();
        }
      };
      socket.onerror = () => {
        try {
          socket.close();
        } catch {
          /* already closing */
        }
      };

      // Kick off the heartbeat on this client. It runs while the socket is
      // open and stops as soon as the component unmounts or the socket
      // closes. Because the Worker only counts recent heartbeats, viewers
      // who navigate away naturally drop out of the count.
      if (watcherTimerRef.current) {
        clearInterval(watcherTimerRef.current);
      }
      watcherTimerRef.current = setInterval(() => {
        if (document.hidden) return;
        sendWatcherHeartbeat();
      }, TV_WATCH_HEARTBEAT_MS);
    } catch {
      startPolling();
    }
  }, [
    apiUrl,
    postId,
    appendMessages,
    startPolling,
    receiveTypingPresence,
    sendWatcherHeartbeat,
    isSocialLife,
  ]);

  useEffect(() => {
    isMountedRef.current = true;
    if (!isActive) return undefined;
    loadRecent();
    connectRealtime();
    return () => {
      isMountedRef.current = false;
      stopPolling();
      if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
      if (watcherTimerRef.current) {
        clearInterval(watcherTimerRef.current);
        watcherTimerRef.current = null;
      }
      remoteTypingTimersRef.current.forEach((timer) => clearTimeout(timer));
      remoteTypingTimersRef.current.clear();
      if (socketRef.current) {
        try {
          socketRef.current.close();
        } catch {
          /* already closing */
        }
        socketRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, postId, mode]);

  const announceTyping = useCallback(
    (active) => {
      setLocalTyping(Boolean(active));
      const socket = socketRef.current;
      if (!identityComplete || !socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }
      try {
        socket.send(
          JSON.stringify({
            type: "tv_typing",
            tv_post_id: postId,
            typing: Boolean(active),
            user_id: publicViewerId,
            viewer_id: publicViewerId,
            user_name: tvIdentity.name,
            profile_image: tvIdentity.photoUrl,
            country_code: tvIdentity.countryCode,
          }),
        );
      } catch {
        // Typing presence is optional; sending the actual message still works.
      }
    },
    [identityComplete, postId, publicViewerId, tvIdentity],
  );

  const scheduleTypingStop = useCallback(() => {
    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    typingStopTimerRef.current = setTimeout(() => announceTyping(false), 1400);
  }, [announceTyping]);

  const beginConversation = useCallback(() => {
    setError("");
    setComposerOpen(true);
    if (!tvIdentity.name) setIntroStep("name");
    else if (!tvIdentity.photoUrl) setIntroStep("photo");
    else if (!tvIdentity.countryCode) setIntroStep("country");
    else setIntroStep("message");
  }, [tvIdentity]);

  const closeComposer = useCallback(() => {
    announceTyping(false);
    setComposerOpen(false);
    setCountrySearch("");
    setError("");
  }, [announceTyping]);

  const submitName = useCallback(() => {
    const name = introName.trim().replace(/\s+/g, " ").slice(0, 50);
    if (!name) {
      setError("Tell Gwamo what people should call you.");
      return;
    }
    setError("");
    const next = { ...tvIdentity, name };
    saveIdentity(next);
    setIntroStep("photo");
  }, [introName, tvIdentity, saveIdentity]);

  const uploadTvPhoto = useCallback(
    async (file) => {
      if (!file) return;
      if (!file.type?.startsWith("image/")) {
        setError("Choose an image for your profile picture.");
        return;
      }

      setUploadingPhoto(true);
      setError("");
      try {
        const prepared = await compressImageFile(file, {
          maxWidth: 180,
          maxHeight: 180,
          quality: 0.72,
        });

        const token = getSessionToken?.() || "";
        let photoUrl = "";

        if (token) {
          try {
            const uploadForm = new FormData();
            uploadForm.append("file", prepared);
            uploadForm.append("kind", "profile_image");
            const uploadResponse = await fetch(`${apiUrl}/api/home/upload`, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
              body: uploadForm,
              cache: "no-store",
            });
            const uploadData = await uploadResponse.json().catch(() => ({}));
            if (uploadResponse.ok && uploadData.success && uploadData.url) {
              photoUrl = uploadData.url;
            }
          } catch {
            // A public viewer can still use a lightweight local image below.
          }
        }

        if (!photoUrl) {
          photoUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = () =>
              reject(new Error("Could not read your profile picture."));
            reader.readAsDataURL(prepared);
          });
        }

        if (!photoUrl) {
          throw new Error("Could not prepare your profile picture.");
        }

        const next = { ...tvIdentity, photoUrl };
        saveIdentity(next);
        setIntroStep("country");
      } catch (err) {
        setError(err.message || "Could not prepare your profile picture.");
      } finally {
        setUploadingPhoto(false);
      }
    },
    [getSessionToken, apiUrl, tvIdentity, saveIdentity, compressImageFile],
  );

  const chooseCountry = useCallback(
    (code) => {
      const next = { ...tvIdentity, countryCode: code };
      saveIdentity(next);
      setCountrySearch("");
      setIntroStep("message");
      setError("");
    },
    [tvIdentity, saveIdentity],
  );

  const toggleMessagePause = useCallback((messageId) => {
    setPausedMessageIds((current) => {
      const next = new Set(current);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  }, []);

  const sendPublicItem = useCallback(
    async (text) => {
      const token = getSessionToken?.() || "";
      const payload = {
        tv_post_id: postId,
        post_id: postId,
        mode,
        message: text,
        comment: text,
        country_code: tvIdentity.countryCode,
        user_name: tvIdentity.name,
        display_name: tvIdentity.name,
        profile_image: tvIdentity.photoUrl,
        profile_image_url: tvIdentity.photoUrl,
        viewer_id: publicViewerId,
      };

      const response = await fetch(`${apiUrl}/api/tv/conversation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.success === false) {
        throw new Error(
          data.error ||
            data.message ||
            (isSocialLife
              ? "Could not send your comment."
              : "Could not send your message."),
        );
      }
      return data;
    },
    [
      getSessionToken,
      tvIdentity,
      apiUrl,
      postId,
      mode,
      publicViewerId,
      isSocialLife,
    ],
  );

  const sendMessage = useCallback(async () => {
    const text = composerText.trim();
    if (!text) return;
    if (!identityComplete) {
      beginConversation();
      return;
    }
    announceTyping(false);
    setSending(true);
    setError("");
    try {
      const data = await sendPublicItem(text);
      setComposerText("");
      setOverlayVisible(true);

      const returnedItem =
        data?.comment && typeof data.comment === "object"
          ? data.comment
          : data?.message && typeof data.message === "object"
            ? data.message
            : data?.item && typeof data.item === "object"
              ? data.item
              : null;

      const sent = returnedItem
        ? {
            ...returnedItem,
            id:
              returnedItem.id ||
              data?.id ||
              `local-${Date.now()}`,
            message: String(
              returnedItem.message ?? returnedItem.comment ?? text,
            ),
            user_name: returnedItem.user_name || tvIdentity.name,
            profile_image:
              returnedItem.profile_image ||
              returnedItem.profile_image_url ||
              tvIdentity.photoUrl,
            country_code: returnedItem.country_code || tvIdentity.countryCode,
          }
        : {
            id: data?.id || `local-${Date.now()}`,
            user_name: tvIdentity.name,
            profile_image: tvIdentity.photoUrl,
            country_code: tvIdentity.countryCode,
            message: text,
            created_at: new Date().toISOString(),
          };

      appendMessages([sent], { live: true });
    } catch (err) {
      setError(
        err.message ||
          (isSocialLife
            ? "Could not send your comment."
            : "Could not send your message."),
      );
    } finally {
      setSending(false);
    }
  }, [
    composerText,
    identityComplete,
    beginConversation,
    announceTyping,
    tvIdentity,
    appendMessages,
    sendPublicItem,
    isSocialLife,
  ]);

  return (
    <>
      {!isSocialLife && (
        <div className="tv-live-anchor" aria-hidden="true">
          <span className="tv-live-dot" />
          <span>LIVE</span>
          {showViewerCount && (
            <span className="tv-live-watchers">
              · {smoothedViewerCount.toLocaleString()} Watching
            </span>
          )}
        </div>
      )}

      <div
        className={`tv-conversation-column${overlayVisible ? "" : " is-hidden"}`}
        aria-live="polite"
        aria-hidden={!overlayVisible}
      >
        {circulatingMessages.map((message) => {
          const messageId = String(message.id);

          return (
            <TvConversationMessage
              key={messageId}
              message={message}
              paused={pausedMessageIds.has(messageId)}
              laneHeight={TV_MESSAGE_LANE_HEIGHT}
              defaultLogo={defaultLogo}
              onTogglePause={toggleMessagePause}
              onZoomImage={onZoomImage}
            />
          );
        })}
      </div>

      <div className="tv-public-action-dock" onClick={(event) => event.stopPropagation()}>
        {typingPresence && (
          <div className="tv-typing-presence" aria-label={`${typingPresence.user_name || "Someone"} is typing`}>
            <button
              type="button"
              className="tv-typing-avatar"
              onClick={() =>
                onZoomImage?.(
                  typingPresence.profile_image ||
                    typingPresence.profile_image_url ||
                    defaultLogo,
                )
              }
              aria-label={`View ${typingPresence.user_name || "viewer"}'s profile picture`}
            >
              <img
                src={
                  typingPresence.profile_image ||
                  typingPresence.profile_image_url ||
                  defaultLogo
                }
                alt=""
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = defaultLogo;
                }}
              />
              <span>{countryCodeToFlagEmoji(typingPresence.country_code)}</span>
            </button>
            <strong>{typingPresence.user_name || "Someone"}</strong>
            <span className="tv-typing-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </div>
        )}
        <button
          type="button"
          className={`tv-public-conversation-cta${isSocialLife ? " is-social-life" : ""}`}
          onClick={beginConversation}
          aria-label={
            isSocialLife
              ? "Add a public Social Life comment"
              : "Join the public TV conversation"
          }
          title={isSocialLife ? "Comment" : "Public conversation"}
        >
          {isSocialLife ? (
            <MessageSquare
              className="tv-public-conversation-bolt"
              size={24}
              strokeWidth={2.2}
              aria-hidden="true"
            />
          ) : (
            <Zap
              className="tv-public-conversation-bolt"
              size={26}
              strokeWidth={2.2}
              aria-hidden="true"
            />
          )}
        </button>
        <button
          type="button"
          className="tv-visibility-toggle"
          onClick={() => setOverlayVisible((value) => !value)}
          aria-pressed={overlayVisible}
          aria-label={
            overlayVisible
              ? isSocialLife
                ? "Hide comments"
                : "Hide public conversation"
              : isSocialLife
                ? "Show comments"
                : "Show public conversation"
          }
          title={
            overlayVisible
              ? isSocialLife
                ? "Hide comments"
                : "Hide conversation"
              : isSocialLife
                ? "Show comments"
                : "Show conversation"
          }
        >
          {overlayVisible ? (
            <Eye size={20} aria-hidden="true" />
          ) : (
            <EyeOff size={20} aria-hidden="true" />
          )}
        </button>
      </div>

      {composerOpen && (
        <div
          className="tv-chat-guide"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="tv-chat-guide-head">
            <span className="tv-gwamo-orb" aria-hidden="true">G</span>
            <div className="tv-chat-guide-copy">
              <strong>Gwamo</strong>
              <span>
                {introStep === "name" && "What should people call you?"}
                {introStep === "photo" && "Add your profile picture."}
                {introStep === "country" && "Where are you watching from?"}
                {introStep === "message" &&
                  (isSocialLife
                    ? "Add a public comment."
                    : "You’re live. Say something ⚡")}
              </span>
            </div>
            <button
              type="button"
              className="tv-guide-close"
              onClick={closeComposer}
              aria-label="Close public conversation"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          {introStep === "name" && (
            <div className="tv-guide-reply-row">
              <input
                type="text"
                className="tv-guide-input"
                value={introName}
                maxLength={50}
                autoFocus
                placeholder="Your name"
                onChange={(event) => setIntroName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submitName();
                }}
                aria-label={
                  isSocialLife ? "Your public comment name" : "Your public TV name"
                }
              />
              <button
                type="button"
                className="tv-guide-symbol-button"
                onClick={submitName}
                aria-label="Continue"
              >
                <Send size={17} aria-hidden="true" />
              </button>
            </div>
          )}

          {introStep === "photo" && (
            <div className="tv-guide-photo-step">
              {tvIdentity.photoUrl ? (
                <img
                  className="tv-guide-photo-preview"
                  src={tvIdentity.photoUrl}
                  alt="Your public profile"
                />
              ) : null}
              <label
                className={`tv-guide-upload-symbol${uploadingPhoto ? " is-busy" : ""}`}
                aria-label="Upload your profile picture"
                title="Upload profile picture"
              >
                <ImagePlus size={24} aria-hidden="true" />
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingPhoto}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) uploadTvPhoto(file);
                  }}
                />
              </label>
            </div>
          )}

          {introStep === "country" && (
            <div className="tv-country-picker">
              <input
                type="search"
                className="tv-country-search"
                placeholder="Search country"
                value={countrySearch}
                onChange={(event) => setCountrySearch(event.target.value)}
                aria-label="Search countries"
              />
              <div className="tv-country-list" role="listbox" aria-label="Choose your country">
                {filteredCountries.map(([code, name]) => (
                  <button
                    type="button"
                    className="tv-country-option"
                    key={code}
                    onClick={() => chooseCountry(code)}
                    role="option"
                    aria-selected={tvIdentity.countryCode === code}
                  >
                    <span className="tv-country-flag" aria-hidden="true">
                      {countryCodeToFlagEmoji(code)}
                    </span>
                    <span>{name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {introStep === "message" && (
            <div className="tv-guide-message-row">
              <button
                type="button"
                className="tv-guide-self-avatar"
                onClick={() => onZoomImage?.(tvIdentity.photoUrl || defaultLogo)}
                aria-label="View your public profile picture"
              >
                <img src={tvIdentity.photoUrl || defaultLogo} alt="" />
                <span aria-hidden="true">
                  {countryCodeToFlagEmoji(tvIdentity.countryCode)}
                </span>
              </button>
              <input
                type="text"
                className="tv-guide-input tv-guide-message-input"
                placeholder={isSocialLife ? "Write a comment…" : "Say something…"}
                maxLength={220}
                value={composerText}
                autoFocus
                onChange={(event) => {
                  setComposerText(event.target.value);
                  if (event.target.value.trim()) {
                    announceTyping(true);
                    scheduleTypingStop();
                  } else {
                    announceTyping(false);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") sendMessage();
                }}
                onBlur={() => announceTyping(false)}
                aria-label={
                  isSocialLife ? "Public Social Life comment" : "Public TV message"
                }
              />
              <button
                type="button"
                className="tv-guide-symbol-button"
                onClick={sendMessage}
                disabled={sending || !composerText.trim()}
                aria-label={
                  isSocialLife ? "Send public comment" : "Send public message"
                }
              >
                <Send size={17} aria-hidden="true" />
              </button>
            </div>
          )}
          {error && <div className="tv-composer-error">{error}</div>}
        </div>
      )}
    </>
  );
});
TvConversationOverlay.displayName = "TvConversationOverlay";

export default TvConversationOverlay;