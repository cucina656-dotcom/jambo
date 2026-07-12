import { useState, useRef, useEffect } from "react";
import { Plus, Heart, MessageSquare, Share2, X } from "lucide-react";

const API_URL = "https://kitchenbrain.cucina656.workers.dev";

// ==========================================
// MEDIA TYPE DETECTION HELPERS
// ==========================================
function getMediaType(url) {
  if (!url) return 'none';
  
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'];
  if (videoExtensions.some(ext => url.toLowerCase().includes(ext))) {
    return 'video';
  }
  
  const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];
  if (audioExtensions.some(ext => url.toLowerCase().includes(ext))) {
    return 'audio';
  }
  
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
  if (imageExtensions.some(ext => url.toLowerCase().includes(ext))) {
    return 'image';
  }
  
  if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
    return 'youtube';
  }
  
  if (url.includes('vimeo.com/')) {
    return 'vimeo';
  }
  
  if (url.includes('dailymotion.com/')) {
    return 'dailymotion';
  }
  
  return 'unknown';
}

function getYouTubeEmbedUrl(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?#]+)/,
    /youtube\.com\/embed\/([^?]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
  }
  return url;
}

function getVimeoEmbedUrl(url) {
  const match = url.match(/vimeo\.com\/(\d+)/);
  if (match) {
    return `https://player.vimeo.com/video/${match[1]}`;
  }
  return url;
}

function getDailymotionEmbedUrl(url) {
  const match = url.match(/dailymotion\.com\/video\/([^?&]+)/);
  if (match) {
    return `https://www.dailymotion.com/embed/video/${match[1]}`;
  }
  return url;
}

function getFlagFromWhatsapp(number = "") {
  // ... (keep your existing getFlagFromWhatsapp function)
  // I'm omitting it here for brevity, but keep the full function
  return "🌍";
}

