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
    return `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=${autoplay}&mute=0&controls=1&rel=0&modestbranding=1&enablejsapi=1`;
  }

  const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch) {
    return `https://www.youtube.com/embed/${shortsMatch[1]}?autoplay=${autoplay}&mute=0&controls=1&rel=0&modestbranding=1&enablejsapi=1`;
  }

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=${autoplay}&muted=0&controls=1`;
  }

  const dailymotionMatch = url.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
  if (dailymotionMatch) {
    return `https://www.dailymotion.com/embed/video/${dailymotionMatch[1]}?autoplay=${autoplay}&mute=0`;
  }

  if (url.includes("/embed/") || url.includes("player.")) return url;
  return url;
}

function getFlagFromWhatsapp(number = "") {
  // Africa
  if (number.startsWith("+213") || number.startsWith("213")) return "🇩🇿";
  if (number.startsWith("+244") || number.startsWith("244")) return "🇦🇴";
  if (number.startsWith("+229") || number.startsWith("229")) return "🇧🇯";
  if (number.startsWith("+267") || number.startsWith("267")) return "🇧🇼";
  if (number.startsWith("+226") || number.startsWith("226")) return "🇧🇫";
  if (number.startsWith("+257") || number.startsWith("257")) return "🇧🇮";
  if (number.startsWith("+237") || number.startsWith("237")) return "🇨🇲";
  if (number.startsWith("+238") || number.startsWith("238")) return "🇨🇻";
  if (number.startsWith("+236") || number.startsWith("236")) return "🇨🇫";
  if (number.startsWith("+235") || number.startsWith("235")) return "🇹🇩";
  if (number.startsWith("+269") || number.startsWith("269")) return "🇰🇲";
  if (number.startsWith("+242") || number.startsWith("242")) return "🇨🇬";
  if (number.startsWith("+243") || number.startsWith("243")) return "🇨🇩";
  if (number.startsWith("+225") || number.startsWith("225")) return "🇨🇮";
  if (number.startsWith("+253") || number.startsWith("253")) return "🇩🇯";
  if (number.startsWith("+20") || number.startsWith("20")) return "🇪🇬";
  if (number.startsWith("+240") || number.startsWith("240")) return "🇬🇶";
  if (number.startsWith("+291") || number.startsWith("291")) return "🇪🇷";
  if (number.startsWith("+268") || number.startsWith("268")) return "🇸🇿";
  if (number.startsWith("+251") || number.startsWith("251")) return "🇪🇹";
  if (number.startsWith("+241") || number.startsWith("241")) return "🇬🇦";
  if (number.startsWith("+220") || number.startsWith("220")) return "🇬🇲";
  if (number.startsWith("+233") || number.startsWith("233")) return "🇬🇭";
  if (number.startsWith("+224") || number.startsWith("224")) return "🇬🇳";
  if (number.startsWith("+245") || number.startsWith("245")) return "🇬🇼";
  if (number.startsWith("+254") || number.startsWith("254")) return "🇰🇪";
  if (number.startsWith("+266") || number.startsWith("266")) return "🇱🇸";
  if (number.startsWith("+231") || number.startsWith("231")) return "🇱🇷";
  if (number.startsWith("+218") || number.startsWith("218")) return "🇱🇾";
  if (number.startsWith("+261") || number.startsWith("261")) return "🇲🇬";
  if (number.startsWith("+265") || number.startsWith("265")) return "🇲🇼";
  if (number.startsWith("+223") || number.startsWith("223")) return "🇲🇱";
  if (number.startsWith("+222") || number.startsWith("222")) return "🇲🇷";
  if (number.startsWith("+230") || number.startsWith("230")) return "🇲🇺";
  if (number.startsWith("+212") || number.startsWith("212")) return "🇲🇦";
  if (number.startsWith("+258") || number.startsWith("258")) return "🇲🇿";
  if (number.startsWith("+264") || number.startsWith("264")) return "🇳🇦";
  if (number.startsWith("+227") || number.startsWith("227")) return "🇳🇪";
  if (number.startsWith("+234") || number.startsWith("234")) return "🇳🇬";
  if (number.startsWith("+250") || number.startsWith("250")) return "🇷🇼";
  if (number.startsWith("+239") || number.startsWith("239")) return "🇸🇹";
  if (number.startsWith("+221") || number.startsWith("221")) return "🇸🇳";
  if (number.startsWith("+248") || number.startsWith("248")) return "🇸🇨";
  if (number.startsWith("+232") || number.startsWith("232")) return "🇸🇱";
  if (number.startsWith("+252") || number.startsWith("252")) return "🇸🇴";
  if (number.startsWith("+27") || number.startsWith("27")) return "🇿🇦";
  if (number.startsWith("+211") || number.startsWith("211")) return "🇸🇸";
  if (number.startsWith("+249") || number.startsWith("249")) return "🇸🇩";
  if (number.startsWith("+255") || number.startsWith("255")) return "🇹🇿";
  if (number.startsWith("+228") || number.startsWith("228")) return "🇹🇬";
  if (number.startsWith("+216") || number.startsWith("216")) return "🇹🇳";
  if (number.startsWith("+256") || number.startsWith("256")) return "🇺🇬";
  if (number.startsWith("+260") || number.startsWith("260")) return "🇿🇲";
  if (number.startsWith("+263") || number.startsWith("263")) return "🇿🇼";
  // Asia
  if (number.startsWith("+93") || number.startsWith("93")) return "🇦🇫";
  if (number.startsWith("+374") || number.startsWith("374")) return "🇦🇲";
  if (number.startsWith("+994") || number.startsWith("994")) return "🇦🇿";
  if (number.startsWith("+973") || number.startsWith("973")) return "🇧🇭";
  if (number.startsWith("+880") || number.startsWith("880")) return "🇧🇩";
  if (number.startsWith("+975") || number.startsWith("975")) return "🇧🇹";
  if (number.startsWith("+673") || number.startsWith("673")) return "🇧🇳";
  if (number.startsWith("+855") || number.startsWith("855")) return "🇰🇭";
  if (number.startsWith("+86") || number.startsWith("86")) return "🇨🇳";
  if (number.startsWith("+357") || number.startsWith("357")) return "🇨🇾";
  if (number.startsWith("+91") || number.startsWith("91")) return "🇮🇳";
  if (number.startsWith("+62") || number.startsWith("62")) return "🇮🇩";
  if (number.startsWith("+98") || number.startsWith("98")) return "🇮🇷";
  if (number.startsWith("+964") || number.startsWith("964")) return "🇮🇶";
  if (number.startsWith("+972") || number.startsWith("972")) return "🇮🇱";
  if (number.startsWith("+81") || number.startsWith("81")) return "🇯🇵";
  if (number.startsWith("+962") || number.startsWith("962")) return "🇯🇴";
  if (number.startsWith("+7") || number.startsWith("7")) return "🇰🇿";
  if (number.startsWith("+965") || number.startsWith("965")) return "🇰🇼";
  if (number.startsWith("+996") || number.startsWith("996")) return "🇰🇬";
  if (number.startsWith("+856") || number.startsWith("856")) return "🇱🇦";
  if (number.startsWith("+961") || number.startsWith("961")) return "🇱🇧";
  if (number.startsWith("+60") || number.startsWith("60")) return "🇲🇾";
  if (number.startsWith("+960") || number.startsWith("960")) return "🇲🇻";
  if (number.startsWith("+976") || number.startsWith("976")) return "🇲🇳";
  if (number.startsWith("+95") || number.startsWith("95")) return "🇲🇲";
  if (number.startsWith("+977") || number.startsWith("977")) return "🇳🇵";
  if (number.startsWith("+850") || number.startsWith("850")) return "🇰🇵";
  if (number.startsWith("+968") || number.startsWith("968")) return "🇴🇲";
  if (number.startsWith("+92") || number.startsWith("92")) return "🇵🇰";
  if (number.startsWith("+970") || number.startsWith("970")) return "🇵🇸";
  if (number.startsWith("+63") || number.startsWith("63")) return "🇵🇭";
  if (number.startsWith("+974") || number.startsWith("974")) return "🇶🇦";
  if (number.startsWith("+966") || number.startsWith("966")) return "🇸🇦";
  if (number.startsWith("+65") || number.startsWith("65")) return "🇸🇬";
  if (number.startsWith("+82") || number.startsWith("82")) return "🇰🇷";
  if (number.startsWith("+94") || number.startsWith("94")) return "🇱🇰";
  if (number.startsWith("+963") || number.startsWith("963")) return "🇸🇾";
  if (number.startsWith("+886") || number.startsWith("886")) return "🇹🇼";
  if (number.startsWith("+992") || number.startsWith("992")) return "🇹🇯";
  if (number.startsWith("+66") || number.startsWith("66")) return "🇹🇭";
  if (number.startsWith("+670") || number.startsWith("670")) return "🇹🇱";
  if (number.startsWith("+90") || number.startsWith("90")) return "🇹🇷";
  if (number.startsWith("+993") || number.startsWith("993")) return "🇹🇲";
  if (number.startsWith("+971") || number.startsWith("971")) return "🇦🇪";
  if (number.startsWith("+998") || number.startsWith("998")) return "🇺🇿";
  if (number.startsWith("+84") || number.startsWith("84")) return "🇻🇳";
  if (number.startsWith("+967") || number.startsWith("967")) return "🇾🇪";
  // Europe
  if (number.startsWith("+355") || number.startsWith("355")) return "🇦🇱";
  if (number.startsWith("+376") || number.startsWith("376")) return "🇦🇩";
  if (number.startsWith("+43") || number.startsWith("43")) return "🇦🇹";
  if (number.startsWith("+375") || number.startsWith("375")) return "🇧🇾";
  if (number.startsWith("+32") || number.startsWith("32")) return "🇧🇪";
  if (number.startsWith("+387") || number.startsWith("387")) return "🇧🇦";
  if (number.startsWith("+359") || number.startsWith("359")) return "🇧🇬";
  if (number.startsWith("+385") || number.startsWith("385")) return "🇭🇷";
  if (number.startsWith("+420") || number.startsWith("420")) return "🇨🇿";
  if (number.startsWith("+45") || number.startsWith("45")) return "🇩🇰";
  if (number.startsWith("+372") || number.startsWith("372")) return "🇪🇪";
  if (number.startsWith("+358") || number.startsWith("358")) return "🇫🇮";
  if (number.startsWith("+33") || number.startsWith("33")) return "🇫🇷";
  if (number.startsWith("+49") || number.startsWith("49")) return "🇩🇪";
  if (number.startsWith("+30") || number.startsWith("30")) return "🇬🇷";
  if (number.startsWith("+36") || number.startsWith("36")) return "🇭🇺";
  if (number.startsWith("+354") || number.startsWith("354")) return "🇮🇸";
  if (number.startsWith("+353") || number.startsWith("353")) return "🇮🇪";
  if (number.startsWith("+39") || number.startsWith("39")) return "🇮🇹";
  if (number.startsWith("+383") || number.startsWith("383")) return "🇽🇰";
  if (number.startsWith("+371") || number.startsWith("371")) return "🇱🇻";
  if (number.startsWith("+423") || number.startsWith("423")) return "🇱🇮";
  if (number.startsWith("+370") || number.startsWith("370")) return "🇱🇹";
  if (number.startsWith("+352") || number.startsWith("352")) return "🇱🇺";
  if (number.startsWith("+356") || number.startsWith("356")) return "🇲🇹";
  if (number.startsWith("+373") || number.startsWith("373")) return "🇲🇩";
  if (number.startsWith("+377") || number.startsWith("377")) return "🇲🇨";
  if (number.startsWith("+382") || number.startsWith("382")) return "🇲🇪";
  if (number.startsWith("+31") || number.startsWith("31")) return "🇳🇱";
  if (number.startsWith("+389") || number.startsWith("389")) return "🇲🇰";
  if (number.startsWith("+47") || number.startsWith("47")) return "🇳🇴";
  if (number.startsWith("+48") || number.startsWith("48")) return "🇵🇱";
  if (number.startsWith("+351") || number.startsWith("351")) return "🇵🇹";
  if (number.startsWith("+40") || number.startsWith("40")) return "🇷🇴";
  if (number.startsWith("+7") || number.startsWith("7")) return "🇷🇺";
  if (number.startsWith("+378") || number.startsWith("378")) return "🇸🇲";
  if (number.startsWith("+381") || number.startsWith("381")) return "🇷🇸";
  if (number.startsWith("+421") || number.startsWith("421")) return "🇸🇰";
  if (number.startsWith("+386") || number.startsWith("386")) return "🇸🇮";
  if (number.startsWith("+34") || number.startsWith("34")) return "🇪🇸";
  if (number.startsWith("+46") || number.startsWith("46")) return "🇸🇪";
  if (number.startsWith("+41") || number.startsWith("41")) return "🇨🇭";
  if (number.startsWith("+380") || number.startsWith("380")) return "🇺🇦";
  if (number.startsWith("+44") || number.startsWith("44")) return "🇬🇧";
  if (number.startsWith("+379") || number.startsWith("379")) return "🇻🇦";
  // North America
  if (number.startsWith("+1") || number.startsWith("1")) {
    if (number.startsWith("+1242") || number.startsWith("1242")) return "🇧🇸";
    if (number.startsWith("+1246") || number.startsWith("1246")) return "🇧🇧";
    if (number.startsWith("+1441") || number.startsWith("1441")) return "🇧🇲";
    if (number.startsWith("+1284") || number.startsWith("1284")) return "🇻🇬";
    if (number.startsWith("+1345") || number.startsWith("1345")) return "🇰🇾";
    if (number.startsWith("+1767") || number.startsWith("1767")) return "🇩🇲";
    if (number.startsWith("+1809") || number.startsWith("1809")) return "🇩🇴";
    if (number.startsWith("+1876") || number.startsWith("1876")) return "🇯🇲";
    if (number.startsWith("+1664") || number.startsWith("1664")) return "🇲🇸";
    if (number.startsWith("+1787") || number.startsWith("1787")) return "🇵🇷";
    if (number.startsWith("+1868") || number.startsWith("1868")) return "🇹🇹";
    if (number.startsWith("+1649") || number.startsWith("1649")) return "🇹🇨";
    if (number.startsWith("+1340") || number.startsWith("1340")) return "🇻🇮";
    return "🇺🇸";
  }
  if (number.startsWith("+52") || number.startsWith("52")) return "🇲🇽";
  if (number.startsWith("+501") || number.startsWith("501")) return "🇧🇿";
  if (number.startsWith("+506") || number.startsWith("506")) return "🇨🇷";
  if (number.startsWith("+53") || number.startsWith("53")) return "🇨🇺";
  if (number.startsWith("+503") || number.startsWith("503")) return "🇸🇻";
  if (number.startsWith("+502") || number.startsWith("502")) return "🇬🇹";
  if (number.startsWith("+504") || number.startsWith("504")) return "🇭🇳";
  if (number.startsWith("+505") || number.startsWith("505")) return "🇳🇮";
  if (number.startsWith("+507") || number.startsWith("507")) return "🇵🇦";
  // South America
  if (number.startsWith("+54") || number.startsWith("54")) return "🇦🇷";
  if (number.startsWith("+591") || number.startsWith("591")) return "🇧🇴";
  if (number.startsWith("+55") || number.startsWith("55")) return "🇧🇷";
  if (number.startsWith("+56") || number.startsWith("56")) return "🇨🇱";
  if (number.startsWith("+57") || number.startsWith("57")) return "🇨🇴";
  if (number.startsWith("+593") || number.startsWith("593")) return "🇪🇨";
  if (number.startsWith("+592") || number.startsWith("592")) return "🇬🇾";
  if (number.startsWith("+595") || number.startsWith("595")) return "🇵🇾";
  if (number.startsWith("+51") || number.startsWith("51")) return "🇵🇪";
  if (number.startsWith("+597") || number.startsWith("597")) return "🇸🇷";
  if (number.startsWith("+598") || number.startsWith("598")) return "🇺🇾";
  if (number.startsWith("+58") || number.startsWith("58")) return "🇻🇪";
  // Oceania
  if (number.startsWith("+61") || number.startsWith("61")) return "🇦🇺";
  if (number.startsWith("+679") || number.startsWith("679")) return "🇫🇯";
  if (number.startsWith("+691") || number.startsWith("691")) return "🇫🇲";
  if (number.startsWith("+674") || number.startsWith("674")) return "🇳🇷";
  if (number.startsWith("+64") || number.startsWith("64")) return "🇳🇿";
  if (number.startsWith("+675") || number.startsWith("675")) return "🇵🇬";
  if (number.startsWith("+685") || number.startsWith("685")) return "🇼🇸";
  if (number.startsWith("+677") || number.startsWith("677")) return "🇸🇧";
  if (number.startsWith("+676") || number.startsWith("676")) return "🇹🇴";
  if (number.startsWith("+688") || number.startsWith("688")) return "🇹🇻";
  if (number.startsWith("+678") || number.startsWith("678")) return "🇻🇺";
  return "🌍";
}

