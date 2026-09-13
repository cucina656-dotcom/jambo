import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const API_URL = "https://kitchenbrain.cucina656.workers.dev";
const SESSION_TOKEN_KEY = "time-market-session-token";
const CONNECT_LANGUAGE_KEY = "gwamo-connect-language";
const CONNECT_SIDE_KEY = "gwamo-connect-side";
const REFRESH_COUNTS_MS = 15000;
const REFRESH_MATCHES_MS = 12000;

const GROUPS = [
  {
    id: "food",
    emoji: "🍅",
    rw: "Ibiryo n'ibyo mu rugo",
    en: "Food & groceries",
    items: [
      ["tomatoes", "Guhaha Inyanya", "Tomatoes"],
      ["cooking-oil", "Amavuta/Igihagari/Ubuto", "Cooking oil / Igihagari / Ubuto"],
      ["onions", "Ibitunguru", "Onions"],
      ["bell-pepper", "Poivron", "Bell pepper"],
      ["fresh-beans", "Ibishyimbo bitoye", "Fresh beans"],
      ["rice", "Umuceri utoye", "Rice"],
      ["potatoes", "Ibirayi", "Potatoes"],
      ["sweet-potatoes", "Ibijumba", "Sweet potatoes"],
      ["cassava", "Imyumbati", "Cassava"],
      ["chilli", "Urusenda", "Chilli"],
      ["avocado", "Avoka", "Avocado"],
      ["sugar", "Isukari", "Sugar"],
      ["salt", "Umunyu", "Salt"],
      ["matches", "Ikibiriti", "Matches"],
      ["dodo-greens", "Imboga dodo", "Dodo greens"],
      ["isombe", "Isombe", "Cassava leaves / Isombe"],
      ["cassava-ugali", "Ubugari bw'Imyumbati", "Cassava ugali"],
      ["maize-flour", "Akawunga", "Maize flour"],
      ["nido", "Nido", "Nido"],
      ["milk-products", "Amata/Ishyushyu/Ikivuguto", "Milk / fresh milk / yogurt"],
      ["inyange-products", "Inyange product", "Inyange products"],
    ],
  },
  {
    id: "delivery",
    emoji: "🚚",
    rw: "Gutuma no gutwara",
    en: "Delivery & transport",
    items: [
      ["bicycle-delivery", "Gutuma Umunyonzi", "Bicycle delivery"],
      ["driver-delivery", "Gutuma umushoferi", "Driver / delivery"],
      ["send-abroad", "Gutuma Ikintu hanze y'Igihugu", "Send an item abroad"],
    ],
  },
  {
    id: "home-land",
    emoji: "🏠",
    rw: "Inzu n'ubutaka",
    en: "Home & land",
    items: [
      ["buy-plot", "Kugura Ikibanza/Gutura", "Buy a residential plot"],
      ["buy-land", "Kugura Isambu", "Buy land / farm"],
      ["rent-house", "Inzu nkodesha", "House to rent"],
      ["buy-house", "Inzu yo Kugura", "House to buy"],
    ],
  },
  {
    id: "work-money",
    emoji: "💼",
    rw: "Akazi n'amafaranga",
    en: "Work & money",
    items: [
      ["loan", "Inguzanyo", "Loan"],
      ["find-job", "Kubona akazi", "Find a job"],
      ["offer-job", "Gutanga Akazi", "Offer a job"],
      ["deal", "Deal", "Deal"],
      ["favor-exchange", "Kugira neza nkaziturwa", "Exchange a favor"],
    ],
  },
  {
    id: "services",
    emoji: "🧾",
    rw: "Serivisi",
    en: "Services",
    items: [
      ["cook-order", "Gutanga komande yo kuntekera", "Order someone to cook"],
      ["irembo", "Serivisi z'irembo", "Irembo services"],
      ["rib", "Serivisi za RIB", "RIB services"],
      ["medicine-help", "Serivisi zo kubona imiti", "Help getting medicine"],
      ["mbaza", "Gutanga Ikibazo kuri Mbaza", "Ask a question on Mbaza"],
    ],
  },
  {
    id: "personal-help",
    emoji: "🤝",
    rw: "Ubufasha n'ibiganiro",
    en: "Help & conversation",
    items: [
      ["quit-drugs", "Kureka Ibiyobyabwenge", "Help quitting drugs"],
      ["reconcile", "Kwiyunga n'umuntu", "Reconcile with someone"],
      ["advice", "Inama", "Advice"],
      ["entertainment", "Kwishimisha", "Entertainment"],
      ["talk-person-99", "Kuganira n'umuntu99", "Talk to someone99"],
      ["private-question-99", "Kubaza ikibazo Cyihariye99", "Ask a private question99"],
      ["match-need-99", "Guhuzwa n'ibyo nkeneye99", "Match me with what I need99"],
    ],
  },
  {
    id: "technology",
    emoji: "📱",
    rw: "Ikoranabuhanga",
    en: "Technology",
    items: [
      ["electronic-device", "Igikoresho cya electronic", "Electronic device"],
      ["app-website-help", "Gukoresha Application cg Urubuga", "Help using an app or website"],
      ["technology-device-help", "Gukoresha Igikoresho icyaricyo cyose koranabuhanga", "Help using a technology device"],
    ],
  },
  {
    id: "workers",
    emoji: "🔧",
    rw: "Abanyamwuga",
    en: "Skilled workers",
    items: [
      ["welder", "Umuntu usudira", "Welder"],
      ["builder", "Umufundi", "Builder / mason"],
      ["construction-helper", "Umuyedi", "Construction helper"],
      ["electrician", "Ukora amashanyarazi", "Electrician"],
      ["mechanic", "Umukanishi", "Mechanic"],
    ],
  },
  {
    id: "vehicles",
    emoji: "🏍️",
    rw: "Ibinyabiziga",
    en: "Vehicles",
    items: [
      ["buy-bicycle", "Kugura Igare", "Buy a bicycle"],
      ["buy-motorcycle", "Kugura Moto", "Buy a motorcycle"],
      ["buy-car", "Kugura Imodoka", "Buy a car"],
    ],
  },
];

const ALL_ITEMS = GROUPS.flatMap((group) =>
  group.items.map(([id, rw, en]) => ({ id, rw, en, groupId: group.id })),
);

