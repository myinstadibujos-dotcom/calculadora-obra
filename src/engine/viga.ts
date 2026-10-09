import { Barra, diametroMm, pesoPorMetro } from "./barras";
import { ErrorDeDatos, ResultadoCalculo } from "./tipos";
import { volumenPrisma } from "./volumen";

export interface GrupoBarras { cantidad: number; barra: Barra }
export interface EntradaViga {
  b: number; h: number; L: number; recub: number; // metros
  sup: GrupoBarras; inf: GrupoBarras;
  estribo: { barra: Barra; separacion: number; gancho: number; zonaLong?: number; zonaSep?: number }; // metros; separacion = zona central
  margenConcretoPct: number;
}
export interface FilaDespiece {
  id: string; descripcion: string; barra: Barra;
  cantidad: number; longCorte: number; pesoUnit: number; pesoTotal: number;
}
export interface ResultadoViga {
  concreto: ResultadoCalculo; volumenCompra: number; formaleta: ResultadoCalculo;
  despiece: FilaDespiece[]; pesoPorBarra: Record<string, number>;
  pesoTotal: number; advertencias: string[];
}

export interface PosEstribo { x: number; zona: "ext" | "cen" }

/** Posiciones (m) desde la cara útil izquierda. Sin zona extrema: separación constante desde el primero.
 *  Con zona extrema: zonas simétricas en ambos extremos y zona central entre ellas; ningún estribo se repite en los límites. */
export function posicionesEstribos(U: number, sepCentral: number, zonaLong = 0, zonaSep = 0): PosEstribo[] {
  const eps = 1e-9;
  if (!(zonaLong > 0)) {
    const n = Math.floor(U / sepCentral + eps) + 1;
    return Array.from({ length: n }, (_, i) => ({ x: i * sepCentral, zona: "cen" as const }));
  }
  const k = Math.floor(zonaLong / zonaSep + eps);
  const a = Array.from({ length: k + 1 }, (_, i) => i * zonaSep);
  const fin = a.map((x) => U - x).reverse();
  const out: PosEstribo[] = a.map((x) => ({ x, zona: "ext" as const }));
  for (let j = 1; a[k] + j * sepCentral < fin[0] - eps; j++) out.push({ x: a[k] + j * sepCentral, zona: "cen" });
  fin.forEach((x) => out.push({ x, zona: "ext" }));
  return out;
}