export default function DedicationCard({
  id,
  senderPhoto,
  senderName,
  senderWhatsapp,
  recipientName,
  recipientPhoto,
  dedicationTitle = "",
  message,
  mediaTitle = "Dedicated Song",
  mediaUrl = "",
  views = 0,
  reactionCount = 0,
  commentCount = 0,
  badgeStyle = "❤️",
  onDedicateClick,
}) {
  const [reactions, setReactions] = useState(reactionCount);
  const [comments, setComments] = useState(commentCount);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsList, setCommentsList] = useState([]);
  const [commenterWhatsapp, setCommenterWhatsapp] = useState("");
  const [commentText, setCommentText] = useState("");
  const [fullImage, setFullImage] = useState(null);
  const [hasReacted, setHasReacted] = useState(() => {
    return localStorage.getItem(`chillax_reacted_${id}`) === "true";
  });
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const videoRef = useRef(null);
  const cardRef = useRef(null);
  const flag = getFlagFromWhatsapp(senderWhatsapp);
  const mediaType = getMediaType(mediaUrl);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting);
        });
      },
      { threshold: 0.6, rootMargin: "0px" }
    );
    if (cardRef.current) {
      observer.observe(cardRef.current);
    }
    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isVisible && mediaType === 'video') {
      if (videoRef.current.paused) {
        videoRef.current.play().catch((err) => {
          console.log("Play prevented:", err);
        });
      }
    } else {
      if (!videoRef.current.paused) {
        videoRef.current.pause();
      }
    }
  }, [isVisible, mediaType]);

  async function loadComments() {
    if (!id) return;
    try {
      const res = await fetch(`${API_URL}/api/dedications/comments?id=${id}`);
      const data = await res.json();
      if (data.success) {
        setCommentsList(data.comments || []);
      }
    } catch (error) {
      console.error("Failed to load comments", error);
    }
  }

  async function react() {
    if (hasReacted) return;
    if (!id) return alert("Missing dedication ID");
    setHasReacted(true);
    setReactions((v) => v + 1);
    localStorage.setItem(`chillax_reacted_${id}`, "true");
    try {
      const res = await fetch(`${API_URL}/api/dedications/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!data.success) {
        setHasReacted(false);
        setReactions((v) => v - 1);
        localStorage.removeItem(`chillax_reacted_${id}`);
      }
    } catch {
      setHasReacted(false);
      setReactions((v) => v - 1);
      localStorage.removeItem(`chillax_reacted_${id}`);
    }
  }

  async function sendComment() {
    if (!id) return alert("Missing dedication ID");
    if (!commenterWhatsapp.trim()) return alert("Enter your WhatsApp number first.");
    if (!commentText.trim()) return;

    setIsSubmittingComment(true);
    const textToSend = commentText.trim();
    const whatsappToSend = commenterWhatsapp.trim();

    const newComment = {
      id: Date.now(),
      dedication_id: id,
      comment: textToSend,
      commenter_whatsapp: whatsappToSend,
      created_at: new Date().toISOString(),
    };

    setCommentsList((prev) => [newComment, ...prev]);
    setComments((v) => v + 1);
    setCommentText("");

    try {
      const res = await fetch(`${API_URL}/api/dedications/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          comment: textToSend,
          commenter_whatsapp: whatsappToSend,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setCommentsList((prev) => prev.filter((c) => c.id !== newComment.id));
        setComments((v) => v - 1);
        alert(data.message || "Failed to post comment");
      }
    } catch (error) {
      console.error("Comment error:", error);
      setCommentsList((prev) => prev.filter((c) => c.id !== newComment.id));
      setComments((v) => v - 1);
      alert("Network error. Please try again.");
    } finally {
      setIsSubmittingComment(false);
    }
  }

  function openComments() {
    setCommentsOpen(true);
    loadComments();
  }

  function closeComments() {
    setCommentsOpen(false);
    setCommentText("");
  }

  function shareToWhatsApp() {
    const text = `🎵 ChillaX Dedication\n${senderName || "Someone"} dedicated something special to ${
      recipientName || "someone"
    }`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  function renderMedia() {
    if (!mediaUrl) {
      return (
        <div style={fallbackBg}>
          <div style={fallbackContent}>
            <span style={fallbackIcon}>🎵</span>
            <span style={fallbackText}>{dedicationTitle || mediaTitle}</span>
          </div>
        </div>
      );
    }

    switch (mediaType) {
      case 'youtube':
        return (
          <iframe
            src={getYouTubeEmbedUrl(mediaUrl)}
            style={iframeStyle}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={dedicationTitle || mediaTitle}
            loading="lazy"
          />
        );
      
      case 'vimeo':
        return (
          <iframe
            src={getVimeoEmbedUrl(mediaUrl)}
            style={iframeStyle}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title={dedicationTitle || mediaTitle}
            loading="lazy"
          />
        );
      
      case 'dailymotion':
        return (
          <iframe
            src={getDailymotionEmbedUrl(mediaUrl)}
            style={iframeStyle}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title={dedicationTitle || mediaTitle}
            loading="lazy"
          />
        );
      
      case 'video':
        return (
          <video
            ref={videoRef}
            src={mediaUrl}
            controls
            playsInline
            autoPlay
            muted
            loop
            crossOrigin="anonymous"
            preload="auto"
            style={videoBg}
          />
        );
      
      case 'audio':
        return (
          <div style={audioContainerStyle}>
            <div style={audioCardStyle}>
              <div style={audioIconStyle}>🎵</div>
              <audio
                src={mediaUrl}
                controls
                style={audioControlStyle}
              />
              <div style={audioTitleStyle}>{dedicationTitle || mediaTitle}</div>
            </div>
          </div>
        );
      
      case 'image':
        return (
          <img
            src={mediaUrl}
            alt={dedicationTitle || mediaTitle}
            style={imageBgStyle}
            loading="lazy"
          />
        );
      
      default:
        return (
          <div style={fallbackBg}>
            <div style={fallbackContent}>
              <span style={fallbackIcon}>🎵</span>
              <span style={fallbackText}>{dedicationTitle || mediaTitle}</span>
            </div>
          </div>
        );
    }
  }

  return (
    <div ref={cardRef} style={card}>
      {/* Instagram Header */}
      <div style={instagramHeader}>
        <div style={person}>
          {senderPhoto ? (
            <img
              src={senderPhoto}
              alt={senderName}
              style={smallPhotoCircle}
              onClick={() => setFullImage(senderPhoto)}
            />
          ) : (
            <div style={smallPlaceholder}>S</div>
          )}
          <div>
            <div style={nameEmphasis}>
              {senderName || "Sender"} {flag}
            </div>
            <div style={roleText}>Sender</div>
          </div>
        </div>
        
        <button type="button" onClick={react} style={toPill}>
          <span>to</span>
        </button>

        <div style={person}>
          {recipientPhoto ? (
            <img
              src={recipientPhoto}
              alt={recipientName}
              style={smallPhotoCircle}
              onClick={() => setFullImage(recipientPhoto)}
            />
          ) : (
            <div style={smallPlaceholder}>R</div>
          )}
          <div>
            <div style={nameEmphasis}>{recipientName || "Recipient"}</div>
            <div style={roleText}>Recipient</div>
          </div>
        </div>
      </div>

      {/* Media */}
      <div style={mediaCard}>
        {renderMedia()}
        <div style={topBadge}>
          <span style={badgeDot}></span>
          {dedicationTitle || mediaTitle}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={instagramActionBar}>
        <div style={leftActionsRow}>
          <button type="button" onClick={react} style={inlineActionBtn} aria-label="Like">
            <Heart
              size={24}
              strokeWidth={2}
              fill={hasReacted ? "#ED4956" : "none"}
              color={hasReacted ? "#ED4956" : "#ffffff"}
            />
          </button>
          <button type="button" onClick={openComments} style={inlineActionBtn} aria-label="Comments">
            <MessageSquare size={24} strokeWidth={2} color="#ffffff" />
          </button>
          <button type="button" onClick={shareToWhatsApp} style={inlineActionBtn} aria-label="Share">
            <Share2 size={24} strokeWidth={2} color="#ffffff" />
          </button>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onDedicateClick) onDedicateClick();
          }}
          style={inlineActionBtn}
          aria-label="Dedicate Song"
        >
          <Plus size={24} strokeWidth={2} color="#ffffff" />
        </button>
      </div>

      {/* Stats and Message */}
      <div style={dedicationBody}>
        <div style={statsLine}>
          <span>{reactions.toLocaleString()} likes</span>
          <span>•</span>
          <span>{views.toLocaleString()} views</span>
        </div>

        <p style={messageText}>
          <span style={{ fontWeight: "700", marginRight: "6px" }}>{senderName || "Sender"}:</span>
          {message || "I chose this song because it reminds me of you."}
        </p>

        <button type="button" onClick={openComments} style={commentMainBtn}>
          View all {comments} comments...
        </button>
      </div>

      {/* Comments Overlay */}
      {commentsOpen && (
        <div style={commentOverlay} onClick={(e) => {
          if (e.target === e.currentTarget) closeComments();
        }}>
          <div style={commentHandleBar}></div>
          <div style={commentHeader}>
            <h3 style={commentTitle}>Comments</h3>
            <button
              type="button"
              onClick={closeComments}
              style={closeBtn}
            >
              <X size={20} color="#ffffff" />
            </button>
          </div>
          
          <div style={commentsListBox}>
            {commentsList.length === 0 ? (
              <p style={noComments}>No comments yet. Be the first! 💬</p>
            ) : (
              commentsList.map((comment) => (
                <div key={comment.id} style={commentItem}>
                  <div style={commentFrom}>
                    {getFlagFromWhatsapp(comment.commenter_whatsapp || "")} {comment.commenter_whatsapp || "Anonymous"}
                  </div>
                  <div style={commentBody}>{comment.comment}</div>
                </div>
              ))
            )}
          </div>

          {/* Comment Input */}
          <div style={writeBox}>
            <input
              value={commenterWhatsapp}
              onChange={(e) => setCommenterWhatsapp(e.target.value)}
              placeholder="📱 WhatsApp number (e.g +250788123456)"
              style={commentInputTop}
            />
            <div style={sendRow}>
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                style={commentInputBottom}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendComment();
                  }
                }}
              />
              <button 
                type="button" 
                onClick={sendComment} 
                style={sendBtn}
                disabled={isSubmittingComment || !commentText.trim()}
              >
                {isSubmittingComment ? "Sending..." : "Post"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Image Popup */}
      {fullImage && (
        <div style={imagePopup} onClick={() => setFullImage(null)}>
          <img src={fullImage} alt="Full view" style={fullImageStyle} />
          <button type="button" style={closeImageBtn} onClick={() => setFullImage(null)}>
            <X size={24} color="#ffffff" />
          </button>
        </div>
      )}
    </div>
  );
}

