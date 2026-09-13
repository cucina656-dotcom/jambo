import { useEffect, useRef, useState } from "react";

// Explore Romantic Couples — LOVE & RELATIONSHIPS
//
// This reuses the real-book animation from MissionBook (see
// MoneyTogetherGame.jsx): perspective + preserve-3d, a paper "pages" edge
// behind the cover, a front/back cover that rotates open from the left
// spine (transform-origin: 0 50%, rotateY(-172deg) when open), and
// prefers-reduced-motion support. MissionBook itself is NOT modified —
// this is a new, parallel component with its own class names (`rmc-*`
// instead of `mmt-*`) built the same way, per the instruction to copy the
// animation before anything is ever deleted.
//
// The big structural difference from MissionBook: MissionBook is one mission
// with one media area, opened/closed in a single infinite CSS @keyframes
// loop because the content never changes between cycles. Romantic Stories is
// ONE book whose *inside content changes every cycle* (a different couple
// each time), so the flip has to be driven from JS state instead of a pure
// CSS animation — the transform values, easing and timing proportions are
// carried over faithfully, only the trigger mechanism changed.
//
// ASSUMPTION — please confirm: couples and playlist songs are both added
// through the same PIN-protected management panel used for the mission
// video PIN (tap the small ⚙ in the corner of the book), not a public
// "share your story" form. The spec is explicit that the only public
// controls outside the book are Sound off / Sound on, which left no public
// CTA slot for self-submitting a couple. If couples should instead be
// submitted by the couple themselves (like a Meet Someone profile), the
// "Add a couple" form below can be split out into its own public flow and
// the authorizeConnectVideoRequest check dropped from that one endpoint.

const CONNECT_API_URL = "https://kitchenbrain.cucina656.workers.dev";
const ADMIN_WHATSAPP = "250788484446"; // TODO: confirm which admin WhatsApp number this should ping
const HOLD_MS = 3000; // how long each couple is shown before the page turns
const FLIP_MS = 700; // duration of the open/close flip itself
const CLOSED_BEAT_MS = 150; // brief pause on the closed cover before it turns again

const FLAG_PRESETS = [
  ["🇷🇼", "Rwanda"],
  ["🇧🇮", "Burundi"],
  ["🇺🇬", "Uganda"],
  ["🇰🇪", "Kenya"],
  ["🇹🇿", "Tanzania"],
  ["🇨🇩", "DR Congo"],
  ["🇳🇬", "Nigeria"],
  ["🇬🇭", "Ghana"],
  ["🇿🇦", "South Africa"],
  ["🇪🇹", "Ethiopia"],
];

