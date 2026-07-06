import { useEffect, useState } from "react";

const API_URL = "https://kitchenbrain.cucina656.workers.dev";

function getFlag(number = "") {
  if (number.startsWith("+250")) return "🇷🇼";
  if (number.startsWith("+254")) return "🇰🇪";
  if (number.startsWith("+256")) return "🇺🇬";
  if (number.startsWith("+255")) return "🇹🇿";
  if (number.startsWith("+257")) return "🇧🇮";
  if (number.startsWith("+243")) return "🇨🇩";
  return "🌍";
}

function maskWhatsapp(number = "") {
  const last2 = number.slice(-2);
  return `**${last2}`;
}

function MediaComments({ mediaId }) {
  const [comments, setComments] = useState([]);

  useEffect(() => {
    loadComments();
  }, [mediaId]);

  async function loadComments() {
    try {
      const res = await fetch(
        `${API_URL}/api/media-comments?media_id=${mediaId}`
      );

      const data = await res.json();

      if (data.success) {
        setComments(data.comments);
      }
    } catch (err) {
      console.error(err);
    }
  }

  if (comments.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        background: "#0f172a",
        padding: "12px",
        borderTop: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {comments.map((item) => (
        <div
          key={item.id}
          style={{
            marginBottom: "10px",
            padding: "10px",
            borderRadius: "12px",
            background: "rgba(255,255,255,0.05)",
          }}
        >
          <div
            style={{
              fontWeight: "bold",
              color: "#facc15",
              marginBottom: "4px",
            }}
          >
            {getFlag(item.whatsapp)} {maskWhatsapp(item.whatsapp)} says:
          </div>

          <div
            style={{
              color: "#ffffff",
              lineHeight: "1.5",
            }}
          >
            {item.comment}
          </div>
        </div>
      ))}
    </div>
  );
}

export default MediaComments;