// Styles
const card = {
  backgroundColor: "#141414",
  borderRadius: "18px",
  overflow: "hidden",
  marginBottom: "28px",
  boxShadow: "0 8px 32px rgba(0,0,0,0.85)",
  border: "1px solid rgba(255,255,255,0.05)",
};

const mediaCard = {
  position: "relative",
  aspectRatio: "16 / 9",
  backgroundColor: "#0a0a0a",
  overflow: "hidden",
};

const mediaShade = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  height: "50%",
  background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)",
  pointerEvents: "none",
  zIndex: 2,
};

const videoBg = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  backgroundColor: "#0a0a0a",
  display: "block",
};

const imageBg = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  cursor: "pointer",
  backgroundColor: "#0a0a0a",
};

const fallbackBg = {
  width: "100%",
  height: "100%",
  backgroundColor: "#1a1a1a",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#555",
  fontSize: "14px",
};

const topBadge = {
  position: "absolute",
  top: "16px",
  left: "16px",
  backgroundColor: "rgba(0,0,0,0.7)",
  backdropFilter: "blur(8px)",
  padding: "8px 16px",
  borderRadius: "100px",
  color: "white",
  fontSize: "14px",
  fontWeight: "500",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  border: "1px solid rgba(255,255,255,0.08)",
  maxWidth: "70%",
  zIndex: 3,
};

