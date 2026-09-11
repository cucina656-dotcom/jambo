import { useEffect, useId, useRef, useState } from "react";

// Only Make Money Together uses this module. Meet Someone is unchanged.
const API = "https://kitchenbrain.cucina656.workers.dev";
const OWNER_KEY = "gwamo_money_owners_v2";
const MEMBER_KEY = "gwamo_money_members_v2";
const MISSIONS = [
  ["🛍️", "Sell Something", "Find something and sell it together"],
  ["🧹", "Offer a Service", "Cleaning, repair, farming, helping and more"],
  ["🔄", "Buy & Resell", "Buy something and sell it for more"],
  ["🛠️", "Make Something", "Create a small product together"],
  ["🚚", "Delivery / Errands", "Move or deliver things for people"],
  ["📣", "Find Customers", "Promote something and earn together"],
  ["💡", "My Own Idea", "Start a different small money idea"],
];
const CONTRIBUTIONS = [["⏰", "Time"], ["🛠️", "Skill"], ["💵", "Small contribution"], ["🚲", "Transport"], ["📣", "Customers"], ["🧠", "Idea"]];
const ADMIN_WHATSAPP = "250788484366";
const JOIN_COPY = "Add your name and WhatsApp number so the creator can create a group where you can learn how to do the mission in practice. Your WhatsApp number will not be shown publicly.";
function adminPinUrl(item, missionTitle) {
  const text = `Hello Gwamo Admin, I need the Connect video PIN for a Make Money Together mission. Mission: ${missionTitle || "Not selected yet"}. Mission ID: ${item?.id || "Not created yet"}.`;
  return `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(text)}`;
}
function saved(key) { try { return JSON.parse(localStorage.getItem(key) || "{}") || {}; } catch { return {}; } }
function remember(key, id, value) { try { localStorage.setItem(key, JSON.stringify({ ...saved(key), [id]: value })); return true; } catch { return false; } }
function internationalPhone(value) { return /^\+?[1-9]\d{7,14}$/.test(value.trim().replace(/[\s().-]/g, "")); }
async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (typeof options.body === "string") headers.set("Content-Type", "application/json");
  const res = await fetch(`${API}${path}`, { cache: "no-store", ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(data.error || data.message || `Request failed (${res.status})`);
  return data;
}
async function uploadPhoto(file) {
  if (!file || !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) throw new Error("Choose a JPG, PNG, WebP or GIF photo.");
  if (file.size > 2 * 1024 * 1024) throw new Error("Choose a photo smaller than 2 MB.");
  const body = new FormData(); body.append("kind", "profile_image"); body.append("file", file);
  return api("/api/connect/upload", { method: "POST", body });
}
function uploadVideo(file, pin, progress) {
  return new Promise((resolve, reject) => {
    const body = new FormData(); body.append("kind", "video"); body.append("file", file); body.append("pin", pin);
    const xhr = new XMLHttpRequest(); xhr.open("POST", `${API}/api/connect/upload`);
    xhr.upload.onprogress = e => { if (e.lengthComputable) progress(Math.round(e.loaded / e.total * 100)); };
    xhr.onload = () => {
      let data; try { data = JSON.parse(xhr.responseText); } catch { reject(new Error("Invalid upload response.")); return; }
      if (xhr.status < 200 || xhr.status >= 300 || data.success === false) reject(new Error(data.error || "Video upload failed.")); else resolve(data);
    };
    xhr.onerror = () => reject(new Error("Video upload failed. Check your connection."));
    xhr.send(body);
  });
}
function youtubeId(value) {
  try {
    const url = new URL(value), host = url.hostname.replace(/^www\./, "");
    let id = "";
    if (host === "youtu.be") id = url.pathname.split("/")[1];
    if (["youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(host)) id = url.searchParams.get("v") || url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1];
    return /^[\w-]{11}$/.test(id || "") ? id : "";
  } catch { return ""; }
}
let ytPromise;
function youtubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (ytPromise) return ytPromise;
  ytPromise = new Promise((resolve, reject) => {
    // Polling cooperates with Meet Someone's existing global callback.
    let elapsed = 0;
    const timer = setInterval(() => {
      if (window.YT?.Player) { clearInterval(timer); resolve(window.YT); }
      else if ((elapsed += 100) >= 15000) { clearInterval(timer); reject(new Error("YouTube could not load. Check your connection and try again.")); }
    }, 100);
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement("script"); script.src = "https://www.youtube.com/iframe_api"; script.async = true; document.head.appendChild(script);
    }
  }).catch(error => { ytPromise = null; throw error; });
  return ytPromise;
}

// One controller for every mounted money book. Whole articles are measured; page
// transforms never affect selection. Pause old players before activating the next.
const playback = {
  cards: new Map(), active: null, observer: null, raf: 0,
  schedule() { if (!playback.raf) playback.raf = requestAnimationFrame(() => { playback.raf = 0; playback.choose(); }); },
  choose() {
    let best = null, bestScore = 0;
    if (!document.hidden && ![...this.cards.values()].some(card => card.suspended())) this.cards.forEach((card, key) => {
      if (card.suspended()) return;
      const r = card.element.getBoundingClientRect();
      const visible = Math.max(0, Math.min(innerHeight, r.bottom) - Math.max(0, r.top)) * Math.max(0, Math.min(innerWidth, r.right) - Math.max(0, r.left));
      const score = visible / Math.max(1, r.width * r.height);
      if (score > bestScore + 0.0001 || (score > 0 && Math.abs(score - bestScore) < 0.0001 && key === this.active)) { best = key; bestScore = score; }
    });
    this.cards.forEach((card, key) => { if (key !== best) card.pause(); });
    this.active = best;
    if (best) this.cards.get(best)?.play();
  },
  add(key, card) {
    this.cards.set(key, card);
    if (!this.observer) {
      this.observer = new IntersectionObserver(() => this.schedule(), { threshold: Array.from({ length: 21 }, (_, i) => i / 20) });
      window.addEventListener("scroll", this.schedule, true); window.addEventListener("resize", this.schedule);
      document.addEventListener("visibilitychange", this.visibility); window.addEventListener("pagehide", this.stop);
      window.addEventListener("pageshow", this.schedule);
    }
    this.observer.observe(card.element); this.schedule();
    return () => {
      card.pause(); this.observer?.unobserve(card.element); this.cards.delete(key);
      if (!this.cards.size) {
        this.observer?.disconnect(); this.observer = null;
        window.removeEventListener("scroll", this.schedule, true); window.removeEventListener("resize", this.schedule);
        document.removeEventListener("visibilitychange", this.visibility); window.removeEventListener("pagehide", this.stop); window.removeEventListener("pageshow", this.schedule);
        cancelAnimationFrame(this.raf); this.raf = 0; this.active = null;
      } else this.schedule();
    };
  },
  visibility() { if (document.hidden) playback.stop(); else playback.choose(); },
  stop() { playback.cards.forEach(card => card.pause()); playback.active = null; },
};

function Dialog({ title, onClose, busy, children }) {
  const ref = useRef(null), heading = useId();
  useEffect(() => { const node = ref.current; node.showModal(); return () => node.close(); }, []);
  return <dialog className="mmt-dialog" ref={ref} aria-labelledby={heading} onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}>
    <div className="mmt-dialog-head"><h2 id={heading}>{title}</h2><button type="button" aria-label="Close" disabled={busy} onClick={onClose}>×</button></div>{children}
  </dialog>;
}
function IdentityFields({ name, setName, phone, setPhone, photo, setPhoto, id }) {
  return <>
    <label className="mmt-label" htmlFor={`${id}-name`}>Your name</label><input id={`${id}-name`} className="mmt-input" value={name} onChange={e => setName(e.target.value)} maxLength={80} autoComplete="name" required />
    <label className="mmt-label" htmlFor={`${id}-phone`}>WhatsApp number, including country code</label><input id={`${id}-phone`} className="mmt-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+250788123456" autoComplete="tel" required />
    <label className="mmt-label" htmlFor={`${id}-photo`}>Your photo</label><input id={`${id}-photo`} className="mmt-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e => setPhoto(e.target.files?.[0] || null)} required />
    {photo && <small>{photo.name}</small>}
  </>;
}