const COPY = {
  rw: {
    title: "Connect",
    question: "Urashaka iki?",
    need: "NDASHAKA",
    offer: "MFITE / NDATANGA",
    search: "Shakisha icyo ushaka...",
    all: "Byose",
    available: "Ndahari",
    waiting: "Tegereza",
    peopleAvailable: (count) => `${count} ${count === 1 ? "umuntu arahari" : "abantu barahari"}`,
    noPeopleYet: "Nta muntu uraboneka ubu",
    selectHint: "Kanda ku kintu ushaka cyangwa icyo ufite.",
    location: "Aho uri",
    locationPlaceholder: "Urugero: Nyamata, Kigali...",
    photo: "Ongeraho ifoto",
    photoOptional: "Si ngombwa",
    changePhoto: "Hindura ifoto",
    removePhoto: "Kuraho",
    goAvailable: "Shyira kuri Ndahari",
    publishNeed: "Shaka abantu",
    publishOffer: "Menyesha ko mfite iki",
    loginRequired: "Injira muri Gwamo kugira ngo ukoreshe Connect.",
    login: "Injira",
    back: "Subira inyuma",
    matches: "Abantu bahuye nawe",
    matchesHint: "Hamagara cyangwa wohereze Message. Nimero ya telefone ntigaragara.",
    message: "Message",
    call: "Hamagara",
    verified: "Verified",
    notAvailable: "Ntahari ubu",
    close: "Funga",
    send: "Ohereza",
    typeMessage: "Andika Message...",
    calling: "Turahamagara...",
    incomingReason: "Impamvu",
    endCall: "Soza",
    mute: "Ceceka",
    speaker: "Speaker",
    cancel: "Hagarika",
    saveError: "Ntibyakunze. Ongera ugerageze.",
    loading: "Tegereza gato...",
    selectedNeed: "Urashaka",
    selectedOffer: "Ufite / Utanga",
    privacy: "Telefone yawe ntigaragara ku bandi.",
    recent: "Message / Calls",
    emptySearch: "Nta kintu gihuye n'ibyo wanditse.",
    chooseLocation: "Andika aho uri mbere yo gukomeza.",
    imageTooLarge: "Hitamo ifoto iri munsi ya 5 MB.",
    imageType: "Hitamo ifoto ya JPG, PNG cyangwa WebP.",
  },
  en: {
    title: "Connect",
    question: "What are you looking for?",
    need: "I NEED",
    offer: "I HAVE / I OFFER",
    search: "Search what you need...",
    all: "All",
    available: "Available",
    waiting: "Waiting",
    peopleAvailable: (count) => `${count} ${count === 1 ? "person available" : "people available"}`,
    noPeopleYet: "No one is available now",
    selectHint: "Tap what you need or what you have.",
    location: "Your location",
    locationPlaceholder: "Example: Nyamata, Kigali...",
    photo: "Add a photo",
    photoOptional: "Optional",
    changePhoto: "Change photo",
    removePhoto: "Remove",
    goAvailable: "Set me as available",
    publishNeed: "Find people",
    publishOffer: "Show that I have this",
    loginRequired: "Log in to Gwamo to use Connect.",
    login: "Log in",
    back: "Back",
    matches: "People matched with you",
    matchesHint: "Call or send a Message. Phone numbers stay private.",
    message: "Message",
    call: "Call",
    verified: "Verified",
    notAvailable: "Not available now",
    close: "Close",
    send: "Send",
    typeMessage: "Write a Message...",
    calling: "Calling...",
    incomingReason: "Reason",
    endCall: "End",
    mute: "Mute",
    speaker: "Speaker",
    cancel: "Cancel",
    saveError: "Something went wrong. Try again.",
    loading: "Loading...",
    selectedNeed: "You need",
    selectedOffer: "You have / offer",
    privacy: "Your phone number is never shown to other users.",
    recent: "Message / Calls",
    emptySearch: "Nothing matches your search.",
    chooseLocation: "Add your location before continuing.",
    imageTooLarge: "Choose a photo smaller than 5 MB.",
    imageType: "Choose a JPG, PNG or WebP photo.",
  },
};

function readLocal(key, fallback = "") {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures; Connect still works in the current session.
  }
}

