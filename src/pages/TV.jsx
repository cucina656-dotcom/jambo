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
      <Header />
      <main style={main}>
        <section style={topSection}>
          <h1 style={title}>Reba TV</h1>
          <p style={text}>All Song Dedications ⭐.</p>
          <button onClick={() => setShowForm(true)} style={dedicateBtn}>
            🎵 Tura indirimbo Friend/Brothers
          </button>
        </section>

        {showForm && (
          <section style={formOverlay}>
            <form onSubmit={handleSubmit} style={formCard}>
              <h2 style={formTitle}>Create Dedication</h2>
              <input style={inputStyle} placeholder="Your name" value={senderName} onChange={(e) => setSenderName(e.target.value)} />
              <input style={inputStyle} placeholder="WhatsApp e.g +250788123456" value={senderWhatsapp} onChange={(e) => setSenderWhatsapp(e.target.value)} />
              <label style={labelStyle}>Ifoto yawe</label>
              <input style={fileStyle} type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, setSenderPhoto, setSenderPhotoFile)} />
              <input style={inputStyle} placeholder="Recipient name" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
              <label style={labelStyle}>Ifoto yuwo uyitura</label>
              <input style={fileStyle} type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, setRecipientPhoto, setRecipientPhotoFile)} />
              <input style={inputStyle} placeholder="Dedication title e.g Happy Birthday" value={dedicationTitle} onChange={(e) => setDedicationTitle(e.target.value)} />
              
              <div style={badgeContainer}>
                <label style={labelStyle}>Badge Style</label>
                <div style={badgeOptions}>
                  <button
                    type="button"
                    onClick={() => setBadgeStyle("❤️")}
                    style={{
                      ...badgeButton,
                      background: badgeStyle === "❤️" ? "rgba(255,71,120,0.3)" : "rgba(255,255,255,0.08)",
                      border: badgeStyle === "❤️" ? "2px solid #ff4778" : "1px solid rgba(255,255,255,0.12)",
                    }}
                  >
                    ❤️ Heart
                  </button>
                  <button
                    type="button"
                    onClick={() => setBadgeStyle("👉")}
                    style={{
                      ...badgeButton,
                      background: badgeStyle === "👉" ? "rgba(80, 71, 255, 0.3)" : "rgba(255,255,255,0.08)",
                      border: badgeStyle === "👉" ? "2px solid #ff4778" : "1px solid rgba(255,255,255,0.12)",
                    }}
                  >
                    👉 Pointer
                  </button>
                </div>
              </div>

              <input style={inputStyle} placeholder="shyiramo youtube chanel (optional if uploading)" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} />
              <label style={labelStyle}>Injiza video y'indirimbo</label>
              <input style={fileStyle} type="file" accept="video/*,audio/*,image/*" onChange={handleMediaUpload} />
              <textarea style={textareaStyle} placeholder="Short dedication letter" value={message} onChange={(e) => setMessage(e.target.value)} />
              <div style={buttonRow}>
                <button type="submit" style={submitBtn} disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} style={cancelBtn}>
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        <section style={feedSection}>
          {feed.length === 0 && (
            <div style={emptyCard}>
              <h2>Nta ndirombo</h2>
              <p>Ba uwa 1 uture indirimbo Abawe.</p>
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

const page = {
  minHeight: "100svh",
  background: "radial-gradient(circle at top, #0a090a 0%, #080808 42%, #0a0a0a 100%)",
  color: "white",
  overflowX: "hidden",
};

const main = {
  width: "100%",
  maxWidth: "520px",
  margin: "0 auto",
  padding: "90px 4px 40px",
  boxSizing: "border-box",
};

const topSection = {
  textAlign: "center",
  marginBottom: "18px",
};

const title = {
  fontSize: "clamp(26px, 8vw, 34px)",
  fontWeight: "900",
  margin: "0 0 8px",
};

const text = {
  color: "#cbd5e1",
  lineHeight: "1.45",
  margin: "0 0 14px",
  fontSize: "14px",
};

const dedicateBtn = {
  border: "none",
  borderRadius: "999px",
  padding: "12px 22px",
  background: "linear-gradient(135deg, #ec94c0, #5e25e4, #facc15)",
  color: "white",
  fontWeight: "900",
  fontSize: "15px",
  cursor: "pointer",
  boxShadow: "0 12px 28px rgba(236,72,153,0.35)",
};

const feedSection = {
  display: "flex",
  flexDirection: "column",
  gap: "22px",
};

const formOverlay = {
  position: "fixed",
  inset: 0,
  zIndex: 2000,
  background: "rgba(0,0,0,0.82)",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  padding: "76px 10px 18px",
  boxSizing: "border-box",
  overflowY: "auto",
};

const formCard = {
  width: "100%",
  maxWidth: "430px",
  padding: "16px",
  borderRadius: "22px",
  background: "#0f172a",
  border: "1px solid rgba(236,72,153,0.35)",
  boxShadow: "0 0 35px rgba(236,72,153,0.28)",
  boxSizing: "border-box",
};

const formTitle = {
  margin: "0 0 12px",
  fontSize: "22px",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  marginBottom: "10px",
  padding: "13px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.08)",
  color: "white",
  outline: "none",
  fontSize: "16px",
};

const textareaStyle = {
  ...inputStyle,
  minHeight: "92px",
  resize: "vertical",
};

const labelStyle = {
  display: "block",
  fontSize: "13px",
  fontWeight: "800",
  color: "#f9a8d4",
  margin: "4px 0 6px",
};

const fileStyle = {
  width: "100%",
  marginBottom: "12px",
  color: "#cbd5e1",
  fontSize: "14px",
};

const badgeContainer = {
  marginBottom: "10px",
};

const badgeOptions = {
  display: "flex",
  gap: "10px",
};

const badgeButton = {
  flex: 1,
  padding: "10px 14px",
  borderRadius: "14px",
  color: "white",
  fontWeight: "700",
  fontSize: "15px",
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const buttonRow = {
  display: "flex",
  gap: "10px",
  marginTop: "10px",
};

const submitBtn = {
  flex: 1,
  border: "none",
  borderRadius: "999px",
  padding: "13px",
  background: "#f8bee0",
  color: "white",
  fontWeight: "900",
  cursor: "pointer",
};

const cancelBtn = {
  flex: 1,
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: "999px",
  padding: "13px",
  background: "transparent",
  color: "white",
  fontWeight: "900",
  cursor: "pointer",
};

const emptyCard = {
  padding: "24px",
  borderRadius: "22px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  textAlign: "center",
};

export default TV;

