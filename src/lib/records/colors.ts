export const OPERATOR_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#8b5cf6", // Violet
  "#06b6d4", // Cyan
  "#f97316", // Orange
  "#6366f1", // Indigo
  "#14b8a6", // Teal
  "#f43f5e", // Rose
];

export function getOperatorColor(name: string, fallbackIndex = 0) {
  const hash = name
    .trim()
    .toLowerCase()
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return OPERATOR_COLORS[(hash + fallbackIndex) % OPERATOR_COLORS.length];
}
