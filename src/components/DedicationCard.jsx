import { useState, useRef, useEffect } from "react";
import { Plus, Heart, MessageSquare, Share2, X } from "lucide-react";

const API_URL = "https://kitchenbrain.cucina656.workers.dev";
const MEDIA_PLAY_EVENT = "dedication-media-play";

// ==========================================
// DEVICE / VIEWPORT COMPATIBILITY HELPERS
// (additive only — supports Tecno/Infinix/Itel/Samsung budget
// devices at 360x800, Samsung/Apple mid+flagship tiers at
// 390x844 / 412x915 / 412x892 / 430x932, and legacy engines
// like Opera Mini / Samsung Internet / older Safari & Chrome)
// ==========================================
const VIEWPORT_STYLE_TAG_ID = "dedication-card-responsive-styles";
const VIEWPORT_META_ID = "dedication-card-viewport-meta";

function ensureViewportMeta() {
  if (typeof document === "undefined") return;
  // Many budget Android stock browsers (Tecno/Infinix/Itel) and
  // Opera Mini's extreme data-saving mode need an explicit viewport
  // tag or they render a desktop-width layout and shrink it down.
  const existing = document.querySelector('meta[name="viewport"]');
  if (existing) return;
  const meta = document.createElement("meta");
  meta.setAttribute("name", "viewport");
  meta.setAttribute("id", VIEWPORT_META_ID);
  meta.setAttribute(
    "content",
    "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
  );
  document.head.appendChild(meta);
}

function ensureResponsiveStylesheet() {
  if (typeof document === "undefined") return;
  if (document.getElementById(VIEWPORT_STYLE_TAG_ID)) return;

  const style = document.createElement("style");
  style.id = VIEWPORT_STYLE_TAG_ID;
  style.textContent = `
    /* --- Cross-device compatibility additions (does not override
       existing inline styles/behaviour, only fills gaps) --- */

    /* Prevent iOS Safari from auto-zooming the page when a form
       input is focused (inputs under 16px trigger this on iPhones
       like the 17/17 Pro Max, 16/16 Pro Max). */
    @media (max-width: 600px) {
      .dedication-card input,
      .dedication-card textarea {
        font-size: 16px !important;
      }
    }

    /* Extra-small budget viewports (360x800 — Tecno Spark/Camon,
       Infinix Note, Itel P-series, Samsung Galaxy A06/A16) get
       slightly tighter spacing so nothing clips or wraps oddly. */
    @media (max-width: 380px) {
      .dedication-card .dedication-name {
        max-width: 88px !important;
      }
      .dedication-card .dedication-action-btn {
        width: 38px !important;
        height: 38px !important;
      }
      .dedication-card .dedication-comment-input-top,
      .dedication-card .dedication-comment-input-bottom {
        font-size: 16px !important;
      }
    }

    /* Fallback for browsers without aspect-ratio support
       (older Opera Mini / older Samsung Internet / UC-based
       engines still used on entry-level Android in East Africa). */
    @supports not (aspect-ratio: 1 / 1) {
      .dedication-media-card {
        height: 0 !important;
        padding-bottom: 100% !important;
      }
    }

    /* Respect the device notch / rounded corners / home-indicator
       area on iPhone 17/16 Pro Max (430x932) and similar Android
       edge-to-edge displays, without changing existing layout. */
    .dedication-comment-overlay {
      padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px)) !important;
    }
    .dedication-close-image-btn {
      top: calc(16px + env(safe-area-inset-top, 0px)) !important;
      right: calc(16px + env(safe-area-inset-right, 0px)) !important;
    }

    /* Avoid the sticky 300ms tap-delay / grey tap flash seen on
       Samsung Internet and Chrome for budget Android devices. */
    .dedication-card button,
    .dedication-card a {
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }

    /* Keep the whole card from ever forcing horizontal scroll on
       narrow (360px) viewports regardless of dynamic content. */
    .dedication-card {
      max-width: 100vw;
      box-sizing: border-box;
    }
    .dedication-card * {
      box-sizing: border-box;
    }

    /* Large-screen premium devices (iPhone Pro Max 430x932,
       Galaxy S26/S25 Ultra 412x915) get a touch more breathing
       room in the media caption without altering smaller layouts. */
    @media (min-width: 428px) {
      .dedication-card .dedication-top-badge {
        font-size: 12px;
      }
    }
  `;
  document.head.appendChild(style);
}

