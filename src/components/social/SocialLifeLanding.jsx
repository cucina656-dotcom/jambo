import { useEffect, useState } from "react";

// Meet Someone — adapted from the original Connect "LoveGame" flow, wired in under
// Social Life > Meet Someone. Modifications in this version:
//   1. The preference/gender buttons show no visible text label — icon only
//      (aria-label/title kept for screen readers and hover).
//   2. Gender is labeled "Mr" (was "Man") and "Miss" (was "Woman") throughout.
//   3. "Open to Neither" has been removed — there are only three preference
//      choices again: Mr, Miss, and Open to either.
//   4. A "Your gender" step captures the profile owner's own gender so the
//      backend can enforce "never match two profiles of the same gender" —
//      see the MATCHING NOTE further down. With "Open to Neither" gone, this
//      is now an unconditional rule with no opt-out.
//   5. The Back button is pinned in a fixed bar above the scrolling content,
//      consistent with the Connect screen's fixed CTA bar.
//   6. This screen now forces a dark background and dark native controls
//      (color-scheme: dark) instead of following the device's light/dark
//      setting. Every heading/label here already used a hardcoded light
//      color, but the page background behind them only turned dark under
//      prefers-color-scheme: dark — so a viewer whose device is in light
//      mode saw light text on a light background. Forcing dark here (same
//      approach the Connect screen already uses) fixes that for everyone.

const CONNECT_API_URL = "https://kitchenbrain.cucina656.workers.dev";
const LOVE_OWNER_KEY = "gwamo_connect_love_owner";
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

function rememberLoveOwner(profileId, ownerToken) {
  if (!profileId || !ownerToken) return;
  try {
    localStorage.setItem(LOVE_OWNER_KEY, JSON.stringify({ profile_id: profileId, owner_token: ownerToken }));
  } catch {}
}

// Own-gender choices. Kept separate from the "who would you like to meet" choices
// below because they answer a different question.
// The internal `key` stays "woman"/"man" — that's the value sent to the backend
// (see the MATCHING NOTE below and the Worker's LOVE_GENDERS set) — only the
// display label changed to "Miss"/"Mr".
const GENDER_CHOICES = [
  { key: "woman", icon: "♀", label: "Miss" },
  { key: "man", icon: "♂", label: "Mr" },
  { key: "prefer-not-to-say", icon: "❓", label: "Prefer not to say" },
];

// "Who would you like to meet" choices.
// "Open to Neither" has been removed — only three choices now.
// Icon-only, no visible text label — see <PreferenceChoice />.
const PREFERENCE_CHOICES = [
  { key: "woman", icon: "♀", label: "Miss" },
  { key: "man", icon: "♂", label: "Mr" },
  { key: "either", icon: "⚥", label: "Open to either" },
];

