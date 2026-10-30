import type { DisasterSourceInput } from "@desh-monitor/db";

// Disaster sources are configuration, not secrets, so they live in code and
// are upserted on every run. Each must be free to use without a key, and its
// terms recorded here before it is added.

export const USGS_EARTHQUAKES_SLUG = "usgs-earthquakes-india-region";
export const EONET_EVENTS_SLUG = "nasa-eonet-india-region";

// The USGS earthquake catalogue (FDSN event service), queried with a
// rectangle around India and its neighbourhood. The rectangle is the query
// the provider is asked to answer — events inside it may be in neighbouring
// countries or the surrounding seas, and each keeps the provider's own
// place description rather than a country we infer.
export const SOURCES: DisasterSourceInput[] = [
  {
    slug: USGS_EARTHQUAKES_SLUG,
    name: "USGS earthquakes: India region",
    provider: "U.S. Geological Survey (Earthquake Hazards Program)",
    sourceType: "usgs-fdsn-geojson",
    url: "https://earthquake.usgs.gov/fdsnws/event/1/query",
    queryParams: {
      minLatitude: 6,
      maxLatitude: 38,
      minLongitude: 67,
      maxLongitude: 98,
      // Re-read everything the provider revised in this window each run;
      // revisions already stored are skipped as duplicates.
      lookbackHours: 24,
      limit: 2000,
    },
    license: "Public domain (U.S. Government work); free to use without an API key",
    attribution: "Earthquake data from the U.S. Geological Survey (earthquake.usgs.gov)",
    termsUrl: "https://www.usgs.gov/information-policies-and-instructions/crediting-usgs",
  },
  {
    slug: EONET_EVENTS_SLUG,
    name: "NASA EONET natural events: India region",
    provider: "NASA Earth Observatory Natural Event Tracker (EONET)",
    sourceType: "nasa-eonet-v3",
    url: "https://eonet.gsfc.nasa.gov/api/v3/events",
    queryParams: {
      minLatitude: 6,
      maxLatitude: 38,
      minLongitude: 67,
      maxLongitude: 98,
      lookbackDays: 30,
      limit: 500,
    },
    // EONET's pages state no licence text. NASA publishes it as an open,
    // keyless API; each event links to the agency it came from (JTWC,
    // GDACS, ...), which stays the originator and is kept in the payload.
    license: "NASA open API, no key; no licence text published on EONET's pages. Events originate from other agencies, named in each event's sources.",
    attribution: "Event data from NASA EONET (eonet.gsfc.nasa.gov), compiled from the source agencies named on each event",
    termsUrl: "https://eonet.gsfc.nasa.gov/",
  },
];
