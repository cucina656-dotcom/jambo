import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from "react";
import Header from "../components/Header";

const API_URL = "https://kitchenbrain.cucina656.workers.dev";

const DEFAULT_VIDEO =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

const DEFAULT_TITLE = "ChillaX";

const DEFAULT_LOGO =
  "https://pub-7b720214d16e45288fd32c5d88f01209.r2.dev/WhatsApp%20Image%202026-06-19%20at%207.17.57%20AM%20(1).jpeg";

function isDirectVideoUrl(url = "") {
  const clean = String(url).toLowerCase().split("?")[0].split("#")[0];

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
  const clean = String(url).toLowerCase().split("?")[0].split("#")[0];

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
    return `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1&mute=0&loop=1&playlist=${youtubeMatch[1]}&controls=1&rel=0&modestbranding=1`;
  }

  const shortsMatch = url.match(
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
  );

  if (shortsMatch) {
    return `https://www.youtube.com/embed/${shortsMatch[1]}?autoplay=1&mute=0&loop=1&playlist=${shortsMatch[1]}&controls=1&rel=0&modestbranding=1`;
  }

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);

  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&muted=0&loop=1&background=0`;
  }

  const dailymotionMatch = url.match(
    /dailymotion\.com\/video\/([a-zA-Z0-9]+)/
  );

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

function buildContactUrl(type = "", value = "") {
  const clean = String(value || "").trim();

  if (!clean) return "";

  if (type === "website") {
    return clean.startsWith("http://") || clean.startsWith("https://")
      ? clean
      : `https://${clean}`;
  }

  const digits = clean.replace(/[^\d]/g, "");
  return digits ? `https://wa.me/${digits}` : "";
}

function formatCount(value = 0) {
  const number = Number(value) || 0;

  if (number >= 1_000_000) {
    return `${(number / 1_000_000).toFixed(1).replace(".0", "")}M`;
  }

  if (number >= 1_000) {
    return `${(number / 1_000).toFixed(1).replace(".0", "")}K`;
  }

  return String(number);
}

function getCountryFlag(phone = "") {
  const digits = String(phone).replace(/[^\d+]/g, "");

  const countryPrefixes = [
    ["+250", "🇷🇼"],
    ["250", "🇷🇼"],
    ["+257", "🇧🇮"],
    ["257", "🇧🇮"],
    ["+256", "🇺🇬"],
    ["256", "🇺🇬"],
    ["+254", "🇰🇪"],
    ["254", "🇰🇪"],
    ["+255", "🇹🇿"],
    ["255", "🇹🇿"],
    ["+243", "🇨🇩"],
    ["243", "🇨🇩"],
    ["+251", "🇪🇹"],
    ["251", "🇪🇹"],
    ["+27", "🇿🇦"],
    ["27", "🇿🇦"],
    ["+44", "🇬🇧"],
    ["44", "🇬🇧"],
    ["+33", "🇫🇷"],
    ["33", "🇫🇷"],
    ["+32", "🇧🇪"],
    ["32", "🇧🇪"],
    ["+91", "🇮🇳"],
    ["91", "🇮🇳"],
    ["+86", "🇨🇳"],
    ["86", "🇨🇳"],
    ["+1", "🌎"],
    ["1", "🌎"],
  ];

  const match = countryPrefixes.find(([prefix]) => digits.startsWith(prefix));
  return match ? match[1] : "🌍";
}