const badgeDot = {
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  backgroundColor: "#00e676",
  display: "inline-block",
  flexShrink: 0,
};

const rightActions = {
  position: "absolute",
  bottom: "24px",
  right: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  zIndex: 5,
};

const followBtn = {
  backgroundColor: "rgba(20,20,20,0.6)",
  backdropFilter: "blur(6px)",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: "50%",
  width: "48px",
  height: "48px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "white",
  cursor: "pointer",
  transition: "0.2s",
};

const sideBtn = {
  backgroundColor: "rgba(20,20,20,0.5)",
  backdropFilter: "blur(6px)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "50%",
  width: "48px",
  height: "48px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  color: "white",
  cursor: "pointer",
  transition: "0.2s",
  gap: "0px",
};

const actionLabel = {
  fontSize: "10px",
  fontWeight: "600",
  color: "rgba(255,255,255,0.8)",
  lineHeight: "1",
  marginTop: "1px",
};

const dedicationBody = {
  padding: "18px 16px 20px 16px",
  backgroundColor: "#141414",
};

const peopleRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "14px",
};

const person = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const smallPhotoCircle = {
  width: "44px",
  height: "44px",
  borderRadius: "50%",
  objectFit: "cover",
  backgroundColor: "#2a2a2a",
  border: "2px solid #3a3a3a",
  cursor: "pointer",
};

