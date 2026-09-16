// Tier-2 geo-tagging data: state/UT name plus major-city keywords, scanned
// against story title+description in geotag.ts. This is a heuristic keyword
// list, not an exhaustive gazetteer — built independently from general
// knowledge of each state/UT's own name and its most-recognizable cities,
// not derived from or copied against any prior version of this file.
// Insertion order below (states first in the same order as shared-types'
// STATES tuple, then union territories) is what "first match wins" uses
// when a story could plausibly reference more than one state — an
// unavoidable heuristic tradeoff (data-sourcing-standards guideline: this
// is disclosed as approximate, not asserted as exact).
//
// All keywords are lowercase; matching is a case-insensitive substring
// check (see geotag.ts), so keep entries specific enough to avoid firing
// on unrelated words with a generic city/state name embedded in them.

import type { State } from "@deshmonitor/shared-types";

export const STATE_KEYWORDS: Record<State, readonly string[]> = {
  "Andhra Pradesh": ["andhra pradesh", "visakhapatnam", "vizag", "vijayawada", "guntur", "tirupati", "nellore", "kurnool", "kadapa", "rajahmundry", "amaravati"],
  "Arunachal Pradesh": ["arunachal pradesh", "itanagar", "tawang", "pasighat", "ziro"],
  "Assam": ["assam", "guwahati", "dibrugarh", "silchar", "jorhat", "tezpur", "kaziranga"],
  "Bihar": ["bihar", "patna", "gaya", "bhagalpur", "muzaffarpur", "darbhanga", "purnia"],
  "Chhattisgarh": ["chhattisgarh", "raipur", "bhilai", "bilaspur chhattisgarh", "durg", "korba"],
  "Goa": ["goa", "panaji", "margao", "vasco da gama", "mapusa"],
  "Gujarat": ["gujarat", "ahmedabad", "surat", "vadodara", "rajkot", "gandhinagar", "bhavnagar", "jamnagar"],
  "Haryana": ["haryana", "gurugram", "gurgaon", "faridabad", "panipat", "ambala", "hisar", "karnal", "rohtak"],
  "Himachal Pradesh": ["himachal pradesh", "shimla", "manali", "dharamshala", "kullu", "solan"],
  "Jharkhand": ["jharkhand", "ranchi", "jamshedpur", "dhanbad", "bokaro", "hazaribagh"],
  "Karnataka": ["karnataka", "bengaluru", "bangalore", "mysuru", "mysore", "mangaluru", "mangalore", "hubballi", "hubli", "belagavi", "belgaum"],
  "Kerala": ["kerala", "thiruvananthapuram", "kochi", "cochin", "kozhikode", "calicut", "thrissur", "kollam", "kannur"],
  "Madhya Pradesh": ["madhya pradesh", "bhopal", "indore", "gwalior", "jabalpur", "ujjain"],
  "Maharashtra": ["maharashtra", "mumbai", "pune", "nagpur", "nashik", "thane", "aurangabad maharashtra", "solapur"],
  "Manipur": ["manipur", "imphal"],
  "Meghalaya": ["meghalaya", "shillong"],
  "Mizoram": ["mizoram", "aizawl"],
  "Nagaland": ["nagaland", "kohima", "dimapur"],
  "Odisha": ["odisha", "orissa", "bhubaneswar", "cuttack", "rourkela", "puri odisha", "konark"],
  "Punjab": ["punjab", "ludhiana", "amritsar", "jalandhar", "patiala", "bathinda"],
  "Rajasthan": ["rajasthan", "jaipur", "jodhpur", "udaipur", "kota rajasthan", "ajmer", "bikaner"],
  "Sikkim": ["sikkim", "gangtok"],
  "Tamil Nadu": ["tamil nadu", "chennai", "coimbatore", "madurai", "tiruchirapalli", "trichy", "salem tamil nadu", "tirunelveli", "vellore"],
  "Telangana": ["telangana", "hyderabad", "warangal", "nizamabad", "karimnagar"],
  "Tripura": ["tripura", "agartala"],
  "Uttar Pradesh": ["uttar pradesh", "lucknow", "kanpur", "noida", "ghaziabad", "agra", "varanasi", "prayagraj", "allahabad", "meerut", "bareilly", "gorakhpur", "ayodhya", "mathura"],
  "Uttarakhand": ["uttarakhand", "dehradun", "haridwar", "rishikesh", "nainital", "haldwani"],
  "West Bengal": ["west bengal", "kolkata", "calcutta", "howrah", "siliguri", "durgapur west bengal", "asansol"],
  "Andaman and Nicobar Islands": ["andaman", "nicobar", "port blair"],
  "Chandigarh": ["chandigarh"],
  "Dadra and Nagar Haveli and Daman and Diu": ["dadra", "nagar haveli", "daman", "diu", "silvassa"],
  "Delhi": ["delhi", "new delhi"],
  "Jammu and Kashmir": ["jammu and kashmir", "jammu", "kashmir", "srinagar"],
  "Ladakh": ["ladakh", "leh", "kargil"],
  "Lakshadweep": ["lakshadweep", "kavaratti"],
  "Puducherry": ["puducherry", "pondicherry", "karaikal", "mahe", "yanam"],
};