// ==========================================
// STYLES (unchanged - keep your existing styles)
// ==========================================
const card = {
  position: "relative",
  width: "100%",
  maxWidth: "430px",
  margin: "0 auto 18px auto",
  overflow: "hidden",
  background: "#000000",
  color: "#ffffff",
  borderRadius: "0px",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  WebkitFontSmoothing: "antialiased",
};

const instagramHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 14px",
  background: "#000000",
  borderBottom: "1px solid #1c1c1e",
};

const mediaCard = {
  position: "relative",
  width: "100%",
  aspectRatio: "1 / 1", 
  overflow: "hidden",
  background: "#000000",
};

const videoBg = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  objectPosition: "center center",
  background: "#000000",
  zIndex: 0,
};

const iframeStyle = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  border: "none",
  background: "#000000",
  zIndex: 0,
};

const imageBgStyle = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  background: "#000000",
  zIndex: 0,
};

const audioContainerStyle = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(145deg, #1a1a1a, #0a0a0a)",
  zIndex: 0,
  padding: "20px",
};

const audioCardStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "16px",
  width: "100%",
  maxWidth: "320px",
};

const audioIconStyle = {
  fontSize: "48px",
  marginBottom: "8px",
};

const audioControlStyle = {
  width: "100%",
  height: "48px",
  background: "transparent",
};

