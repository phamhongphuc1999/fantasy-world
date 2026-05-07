export function formatPopulation(value: number) {
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}
