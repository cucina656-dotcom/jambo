const API_URL = "https://kitchenbrain.cucina656.workers.dev";

function getFlag(number = "") {
  const countryMap = {
    "+250": "🇷🇼", // Rwanda
    "+254": "🇰🇪", // Kenya
    "+256": "🇺🇬", // Uganda
    "+255": "🇹🇿", // Tanzania
    "+257": "🇧🇮", // Burundi
    "+243": "🇨🇩", // DR Congo
    "+1": "🇺🇸", // USA
    "+44": "🇬🇧", // UK
    "+91": "🇮🇳", // India
    "+86": "🇨🇳", // China
    "+81": "🇯🇵", // Japan
    "+49": "🇩🇪", // Germany
    "+33": "🇫🇷", // France
    "+39": "🇮🇹", // Italy
    "+61": "🇦🇺", // Australia
    "+55": "🇧🇷", // Brazil
    "+7": "🇷🇺", // Russia
    "+82": "🇰🇷", // South Korea
    "+34": "🇪🇸", // Spain
    "+52": "🇲🇽", // Mexico
    "+31": "🇳🇱", // Netherlands
    "+32": "🇧🇪", // Belgium
    "+41": "🇨🇭", // Switzerland
    "+46": "🇸🇪", // Sweden
    "+47": "🇳🇴", // Norway
    "+45": "🇩🇰", // Denmark
    "+358": "🇫🇮", // Finland
    "+353": "🇮🇪", // Ireland
    "+351": "🇵🇹", // Portugal
    "+30": "🇬🇷", // Greece
    "+90": "🇹🇷", // Turkey
    "+20": "🇪🇬", // Egypt
    "+27": "🇿🇦", // South Africa
    "+234": "🇳🇬", // Nigeria
    "+233": "🇬🇭", // Ghana
    "+254": "🇰🇪", // Kenya (already listed)
    "+256": "🇺🇬", // Uganda (already listed)
    "+92": "🇵🇰", // Pakistan
    "+880": "🇧🇩", // Bangladesh
    "+84": "🇻🇳", // Vietnam
    "+62": "🇮🇩", // Indonesia
    "+63": "🇵🇭", // Philippines
    "+66": "🇹🇭", // Thailand
    "+60": "🇲🇾", // Malaysia
    "+65": "🇸🇬", // Singapore
    "+971": "🇦🇪", // UAE
    "+966": "🇸🇦", // Saudi Arabia
    "+972": "🇮🇱", // Israel
    "+964": "🇮🇶", // Iraq
    "+98": "🇮🇷", // Iran
    "+93": "🇦🇫", // Afghanistan
    "+94": "🇱🇰", // Sri Lanka
    "+977": "🇳🇵", // Nepal
    "+95": "🇲🇲", // Myanmar
    "+855": "🇰🇭", // Cambodia
    "+856": "🇱🇦", // Laos
    "+960": "🇲🇻", // Maldives
    "+961": "🇱🇧", // Lebanon
    "+962": "🇯🇴", // Jordan
    "+963": "🇸🇾", // Syria
    "+965": "🇰🇼", // Kuwait
    "+968": "🇴🇲", // Oman
    "+973": "🇧🇭", // Bahrain
    "+974": "🇶🇦", // Qatar
    "+975": "🇧🇹", // Bhutan
    "+976": "🇲🇳", // Mongolia
    "+996": "🇰🇬", // Kyrgyzstan
    "+998": "🇺🇿", // Uzbekistan
    "+992": "🇹🇯", // Tajikistan
    "+993": "🇹🇲", // Turkmenistan
    "+994": "🇦🇿", // Azerbaijan
    "+995": "🇬🇪", // Georgia
    "+374": "🇦🇲", // Armenia
    "+373": "🇲🇩", // Moldova
    "+370": "🇱🇹", // Lithuania
    "+371": "🇱🇻", // Latvia
    "+372": "🇪🇪", // Estonia
    "+375": "🇧🇾", // Belarus
    "+380": "🇺🇦", // Ukraine
    "+381": "🇷🇸", // Serbia
    "+382": "🇲🇪", // Montenegro
    "+385": "🇭🇷", // Croatia
    "+386": "🇸🇮", // Slovenia
    "+387": "🇧🇦", // Bosnia and Herzegovina
    "+389": "🇲🇰", // North Macedonia
    "+420": "🇨🇿", // Czech Republic
    "+421": "🇸🇰", // Slovakia
    "+36": "🇭🇺", // Hungary
    "+40": "🇷🇴", // Romania
    "+48": "🇵🇱", // Poland
    "+359": "🇧🇬", // Bulgaria
    "+355": "🇦🇱", // Albania
    "+356": "🇲🇹", // Malta
    "+357": "🇨🇾", // Cyprus
    "+350": "🇬🇮", // Gibraltar
    "+352": "🇱🇺", // Luxembourg
    "+43": "🇦🇹", // Austria
    "+376": "🇦🇩", // Andorra
    "+377": "🇲🇨", // Monaco
    "+378": "🇸🇲", // San Marino
    "+379": "🇻🇦", // Vatican City
    "+51": "🇵🇪", // Peru
    "+53": "🇨🇺", // Cuba
    "+54": "🇦🇷", // Argentina
    "+56": "🇨🇱", // Chile
    "+57": "🇨🇴", // Colombia
    "+58": "🇻🇪", // Venezuela
    "+591": "🇧🇴", // Bolivia
    "+592": "🇬🇾", // Guyana
    "+593": "🇪🇨", // Ecuador
    "+595": "🇵🇾", // Paraguay
    "+598": "🇺🇾", // Uruguay
    "+507": "🇵🇦", // Panama
    "+506": "🇨🇷", // Costa Rica
    "+505": "🇳🇮", // Nicaragua
    "+504": "🇭🇳", // Honduras
    "+503": "🇸🇻", // El Salvador
    "+502": "🇬🇹", // Guatemala
    "+501": "🇧🇿", // Belize
    "+509": "🇭🇹", // Haiti
    "+809": "🇩🇴", // Dominican Republic
    "+876": "🇯🇲", // Jamaica
    "+868": "🇹🇹", // Trinidad and Tobago
    "+784": "🇻🇨", // Saint Vincent
    "+767": "🇩🇲", // Dominica
    "+758": "🇱🇨", // Saint Lucia
    "+473": "🇬🇩", // Grenada
    "+268": "🇸🇿", // Eswatini
    "+267": "🇧🇼", // Botswana
    "+266": "🇱🇸", // Lesotho
    "+265": "🇲🇼", // Malawi
    "+264": "🇳🇦", // Namibia
    "+263": "🇿🇼", // Zimbabwe
    "+260": "🇿🇲", // Zambia
    "+258": "🇲🇿", // Mozambique
    "+261": "🇲🇬", // Madagascar
    "+262": "🇷🇪", // Réunion
    "+269": "🇰🇲", // Comoros
    "+248": "🇸🇨", // Seychelles
    "+230": "🇲🇺", // Mauritius
    "+253": "🇩🇯", // Djibouti
    "+252": "🇸🇴", // Somalia
    "+251": "🇪🇹", // Ethiopia
    "+249": "🇸🇩", // Sudan
    "+211": "🇸🇸", // South Sudan
    "+212": "🇲🇦", // Morocco
    "+213": "🇩🇿", // Algeria
    "+216": "🇹🇳", // Tunisia
    "+218": "🇱🇾", // Libya
    "+220": "🇬🇲", // Gambia
    "+221": "🇸🇳", // Senegal
    "+222": "🇲🇷", // Mauritania
    "+223": "🇲🇱", // Mali
    "+224": "🇬🇳", // Guinea
    "+225": "🇨🇮", // Ivory Coast
    "+226": "🇧🇫", // Burkina Faso
    "+227": "🇳🇪", // Niger
    "+228": "🇹🇬", // Togo
    "+229": "🇧🇯", // Benin
    "+231": "🇱🇷", // Liberia
    "+232": "🇸🇱", // Sierra Leone
    "+235": "🇹🇩", // Chad
    "+236": "🇨🇫", // Central African Republic
    "+237": "🇨🇲", // Cameroon
    "+238": "🇨🇻", // Cape Verde
    "+239": "🇸🇹", // São Tomé and Príncipe
    "+240": "🇬🇶", // Equatorial Guinea
    "+241": "🇬🇦", // Gabon
    "+242": "🇨🇬", // Republic of the Congo
    "+244": "🇦🇴", // Angola
    "+245": "🇬🇼", // Guinea-Bissau
    "+290": "🇸🇭", // Saint Helena
    "+291": "🇪🇷", // Eritrea
    "+297": "🇦🇼", // Aruba
    "+298": "🇫🇴", // Faroe Islands
    "+299": "🇬🇱", // Greenland
    "+500": "🇫🇰", // Falkland Islands
    "+590": "🇬🇵", // Guadeloupe
    "+594": "🇬🇫", // French Guiana
    "+596": "🇲🇶", // Martinique
    "+597": "🇸🇷", // Suriname
    "+599": "🇨🇼", // Curaçao
    "+670": "🇹🇱", // Timor-Leste
    "+672": "🇦🇶", // Antarctica
    "+673": "🇧🇳", // Brunei
    "+674": "🇳🇷", // Nauru
    "+675": "🇵🇬", // Papua New Guinea
    "+676": "🇹🇴", // Tonga
    "+677": "🇸🇧", // Solomon Islands
    "+678": "🇻🇺", // Vanuatu
    "+679": "🇫🇯", // Fiji
    "+680": "🇵🇼", // Palau
    "+681": "🇼🇫", // Wallis and Futuna
    "+682": "🇨🇰", // Cook Islands
    "+683": "🇳🇺", // Niue
    "+685": "🇼🇸", // Samoa
    "+686": "🇰🇮", // Kiribati
    "+687": "🇳🇨", // New Caledonia
    "+688": "🇹🇻", // Tuvalu
    "+689": "🇵🇫", // French Polynesia
    "+690": "🇹🇰", // Tokelau
    "+691": "🇫🇲", // Micronesia
    "+692": "🇲🇭", // Marshall Islands
    "+850": "🇰🇵", // North Korea
    "+852": "🇭🇰", // Hong Kong
    "+853": "🇲🇴", // Macau
    "+886": "🇹🇼", // Taiwan
    "+967": "🇾🇪", // Yemen
    "+970": "🇵🇸" // Palestine
  };

  for (const [code, flag] of Object.entries(countryMap)) {
    if (number.startsWith(code)) return flag;
  }
  return "🌍";
}

function maskWhatsapp(number = "") {
  const last2 = number.slice(-2);
  return `**${last2}`;
}

function MediaComments({ mediaId }) {
  const [comments, setComments] = React.useState([]);

  React.useEffect(() => {
    loadComments();
  }, [mediaId]);

  async function loadComments() {
    try {
      const res = await fetch(
        `${API_URL}/api/media-comments?media_id=${mediaId}`
      );
      const data = await res.json();
      if (data.success) {
        setComments(data.comments);
      }
    } catch (err) {
      console.error(err);
    }
  }

  if (comments.length === 0) {
    return null;
  }

  return (
    <div>
      {comments.map((comment, index) => (
        <div key={index}>
          {/* Your comment rendering logic here */}
        </div>
      ))}
    </div>
  );
}