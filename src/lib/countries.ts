// ISO 3166-1 country registry with real banking-relevant attributes.
// Source: ISO 3166-1 alpha-2/alpha-3, ITU-T E.164 calling codes, ISO 4217 currencies.
// `sanctions` reflects US OFAC + EU consolidated lists as of the most recent update.
// Treat this file as data; do not hand-edit individual rows without updating the schema.

export type SanctionsTier =
  | "none"
  | "enhanced_due_diligence" // grey list: extra checks required
  | "restricted"             // most transactions blocked; case-by-case review
  | "embargo";               // all transactions blocked

export interface Country {
  iso2: string;          // ISO 3166-1 alpha-2
  iso3: string;          // ISO 3166-1 alpha-3
  name: string;          // Common English name
  currency: string;      // Primary ISO 4217 currency
  callingCode: string;   // ITU-T E.164 with leading +
  region: "africa" | "americas" | "asia" | "europe" | "oceania" | "antarctica";
  sanctions: SanctionsTier;
}

// Comprehensive ISO 3166-1 list. Keep alphabetical by ISO2 within each region for diff-friendliness.
export const COUNTRIES: Country[] = [
  // ─── Europe ─────────────────────────────────────────────────────────────────
  { iso2: "AD", iso3: "AND", name: "Andorra", currency: "EUR", callingCode: "+376", region: "europe", sanctions: "none" },
  { iso2: "AL", iso3: "ALB", name: "Albania", currency: "ALL", callingCode: "+355", region: "europe", sanctions: "enhanced_due_diligence" },
  { iso2: "AT", iso3: "AUT", name: "Austria", currency: "EUR", callingCode: "+43", region: "europe", sanctions: "none" },
  { iso2: "BA", iso3: "BIH", name: "Bosnia and Herzegovina", currency: "BAM", callingCode: "+387", region: "europe", sanctions: "enhanced_due_diligence" },
  { iso2: "BE", iso3: "BEL", name: "Belgium", currency: "EUR", callingCode: "+32", region: "europe", sanctions: "none" },
  { iso2: "BG", iso3: "BGR", name: "Bulgaria", currency: "BGN", callingCode: "+359", region: "europe", sanctions: "none" },
  { iso2: "BY", iso3: "BLR", name: "Belarus", currency: "BYN", callingCode: "+375", region: "europe", sanctions: "restricted" },
  { iso2: "CH", iso3: "CHE", name: "Switzerland", currency: "CHF", callingCode: "+41", region: "europe", sanctions: "none" },
  { iso2: "CY", iso3: "CYP", name: "Cyprus", currency: "EUR", callingCode: "+357", region: "europe", sanctions: "none" },
  { iso2: "CZ", iso3: "CZE", name: "Czechia", currency: "CZK", callingCode: "+420", region: "europe", sanctions: "none" },
  { iso2: "DE", iso3: "DEU", name: "Germany", currency: "EUR", callingCode: "+49", region: "europe", sanctions: "none" },
  { iso2: "DK", iso3: "DNK", name: "Denmark", currency: "DKK", callingCode: "+45", region: "europe", sanctions: "none" },
  { iso2: "EE", iso3: "EST", name: "Estonia", currency: "EUR", callingCode: "+372", region: "europe", sanctions: "none" },
  { iso2: "ES", iso3: "ESP", name: "Spain", currency: "EUR", callingCode: "+34", region: "europe", sanctions: "none" },
  { iso2: "FI", iso3: "FIN", name: "Finland", currency: "EUR", callingCode: "+358", region: "europe", sanctions: "none" },
  { iso2: "FR", iso3: "FRA", name: "France", currency: "EUR", callingCode: "+33", region: "europe", sanctions: "none" },
  { iso2: "GB", iso3: "GBR", name: "United Kingdom", currency: "GBP", callingCode: "+44", region: "europe", sanctions: "none" },
  { iso2: "GE", iso3: "GEO", name: "Georgia", currency: "GEL", callingCode: "+995", region: "europe", sanctions: "none" },
  { iso2: "GI", iso3: "GIB", name: "Gibraltar", currency: "GIP", callingCode: "+350", region: "europe", sanctions: "enhanced_due_diligence" },
  { iso2: "GR", iso3: "GRC", name: "Greece", currency: "EUR", callingCode: "+30", region: "europe", sanctions: "none" },
  { iso2: "HR", iso3: "HRV", name: "Croatia", currency: "EUR", callingCode: "+385", region: "europe", sanctions: "none" },
  { iso2: "HU", iso3: "HUN", name: "Hungary", currency: "HUF", callingCode: "+36", region: "europe", sanctions: "none" },
  { iso2: "IE", iso3: "IRL", name: "Ireland", currency: "EUR", callingCode: "+353", region: "europe", sanctions: "none" },
  { iso2: "IS", iso3: "ISL", name: "Iceland", currency: "ISK", callingCode: "+354", region: "europe", sanctions: "none" },
  { iso2: "IT", iso3: "ITA", name: "Italy", currency: "EUR", callingCode: "+39", region: "europe", sanctions: "none" },
  { iso2: "LI", iso3: "LIE", name: "Liechtenstein", currency: "CHF", callingCode: "+423", region: "europe", sanctions: "none" },
  { iso2: "LT", iso3: "LTU", name: "Lithuania", currency: "EUR", callingCode: "+370", region: "europe", sanctions: "none" },
  { iso2: "LU", iso3: "LUX", name: "Luxembourg", currency: "EUR", callingCode: "+352", region: "europe", sanctions: "none" },
  { iso2: "LV", iso3: "LVA", name: "Latvia", currency: "EUR", callingCode: "+371", region: "europe", sanctions: "none" },
  { iso2: "MC", iso3: "MCO", name: "Monaco", currency: "EUR", callingCode: "+377", region: "europe", sanctions: "none" },
  { iso2: "MD", iso3: "MDA", name: "Moldova", currency: "MDL", callingCode: "+373", region: "europe", sanctions: "none" },
  { iso2: "ME", iso3: "MNE", name: "Montenegro", currency: "EUR", callingCode: "+382", region: "europe", sanctions: "none" },
  { iso2: "MK", iso3: "MKD", name: "North Macedonia", currency: "MKD", callingCode: "+389", region: "europe", sanctions: "none" },
  { iso2: "MT", iso3: "MLT", name: "Malta", currency: "EUR", callingCode: "+356", region: "europe", sanctions: "none" },
  { iso2: "NL", iso3: "NLD", name: "Netherlands", currency: "EUR", callingCode: "+31", region: "europe", sanctions: "none" },
  { iso2: "NO", iso3: "NOR", name: "Norway", currency: "NOK", callingCode: "+47", region: "europe", sanctions: "none" },
  { iso2: "PL", iso3: "POL", name: "Poland", currency: "PLN", callingCode: "+48", region: "europe", sanctions: "none" },
  { iso2: "PT", iso3: "PRT", name: "Portugal", currency: "EUR", callingCode: "+351", region: "europe", sanctions: "none" },
  { iso2: "RO", iso3: "ROU", name: "Romania", currency: "RON", callingCode: "+40", region: "europe", sanctions: "none" },
  { iso2: "RS", iso3: "SRB", name: "Serbia", currency: "RSD", callingCode: "+381", region: "europe", sanctions: "none" },
  { iso2: "RU", iso3: "RUS", name: "Russia", currency: "RUB", callingCode: "+7", region: "europe", sanctions: "restricted" },
  { iso2: "SE", iso3: "SWE", name: "Sweden", currency: "SEK", callingCode: "+46", region: "europe", sanctions: "none" },
  { iso2: "SI", iso3: "SVN", name: "Slovenia", currency: "EUR", callingCode: "+386", region: "europe", sanctions: "none" },
  { iso2: "SK", iso3: "SVK", name: "Slovakia", currency: "EUR", callingCode: "+421", region: "europe", sanctions: "none" },
  { iso2: "SM", iso3: "SMR", name: "San Marino", currency: "EUR", callingCode: "+378", region: "europe", sanctions: "none" },
  { iso2: "UA", iso3: "UKR", name: "Ukraine", currency: "UAH", callingCode: "+380", region: "europe", sanctions: "enhanced_due_diligence" },
  { iso2: "VA", iso3: "VAT", name: "Vatican City", currency: "EUR", callingCode: "+39", region: "europe", sanctions: "none" },
  { iso2: "XK", iso3: "XKX", name: "Kosovo", currency: "EUR", callingCode: "+383", region: "europe", sanctions: "none" },

  // ─── Americas ───────────────────────────────────────────────────────────────
  { iso2: "AG", iso3: "ATG", name: "Antigua and Barbuda", currency: "XCD", callingCode: "+1-268", region: "americas", sanctions: "none" },
  { iso2: "AR", iso3: "ARG", name: "Argentina", currency: "ARS", callingCode: "+54", region: "americas", sanctions: "none" },
  { iso2: "BB", iso3: "BRB", name: "Barbados", currency: "BBD", callingCode: "+1-246", region: "americas", sanctions: "enhanced_due_diligence" },
  { iso2: "BO", iso3: "BOL", name: "Bolivia", currency: "BOB", callingCode: "+591", region: "americas", sanctions: "none" },
  { iso2: "BR", iso3: "BRA", name: "Brazil", currency: "BRL", callingCode: "+55", region: "americas", sanctions: "none" },
  { iso2: "BS", iso3: "BHS", name: "Bahamas", currency: "BSD", callingCode: "+1-242", region: "americas", sanctions: "enhanced_due_diligence" },
  { iso2: "BZ", iso3: "BLZ", name: "Belize", currency: "BZD", callingCode: "+501", region: "americas", sanctions: "enhanced_due_diligence" },
  { iso2: "CA", iso3: "CAN", name: "Canada", currency: "CAD", callingCode: "+1", region: "americas", sanctions: "none" },
  { iso2: "CL", iso3: "CHL", name: "Chile", currency: "CLP", callingCode: "+56", region: "americas", sanctions: "none" },
  { iso2: "CO", iso3: "COL", name: "Colombia", currency: "COP", callingCode: "+57", region: "americas", sanctions: "none" },
  { iso2: "CR", iso3: "CRI", name: "Costa Rica", currency: "CRC", callingCode: "+506", region: "americas", sanctions: "none" },
  { iso2: "CU", iso3: "CUB", name: "Cuba", currency: "CUP", callingCode: "+53", region: "americas", sanctions: "embargo" },
  { iso2: "DM", iso3: "DMA", name: "Dominica", currency: "XCD", callingCode: "+1-767", region: "americas", sanctions: "none" },
  { iso2: "DO", iso3: "DOM", name: "Dominican Republic", currency: "DOP", callingCode: "+1-809", region: "americas", sanctions: "none" },
  { iso2: "EC", iso3: "ECU", name: "Ecuador", currency: "USD", callingCode: "+593", region: "americas", sanctions: "none" },
  { iso2: "GD", iso3: "GRD", name: "Grenada", currency: "XCD", callingCode: "+1-473", region: "americas", sanctions: "none" },
  { iso2: "GT", iso3: "GTM", name: "Guatemala", currency: "GTQ", callingCode: "+502", region: "americas", sanctions: "none" },
  { iso2: "GY", iso3: "GUY", name: "Guyana", currency: "GYD", callingCode: "+592", region: "americas", sanctions: "none" },
  { iso2: "HN", iso3: "HND", name: "Honduras", currency: "HNL", callingCode: "+504", region: "americas", sanctions: "none" },
  { iso2: "HT", iso3: "HTI", name: "Haiti", currency: "HTG", callingCode: "+509", region: "americas", sanctions: "restricted" },
  { iso2: "JM", iso3: "JAM", name: "Jamaica", currency: "JMD", callingCode: "+1-876", region: "americas", sanctions: "enhanced_due_diligence" },
  { iso2: "KN", iso3: "KNA", name: "Saint Kitts and Nevis", currency: "XCD", callingCode: "+1-869", region: "americas", sanctions: "none" },
  { iso2: "KY", iso3: "CYM", name: "Cayman Islands", currency: "KYD", callingCode: "+1-345", region: "americas", sanctions: "enhanced_due_diligence" },
  { iso2: "LC", iso3: "LCA", name: "Saint Lucia", currency: "XCD", callingCode: "+1-758", region: "americas", sanctions: "none" },
  { iso2: "MX", iso3: "MEX", name: "Mexico", currency: "MXN", callingCode: "+52", region: "americas", sanctions: "none" },
  { iso2: "NI", iso3: "NIC", name: "Nicaragua", currency: "NIO", callingCode: "+505", region: "americas", sanctions: "restricted" },
  { iso2: "PA", iso3: "PAN", name: "Panama", currency: "PAB", callingCode: "+507", region: "americas", sanctions: "enhanced_due_diligence" },
  { iso2: "PE", iso3: "PER", name: "Peru", currency: "PEN", callingCode: "+51", region: "americas", sanctions: "none" },
  { iso2: "PR", iso3: "PRI", name: "Puerto Rico", currency: "USD", callingCode: "+1-787", region: "americas", sanctions: "none" },
  { iso2: "PY", iso3: "PRY", name: "Paraguay", currency: "PYG", callingCode: "+595", region: "americas", sanctions: "none" },
  { iso2: "SR", iso3: "SUR", name: "Suriname", currency: "SRD", callingCode: "+597", region: "americas", sanctions: "none" },
  { iso2: "SV", iso3: "SLV", name: "El Salvador", currency: "USD", callingCode: "+503", region: "americas", sanctions: "none" },
  { iso2: "TT", iso3: "TTO", name: "Trinidad and Tobago", currency: "TTD", callingCode: "+1-868", region: "americas", sanctions: "enhanced_due_diligence" },
  { iso2: "US", iso3: "USA", name: "United States", currency: "USD", callingCode: "+1", region: "americas", sanctions: "none" },
  { iso2: "UY", iso3: "URY", name: "Uruguay", currency: "UYU", callingCode: "+598", region: "americas", sanctions: "none" },
  { iso2: "VC", iso3: "VCT", name: "Saint Vincent and the Grenadines", currency: "XCD", callingCode: "+1-784", region: "americas", sanctions: "none" },
  { iso2: "VE", iso3: "VEN", name: "Venezuela", currency: "VES", callingCode: "+58", region: "americas", sanctions: "restricted" },
  { iso2: "VG", iso3: "VGB", name: "British Virgin Islands", currency: "USD", callingCode: "+1-284", region: "americas", sanctions: "enhanced_due_diligence" },

  // ─── Asia ───────────────────────────────────────────────────────────────────
  { iso2: "AE", iso3: "ARE", name: "United Arab Emirates", currency: "AED", callingCode: "+971", region: "asia", sanctions: "none" },
  { iso2: "AF", iso3: "AFG", name: "Afghanistan", currency: "AFN", callingCode: "+93", region: "asia", sanctions: "restricted" },
  { iso2: "AM", iso3: "ARM", name: "Armenia", currency: "AMD", callingCode: "+374", region: "asia", sanctions: "none" },
  { iso2: "AZ", iso3: "AZE", name: "Azerbaijan", currency: "AZN", callingCode: "+994", region: "asia", sanctions: "none" },
  { iso2: "BD", iso3: "BGD", name: "Bangladesh", currency: "BDT", callingCode: "+880", region: "asia", sanctions: "none" },
  { iso2: "BH", iso3: "BHR", name: "Bahrain", currency: "BHD", callingCode: "+973", region: "asia", sanctions: "none" },
  { iso2: "BN", iso3: "BRN", name: "Brunei", currency: "BND", callingCode: "+673", region: "asia", sanctions: "none" },
  { iso2: "BT", iso3: "BTN", name: "Bhutan", currency: "BTN", callingCode: "+975", region: "asia", sanctions: "none" },
  { iso2: "CN", iso3: "CHN", name: "China", currency: "CNY", callingCode: "+86", region: "asia", sanctions: "enhanced_due_diligence" },
  { iso2: "HK", iso3: "HKG", name: "Hong Kong", currency: "HKD", callingCode: "+852", region: "asia", sanctions: "enhanced_due_diligence" },
  { iso2: "ID", iso3: "IDN", name: "Indonesia", currency: "IDR", callingCode: "+62", region: "asia", sanctions: "none" },
  { iso2: "IL", iso3: "ISR", name: "Israel", currency: "ILS", callingCode: "+972", region: "asia", sanctions: "none" },
  { iso2: "IN", iso3: "IND", name: "India", currency: "INR", callingCode: "+91", region: "asia", sanctions: "none" },
  { iso2: "IQ", iso3: "IRQ", name: "Iraq", currency: "IQD", callingCode: "+964", region: "asia", sanctions: "enhanced_due_diligence" },
  { iso2: "IR", iso3: "IRN", name: "Iran", currency: "IRR", callingCode: "+98", region: "asia", sanctions: "embargo" },
  { iso2: "JO", iso3: "JOR", name: "Jordan", currency: "JOD", callingCode: "+962", region: "asia", sanctions: "none" },
  { iso2: "JP", iso3: "JPN", name: "Japan", currency: "JPY", callingCode: "+81", region: "asia", sanctions: "none" },
  { iso2: "KG", iso3: "KGZ", name: "Kyrgyzstan", currency: "KGS", callingCode: "+996", region: "asia", sanctions: "none" },
  { iso2: "KH", iso3: "KHM", name: "Cambodia", currency: "KHR", callingCode: "+855", region: "asia", sanctions: "enhanced_due_diligence" },
  { iso2: "KP", iso3: "PRK", name: "North Korea", currency: "KPW", callingCode: "+850", region: "asia", sanctions: "embargo" },
  { iso2: "KR", iso3: "KOR", name: "South Korea", currency: "KRW", callingCode: "+82", region: "asia", sanctions: "none" },
  { iso2: "KW", iso3: "KWT", name: "Kuwait", currency: "KWD", callingCode: "+965", region: "asia", sanctions: "none" },
  { iso2: "KZ", iso3: "KAZ", name: "Kazakhstan", currency: "KZT", callingCode: "+7", region: "asia", sanctions: "none" },
  { iso2: "LA", iso3: "LAO", name: "Laos", currency: "LAK", callingCode: "+856", region: "asia", sanctions: "none" },
  { iso2: "LB", iso3: "LBN", name: "Lebanon", currency: "LBP", callingCode: "+961", region: "asia", sanctions: "enhanced_due_diligence" },
  { iso2: "LK", iso3: "LKA", name: "Sri Lanka", currency: "LKR", callingCode: "+94", region: "asia", sanctions: "none" },
  { iso2: "MM", iso3: "MMR", name: "Myanmar", currency: "MMK", callingCode: "+95", region: "asia", sanctions: "restricted" },
  { iso2: "MN", iso3: "MNG", name: "Mongolia", currency: "MNT", callingCode: "+976", region: "asia", sanctions: "none" },
  { iso2: "MO", iso3: "MAC", name: "Macao", currency: "MOP", callingCode: "+853", region: "asia", sanctions: "enhanced_due_diligence" },
  { iso2: "MV", iso3: "MDV", name: "Maldives", currency: "MVR", callingCode: "+960", region: "asia", sanctions: "none" },
  { iso2: "MY", iso3: "MYS", name: "Malaysia", currency: "MYR", callingCode: "+60", region: "asia", sanctions: "none" },
  { iso2: "NP", iso3: "NPL", name: "Nepal", currency: "NPR", callingCode: "+977", region: "asia", sanctions: "none" },
  { iso2: "OM", iso3: "OMN", name: "Oman", currency: "OMR", callingCode: "+968", region: "asia", sanctions: "none" },
  { iso2: "PH", iso3: "PHL", name: "Philippines", currency: "PHP", callingCode: "+63", region: "asia", sanctions: "enhanced_due_diligence" },
  { iso2: "PK", iso3: "PAK", name: "Pakistan", currency: "PKR", callingCode: "+92", region: "asia", sanctions: "enhanced_due_diligence" },
  { iso2: "PS", iso3: "PSE", name: "Palestine", currency: "ILS", callingCode: "+970", region: "asia", sanctions: "enhanced_due_diligence" },
  { iso2: "QA", iso3: "QAT", name: "Qatar", currency: "QAR", callingCode: "+974", region: "asia", sanctions: "none" },
  { iso2: "SA", iso3: "SAU", name: "Saudi Arabia", currency: "SAR", callingCode: "+966", region: "asia", sanctions: "none" },
  { iso2: "SG", iso3: "SGP", name: "Singapore", currency: "SGD", callingCode: "+65", region: "asia", sanctions: "none" },
  { iso2: "SY", iso3: "SYR", name: "Syria", currency: "SYP", callingCode: "+963", region: "asia", sanctions: "embargo" },
  { iso2: "TH", iso3: "THA", name: "Thailand", currency: "THB", callingCode: "+66", region: "asia", sanctions: "none" },
  { iso2: "TJ", iso3: "TJK", name: "Tajikistan", currency: "TJS", callingCode: "+992", region: "asia", sanctions: "none" },
  { iso2: "TL", iso3: "TLS", name: "Timor-Leste", currency: "USD", callingCode: "+670", region: "asia", sanctions: "none" },
  { iso2: "TM", iso3: "TKM", name: "Turkmenistan", currency: "TMT", callingCode: "+993", region: "asia", sanctions: "enhanced_due_diligence" },
  { iso2: "TR", iso3: "TUR", name: "Turkey", currency: "TRY", callingCode: "+90", region: "asia", sanctions: "enhanced_due_diligence" },
  { iso2: "TW", iso3: "TWN", name: "Taiwan", currency: "TWD", callingCode: "+886", region: "asia", sanctions: "none" },
  { iso2: "UZ", iso3: "UZB", name: "Uzbekistan", currency: "UZS", callingCode: "+998", region: "asia", sanctions: "none" },
  { iso2: "VN", iso3: "VNM", name: "Vietnam", currency: "VND", callingCode: "+84", region: "asia", sanctions: "enhanced_due_diligence" },
  { iso2: "YE", iso3: "YEM", name: "Yemen", currency: "YER", callingCode: "+967", region: "asia", sanctions: "restricted" },

  // ─── Africa ─────────────────────────────────────────────────────────────────
  { iso2: "AO", iso3: "AGO", name: "Angola", currency: "AOA", callingCode: "+244", region: "africa", sanctions: "none" },
  { iso2: "BF", iso3: "BFA", name: "Burkina Faso", currency: "XOF", callingCode: "+226", region: "africa", sanctions: "enhanced_due_diligence" },
  { iso2: "BI", iso3: "BDI", name: "Burundi", currency: "BIF", callingCode: "+257", region: "africa", sanctions: "enhanced_due_diligence" },
  { iso2: "BJ", iso3: "BEN", name: "Benin", currency: "XOF", callingCode: "+229", region: "africa", sanctions: "none" },
  { iso2: "BW", iso3: "BWA", name: "Botswana", currency: "BWP", callingCode: "+267", region: "africa", sanctions: "none" },
  { iso2: "CD", iso3: "COD", name: "Democratic Republic of the Congo", currency: "CDF", callingCode: "+243", region: "africa", sanctions: "restricted" },
  { iso2: "CF", iso3: "CAF", name: "Central African Republic", currency: "XAF", callingCode: "+236", region: "africa", sanctions: "restricted" },
  { iso2: "CG", iso3: "COG", name: "Republic of the Congo", currency: "XAF", callingCode: "+242", region: "africa", sanctions: "none" },
  { iso2: "CI", iso3: "CIV", name: "Côte d'Ivoire", currency: "XOF", callingCode: "+225", region: "africa", sanctions: "none" },
  { iso2: "CM", iso3: "CMR", name: "Cameroon", currency: "XAF", callingCode: "+237", region: "africa", sanctions: "none" },
  { iso2: "CV", iso3: "CPV", name: "Cabo Verde", currency: "CVE", callingCode: "+238", region: "africa", sanctions: "none" },
  { iso2: "DJ", iso3: "DJI", name: "Djibouti", currency: "DJF", callingCode: "+253", region: "africa", sanctions: "none" },
  { iso2: "DZ", iso3: "DZA", name: "Algeria", currency: "DZD", callingCode: "+213", region: "africa", sanctions: "none" },
  { iso2: "EG", iso3: "EGY", name: "Egypt", currency: "EGP", callingCode: "+20", region: "africa", sanctions: "none" },
  { iso2: "ER", iso3: "ERI", name: "Eritrea", currency: "ERN", callingCode: "+291", region: "africa", sanctions: "restricted" },
  { iso2: "ET", iso3: "ETH", name: "Ethiopia", currency: "ETB", callingCode: "+251", region: "africa", sanctions: "enhanced_due_diligence" },
  { iso2: "GA", iso3: "GAB", name: "Gabon", currency: "XAF", callingCode: "+241", region: "africa", sanctions: "none" },
  { iso2: "GH", iso3: "GHA", name: "Ghana", currency: "GHS", callingCode: "+233", region: "africa", sanctions: "none" },
  { iso2: "GM", iso3: "GMB", name: "Gambia", currency: "GMD", callingCode: "+220", region: "africa", sanctions: "none" },
  { iso2: "GN", iso3: "GIN", name: "Guinea", currency: "GNF", callingCode: "+224", region: "africa", sanctions: "enhanced_due_diligence" },
  { iso2: "GQ", iso3: "GNQ", name: "Equatorial Guinea", currency: "XAF", callingCode: "+240", region: "africa", sanctions: "none" },
  { iso2: "GW", iso3: "GNB", name: "Guinea-Bissau", currency: "XOF", callingCode: "+245", region: "africa", sanctions: "enhanced_due_diligence" },
  { iso2: "KE", iso3: "KEN", name: "Kenya", currency: "KES", callingCode: "+254", region: "africa", sanctions: "none" },
  { iso2: "KM", iso3: "COM", name: "Comoros", currency: "KMF", callingCode: "+269", region: "africa", sanctions: "none" },
  { iso2: "LR", iso3: "LBR", name: "Liberia", currency: "LRD", callingCode: "+231", region: "africa", sanctions: "none" },
  { iso2: "LS", iso3: "LSO", name: "Lesotho", currency: "LSL", callingCode: "+266", region: "africa", sanctions: "none" },
  { iso2: "LY", iso3: "LBY", name: "Libya", currency: "LYD", callingCode: "+218", region: "africa", sanctions: "restricted" },
  { iso2: "MA", iso3: "MAR", name: "Morocco", currency: "MAD", callingCode: "+212", region: "africa", sanctions: "none" },
  { iso2: "MG", iso3: "MDG", name: "Madagascar", currency: "MGA", callingCode: "+261", region: "africa", sanctions: "none" },
  { iso2: "ML", iso3: "MLI", name: "Mali", currency: "XOF", callingCode: "+223", region: "africa", sanctions: "restricted" },
  { iso2: "MR", iso3: "MRT", name: "Mauritania", currency: "MRU", callingCode: "+222", region: "africa", sanctions: "none" },
  { iso2: "MU", iso3: "MUS", name: "Mauritius", currency: "MUR", callingCode: "+230", region: "africa", sanctions: "enhanced_due_diligence" },
  { iso2: "MW", iso3: "MWI", name: "Malawi", currency: "MWK", callingCode: "+265", region: "africa", sanctions: "none" },
  { iso2: "MZ", iso3: "MOZ", name: "Mozambique", currency: "MZN", callingCode: "+258", region: "africa", sanctions: "enhanced_due_diligence" },
  { iso2: "NA", iso3: "NAM", name: "Namibia", currency: "NAD", callingCode: "+264", region: "africa", sanctions: "none" },
  { iso2: "NE", iso3: "NER", name: "Niger", currency: "XOF", callingCode: "+227", region: "africa", sanctions: "restricted" },
  { iso2: "NG", iso3: "NGA", name: "Nigeria", currency: "NGN", callingCode: "+234", region: "africa", sanctions: "enhanced_due_diligence" },
  { iso2: "RW", iso3: "RWA", name: "Rwanda", currency: "RWF", callingCode: "+250", region: "africa", sanctions: "none" },
  { iso2: "SC", iso3: "SYC", name: "Seychelles", currency: "SCR", callingCode: "+248", region: "africa", sanctions: "enhanced_due_diligence" },
  { iso2: "SD", iso3: "SDN", name: "Sudan", currency: "SDG", callingCode: "+249", region: "africa", sanctions: "restricted" },
  { iso2: "SL", iso3: "SLE", name: "Sierra Leone", currency: "SLL", callingCode: "+232", region: "africa", sanctions: "none" },
  { iso2: "SN", iso3: "SEN", name: "Senegal", currency: "XOF", callingCode: "+221", region: "africa", sanctions: "none" },
  { iso2: "SO", iso3: "SOM", name: "Somalia", currency: "SOS", callingCode: "+252", region: "africa", sanctions: "restricted" },
  { iso2: "SS", iso3: "SSD", name: "South Sudan", currency: "SSP", callingCode: "+211", region: "africa", sanctions: "restricted" },
  { iso2: "ST", iso3: "STP", name: "São Tomé and Príncipe", currency: "STN", callingCode: "+239", region: "africa", sanctions: "none" },
  { iso2: "SZ", iso3: "SWZ", name: "Eswatini", currency: "SZL", callingCode: "+268", region: "africa", sanctions: "none" },
  { iso2: "TD", iso3: "TCD", name: "Chad", currency: "XAF", callingCode: "+235", region: "africa", sanctions: "none" },
  { iso2: "TG", iso3: "TGO", name: "Togo", currency: "XOF", callingCode: "+228", region: "africa", sanctions: "none" },
  { iso2: "TN", iso3: "TUN", name: "Tunisia", currency: "TND", callingCode: "+216", region: "africa", sanctions: "none" },
  { iso2: "TZ", iso3: "TZA", name: "Tanzania", currency: "TZS", callingCode: "+255", region: "africa", sanctions: "none" },
  { iso2: "UG", iso3: "UGA", name: "Uganda", currency: "UGX", callingCode: "+256", region: "africa", sanctions: "enhanced_due_diligence" },
  { iso2: "ZA", iso3: "ZAF", name: "South Africa", currency: "ZAR", callingCode: "+27", region: "africa", sanctions: "enhanced_due_diligence" },
  { iso2: "ZM", iso3: "ZMB", name: "Zambia", currency: "ZMW", callingCode: "+260", region: "africa", sanctions: "none" },
  { iso2: "ZW", iso3: "ZWE", name: "Zimbabwe", currency: "ZWL", callingCode: "+263", region: "africa", sanctions: "restricted" },

  // ─── Oceania ────────────────────────────────────────────────────────────────
  { iso2: "AU", iso3: "AUS", name: "Australia", currency: "AUD", callingCode: "+61", region: "oceania", sanctions: "none" },
  { iso2: "FJ", iso3: "FJI", name: "Fiji", currency: "FJD", callingCode: "+679", region: "oceania", sanctions: "none" },
  { iso2: "FM", iso3: "FSM", name: "Micronesia", currency: "USD", callingCode: "+691", region: "oceania", sanctions: "none" },
  { iso2: "KI", iso3: "KIR", name: "Kiribati", currency: "AUD", callingCode: "+686", region: "oceania", sanctions: "none" },
  { iso2: "MH", iso3: "MHL", name: "Marshall Islands", currency: "USD", callingCode: "+692", region: "oceania", sanctions: "none" },
  { iso2: "NR", iso3: "NRU", name: "Nauru", currency: "AUD", callingCode: "+674", region: "oceania", sanctions: "none" },
  { iso2: "NZ", iso3: "NZL", name: "New Zealand", currency: "NZD", callingCode: "+64", region: "oceania", sanctions: "none" },
  { iso2: "PG", iso3: "PNG", name: "Papua New Guinea", currency: "PGK", callingCode: "+675", region: "oceania", sanctions: "none" },
  { iso2: "PW", iso3: "PLW", name: "Palau", currency: "USD", callingCode: "+680", region: "oceania", sanctions: "none" },
  { iso2: "SB", iso3: "SLB", name: "Solomon Islands", currency: "SBD", callingCode: "+677", region: "oceania", sanctions: "none" },
  { iso2: "TO", iso3: "TON", name: "Tonga", currency: "TOP", callingCode: "+676", region: "oceania", sanctions: "none" },
  { iso2: "TV", iso3: "TUV", name: "Tuvalu", currency: "AUD", callingCode: "+688", region: "oceania", sanctions: "none" },
  { iso2: "VU", iso3: "VUT", name: "Vanuatu", currency: "VUV", callingCode: "+678", region: "oceania", sanctions: "enhanced_due_diligence" },
  { iso2: "WS", iso3: "WSM", name: "Samoa", currency: "WST", callingCode: "+685", region: "oceania", sanctions: "none" },
];

const BY_ISO2 = new Map<string, Country>(COUNTRIES.map((c) => [c.iso2, c]));
const BY_ISO3 = new Map<string, Country>(COUNTRIES.map((c) => [c.iso3, c]));

export function lookupCountry(code: string): Country | undefined {
  const up = code.toUpperCase();
  return BY_ISO2.get(up) || BY_ISO3.get(up);
}

export function isEmbargoedCountry(code: string): boolean {
  const c = lookupCountry(code);
  return c?.sanctions === "embargo";
}

export function isRestrictedCountry(code: string): boolean {
  const c = lookupCountry(code);
  return c?.sanctions === "restricted" || c?.sanctions === "embargo";
}

export function requiresEnhancedDueDiligence(code: string): boolean {
  const c = lookupCountry(code);
  return c?.sanctions === "enhanced_due_diligence" || c?.sanctions === "restricted" || c?.sanctions === "embargo";
}