const smallPhotoSquare = {
  width: "44px",
  height: "44px",
  borderRadius: "12px",
  objectFit: "cover",
  backgroundColor: "#2a2a2a",
  border: "2px solid #3a3a3a",
  cursor: "pointer",
};

const smallPlaceholder = {
  width: "44px",
  height: "44px",
  borderRadius: "50%",
  backgroundColor: "#2a2a2a",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#888",
  fontSize: "18px",
  fontWeight: "600",
  border: "2px solid #3a3a3a",
};

const nameEmphasis = {
  color: "#fff",
  fontSize: "15px",
  fontWeight: "600",
  lineHeight: "1.3",
};

const roleText = {
  color: "#888",
  fontSize: "11px",
  fontWeight: "400",
};

const toPill = {
  backgroundColor: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "100px",
  padding: "6px 14px",
  color: "white",
  fontSize: "14px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

const messageText = {
  color: "#ddd",
  fontSize: "15px",
  lineHeight: "1.5",
  marginBottom: "14px",
  fontWeight: "400",
};

const statsLine = {
  display: "flex",
  gap: "18px",
  color: "#666",
  fontSize: "13px",
  marginBottom: "12px",
};

const commentMainBtn = {
  width: "100%",
  backgroundColor: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: "100px",
  padding: "12px 18px",
  color: "#888",
  fontSize: "14px",
  cursor: "pointer",
  textAlign: "left",
  transition: "0.2s",
};

const commentOverlay = {
  backgroundColor: "#1a1a1a",
  borderTop: "1px solid rgba(255,255,255,0.06)",
  padding: "16px",
  marginTop: "4px",
};

const commentHandleBar = {
  width: "40px",
  height: "4px",
  backgroundColor: "#444",
  borderRadius: "4px",
  margin: "0 auto 14px auto",
};

const commentHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "12px",
};