function getSessionToken() {
  return readLocal(SESSION_TOKEN_KEY, "");
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return { success: response.ok };
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(text || `Request failed (${response.status})`);
  }
}

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getSessionToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (typeof options.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    ...options,
    headers,
  });
  const data = await readJson(response);
  if (!response.ok || data.success === false) {
    const error = new Error(data.error || data.message || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}

function normalizeMatch(raw = {}) {
  return {
    id: String(raw.provider_id || raw.user_id || raw.id || ""),
    name: raw.full_name || raw.name || raw.creator_name || "Gwamo member",
    photo: raw.profile_photo_url || raw.photo_url || raw.creator_photo_url || "",
    location: raw.location || raw.area || "",
    verified: Boolean(raw.verified || raw.is_verified || raw.verification_status === "verified"),
    available: raw.available !== false && raw.is_available !== false,
    itemPhoto: raw.item_photo_url || raw.image_url || raw.connect_photo_url || "",
  };
}

function ConnectAvatar({ person, size = 48 }) {
  const initial = String(person?.name || "G").trim().charAt(0).toUpperCase();
  if (person?.photo) {
    return (
      <img
        className="connect-avatar"
        src={person.photo}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
      />
    );
  }
  return (
    <span className="connect-avatar connect-avatar-fallback" style={{ width: size, height: size }}>
      {initial}
    </span>
  );
}

function ItemIcon({ groupId }) {
  const group = GROUPS.find((entry) => entry.id === groupId);
  return <span className="connect-item-emoji" aria-hidden="true">{group?.emoji || "•"}</span>;
}

function MessageSheet({ lang, person, item, onClose }) {
  const t = COPY[lang];
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef(null);

  const loadMessages = useCallback(async () => {
    if (!person?.id || !item?.id) return;
    try {
      const params = new URLSearchParams({
        with_provider_id: person.id,
        item_id: item.id,
      });
      const data = await api(`/api/connect/live/messages?${params.toString()}`);
      const next = Array.isArray(data.messages) ? data.messages : [];
      setMessages(next);
      setError("");
    } catch (err) {
      setError(err.message || t.saveError);
    } finally {
      setBusy(false);
    }
  }, [person?.id, item?.id, t.saveError]);

  useEffect(() => {
    loadMessages();
    const id = window.setInterval(loadMessages, 5000);
    return () => window.clearInterval(id);
  }, [loadMessages]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  async function sendMessage(event) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || sending) return;
    setSending(true);
    setError("");
    try {
      await api("/api/connect/live/message", {
        method: "POST",
        body: JSON.stringify({
          to_provider_id: person.id,
          item_id: item.id,
          message,
        }),
      });
      setDraft("");
      await loadMessages();
    } catch (err) {
      setError(err.message || t.saveError);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="connect-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="connect-sheet connect-message-sheet" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <div className="connect-sheet-handle" />
        <header className="connect-chat-head">
          <ConnectAvatar person={person} size={42} />
          <div>
            <strong>{person.name}</strong>
            <span>{item?.[lang] || ""}</span>
          </div>
          <button type="button" className="connect-icon-btn" onClick={onClose} aria-label={t.close}>✕</button>
        </header>
        <div className="connect-message-list" ref={listRef}>
          {busy && <div className="connect-muted-center">{t.loading}</div>}
          {!busy && !messages.length && !error && (
            <div className="connect-first-message">{lang === "rw" ? "Tangira ikiganiro." : "Start the conversation."}</div>
          )}
          {messages.map((message) => {
            const mine = Boolean(message.mine || message.is_mine || message.direction === "outgoing");
            return (
              <div className={`connect-bubble-row${mine ? " mine" : ""}`} key={message.id || `${message.created_at}-${message.message}`}>
                <div className="connect-bubble">
                  <span>{message.message || message.text || ""}</span>
                  {message.created_at && <small>{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small>}
                </div>
              </div>
            );
          })}
        </div>
        {error && <div className="connect-inline-error">{error}</div>}
        <form className="connect-message-form" onSubmit={sendMessage}>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t.typeMessage}
            maxLength={1000}
          />
          <button type="submit" disabled={!draft.trim() || sending}>{t.send}</button>
        </form>
      </section>
    </div>
  );
}

function CallSheet({ lang, person, item, onClose }) {
  const t = COPY[lang];
  const [status, setStatus] = useState("requesting");
  const [callId, setCallId] = useState("");
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    let timer = null;

    async function start() {
      try {
        const data = await api("/api/connect/live/call/request", {
          method: "POST",
          body: JSON.stringify({
            to_provider_id: person.id,
            item_id: item.id,
          }),
        });
        if (!alive) return;
        const id = String(data.call_id || data.call?.id || "");
        setCallId(id);
        setStatus(data.status || "ringing");
        if (id) {
          timer = window.setInterval(async () => {
            try {
              const update = await api(`/api/connect/live/call/status?call_id=${encodeURIComponent(id)}`);
              if (!alive) return;
              const next = update.status || update.call?.status || "ringing";
              setStatus(next);
              if (["ended", "declined", "missed", "failed"].includes(next) && timer) {
                window.clearInterval(timer);
              }
            } catch {
              // A short network interruption should not immediately kill the call screen.
            }
          }, 2000);
        }
      } catch (err) {
        if (!alive) return;
        setError(err.message || t.saveError);
        setStatus("failed");
      }
    }

    start();
    return () => {
      alive = false;
      if (timer) window.clearInterval(timer);
    };
  }, [person.id, item.id, t.saveError]);

  async function endCall() {
    try {
      if (callId) {
        await api("/api/connect/live/call/end", {
          method: "POST",
          body: JSON.stringify({ call_id: callId }),
        });
      }
    } catch {
      // Close locally even if the end notification fails.
    }
    onClose();
  }

  const live = status === "accepted" || status === "connected";

  return (
    <div className="connect-modal-backdrop connect-call-backdrop" role="presentation">
      <section className="connect-call-sheet" role="dialog" aria-modal="true">
        <div className="connect-call-glow" />
        <ConnectAvatar person={person} size={84} />
        <h2>{person.name}</h2>
        <p>{item?.[lang]}</p>
        <span className={`connect-call-status ${live ? "is-live" : ""}`}>
          {live ? (lang === "rw" ? "Muri guhamagara" : "Connected") : error || t.calling}
        </span>

        {live && (
          <div className="connect-call-controls">
            <button type="button" className={muted ? "is-on" : ""} onClick={() => setMuted((value) => !value)}>
              <span>{muted ? "🔇" : "🎙️"}</span>
              <small>{t.mute}</small>
            </button>
            <button type="button" className={speaker ? "is-on" : ""} onClick={() => setSpeaker((value) => !value)}>
              <span>🔊</span>
              <small>{t.speaker}</small>
            </button>
          </div>
        )}

        <button type="button" className="connect-end-call" onClick={endCall}>
          <span>📞</span>
          <small>{live ? t.endCall : t.cancel}</small>
        </button>
      </section>
    </div>
  );
}

