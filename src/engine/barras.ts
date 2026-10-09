// Barras designadas por número: #n = n/8 de pulgada (dato geométrico).
export const BARRAS = ["#3", "#4", "#5", "#6", "#7", "#8"] as const;
export type Barra = (typeof BARRAS)[number];
export const DENSIDAD_ACERO = 7850; // kg/m³, valor de referencia editable

export function diametroMm(b: Barra): number {
  return (Number(b.slice(1)) * 25.4) / 8;
}
/** Peso teórico por metro = ρ · π·d²/4 */
export function pesoPorMetro(b: Barra, rho = DENSIDAD_ACERO): number {
  const d = diametroMm(b) / 1000;
  return (rho * Math.PI * d * d) / 4;
}
