import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from "react";
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

  const [newCreatorName, setNewCreatorName] = useState("");
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
  const [localReactions, setLocalReactions] = useState({});

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
            creator_name: data.creator_name || "",
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
            reaction_count: 0,
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
    setNewCreatorName("");
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
    const creatorName = newCreatorName.trim();
    const identity = newCreatorIdentity.trim();
    const mediaToSave = newMediaUrl.trim();

    if (!creatorName) {
      alert("Please enter a creator name.");
      return;
    }

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

      formData.append("creator_name", creatorName);
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
    newCreatorName,
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

  const reactToPost = useCallback(async (post) => {
    const postId = String(post?.id ?? "");
    if (!postId) return;

    const storageKey = `home-reacted-${postId}`;

    if (sessionStorage.getItem(storageKey)) {
      return;
    }

    sessionStorage.setItem(storageKey, "true");

    setLocalReactions((current) => ({
      ...current,
      [postId]: (Number(current[postId]) || 0) + 1,
    }));

    try {
      const response = await fetch(`${API_URL}/api/home/react`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ post_id: postId }),
      });

      const data = await readJsonSafely(response);

      if (data.success && Number.isFinite(Number(data.reaction_count))) {
        setPosts((currentPosts) =>
          currentPosts.map((item) =>
            String(item.id) === postId
              ? { ...item, reaction_count: Number(data.reaction_count) }
              : item
          )
        );

        setLocalReactions((current) => ({
          ...current,
          [postId]: 0,
        }));
      }
    } catch (error) {
      console.warn(
        "Reaction was added locally. Worker route /api/home/react is not ready yet:",
        error
      );
    }
  }, [readJsonSafely]);

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
        <FeedXTopBar openEditor={openEditor} />
        <div className="loading-state">Loading...</div>
        <HomeStyles />
      </div>
    );
  }

  if (!memoizedPosts.length) {
    return (
      <div className="home-page">
        <FeedXTopBar openEditor={openEditor} />

        <div className="empty-state">
          <p>No posts yet. Create your first post!</p>

          <button type="button" onClick={openEditor} className="empty-button">
            ＋ Create Post
          </button>
        </div>

        {showEditor && (
          <EditorModal
            newCreatorName={newCreatorName}
            setNewCreatorName={setNewCreatorName}
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
      <FeedXTopBar openEditor={openEditor} />

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
          const reactionCount =
            Number(post.reaction_count || post.like_count || 0) +
            Number(localReactions[postId] || 0);
          const creatorDisplayName =
            post.creator_name?.trim() ||
            post.brand_name?.trim() ||
            "Creator";

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
                    {creatorDisplayName}
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

                <button
                  type="button"
                  className="post-menu-button"
                  aria-label="Post options"
                  title="Post options"
                >
                  ⋮
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
                <div className="metric-pill" title="Views">
                  <span className="action-symbol eye-symbol" aria-hidden="true">
                    ◉
                  </span>
                  <span>{formatCount(viewerCount)}</span>
                </div>

                <button
                  type="button"
                  className="action-pill"
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
                  className="action-pill"
                  onClick={() => sharePost(post)}
                  aria-label="Share post"
                >
                  <span className="action-symbol share-symbol" aria-hidden="true">
                    ↗
                  </span>
                  <span>Share</span>
                </button>

                <button
                  type="button"
                  className="action-pill heart-action"
                  onClick={() => reactToPost(post)}
                  aria-label="Like post"
                >
                  <span className="heart-icon" aria-hidden="true">♥</span>
                  <span>{formatCount(reactionCount)}</span>
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
          newCreatorName={newCreatorName}
          setNewCreatorName={setNewCreatorName}
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

const FeedXTopBar = memo(({ openEditor }) => (
  <header className="feedx-topbar">
    <h1 className="feedx-logo">
      Feed<span>X</span>
    </h1>

    <button
      type="button"
      className="top-create-button"
      onClick={openEditor}
      aria-label="Create post"
      title="Create post"
    >
      ＋
    </button>
  </header>
));

FeedXTopBar.displayName = "FeedXTopBar";

const EditorModal = memo(
  ({
    newCreatorName,
    setNewCreatorName,
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
          <div className="section-heading">Public profile</div>

          <label htmlFor="field-creator-name">Creator Name</label>
          <input
            id="field-creator-name"
            type="text"
            placeholder="Madman Official"
            value={newCreatorName}
            onChange={(event) => setNewCreatorName(event.target.value)}
          />

          <p className="field-help">
            This is the public name shown on your post.
          </p>
        </div>

        <div className="form-section">
          <div className="section-heading">Private contact</div>

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
      :root {
        --page-bg: #020712;
        --card-bg: #06101f;
        --card-bg-soft: #08172a;
        --blue: #087cff;
        --blue-bright: #168bff;
        --blue-border: rgba(22, 139, 255, 0.72);
        --blue-soft: rgba(22, 139, 255, 0.15);
        --text: #ffffff;
        --muted: #9ba8ba;
        --danger: #ff334f;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body,
      #root {
        min-height: 100%;
        margin: 0;
        background: var(--page-bg);
      }

      button,
      input,
      textarea {
        font: inherit;
      }

      .home-page {
        width: 100%;
        min-height: 100svh;
        color: var(--text);
        background:
          radial-gradient(circle at 50% 0%, rgba(8, 124, 255, 0.10), transparent 34%),
          var(--page-bg);
      }

      .feedx-topbar {
        width: min(calc(100% - 24px), 680px);
        min-height: 72px;
        margin: 0 auto;
        padding: max(12px, env(safe-area-inset-top)) 4px 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .feedx-logo {
        margin: 0;
        color: #ffffff;
        font-size: clamp(34px, 9vw, 48px);
        font-weight: 900;
        line-height: 1;
        letter-spacing: -1.5px;
      }

      .feedx-logo span {
        color: var(--blue);
      }

      .top-create-button {
        width: 54px;
        height: 54px;
        flex: 0 0 54px;
        display: grid;
        place-items: center;
        padding: 0;
        border: 0;
        border-radius: 50%;
        color: #ffffff;
        background: linear-gradient(145deg, var(--blue-bright), #0067ee);
        font-size: 34px;
        font-weight: 300;
        line-height: 1;
        cursor: pointer;
        box-shadow: 0 10px 28px rgba(8, 124, 255, 0.28);
      }

      .home-feed {
        width: 100%;
        min-height: calc(100svh - 72px);
        padding: 0 0 max(28px, env(safe-area-inset-bottom));
        overflow-x: hidden;
      }

      .home-post {
        width: min(calc(100% - 20px), 680px);
        margin: 10px auto 18px;
        padding: 0 0 12px;
        position: relative;
        overflow: hidden;
        isolation: isolate;
        border: 1px solid var(--blue-border);
        border-radius: 24px;
        background:
          linear-gradient(
            180deg,
            rgba(7, 19, 36, 0.98),
            rgba(2, 10, 22, 0.98)
          );
        box-shadow:
          0 16px 38px rgba(0, 0, 0, 0.55),
          0 0 18px rgba(8, 124, 255, 0.10);
      }

      .crt-screen {
        animation: screenFlicker 7s infinite;
      }

      .post-header {
        position: relative;
        z-index: 10;
        min-height: 82px;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 12px 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.045);
        background: rgba(4, 14, 29, 0.50);
      }

      .profile-picture-button {
        width: 58px;
        height: 58px;
        flex: 0 0 58px;
        padding: 0;
        overflow: hidden;
        border: 2px solid var(--blue);
        border-radius: 50%;
        background: #030916;
        cursor: pointer;
        box-shadow: 0 0 16px rgba(8, 124, 255, 0.30);
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
        color: #ffffff;
        font-size: clamp(16px, 4.5vw, 20px);
        font-weight: 900;
        line-height: 1.2;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .post-time {
        margin-top: 6px;
        color: var(--muted);
        font-size: clamp(11px, 3.2vw, 13px);
        line-height: 1.2;
      }

      .inbox-button,
      .post-menu-button {
        border: 0;
        color: #ffffff;
        background: transparent;
        cursor: pointer;
      }

      .inbox-button {
        width: 48px;
        height: 48px;
        flex: 0 0 48px;
        position: relative;
        display: grid;
        place-items: center;
        padding: 0;
        border: 1px solid rgba(22, 139, 255, 0.58);
        border-radius: 50%;
        background: rgba(8, 124, 255, 0.06);
      }

      .inbox-envelope {
        font-size: 24px;
        line-height: 1;
      }

      .unread-badge {
        min-width: 20px;
        height: 20px;
        position: absolute;
        top: -5px;
        right: -3px;
        display: grid;
        place-items: center;
        padding: 0 5px;
        border: 2px solid #06101f;
        border-radius: 11px;
        color: #ffffff;
        background: var(--danger);
        font-size: 10px;
        font-weight: 900;
      }

      .post-menu-button {
        width: 28px;
        height: 44px;
        flex: 0 0 28px;
        display: grid;
        place-items: center;
        padding: 0;
        font-size: 28px;
        line-height: 1;
      }

      .post-copy {
        position: relative;
        z-index: 5;
        padding: 14px 18px 12px;
        text-align: center;
      }

      .post-title {
        margin: 0 0 8px;
        color: #ffffff;
        font-size: clamp(18px, 5vw, 23px);
        font-weight: 900;
        line-height: 1.26;
        overflow-wrap: anywhere;
      }

      .post-message {
        margin: 0;
        color: #f2f5fb;
        font-size: clamp(15px, 4.2vw, 18px);
        font-weight: 400;
        line-height: 1.48;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }

      .media-viewport {
        width: calc(100% - 24px);
        min-height: 220px;
        max-height: 58svh;
        aspect-ratio: 9 / 12;
        position: relative;
        z-index: 4;
        overflow: hidden;
        margin: 0 12px;
        border: 1px solid rgba(22, 139, 255, 0.28);
        border-radius: 22px;
        background: #000000;
        box-shadow: 0 14px 32px rgba(0, 0, 0, 0.50);
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
        background: #000000;
      }

      .embed-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 20px;
        color: #dce7f7;
        background:
          radial-gradient(circle, rgba(8, 124, 255, 0.17), transparent 54%),
          #020712;
        text-align: center;
      }

      .embed-placeholder-icon {
        font-size: 40px;
      }

      .social-action-bar {
        position: relative;
        z-index: 8;
        width: calc(100% - 24px);
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 8px;
        margin: 12px 12px 0;
      }

      .metric-pill,
      .action-pill {
        min-width: 0;
        min-height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        padding: 0 8px;
        border: 1px solid rgba(22, 139, 255, 0.17);
        border-radius: 18px;
        color: #ffffff;
        background: rgba(3, 11, 25, 0.72);
        font-size: clamp(12px, 3.5vw, 15px);
        font-weight: 800;
      }

      .action-pill {
        cursor: pointer;
      }

      .action-pill:active,
      .top-create-button:active,
      .inbox-button:active,
      .profile-picture-button:active {
        transform: scale(0.97);
      }

      .action-symbol {
        color: #ffffff;
        font-size: 22px;
        line-height: 1;
      }

      .eye-symbol {
        transform: scaleX(1.2);
      }

      .share-symbol {
        font-size: 25px;
      }

      .heart-icon {
        color: #ff3156;
        font-size: 25px;
        line-height: 1;
        filter: drop-shadow(0 0 7px rgba(255, 49, 86, 0.20));
      }

      .screen-scanlines,
      .screen-reflection,
      .screen-vignette {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }

      .screen-scanlines {
        z-index: 30;
        opacity: 0.035;
        background:
          repeating-linear-gradient(
            to bottom,
            transparent 0,
            transparent 4px,
            rgba(255, 255, 255, 0.16) 5px
          );
      }

      .screen-reflection {
        z-index: 31;
        opacity: 0.12;
        background:
          linear-gradient(
            118deg,
            rgba(255, 255, 255, 0.13) 0%,
            rgba(255, 255, 255, 0.025) 22%,
            transparent 43%
          );
      }

      .screen-vignette {
        z-index: 32;
        border-radius: inherit;
        box-shadow: inset 0 0 28px rgba(0, 0, 0, 0.34);
      }

      .modal-overlay {
        position: fixed;
        inset: 0;
        z-index: 10000;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        padding: 0;
        background: rgba(0, 3, 10, 0.91);
        backdrop-filter: blur(8px);
      }

      .modal-card {
        width: 100%;
        max-width: 470px;
        max-height: 93svh;
        overflow-y: auto;
        padding: 18px 18px 26px;
        border: 1px solid rgba(22, 139, 255, 0.30);
        border-radius: 24px 24px 0 0;
        color: #ffffff;
        background:
          radial-gradient(circle at top, rgba(8, 124, 255, 0.14), transparent 34%),
          #06101f;
        box-shadow: 0 -18px 50px rgba(0, 0, 0, 0.55);
      }

      .modal-header {
        position: sticky;
        top: -18px;
        z-index: 4;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin: -18px -18px 14px;
        padding: 18px;
        border-bottom: 1px solid rgba(22, 139, 255, 0.16);
        background: rgba(4, 13, 29, 0.96);
        backdrop-filter: blur(16px);
      }

      .modal-header h2 {
        margin: 0;
        color: #ffffff;
        font-size: 19px;
        font-weight: 900;
      }

      .modal-close {
        width: 38px;
        height: 38px;
        display: grid;
        place-items: center;
        padding: 0;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 50%;
        color: #ffffff;
        background: rgba(255, 255, 255, 0.05);
        font-size: 23px;
        cursor: pointer;
      }

      .form-section {
        margin-bottom: 18px;
        padding-bottom: 18px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.075);
      }

      .form-section-last {
        border-bottom: 0;
      }

      .section-heading {
        margin-bottom: 10px;
        color: #64b3ff;
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 1px;
        text-transform: uppercase;
      }

      .modal-card label {
        display: block;
        margin: 0 0 6px;
        color: #e8eef8;
        font-size: 13px;
        font-weight: 700;
      }

      .modal-card input,
      .modal-card textarea {
        width: 100%;
        min-height: 48px;
        margin: 0 0 6px;
        padding: 12px 13px;
        border: 1px solid rgba(22, 139, 255, 0.22);
        border-radius: 11px;
        outline: none;
        color: #ffffff;
        background: rgba(1, 7, 18, 0.74);
      }

      .modal-card textarea {
        min-height: 88px;
        resize: vertical;
      }

      .modal-card input:focus,
      .modal-card textarea:focus {
        border-color: rgba(22, 139, 255, 0.78);
        box-shadow: 0 0 0 3px rgba(22, 139, 255, 0.09);
      }

      .field-help {
        margin: 0 0 12px;
        color: var(--muted);
        font-size: 11px;
        line-height: 1.45;
      }

      .file-picker {
        min-height: 50px;
        display: flex !important;
        align-items: center;
        padding: 12px 13px;
        border: 1px dashed rgba(22, 139, 255, 0.40);
        border-radius: 11px;
        background: rgba(8, 124, 255, 0.06);
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
        border: 1px solid rgba(22, 139, 255, 0.28);
        border-radius: 12px;
        background: #000000;
      }

      .logo-preview {
        width: 60px;
        height: 60px;
        display: block;
        object-fit: cover;
        border: 2px solid var(--blue);
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
        border: 1px solid rgba(22, 139, 255, 0.48);
        color: #ffffff;
        background: linear-gradient(145deg, var(--blue-bright), #0064df);
        box-shadow: 0 0 15px rgba(8, 124, 255, 0.18);
      }

      .save-button:disabled {
        opacity: 0.65;
        cursor: wait;
      }

      .cancel-button {
        margin-top: 10px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        color: #d9e2ef;
        background: transparent;
      }

      .comments-post-name {
        margin: 4px 0 0;
        color: var(--muted);
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
        border: 2px solid var(--blue);
        border-radius: 50%;
        background: #ffffff;
        font-size: 25px;
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
        color: var(--muted);
        text-align: center;
      }

      .comment-item {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 11px;
        border: 1px solid rgba(22, 139, 255, 0.15);
        border-radius: 16px;
        background: rgba(8, 124, 255, 0.05);
      }

      .comment-body {
        min-width: 0;
        flex: 1;
      }

      .comment-country {
        color: #7dbbff;
        font-size: 12px;
        font-weight: 900;
      }

      .comment-body p {
        margin: 5px 0 0;
        color: #f4f7fb;
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
        border: 2px solid var(--blue);
        border-radius: 16px;
        box-shadow: 0 0 24px rgba(8, 124, 255, 0.30);
      }

      .loading-state,
      .empty-state {
        width: min(88%, 420px);
        margin: 110px auto 0;
        color: #bcd9ff;
        text-align: center;
      }

      .empty-button {
        min-height: 48px;
        margin-top: 12px;
        padding: 0 18px;
        border: 1px solid rgba(22, 139, 255, 0.50);
        border-radius: 15px;
        color: #ffffff;
        background: #087cff;
        font-weight: 900;
        cursor: pointer;
      }

      @keyframes screenFlicker {
        0%, 19%, 21%, 54%, 100% {
          filter: brightness(1);
        }

        20% {
          filter: brightness(0.992);
        }

        55% {
          filter: brightness(1.006);
        }
      }

      @media (max-width: 390px) {
        .feedx-topbar {
          min-height: 66px;
        }

        .top-create-button {
          width: 48px;
          height: 48px;
          flex-basis: 48px;
          font-size: 30px;
        }

        .post-header {
          gap: 7px;
          padding-left: 9px;
          padding-right: 7px;
        }

        .profile-picture-button {
          width: 52px;
          height: 52px;
          flex-basis: 52px;
        }

        .inbox-button {
          width: 43px;
          height: 43px;
          flex-basis: 43px;
        }

        .social-action-bar {
          gap: 5px;
        }

        .metric-pill,
        .action-pill {
          min-height: 44px;
          gap: 4px;
          padding: 0 4px;
          border-radius: 15px;
        }

        .action-symbol,
        .heart-icon {
          font-size: 20px;
        }
      }

      @media (max-height: 720px) {
        .feedx-topbar {
          min-height: 62px;
          padding-top: max(8px, env(safe-area-inset-top));
          padding-bottom: 7px;
        }

        .feedx-logo {
          font-size: 34px;
        }

        .top-create-button {
          width: 46px;
          height: 46px;
          flex-basis: 46px;
          font-size: 28px;
        }

        .home-post {
          margin-top: 6px;
        }

        .post-header {
          min-height: 70px;
          padding-top: 9px;
          padding-bottom: 9px;
        }

        .post-copy {
          padding-top: 10px;
          padding-bottom: 9px;
        }

        .media-viewport {
          max-height: 54svh;
          min-height: 210px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .crt-screen {
          animation: none;
        }
      }
    `}</style>
  );
}

export default Home;