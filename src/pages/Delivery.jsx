import { useState } from "react";

function Delivery() {
  const [pin, setPin] = useState("");
  const [orders, setOrders] = useState([]);
  const [note, setNote] = useState("");

  const loadOrders = async () => {
    const response = await fetch(
      "https://kitchenbrain.cucina656.workers.dev/api/delivery/orders",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      }
    );

    const data = await response.json();

    if (!data.success) {
      alert(data.message);
      return;
    }

    setOrders(data.orders);
  };

  const updateOrder = async (orderId, status) => {
    const response = await fetch(
      "https://kitchenbrain.cucina656.workers.dev/api/delivery/update",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin,
          order_id: orderId,
          status,
          note,
        }),
      }
    );

    const data = await response.json();

    if (!data.success) {
      alert(data.message);
      return;
    }

    alert(`Order marked as ${status}`);
    loadOrders();
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>🚚 Delivery Team</h1>

      <input
        type="password"
        placeholder="Enter Delivery PIN"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        style={{ padding: "12px", width: "100%", maxWidth: "300px" }}
      />

      <br />
      <br />

      <button onClick={loadOrders}>Load Orders</button>

      <h2>Orders</h2>

      <input
        type="text"
        placeholder="Delivery note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        style={{ padding: "12px", width: "100%", maxWidth: "400px" }}
      />

      <br />
      <br />

      {orders.map((order) => (
        <div
          key={order.id}
          style={{
            border: "1px solid #ddd",
            borderRadius: "10px",
            padding: "15px",
            marginBottom: "15px",
          }}
        >
          <p><strong>Order ID:</strong> {order.id}</p>
          <p><strong>Food:</strong> {order.food_name}</p>
          <p><strong>Price:</strong> {order.price} RWF</p>
          <p><strong>WhatsApp:</strong> {order.whatsapp}</p>
          <p><strong>Location:</strong> {order.location}</p>
          <p><strong>Status:</strong> {order.delivery_status}</p>

          <button onClick={() => updateOrder(order.id, "Success")}>
            Success
          </button>

          <button
            onClick={() => updateOrder(order.id, "Failed")}
            style={{ marginLeft: "10px" }}
          >
            Failed
          </button>
        </div>
      ))}
    </div>
  );
}

export default Delivery;