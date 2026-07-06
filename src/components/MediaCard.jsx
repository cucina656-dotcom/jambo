function MediaCard({ media }) {
  return (
    <div style={card}>
      <video
        src={media.media_url}
        controls
        style={video}
      />

      <div style={info}>
        <h2>{media.title || "Ruhuha TV Media"}</h2>
        <p>👁 {media.views || 0} views</p>
      </div>
    </div>
  );
}

const card = {
  background: "#000000",
  borderRadius: "24px 24px 0 0",
  overflow: "hidden",
  border: "1px solid rgba(0, 0, 0, 0.98)",
};

const video = {
  width: "100%",
  maxHeight: "420px",
  background: "#000",
};

const info = {
  padding: "16px",
  color: "white",
};

export default MediaCard;