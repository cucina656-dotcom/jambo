import { useEffect, useRef, useState } from "react";

import Header from "../components/Header";

const API_URL = "https://kitchenbrain.cucina656.workers.dev";

const DEFAULT_VIDEO =

 
"https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

const DEFAULT_TITLE = "ChillaX";

const DEFAULT_LOGO =

 
"https://pub-7b720214d16e45288fd32c5d88f01209.r2.dev/WhatsApp%20Image%202026-06-19%20at%207.17.57%20AM%20(1).jpeg";

function isDirectVideoUrl(url = "") {

  const clean = url.toLowerCase().split("?")[0].split("#")[0];

  return (
    clean.endsWith(".mp4") ||
    clean.endsWith(".webm") ||
    clean.endsWith(".ogg") ||
    clean.endsWith(".mov") ||
    clean.endsWith(".m4v") ||
    clean.endsWith(".mkv") ||
    clean.endsWith(".avi")
  );

}

function isImageUrl(url = "") {

  const clean = url.toLowerCase().split("?")[0].split("#")[0];

  return (
    clean.endsWith(".jpg") ||
    clean.endsWith(".jpeg") ||
    clean.endsWith(".png") ||
    clean.endsWith(".gif") ||
    clean.endsWith(".webp") ||
    clean.endsWith(".bmp") ||
    clean.endsWith(".svg")
  );

}

function getEmbedUrl(url = "") {

  if (!url) return "";

  const youtubeMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );

  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${youtubeMatch[1]}&controls=0&rel=0&showinfo=0&modestbranding=1`;
  }

  const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch) {
    return `https://www.youtube.com/embed/${shortsMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${shortsMatch[1]}&controls=0&rel=0&showinfo=0&modestbranding=1`;
  }

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&muted=1&loop=1&background=1`;
  }

  const dailymotionMatch = url.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
  if (dailymotionMatch) {
    return `https://www.dailymotion.com/embed/video/${dailymotionMatch[1]}?autoplay=1&mute=1&loop=1`;
  }

  if (url.includes("/embed/") || url.includes("player.")) return url;
  return url;

}

function detectCreatorType(value = "") {

  const clean = value.trim().toLowerCase();
  if (!clean) return "";

  if (
    clean.startsWith("http://") ||
    clean.startsWith("https://") ||
    clean.includes(".")
  ) {
    return "website";
  }
  return "whatsapp";

}

function buildTapInUrl(type = "", value = "") {

  const clean = value.trim();
  if (!clean) return "";

  if (type === "website") {
    return clean.startsWith("http://") || clean.startsWith("https://")
      ? clean
      : `https://${clean}`;
  }

  const digits = clean.replace(/[^\d]/g, "");
  return digits ? `https://wa.me/${digits}` : "";

}