// ==========================================
// MEDIA TYPE DETECTION HELPERS
// ==========================================
function getMediaType(url) {
  if (!url) return 'none';
  
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'];
  if (videoExtensions.some(ext => url.toLowerCase().includes(ext))) {
    return 'video';
  }
  
  const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];
  if (audioExtensions.some(ext => url.toLowerCase().includes(ext))) {
    return 'audio';
  }
  
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
  if (imageExtensions.some(ext => url.toLowerCase().includes(ext))) {
    return 'image';
  }
  
  if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
    return 'youtube';
  }
  
  if (url.includes('vimeo.com/')) {
    return 'vimeo';
  }
  
  if (url.includes('dailymotion.com/')) {
    return 'dailymotion';
  }
  
  return 'unknown';
}

function getYouTubeEmbedUrl(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?#]+)/,
    /youtube\.com\/embed\/([^?]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}?enablejsapi=1&playsinline=1`;
    }
  }
  return url;
}

function getVimeoEmbedUrl(url) {
  const match = url.match(/vimeo\.com\/(\d+)/);
  if (match) {
    return `https://player.vimeo.com/video/${match[1]}?api=1`;
  }
  return url;
}

function getDailymotionEmbedUrl(url) {
  const match = url.match(/dailymotion\.com\/video\/([^?&]+)/);
  if (match) {
    return `https://www.dailymotion.com/embed/video/${match[1]}?api=postMessage`;
  }
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
  const [commentsList, setCommentsList] = useState([]);
  const [commenterWhatsapp, setCommenterWhatsapp] = useState("");
  const [commentText, setCommentText] = useState("");
  const [fullImage, setFullImage] = useState(null);
  const [hasReacted, setHasReacted] = useState(() => {
    return localStorage.getItem(`chillax_reacted_${id}`) === "true";
  });
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const videoRef = useRef(null);
  const iframeRef = useRef(null);
  const cardRef = useRef(null);
  const mediaInstanceRef = useRef(Symbol("dedication-media"));
  const flag = getFlagFromWhatsapp(senderWhatsapp);
  const mediaType = getMediaType(mediaUrl);

  // ==========================================
  // Cross-device compatibility setup (additive):
  // ensures a proper viewport meta tag and injects the
  // responsive/legacy-browser stylesheet once per page,
  // covering the Sub-Saharan Africa / Europe / North
  // America / Asia device mix without touching any of
  // the existing inline styles or logic above.
  // ==========================================
  useEffect(() => {
    ensureViewportMeta();
    ensureResponsiveStylesheet();
  }, []);

  // ==========================================
  // Keep only one dedication media playing at a time
  // ==========================================
  useEffect(() => {
    const nativeMedia = videoRef.current;
    const iframe = iframeRef.current;
    const instanceId = mediaInstanceRef.current;
    const isIframeMedia = ['youtube', 'vimeo', 'dailymotion'].includes(mediaType);

    const pauseIframe = () => {
      if (!iframe || !isIframeMedia) return;

      try {
        if (mediaType === 'youtube') {
          iframe.contentWindow?.postMessage(
            '{"event":"command","func":"pauseVideo","args":""}',
            '*'
          );
        } else if (mediaType === 'vimeo') {
          iframe.contentWindow?.postMessage('{"method":"pause"}', '*');
        } else if (mediaType === 'dailymotion') {
          iframe.contentWindow?.postMessage('{"command":"pause"}', '*');
        }
      } catch (error) {
        console.log("Could not pause iframe:", error);
      }
    };

    const pauseCurrentMedia = () => {
      if (nativeMedia && !nativeMedia.paused) {
        nativeMedia.pause();
      }
      pauseIframe();
    };

    const pauseOtherNativeMedia = () => {
      document.querySelectorAll("video, audio").forEach((otherMedia) => {
        if (otherMedia !== nativeMedia && !otherMedia.paused) {
          otherMedia.pause();
        }
      });
    };

    const announceCurrentMedia = () => {
      pauseOtherNativeMedia();
      window.dispatchEvent(
        new CustomEvent(MEDIA_PLAY_EVENT, {
          detail: { instanceId },
        })
      );
    };

    const handleAnotherMediaPlayed = (event) => {
      if (event.detail?.instanceId !== instanceId) {
        pauseCurrentMedia();
      }
    };

    const handleNativePlay = () => {
      announceCurrentMedia();
    };

    const handleIframeMessage = (event) => {
      if (!iframe || event.source !== iframe.contentWindow) return;

      let data = event.data;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }

      const youtubeStarted =
        data?.event === "infoDelivery" && data?.info?.playerState === 1;
      const vimeoStarted = data?.event === "play";
      const dailymotionStarted =
        data?.event === "video_start" ||
        data?.event === "play" ||
        data?.status === "playing";

      if (youtubeStarted || vimeoStarted || dailymotionStarted) {
        announceCurrentMedia();
      }
    };

    window.addEventListener(MEDIA_PLAY_EVENT, handleAnotherMediaPlayed);
    window.addEventListener("message", handleIframeMessage);
    nativeMedia?.addEventListener("play", handleNativePlay);

    if (isActive) {
      announceCurrentMedia();

      if (nativeMedia && ['video', 'audio'].includes(mediaType)) {
        nativeMedia.play().catch(() => {
          // Browser autoplay rules may require the viewer to press Play.
        });
      } else if (iframe && isIframeMedia) {
        try {
          if (mediaType === 'youtube') {
            iframe.contentWindow?.postMessage(
              '{"event":"command","func":"playVideo","args":""}',
              '*'
            );
          } else if (mediaType === 'vimeo') {
            iframe.contentWindow?.postMessage('{"method":"play"}', '*');
          } else if (mediaType === 'dailymotion') {
            iframe.contentWindow?.postMessage('{"command":"play"}', '*');
          }
        } catch (error) {
          console.log("Could not play iframe:", error);
        }
      }
    } else {
      pauseCurrentMedia();
    }

    return () => {
      nativeMedia?.removeEventListener("play", handleNativePlay);
      window.removeEventListener(MEDIA_PLAY_EVENT, handleAnotherMediaPlayed);
      window.removeEventListener("message", handleIframeMessage);
      pauseCurrentMedia();
    };
  }, [isActive, mediaType, mediaUrl]);

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

    setIsSubmittingComment(true);
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
        alert(data.message || "Failed to post comment");
      }
    } catch (error) {
      console.error("Comment error:", error);
      setCommentsList((prev) => prev.filter((c) => c.id !== newComment.id));
      setComments((v) => v - 1);
      alert("Network error. Please try again.");
    } finally {
      setIsSubmittingComment(false);
    }
  }

  function openComments() {
    setCommentsOpen(true);
    loadComments();
  }

  function closeComments() {
    setCommentsOpen(false);
    setCommentText("");
  }

  function shareToWhatsApp() {
    const text = `🎵 ChillaX Dedication\n${senderName || "Someone"} dedicated something special to ${
      recipientName || "someone"
    }`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  function renderMedia() {
    if (!mediaUrl) {
      return (
        <div style={fallbackBg}>
          <div style={fallbackContent}>
            <span style={fallbackIcon}>🎵</span>
            <span style={fallbackText}>{dedicationTitle || mediaTitle}</span>
          </div>
        </div>
      );
    }

    switch (mediaType) {
      case 'youtube':
        return (
          <iframe
            ref={iframeRef}
            src={getYouTubeEmbedUrl(mediaUrl)}
            style={iframeStyle}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={dedicationTitle || mediaTitle}
            loading="lazy"
          />
        );
      
      case 'vimeo':
        return (
          <iframe
            ref={iframeRef}
            src={getVimeoEmbedUrl(mediaUrl)}
            style={iframeStyle}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title={dedicationTitle || mediaTitle}
            loading="lazy"
          />
        );
      
      case 'dailymotion':
        return (
          <iframe
            ref={iframeRef}
            src={getDailymotionEmbedUrl(mediaUrl)}
            style={iframeStyle}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title={dedicationTitle || mediaTitle}
            loading="lazy"
          />
        );
      
      case 'video':
        return (
          <video
            ref={videoRef}
            src={mediaUrl}
            controls
            playsInline
            autoPlay
            muted
            loop
            crossOrigin="anonymous"
            preload="auto"
            style={videoBg}
          />
        );
      
      case 'audio':
        return (
          <div style={audioContainerStyle}>
            <div style={audioCardStyle}>
              <div style={audioIconStyle}>🎵</div>
              <audio
                ref={videoRef}
                src={mediaUrl}
                controls
                style={audioControlStyle}
              />
              <div style={audioTitleStyle}>{dedicationTitle || mediaTitle}</div>
            </div>
          </div>
        );
      
      case 'image':
        return (
          <img
            src={mediaUrl}
            alt={dedicationTitle || mediaTitle}
            style={imageBgStyle}
            loading="lazy"
          />
        );
      
      default:
        return (
          <div style={fallbackBg}>
            <div style={fallbackContent}>
              <span style={fallbackIcon}>🎵</span>
              <span style={fallbackText}>{dedicationTitle || mediaTitle}</span>
            </div>
          </div>
        );
    }
  }

  return (
    <div ref={cardRef} style={card} className="dedication-card">
      {/* Instagram Header */}
      <div style={instagramHeader}>
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
            <div style={nameEmphasis} className="dedication-name">
              {senderName || "Sender"} {flag}
            </div>
            <div style={roleText}>Sender</div>
          </div>
        </div>
        
        <button type="button" onClick={react} style={toPill}>
          <span>to</span>
        </button>

        <div style={person}>
          {recipientPhoto ? (
            <img
              src={recipientPhoto}
              alt={recipientName}
              style={smallPhotoCircle}
              onClick={() => setFullImage(recipientPhoto)}
            />
          ) : (
            <div style={smallPlaceholder}>R</div>
          )}
          <div>
            <div style={nameEmphasis} className="dedication-name">{recipientName || "Recipient"}</div>
            <div style={roleText}>Recipient</div>
          </div>
        </div>
      </div>

      {/* Media */}
      <div style={mediaCard} className="dedication-media-card">
        {renderMedia()}
        <div style={topBadge} className="dedication-top-badge">
          <span style={badgeDot}></span>
          {dedicationTitle || mediaTitle}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={instagramActionBar}>
        <div style={leftActionsRow}>
          <button type="button" onClick={react} style={neonActionBtn} className="dedication-action-btn" aria-label="Like">
            <Heart
              size={24}
              strokeWidth={2}
              fill={hasReacted ? "#ED4956" : "none"}
              color={hasReacted ? "#ED4956" : "#ffffff"}
            />
          </button>
          <button type="button" onClick={openComments} style={neonActionBtn} className="dedication-action-btn" aria-label="Comments">
            <MessageSquare size={24} strokeWidth={2} color="#ffffff" />
          </button>
          <button type="button" onClick={shareToWhatsApp} style={neonActionBtn} className="dedication-action-btn" aria-label="Share">
            <Share2 size={24} strokeWidth={2} color="#ffffff" />
          </button>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onDedicateClick) onDedicateClick();
          }}
          style={neonActionBtn}
          className="dedication-action-btn"
          aria-label="Dedicate Song"
        >
          <Plus size={24} strokeWidth={2} color="#ffffff" />
        </button>
      </div>

      {/* Stats and Message */}
      <div style={dedicationBody}>
        <div style={statsLine}>
          <span>{reactions.toLocaleString()} likes</span>
          <span>•</span>
          <span>{views.toLocaleString()} views</span>
        </div>

        <p style={messageText}>
          <span style={{ fontWeight: "700", marginRight: "6px" }}>{senderName || "Sender"}:</span>
          {message || "I chose this song because it reminds me of you."}
        </p>

        <button type="button" onClick={openComments} style={commentMainBtn}>
          View all {comments} comments...
        </button>
      </div>

      {/* Comments Overlay */}
      {commentsOpen && (
        <div style={commentOverlay} className="dedication-comment-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) closeComments();
        }}>
          <div style={commentHandleBar}></div>
          <div style={commentHeader}>
            <h3 style={commentTitle}>Comments</h3>
            <button
              type="button"
              onClick={closeComments}
              style={closeBtn}
            >
              <X size={20} color="#ffffff" />
            </button>
          </div>
          
          <div style={commentsListBox}>
            {commentsList.length === 0 ? (
              <p style={noComments}>No comments yet. Be the first! 💬</p>
            ) : (
              commentsList.map((comment) => (
                <div key={comment.id} style={commentItem}>
                  <div style={commentHeaderRow}>
                    <div style={commentAvatar}>
                      {getFlagFromWhatsapp(comment.commenter_whatsapp || "")}
                    </div>
                    <div style={commentContent}>
                      <div style={commentFrom}>Anonymous Fan</div>
                      <div style={commentBody}>{comment.comment}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Comment Input */}
          <div style={writeBox}>
            <input
              value={commenterWhatsapp}
              onChange={(e) => setCommenterWhatsapp(e.target.value)}
              placeholder="📱 WhatsApp number (e.g +250788123456)"
              style={commentInputTop}
              className="dedication-comment-input-top"
            />
            <div style={sendRow}>
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                style={commentInputBottom}
                className="dedication-comment-input-bottom"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendComment();
                  }
                }}
              />
              <button 
                type="button" 
                onClick={sendComment} 
                style={sendBtn}
                disabled={isSubmittingComment || !commentText.trim()}
              >
                {isSubmittingComment ? "Sending..." : "Post"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Image Popup */}
      {fullImage && (
        <div style={imagePopup} onClick={() => setFullImage(null)}>
          <img src={fullImage} alt="Full view" style={fullImageStyle} />
          <button type="button" style={closeImageBtn} className="dedication-close-image-btn" onClick={() => setFullImage(null)}>
            <X size={24} color="#ffffff" />
          </button>
        </div>
      )}
    </div>
  );
}

