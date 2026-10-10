import { pesoPorMetro, type Barra } from "./barras";
import { varilla, type ConfigAcero, type FilaDespiece } from "./viga";

export interface PlanBarra {
  barra: Barra; modo: "kg" | "6" | "12"; pesoColocado: number; // kg teóricos colocados (incluye traslapos y ganchos)
  varillas?: number; longVarilla?: number; sobranteKg?: number; piezasLargas?: number;
}

/** Estimación de compra por diámetro. Con varillas comerciales empaqueta las piezas "de mayor a menor, en la primera que quepa".
 *  Es una estimación sencilla, no un plan de corte óptimo (eso será una función aparte). */
export function planCompra(filas: FilaDespiece[], acero?: ConfigAcero): PlanBarra[] {
  const porBarra = new Map<Barra, FilaDespiece[]>();
  for (const f of filas) porBarra.set(f.barra, [...(porBarra.get(f.barra) ?? []), f]);
  return [...porBarra.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([barra, fs]): PlanBarra => {
    const pesoColocado = fs.reduce((s, f) => s + f.pesoTotal, 0);
    const Lc = varilla(acero, barra);
    if (Lc === null) return { barra, modo: "kg", pesoColocado };
    const piezas: number[] = [];
    for (const f of fs) {
      const k = f.empalmes + 1;
      const una = k === 1 ? [f.longTotal] : [...Array(k - 1).fill(Lc), f.longTotal - (k - 1) * Lc];
      for (let i = 0; i < f.cantidad; i++) piezas.push(...una);
    }
    piezas.sort((a, b) => b - a);
    const libres: number[] = [];
    let largas = 0;
    for (const p of piezas) {
      if (p > Lc + 1e-9) { // pieza más larga que la varilla (p. ej. por ganchos): consume varillas completas
        largas++;
        const n = Math.ceil(p / Lc);
        for (let j = 0; j < n - 1; j++) libres.push(0);
        libres.push(n * Lc - p);
        continue;
      }
      const i = libres.findIndex((r) => r >= p - 1e-9);
      if (i < 0) libres.push(Lc - p); else libres[i] -= p;
    }
    return { barra, modo: String(Lc) as "6" | "12", pesoColocado, varillas: libres.length, longVarilla: Lc,
      sobranteKg: libres.reduce((s, r) => s + r, 0) * pesoPorMetro(barra), piezasLargas: largas };
  });
}