function Home() {

  const videoRefs = useRef({});
  const postRefs = useRef({});
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [activePostIndex, setActivePostIndex] = useState(0);
  const [newCreatorIdentity, setNewCreatorIdentity] = useState("");
  const [newMediaUrl, setNewMediaUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [newLogoFile, setNewLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [newMediaFile, setNewMediaFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [zoomImage, setZoomImage] = useState("");

  const readJsonSafely = async (response) => {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(text || "Server did not return JSON");
    }
  };

  const fetchHomeData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/home`);
      const data = await readJsonSafely(response);
      if (!data.success) return;
      if (Array.isArray(data.posts) && data.posts.length > 0) {
        setPosts(data.posts);
        return;
      }
      setPosts([
        {
          id: 0,
          creator_identity: data.creator_identity || "",
          creator_type: data.creator_type || "",
          title: data.title || DEFAULT_TITLE,
          subtitle: data.subtitle || "",
          logo_url: data.logo_url || DEFAULT_LOGO,
          media_url: data.video_url || DEFAULT_VIDEO,
          media_type: data.media_type || "video",
        },
      ]);
    } catch (error) {
      console.error("Failed to fetch home data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHomeData();
  }, []);

  useEffect(() => {
    if (!posts.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = Number(entry.target.dataset.index);
          const video = videoRefs.current[index];
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            setActivePostIndex(index);
            Object.entries(videoRefs.current).forEach(([key, item]) => {
              if (Number(key) !== index && item) {
                item.pause();
              }
            });
            if (video) {
              video.play().catch(() => {});
            }
          } else {
            if (video) {
              video.pause();
            }
          }
        });
      },
      {
        threshold: [0.6],
      }
    );
    Object.values(postRefs.current).forEach((post) => {
      if (post) observer.observe(post);
    });
    return () => {
      observer.disconnect();
    };
  }, [posts]);

  const openEditor = () => {
    Object.values(videoRefs.current).forEach((video) => {
      if (video) video.pause();
    });
    setShowEditor(true);
  };

  const closeEditor = () => {
    setShowEditor(false);
    setNewCreatorIdentity("");
    setNewMediaUrl("");
    setNewTitle("");
    setSubtitle("");
    setNewLogoFile(null);
    setLogoPreview("");
    setNewMediaFile(null);
  };

  const handleLogoChange = (file) => {
    setNewLogoFile(file || null);
    if (file) {
      setLogoPreview(URL.createObjectURL(file));
    } else {
      setLogoPreview("");
    }
  };

  const handleMediaFileChange = (file) => {
    setNewMediaFile(file || null);
  };

  const applyChanges = async () => {
    const identity = newCreatorIdentity.trim();
    const mediaToSave = newMediaUrl.trim();
    if (!identity) {
      alert("Enter your WhatsApp number or website URL");
      return;
    }
    if (!mediaToSave && !newMediaFile) {
      alert("Please enter a media URL or upload a media file");
      return;
    }
    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("creator_identity", identity);
      formData.append("creator_type", detectCreatorType(identity));
      formData.append("title", newTitle.trim() || DEFAULT_TITLE);
      formData.append("subtitle", subtitle.trim());
      if (mediaToSave) {
        formData.append("video_url", mediaToSave);
      }
      if (newLogoFile) {
        formData.append("logo_file", newLogoFile);
      }
      if (newMediaFile) {
        formData.append("media_file", newMediaFile);
      }
      const response = await fetch(`${API_URL}/api/home/update`, {
        method: "POST",
        body: formData,
      });
      const data = await readJsonSafely(response);
      if (!data.success) {
        alert(data.message || "Failed to create post");
        return;
      }
      await fetchHomeData();
      closeEditor();
      alert("Post created successfully!");
    } catch (error) {
      console.error("Failed to create home post:", error);
      alert("Failed to create post.");
    } finally {
      setSaving(false);
    }
  };

  const renderMedia = (post, index) => {
    const mediaUrl = post.media_url || post.video_url || DEFAULT_VIDEO;
    const mediaType = post.media_type || "";
    const isImage = mediaType === "image" || isImageUrl(mediaUrl);
    const isVideo = mediaType === "video" || isDirectVideoUrl(mediaUrl);
    const isEmbed = mediaType === "embed" || (!isImage && !isVideo);
    if (isImage) {
      return (
        <img
          src={mediaUrl}
          alt={post.title || DEFAULT_TITLE}
          style={mediaStyle}
          onError={(e) => {
            e.currentTarget.src = DEFAULT_LOGO;
          }}
        />
      );
    }
    if (isVideo) {
      return (
        <video
          ref={(ref) => {
            if (ref) videoRefs.current[index] = ref;
          }}
          src={mediaUrl}
          loop
          playsInline
          muted={false}
          controls
          preload="metadata"
          style={mediaStyle}
        />
      );
    }
    if (isEmbed) {
      return (
        <iframe
          src={getEmbedUrl(mediaUrl)}
          title={post.title || DEFAULT_TITLE}
          style={mediaStyle}
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope"
          allowFullScreen
        />
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div style={page}>
        <Header />
        <div style={loadingStyle}>Loading...</div>
      </div>
    );
  }

  if (!posts.length) {
    return (
      <div style={page}>
        <Header />
        <div style={emptyStateStyle}>
          <p>No posts yet. Create your first post!</p>
          <button type="button" onClick={openEditor} style={emptyStateButton}>
            ⚡      Create Post
          </button>
        </div>
        {showEditor && (
          <EditorModal
            newCreatorIdentity={newCreatorIdentity}
            setNewCreatorIdentity={setNewCreatorIdentity}
            newTitle={newTitle}
            setNewTitle={setNewTitle}
            newMediaUrl={newMediaUrl}
            setNewMediaUrl={setNewMediaUrl}
            subtitle={subtitle}
            setSubtitle={setSubtitle}
            handleLogoChange={handleLogoChange}
            logoPreview={logoPreview}
            handleMediaFileChange={handleMediaFileChange}
            applyChanges={applyChanges}
            closeEditor={closeEditor}
            saving={saving}
          />
        )}
      </div>
    );
  }

  return (
    <div style={page}>
      <Header />
      <main style={feedContainer}>
        {posts.map((post, index) => {
          const tapInUrl = buildTapInUrl(
            post.creator_type,
            post.creator_identity
          );
          const formattedDate = new Date(post.created_at || Date.now()).toLocaleDateString();
          const formattedTime = new Date(post.created_at || Date.now()).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          const timeMarqueeString = `${formattedDate} • ${formattedTime}`;
          return (
            <section
              key={post.id || index}
              ref={(ref) => {
                if (ref) postRefs.current[index] = ref;
              }}
              data-index={index}
              style={feedPost}
            >
              <div style={mediaLayer}>{renderMedia(post, index)}</div>
              <div style={darkOverlay} />
              
              <div style={profileCard}>
                <img
                  src={post.logo_url || DEFAULT_LOGO}
                  alt={post.title || DEFAULT_TITLE}
                  style={journalistPhotoStyle}
                  onClick={() => setZoomImage(post.logo_url || DEFAULT_LOGO)}
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_LOGO;
                  }}
                />
                <div style={profileTextBox}>
                  <h1 style={profileTitle}>{post.title || DEFAULT_TITLE}</h1>
                  <div style={inlineMarqueeWrapper}>
                    <div style={inlineMarqueeContent}>{timeMarqueeString}</div>
                  </div>
                </div>
              </div>
              {post.subtitle && (
                <div style={tickerContainer}>
                  {tapInUrl ? (
                    <a
                      href={tapInUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={tickerLabel}
                    >
                      Gwamo
                    </a>
                  ) : (
                    <div style={tickerLabel}>Tapin</div>
                  )}
                  <div style={tickerWrapper}>
                    <div style={tickerScrollingContent}>{post.subtitle}</div>
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </main>
      <button type="button" onClick={openEditor} style={plusBtn}>
        ⚡  +
      </button>
      {showEditor && (
        <EditorModal
          newCreatorIdentity={newCreatorIdentity}
          setNewCreatorIdentity={setNewCreatorIdentity}
          newTitle={newTitle}
          setNewTitle={setNewTitle}
          newMediaUrl={newMediaUrl}
          setNewMediaUrl={setNewMediaUrl}
          subtitle={subtitle}
          setSubtitle={setSubtitle}
          handleLogoChange={handleLogoChange}
          logoPreview={logoPreview}
          handleMediaFileChange={handleMediaFileChange}
          applyChanges={applyChanges}
          closeEditor={closeEditor}
          saving={saving}
        />
      )}
      {zoomImage && (
        <div style={zoomOverlay} onClick={() => setZoomImage("")}>
          <img src={zoomImage} alt="Profile zoom" style={zoomImageStyle} />
        </div>
      )}
    </div>
  );

}

function EditorModal({
  newCreatorIdentity,
  setNewCreatorIdentity,
  newTitle,
  setNewTitle,
  newMediaUrl,
  setNewMediaUrl,
  subtitle,
  setSubtitle,
  handleLogoChange,
  logoPreview,
  handleMediaFileChange,
  applyChanges,
  closeEditor,
  saving,
}) {
  return (
    <div style={modalOverlay}>
      <div style={modalCard}>
        <h2 style={modalTitle}>  ⚡     Create New Post</h2>
        <input
          type="text"
          placeholder="WhatsApp number or website URL *"
          value={newCreatorIdentity}
          onChange={(e) => setNewCreatorIdentity(e.target.value)}
          style={inputStyle}
        />
        <label style={fileLabel}>
          <span>Home logo upload from phone/computer optional</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleLogoChange(e.target.files?.[0] || null)}
            style={fileInput}
          />
        </label>
        {logoPreview && (
          <img src={logoPreview} alt="Logo preview" style={previewLogo} />
        )}
        <input
          type="text"
          placeholder="Lifestyle Name"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          style={inputStyle}
        />
        <input
          type="text"
          placeholder="Background Media URL optional if uploading file"
          value={newMediaUrl}
          onChange={(e) => setNewMediaUrl(e.target.value)}
          style={inputStyle}
        />
        <label style={fileLabel}>
          <span>Upload media from phone/computer image or video</span>
          <input
            type="file"
            accept="image/*,video/*"
            onChange={(e) => handleMediaFileChange(e.target.files?.[0] || null)}
            style={fileInput}
          />
        </label>
        <div style={helpTextStyle}>
          💡   Enter a media URL OR upload an image/video from your device.
        </div>
        <textarea
          placeholder="Subtitle text optional"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          style={textareaStyle}
        />
        <button
          type="button"
          onClick={applyChanges}
          style={{
            ...saveBtn,
            opacity: saving ? 0.7 : 1,
          }}
          disabled={saving}
        >
          {saving ? "Saving..." : "Create Post"}
        </button>
        <button type="button" onClick={closeEditor} style={cancelBtn}>
          Cancel
        </button>
      </div>
    </div>
  );

}

/* Updated Mobile-First Styles to match modern Bottom Nav Layout */

const page = {
  height: "100vh",
  minHeight: "100svh",
  background: "#000",
  color: "white",
  overflow: "hidden",
  position: "relative",
  width: "100%",
};

const feedContainer = {
  height: "100vh",
  minHeight: "100svh",
  width: "100%",
  overflowY: "scroll",
  scrollSnapType: "y mandatory",
  WebkitOverflowScrolling: "touch",
  background: "#000",
};

const feedPost = {
  height: "100vh",
  minHeight: "100svh",
  width: "100%",
  scrollSnapAlign: "start",
  scrollSnapStop: "always",
  position: "relative",
  overflow: "hidden",
  background: "#000",
};

const mediaLayer = {
  position: "absolute",
  inset: 0,
  zIndex: 0,
  background: "#000",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const mediaStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
  maxHeight: "100%",
  maxWidth: "100%",
};

const darkOverlay = {
  position: "absolute",
  inset: 0,
  zIndex: 1,
  background:
    "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 20%, rgba(0,0,0,0.1) 70%, rgba(0,0,0,0.75) 100%)",
  pointerEvents: "none",
};

// Profile card - moved higher, reduced gap
const profileCard = {
  position: "absolute",
  top: "52px", // moved higher from 64px
  left: "12px",
  zIndex: 5,
  display: "flex",
  alignItems: "center",
  gap: "6px", // reduced from 10px to bring name closer to photo
  maxWidth: "calc(100vw - 24px)",
};

const journalistPhotoStyle = {
  width: "50px", // slightly smaller for mobile
  height: "50px",
  borderRadius: "50%",
  objectFit: "cover",
  border: "2px solid #f2f4f7",
  boxShadow: "0 0 10px rgb(0, 0, 0)",
  flexShrink: 0,
  cursor: "pointer",
};

const profileTextBox = {
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  flex: 1,
};

const profileTitle = {
  fontSize: "18px", // slightly smaller for mobile
  fontWeight: "900",
  margin: 0,
  color: "#1317fa",
  letterSpacing: "0.5px",
  textShadow: "0 2px 4px rgba(0,0,0,0.9)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  maxWidth: "160px", // ensures ellipsis on smaller screens
};

const inlineMarqueeWrapper = {
  width: "100%",
  maxWidth: "160px",
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  marginTop: "0px", // reduced from 2px
};

const inlineMarqueeContent = {
  display: "inline-block",
  whiteSpace: "nowrap",
  paddingLeft: "100%",
  animation: "tickerMarquee 12s linear infinite",
  color: "#fff",
  fontSize: "11px", // slightly smaller
  fontWeight: "600",
  opacity: 0.85,
};

// Ticker container - positioned at bottom
const tickerContainer = {
  position: "absolute",
  bottom: "84px",
  left: "12px",
  right: "12px",
  zIndex: 6,
  display: "flex",
  alignItems: "center",
  background: "rgba(20, 20, 20, 0.85)",
  backdropFilter: "blur(16px)",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.08)",
  overflow: "hidden",
  boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
};

const tickerLabel = {
  background: "linear-gradient(90deg, #fffdfc, #f7f7f7)",
  color: "#000",
  fontWeight: "900",
  fontSize: "12px",
  padding: "10px 14px",
  letterSpacing: "0.5px",
  textTransform: "uppercase",
  zIndex: 2,
  flexShrink: 0,
  textDecoration: "none",
  cursor: "pointer",
};

const tickerWrapper = {
  flex: 1,
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
};

const tickerScrollingContent = {
  display: "inline-block",
  whiteSpace: "nowrap",
  paddingLeft: "100%",
  animation: "tickerMarquee 15s linear infinite",
  color: "#fff",
  fontSize: "14px",
  fontWeight: "600",
};

if (typeof window !== "undefined" && !document.getElementById("ticker-keyframes")) {
  const styleEl = document.createElement("style");
  styleEl.id = "ticker-keyframes";
  styleEl.innerHTML = `
@keyframes tickerMarquee {
  0% { transform: translate3d(0, 0, 0); }
  100% { transform: translate3d(-100%, 0, 0); }
}
`;
  document.head.appendChild(styleEl);
}

// Floating Action Button - aligned with Gwamo/ticker container
const plusBtn = {
  position: "fixed",
  right: "16px",
  bottom: "96px", // aligned with ticker container (84px + some offset)
  zIndex: 30,
  width: "52px", // slightly smaller
  height: "52px",
  borderRadius: "50%",
  border: "none",
  background: "linear-gradient(135deg,#FFD700,#EC4899)",
  color: "white",
  fontSize: "22px",
  fontWeight: "900",
  boxShadow: "0 4px 16px rgb(7, 7, 5)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  zIndex: 10000,
  background: "rgba(0,0,0,0.85)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "16px",
  boxSizing: "border-box",
};

const modalCard = {
  width: "100%",
  maxWidth: "360px",
  height: "auto",
  maxHeight: "82vh",
  overflowY: "auto",
  background: "#121212",
  color: "white",
  borderRadius: "20px",
  padding: "20px",
  boxSizing: "border-box",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 10px 40px rgba(0,0,0,0.8)",
  WebkitOverflowScrolling: "touch",
};

const modalTitle = {
  margin: "0 0 16px",
  fontSize: "20px",
  fontWeight: "800",
  textAlign: "center",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px",
  minHeight: "44px",
  marginBottom: "10px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.05)",
  color: "white",
  outline: "none",
  fontSize: "14px",
};

const textareaStyle = {
  ...inputStyle,
  minHeight: "70px",
  resize: "none",
};

const fileLabel = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  padding: "12px",
  marginBottom: "10px",
  borderRadius: "12px",
  border: "1px dashed rgba(255,255,255,0.25)",
  background: "rgba(255,255,255,0.03)",
  color: "#A0A0A0",
  fontSize: "12px",
  lineHeight: 1.4,
};

const fileInput = {
  width: "100%",
  marginTop: "6px",
  color: "white",
  fontSize: "12px",
};

const previewLogo = {
  width: "50px",
  height: "50px",
  objectFit: "cover",
  borderRadius: "50%",
  border: "2px solid #ff3300",
  marginBottom: "10px",
};

const helpTextStyle = {
  fontSize: "11px",
  color: "#A0A0A0",
  marginBottom: "12px",
  padding: "8px 12px",
  background: "rgba(255,255,255,0.03)",
  borderRadius: "8px",
  lineHeight: "1.4",
};

const saveBtn = {
  width: "100%",
  padding: "14px",
  borderRadius: "999px",
  border: "none",
  background: "#22c55e",
  color: "white",
  fontWeight: "900",
  marginTop: "6px",
  cursor: "pointer",
  fontSize: "14px",
};

const cancelBtn = {
  width: "100%",
  padding: "12px",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.15)",
  background: "transparent",
  color: "#A0A0A0",
  fontWeight: "700",
  marginTop: "8px",
  cursor: "pointer",
  fontSize: "13px",
};

const loadingStyle = {
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  color: "white",
  fontSize: "18px",
  zIndex: 10,
};

const emptyStateStyle = {
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  color: "white",
  textAlign: "center",
  zIndex: 10,
  width: "80%",
};

const emptyStateButton = {
  marginTop: "20px",
  padding: "14px 28px",
  borderRadius: "999px",
  border: "none",
  background: "linear-gradient(135deg,#FFD700,#EC4899)",
  color: "white",
  fontSize: "16px",
  fontWeight: "900",
  cursor: "pointer",
  boxShadow: "0 4px 14px rgba(255,215,0,0.3)",
};

const zoomOverlay = {
  position: "fixed",
  inset: 0,
  zIndex: 10001,
  background: "rgba(0,0,0,0.9)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
};

const zoomImageStyle = {
  width: "min(80vw, 320px)",
  height: "min(80vw, 320px)",
  borderRadius: "50%",
  objectFit: "cover",
  border: "3px solid #ff2600",
  boxShadow: "0 0 30px rgba(255, 9, 9, 0.94)",
};

export default Home;