// ==========================================
// STYLES
// ==========================================
const card = {
  position: "relative",
  width: "100%",
  maxWidth: "430px",
  margin: "0 auto 18px auto",
  overflow: "hidden",
  background: "#000000",
  color: "#ffffff",
  borderRadius: "0px",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  WebkitFontSmoothing: "antialiased",
};

const instagramHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 14px",
  background: "#000000",
  borderBottom: "1px solid #1c1c1e",
};

const mediaCard = {
  position: "relative",
  width: "100%",
  aspectRatio: "1 / 1", 
  overflow: "hidden",
  background: "#000000",
};

const videoBg = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  objectPosition: "center center",
  background: "#000000",
  zIndex: 0,
};

const iframeStyle = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  border: "none",
  background: "#000000",
  zIndex: 0,
};

const imageBgStyle = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  background: "#000000",
  zIndex: 0,
};

const audioContainerStyle = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(145deg, #1a1a1a, #0a0a0a)",
  zIndex: 0,
  padding: "20px",
};

const audioCardStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "16px",
  width: "100%",
  maxWidth: "320px",
};

const audioIconStyle = {
  fontSize: "48px",
  marginBottom: "8px",
};

const audioControlStyle = {
  width: "100%",
  height: "48px",
  background: "transparent",
};

