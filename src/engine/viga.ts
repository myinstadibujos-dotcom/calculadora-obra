import { Barra, diametroMm, pesoPorMetro } from "./barras";
import { ErrorDeDatos, ResultadoCalculo } from "./tipos";
import { volumenPrisma } from "./volumen";

/** Gancho en los extremos de una barra. La pierna se mide desde el vértice del doblez (m). */
export interface Gancho { extremos: "ninguno" | "ambos" | "izq" | "der"; tipo: "90" | "135" | "180"; pierna: number }
export interface GrupoBarras { cantidad: number; barra: Barra; gancho?: Gancho }
export interface Adicional { grupo: "sup" | "inf"; cantidad: number; barra: Barra; desde: number; longitud: number; gancho?: Gancho } // metros desde la cara útil izquierda
export interface EntradaViga {
  adicionales?: Adicional[]; sepCapas?: number; // sepCapas: separación libre entre capas (m), solo para dibujo y verificación de cabida
  b: number; h: number; L: number; recub: number; // metros
  sup: GrupoBarras; inf: GrupoBarras;
  estribo: { barra: Barra; separacion: number; gancho: number; zonaLong?: number; zonaSep?: number }; // metros; separacion = zona central
  margenConcretoPct: number;
}
export interface FilaDespiece {
  id: string; descripcion: string; barra: Barra;
  cantidad: number; longCorte: number; longRecta: number; pesoUnit: number; pesoTotal: number;
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

/** Distancia desde la cara interior del estribo hasta el borde superior (o inferior) de la segunda capa. */
export function desplazamientoCapa2(e: EntradaViga, grupo: "sup" | "inf"): number {
  const m = grupo === "sup" ? e.sup : e.inf;
  return m.cantidad > 0 ? diametroMm(m.barra) / 1000 + (e.sepCapas ?? 0.025) : 0;
}

/** Segmentos [x1, y1, x2, y2] (m, y medida desde la cara superior) de las piernas de los ganchos. */
export function patasDeGancho(g: Gancho | undefined, grupo: "sup" | "inf", xIzq: number, xDer: number, y: number, d: number): [number, number, number, number][] {
  if (!g || g.extremos === "ninguno" || !(g.pierna > 0)) return [];
  const sy = grupo === "sup" ? 1 : -1; // arriba el gancho baja; abajo el gancho sube
  const c = Math.SQRT1_2, p = g.pierna;
  const una = (xv: number, h: 1 | -1): [number, number, number, number][] =>
    g.tipo === "90" ? [[xv, y, xv, y + sy * p]]
    : g.tipo === "135" ? [[xv, y, xv + h * p * c, y + sy * p * c]]
    : [[xv, y, xv, y + sy * d], [xv, y + sy * d, xv + h * p, y + sy * d]];
  return [...(g.extremos !== "der" ? una(xIzq, 1) : []), ...(g.extremos !== "izq" ? una(xDer, -1) : [])];
}

/** Longitud extra por ganchos y verificación de que la pierna cabe dentro de la sección y del largo de la barra. */
function ganchoDe(nombre: string, g: Gancho | undefined, run: number, centro: number, d: number, h: number, recub: number, dE: number) {
  if (!g || g.extremos === "ninguno") return { extra: 0, texto: "" };
  if (!(g.pierna > 0)) throw new ErrorDeDatos(`${nombre}: define la longitud de la pierna del gancho.`);
  const n = g.extremos === "ambos" ? 2 : 1, c = Math.SQRT1_2;
  const vert = g.tipo === "90" ? g.pierna : g.tipo === "135" ? g.pierna * c : d;
  const horiz = g.tipo === "90" ? 0 : g.tipo === "135" ? g.pierna * c : g.pierna;
  const libre = h - recub - dE - centro;
  if (vert > libre + 1e-9) throw new ErrorDeDatos(`${nombre}: el gancho no cabe en la altura de la viga (espacio vertical disponible ${(libre * 100).toFixed(1)} cm).`);
  if (horiz > run + 1e-9) throw new ErrorDeDatos(`${nombre}: la pierna del gancho es más larga que la barra.`);
  return { extra: n * g.pierna, texto: ` · ${n} gancho${n > 1 ? "s" : ""} ${g.tipo}° (pierna ${(g.pierna * 100).toFixed(0)} cm)` };
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
  const fila = (id: string, descripcion: string, barra: Barra, cantidad: number, longCorte: number, longRecta = longCorte) => {
    const pesoUnit = longCorte * pesoPorMetro(barra);
    despiece.push({ id, descripcion, barra, cantidad, longCorte, longRecta, pesoUnit, pesoTotal: pesoUnit * cantidad });
  };

  const longitudinal = (id: string, nombre: string, g: GrupoBarras) => {
    if (!Number.isInteger(g.cantidad) || g.cantidad < 0) throw new ErrorDeDatos(`Barras ${nombre}: la cantidad debe ser un entero.`);
    if (g.cantidad === 0) return;
    if (g.cantidad * (diametroMm(g.barra) / 1000) > b - 2 * recub - 2 * dE)
      throw new ErrorDeDatos(`Barras ${nombre}: no caben en el ancho de la viga.`);
    const d = diametroMm(g.barra) / 1000;
    const hk = ganchoDe(`Barras ${nombre}`, g.gancho, largoUtil, recub + dE + d / 2, d, h, recub, dE);
    fila(id, `Longitudinal ${nombre}${hk.texto}`, g.barra, g.cantidad, largoUtil + hk.extra, largoUtil);
  };
  longitudinal("L-sup", "superior", e.sup);
  longitudinal("L-inf", "inferior", e.inf);

  if (!((e.sepCapas ?? 0.025) >= 0)) throw new ErrorDeDatos("Separación entre capas: no puede ser negativa.");
  const ocupa = { sup: e.sup.cantidad > 0 ? diametroMm(e.sup.barra) / 1000 : 0, inf: e.inf.cantidad > 0 ? diametroMm(e.inf.barra) / 1000 : 0 };
  const ads = (e.adicionales ?? []).filter((a) => a.cantidad !== 0);
  ads.forEach((a, i) => {
    const t = `Refuerzo adicional ${i + 1}`;
    if (!Number.isInteger(a.cantidad) || a.cantidad < 0) throw new ErrorDeDatos(`${t}: la cantidad debe ser un entero.`);
    if (!(a.longitud > 0) || !(a.desde >= 0)) throw new ErrorDeDatos(`${t}: revisa la posición y la longitud.`);
    if (a.desde + a.longitud > largoUtil + 1e-9) throw new ErrorDeDatos(`${t}: se sale de la longitud útil de la viga (${(largoUtil * 100).toFixed(0)} cm).`);
    const d = diametroMm(a.barra) / 1000;
    if (a.cantidad * d > b - 2 * recub - 2 * dE) throw new ErrorDeDatos(`${t}: las barras no caben en el ancho de la viga.`);
    ocupa[a.grupo] = Math.max(ocupa[a.grupo], desplazamientoCapa2(e, a.grupo) + d);
    const hk = ganchoDe(t, a.gancho, a.longitud, recub + dE + desplazamientoCapa2(e, a.grupo) + d / 2, d, h, recub, dE);
    fila(`A-${i + 1}`, `Adicional ${a.grupo === "sup" ? "superior" : "inferior"} (${(a.desde * 100).toFixed(0)}–${((a.desde + a.longitud) * 100).toFixed(0)} cm)${hk.texto}`, a.barra, a.cantidad, a.longitud + hk.extra, a.longitud);
    for (let j = 0; j < i; j++) {
      const o = ads[j];
      if (o.grupo === a.grupo && a.desde < o.desde + o.longitud && o.desde < a.desde + a.longitud)
        adv.push(`Los refuerzos adicionales ${j + 1} y ${i + 1} se solapan en longitud y comparten capa: revisa su posición.`);
    }
  });
  if (ocupa.sup + ocupa.inf > h - 2 * (recub + dE) + 1e-9) throw new ErrorDeDatos("Las capas de barras no caben en la altura de la viga.");
  if (ads.length > 0) adv.push("Refuerzos adicionales: la longitud ingresada es el tramo recto; los ganchos se suman solo si los configuras.");

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
  adv.push("Barras de tramo recto L − 2·recubrimiento, sin traslapos ni anclajes adicionales; solo llevan ganchos donde los configuras.");
  if (e.estribo.gancho === 0) adv.push("Extensión de gancho del estribo = 0: defínela. Su valor reglamentario aún no está verificado en esta app.");

  if (despiece.some((f) => f.longCorte - f.longRecta > 1e-9))
    adv.push("Ganchos: corte = tramo recto + piernas medidas desde el vértice del doblez, sin descontar radios de doblez. Ángulo y pierna los defines tú; no están verificados contra la NSR-10 en esta app.");
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