function PreferenceChoice({ icon, label, active, onClick }) {
  return (
    <button
      type="button"
      className={`meet-pref-choice${active ? " is-active" : ""}`}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}

// The Back control, fixed above the scrolling background instead of scrolling
// away with the page — same treatment as the Connect screen's CTA bar. The
// spacer right after it reserves the same height in normal flow so the
// heading below never sits underneath it.
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

export default function MeetSomeoneGame({ onBack }) {
  const [screen, setScreen] = useState("play"); // "play" | "browse"
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
          // report the same gender — unconditionally, with no opt-out, now that
          // "Open to Neither" has been removed. (The Worker patch sent earlier
          // has a now-unreachable "Open to Neither" bypass around this check;
          // it's harmless since preference can no longer be "neither", but it
          // can be deleted for cleanliness whenever it's convenient.)
          gender: ownGender,
          preference,
          heart,
          photo_url: photo.url,
          photo_key: photo.key,
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
        <div className="meet-kicker">❤️ GWAMO CONNECTIONS</div>
        <h1>Browse Meet Someone</h1>
        <p className="meet-lead">Public cards show the person, area, perfect free day and heart-match status.</p>

        {browseError && <div className="meet-error">{browseError}</div>}
        {browseBusy && <div className="meet-browse-empty">Loading connections...</div>}
        {!browseBusy && !browseError && !items.length && (
          <div className="meet-browse-empty">
            <strong>No connection cards yet.</strong>
            <span>Be the first person to join Meet Someone.</span>
          </div>
        )}

        <div className="meet-card-list">
          {items.map((profile) => {
            const freeDay2 =
              profile.public_data?.perfect_free_day ||
              profile.public_data?.answers?.perfect_free_day ||
              "Not added";
            const hasMatch = profile.match_status === "View heart match";
            return (
              <article className="meet-card" key={profile.id}>
                <img
                  className="meet-card-photo"
                  src={profile.creator_photo_url || "/favicon.ico"}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
                <div className="meet-card-overlay" />
                <div className="meet-card-info">
                  <h2>{profile.creator_name || "Gwamo member"}</h2>
                  <span>📍 {profile.location || "Location not added"}</span>
                  <span>{freeDay2}</span>
                  {hasMatch ? (
                    <span className="meet-match-status found">View heart match</span>
                  ) : (
                    <span className="meet-match-status">Waiting</span>
                  )}
                </div>
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
            Browse existing connections →
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
          <div className="meet-pref-row">
            {GENDER_CHOICES.map((choice) => (
              <PreferenceChoice
                key={choice.key}
                icon={choice.icon}
                label={choice.label}
                active={ownGender === choice.key}
                onClick={() => setOwnGender(choice.key)}
              />
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
          <div className="meet-pref-row">
            {PREFERENCE_CHOICES.map((choice) => (
              <PreferenceChoice
                key={choice.key}
                icon={choice.icon}
                label={choice.label}
                active={preference === choice.key}
                onClick={() => setPreference(choice.key)}
              />
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
      /* Icon-only preference / gender buttons — modification 1: no visible text label. */
      .meet-pref-row { display: flex; gap: 12px; margin: 6px 0 22px; }
      .meet-pref-choice { width: 62px; height: 62px; flex: 0 0 auto; display: grid; place-items: center; border: 1px solid rgba(255,255,255,.14); border-radius: 18px; background: rgba(255,255,255,.04); color: #fff; font-size: 27px; line-height: 1; cursor: pointer; }
      .meet-pref-choice.is-active { border-color: rgba(255,95,147,.75); background: rgba(232,54,112,.16); box-shadow: 0 0 0 1px rgba(255,95,147,.2), 0 0 22px rgba(232,54,112,.22); transform: translateY(-2px); }
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
      .meet-card-list { display: grid; gap: 16px; margin-top: 18px; }
      .meet-card { position: relative; aspect-ratio: 4/3; overflow: hidden; border: 1px solid rgba(255,109,153,.22); border-radius: 24px; box-shadow: 0 20px 46px rgba(0,0,0,.32); }
      .meet-card-photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
      .meet-card-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(4,3,9,.94) 0%, rgba(4,3,9,.5) 40%, rgba(4,3,9,0) 75%); }
      .meet-card-info { position: absolute; left: 0; right: 0; bottom: 0; padding: 16px; display: flex; flex-direction: column; gap: 4px; }
      .meet-card-info h2 { margin: 0 0 2px !important; color: #fff; font-size: 19px !important; }
      .meet-card-info span { color: #eaf7ff; font-size: 12.5px; }
      .meet-match-status { width: fit-content; margin-top: 4px; padding: 0 10px; min-height: 26px; display: inline-flex; align-items: center; border-radius: 999px; color: rgba(255,255,255,.92); background: rgba(255,255,255,.16); font-size: 10px; font-weight: 900; }
      .meet-match-status.found { color: #fff; background: linear-gradient(135deg,#ee3e79,#b9285c); }
      @media (max-width: 390px) {
        .meet-someone-panel { padding-left: 12px; padding-right: 12px; }
        .meet-fixed-bar { padding-left: 12px; padding-right: 12px; }
        .meet-pref-choice { width: 54px; height: 54px; font-size: 23px; }
      }
    `}</style>
  );
}