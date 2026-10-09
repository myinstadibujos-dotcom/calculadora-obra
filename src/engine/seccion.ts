import { diametroMm } from "./barras";
import type { EntradaViga } from "./viga";

export interface BarraDibujo { x: number; y: number; d: number; grupo: "sup" | "inf" }
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
  return {
    b: e.b, h: e.h,
    estribo: { x: e.recub + dE / 2, y: e.recub + dE / 2, w: e.b - 2 * e.recub - dE, h: e.h - 2 * e.recub - dE, espesor: dE },
    barras,
  };
}
