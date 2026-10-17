import { useCallback, useEffect, useRef, useState } from "react";

const API_URL = "https://kitchenbrain.cucina656.workers.dev";

export default function Home() {
  const [settings, setSettings] = useState({
    title: "Gwamo Brain",
    welcome_message: "Hello! How can I help you?",
    media_url: "",
  });
  const [visitorToken, setVisitorToken] = useState("");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  
  // Helper / Admin state
  const [helperMode, setHelperMode] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [adminBusy, setAdminBusy] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState("");
  const [adminMessages, setAdminMessages] = useState([]);
  const [adminDraft, setAdminDraft] = useState("");
  const [adminError, setAdminError] = useState("");
  const [editSettings, setEditSettings] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  // Media overlay state
  const [activeMedia, setActiveMedia] = useState(null);

  const socketRef = useRef(null);
  const scrollRef = useRef(null);
  const adminScrollRef = useRef(null);
  const visitorTokenRef = useRef("");
  const fileInputRef = useRef(null);
  const api = `${API_URL}/api/brain`;

  const readResponse = useCallback(async (response) => {
    let data = {};
    try { data = await response.json(); } catch { /* ignore */ }
    if (!response.ok || data.success === false) {
      throw new Error(data.error || data.message || `Request failed (${response.status})`);
    }
    return data;
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const response = await fetch(`${api}/settings`, { cache: "no-store" });
      const data = await readResponse(response);
      if (data.settings) setSettings((current) => ({ ...current, ...data.settings }));
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  }, [api, readResponse]);

  const loadMessages = useCallback(async (token, showSpinner = false) => {
    if (!token) return;
    if (showSpinner) setLoading(true);
    try {
      const response = await fetch(`${api}/messages`, {
        headers: { "X-Gwamo-Visitor-Token": token },
        cache: "no-store",
      });
      const data = await readResponse(response);
      setMessages(Array.isArray(data.messages) ? data.messages : []);
      setError("");
    } catch (err) {
      setError(err.message || "Could not load messages.");
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [api, readResponse]);

  const initVisitor = useCallback(async () => {
    try {
      await loadSettings();
      let savedToken = "";
      try { savedToken = localStorage.getItem("gwamo-brain-visitor-token") || ""; } catch { /* ignore */ }
      
      const headers = savedToken ? { "X-Gwamo-Visitor-Token": savedToken } : {};
      const response = await fetch(`${api}/conversation`, { method: "POST", headers, cache: "no-store" });
      const data = await readResponse(response);
      
      const token = String(data.visitor_token || savedToken || "");
      if (!token) throw new Error("No visitor token received.");
      
      visitorTokenRef.current = token;
      setVisitorToken(token);
      try { localStorage.setItem("gwamo-brain-visitor-token", token); } catch { /* ignore */ }
      
      await loadMessages(token, true);
      
      // WebSocket connection for real-time
      try {
        const ticketRes = await fetch(`${api}/realtime/ticket`, {
          method: "POST",
          headers: { "X-Gwamo-Visitor-Token": token }
        });
        if (ticketRes.ok) {
          const ticketData = await ticketRes.json();
          if (ticketData.websocket_url) {
            const ws = new WebSocket(ticketData.websocket_url);
            socketRef.current = ws;
            ws.onmessage = (event) => {
              try {
                const payload = JSON.parse(event.data);
                if (payload.type === "brain_message" && payload.message) {
                  setMessages((current) => {
                    const exists = current.find(m => m.id === payload.message.id);
                    if (exists) return current;
                    return [...current, payload.message];
                  });
                }
              } catch { /* ignore */ }
            };
          }
        }
      } catch (err) {
        console.warn("WebSocket failed, falling back to polling.");
      }
      
    } catch (err) {
      setError(err.message || "Support chat is unavailable.");
      setLoading(false);
    }
  }, [api, loadSettings, loadMessages, readResponse]);

  useEffect(() => { initVisitor(); }, [initVisitor]);

  // Poll fallback
  useEffect(() => {
    if (!visitorToken || helperMode) return;
    const interval = setInterval(() => loadMessages(visitorToken, false), 3000);
    return () => clearInterval(interval);
  }, [visitorToken, helperMode, loadMessages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);
  useEffect(() => {
    if (adminScrollRef.current) adminScrollRef.current.scrollTop = adminScrollRef.current.scrollHeight;
  }, [adminMessages]);

  const sendVisitorMessage = useCallback(async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending || !visitorTokenRef.current) return;
    setSending(true); setError("");
    try {
      const response = await fetch(`${api}/message`, {
        method: "POST",
        headers: { "X-Gwamo-Visitor-Token": visitorTokenRef.current, "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await readResponse(response);
      if (data.message) setMessages((current) => [...current, data.message]);
      setDraft("");
    } catch (err) {
      setError(err.message || "Could not send message.");
    } finally { setSending(false); }
  }, [api, draft, sending, readResponse]);

  // --- Admin / Helper ---
  const loginHelper = useCallback(async (e) => {
    e.preventDefault(); setAdminError(""); setAdminBusy(true);
    try {
      const response = await fetch(`${api}/admin/conversations`, { headers: { "X-Admin-Pin": adminPin } });
      const data = await readResponse(response);
      setConversations(data.conversations || []);
      setAdminAuthed(true);
      setEditSettings({ ...settings });
    } catch (err) {
      setAdminError(err.message || "Invalid admin PIN.");
    } finally { setAdminBusy(false); }
  }, [api, adminPin, readResponse, settings]);

  const loadAdminMessages = useCallback(async (convId) => {
    if (!convId) return;
    try {
      const response = await fetch(`${api}/admin/messages?conversation_id=${convId}`, { headers: { "X-Admin-Pin": adminPin } });
      const data = await readResponse(response);
      setAdminMessages(data.messages || []);
    } catch (err) {
      setAdminError(err.message || "Could not load messages.");
    }
  }, [api, adminPin, readResponse]);

  const sendHelperReply = useCallback(async (e) => {
    e.preventDefault();
    const text = adminDraft.trim();
    if (!text || !selectedConv || adminBusy) return;
    setAdminBusy(true); setAdminError("");
    try {
      const response = await fetch(`${api}/admin/reply`, {
        method: "POST",
        headers: { "X-Admin-Pin": adminPin, "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: selectedConv, text }),
      });
      const data = await readResponse(response);
      if (data.message) setAdminMessages((current) => [...current, data.message]);
      setAdminDraft("");
    } catch (err) {
      setAdminError(err.message || "Could not send reply.");
    } finally { setAdminBusy(false); }
  }, [api, adminDraft, selectedConv, adminBusy, adminPin, readResponse]);

  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConv || uploading) return;
    setUploading(true); setAdminError("");
    try {
      const formData = new FormData();
      formData.append("conversation_id", selectedConv);
      formData.append("file", file);
      
      const uploadRes = await fetch(`${api}/admin/upload`, {
        method: "POST",
        headers: { "X-Admin-Pin": adminPin },
        body: formData,
      });
      const uploadData = await readResponse(uploadRes);
      
      const replyRes = await fetch(`${api}/admin/reply`, {
        method: "POST",
        headers: { "X-Admin-Pin": adminPin, "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: selectedConv,
          text: "",
          media_url: uploadData.url,
          media_type: uploadData.media_type,
        }),
      });
      const replyData = await readResponse(replyRes);
      if (replyData.message) setAdminMessages((current) => [...current, replyData.message]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setAdminError(err.message || "Upload failed.");
    } finally { setUploading(false); }
  }, [api, selectedConv, uploading, adminPin, readResponse]);

  const saveSettings = useCallback(async (e) => {
    e.preventDefault();
    if (!editSettings || adminBusy) return;
    setAdminBusy(true); setAdminError("");
    try {
      const response = await fetch(`${api}/admin/settings`, {
        method: "POST",
        headers: { "X-Admin-Pin": adminPin, "Content-Type": "application/json" },
        body: JSON.stringify(editSettings),
      });
      const data = await readResponse(response);
      setSettings(data.settings);
      setAdminError("Settings saved.");
    } catch (err) {
      setAdminError(err.message || "Could not save settings.");
    } finally { setAdminBusy(false); }
  }, [api, editSettings, adminBusy, adminPin, readResponse]);

  // Render visitor view
  return (
    <div className="gb-wrapper">
      {!helperMode ? (
        <>
          <header className="gb-header">
            <h1>{settings.title}</h1>
            <button className="gb-helper-btn" onClick={() => setHelperMode(true)}>Helper</button>
          </header>

          <div className="gb-feed" ref={scrollRef}>
            {loading && <div className="gb-empty">Loading...</div>}
            {!loading && messages.length === 0 && (
              <div className="gb-empty">
                <p>{settings.welcome_message}</p>
              </div>
            )}
            
            {messages.map((msg) => (
              <div key={msg.id} className={`gb-bubble ${msg.sender === "visitor" ? "is-visitor" : "is-helper"}`}>
                {msg.media_url && msg.media_type === "image" && (
                  <img src={msg.media_url} alt="attachment" className="gb-media" onClick={() => setActiveMedia(msg.media_url)} />
                )}
                {msg.media_url && msg.media_type === "video" && (
                  <video src={msg.media_url} controls className="gb-media" playsInline />
                )}
                {msg.text_content && <p>{msg.text_content}</p>}
              </div>
            ))}
            {error && <div className="gb-error">{error}</div>}
          </div>

          <form className="gb-composer" onSubmit={sendVisitorMessage}>
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a message..."
              maxLength={4000}
            />
            <button type="submit" disabled={!draft.trim() || sending}>Send</button>
          </form>
        </>
      ) : (
        // Render helper view
        <div className="gb-helper-mode">
          <header className="gb-header">
            <h1>Helper Panel</h1>
            <button className="gb-helper-btn" onClick={() => setHelperMode(false)}>Back</button>
          </header>

          {!adminAuthed ? (
            <form className="gb-login" onSubmit={loginHelper}>
              <input type="password" placeholder="Admin PIN" value={adminPin} onChange={(e) => setAdminPin(e.target.value)} />
              <button type="submit" disabled={adminBusy}>{adminBusy ? "..." : "Login"}</button>
              {adminError && <p className="gb-error">{adminError}</p>}
            </form>
          ) : (
            <div className="gb-admin-layout">
              <aside className="gb-sidebar">
                {conversations.map((c) => (
                  <button key={c.id} className={`gb-conv-btn ${selectedConv === c.id ? "active" : ""}`} onClick={() => { setSelectedConv(c.id); loadAdminMessages(c.id); }}>
                    <strong>{c.visitor_label}</strong>
                    <small>{c.last_message || "No messages"}</small>
                  </button>
                ))}
              </aside>

              <main className="gb-admin-main">
                {selectedConv ? (
                  <>
                    <div className="gb-admin-messages" ref={adminScrollRef}>
                      {adminMessages.map((msg) => (
                        <div key={msg.id} className={`gb-bubble ${msg.sender === "visitor" ? "is-visitor" : "is-helper"}`}>
                          {msg.media_url && msg.media_type === "image" && <img src={msg.media_url} alt="attachment" className="gb-media" />}
                          {msg.media_url && msg.media_type === "video" && <video src={msg.media_url} controls className="gb-media" />}
                          {msg.text_content && <p>{msg.text_content}</p>}
                        </div>
                      ))}
                    </div>
                    <form className="gb-composer" onSubmit={sendHelperReply}>
                      <label className="gb-upload-btn">
                        📎
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} disabled={uploading} />
                      </label>
                      <input type="text" value={adminDraft} onChange={(e) => setAdminDraft(e.target.value)} placeholder="Reply..." />
                      <button type="submit" disabled={!adminDraft.trim() || adminBusy}>Send</button>
                    </form>
                  </>
                ) : (
                  <div className="gb-empty">Select a conversation</div>
                )}
                {adminError && <p className="gb-error">{adminError}</p>}
              </main>
            </div>
          )}
        </div>
      )}

      {activeMedia && (
        <div className="gb-overlay" onClick={() => setActiveMedia(null)}>
          <img src={activeMedia} alt="Fullscreen" />
        </div>
      )}

      <style>{`
        body { margin: 0; font-family: Inter, system-ui, sans-serif; background: #020712; color: #fff; height: 100dvh; overflow: hidden; }
        .gb-wrapper { display: flex; flex-direction: column; height: 100dvh; }
        .gb-header { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: #06101f; border-bottom: 1px solid #1a2e4d; }
        .gb-header h1 { margin: 0; font-size: 20px; }
        .gb-helper-btn { background: transparent; border: 1px solid #1a2e4d; color: #fff; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; }
        .gb-feed { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
        .gb-bubble { max-width: 80%; padding: 10px 14px; border-radius: 16px; word-break: break-word; }
        .gb-bubble.is-visitor { align-self: flex-end; background: #087cff; color: #fff; border-bottom-right-radius: 4px; }
        .gb-bubble.is-helper { align-self: flex-start; background: #1a2e4d; color: #fff; border-bottom-left-radius: 4px; }
        .gb-bubble p { margin: 0; line-height: 1.4; white-space: pre-wrap; }
        .gb-media { max-width: 100%; max-height: 300px; border-radius: 8px; margin-bottom: 8px; display: block; }
        .gb-composer { display: flex; gap: 8px; padding: 12px; background: #06101f; border-top: 1px solid #1a2e4d; align-items: center; }
        .gb-composer input[type="text"] { flex: 1; padding: 12px; border-radius: 8px; border: 1px solid #1a2e4d; background: #020712; color: #fff; outline: none; }
        .gb-composer button { padding: 0 16px; height: 42px; border-radius: 8px; border: none; background: #087cff; color: #fff; font-weight: bold; cursor: pointer; }
        .gb-composer button:disabled { opacity: 0.5; }
        .gb-upload-btn { cursor: pointer; font-size: 20px; padding: 0 8px; }
        .gb-upload-btn input { display: none; }
        .gb-empty { text-align: center; color: #8fa1b8; margin-top: 20px; }
        .gb-error { color: #ff334f; text-align: center; font-size: 12px; padding: 8px; }
        .gb-login { display: flex; flex-direction: column; gap: 12px; padding: 24px; max-width: 300px; margin: 40px auto; }
        .gb-login input { padding: 12px; border-radius: 8px; border: 1px solid #1a2e4d; background: #020712; color: #fff; }
        .gb-login button { padding: 12px; border-radius: 8px; border: none; background: #087cff; color: #fff; cursor: pointer; }
        .gb-admin-layout { display: flex; flex: 1; overflow: hidden; }
        .gb-sidebar { width: 200px; border-right: 1px solid #1a2e4d; overflow-y: auto; background: #06101f; }
        .gb-conv-btn { width: 100%; text-align: left; padding: 12px; background: transparent; border: none; border-bottom: 1px solid #1a2e4d; color: #fff; cursor: pointer; display: flex; flex-direction: column; }
        .gb-conv-btn.active { background: #1a2e4d; }
        .gb-conv-btn strong { font-size: 14px; }
        .gb-conv-btn small { font-size: 11px; color: #8fa1b8; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .gb-admin-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
        .gb-admin-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
        .gb-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; z-index: 9999; cursor: zoom-out; }
        .gb-overlay img { max-width: 95vw; max-height: 95vh; object-fit: contain; }
      `}</style>
    </div>
  );
}
