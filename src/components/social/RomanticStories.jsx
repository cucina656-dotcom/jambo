import { useEffect, useMemo, useRef, useState } from "react";
const ROMANTIC_API_URL = "https://kitchenbrain.cucina656.workers.dev";

const DEMO_COUPLES = [
  {
    id: "demo-1",
    names: "John & Chantal",
    whatsapp: "",
    flag: "🇷🇼",
    image: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=900&q=85",
    localImage: false,
  },
  {
    id: "demo-2",
    names: "Eric & Aline",
    whatsapp: "",
    flag: "🇧🇮",
    image: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=900&q=85",
    localImage: false,
  },
  {
    id: "demo-3",
    names: "David & Grace",
    whatsapp: "",
    flag: "🇺🇬",
    image: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=900&q=85",
    localImage: false,
  },
];

const COUNTRY_CODES = `
AF AL DZ AD AO AG AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI
CV KH CM CA CF TD CL CN CO KM CG CD CR CI HR CU CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ
ET FJ FI FR GA GM GE DE GH GR GD GT GN GW GY HT HN HU IS IN ID IR IQ IE IL IT JM JP JO
KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MG MW MY MV ML MT MH MR MU MX FM MD MC
MN ME MA MZ MM NA NR NP NL NZ NI NE NG MK NO OM PK PW PA PG PY PE PH PL PT QA RO RU RW
KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA SS ES LK SD SR SE CH SY TW TJ TZ TH TL
TG TO TT TN TR TM TV UG UA AE GB US UY UZ VU VA VE VN YE ZM ZW
`.trim().split(/\s+/);

const OPEN_MS = 760;
const PAGE_HOLD_MS = 5000;
const PAGE_TURN_MS = 3000;
const PAGE_SETTLE_MS = 380;
const CLOSED_HOLD_MS = 900;

