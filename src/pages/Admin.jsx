import { useCallback, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Clock3,
  Eye,
  Heart,
  Inbox,
  Loader2,
  LockKeyhole,
  LogOut,
  MessageCircle,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  Video,
  Image as ImageIcon,
  ExternalLink,
  X,
} from "lucide-react";

const API_URL = "https://kitchenbrain.cucina656.workers.dev";

async function readJson(response) {
  const text = await response.text();

  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(text || `Server returned ${response.status}`);
  }

  if (!response.ok || !data.success) {
    throw new Error(
      data.error ||
        data.message ||
        `Request failed with status ${response.status}`
    );
  }

  return data;
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

function formatDuration(seconds = 0) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainingSeconds = total % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
}

function formatDate(value) {
  if (!value) return "Never";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isVideoPost(post) {
  return post.media_type === "video";
}

function isImagePost(post) {
  return post.media_type === "image";
}

function Admin() {
  const [pinInput, setPinInput] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [report, setReport] = useState([]);
  const [draftStats, setDraftStats] = useState({});
  const [activeView, setActiveView] = useState("posts");
  const [searchText, setSearchText] = useState("");
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("info");
  const [loading, setLoading] = useState(false);
  const [savingPostId, setSavingPostId] = useState("");
  const [deletingPostId, setDeletingPostId] = useState("");
  const [selectedPost, setSelectedPost] = useState(null);

  const showStatus = useCallback((message, type = "info") => {
    setStatus(message);
    setStatusType(type);
  }, []);

  const loadDashboard = useCallback(
    async (pinToUse = adminPin) => {
      const cleanPin = String(pinToUse || "").trim();

      if (!cleanPin) {
        showStatus("Enter the admin PIN first.", "error");
        return false;
      }

      setLoading(true);
      showStatus("Loading dashboard...", "info");

      try {
        const response = await fetch(
          `${API_URL}/api/admin/feedx-report?pin=${encodeURIComponent(cleanPin)}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const data = await readJson(response);
        const nextReport = Array.isArray(data.report) ? data.report : [];

        setAdminPin(cleanPin);
        setReport(nextReport);

        const nextDrafts = {};
        nextReport.forEach((post) => {
          nextDrafts[String(post.id)] = {
            manual_views: Number(post.manual_views || 0),
            manual_reactions: Number(post.manual_reactions || 0),
          };
        });
        setDraftStats(nextDrafts);

        showStatus(
          `${nextReport.length} post${nextReport.length === 1 ? "" : "s"} loaded.`,
          "success"
        );
        return true;
      } catch (error) {
        console.error("Admin report failed:", error);
        showStatus(error.message || "Failed to load admin dashboard.", "error");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [adminPin, showStatus]
  );

  const handleLogin = useCallback(
    async (event) => {
      event.preventDefault();
      const ok = await loadDashboard(pinInput);

      if (ok) {
        setPinInput("");
      }
    },
    [loadDashboard, pinInput]
  );

  const handleLogout = useCallback(() => {
    setAdminPin("");
    setPinInput("");
    setReport([]);
    setDraftStats({});
    setSelectedPost(null);
    setStatus("");
    setSearchText("");
    setActiveView("posts");
  }, []);

  const updateDraft = useCallback((postId, field, value) => {
    const numericValue = Math.max(0, Number.parseInt(value || "0", 10) || 0);

    setDraftStats((current) => ({
      ...current,
      [postId]: {
        ...(current[postId] || {
          manual_views: 0,
          manual_reactions: 0,
        }),
        [field]: numericValue,
      },
    }));
  }, []);

  const saveStats = useCallback(
    async (postId) => {
      const draft = draftStats[postId] || {
        manual_views: 0,
        manual_reactions: 0,
      };

      setSavingPostId(postId);
      showStatus("Saving statistics...", "info");

      try {
        const response = await fetch(
          `${API_URL}/api/admin/update-feedx-stats`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              pin: adminPin,
              post_id: postId,
              manual_views: Number(draft.manual_views || 0),
              manual_reactions: Number(draft.manual_reactions || 0),
            }),
          }
        );

        await readJson(response);
        await loadDashboard(adminPin);
        showStatus("Statistics saved successfully.", "success");
      } catch (error) {
        console.error("Save stats failed:", error);
        showStatus(error.message || "Failed to save statistics.", "error");
      } finally {
        setSavingPostId("");
      }
    },
    [adminPin, draftStats, loadDashboard, showStatus]
  );

  const deletePost = useCallback(
    async (post) => {
      const confirmed = window.confirm(
        `Delete "${post.title || "Untitled post"}"? This also removes its comments, reactions, analytics and uploaded media.`
      );

      if (!confirmed) return;

      const postId = String(post.id);
      setDeletingPostId(postId);
      showStatus("Deleting post...", "info");

      try {
        const response = await fetch(
          `${API_URL}/api/admin/delete-feedx-post`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              pin: adminPin,
              post_id: postId,
            }),
          }
        );

        await readJson(response);

        setReport((current) =>
          current.filter((item) => String(item.id) !== postId)
        );

        if (String(selectedPost?.id || "") === postId) {
          setSelectedPost(null);
        }

        showStatus("Post deleted successfully.", "success");
      } catch (error) {
        console.error("Delete post failed:", error);
        showStatus(error.message || "Failed to delete post.", "error");
      } finally {
        setDeletingPostId("");
      }
    },
    [adminPin, selectedPost, showStatus]
  );

  const totals = useMemo(() => {
    return report.reduce(
      (summary, post) => {
        summary.posts += 1;
        summary.views += Number(post.displayed_views || 0);
        summary.reactions += Number(post.displayed_reactions || 0);
        summary.comments += Number(post.comment_count || 0);
        summary.watchSeconds += Number(post.total_watch_seconds || 0);
        summary.inboxClicks += Number(post.envelope_clicks || 0);
        return summary;
      },
      {
        posts: 0,
        views: 0,
        reactions: 0,
        comments: 0,
        watchSeconds: 0,
        inboxClicks: 0,
      }
    );
  }, [report]);

  const filteredPosts = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    if (!query) return report;

    return report.filter((post) => {
      const searchable = [
        post.id,
        post.title,
        post.creator_name,
        post.creator_identity,
        post.media_type,
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [report, searchText]);

  if (!adminPin) {
    return (
      <div className="admin-page admin-login-page">
        <div className="admin-login-card">
          <div className="admin-lock-logo">
            <LockKeyhole size={38} strokeWidth={2.2} />
          </div>

          <div className="admin-login-copy">
            <span className="admin-eyebrow">FeedX Control Center</span>
            <h1>Admin Login</h1>
            <p>
              Enter your private PIN to manage posts, statistics, comments and
              uploaded media.
            </p>
          </div>

          <form onSubmit={handleLogin} className="admin-login-form">
            <label htmlFor="admin-pin">Admin PIN</label>
            <input
              id="admin-pin"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              placeholder="Enter PIN"
              value={pinInput}
              onChange={(event) => setPinInput(event.target.value)}
              autoFocus
            />

            <button type="submit" disabled={loading || !pinInput.trim()}>
              {loading ? (
                <>
                  <Loader2 className="spin" size={20} />
                  Checking...
                </>
              ) : (
                <>
                  <ShieldCheck size={20} />
                  Open dashboard
                </>
              )}
            </button>
          </form>

          {status && (
            <div className={`admin-message admin-message-${statusType}`}>
              {status}
            </div>
          )}
        </div>

        <AdminStyles />
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-topbar">
        <div>
          <span className="admin-eyebrow">FeedX Control Center</span>
          <h1>Admin Dashboard</h1>
        </div>

        <div className="admin-topbar-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => loadDashboard(adminPin)}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="spin" size={19} />
            ) : (
              <RefreshCw size={19} />
            )}
            Refresh
          </button>

          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
          >
            <LogOut size={19} />
            Logout
          </button>
        </div>
      </header>

      <main className="admin-shell">
        {status && (
          <div className={`admin-message admin-message-${statusType}`}>
            {status}
          </div>
        )}

        <section className="summary-grid">
          <SummaryCard
            label="Posts"
            value={formatCount(totals.posts)}
            icon={<Video size={24} />}
          />
          <SummaryCard
            label="Views"
            value={formatCount(totals.views)}
            icon={<Eye size={24} />}
          />
          <SummaryCard
            label="Watch time"
            value={formatDuration(totals.watchSeconds)}
            icon={<Clock3 size={24} />}
          />
          <SummaryCard
            label="Reactions"
            value={formatCount(totals.reactions)}
            icon={<Heart size={24} />}
          />
          <SummaryCard
            label="Comments"
            value={formatCount(totals.comments)}
            icon={<MessageCircle size={24} />}
          />
          <SummaryCard
            label="Inbox clicks"
            value={formatCount(totals.inboxClicks)}
            icon={<Inbox size={24} />}
          />
        </section>

        <section className="admin-workspace">
          <nav className="admin-tabs" aria-label="Admin sections">
            <button
              type="button"
              className={activeView === "posts" ? "active" : ""}
              onClick={() => setActiveView("posts")}
            >
              <Video size={19} />
              Posts
            </button>

            <button
              type="button"
              className={activeView === "analytics" ? "active" : ""}
              onClick={() => setActiveView("analytics")}
            >
              <BarChart3 size={19} />
              Analytics
            </button>

            <button
              type="button"
              className={activeView === "comments" ? "active" : ""}
              onClick={() => setActiveView("comments")}
            >
              <MessageCircle size={19} />
              Comments
            </button>
          </nav>

          <div className="admin-toolbar">
            <div className="search-box">
              <Search size={19} />
              <input
                type="search"
                placeholder="Search title, creator, contact or post ID"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
            </div>

            <span className="result-count">
              {filteredPosts.length} result
              {filteredPosts.length === 1 ? "" : "s"}
            </span>
          </div>

          {activeView === "posts" && (
            <PostsView
              posts={filteredPosts}
              drafts={draftStats}
              updateDraft={updateDraft}
              saveStats={saveStats}
              deletePost={deletePost}
              savingPostId={savingPostId}
              deletingPostId={deletingPostId}
              setSelectedPost={setSelectedPost}
            />
          )}

          {activeView === "analytics" && (
            <AnalyticsView posts={filteredPosts} />
          )}

          {activeView === "comments" && (
            <CommentsView
              posts={filteredPosts}
              openPost={setSelectedPost}
            />
          )}
        </section>
      </main>

      {selectedPost && (
        <PostDetailsModal
          post={selectedPost}
          close={() => setSelectedPost(null)}
          deletePost={deletePost}
          deleting={
            deletingPostId === String(selectedPost.id)
          }
        />
      )}

      <AdminStyles />
    </div>
  );
}

function SummaryCard({ label, value, icon }) {
  return (
    <article className="summary-card">
      <div className="summary-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function PostsView({
  posts,
  drafts,
  updateDraft,
  saveStats,
  deletePost,
  savingPostId,
  deletingPostId,
  setSelectedPost,
}) {
  if (!posts.length) {
    return <EmptyState message="No FeedX posts were found." />;
  }

  return (
    <div className="post-management-list">
      {posts.map((post) => {
        const postId = String(post.id);
        const draft = drafts[postId] || {
          manual_views: Number(post.manual_views || 0),
          manual_reactions: Number(post.manual_reactions || 0),
        };

        return (
          <article className="management-card" key={postId}>
            <div className="management-media">
              <MediaPreview post={post} />

              <button
                type="button"
                className="preview-button"
                onClick={() => setSelectedPost(post)}
              >
                <ExternalLink size={17} />
                View details
              </button>
            </div>

            <div className="management-body">
              <div className="management-heading">
                <div>
                  <span className="post-id">Post #{postId}</span>
                  <h2>{post.title || "Untitled post"}</h2>
                  <p>{post.subtitle || "No message was added."}</p>
                </div>

                <span className={`media-badge media-badge-${post.media_type}`}>
                  {isImagePost(post) ? (
                    <ImageIcon size={16} />
                  ) : (
                    <Video size={16} />
                  )}
                  {post.media_type || "media"}
                </span>
              </div>

              <div className="creator-strip">
                <div className="creator-photo-small">
                  {post.logo_url || post.profile_image_url ? (
                    <img
                      src={post.logo_url || post.profile_image_url}
                      alt=""
                    />
                  ) : (
                    <UserRound size={22} />
                  )}
                </div>

                <div>
                  <strong>{post.creator_name || "Unnamed creator"}</strong>
                  <span>{post.creator_identity || "No contact"}</span>
                </div>
              </div>

              <div className="quick-metrics">
                <Metric icon={<Eye size={17} />} label="Views" value={post.displayed_views} />
                <Metric icon={<Heart size={17} />} label="Likes" value={post.displayed_reactions} />
                <Metric icon={<MessageCircle size={17} />} label="Comments" value={post.comment_count} />
                <Metric icon={<Clock3 size={17} />} label="Watch" value={formatDuration(post.total_watch_seconds)} raw />
                <Metric icon={<Inbox size={17} />} label="Inbox" value={post.envelope_clicks} />
              </div>

              <div className="manual-stats-grid">
                <label>
                  <span>Admin-added views</span>
                  <input
                    type="number"
                    min="0"
                    value={draft.manual_views}
                    onChange={(event) =>
                      updateDraft(
                        postId,
                        "manual_views",
                        event.target.value
                      )
                    }
                  />
                </label>

                <label>
                  <span>Admin-added reactions</span>
                  <input
                    type="number"
                    min="0"
                    value={draft.manual_reactions}
                    onChange={(event) =>
                      updateDraft(
                        postId,
                        "manual_reactions",
                        event.target.value
                      )
                    }
                  />
                </label>
              </div>

              <div className="management-actions">
                <button
                  type="button"
                  className="save-button"
                  onClick={() => saveStats(postId)}
                  disabled={savingPostId === postId}
                >
                  {savingPostId === postId ? (
                    <Loader2 className="spin" size={18} />
                  ) : (
                    <Save size={18} />
                  )}
                  Save statistics
                </button>

                <button
                  type="button"
                  className="delete-button"
                  onClick={() => deletePost(post)}
                  disabled={deletingPostId === postId}
                >
                  {deletingPostId === postId ? (
                    <Loader2 className="spin" size={18} />
                  ) : (
                    <Trash2 size={18} />
                  )}
                  Delete post
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function AnalyticsView({ posts }) {
  if (!posts.length) {
    return <EmptyState message="No analytics are available." />;
  }

  const ranked = [...posts].sort(
    (a, b) =>
      Number(b.total_watch_seconds || 0) -
      Number(a.total_watch_seconds || 0)
  );

  return (
    <div className="analytics-list">
      {ranked.map((post, index) => (
        <article className="analytics-row" key={post.id}>
          <div className="rank-number">#{index + 1}</div>

          <div className="analytics-main">
            <strong>{post.title || "Untitled post"}</strong>
            <span>{post.creator_name || "Unnamed creator"}</span>
          </div>

          <div className="analytics-value">
            <Clock3 size={17} />
            <span>Watch time</span>
            <strong>{formatDuration(post.total_watch_seconds)}</strong>
          </div>

          <div className="analytics-value">
            <Eye size={17} />
            <span>Views</span>
            <strong>{formatCount(post.displayed_views)}</strong>
          </div>

          <div className="analytics-value">
            <Activity size={17} />
            <span>Last watched</span>
            <strong>{formatDate(post.last_watched_at)}</strong>
          </div>
        </article>
      ))}
    </div>
  );
}

function CommentsView({ posts, openPost }) {
  const postsWithComments = posts.filter(
    (post) => Array.isArray(post.comments) && post.comments.length > 0
  );

  if (!postsWithComments.length) {
    return <EmptyState message="No comments have been posted yet." />;
  }

  return (
    <div className="comments-management-list">
      {postsWithComments.map((post) => (
        <section className="comments-post-group" key={post.id}>
          <header>
            <div>
              <span>Post #{post.id}</span>
              <h2>{post.title || "Untitled post"}</h2>
            </div>

            <button type="button" onClick={() => openPost(post)}>
              View post
            </button>
          </header>

          <div className="admin-comments-list">
            {post.comments.map((comment) => (
              <article key={comment.id}>
                <div className="comment-avatar">
                  {comment.country_flag || "🌍"}
                </div>

                <div>
                  <strong>
                    {comment.commenter_phone || "Private number"}
                  </strong>
                  <p>{comment.comment}</p>
                  <span>{formatDate(comment.created_at)}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Metric({ icon, label, value, raw = false }) {
  return (
    <div className="quick-metric">
      {icon}
      <span>{label}</span>
      <strong>{raw ? value : formatCount(value)}</strong>
    </div>
  );
}

function MediaPreview({ post, large = false }) {
  const className = large
    ? "admin-media-preview admin-media-preview-large"
    : "admin-media-preview";

  if (isImagePost(post)) {
    return (
      <div className={className}>
        <img src={post.media_url} alt={post.title || "Post media"} />
      </div>
    );
  }

  if (isVideoPost(post)) {
    return (
      <div className={className}>
        <video
          src={post.media_url}
          controls
          playsInline
          preload="metadata"
        />
      </div>
    );
  }

  return (
    <div className={`${className} embed-preview`}>
      <ExternalLink size={28} />
      <span>External media</span>
      <a href={post.media_url} target="_blank" rel="noreferrer">
        Open link
      </a>
    </div>
  );
}

function PostDetailsModal({ post, close, deletePost, deleting }) {
  return (
    <div className="details-overlay" onClick={close}>
      <section
        className="details-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="details-header">
          <div>
            <span>Post #{post.id}</span>
            <h2>{post.title || "Untitled post"}</h2>
          </div>

          <button type="button" onClick={close} aria-label="Close">
            <X size={23} />
          </button>
        </header>

        <MediaPreview post={post} large />

        <div className="details-grid">
          <Detail label="Creator" value={post.creator_name || "Unnamed"} />
          <Detail label="Contact" value={post.creator_identity || "None"} />
          <Detail label="Contact type" value={post.creator_type || "Unknown"} />
          <Detail label="Media type" value={post.media_type || "Unknown"} />
          <Detail label="Created" value={formatDate(post.created_at)} />
          <Detail label="Last watched" value={formatDate(post.last_watched_at)} />
          <Detail label="Views" value={formatCount(post.displayed_views)} />
          <Detail label="Reactions" value={formatCount(post.displayed_reactions)} />
          <Detail label="Comments" value={formatCount(post.comment_count)} />
          <Detail label="Inbox clicks" value={formatCount(post.envelope_clicks)} />
          <Detail label="Watch time" value={formatDuration(post.total_watch_seconds)} />
        </div>

        {post.subtitle && (
          <div className="details-message">
            <span>Post message</span>
            <p>{post.subtitle}</p>
          </div>
        )}

        <div className="details-actions">
          {post.creator_identity && (
            <a
              href={
                post.destination_url ||
                (post.creator_type === "website"
                  ? post.creator_identity
                  : `https://wa.me/${String(post.creator_identity).replace(
                      /\D/g,
                      ""
                    )}`)
              }
              target="_blank"
              rel="noreferrer"
              className="contact-button"
            >
              <ExternalLink size={18} />
              Open creator contact
            </a>
          )}

          <button
            type="button"
            className="delete-button"
            onClick={() => deletePost(post)}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="spin" size={18} />
            ) : (
              <Trash2 size={18} />
            )}
            Delete post
          </button>
        </div>
      </section>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="admin-empty-state">
      <BarChart3 size={38} />
      <strong>{message}</strong>
      <span>Refresh the dashboard after new activity.</span>
    </div>
  );
}

function AdminStyles() {
  return (
    <style>{`
      :root {
        --admin-bg: #f4f7fb;
        --admin-panel: #ffffff;
        --admin-text: #172033;
        --admin-muted: #697386;
        --admin-line: #e2e8f0;
        --admin-blue: #087cff;
        --admin-blue-dark: #0066df;
        --admin-green: #0f9f6e;
        --admin-red: #dc3545;
        --admin-shadow: 0 16px 40px rgba(29, 42, 68, 0.08);
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
      }

      button,
      input {
        font: inherit;
      }

      button {
        cursor: pointer;
      }

      button:disabled {
        cursor: wait;
        opacity: 0.65;
      }

      .admin-page {
        min-height: 100svh;
        padding-bottom: 70px;
        color: var(--admin-text);
        background:
          radial-gradient(circle at top left, rgba(8, 124, 255, 0.08), transparent 32%),
          var(--admin-bg);
        font-family: Arial, Helvetica, sans-serif;
      }

      .admin-login-page {
        display: grid;
        place-items: center;
        padding: 24px;
      }

      .admin-login-card {
        width: min(100%, 440px);
        padding: 34px;
        border: 1px solid var(--admin-line);
        border-radius: 28px;
        background: #ffffff;
        box-shadow: var(--admin-shadow);
      }

      .admin-lock-logo {
        width: 74px;
        height: 74px;
        display: grid;
        place-items: center;
        margin-bottom: 24px;
        border-radius: 22px;
        color: #ffffff;
        background: linear-gradient(145deg, var(--admin-blue), var(--admin-blue-dark));
        box-shadow: 0 14px 28px rgba(8, 124, 255, 0.25);
      }

      .admin-eyebrow {
        display: block;
        margin-bottom: 8px;
        color: var(--admin-blue);
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 1.4px;
        text-transform: uppercase;
      }

      .admin-login-copy h1,
      .admin-topbar h1 {
        margin: 0;
        letter-spacing: -1px;
      }

      .admin-login-copy p {
        margin: 12px 0 26px;
        color: var(--admin-muted);
        line-height: 1.6;
      }

      .admin-login-form {
        display: grid;
        gap: 12px;
      }

      .admin-login-form label {
        font-size: 14px;
        font-weight: 800;
      }

      .admin-login-form input,
      .manual-stats-grid input,
      .search-box input {
        width: 100%;
        border: 1px solid var(--admin-line);
        color: var(--admin-text);
        background: #ffffff;
        outline: none;
      }

      .admin-login-form input {
        height: 54px;
        padding: 0 16px;
        border-radius: 14px;
      }

      .admin-login-form input:focus,
      .manual-stats-grid input:focus,
      .search-box:focus-within {
        border-color: var(--admin-blue);
        box-shadow: 0 0 0 4px rgba(8, 124, 255, 0.10);
      }

      .admin-login-form button,
      .save-button,
      .contact-button {
        min-height: 48px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 9px;
        border: 0;
        border-radius: 13px;
        color: #ffffff;
        background: linear-gradient(145deg, var(--admin-blue), var(--admin-blue-dark));
        font-weight: 900;
        text-decoration: none;
      }

      .admin-login-form button {
        margin-top: 4px;
      }

      .admin-topbar {
        width: min(calc(100% - 32px), 1320px);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
        margin: 0 auto;
        padding: 28px 0 20px;
      }

      .admin-topbar-actions,
      .management-actions,
      .details-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      .secondary-button,
      .logout-button,
      .delete-button,
      .preview-button {
        min-height: 43px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 0 16px;
        border-radius: 12px;
        font-weight: 800;
      }

      .secondary-button,
      .preview-button {
        border: 1px solid var(--admin-line);
        color: var(--admin-text);
        background: #ffffff;
      }

      .logout-button,
      .delete-button {
        border: 1px solid rgba(220, 53, 69, 0.22);
        color: var(--admin-red);
        background: #fff5f6;
      }

      .admin-shell {
        width: min(calc(100% - 32px), 1320px);
        margin: 0 auto;
      }

      .admin-message {
        margin-bottom: 18px;
        padding: 13px 16px;
        border-radius: 13px;
        font-size: 14px;
        font-weight: 800;
      }

      .admin-message-info {
        color: #0757ad;
        background: #eaf4ff;
      }

      .admin-message-success {
        color: #087653;
        background: #eafaf4;
      }

      .admin-message-error {
        color: #a61b2b;
        background: #fff0f2;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(6, minmax(0, 1fr));
        gap: 14px;
        margin-bottom: 20px;
      }

      .summary-card {
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 13px;
        padding: 18px;
        border: 1px solid var(--admin-line);
        border-radius: 18px;
        background: var(--admin-panel);
        box-shadow: 0 8px 22px rgba(29, 42, 68, 0.05);
      }

      .summary-icon {
        width: 44px;
        height: 44px;
        flex: 0 0 44px;
        display: grid;
        place-items: center;
        border-radius: 14px;
        color: var(--admin-blue);
        background: #eaf4ff;
      }

      .summary-card span {
        display: block;
        margin-bottom: 5px;
        color: var(--admin-muted);
        font-size: 12px;
        font-weight: 700;
      }

      .summary-card strong {
        display: block;
        overflow: hidden;
        font-size: 21px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .admin-workspace {
        overflow: hidden;
        border: 1px solid var(--admin-line);
        border-radius: 24px;
        background: var(--admin-panel);
        box-shadow: var(--admin-shadow);
      }

      .admin-tabs {
        display: flex;
        gap: 8px;
        padding: 14px;
        border-bottom: 1px solid var(--admin-line);
        background: #fbfcfe;
      }

      .admin-tabs button {
        min-height: 42px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 0 16px;
        border: 0;
        border-radius: 12px;
        color: var(--admin-muted);
        background: transparent;
        font-weight: 900;
      }

      .admin-tabs button.active {
        color: #ffffff;
        background: var(--admin-blue);
      }

      .admin-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        padding: 18px;
        border-bottom: 1px solid var(--admin-line);
      }

      .search-box {
        width: min(100%, 520px);
        min-height: 46px;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 0 14px;
        border: 1px solid var(--admin-line);
        border-radius: 13px;
        color: var(--admin-muted);
        background: #ffffff;
      }

      .search-box input {
        height: 42px;
        padding: 0;
        border: 0;
        box-shadow: none !important;
      }

      .result-count {
        color: var(--admin-muted);
        font-size: 13px;
        font-weight: 800;
      }

      .post-management-list,
      .analytics-list,
      .comments-management-list {
        display: grid;
        gap: 16px;
        padding: 18px;
      }

      .management-card {
        display: grid;
        grid-template-columns: 260px minmax(0, 1fr);
        overflow: hidden;
        border: 1px solid var(--admin-line);
        border-radius: 20px;
        background: #ffffff;
      }

      .management-media {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 14px;
        background: #f7f9fc;
      }

      .admin-media-preview {
        width: 100%;
        aspect-ratio: 16 / 10;
        display: grid;
        place-items: center;
        overflow: hidden;
        border-radius: 14px;
        background: #050a13;
      }

      .admin-media-preview img,
      .admin-media-preview video {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: contain;
        background: #050a13;
      }

      .admin-media-preview-large {
        max-height: 460px;
        aspect-ratio: 16 / 9;
        border-radius: 18px;
      }

      .embed-preview {
        gap: 8px;
        color: #ffffff;
        text-align: center;
      }

      .embed-preview a {
        color: #7ec0ff;
      }

      .management-body {
        min-width: 0;
        padding: 20px;
      }

      .management-heading {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 18px;
      }

      .post-id {
        color: var(--admin-blue);
        font-size: 12px;
        font-weight: 900;
      }

      .management-heading h2 {
        margin: 5px 0 7px;
        font-size: 22px;
      }

      .management-heading p {
        max-width: 760px;
        margin: 0;
        color: var(--admin-muted);
        line-height: 1.5;
      }

      .media-badge {
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 7px 10px;
        border-radius: 10px;
        color: #0757ad;
        background: #eaf4ff;
        font-size: 12px;
        font-weight: 900;
        text-transform: capitalize;
      }

      .creator-strip {
        display: flex;
        align-items: center;
        gap: 11px;
        margin-top: 17px;
        padding: 11px;
        border-radius: 14px;
        background: #f7f9fc;
      }

      .creator-photo-small {
        width: 44px;
        height: 44px;
        flex: 0 0 44px;
        display: grid;
        place-items: center;
        overflow: hidden;
        border-radius: 50%;
        color: var(--admin-muted);
        background: #e8edf4;
      }

      .creator-photo-small img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .creator-strip strong,
      .creator-strip span {
        display: block;
      }

      .creator-strip span {
        margin-top: 3px;
        color: var(--admin-muted);
        font-size: 12px;
        overflow-wrap: anywhere;
      }

      .quick-metrics {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 9px;
        margin-top: 16px;
      }

      .quick-metric {
        min-width: 0;
        display: grid;
        gap: 4px;
        padding: 11px;
        border: 1px solid var(--admin-line);
        border-radius: 13px;
      }

      .quick-metric svg {
        color: var(--admin-blue);
      }

      .quick-metric span {
        color: var(--admin-muted);
        font-size: 11px;
        font-weight: 700;
      }

      .quick-metric strong {
        overflow: hidden;
        font-size: 15px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .manual-stats-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin-top: 16px;
      }

      .manual-stats-grid label span {
        display: block;
        margin-bottom: 7px;
        color: var(--admin-muted);
        font-size: 12px;
        font-weight: 800;
      }

      .manual-stats-grid input {
        height: 45px;
        padding: 0 13px;
        border-radius: 11px;
      }

      .management-actions {
        margin-top: 16px;
      }

      .management-actions .save-button,
      .management-actions .delete-button,
      .details-actions .contact-button,
      .details-actions .delete-button {
        min-height: 44px;
        padding: 0 16px;
      }

      .analytics-row {
        display: grid;
        grid-template-columns: 54px minmax(180px, 1fr) repeat(3, minmax(130px, 0.7fr));
        align-items: center;
        gap: 14px;
        padding: 16px;
        border: 1px solid var(--admin-line);
        border-radius: 16px;
      }

      .rank-number {
        color: var(--admin-blue);
        font-size: 18px;
        font-weight: 900;
      }

      .analytics-main strong,
      .analytics-main span {
        display: block;
      }

      .analytics-main span {
        margin-top: 4px;
        color: var(--admin-muted);
        font-size: 12px;
      }

      .analytics-value {
        display: grid;
        gap: 4px;
      }

      .analytics-value svg {
        color: var(--admin-blue);
      }

      .analytics-value span {
        color: var(--admin-muted);
        font-size: 11px;
      }

      .analytics-value strong {
        font-size: 13px;
      }

      .comments-post-group {
        overflow: hidden;
        border: 1px solid var(--admin-line);
        border-radius: 18px;
      }

      .comments-post-group > header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        padding: 16px;
        background: #f7f9fc;
      }

      .comments-post-group header span {
        color: var(--admin-blue);
        font-size: 11px;
        font-weight: 900;
      }

      .comments-post-group header h2 {
        margin: 4px 0 0;
        font-size: 17px;
      }

      .comments-post-group header button {
        min-height: 38px;
        padding: 0 13px;
        border: 1px solid var(--admin-line);
        border-radius: 10px;
        color: var(--admin-text);
        background: #ffffff;
        font-weight: 800;
      }

      .admin-comments-list {
        display: grid;
      }

      .admin-comments-list article {
        display: flex;
        gap: 12px;
        padding: 15px 16px;
        border-top: 1px solid var(--admin-line);
      }

      .comment-avatar {
        width: 42px;
        height: 42px;
        flex: 0 0 42px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        background: #edf2f7;
        font-size: 21px;
      }

      .admin-comments-list strong {
        font-size: 13px;
      }

      .admin-comments-list p {
        margin: 6px 0;
        line-height: 1.5;
      }

      .admin-comments-list span {
        color: var(--admin-muted);
        font-size: 11px;
      }

      .admin-empty-state {
        min-height: 280px;
        display: grid;
        place-items: center;
        align-content: center;
        gap: 10px;
        padding: 30px;
        color: var(--admin-muted);
        text-align: center;
      }

      .admin-empty-state svg {
        color: var(--admin-blue);
      }

      .details-overlay {
        position: fixed;
        inset: 0;
        z-index: 10000;
        display: grid;
        place-items: center;
        padding: 20px;
        background: rgba(10, 18, 32, 0.72);
        backdrop-filter: blur(8px);
      }

      .details-modal {
        width: min(100%, 850px);
        max-height: 92svh;
        overflow-y: auto;
        padding: 20px;
        border-radius: 24px;
        background: #ffffff;
        box-shadow: 0 30px 80px rgba(0, 0, 0, 0.28);
      }

      .details-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 18px;
        margin-bottom: 16px;
      }

      .details-header span {
        color: var(--admin-blue);
        font-size: 12px;
        font-weight: 900;
      }

      .details-header h2 {
        margin: 5px 0 0;
      }

      .details-header button {
        width: 42px;
        height: 42px;
        display: grid;
        place-items: center;
        border: 1px solid var(--admin-line);
        border-radius: 12px;
        color: var(--admin-text);
        background: #ffffff;
      }

      .details-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        margin-top: 16px;
      }

      .detail-item {
        min-width: 0;
        padding: 13px;
        border: 1px solid var(--admin-line);
        border-radius: 13px;
      }

      .detail-item span {
        display: block;
        margin-bottom: 5px;
        color: var(--admin-muted);
        font-size: 11px;
        font-weight: 700;
      }

      .detail-item strong {
        display: block;
        overflow-wrap: anywhere;
        font-size: 13px;
      }

      .details-message {
        margin-top: 14px;
        padding: 15px;
        border-radius: 14px;
        background: #f7f9fc;
      }

      .details-message span {
        color: var(--admin-muted);
        font-size: 11px;
        font-weight: 800;
      }

      .details-message p {
        margin: 8px 0 0;
        line-height: 1.6;
        white-space: pre-wrap;
      }

      .details-actions {
        margin-top: 16px;
      }

      .spin {
        animation: adminSpin 0.8s linear infinite;
      }

      @keyframes adminSpin {
        to {
          transform: rotate(360deg);
        }
      }

      @media (max-width: 1120px) {
        .summary-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .quick-metrics {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .analytics-row {
          grid-template-columns: 50px minmax(170px, 1fr) repeat(2, minmax(120px, 0.7fr));
        }

        .analytics-row .analytics-value:last-child {
          grid-column: 2 / -1;
        }
      }

      @media (max-width: 760px) {
        .admin-topbar {
          align-items: flex-start;
          flex-direction: column;
        }

        .admin-topbar-actions {
          width: 100%;
        }

        .admin-topbar-actions button {
          flex: 1;
        }

        .summary-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .admin-tabs {
          overflow-x: auto;
        }

        .admin-tabs button {
          flex: 0 0 auto;
        }

        .admin-toolbar {
          align-items: stretch;
          flex-direction: column;
        }

        .search-box {
          width: 100%;
        }

        .management-card {
          grid-template-columns: 1fr;
        }

        .management-media {
          border-bottom: 1px solid var(--admin-line);
        }

        .management-heading {
          flex-direction: column;
        }

        .quick-metrics {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .manual-stats-grid,
        .details-grid {
          grid-template-columns: 1fr;
        }

        .management-actions button,
        .details-actions > * {
          width: 100%;
        }

        .analytics-row {
          grid-template-columns: 42px minmax(0, 1fr);
        }

        .analytics-value,
        .analytics-row .analytics-value:last-child {
          grid-column: 2;
        }

        .details-overlay {
          align-items: end;
          padding: 0;
        }

        .details-modal {
          max-height: 94svh;
          border-radius: 24px 24px 0 0;
        }
      }

      @media (max-width: 420px) {
        .admin-login-card {
          padding: 24px 20px;
        }

        .summary-card {
          align-items: flex-start;
          flex-direction: column;
        }

        .quick-metrics {
          grid-template-columns: 1fr 1fr;
        }
      }
    `}</style>
  );
}

export default Admin;