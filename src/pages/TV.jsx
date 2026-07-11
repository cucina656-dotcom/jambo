import { useEffect, useState } from "react";
import Header from "../components/Header";
import DedicationCard from "../components/DedicationCard";

const API_URL = "https://kitchenbrain.cucina656.workers.dev";

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
  const [badgeStyle, setBadgeStyle] = useState("❤️");

  useEffect(() => {
    loadDedications();
  }, []);

  async function loadDedications() {
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
    setMediaUrl(URL.createObjectURL(file));
    setMediaFile(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isSubmitting) return;
    if (!senderName || !senderWhatsapp || !recipientName || !message) {
      alert("Please fill all important fields.");
      return;
    }
    if (!mediaUrl && !mediaFile) {
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
      formData.append("dedication_badge", badgeStyle);
      if (senderPhotoFile) {
        formData.append("sender_photo_file", senderPhotoFile);
      } else if (senderPhoto && senderPhoto.startsWith("http")) {
        formData.append("sender_photo", senderPhoto);
      } else {
        formData.append("sender_photo", "");
      }
      if (recipientPhotoFile) {
        formData.append("recipient_photo_file", recipientPhotoFile);
      } else if (recipientPhoto && recipientPhoto.startsWith("http")) {
        formData.append("recipient_photo", recipientPhoto);
      } else {
        formData.append("recipient_photo", "");
      }
      if (mediaFile) {
        formData.append("media_file", mediaFile);
      } else if (mediaUrl && mediaUrl.startsWith("http")) {
        formData.append("media_url", mediaUrl);
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
      setBadgeStyle("❤️");
      setShowForm(false);
    } catch (err) {
      console.error("Submission error:", err);
      alert("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={page}>
      {/* Dynamic Keyframes Injection */}
      <style>{`
        @keyframes auroraGlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes neonPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 15px #ff007f, 0 0 30px #00f0ff; }
          50% { transform: scale(1.03); box-shadow: 0 0 25px #ff007f, 0 0 50px #00f0ff; }
        }
      `}</style>

      <Header />
      <main style={main}>
        <section style={topSection}>
          <h1 style={title}>REBA TV</h1>
          <p style={text}>Live Cosmological Song Dedicated Portal ⭐</p>
        </section>

        {/* Floating Futuristic Action Trigger */}
        <button onClick={() => setShowForm(true)} style={floatingDedicateBtn}>
          <span style={btnNeonWrapper}>🎵 Tura indirimbo</span>
        </button>

        {showForm && (
          <section style={formOverlay}>
            <form onSubmit={handleSubmit} style={formCard}>
              <h2 style={formTitle}>✨ Drop a Cosmic Track</h2>
              
              <input style={inputStyle} placeholder="Your name" value={senderName} onChange={(e) => setSenderName(e.target.value)} />
              <input style={inputStyle} placeholder="WhatsApp e.g +250788123456" value={senderWhatsapp} onChange={(e) => setSenderWhatsapp(e.target.value)} />
              
              <div style={uploadRow}>
                <label style={labelStyle}>💥 Ifoto yawe
                  <input style={fileStyle} type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, setSenderPhoto, setSenderPhotoFile)} />
                </label>
              </div>

              <input style={inputStyle} placeholder="Recipient name" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
              
              <div style={uploadRow}>
                <label style={labelStyle}>💝 Ifoto y'uwo uyitura
                  <input style={fileStyle} type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, setRecipientPhoto, setRecipientPhotoFile)} />
                </label>
              </div>

              <input style={inputStyle} placeholder="Dedication title e.g Happy Birthday" value={dedicationTitle} onChange={(e) => setDedicationTitle(e.target.value)} />
              
              <div style={badgeContainer}>
                <label style={labelStyle}>Interface Badge Style</label>
                <div style={badgeOptions}>
                  <button
                    type="button"
                    onClick={() => setBadgeStyle("❤️")}
                    style={{
                      ...badgeButton,
                      background: badgeStyle === "❤️" ? "rgba(255, 0, 127, 0.3)" : "rgba(255,255,255,0.03)",
                      border: badgeStyle === "❤️" ? "2px solid #ff007f" : "1px solid rgba(255,255,255,0.1)",
                      color: badgeStyle === "❤️" ? "#ff007f" : "white",
                      textShadow: badgeStyle === "❤️" ? "0 0 8px #ff007f" : "none"
                    }}
                  >
                    ❤️ Heart
                  </button>
                  <button
                    type="button"
                    onClick={() => setBadgeStyle("👉")}
                    style={{
                      ...badgeButton,
                      background: badgeStyle === "👉" ? "rgba(0, 240, 255, 0.3)" : "rgba(255,255,255,0.03)",
                      border: badgeStyle === "👉" ? "2px solid #00f0ff" : "1px solid rgba(255,255,255,0.1)",
                      color: badgeStyle === "👉" ? "#00f0ff" : "white",
                      textShadow: badgeStyle === "👉" ? "0 0 8px #00f0ff" : "none"
                    }}
                  >
                    👉 Pointer
                  </button>
                </div>
              </div>

              <input style={inputStyle} placeholder="Youtube Link (optional)" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} />
              
              <div style={uploadRow}>
                <label style={labelStyle}>🎬 Injiza video y'indirimbo
                  <input style={fileStyle} type="file" accept="video/*,audio/*,image/*" onChange={handleMediaUpload} />
                </label>
              </div>

              <textarea style={textareaStyle} placeholder="Write a gorgeous, heartfelt note..." value={message} onChange={(e) => setMessage(e.target.value)} />
              
              <div style={buttonRow}>
                <button type="submit" style={submitBtn} disabled={isSubmitting}>
                  {isSubmitting ? "TRANSMITTING..." : "LAUNCH DEDICATION"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} style={cancelBtn}>
                  ABORT
                </button>
              </div>
            </form>
          </section>
        )}

        <section style={feedSection}>
          {feed.length === 0 && (
            <div style={emptyCard}>
              <h2 style={{ color: "#00f0ff", textShadow: "0 0 10px #00f0ff" }}>Nta ndirimbo ihari</h2>
              <p style={{ color: "#8a99ad" }}>Be the cosmic pioneer. Tap the button below to surprise someone first.</p>
            </div>
          )}
          {feed.map((item) => (
            <DedicationCard
              key={item.id}
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
              onDedicateClick={() => {
                setShowForm(true);
              }}
            />
          ))}
        </section>
      </main>
    </div>
  );
}

