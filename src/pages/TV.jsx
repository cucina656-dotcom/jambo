import { useEffect, useState, useRef } from "react";

import Header from "../components/Header";

import DedicationCard from "../components/DedicationCard";

const API_URL = "https://kitchenbrain.cucina656.workers.dev";

// ==========================================
// DEVICE / VIEWPORT COMPATIBILITY HELPERS
// (additive only — mirrors the same cross-device support added
// to DedicationCard.jsx so the TV feed page and its "Dedicate a
// song" form behave correctly on Tecno/Infinix/Itel/Samsung
// budget devices at 360x800, Samsung/Apple mid+flagship tiers at
// 390x844 / 412x915 / 412x892 / 430x932, and legacy engines like
// Opera Mini / Samsung Internet / older Safari & Chrome)
// ==========================================
const TV_STYLE_TAG_ID = "tv-page-responsive-styles";

function ensureViewportMeta() {
  if (typeof document === "undefined") return;
  // Many budget Android stock browsers (Tecno/Infinix/Itel) and
  // Opera Mini's extreme data-saving mode need an explicit viewport
  // tag or they render a desktop-width layout and shrink it down.
  const existing = document.querySelector('meta[name="viewport"]');
  if (existing) return;
  const meta = document.createElement("meta");
  meta.setAttribute("name", "viewport");
  meta.setAttribute("id", "tv-page-viewport-meta");
  meta.setAttribute(
    "content",
    "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
  );
  document.head.appendChild(meta);
}

function ensureTvResponsiveStylesheet() {
  if (typeof document === "undefined") return;
  if (document.getElementById(TV_STYLE_TAG_ID)) return;

  const style = document.createElement("style");
  style.id = TV_STYLE_TAG_ID;
  style.textContent = `
    /* --- Cross-device compatibility additions for the TV feed page
       (does not override existing inline styles/behaviour, only
       fills gaps for smaller/older/notched devices) --- */

    /* Prevent iOS Safari from auto-zooming the page when a form
       input/textarea is focused (inputs under 16px trigger this on
       iPhones like the 17/17 Pro Max, 16/16 Pro Max). */
    @media (max-width: 600px) {
      .tv-form-card input,
      .tv-form-card textarea {
        font-size: 16px !important;
      }
    }

    /* Extra-small budget viewports (360x800 — Tecno Spark/Camon,
       Infinix Note, Itel P-series, Samsung Galaxy A06/A16) get
       slightly tighter spacing so nothing clips or wraps oddly. */
    @media (max-width: 380px) {
      .tv-title {
        font-size: clamp(24px, 7.5vw, 30px) !important;
      }
      .tv-dedicate-btn {
        padding: 12px 22px !important;
        font-size: 14px !important;
      }
      .tv-form-card {
        padding: 16px !important;
      }
    }

    /* Respect the device notch / rounded corners / home-indicator
       area on iPhone 17/16 Pro Max (430x932) and similar Android
       edge-to-edge displays, without changing existing layout. */
    .tv-form-overlay {
      padding-top: calc(76px + env(safe-area-inset-top, 0px)) !important;
      padding-bottom: calc(18px + env(safe-area-inset-bottom, 0px)) !important;
      padding-left: calc(10px + env(safe-area-inset-left, 0px)) !important;
      padding-right: calc(10px + env(safe-area-inset-right, 0px)) !important;
    }

    /* Avoid the sticky 300ms tap-delay / grey tap flash seen on
       Samsung Internet and Chrome for budget Android devices. */
    .tv-page button {
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }

    /* Keep the page from ever forcing horizontal scroll on narrow
       (360px) viewports regardless of the edge-to-edge card layout. */
    .tv-page {
      max-width: 100vw;
    }
    .tv-page * {
      box-sizing: border-box;
    }
  `;
  document.head.appendChild(style);
}

