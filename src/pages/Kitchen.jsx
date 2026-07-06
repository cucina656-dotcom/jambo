import { useState } from "react";
import Header from "../components/Header";

const API_URL = "https://kitchenbrain.cucina656.workers.dev";
const BUSINESS_WHATSAPP = "250782954338";

const foods = [
  {
    id: 1,
    name: "Amata/Ikivuguto",
    image: "https://pub-7b720214d16e45288fd32c5d88f01209.r2.dev/1.png",
    prepTime: "30 minutes",
    deliveryPrice: 1000,
    pickupPrice: 500,
  },
  {
    id: 2,
    name: "Ikijumba cyokeje",
    image: "https://pub-7b720214d16e45288fd32c5d88f01209.r2.dev/2.jpg",
    prepTime: "1 hour",
    deliveryPrice: 500,
    pickupPrice: 200,
  },
  {
    id: 3,
    name: "Inkoko",
    image: "https://pub-7b720214d16e45288fd32c5d88f01209.r2.dev/inkoko.jpg",
    prepTime: "3 hours",
    deliveryPrice: 15000,
    pickupPrice: 14000,
  },
  {
    id: 4,
    name: "Pack /Icyayi &Capati",
    image: "https://pub-7b720214d16e45288fd32c5d88f01209.r2.dev/4.png",
    prepTime: "30 minutes",
    deliveryPrice: 1000,
    pickupPrice: 500,
  },
  {
    id: 5,
    name: "Umwumbati,Ibishyimbo &Avocado",
    image: "https://pub-7b720214d16e45288fd32c5d88f01209.r2.dev/5.png",
    prepTime: "2 hours",
    deliveryPrice: 4000,
    pickupPrice: 3000,
  },
  {
    id: 6,
    name: "Ifiriti+ Umureti",
    image: "https://pub-7b720214d16e45288fd32c5d88f01209.r2.dev/6.png",
    prepTime: "45 minutes",
    deliveryPrice: 5000,
    pickupPrice: 4000,
  },
  {
    id: 7,
    name: "Umuceri+Isombe",
    image: "https://pub-7b720214d16e45288fd32c5d88f01209.r2.dev/7.png",
    prepTime: "6 hours",
    deliveryPrice: 6000,
    pickupPrice: 5000,
  },
  {
    id: 8,
    name: "Ifi + Igitoki/Ifiriti",
    image: "https://pub-7b720214d16e45288fd32c5d88f01209.r2.dev/9.png",
    prepTime: "24 hours",
    deliveryPrice: 3000,
    pickupPrice: 2000,
  },
  {
    id: 9,
    name: "Umwungu",
    image: "https://pub-7b720214d16e45288fd32c5d88f01209.r2.dev/umwungu.jpg",
    prepTime: "4 hours",
    deliveryPrice: 4000,
    pickupPrice: 3500,
  },
  {
    id: 10,
    name: "Inanasi / Umutobe w'Umwimerere",
    image: "https://pub-7b720214d16e45288fd32c5d88f01209.r2.dev/inanasi.jpg",
    prepTime: "45 minutes",
    deliveryPrice: 5000,
    pickupPrice: 4000,
  },
  {
    id: 11,
    name: "Isambusa / Ibirayi",
    image: "https://pub-7b720214d16e45288fd32c5d88f01209.r2.dev/Samoya.jpg",
    prepTime: "30 minutes",
    deliveryPrice: "Guciririkanya",
    pickupPrice: "100 RWF/Imwe",
  },
];

