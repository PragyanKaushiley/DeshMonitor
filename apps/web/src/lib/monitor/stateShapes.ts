// The state outlines the map already draws, looked up by state name so the
// signal detail can show a whole state. One fetch, shared by every caller.

const STATES = "/landing/globe/india-states.geojson";

type Ring = [number, number][];
interface StateFeature {
  properties: { name: string };
  geometry: { type: string; coordinates: unknown };
}

let loading: Promise<StateFeature[]> | null = null;

function load(): Promise<StateFeature[]> {
  loading ??= fetch(STATES)
    .then((res) => res.json())
    .then((geo: { features: StateFeature[] }) => geo.features)
    .catch(() => {
      loading = null; // allow a retry next time
      return [];
    });
  return loading;
}

// DataMeet spells a few names with "&"; the sample data may use "and".
const norm = (name: string) => name.toLowerCase().replace(/\s+and\s+/g, " & ").trim();

// Every ring of the state, as [lng, lat] pairs; empty if the state is unknown.
export async function stateRings(name: string): Promise<Ring[]> {
  const features = await load();
  const feature = features.find((f) => norm(f.properties.name) === norm(name));
  if (!feature) return [];
  const { type, coordinates } = feature.geometry;
  if (type === "Polygon") return coordinates as Ring[];
  if (type === "MultiPolygon") return (coordinates as Ring[][]).flat();
  return [];
}