const audioTitleStyle = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#ffffff",
  textAlign: "center",
};

const fallbackBg = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#262626",
  zIndex: 0,
};

const fallbackContent = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "12px",
};

const fallbackIcon = {
  fontSize: "48px",
};

const fallbackText = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#ffffff",
  textAlign: "center",
};

const topBadge = {
  position: "absolute",
  bottom: "14px",
  left: "14px",
  zIndex: 2,
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "4px 8px",
  borderRadius: "4px",
  background: "rgba(0, 0, 0, 0.75)",
  color: "#ffffff",
  fontSize: "11px",
  fontWeight: "600",
};

const badgeDot = {
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  background: "#0095f6",
  flexShrink: 0,
};

const instagramActionBar = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 14px 8px 14px",
  background: "#000000",
};

const leftActionsRow = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
};

const inlineActionBtn = {
  border: "none",
  background: "transparent",
  padding: 0,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const neonActionBtn = {
  width: "42px",
  height: "42px",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: "50%",
  background: "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
  padding: 0,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 0 8px rgba(240,148,51,0.8), 0 0 16px rgba(220,39,67,0.75), 0 0 26px rgba(188,24,136,0.55)",
  filter: "drop-shadow(0 0 4px rgba(255,255,255,0.35))",
  transition: "transform 0.2s ease, box-shadow 0.2s ease",
  flexShrink: 0,
};

const dedicationBody = {
  padding: "0px 14px 16px 14px",
  background: "#000000",
};

const person = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  minWidth: 0,
};