function MissionBook({ initial, onUpdate }) {
  const [item, setItem] = useState(initial), [members, setMembers] = useState([]);
  const [modal, setModal] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [name, setName] = useState(""), [phone, setPhone] = useState("");
  const [videoFile, setVideoFile] = useState(null), [url, setUrl] = useState(""), [pin, setPin] = useState(""), [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(true), [blocked, setBlocked] = useState(false), [mediaError, setMediaError] = useState("");
  const [manualOpen, setManualOpen] = useState(false), [reduceMotion, setReduceMotion] = useState(false);
  const [contacts, setContacts] = useState(null), [room, setRoom] = useState(null), [message, setMessage] = useState("");
  const [membership, setMembership] = useState(() => saved(MEMBER_KEY)[initial.id] || null);
  const root = useRef(null), video = useRef(null), ytHost = useRef(null), ytPlayer = useRef(null), playing = useRef(false), mutedRef = useRef(true);
  const controls = useRef({}), modalRef = useRef(""), playAttempt = useRef(false), youtubeReady = useRef(false);
  const id = useId(); const owner = saved(OWNER_KEY)[item.id];
  const data = item.public_data || {};
  const description = data.description || data.about_mission || data.answers?.about_mission || item.location || "No description added yet.";
  const ytId = youtubeId(item.video_url);
  useEffect(() => setItem(initial), [initial]);
  async function refreshMembers() {
    const result = await api(`/api/connect/money/members?mission_id=${encodeURIComponent(item.id)}`);
    setMembers(result.members || []);
  }
  useEffect(() => {
    let live = true;
    async function refresh() {
      if (document.hidden) return;
      try { const result = await api(`/api/connect/money/members?mission_id=${encodeURIComponent(item.id)}`); if (live) setMembers(result.members || []); }
      catch (err) { if (live) setNotice(`Team photos could not refresh: ${err.message}`); }
    }
    refresh(); const timer = setInterval(refresh, 15000); document.addEventListener("visibilitychange", refresh);
    return () => { live = false; clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [item.id]);
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)"); const change = () => setReduceMotion(query.matches);
    change(); query.addEventListener("change", change); return () => query.removeEventListener("change", change);
  }, []);
  function pause() {
    playing.current = false;
    video.current?.pause();
    if (youtubeReady.current) { try { ytPlayer.current?.pauseVideo(); } catch {} }
  }
  function play(force = false) {
    if (document.hidden || modalRef.current || playback.active !== id) return;
    if (playing.current && !force) return;
    playing.current = true;
    if (video.current) {
      if (playAttempt.current) return;
      playAttempt.current = true;
      video.current.muted = mutedRef.current;
      const node = video.current;
      node.play().then(() => {
        if (playback.active !== id || document.hidden || modalRef.current) node.pause();
        setBlocked(false);
      }).catch(() => setBlocked(true)).finally(() => { playAttempt.current = false; });
    } else if (ytPlayer.current && youtubeReady.current) {
      try { mutedRef.current ? ytPlayer.current.mute() : ytPlayer.current.unMute(); ytPlayer.current.playVideo(); } catch { setBlocked(true); }
    }
  }
  controls.current = { play, pause };
  useEffect(() => playback.add(id, { element: root.current, play: () => controls.current.play(), pause: () => controls.current.pause(), suspended: () => Boolean(modalRef.current) }), [id]);
  useEffect(() => { modalRef.current = modal; playback.choose(); }, [modal]);
  useEffect(() => {
    setMediaError(""); setBlocked(false); playing.current = false; playAttempt.current = false;
    mutedRef.current = true; setMuted(true); youtubeReady.current = false;
    if (!ytId) { playback.schedule(); return; }
    let cancelled = false, player;
    const host = ytHost.current;
    youtubeApi().then(YT => {
      if (cancelled || !host) return;
      const mount = document.createElement("div"); host.replaceChildren(mount);
      player = new YT.Player(mount, {
        videoId: ytId,
        playerVars: { mute: 1, playsinline: 1, controls: 1, rel: 0, origin: window.location.origin },
        events: {
          onReady: () => { if (cancelled) return; youtubeReady.current = true; controls.current.play(true); },
          onAutoplayBlocked: () => { if (!cancelled) setBlocked(true); },
          onStateChange: e => {
            if (cancelled) return;
            if (e.data === 1) {
              if (playback.active !== id || document.hidden || modalRef.current) e.target.pauseVideo();
              else setBlocked(false);
            }
            if (e.data === 0 && playback.active === id && !document.hidden && !modalRef.current) { e.target.seekTo(0); e.target.playVideo(); }
          },
          onError: () => { if (!cancelled) setMediaError("This YouTube video cannot play here. Try another video."); },
        },
      });
      ytPlayer.current = player;
    }).catch(err => { if (!cancelled) setMediaError(err.message); });
    return () => { cancelled = true; youtubeReady.current = false; try { player?.destroy(); } catch {} ytPlayer.current = null; };
  }, [item.video_url, ytId, id]);
  function sound() {
    mutedRef.current = !mutedRef.current; setMuted(mutedRef.current);
    if (video.current) video.current.muted = mutedRef.current;
    if (youtubeReady.current) { try { mutedRef.current ? ytPlayer.current.mute() : ytPlayer.current.unMute(); } catch {} }
  }
  function open(which) { setError(""); setPin(""); setUrl(""); setVideoFile(null); setProgress(0); setContacts(null); setModal(which); }
  function close() { if (!busy) { setModal(""); setError(""); setPin(""); setContacts(null); } }
  async function join(e) {
    e.preventDefault(); if (busy) return;
    if (!name.trim()) { setError("Enter your name."); return; }
    if (!internationalPhone(phone)) { setError("Include your country code, for example +250788123456."); return; }
    setBusy(true); setError("");
    try {
      let record = saved(MEMBER_KEY)[item.id] || membership;
      if (!record?.token) {
        record = { token: crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, ""), joined: false };
        remember(MEMBER_KEY, item.id, record); setMembership(record);
      }
      const result = await api("/api/connect/money/join", { method: "POST", body: JSON.stringify({ mission_id: item.id, name: name.trim(), whatsapp: phone.trim(), photo_url: "", photo_key: "", member_token: record.token }) });
      const joined = { token: result.member_token, joined: true };
      const stored = remember(MEMBER_KEY, item.id, joined); setMembership(joined);
      setNotice(`${result.message}${stored ? "" : " Keep this page open: your browser could not remember your membership."}`);
      setName(""); setPhone(""); setModal("");
      // Joining has already succeeded even if the following refresh fails.
      if (result.member) setMembers(current => [...current.filter(m => m.id !== result.member.id), result.member]);
      refreshMembers().catch(() => {});
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  async function saveVideo(e) {
    e.preventDefault(); if (busy) return; setBusy(true); setError("");
    try {
      if (!pin.trim()) throw new Error("Enter the Connect video PIN.");
      let videoUrl = url.trim(), videoKey = "";
      if (videoFile) {
        if (videoFile.size > 100 * 1024 * 1024) throw new Error("Choose a video smaller than 100 MB.");
        const uploaded = await uploadVideo(videoFile, pin.trim(), setProgress); videoUrl = uploaded.url; videoKey = uploaded.key;
      }
      if (!/^https?:\/\//i.test(videoUrl)) throw new Error("Upload a video or enter an https:// video link.");
      const result = await api("/api/connect/video", { method: "PATCH", headers: { "X-Connect-Video-Pin": pin.trim() }, body: JSON.stringify({ item_id: item.id, video_url: videoUrl, video_key: videoKey }) });
      if (!result.item?.id) throw new Error("The server did not return the updated mission.");
      setItem(result.item); onUpdate?.(result.item); setModal(""); setPin(""); setVideoFile(null);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  function showContacts() { open("contacts"); }
  async function loadContacts(e) {
    e.preventDefault(); if (busy) return;
    const pinValue = pin.trim();
    if (!pinValue) { setError("Enter the Connect video PIN."); return; }
    setBusy(true); setError("");
    try {
      const result = await api("/api/connect/money/contacts", {
        method: "POST",
        headers: { "X-Connect-Video-Pin": pinValue },
        body: JSON.stringify({ mission_id: item.id, owner_token: owner || "", pin: pinValue }),
      });
      setContacts(result.members || []);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  async function loadRoom() {
    const result = await api(`/api/connect/money/room?mission_id=${encodeURIComponent(item.id)}`, { headers: { "X-Mission-Member-Token": membership?.token || "" } }); setRoom(result.room);
  }
  async function showRoom() { open("room"); setRoom(null); setBusy(true); try { await loadRoom(); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  async function sendMessage(e) {
    e.preventDefault(); if (!message.trim() || busy) return; setBusy(true); setError("");
    try { await api("/api/connect/money/room/message", { method: "POST", headers: { "X-Mission-Member-Token": membership?.token || "" }, body: JSON.stringify({ mission_id: item.id, message: message.trim() }) }); setMessage(""); await loadRoom(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  const teammates = members.filter(m => m.role !== "creator");
  // Names roster shown inside the video page: creator first (they started the mission), then
  // everyone who joined, oldest join first. Shows the invite line instead until someone joins.
  const sortedTeammates = [...teammates].sort((a, b) => {
    const ta = new Date(a.joined_at || a.created_at || 0).getTime();
    const tb = new Date(b.joined_at || b.created_at || 0).getTime();
    return (Number.isFinite(ta) ? ta : 0) - (Number.isFinite(tb) ? tb : 0);
  });
  const rosterNames = sortedTeammates.length ? [item.creator_name, ...sortedTeammates.map(m => m.name)].filter(Boolean) : [];
  return <article ref={root} className={`mmt-card${modal ? " mmt-paused" : ""}${reduceMotion ? " mmt-reduced" : ""}${manualOpen ? " mmt-manual-open" : ""}`} aria-label={`${data.mission || "Money mission"} by ${item.creator_name}`}>
    <div className="mmt-book-row">
      <div className="mmt-stage">
        <div className="mmt-book">
          <div className="mmt-pages" aria-hidden="true" />
          <div className="mmt-inside">
            {item.video_url ? ytId ? <div className="mmt-youtube" ref={ytHost} /> : <video ref={video} src={item.video_url} muted={muted} loop playsInline controls preload="metadata"
              onCanPlay={() => controls.current.play(true)}
              onPlay={e => { if (playback.active !== id || document.hidden || modalRef.current) e.currentTarget.pause(); }}
              onVolumeChange={e => { mutedRef.current = e.currentTarget.muted; setMuted(e.currentTarget.muted); }}
              onError={() => setMediaError("This video could not play. Try another file or link.")} /> : <div className="mmt-placeholder"><span>🎬</span><strong>Your mission in motion</strong><p>Add a video to show the team what to do.</p><button type="button" onClick={() => open("video")}>Add video</button></div>}
            <div className="mmt-description-window" aria-hidden="true">
              <div className="mmt-description">
                <span>{rosterNames.length ? "TEAMING UP" : "JOIN THE MISSION"}</span>
                {rosterNames.length ? <div className="mmt-roster">{rosterNames.map((teamName, i) => <p key={i}>{teamName}</p>)}</div> : <p>Click "Join mission" to team up with {item.creator_name || "the creator"} and get this mission moving.</p>}
              </div>
            </div>
          </div>
          <div className="mmt-cover" aria-hidden="true">
            <div className="mmt-cover-front">
              {item.creator_photo_url && <img className="mmt-cover-photo" src={item.creator_photo_url} alt="" />}
              <div className="mmt-cover-shade" />
              <div className="mmt-creator"><small>MISSION CREATOR</small><strong>{item.creator_name}</strong></div>
              <div className="mmt-cover-title"><small>MAKE MONEY TOGETHER</small><h2>{data.mission || "Our mission"}</h2><p>{data.contribution || "Build something together"}</p><span>{members.length || item.member_count || 1} {(members.length || item.member_count || 1) === 1 ? "person" : "people"} · {(item.room_status || "team_forming").replace(/_/g, " ")}</span></div>
            </div>
            <div className="mmt-cover-back"><span>Every great idea<br />starts with people.</span></div>
          </div>
        </div>
      </div>
      <aside className="mmt-side"><button className="mmt-join" type="button" onClick={() => membership?.joined ? showRoom() : open("join")}><span>🤝</span><span>{membership?.joined ? "Open Mission Room" : "Join mission"}</span></button></aside>
    </div>
    <div className="mmt-tools">
      <button type="button" onClick={() => open("video")}>{item.video_url ? "Change video" : "Add video"}</button>
      {item.video_url && <button type="button" onClick={sound} aria-label={muted ? "Unmute video" : "Mute video"}>{muted ? "🔇 Sound off" : "🔊 Sound on"}</button>}
      {item.video_url && blocked && <button type="button" onClick={() => controls.current.play(true)}>▶ Play video</button>}
      <button type="button" onClick={() => open("about")}>Read mission</button>
      <button type="button" onClick={showContacts}>Organize team</button>
      {reduceMotion && <button type="button" onClick={() => setManualOpen(v => !v)}>{manualOpen ? "Show cover" : "Open video page"}</button>}
    </div>
    {mediaError && <p className="mmt-error" role="alert">{mediaError}</p>}
    {notice && <p className="mmt-notice" role="status">{notice}</p>}
    {modal && <Dialog title={{ join: "🤝 Join mission", video: item.video_url ? "Change video" : "Add video", about: "About mission", contacts: "Team WhatsApp numbers (admin)", room: "Mission Room" }[modal]} onClose={close} busy={busy}>
      {modal === "join" && <form className="mmt-chat-form" onSubmit={join}>
        <div className="mmt-chat-bubble">👋 {JOIN_COPY}</div>
        <label className="mmt-label" htmlFor={`${id}-jname`}>Your name</label>
        <input id={`${id}-jname`} className="mmt-input" value={name} onChange={e => setName(e.target.value)} maxLength={80} autoComplete="name" placeholder="Type your name…" required />
        <label className="mmt-label" htmlFor={`${id}-jphone`}>WhatsApp number, including country code</label>
        <input id={`${id}-jphone`} className="mmt-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+250788123456" autoComplete="tel" required />
        <button className="mmt-primary mmt-send" disabled={busy || !name.trim() || !phone.trim()}>{busy ? "Sending…" : "Send ➤"}</button>
      </form>}
      {modal === "video" && <form onSubmit={saveVideo}><p>Upload a video, or paste a direct video-file link or YouTube link. The Connect video PIN is required to save.</p><label className="mmt-label" htmlFor={`${id}-file`}>Upload video (up to 100 MB)</label><input className="mmt-input" id={`${id}-file`} type="file" accept="video/mp4,video/webm,video/quicktime" onChange={e => setVideoFile(e.target.files?.[0] || null)} /><label className="mmt-label" htmlFor={`${id}-url`}>Or video link</label><input className="mmt-input" id={`${id}-url`} type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" /><label className="mmt-label" htmlFor={`${id}-pin`}>Connect video PIN</label><input className="mmt-input" id={`${id}-pin`} type="password" value={pin} onChange={e => setPin(e.target.value)} autoComplete="off" required />{busy && <p role="status">{videoFile ? `Uploading / saving: ${progress}%` : "Saving video…"}</p>}<button className="mmt-primary" disabled={busy}>{busy ? "Saving…" : "Save video"}</button><a className="mmt-ask-admin" href={adminPinUrl(item, data.mission)} target="_blank" rel="noreferrer">💬 Ask admin for the PIN on WhatsApp</a></form>}
      {modal === "about" && <p className="mmt-full-description">{description}</p>}
      {modal === "contacts" && (contacts ? <>
        <p>Only the authorized creator and admin can access these numbers. Use them to organize the mission group. No group or invitations are created automatically.</p>
        {contacts.map(m => <div className={`mmt-contact${m.role === "creator" ? " is-creator" : ""}`} key={m.id}><strong>{m.name}{m.role === "creator" ? " · Creator" : ""}</strong><span>{m.whatsapp ? `+${m.whatsapp}` : "No number recorded"}</span></div>)}
        {!contacts.length && <p>No one has joined yet.</p>}
      </> : <form onSubmit={loadContacts}>
        <p>Enter the Connect video PIN to view this mission's team names and WhatsApp numbers.</p>
        <label className="mmt-label" htmlFor={`${id}-cpin`}>Connect video PIN</label>
        <input id={`${id}-cpin`} className="mmt-input" type="password" value={pin} onChange={e => setPin(e.target.value)} autoComplete="off" required />
        <button className="mmt-primary" disabled={busy}>{busy ? "Checking…" : "View team numbers"}</button>
        <a className="mmt-ask-admin" href={adminPinUrl(item, data.mission)} target="_blank" rel="noreferrer">💬 Ask admin for the PIN on WhatsApp</a>
      </form>)}
      {modal === "room" && <><p>{room?.status?.replace(/_/g, " ") || "Loading your mission room…"}</p>{room?.members?.map(m => <p key={m.id}>{m.name} {m.role === "creator" ? "· Creator" : ""}</p>)}{room?.messages?.map(m => <p key={m.id}><strong>{m.member_name}: </strong>{m.message}</p>)}{room && <form onSubmit={sendMessage}><label className="mmt-label" htmlFor={`${id}-message`}>Message your team</label><textarea className="mmt-input" id={`${id}-message`} value={message} onChange={e => setMessage(e.target.value)} maxLength={1200} required /><button className="mmt-primary" disabled={busy}>Send</button><button type="button" onClick={() => loadRoom().catch(err => setError(err.message))}>Refresh room</button></form>}</>}
      {error && <p className="mmt-error" role="alert">{error}</p>}
    </Dialog>}
  </article>;
}

export function MoneyMissionFeed({ onBack, onJoin }) {
  const [items, setItems] = useState([]), [busy, setBusy] = useState(true), [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    const refresh = async () => {
      if (document.hidden) return;
      try { const result = await api("/api/connect/money?limit=50"); if (live) { setItems(result.items || []); setError(""); } }
      catch (err) { if (live) setError(err.message); } finally { if (live) setBusy(false); }
    };
    refresh(); const timer = setInterval(refresh, 30000); document.addEventListener("visibilitychange", refresh);
    return () => { live = false; clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  return <section className="mmt-root"><MoneyStyles /><button className="mmt-back" type="button" onClick={onBack}>← Back</button><div className="mmt-heading"><div><small>MAKE MONEY TOGETHER</small><h1>Browse Money Teams</h1></div><button type="button" onClick={onJoin}>＋ Add yours</button></div>{busy && <p>Loading money teams…</p>}{error && <p role="alert" className="mmt-error">{error}</p>}{!busy && !error && !items.length && <p>No money teams yet. Be the first to start one.</p>}<div className="mmt-feed">{items.map(item => <MissionBook key={item.id} initial={item} onUpdate={next => setItems(current => current.map(row => row.id === next.id ? next : row))} />)}</div></section>;
}

export default function MoneyTogetherGame({ onBack }) {
  const [stage, setStage] = useState("mission"), [mission, setMission] = useState(""), [contribution, setContribution] = useState(""), [description, setDescription] = useState("");
  const [name, setName] = useState(""), [phone, setPhone] = useState(""), [photo, setPhoto] = useState(null), [item, setItem] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const lock = useRef(false), id = useId();
  async function create(e) {
    e.preventDefault(); if (lock.current) return;
    if (!internationalPhone(phone)) { setError("Include your WhatsApp country code, for example +250788123456."); return; }
    lock.current = true; setBusy(true); setError("");
    try {
      const uploaded = await uploadPhoto(photo);
      const result = await api("/api/connect/money", { method: "POST", body: JSON.stringify({ name: name.trim(), whatsapp: phone.trim(), mission, contribution, description: description.trim(), photo_url: uploaded.url, photo_key: uploaded.key }) });
      if (!result.mission?.id) throw new Error("The server did not return the created mission.");
      const storedOwner = remember(OWNER_KEY, result.mission.id, result.owner_token);
      remember(MEMBER_KEY, result.mission.id, { token: result.member_token, joined: true });
      setItem(result.mission); setStage("result"); setPhone(""); setPhoto(null);
      if (!storedOwner) setError("Your mission was saved, but this browser could not remember your creator access. Ask the admin to help organize the group.");
    } catch (err) { setError(err.message); } finally { lock.current = false; setBusy(false); }
  }
  function restart() { setMission(""); setContribution(""); setDescription(""); setName(""); setPhone(""); setPhoto(null); setItem(null); setError(""); setStage("mission"); }
  return <section className="mmt-root"><MoneyStyles /><button type="button" className="mmt-back" disabled={busy} onClick={() => stage === "mission" || stage === "result" ? onBack?.() : setStage(stage === "profile" ? "bring" : "mission")}>← Back</button>
    {stage === "mission" && <><small className="mmt-kicker">MAKE MONEY TOGETHER</small><h1>How do you want to make money together?</h1><p>Pick one small mission people can actually do together.</p><div className="mmt-choices">{MISSIONS.map(([emoji, title, text]) => <button type="button" className={mission === title ? "is-active" : ""} key={title} onClick={() => setMission(title)}><span>{emoji}</span><strong>{title}</strong><small>{text}</small></button>)}</div><button type="button" className="mmt-primary" disabled={!mission} onClick={() => setStage("bring")}>Continue</button></>}
    {stage === "bring" && <><small className="mmt-kicker">{mission}</small><h1>What can you bring to this?</h1><p>You do not need to bring everything. Pick the one thing you can help with.</p><div className="mmt-choices">{CONTRIBUTIONS.map(([emoji, title]) => <button type="button" className={contribution === title ? "is-active" : ""} key={title} onClick={() => setContribution(title)}><span>{emoji}</span><strong>{title}</strong></button>)}</div><label className="mmt-label" htmlFor={`${id}-about`}>About mission</label><textarea id={`${id}-about`} className="mmt-input" value={description} onChange={e => setDescription(e.target.value)} maxLength={2000} placeholder="Describe what your team will do, how you will work together, and what you hope to achieve." /><button type="button" className="mmt-primary" disabled={!contribution || !description.trim()} onClick={() => setStage("profile")}>Continue to My Mission Profile</button></>}
    {stage === "profile" && <form onSubmit={create}><small className="mmt-kicker">YOUR MISSION PROFILE</small><h1>Who wants to build this?</h1><p>Your photo and mission will appear on the finished mission book.</p><IdentityFields name={name} setName={setName} phone={phone} setPhone={setPhone} photo={photo} setPhoto={setPhoto} id={id} /><button className="mmt-primary" disabled={busy || !name.trim() || !phone.trim() || !photo}>{busy ? "Creating your mission…" : "Show My Mission Book"}</button></form>}
    {stage === "result" && item && <><MissionBook initial={item} onUpdate={setItem} /><button className="mmt-primary" type="button" onClick={restart}>Start Another Mission</button><p className="mmt-fine">Gwamo helps people find each other, discuss and organize. Earnings are not guaranteed.</p></>}
    {error && <p className="mmt-error" role="alert">{error}</p>}
  </section>;
}

function MoneyStyles() { return <style>{`
.mmt-root{width:min(100%,560px);margin:0 auto;color:#f8fbff;font-family:inherit}.mmt-root *{box-sizing:border-box}.mmt-root h1{font-size:clamp(28px,7vw,40px);line-height:1.12;margin:10px 0}.mmt-root p{line-height:1.55}.mmt-root button,.mmt-dialog button{cursor:pointer;font:inherit}.mmt-root button:disabled,.mmt-dialog button:disabled{opacity:.45;cursor:default}.mmt-root button:focus-visible,.mmt-dialog :focus-visible{outline:3px solid #8beaff;outline-offset:3px}.mmt-back{border:0;background:none;color:#bad7e9;margin:0 0 22px;padding:8px 0}.mmt-kicker,.mmt-heading small{color:#7dd8fa;font-size:11px;font-weight:800;letter-spacing:.1em}.mmt-heading{display:flex;align-items:center;gap:12px;justify-content:space-between}.mmt-heading>button{flex-shrink:0;border:1px solid #4b83a6;border-radius:12px;padding:10px;background:#12374c;color:white}.mmt-choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.mmt-choices button{min-height:105px;display:flex;flex-direction:column;align-items:flex-start;text-align:left;gap:8px;border:1px solid #21455e;border-radius:18px;background:linear-gradient(140deg,#092749,#030f1f);color:white;padding:15px}.mmt-choices button>span{font-size:28px}.mmt-choices small{color:#aac3d6;font-size:11px}.mmt-choices .is-active{border-color:#5cceff;box-shadow:0 0 20px #147cd644}.mmt-label{display:block;margin:18px 0 7px;font-size:13px;font-weight:750}.mmt-input{display:block;width:100%;padding:13px;border:1px solid #3a5974;border-radius:12px;background:#071a2b;color:white;font:inherit;min-height:48px}.mmt-input[type=file]{font-size:12px}.mmt-root textarea,.mmt-dialog textarea{min-height:120px;resize:vertical}.mmt-primary{width:100%;padding:15px;margin-top:16px;border:1px solid #49b5ff;border-radius:15px;background:linear-gradient(135deg,#087cff,#1269e9);color:white;font-weight:800!important}.mmt-error{color:#ffd2d7;background:#4b1c2b;padding:12px;border-radius:10px;font-size:13px}.mmt-notice{font-size:12px;color:#b8f4db}.mmt-fine{font-size:11px;color:#93aabd}.mmt-feed{display:grid;gap:32px;margin-top:20px}
.mmt-card{min-width:0;isolation:isolate}.mmt-book-row{display:flex;gap:8px;align-items:stretch}.mmt-stage{min-width:0;flex:1;overflow:hidden;position:relative;padding:14px 13px 18px 19px;border-radius:18px;background:radial-gradient(ellipse at 45% 45%,#19303e,#070f18 75%)}.mmt-book{position:relative;aspect-ratio:3/4;min-height:390px;perspective:1600px;perspective-origin:35% 45%}.mmt-pages{position:absolute;inset:5px -7px -7px 5px;border-radius:5px 12px 12px 5px;background:repeating-linear-gradient(0deg,#e6ddc8 0 1px,#958d7c 1px 2px,#f4ead6 2px 4px);box-shadow:5px 9px 17px #0009}.mmt-inside{position:absolute;inset:0;overflow:hidden;border:2px solid #bba77f;border-radius:4px 10px 10px 4px;background:#08111c;box-shadow:inset 9px 0 15px #000a}.mmt-inside video,.mmt-youtube,.mmt-youtube iframe{width:100%;height:100%;display:block;border:0;position:absolute;inset:0}.mmt-inside video{object-fit:contain;background:black}.mmt-youtube iframe{min-width:0}.mmt-placeholder{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:22px;background:radial-gradient(ellipse at center,#173d50,#08111c);color:#c8dde4;font-size:13px}.mmt-placeholder>span{font-size:36px}.mmt-placeholder button{position:relative;z-index:2;background:#164d67;color:white;border:1px solid #6cbed8;padding:12px;border-radius:12px}.mmt-description-window{position:absolute;inset:16px 10px 60px;overflow:hidden;pointer-events:none;z-index:2;mask-image:linear-gradient(transparent,#000 8%,#000 92%,transparent)}.mmt-description{position:absolute;top:100%;left:0;right:0;padding:13px;border-radius:10px;background:#04101ada;color:#e9f9ff;font-size:12px;line-height:1.65;text-shadow:0 0 9px #4aceeb66;animation:mmt-text 52s linear infinite;overflow-wrap:anywhere;white-space:pre-wrap}.mmt-description span{font-size:9px;color:#8bdcfa;letter-spacing:.14em;font-weight:850}.mmt-description p{margin:7px 0}.mmt-roster p{margin:5px 0;font-size:13px;font-weight:750}.mmt-cover{position:absolute;inset:0;transform-origin:0 50%;transform-style:preserve-3d;animation:mmt-turn 52s linear infinite;pointer-events:none;z-index:3}.mmt-cover-front,.mmt-cover-back{position:absolute;inset:0;backface-visibility:hidden;border-radius:4px 12px 12px 4px;border:1px solid #4d6778;overflow:hidden}.mmt-cover-front{padding:18px 14px 18px 21px;display:flex;flex-direction:column;background:repeating-linear-gradient(20deg,#ffffff03 0 1px,transparent 1px 4px),radial-gradient(ellipse at 80% 20%,#245666,#102534 58%,#071923);box-shadow:inset 9px 0 9px #0008,inset 12px 0 0 #ffffff0a,inset -2px 0 0 #94aeb333,5px 2px 10px #0007;transform:translateZ(1px)}.mmt-cover-front:after{content:"";position:absolute;inset:9px 9px 9px 15px;border:1px solid #a2c8b32b;border-radius:3px 8px 8px 3px;pointer-events:none}.mmt-cover-back{transform:rotateY(180deg) translateZ(1px);background:repeating-linear-gradient(45deg,#d1c5a5 0 2px,#e2d7b9 2px 5px);box-shadow:inset -10px 0 24px #32251955;display:grid;place-items:center;text-align:center;color:#66573b;font-family:Georgia,serif;font-style:italic}.mmt-cover-photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0}.mmt-cover-shade{position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,rgba(4,10,18,.12) 0%,rgba(4,10,18,.38) 45%,rgba(4,10,18,.92) 100%),linear-gradient(100deg,rgba(0,0,0,.5) 0%,rgba(0,0,0,0) 60%)}.mmt-creator{position:relative;z-index:2;display:flex;flex-direction:column;gap:3px;flex-shrink:0;width:fit-content;max-width:80%;padding:7px 12px;border-radius:12px;background:rgba(4,10,18,.4);backdrop-filter:blur(2px)}.mmt-creator small{color:#a0c7cf;font-size:8px;letter-spacing:.13em}.mmt-creator strong{font-size:13px;color:#fff;overflow-wrap:anywhere;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;text-shadow:0 0 8px rgba(0,0,0,.6)}.mmt-cover-title{position:relative;flex-shrink:0;z-index:2;margin-top:auto;text-shadow:0 0 12px #4cb5c944}.mmt-cover-title>small{font-size:8px;letter-spacing:.16em;color:#c0d4bc}.mmt-cover-title h2{font-family:Georgia,serif!important;font-size:clamp(23px,5vw,34px)!important;line-height:1.08!important;font-weight:500!important;color:#f3ead2;margin:9px 0!important;overflow-wrap:anywhere}.mmt-cover-title p{font-size:12px;margin:7px 0;color:#c9e4e5}.mmt-cover-title>span{font-size:10px;color:#a5c5cd}.mmt-side{flex:0 0 49px;display:flex}.mmt-join{display:flex;align-items:center;justify-content:center;gap:12px;flex-direction:column;width:100%;padding:15px 7px;border:1px solid #64c5d9;border-radius:13px;color:#e8fcff;background:linear-gradient(#164c64,#0b273e);box-shadow:0 0 14px #4ac6ef20}.mmt-join>span:first-child{font-size:23px}.mmt-join>span:last-child{writing-mode:vertical-rl;transform:rotate(180deg);font-size:12px;font-weight:800;letter-spacing:.03em}.mmt-tools{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px}.mmt-tools button{border:1px solid #335b70;border-radius:10px;color:#c6edf5;background:#0b2333;font-size:11px;min-height:40px;padding:9px 11px}.mmt-paused .mmt-cover,.mmt-paused .mmt-description{animation-play-state:paused}
/* 20s cover + 1s opening + 30s open + 1s closing = 52s. Hold times exclude the flip. */
@keyframes mmt-turn{0%,38.461538%{transform:rotateY(0deg);animation-timing-function:cubic-bezier(.45,0,.2,1)}40.384615%,98.076923%{transform:rotateY(-172deg);animation-timing-function:cubic-bezier(.45,0,.2,1)}100%{transform:rotateY(0deg)}}
@keyframes mmt-text{0%,40.384615%{top:100%;transform:translateY(0)}98.076923%,100%{top:0;transform:translateY(-100%)}}
.mmt-reduced .mmt-cover,.mmt-reduced .mmt-description{animation:none}.mmt-reduced .mmt-description{top:10px;transform:none;max-height:70%;overflow:hidden}.mmt-reduced.mmt-manual-open .mmt-cover{transform:rotateY(-172deg)}
.mmt-dialog{position:fixed;inset:0;width:min(92vw,480px);max-height:85dvh;margin:auto;border:1px solid #467e98;border-radius:20px;background:#081c2d;color:#e7f4fa;padding:22px;box-shadow:0 30px 80px #0009;font-family:inherit;overflow:auto}.mmt-dialog::backdrop{background:#010915cf;backdrop-filter:blur(5px)}.mmt-dialog p{font-size:13px;line-height:1.6}.mmt-dialog-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.mmt-dialog-head h2{font-size:23px;margin:0!important}.mmt-dialog-head button{flex-shrink:0;width:40px;height:40px;border:1px solid #4a6c83;border-radius:50%;background:#102c42;color:white;font-size:25px}.mmt-dialog input,.mmt-dialog textarea{box-sizing:border-box}.mmt-full-description{white-space:pre-wrap;overflow-wrap:anywhere}.mmt-contact{display:flex;justify-content:space-between;gap:12px;padding:13px 0;border-bottom:1px solid #274353;font-size:12px;flex-wrap:wrap}.mmt-contact.is-creator strong,.mmt-contact.is-creator span{color:#4ade80}.mmt-chat-form{display:flex;flex-direction:column;gap:4px}.mmt-chat-bubble{align-self:flex-start;max-width:92%;margin-bottom:8px;padding:12px 14px;border-radius:16px 16px 16px 4px;background:#123449;color:#e7f4fa;font-size:13px;line-height:1.55}.mmt-send{display:flex;align-items:center;justify-content:center;gap:8px}.mmt-ask-admin{display:flex;align-items:center;justify-content:center;min-height:44px;margin-top:10px;border:1px solid rgba(80,215,126,.35);border-radius:12px;color:#bff5cf;background:rgba(24,92,50,.28);font-size:12px;font-weight:800;text-decoration:none}
@media(max-width:390px){.mmt-stage{padding:11px 10px 16px 15px}.mmt-book{min-height:365px}.mmt-cover-front{padding:14px 11px 14px 17px}.mmt-cover-title h2{font-size:24px!important}.mmt-side{flex-basis:43px}.mmt-join>span:last-child{font-size:11px}.mmt-description{font-size:12px}.mmt-heading{align-items:flex-start}.mmt-heading h1{font-size:28px}}
`}</style>; }