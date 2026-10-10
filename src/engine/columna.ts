import { diametroMm, pesoPorMetro, type Barra } from "./barras";
import { ErrorDeDatos, type ResultadoCalculo } from "./tipos";
import { volumenPrisma } from "./volumen";
import { empalmesDe, posicionesEstribos, varilla, zonasTraslapo, type ConfigAcero, type FilaDespiece, type ResultadoViga } from "./viga";

export interface EntradaColumna {
  b: number; h: number; H: number; recub: number; // metros
  barra: Barra; nb: number; nh: number; // barras por cara b y por cara h, incluyendo esquinas
  pataInf: number; esperaSup: number; // pata a 90° en la base (hacia el centro) y tramo sobre el extremo superior (m)
  estribo: { barra: Barra; separacion: number; gancho: number; zonaLong?: number; zonaSep?: number };
  trabasB: number; trabasH: number; ganchoTraba: number; // trabas por nivel en cada dirección; extensión de gancho (m)
  margenConcretoPct: number;
}

export interface GeometriaColumna {
  b: number; h: number; H: number; recub: number; dE: number; espera: number; pata: number;
  estribo: { x: number; y: number; w: number; h: number };
  barras: { x: number; y: number; d: number }[];
  trabas: [number, number, number, number][]; // segmentos en planta (x1, y1, x2, y2)
  niveles: { y: number; zona: "ext" | "cen" }[]; // altura desde la base
  zonas: [number, number][]; lap: number; // zonas de traslapo de las barras (altura desde la base)
  barra: Barra; estriboBarra: Barra; sepCen: number; sepExt: number; // datos para rotular el dibujo
}

const lin = (a: number, b: number, n: number, i: number) => (n === 1 ? (a + b) / 2 : a + ((b - a) * i) / (n - 1));

/** Posiciones de barras, trabas y niveles de estribos. Úsese después de calcularColumna (que valida). */
export function geometriaColumna(e: EntradaColumna, acero?: ConfigAcero): GeometriaColumna {
  const dE = diametroMm(e.estribo.barra) / 1000, d = diametroMm(e.barra) / 1000;
  const x0 = e.recub + dE + d / 2, x1 = e.b - e.recub - dE - d / 2;
  const y0 = e.recub + dE + d / 2, y1 = e.h - e.recub - dE - d / 2;
  const barras: GeometriaColumna["barras"] = [];
  for (let i = 0; i < e.nb; i++) { const x = lin(x0, x1, e.nb, i); barras.push({ x, y: y0, d }, { x, y: y1, d }); }
  for (let j = 1; j < e.nh - 1; j++) { const y = lin(y0, y1, e.nh, j); barras.push({ x: x0, y, d }, { x: x1, y, d }); }
  const trabas: GeometriaColumna["trabas"] = [];
  for (let j = 1; j <= e.trabasB; j++) { const y = lin(y0, y1, e.nh, j); trabas.push([x0, y, x1, y]); }
  for (let i = 1; i <= e.trabasH; i++) { const x = lin(x0, x1, e.nb, i); trabas.push([x, y0, x, y1]); }
  const niveles = posicionesEstribos(e.H - 2 * e.recub, e.estribo.separacion, e.estribo.zonaLong ?? 0, e.estribo.zonaSep ?? 0)
    .map((p) => ({ y: e.recub + p.x, zona: p.zona }));
  return {
    b: e.b, h: e.h, H: e.H, recub: e.recub, dE, espera: e.esperaSup, pata: e.pataInf,
    estribo: { x: e.recub + dE / 2, y: e.recub + dE / 2, w: e.b - 2 * e.recub - dE, h: e.h - 2 * e.recub - dE },
    barras, trabas, niveles,
    zonas: zonasTraslapo(e.H + e.esperaSup, varilla(acero, e.barra), acero?.traslapo[e.barra] ?? 0), lap: acero?.traslapo[e.barra] ?? 0,
    barra: e.barra, estriboBarra: e.estribo.barra, sepCen: e.estribo.separacion, sepExt: e.estribo.zonaSep ?? 0,
  };
}