const nameEmphasis = {
  fontWeight: "600",
  fontSize: "13px",
  color: "#ffffff",
  lineHeight: 1.2,
  maxWidth: "110px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const roleText = {
  fontSize: "11px",
  color: "#a8a8a8",
};

const smallPhotoCircle = {
  width: "32px",
  height: "32px",
  borderRadius: "50%",
  objectFit: "cover",
  border: "1px solid #262626",
  cursor: "pointer",
  flexShrink: 0,
};

const smallPlaceholder = {
  width: "32px",
  height: "32px",
  borderRadius: "50%",
  background: "#262626",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  fontWeight: "600",
  flexShrink: 0,
};

const toPill = {
  padding: "4px 12px",
  borderRadius: "8px",
  background: "#1c1c1e",
  color: "#ffffff",
  fontSize: "12px",
  fontWeight: "600",
  border: "none",
  flexShrink: 0,
};

const messageText = {
  margin: "6px 0 0 0",
  fontSize: "14px",
  lineHeight: "1.4",
  color: "#f5f5f5",
  wordBreak: "break-word",
};

const statsLine = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "14px",
  fontWeight: "600",
  color: "#ffffff",
};

const commentMainBtn = {
  marginTop: "10px",
  padding: "9px 14px",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.2)",
  background: "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
  color: "#ffffff",
  fontSize: "13px",
  fontWeight: "700",
  textAlign: "center",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 0 8px rgba(240,148,51,0.75), 0 0 16px rgba(220,39,67,0.65), 0 0 24px rgba(188,24,136,0.45)",
  transition: "transform 0.2s ease, box-shadow 0.2s ease",
};