function Home() {
  const videoRefs = useRef({});
  const postRefs = useRef({});
  const observerRef = useRef(null);
  const isMountedRef = useRef(true);

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePostIndex, setActivePostIndex] = useState(0);

  const [showEditor, setShowEditor] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  const [newCreatorIdentity, setNewCreatorIdentity] = useState("");
  const [newMediaUrl, setNewMediaUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [newLogoFile, setNewLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [newMediaFile, setNewMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState("");
  const [mediaPreviewType, setMediaPreviewType] = useState("");
  const [saving, setSaving] = useState(false);
  const [zoomImage, setZoomImage] = useState("");

  /*
   * Temporary comment state.
   * When Worker.js is changed, replace this with API data.
   */
  const [commentsByPost, setCommentsByPost] = useState({});
  const [commentPhone, setCommentPhone] = useState("");
  const [commentText, setCommentText] = useState("");

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

      const response = await fetch(`${API_URL}/api/home`, {
        cache: "no-store",
      });

      const data = await readJsonSafely(response);

      if (!data.success) {
        throw new Error(data.message || "Failed to load posts");
      }

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
            watch_seconds: 0,
            comment_count: 0,
            share_count: 0,
            unread_messages: 0,
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

  useEffect(() => {
    if (!posts.length) return undefined;

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

            Object.entries(videoRefs.current).forEach(([key, item]) => {
              if (Number(key) !== index && item && !item.paused) {
                item.pause();
              }
            });

            if (video && video.paused) {
              video.play().catch(() => {});
            }
          } else if (video && !video.paused) {
            video.pause();
          }
        });
      },
      {
        threshold: [0.6],
        rootMargin: "0px 0px -10% 0px",
      }
    );

    observerRef.current = observer;

    Object.values(postRefs.current).forEach((post) => {
      if (post) observer.observe(post);
    });

    return () => {
      observer.disconnect();
    };
  }, [posts]);

  const pauseAllVideos = useCallback(() => {
    Object.values(videoRefs.current).forEach((video) => {
      if (video && !video.paused) {
        video.pause();
      }
    });
  }, []);

  const openEditor = useCallback(() => {
    pauseAllVideos();
    setShowEditor(true);
  }, [pauseAllVideos]);

  const closeEditor = useCallback(() => {
    setShowEditor(false);
    setNewCreatorIdentity("");
    setNewMediaUrl("");
    setNewTitle("");
    setSubtitle("");
    setNewLogoFile(null);
    setLogoPreview("");
    setNewMediaFile(null);
    setMediaPreview("");
    setMediaPreviewType("");
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

    if (file) {
      setMediaPreview(URL.createObjectURL(file));
      setMediaPreviewType(file.type.startsWith("image/") ? "image" : "video");
    } else {
      setMediaPreview("");
      setMediaPreviewType("");
    }
  }, []);

  const applyChanges = useCallback(async () => {
    const identity = newCreatorIdentity.trim();
    const mediaToSave = newMediaUrl.trim();

    if (!identity) {
      alert("Please enter your WhatsApp number or website.");
      return;
    }

    if (!mediaToSave && !newMediaFile) {
      alert("Please enter a media link or upload a photo or video.");
      return;
    }

    let detectedMediaType = "";

    if (newMediaFile) {
      detectedMediaType = newMediaFile.type.startsWith("image/")
        ? "image"
        : "video";
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
        alert(data.message || "Failed to create post.");
        return;
      }

      if (Array.isArray(data.posts)) {
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
  }, [
    closeEditor,
    fetchHomeData,
    newCreatorIdentity,
    newLogoFile,
    newMediaFile,
    newMediaUrl,
    newTitle,
    readJsonSafely,
    subtitle,
  ]);

  const openCreatorInbox = useCallback(async (post) => {
    const postId = String(post.id ?? "");
    let destination = buildContactUrl(
      post.creator_type,
      post.creator_identity
    );

    /*
     * Your current Worker already has /api/home/ngwino-click.
     * It records the click and returns the creator destination.
     */
    if (postId) {
      try {
        const response = await fetch(`${API_URL}/api/home/ngwino-click`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ post_id: postId }),
        });

        const data = await readJsonSafely(response);

        if (data.success && data.destination) {
          destination = data.destination;
        }
      } catch (error) {
        console.warn("Could not record inbox click:", error);
      }
    }

    if (!destination) {
      alert("This creator did not add contact information.");
      return;
    }

    window.open(destination, "_blank", "noopener,noreferrer");
  }, [readJsonSafely]);

  const openComments = useCallback((post) => {
    pauseAllVideos();
    setSelectedPost(post);
    setCommentPhone("");
    setCommentText("");
    setShowComments(true);
  }, [pauseAllVideos]);

  const closeComments = useCallback(() => {
    setShowComments(false);
    setSelectedPost(null);
    setCommentPhone("");
    setCommentText("");
  }, []);

  const submitTemporaryComment = useCallback(() => {
    const phone = commentPhone.trim();
    const text = commentText.trim();

    if (!phone) {
      alert("Please enter your phone number.");
      return;
    }

    if (!text) {
      alert("Please write your comment.");
      return;
    }

    if (!selectedPost) return;

    const postId = String(selectedPost.id ?? "0");
    const newComment = {
      id: `${Date.now()}-${Math.random()}`,
      phone,
      flag: getCountryFlag(phone),
      text,
      created_at: new Date().toISOString(),
    };

    setCommentsByPost((current) => ({
      ...current,
      [postId]: [newComment, ...(current[postId] || [])],
    }));

    setCommentText("");
    alert(
      "Comment added on this phone only. Worker.js will later save it for everyone."
    );
  }, [commentPhone, commentText, selectedPost]);

  const sharePost = useCallback(async (post) => {
    const shareData = {
      title: post.title || "Post",
      text: post.subtitle || "",
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        alert("Post link copied!");
      } else {
        alert(window.location.href);
      }
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.error("Share failed:", error);
      }
    }
  }, []);

  const renderMedia = useCallback(
    (post, index) => {
      const mediaUrl = post.media_url || post.video_url || DEFAULT_VIDEO;
      const mediaType = post.media_type || "";

      const isImage =
        mediaType === "image" || (!mediaType && isImageUrl(mediaUrl));

      const isVideo =
        mediaType === "video" || (!mediaType && isDirectVideoUrl(mediaUrl));

      const isEmbed =
        mediaType === "embed" ||
        (!mediaType && !isImageUrl(mediaUrl) && !isDirectVideoUrl(mediaUrl));

      if (isImage) {
        return (
          <img
            src={mediaUrl}
            alt={post.title || DEFAULT_TITLE}
            className="home-media"
            loading="lazy"
            decoding="async"
            onError={(event) => {
              event.currentTarget.src = DEFAULT_LOGO;
            }}
          />
        );
      }

      if (isVideo) {
        const isActive = activePostIndex === index;

        return (
          <video
            ref={(ref) => {
              if (ref) {
                videoRefs.current[index] = ref;
              } else {
                delete videoRefs.current[index];
              }
            }}
            src={mediaUrl}
            loop
            playsInline
            muted={false}
            controls
            preload={isActive ? "metadata" : "none"}
            className="home-media"
          />
        );
      }

      if (isEmbed) {
        if (activePostIndex === index) {
          return (
            <iframe
              src={getEmbedUrl(mediaUrl)}
              title={post.title || DEFAULT_TITLE}
              className="home-media"
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope"
              allowFullScreen
              loading="lazy"
            />
          );
        }

        return (
          <div className="embed-placeholder">
            <span className="embed-placeholder-icon">▶</span>
            <span>{post.title || DEFAULT_TITLE}</span>
          </div>
        );
      }

      return null;
    },
    [activePostIndex]
  );

  const memoizedPosts = useMemo(() => posts, [posts]);

  if (loading) {
    return (
      <div className="home-page">
        <Header />
        <div className="loading-state">Loading...</div>
        <HomeStyles />
      </div>
    );
  }

  if (!memoizedPosts.length) {
    return (
      <div className="home-page">
        <Header />

        <div className="empty-state">
          <p>No posts yet. Create your first post!</p>

          <button type="button" onClick={openEditor} className="empty-button">
            ＋ Create Post
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
            mediaPreview={mediaPreview}
            mediaPreviewType={mediaPreviewType}
            applyChanges={applyChanges}
            closeEditor={closeEditor}
            saving={saving}
          />
        )}

        <HomeStyles />
      </div>
    );
  }

  return (
    <div className="home-page">
      <Header />

      <main className="home-feed">
        {memoizedPosts.map((post, index) => {
          const postId = String(post.id ?? index);
          const localComments = commentsByPost[postId] || [];

          /*
           * Until Worker.js is changed:
           * - watch_seconds is displayed as the available viewer number.
           * - comment_count, share_count and unread_messages default to zero.
           */
          const viewerCount = post.views ?? post.view_count ?? post.watch_seconds ?? 0;
          const commentCount =
            Number(post.comment_count || 0) + localComments.length;
          const shareCount = post.share_count || 0;
          const unreadMessages = post.unread_messages || 0;

          return (
            <section
              key={post.id || index}
              ref={(ref) => {
                if (ref) {
                  postRefs.current[index] = ref;
                } else {
                  delete postRefs.current[index];
                }
              }}
              data-index={index}
              className="home-post crt-screen"
            >
              <header className="post-header">
                <button
                  type="button"
                  className="profile-picture-button"
                  onClick={() =>
                    setZoomImage(post.logo_url || DEFAULT_LOGO)
                  }
                  aria-label="Open profile picture"
                >
                  <img
                    src={post.logo_url || DEFAULT_LOGO}
                    alt=""
                    className="profile-picture"
                    loading="lazy"
                    decoding="async"
                    onError={(event) => {
                      event.currentTarget.src = DEFAULT_LOGO;
                    }}
                  />
                </button>

                <div className="profile-details">
                  <div className="creator-name">
                    {post.creator_name || post.brand_name || "Creator"}
                  </div>

                  <div className="post-time">
                    {post.created_at
                      ? new Date(post.created_at).toLocaleString([], {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "New post"}
                  </div>
                </div>

                <button
                  type="button"
                  className="inbox-button"
                  onClick={() => openCreatorInbox(post)}
                  aria-label="Contact creator"
                  title="Contact creator"
                >
                  <span className="inbox-envelope" aria-hidden="true">
                    ✉
                  </span>

                  {Number(unreadMessages) > 0 && (
                    <span className="unread-badge">
                      {Number(unreadMessages) > 99
                        ? "99+"
                        : unreadMessages}
                    </span>
                  )}
                </button>
              </header>

              <div className="post-copy">
                {post.title && (
                  <h1 className="post-title">{post.title}</h1>
                )}

                {post.subtitle && (
                  <p className="post-message">{post.subtitle}</p>
                )}
              </div>

              <div className="media-viewport">
                <div className="media-layer">
                  {renderMedia(post, index)}
                </div>
              </div>

              <div className="social-action-bar">
                <div className="metric-group" title="Views">
                  <span className="action-symbol" aria-hidden="true">
                    ◉
                  </span>
                  <span>{formatCount(viewerCount)}</span>
                </div>

                <button
                  type="button"
                  className="action-button"
                  onClick={() => openComments(post)}
                  aria-label="Open comments"
                >
                  <span className="action-symbol" aria-hidden="true">
                    ◯
                  </span>
                  <span>{formatCount(commentCount)}</span>
                </button>

                <button
                  type="button"
                  className="action-button"
                  onClick={() => sharePost(post)}
                  aria-label="Share post"
                >
                  <span className="action-symbol share-symbol" aria-hidden="true">
                    ↗
                  </span>
                  <span>{formatCount(shareCount)}</span>
                </button>

                <button
                  type="button"
                  className="create-post-cta"
                  onClick={openEditor}
                >
                  <span className="create-post-plus">＋</span>
                  <span>Create</span>
                </button>
              </div>

              <div className="screen-scanlines" aria-hidden="true" />
              <div className="screen-reflection" aria-hidden="true" />
              <div className="screen-vignette" aria-hidden="true" />
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
          mediaPreview={mediaPreview}
          mediaPreviewType={mediaPreviewType}
          applyChanges={applyChanges}
          closeEditor={closeEditor}
          saving={saving}
        />
      )}

      {showComments && selectedPost && (
        <CommentsModal
          post={selectedPost}
          comments={
            commentsByPost[String(selectedPost.id ?? "0")] || []
          }
          phone={commentPhone}
          setPhone={setCommentPhone}
          text={commentText}
          setText={setCommentText}
          submitComment={submitTemporaryComment}
          closeComments={closeComments}
        />
      )}

      {zoomImage && (
        <div
          className="zoom-overlay"
          onClick={() => setZoomImage("")}
          role="presentation"
        >
          <img
            src={zoomImage}
            alt="Profile"
            className="zoom-image"
            loading="lazy"
            decoding="async"
          />
        </div>
      )}

      <HomeStyles />
    </div>
  );
}

const EditorModal = memo(
  ({
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
    mediaPreview,
    mediaPreviewType,
    applyChanges,
    closeEditor,
    saving,
  }) => (
    <div className="modal-overlay" onClick={closeEditor}>
      <div
        className="modal-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2>＋ Create New Post</h2>

          <button
            type="button"
            onClick={closeEditor}
            className="modal-close"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="form-section">
          <div className="section-heading">Contact</div>

          <label htmlFor="field-contact">Contact</label>
          <input
            id="field-contact"
            type="text"
            placeholder="+250788123456 or https://mywebsite.com"
            value={newCreatorIdentity}
            onChange={(event) =>
              setNewCreatorIdentity(event.target.value)
            }
          />

          <p className="field-help">
            This opens when a viewer taps the envelope.
          </p>
        </div>

        <div className="form-section">
          <div className="section-heading">Post</div>

          <label htmlFor="field-title">Post Title (Optional)</label>
          <input
            id="field-title"
            type="text"
            placeholder="Morning in Kigali"
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
          />

          <p className="field-help">
            This title will appear in bold.
          </p>

          <label htmlFor="field-message">Message (Optional)</label>
          <textarea
            id="field-message"
            placeholder={"Welcome everyone!\nEnjoy today's video."}
            value={subtitle}
            onChange={(event) => setSubtitle(event.target.value)}
          />

          <p className="field-help">
            This message will appear below the bold title.
          </p>
        </div>

        <div className="form-section">
          <div className="section-heading">Media</div>

          <label
            className="file-picker"
            htmlFor="field-media-upload"
          >
            <span>▣ Choose a photo or video</span>

            <input
              id="field-media-upload"
              type="file"
              accept="image/*,video/*"
              onChange={(event) =>
                handleMediaFileChange(
                  event.target.files?.[0] || null
                )
              }
            />
          </label>

          {mediaPreview && (
            <div className="preview-wrap">
              {mediaPreviewType === "image" ? (
                <img
                  src={mediaPreview}
                  alt="Selected media"
                  className="media-preview"
                />
              ) : (
                <video
                  src={mediaPreview}
                  className="media-preview"
                  controls
                  muted
                  playsInline
                />
              )}
            </div>
          )}

          <label htmlFor="field-media-link">
            Media Link (Optional)
          </label>

          <input
            id="field-media-link"
            type="text"
            placeholder="https://youtube.com/..."
            value={newMediaUrl}
            onChange={(event) =>
              setNewMediaUrl(event.target.value)
            }
          />

          <p className="field-help">
            Upload media or paste a supported link.
          </p>
        </div>

        <div className="form-section form-section-last">
          <div className="section-heading">Profile</div>

          <label
            className="file-picker"
            htmlFor="field-profile-photo"
          >
            <span>◎ Choose a profile photo</span>

            <input
              id="field-profile-photo"
              type="file"
              accept="image/*"
              onChange={(event) =>
                handleLogoChange(event.target.files?.[0] || null)
              }
            />
          </label>

          {logoPreview && (
            <div className="preview-wrap">
              <img
                src={logoPreview}
                alt="Profile preview"
                className="logo-preview"
              />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={applyChanges}
          className="save-button"
          disabled={saving}
        >
          {saving ? "Saving..." : "Create Post"}
        </button>

        <button
          type="button"
          onClick={closeEditor}
          className="cancel-button"
        >
          Cancel
        </button>
      </div>
    </div>
  )
);

EditorModal.displayName = "EditorModal";

const CommentsModal = memo(
  ({
    post,
    comments,
    phone,
    setPhone,
    text,
    setText,
    submitComment,
    closeComments,
  }) => (
    <div className="modal-overlay" onClick={closeComments}>
      <div
        className="modal-card comments-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2>Comments</h2>
            <p className="comments-post-name">
              {post.title || DEFAULT_TITLE}
            </p>
          </div>

          <button
            type="button"
            onClick={closeComments}
            className="modal-close"
            aria-label="Close comments"
          >
            ×
          </button>
        </div>

        <div className="comment-form">
          <div className="comment-flag-preview">
            {getCountryFlag(phone)}
          </div>

          <div className="comment-fields">
            <label htmlFor="comment-phone">
              Phone number
            </label>

            <input
              id="comment-phone"
              type="tel"
              placeholder="+250 788 123 456"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />

            <label htmlFor="comment-message">
              Comment
            </label>

            <textarea
              id="comment-message"
              placeholder="Write your comment..."
              value={text}
              onChange={(event) => setText(event.target.value)}
            />

            <p className="field-help">
              Your phone number is not shown publicly. Only its
              country flag is displayed.
            </p>

            <button
              type="button"
              className="save-button"
              onClick={submitComment}
            >
              Send Comment
            </button>
          </div>
        </div>

        <div className="comments-list">
          {comments.length === 0 ? (
            <div className="no-comments">
              No comments yet. Be the first.
            </div>
          ) : (
            comments.map((comment) => (
              <article className="comment-item" key={comment.id}>
                <div className="comment-avatar">
                  {comment.flag}
                </div>

                <div className="comment-body">
                  <div className="comment-country">
                    Viewer
                  </div>

                  <p>{comment.text}</p>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  )
);

CommentsModal.displayName = "CommentsModal";

function HomeStyles() {
  return (
    <style>{`
      * {
        box-sizing: border-box;
      }

      .home-page {
        width: 100%;
        height: 100vh;
        min-height: 100svh;
        overflow: hidden;
        position: relative;
        color: #f3fff8;
        background: #020605;
      }

      .home-feed {
        width: 100%;
        height: 100vh;
        min-height: 100svh;
        overflow-y: auto;
        overflow-x: hidden;
        scroll-snap-type: y mandatory;
        overscroll-behavior-y: contain;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        background:
          radial-gradient(circle at 50% 20%, #12362a 0%, #06140f 46%, #010403 100%);
      }

      .home-feed::-webkit-scrollbar {
        display: none;
      }

      .home-post {
        width: min(100%, 680px);
        min-height: 100svh;
        height: 100svh;
        margin: 0 auto;
        padding-top: max(8px, env(safe-area-inset-top));
        padding-bottom: max(16px, env(safe-area-inset-bottom));
        position: relative;
        overflow: hidden;
        scroll-snap-align: start;
        scroll-snap-stop: always;
        isolation: isolate;
        background:
          radial-gradient(circle at 50% 34%, rgba(26, 82, 60, 0.68) 0%, rgba(7, 29, 21, 0.96) 46%, #010604 100%);
        border-radius: clamp(0px, 3vw, 26px);
        border: 1px solid rgba(130, 255, 198, 0.18);
        box-shadow:
          inset 0 0 85px rgba(0, 0, 0, 0.94),
          inset 0 0 22px rgba(88, 255, 184, 0.10),
          0 0 28px rgba(0, 0, 0, 0.68);
      }

      .crt-screen {
        animation: screenFlicker 5.5s infinite;
      }

      .post-header {
        position: relative;
        z-index: 20;
        display: flex;
        align-items: center;
        gap: 12px;
        min-height: 76px;
        margin: 10px 12px 0;
        padding: 10px 12px;
        border: 1px solid rgba(125, 255, 197, 0.18);
        border-radius: 20px;
        background: rgba(2, 17, 12, 0.62);
        backdrop-filter: blur(16px);
        box-shadow:
          0 8px 28px rgba(0, 0, 0, 0.25),
          inset 0 0 14px rgba(117, 255, 192, 0.05);
      }

      .profile-picture-button {
        width: 52px;
        height: 52px;
        padding: 0;
        flex: 0 0 52px;
        overflow: hidden;
        border-radius: 50%;
        border: 2px solid rgba(110, 255, 192, 0.82);
        background: #07130e;
        cursor: pointer;
        box-shadow:
          0 0 15px rgba(61, 255, 174, 0.34),
          inset 0 0 10px rgba(90, 255, 188, 0.14);
      }

      .profile-picture {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: cover;
      }

      .profile-details {
        min-width: 0;
        flex: 1;
      }

      .creator-name {
        overflow: hidden;
        color: #f2fff7;
        font-size: 16px;
        font-weight: 800;
        letter-spacing: 0.2px;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-shadow: 0 0 7px rgba(170, 255, 210, 0.34);
      }

      .post-time {
        margin-top: 4px;
        color: rgba(210, 255, 229, 0.66);
        font-size: 11px;
        line-height: 1.2;
      }

      .inbox-button {
        width: 46px;
        height: 46px;
        flex: 0 0 46px;
        position: relative;
        display: grid;
        place-items: center;
        padding: 0;
        border: 1px solid rgba(106, 255, 191, 0.28);
        border-radius: 50%;
        color: #eafff3;
        background: rgba(27, 115, 78, 0.17);
        cursor: pointer;
        box-shadow: 0 0 14px rgba(47, 255, 163, 0.13);
      }

      .inbox-envelope {
        font-size: 23px;
        line-height: 1;
        filter: drop-shadow(0 0 5px rgba(103, 255, 189, 0.56));
      }

      .unread-badge {
        min-width: 19px;
        height: 19px;
        position: absolute;
        top: -4px;
        right: -3px;
        display: grid;
        place-items: center;
        padding: 0 4px;
        border: 2px solid #031009;
        border-radius: 10px;
        color: white;
        background: #ff365f;
        font-size: 10px;
        font-weight: 900;
        line-height: 1;
        box-shadow: 0 0 10px rgba(255, 54, 95, 0.66);
      }

      .post-copy {
        position: relative;
        z-index: 18;
        max-height: 25vh;
        overflow-y: auto;
        margin: 10px 14px;
        padding: 10px 12px;
        border-radius: 16px;
        background: rgba(0, 14, 9, 0.35);
        scrollbar-width: thin;
      }

      .post-title {
        margin: 0 0 7px;
        color: #ffffff;
        font-size: clamp(17px, 4.6vw, 22px);
        font-weight: 900;
        line-height: 1.26;
        overflow-wrap: anywhere;
        text-shadow:
          0 0 7px rgba(255, 255, 255, 0.27),
          0 0 15px rgba(93, 255, 177, 0.14);
      }

      .post-message {
        margin: 0;
        color: #d8ffea;
        font-size: clamp(14px, 4vw, 17px);
        font-weight: 400;
        line-height: 1.48;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        text-shadow: 0 0 7px rgba(111, 255, 189, 0.14);
      }

      .media-viewport {
        width: calc(100% - 24px);
        height: min(48vh, 500px);
        min-height: 250px;
        position: relative;
        z-index: 10;
        overflow: hidden;
        margin: 0 12px;
        border: 1px solid rgba(124, 255, 195, 0.18);
        border-radius: 20px;
        background: #000;
        box-shadow:
          0 15px 35px rgba(0, 0, 0, 0.55),
          0 0 20px rgba(56, 255, 166, 0.06);
      }

      .media-layer {
        width: 100%;
        height: 100%;
        display: grid;
        place-items: center;
      }

      .home-media {
        width: 100%;
        height: 100%;
        display: block;
        border: 0;
        object-fit: contain;
        background: #000;
      }

      .embed-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 20px;
        color: rgba(220, 255, 234, 0.70);
        background:
          radial-gradient(circle, #143b2d 0%, #05120d 65%, #010403 100%);
        text-align: center;
      }

      .embed-placeholder-icon {
        font-size: 38px;
        text-shadow: 0 0 15px rgba(104, 255, 189, 0.5);
      }

      .social-action-bar {
        position: absolute;
        left: 12px;
        right: 12px;
        bottom: max(18px, env(safe-area-inset-bottom));
        z-index: 30;
        min-height: 58px;
        display: grid;
        grid-template-columns: 1fr 1fr 1fr auto;
        align-items: center;
        gap: 5px;
        padding: 7px;
        border: 1px solid rgba(111, 255, 190, 0.24);
        border-radius: 21px;
        background: rgba(1, 18, 12, 0.80);
        backdrop-filter: blur(18px);
        box-shadow:
          0 0 24px rgba(50, 255, 166, 0.10),
          inset 0 0 17px rgba(255, 255, 255, 0.025);
      }

      .metric-group,
      .action-button {
        min-width: 0;
        min-height: 43px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 0 4px;
        border: 0;
        border-radius: 14px;
        color: #ecfff4;
        background: transparent;
        font-size: 13px;
        font-weight: 800;
      }

      .action-button {
        cursor: pointer;
      }

      .action-button:active,
      .create-post-cta:active,
      .inbox-button:active {
        transform: scale(0.96);
      }

      .action-symbol {
        color: #b9ffda;
        font-size: 21px;
        line-height: 1;
        filter: drop-shadow(0 0 5px rgba(90, 255, 181, 0.45));
      }

      .share-symbol {
        font-size: 24px;
      }

      .create-post-cta {
        min-height: 43px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 3px;
        padding: 0 12px;
        border: 1px solid rgba(118, 255, 195, 0.44);
        border-radius: 15px;
        color: white;
        background:
          linear-gradient(145deg, rgba(37, 181, 119, 0.35), rgba(5, 78, 49, 0.38));
        font-size: 12px;
        font-weight: 900;
        cursor: pointer;
        box-shadow:
          0 0 13px rgba(53, 255, 170, 0.15),
          inset 0 0 9px rgba(255, 255, 255, 0.04);
      }

      .create-post-plus {
        font-size: 21px;
        line-height: 1;
      }

      .screen-scanlines,
      .screen-reflection,
      .screen-vignette {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }

      .screen-scanlines {
        z-index: 50;
        opacity: 0.14;
        background:
          repeating-linear-gradient(
            to bottom,
            transparent 0,
            transparent 3px,
            rgba(0, 0, 0, 0.72) 4px
          );
        animation: scanMove 7s linear infinite;
      }

      .screen-reflection {
        z-index: 51;
        border-radius: inherit;
        opacity: 0.75;
        background:
          linear-gradient(
            118deg,
            rgba(255, 255, 255, 0.12) 0%,
            rgba(255, 255, 255, 0.028) 21%,
            transparent 42%
          );
      }

      .screen-vignette {
        z-index: 52;
        border-radius: inherit;
        box-shadow:
          inset 0 0 62px rgba(0, 0, 0, 0.84),
          inset 0 0 7px rgba(105, 255, 190, 0.10);
      }

      .modal-overlay {
        position: fixed;
        inset: 0;
        z-index: 10000;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        padding: 0;
        background: rgba(0, 5, 3, 0.90);
        backdrop-filter: blur(8px);
      }

      .modal-card {
        width: 100%;
        max-width: 460px;
        max-height: 93vh;
        overflow-y: auto;
        padding: 18px 18px 26px;
        border: 1px solid rgba(118, 255, 194, 0.24);
        border-radius: 24px 24px 0 0;
        color: #effff6;
        background:
          radial-gradient(circle at top, #16382b 0%, #07160f 45%, #020806 100%);
        box-shadow:
          0 -18px 50px rgba(0, 0, 0, 0.55),
          inset 0 0 24px rgba(84, 255, 177, 0.05);
        scrollbar-width: thin;
      }

      .modal-header {
        position: sticky;
        top: -18px;
        z-index: 4;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin: -18px -18px 12px;
        padding: 18px;
        border-bottom: 1px solid rgba(123, 255, 194, 0.12);
        background: rgba(4, 19, 13, 0.94);
        backdrop-filter: blur(16px);
      }

      .modal-header h2 {
        margin: 0;
        color: #baffd8;
        font-size: 19px;
        font-weight: 900;
        text-shadow: 0 0 9px rgba(87, 255, 175, 0.34);
      }

      .modal-close {
        width: 38px;
        height: 38px;
        display: grid;
        place-items: center;
        padding: 0;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 50%;
        color: white;
        background: rgba(255, 255, 255, 0.06);
        font-size: 23px;
        cursor: pointer;
      }

      .form-section {
        margin-bottom: 18px;
        padding-bottom: 18px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }

      .form-section-last {
        border-bottom: 0;
      }

      .section-heading {
        margin-bottom: 10px;
        color: #78ffc0;
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 1px;
        text-transform: uppercase;
      }

      .modal-card label {
        display: block;
        margin: 0 0 6px;
        color: #e6fff0;
        font-size: 13px;
        font-weight: 700;
      }

      .modal-card input,
      .modal-card textarea {
        width: 100%;
        min-height: 48px;
        margin: 0 0 6px;
        padding: 12px 13px;
        border: 1px solid rgba(136, 255, 200, 0.18);
        border-radius: 11px;
        outline: none;
        color: white;
        background: rgba(0, 10, 7, 0.60);
        font: inherit;
      }

      .modal-card textarea {
        min-height: 86px;
        resize: vertical;
      }

      .modal-card input:focus,
      .modal-card textarea:focus {
        border-color: rgba(104, 255, 187, 0.62);
        box-shadow: 0 0 0 3px rgba(77, 255, 169, 0.08);
      }

      .field-help {
        margin: 0 0 12px;
        color: rgba(207, 255, 226, 0.59);
        font-size: 11px;
        line-height: 1.45;
      }

      .file-picker {
        min-height: 50px;
        display: flex !important;
        align-items: center;
        padding: 12px 13px;
        border: 1px dashed rgba(123, 255, 196, 0.36);
        border-radius: 11px;
        background: rgba(29, 101, 69, 0.11);
        cursor: pointer;
      }

      .file-picker input {
        position: absolute;
        width: 1px;
        height: 1px;
        opacity: 0;
        overflow: hidden;
      }

      .preview-wrap {
        margin: 10px 0 14px;
      }

      .media-preview {
        width: 100%;
        max-height: 200px;
        display: block;
        object-fit: contain;
        border: 1px solid rgba(112, 255, 190, 0.24);
        border-radius: 12px;
        background: #000;
      }

      .logo-preview {
        width: 60px;
        height: 60px;
        display: block;
        object-fit: cover;
        border: 2px solid #70ffc0;
        border-radius: 50%;
      }

      .save-button,
      .cancel-button {
        width: 100%;
        min-height: 50px;
        padding: 13px;
        border-radius: 13px;
        font-size: 15px;
        font-weight: 900;
        cursor: pointer;
      }

      .save-button {
        border: 1px solid rgba(126, 255, 197, 0.42);
        color: white;
        background:
          linear-gradient(145deg, #18885a, #0b5e3b);
        box-shadow: 0 0 15px rgba(46, 255, 156, 0.18);
      }

      .save-button:disabled {
        opacity: 0.65;
        cursor: wait;
      }

      .cancel-button {
        margin-top: 10px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        color: #d7eee0;
        background: transparent;
      }

      .comments-post-name {
        margin: 4px 0 0;
        color: rgba(210, 255, 228, 0.61);
        font-size: 11px;
      }

      .comment-form {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        margin-bottom: 18px;
        padding-bottom: 18px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }

      .comment-flag-preview,
      .comment-avatar {
        width: 45px;
        height: 45px;
        flex: 0 0 45px;
        display: grid;
        place-items: center;
        overflow: hidden;
        border: 2px solid rgba(107, 255, 188, 0.75);
        border-radius: 50%;
        background: #f7fff9;
        font-size: 25px;
        box-shadow: 0 0 12px rgba(65, 255, 166, 0.20);
      }

      .comment-fields {
        min-width: 0;
        flex: 1;
      }

      .comments-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .no-comments {
        padding: 22px 12px;
        color: rgba(211, 255, 228, 0.58);
        text-align: center;
      }

      .comment-item {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 11px;
        border: 1px solid rgba(121, 255, 194, 0.13);
        border-radius: 16px;
        background: rgba(14, 58, 40, 0.17);
      }

      .comment-body {
        min-width: 0;
        flex: 1;
      }

      .comment-country {
        color: #aaffd2;
        font-size: 12px;
        font-weight: 900;
      }

      .comment-body p {
        margin: 5px 0 0;
        color: #eafff2;
        font-size: 14px;
        line-height: 1.45;
        overflow-wrap: anywhere;
      }

      .zoom-overlay {
        position: fixed;
        inset: 0;
        z-index: 10001;
        display: grid;
        place-items: center;
        padding: 18px;
        background: rgba(0, 0, 0, 0.95);
        cursor: zoom-out;
      }

      .zoom-image {
        max-width: 92vw;
        max-height: 90vh;
        display: block;
        object-fit: contain;
        border: 2px solid rgba(108, 255, 190, 0.75);
        border-radius: 16px;
        box-shadow: 0 0 24px rgba(58, 255, 169, 0.35);
      }

      .loading-state,
      .empty-state {
        position: fixed;
        top: 50%;
        left: 50%;
        z-index: 3;
        transform: translate(-50%, -50%);
        color: #c5ffe0;
        text-align: center;
      }

      .empty-state {
        width: min(88%, 420px);
      }

      .empty-button {
        min-height: 48px;
        margin-top: 12px;
        padding: 0 18px;
        border: 1px solid rgba(112, 255, 192, 0.45);
        border-radius: 15px;
        color: white;
        background: #116d47;
        font-weight: 900;
        cursor: pointer;
      }

      @keyframes screenFlicker {
        0%, 18%, 22%, 24%, 55%, 100% {
          filter: brightness(1);
        }

        20% {
          filter: brightness(0.97);
        }

        23% {
          filter: brightness(1.025);
        }

        57% {
          filter: brightness(0.985);
        }
      }

      @keyframes scanMove {
        from {
          background-position: 0 0;
        }

        to {
          background-position: 0 16px;
        }
      }

      @media (min-width: 700px) {
        .home-feed {
          padding: 12px 0;
        }

        .home-post {
          height: calc(100svh - 24px);
          min-height: calc(100svh - 24px);
          border-radius: 28px;
        }
      }

      @media (max-height: 720px) {
        .post-header {
          min-height: 66px;
          margin-top: 6px;
          padding: 7px 10px;
        }

        .profile-picture-button {
          width: 46px;
          height: 46px;
          flex-basis: 46px;
        }

        .post-copy {
          max-height: 21vh;
          margin-top: 6px;
          margin-bottom: 6px;
          padding-top: 7px;
          padding-bottom: 7px;
        }

        .media-viewport {
          height: 44vh;
          min-height: 220px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .crt-screen,
        .screen-scanlines {
          animation: none;
        }
      }
    `}</style>
  );
}

export default Home;