export type Weather = {
  temp: number;
  tempMax: number | null;
  tempMin: number | null;
  code: number;
  label: string;
  sunrise: string | null;
  sunset: string | null;
};

const CODES: Record<number, string> = {
  0: "صحو",
  1: "صحو غالباً",
  2: "غيوم جزئية",
  3: "غائم",
  45: "ضباب",
  48: "ضباب متجمد",
  51: "رذاذ خفيف",
  53: "رذاذ",
  55: "رذاذ كثيف",
  61: "مطر خفيف",
  63: "مطر",
  65: "مطر غزير",
  71: "ثلج خفيف",
  73: "ثلج",
  75: "ثلج كثيف",
  80: "زخات مطر",
  81: "زخات مطر",
  82: "زخات غزيرة",
  95: "عواصف رعدية",
  96: "عواصف رعدية مع برد",
  99: "عواصف رعدية شديدة",
};

export const weatherLabel = (code: number) => CODES[code] ?? "غير معروف";

export async function geocodePlace(name: string) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    name,
  )}&count=1&language=ar&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("geocode failed");
  const json = (await res.json()) as {
    results?: Array<{ latitude: number; longitude: number; name: string; country?: string }>;
  };
  const hit = json.results?.[0];
  if (!hit) return null;
  return { lat: hit.latitude, lng: hit.longitude, label: [hit.name, hit.country].filter(Boolean).join("، ") };
}

export async function fetchWeather(lat: number, lng: number, date?: string | null): Promise<Weather | null> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    daily: "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset",
    current: "temperature_2m,weather_code",
    timezone: "auto",
  });
  if (date) {
    params.set("start_date", date);
    params.set("end_date", date);
  } else {
    params.set("forecast_days", "1");
  }
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!res.ok) return null;
  const json: any = await res.json();
  const code = json.daily?.weather_code?.[0] ?? json.current?.weather_code ?? 0;
  return {
    temp: json.current?.temperature_2m ?? json.daily?.temperature_2m_max?.[0] ?? 0,
    tempMax: json.daily?.temperature_2m_max?.[0] ?? null,
    tempMin: json.daily?.temperature_2m_min?.[0] ?? null,
    code,
    label: weatherLabel(code),
    sunrise: json.daily?.sunrise?.[0]?.slice(11) ?? null,
    sunset: json.daily?.sunset?.[0]?.slice(11) ?? null,
  };
}

export const mapsLink = (opts: { lat?: number | null; lng?: number | null; address?: string | null }) =>
  opts.lat != null && opts.lng != null
    ? `https://www.google.com/maps/search/?api=1&query=${opts.lat},${opts.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(opts.address ?? "")}`;