const commentOverlay = {
  position: "fixed",
  left: "50%",
  transform: "translateX(-50%)",
  bottom: 0,
  width: "100%",
  maxWidth: "430px",
  height: "70svh",
  zIndex: 1000,
  background: "#1c1c1e",
  borderTopLeftRadius: "16px",
  borderTopRightRadius: "16px",
  padding: "0 16px 16px 16px",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  animation: "slideUp 0.3s ease",
};

const commentHandleBar = {
  width: "36px",
  height: "4px",
  background: "#3a3a3c",
  borderRadius: "999px",
  margin: "8px auto 12px auto",
  flexShrink: 0,
};

const commentHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  paddingBottom: "12px",
  borderBottom: "1px solid #2c2c2e",
  flexShrink: 0,
};

const commentTitle = {
  margin: 0,
  fontSize: "16px",
  fontWeight: "600",
  color: "#ffffff",
};

const closeBtn = {
  border: "none",
  background: "none",
  color: "#ffffff",
  cursor: "pointer",
  padding: "4px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const commentsListBox = {
  flex: 1,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  padding: "14px 0",
  WebkitOverflowScrolling: "touch",
};

const commentHeaderRow = {
  display: "flex",
  alignItems: "flex-start",
  gap: "2px",
};

const commentAvatar = {
  width: "36px",
  height: "36px",
  borderRadius: "50%",
  background: "#f5f2ef",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "20px",
  flexShrink: 0,
  border: "2px solid #4f52ed",
};

const commentContent = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: "1px",
};

const commentItem = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const commentFrom = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#a8a8a8",
};

const commentBody = {
  fontSize: "14px",
  color: "#ffffff",
  wordBreak: "break-word",
};

const noComments = {
  textAlign: "center",
  color: "#a8a8a8",
  fontSize: "14px",
  marginTop: "32px",
};

const writeBox = {
  borderTop: "1px solid #2c2c2e",
  paddingTop: "12px",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  flexShrink: 0,
  background: "#1c1c1e",
};

const sendRow = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: "10px",
  alignItems: "center",
};

const commentInputTop = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #2c2c2e",
  borderRadius: "8px",
  background: "#000000",
  color: "#ffffff",
  outline: "none",
  padding: "10px 12px",
  fontSize: "13px",
};

const commentInputBottom = {
  width: "100%",
  boxSizing: "border-box",
  border: "none",
  background: "transparent",
  color: "#ffffff",
  outline: "none",
  padding: "10px 0",
  fontSize: "14px",
};

const sendBtn = {
  border: "none",
  background: "none",
  color: "#0095f6",
  fontWeight: "600",
  fontSize: "14px",
  cursor: "pointer",
  padding: "8px 12px",
  opacity: 1,
  transition: "opacity 0.2s ease",
};

const imagePopup = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  background: "rgba(0,0,0,0.95)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "16px",
};

const fullImageStyle = {
  maxWidth: "100%",
  maxHeight: "85vh",
  objectFit: "contain",
};

const closeImageBtn = {
  position: "fixed",
  top: "16px",
  right: "16px",
  border: "none",
  background: "none",
  color: "#ffffff",
  cursor: "pointer",
  padding: "8px",
};
