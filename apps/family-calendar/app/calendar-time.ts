export function formatClockTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const suffix = hours >= 12 ? "PM" : "AM";
  const twelveHour = hours % 12 || 12;
  return `${twelveHour}:${String(mins).padStart(2, "0")} ${suffix}`;
}

export function formatCompactClockTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours % 12 || 12}:${String(mins).padStart(2, "0")}`;
}
