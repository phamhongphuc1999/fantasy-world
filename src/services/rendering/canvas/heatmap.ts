import { TRgbColor, clamp01, interpolateColor, toRgbString } from './shared';

export function getPopulationColor(
  population: number,
  minPopulation: number,
  maxPopulation: number
) {
  const light: TRgbColor = { r: 224, g: 243, b: 255 };
  const dark: TRgbColor = { r: 8, g: 48, b: 107 };

  if (maxPopulation <= minPopulation) return toRgbString(light);
  const normalized = clamp01((population - minPopulation) / (maxPopulation - minPopulation));
  return interpolateColor(light, dark, normalized);
}

export function getTemperatureColor(
  temperature: number,
  minTemperature: number,
  maxTemperature: number
) {
  const cold: TRgbColor = { r: 37, g: 99, b: 235 };
  const mild: TRgbColor = { r: 250, g: 204, b: 21 };
  const hot: TRgbColor = { r: 220, g: 38, b: 38 };

  if (maxTemperature <= minTemperature) return toRgbString(mild);
  const normalized = clamp01((temperature - minTemperature) / (maxTemperature - minTemperature));
  if (normalized <= 0.5) {
    const blend = normalized / 0.5;
    return interpolateColor(cold, mild, blend);
  }

  const blend = (normalized - 0.5) / 0.5;
  return interpolateColor(mild, hot, blend);
}

export function getPrecipitationColor(precipitation: number) {
  const dry: TRgbColor = { r: 245, g: 158, b: 11 };
  const wet: TRgbColor = { r: 14, g: 116, b: 144 };
  const normalized = clamp01(precipitation);
  return interpolateColor(dry, wet, normalized);
}

export function getRainShadowColor(rainShadow: number) {
  const low: TRgbColor = { r: 191, g: 219, b: 254 };
  const high: TRgbColor = { r: 146, g: 64, b: 14 };
  const normalized = clamp01(rainShadow);
  return interpolateColor(low, high, normalized);
}

export function getEconomyColor(economy: number, minEconomy: number, maxEconomy: number) {
  const low: TRgbColor = { r: 254, g: 240, b: 138 };
  const high: TRgbColor = { r: 120, g: 53, b: 15 };
  if (maxEconomy <= minEconomy) return toRgbString(low);

  const normalized = clamp01((economy - minEconomy) / (maxEconomy - minEconomy));
  return interpolateColor(low, high, normalized);
}
