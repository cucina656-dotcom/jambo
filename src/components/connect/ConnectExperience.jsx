import { useState } from "react";
import WalkTogetherGame from "./WalkTogetherGame";
import MoneyTogetherGame from "./MoneyTogetherGame";

const HEARTS = ["💛", "🧡", "💚", "💙", "💜"];

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
      <h1>What do you want to do?</h1>
      <p className="connect-lead">
        Pick one. Gwamo changes the experience around what you choose.
      </p>

      <div className="connect-grid">
        <Choice emoji="💰" label="Make Money Together" onClick={() => setScreen("money")} />
        <Choice emoji="❤️" label="Meet Someone" onClick={() => setScreen("love")} />
        <Choice emoji="🚶" label="Walk Together" onClick={() => setScreen("walk")} />
      </div>

      <button type="button" className="connect-start" onClick={() => setScreen("start")}>
        ＋ Start Something
      </button>

      <p className="connect-bottom-line">Find people to do something meaningful with.</p>
    </section>
  );
}

function LoveGame({ onBack }) {
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

  return (
    <section className="connect-panel love-panel">
      <Back onClick={onBack} />

      {step === 0 && (
        <>
          <div className="connect-kicker love">❤️ MEET SOMEONE</div>
          <h1>Maybe somebody is looking for someone like you.</h1>
          <div className="love-story-box">
            <span className="love-float one">❤️</span>
            <span className="love-float two">✨</span>
            <strong>Love Stories</strong>
            <small>Real Gwamo couples can appear here after both people choose to share their story.</small>
          </div>
          <label className="adult-check">
            <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} />
            <span>I am 18 or older.</span>
          </label>
          <button className="connect-primary love-button" disabled={!adult} onClick={() => setStep(1)}>
            Play the Match Game
          </button>
          <p className="connect-fine">The heart choice is a fun part of the game. It does not scientifically guarantee compatibility.</p>
        </>
      )}

      {step === 1 && (
        <>
          <div className="connect-step">Step 1</div>
          <h2>📍 Where are you?</h2>
          <input className="connect-input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, district or area" />
          <button className="connect-primary love-button" disabled={!location.trim()} onClick={() => setStep(2)}>Next</button>
        </>
      )}

      {step === 2 && (
        <>
          <div className="connect-step">Step 2</div>
          <h2>❤️ Who would you like to meet?</h2>
          <div className="option-stack">
            {["A woman", "A man", "Open to either"].map((item) => (
              <button key={item} className={`line-option${preference === item ? " is-active" : ""}`} onClick={() => setPreference(item)}>{item}</button>
            ))}
          </div>
          <button className="connect-primary love-button" disabled={!preference} onClick={() => setStep(3)}>Next</button>
        </>
      )}

      {step === 3 && (
        <>
          <div className="connect-step">Step 3</div>
          <h2>Choose the heart that feels like you today.</h2>
          <p className="connect-lead">Do not overthink it. Pick the one you feel first.</p>
          <div className="heart-row">
            {HEARTS.map((item) => (
              <button key={item} className={`heart-button${heart === item ? " is-active" : ""}`} onClick={() => setHeart(item)}>{item}</button>
            ))}
          </div>
          <button className="connect-primary love-button" disabled={!heart} onClick={() => setStep(4)}>Continue</button>
        </>
      )}

      {step === 4 && (
        <>
          <div className="connect-step">Quick question 1 of 2</div>
          <h2>Your perfect free day?</h2>
          <div className="option-stack">
            {["🌳 Outside", "🎵 Music", "🍽️ Food together", "🎬 Relaxing", "🚶 Walking"].map((item) => (
              <button key={item} className={`line-option${freeDay === item ? " is-active" : ""}`} onClick={() => setFreeDay(item)}>{item}</button>
            ))}
          </div>
          <button className="connect-primary love-button" disabled={!freeDay} onClick={() => setStep(5)}>Next</button>
        </>
      )}

      {step === 5 && (
        <>
          <div className="connect-step">Quick question 2 of 2</div>
          <h2>What matters most to you?</h2>
          <div className="option-stack">
            {["❤️ Love", "🤝 Trust", "😂 Fun", "💬 Good conversation", "🏠 Building a future"].map((item) => (
              <button key={item} className={`line-option${matters === item ? " is-active" : ""}`} onClick={() => setMatters(item)}>{item}</button>
            ))}
          </div>
          <button className="connect-primary love-button" disabled={!matters} onClick={() => setStep(6)}>Next</button>
        </>
      )}

      {step === 6 && (
        <>
          <div className="connect-step">Your profile</div>
          <h2>Let your match know who you are.</h2>
          <p className="connect-lead">Add the same basic details your original matching game collects.</p>

          <input
            className="connect-input"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            placeholder="Your name"
            autoComplete="name"
          />

          <input
            className="connect-input"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="WhatsApp number"
            inputMode="tel"
            autoComplete="tel"
          />

          <label className="connect-photo-field">
            <span>{photoFile ? `📷 ${photoFile.name}` : "📷 Add your photo"}</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
            />
          </label>

          <button
            className="connect-primary love-button"
            disabled={!profileName.trim() || !whatsapp.trim() || !photoFile}
            onClick={() => setStep(7)}
          >
            Finish the Match Game
          </button>
        </>
      )}

      {step === 7 && (
        <div className="result-card love-result">
          <div className="result-symbol">{heart}</div>
          <div className="connect-kicker love">YOUR GAME IS READY</div>
          <h2>Gwamo can now look for people you may enjoy meeting.</h2>
          <p>Your heart choice and short answers give the game something interesting to compare.</p>
          <div className="summary-chips">
            <span>👤 {profileName}</span>
            <span>📍 {location}</span>
            <span>{heart} Heart</span>
            <span>❤️ {preference}</span>
          </div>
          <button
            className="connect-primary love-button"
            onClick={() => setStep(8)}
          >
            Find Possible Matches
          </button>
        </div>
      )}

      {step === 8 && (
        <div className="result-card love-result">
          <div className="result-symbol">❤️</div>
          <div className="connect-kicker love">POSSIBLE MATCHES</div>
          <h2>Your match results will appear here.</h2>
          <p>
            The game is ready. The next backend step will connect this screen to real
            Gwamo members who submitted compatible choices.
          </p>
          <button className="connect-secondary" onClick={() => setStep(7)}>
            Back
          </button>
        </div>
      )}
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
      {screen === "love" && <LoveGame onBack={home} />}
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
        .chip { min-height: 39px; padding: 0 13px; border: 1px solid rgba(155,196,235,.15); border-radius: 999px; color: rgba(244,249,255,.78); background: rgba(7,20,40,.70); font-size: 12px; font-weight: 750; }
        .chip.is-active { border-color: rgba(78,183,255,.70); color: #fff; background: rgba(13,62,106,.78); }
        .trigger-card, .result-card { margin-top: 18px; padding: 18px; border: 1px solid rgba(97,187,255,.18); border-radius: 20px; background: linear-gradient(145deg, rgba(10,36,67,.78), rgba(4,13,29,.90)); }
        .trigger-card { display: flex; flex-direction: column; gap: 7px; }
        .trigger-card small { color: #75c9ff; font-size: 10px; font-weight: 900; letter-spacing: .1em; }
        .result-symbol { margin-bottom: 10px; font-size: 52px; }
        .love-result { border-color: rgba(255,106,151,.22); background: radial-gradient(circle at top right, rgba(255,78,137,.18), transparent 34%), linear-gradient(145deg, rgba(43,13,31,.86), rgba(9,9,23,.94)); }
        .summary-chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0 4px; }
        .summary-chips span { padding: 7px 10px; border-radius: 999px; color: rgba(255,255,255,.76); background: rgba(255,255,255,.05); font-size: 11px; }
        @media (max-width: 390px) { .gwamo-connect-root { padding-left: 12px; padding-right: 12px; } .connect-choice { min-height: 104px; padding: 14px; } }
        @media (prefers-reduced-motion: reduce) { .love-float { animation: none; } }
      `}</style>
    </div>
  );
}