function Kitchen() {
  const [selectedFood, setSelectedFood] = useState(null);
  const [orderType, setOrderType] = useState("");
  const [location, setLocation] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [saving, setSaving] = useState(false);

  const resetOrder = () => {
    setSelectedFood(null);
    setOrderType("");
    setLocation("");
    setWhatsapp("");
    setSaving(false);
  };

  const selectedPrice =
    orderType === "delivery"
      ? selectedFood?.deliveryPrice
      : orderType === "pickup"
      ? selectedFood?.pickupPrice
      : 0;

  const submitOrder = async () => {
    if (!whatsapp.trim()) return alert("Please enter your WhatsApp number");
    if (!orderType) return alert("Please choose Kubizana or Kubisanga");
    if (orderType === "delivery" && !location) {
      return alert("Please select delivery location");
    }

    const finalLocation = orderType === "pickup" ? "Kubisanga aho biri" : location;
    setSaving(true);

    try {
      const response = await fetch(`${API_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          food_name: selectedFood.name,
          price: selectedPrice,
          whatsapp: whatsapp.trim(),
          delivery_method: orderType,
          location: finalLocation,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        alert(data.message || "Order was not saved.");
        setSaving(false);
        return;
      }

      const message = `
🍲 CHILLAX FOOD ORDER
Food: ${selectedFood.name}
Preparation Time: ${selectedFood.prepTime}
Price: ${selectedPrice} RWF
Customer WhatsApp:
${whatsapp}
Order Type:
${orderType === "delivery" ? "Kubizana" : "Kubisanga aho biri"}
Location:
${finalLocation}
`;

      window.open(
        `https://wa.me/${BUSINESS_WHATSAPP}?text=${encodeURIComponent(message)}`,
        "_blank"
      );
      alert("Order saved successfully!");
      resetOrder();
    } catch (error) {
      alert("Order failed. Check internet and try again.");
      console.error(error);
      setSaving(false);
    }
  };

  if (selectedFood) {
    return (
      <div style={page}>
        <Header />
        <main style={main}>
          <button 
            onClick={resetOrder} 
            style={backBtn}
            onTouchStart={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onTouchEnd={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            ← Garuka inyuma
          </button>
          
          <div style={orderCard}>
            <div style={heroImageContainer}>
              <img src={selectedFood.image} alt={selectedFood.name} style={heroImage} />
              <div style={imageGradientOverlay}></div>
              <span style={heroTimeTag}>⏱ {selectedFood.prepTime}</span>
            </div>

            <h1 style={title}>{selectedFood.name}</h1>
            
            <div style={inputGroup}>
              <label style={inputLabel}>WhatsApp Number</label>
              <input
                type="tel"
                placeholder="e.g. +250 788 123 456"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                style={inputStyle}
              />
            </div>

            <h3 style={sectionTitle}>Hitamo uburyo bwo kuyakira</h3>
            <div style={choiceGrid}>
              <button
                onClick={() => {
                  setOrderType("delivery");
                  setLocation("");
                }}
                style={{
                  ...choiceBtn,
                  ...(orderType === "delivery" ? activeChoice : {}),
                }}
              >
                <span style={{ fontSize: "16px" }}>🛵 Kubizana</span>
                <strong style={orderType === "delivery" ? activePriceText : priceText}>
                  {selectedFood.deliveryPrice} RWF
                </strong>
              </button>
              
              <button
                onClick={() => {
                  setOrderType("pickup");
                  setLocation("");
                }}
                style={{
                  ...choiceBtn,
                  ...(orderType === "pickup" ? activeChoice : {}),
                }}
              >
                <span style={{ fontSize: "16px" }}>📍 Kubisanga aho biri</span>
                <strong style={orderType === "pickup" ? activePriceText : priceText}>
                  {selectedFood.pickupPrice} RWF
                </strong>
              </button>
            </div>

            {orderType === "delivery" && (
              <div style={boxStyle}>
                <h4 style={locationHeading}>Hitamo aho bakugereza</h4>
                <div style={locationGrid}>
                  <button
                    onClick={() => setLocation("Kindama")}
                    style={{
                      ...locationBtn,
                      ...(location === "Kindama" ? activeLocation : {}),
                    }}
                  >
                    Kindama
                  </button>
                  <button
                    onClick={() => setLocation("Ruhuha")}
                    style={{
                      ...locationBtn,
                      ...(location === "Ruhuha" ? activeLocation : {}),
                    }}
                  >
                    Ruhuha
                  </button>
                </div>
              </div>
            )}

            {orderType && (
              <div style={summary}>
                <span style={{ color: "#cbd5e1", fontSize: "14px" }}>Igiteranyo cyose:</span>
                <strong style={{ fontSize: "22px", color: "white", textShadow: "0 0 10px rgba(34,197,94,0.6)" }}>
                  {selectedPrice} RWF
                </strong>
              </div>
            )}

            <button
              onClick={submitOrder}
              disabled={saving}
              style={{
                ...submitBtn,
                opacity: saving ? 0.7 : 1,
              }}
              onTouchStart={(e) => !saving && (e.currentTarget.style.transform = 'scale(0.98)')}
              onTouchEnd={(e) => !saving && (e.currentTarget.style.transform = 'scale(1)')}
            >
              {saving ? "Tegereza gato..." : "Emeza Komande kuri WhatsApp"}
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={page}>
      <Header />
      <main style={main}>
        <div style={brandHeader}>
          <h1 style={pageTitle}>🍲 Ruhuha Kitchen</h1>
          <p style={subtitle}>Hitamo ibyo kurya, uburyo bwo kubyakira, hanyuma uhite ukora komande binyuze kuri WhatsApp.</p>
        </div>

        <div style={foodList}>
          {foods.map((food) => (
            <div key={food.id} style={foodCard}>
              <div style={cardImageContainer}>
                <img src={food.image} alt={food.name} style={foodImage} />
                <div style={imageGradientOverlay}></div>
                <div style={timeBadge}>⏱ {food.prepTime}</div>
              </div>
              
              <div style={foodBody}>
                <h2 style={foodName}>{food.name}</h2>
                
                <div style={priceContainer}>
                  <div style={priceBadge}>
                    <span style={priceLabel}>🛵 Kubizana</span>
                    <span style={priceValue}>{food.deliveryPrice} RWF</span>
                  </div>
                  <div style={priceBadge}>
                    <span style={priceLabel}>📍 Kubisanga</span>
                    <span style={priceValue}>{food.pickupPrice} RWF</span>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedFood(food)} 
                  style={orderBtn}
                  onTouchStart={(e) => e.currentTarget.style.transform = 'scale(0.96)'}
                  onTouchEnd={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  Kora Komande
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

// Optimized Styles Matrix for High-End Mobile Displays
const page = {
  minHeight: "100svh",
  background: "#050816",
  color: "white",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  WebkitFontSmoothing: "antialiased",
};

const main = {
  padding: "84px 16px 32px",
  maxWidth: "480px",
  margin: "0 auto",
  boxSizing: "border-box",
};

const brandHeader = {
  marginBottom: "24px",
  padding: "0 4px",
};

const pageTitle = {
  margin: "0 0 6px",
  fontSize: "32px",
  fontWeight: "900",
  letterSpacing: "-0.5px",
};

const subtitle = {
  margin: "0",
  color: "#cbd5e1",
  lineHeight: "1.5",
  fontSize: "14px",
};

const foodList = {
  display: "grid",
  gap: "20px",
};

const foodCard = {
  borderRadius: "24px",
  overflow: "hidden",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
  transition: "transform 0.2s ease",
};

const cardImageContainer = {
  position: "relative",
  width: "100%",
  height: "220px",
  overflow: "hidden",
};

const foodImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const imageGradientOverlay = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  height: "60%",
  background: "linear-gradient(to top, rgba(5,8,22,0.8), transparent)",
  pointerEvents: "none",
};

const timeBadge = {
  position: "absolute",
  top: "14px",
  right: "14px",
  background: "rgba(5,8,22,0.75)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  border: "1px solid rgba(250,204,21,0.3)",
  color: "#facc15",
  fontWeight: "800",
  fontSize: "12px",
  padding: "6px 12px",
  borderRadius: "999px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
};

const foodBody = {
  padding: "18px",
};

const foodName = {
  margin: "0 0 14px",
  fontSize: "22px",
  fontWeight: "800",
  letterSpacing: "-0.3px",
  lineHeight: "1.3",
};

const priceContainer = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginBottom: "18px",
};

const priceBadge = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: "14px",
  padding: "10px",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const priceLabel = {
  fontSize: "11px",
  color: "#cbd5e1",
  fontWeight: "500",
};

const priceValue = {
  fontSize: "14px",
  fontWeight: "800",
  color: "white",
};

const orderBtn = {
  width: "100%",
  border: "none",
  borderRadius: "16px",
  padding: "16px",
  background: "linear-gradient(135deg,#2563eb,#ec4899)",
  color: "white",
  fontWeight: "900",
  fontSize: "16px",
  boxShadow: "0 8px 24px rgb(2, 0, 0)",
  transition: "transform 0.1s ease",
  outline: "none",
};

const backBtn = {
  border: "none",
  borderRadius: "14px",
  padding: "10px 16px",
  marginBottom: "16px",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#cbd5e1",
  fontWeight: "700",
  fontSize: "14px",
  transition: "transform 0.1s ease",
};

const orderCard = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderRadius: "28px",
  padding: "16px",
  boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
};

const heroImageContainer = {
  position: "relative",
  width: "100%",
  height: "230px",
  borderRadius: "20px",
  overflow: "hidden",
};

const heroImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const heroTimeTag = {
  position: "absolute",
  bottom: "14px",
  left: "14px",
  background: "rgba(5,8,22,0.75)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  border: "1px solid rgba(250,204,21,0.4)",
  color: "#facc15",
  fontWeight: "800",
  fontSize: "13px",
  padding: "6px 14px",
  borderRadius: "999px",
};

const title = {
  fontSize: "26px",
  fontWeight: "900",
  margin: "18px 0 20px",
  letterSpacing: "-0.5px",
  lineHeight: "1.2",
};

const inputGroup = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  marginBottom: "20px",
};

const inputLabel = {
  fontSize: "12px",
  fontWeight: "700",
  color: "#cbd5e1",
  paddingLeft: "4px",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "16px",
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.05)",
  color: "white",
  fontSize: "16px",
  outline: "none",
  transition: "border-color 0.2s ease",
};

const sectionTitle = {
  margin: "0 0 12px",
  fontSize: "15px",
  fontWeight: "700",
  color: "#cbd5e1",
  paddingLeft: "4px",
};

const choiceGrid = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "12px",
};

const choiceBtn = {
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "18px",
  padding: "18px",
  background: "rgba(255,255,255,0.03)",
  color: "white",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  fontWeight: "700",
  fontSize: "15px",
  outline: "none",
  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
};

const priceText = {
  color: "#cbd5e1",
  fontSize: "15px",
};

const activePriceText = {
  color: "white",
  fontSize: "15px",
  textShadow: "0 0 8px rgba(56,189,248,0.6)",
};

const activeChoice = {
  border: "1px solid #38bdf8",
  boxShadow: "0 0 24px rgba(56,189,248,0.25), inset 0 0 12px rgba(56,189,248,0.15)",
  background: "rgba(37,99,235,0.2)",
};

const boxStyle = {
  marginTop: "16px",
  padding: "16px",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "18px",
  background: "rgba(255,255,255,0.02)",
};

const locationHeading = {
  margin: "0 0 12px",
  fontSize: "14px",
  fontWeight: "700",
  color: "#cbd5e1",
};

const locationGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const locationBtn = {
  width: "100%",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "14px",
  padding: "14px",
  background: "rgba(255,255,255,0.04)",
  color: "white",
  fontWeight: "700",
  fontSize: "14px",
  outline: "none",
  transition: "all 0.2s ease",
};

const activeLocation = {
  background: "#2563eb",
  border: "1px solid #2563eb",
  boxShadow: "0 4px 16px rgba(37,99,235,0.4)",
};

const summary = {
  marginTop: "20px",
  padding: "16px 20px",
  borderRadius: "18px",
  background: "rgba(34,197,94,0.1)",
  border: "1px solid rgba(34,197,94,0.25)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const submitBtn = {
  width: "100%",
  marginTop: "16px",
  padding: "18px",
  borderRadius: "18px",
  border: "none",
  background: "#22c55e",
  color: "white",
  fontWeight: "900",
  fontSize: "16px",
  boxShadow: "0 8px 24px rgba(34,197,94,0.3)",
  outline: "none",
  transition: "transform 0.1s ease",
};

export default Kitchen;