import { useState } from "react";

// Tapping "Meet Someone" now plays the Match Game right here, inside this
// component â€” it no longer depends on a parent screen (e.g. Home.jsx)
// switching what it renders. `onSelect` is still called for every choice
// (including "meet-someone") so a parent that wants to know what was picked
// still can, but nothing outside this file needs to change for the game to
// show up.
//
// This whole area (the landing cards and the game) also now forces a dark
// theme â€” see <SocialLifeShellStyles /> below for why.
export default function SocialLifeLanding({ onSelect }) {
  const [screen, setScreen] = useState("landing"); // "landing" | "meet-someone"

  const choices = [
    {
      key: "meet-someone",
      emoji: "â¤ï¸",
      title: "Meet Someone",
      text: "Meet someone and find a meaningful connection.",
    },
    {
      key: "make-money-together",
      emoji: "ðŸ’°",
      title: "Make Money Together",
      text: "Build a small money mission with other people.",
    },
    {
      key: "romantic-couples",
      emoji: "ðŸ’ž",
      title: "Browse Romantic Couples",
      text: "Discover romantic couple books and their stories.",
    },
  ];

  function handleChoice(key) {
    if (key === "meet-someone") setScreen("meet-someone");
    onSelect?.(key);
  }

  if (screen === "meet-someone") {
    return (
      <div className="social-life-shell" style={{ colorScheme: "dark" }}>
        <MeetSomeoneGame onBack={() => setScreen("landing")} />
        <SocialLifeShellStyles />
      </div>
    );
  }

  return (
    <div className="social-life-shell" style={{ colorScheme: "dark" }}>
      <section className="social-life-landing" aria-labelledby="social-life-title">
        <div className="social-life-intro">
          <small>SOCIAL LIFE</small>
          <h1 id="social-life-title">People, relationships and life together.</h1>
        </div>

        <div className="social-life-options">
          {choices.map((choice) => (
            <button
              key={choice.key}
              type="button"
              className="social-life-choice"
              onClick={() => handleChoice(choice.key)}
            >
              <span className="social-life-choice-icon" aria-hidden="true">
                {choice.emoji}
              </span>

              <span className="social-life-choice-copy">
                <strong>{choice.title}</strong>
                <small>{choice.text}</small>
              </span>

              <span className="social-life-choice-arrow" aria-hidden="true">
                â€º
              </span>
            </button>
          ))}
        </div>
      </section>

      <SocialLifeShellStyles />
    </div>
  );
}

function SocialLifeShellStyles() {
  return (
    <style>{`
      /*
       * This app's headings/background follow the device's light/dark
       * setting (prefers-color-scheme) everywhere else, which meant a
       * viewer whose phone or browser is set to light mode saw this
       * section's light-colored text sitting on a light background â€”
       * unreadable. .social-life-shell pins an explicit dark background
       * and dark native controls here regardless of that setting, the same
       * way the Connect screen already does.
       */
      .social-life-shell {
        width: 100%;
        min-height: 100svh;
        background: radial-gradient(circle at 50% -12%, rgba(255,86,140,.16), transparent 34%), #020711;
      }

      .social-life-landing {
        width: min(100%, 620px);
        min-height: 100svh;
        margin: 0 auto;
        padding: calc(150px + env(safe-area-inset-top)) 16px
          calc(42px + env(safe-area-inset-bottom));
        color: #f7fbff;
      }

      .social-life-intro {
        margin-bottom: 24px;
      }

      .social-life-intro > small {
        display: block;
        margin-bottom: 8px;
        color: #87dcff;
        font-size: 11px;
        font-weight: 850;
        letter-spacing: 0.14em;
      }

      .social-life-intro h1 {
        margin: 0;
        max-width: 520px;
        color: #ffffff;
        font-size: clamp(28px, 7vw, 42px);
        line-height: 1.08;
        letter-spacing: -0.035em;
      }

      .social-life-options {
        display: grid;
        gap: 13px;
      }

      .social-life-choice {
        width: 100%;
        min-height: 118px;
        display: grid;
        grid-template-columns: 52px minmax(0, 1fr) 24px;
        align-items: center;
        gap: 13px;
        padding: 17px 15px;
        border: 1px solid rgba(128, 210, 255, 0.2);
        border-radius: 22px;
        background:
          linear-gradient(150deg, rgba(15, 35, 54, 0.94), rgba(4, 12, 24, 0.97));
        box-shadow:
          0 16px 34px rgba(0, 0, 0, 0.26),
          inset 0 1px 0 rgba(255, 255, 255, 0.04);
        color: inherit;
        text-align: left;
        font: inherit;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }

      .social-life-choice:active {
        transform: scale(0.99);
      }

      .social-life-choice:focus-visible {
        outline: 3px solid #7bdcff;
        outline-offset: 3px;
      }

      .social-life-choice-icon {
        width: 50px;
        height: 50px;
        display: grid;
        place-items: center;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.055);
        font-size: 27px;
      }

      .social-life-choice-copy {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 7px;
      }

      .social-life-choice-copy strong {
        color: #ffffff;
        font-size: 17px;
        line-height: 1.2;
      }

      .social-life-choice-copy small {
        color: rgba(222, 238, 248, 0.67);
        font-size: 12.5px;
        line-height: 1.45;
      }

      .social-life-choice-arrow {
        justify-self: end;
        color: #8bdcff;
        font-size: 30px;
        line-height: 1;
      }

      @media (max-width: 390px) {
        .social-life-landing {
          padding-left: 12px;
          padding-right: 12px;
        }

        .social-life-choice {
          min-height: 108px;
          grid-template-columns: 46px minmax(0, 1fr) 20px;
          gap: 11px;
          padding: 15px 13px;
        }

        .social-life-choice-icon {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          font-size: 24px;
        }
      }
    `}</style>
  );
}
