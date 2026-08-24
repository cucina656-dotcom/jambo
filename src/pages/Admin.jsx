import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  Inbox,
  KeyRound,
  Loader2,
  LockKeyhole,
  LogOut,
  MessageCircle,
  Phone,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  ShieldX,
  Star,
  Trash2,
  UserRound,
  Users,
  Video,
  X,
} from "lucide-react";
 
const API_URL = "https://kitchenbrain.cucina656.workers.dev";
 
async function readJson(response) {
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(text || `Server returned ${response.status}`);
  }
 
  if (!response.ok || data.success === false) {
    throw new Error(
      data.error ||
        data.message ||
        `Request failed with status ${response.status}`
    );
  }
  return data;
}
 
async function api(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    ...options,
  });
  return readJson(response);
}

async function adminApi(path, pin, options = {}) {
  const cleanPin = String(pin || "").trim();
  const headers = new Headers(options.headers || {});
  headers.set("X-Admin-Pin", cleanPin);

  return api(path, {
    ...options,
    headers,
  });
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
  const secs = total % 60;
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m ${secs}s`;
  return `${secs}s`;
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

function formatBytes(value = 0) {
  const bytes = Math.max(0, Number(value) || 0);
  if (!bytes) return "";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function resetStatusInfo(value = "pending") {
  const status = String(value || "pending").toLowerCase();
  if (status === "approved") return { label: "Approved", className: "green" };
  if (status === "used") return { label: "PIN changed", className: "green" };
  if (["rejected", "expired"].includes(status)) {
    return { label: status === "expired" ? "Expired" : "Rejected", className: "gray" };
  }
  return { label: "Waiting for phone call", className: "red" };
}
 
function providerStatus(provider = {}) {
  const status = String(provider.verification_status || "pending").toLowerCase();
  if (status === "verified" || status === "approved") {
    return { status: "verified", label: "Verified", className: "green" };
  }
  if (status === "rejected" || status === "blocked") {
    return { status: "rejected", label: "Rejected", className: "gray" };
  }
  return { status: "pending", label: "Pending", className: "red" };
}

function providerNeedsPhoneApproval(provider = {}) {
  return (
    provider.requires_admin_approval === true ||
    provider.account_status === "pending_phone_review"
  );
}
 
function isVideo(post) {
  return post.media_type === "video";
}
 
function isImage(post) {
  return post.media_type === "image";
}
 
function StatusBadge({ provider }) {
  const info = providerStatus(provider);
  return (
    <span className={`status-badge ${info.className}`}>
      {info.status === "verified" ? (
        <BadgeCheck size={15} />
      ) : info.status === "rejected" ? (
        <ShieldX size={15} />
      ) : (
        <Clock3 size={15} />
      )}
      {info.label}
    </span>
  );
}
 
export default function Admin() {
  const [pinInput, setPinInput] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [activeView, setActiveView] = useState("providers");
  const [report, setReport] = useState([]);
  const [providers, setProviders] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [pinResets, setPinResets] = useState([]);
  const [draftStats, setDraftStats] = useState({});
  const [resetCodes, setResetCodes] = useState({});
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("info");
  const [savingPostId, setSavingPostId] = useState("");
  const [deletingPostId, setDeletingPostId] = useState("");
  const [verifyingProviderId, setVerifyingProviderId] = useState("");
  const [decidingResetId, setDecidingResetId] = useState("");
  const [verificationReview, setVerificationReview] = useState(null);
  const [verificationError, setVerificationError] = useState("");
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [conversationMessages, setConversationMessages] = useState([]);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [privacyNotice, setPrivacyNotice] = useState("");
  // Holds a just-generated PIN in memory only, for the "shown once" delivery
  // modal below - never persisted to storage, cleared as soon as the admin
  // closes that modal.
  const [deliveredPin, setDeliveredPin] = useState(null);
 
  const showStatus = useCallback((message, type = "info") => {
    setStatus(message);
    setStatusType(type);
  }, []);
 
  const loadDashboard = useCallback(
    async (pin = adminPin) => {
      const cleanPin = String(pin || "").trim();
      if (!cleanPin) {
        showStatus("Enter the admin PIN first.", "error");
        return false;
      }
 
      setLoading(true);
      try {
        const [
          reportResult,
          providerResult,
          conversationResult,
          pinResetResult,
        ] =
          await Promise.all([
            adminApi("/api/admin/feedx-report", cleanPin),
            adminApi("/api/admin/time-market/providers", cleanPin),
            adminApi("/api/admin/time-market/conversations", cleanPin),
            adminApi("/api/admin/time-market/pin-resets", cleanPin),
          ]);
 
        const nextReport = Array.isArray(reportResult.report)
          ? reportResult.report
          : [];
        const nextProviders = Array.isArray(providerResult.providers)
          ? providerResult.providers
          : [];
        const nextConversations = Array.isArray(
          conversationResult.conversations
        )
          ? conversationResult.conversations
          : [];
        const nextPinResets = Array.isArray(pinResetResult.requests)
          ? pinResetResult.requests
          : [];
 
        setAdminPin(cleanPin);
        setReport(nextReport);
        setProviders(nextProviders);
        setConversations(nextConversations);
        setPinResets(nextPinResets);
        setPrivacyNotice(
          conversationResult.privacy_notice ||
            "Authorized Gwamo administrators can access conversations for safety, support and abuse investigations."
        );
 
        const nextDrafts = {};
        nextReport.forEach((post) => {
          nextDrafts[String(post.id)] = {
            manual_views: Number(post.manual_views || 0),
            manual_reactions: Number(post.manual_reactions || 0),
          };
        });
        setDraftStats(nextDrafts);
 
        showStatus(
          `${nextProviders.length} providers, ${nextReport.length} services, ${nextConversations.length} conversations and ${nextPinResets.length} PIN reset requests loaded.`,
          "success"
        );
        return true;
      } catch (error) {
        console.error("Admin dashboard failed:", error);
        showStatus(error.message || "Failed to load dashboard.", "error");
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
      if (ok) setPinInput("");
    },
    [loadDashboard, pinInput]
  );
 
  const handleLogout = useCallback(() => {
    setAdminPin("");
    setPinInput("");
    setReport([]);
    setProviders([]);
    setConversations([]);
    setPinResets([]);
    setResetCodes({});
    setSelectedPost(null);
    setSelectedConversation(null);
    setConversationMessages([]);
    setVerificationReview(null);
    setVerificationError("");
    setPrivacyNotice("");
    setStatus("");
    setSearchText("");
    setActiveView("providers");
    setDeliveredPin(null);
  }, []);
 
  const updateDraft = useCallback((postId, field, value) => {
    const numeric = Math.max(0, Number.parseInt(value || "0", 10) || 0);
    setDraftStats((current) => ({
      ...current,
      [postId]: {
        ...(current[postId] || {
          manual_views: 0,
          manual_reactions: 0,
        }),
        [field]: numeric,
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
      try {
        await adminApi("/api/admin/update-feedx-stats", adminPin, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            post_id: postId,
            manual_views: Number(draft.manual_views || 0),
            manual_reactions: Number(draft.manual_reactions || 0),
          }),
        });
        await loadDashboard(adminPin);
        showStatus("Statistics saved.", "success");
      } catch (error) {
        showStatus(error.message || "Failed to save statistics.", "error");
      } finally {
        setSavingPostId("");
      }
    },
    [adminPin, draftStats, loadDashboard, showStatus]
  );
 
  const deletePost = useCallback(
    async (post) => {
      const label =
        post.service_provider_name ||
        post.creator_name ||
        post.title ||
        "service";
 
      if (
        !window.confirm(
          `Delete "${label}" permanently? This removes its media, comments, reactions and analytics.`
        )
      ) {
        return;
      }
 
      const postId = String(post.id);
      setDeletingPostId(postId);
 
      try {
        await adminApi("/api/admin/delete-feedx-post", adminPin, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ post_id: postId }),
        });
 
        setReport((current) =>
          current.filter((item) => String(item.id) !== postId)
        );
        if (String(selectedPost?.id || "") === postId) {
          setSelectedPost(null);
        }
        showStatus("Service deleted.", "success");
      } catch (error) {
        showStatus(error.message || "Failed to delete service.", "error");
      } finally {
        setDeletingPostId("");
      }
    },
    [adminPin, selectedPost, showStatus]
  );
 
  const verifyProvider = useCallback(
    async (provider, nextStatus) => {
      const action =
        nextStatus === "verified"
          ? "approve"
          : nextStatus === "rejected"
          ? "reject"
          : "return to pending";
 
      if (
        nextStatus !== "verified" &&
        !window.confirm(
          `${action.charAt(0).toUpperCase() + action.slice(1)} ${
            provider.full_name || provider.service_provider_name || "this provider"
          }?`
        )
      ) {
        return;
      }
 
      setVerifyingProviderId(String(provider.id));
      setVerificationError("");
      try {
        const result = await adminApi(
          "/api/admin/time-market/verify",
          adminPin,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              provider_id: provider.id,
              status: nextStatus,
              note:
                nextStatus === "verified"
                  ? "Identity and phone confirmed by admin."
                  : nextStatus === "rejected"
                  ? "Registration rejected by admin."
                  : "Returned to pending review.",
            }),
          }
        );
 
        setProviders((current) =>
          current.map((item) =>
            String(item.id) === String(provider.id)
              ? result.provider
              : item
          )
        );

        if (nextStatus === "verified") {
          setVerificationReview(null);
        }
 
        showStatus(result.message || "Provider updated.", "success");
      } catch (error) {
        if (nextStatus === "verified") {
          setVerificationError(
            error.message || "Could not approve this provider."
          );
        }
        showStatus(error.message || "Could not update provider.", "error");
      } finally {
        setVerifyingProviderId("");
      }
    },
    [adminPin, showStatus]
  );

  // Every approval - whether it's a brand-new registration or an existing
  // provider - is now a direct confirmation. The admin still calls the
  // registered number themselves to confirm identity for a first-time
  // pending_phone_review account (see ProviderVerificationModal below); no
  // code is exchanged or checked by the app on either side.
  const beginProviderApproval = useCallback(
    (provider) => {
      if (!providerNeedsPhoneApproval(provider)) {
        if (
          window.confirm(
            `Approve ${provider.full_name || provider.service_provider_name || "this provider"}?`
          )
        ) {
          verifyProvider(provider, "verified");
        }
        return;
      }

      setVerificationReview(provider);
      setVerificationError("");
    },
    [verifyProvider]
  );
 
  const openConversation = useCallback(
    async (conversation) => {
      setSelectedConversation(conversation);
      setConversationMessages([]);
      setConversationLoading(true);
 
      try {
        const data = await adminApi(
          `/api/admin/time-market/conversations?conversation_id=${encodeURIComponent(
            conversation.id
          )}`,
          adminPin
        );
 
        setSelectedConversation(data.conversation || conversation);
        setConversationMessages(
          Array.isArray(data.messages) ? data.messages : []
        );
        if (data.privacy_notice) setPrivacyNotice(data.privacy_notice);
      } catch (error) {
        showStatus(error.message || "Could not open conversation.", "error");
      } finally {
        setConversationLoading(false);
      }
    },
    [adminPin, showStatus]
  );

  const updateResetCode = useCallback((requestId, value) => {
    const code = String(value || "").replace(/\D/g, "").slice(0, 6);
    setResetCodes((current) => ({ ...current, [requestId]: code }));
  }, []);

  // CHANGED: on approval, worker.js now generates a brand-new 8-digit PIN,
  // sets it on the account, and returns it exactly once in this response.
  // We surface it via a dedicated modal instead of just a status toast, so
  // it can't be missed or lost among the other on-screen messages, and we
  // never write it into any longer-lived state or storage.
  const decidePinReset = useCallback(
    async (resetRequest, decision) => {
      const requestId = String(resetRequest.id);
      const code = String(resetCodes[requestId] || "").trim();

      if (decision === "approved" && !/^\d{6}$/.test(code)) {
        showStatus(
          "Call the registered telephone number and enter the complete 6-digit reset code.",
          "error"
        );
        return;
      }

      if (
        decision === "rejected" &&
        !window.confirm(
          `Reject the PIN reset request for ${resetRequest.full_name || resetRequest.phone}?`
        )
      ) {
        return;
      }

      setDecidingResetId(requestId);
      try {
        const result = await adminApi(
          "/api/admin/time-market/pin-reset/decision",
          adminPin,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              request_id: requestId,
              status: decision,
              verification_code: decision === "approved" ? code : undefined,
            }),
          }
        );

        setResetCodes((current) => {
          const next = { ...current };
          delete next[requestId];
          return next;
        });

        if (decision === "approved" && result.generated_pin) {
          setDeliveredPin({
            requestId,
            pin: result.generated_pin,
            phone: result.phone || resetRequest.phone || "",
            fullName:
              resetRequest.full_name ||
              resetRequest.service_provider_name ||
              "",
          });
        }

        await loadDashboard(adminPin);
        showStatus(
          result.message ||
            (decision === "approved"
              ? "PIN reset approved after telephone confirmation."
              : "PIN reset rejected."),
          "success"
        );
      } catch (error) {
        showStatus(error.message || "Could not review PIN reset.", "error");
      } finally {
        setDecidingResetId("");
      }
    },
    [adminPin, loadDashboard, resetCodes, showStatus]
  );

  const closeDeliveredPin = useCallback(() => {
    setDeliveredPin(null);
  }, []);

  const totals = useMemo(
    () =>
      report.reduce(
        (summary, post) => {
          summary.services += 1;
          summary.views += Number(post.displayed_views || 0);
          summary.reactions += Number(post.displayed_reactions || 0);
          summary.comments += Number(post.comment_count || 0);
          summary.watchSeconds += Number(post.total_watch_seconds || 0);
          return summary;
        },
        {
          services: 0,
          views: 0,
          reactions: 0,
          comments: 0,
          watchSeconds: 0,
        }
      ),
    [report]
  );
 
  const providerTotals = useMemo(() => {
    return providers.reduce(
      (summary, provider) => {
        const info = providerStatus(provider);
        summary.total += 1;
        summary[info.status] += 1;
        return summary;
      },
      { total: 0, verified: 0, pending: 0, rejected: 0 }
    );
  }, [providers]);
 
  const filteredProviders = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return providers;
    return providers.filter((provider) =>
      [
        provider.full_name,
        provider.service_provider_name,
        provider.phone,
        provider.services_offered,
        provider.verification_status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [providers, searchText]);
 
  const filteredPosts = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return report;
    return report.filter((post) =>
      [
        post.id,
        post.creator_name,
        post.service_provider_name,
        post.creator_identity,
        post.title,
        post.subtitle,
        post.media_type,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [report, searchText]);
 
  const filteredConversations = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((conversation) =>
      [
        conversation.id,
        conversation.service_provider_name,
        conversation.provider_full_name,
        conversation.provider_phone,
        conversation.customer_full_name,
        conversation.customer_phone,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [conversations, searchText]);

  const filteredPinResets = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return pinResets;
    return pinResets.filter((resetRequest) =>
      [
        resetRequest.id,
        resetRequest.full_name,
        resetRequest.service_provider_name,
        resetRequest.phone,
        resetRequest.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [pinResets, searchText]);

  const pendingResetCount = useMemo(
    () => pinResets.filter((item) => item.status === "pending").length,
    [pinResets]
  );
 
  useEffect(() => {
    setSearchText("");
  }, [activeView]);
 
  if (!adminPin) {
    return (
      <div className="admin-page login-page">
        <section className="login-card">
          <div className="lock-icon">
            <LockKeyhole size={34} />
          </div>
          <span className="eyebrow">TIME MARKET CONTROL CENTER</span>
          <h1>Admin Login</h1>
          <p>
            Manage providers, telephone verification, PIN recovery, services,
            analytics and administrator-accessible conversations.
          </p>
 
          <form onSubmit={handleLogin}>
            <label htmlFor="admin-pin">Admin PIN</label>
            <input
              id="admin-pin"
              type="password"
              inputMode="text"
              minLength={8}
              autoComplete="current-password"
              value={pinInput}
              placeholder="Enter secure admin PIN"
              onChange={(event) => setPinInput(event.target.value)}
              autoFocus
            />
            <button type="submit" disabled={loading || !pinInput.trim()}>
              {loading ? (
                <Loader2 className="spin" size={19} />
              ) : (
                <ShieldCheck size={19} />
              )}
              {loading ? "Checking..." : "Open dashboard"}
            </button>
          </form>
 
          {status ? (
            <div className={`notice ${statusType}`}>{status}</div>
          ) : null}
        </section>
        <AdminStyles />
      </div>
    );
  }
 
  const currentCount =
    activeView === "providers"
      ? filteredProviders.length
      : activeView === "pin-resets"
      ? filteredPinResets.length
      : activeView === "conversations"
      ? filteredConversations.length
      : filteredPosts.length;
 
  return (
    <div className="admin-page">
      <header className="topbar">
        <div>
          <span className="eyebrow">TIME MARKET CONTROL CENTER</span>
          <h1>Admin Dashboard</h1>
        </div>
 
        <div className="top-actions">
          <button
            type="button"
            className="secondary"
            onClick={() => loadDashboard(adminPin)}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="spin" size={18} />
            ) : (
              <RefreshCw size={18} />
            )}
            Refresh
          </button>
 
          <button type="button" className="logout" onClick={handleLogout}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </header>
 
      <main className="shell">
        {status ? (
          <div className={`notice ${statusType}`}>{status}</div>
        ) : null}
 
        <section className="summary-grid">
          <SummaryCard
            label="Providers"
            value={formatCount(providerTotals.total)}
            icon={<Users size={21} />}
          />
          <SummaryCard
            label="Pending"
            value={formatCount(providerTotals.pending)}
            icon={<Clock3 size={21} />}
            tone="red"
          />
          <SummaryCard
            label="Verified"
            value={formatCount(providerTotals.verified)}
            icon={<BadgeCheck size={21} />}
            tone="green"
          />
          <SummaryCard
            label="Services"
            value={formatCount(totals.services)}
            icon={<Activity size={21} />}
          />
          <SummaryCard
            label="Views"
            value={formatCount(totals.views)}
            icon={<Eye size={21} />}
          />
          <SummaryCard
            label="Messages"
            value={formatCount(
              conversations.reduce(
                (sum, item) => sum + Number(item.message_count || 0),
                0
              )
            )}
            icon={<MessageCircle size={21} />}
          />
        </section>
 
        <section className="workspace">
          <nav className="tabs" aria-label="Admin sections">
            <Tab
              active={activeView === "providers"}
              onClick={() => setActiveView("providers")}
              icon={<Users size={18} />}
              label="Providers"
              count={providerTotals.pending}
            />
            <Tab
              active={activeView === "pin-resets"}
              onClick={() => setActiveView("pin-resets")}
              icon={<KeyRound size={18} />}
              label="PIN resets"
              count={pendingResetCount}
            />
            <Tab
              active={activeView === "services"}
              onClick={() => setActiveView("services")}
              icon={<Activity size={18} />}
              label="Services"
            />
            <Tab
              active={activeView === "conversations"}
              onClick={() => setActiveView("conversations")}
              icon={<Inbox size={18} />}
              label="Conversations"
            />
            <Tab
              active={activeView === "analytics"}
              onClick={() => setActiveView("analytics")}
              icon={<BarChart3 size={18} />}
              label="Analytics"
            />
            <Tab
              active={activeView === "comments"}
              onClick={() => setActiveView("comments")}
              icon={<MessageCircle size={18} />}
              label="Comments"
            />
          </nav>
 
          <div className="toolbar">
            <div className="search-box">
              <Search size={18} />
              <input
                type="search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder={
                  activeView === "providers"
                    ? "Search provider, phone or service..."
                    : activeView === "pin-resets"
                    ? "Search PIN reset, name or telephone..."
                    : activeView === "conversations"
                    ? "Search provider or customer..."
                    : "Search service, provider or ID..."
                }
              />
            </div>
            <span>{currentCount} result{currentCount === 1 ? "" : "s"}</span>
          </div>
 
          {activeView === "providers" ? (
            <ProvidersView
              providers={filteredProviders}
              verifyingProviderId={verifyingProviderId}
              verifyProvider={verifyProvider}
              beginProviderApproval={beginProviderApproval}
            />
          ) : null}

          {activeView === "pin-resets" ? (
            <PinResetsView
              requests={filteredPinResets}
              resetCodes={resetCodes}
              updateResetCode={updateResetCode}
              decidePinReset={decidePinReset}
              decidingResetId={decidingResetId}
            />
          ) : null}
 
          {activeView === "services" ? (
            <ServicesView
              posts={filteredPosts}
              drafts={draftStats}
              updateDraft={updateDraft}
              saveStats={saveStats}
              deletePost={deletePost}
              savingPostId={savingPostId}
              deletingPostId={deletingPostId}
              openPost={setSelectedPost}
            />
          ) : null}
 
          {activeView === "conversations" ? (
            <ConversationsView
              conversations={filteredConversations}
              openConversation={openConversation}
            />
          ) : null}
 
          {activeView === "analytics" ? (
            <AnalyticsView posts={filteredPosts} />
          ) : null}
 
          {activeView === "comments" ? (
            <CommentsView posts={filteredPosts} openPost={setSelectedPost} />
          ) : null}
        </section>
      </main>
 
      {selectedPost ? (
        <ServiceModal
          post={selectedPost}
          close={() => setSelectedPost(null)}
          deletePost={deletePost}
          deleting={deletingPostId === String(selectedPost.id)}
        />
      ) : null}
 
      {selectedConversation ? (
        <ConversationModal
          conversation={selectedConversation}
          messages={conversationMessages}
          loading={conversationLoading}
          privacyNotice={privacyNotice}
          close={() => {
            setSelectedConversation(null);
            setConversationMessages([]);
          }}
        />
      ) : null}

      {verificationReview ? (
        <ProviderVerificationModal
          provider={verificationReview}
          error={verificationError}
          busy={verifyingProviderId === String(verificationReview.id)}
          approve={() => verifyProvider(verificationReview, "verified")}
          close={() => {
            if (verifyingProviderId) return;
            setVerificationReview(null);
            setVerificationError("");
          }}
        />
      ) : null}

      {deliveredPin ? (
        <GeneratedPinModal info={deliveredPin} close={closeDeliveredPin} />
      ) : null}
 
      <AdminStyles />
    </div>
  );
}
 
function Tab({ active, onClick, icon, label, count = 0 }) {
  return (
    <button type="button" className={active ? "active" : ""} onClick={onClick}>
      {icon}
      {label}
      {count > 0 ? <b>{count}</b> : null}
    </button>
  );
}
 
function SummaryCard({ label, value, icon, tone = "blue" }) {
  return (
    <article className={`summary-card ${tone}`}>
      <div className="summary-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}
 
function ProvidersView({
  providers,
  verifyingProviderId,
  verifyProvider,
  beginProviderApproval,
}) {
  if (!providers.length) {
    return <EmptyState message="No providers found." />;
  }
 
  return (
    <div className="provider-list">
      {providers.map((provider) => {
        const info = providerStatus(provider);
        const busy = verifyingProviderId === String(provider.id);
        const phone = provider.phone
          ? `+${String(provider.phone).replace(/^\+/, "")}`
          : "";
 
        return (
          <article className="provider-card" key={provider.id}>
            <div className="provider-avatar">
              {provider.profile_image_url ? (
                <img src={provider.profile_image_url} alt="" loading="lazy" />
              ) : (
                <UserRound size={28} />
              )}
            </div>
 
            <div className="provider-body">
              <div className="provider-heading">
                <div>
                  <div className="provider-name">
                    <h2>
                      {provider.service_provider_name ||
                        provider.full_name ||
                        "Unnamed provider"}
                    </h2>
                    <StatusBadge provider={provider} />
                  </div>
                  <p className="legal-name">{provider.full_name || ""}</p>
                </div>
                <span className="provider-id">
                  #{String(provider.id).slice(0, 8)}
                </span>
              </div>
 
              <div className="provider-info-grid">
                <Info label="Telephone" value={phone || "None"} />
                <Info
                  label="Registered"
                  value={formatDate(provider.created_at)}
                />
                <Info
                  label="Account"
                  value={provider.account_status || "active"}
                />
                <Info
                  label="Telephone verified"
                  value={provider.phone_verified ? "Yes" : "Not yet"}
                />
              </div>
 
              {provider.services_offered ? (
                <div className="services-offered">
                  <span>Services offered</span>
                  <p>{provider.services_offered}</p>
                </div>
              ) : null}
 
              <div className="provider-actions">
                {phone ? (
                  <a className="call-button" href={`tel:${phone}`}>
                    <Phone size={17} />
                    Call
                  </a>
                ) : null}
 
                {info.status === "pending" ? (
                  <button
                    type="button"
                    className="approve-button"
                    disabled={busy}
                    onClick={() => beginProviderApproval(provider)}
                  >
                    {busy ? (
                      <Loader2 className="spin" size={17} />
                    ) : (
                      <CheckCircle2 size={17} />
                    )}
                    Approve
                  </button>
                ) : null}
 
                {info.status !== "pending" ? (
                  <button
                    type="button"
                    className="pending-button"
                    disabled={busy}
                    onClick={() => verifyProvider(provider, "pending")}
                  >
                    <Clock3 size={17} />
                    Pending
                  </button>
                ) : null}
 
                {info.status !== "rejected" ? (
                  <button
                    type="button"
                    className="reject-button"
                    disabled={busy}
                    onClick={() => verifyProvider(provider, "rejected")}
                  >
                    <ShieldX size={17} />
                    Reject
                  </button>
                ) : null}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function PinResetsView({
  requests,
  resetCodes,
  updateResetCode,
  decidePinReset,
  decidingResetId,
}) {
  if (!requests.length) {
    return <EmptyState message="No PIN reset requests found." />;
  }

  return (
    <div className="pin-reset-list">
      <div className="security-callout">
        <ShieldCheck size={20} />
        <div>
          <strong>Telephone confirmation is mandatory</strong>
          <p>
            Call the registered number yourself. Approve only when the account
            owner reads the same 6-digit code shown on their Gwamo screen. A
            new PIN is generated automatically once you approve - read it to
            them on the same call or send it by SMS.
          </p>
        </div>
      </div>

      {requests.map((resetRequest) => {
        const requestId = String(resetRequest.id);
        const statusInfo = resetStatusInfo(resetRequest.status);
        const busy = decidingResetId === requestId;
        const pending = resetRequest.status === "pending";
        const expired = Date.parse(resetRequest.expires_at || "") <= Date.now();
        const phone = String(resetRequest.phone || "").replace(/^\+/, "");

        return (
          <article className="pin-reset-card" key={requestId}>
            <div className="pin-reset-heading">
              <div>
                <h2>{resetRequest.full_name || "Unknown account owner"}</h2>
                <p>
                  {resetRequest.service_provider_name || "Gwamo provider"}
                </p>
              </div>
              <span className={`status-badge ${statusInfo.className}`}>
                {statusInfo.label}
              </span>
            </div>

            <div className="provider-info-grid">
              <Info label="Registered telephone" value={phone ? `+${phone}` : "None"} />
              <Info label="Requested" value={formatDate(resetRequest.created_at)} />
              <Info label="Code expires" value={formatDate(resetRequest.expires_at)} />
              <Info label="Wrong attempts" value={String(resetRequest.attempts || 0)} />
            </div>

            {pending && !expired ? (
              <div className="pin-reset-review">
                {phone ? (
                  <a className="call-button" href={`tel:+${phone}`}>
                    <Phone size={17} />
                    Call registered number
                  </a>
                ) : (
                  <span className="missing-phone">No registered telephone</span>
                )}
                <label>
                  <span>Code read by account owner</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={resetCodes[requestId] || ""}
                    placeholder="6-digit code"
                    onChange={(event) =>
                      updateResetCode(requestId, event.target.value)
                    }
                  />
                </label>
                <button
                  type="button"
                  className="approve-button"
                  disabled={
                    busy ||
                    !phone ||
                    !/^\d{6}$/.test(resetCodes[requestId] || "")
                  }
                  onClick={() => decidePinReset(resetRequest, "approved")}
                >
                  {busy ? <Loader2 className="spin" size={17} /> : <CheckCircle2 size={17} />}
                  Confirm and approve
                </button>
                <button
                  type="button"
                  className="reject-button"
                  disabled={busy}
                  onClick={() => decidePinReset(resetRequest, "rejected")}
                >
                  <ShieldX size={17} />
                  Reject
                </button>
              </div>
            ) : pending && expired ? (
              <div className="expired-note">This verification code has expired.</div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function ServicesView({
  posts,
  drafts,
  updateDraft,
  saveStats,
  deletePost,
  savingPostId,
  deletingPostId,
  openPost,
}) {
  if (!posts.length) {
    return <EmptyState message="No services found." />;
  }
 
  return (
    <div className="service-list">
      {posts.map((post) => {
        const postId = String(post.id);
        const draft = drafts[postId] || {
          manual_views: Number(post.manual_views || 0),
          manual_reactions: Number(post.manual_reactions || 0),
        };
 
        return (
          <article className="service-card" key={postId}>
            <div className="media-side">
              <MediaPreview post={post} />
              <button
                type="button"
                className="secondary full"
                onClick={() => openPost(post)}
              >
                <Eye size={17} />
                Details
              </button>
            </div>
 
            <div className="service-body">
              <span className="service-id">SERVICE #{postId}</span>
              <h2>
                {post.service_charge_per_minute ||
                  post.title ||
                  "Price not set"}
              </h2>
              <p>
                {post.work_description ||
                  post.subtitle ||
                  "No work description."}
              </p>
 
              <div className="creator-strip">
                <div className="small-avatar">
                  {post.logo_url || post.profile_image_url ? (
                    <img
                      src={post.logo_url || post.profile_image_url}
                      alt=""
                      loading="lazy"
                    />
                  ) : (
                    <UserRound size={21} />
                  )}
                </div>
                <div>
                  <strong>
                    {post.service_provider_name ||
                      post.creator_name ||
                      "Unnamed provider"}
                  </strong>
                  <span>{post.creator_identity || "No contact"}</span>
                </div>
              </div>
 
              <div className="metric-grid">
                <Metric
                  icon={<Eye size={16} />}
                  label="Views"
                  value={post.displayed_views}
                />
                <Metric
                  icon={<Star size={16} />}
                  label="Reactions"
                  value={post.displayed_reactions}
                />
                <Metric
                  icon={<MessageCircle size={16} />}
                  label="Comments"
                  value={post.comment_count}
                />
                <Metric
                  icon={<Clock3 size={16} />}
                  label="Watch"
                  value={formatDuration(post.total_watch_seconds)}
                  raw
                />
              </div>
 
              <div className="manual-grid">
                <label>
                  <span>Admin views</span>
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
                  <span>Admin reactions</span>
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
 
              <div className="row-actions">
                <button
                  type="button"
                  className="save-button"
                  onClick={() => saveStats(postId)}
                  disabled={savingPostId === postId}
                >
                  {savingPostId === postId ? (
                    <Loader2 className="spin" size={17} />
                  ) : (
                    <Save size={17} />
                  )}
                  Save stats
                </button>
 
                <button
                  type="button"
                  className="delete-button"
                  onClick={() => deletePost(post)}
                  disabled={deletingPostId === postId}
                >
                  {deletingPostId === postId ? (
                    <Loader2 className="spin" size={17} />
                  ) : (
                    <Trash2 size={17} />
                  )}
                  Delete
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
 
function ConversationsView({ conversations, openConversation }) {
  if (!conversations.length) {
    return <EmptyState message="No administrator-accessible conversations yet." />;
  }
 
  return (
    <div className="conversation-list">
      {conversations.map((conversation) => (
        <button
          type="button"
          className="conversation-row"
          key={conversation.id}
          onClick={() => openConversation(conversation)}
        >
          <span className="conversation-icon">
            <MessageCircle size={20} />
          </span>
 
          <span className="conversation-main">
            <strong>
              {conversation.service_provider_name ||
                conversation.provider_full_name ||
                "Provider"}
            </strong>
            <small>
              Buyer: {conversation.customer_full_name || "Unknown"}{" "}
              {conversation.customer_phone
                ? `(+${String(conversation.customer_phone).replace(
                    /^\+/,
                    ""
                  )})`
                : ""}
            </small>
          </span>
 
          <span className="conversation-meta">
            <strong>
              {formatCount(conversation.message_count || 0)} messages
            </strong>
            <small>
              {formatDate(
                conversation.last_message_at ||
                  conversation.updated_at
              )}
            </small>
          </span>
        </button>
      ))}
    </div>
  );
}
 
function AnalyticsView({ posts }) {
  if (!posts.length) {
    return <EmptyState message="No analytics available." />;
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
          <span className="rank">#{index + 1}</span>
          <div className="analytics-service">
            <strong>
              {post.service_provider_name ||
                post.creator_name ||
                "Provider"}
            </strong>
            <small>
              {post.service_charge_per_minute || post.title || "Service"}
            </small>
          </div>
          <Info
            label="Watch"
            value={formatDuration(post.total_watch_seconds)}
          />
          <Info label="Views" value={formatCount(post.displayed_views)} />
          <Info
            label="Last watched"
            value={formatDate(post.last_watched_at)}
          />
        </article>
      ))}
    </div>
  );
}
 
function CommentsView({ posts, openPost }) {
  const withComments = posts.filter(
    (post) => Array.isArray(post.comments) && post.comments.length
  );
 
  if (!withComments.length) {
    return <EmptyState message="No comments yet." />;
  }
 
  return (
    <div className="comment-groups">
      {withComments.map((post) => (
        <section className="comment-group" key={post.id}>
          <header>
            <div>
              <strong>
                {post.service_provider_name ||
                  post.creator_name ||
                  "Provider"}
              </strong>
              <span>{post.title || "Service"}</span>
            </div>
            <button type="button" onClick={() => openPost(post)}>
              View service
            </button>
          </header>
 
          {post.comments.map((comment) => (
            <article className="comment-row" key={comment.id}>
              <span className="flag">
                {comment.country_flag || "🌍"}
              </span>
              <div>
                <strong>
                  {comment.commenter_phone || "Private number"}
                </strong>
                <p>{comment.comment}</p>
                <small>{formatDate(comment.created_at)}</small>
              </div>
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}
 
function ConversationModal({
  conversation,
  messages,
  loading,
  privacyNotice,
  close,
}) {
  return (
    <div className="overlay" onMouseDown={close}>
      <section
        className="conversation-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <span>ADMINISTRATOR-ACCESSIBLE CONVERSATION</span>
            <h2>
              {conversation.service_provider_name ||
                conversation.provider_full_name ||
                "Provider"}
            </h2>
            <small>
              Provider: {conversation.provider_full_name || "Unknown"}{" "}
              {conversation.provider_phone
                ? `(+${String(conversation.provider_phone).replace(
                    /^\+/,
                    ""
                  )})`
                : ""}
              {" • "}
              Buyer: {conversation.customer_full_name || "Unknown"}{" "}
              {conversation.customer_phone
                ? `(+${String(conversation.customer_phone).replace(
                    /^\+/,
                    ""
                  )})`
                : ""}
            </small>
          </div>
          <button type="button" onClick={close}>
            <X size={22} />
          </button>
        </header>

        <div className="privacy-callout">
          <ShieldCheck size={18} />
          <p>
            {privacyNotice ||
              "Authorized Gwamo administrators can access conversations for safety, support and abuse investigations. Users must be informed in the Privacy Policy."}
          </p>
        </div>
 
        <div className="admin-chat">
          {loading ? (
            <div className="chat-loading">
              <Loader2 className="spin" size={25} />
            </div>
          ) : !messages.length ? (
            <EmptyState message="This conversation has no messages." />
          ) : (
            messages.map((message) => (
              <article className="admin-message-bubble" key={message.id}>
                <div className="message-head">
                  <strong>
                    {message.sender_service_provider_name ||
                      message.sender_full_name ||
                      "User"}
                  </strong>
                  <span>
                    {message.sender_phone
                      ? `+${String(message.sender_phone).replace(
                          /^\+/,
                          ""
                        )}`
                      : ""}
                  </span>
                </div>
 
                {message.message_type === "image" && message.media_url ? (
                  <img
                    src={message.media_url}
                    alt="Message attachment"
                    loading="lazy"
                  />
                ) : null}
 
                {message.message_type === "video" && message.media_url ? (
                  <video
                    src={message.media_url}
                    controls
                    playsInline
                    preload="metadata"
                  />
                ) : null}
 
                {message.message_type === "voice" && message.media_url ? (
                  <audio
                    src={message.media_url}
                    controls
                    preload="none"
                  />
                ) : null}

                {message.message_type === "document" && message.media_url ? (
                  <a
                    className="document-attachment"
                    href={message.media_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FileText size={22} />
                    <span>
                      <strong>{message.file_name || "Document"}</strong>
                      <small>
                        {[message.mime_type, formatBytes(message.file_size)]
                          .filter(Boolean)
                          .join(" • ")}
                      </small>
                    </span>
                    <Download size={18} />
                  </a>
                ) : null}
 
                {message.text_content ? (
                  <p>{message.text_content}</p>
                ) : null}
 
                <time>
                  {formatDate(message.created_at)}
                  {message.read_at
                    ? ` • Read ${formatDate(message.read_at)}`
                    : message.delivered_at
                    ? ` • Delivered ${formatDate(message.delivered_at)}`
                    : " • Sent"}
                </time>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function ProviderVerificationModal({
  provider,
  error,
  busy,
  approve,
  close,
}) {
  const phone = String(provider.phone || "").replace(/^\+/, "");

  return (
    <div className="overlay" onMouseDown={close}>
      <section
        className="verification-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <span>NAME &amp; TELEPHONE REVIEW</span>
            <h2>{provider.full_name || provider.service_provider_name}</h2>
            <small>
              Approve only after confirming this name belongs to the
              registered number below.
            </small>
          </div>
          <button type="button" onClick={close} disabled={busy}>
            <X size={22} />
          </button>
        </header>

        <div className="security-callout compact">
          <ShieldCheck size={20} />
          <div>
            <strong>No code needed</strong>
            <p>
              Call the registered number and confirm the person answering is{" "}
              {provider.full_name || provider.service_provider_name || "this person"}
              . Once you're satisfied the name matches the number, approve
              below.
            </p>
          </div>
        </div>

        <div className="provider-info-grid">
          <Info label="Registered telephone" value={phone ? `+${phone}` : "None"} />
          <Info label="Account" value={provider.account_status || "pending_phone_review"} />
          <Info label="Registered" value={formatDate(provider.created_at)} />
        </div>

        {phone ? (
          <a className="call-button verification-call" href={`tel:+${phone}`}>
            <Phone size={18} />
            Call +{phone}
          </a>
        ) : (
          <div className="notice error">This provider has no registered telephone.</div>
        )}

        {error ? <div className="notice error">{error}</div> : null}

        <div className="verification-actions">
          <button type="button" className="secondary" onClick={close} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="approve-button"
            onClick={approve}
            disabled={busy || !phone}
          >
            {busy ? <Loader2 className="spin" size={18} /> : <CheckCircle2 size={18} />}
            Confirm and approve
          </button>
        </div>
      </section>
    </div>
  );
}

// NEW: shown immediately after an admin approves a PIN reset. worker.js
// generates the new 8-digit PIN and returns it exactly once in that
// response - this modal is the only place it is ever displayed. It lives
// only in transient React state (see `deliveredPin` in Admin()) and is
// discarded the moment this modal closes; nothing here is written to
// localStorage, sessionStorage, or any other persistent store.
function GeneratedPinModal({ info, close }) {
  const [copied, setCopied] = useState(false);
  const phone = String(info.phone || "").replace(/^\+/, "");
  const smsBody = `Your new Gwamo PIN is: ${info.pin}. Keep it private - Gwamo staff will never ask you to share it.`;
  const isAppleUserAgent =
    typeof navigator !== "undefined" &&
    /iphone|ipad|ipod|macintosh/i.test(navigator.userAgent || "");
  const smsHref = phone
    ? `sms:+${phone}${isAppleUserAgent ? "&" : "?"}body=${encodeURIComponent(
        smsBody
      )}`
    : "";

  const copyPin = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(info.pin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may be unavailable (older browser, no HTTPS, etc.) -
      // the PIN is still fully visible on screen either way.
    }
  }, [info.pin]);

  return (
    <div className="overlay" onMouseDown={close}>
      <section
        className="pin-delivery-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <span>NEW PIN GENERATED</span>
            <h2>{info.fullName || "Account owner"}</h2>
            <small>
              Read it out on the call, or send it by SMS, then close this
              window once it has been delivered.
            </small>
          </div>
          <button type="button" onClick={close}>
            <X size={22} />
          </button>
        </header>

        <div className="security-callout compact">
          <ShieldCheck size={20} />
          <div>
            <strong>This PIN will not be shown again</strong>
            <p>
              It is not stored anywhere in plain text once this window
              closes. If it's lost, the person must request another reset.
            </p>
          </div>
        </div>

        <div className="pin-display">
          <span>New 8-digit PIN</span>
          <strong>{info.pin}</strong>
        </div>

        <div className="pin-delivery-actions">
          <button type="button" className="secondary" onClick={copyPin}>
            {copied ? <CheckCircle2 size={17} /> : <KeyRound size={17} />}
            {copied ? "Copied" : "Copy PIN"}
          </button>
          {phone ? (
            <a className="call-button" href={`tel:+${phone}`}>
              <Phone size={17} />
              Call +{phone}
            </a>
          ) : null}
          {smsHref ? (
            <a className="call-button" href={smsHref}>
              <MessageCircle size={17} />
              Send SMS
            </a>
          ) : null}
        </div>

        {!phone ? (
          <div className="notice error">
            No registered telephone on file - deliver this PIN by another
            verified channel.
          </div>
        ) : null}

        <button type="button" className="approve-button full" onClick={close}>
          <CheckCircle2 size={18} />
          I've delivered this PIN
        </button>
      </section>
    </div>
  );
}

function ServiceModal({ post, close, deletePost, deleting }) {
  return (
    <div className="overlay" onMouseDown={close}>
      <section
        className="service-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <span>SERVICE #{post.id}</span>
            <h2>
              {post.service_provider_name ||
                post.creator_name ||
                "Service Provider"}
            </h2>
          </div>
          <button type="button" onClick={close}>
            <X size={22} />
          </button>
        </header>
 
        <MediaPreview post={post} large />
 
        <div className="details-grid">
          <Info
            label="Service provider"
            value={
              post.service_provider_name ||
              post.creator_name ||
              "Unnamed"
            }
          />
          <Info
            label="Telephone"
            value={post.creator_identity || "None"}
          />
          <Info
            label="Charge / minute"
            value={
              post.service_charge_per_minute ||
              post.title ||
              "Not set"
            }
          />
          <Info
            label="Views"
            value={formatCount(post.displayed_views)}
          />
          <Info
            label="Reactions"
            value={formatCount(post.displayed_reactions)}
          />
          <Info
            label="Watch time"
            value={formatDuration(post.total_watch_seconds)}
          />
        </div>
 
        <div className="description-box">
          <span>Work description</span>
          <p>
            {post.work_description ||
              post.subtitle ||
              "No description."}
          </p>
        </div>
 
        <button
          type="button"
          className="delete-button full"
          onClick={() => deletePost(post)}
          disabled={deleting}
        >
          {deleting ? (
            <Loader2 className="spin" size={18} />
          ) : (
            <Trash2 size={18} />
          )}
          Delete service
        </button>
      </section>
    </div>
  );
}
 
function MediaPreview({ post, large = false }) {
  const className = large ? "media-preview large" : "media-preview";
 
  if (isImage(post)) {
    return (
      <div className={className}>
        <img
          src={post.media_url}
          alt={post.creator_name || "Service media"}
          loading="lazy"
        />
      </div>
    );
  }
 
  if (isVideo(post)) {
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
    <div className={`${className} external-media`}>
      <ImageIcon size={24} />
      <span>External media</span>
      {post.media_url ? (
        <a href={post.media_url} target="_blank" rel="noreferrer">
          Open link
        </a>
      ) : null}
    </div>
  );
}
 
function Metric({ icon, label, value, raw = false }) {
  return (
    <div className="metric">
      {icon}
      <span>{label}</span>
      <strong>{raw ? value : formatCount(value)}</strong>
    </div>
  );
}
 
function Info({ label, value }) {
  return (
    <div className="info">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
 
function EmptyState({ message }) {
  return (
    <div className="empty">
      <BarChart3 size={35} />
      <strong>{message}</strong>
    </div>
  );
}
 
function AdminStyles() {
  return (
    <style>{`
      :root {
        --bg: #f4f7fb;
        --panel: #ffffff;
        --text: #172033;
        --muted: #697386;
        --line: #e2e8f0;
        --blue: #087cff;
        --blue-dark: #0066df;
        --green: #0f9f6e;
        --red: #dc3545;
        --amber: #d98b00;
        --shadow: 0 16px 40px rgba(29, 42, 68, .08);
      }
 
      * { box-sizing: border-box; }
      body { margin: 0; }
      button, input { font: inherit; }
      button { cursor: pointer; }
      button:disabled { opacity: .6; cursor: wait; }
 
      .admin-page {
        min-height: 100svh;
        padding-bottom: 64px;
        color: var(--text);
        background:
          radial-gradient(circle at top left, rgba(8,124,255,.08), transparent 32%),
          var(--bg);
        font-family: Inter, Arial, Helvetica, sans-serif;
      }
 
      .login-page {
        display: grid;
        place-items: center;
        padding: 20px;
      }
 
      .login-card {
        width: min(100%, 430px);
        padding: 30px;
        border: 1px solid var(--line);
        border-radius: 24px;
        background: var(--panel);
        box-shadow: var(--shadow);
      }
 
      .lock-icon {
        width: 64px;
        height: 64px;
        display: grid;
        place-items: center;
        margin-bottom: 20px;
        border-radius: 19px;
        color: white;
        background: linear-gradient(145deg, var(--blue), var(--blue-dark));
      }
 
      .eyebrow {
        color: var(--blue);
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 1.3px;
      }
 
      .login-card h1, .topbar h1 { margin: 5px 0 0; }
      .login-card p {
        color: var(--muted);
        line-height: 1.55;
        font-size: 14px;
      }
 
      .login-card form { display: grid; gap: 10px; margin-top: 22px; }
      .login-card label { font-size: 13px; font-weight: 800; }
      .login-card input {
        height: 50px;
        border: 1px solid var(--line);
        border-radius: 13px;
        padding: 0 14px;
        outline: none;
      }
      .login-card input:focus {
        border-color: var(--blue);
        box-shadow: 0 0 0 4px rgba(8,124,255,.1);
      }
      .login-card form button {
        height: 48px;
        border: 0;
        border-radius: 13px;
        color: white;
        background: var(--blue);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-weight: 900;
      }
 
      .topbar {
        width: min(calc(100% - 28px), 1320px);
        margin: 0 auto;
        padding: 24px 0 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
      }
 
      .top-actions, .row-actions, .provider-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
 
      .secondary, .logout, .save-button, .delete-button,
      .approve-button, .pending-button, .reject-button, .call-button {
        min-height: 42px;
        padding: 0 14px;
        border-radius: 11px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        text-decoration: none;
        font-weight: 800;
      }
 
      .secondary, .pending-button {
        border: 1px solid var(--line);
        color: var(--text);
        background: white;
      }
 
      .logout, .delete-button, .reject-button {
        border: 1px solid rgba(220,53,69,.22);
        color: var(--red);
        background: #fff5f6;
      }
 
      .save-button, .approve-button {
        border: 0;
        color: white;
        background: var(--blue);
      }
 
      .approve-button { background: var(--green); }
      .approve-button.full { width: 100%; }
 
      .call-button {
        border: 1px solid #b9ddff;
        color: #0757ad;
        background: #eef7ff;
      }
 
      .shell {
        width: min(calc(100% - 28px), 1320px);
        margin: 0 auto;
      }
 
      .notice {
        margin-bottom: 14px;
        padding: 12px 14px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 800;
      }
 
      .notice.info { color: #0757ad; background: #eaf4ff; }
      .notice.success { color: #087653; background: #eafaf4; }
      .notice.error { color: #a61b2b; background: #fff0f2; }
 
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(6, minmax(0, 1fr));
        gap: 10px;
        margin-bottom: 16px;
      }
 
      .summary-card {
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px;
        border: 1px solid var(--line);
        border-radius: 16px;
        background: white;
      }
 
      .summary-icon {
        width: 40px;
        height: 40px;
        flex: 0 0 40px;
        display: grid;
        place-items: center;
        border-radius: 12px;
        color: var(--blue);
        background: #eaf4ff;
      }
 
      .summary-card.red .summary-icon { color: var(--red); background: #fff0f2; }
      .summary-card.green .summary-icon { color: var(--green); background: #eafaf4; }
 
      .summary-card span {
        display: block;
        color: var(--muted);
        font-size: 11px;
        font-weight: 700;
      }
 
      .summary-card strong {
        display: block;
        margin-top: 4px;
        font-size: 19px;
        overflow: hidden;
        text-overflow: ellipsis;
      }
 
      .workspace {
        overflow: hidden;
        border: 1px solid var(--line);
        border-radius: 21px;
        background: white;
        box-shadow: var(--shadow);
      }
 
      .tabs {
        display: flex;
        gap: 6px;
        padding: 11px;
        border-bottom: 1px solid var(--line);
        background: #fbfcfe;
        overflow-x: auto;
      }
 
      .tabs button {
        flex: 0 0 auto;
        min-height: 40px;
        padding: 0 13px;
        border: 0;
        border-radius: 11px;
        color: var(--muted);
        background: transparent;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        font-weight: 900;
      }
 
      .tabs button.active { color: white; background: var(--blue); }
      .tabs b {
        min-width: 20px;
        height: 20px;
        display: grid;
        place-items: center;
        border-radius: 10px;
        color: var(--red);
        background: white;
        font-size: 10px;
      }
 
      .toolbar {
        padding: 14px;
        border-bottom: 1px solid var(--line);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
 
      .toolbar > span {
        color: var(--muted);
        font-size: 12px;
        font-weight: 800;
      }
 
      .search-box {
        width: min(100%, 520px);
        height: 43px;
        padding: 0 12px;
        border: 1px solid var(--line);
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--muted);
      }
 
      .search-box input {
        min-width: 0;
        flex: 1;
        height: 100%;
        border: 0;
        outline: 0;
        background: transparent;
      }
 
      .provider-list, .service-list, .analytics-list, .comment-groups,
      .pin-reset-list {
        display: grid;
        gap: 12px;
        padding: 14px;
      }

      .security-callout, .privacy-callout {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 13px;
        border: 1px solid #b9ddff;
        border-radius: 13px;
        color: #0757ad;
        background: #eef7ff;
      }

      .security-callout svg, .privacy-callout svg { flex: 0 0 auto; }
      .security-callout strong { display: block; font-size: 12px; }
      .security-callout p, .privacy-callout p {
        margin: 4px 0 0;
        font-size: 11px;
        line-height: 1.5;
      }
      .security-callout.compact { margin-bottom: 12px; }

      .pin-reset-card {
        padding: 14px;
        border: 1px solid var(--line);
        border-radius: 16px;
        background: white;
      }

      .pin-reset-heading {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }
      .pin-reset-heading h2 { margin: 0; font-size: 16px; }
      .pin-reset-heading p { margin: 4px 0 0; color: var(--muted); font-size: 11px; }

      .pin-reset-review {
        display: grid;
        grid-template-columns: auto minmax(180px, 1fr) auto auto;
        align-items: end;
        gap: 9px;
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid var(--line);
      }

      .pin-reset-review label span {
        display: block;
        margin-bottom: 5px;
        color: var(--muted);
        font-size: 10px;
        font-weight: 800;
      }

      .pin-reset-review input {
        width: 100%;
        height: 42px;
        padding: 0 12px;
        border: 1px solid var(--line);
        border-radius: 10px;
        outline: 0;
        letter-spacing: 2px;
        font-weight: 900;
      }
      .pin-reset-review input:focus {
        border-color: var(--blue);
        box-shadow: 0 0 0 4px rgba(8,124,255,.1);
      }
      .expired-note {
        margin-top: 11px;
        padding: 10px;
        border-radius: 10px;
        color: #805700;
        background: #fff7dc;
        font-size: 11px;
        font-weight: 800;
      }
      .missing-phone {
        min-height: 42px;
        display: inline-flex;
        align-items: center;
        color: var(--red);
        font-size: 11px;
        font-weight: 800;
      }
 
      .provider-card {
        display: grid;
        grid-template-columns: 58px 1fr;
        gap: 12px;
        padding: 14px;
        border: 1px solid var(--line);
        border-radius: 16px;
      }
 
      .provider-avatar {
        width: 54px;
        height: 54px;
        display: grid;
        place-items: center;
        overflow: hidden;
        border-radius: 50%;
        color: var(--muted);
        background: #edf2f7;
      }
 
      .provider-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
 
      .provider-body { min-width: 0; }
      .provider-heading {
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }
 
      .provider-name {
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 7px;
        flex-wrap: wrap;
      }
 
      .provider-name h2 {
        margin: 0;
        font-size: 17px;
      }
 
      .legal-name {
        margin: 3px 0 0;
        color: var(--muted);
        font-size: 12px;
      }
 
      .provider-id {
        color: var(--muted);
        font-size: 10px;
        font-weight: 800;
      }
 
      .status-badge {
        min-height: 25px;
        padding: 0 8px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 10px;
        font-weight: 900;
      }
 
      .status-badge.green { color: #087653; background: #eafaf4; }
      .status-badge.red { color: #a61b2b; background: #fff0f2; }
      .status-badge.gray { color: #596579; background: #edf1f5; }
 
      .provider-info-grid, .details-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
        margin-top: 12px;
      }
 
      .info {
        min-width: 0;
        padding: 10px;
        border: 1px solid var(--line);
        border-radius: 11px;
      }
 
      .info span {
        display: block;
        color: var(--muted);
        font-size: 10px;
        font-weight: 700;
      }
 
      .info strong {
        display: block;
        margin-top: 4px;
        font-size: 12px;
        overflow-wrap: anywhere;
      }
 
      .services-offered {
        margin-top: 10px;
        padding: 10px;
        border-radius: 11px;
        background: #f7f9fc;
      }
 
      .services-offered span {
        color: var(--muted);
        font-size: 10px;
        font-weight: 800;
      }
 
      .services-offered p {
        margin: 5px 0 0;
        font-size: 12px;
        line-height: 1.45;
      }
 
      .provider-actions { margin-top: 11px; }
 
      .service-card {
        display: grid;
        grid-template-columns: 220px 1fr;
        overflow: hidden;
        border: 1px solid var(--line);
        border-radius: 17px;
      }
 
      .media-side {
        padding: 11px;
        background: #f7f9fc;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
 
      .media-preview {
        width: 100%;
        aspect-ratio: 16 / 10;
        display: grid;
        place-items: center;
        overflow: hidden;
        border-radius: 12px;
        color: white;
        background: #050a13;
      }
 
      .media-preview.large {
        max-height: 430px;
        aspect-ratio: 16 / 9;
      }
 
      .media-preview img, .media-preview video {
        width: 100%;
        height: 100%;
        object-fit: contain;
        background: #050a13;
      }
 
      .external-media {
        gap: 6px;
        text-align: center;
        font-size: 12px;
      }
 
      .external-media a { color: #7ec0ff; }
 
      .full { width: 100%; }
 
      .service-body { min-width: 0; padding: 16px; }
      .service-id {
        color: var(--blue);
        font-size: 10px;
        font-weight: 900;
      }
 
      .service-body h2 { margin: 4px 0 6px; font-size: 19px; }
      .service-body > p {
        margin: 0;
        color: var(--muted);
        font-size: 13px;
        line-height: 1.45;
      }
 
      .creator-strip {
        display: flex;
        align-items: center;
        gap: 9px;
        margin-top: 12px;
        padding: 9px;
        border-radius: 11px;
        background: #f7f9fc;
      }
 
      .small-avatar {
        width: 38px;
        height: 38px;
        flex: 0 0 38px;
        display: grid;
        place-items: center;
        overflow: hidden;
        border-radius: 50%;
        color: var(--muted);
        background: #e8edf4;
      }
 
      .small-avatar img { width: 100%; height: 100%; object-fit: cover; }
      .creator-strip strong, .creator-strip span { display: block; }
      .creator-strip strong { font-size: 12px; }
      .creator-strip span {
        margin-top: 2px;
        color: var(--muted);
        font-size: 10px;
        overflow-wrap: anywhere;
      }
 
      .metric-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 7px;
        margin-top: 11px;
      }
 
      .metric {
        min-width: 0;
        padding: 9px;
        border: 1px solid var(--line);
        border-radius: 10px;
      }
 
      .metric svg { color: var(--blue); }
      .metric span {
        display: block;
        margin-top: 3px;
        color: var(--muted);
        font-size: 9px;
      }
 
      .metric strong {
        display: block;
        margin-top: 2px;
        font-size: 12px;
        overflow: hidden;
        text-overflow: ellipsis;
      }
 
      .manual-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 9px;
        margin-top: 11px;
      }
 
      .manual-grid span {
        display: block;
        margin-bottom: 5px;
        color: var(--muted);
        font-size: 10px;
        font-weight: 800;
      }
 
      .manual-grid input {
        width: 100%;
        height: 39px;
        padding: 0 10px;
        border: 1px solid var(--line);
        border-radius: 10px;
        outline: 0;
      }
 
      .row-actions { margin-top: 11px; }
 
      .conversation-list { display: grid; }
      .conversation-row {
        width: 100%;
        min-height: 72px;
        padding: 11px 14px;
        border: 0;
        border-bottom: 1px solid var(--line);
        background: white;
        display: grid;
        grid-template-columns: 42px 1fr auto;
        align-items: center;
        gap: 10px;
        text-align: left;
        color: var(--text);
      }
 
      .conversation-row:hover { background: #f8fbff; }
 
      .conversation-icon {
        width: 40px;
        height: 40px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        color: var(--blue);
        background: #eaf4ff;
      }
 
      .conversation-main { min-width: 0; }
      .conversation-main strong, .conversation-main small {
        display: block;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
 
      .conversation-main strong { font-size: 13px; }
      .conversation-main small {
        margin-top: 4px;
        color: var(--muted);
        font-size: 10px;
      }
 
      .conversation-meta { text-align: right; }
      .conversation-meta strong, .conversation-meta small { display: block; }
      .conversation-meta strong { font-size: 11px; }
      .conversation-meta small {
        margin-top: 3px;
        color: var(--muted);
        font-size: 9px;
      }
 
      .analytics-row {
        display: grid;
        grid-template-columns: 44px minmax(170px,1fr) repeat(3,minmax(110px,.7fr));
        align-items: center;
        gap: 10px;
        padding: 12px;
        border: 1px solid var(--line);
        border-radius: 13px;
      }
 
      .rank { color: var(--blue); font-weight: 900; }
      .analytics-service strong, .analytics-service small { display: block; }
      .analytics-service small {
        margin-top: 3px;
        color: var(--muted);
        font-size: 10px;
      }
 
      .comment-group {
        overflow: hidden;
        border: 1px solid var(--line);
        border-radius: 14px;
      }
 
      .comment-group > header {
        padding: 12px;
        background: #f7f9fc;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
      }
 
      .comment-group header strong, .comment-group header span { display: block; }
      .comment-group header span { margin-top: 3px; color: var(--muted); font-size: 10px; }
      .comment-group header button {
        min-height: 35px;
        border: 1px solid var(--line);
        border-radius: 9px;
        background: white;
        font-weight: 800;
      }
 
      .comment-row {
        display: flex;
        gap: 10px;
        padding: 12px;
        border-top: 1px solid var(--line);
      }
 
      .flag {
        width: 38px;
        height: 38px;
        flex: 0 0 38px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        background: #edf2f7;
      }
 
      .comment-row strong { font-size: 11px; }
      .comment-row p { margin: 5px 0; font-size: 12px; line-height: 1.4; }
      .comment-row small { color: var(--muted); font-size: 9px; }
 
      .empty {
        min-height: 250px;
        display: grid;
        place-items: center;
        align-content: center;
        gap: 8px;
        color: var(--muted);
        text-align: center;
        padding: 25px;
      }
 
      .empty svg { color: var(--blue); }
 
      .overlay {
        position: fixed;
        inset: 0;
        z-index: 10000;
        display: grid;
        place-items: center;
        padding: 18px;
        background: rgba(10,18,32,.72);
        backdrop-filter: blur(8px);
      }
 
      .service-modal, .conversation-modal, .verification-modal,
      .pin-delivery-modal {
        width: min(100%, 850px);
        max-height: 92svh;
        overflow-y: auto;
        padding: 16px;
        border-radius: 21px;
        background: white;
        box-shadow: 0 30px 80px rgba(0,0,0,.28);
      }
 
      .conversation-modal { width: min(100%, 760px); }
      .verification-modal { width: min(100%, 560px); }
      .pin-delivery-modal { width: min(100%, 480px); }
 
      .modal-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 13px;
      }
 
      .modal-header span {
        color: var(--blue);
        font-size: 10px;
        font-weight: 900;
      }
 
      .modal-header h2 { margin: 4px 0 0; }
      .modal-header small { display: block; margin-top: 5px; color: var(--muted); line-height: 1.4; }
      .modal-header button {
        width: 38px;
        height: 38px;
        border: 1px solid var(--line);
        border-radius: 11px;
        background: white;
        display: grid;
        place-items: center;
      }
 
      .details-grid { margin-top: 12px; }

      .privacy-callout {
        margin-bottom: 12px;
        color: #7a4b00;
        border-color: #f0d28c;
        background: #fff8e7;
      }
      .privacy-callout p { margin: 0; }

      .verification-call { width: 100%; margin-top: 12px; }
      .verification-actions {
        display: flex;
        justify-content: flex-end;
        gap: 9px;
        margin-top: 14px;
      }
      .verification-actions button { min-height: 43px; }

      .pin-display {
        margin: 4px 0 14px;
        padding: 22px;
        border: 1px solid #b9ddff;
        border-radius: 16px;
        text-align: center;
        background: #eef7ff;
      }
      .pin-display span {
        display: block;
        color: var(--muted);
        font-size: 11px;
        font-weight: 800;
      }
      .pin-display strong {
        display: block;
        margin-top: 8px;
        font-size: 34px;
        font-weight: 900;
        letter-spacing: 6px;
        color: #0757ad;
        font-variant-numeric: tabular-nums;
      }
      .pin-delivery-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 12px;
      }
      .pin-delivery-actions > * { flex: 1 1 130px; }
 
      .description-box {
        margin: 12px 0;
        padding: 12px;
        border-radius: 11px;
        background: #f7f9fc;
      }
 
      .description-box span { color: var(--muted); font-size: 10px; font-weight: 800; }
      .description-box p { margin: 6px 0 0; font-size: 12px; line-height: 1.5; white-space: pre-wrap; }
 
      .admin-chat {
        min-height: 300px;
        max-height: 70svh;
        overflow-y: auto;
        padding: 12px;
        border-radius: 14px;
        background: #eef2f6;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
 
      .chat-loading {
        min-height: 280px;
        display: grid;
        place-items: center;
      }
 
      .admin-message-bubble {
        max-width: 82%;
        align-self: flex-start;
        padding: 9px;
        border-radius: 12px;
        background: white;
        box-shadow: 0 4px 12px rgba(0,0,0,.06);
      }
 
      .message-head {
        display: flex;
        justify-content: space-between;
        gap: 9px;
        margin-bottom: 5px;
      }
 
      .message-head strong { font-size: 10px; }
      .message-head span { color: var(--muted); font-size: 9px; }
 
      .admin-message-bubble p {
        margin: 0;
        font-size: 12px;
        line-height: 1.45;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }
 
      .admin-message-bubble img, .admin-message-bubble video {
        max-width: min(360px, 70vw);
        max-height: 430px;
        object-fit: contain;
        border-radius: 9px;
        margin-bottom: 6px;
      }
 
      .admin-message-bubble audio {
        width: min(320px, 70vw);
        height: 38px;
      }

      .document-attachment {
        min-width: min(330px, 68vw);
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
        border: 1px solid var(--line);
        border-radius: 10px;
        color: var(--text);
        background: #f7f9fc;
        text-decoration: none;
      }
      .document-attachment > span { min-width: 0; flex: 1; }
      .document-attachment strong,
      .document-attachment small { display: block; overflow-wrap: anywhere; }
      .document-attachment strong { font-size: 11px; }
      .document-attachment small { margin-top: 3px; color: var(--muted); font-size: 8px; }
 
      .admin-message-bubble time {
        display: block;
        margin-top: 5px;
        color: var(--muted);
        font-size: 8px;
        text-align: right;
      }
 
      .spin { animation: spin .8s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
 
      @media (max-width: 1100px) {
        .summary-grid { grid-template-columns: repeat(3, minmax(0,1fr)); }
        .analytics-row { grid-template-columns: 40px minmax(150px,1fr) repeat(2,minmax(100px,.7fr)); }
        .analytics-row .info:last-child { grid-column: 2 / -1; }
      }
 
      @media (max-width: 760px) {
        .admin-page { padding-bottom: 25px; }
        .topbar {
          align-items: flex-start;
          flex-direction: column;
          padding-top: 16px;
        }
        .top-actions { width: 100%; }
        .top-actions button { flex: 1; }
        .summary-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
        .summary-card { padding: 11px; }
        .summary-card strong { font-size: 17px; }
 
        .toolbar {
          align-items: stretch;
          flex-direction: column;
        }
        .search-box { width: 100%; }
 
        .provider-card { grid-template-columns: 46px 1fr; padding: 11px; }
        .provider-avatar { width: 44px; height: 44px; }
        .provider-heading { flex-direction: column; gap: 4px; }
        .provider-info-grid, .details-grid { grid-template-columns: 1fr; }
        .provider-actions > * { flex: 1 1 120px; }

        .pin-reset-review { grid-template-columns: 1fr 1fr; }
        .pin-reset-review label { grid-column: 1 / -1; }
        .pin-reset-review .call-button { grid-column: 1 / -1; }
 
        .service-card { grid-template-columns: 1fr; }
        .media-side { border-bottom: 1px solid var(--line); }
        .metric-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
 
        .conversation-row {
          grid-template-columns: 38px 1fr;
        }
        .conversation-meta {
          grid-column: 2;
          text-align: left;
          display: flex;
          gap: 8px;
          align-items: center;
        }
 
        .analytics-row {
          grid-template-columns: 35px minmax(0,1fr);
        }
        .analytics-row .info,
        .analytics-row .info:last-child {
          grid-column: 2;
        }
 
        .overlay { align-items: end; padding: 0; }
        .service-modal, .conversation-modal, .verification-modal,
        .pin-delivery-modal {
          max-height: 94svh;
          border-radius: 20px 20px 0 0;
        }
        .admin-message-bubble { max-width: 92%; }
        .verification-actions { flex-direction: column-reverse; }
        .verification-actions button { width: 100%; }
        .pin-delivery-actions { flex-direction: column; }
        .pin-delivery-actions > * { flex: 1 1 auto; }
      }
 
      @media (max-width: 420px) {
        .login-card { padding: 22px; }
        .shell, .topbar { width: min(calc(100% - 16px),1320px); }
        .tabs { padding: 8px; }
        .tabs button { min-height: 37px; padding: 0 10px; font-size: 11px; }
        .manual-grid { grid-template-columns: 1fr; }
        .row-actions button { flex: 1; }
        .pin-display strong { font-size: 26px; letter-spacing: 4px; }
      }
    `}</style>
  );
}
