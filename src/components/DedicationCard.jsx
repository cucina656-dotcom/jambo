import { useState, useRef, useEffect } from "react";
import { Plus, Heart, MessageSquare, Share2 } from "lucide-react";

const API_URL = "https://kitchenbrain.cucina656.workers.dev";

function isDirectVideoUrl(url = "") {
  const clean = url.toLowerCase().split("?")[0].split("#")[0];
  return (
    clean.endsWith(".mp4") ||
    clean.endsWith(".webm") ||
    clean.endsWith(".ogg") ||
    clean.endsWith(".mov") ||
    clean.endsWith(".m4v") ||
    clean.endsWith(".mkv") ||
    clean.endsWith(".avi")
  );
}

function isImageUrl(url = "") {
  const clean = url.toLowerCase().split("?")[0].split("#")[0];
  return (
    clean.endsWith(".jpg") ||
    clean.endsWith(".jpeg") ||
    clean.endsWith(".png") ||
    clean.endsWith(".gif") ||
    clean.endsWith(".webp") ||
    clean.endsWith(".bmp") ||
    clean.endsWith(".svg")
  );
}

function getEmbedUrl(url = "", isActive = false) {
  if (!url) return "";
  
  const autoplay = isActive ? 1 : 0;

  const youtubeMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (youtubeMatch) {
    // Use youtube-nocookie.com for faster loading and add more params for speed
    return `https://www.youtube-nocookie.com/embed/${youtubeMatch[1]}?autoplay=${autoplay}&mute=${isActive ? 0 : 1}&controls=1&rel=0&modestbranding=1&enablejsapi=1&origin=${window.location.origin}&loading=lazy&iv_load_policy=3&playsinline=1`;
  }

  const shortsMatch = url.match(/y