export function calcularColumna(e: EntradaColumna, acero?: ConfigAcero): ResultadoViga {
  const concreto = volumenPrisma(e.b, e.h, e.H);
  const { b, h, H, recub } = e;
  const noNeg = (x: number, t: string) => { if (!(x >= 0)) throw new ErrorDeDatos(`${t}: no puede ser negativo.`); };
  noNeg(recub, "Recubrimiento"); noNeg(e.pataInf, "Pata inferior"); noNeg(e.esperaSup, "Espera superior");
  noNeg(e.estribo.gancho, "Gancho del estribo"); noNeg(e.ganchoTraba, "Gancho de la traba"); noNeg(e.margenConcretoPct, "Margen de concreto");
  if (!(e.estribo.separacion > 0)) throw new ErrorDeDatos("Separación de estribos: debe ser mayor que cero.");
  const dE = diametroMm(e.estribo.barra) / 1000, d = diametroMm(e.barra) / 1000;
  const bi = b - 2 * recub - dE, hi = h - 2 * recub - dE, U = H - 2 * recub;
  if (bi <= 0 || hi <= 0 || U <= 0) throw new ErrorDeDatos("El recubrimiento es demasiado grande para las dimensiones.");
  if (!Number.isInteger(e.nb) || !Number.isInteger(e.nh) || e.nb < 2 || e.nh < 2)
    throw new ErrorDeDatos("Barras por cara: usa enteros de 2 o más (cuentan las esquinas).");
  if (e.nb * d > b - 2 * recub - 2 * dE) throw new ErrorDeDatos("Las barras de la cara b no caben en el ancho de la columna.");
  if (e.nh * d > h - 2 * recub - 2 * dE) throw new ErrorDeDatos("Las barras de la cara h no caben en el alto de la columna.");
  if (!Number.isInteger(e.trabasB) || !Number.isInteger(e.trabasH) || e.trabasB < 0 || e.trabasH < 0)
    throw new ErrorDeDatos("Trabas: usa números enteros desde 0.");
  if (e.trabasB > e.nh - 2 || e.trabasH > e.nb - 2) throw new ErrorDeDatos("No hay barras intermedias suficientes para tantas trabas.");
  const zl = e.estribo.zonaLong ?? 0, zs = e.estribo.zonaSep ?? 0;
  if (!(zl >= 0)) throw new ErrorDeDatos("Zona extrema: la longitud no puede ser negativa.");
  if (zl > 0 && !(zs > 0)) throw new ErrorDeDatos("Zona extrema: define una separación mayor que cero.");
  const pos = posicionesEstribos(U, e.estribo.separacion, zl, zs);
  for (let i = 1; i < pos.length; i++)
    if (pos[i].x - pos[i - 1].x < 1e-9) throw new ErrorDeDatos("Las zonas extremas se solapan o no dejan zona central: reduce su longitud.");

  const adv = [...concreto.advertencias];
  const despiece: FilaDespiece[] = [];
  const fila = (id: string, descripcion: string, barra: Barra, cantidad: number, longCorte: number, longRecta = longCorte, emp = { n: 0, lap: 0 }) => {
    const longTotal = longCorte + emp.n * emp.lap;
    const pesoUnit = longTotal * pesoPorMetro(barra);
    despiece.push({ id, descripcion: descripcion + (emp.n > 0 ? ` · ${emp.n + 1} tramos, traslapo ${(emp.lap * 100).toFixed(0)} cm` : ""), barra, cantidad, longCorte, longRecta, longTotal, empalmes: emp.n, traslapo: emp.lap, pesoUnit, pesoTotal: pesoUnit * cantidad });
  };

  const nBarras = 2 * e.nb + 2 * (e.nh - 2);
  const tramo = H + e.esperaSup;
  fila("L-1", `Longitudinal${e.pataInf > 0 ? ` · pata 90° en la base (${(e.pataInf * 100).toFixed(0)} cm)` : ""}`, e.barra, nBarras, tramo + e.pataInf, tramo, empalmesDe(acero, e.barra, tramo, "Barras longitudinales"));

  const nExt = pos.filter((p) => p.zona === "ext").length, nCen = pos.length - nExt;
  const corte = 2 * (bi + hi) + 2 * e.estribo.gancho;
  if (nExt > 0) fila("E-1", "Estribo, zona extrema", e.estribo.barra, nExt, corte);
  if (nCen > 0) fila(nExt > 0 ? "E-2" : "E-1", nExt > 0 ? "Estribo, zona central" : "Estribo cerrado", e.estribo.barra, nCen, corte);
  if (e.trabasB > 0) fila("T-1", "Traba en dirección b", e.estribo.barra, pos.length * e.trabasB, bi + 2 * e.ganchoTraba);
  if (e.trabasH > 0) fila("T-2", "Traba en dirección h", e.estribo.barra, pos.length * e.trabasH, hi + 2 * e.ganchoTraba);

  if (nExt === 0) {
    const resto = U - (pos.length - 1) * e.estribo.separacion;
    if (resto > 1e-6) adv.push(`El último estribo queda a ${(resto * 100).toFixed(1)} cm del extremo útil; no se agrega otro estribo en el extremo.`);
  } else {
    const iB = nExt / 2 + nCen, ajuste = pos[iB].x - pos[iB - 1].x;
    if (Math.abs(ajuste - e.estribo.separacion) > 1e-6 && nCen > 0)
      adv.push(`Tramo de ajuste junto a la zona extrema superior: ${(ajuste * 100).toFixed(1)} cm entre estribos.`);
  }
  adv.push("Barras: corte = H + espera superior + pata inferior; la espera y la pata son tus datos (traslapo y anclaje reglamentarios sin verificar en esta app).");
  adv.push("Estribos desde un recubrimiento sobre la base hasta un recubrimiento bajo la cabeza; ajusta separaciones si tu criterio de arranque es otro.");
  if (e.estribo.gancho === 0) adv.push("Extensión de gancho del estribo = 0: defínela. Su valor reglamentario aún no está verificado en esta app.");
  if (e.trabasB + e.trabasH > 0) adv.push("Trabas: corte = distancia entre ejes de estribo + 2 ganchos; se dibujan sobre las primeras barras intermedias, pero solo se cuantifica su cantidad.");

  if (despiece.some((f) => f.empalmes > 0))
    adv.push("Traslapos: el largo total de cada barra suma los traslapos al corte. La longitud del traslapo es un dato tuyo, no verificado contra la NSR-10 en esta app.");
  const pesoPorBarra: Record<string, number> = {};
  for (const f of despiece) pesoPorBarra[f.barra] = (pesoPorBarra[f.barra] ?? 0) + f.pesoTotal;
  const formaleta: ResultadoCalculo = {
    nombre: "Formaleta (área de contacto)",
    entradas: [{ nombre: "b", valor: b, unidad: "m" }, { nombre: "h", valor: h, unidad: "m" }, { nombre: "H", valor: H, unidad: "m" }],
    formula: "A = 2 · (b + h) · H", valor: 2 * (b + h) * H, unidad: "m²",
    supuestos: ["Cuatro caras; base y cabeza no incluidas."], advertencias: [], decimalesPresentacion: 2,
  };
  return {
    concreto, volumenCompra: concreto.valor * (1 + e.margenConcretoPct / 100), formaleta, despiece, pesoPorBarra,
    pesoTotal: despiece.reduce((s, f) => s + f.pesoTotal, 0), advertencias: adv,
  };
}