const audioTitleStyle = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#ffffff",
  textAlign: "center",
};

const fallbackBg = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#262626",
  zIndex: 0,
};

const fallbackContent = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "12px",
};

const fallbackIcon = {
  fontSize: "48px",
};

const fallbackText = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#ffffff",
  textAlign: "center",
};

const topBadge = {
  position: "absolute",
  bottom: "14px",
  left: "14px",
  zIndex: 2,
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "4px 8px",
  borderRadius: "4px",
  background: "rgba(0, 0, 0, 0.75)",
  color: "#ffffff",
  fontSize: "11px",
  fontWeight: "600",
};

const badgeDot = {
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  background: "#0095f6",
  flexShrink: 0,
};

const instagramActionBar = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 14px 8px 14px",
  background: "#000000",
};

const leftActionsRow = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
};

const inlineActionBtn = {
  border: "none",
  background: "transparent",
  padding: 0,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const dedicationBody = {
  padding: "0px 14px 16px 14px",
  background: "#000000",
};

const person = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  minWidth: 0,
};

const nameEmphasis = {
  fontWeight: "600",
  fontSize: "13px",
  color: "#ffffff",
  lineHeight: 1.2,
  maxWidth: "110px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const roleText = {
  fontSize: "11px",
  color: "#a8a8a8",
};

const smallPhotoCircle = {
  width: "32px",
  height: "32px",
  borderRadius: "50%",
  objectFit: "cover",
  border: "1px solid #262626",
  cursor: "pointer",
  flexShrink: 0,
};