const commentTitle = {
  color: "white",
  fontSize: "16px",
  fontWeight: "600",
  margin: 0,
};

const closeBtn = {
  background: "none",
  border: "none",
  color: "#888",
  fontSize: "20px",
  cursor: "pointer",
};

const commentsListBox = {
  maxHeight: "200px",
  overflowY: "auto",
  marginBottom: "12px",
};

const noComments = {
  color: "#666",
  fontSize: "14px",
  textAlign: "center",
  padding: "16px 0",
};

const commentItem = {
  padding: "10px 0",
  borderBottom: "1px solid rgba(255,255,255,0.04)",
};

const commentFrom = {
  color: "#888",
  fontSize: "11px",
  fontWeight: "500",
  marginBottom: "4px",
};

const commentBody = {
  color: "#ddd",
  fontSize: "14px",
};

const writeBox = {
  paddingTop: "12px",
  borderTop: "1px solid rgba(255,255,255,0.06)",
};

const commentInputTop = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: "8px",
  border: "1px solid #333",
  backgroundColor: "#0a0a0a",
  color: "white",
  fontSize: "14px",
  marginBottom: "8px",
  boxSizing: "border-box",
};

const sendRow = {
  display: "flex",
  gap: "8px",
};

const commentInputBottom = {
  flex: 1,
  padding: "10px 14px",
  borderRadius: "8px",
  border: "1px solid #333",
  backgroundColor: "#0a0a0a",
  color: "white",
  fontSize: "14px",
};