export default function ConnectExperience({
  user: suppliedUser = null,
  isLoggedIn: suppliedLoggedIn,
  onRequireAuth,
} = {}) {
  const [lang, setLang] = useState(() => readLocal(CONNECT_LANGUAGE_KEY, "rw"));
  const [side, setSide] = useState(() => readLocal(CONNECT_SIDE_KEY, "need"));
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState("all");
  const [selected, setSelected] = useState(null);
  const [location, setLocation] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [available, setAvailable] = useState(true);
  const [counts, setCounts] = useState({});
  const [matches, setMatches] = useState([]);
  const [matchesBusy, setMatchesBusy] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [selfUser, setSelfUser] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [messagePerson, setMessagePerson] = useState(null);
  const [callPerson, setCallPerson] = useState(null);
  const [showRecent, setShowRecent] = useState(false);
  const [recent, setRecent] = useState([]);
  const objectUrlRef = useRef("");

  const t = COPY[lang];
  const user = suppliedUser || selfUser;
  const loggedIn = typeof suppliedLoggedIn === "boolean" ? suppliedLoggedIn : Boolean(user);

  useEffect(() => {
    writeLocal(CONNECT_LANGUAGE_KEY, lang);
  }, [lang]);

  useEffect(() => {
    writeLocal(CONNECT_SIDE_KEY, side);
  }, [side]);

  useEffect(() => {
    if (suppliedUser || typeof suppliedLoggedIn === "boolean") {
      setSessionChecked(true);
      return undefined;
    }
    let alive = true;
    const token = getSessionToken();
    if (!token) {
      setSessionChecked(true);
      return undefined;
    }
    api("/api/time-market/me")
      .then((data) => {
        if (!alive) return;
        setSelfUser(data.provider || data.user || null);
      })
      .catch(() => {
        if (!alive) return;
        setSelfUser(null);
      })
      .finally(() => {
        if (alive) setSessionChecked(true);
      });
    return () => {
      alive = false;
    };
  }, [suppliedUser, suppliedLoggedIn]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const filteredGroups = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return GROUPS.map((group) => {
      const items = group.items
        .map(([id, rw, en]) => ({ id, rw, en, groupId: group.id }))
        .filter((item) => {
          if (activeGroup !== "all" && item.groupId !== activeGroup) return false;
          if (!needle) return true;
          return `${item.rw} ${item.en}`.toLocaleLowerCase().includes(needle);
        });
      return { ...group, items };
    }).filter((group) => group.items.length > 0);
  }, [query, activeGroup]);

  const fetchCounts = useCallback(async () => {
    try {
      const oppositeSide = side === "need" ? "offer" : "need";
      const data = await api(`/api/connect/live/counts?side=${encodeURIComponent(oppositeSide)}`);
      setCounts(data.counts || {});
    } catch {
      // Counts are helpful but non-critical. Keep the page usable if this request fails.
    }
  }, [side]);

  useEffect(() => {
    fetchCounts();
    const id = window.setInterval(fetchCounts, REFRESH_COUNTS_MS);
    return () => window.clearInterval(id);
  }, [fetchCounts]);

  const fetchMatches = useCallback(async (item = selected) => {
    if (!item?.id) return;
    setMatchesBusy(true);
    try {
      const params = new URLSearchParams({
        item_id: item.id,
        side,
      });
      if (location.trim()) params.set("location", location.trim());
      const data = await api(`/api/connect/live/matches?${params.toString()}`);
      setMatches((data.matches || data.items || []).map(normalizeMatch).filter((person) => person.id));
      setError("");
    } catch (err) {
      setError(err.message || t.saveError);
    } finally {
      setMatchesBusy(false);
    }
  }, [selected, side, location, t.saveError]);

  useEffect(() => {
    if (!selected?.id || !loggedIn) return undefined;
    const id = window.setInterval(() => fetchMatches(selected), REFRESH_MATCHES_MS);
    return () => window.clearInterval(id);
  }, [selected, loggedIn, fetchMatches]);

  function changeSide(nextSide) {
    setSide(nextSide);
    setSelected(null);
    setMatches([]);
    setError("");
  }

  function selectItem(item) {
    setSelected(item);
    setMatches([]);
    setError("");
    window.requestAnimationFrame(() => {
      document.querySelector(".connect-selection-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function requireLogin() {
    if (typeof onRequireAuth === "function") {
      onRequireAuth({ type: "connect" });
      return;
    }
    setError(t.loginRequired);
  }

  function pickPhoto(file) {
    setError("");
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type || "")) {
      setError(t.imageType);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(t.imageTooLarge);
      return;
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setPhotoFile(file);
    setPhotoPreview(url);
  }

  function removePhoto() {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = "";
    setPhotoFile(null);
    setPhotoPreview("");
  }

  async function publishSelection() {
    if (!selected) return;
    if (!loggedIn) {
      requireLogin();
      return;
    }
    if (!location.trim()) {
      setError(t.chooseLocation);
      return;
    }
    setPublishing(true);
    setError("");
    try {
      let itemPhotoUrl = "";
      let itemPhotoKey = "";
      if (photoFile) {
        const form = new FormData();
        form.append("kind", "connect_item_image");
        form.append("file", photoFile);
        const uploaded = await api("/api/connect/upload", { method: "POST", body: form });
        itemPhotoUrl = uploaded.url || "";
        itemPhotoKey = uploaded.key || "";
      }

      const data = await api("/api/connect/live/presence", {
        method: "POST",
        body: JSON.stringify({
          item_id: selected.id,
          side,
          location: location.trim(),
          available,
          item_photo_url: itemPhotoUrl,
          item_photo_key: itemPhotoKey,
          language: lang,
        }),
      });

      const nextMatches = (data.matches || []).map(normalizeMatch).filter((person) => person.id);
      setMatches(nextMatches);
      if (!nextMatches.length) await fetchMatches(selected);
      await fetchCounts();
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        requireLogin();
      } else {
        setError(err.message || t.saveError);
      }
    } finally {
      setPublishing(false);
    }
  }

  async function loadRecent() {
    setShowRecent(true);
    if (!loggedIn) {
      requireLogin();
      return;
    }
    try {
      const data = await api("/api/connect/live/recent");
      setRecent((data.items || data.recent || []).map((entry) => ({
        ...entry,
        person: normalizeMatch(entry.person || entry),
        item: ALL_ITEMS.find((item) => item.id === entry.item_id) || null,
      })));
    } catch (err) {
      setError(err.message || t.saveError);
    }
  }

  const selectedCount = selected ? Number(counts[selected.id] || 0) : 0;

  return (
    <div className="gwamo-connect-root">
      <section className="connect-page">
        <header className="connect-hero">
          <div className="connect-title-row">
            <div>
              <div className="connect-kicker">GWAMO</div>
              <h1>{t.title}</h1>
            </div>
            <div className="connect-language" aria-label="Language">
              <button type="button" className={lang === "rw" ? "is-active" : ""} onClick={() => setLang("rw")}>RW</button>
              <button type="button" className={lang === "en" ? "is-active" : ""} onClick={() => setLang("en")}>EN</button>
            </div>
          </div>
          <h2>{t.question}</h2>
          <p>{t.selectHint}</p>
        </header>

        <div className="connect-sticky-tools">
          <div className="connect-side-switch" role="tablist" aria-label="Connect mode">
            <button type="button" className={side === "need" ? "is-active" : ""} onClick={() => changeSide("need")}>{t.need}</button>
            <button type="button" className={side === "offer" ? "is-active" : ""} onClick={() => changeSide("offer")}>{t.offer}</button>
          </div>
          <label className="connect-search">
            <span>⌕</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} />
            {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear">✕</button>}
          </label>
          <div className="connect-category-strip">
            <button type="button" className={activeGroup === "all" ? "is-active" : ""} onClick={() => setActiveGroup("all")}>{t.all}</button>
            {GROUPS.map((group) => (
              <button type="button" key={group.id} className={activeGroup === group.id ? "is-active" : ""} onClick={() => setActiveGroup(group.id)}>
                <span>{group.emoji}</span>{group[lang]}
              </button>
            ))}
          </div>
        </div>

        {!filteredGroups.length && <div className="connect-empty-search">{t.emptySearch}</div>}

        <div className="connect-groups">
          {filteredGroups.map((group) => (
            <section className="connect-group" key={group.id}>
              <div className="connect-group-title">
                <span>{group.emoji}</span>
                <h3>{group[lang]}</h3>
              </div>
              <div className="connect-item-list">
                {group.items.map((item) => {
                  const count = Number(counts[item.id] || 0);
                  return (
                    <button type="button" className={`connect-item-row${selected?.id === item.id ? " is-selected" : ""}`} key={item.id} onClick={() => selectItem(item)}>
                      <ItemIcon groupId={group.id} />
                      <span className="connect-item-name">{item[lang]}</span>
                      <span className={`connect-count ${count ? "has-people" : ""}`}>
                        <span className="connect-status-dot" />
                        {count ? t.peopleAvailable(count) : t.waiting}
                      </span>
                      <span className="connect-chevron">›</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {selected && (
          <section className="connect-selection-card">
            <button type="button" className="connect-selection-close" onClick={() => { setSelected(null); setMatches([]); setError(""); }} aria-label={t.close}>✕</button>
            <div className="connect-selected-label">{side === "need" ? t.selectedNeed : t.selectedOffer}</div>
            <div className="connect-selected-title">
              <ItemIcon groupId={selected.groupId} />
              <h2>{selected[lang]}</h2>
            </div>
            <div className="connect-selected-count">
              <span className={`connect-status-dot ${selectedCount ? "is-on" : ""}`} />
              {selectedCount ? t.peopleAvailable(selectedCount) : t.noPeopleYet}
            </div>

            <label className="connect-field">
              <span>{t.location}</span>
              <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder={t.locationPlaceholder} maxLength={120} />
            </label>

            <div className="connect-photo-block">
              <div className="connect-photo-copy">
                <strong>{t.photo}</strong>
                <small>{t.photoOptional}</small>
              </div>
              {photoPreview ? (
                <div className="connect-photo-preview">
                  <img src={photoPreview} alt="" />
                  <div>
                    <label>{t.changePhoto}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => pickPhoto(event.target.files?.[0] || null)} /></label>
                    <button type="button" onClick={removePhoto}>{t.removePhoto}</button>
                  </div>
                </div>
              ) : (
                <label className="connect-photo-add">📷 {t.photo}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => pickPhoto(event.target.files?.[0] || null)} /></label>
              )}
            </div>

            <button type="button" className={`connect-available-toggle${available ? " is-on" : ""}`} onClick={() => setAvailable((value) => !value)}>
              <span className="connect-availability-light" />
              <span>{available ? t.available : t.notAvailable}</span>
              <span className="connect-switch-knob" />
            </button>

            <p className="connect-privacy">🔒 {t.privacy}</p>
            {error && <div className="connect-error" role="alert">{error}</div>}

            {!sessionChecked ? (
              <button type="button" className="connect-primary" disabled>{t.loading}</button>
            ) : !loggedIn ? (
              <button type="button" className="connect-primary" onClick={requireLogin}>{t.login}</button>
            ) : (
              <button type="button" className="connect-primary" disabled={publishing || !available} onClick={publishSelection}>
                {publishing ? t.loading : side === "need" ? t.publishNeed : t.publishOffer}
              </button>
            )}
          </section>
        )}

        {selected && loggedIn && (
          <section className="connect-matches">
            <div className="connect-matches-head">
              <div>
                <h2>{t.matches}</h2>
                <p>{t.matchesHint}</p>
              </div>
              <button type="button" onClick={() => fetchMatches(selected)} disabled={matchesBusy} aria-label="Refresh">↻</button>
            </div>

            {matchesBusy && !matches.length && <div className="connect-muted-center">{t.loading}</div>}
            {!matchesBusy && !matches.length && <div className="connect-no-match">{t.noPeopleYet}</div>}

            <div className="connect-match-list">
              {matches.map((person) => (
                <article className="connect-match-card" key={person.id}>
                  <div className="connect-match-main">
                    <ConnectAvatar person={person} size={54} />
                    <div className="connect-match-info">
                      <div className="connect-match-name-row">
                        <strong>{person.name}</strong>
                        {person.verified && <span className="connect-verified">✓</span>}
                      </div>
                      {person.location && <span>📍 {person.location}</span>}
                      <small className={person.available ? "is-online" : ""}>{person.available ? `● ${t.available}` : t.notAvailable}</small>
                    </div>
                    {person.itemPhoto && <img className="connect-match-product" src={person.itemPhoto} alt="" loading="lazy" decoding="async" />}
                  </div>
                  <div className="connect-match-actions">
                    <button type="button" onClick={() => setMessagePerson(person)}>💬 {t.message}</button>
                    <button type="button" className="connect-call-button" disabled={!person.available} onClick={() => setCallPerson(person)}>📞 {t.call}</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <div className="connect-bottom-spacer" />
      </section>

      <nav className="connect-bottom-bar" aria-label="Connect quick actions">
        <button type="button" className={available ? "is-online" : ""} onClick={() => setAvailable((value) => !value)}>
          <span className="connect-status-dot" />
          <strong>{t.available}</strong>
        </button>
        <button type="button" onClick={loadRecent}>
          <span>💬</span>
          <strong>{t.recent}</strong>
        </button>
      </nav>

      {messagePerson && selected && <MessageSheet lang={lang} person={messagePerson} item={selected} onClose={() => setMessagePerson(null)} />}
      {callPerson && selected && <CallSheet lang={lang} person={callPerson} item={selected} onClose={() => setCallPerson(null)} />}

      {showRecent && (
        <div className="connect-modal-backdrop" role="presentation" onMouseDown={() => setShowRecent(false)}>
          <section className="connect-sheet" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className="connect-sheet-handle" />
            <header className="connect-recent-head">
              <h2>{t.recent}</h2>
              <button type="button" className="connect-icon-btn" onClick={() => setShowRecent(false)}>✕</button>
            </header>
            {!recent.length ? (
              <div className="connect-muted-center">{lang === "rw" ? "Nta biganiro birimo." : "No recent conversations yet."}</div>
            ) : (
              <div className="connect-recent-list">
                {recent.map((entry, index) => (
                  <button type="button" key={entry.id || index} onClick={() => {
                    setShowRecent(false);
                    if (entry.item) setSelected(entry.item);
                    setMessagePerson(entry.person);
                  }}>
                    <ConnectAvatar person={entry.person} size={44} />
                    <span><strong>{entry.person.name}</strong><small>{entry.item?.[lang] || "Connect"}</small></span>
                    <b>›</b>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      <style>{`
        .gwamo-connect-root{--c-bg:#020711;--c-panel:#08111f;--c-panel2:#0b1728;--c-line:rgba(255,255,255,.1);--c-text:#f5f9ff;--c-muted:#8fa1b8;--c-blue:#56b7ff;--c-green:#42e38f;--c-green-soft:rgba(66,227,143,.12);width:100%;min-height:100svh;color:var(--c-text);background:radial-gradient(circle at 50% -12%,rgba(45,146,255,.18),transparent 34%),#020711;padding:calc(142px + env(safe-area-inset-top)) 0 calc(86px + env(safe-area-inset-bottom));}
        .connect-page{width:min(100%,680px);margin:0 auto;padding:0 14px;}
        .connect-hero{padding:4px 2px 16px}.connect-title-row{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.connect-kicker{font-size:10px;letter-spacing:.18em;font-weight:900;color:var(--c-blue)}.connect-hero h1{margin:2px 0 0!important;font-size:34px!important;line-height:1!important}.connect-hero h2{margin:22px 0 5px!important;font-size:25px!important;line-height:1.15!important}.connect-hero p{margin:0;color:var(--c-muted);font-size:13px}.connect-language{display:flex;padding:3px;border:1px solid var(--c-line);border-radius:999px;background:rgba(255,255,255,.04)}.connect-language button{border:0;border-radius:999px;padding:7px 10px;color:#8ea1b8;background:transparent;font-size:11px;font-weight:900;cursor:pointer}.connect-language button.is-active{color:#00101b;background:#87d3ff;box-shadow:0 0 20px rgba(86,183,255,.28)}
        .connect-sticky-tools{position:sticky;top:calc(124px + env(safe-area-inset-top));z-index:20;margin:0 -14px 18px;padding:10px 14px 9px;background:linear-gradient(180deg,rgba(2,7,17,.98) 78%,rgba(2,7,17,.84),transparent);backdrop-filter:blur(14px)}.connect-side-switch{display:grid;grid-template-columns:1fr 1fr;gap:7px;padding:4px;border:1px solid var(--c-line);border-radius:18px;background:#07111f}.connect-side-switch button{min-height:44px;border:0;border-radius:14px;color:#9db0c7;background:transparent;font-size:12px;font-weight:950;letter-spacing:.03em;cursor:pointer}.connect-side-switch button.is-active{color:#03120b;background:linear-gradient(135deg,#62efa4,#35d884);box-shadow:0 8px 22px rgba(48,218,130,.2)}.connect-search{height:46px;margin-top:8px;display:flex;align-items:center;gap:9px;padding:0 13px;border:1px solid var(--c-line);border-radius:16px;background:#07111e}.connect-search>span{font-size:24px;line-height:1;color:#8fb1c8;transform:rotate(-15deg)}.connect-search input{min-width:0;flex:1;border:0;outline:0;color:#fff;background:transparent;font-size:14px}.connect-search input::placeholder{color:#6f8399}.connect-search button{border:0;color:#8ea2b7;background:transparent;cursor:pointer}.connect-category-strip{display:flex;gap:7px;overflow-x:auto;padding:8px 0 2px;scrollbar-width:none}.connect-category-strip::-webkit-scrollbar{display:none}.connect-category-strip button{flex:0 0 auto;display:flex;align-items:center;gap:6px;min-height:34px;padding:0 11px;border:1px solid var(--c-line);border-radius:999px;color:#9cb0c5;background:rgba(255,255,255,.035);font-size:11px;font-weight:800;white-space:nowrap;cursor:pointer}.connect-category-strip button.is-active{color:#dff4ff;border-color:rgba(86,183,255,.45);background:rgba(86,183,255,.13)}
        .connect-groups{display:flex;flex-direction:column;gap:22px}.connect-group-title{display:flex;align-items:center;gap:9px;margin:0 2px 8px}.connect-group-title>span{font-size:21px}.connect-group-title h3{margin:0!important;font-size:14px!important;color:#d7e6f5}.connect-item-list{overflow:hidden;border:1px solid var(--c-line);border-radius:20px;background:linear-gradient(160deg,rgba(10,23,40,.95),rgba(5,13,24,.98));box-shadow:0 16px 40px rgba(0,0,0,.18)}.connect-item-row{width:100%;min-height:61px;display:grid;grid-template-columns:34px minmax(0,1fr) auto 16px;align-items:center;gap:9px;padding:9px 12px;border:0;border-bottom:1px solid rgba(255,255,255,.065);color:#f5f9ff;background:transparent;text-align:left;cursor:pointer}.connect-item-row:last-child{border-bottom:0}.connect-item-row:hover,.connect-item-row.is-selected{background:rgba(86,183,255,.08)}.connect-item-emoji{width:31px;height:31px;display:grid;place-items:center;border-radius:10px;background:rgba(255,255,255,.055);font-size:17px}.connect-item-name{min-width:0;font-size:13px;font-weight:820;line-height:1.2}.connect-count{display:flex;align-items:center;gap:5px;color:#6f849a;font-size:10px;font-weight:750;white-space:nowrap}.connect-count.has-people{color:#78e9ad}.connect-status-dot{width:7px;height:7px;display:inline-block;border-radius:50%;background:#526273;box-shadow:0 0 0 3px rgba(82,98,115,.12)}.connect-count.has-people .connect-status-dot,.connect-status-dot.is-on,.connect-bottom-bar .is-online .connect-status-dot{background:var(--c-green);box-shadow:0 0 12px rgba(66,227,143,.7)}.connect-chevron{color:#5e748c;font-size:22px}.connect-empty-search,.connect-muted-center,.connect-no-match{padding:28px 16px;text-align:center;color:#8297ad;font-size:13px}
        .connect-selection-card{position:relative;margin:24px 0 18px;padding:18px;border:1px solid rgba(86,183,255,.25);border-radius:24px;background:radial-gradient(circle at 100% 0,rgba(86,183,255,.12),transparent 32%),linear-gradient(160deg,#0a1728,#07101d);box-shadow:0 24px 55px rgba(0,0,0,.3)}.connect-selection-close{position:absolute;right:12px;top:12px;width:34px;height:34px;border:1px solid var(--c-line);border-radius:50%;color:#aabbd0;background:rgba(255,255,255,.04);cursor:pointer}.connect-selected-label{color:#67c5ff;font-size:10px;font-weight:950;letter-spacing:.12em}.connect-selected-title{display:flex;align-items:center;gap:10px;padding-right:38px;margin:8px 0 4px}.connect-selected-title h2{margin:0!important;font-size:24px!important}.connect-selected-count{display:flex;align-items:center;gap:8px;margin-bottom:17px;color:#8fa5ba;font-size:11px}.connect-field{display:flex;flex-direction:column;gap:7px;margin-top:14px}.connect-field>span,.connect-photo-copy strong{font-size:11px;font-weight:900;color:#c5d6e7}.connect-field input{height:46px;border:1px solid var(--c-line);border-radius:14px;outline:0;padding:0 13px;color:#fff;background:#050e19;font-size:13px}.connect-field input:focus{border-color:rgba(86,183,255,.55);box-shadow:0 0 0 3px rgba(86,183,255,.08)}.connect-photo-block{margin-top:14px}.connect-photo-copy{display:flex;align-items:center;gap:8px;margin-bottom:8px}.connect-photo-copy small{color:#667d94;font-size:10px}.connect-photo-add{min-height:48px;display:flex;align-items:center;justify-content:center;border:1px dashed rgba(137,180,216,.28);border-radius:14px;color:#a8bdd2;background:rgba(255,255,255,.025);font-size:12px;font-weight:800;cursor:pointer}.connect-photo-add input,.connect-photo-preview label input{display:none}.connect-photo-preview{display:flex;align-items:center;gap:12px}.connect-photo-preview img{width:78px;height:78px;border-radius:15px;object-fit:cover;border:1px solid var(--c-line)}.connect-photo-preview>div{display:flex;flex-direction:column;gap:7px}.connect-photo-preview label,.connect-photo-preview button{border:0;color:#88ccff;background:transparent;padding:0;text-align:left;font-size:11px;font-weight:850;cursor:pointer}.connect-photo-preview button{color:#ff9fae}.connect-available-toggle{width:100%;min-height:48px;margin-top:16px;display:flex;align-items:center;gap:9px;padding:0 12px;border:1px solid var(--c-line);border-radius:15px;color:#a3b5c7;background:#06101c;font-size:12px;font-weight:900;cursor:pointer}.connect-available-toggle .connect-availability-light{width:9px;height:9px;border-radius:50%;background:#526273}.connect-available-toggle.is-on{border-color:rgba(66,227,143,.28);background:var(--c-green-soft);color:#bff8d8}.connect-available-toggle.is-on .connect-availability-light{background:var(--c-green);box-shadow:0 0 13px rgba(66,227,143,.75)}.connect-switch-knob{margin-left:auto;width:38px;height:22px;border-radius:999px;background:#273545;position:relative}.connect-switch-knob:after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#8192a5;transition:.2s}.connect-available-toggle.is-on .connect-switch-knob{background:#206f49}.connect-available-toggle.is-on .connect-switch-knob:after{left:19px;background:#78f1ad}.connect-privacy{margin:11px 1px 0;color:#74899f;font-size:10px}.connect-error,.connect-inline-error{margin-top:12px;padding:10px 12px;border:1px solid rgba(255,91,111,.3);border-radius:12px;color:#ffd2d9;background:rgba(93,14,30,.35);font-size:11px}.connect-primary{width:100%;min-height:50px;margin-top:15px;border:0;border-radius:15px;color:#02120a;background:linear-gradient(135deg,#62efa4,#35d884);font-size:13px;font-weight:950;box-shadow:0 10px 26px rgba(48,218,130,.18);cursor:pointer}.connect-primary:disabled{opacity:.5;cursor:not-allowed}
        .connect-matches{margin:8px 0 20px}.connect-matches-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin:0 2px 10px}.connect-matches-head h2{margin:0 0 3px!important;font-size:17px!important}.connect-matches-head p{margin:0;color:#7f94aa;font-size:10px;max-width:440px}.connect-matches-head button{width:34px;height:34px;border:1px solid var(--c-line);border-radius:50%;color:#a8bdd1;background:rgba(255,255,255,.035);font-size:17px;cursor:pointer}.connect-match-list{display:flex;flex-direction:column;gap:9px}.connect-match-card{padding:12px;border:1px solid var(--c-line);border-radius:18px;background:linear-gradient(150deg,#0a1726,#060e18)}.connect-match-main{display:flex;align-items:center;gap:11px}.connect-avatar{flex:0 0 auto;border-radius:50%;object-fit:cover;border:1px solid rgba(255,255,255,.15);background:#132438}.connect-avatar-fallback{display:grid;place-items:center;color:#dff1ff;font-size:19px;font-weight:900}.connect-match-info{min-width:0;display:flex;flex:1;flex-direction:column;gap:2px}.connect-match-name-row{display:flex;align-items:center;gap:5px}.connect-match-name-row strong{font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.connect-verified{width:16px;height:16px;display:grid;place-items:center;border-radius:50%;color:#04131d;background:#4bbcff;font-size:10px;font-weight:950}.connect-match-info>span{color:#8fa4b8;font-size:10px}.connect-match-info small{color:#708399;font-size:9px}.connect-match-info small.is-online{color:#6fe3a5}.connect-match-product{width:52px;height:52px;border-radius:12px;object-fit:cover;border:1px solid var(--c-line)}.connect-match-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:11px}.connect-match-actions button{min-height:42px;border:1px solid rgba(86,183,255,.22);border-radius:13px;color:#bce4ff;background:rgba(86,183,255,.08);font-size:11px;font-weight:900;cursor:pointer}.connect-match-actions .connect-call-button{color:#bff8d8;border-color:rgba(66,227,143,.25);background:rgba(66,227,143,.09)}.connect-match-actions button:disabled{opacity:.4;cursor:not-allowed}
        .connect-bottom-spacer{height:28px}.connect-bottom-bar{position:fixed;left:50%;bottom:calc(8px + env(safe-area-inset-bottom));z-index:45;transform:translateX(-50%);width:min(calc(100% - 24px),520px);min-height:58px;display:grid;grid-template-columns:1fr 1fr;gap:5px;padding:5px;border:1px solid rgba(255,255,255,.12);border-radius:20px;background:rgba(4,11,20,.94);box-shadow:0 15px 45px rgba(0,0,0,.48);backdrop-filter:blur(16px)}.connect-bottom-bar button{display:flex;align-items:center;justify-content:center;gap:7px;border:0;border-radius:15px;color:#9db0c2;background:transparent;font-size:10px;cursor:pointer}.connect-bottom-bar button.is-online{color:#bdf6d6;background:rgba(66,227,143,.08)}.connect-bottom-bar strong{font-size:10px}
        .connect-modal-backdrop{position:fixed;inset:0;z-index:100;display:flex;align-items:flex-end;justify-content:center;padding:16px;background:rgba(0,4,10,.72);backdrop-filter:blur(7px)}.connect-sheet{width:min(100%,600px);max-height:min(82svh,720px);overflow:auto;border:1px solid rgba(255,255,255,.13);border-radius:24px 24px 18px 18px;background:linear-gradient(180deg,#0b1726,#050c15);box-shadow:0 28px 90px rgba(0,0,0,.6)}.connect-sheet-handle{width:42px;height:4px;margin:9px auto 5px;border-radius:99px;background:#33485c}.connect-chat-head,.connect-recent-head{display:flex;align-items:center;gap:10px;padding:10px 14px 12px;border-bottom:1px solid var(--c-line)}.connect-chat-head>div{min-width:0;flex:1;display:flex;flex-direction:column}.connect-chat-head strong{font-size:13px}.connect-chat-head span{color:#8096aa;font-size:10px}.connect-icon-btn{width:34px;height:34px;border:1px solid var(--c-line);border-radius:50%;color:#a8bacb;background:rgba(255,255,255,.035);cursor:pointer}.connect-message-sheet{height:min(76svh,620px);display:flex;flex-direction:column;overflow:hidden}.connect-message-list{min-height:0;flex:1;overflow:auto;padding:14px}.connect-first-message{text-align:center;color:#72879c;font-size:11px;padding:28px}.connect-bubble-row{display:flex;justify-content:flex-start;margin:5px 0}.connect-bubble-row.mine{justify-content:flex-end}.connect-bubble{max-width:78%;display:flex;flex-direction:column;gap:3px;padding:9px 10px;border-radius:14px 14px 14px 4px;color:#dbe8f4;background:#142438;font-size:12px}.connect-bubble-row.mine .connect-bubble{border-radius:14px 14px 4px 14px;color:#062012;background:#67e9a1}.connect-bubble small{align-self:flex-end;opacity:.55;font-size:8px}.connect-message-form{display:flex;gap:8px;padding:10px;border-top:1px solid var(--c-line)}.connect-message-form input{min-width:0;flex:1;height:44px;border:1px solid var(--c-line);border-radius:14px;outline:0;padding:0 12px;color:#fff;background:#06101c;font-size:12px}.connect-message-form button{min-width:74px;border:0;border-radius:14px;color:#05180e;background:#59e899;font-size:11px;font-weight:900;cursor:pointer}.connect-message-form button:disabled{opacity:.45}.connect-inline-error{margin:0 10px 4px}.connect-recent-head{justify-content:space-between}.connect-recent-head h2{margin:0!important;font-size:17px!important}.connect-recent-list{padding:6px 10px 14px}.connect-recent-list button{width:100%;display:flex;align-items:center;gap:10px;padding:10px 4px;border:0;border-bottom:1px solid rgba(255,255,255,.06);color:#fff;background:transparent;text-align:left;cursor:pointer}.connect-recent-list button>span{min-width:0;flex:1;display:flex;flex-direction:column}.connect-recent-list strong{font-size:12px}.connect-recent-list small{color:#7d91a6;font-size:9px}.connect-recent-list b{color:#5e7388;font-size:20px}
        .connect-call-backdrop{align-items:center}.connect-call-sheet{position:relative;width:min(100%,420px);overflow:hidden;display:flex;flex-direction:column;align-items:center;padding:34px 20px 26px;border:1px solid rgba(255,255,255,.13);border-radius:30px;background:radial-gradient(circle at 50% 10%,rgba(66,227,143,.13),transparent 32%),linear-gradient(170deg,#0a1726,#030810);box-shadow:0 30px 100px rgba(0,0,0,.7)}.connect-call-glow{position:absolute;top:-90px;width:220px;height:220px;border-radius:50%;background:rgba(66,227,143,.12);filter:blur(35px);pointer-events:none}.connect-call-sheet h2{margin:14px 0 3px!important;font-size:22px!important}.connect-call-sheet>p{margin:0;color:#8ea4b8;font-size:11px}.connect-call-status{margin-top:15px;color:#8da0b2;font-size:11px}.connect-call-status.is-live{color:#78e9ad}.connect-call-controls{display:flex;gap:14px;margin:30px 0 20px}.connect-call-controls button{width:74px;height:74px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border:1px solid var(--c-line);border-radius:50%;color:#dbe8f3;background:rgba(255,255,255,.05);cursor:pointer}.connect-call-controls button.is-on{border-color:rgba(86,183,255,.4);background:rgba(86,183,255,.14)}.connect-call-controls span{font-size:20px}.connect-call-controls small{font-size:8px}.connect-end-call{width:74px;height:74px;margin-top:28px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;border:0;border-radius:50%;color:#fff;background:#e33e52;box-shadow:0 10px 30px rgba(227,62,82,.3);cursor:pointer}.connect-end-call span{font-size:22px;transform:rotate(135deg)}.connect-end-call small{font-size:8px;font-weight:900}
        @media(max-width:480px){.gwamo-connect-root{padding-top:calc(134px + env(safe-area-inset-top))}.connect-page{padding:0 10px}.connect-sticky-tools{top:calc(118px + env(safe-area-inset-top));margin-left:-10px;margin-right:-10px;padding-left:10px;padding-right:10px}.connect-hero h1{font-size:31px!important}.connect-hero h2{font-size:22px!important}.connect-item-row{grid-template-columns:32px minmax(0,1fr) auto 12px;padding-left:10px;padding-right:9px}.connect-count{font-size:9px}.connect-selection-card{padding:16px 14px}.connect-match-actions button{min-height:40px}}
        @media(max-width:360px){.connect-item-row{grid-template-columns:30px minmax(0,1fr) 11px}.connect-count{display:none}.connect-side-switch button{font-size:10px}.connect-category-strip button{font-size:10px}.connect-bottom-bar strong{font-size:9px}}
        @media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
      `}</style>
    </div>
  );
}