function TV() {
  const [feed, setFeed] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [senderName, setSenderName] = useState("");
  const [senderWhatsapp, setSenderWhatsapp] = useState("");
  const [senderPhoto, setSenderPhoto] = useState("");
  const [senderPhotoFile, setSenderPhotoFile] = useState(null);
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhoto, setRecipientPhoto] = useState("");
  const [recipientPhotoFile, setRecipientPhotoFile] = useState(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [message, setMessage] = useState("");
  const [dedicationTitle, setDedicationTitle] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Refs for Intersection Observer
  const cardRefs = useRef({});
  const [activeIndex, setActiveIndex] = useState(null);

  // Ref to track which video is currently playing
  const currentlyPlayingRef = useRef(null);

  // Cross-device compatibility setup (additive): ensures a proper
  // viewport meta tag and injects the responsive/legacy-browser
  // stylesheet once per page, covering the same Sub-Saharan Africa /
  // Europe / North America / Asia device mix as DedicationCard,
  // without touching any of the existing logic or styles below.
  useEffect(() => {
    ensureViewportMeta();
    ensureTvResponsiveStylesheet();
  }, []);

  // Add preconnect for external media services
  useEffect(() => {
    const links = [
      { rel: 'preconnect', href: 'https://www.youtube.com' },
      { rel: 'preconnect', href: 'https://www.youtube-nocookie.com' },
      { rel: 'preconnect', href: 'https://player.vimeo.com' },
      { rel: 'preconnect', href: 'https://www.dailymotion.com' },
      { rel: 'preconnect', href: 'https://kitchenbrain.cucina656.workers.dev' },
    ];

    links.forEach(({ rel, href }) => {
      const link = document.createElement('link');
      link.rel = rel;
      link.href = href;
      document.head.appendChild(link);
    });

    return () => {
      links.forEach(({ rel, href }) => {
        const links = document.querySelectorAll(`link[rel="${rel}"][href="${href}"]`);
        links.forEach(link => link.remove());
      });
    };
  }, []);

  useEffect(() => {
    loadDedications();
  }, []);

  // Intersection Observer to track which card is most visible
  useEffect(() => {
    if (!feed.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visibleEntries.length > 0) {
          const mostVisibleIndex = Number(
            visibleEntries[0].target.dataset.index
          );
          setActiveIndex(mostVisibleIndex);
        } else {
          setActiveIndex(null);
        }
      },
      {
        threshold: 0.1,
      }
    );

    Object.values(cardRefs.current).forEach((element) => {
      if (element) observer.observe(element);
    });

    return () => {
      observer.disconnect();
      setActiveIndex(null);
    };
  }, [feed]);

  // Auto-play first card on initial load
  useEffect(() => {
    if (feed.length > 0 && activeIndex === null) {
      const timer = setTimeout(() => {
        setActiveIndex(0);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [feed]);

  // Auto-pause videos when scrolling away
  useEffect(() => {
    // Function to pause all videos except the active one
    const handleScroll = () => {
      const videoElements = document.querySelectorAll('video');
      const audioElements = document.querySelectorAll('audio');
      const iframeElements = document.querySelectorAll('iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="dailymotion"]');

      // Get the active card element
      const activeCard = document.querySelector(`.tv-card-wrapper[data-index="${activeIndex}"]`);

      // Pause all videos/audios that are not in the active card
      [...videoElements, ...audioElements].forEach(mediaElement => {
        const card = mediaElement.closest('.tv-card-wrapper');
        if (card && card.dataset.index !== String(activeIndex)) {
          if (!mediaElement.paused) {
            mediaElement.pause();
            // Reset the currently playing ref
            if (currentlyPlayingRef.current === mediaElement) {
              currentlyPlayingRef.current = null;
            }
          }
        }
      });

      // Handle iframes (YouTube, Vimeo, etc.)
      iframeElements.forEach(iframe => {
        const card = iframe.closest('.tv-card-wrapper');
        if (card && card.dataset.index !== String(activeIndex)) {
          // For iframes, we need to use postMessage to pause
          try {
            iframe.contentWindow?.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
            iframe.contentWindow?.postMessage('{"method":"pause"}', '*');
          } catch (e) {
            // Silent fail for cross-origin
          }
        }
      });
    };

    // Debounce the scroll handler for performance
    let timeoutId;
    const debouncedScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 100);
    };

    window.addEventListener('scroll', debouncedScroll, { passive: true });
    window.addEventListener('touchmove', debouncedScroll, { passive: true });

    // Also handle when activeIndex changes
    handleScroll();

    return () => {
      window.removeEventListener('scroll', debouncedScroll);
      window.removeEventListener('touchmove', debouncedScroll);
      clearTimeout(timeoutId);
    };
  }, [activeIndex]);

  // Function to register a playing media element
  const registerPlayingMedia = (mediaElement) => {
    // Pause any currently playing media
    if (currentlyPlayingRef.current && currentlyPlayingRef.current !== mediaElement) {
      if (!currentlyPlayingRef.current.paused) {
        currentlyPlayingRef.current.pause();
      }
    }
    currentlyPlayingRef.current = mediaElement;
  };

  async function loadDedications() {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/dedications`);
      const data = await res.json();
      if (data.success && Array.isArray(data.dedications)) {
        setFeed(data.dedications);
      } else if (Array.isArray(data)) {
        setFeed(data);
      }
    } catch (err) {
      console.log("Failed to load dedications", err);
    } finally {
      setIsLoading(false);
    }
  }

  function handlePhotoUpload(e, setter, fileSetter) {
    const file = e.target.files[0];
    if (!file) return;
    setter(URL.createObjectURL(file));
    fileSetter(file);
  }

  function handleMediaUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setMediaFile(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isSubmitting) return;

    if (!senderName || !senderWhatsapp || !recipientName || !message) {
      alert("Please fill all important fields.");
      return;
    }

    if (!mediaUrl.trim() && !mediaFile) {
      alert("Please add media (URL or file upload).");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("sender_name", senderName);
      formData.append("sender_whatsapp", senderWhatsapp);
      formData.append("recipient_name", recipientName);
      formData.append("message", message);
      formData.append("dedication_title", dedicationTitle || "");

      if (senderPhotoFile) {
        formData.append("sender_photo_file", senderPhotoFile);
      } else if (senderPhoto && /^https?:\/\//i.test(senderPhoto.trim())) {
        formData.append("sender_photo", senderPhoto.trim());
      } else {
        formData.append("sender_photo", "");
      }

      if (recipientPhotoFile) {
        formData.append("recipient_photo_file", recipientPhotoFile);
      } else if (recipientPhoto && /^https?:\/\//i.test(recipientPhoto.trim())) {
        formData.append("recipient_photo", recipientPhoto.trim());
      } else {
        formData.append("recipient_photo", "");
      }

      if (mediaFile) {
        formData.append("media_file", mediaFile);
      } else if (mediaUrl.trim()) {
        let sanitizedUrl = mediaUrl.trim();
        if (!/^https?:\/\//i.test(sanitizedUrl)) {
          sanitizedUrl = `https://${sanitizedUrl}`;
        }
        formData.append("media_url", sanitizedUrl);
      }

      const res = await fetch(`${API_URL}/api/dedications`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.message || "Failed to save dedication");
        setIsSubmitting(false);
        return;
      }

      if (data.dedication) {
        setFeed((prev) => [data.dedication, ...prev]);
      }

      setSenderName("");
      setSenderWhatsapp("");
      setSenderPhoto("");
      setSenderPhotoFile(null);
      setRecipientName("");
      setRecipientPhoto("");
      setRecipientPhotoFile(null);
      setMediaUrl("");
      setMediaFile(null);
      setMessage("");
      setDedicationTitle("");
      setShowForm(false);
    } catch (err) {
      console.error("Submission error:", err);
      alert("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={page} className="tv-page">
      <Header />
      <style>{`
        .tv-card-wrapper button[aria-label],
        .tv-card-wrapper button[title] {
          background: transparent !important;
          border-color: transparent !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .tv-card-wrapper img {
          will-change: transform, opacity;
          content-visibility: auto;
        }
        .tv-card-wrapper iframe {
          loading: lazy;
        }
      `}</style>
      <main style={main}>
        <section style={topSection}>
          <h1 style={title} className="tv-title">TV</h1>
          <p style={text}>Songs dedicated to different people ⭐</p>
          <button onClick={() => setShowForm(true)} style={dedicateBtn} className="tv-dedicate-btn">
            🎵 Dedicate a song
          </button>
        </section>

        {showForm && (
          <section style={formOverlay} className="tv-form-overlay">
            <form onSubmit={handleSubmit} style={formCard} className="tv-form-card">
              <h2 style={formTitle}>Create Dedication</h2>
              <input style={inputStyle} placeholder="Your name" value={senderName} onChange={(e) => setSenderName(e.target.value)} />
              <input style={inputStyle} placeholder="WhatsApp e.g +250788123456" value={senderWhatsapp} onChange={(e) => setSenderWhatsapp(e.target.value)} />
              <label style={labelStyle}>Your photo</label>
              <input style={fileStyle} type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, setSenderPhoto, setSenderPhotoFile)} />
              <input style={inputStyle} placeholder="Recipient name" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
              <label style={labelStyle}>Their photo</label>
              <input style={fileStyle} type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, setRecipientPhoto, setRecipientPhotoFile)} />
              <input
                style={inputStyle}
                placeholder="Media link (e.g. youtube.com/...)"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                disabled={!!mediaFile}
              />
              <label style={labelStyle}>Or upload song media</label>
              <input
                style={fileStyle}
                type="file"
                accept="video/*,audio/*,image/*"
                onChange={handleMediaUpload}
                disabled={!!mediaUrl.trim()}
              />
              {mediaFile && (
                <p style={{ fontSize: '12px', color: '#00e676', margin: '-4px 0 10px' }}>
                  ✓ Ready to upload: {mediaFile.name}
                </p>
              )}
              <textarea style={textareaStyle} placeholder="Short dedication letter" value={message} onChange={(e) => setMessage(e.target.value)} />
              <div style={buttonRow}>
                <button type="submit" style={submitBtn} className="tv-submit-btn" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} style={cancelBtn} className="tv-cancel-btn">
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        <section style={feedSection}>
          {isLoading && (
            <div style={emptyCard}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid rgba(255,255,255,0.1)',
                borderTop: '3px solid #00e676',
                borderRadius: '50%',
                margin: '0 auto 16px',
                animation: 'spin 1s linear infinite'
              }} />
              <p style={{ color: 'rgba(255,255,255,0.6)' }}>Loading dedications...</p>
            </div>
          )}

          {!isLoading && feed.length === 0 && (
            <div style={emptyCard}>
              <h2>No songs yet</h2>
              <p>Be first. Make someone smile.</p>
            </div>
          )}

          {feed.map((item, index) => (
            <div
              key={item.id}
              ref={(ref) => {
                if (ref) cardRefs.current[index] = ref;
              }}
              data-index={index}
              style={cardWrapper}
              className="tv-card-wrapper"
            >
              <DedicationCard
                id={item.id}
                senderPhoto={item.sender_photo}
                senderName={item.sender_name}
                senderWhatsapp={item.sender_whatsapp}
                recipientPhoto={item.recipient_photo}
                recipientName={item.recipient_name}
                dedicationTitle={item.dedication_title}
                message={item.message}
                mediaTitle={item.title}
                mediaUrl={item.media_url}
                views={item.views || 0}
                reactionCount={item.reaction_count || 0}
                commentCount={item.comment_count || 0}
                badgeStyle={item.dedication_badge || "❤️"}
                isActive={activeIndex === index}
                onDedicateClick={() => {
                  setShowForm(true);
                }}
                onMediaPlay={registerPlayingMedia}
              />
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

const page = { minHeight: "100svh", background: "#0a0a0a", color: "#ffffff", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', overflowX: "hidden" };
const main = { width: "100%", maxWidth: "520px", margin: "0 auto", padding: "72px 0 40px", boxSizing: "border-box" };
const topSection = { textAlign: "center", marginBottom: "10px", padding: "0 16px" };
const title = { fontSize: "clamp(28px, 8vw, 36px)", fontWeight: "900", margin: "0 0 6px", background: "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", letterSpacing: "-0.5px" };
const text = { color: "rgba(255,255,255,0.6)", lineHeight: "1.45", margin: "0 0 14px", fontSize: "14px", fontWeight: "400" };
const dedicateBtn = { border: "none", borderRadius: "999px", padding: "14px 28px", background: "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)", color: "white", fontWeight: "700", fontSize: "15px", cursor: "pointer", boxShadow: "0 8px 28px rgba(220, 39, 67, 0.35)", transition: "transform 0.2s ease", letterSpacing: "0.3px" };
const feedSection = { display: "flex", flexDirection: "column", gap: "18px", padding: "0" };
const cardWrapper = { width: "calc(100% + 8px)", marginLeft: "-4px", transform: "translateY(-2px)", transition: "all 0.2s ease" };
const formOverlay = { position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "76px 10px 18px", boxSizing: "border-box", overflowY: "auto" };
const formCard = { width: "100%", maxWidth: "430px", padding: "20px", borderRadius: "20px", background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 20px 60px rgba(0,0,0,0.8)", boxSizing: "border-box" };
const formTitle = { margin: "0 0 16px", fontSize: "22px", fontWeight: "700", color: "#ffffff", textAlign: "center" };
const inputStyle = { width: "100%", boxSizing: "border-box", marginBottom: "10px", padding: "14px 16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.05)", color: "white", outline: "none", fontSize: "15px", transition: "border-color 0.2s ease" };
const textareaStyle = { ...inputStyle, minHeight: "92px", resize: "vertical", fontFamily: 'inherit' };
const labelStyle = { display: "block", fontSize: "13px", fontWeight: "600", color: "rgba(255,255,255,0.7)", margin: "4px 0 6px" };
const fileStyle = { width: "100%", marginBottom: "12px", color: "rgba(255,255,255,0.5)", fontSize: "14px", padding: "8px 0" };
const buttonRow = { display: "flex", gap: "10px", marginTop: "14px" };
const submitBtn = { flex: 1, border: "none", borderRadius: "999px", padding: "14px", background: "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)", color: "white", fontWeight: "700", cursor: "pointer", fontSize: "15px", transition: "opacity 0.2s ease" };
const cancelBtn = { flex: 1, border: "1px solid rgba(255,255,255,0.12)", borderRadius: "999px", padding: "14px", background: "transparent", color: "rgba(255,255,255,0.7)", fontWeight: "600", cursor: "pointer", fontSize: "15px", transition: "all 0.2s ease" };
const emptyCard = { padding: "40px 24px", borderRadius: "20px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" };

export default TV;