/* 🎨 Futuristic High-Engagement Stylesheet Layout */
const page = {
  minHeight: "100svh",
  background: "radial-gradient(circle at 50% 0%, #110924 0%, #050508 60%, #000000 100%)",
  backgroundSize: "200% 200%",
  animation: "auroraGlow 15s ease infinite",
  color: "#f1f5f9",
  overflowX: "hidden",
  fontFamily: "'Inter', system-ui, sans-serif",
};

const main = {
  width: "100%",
  maxWidth: "480px",
  margin: "0 auto",
  padding: "100px 12px 120px",
  boxSizing: "border-box",
};

const topSection = {
  textAlign: "center",
  marginBottom: "30px",
};

const title = {
  fontSize: "clamp(32px, 9vw, 44px)",
  fontWeight: "950",
  letterSpacing: "3px",
  margin: "0 0 6px",
  background: "linear-gradient(90deg, #00f0ff, #ff007f, #ffbf00)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  textTransform: "uppercase",
};

const text = {
  color: "#94a3b8",
  fontSize: "14px",
  letterSpacing: "0.5px",
};

/* Floating Attention-Grabber Floating Action Button */
const floatingDedicateBtn = {
  position: "fixed",
  bottom: "30px",
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 1000,
  border: "none",
  borderRadius: "50px",
  padding: "3px",
  background: "linear-gradient(90deg, #ff007f, #00f0ff)",
  cursor: "pointer",
  animation: "neonPulse 3s infinite ease-in-out",
};

const btnNeonWrapper = {
  display: "block",
  background: "#0d0a1a",
  color: "#ffffff",
  padding: "14px 28px",
  borderRadius: "50px",
  fontWeight: "900",
  fontSize: "16px",
  letterSpacing: "0.5px",
  whiteSpace: "nowrap",
};

const feedSection = {
  display: "flex",
  flexDirection: "column",
  gap: "26px",
};

const formOverlay = {
  position: "fixed",
  inset: 0,
  zIndex: 2000,
  background: "rgba(3, 2, 8, 0.85)",
  backdropFilter: "blur(16px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px 14px",
  boxSizing: "border-box",
};

const formCard = {
  width: "100%",
  maxWidth: "410px",
  maxHeight: "85vh",
  overflowY: "auto",
  padding: "24px",
  borderRadius: "24px",
  background: "rgba(15, 11, 28, 0.75)",
  border: "1px solid rgba(0, 240, 255, 0.25)",
  boxShadow: "0 20px 50px rgba(0, 240, 255, 0.15), inset 0 0 15px rgba(255, 0, 127, 0.05)",
  boxSizing: "border-box",
};

const formTitle = {
  margin: "0 0 20px",
  fontSize: "22px",
  fontWeight: "800",
  textAlign: "center",
  background: "linear-gradient(90deg, #00f0ff, #ff007f)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  marginBottom: "14px",
  padding: "14px 16px",
  borderRadius: "14px",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  background: "rgba(5, 4, 10, 0.6)",
  color: "#ffffff",
  outline: "none",
  fontSize: "15px",
  transition: "border 0.2s ease",
};

const textareaStyle = {
  ...inputStyle,
  minHeight: "100px",
  resize: "none",
};

const uploadRow = {
  marginBottom: "14px",
};

const labelStyle = {
  display: "block",
  fontSize: "13px",
  fontWeight: "700",
  color: "#94a3b8",
  marginBottom: "6px",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const fileStyle = {
  display: "block",
  width: "100%",
  marginTop: "6px",
  color: "#00f0ff",
  fontSize: "13px",
};

const badgeContainer = {
  marginBottom: "16px",
};

const badgeOptions = {
  display: "flex",
  gap: "12px",
};

const badgeButton = {
  flex: 1,
  padding: "12px",
  borderRadius: "14px",
  fontWeight: "800",
  fontSize: "14px",
  cursor: "pointer",
  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
};

const buttonRow = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  marginTop: "16px",
};

const submitBtn = {
  width: "100%",
  border: "none",
  borderRadius: "14px",
  padding: "15px",
  background: "linear-gradient(90deg, #ff007f, #ffbf00)",
  color: "white",
  fontWeight: "900",
  fontSize: "15px",
  letterSpacing: "1px",
  cursor: "pointer",
  boxShadow: "0 4px 20px rgba(255, 0, 127, 0.4)",
};

const cancelBtn = {
  width: "100%",
  border: "1px solid rgba(255, 255, 255, 0.15)",
  borderRadius: "14px",
  padding: "14px",
  background: "transparent",
  color: "#94a3b8",
  fontWeight: "700",
  fontSize: "14px",
  cursor: "pointer",
};

const emptyCard = {
  padding: "40px 20px",
  borderRadius: "24px",
  background: "rgba(255, 255, 255, 0.02)",
  border: "1px dashed rgba(255,255,255,0.1)",
  textAlign: "center",
};

export default TV;