async function connectApi(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (typeof options.body === "string") headers.set("Content-Type", "application/json");
  const response = await fetch(`${CONNECT_API_URL}${path}`, { cache: "no-store", ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(data.error || data.message || `Request failed (${response.status})`);
  }
  return data;
}

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

function adminPinWhatsAppUrl() {
  const text =
    "Hello Gwamo Admin, I need the Connect video PIN to manage Romantic Stories (a couple or the shared playlist).";
  return `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(text)}`;
}

export default function RomanticStories({ onBack }) {
  const [couples, setCouples] = useState([]);
  const [couplesBusy, setCouplesBusy] = useState(true);
  const [couplesError, setCouplesError] = useState("");

  const [songs, setSongs] = useState([]);
  const [songsError, setSongsError] = useState("");

  const [refreshToken, setRefreshToken] = useState(0);

  // --- Book cycle state (which couple is showing, is the cover open) ---
  const [index, setIndex] = useState(0);
  const [coverOpen, setCoverOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const pausedRef = useRef(false);
  useEffect(() => {
    pausedRef.current = manageOpen;
  }, [manageOpen]);

  // --- Shared playlist state. Deliberately independent of `index`/couple
  // state below — nothing about the couple cycle ever touches the <audio>
  // element, which is exactly what keeps a song playing through a couple
  // change instead of restarting. ---
  const [soundOn, setSoundOn] = useState(false);
  const [songIndex, setSongIndex] = useState(0);
  const audioRef = useRef(null);
  const songsRef = useRef([]);
  const songIndexRef = useRef(0);
  useEffect(() => {
    songsRef.current = songs;
  }, [songs]);
  useEffect(() => {
    songIndexRef.current = songIndex;
  }, [songIndex]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReducedMotion(query.matches);
    change();
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);

  useEffect(() => {
    let live = true;
    setCouplesBusy(true);
    connectApi("/api/connect/romantic?limit=50")
      .then((data) => {
        if (live) {
          setCouples(data.items || []);
          setCouplesError("");
        }
      })
      .catch((err) => {
        if (live) setCouplesError(err.message || "Could not load Romantic Stories.");
      })
      .finally(() => {
        if (live) setCouplesBusy(false);
      });
    return () => {
      live = false;
    };
  }, [refreshToken]);

  useEffect(() => {
    let live = true;
    connectApi("/api/connect/romantic/playlist")
      .then((data) => {
        if (live) {
          setSongs(data.items || []);
          setSongsError("");
        }
      })
      .catch((err) => {
        if (live) setSongsError(err.message || "Could not load the shared playlist.");
      });
    return () => {
      live = false;
    };
  }, [refreshToken]);

  // Reset the reading position if the book shrinks (a couple was removed).
  useEffect(() => {
    if (index >= couples.length) setIndex(0);
  }, [couples.length, index]);

  // The book cycle itself. A recursive setTimeout chain (not a CSS
  // @keyframes loop) because the content changes every turn. Mirrors
  // MissionBook's proportions: a brief closed beat, a flip open, a long
  // hold, a flip closed, repeat. Paused (like `.mmt-paused`) while the
  // management dialog is open or the tab is hidden.
  useEffect(() => {
    if (!couples.length) return undefined;
    let cancelled = false;
    let timer = null;
    let phase = "opening";

    function tick() {
      if (cancelled) return;
      if (pausedRef.current || document.hidden) {
        timer = window.setTimeout(tick, 200);
        return;
      }
      if (reducedMotion) {
        // Reduced motion: skip the 3D flip. The cover stays permanently
        // open (no spinning transform) and the couple content itself just
        // cross-fades in on mount — see .rmc-reduced in the styles below.
        setCoverOpen(true);
        timer = window.setTimeout(() => {
          setIndex((i) => (i + 1) % couples.length);
          tick();
        }, HOLD_MS);
        return;
      }
      if (phase === "opening") {
        setCoverOpen(true);
        phase = "open";
        timer = window.setTimeout(tick, FLIP_MS);
      } else if (phase === "open") {
        phase = "closing";
        timer = window.setTimeout(tick, HOLD_MS);
      } else if (phase === "closing") {
        setCoverOpen(false);
        phase = "closed";
        timer = window.setTimeout(tick, FLIP_MS);
      } else {
        setIndex((i) => (i + 1) % couples.length);
        phase = "opening";
        timer = window.setTimeout(tick, CLOSED_BEAT_MS);
      }
    }

    timer = window.setTimeout(tick, CLOSED_BEAT_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [couples.length, reducedMotion]);

  // Keep the <audio> element's src in sync with the current playlist
  // position, and advance to the next song when one finishes. This effect
  // never depends on `index` (the couple being shown), so couple changes
  // can never stop or restart the song.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !songs.length) return;
    const song = songs[songIndex % songs.length];
    if (!song?.url) return;
    if (audio.src !== song.url) {
      audio.src = song.url;
      if (soundOn) audio.play().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songIndex, songs]);

  function handleSongEnded() {
    const list = songsRef.current;
    if (!list.length) return;
    setSongIndex((songIndexRef.current + 1) % list.length);
  }

  function toggleSound() {
    const audio = audioRef.current;
    if (!audio) return;
    if (soundOn) {
      audio.pause();
      setSoundOn(false);
      return;
    }
    if (!audio.src && songs[songIndex]?.url) audio.src = songs[songIndex].url;
    audio
      .play()
      .then(() => setSoundOn(true))
      .catch(() => setSoundOn(false));
  }

  const couple = couples[index] || null;
  const flag = couple?.public_data?.flag || "";

  return (
    <section className="rmc-root" style={{ colorScheme: "dark" }}>
      <button type="button" className="rmc-back" onClick={onBack}>
        ← Back
      </button>
      <div className="rmc-kicker">LOVE & RELATIONSHIPS</div>
      <h1>Romantic Stories</h1>
      <p className="rmc-lead">Real Gwamo couples, one book, one shared soundtrack.</p>

      {couplesBusy && <p className="rmc-status">Loading Romantic Stories…</p>}
      {couplesError && (
        <p className="rmc-error" role="alert">
          {couplesError}
        </p>
      )}
      {!couplesBusy && !couplesError && !couples.length && (
        <p className="rmc-status">No couples have been added to Romantic Stories yet.</p>
      )}

      {!!couples.length && (
        <div className="rmc-stage">
          <button
            type="button"
            className="rmc-manage-trigger"
            aria-label="Manage Romantic Stories"
            title="Manage Romantic Stories"
            onClick={() => setManageOpen(true)}
          >
            ⚙
          </button>
          <div className={`rmc-book${reducedMotion ? " rmc-reduced" : ""}`}>
            <div className="rmc-pages" aria-hidden="true" />
            <div className="rmc-inside">
              {couple && (
                <div className="rmc-couple" key={couple.id}>
                  <img className="rmc-couple-photo" src={couple.creator_photo_url} alt="" />
                  <div className="rmc-couple-shade" />
                  <div className="rmc-couple-info">
                    <h2 className="rmc-couple-name">
                      {couple.creator_name}
                      {flag ? ` ${flag}` : ""}
                    </h2>
                  </div>
                </div>
              )}
            </div>
            <div className={`rmc-cover${coverOpen ? " is-open" : ""}`} aria-hidden="true">
              <div className="rmc-cover-front">
                <span className="rmc-cover-mark">♥</span>
                <small>GWAMO PRESENTS</small>
                <h2>
                  Romantic
                  <br />
                  Stories
                </h2>
                <span className="rmc-cover-rule" />
                <p>real couples, real love</p>
              </div>
              <div className="rmc-cover-back">
                <span>
                  Every love story
                  <br />
                  deserves a page.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <button type="button" className="rmc-sound-toggle" onClick={toggleSound} disabled={!songs.length}>
        {soundOn ? "🔊 Sound on" : "🔇 Sound off"}
      </button>
      {!songs.length && !songsError && <p className="rmc-fine">No songs in the shared playlist yet.</p>}
      {songsError && (
        <p className="rmc-error" role="alert">
          {songsError}
        </p>
      )}

      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} preload="none" onEnded={handleSongEnded} />

      {manageOpen && (
        <ManagePanel
          onClose={() => setManageOpen(false)}
          couples={couples}
          songs={songs}
          onChanged={() => setRefreshToken((t) => t + 1)}
        />
      )}

      <RomanticStoriesStyles />
    </section>
  );
}

function ManagePanel({ onClose, couples, songs, onChanged }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [names, setNames] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [flagPreset, setFlagPreset] = useState("");
  const [flagCustom, setFlagCustom] = useState("");
  const [photoFile, setPhotoFile] = useState(null);

  const [editingSongId, setEditingSongId] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [songUrl, setSongUrl] = useState("");
  const [songFile, setSongFile] = useState(null);
  const [songProgress, setSongProgress] = useState(0);

  function requirePin() {
    const value = pin.trim();
    if (!value) {
      setError("Enter the Connect video PIN.");
      return "";
    }
    return value;
  }

  async function addCouple(e) {
    e.preventDefault();
    if (busy) return;
    const pinValue = requirePin();
    if (!pinValue) return;
    const flag = (flagCustom.trim() || flagPreset).trim();
    if (!names.trim()) return setError("Enter the couple's names, e.g. John & Chantal.");
    if (!whatsapp.trim()) return setError("Enter a WhatsApp number.");
    if (!flag) return setError("Choose or paste a country flag.");
    if (!photoFile) return setError("Choose one couple photo.");
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const uploadForm = new FormData();
      uploadForm.append("kind", "profile_image");
      uploadForm.append("file", photoFile);
      const uploadRes = await fetch(`${CONNECT_API_URL}/api/connect/upload`, { method: "POST", body: uploadForm });
      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok || uploadData.success === false) {
        throw new Error(uploadData.error || "Photo upload failed.");
      }
      await connectApi("/api/connect/romantic", {
        method: "POST",
        headers: { "X-Connect-Video-Pin": pinValue },
        body: JSON.stringify({
          names: names.trim(),
          whatsapp: whatsapp.trim(),
          flag,
          photo_url: uploadData.url,
          photo_key: uploadData.key,
        }),
      });
      setNotice("Couple added to Romantic Stories.");
      setNames("");
      setWhatsapp("");
      setFlagPreset("");
      setFlagCustom("");
      setPhotoFile(null);
      onChanged();
    } catch (err) {
      setError(err.message || "Could not add this couple.");
    } finally {
      setBusy(false);
    }
  }

  async function removeCouple(id) {
    const pinValue = requirePin();
    if (!pinValue || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await connectApi("/api/connect/romantic", {
        method: "DELETE",
        headers: { "X-Connect-Video-Pin": pinValue },
        body: JSON.stringify({ item_id: id }),
      });
      setNotice("Couple removed.");
      onChanged();
    } catch (err) {
      setError(err.message || "Could not remove this couple.");
    } finally {
      setBusy(false);
    }
  }

  function startEditSong(song) {
    setEditingSongId(song?.id || "");
    setSongTitle(song?.title || "");
    setSongUrl("");
    setSongFile(null);
    setError("");
    setNotice("");
  }

  async function saveSong(e) {
    e.preventDefault();
    if (busy) return;
    const pinValue = requirePin();
    if (!pinValue) return;
    if (!songFile && !songUrl.trim() && !editingSongId) {
      return setError("Upload an MP3 or paste a song link.");
    }
    setBusy(true);
    setError("");
    setNotice("");
    setSongProgress(0);
    try {
      let url = songUrl.trim();
      let key = "";
      if (songFile) {
        const form = new FormData();
        form.append("kind", "romantic_song");
        form.append("file", songFile);
        form.append("pin", pinValue);
        const uploaded = await uploadWithProgress(`${CONNECT_API_URL}/api/connect/upload`, form, setSongProgress);
        url = uploaded.url;
        key = uploaded.key;
      }
      if (editingSongId) {
        await connectApi("/api/connect/romantic/playlist", {
          method: "PATCH",
          headers: { "X-Connect-Video-Pin": pinValue },
          body: JSON.stringify({
            song_id: editingSongId,
            title: songTitle.trim(),
            ...(url ? { url, key } : {}),
          }),
        });
        setNotice("Song updated.");
      } else {
        if (!url) throw new Error("Upload an MP3 or paste a song link.");
        await connectApi("/api/connect/romantic/playlist", {
          method: "POST",
          headers: { "X-Connect-Video-Pin": pinValue },
          body: JSON.stringify({ title: songTitle.trim(), url, key }),
        });
        setNotice("Song added to the shared playlist.");
      }
      setEditingSongId("");
      setSongTitle("");
      setSongUrl("");
      setSongFile(null);
      setSongProgress(0);
      onChanged();
    } catch (err) {
      setError(err.message || "Could not save this song.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSong(id) {
    const pinValue = requirePin();
    if (!pinValue || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await connectApi("/api/connect/romantic/playlist", {
        method: "DELETE",
        headers: { "X-Connect-Video-Pin": pinValue },
        body: JSON.stringify({ song_id: id }),
      });
      setNotice("Song removed.");
      onChanged();
    } catch (err) {
      setError(err.message || "Could not remove this song.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="rmc-dialog"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="rmc-dialog-head">
        <h2>Manage Romantic Stories</h2>
        <button type="button" aria-label="Close" disabled={busy} onClick={onClose}>
          ×
        </button>
      </div>

      <label className="rmc-label" htmlFor="rmc-pin">
        Connect video PIN
      </label>
      <input
        id="rmc-pin"
        className="rmc-input"
        type="password"
        value={pin}
        onChange={(e) => {
          setPin(e.target.value);
          setError("");
        }}
        autoComplete="off"
      />
      <a className="rmc-ask-admin" href={adminPinWhatsAppUrl()} target="_blank" rel="noreferrer">
        💬 Ask admin for the PIN on WhatsApp
      </a>

      {error && (
        <p className="rmc-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="rmc-notice" role="status">
          {notice}
        </p>
      )}

      <h3 className="rmc-section-title">Couples in the book</h3>
      <div className="rmc-manage-list">
        {couples.map((c) => (
          <div className="rmc-manage-row" key={c.id}>
            <img src={c.creator_photo_url} alt="" />
            <span>
              {c.creator_name} {c.public_data?.flag || ""}
            </span>
            <button type="button" disabled={busy} onClick={() => removeCouple(c.id)}>
              Remove
            </button>
          </div>
        ))}
        {!couples.length && <p className="rmc-fine">No couples yet.</p>}
      </div>

      <form onSubmit={addCouple} className="rmc-form">
        <h3 className="rmc-section-title">Add a couple</h3>
        <label className="rmc-label" htmlFor="rmc-names">
          Couple names
        </label>
        <input
          id="rmc-names"
          className="rmc-input"
          value={names}
          onChange={(e) => setNames(e.target.value)}
          placeholder="John & Chantal"
        />
        <label className="rmc-label" htmlFor="rmc-whatsapp">
          WhatsApp number (kept private)
        </label>
        <input
          id="rmc-whatsapp"
          className="rmc-input"
          type="tel"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="+250788123456"
        />
        <label className="rmc-label" htmlFor="rmc-flag">
          Country flag
        </label>
        <select id="rmc-flag" className="rmc-input" value={flagPreset} onChange={(e) => setFlagPreset(e.target.value)}>
          <option value="">Choose a flag…</option>
          {FLAG_PRESETS.map(([emoji, label]) => (
            <option key={emoji} value={emoji}>
              {emoji} {label}
            </option>
          ))}
        </select>
        <input
          className="rmc-input"
          value={flagCustom}
          onChange={(e) => setFlagCustom(e.target.value)}
          placeholder="Or paste another flag emoji"
        />
        <label className="rmc-label" htmlFor="rmc-photo">
          Couple photo
        </label>
        <input
          id="rmc-photo"
          className="rmc-input"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
        />
        <button className="rmc-primary" disabled={busy}>
          {busy ? "Saving…" : "Add couple"}
        </button>
      </form>

      <h3 className="rmc-section-title">Shared playlist</h3>
      <div className="rmc-manage-list">
        {songs.map((s) => (
          <div className="rmc-manage-row" key={s.id}>
            <span>🎵 {s.title || "Untitled song"}</span>
            <button type="button" disabled={busy} onClick={() => startEditSong(s)}>
              Change
            </button>
            <button type="button" disabled={busy} onClick={() => deleteSong(s.id)}>
              Delete
            </button>
          </div>
        ))}
        {!songs.length && <p className="rmc-fine">No songs yet.</p>}
      </div>

      <form onSubmit={saveSong} className="rmc-form">
        <h3 className="rmc-section-title">{editingSongId ? "Change this song" : "Add a song"}</h3>
        <label className="rmc-label" htmlFor="rmc-song-title">
          Title (optional)
        </label>
        <input
          id="rmc-song-title"
          className="rmc-input"
          value={songTitle}
          onChange={(e) => setSongTitle(e.target.value)}
          placeholder="Song title"
        />
        <label className="rmc-label" htmlFor="rmc-song-file">
          Upload MP3 (up to 20 MB)
        </label>
        <input
          id="rmc-song-file"
          className="rmc-input"
          type="file"
          accept="audio/*"
          onChange={(e) => setSongFile(e.target.files?.[0] || null)}
        />
        <label className="rmc-label" htmlFor="rmc-song-url">
          Or song link
        </label>
        <input
          id="rmc-song-url"
          className="rmc-input"
          type="url"
          value={songUrl}
          onChange={(e) => setSongUrl(e.target.value)}
          placeholder="https://…"
        />
        {busy && songFile && <p role="status">Uploading: {songProgress}%</p>}
        <button className="rmc-primary" disabled={busy}>
          {busy ? "Saving…" : editingSongId ? "Save changes" : "Add song"}
        </button>
        {editingSongId && (
          <button type="button" className="rmc-secondary" onClick={() => startEditSong(null)} disabled={busy}>
            Cancel change
          </button>
        )}
      </form>
    </dialog>
  );
}

function RomanticStoriesStyles() {
  return (
    <style>{`
.rmc-root{width:min(100%,560px);margin:0 auto;color:#fbf3f6;font-family:inherit}
.rmc-root *{box-sizing:border-box}
.rmc-root h1{font-size:clamp(28px,7vw,40px);line-height:1.12;margin:10px 0}
.rmc-root p{line-height:1.55}
.rmc-root button,.rmc-dialog button{cursor:pointer;font:inherit}
.rmc-root button:disabled,.rmc-dialog button:disabled{opacity:.45;cursor:default}
.rmc-root button:focus-visible,.rmc-dialog :focus-visible{outline:3px solid #ffb3d4;outline-offset:3px}
.rmc-back{border:0;background:none;color:#e9c6d3;margin:0 0 22px;padding:8px 0}
.rmc-kicker{color:#ff8fb8;font-size:11px;font-weight:800;letter-spacing:.14em}
.rmc-lead{color:rgba(251,243,246,.68);font-size:14px;margin:0 0 18px}
.rmc-status{color:rgba(251,243,246,.6);font-size:13px}
.rmc-error{color:#ffd2d7;background:#4b1c2b;padding:12px;border-radius:10px;font-size:13px}
.rmc-notice{font-size:12px;color:#b8f4db}
.rmc-fine{font-size:11px;color:#d3aebb}

.rmc-stage{position:relative;padding:14px 13px 18px 19px;border-radius:18px;background:radial-gradient(ellipse at 45% 45%,#3a1a2c,#160a12 75%);margin-top:6px}
.rmc-manage-trigger{position:absolute;top:10px;right:10px;z-index:5;width:34px;height:34px;border-radius:50%;border:1px solid rgba(255,255,255,.18);background:rgba(8,4,10,.45);color:#fff;font-size:15px;opacity:.45;transition:opacity .2s ease}
.rmc-manage-trigger:hover,.rmc-manage-trigger:focus-visible{opacity:1}

.rmc-book{position:relative;aspect-ratio:3/4;min-height:390px;perspective:1600px;perspective-origin:35% 45%}
.rmc-pages{position:absolute;inset:5px -7px -7px 5px;border-radius:5px 12px 12px 5px;background:repeating-linear-gradient(0deg,#e6ddc8 0 1px,#958d7c 1px 2px,#f4ead6 2px 4px);box-shadow:5px 9px 17px #0009}
.rmc-inside{position:absolute;inset:0;overflow:hidden;border:2px solid #bba77f;border-radius:4px 10px 10px 4px;background:#180a13}

.rmc-couple{position:absolute;inset:0;animation:rmcFadeIn .5s ease}
.rmc-couple-photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.rmc-couple-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,3,8,.05) 0%,rgba(10,3,8,.35) 45%,rgba(10,3,8,.92) 100%)}
.rmc-couple-info{position:absolute;left:0;right:0;bottom:0;padding:20px 16px 18px}
.rmc-couple-name{margin:0!important;color:#fff;font-size:clamp(19px,5.2vw,25px)!important;line-height:1.2!important;text-shadow:0 0 4px #fff,0 0 12px #ff6fb0,0 0 24px #ff2d95,0 0 42px rgba(255,45,149,.6);animation:rmcNeonPulse 3.4s ease-in-out infinite,rmcNameFloat 6s ease-in-out infinite}

.rmc-cover{position:absolute;inset:0;transform-origin:0 50%;transform-style:preserve-3d;transform:rotateY(0deg);transition:transform .7s cubic-bezier(.45,0,.2,1);pointer-events:none;z-index:3}
.rmc-cover.is-open{transform:rotateY(-172deg)}
.rmc-cover-front,.rmc-cover-back{position:absolute;inset:0;backface-visibility:hidden;border-radius:4px 12px 12px 4px;border:1px solid #6b4a55;overflow:hidden}
.rmc-cover-front{padding:22px 16px 18px 23px;display:flex;flex-direction:column;align-items:flex-start;gap:6px;background:repeating-linear-gradient(20deg,#ffffff05 0 1px,transparent 1px 4px),radial-gradient(ellipse at 80% 15%,#5c2436,#340f1e 58%,#1c0510);box-shadow:inset 9px 0 9px #0008,inset 12px 0 0 #ffffff0a,inset -2px 0 0 #d9a6b833,5px 2px 10px #0007;transform:translateZ(1px)}
.rmc-cover-front:after{content:"";position:absolute;inset:11px 11px 11px 17px;border:1px solid #e9c6d340;border-radius:3px 8px 8px 3px;pointer-events:none}
.rmc-cover-mark{font-size:22px;color:#ffb3d4;text-shadow:0 0 10px #ff2d9588}
.rmc-cover-front>small{font-size:9px;letter-spacing:.2em;color:#e3b7c6}
.rmc-cover-front h2{font-family:Georgia,serif!important;font-size:clamp(28px,7vw,40px)!important;line-height:1.05!important;font-weight:500!important;color:#f8ecef;margin:4px 0!important}
.rmc-cover-rule{width:46px;height:1px;background:linear-gradient(90deg,#e9c6d3,transparent);margin:2px 0}
.rmc-cover-front p{font-size:12px;font-style:italic;color:#e3c1cc;margin:0}
.rmc-cover-back{transform:rotateY(180deg) translateZ(1px);background:repeating-linear-gradient(45deg,#d1c5a5 0 2px,#e2d7b9 2px 5px);box-shadow:inset -10px 0 24px #32251955;display:grid;place-items:center;text-align:center;color:#66573b;font-family:Georgia,serif;font-style:italic;padding:20px}

.rmc-reduced .rmc-cover{transition:none;transform:rotateY(-172deg)}
.rmc-reduced .rmc-couple{animation:none}
.rmc-reduced .rmc-couple-name{animation:none}

@keyframes rmcFadeIn{0%{opacity:0}100%{opacity:1}}
@keyframes rmcNeonPulse{0%,100%{filter:brightness(1)}50%{filter:brightness(1.22)}}
@keyframes rmcNameFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}

.rmc-sound-toggle{display:block;width:100%;min-height:52px;margin-top:16px;border:1px solid rgba(255,178,212,.4);border-radius:16px;color:#fff;background:linear-gradient(135deg,#8a1f4c,#4c1029);font-weight:800;font-size:14px}
.rmc-sound-toggle:disabled{opacity:.4}

.rmc-dialog{position:fixed;inset:0;width:min(92vw,480px);max-height:85dvh;margin:auto;border:1px solid #a06c80;border-radius:20px;background:#1c0d16;color:#f6e9ee;padding:22px;box-shadow:0 30px 80px #0009;font-family:inherit;overflow:auto}
.rmc-dialog::backdrop{background:#08030acf;backdrop-filter:blur(5px)}
.rmc-dialog-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
.rmc-dialog-head h2{font-size:20px;margin:0!important}
.rmc-dialog-head button{flex-shrink:0;width:38px;height:38px;border:1px solid #6b4a55;border-radius:50%;background:#2c1420;color:white;font-size:22px}
.rmc-label{display:block;margin:16px 0 6px;font-size:13px;font-weight:750}
.rmc-input{display:block;width:100%;padding:12px;border:1px solid #6b4a55;border-radius:12px;background:#150910;color:white;font:inherit;min-height:46px;margin-bottom:8px}
.rmc-input[type=file]{font-size:12px}
.rmc-primary{width:100%;padding:14px;margin-top:8px;border:1px solid #ff8fb8;border-radius:14px;background:linear-gradient(135deg,#e83670,#8a1f4c);color:white;font-weight:800!important}
.rmc-secondary{width:100%;padding:12px;margin-top:8px;border:1px solid #6b4a55;border-radius:14px;background:transparent;color:#f6e9ee;font-weight:700}
.rmc-ask-admin{display:flex;align-items:center;justify-content:center;min-height:42px;margin-top:8px;border:1px solid rgba(80,215,126,.35);border-radius:12px;color:#bff5cf;background:rgba(24,92,50,.28);font-size:12px;font-weight:800;text-decoration:none}
.rmc-section-title{margin:20px 0 8px;font-size:13px;letter-spacing:.04em;color:#ffb3d4}
.rmc-manage-list{display:flex;flex-direction:column;gap:8px}
.rmc-manage-row{display:flex;align-items:center;gap:10px;padding:8px;border:1px solid #4a2733;border-radius:12px;font-size:12px}
.rmc-manage-row img{width:34px;height:34px;border-radius:8px;object-fit:cover;flex:0 0 auto}
.rmc-manage-row span{flex:1;min-width:0;overflow-wrap:anywhere}
.rmc-manage-row button{flex:0 0 auto;border:1px solid #6b4a55;border-radius:8px;background:#2c1420;color:#f6e9ee;font-size:11px;padding:6px 9px}
.rmc-form{margin-top:6px}

@media(max-width:390px){.rmc-stage{padding:11px 10px 16px 15px}.rmc-book{min-height:365px}.rmc-cover-front{padding:16px 12px 14px 18px}}
@media (prefers-reduced-motion: reduce){
  .rmc-cover{transition:none!important;transform:rotateY(-172deg)!important}
  .rmc-couple{animation:none!important}
  .rmc-couple-name{animation:none!important}
}
    `}</style>
  );
}