const sendBtn = {
  padding: "10px 20px",
  backgroundColor: "#00e676",
  color: "black",
  border: "none",
  borderRadius: "8px",
  fontWeight: "600",
  cursor: "pointer",
};

const imagePopup = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.92)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  cursor: "pointer",
};

const fullImageStyle = {
  maxWidth: "90%",
  maxHeight: "90%",
  objectFit: "contain",
  borderRadius: "8px",
};

const closeImageBtn = {
  position: "absolute",
  top: "24px",
  right: "24px",
  backgroundColor: "rgba(255,255,255,0.1)",
  border: "none",
  color: "white",
  fontSize: "24px",
  padding: "8px 16px",
  borderRadius: "8px",
  cursor: "pointer",
};

export default function DedicationCard({
  id,
  senderPhoto,
  senderName,
  senderWhatsapp,
  recipientName,
  recipientPhoto,
  dedicationTitle = "",
  message,
  mediaTitle = "Dedicated Song",
  mediaUrl = "",
  views = 0,
  reactionCount = 0,
  commentCount = 0,
  badgeStyle = "❤️",
  onDedicateClick,
  isActive = false,
}) {
  const [reactions, setReactions] = useState(reactionCount);
  const [comments, setComments] = useState(commentCount);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [writeCommentOpen, setWriteCommentOpen] = useState(false);
  const [commentsList, setCommentsList] = useState([]);
  const [commenterWhatsapp, setCommenterWhatsapp] = useState("");
  const [commentText, setCommentText] = useState("");
  const [fullImage, setFullImage] = useState(null);
  const [hasReacted, setHasReacted] = useState(() => {
    return localStorage.getItem(`chillax_reacted_${id}`) === "true";
  });
  const videoRef = useRef(null);
  const cardRef = useRef(null);
  const flag = getFlagFromWhatsapp(senderWhatsapp);

  // Determine media type
  const mediaType = mediaUrl ? (
    isImageUrl(mediaUrl) ? "image" :
    isDirectVideoUrl(mediaUrl) ? "video" :
    "embed"
  ) : "none";

  // Enhanced video playback control - pauses all other videos before playing
  useEffect(() => {
    const video = videoRef.current;

    if (mediaType !== "video" || !video) return;

    if (isActive) {
      // Pause all other videos on the page
      document.querySelectorAll("video").forEach((otherVideo) => {
        if (otherVideo !== video && !otherVideo.paused) {
          otherVideo.pause();
        }
      });

      // Play this video
      video.play().catch(() => {});
    } else {
      // Pause this video when inactive
      video.pause();
    }

    // Cleanup: pause video when component unmounts
    return () => {
      video.pause();
    };
  }, [isActive, mediaType]);

  async function loadComments() {
    if (!id) return;
    try {
      const res = await fetch(`${API_URL}/api/dedications/comments?id=${id}`);
      const data = await res.json();
      if (data.success) {
        setCommentsList(data.comments || []);
      }
    } catch (error) {
      console.error("Failed to load comments", error);
    }
  }

  async function react() {
    if (hasReacted) return;
    if (!id) return alert("Missing dedication ID");
    setHasReacted(true);
    setReactions((v) => v + 1);
    localStorage.setItem(`chillax_reacted_${id}`, "true");
    try {
      const res = await fetch(`${API_URL}/api/dedications/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!data.success) {
        setHasReacted(false);
        setReactions((v) => v - 1);
        localStorage.removeItem(`chillax_reacted_${id}`);
      }
    } catch {
      setHasReacted(false);
      setReactions((v) => v - 1);
      localStorage.removeItem(`chillax_reacted_${id}`);
    }
  }

  async function sendComment() {
    if (!id) return alert("Missing dedication ID");
    if (!commenterWhatsapp.trim()) return alert("Enter your WhatsApp number first.");
    if (!commentText.trim()) return;
    const textToSend = commentText.trim();
    const whatsappToSend = commenterWhatsapp.trim();
    const newComment = {
      id: Date.now(),
      dedication_id: id,
      comment: textToSend,
      commenter_whatsapp: whatsappToSend,
      created_at: new Date().toISOString(),
    };
    setCommentsList((prev) => [newComment, ...prev]);
    setComments((v) => v + 1);
    setCommentText("");
    try {
      const res = await fetch(`${API_URL}/api/dedications/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          comment: textToSend,
          commenter_whatsapp: whatsappToSend,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setCommentsList((prev) => prev.filter((c) => c.id !== newComment.id));
        setComments((v) => v - 1);
      }
    } catch {
      setCommentsList((prev) => prev.filter((c) => c.id !== newComment.id));
      setComments((v) => v - 1);
    }
  }

  function openViewCommentsOnly() {
    setCommentsOpen(true);
    setWriteCommentOpen(false);
    loadComments();
  }

  function openWriteComment() {
    setCommentsOpen(true);
    setWriteCommentOpen(true);
    loadComments();
  }

  function shareToWhatsApp() {
    const text = `🎵 ChillaX Dedication\n${senderName || "Someone"} dedicated something special to ${
      recipientName || "someone"
    }`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  // Render media based on type
  const renderMedia = () => {
    if (!mediaUrl) {
      return <div style={fallbackBg}></div>;
    }

    if (mediaType === "image") {
      return (
        <img
          src={mediaUrl}
          alt={dedicationTitle || mediaTitle}
          style={imageBg}
          onClick={() => setFullImage(mediaUrl)}
        />
      );
    }

    if (mediaType === "video") {
      return (
        <video
          ref={videoRef}
          src={mediaUrl}
          controls
          playsInline
          preload="metadata"
          style={videoBg}
          muted={false}
        />
      );
    }

    if (mediaType === "embed") {
      // Only render iframe when the card is active
      if (!isActive) {
        return <div style={fallbackBg}></div>;
      }

      return (
        <iframe
          key={`${id}-${isActive ? "active" : "inactive"}`}
          src={getEmbedUrl(mediaUrl, true)}
          title={dedicationTitle || mediaTitle}
          style={videoBg}
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope"
          allowFullScreen
        />
      );
    }

    return <div style={fallbackBg}></div>;
  };

  return (
    <div ref={cardRef} style={card}>
      <div style={mediaCard}>
        {renderMedia()}
        <div style={mediaShade}></div>
  <div style={topBadge}>
  <span style={badgeDot}></span>
  {badgeStyle || "❤️"} {dedicationTitle || mediaTitle}
</div>     
        <div style={rightActions}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onDedicateClick) onDedicateClick();
            }}
            style={followBtn}
            aria-label="Dedicate Song"
          >
            <Plus size={23} strokeWidth={2.5} color="white" />
          </button>

          <button
            type="button"
            onClick={react}
            style={sideBtn}
            aria-label="Like"
          >
            <Heart
              size={24}
              strokeWidth={2.4}
              fill={hasReacted ? "white" : "none"}
              color="white"
            />
            <span style={actionLabel}>{reactions}</span>
          </button>

          <button
            type="button"
            onClick={openViewCommentsOnly}
            style={sideBtn}
            aria-label="Comments"
          >
            <MessageSquare size={24} strokeWidth={2.4} color="white" />
            <span style={actionLabel}>{comments}</span>
          </button>

          <button
            type="button"
            onClick={shareToWhatsApp}
            style={sideBtn}
            aria-label="Share"
          >
            <Share2 size={24} strokeWidth={2.4} color="white" />
            <span style={actionLabel}>Share</span>
          </button>
        </div>
      </div>
      <div style={dedicationBody}>
        <div style={peopleRow}>
          <div style={person}>
            {senderPhoto ? (
              <img
                src={senderPhoto}
                alt={senderName}
                style={smallPhotoCircle}
                onClick={() => setFullImage(senderPhoto)}
              />
            ) : (
              <div style={smallPlaceholder}>S</div>
            )}
            <div>
              <div style={nameEmphasis}>
                {senderName || "Sender"} {flag}
              </div>
              <div style={roleText}>Sender</div>
            </div>
          </div>
          <button type="button" onClick={react} style={toPill}>
            <span>❤️</span>
          </button>
          <div style={person}>
            {recipientPhoto ? (
              <img
                src={recipientPhoto}
                alt={recipientName}
                style={smallPhotoSquare}
                onClick={() => setFullImage(recipientPhoto)}
              />
            ) : (
              <div style={smallPlaceholder}>R</div>
            )}
            <div>
              <div style={nameEmphasis}>{recipientName || "Recipient"}</div>
              <div style={roleText}>to</div>
            </div>
          </div>
        </div>
        <p style={messageText}>
          {message || "I chose this song because it reminds me of you."}
        </p>
        <div style={statsLine}>
          <span>👁 {views.toLocaleString()} views</span>
          <span>💬 {comments}</span>
        </div>
        <button type="button" onClick={openWriteComment} style={commentMainBtn}>
          Add a public comment...
        </button>
      </div>
      {commentsOpen && (
        <div style={commentOverlay}>
          <div style={commentHandleBar}></div>
          <div style={commentHeader}>
            <h3 style={commentTitle}>Comments ({comments})</h3>
            <button
              type="button"
              onClick={() => {
                setCommentsOpen(false);
                setWriteCommentOpen(false);
              }}
              style={closeBtn}
            >
              ✕
            </button>
          </div>
          <div style={commentsListBox}>
            {commentsList.length === 0 ? (
              <p style={noComments}>Be the first to comment on this dedication.</p>
            ) : (
              commentsList.map((comment) => (
                <div key={comment.id} style={commentItem}>
                  <div style={commentFrom}>
                    From {getFlagFromWhatsapp(comment.commenter_whatsapp || "")}
                  </div>
                  <div style={commentBody}>{comment.comment}</div>
                </div>
              ))
            )}
          </div>
          {writeCommentOpen && (
            <div style={writeBox}>
              <input
                value={commenterWhatsapp}
                onChange={(e) => setCommenterWhatsapp(e.target.value)}
                placeholder="WhatsApp e.g +250788123456"
                style={commentInputTop}
              />
              <div style={sendRow}>
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write comment..."
                  style={commentInputBottom}
                />
                <button type="button" onClick={sendComment} style={sendBtn}>
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {fullImage && (
        <div style={imagePopup} onClick={() => setFullImage(null)}>
          <img src={fullImage} alt="Full view" style={fullImageStyle} />
          <button type="button" style={closeImageBtn}>
            ✕
          </button>
        </div>
      )}
    </div>
  );
}