const smallPlaceholder = {
  width: "32px",
  height: "32px",
  borderRadius: "50%",
  background: "#262626",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  fontWeight: "600",
  flexShrink: 0,
};

const toPill = {
  padding: "4px 12px",
  borderRadius: "8px",
  background: "#1c1c1e",
  color: "#ffffff",
  fontSize: "12px",
  fontWeight: "600",
  border: "none",
  flexShrink: 0,
};

const messageText = {
  margin: "6px 0 0 0",
  fontSize: "14px",
  lineHeight: "1.4",
  color: "#f5f5f5",
  wordBreak: "break-word",
};

const statsLine = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "14px",
  fontWeight: "600",
  color: "#ffffff",
};

const commentMainBtn = {
  background: "none",
  border: "none",
  color: "#a8a8a8",
  padding: "6px 0 0 0",
  fontSize: "14px",
  textAlign: "left",
  cursor: "pointer",
  display: "block",
  transition: "color 0.2s ease",
};

const commentOverlay = {
  position: "fixed",
  left: "50%",
  transform: "translateX(-50%)",
  bottom: 0,
  width: "100%",
  maxWidth: "430px",
  height: "70svh",
  zIndex: 1000,
  background: "#1c1c1e",
  borderTopLeftRadius: "16px",
  borderTopRightRadius: "16px",
  padding: "0 16px 16px 16px",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  animation: "slideUp 0.3s ease",
};

const commentHandleBar = {
  width: "36px",
  height: "4px",
  background: "#3a3a3c",
  borderRadius: "999px",
  margin: "8px auto 12px auto",
  flexShrink: 0,
};

const commentHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  paddingBottom: "12px",
  borderBottom: "1px solid #2c2c2e",
  flexShrink: 0,
};

const commentTitle = {
  margin: 0,
  fontSize: "16px",
  fontWeight: "600",
  color: "#ffffff",
};

const closeBtn = {
  border: "none",
  background: "none",
  color: "#ffffff",
  cursor: "pointer",
  padding: "4px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const commentsListBox = {
  flex: 1,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  padding: "14px 0",
  WebkitOverflowScrolling: "touch",
};

const commentItem = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const commentFrom = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#a8a8a8",
};

const commentBody = {
  fontSize: "14px",
  color: "#ffffff",
  wordBreak: "break-word",
};

const noComments = {
  textAlign: "center",
  color: "#a8a8a8",
  fontSize: "14px",
  marginTop: "32px",
};

const writeBox = {
  borderTop: "1px solid #2c2c2e",
  paddingTop: "12px",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  flexShrink: 0,
  background: "#1c1c1e",
};

const sendRow = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: "10px",
  alignItems: "center",
};

const commentInputTop = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #2c2c2e",
  borderRadius: "8px",
  background: "#000000",
  color: "#ffffff",
  outline: "none",
  padding: "10px 12px",
  fontSize: "13px",
};

const commentInputBottom = {
  width: "100%",
  boxSizing: "border-box",
  border: "none",
  background: "transparent",
  color: "#ffffff",
  outline: "none",
  padding: "10px 0",
  fontSize: "14px",
};

const sendBtn = {
  border: "none",
  background: "none",
  color: "#0095f6",
  fontWeight: "600",
  fontSize: "14px",
  cursor: "pointer",
  padding: "8px 12px",
  opacity: 1,
  transition: "opacity 0.2s ease",
};

const imagePopup = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  background: "rgba(0,0,0,0.95)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "16px",
};

const fullImageStyle = {
  maxWidth: "100%",
  maxHeight: "85vh",
  objectFit: "contain",
};

const closeImageBtn = {
  position: "fixed",
  top: "16px",
  right: "16px",
  border: "none",
  background: "none",
  color: "#ffffff",
  cursor: "pointer",
  padding: "8px",
};

// Add animation keyframes to your global CSS or in a style tag
// @keyframes slideUp { from { transform: translateX(-50%) translateY(100%); } to { transform: translateX(-50%) translateY(0); } }