export function calcularViga(e: EntradaViga): ResultadoViga {
  const concreto = volumenPrisma(e.b, e.h, e.L); // valida b, h, L
  const { b, h, L, recub } = e;
  if (!(recub >= 0)) throw new ErrorDeDatos("Recubrimiento: no puede ser negativo.");
  if (!(e.estribo.separacion > 0)) throw new ErrorDeDatos("Separación de estribos: debe ser mayor que cero.");
  if (!(e.estribo.gancho >= 0)) throw new ErrorDeDatos("Gancho del estribo: no puede ser negativo.");
  if (!(e.margenConcretoPct >= 0)) throw new ErrorDeDatos("Margen de concreto: no puede ser negativo.");
  const dE = diametroMm(e.estribo.barra) / 1000;
  const bi = b - 2 * recub - dE; // ejes del estribo
  const hi = h - 2 * recub - dE;
  const largoUtil = L - 2 * recub;
  if (bi <= 0 || hi <= 0 || largoUtil <= 0) throw new ErrorDeDatos("El recubrimiento es demasiado grande para las dimensiones.");

  const adv = [...concreto.advertencias];
  const despiece: FilaDespiece[] = [];
  const fila = (id: string, descripcion: string, barra: Barra, cantidad: number, longCorte: number) => {
    const pesoUnit = longCorte * pesoPorMetro(barra);
    despiece.push({ id, descripcion, barra, cantidad, longCorte, pesoUnit, pesoTotal: pesoUnit * cantidad });
  };

  const longitudinal = (id: string, nombre: string, g: GrupoBarras) => {
    if (!Number.isInteger(g.cantidad) || g.cantidad < 0) throw new ErrorDeDatos(`Barras ${nombre}: la cantidad debe ser un entero.`);
    if (g.cantidad === 0) return;
    if (g.cantidad * (diametroMm(g.barra) / 1000) > b - 2 * recub - 2 * dE)
      throw new ErrorDeDatos(`Barras ${nombre}: no caben en el ancho de la viga.`);
    fila(id, `Longitudinal ${nombre}`, g.barra, g.cantidad, largoUtil);
  };
  longitudinal("L-sup", "superior", e.sup);
  longitudinal("L-inf", "inferior", e.inf);

  const zl = e.estribo.zonaLong ?? 0, zs = e.estribo.zonaSep ?? 0;
  if (!(zl >= 0)) throw new ErrorDeDatos("Zona extrema: la longitud no puede ser negativa.");
  if (zl > 0 && !(zs > 0)) throw new ErrorDeDatos("Zona extrema: define una separación mayor que cero.");
  const pos = posicionesEstribos(largoUtil, e.estribo.separacion, zl, zs);
  for (let i = 1; i < pos.length; i++)
    if (pos[i].x - pos[i - 1].x < 1e-9) throw new ErrorDeDatos("Las zonas extremas se solapan o no dejan zona central: reduce su longitud.");
  const nExt = pos.filter((p) => p.zona === "ext").length, nCen = pos.length - nExt;
  const corte = 2 * (bi + hi) + 2 * e.estribo.gancho;
  if (nExt > 0) fila("E-1", "Estribo, zona extrema", e.estribo.barra, nExt, corte);
  if (nCen > 0) fila(nExt > 0 ? "E-2" : "E-1", nExt > 0 ? "Estribo, zona central" : "Estribo cerrado", e.estribo.barra, nCen, corte);
  const nEst = pos.length;

  if (nExt === 0) {
    const resto = largoUtil - (nEst - 1) * e.estribo.separacion;
    if (resto > 1e-6) adv.push(`El último estribo queda a ${(resto * 100).toFixed(1)} cm del extremo útil; no se agrega otro estribo en el extremo.`);
  } else {
    const iB = nExt / 2 + nCen; // primer estribo de la zona extrema final
    const ajuste = pos[iB].x - pos[iB - 1].x;
    if (Math.abs(ajuste - e.estribo.separacion) > 1e-6 && nCen > 0)
      adv.push(`Tramo de ajuste junto a la zona extrema derecha: ${(ajuste * 100).toFixed(1)} cm entre estribos.`);
  }
  adv.push("Barras rectas de longitud igual a L − 2·recubrimiento: sin ganchos, anclajes ni traslapos.");
  if (e.estribo.gancho === 0) adv.push("Extensión de gancho del estribo = 0: defínela. Su valor reglamentario aún no está verificado en esta app.");

  const pesoPorBarra: Record<string, number> = {};
  for (const f of despiece) pesoPorBarra[f.barra] = (pesoPorBarra[f.barra] ?? 0) + f.pesoTotal;

  const formaleta: ResultadoCalculo = {
    nombre: "Formaleta (área de contacto)",
    entradas: [
      { nombre: "b", valor: b, unidad: "m" }, { nombre: "h", valor: h, unidad: "m" }, { nombre: "L", valor: L, unidad: "m" },
    ],
    formula: "A = (2h + b) · L", valor: (2 * h + b) * L, unidad: "m²",
    supuestos: ["Dos caras laterales y fondo; cara superior libre; testas no incluidas."],
    advertencias: [], decimalesPresentacion: 2,
  };

  return {
    concreto, volumenCompra: concreto.valor * (1 + e.margenConcretoPct / 100), formaleta, despiece,
    pesoPorBarra, pesoTotal: despiece.reduce((s, f) => s + f.pesoTotal, 0), advertencias: adv,
  };
}
