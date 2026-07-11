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
                      background: badgeStyle === "❤️" ? "#262626" : "transparent",
                      borderColor: badgeStyle === "❤️" ? "#ffffff" : "#363636",
                      color: badgeStyle === "❤️" ? "#ffffff" : "#a8a8a8",
                    }}
                  >
                    ❤️ Heart
                  </button>
                  <button
                    type="button"
                    onClick={() => setBadgeStyle("👉")}
                    style={{
                      ...badgeButton,
                      background: badgeStyle === "👉" ? "#262626" : "transparent",
                      borderColor: badgeStyle === "👉" ? "#ffffff" : "#363636",
                      color: badgeStyle === "👉" ? "#ffffff" : "#a8a8a8",
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
                  {isSubmitting ? "Submitting..." : "Share"}
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
              <h2 style={emptyTitle}>Nta ndirombo</h2>
              <p style={emptyText}>Ba uwa 1 uture indirimbo Abawe.</p>
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

/* Polished Dark-Mode Instagram Aesthetic Styles */
const page = {
  minHeight: "100svh",
  background: "#000000",
  color: "#f5f5f5",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  overflowX: "hidden",
};

const main = {
  width: "100%",
  maxWidth: "470px", /* Standard Instagram feed layout width */
  margin: "0 auto",
  padding: "60px 0px 40px",
  boxSizing: "border-box",
};

const topSection = {
  textAlign: "center",
  marginBottom: "24px",
  padding: "0 16px",
};

const title = {
  fontSize: "24px",
  fontWeight: "700",
  letterSpacing: "-0.5px",
  margin: "0 0 4px",
};

const text = {
  color: "#a8a8a8",
  margin: "0 0 16px",
  fontSize: "14px",
};

const dedicateBtn = {
  border: "none",
  borderRadius: "8px",
  padding: "10px 20px",
  background: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
  color: "#ffffff",
  fontWeight: "600",
  fontSize: "14px",
  cursor: "pointer",
};

const feedSection = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const formOverlay = {
  position: "fixed",
  inset: 0,
  zIndex: 2000,
  background: "rgba(0, 0, 0, 0.85)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px 16px",
  boxSizing: "border-box",
  overflowY: "auto",
};

const formCard = {
  width: "100%",
  maxWidth: "400px",
  padding: "24px 16px",
  borderRadius: "12px",
  background: "#121212",
  border: "1px solid #262626",
  boxSizing: "border-box",
};

const formTitle = {
  margin: "0 0 20px",
  fontSize: "18px",
  fontWeight: "600",
  textAlign: "center",
  color: "#ffffff",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  marginBottom: "12px",
  padding: "10px 12px",
  borderRadius: "4px",
  border: "1px solid #363636",
  background: "#1c1c1e",
  color: "#ffffff",
  outline: "none",
  fontSize: "14px",
};

const textareaStyle = {
  ...inputStyle,
  minHeight: "80px",
  resize: "none",
};

const labelStyle = {
  display: "block",
  fontSize: "12px",
  fontWeight: "600",
  color: "#a8a8a8",
  margin: "0 0 6px 2px",
};

const fileStyle = {
  width: "100%",
  marginBottom: "16px",
  color: "#0095f6", /* Instagram standard link/action blue */
  fontSize: "13px",
  fontWeight: "600",
};

const badgeContainer = {
  marginBottom: "16px",
};

const badgeOptions = {
  display: "flex",
  gap: "8px",
};

const badgeButton = {
  flex: 1,
  padding: "8px",
  borderRadius: "4px",
  border: "1px solid",
  fontSize: "14px",
  fontWeight: "600",
  cursor: "pointer",
};

const buttonRow = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  marginTop: "16px",
};

const submitBtn = {
  width: "100%",
  border: "none",
  borderRadius: "8px",
  padding: "12px",
  background: "#0095f6",
  color: "#ffffff",
  fontWeight: "600",
  fontSize: "14px",
  cursor: "pointer",
};

const cancelBtn = {
  width: "100%",
  border: "none",
  background: "transparent",
  color: "#f5f5f5",
  padding: "8px",
  fontWeight: "600",
  fontSize: "14px",
  cursor: "pointer",
};

const emptyCard = {
  padding: "40px 16px",
  textAlign: "center",
  borderTop: "1px solid #262626",
};

const emptyTitle = {
  fontSize: "18px",
  fontWeight: "600",
  margin: "0 0 8px",
};

const emptyText = {
  color: "#a8a8a8",
  fontSize: "14px",
  margin: 0,
};

export default TV;
