const EARTH_RADIUS_KM = 6371;

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export const BARRINHA_COORDINATES: Coordinates = { latitude: -21.193, longitude: -48.163 };

const cityCoordinates: Record<string, Coordinates> = {
  "barrinha-sp": BARRINHA_COORDINATES,
  "ribeirao preto-sp": { latitude: -21.1775, longitude: -47.8103 },
  "sertaozinho-sp": { latitude: -21.1378, longitude: -47.9904 },
  "jaboticabal-sp": { latitude: -21.252, longitude: -48.3252 },
  "pradopolis-sp": { latitude: -21.3594, longitude: -48.0656 },
  "dumont-sp": { latitude: -21.2324, longitude: -47.9756 },
  "cravinhos-sp": { latitude: -21.3396, longitude: -47.7296 },
  "pontal-sp": { latitude: -21.0225, longitude: -48.0372 },
  "pitangueiras-sp": { latitude: -21.0094, longitude: -48.2217 },
  "bebedouro-sp": { latitude: -20.9491, longitude: -48.4791 },
  "monte alto-sp": { latitude: -21.2614, longitude: -48.4974 },
  "taquaritinga-sp": { latitude: -21.4049, longitude: -48.5103 },
  "araraquara-sp": { latitude: -21.7845, longitude: -48.178 },
  "matao-sp": { latitude: -21.6025, longitude: -48.3658 },
  "batatais-sp": { latitude: -20.8919, longitude: -47.5851 },
  "franca-sp": { latitude: -20.5386, longitude: -47.4009 },
};

function normalizePlace(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function haversineDistance(from: Coordinates, to: Coordinates) {
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return Math.round(EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function distanceFromBarrinha(city: string, state: string) {
  const destination = cityCoordinates[`${normalizePlace(city)}-${normalizePlace(state)}`];
  return destination ? haversineDistance(BARRINHA_COORDINATES, destination) : null;
}

export function distancePriority(distanceKm: number | null) {
  if (distanceKm === null) return "nacional";
  if (distanceKm <= 50) return "maxima";
  if (distanceKm <= 100) return "alta";
  if (distanceKm <= 200) return "media";
  return "nacional";
}
