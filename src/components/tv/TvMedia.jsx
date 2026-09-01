function TvMedia({
  mediaUrl,
  embedUrl,
  isTvTab,
  isImage,
  isVideo,
  isEmbed,
  isActive,
  aspectClass,
  mediaAspectRatio,
  serviceName,
  tagline,
  index,
  postId,
  videoRefCallback,
  onImageLoad,
  onImageError,
  onVideoPlay,
  onVideoPause,
  onVideoLoadedMetadata,
  onVideoTap,
}) {
  const mediaLabel = serviceName || tagline || "Service media";

  return (
    <div className="media-card">
      <div
        className={`media-viewport ${aspectClass}`}
        style={{ "--media-aspect-ratio": mediaAspectRatio || 16 / 9 }}
      >
        <div className="media-layer">
          {isTvTab && (isImage || isVideo) && (
            <div className="tv-media-backdrop" aria-hidden="true">
              {isImage ? (
                <img src={mediaUrl} alt="" />
              ) : (
                <video
                  src={mediaUrl}
                  muted
                  playsInline
                  preload="auto"
                  tabIndex={-1}
                />
              )}
            </div>
          )}

          {isImage && (
            <img
              src={mediaUrl}
              alt={mediaLabel}
              className="home-media"
              loading={index === 0 ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={index === 0 ? "high" : "auto"}
              onLoad={onImageLoad}
              onError={onImageError}
            />
          )}

          {isVideo && (
            <video
              ref={videoRefCallback}
              src={mediaUrl}
              loop
              playsInline
              muted={false}
              controls
              preload="metadata"
              className="home-media"
              onPlay={() => onVideoPlay(postId)}
              onPause={() => onVideoPause(postId)}
              onLoadedMetadata={onVideoLoadedMetadata}
              onClick={onVideoTap}
            />
          )}

          {isEmbed &&
            (isActive ? (
              <iframe
                src={embedUrl}
                title={serviceName || tagline || "Time Market media"}
                className="home-media"
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope"
                allowFullScreen
                loading="lazy"
              />
            ) : (
              <div className="embed-placeholder">
                <span className="embed-placeholder-icon">{"\u25B6"}</span>

                {(serviceName || tagline) && (
                  <span>{serviceName || tagline}</span>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

export default TvMedia;