import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Header from "../components/Header";

const API_URL = "https://kitchenbrain.cucina656.workers.dev";
const DEFAULT_VIDEO = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
const DEFAULT_TITLE = "ChillaX";
const DEFAULT_LOGO = "https://pub-7b720214d16e45288fd32c5d88f01209.r2.dev/WhatsApp%20Image%202026-06-19%20at%207.17.57%20AM%20(1).jpeg";

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
    return `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1&mute=0&loop=1&playlist=${youtubeMatch[1]}&controls=1&rel=0&showinfo=0&modestbranding=1`;
  }
  const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch) {
    return `https://www.youtube.com/embed/${shortsMatch[1]}?autoplay=1&mute=0&loop=1&playlist=${shortsMatch[1]}&controls=1&rel=0&showinfo=0&modestbranding=1`;
  }
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&muted=0&loop=1&background=0`;
  }
  const dailymotionMatch = url.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
  if (dailymotionMatch) {
    return `https://www.dailymotion.com/embed/video/${dailymotionMatch[1]}?autoplay=1&mute=0&loop=1`;
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
  const observerRef = useRef(null);
  const isMountedRef = useRef(true);

  const readJsonSafely = useCallback(async (response) => {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(text || "Server did not return JSON");
    }
  }, []);

  const fetchHomeData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/home`);
      const data = await readJsonSafely(response);
      if (!data.success) return;
      if (Array.isArray(data.posts) && data.posts.length > 0) {
        if (isMountedRef.current) {
          setPosts(data.posts);
        }
        return;
      }
      if (isMountedRef.current) {
        setPosts([
          {
            id: 0,
            creator_identity: data.creator_identity || "",
            creator_type: data.creator_type || "",
            title: data.title || DEFAULT_TITLE,
            subtitle: data.subtitle || "",
            logo_url: data.logo_url || DEFAULT_LOGO,
            media_url: data.video_url || DEFAULT_VIDEO,
            media_type: data.media_type || "",
          },
        ]);
      }
    } catch (error) {
      console.error("Failed to fetch home data:", error);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [readJsonSafely]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchHomeData();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchHomeData]);

  // ==========================================
  // OPTIMIZED INTERSECTION OBSERVER
  // ==========================================

  useEffect(() => {
    if (!posts.length) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = Number(entry.target.dataset.index);
          const video = videoRefs.current[index];
          
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            setActivePostIndex(index);
            
            // Pause other videos
            Object.entries(videoRefs.current).forEach(([key, item]) => {
              if (Number(key) !== index && item && !item.paused) {
                item.pause();
              }
            });
            
            if (video && video.paused) {
              video.play().catch(() => {});
            }
          } else {
            if (video && !video.paused) {
              video.pause();
            }
          }
        });
      },
      { 
        threshold: [0.6],
        rootMargin: '0px 0px -10% 0px'
      }
    );

    observerRef.current = observer;

    Object.values(postRefs.current).forEach((post) => {
      if (post) observer.observe(post);
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [posts]);

  // ==========================================
  // OPTIMIZED FUNCTIONS
  // ==========================================

  const openEditor = useCallback(() => {
    Object.values(videoRefs.current).forEach((video) => {
      if (video && !video.paused) video.pause();
    });
    setShowEditor(true);
  }, []);

  const closeEditor = useCallback(() => {
    setShowEditor(false);
    setNewCreatorIdentity("");
    setNewMediaUrl("");
    setNewTitle("");
    setSubtitle("");
    setNewLogoFile(null);
    setLogoPreview("");
    setNewMediaFile(null);
  }, []);

  const handleLogoChange = useCallback((file) => {
    setNewLogoFile(file || null);
    if (file) {
      setLogoPreview(URL.createObjectURL(file));
    } else {
      setLogoPreview("");
    }
  }, []);

  const handleMediaFileChange = useCallback((file) => {
    setNewMediaFile(file || null);
  }, []);

  const applyChanges = useCallback(async () => {
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

    let detectedMediaType = "";
    if (newMediaFile) {
      detectedMediaType = newMediaFile.type.startsWith("image/") ? "image" : "video";
    } else if (isImageUrl(mediaToSave)) {
      detectedMediaType = "image";
    } else if (isDirectVideoUrl(mediaToSave)) {
      detectedMediaType = "video";
    } else if (mediaToSave) {
      detectedMediaType = "embed";
    }

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("creator_identity", identity);
      formData.append("creator_type", detectCreatorType(identity));
      formData.append("title", newTitle.trim() || DEFAULT_TITLE);
      formData.append("subtitle", subtitle.trim());
      formData.append("media_type", detectedMediaType);
      formData.append("is_new_post", "true");

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

      if (data.posts && Array.isArray(data.posts)) {
        if (isMountedRef.current) {
          setPosts(data.posts);
        }
      } else {
        await fetchHomeData();
      }

      closeEditor();
      alert("Post created successfully!");
    } catch (error) {
      console.error("Failed to create home post:", error);
      alert("Failed to create post.");
    } finally {
      if (isMountedRef.current) {
        setSaving(false);
      }
    }
  }, [newCreatorIdentity, newMediaUrl, newMediaFile, newTitle, subtitle, newLogoFile, readJsonSafely, closeEditor, fetchHomeData]);

  // ==========================================
  // MEMOIZED RENDER FUNCTIONS
  // ==========================================

  const renderMedia = useCallback((post, index) => {
    const mediaUrl = post.media_url || post.video_url || DEFAULT_VIDEO;
    const mediaType = post.media_type || "";
    
    const isImage = mediaType === "image" || (!mediaType && isImageUrl(mediaUrl));
    const isVideo = mediaType === "video" || (!mediaType && isDirectVideoUrl(mediaUrl));
    const isEmbed = mediaType === "embed" || (!mediaType && !isImageUrl(mediaUrl) && !isDirectVideoUrl(mediaUrl));

    if (isImage) {
      return (
        <img
          src={mediaUrl}
          alt={post.title || DEFAULT_TITLE}
          style={mediaStyle}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.currentTarget.src = DEFAULT_LOGO;
          }}
        />
      );
    }

    if (isVideo) {
      const isActive = activePostIndex === index;
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
          preload={isActive ? "metadata" : "none"}
          style={mediaStyle}
        />
      );
    }

    if (isEmbed) {
      // Only load iframe for active post to save resources
      if (activePostIndex === index) {
        return (
          <iframe
            src={getEmbedUrl(mediaUrl)}
            title={post.title || DEFAULT_TITLE}
            style={mediaStyle}
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope"
            allowFullScreen
            loading="lazy"
          />
        );
      } else {
        // Show placeholder for inactive embeds
        return (
          <div style={{ 
            width: '100%', 
            height: '100%', 
            background: '#1a1a2e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#888',
            fontSize: '14px'
          }}>
            ▶️ {post.title || DEFAULT_TITLE}
          </div>
        );
      }
    }

    return null;
  }, [activePostIndex]);

  // Memoize posts to prevent unnecessary re-renders
  const memoizedPosts = useMemo(() => posts, [posts]);

  if (loading) {
    return (
      <div style={page}>
        <Header />
        <div style={loadingStyle}>Loading...</div>
      </div>
    );
  }

  if (!memoizedPosts.length) {
    return (
      <div style={page}>
        <Header />
        <div style={emptyStateStyle}>
          <p>No posts yet. Create your first post!</p>
          <button type="button" onClick={openEditor} style={emptyStateButton}>
            ⚡ Create Post
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
        {memoizedPosts.map((post, index) => {
          const tapInUrl = buildTapInUrl(
            post.creator_type,
            post.creator_identity
          );
          
          return (
            <section
              key={post.id || index}
              ref={(ref) => {
                if (ref) postRefs.current[index] = ref;
              }}
              data-index={index}
              style={feedPost}
            >
              <div style={profileCard}>
                <img
                  src={post.logo_url || DEFAULT_LOGO}
                  alt={post.title || DEFAULT_TITLE}
                  style={journalistPhotoStyle}
                  onClick={() => setZoomImage(post.logo_url || DEFAULT_LOGO)}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_LOGO;
                  }}
                />
                <div style={profileTextBox}>
                  <div style={nameRow}>
                    <h1 style={profileTitle}>{post.title || DEFAULT_TITLE}</h1>
                  </div>
                </div>
              </div>
              <div style={videoCardViewport}>
                <div style={mediaLayer}>{renderMedia(post, index)}</div>
              </div>
              <div style={darkOverlay} />
              <div style={bottomHorizontalActionsRow}>
                {post.subtitle && (
                  <div style={tickerContainer}>
                    {tapInUrl ? (
                      <a
                        href={tapInUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={tickerLabel}
                      >
                        Ngwino
                      </a>
                    ) : (
                      <div style={tickerLabel}>Ngwino</div>
                    )}
                    <div style={tickerWrapper}>
                      <div style={tickerScrollingContent}>{post.subtitle}</div>
                    </div>
                  </div>
                )}
                <button type="button" onClick={openEditor} style={plusBtn}>
                  <span style={lightningIcon}>⚡</span>
                  <span style={plusIcon}>+</span>
                </button>
              </div>
            </section>
          );
        })}
      </main>

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
          <img 
            src={zoomImage} 
            alt="Profile zoom" 
            style={zoomImageStyle}
            loading="lazy"
            decoding="async"
          />
        </div>
      )}
    </div>
  );
}

// ==========================================
// EDITOR MODAL (Memoized)
// ==========================================

const EditorModal = React.memo(({
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
}) => {
  return (
    <div style={modalOverlay}>
      <div style={modalCard}>
        <h2 style={modalTitle}> ⚡ Create New Post</h2>
        <input
          type="text"
          placeholder="WhatsApp number or website URL *"
          value={newCreatorIdentity}
          onChange={(e) => setNewCreatorIdentity(e.target.value)}
          style={inputStyle}
        />
        <label style={fileLabel}>
          <span>Poster photo upload from phone/computer optional</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleLogoChange(e.target.files?.[0] || null)}
            style={fileInput}
          />
        </label>
        {logoPreview && (
          <img src={logoPreview} alt="Logo preview" style={previewLogo} loading="lazy" decoding="async" />
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
          💡 Enter a media URL OR upload an image/video from your device.
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
});

EditorModal.displayName = 'EditorModal';

// ==========================================
// STYLES (Unchanged)
// ==========================================

const page = {
  height: "100vh",
  minHeight: "100svh",
  background: "#0d0e12",
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
  background: "#0d0e12",
};

const feedPost = {
  height: "100vh",
  minHeight: "100svh",
  width: "100%",
  scrollSnapAlign: "start",
  scrollSnapStop: "always",
  position: "relative",
  overflow: "hidden",
  background: "linear-gradient(to bottom, #141722 0%, #0a0b0e 100%)",
};

const profileCard = {
  position: "absolute",
  top: "0px",
  left: "0px",
  right: "0px",
  zIndex: 10,
  display: "flex",
  alignItems: "center",
  gap: "14px",
  background: "linear-gradient(to bottom, rgba(29, 35, 46, 0.8) 0%, rgba(29, 35, 46, 0.6) 100%)",
  backdropFilter: "blur(12px)",
  padding: "16px 20px",
  borderBottom: "1px solid rgba(0, 255, 204, 0.15)",
};

const journalistPhotoStyle = {
  width: "50px",
  height: "50px",
  borderRadius: "50%",
  objectFit: "cover",
  border: "2px solid #00ffcc",
  boxShadow: "0 0 14px rgba(0, 255, 204, 0.5), inset 0 0 8px rgba(0, 255, 204, 0.3)",
  flexShrink: 0,
  cursor: "pointer",
};

const profileTextBox = {
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  flex: 1,
};

const nameRow = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

const profileTitle = {
  fontSize: "19px",
  fontWeight: "700",
  margin: 0,
  color: "#38bdf8",
  letterSpacing: "0.4px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const videoCardViewport = {
  width: "100%",
  height: "52%",
  position: "absolute",
  top: "92px",
  overflow: "hidden",
  background: "#000",
  boxShadow: "0 4px 30px rgba(0, 0, 0, 0.5)",
};

const mediaLayer = {
  position: "absolute",
  inset: 0,
  zIndex: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const mediaStyle = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
  display: "block",
};

const darkOverlay = {
  position: "absolute",
  inset: 0,
  zIndex: 1,
  background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 20%, transparent 75%, rgba(0,0,0,0.6) 100%)",
  pointerEvents: "none",
};

const bottomHorizontalActionsRow = {
  position: "absolute",
  bottom: "135px",
  left: "16px",
  right: "16px",
  zIndex: 30,
  display: "flex",
  alignItems: "center",
  gap: "12px",
  width: "calc(100% - 32px)",
};

const tickerContainer = {
  flex: 1,
  height: "54px",
  display: "flex",
  alignItems: "center",
  background: "rgba(30, 41, 59, 0.6)",
  backdropFilter: "blur(20px)",
  borderRadius: "30px",
  border: "1px solid rgba(56, 189, 248, 0.25)",
  overflow: "hidden",
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
};

const tickerLabel = {
  background: "#000000",
  color: "#ec4899",
  fontWeight: "700",
  fontSize: "14px",
  padding: "0 26px",
  height: "100%",
  display: "flex",
  alignItems: "center",
  borderRadius: "30px 0 0 30px",
  zIndex: 2,
  flexShrink: 0,
  textDecoration: "none",
  borderRight: "1px solid rgba(56, 189, 248, 0.2)",
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
  animation: "tickerMarquee 45s linear infinite",
  color: "#38bdf8",
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

const plusBtn = {
  width: "56px",
  height: "56px",
  borderRadius: "50%",
  border: "none",
  background: "#ffffff",
  boxShadow: "0 0 16px rgba(236, 72, 153, 0.6), 0 4px 12px rgba(0,0,0,0.4)",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  padding: 0,
  position: "relative",
};

const lightningIcon = {
  color: "#f59e0b",
  fontSize: "16px",
  fontWeight: "700",
  lineHeight: "1",
  marginBottom: "1px",
};

const plusIcon = {
  color: "#ec4899",
  fontSize: "16px",
  fontWeight: "700",
  lineHeight: "1",
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  zIndex: 10000,
  background: "rgba(10, 11, 14, 0.9)",
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
  background: "#1e293b",
  color: "white",
  borderRadius: "16px",
  padding: "20px",
  boxSizing: "border-box",
  border: "1px solid rgba(56, 189, 248, 0.2)",
};

const modalTitle = {
  margin: "0 0 16px",
  fontSize: "18px",
  fontWeight: "700",
  textAlign: "center",
  color: "#38bdf8",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px",
  marginBottom: "10px",
  borderRadius: "8px",
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(15, 23, 42, 0.6)",
  color: "white",
  outline: "none",
  fontSize: "14px",
};

const textareaStyle = {
  ...inputStyle,
  minHeight: "60px",
  resize: "none",
};

const fileLabel = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  padding: "10px",
  marginBottom: "10px",
  borderRadius: "8px",
  border: "1px dashed rgba(56, 189, 248, 0.4)",
  background: "rgba(15, 23, 42, 0.3)",
  color: "#bcc0c4",
  fontSize: "12px",
};

const fileInput = {
  width: "100%",
  marginTop: "4px",
  color: "white",
  fontSize: "12px",
};

const previewLogo = {
  width: "44px",
  height: "44px",
  objectFit: "cover",
  borderRadius: "50%",
  marginBottom: "10px",
  border: "2px solid #00ffcc",
};

const helpTextStyle = {
  fontSize: "11px",
  color: "#bcc0c4",
  marginBottom: "12px",
  padding: "8px",
  background: "rgba(15, 23, 42, 0.4)",
  borderRadius: "6px",
};

const saveBtn = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "none",
  background: "#ec4899",
  color: "white",
  fontWeight: "700",
  marginTop: "6px",
  cursor: "pointer",
  boxShadow: "0 0 12px rgba(236, 72, 153, 0.4)",
};

const cancelBtn = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "1px solid rgba(255,255,255,0.2)",
  background: "transparent",
  color: "#bcc0c4",
  fontWeight: "600",
  marginTop: "8px",
  cursor: "pointer",
};

const loadingStyle = {
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  color: "#38bdf8",
  fontSize: "16px",
};

const emptyStateStyle = {
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  color: "white",
  textAlign: "center",
  width: "80%",
};

const emptyStateButton = {
  marginTop: "16px",
  padding: "12px 24px",
  borderRadius: "24px",
  border: "none",
  background: "#ffffff",
  color: "#000000",
  fontSize: "14px",
  fontWeight: "700",
  cursor: "pointer",
};

const zoomOverlay = {
  position: "fixed",
  inset: 0,
  zIndex: 10001,
  background: "rgba(0,0,0,0.95)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const zoomImageStyle = {
  width: "85vw",
  height: "85vw",
  maxWidth: "340px",
  maxHeight: "340px",
  borderRadius: "50%",
  objectFit: "cover",
  border: "2px solid #00ffcc",
  boxShadow: "0 0 20px rgba(0, 255, 204, 0.6)",
};

export default Home;
