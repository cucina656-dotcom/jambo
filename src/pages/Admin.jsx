import { useState, useEffect } from "react";

function Admin() {
  const [pin, setPin] = useState("");
  const [feedxPosts, setFeedxPosts] = useState([]);
  const [media, setMedia] = useState([]);
  const [dedications, setDedications] = useState([]);
  const [comments, setComments] = useState([]);
  const [homeContent, setHomeContent] = useState([]);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("feedx");
  const [showAddComment, setShowAddComment] = useState(false);
  const [newComment, setNewComment] = useState({
    dedication_id: "",
    comment: "",
    commenter_whatsapp: "",
  });

  const isAdmin = pin === "101";

  const loadFeedxPosts = async () => {
    if (!isAdmin) return;
    setMessage("Loading FeedX posts...");
    try {
      const response = await fetch(
        "https://kitchenbrain.cucina656.workers.dev/api/admin/feedx-posts",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin }),
        }
      );
      const data = await response.json();
      if (!data.success) {
        setMessage(data.message || "Failed to load FeedX posts");
        return;
      }
      setFeedxPosts(data.posts || []);
      setMessage(`FeedX posts loaded successfully (${data.posts?.length || 0} posts)`);
    } catch (error) {
      setMessage("Failed to connect to Worker API");
      console.error(error);
    }
  };

  const deleteFeedxPost = async (postId) => {
    if (!isAdmin) return;
    if (!confirm(`Are you sure you want to delete this FeedX post?`)) return;
    
    setMessage("Deleting post...");
    try {
      const response = await fetch(
        "https://kitchenbrain.cucina656.workers.dev/api/admin/delete-feedx-post",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin, post_id: postId }),
        }
      );
      const data = await response.json();
      if (!data.success) {
        setMessage(data.message || "Failed to delete post");
        return;
      }
      setMessage(`Post deleted successfully`);
      await loadFeedxPosts(); // Refresh the list
    } catch (error) {
      setMessage("Failed to connect to Worker API");
      console.error(error);
    }
  };

  const loadMediaRanking = async () => {
    if (!isAdmin) return;
    setMessage("Loading media ranking...");
    try {
      const response = await fetch(
        "https://kitchenbrain.cucina656.workers.dev/api/admin/media-ranking",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin }),
        }
      );
      const data = await response.json();
      if (!data.success) {
        setMessage(data.message || "Admin PIN failed");
        return;
      }
      setMedia(data.media || []);
      setMessage("Media ranking loaded");
    } catch (error) {
      setMessage("Failed to connect to Worker API");
      console.error(error);
    }
  };

  const loadDedications = async () => {
    if (!isAdmin) return;
    setMessage("Loading dedications...");
    try {
      const response = await fetch(
        "https://kitchenbrain.cucina656.workers.dev/api/admin/dedications"
      );
      const data = await response.json();
      if (!data.success) {
        setMessage(data.message || "Failed to load dedications");
        return;
      }
      setDedications(data.dedications || []);
      setMessage("Dedications loaded successfully");
    } catch (error) {
      setMessage("Failed to connect to Worker API");
      console.error(error);
    }
  };

  const loadComments = async () => {
    if (!isAdmin) return;
    setMessage("Loading comments...");
    try {
      const response = await fetch(
        "https://kitchenbrain.cucina656.workers.dev/api/admin/dedication-comments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ pin }),
        }
      );
      const data = await response.json();
      if (!data.success) {
        setMessage(data.message || "Failed to load comments");
        return;
      }
      setComments(data.comments || []);
      setMessage("Comments loaded successfully");
    } catch (error) {
      setMessage("Failed to connect to Worker API");
      console.error(error);
    }
  };

  const loadHomeContent = async () => {
    if (!isAdmin) return;
    setMessage("Loading home content...");
    try {
      const response = await fetch(
        "https://kitchenbrain.cucina656.workers.dev/api/admin/home-content",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin }),
        }
      );
      const data = await response.json();
      if (!data.success) {
        setMessage(data.message || "Failed to load home content");
        return;
      }
      setHomeContent(data.content || []);
      setMessage("Home content loaded successfully");
    } catch (error) {
      setMessage("Failed to connect to Worker API");
      console.error(error);
    }
  };

  // Auto-load FeedX posts when PIN becomes valid
  useEffect(() => {
    if (isAdmin) {
      loadFeedxPosts();
      loadDedications();
      loadComments();
    }
  }, [pin]);

  const updateHomeVisibility = async (id, isVisible) => {
    if (!isAdmin) return;
    try {
      const response = await fetch(
        "https://kitchenbrain.cucina656.workers.dev/api/admin/home-visibility",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin, id, is_visible: isVisible ? 1 : 0 }),
        }
      );
      const data = await response.json();
      if (!data.success) {
        setMessage(data.message || "Failed to update visibility");
        return;
      }
      setMessage(data.message || "Visibility updated");
      await loadHomeContent();
    } catch (error) {
      setMessage("Failed to connect to Worker API");
      console.error(error);
    }
  };

  const deleteHomeContent = async (id) => {
    if (!isAdmin) return;
    if (!confirm("Are you sure you want to delete this home content permanently?")) return;
    try {
      const response = await fetch(
        "https://kitchenbrain.cucina656.workers.dev/api/admin/delete-home-content",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin, id }),
        }
      );
      const data = await response.json();
      if (!data.success) {
        setMessage(data.message || "Failed to delete content");
        return;
      }
      setMessage(data.message || "Content deleted");
      await loadHomeContent();
    } catch (error) {
      setMessage("Failed to connect to Worker API");
      console.error(error);
    }
  };

  const updateHomeContentField = async (id, field, value) => {
    if (!isAdmin) return;
    try {
      const response = await fetch(
        "https://kitchenbrain.cucina656.workers.dev/api/admin/update-home-content",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin, id, [field]: value }),
        }
      );
      const data = await response.json();
      if (!data.success) {
        setMessage(data.message || "Failed to update content");
        return;
      }
      setMessage(data.message || "Content updated");
      await loadHomeContent();
    } catch (error) {
      setMessage("Failed to connect to Worker API");
      console.error(error);
    }
  };

  const addComment = async () => {
    if (!isAdmin) return;
    if (!newComment.dedication_id || !newComment.comment) {
      setMessage("Please fill in all required fields");
      return;
    }
    try {
      const response = await fetch(
        "https://kitchenbrain.cucina656.workers.dev/api/admin/add-dedication-comment",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pin: pin,
            dedication_id: Number(newComment.dedication_id),
            comment: newComment.comment,
            commenter_whatsapp: newComment.commenter_whatsapp,
          }),
        }
      );
      const data = await response.json();
      if (!data.success) {
        setMessage(data.message || "Failed to add comment");
        return;
      }
      setNewComment({
        dedication_id: "",
        comment: "",
        commenter_whatsapp: "",
      });
      setShowAddComment(false);
      await loadComments();
      await loadDedications();
      setMessage("Comment added successfully");
    } catch (error) {
      setMessage("Failed to connect to Worker API");
      console.error(error);
    }
  };

  const deleteComment = async (commentId) => {
    if (!isAdmin) return;
    if (!confirm("Are you sure you want to delete this comment?")) return;
    try {
      const response = await fetch(
        "https://kitchenbrain.cucina656.workers.dev/api/admin/delete-dedication-comment",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pin: pin,
            comment_id: commentId,
          }),
        }
      );
      const data = await response.json();
      if (!data.success) {
        setMessage(data.message || "Failed to delete comment");
        return;
      }
      await loadComments();
      await loadDedications();
      setMessage("Comment deleted successfully");
    } catch (error) {
      setMessage("Failed to connect to Worker API");
      console.error(error);
    }
  };

  const updateDedication = async (id) => {
    if (!isAdmin) return;
    try {
      const updatedDedication = dedications.find((d) => d.id === id);
      const response = await fetch(
        "https://kitchenbrain.cucina656.workers.dev/api/admin/update-dedication",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pin: pin,
            id: id,
            views: Number(updatedDedication.views) || 0,
            reaction_count: Number(updatedDedication.reaction_count) || 0,
            comment_count: Number(updatedDedication.comment_count) || 0,
            dedication_badge: updatedDedication.dedication_badge || "❤️",
          }),
        }
      );
      const data = await response.json();
      if (!data.success) {
        setMessage(data.message || "Failed to update dedication");
        return;
      }
      await loadDedications();
      setMessage("Dedication updated successfully");
    } catch (error) {
      setMessage("Failed to connect to Worker API");
      console.error(error);
    }
  };

  const deleteDedication = async (id) => {
    if (!isAdmin) return;
    if (!confirm("Are you sure you want to delete this dedication?")) return;
    try {
      const response = await fetch(
        "https://kitchenbrain.cucina656.workers.dev/api/admin/delete-dedication",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pin: pin,
            id: id,
          }),
        }
      );
      const data = await response.json();
      if (!data.success) {
        setMessage(data.message || "Failed to delete dedication");
        return;
      }
      await loadDedications();
      setMessage("Dedication deleted successfully");
    } catch (error) {
      setMessage("Failed to connect to Worker API");
      console.error(error);
    }
  };

  const handleFieldChange = (id, field, value) => {
    setDedications((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  };

  const handleSave = (id) => {
    const dedication = dedications.find((d) => d.id === id);
    if (dedication) {
      updateDedication(id);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return "0s";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  function getFlagFromWhatsapp(number = "") {
    if (number.startsWith("+250") || number.startsWith("250")) return "🇷🇼";
    if (number.startsWith("+254") || number.startsWith("254")) return "🇰🇪";
    if (number.startsWith("+256") || number.startsWith("256")) return "🇺🇬";
    if (number.startsWith("+255") || number.startsWith("255")) return "🇹🇿";
    if (number.startsWith("+257") || number.startsWith("257")) return "🇧🇮";
    if (number.startsWith("+243") || number.startsWith("243")) return "🇨🇩";
    return "🌍";
  }

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1>🔐 Admin Panel</h1>
      <input
        type="password"
        placeholder="Enter Admin PIN"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        style={{
          padding: "12px",
          width: "100%",
          maxWidth: "320px",
          borderRadius: "8px",
          border: "1px solid #ccc",
        }}
      />
      <br />
      <br />
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button disabled={!isAdmin} onClick={loadFeedxPosts}>Load FeedX Posts</button>
        <button disabled={!isAdmin} onClick={loadMediaRanking}>Load Media Ranking</button>
        <button disabled={!isAdmin} onClick={loadDedications}>Load Dedications</button>
        <button disabled={!isAdmin} onClick={loadComments}>Load Comments</button>
        <button disabled={!isAdmin} onClick={loadHomeContent}>Load Home Content</button>
      </div>
      {message && <p><strong>{message}</strong></p>}

      {/* Tab Navigation */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginTop: "20px",
          borderBottom: "1px solid #ddd",
          paddingBottom: "10px",
          flexWrap: "wrap",
        }}
      >
        <button
          disabled={!isAdmin}
          onClick={() => setActiveTab("feedx")}
          style={{
            padding: "10px 20px",
            background: activeTab === "feedx" ? "#007bff" : "transparent",
            color: activeTab === "feedx" ? "white" : "#333",
            border: "none",
            borderRadius: "4px",
            cursor: isAdmin ? "pointer" : "not-allowed",
            opacity: isAdmin ? 1 : 0.5,
          }}
        >
          📺 FeedX Posts ({feedxPosts.length})
        </button>
        <button
          disabled={!isAdmin}
          onClick={() => setActiveTab("dedications")}
          style={{
            padding: "10px 20px",
            background: activeTab === "dedications" ? "#007bff" : "transparent",
            color: activeTab === "dedications" ? "white" : "#333",
            border: "none",
            borderRadius: "4px",
            cursor: isAdmin ? "pointer" : "not-allowed",
            opacity: isAdmin ? 1 : 0.5,
          }}
        >
          🎵 Dedications
        </button>
        <button
          disabled={!isAdmin}
          onClick={() => setActiveTab("comments")}
          style={{
            padding: "10px 20px",
            background: activeTab === "comments" ? "#007bff" : "transparent",
            color: activeTab === "comments" ? "white" : "#333",
            border: "none",
            borderRadius: "4px",
            cursor: isAdmin ? "pointer" : "not-allowed",
            opacity: isAdmin ? 1 : 0.5,
          }}
        >
          💬 Comments
        </button>
        <button
          disabled={!isAdmin}
          onClick={() => setActiveTab("media")}
          style={{
            padding: "10px 20px",
            background: activeTab === "media" ? "#007bff" : "transparent",
            color: activeTab === "media" ? "white" : "#333",
            border: "none",
            borderRadius: "4px",
            cursor: isAdmin ? "pointer" : "not-allowed",
            opacity: isAdmin ? 1 : 0.5,
          }}
        >
          🏆 Media Ranking
        </button>
        <button
          disabled={!isAdmin}
          onClick={() => setActiveTab("home")}
          style={{
            padding: "10px 20px",
            background: activeTab === "home" ? "#007bff" : "transparent",
            color: activeTab === "home" ? "white" : "#333",
            border: "none",
            borderRadius: "4px",
            cursor: isAdmin ? "pointer" : "not-allowed",
            opacity: isAdmin ? 1 : 0.5,
          }}
        >
          🏠 Home Content
        </button>
      </div>

      {/* FeedX Posts Tab - Replaced Order Reports */}
      {activeTab === "feedx" && (
        <>
          <h2>📺 FeedX Post Management</h2>
          
          {feedxPosts.length === 0 && (
            <p>No FeedX posts found. Create posts from the Home page.</p>
          )}
          
          {feedxPosts.map((post) => (
            <div
              key={post.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "20px",
                background: "#fafafa",
                position: "relative",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "15px",
                }}
              >
                <div>
                  <p><strong>Post ID:</strong> {post.id}</p>
                  <p><strong>Title:</strong> {post.title || "Untitled"}</p>
                  <p>
                    <strong>Creator Type:</strong>{" "}
                    <span style={{
                      background: post.creator_type === "website" ? "#007bff" : "#25D366",
                      color: "white",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      display: "inline-block",
                    }}>
                      {post.creator_type || "unknown"}
                    </span>
                  </p>
                  <p><strong>Created:</strong> {post.created_at ? new Date(post.created_at).toLocaleString() : "N/A"}</p>
                </div>
                <div>
                  <p><strong>Media Type:</strong> {post.media_type || "N/A"}</p>
                  <p><strong>Watch Time:</strong> {formatTime(post.watch_seconds || 0)}</p>
                  <p><strong>Ngwino Clicks:</strong> {post.ngwino_clicks || 0}</p>
                  {post.last_watched_at && (
                    <p><small>Last watched: {new Date(post.last_watched_at).toLocaleString()}</small></p>
                  )}
                  {post.last_clicked_at && (
                    <p><small>Last click: {new Date(post.last_clicked_at).toLocaleString()}</small></p>
                  )}
                </div>
                <div>
                  {post.logo_url && (
                    <div>
                      <p><strong>Logo:</strong></p>
                      <img
                        src={post.logo_url}
                        alt="Logo"
                        style={{
                          width: "50px",
                          height: "50px",
                          borderRadius: "50%",
                          objectFit: "cover",
                          border: "1px solid #ddd",
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                  )}
                  {post.media_url && (
                    <div style={{ marginTop: "8px" }}>
                      <p><strong>Media:</strong></p>
                      {post.media_type === "image" ? (
                        <img
                          src={post.media_url}
                          alt="Media"
                          style={{
                            maxWidth: "100px",
                            maxHeight: "60px",
                            objectFit: "cover",
                            borderRadius: "4px",
                            border: "1px solid #ddd",
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: "12px", wordBreak: "break-all" }}>
                          {post.media_url.substring(0, 60)}...
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Display creator identity (only in admin panel) */}
              <div
                style={{
                  marginTop: "10px",
                  padding: "10px",
                  background: "#e9ecef",
                  borderRadius: "4px",
                  display: "flex",
                  gap: "20px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <strong>WhatsApp:</strong>{" "}
                  {post.creator_type === "whatsapp" ? post.creator_identity || "N/A" : "N/A"}
                </div>
                <div>
                  <strong>Website:</strong>{" "}
                  {post.creator_type === "website" ? post.creator_identity || "N/A" : "N/A"}
                </div>
              </div>

              <div style={{ marginTop: "15px", display: "flex", gap: "10px" }}>
                <button
                  onClick={() => deleteFeedxPost(post.id)}
                  disabled={!isAdmin}
                  style={{
                    padding: "8px 16px",
                    background: "#dc3545",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: isAdmin ? "pointer" : "not-allowed",
                    opacity: isAdmin ? 1 : 0.5,
                    fontWeight: "bold",
                  }}
                >
                  🗑 Delete Post
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Dedications Tab */}
      {activeTab === "dedications" && (
        <>
          <h2>🎵 Dedication Management</h2>
          {dedications.length === 0 && (
            <p>No dedications loaded yet. Enter PIN and click Load Dedications.</p>
          )}
          {dedications.map((dedication) => (
            <div
              key={dedication.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "20px",
                background: "#fafafa",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "15px",
                }}
              >
                <div>
                  <p><strong>ID:</strong> {dedication.id}</p>
                  <p><strong>Sender:</strong> {dedication.sender_name}</p>
                  <p><strong>Recipient:</strong> {dedication.recipient_name}</p>
                  <p><strong>Title:</strong> {dedication.dedication_title || "Untitled"}</p>
                </div>
                <div>
                  <p><strong>Created:</strong> {new Date(dedication.created_at).toLocaleString()}</p>
                  <p><strong>Media URL:</strong> {dedication.media_url ? "✅" : "❌"}</p>
                  <p><strong>Sender Photo:</strong> {dedication.sender_photo ? "✅" : "❌"}</p>
                  <p><strong>Recipient Photo:</strong> {dedication.recipient_photo ? "✅" : "❌"}</p>
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: "10px",
                  marginTop: "15px",
                }}
              >
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "bold" }}>Views</label>
                  <input
                    type="number"
                    value={dedication.views || 0}
                    onChange={(e) =>
                      handleFieldChange(dedication.id, "views", e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                    }}
                    disabled={!isAdmin}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "bold" }}>Reactions</label>
                  <input
                    type="number"
                    value={dedication.reaction_count || 0}
                    onChange={(e) =>
                      handleFieldChange(dedication.id, "reaction_count", e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                    }}
                    disabled={!isAdmin}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "bold" }}>Comments</label>
                  <input
                    type="number"
                    value={dedication.comment_count || 0}
                    onChange={(e) =>
                      handleFieldChange(dedication.id, "comment_count", e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                    }}
                    disabled={!isAdmin}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "bold" }}>Badge</label>
                  <select
                    value={dedication.dedication_badge || "❤️"}
                    onChange={(e) =>
                      handleFieldChange(dedication.id, "dedication_badge", e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                    }}
                    disabled={!isAdmin}
                  >
                    <option value="❤️">❤️ Heart</option>
                    <option value="👉">👉 Pointer</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
                <button
                  onClick={() => handleSave(dedication.id)}
                  disabled={!isAdmin}
                  style={{
                    padding: "10px 20px",
                    background: "#28a745",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: isAdmin ? "pointer" : "not-allowed",
                    opacity: isAdmin ? 1 : 0.5,
                  }}
                >
                  💾 Save
                </button>
                <button
                  onClick={() => deleteDedication(dedication.id)}
                  disabled={!isAdmin}
                  style={{
                    padding: "10px 20px",
                    background: "#dc3545",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: isAdmin ? "pointer" : "not-allowed",
                    opacity: isAdmin ? 1 : 0.5,
                  }}
                >
                  🗑 Delete
                </button>
              </div>

              {/* Show comments for this dedication */}
              {comments.filter(c => c.dedication_id === dedication.id).length > 0 && (
                <div style={{ marginTop: "15px", borderTop: "1px solid #ddd", paddingTop: "15px" }}>
                  <p><strong>💬 Comments for this dedication:</strong></p>
                  {comments
                    .filter(c => c.dedication_id === dedication.id)
                    .map(c => (
                      <div
                        key={c.id}
                        style={{
                          background: "#e9ecef",
                          padding: "8px 12px",
                          borderRadius: "4px",
                          marginBottom: "5px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <span style={{ marginRight: "8px" }}>
                            {getFlagFromWhatsapp(c.commenter_whatsapp)}
                          </span>
                          <span>{c.comment}</span>
                          <small style={{ color: "#666", marginLeft: "10px" }}>
                            {new Date(c.created_at).toLocaleDateString()}
                          </small>
                        </div>
                        <button
                          onClick={() => deleteComment(c.id)}
                          disabled={!isAdmin}
                          style={{
                            padding: "4px 10px",
                            background: "#dc3545",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: isAdmin ? "pointer" : "not-allowed",
                            fontSize: "12px",
                            opacity: isAdmin ? 1 : 0.5,
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {/* Comments Tab */}
      {activeTab === "comments" && (
        <>
          <h2>💬 All Comments</h2>
          <button
            onClick={() => setShowAddComment(!showAddComment)}
            disabled={!isAdmin}
            style={{
              padding: "10px 20px",
              background: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: isAdmin ? "pointer" : "not-allowed",
              opacity: isAdmin ? 1 : 0.5,
              marginBottom: "20px",
            }}
          >
            {showAddComment ? "❌ Cancel" : "➕ Add Comment"}
          </button>

          {showAddComment && (
            <div
              style={{
                border: "1px solid #ddd",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "20px",
                background: "#f8f9fa",
              }}
            >
              <h3>Add New Comment</h3>
              <div style={{ display: "grid", gap: "10px" }}>
                <div>
                  <label style={{ fontWeight: "bold" }}>Select Dedication</label>
                  <select
                    value={newComment.dedication_id}
                    onChange={(e) =>
                      setNewComment({ ...newComment, dedication_id: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                    }}
                    disabled={!isAdmin}
                  >
                    <option value="">Select Dedication</option>
                    {dedications.map((d) => (
                      <option key={d.id} value={d.id}>
                        #{d.id} - {d.sender_name} → {d.recipient_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontWeight: "bold" }}>Comment</label>
                  <textarea
                    value={newComment.comment}
                    onChange={(e) =>
                      setNewComment({ ...newComment, comment: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                      minHeight: "60px",
                    }}
                    placeholder="Enter comment text..."
                    disabled={!isAdmin}
                  />
                </div>
                <div>
                  <label style={{ fontWeight: "bold" }}>
                    Commenter WhatsApp (for flag)
                  </label>
                  <input
                    value={newComment.commenter_whatsapp}
                    onChange={(e) =>
                      setNewComment({ ...newComment, commenter_whatsapp: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #ccc",
                    }}
                    placeholder="e.g +250788123456"
                    disabled={!isAdmin}
                  />
                  <small style={{ color: "#666" }}>
                    Flag will appear based on this number:{" "}
                    {newComment.commenter_whatsapp &&
                      getFlagFromWhatsapp(newComment.commenter_whatsapp)}
                  </small>
                </div>
                <button
                  onClick={addComment}
                  disabled={!isAdmin}
                  style={{
                    padding: "10px 20px",
                    background: "#28a745",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: isAdmin ? "pointer" : "not-allowed",
                    opacity: isAdmin ? 1 : 0.5,
                  }}
                >
                  💾 Save Comment
                </button>
              </div>
            </div>
          )}

          {comments.length === 0 && <p>No comments found.</p>}
          {comments.map((comment) => {
            const dedication = dedications.find(d => d.id === comment.dedication_id);
            return (
              <div
                key={comment.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "12px",
                  padding: "15px",
                  marginBottom: "15px",
                  background: "#fafafa",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                  }}
                >
                  <div>
                    <p><strong>ID:</strong> {comment.id}</p>
                    <p>
                      <strong>Dedication:</strong> #{comment.dedication_id}
                      {dedication && ` - ${dedication.sender_name} → ${dedication.recipient_name}`}
                    </p>
                    <p>
                      <strong>Flag:</strong>{" "}
                      {getFlagFromWhatsapp(comment.commenter_whatsapp)}
                    </p>
                  </div>
                  <div>
                    <p><strong>Created:</strong> {new Date(comment.created_at).toLocaleString()}</p>
                    <p>
                      <strong>WhatsApp:</strong>{" "}
                      {comment.commenter_whatsapp
                        ? `****${comment.commenter_whatsapp.slice(-2)}`
                        : "Anonymous"}
                    </p>
                  </div>
                </div>
                <div style={{ marginTop: "10px" }}>
                  <p><strong>Comment:</strong></p>
                  <p style={{ background: "#e9ecef", padding: "10px", borderRadius: "4px" }}>
                    {comment.comment}
                  </p>
                </div>
                <button
                  onClick={() => deleteComment(comment.id)}
                  disabled={!isAdmin}
                  style={{
                    marginTop: "10px",
                    padding: "8px 16px",
                    background: "#dc3545",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: isAdmin ? "pointer" : "not-allowed",
                    opacity: isAdmin ? 1 : 0.5,
                  }}
                >
                  🗑 Delete Comment
                </button>
              </div>
            );
          })}
        </>
      )}

      {/* Media Ranking Tab */}
      {activeTab === "media" && (
        <>
          <h2>🏆 Most Watched Media</h2>
          {media.length === 0 && <p>No media ranking loaded yet.</p>}
          {media.map((item, index) => (
            <div
              key={index}
              style={{
                border: "1px solid #ddd",
                borderRadius: "12px",
                padding: "15px",
                marginBottom: "10px",
              }}
            >
              <h3>#{index + 1} {item.title || "Untitled Media"}</h3>
              <p>Views: {item.views || 0}</p>
              <p>Watch Time: {Math.round((item.watch_seconds || 0) / 3600)}h</p>
            </div>
          ))}
        </>
      )}

      {/* Home Content Tab */}
      {activeTab === "home" && (
        <>
          <h2>🏠 Home Content Management</h2>
          {homeContent.length === 0 && (
            <p>No home content loaded yet. Enter PIN and click Load Home Content.</p>
          )}
          {homeContent.map((content) => (
            <div
              key={content.id}
              style={{
                border: content.is_visible ? "2px solid #28a745" : "1px solid #ddd",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "20px",
                background: content.is_visible ? "#f0fff4" : "#fafafa",
                boxShadow: content.is_visible ? "0 0 20px rgba(40,167,69,0.15)" : "none",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "15px",
                }}
              >
                <div>
                  <p><strong>ID:</strong> {content.id}</p>
                  <p>
                    <strong>Status:</strong>{" "}
                    <span style={{
                      color: content.is_visible ? "#28a745" : "#6c757d",
                      fontWeight: "bold",
                    }}>
                      {content.is_visible ? "✅ Visible" : "⚪ Hidden"}
                    </span>
                  </p>
                  <p><strong>Title:</strong> {content.title || "Untitled"}</p>
                  <p><strong>Creator Identity:</strong> {content.creator_identity || "N/A"}</p>
                  <p>
                    <strong>Creator Type:</strong>{" "}
                    <span style={{
                      background: content.creator_type === "website" ? "#007bff" : "#25D366",
                      color: "white",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                    }}>
                      {content.creator_type || "unknown"}
                    </span>
                  </p>
                  <p><strong>Subtitle:</strong> {content.subtitle || "N/A"}</p>
                </div>
                <div>
                  <p><strong>Created:</strong> {new Date(content.created_at).toLocaleString()}</p>
                  <p><strong>Media Type:</strong> {content.media_type || "video"}</p>
                  <p><strong>Status Label:</strong> {content.status_label || "Open"}</p>
                  <p>
                    <strong>User Status:</strong>{" "}
                    <span style={{
                      color: content.user_status === "Blocked" ? "#dc3545" : "#28a745",
                      fontWeight: "bold",
                    }}>
                      {content.user_status || "Active"}
                    </span>
                  </p>
                  {content.logo_url && (
                    <div>
                      <p style={{ fontSize: "12px", marginBottom: "4px" }}>Logo:</p>
                      <img
                        src={content.logo_url}
                        alt="Logo"
                        style={{
                          width: "50px",
                          height: "50px",
                          borderRadius: "50%",
                          objectFit: "cover",
                          border: "1px solid #ddd",
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
              <div style={{ marginTop: "10px" }}>
                <p><strong>Media URL:</strong> <span style={{ wordBreak: "break-all", fontSize: "12px" }}>{content.video_url || "N/A"}</span></p>
              </div>
              <div style={{ display: "flex", gap: "10px", marginTop: "15px", flexWrap: "wrap" }}>
                {!content.is_visible && (
                  <button
                    onClick={() => updateHomeVisibility(content.id, true)}
                    disabled={!isAdmin}
                    style={{
                      padding: "10px 20px",
                      background: "#28a745",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: isAdmin ? "pointer" : "not-allowed",
                      opacity: isAdmin ? 1 : 0.5,
                      fontWeight: "bold",
                    }}
                  >
                    📺 Display on Home
                  </button>
                )}
                {content.is_visible && (
                  <button
                    onClick={() => updateHomeVisibility(content.id, false)}
                    disabled={!isAdmin}
                    style={{
                      padding: "10px 20px",
                      background: "#ffc107",
                      color: "#333",
                      border: "none",
                      borderRadius: "4px",
                      cursor: isAdmin ? "pointer" : "not-allowed",
                      opacity: isAdmin ? 1 : 0.5,
                      fontWeight: "bold",
                    }}
                  >
                    👁️ Hide
                  </button>
                )}
                <button
                  onClick={() => deleteHomeContent(content.id)}
                  disabled={!isAdmin}
                  style={{
                    padding: "10px 20px",
                    background: "#dc3545",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: isAdmin ? "pointer" : "not-allowed",
                    opacity: isAdmin ? 1 : 0.5,
                    fontWeight: "bold",
                  }}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default Admin;
