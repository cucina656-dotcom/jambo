import { useState, useRef, useEffect } from "react";
const API_URL = "https://kitchenbrain.cucina656.workers.dev";
function getFlagFromWhatsapp(number = "") {
  // Africa
  if (number.startsWith("+213") || number.startsWith("213")) return "🇩🇿"; // Algeria
  if (number.startsWith("+244") || number.startsWith("244")) return "🇦🇴"; // Angola
  if (number.startsWith("+229") || number.startsWith("229")) return "🇧🇯"; // Benin
  if (number.startsWith("+267") || number.startsWith("267")) return "🇧🇼"; // Botswana
  if (number.startsWith("+226") || number.startsWith("226")) return "🇧🇫"; // Burkina Faso
  if (number.startsWith("+257") || number.startsWith("257")) return "🇧🇮"; // Burundi
  if (number.startsWith("+237") || number.startsWith("237")) return "🇨🇲"; // Cameroon
  if (number.startsWith("+238") || number.startsWith("238")) return "🇨🇻"; // Cape Verde
  if (number.startsWith("+236") || number.startsWith("236")) return "🇨🇫"; // Central African Republic
  if (number.startsWith("+235") || number.startsWith("235")) return "🇹🇩"; // Chad
  if (number.startsWith("+269") || number.startsWith("269")) return "🇰🇲"; // Comoros
  if (number.startsWith("+242") || number.startsWith("242")) return "🇨🇬"; // Congo (Republic)
  if (number.startsWith("+243") || number.startsWith("243")) return "🇨🇩"; // Congo (DRC)
  if (number.startsWith("+225") || number.startsWith("225")) return "🇨🇮"; // Côte d'Ivoire
  if (number.startsWith("+253") || number.startsWith("253")) return "🇩🇯"; // Djibouti
  if (number.startsWith("+20") || number.startsWith("20")) return "🇪🇬"; // Egypt
  if (number.startsWith("+240") || number.startsWith("240")) return "🇬🇶"; // Equatorial Guinea
  if (number.startsWith("+291") || number.startsWith("291")) return "🇪🇷"; // Eritrea
  if (number.startsWith("+268") || number.startsWith("268")) return "🇸🇿"; // Eswatini
  if (number.startsWith("+251") || number.startsWith("251")) return "🇪🇹"; // Ethiopia
  if (number.startsWith("+241") || number.startsWith("241")) return "🇬🇦"; // Gabon
  if (number.startsWith("+220") || number.startsWith("220")) return "🇬🇲"; // Gambia
  if (number.startsWith("+233") || number.startsWith("233")) return "🇬🇭"; // Ghana
  if (number.startsWith("+224") || number.startsWith("224")) return "🇬🇳"; // Guinea
  if (number.startsWith("+245") || number.startsWith("245")) return "🇬🇼"; // Guinea-Bissau
  if (number.startsWith("+254") || number.startsWith("254")) return "🇰🇪"; // Kenya
  if (number.startsWith("+266") || number.startsWith("266")) return "🇱🇸"; // Lesotho
  if (number.startsWith("+231") || number.startsWith("231")) return "🇱🇷"; // Liberia
  if (number.startsWith("+218") || number.startsWith("218")) return "🇱🇾"; // Libya
  if (number.startsWith("+261") || number.startsWith("261")) return "🇲🇬"; // Madagascar
  if (number.startsWith("+265") || number.startsWith("265")) return "🇲🇼"; // Malawi
  if (number.startsWith("+223") || number.startsWith("223")) return "🇲🇱"; // Mali
  if (number.startsWith("+222") || number.startsWith("222")) return "🇲🇷"; // Mauritania
  if (number.startsWith("+230") || number.startsWith("230")) return "🇲🇺"; // Mauritius
  if (number.startsWith("+212") || number.startsWith("212")) return "🇲🇦"; // Morocco
  if (number.startsWith("+258") || number.startsWith("258")) return "🇲🇿"; // Mozambique
  if (number.startsWith("+264") || number.startsWith("264")) return "🇳🇦"; // Namibia
  if (number.startsWith("+227") || number.startsWith("227")) return "🇳🇪"; // Niger
  if (number.startsWith("+234") || number.startsWith("234")) return "🇳🇬"; // Nigeria
  if (number.startsWith("+250") || number.startsWith("250")) return "🇷🇼"; // Rwanda
  if (number.startsWith("+239") || number.startsWith("239")) return "🇸🇹"; // São Tomé and Príncipe
  if (number.startsWith("+221") || number.startsWith("221")) return "🇸🇳"; // Senegal
  if (number.startsWith("+248") || number.startsWith("248")) return "🇸🇨"; // Seychelles
  if (number.startsWith("+232") || number.startsWith("232")) return "🇸🇱"; // Sierra Leone
  if (number.startsWith("+252") || number.startsWith("252")) return "🇸🇴"; // Somalia
  if (number.startsWith("+27") || number.startsWith("27")) return "🇿🇦"; // South Africa
  if (number.startsWith("+211") || number.startsWith("211")) return "🇸🇸"; // South Sudan
  if (number.startsWith("+249") || number.startsWith("249")) return "🇸🇩"; // Sudan
  if (number.startsWith("+255") || number.startsWith("255")) return "🇹🇿"; // Tanzania
  if (number.startsWith("+228") || number.startsWith("228")) return "🇹🇬"; // Togo
  if (number.startsWith("+216") || number.startsWith("216")) return "🇹🇳"; // Tunisia
  if (number.startsWith("+256") || number.startsWith("256")) return "🇺🇬"; // Uganda
  if (number.startsWith("+260") || number.startsWith("260")) return "🇿🇲"; // Zambia
  if (number.startsWith("+263") || number.startsWith("263")) return "🇿🇼"; // Zimbabwe
  // Asia
  if (number.startsWith("+93") || number.startsWith("93")) return "🇦🇫"; // Afghanistan
  if (number.startsWith("+374") || number.startsWith("374")) return "🇦🇲"; // Armenia
  if (number.startsWith("+994") || number.startsWith("994")) return "🇦🇿"; // Azerbaijan
  if (number.startsWith("+973") || number.startsWith("973")) return "🇧🇭"; // Bahrain
  if (number.startsWith("+880") || number.startsWith("880")) return "🇧🇩"; // Bangladesh
  if (number.startsWith("+975") || number.startsWith("975")) return "🇧🇹"; // Bhutan
  if (number.startsWith("+673") || number.startsWith("673")) return "🇧🇳"; // Brunei
  if (number.startsWith("+855") || number.startsWith("855")) return "🇰🇭"; // Cambodia
  if (number.startsWith("+86") || number.startsWith("86")) return "🇨🇳"; // China
  if (number.startsWith("+357") || number.startsWith("357")) return "🇨🇾"; // Cyprus
  if (number.startsWith("+91") || number.startsWith("91")) return "🇮🇳"; // India
  if (number.startsWith("+62") || number.startsWith("62")) return "🇮🇩"; // Indonesia
  if (number.startsWith("+98") || number.startsWith("98")) return "🇮🇷"; // Iran
  if (number.startsWith("+964") || number.startsWith("964")) return "🇮🇶"; // Iraq
  if (number.startsWith("+972") || number.startsWith("972")) return "🇮🇱"; // Israel
  if (number.startsWith("+81") || number.startsWith("81")) return "🇯🇵"; // Japan
  if (number.startsWith("+962") || number.startsWith("962")) return "🇯🇴"; // Jordan
  if (number.startsWith("+7") || number.startsWith("7")) return "🇰🇿"; // Kazakhstan
  if (number.startsWith("+965") || number.startsWith("965")) return "🇰🇼"; // Kuwait
  if (number.startsWith("+996") || number.startsWith("996")) return "🇰🇬"; // Kyrgyzstan
  if (number.startsWith("+856") || number.startsWith("856")) return "🇱🇦"; // Laos
  if (number.startsWith("+961") || number.startsWith("961")) return "🇱🇧"; // Lebanon
  if (number.startsWith("+60") || number.startsWith("60")) return "🇲🇾"; // Malaysia
  if (number.startsWith("+960") || number.startsWith("960")) return "🇲🇻"; // Maldives
  if (number.startsWith("+976") || number.startsWith("976")) return "🇲🇳"; // Mongolia
  if (number.startsWith("+95") || number.startsWith("95")) return "🇲🇲"; // Myanmar
  if (number.startsWith("+977") || number.startsWith("977")) return "🇳🇵"; // Nepal
  if (number.startsWith("+850") || number.startsWith("850")) return "🇰🇵"; // North Korea
  if (number.startsWith("+968") || number.startsWith("968")) return "🇴🇲"; // Oman
  if (number.startsWith("+92") || number.startsWith("92")) return "🇵🇰"; // Pakistan
  if (number.startsWith("+970") || number.startsWith("970")) return "🇵🇸"; // Palestine
  if (number.startsWith("+63") || number.startsWith("63")) return "🇵🇭"; // Philippines
  if (number.startsWith("+974") || number.startsWith("974")) return "🇶🇦"; // Qatar
  if (number.startsWith("+966") || number.startsWith("966")) return "🇸🇦"; // Saudi Arabia
  if (number.startsWith("+65") || number.startsWith("65")) return "🇸🇬"; // Singapore
  if (number.startsWith("+82") || number.startsWith("82")) return "🇰🇷"; // South Korea
  if (number.startsWith("+94") || number.startsWith("94")) return "🇱🇰"; // Sri Lanka
  if (number.startsWith("+963") || number.startsWith("963")) return "🇸🇾"; // Syria
  if (number.startsWith("+886") || number.startsWith("886")) return "🇹🇼"; // Taiwan
  if (number.startsWith("+992") || number.startsWith("992")) return "🇹🇯"; // Tajikistan
  if (number.startsWith("+66") || number.startsWith("66")) return "🇹🇭"; // Thailand
  if (number.startsWith("+670") || number.startsWith("670")) return "🇹🇱"; // Timor-Leste
  if (number.startsWith("+90") || number.startsWith("90")) return "🇹🇷"; // Turkey
  if (number.startsWith("+993") || number.startsWith("993")) return "🇹🇲"; // Turkmenistan
  if (number.startsWith("+971") || number.startsWith("971")) return "🇦🇪"; // UAE
  if (number.startsWith("+998") || number.startsWith("998")) return "🇺🇿"; // Uzbekistan
  if (number.startsWith("+84") || number.startsWith("84")) return "🇻🇳"; // Vietnam
  if (number.startsWith("+967") || number.startsWith("967")) return "🇾🇪"; // Yemen
  // Europe
  if (number.startsWith("+355") || number.startsWith("355")) return "🇦🇱"; // Albania
  if (number.startsWith("+376") || number.startsWith("376")) return "🇦🇩"; // Andorra
  if (number.startsWith("+43") || number.startsWith("43")) return "🇦🇹"; // Austria
  if (number.startsWith("+375") || number.startsWith("375")) return "🇧🇾"; // Belarus
  if (number.startsWith("+32") || number.startsWith("32")) return "🇧🇪"; // Belgium
  if (number.startsWith("+387") || number.startsWith("387")) return "🇧🇦"; // Bosnia and Herzegovina
  if (number.startsWith("+359") || number.startsWith("359")) return "🇧🇬"; // Bulgaria
  if (number.startsWith("+385") || number.startsWith("385")) return "🇭🇷"; // Croatia
  if (number.startsWith("+420") || number.startsWith("420")) return "🇨🇿"; // Czech Republic
  if (number.startsWith("+45") || number.startsWith("45")) return "🇩🇰"; // Denmark
  if (number.startsWith("+372") || number.startsWith("372")) return "🇪🇪"; // Estonia
  if (number.startsWith("+358") || number.startsWith("358")) return "🇫🇮"; // Finland
  if (number.startsWith("+33") || number.startsWith("33")) return "🇫🇷"; // France
  if (number.startsWith("+49") || number.startsWith("49")) return "🇩🇪"; // Germany
  if (number.startsWith("+30") || number.startsWith("30")) return "🇬🇷"; // Greece
  if (number.startsWith("+36") || number.startsWith("36")) return "🇭🇺"; // Hungary
  if (number.startsWith("+354") || number.startsWith("354")) return "🇮🇸"; // Iceland
  if (number.startsWith("+353") || number.startsWith("353")) return "🇮🇪"; // Ireland
  if (number.startsWith("+39") || number.startsWith("39")) return "🇮🇹"; // Italy
  if (number.startsWith("+383") || number.startsWith("383")) return "🇽🇰"; // Kosovo
  if (number.startsWith("+371") || number.startsWith("371")) return "🇱🇻"; // Latvia
  if (number.startsWith("+423") || number.startsWith("423")) return "🇱🇮"; // Liechtenstein
  if (number.startsWith("+370") || number.startsWith("370")) return "🇱🇹"; // Lithuania
  if (number.startsWith("+352") || number.startsWith("352")) return "🇱🇺"; // Luxembourg
  if (number.startsWith("+356") || number.startsWith("356")) return "🇲🇹"; // Malta
  if (number.startsWith("+373") || number.startsWith("373")) return "🇲🇩"; // Moldova
  if (number.startsWith("+377") || number.startsWith("377")) return "🇲🇨"; // Monaco
  if (number.startsWith("+382") || number.startsWith("382")) return "🇲 Montenegro
  if (number.startsWith("+31") || number.startsWith("31")) return "🇳🇱"; // Netherlands
  if (number.startsWith("+389") || number.startsWith("389")) return "🇲🇰"; // North Macedonia
  if (number.startsWith("+47") || number.startsWith("47")) return "🇳🇴"; // Norway
  if (number.startsWith("+48") || number.startsWith("48")) return "🇵🇱"; // Poland
  if (number.startsWith("+351") || number.startsWith("351")) return "🇵🇹"; // Portugal
  if (number.startsWith("+40") || number.startsWith("40")) return "🇷🇴"; // Romania
  if (number.startsWith("+7") || number.startsWith("7")) return "🇷🇺"; // Russia
  if (number.startsWith("+378") || number.startsWith("378")) return "🇸🇲"; // San Marino
  if (number.startsWith("+381") || number.startsWith("381")) return "🇷🇸"; // Serbia
  if (number.startsWith("+421") || number.startsWith("421")) return "🇸🇰"; // Slovakia
  if (number.startsWith("+386") || number.startsWith("386")) return "🇸🇮"; // Slovenia
  if (number.startsWith("+34") || number.startsWith("34")) return "🇪🇸"; // Spain
  if (number.startsWith("+46") || number.startsWith("46")) return "🇸🇪"; // Sweden
  if (number.startsWith("+41") || number.startsWith("41")) return "🇨🇭"; // Switzerland
  if (number.startsWith("+380") || number.startsWith("380")) return "🇺🇦"; // Ukraine
  if (number.startsWith("+44") || number.startsWith("44")) return "🇬🇧"; // United Kingdom
  if (number.startsWith("+379") || number.startsWith("379")) return "🇻🇦"; // Vatican City
  // North America
  if (number.startsWith("+1") || number.startsWith("1")) {
    // US, Canada, and Caribbean countries with +1
    if (number.startsWith("+1242") || number.startsWith("1242")) return "🇧🇸"; // Bahamas
    if (number.startsWith("+1246") || number.startsWith("1246")) return "🇧🇧"; // Barbados
    if (number.startsWith("+1441") || number.startsWith("1441")) return "🇧🇲"; // Bermuda
    if (number.startsWith("+1284") || number.startsWith("1284")) return "🇻🇬"; // British Virgin Islands
    if (number.startsWith("+1345") || number.startsWith("1345")) return "🇰🇾"; // Cayman Islands
    if (number.startsWith("+1767") || number.startsWith("1767")) return "🇩🇲"; // Dominica
    if (number.startsWith("+1809") || number.startsWith("1809")) return "🇩🇴"; // Dominican Republic
    if (number.startsWith("+1876") || number.startsWith("1876")) return "🇯🇲"; // Jamaica
    if (number.startsWith("+1664") || number.startsWith("1664")) return "🇲🇸"; // Montserrat
    if (number.startsWith("+1787") || number.startsWith("1787")) return "🇵🇷"; // Puerto Rico
    if (number.startsWith("+1868") || number.startsWith("1868")) return "🇹🇹"; // Trinidad and Tobago
    if (number.startsWith("+1649") || number.startsWith("1649")) return "🇹🇨"; // Turks and Caicos
    if (number.startsWith("+1340") || number.startsWith("1340")) return "🇻🇮"; // US Virgin Islands
    return "🇺🇸"; // USA/Canada default
  }
  if (number.startsWith("+52") || number.startsWith("52")) return "🇲🇽"; // Mexico
  if (number.startsWith("+501") || number.startsWith("501")) return "🇧🇿"; // Belize
  if (number.startsWith("+506") || number.startsWith("506")) return "🇨🇷"; // Costa Rica
  if (number.startsWith("+53") || number.startsWith("53")) return "🇨🇺"; // Cuba
  if (number.startsWith("+1809") || number.startsWith("1809")) return "🇩🇴"; // Dominican Republic
  if (number.startsWith("+503") || number.startsWith("503")) return "🇸🇻"; // El Salvador
  if (number.startsWith("+502") || number.startsWith("502")) return "🇬🇹"; // Guatemala
  if (number.startsWith("+504") || number.startsWith("504")) return "🇭🇳"; // Honduras
  if (number.startsWith("+505") || number.startsWith("505")) return "🇳🇮"; // Nicaragua
  if (number.startsWith("+507") || number.startsWith("507")) return "🇵🇦"; // Panama
  // South America
  if (number.startsWith("+54") || number.startsWith("54")) return "🇦🇷"; // Argentina
  if (number.startsWith("+591") || number.startsWith("591")) return "🇧🇴"; // Bolivia
  if (number.startsWith("+55") || number.startsWith("55")) return "🇧🇷"; // Brazil
  if (number.startsWith("+56") || number.startsWith("56")) return "🇨🇱"; // Chile
  if (number.startsWith("+57") || number.startsWith("57")) return "🇨🇴"; // Colombia
  if (number.startsWith("+593") || number.startsWith("593")) return "🇪🇨"; // Ecuador
  if (number.startsWith("+592") || number.startsWith("592")) return "🇬🇾"; // Guyana
  if (number.startsWith("+595") || number.startsWith("595")) return "🇵🇾"; // Paraguay
  if (number.startsWith("+51") || number.startsWith("51")) return "🇵🇪"; // Peru
  if (number.startsWith("+597") || number.startsWith("597")) return "🇸🇷"; // Suriname
  if (number.startsWith("+598") || number.startsWith("598")) return "🇺🇾"; // Uruguay
  if (number.startsWith("+58") || number.startsWith("58")) return "🇻🇪"; // Venezuela
  // Oceania
  if (number.startsWith("+61") || number.startsWith("61")) return "🇦🇺"; // Australia
  if (number.startsWith("+679") || number.startsWith("679")) return "🇫🇯"; // Fiji
  if (number.startsWith("+691") || number.startsWith("691")) return "🇫🇲"; // Micronesia
  if (number.startsWith("+674") || number.startsWith("674")) return "🇳🇷"; // Nauru
  if (number.startsWith("+64") || number.startsWith("64")) return "🇳🇿"; // New Zealand
  if (number.startsWith("+675") || number.startsWith("675")) return "🇵🇬"; // Papua New Guinea
  if (number.startsWith("+685") || number.startsWith("685")) return "🇼🇸"; // Samoa
  if (number.startsWith("+677") || number.startsWith("677")) return "🇸🇧"; // Solomon Islands
  if (number.startsWith("+676") || number.startsWith("676")) return "🇹🇴"; // Tonga
  if (number.startsWith("+688") || number.startsWith("688")) return "🇹🇻"; // Tuvalu
  if (number.startsWith("+678") || number.startsWith("678")) return "🇻🇺"; // Vanuatu
  return "🌍"; // Default if no match
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
  const [isVisible, setIsVisible] = useState(false);
  const videoRef = useRef(null);
  const cardRef = useRef(null);
  const flag = getFlagFromWhatsapp(senderWhatsapp);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting);
        });
      },
      {
        threshold: 0.6,
        rootMargin: "0px",
      }
    );
    if (cardRef.current) {
      observer.observe(cardRef.current);
    }
    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, []);
  useEffect(() => {
    if (!videoRef.current) return;
    if (isVisible) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch((err) => {
          console.log("Play prevented:", err);
        });
      }
    } else {
      if (!videoRef.current.paused) {
        videoRef.current.pause();
      }
    }
  }, [isVisible]);
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
  return (
    <div ref={cardRef} style={card}>
      <div style={mediaCard}>
        {mediaUrl ? (
          <video
            ref={videoRef}
            src={mediaUrl}
            controls
            playsInline
            preload="metadata"
            style={videoBg}
          />
        ) : (
          <div style={fallbackBg}></div>
        )}
        <div style={mediaShade}></div>
        <div style={topBadge}>
          <span style={badgeDot}></span>
          {dedicationTitle || mediaTitle}
        </div>
        <div style={rightActions}>
          <button type="button" onClick={onDedicateClick} style={standaloneFollowBtn}>
            ＋
          </button>
          <button type="button" onClick={react} style={sideBtn}>
            <span style={sideIcon}>{hasReacted ? "❤️" : "🤍"}</span>
            <span style={actionLabel}>{reactions}</span>
          </button>
          <button type="button" onClick={openViewCommentsOnly} style={sideBtn}>
            <span style={sideIcon}>💬</span>
            <span style={actionLabel}>{comments}</span>
          </button>
          <button type="button" onClick={shareToWhatsApp} style={sideBtn}>
            <span style={sideIcon}>↗</span>
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
const card = {
  position: "relative",
  width: "100%",
  maxWidth: "430px",
  margin: "0 auto 18px auto",
  overflow: "hidden",
  background:
    "radial-gradient(circle at 20% 0%, rgba(59, 130, 246, 0.18), transparent 34%), linear-gradient(180deg, #06142e 0%, #081a3a 48%, #031025 100%)",
  color: "#eaf2ff",
  borderRadius: "28px",
  border: "1px solid rgba(147, 197, 253, 0.22)",
  boxShadow:
    "0 24px 60px rgba(2, 6, 23, 0.55), 0 0 0 1px rgba(59, 130, 246, 0.08) inset",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  WebkitFontSmoothing: "antialiased",
};
const mediaCard = {
  position: "relative",
  width: "100%",
  aspectRatio: "4 / 5",
  overflow: "hidden",
  background: "#020817",
  borderRadius: "28px 28px 0 0",
  borderBottom: "1px solid rgba(147, 197, 253, 0.18)",
};
const videoBg = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  objectPosition: "center center",
  background: "#020817",
  zIndex: 0,
};
const fallbackBg = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(circle at 28% 18%, rgba(56, 189, 248, 0.65), transparent 32%), radial-gradient(circle at 82% 72%, rgba(37, 99, 235, 0.55), transparent 34%), linear-gradient(160deg, #020817, #06142e 48%, #0f2f6f)",
  zIndex: 0,
};
const mediaShade = {
  position: "absolute",
  inset: 0,
  background:
    "linear-gradient(180deg, rgba(2,8,23,0.66) 0%, rgba(2,8,23,0.08) 42%, rgba(2,8,23,0.82) 100%)",
  zIndex: 1,
  pointerEvents: "none",
};
const topBadge = {
  position: "absolute",
  top: "14px",
  left: "14px",
  right: "74px",
  zIndex: 2,
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  width: "fit-content",
  maxWidth: "calc(100% - 88px)",
  padding: "8px 12px",
  borderRadius: "999px",
  background: "rgba(8, 25, 58, 0.66)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  border: "1px solid rgba(147, 197, 253, 0.34)",
  color: "#f8fbff",
  fontSize: "12px",
  fontWeight: "900",
  letterSpacing: "0.75px",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  boxShadow: "0 12px 30px rgba(2, 8, 23, 0.35)",
};
const badgeDot = {
  width: "7px",
  height: "7px",
  borderRadius: "50%",
  background: "#38bdf8",
  boxShadow: "0 0 16px rgba(56, 189, 248, 1)",
  flexShrink: 0,
};
const rightActions = {
  position: "absolute",
  right: "12px",
  bottom: "14px",
  zIndex: 3,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "12px",
};
const standaloneFollowBtn = {
  width: "48px",
  height: "48px",
  borderRadius: "17px",
  border: "1px solid rgba(147, 197, 253, 0.30)",
  background: "linear-gradient(135deg, #38bdf8, #2563eb)",
  color: "#ffffff",
  fontSize: "22px",
  fontWeight: "900",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  lineHeight: 1,
  boxShadow: "0 12px 24px rgba(37, 99, 235, 0.4)",
  marginBottom: "2px"
};
const sideBtn = {
  border: "1px solid rgba(147, 197, 253, 0.30)",
  background: "rgba(8, 25, 58, 0.68)",
  color: "#ffffff",
  width: "48px",
  minHeight: "48px",
  borderRadius: "17px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "2px",
  padding: "6px 4px",
  cursor: "pointer",
  outline: "none",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  boxShadow: "0 12px 24px rgba(2, 8, 23, 0.34)",
};
const sideIcon = {
  fontSize: "19px",
  lineHeight: 1,
};
const actionLabel = {
  fontSize: "10px",
  fontWeight: "900",
  lineHeight: 1.1,
  color: "#dbeafe",
  textShadow: "0 1px 5px rgba(2, 8, 23, 0.9)",
};
const dedicationBody = {
  padding: "15px 14px 16px 14px",
  background:
    "radial-gradient(circle at 12% 0%, rgba(56, 189, 248, 0.13), transparent 28%), linear-gradient(180deg, rgba(7, 22, 51, 0.98) 0%, rgba(5, 18, 42, 1) 100%)",
};
const peopleRow = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap",
};
const person = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  minWidth: 0,
};
const nameEmphasis = {
  fontWeight: "900",
  fontSize: "14px",
  color: "#f8fbff",
  lineHeight: 1.15,
  maxWidth: "128px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
const roleText = {
  fontSize: "10px",
  fontWeight: "800",
  color: "#8fb8f7",
  marginTop: "2px",
};
const smallPhotoCircle = {
  width: "36px",
  height: "36px",
  borderRadius: "50%",
  objectFit: "cover",
  border: "2px solid rgba(226, 242, 255, 0.95)",
  cursor: "pointer",
  boxShadow: "0 9px 20px rgba(2, 8, 23, 0.36)",
  flexShrink: 0,
};
const smallPhotoSquare = {
  width: "36px",
  height: "36px",
  borderRadius: "12px",
  objectFit: "cover",
  border: "2px solid rgba(226, 242, 255, 0.95)",
  cursor: "pointer",
  boxShadow: "0 9px 20px rgba(2, 8, 23, 0.36)",
  flexShrink: 0,
};
const smallPlaceholder = {
  width: "36px",
  height: "36px",
  borderRadius: "50%",
  background: "linear-gradient(135deg, #0f3b82, #38bdf8)",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "13px",
  fontWeight: "900",
  border: "2px solid rgba(226, 242, 255, 0.95)",
  boxShadow: "0 9px 20px rgba(2, 8, 23, 0.34)",
  flexShrink: 0,
};
const toPill = {
  padding: "7px 11px",
  borderRadius: "999px",
  background: "linear-gradient(135deg, rgba(255, 77, 109, 0.22), rgba(37, 99, 235, 0.22))",
  color: "#f8fbff",
  fontSize: "11px",
  fontWeight: "950",
  border: "1px solid rgba(255, 255, 255, 0.24)",
  flexShrink: 0,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "5px",
  textTransform: "uppercase",
  boxShadow: "0 10px 22px rgba(255, 77, 109, 0.16)",
};
const messageText = {
  margin: "12px 0 0 0",
  padding: "13px 14px",
  fontSize: "14px",
  lineHeight: "1.5",
  fontWeight: "650",
  color: "#eaf2ff",
  background: "rgba(15, 35, 76, 0.74)",
  borderRadius: "18px",
  border: "1px solid rgba(147, 197, 253, 0.18)",
  boxShadow: "0 10px 26px rgba(2, 8, 23, 0.25)",
  wordBreak: "break-word",
};
const statsLine = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "8px",
  fontSize: "12px",
  fontWeight: "900",
  color: "#9cc8ff",
  marginTop: "10px",
};
const commentMainBtn = {
  width: "100%",
  border: "1px solid rgba(147, 197, 253, 0.20)",
  borderRadius: "999px",
  background: "rgba(15, 35, 76, 0.72)",
  color: "#bfdbfe",
  padding: "11px 14px",
  fontSize: "13px",
  fontWeight: "800",
  textAlign: "left",
  cursor: "pointer",
  marginTop: "10px",
  boxShadow: "0 8px 18px rgba(2, 8, 23, 0.18)",
};
const commentOverlay = {
  position: "fixed",
  left: "50%",
  transform: "translateX(-50%)",
  right: "auto",
  bottom: 0,
  width: "100%",
  maxWidth: "430px",
  height: "70svh",
  zIndex: 10,
  background:
    "linear-gradient(180deg, rgba(7, 22, 51, 0.98), rgba(3, 12, 29, 0.98))",
  backdropFilter: "blur(25px)",
  WebkitBackdropFilter: "blur(25px)",
  borderTopLeftRadius: "24px",
  borderTopRightRadius: "24px",
  padding: "0 16px 16px 16px",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  borderTop: "1px solid rgba(147, 197, 253, 0.22)",
  boxShadow: "0 -20px 55px rgba(2, 8, 23, 0.58)",
};
const commentHandleBar = {
  width: "38px",
  height: "4px",
  background: "rgba(147, 197, 253, 0.38)",
  borderRadius: "999px",
  margin: "10px auto 14px auto",
  flexShrink: 0,
};
const commentHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  paddingBottom: "12px",
  borderBottom: "1px solid rgba(147, 197, 253, 0.14)",
  flexShrink: 0,
};
const commentTitle = {
  margin: 0,
  fontSize: "17px",
  fontWeight: "900",
  color: "#f8fbff",
};
const closeBtn = {
  border: "1px solid rgba(147, 197, 253, 0.18)",
  background: "rgba(15, 35, 76, 0.82)",
  color: "#eaf2ff",
  fontSize: "16px",
  cursor: "pointer",
  padding: "0",
  width: "34px",
  height: "34px",
  borderRadius: "50%",
};
const commentsListBox = {
  flex: 1,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  padding: "16px 0",
};
const commentItem = {
  display: "flex",
  flexDirection: "column",
  gap: "5px",
  padding: "12px",
  borderRadius: "17px",
  background: "rgba(15, 35, 76, 0.78)",
  border: "1px solid rgba(147, 197, 253, 0.16)",
  boxShadow: "0 10px 24px rgba(2, 8, 23, 0.22)",
};
const commentFrom = {
  fontSize: "12px",
  fontWeight: "900",
  color: "#7dd3fc",
};
const commentBody = {
  fontSize: "14px",
  lineHeight: "1.4",
  color: "#eaf2ff",
  wordBreak: "break-word",
};
const noComments = {
  textAlign: "center",
  color: "#9cc8ff",
  fontSize: "14px",
  marginTop: "32px",
};
const writeBox = {
  borderTop: "1px solid rgba(147, 197, 253, 0.14)",
  paddingTop: "12px",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  flexShrink: 0,
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
  border: "1px solid rgba(147, 197, 253, 0.22)",
  borderRadius: "13px",
  background: "rgba(2, 8, 23, 0.46)",
  color: "#f8fbff",
  outline: "none",
  padding: "10px 12px",
  fontSize: "13px",
};
const commentInputBottom = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid rgba(147, 197, 253, 0.22)",
  borderRadius: "999px",
  background: "rgba(2, 8, 23, 0.46)",
  color: "#f8fbff",
  outline: "none",
  padding: "11px 14px",
  fontSize: "14px",
};
const sendBtn = {
  border: "none",
  background: "linear-gradient(135deg, #38bdf8, #2563eb)",
  color: "#ffffff",
  fontWeight: "900",
  fontSize: "14px",
  cursor: "pointer",
  padding: "11px 16px",
  borderRadius: "999px",
  boxShadow: "0 10px 22px rgba(37, 99, 235, 0.36)",
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
  borderRadius: "14px",
};
const closeImageBtn = {
  position: "fixed",
  top: "max(16px, env(safe-area-inset-top))",
  right: "16px",
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(8, 25, 58, 0.72)",
  color: "#ffffff",
  fontSize: "20px",
  borderRadius: "50%",
  width: "40px",
  height: "40px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
