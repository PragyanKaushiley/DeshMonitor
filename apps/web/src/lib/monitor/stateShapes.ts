// The state outlines the map already draws, looked up by state name so the
// signal detail can show a whole state. One fetch, shared by every caller.

const STATES = "/landing/globe/india-states.geojson";

type Ring = [number, number][];
interface StateFeature {
  properties: { name: string };
  geometry: { type: string; coordinates: unknown };
}

let loading: Promise<StateFeature[]> | null = null;
// Once the file has arrived, lookups can be answered at once.
let loaded: StateFeature[] | null = null;

function load(): Promise<StateFeature[]> {
  loading ??= fetch(STATES)
    .then((res) => res.json())
    .then((geo: { features: StateFeature[] }) => {
      loaded = geo.features;
      return geo.features;
    })
    .catch(() => {
      loading = null; // allow a retry next time
      return [];
    });
  return loading;
}

// DataMeet spells a few names with "&" and the picker uses "and"; the picker also
// says "Andaman & Nicobar Islands" where the shapes say "Andaman & Nicobar".
export const normStateName = (name: string) =>
  name
    .toLowerCase()
    .replace(/\s+and\s+/g, " & ")
    .replace(/\s+islands$/, "")
    .trim();
const norm = normStateName;

function ringsOf(features: StateFeature[], name: string): Ring[] {
  const feature = features.find((f) => norm(f.properties.name) === norm(name));
  if (!feature) return [];
  const { type, coordinates } = feature.geometry;
  if (type === "Polygon") return coordinates as Ring[];
  if (type === "MultiPolygon") return (coordinates as Ring[][]).flat();
  return [];
}

// Every ring of the state, as [lng, lat] pairs; empty if the state is unknown.
export async function stateRings(name: string): Promise<Ring[]> {
  return ringsOf(await load(), name);
}

// The same, if the shapes have already been fetched; null if not yet. Lets the
// map start zooming in the very step the state is picked, with no await.
export function stateRingsNow(name: string): Ring[] | null {
  return loaded ? ringsOf(loaded, name) : null;
}
