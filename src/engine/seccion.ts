import { diametroMm, type Barra } from "./barras";
import { desplazamientoCapa2, patasDeGancho, posicionesEstribos, varilla, zonasTraslapo, type ConfigAcero, type EntradaViga } from "./viga";

export interface BarraDibujo { x: number; y: number; d: number; grupo: "sup" | "inf"; adicional?: boolean }
export interface GeometriaSeccion {
  b: number; h: number; // metros
  estribo: { x: number; y: number; w: number; h: number; espesor: number }; // eje del estribo
  barras: BarraDibujo[];
}

/** Coordenadas (m) de la sección, origen en la esquina superior izquierda del concreto.
 *  Se usa DESPUÉS de calcularViga, que ya validó que todo cabe. */
export function geometriaSeccion(e: EntradaViga): GeometriaSeccion {
  const dE = diametroMm(e.estribo.barra) / 1000;
  const barras: BarraDibujo[] = [];
  const capa = (g: EntradaViga["sup"], grupo: "sup" | "inf") => {
    const d = diametroMm(g.barra) / 1000;
    const x0 = e.recub + dE + d / 2;
    const x1 = e.b - e.recub - dE - d / 2;
    const y = grupo === "sup" ? x0 : e.h - e.recub - dE - d / 2;
    for (let i = 0; i < g.cantidad; i++) {
      const x = g.cantidad === 1 ? e.b / 2 : x0 + ((x1 - x0) * i) / (g.cantidad - 1);
      barras.push({ x, y, d, grupo });
    }
  };
  capa(e.sup, "sup");
  capa(e.inf, "inf");
  for (const a of e.adicionales ?? []) {
    if (a.cantidad === 0) continue;
    const d = diametroMm(a.barra) / 1000;
    const x0 = e.recub + dE + d / 2, x1 = e.b - e.recub - dE - d / 2;
    const off = desplazamientoCapa2(e, a.grupo) + d / 2;
    const y = a.grupo === "sup" ? e.recub + dE + off : e.h - e.recub - dE - off;
    for (let i = 0; i < a.cantidad; i++)
      barras.push({ x: a.cantidad === 1 ? e.b / 2 : x0 + ((x1 - x0) * i) / (a.cantidad - 1), y, d, grupo: a.grupo, adicional: true });
  }
  return {
    b: e.b, h: e.h,
    estribo: { x: e.recub + dE / 2, y: e.recub + dE / 2, w: e.b - 2 * e.recub - dE, h: e.h - 2 * e.recub - dE, espesor: dE },
    barras,
  };
}

export interface GeometriaLongitudinal {
  L: number; h: number; // metros
  estribos: { x: number; y0: number; y1: number; espesor: number; zona: "ext" | "cen" }[];
  barras: { y: number; d: number; x0: number; x1: number; grupo: "sup" | "inf"; adicional?: boolean; patas: [number, number, number, number][]; zonas: [number, number][]; lap: number }[];
}

/** Vista de elevación: estribos a separación constante desde la cara útil izquierda. */
export function geometriaLongitudinal(e: EntradaViga, acero?: ConfigAcero): GeometriaLongitudinal {
  const zon = (barra: Barra, x0: number, run: number): [number, number][] =>
    zonasTraslapo(run, varilla(acero, barra), acero?.traslapo[barra] ?? 0).map(([a, b]) => [x0 + a, x0 + b]);
  const dE = diametroMm(e.estribo.barra) / 1000;
  const estribos = posicionesEstribos(e.L - 2 * e.recub, e.estribo.separacion, e.estribo.zonaLong ?? 0, e.estribo.zonaSep ?? 0)
    .map((p) => ({ x: e.recub + p.x, y0: e.recub + dE / 2, y1: e.h - e.recub - dE / 2, espesor: dE, zona: p.zona }));
  const barras: GeometriaLongitudinal["barras"] = [];
  const capa = (g: EntradaViga["sup"], grupo: "sup" | "inf") => {
    if (g.cantidad === 0) return;
    const d = diametroMm(g.barra) / 1000;
    const y = grupo === "sup" ? e.recub + dE + d / 2 : e.h - e.recub - dE - d / 2;
    barras.push({ y, d, x0: e.recub, x1: e.L - e.recub, grupo, patas: patasDeGancho(g.gancho, grupo, e.recub, e.L - e.recub, y, d), zonas: zon(g.barra, e.recub, e.L - 2 * e.recub), lap: acero?.traslapo[g.barra] ?? 0 });
  };
  capa(e.sup, "sup");
  capa(e.inf, "inf");
  for (const a of e.adicionales ?? []) {
    if (a.cantidad === 0) continue;
    const d = diametroMm(a.barra) / 1000, off = desplazamientoCapa2(e, a.grupo) + d / 2;
    const y = a.grupo === "sup" ? e.recub + dE + off : e.h - e.recub - dE - off;
    const x0 = e.recub + a.desde, x1 = x0 + a.longitud;
    barras.push({ y, d, x0, x1, grupo: a.grupo, adicional: true, patas: patasDeGancho(a.gancho, a.grupo, x0, x1, y, d), zonas: zon(a.barra, x0, a.longitud), lap: acero?.traslapo[a.barra] ?? 0 });
  }
  return { L: e.L, h: e.h, estribos, barras };
}
