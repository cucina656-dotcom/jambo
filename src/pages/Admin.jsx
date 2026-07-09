import { useState, useEffect } from "react";

function Admin() {
  const [pin, setPin] = useState("");
  const [orders, setOrders] = useState([]);
  const [media, setMedia] = useState([]);
  const [dedications, setDedications] = useState([]);
  const [comments, setComments] = useState([]);
  const [homeContent, setHomeContent] = useState([]);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("orders");
  const [showAddComment, setShowAddComment] = useState(false);
  const [newComment, setNewComment] = useState({
    dedication_id: "",
    comment: "",
    commenter_whatsapp: "",
  });

  const isAdmin = pin === "101";

  const loadOrders = async () => {
    if (!isAdmin) return;
    setMessage("Loading orders...");
    try {
      const response = await fetch(
        "https://kitchenbrain.cucina656.workers.dev/api/admin/orders",
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
      setOrders(data.orders || []);
      setMessage(`Orders loaded successfully (${data.orders?.length || 0} orders)`);
    } catch (error) {
      setMessage("Failed to connect to Worker API");
      console.error(error);
    }
  };

  const deleteOrder = async (orderId) => {
    if (!isAdmin) return;
    if (!confirm(`Are you sure you want to delete order #${orderId}?`)) return;
    
    setMessage("Deleting order...");
    try {
      const response = await fetch(
        "https://kitchenbrain.cucina656.workers.dev/api/admin/delete-order",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin, order_id: orderId }),
        }
      );
      const data = await response.json();
      if (!data.success) {
        setMessage(data.message || "Failed to delete order");
        return;
      }
      setMessage(`Order #${orderId} deleted successfully`);
      await loadOrders(); // Refresh the list
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

  // Auto-load orders when PIN becomes valid
  useEffect(() => {
    if (isAdmin) {
      loadOrders();
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

  const successOrders = orders.filter((o) => o.delivery_status === "Success");
  const failedOrders = orders.filter((o) => o.delivery_status === "Failed");
  const pendingOrders = orders.filter((o) => o.delivery_status === "Pending");
  const totalRevenue = orders.reduce((sum, order) => {
    const price = Number(order.price || 0);
    return sum + price;
  }, 0);

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
        <button disabled={!isAdmin} onClick={loadOrders}>Load Orders</button>
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
          onClick={() => setActiveTab("orders")}
          style={{
            padding: "10px 20px",
            background: activeTab === "orders" ? "#007bff" : "transparent",
            color: activeTab === "orders" ? "white" : "#333",
            border: "none",
            borderRadius: "4px",
            cursor: isAdmin ? "pointer" : "not-allowed",
            opacity: isAdmin ? 1 : 0.5,
          }}
        >
          📊 Orders ({orders.length})
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

      {/* Orders Tab */}
      {activeTab === "orders" && (
        <>
          {/* Investment Message */}
          <div
            style={{
              padding: "24px",
              borderRadius: "20px",
              background:
                "linear-gradient(135deg,#0f172a,#1e3a8a,#2563eb)",
              color: "white",
              marginBottom: "20px",
              marginTop: "20px",
              textAlign: "center",
              boxShadow: "0 15px 40px rgba(37,99,235,0.35)",
            }}
          >
            <h2
              style={{
                fontSize: "30px",
                marginBottom: "15px",
              }}
            >
              🚀 Own Part of ChillaX
            </h2>
            <p
              style={{
                fontSize: "18px",
                lineHeight: "1.7",
              }}
            >
              feedX is growing into a platform for food,
              entertainment, media and community engagement.
              We are welcoming investors, business partners
              and strategic shareholders interested in helping
              scale the platform.
              Contact us today to discuss investment,
              partnership opportunities or share purchases.
            </p>
            <a
              href="https://wa.me/25076554329"
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-block",
                marginTop: "18px",
                padding: "14px 24px",
                background: "#25D366",
                color: "white",
                textDecoration: "none",
                borderRadius: "999px",
                fontWeight: "900",
                fontSize: "18px",
              }}
            >
              📱 WhatsApp 250788484366
            </a>
          </div>

          {/* Real Orders Summary */}
          {orders.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "15px",
                marginBottom: "25px",
              }}
            >
              <div
                style={{
                  background: "#e3f2fd",
                  padding: "15px",
                  borderRadius: "10px",
                  textAlign: "center",
                  border: "1px solid #90caf9",
                }}
              >
                <h3 style={{ margin: 0, fontSize: "28px", color: "#0d47a1" }}>
                  {orders.length}
                </h3>
                <p style={{ margin: "5px 0 0", color: "#0d47a1", fontWeight: "bold" }}>
                  Total Orders
                </p>
              </div>
              <div
                style={{
                  background: "#e8f5e9",
                  padding: "15px",
                  borderRadius: "10px",
                  textAlign: "center",
                  border: "1px solid #a5d6a7",
                }}
              >
                <h3 style={{ margin: 0, fontSize: "28px", color: "#1b5e20" }}>
                  {totalRevenue.toLocaleString()} RWF
                </h3>
                <p style={{ margin: "5px 0 0", color: "#1b5e20", fontWeight: "bold" }}>
                  Total Revenue
                </p>
              </div>
              <div
                style={{
                  background: "#fff3e0",
                  padding: "15px",
                  borderRadius: "10px",
                  textAlign: "center",
                  border: "1px solid #ffcc80",
                }}
              >
                <h3 style={{ margin: 0, fontSize: "28px", color: "#e65100" }}>
                  {pendingOrders.length}
                </h3>
                <p style={{ margin: "5px 0 0", color: "#e65100", fontWeight: "bold" }}>
                  Pending
                </p>
              </div>
              <div
                style={{
                  background: "#e8f5e9",
                  padding: "15px",
                  borderRadius: "10px",
                  textAlign: "center",
                  border: "1px solid #a5d6a7",
                }}
              >
                <h3 style={{ margin: 0, fontSize: "28px", color: "#1b5e20" }}>
                  {successOrders.length}
                </h3>
                <p style={{ margin: "5px 0 0", color: "#1b5e20", fontWeight: "bold" }}>
                  Completed
                </p>
              </div>
              <div
                style={{
                  background: "#ffebee",
                  padding: "15px",
                  borderRadius: "10px",
                  textAlign: "center",
                  border: "1px solid #ef9a9a",
                }}
              >
                <h3 style={{ margin: 0, fontSize: "28px", color: "#b71c1c" }}>
                  {failedOrders.length}
                </h3>
                <p style={{ margin: "5px 0 0", color: "#b71c1c", fontWeight: "bold" }}>
                  Failed
                </p>
              </div>
            </div>
          )}

          {/* Orders List with Delete Button */}
          {orders.length === 0 && <p style={{ marginTop: "20px" }}>No orders found. Try placing a test order from the kitchen page.</p>}
          {orders.map((order) => (
            <div
              key={order.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "15px",
                background: "#fafafa",
                position: "relative",
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
                  <p><strong>Order ID:</strong> #{order.id}</p>
                  <p><strong>Food:</strong> {order.food_name}</p>
                  <p><strong>Price:</strong> {Number(order.price || 0).toLocaleString()} RWF</p>
                  <p><strong>WhatsApp:</strong> {order.whatsapp}</p>
                </div>
                <div>
                  <p><strong>Status:</strong> 
                    <span style={{
                      display: "inline-block",
                      padding: "2px 10px",
                      borderRadius: "4px",
                      background: 
                        order.delivery_status === "Success" ? "#28a745" :
                        order.delivery_status === "Failed" ? "#dc3545" : "#ffc107",
                      color: order.delivery_status === "Pending" ? "#333" : "white",
                      marginLeft: "5px",
                      fontWeight: "bold",
                      fontSize: "12px",
                    }}>
                      {order.delivery_status || "Pending"}
                    </span>
                  </p>
                  <p><strong>Delivery Method:</strong> {order.delivery_method || "N/A"}</p>
                  <p><strong>Location:</strong> {order.location || "M Cantine Shop"}</p>
                  <p><strong>Time Placed:</strong> {order.created_at ? new Date(order.created_at).toLocaleString() : "N/A"}</p>
                </div>
              </div>
              {order.delivery_note && (
                <div style={{ marginTop: "10px", background: "#e9ecef", padding: "10px", borderRadius: "4px" }}>
                  <strong>Note:</strong> {order.delivery_note}
                </div>
              )}
              <div style={{ marginTop: "15px", display: "flex", gap: "10px" }}>
                <button
                  onClick={() => deleteOrder(order.id)}
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
                  🗑 Delete Order
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
                      getFlagFrom
