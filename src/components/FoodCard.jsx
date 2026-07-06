function FoodCard({ name, price }) {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        padding: "15px",
        marginBottom: "10px",
        borderRadius: "10px",
      }}
    >
      <h3>{name}</h3>

      <p>{price} RWF</p>

      <button>Kora Commande</button>
    </div>
  );
}

export default FoodCard;