function flagFromCode(code) {
  if (!code || code.length !== 2) return "🏳️";
  return String.fromCodePoint(...code.toUpperCase().split("").map((char) => 127397 + char.charCodeAt(0)));
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function RomanticStories({ onPlayMatchGame, onBrowseMeetSomeone }) {
  const [couples, setCouples] = useState(DEMO_COUPLES);
  const [pageIndex, setPageIndex] = useState(0);
  const [nextPageIndex, setNextPageIndex] = useState(0);
  const [coverOpen, setCoverOpen] = useState(false);
  const [pageTurning, setPageTurning] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const [showAddCouple, setShowAddCouple] = useState(false);
  const [showSongManager, setShowSongManager] = useState(false);
  const [coupleNames, setCoupleNames] = useState("");
  const [coupleWhatsapp, setCoupleWhatsapp] = useState("");
  const [countryCode, setCountryCode] = useState("RW");
  const [coupleImageFile, setCoupleImageFile] = useState(null);
  const [coupleFormMessage, setCoupleFormMessage] = useState("");
  const [couplePin, setCouplePin] = useState("");
  const [coupleManagerUnlocked, setCoupleManagerUnlocked] = useState(false);

  const [songs, setSongs] = useState([]);
  const [songIndex, setSongIndex] = useState(0);
  const [soundOn, setSoundOn] = useState(false);
  const [songPin, setSongPin] = useState("");
  const [songManagerUnlocked, setSongManagerUnlocked] = useState(false);
  const [songMessage, setSongMessage] = useState("");
  const [showSongUpload, setShowSongUpload] = useState(true);

  const audioRef = useRef(null);
  const bookRef = useRef(null);
  const [bookNotice, setBookNotice] = useState("");
  const [serverLoaded, setServerLoaded] = useState(false);

  const regionNames = useMemo(() => {
    try {
      return new Intl.DisplayNames(["en"], { type: "region" });
    } catch {
      return null;
    }
  }, []);

  const countryOptions = useMemo(
    () =>
      COUNTRY_CODES.map((code) => ({
        code,
        flag: flagFromCode(code),
        name: regionNames?.of(code) || code,
      })),
    [regionNames]
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener?.("change", sync);
    return () => media.removeEventListener?.("change", sync);
  }, []);

  useEffect(() => {
    if (!couples.length) return undefined;

    let cancelled = false;
    let timer = null;

    const wait = (ms) =>
      new Promise((resolve) => {
        timer = window.setTimeout(resolve, ms);
      });

    async function runBook() {
      while (!cancelled) {
        setPageTurning(false);
        setPageIndex(0);
        setNextPageIndex(couples.length > 1 ? 1 : 0);
        setCoverOpen(false);

        await wait(CLOSED_HOLD_MS);
        if (cancelled) return;

        setCoverOpen(true);
        await wait(reducedMotion ? 50 : OPEN_MS + 120);
        if (cancelled) return;

        for (let i = 0; i < couples.length; i += 1) {
          setPageIndex(i);
          setPageTurning(false);

          await wait(PAGE_HOLD_MS);
          if (cancelled) return;

          if (i < couples.length - 1) {
            setNextPageIndex(i + 1);

            if (!reducedMotion) {
              setPageTurning(true);
              await wait(PAGE_TURN_MS);
              if (cancelled) return;
            }

            setPageIndex(i + 1);
            setPageTurning(false);

            await wait(PAGE_SETTLE_MS);
            if (cancelled) return;
          }
        }

        setCoverOpen(false);
        await wait(reducedMotion ? 80 : OPEN_MS + 160);
        if (cancelled) return;
      }
    }

    runBook();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [couples.length, reducedMotion]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!soundOn || !songs.length) {
      audio.pause();
      return;
    }

    const activeSong = songs[Math.min(songIndex, songs.length - 1)];
    if (!activeSong) return;

    if (audio.src !== activeSong.url) {
      audio.src = activeSong.url;
    }

    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        setSoundOn(false);
      });
    }
  }, [soundOn, songIndex, songs]);

  useEffect(() => {
    if (songIndex >= songs.length && songs.length) {
      setSongIndex(0);
    }
  }, [songs.length, songIndex]);

  useEffect(() => {
    return () => {
      couples.forEach((couple) => {
        if (couple.localImage && couple.image) URL.revokeObjectURL(couple.image);
      });
      songs.forEach((song) => {
        if (song.localUrl && song.url) URL.revokeObjectURL(song.url);
      });
    };
  }, [couples, songs]);

    // Load couples, songs, and playback state from the worker on mount.
  // This is what makes the storybook and the background playlist survive a
  // page refresh. Runs once.
  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      try {
        const [couplesRes, songsRes, playbackRes] = await Promise.all([
          fetch(`${ROMANTIC_API_URL}/api/romantic/couples`).then((r) => r.json()),
          fetch(`${ROMANTIC_API_URL}/api/romantic/songs`).then((r) => r.json()),
          fetch(`${ROMANTIC_API_URL}/api/romantic/playback`).then((r) => r.json()),
        ]);

        if (cancelled) return;

        const serverCouples = Array.isArray(couplesRes?.couples) ? couplesRes.couples : [];
        const serverSongs = Array.isArray(songsRes?.songs) ? songsRes.songs : [];
        const playback = playbackRes?.playback || {};

        if (serverCouples.length > 0) {
          setCouples(
            serverCouples.map((c) => ({
              id: c.id,
              names: c.names,
              whatsapp: c.whatsapp,
              flag: c.flag || "🏳️",
              image: c.image_url,
              localImage: false,
            }))
          );
        }

        if (serverSongs.length > 0) {
          setSongs(
            serverSongs.map((s) => ({
              id: s.id,
              name: s.name,
              url: s.url,
              localUrl: false,
            }))
          );
        }

        const startIndex = Number(playback.song_index || 0);
        if (serverSongs.length > 0 && startIndex < serverSongs.length) {
          setSongIndex(startIndex);
        }
        if (playback.sound_on === true) {
          setSoundOn(true);
        }
      } catch (err) {
        console.warn("Romantic Stories load failed:", err);
      } finally {
        if (!cancelled) setServerLoaded(true);
      }
    }

    loadAll();
    return () => {
      cancelled = true;
    };
  }, []);

  const safePageIndex = Math.min(pageIndex, Math.max(0, couples.length - 1));
  const safeNextPageIndex = Math.min(nextPageIndex, Math.max(0, couples.length - 1));
  const visibleCouple = pageTurning ? couples[safeNextPageIndex] : couples[safePageIndex];
  const turningCouple = couples[safePageIndex];

   async function handleAddCouple(event) {
    event.preventDefault();
    setCoupleFormMessage("");

    if (!coupleNames.trim()) {
      setCoupleFormMessage("Add the couple names.");
      return;
    }
    if (!coupleWhatsapp.trim()) {
      setCoupleFormMessage("Add the WhatsApp number.");
      return;
    }
    if (!coupleImageFile) {
      setCoupleFormMessage("Upload one couple image.");
      return;
    }
    if (!couplePin.trim()) {
      setCoupleFormMessage("Enter the Romantic Stories PIN.");
      return;
    }

    try {
      const form = new FormData();
      form.append("names", coupleNames.trim());
      form.append("whatsapp", coupleWhatsapp.trim());
      form.append("flag", flagFromCode(countryCode));
      form.append("file", coupleImageFile);

      const response = await fetch(`${ROMANTIC_API_URL}/api/romantic/couples`, {
        method: "POST",
        headers: { "X-Admin-Pin": couplePin.trim() },
        body: form,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) {
        throw new Error(data.error || data.message || "Could not add this couple.");
      }

      const saved = data.couple;
      const newCouple = {
        id: saved.id,
        names: saved.names,
        whatsapp: saved.whatsapp,
        flag: saved.flag || "🏳️",
        image: saved.image_url,
        localImage: false,
      };

      setCouples((current) => [...current, newCouple]);
      setCoupleNames("");
      setCoupleWhatsapp("");
      setCountryCode("RW");
      setCoupleImageFile(null);
      setCoupleFormMessage("");
      setShowAddCouple(false);
      setBookNotice(`${newCouple.names} added to Romantic Stories.`);

      window.setTimeout(() => {
        bookRef.current?.scrollIntoView({
          behavior: reducedMotion ? "auto" : "smooth",
          block: "center",
        });
      }, 80);

      window.setTimeout(() => {
        setBookNotice("");
      }, 2800);
    } catch (error) {
      setCoupleFormMessage(error.message || "Could not add this couple.");
    }
  }
  function unlockCoupleManager() {
    if (!couplePin.trim()) {
      setCoupleFormMessage("Enter the Romantic Stories PIN.");
      return;
    }

    setCoupleManagerUnlocked(true);
    setCoupleFormMessage(
      "Couple management is open for this safe frontend test. Real PIN verification will be connected to the Worker later."
    );
  }

  async function deleteCouple(coupleId) {
    if (!couplePin.trim()) {
      setCoupleFormMessage("Enter the Romantic Stories PIN.");
      return;
    }
    try {
      const response = await fetch(`${ROMANTIC_API_URL}/api/romantic/couples`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Pin": couplePin.trim(),
        },
        body: JSON.stringify({ id: coupleId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) {
        throw new Error(data.error || data.message || "Could not remove this couple.");
      }
      setCouples((current) => current.filter((couple) => couple.id !== coupleId));
      setCoupleFormMessage("Couple removed.");
    } catch (error) {
      setCoupleFormMessage(error.message || "Could not remove this couple.");
    }
  }

  function unlockSongManager() {
    if (!songPin.trim()) {
      setSongMessage("Enter the Romantic Stories PIN.");
      return;
    }

    setSongManagerUnlocked(true);
    setSongMessage(
      "Song management is open for this safe frontend test. Real PIN verification will be connected to the Worker later."
    );
  }

  async function addSongs(files) {
    const selected = Array.from(files || []);
    if (!selected.length) return;
    if (!songPin.trim()) {
      setSongMessage("Enter the Romantic Stories PIN.");
      return;
    }

    setSongMessage(`Uploading ${selected.length} song${selected.length === 1 ? "" : "s"}...`);

    let addedCount = 0;
    let lastError = "";

    for (const file of selected) {
      try {
        const form = new FormData();
        form.append("name", file.name);
        form.append("file", file);

        const response = await fetch(`${ROMANTIC_API_URL}/api/romantic/songs`, {
          method: "POST",
          headers: { "X-Admin-Pin": songPin.trim() },
          body: form,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false) {
          throw new Error(data.error || data.message || "Upload failed.");
        }

        const saved = data.song;
        setSongs((current) => [
          ...current,
          { id: saved.id, name: saved.name, url: saved.url, localUrl: false },
        ]);
        addedCount += 1;
      } catch (error) {
        lastError = error.message || "Upload failed.";
      }
    }

    if (addedCount > 0) {
      setSongMessage(
        `✓ ${addedCount} song${addedCount === 1 ? "" : "s"} added to the shared book playlist.`
      );
      setShowSongUpload(false);
    } else if (lastError) {
      setSongMessage(lastError);
    }
  }

 


   async function deleteSong(songId) {
    if (!songPin.trim()) {
      setSongMessage("Enter the Romantic Stories PIN.");
      return;
    }
    try {
      const response = await fetch(`${ROMANTIC_API_URL}/api/romantic/songs`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Pin": songPin.trim(),
        },
        body: JSON.stringify({ id: songId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) {
        throw new Error(data.error || data.message || "Could not remove this song.");
      }
      setSongs((current) => current.filter((song) => song.id !== songId));
      setSongIndex(0);
      setSongMessage("Song removed.");
    } catch (error) {
      setSongMessage(error.message || "Could not remove this song.");
    }
  }

  function toggleSound() {
    if (!songs.length) {
      setShowSongManager(true);
      setSongMessage("No background songs yet. Add at least one MP3 first.");
      return;
    }

    setSoundOn((current) => !current);
  }

  function handleSongEnded() {
    if (!songs.length) return;
    setSongIndex((current) => (current + 1) % songs.length);
  }

  return (
    <section className="romantic-stories-root">
      <div className="romantic-top-actions">
        <button type="button" className="romantic-match-button" onClick={onPlayMatchGame}>
          Play the Match Game
        </button>

        <div className="romantic-manage-row">
          <button
            type="button"
            className="romantic-small-action"
            onClick={() => {
              setShowAddCouple((current) => !current);
              setShowSongManager(false);
            }}
          >
            ＋ Add couple
          </button>

          <button
            type="button"
            className="romantic-small-action"
            onClick={() => {
              setShowSongManager((current) => !current);
              setShowAddCouple(false);
            }}
          >
            ♫ Manage songs
          </button>
        </div>
      </div>

      {showAddCouple && (
        <>
        <form className="romantic-control-panel" onSubmit={handleAddCouple}>
          <div className="romantic-panel-title">Add a couple to Romantic Stories</div>

          <input
            className="romantic-input"
            value={coupleNames}
            onChange={(event) => setCoupleNames(event.target.value)}
            placeholder="Couple names, e.g. John & Chantal"
          />

          <input
            className="romantic-input"
            value={coupleWhatsapp}
            onChange={(event) => setCoupleWhatsapp(event.target.value)}
            placeholder="WhatsApp number — private"
            inputMode="tel"
            autoComplete="tel"
          />

          <select
            className="romantic-input romantic-select"
            value={countryCode}
            onChange={(event) => setCountryCode(event.target.value)}
          >
            {countryOptions.map((country) => (
              <option key={country.code} value={country.code}>
                {country.flag} {country.name}
              </option>
            ))}
          </select>

          <label className="romantic-file-field">
            <span>{coupleImageFile ? `📷 ${coupleImageFile.name}` : "📷 Upload exactly one couple image"}</span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setCoupleImageFile(event.target.files?.[0] || null)}
            />
          </label>

          <button type="submit" className="romantic-panel-primary">
            Add couple
          </button>

          {coupleFormMessage && !coupleManagerUnlocked && (
            <div className="romantic-panel-message">{coupleFormMessage}</div>
          )}
        </form>

        <div className="romantic-control-panel">
          <div className="romantic-panel-title">Manage existing couples</div>

          {!coupleManagerUnlocked ? (
            <>
              <input
                className="romantic-input"
                type="password"
                value={couplePin}
                onChange={(event) => {
                  setCouplePin(event.target.value);
                  setCoupleFormMessage("");
                }}
                placeholder="Romantic Stories PIN"
                inputMode="numeric"
              />

              <button type="button" className="romantic-panel-primary" onClick={unlockCoupleManager}>
                Continue
              </button>

              <a
                className="romantic-ask-pin"
                href={`https://wa.me/250788484446?text=${encodeURIComponent(
                  "Hello Gwamo Admin, I need the Romantic Stories PIN to manage couples."
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                Ask admin for PIN
              </a>
            </>
          ) : (
            <div className="romantic-song-list">
              {!couples.length && <div className="romantic-song-empty">No couples added yet.</div>}

              {couples.map((couple, index) => (
                <div className="romantic-song-row" key={couple.id}>
                  <div className="romantic-song-name">
                    {index + 1}. {couple.names} {couple.flag}
                  </div>

                  <button
                    type="button"
                    className="romantic-song-action danger"
                    onClick={() => deleteCouple(couple.id)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}

          {coupleFormMessage && coupleManagerUnlocked && (
            <div className="romantic-panel-message">{coupleFormMessage}</div>
          )}
        </div>
        </>
      )}

      {showSongManager && (
        <div className="romantic-control-panel">
          <div className="romantic-panel-title">Romantic Stories background songs</div>

          {!songManagerUnlocked ? (
            <>
              <input
                className="romantic-input"
                type="password"
                value={songPin}
                onChange={(event) => {
                  setSongPin(event.target.value);
                  setSongMessage("");
                }}
                placeholder="Romantic Stories PIN"
                inputMode="numeric"
              />

              <button type="button" className="romantic-panel-primary" onClick={unlockSongManager}>
                Continue
              </button>

              <a
                className="romantic-ask-pin"
                href={`https://wa.me/250788484446?text=${encodeURIComponent(
                  "Hello Gwamo Admin, I need the Romantic Stories PIN to manage background songs."
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                Ask admin for PIN
              </a>
            </>
          ) : (
            <>
              {showSongUpload ? (
                <label className="romantic-file-field">
                  <span>🎵 Add MP3 songs</span>
                  <input type="file" accept="audio/*,.mp3" multiple onChange={(event) => addSongs(event.target.files)} />
                </label>
              ) : (
                <button
                  type="button"
                  className="romantic-song-action"
                  onClick={() => {
                    setShowSongUpload(true);
                    setSongMessage("");
                  }}
                >
                  + Add more songs
                </button>
              )}

              <div className="romantic-song-list">
                {!songs.length && <div className="romantic-song-empty">No songs added yet.</div>}

                {songs.map((song, index) => (
                  <div className="romantic-song-row" key={song.id}>
                    <div className="romantic-song-name">
                      {index + 1}. {song.name}
                    </div>

                                        <label className="romantic-song-action">
                      Add another
                      <input
                        type="file"
                        accept="audio/*,.mp3"
                        multiple
                        onChange={(event) => addSongs(event.target.files)}
                      />
                    </label>

                    <button
                      type="button"
                      className="romantic-song-action danger"
                      onClick={() => deleteSong(song.id)}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {songMessage && <div className="romantic-panel-message">{songMessage}</div>}
        </div>
      )}

      <div className="romantic-book-stage" ref={bookRef}>
        {bookNotice && <div className="romantic-book-notice">✓ {bookNotice}</div>}

        <div className={`romantic-book${reducedMotion ? " reduced-motion" : ""}`}>
          <div className="romantic-page-block" aria-hidden="true" />

          <div className="romantic-book-inside">
            {visibleCouple ? (
              <>
                <img className="romantic-couple-image" src={visibleCouple.image} alt="" />
                <div className="romantic-image-shade" />
                <div className="romantic-couple-overlay">
                  <div className="romantic-couple-name">
                    <span>{visibleCouple.names}</span>
                    <span className="romantic-couple-flag">{visibleCouple.flag}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="romantic-empty-page">Add the first couple.</div>
            )}
          </div>

          {pageTurning && turningCouple && (
            <div className="romantic-turn-page is-turning" aria-hidden="true">
              <div className="romantic-turn-front">
                <img className="romantic-couple-image" src={turningCouple.image} alt="" />
                <div className="romantic-image-shade" />
                <div className="romantic-couple-overlay">
                  <div className="romantic-couple-name">
                    <span>{turningCouple.names}</span>
                    <span className="romantic-couple-flag">{turningCouple.flag}</span>
                  </div>
                </div>
              </div>
              <div className="romantic-turn-back" />
            </div>
          )}

          <div className={`romantic-book-cover${coverOpen ? " is-open" : ""}`} aria-hidden="true">
            <div className="romantic-cover-front">
              <div className="romantic-cover-frame" />
              <div className="romantic-cover-heart">♥</div>
              <div className="romantic-cover-title">
                <span>Romantic</span>
                <span>Stories</span>
              </div>
            </div>

            <div className="romantic-cover-back">
              <div className="romantic-cover-back-text">
                Every love story
                <br />
                deserves a page.
              </div>
            </div>
          </div>
        </div>
      </div>

      <button type="button" className="romantic-sound-button" onClick={toggleSound} aria-pressed={soundOn}>
        {soundOn ? "🔊 Sound on" : "🔇 Sound off"}
      </button>

      {onBrowseMeetSomeone && (
        <button type="button" className="romantic-browse-link" onClick={onBrowseMeetSomeone}>
          Browse Meet Someone →
        </button>
      )}

      <audio ref={audioRef} preload="metadata" onEnded={handleSongEnded} />

      <style>{`
        .romantic-stories-root {
          width: min(100%, 560px);
          min-height: 100svh;
          margin: 0 auto;
          padding: calc(146px + env(safe-area-inset-top)) 16px 40px;
          box-sizing: border-box;
          color: #fff8fb;
          background:
            radial-gradient(circle at 50% -3%, rgba(255,70,140,.14), transparent 31%),
            #020711;
          overflow-x: hidden;
        }

        .romantic-top-actions {
          display: grid;
          gap: 10px;
          margin-bottom: 14px;
        }

        .romantic-match-button {
          width: 100%;
          min-height: 54px;
          border: 1px solid rgba(255,95,147,.52);
          border-radius: 16px;
          color: #fff;
          background: linear-gradient(135deg, #e83670, #a91d50);
          box-shadow: 0 12px 30px rgba(232,54,112,.22);
          font-size: 15px;
          font-weight: 900;
          cursor: pointer;
        }

        .romantic-manage-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .romantic-small-action {
          min-height: 42px;
          border: 1px solid rgba(255,177,211,.23);
          border-radius: 14px;
          color: rgba(255,255,255,.92);
          background: rgba(77,19,46,.56);
          font-size: 12px;
          font-weight: 850;
          cursor: pointer;
        }

        .romantic-control-panel {
          margin: 0 0 14px;
          padding: 14px;
          border: 1px solid rgba(255,143,186,.24);
          border-radius: 18px;
          background: rgba(16,7,19,.94);
          box-shadow: 0 16px 34px rgba(0,0,0,.26);
        }

        .romantic-panel-title {
          margin-bottom: 11px;
          color: #fff;
          font-size: 14px;
          font-weight: 900;
        }

        .romantic-input {
          width: 100%;
          min-height: 48px;
          margin-bottom: 9px;
          padding: 0 13px;
          box-sizing: border-box;
          border: 1px solid rgba(255,160,196,.20);
          border-radius: 13px;
          outline: none;
          color: #fff;
          background: rgba(5,11,23,.90);
          font-size: 14px;
        }

        .romantic-select option {
          color: #111;
          background: #fff;
        }

        .romantic-file-field {
          position: relative;
          min-height: 48px;
          margin-bottom: 9px;
          padding: 0 13px;
          display: flex;
          align-items: center;
          border: 1px dashed rgba(255,143,186,.38);
          border-radius: 13px;
          color: rgba(255,255,255,.86);
          background: rgba(79,20,48,.30);
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }

        .romantic-file-field input,
        .romantic-song-action input {
          position: absolute;
          width: 1px;
          height: 1px;
          opacity: 0;
          pointer-events: none;
        }

        .romantic-panel-primary {
          width: 100%;
          min-height: 47px;
          border: 0;
          border-radius: 13px;
          color: #fff;
          background: linear-gradient(135deg, #db2f68, #8d1745);
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
        }

        .romantic-panel-message {
          margin-top: 9px;
          color: rgba(255,222,234,.82);
          font-size: 11px;
          line-height: 1.45;
        }

        .romantic-ask-pin {
          display: block;
          margin-top: 10px;
          color: #90e3ff;
          font-size: 12px;
          font-weight: 800;
          text-align: center;
          text-decoration: none;
        }

        .romantic-song-list {
          display: grid;
          gap: 7px;
          margin-top: 10px;
        }

        .romantic-song-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto auto;
          gap: 6px;
          align-items: center;
          padding: 8px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 12px;
          background: rgba(255,255,255,.03);
        }

        .romantic-song-name {
          overflow: hidden;
          color: rgba(255,255,255,.82);
          font-size: 11px;
          font-weight: 700;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .romantic-song-action {
          position: relative;
          min-height: 30px;
          padding: 0 9px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(126,218,255,.24);
          border-radius: 9px;
          color: #bfeeff;
          background: rgba(61,143,181,.10);
          font-size: 10px;
          font-weight: 850;
          cursor: pointer;
        }

        button.romantic-song-action {
          font-family: inherit;
        }

        .romantic-song-action.danger {
          border-color: rgba(255,100,129,.25);
          color: #ffc2ce;
          background: rgba(178,36,67,.10);
        }

        .romantic-song-empty {
          padding: 9px;
          color: rgba(255,255,255,.46);
          font-size: 11px;
          text-align: center;
        }

        .romantic-book-notice {
          position: absolute;
          top: 10px;
          left: 50%;
          z-index: 10;
          max-width: calc(100% - 44px);
          transform: translateX(-50%);
          padding: 8px 13px;
          border: 1px solid rgba(255,180,211,.42);
          border-radius: 999px;
          color: #fff;
          background: rgba(71,14,42,.90);
          box-shadow: 0 8px 22px rgba(0,0,0,.34), 0 0 18px rgba(255,75,147,.16);
          backdrop-filter: blur(8px);
          font-size: 11px;
          font-weight: 850;
          text-align: center;
          pointer-events: none;
          animation: romanticNoticeIn .26s ease both;
        }

        .romantic-book-stage {
          position: relative;
          width: 100%;
          padding: 18px 15px 24px 24px;
          box-sizing: border-box;
          border-radius: 26px;
          background:
            radial-gradient(ellipse at 42% 44%, rgba(91,26,60,.78), rgba(22,7,18,.98) 72%);
          box-shadow:
            inset 0 0 0 1px rgba(255,255,255,.04),
            0 28px 70px rgba(0,0,0,.50);
        }

        .romantic-book {
          position: relative;
          width: 100%;
          aspect-ratio: 3 / 4;
          min-height: 390px;
          perspective: 1700px;
          perspective-origin: 35% 44%;
        }

        .romantic-page-block {
          position: absolute;
          inset: 6px -8px -9px 7px;
          border-radius: 5px 13px 13px 5px;
          background:
            repeating-linear-gradient(
              0deg,
              #f1e7d3 0 2px,
              #b9ac92 2px 3px,
              #f8efdd 3px 5px
            );
          box-shadow:
            7px 10px 18px rgba(0,0,0,.58),
            inset -4px 0 5px rgba(84,66,46,.16);
          transform: translateZ(-2px);
        }

        .romantic-book-inside,
        .romantic-turn-front,
        .romantic-turn-back {
          overflow: hidden;
          border: 2px solid #b9a078;
          border-radius: 5px 12px 12px 5px;
          background: #12070e;
        }

        .romantic-book-inside {
          position: absolute;
          inset: 0;
          box-shadow: inset 10px 0 22px rgba(0,0,0,.42);
        }

        .romantic-turn-page {
          position: absolute;
          inset: 0;
          z-index: 2;
          transform-origin: 0 50%;
          transform: rotateY(0deg);
          transform-style: preserve-3d;
          filter: drop-shadow(0 5px 5px rgba(0,0,0,.10));
          pointer-events: none;
          will-change: transform, filter;
        }

        .romantic-turn-page.is-turning {
          animation: romanticPageTurn ${PAGE_TURN_MS}ms cubic-bezier(.45,.05,.15,1) forwards;
        }

        @keyframes romanticPageTurn {
          0% {
            transform: rotateY(0deg);
            filter: drop-shadow(0 5px 5px rgba(0,0,0,.10));
          }
          35% {
            filter: drop-shadow(16px 11px 20px rgba(0,0,0,.36));
          }
          50% {
            transform: rotateY(-92deg);
            filter: drop-shadow(28px 15px 30px rgba(0,0,0,.54));
          }
          65% {
            filter: drop-shadow(14px 9px 18px rgba(0,0,0,.34));
          }
          100% {
            transform: rotateY(-178deg);
            filter: drop-shadow(1px 2px 4px rgba(0,0,0,.12));
          }
        }

        .romantic-turn-front,
        .romantic-turn-back {
          position: absolute;
          inset: 0;
          backface-visibility: hidden;
        }

        .romantic-turn-front {
          position: absolute;
        }

        .romantic-turn-front::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 3;
          background: linear-gradient(
            100deg,
            rgba(255,255,255,0) 32%,
            rgba(255,255,255,.20) 49%,
            rgba(255,255,255,0) 64%
          );
          opacity: 0;
          pointer-events: none;
        }

        .romantic-turn-page.is-turning .romantic-turn-front::before {
          animation: romanticPageSheen ${PAGE_TURN_MS}ms cubic-bezier(.45,.05,.15,1) forwards;
        }

        @keyframes romanticPageSheen {
          0%, 100% { opacity: 0; }
          42%, 58% { opacity: 1; }
        }

        .romantic-turn-back {
          transform: rotateY(180deg) translateZ(1px);
          background:
            repeating-linear-gradient(
              0deg,
              #eee1c7 0 2px,
              #cbbb9e 2px 3px,
              #f6ecd7 3px 5px
            );
          box-shadow: inset -12px 0 20px rgba(87,62,38,.18);
        }

        .romantic-couple-image {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .romantic-image-shade {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(
              180deg,
              rgba(7,3,7,.03) 0%,
              rgba(7,3,7,.07) 42%,
              rgba(7,3,7,.74) 100%
            );
          pointer-events: none;
        }

        .romantic-couple-overlay {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          padding: 20px 17px 22px;
          z-index: 2;
        }

        .romantic-couple-name {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          max-width: 94%;
          padding: 8px 12px;
          border-radius: 999px;
          color: #fff;
          background: rgba(10,4,13,.34);
          backdrop-filter: blur(5px);
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(19px, 5.4vw, 27px);
          font-style: italic;
          line-height: 1.1;
          text-shadow:
            0 0 5px rgba(255,255,255,.95),
            0 0 13px rgba(255,100,177,.95),
            0 0 28px rgba(255,39,138,.75);
          box-shadow: 0 0 15px rgba(255,72,150,.16);
          animation:
            romanticNameFloat 4.8s ease-in-out infinite,
            romanticNeonPulse 2.6s ease-in-out infinite;
        }

        .romantic-couple-flag {
          flex: 0 0 auto;
          font-style: normal;
          filter: drop-shadow(0 0 7px rgba(255,255,255,.25));
        }

        .romantic-empty-page {
          height: 100%;
          display: grid;
          place-items: center;
          color: rgba(255,255,255,.48);
          font-family: Georgia, "Times New Roman", serif;
          font-size: 18px;
        }

        .romantic-book-cover {
          position: absolute;
          inset: 0;
          z-index: 4;
          transform-origin: 0 50%;
          transform: rotateY(0deg);
          transform-style: preserve-3d;
          transition: transform ${OPEN_MS}ms cubic-bezier(.45,0,.2,1);
          pointer-events: none;
        }

        .romantic-book-cover.is-open {
          transform: rotateY(-172deg);
        }

        .romantic-cover-front,
        .romantic-cover-back {
          position: absolute;
          inset: 0;
          overflow: hidden;
          border-radius: 5px 13px 13px 5px;
          backface-visibility: hidden;
        }

        .romantic-cover-front {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 28px;
          box-sizing: border-box;
          color: #fff5f8;
          border: 1px solid #74475a;
          background:
            radial-gradient(circle at 72% 18%, rgba(255,187,210,.18), transparent 22%),
            radial-gradient(circle at 25% 78%, rgba(112,47,92,.27), transparent 32%),
            repeating-linear-gradient(24deg, rgba(255,255,255,.025) 0 1px, transparent 1px 4px),
            linear-gradient(145deg, #5b1734 0%, #310c20 46%, #190711 100%);
          box-shadow:
            inset 14px 0 16px rgba(0,0,0,.42),
            inset -2px 0 0 rgba(255,226,236,.12),
            7px 5px 16px rgba(0,0,0,.48);
          transform: translateZ(1px);
        }

        .romantic-cover-frame {
          position: absolute;
          inset: 17px 16px 17px 22px;
          border: 1px solid rgba(255,210,226,.30);
          border-radius: 4px 10px 10px 4px;
          box-shadow: inset 0 0 30px rgba(255,160,200,.03);
        }

        .romantic-cover-heart {
          position: relative;
          z-index: 1;
          margin-bottom: 13px;
          color: #ffb1d0;
          font-size: 30px;
          text-shadow:
            0 0 10px rgba(255,119,174,.72),
            0 0 24px rgba(255,53,140,.42);
        }

        .romantic-cover-title {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(36px, 9.5vw, 58px);
          font-weight: 500;
          line-height: .94;
          letter-spacing: -.035em;
          text-align: center;
          text-shadow: 0 3px 16px rgba(0,0,0,.45);
        }

        .romantic-cover-back {
          display: grid;
          place-items: center;
          padding: 28px;
          box-sizing: border-box;
          transform: rotateY(180deg) translateZ(1px);
          border: 1px solid #c6b38e;
          background:
            repeating-linear-gradient(
              45deg,
              #d6c8a9 0 2px,
              #eadfc4 2px 6px
            );
          color: #65573c;
          box-shadow: inset -12px 0 25px rgba(69,47,29,.16);
          font-family: Georgia, "Times New Roman", serif;
          font-style: italic;
          text-align: center;
        }

        .romantic-cover-back-text {
          font-size: 17px;
          line-height: 1.5;
        }

        .romantic-sound-button {
          display: block;
          width: 100%;
          min-height: 52px;
          margin-top: 15px;
          border: 1px solid rgba(255,177,211,.38);
          border-radius: 16px;
          color: #fff;
          background: linear-gradient(135deg, rgba(132,29,73,.96), rgba(72,14,39,.96));
          box-shadow: 0 12px 28px rgba(0,0,0,.24);
          font: inherit;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
        }

        .romantic-browse-link {
          display: block;
          width: 100%;
          margin-top: 14px;
          padding: 0;
          border: 0;
          background: none;
          color: #90e3ff;
          font: inherit;
          font-size: 13px;
          font-weight: 800;
          text-align: center;
          cursor: pointer;
        }

        @keyframes romanticNoticeIn {
          from { opacity: 0; transform: translate(-50%, -5px) scale(.98); }
          to { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }

        @keyframes romanticNameFloat {
          0%,100% { transform: translate3d(0,0,0); }
          50% { transform: translate3d(7px,-4px,0); }
        }

        @keyframes romanticNeonPulse {
          0%,100% { filter: brightness(1); }
          50% { filter: brightness(1.18); }
        }

        @media (max-width: 390px) {
          .romantic-stories-root {
            padding-left: 12px;
            padding-right: 12px;
          }

          .romantic-book-stage {
            padding: 14px 12px 20px 19px;
          }

          .romantic-book {
            min-height: 365px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .romantic-book-cover {
            transition-duration: 1ms !important;
          }

          .romantic-turn-page.is-turning,
          .romantic-turn-page.is-turning .romantic-turn-front::before {
            animation-duration: 1ms !important;
          }

          .romantic-couple-name {
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
}