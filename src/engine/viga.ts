import { Barra, diametroMm, pesoPorMetro } from "./barras";
import { ErrorDeDatos, ResultadoCalculo } from "./tipos";
import { volumenPrisma } from "./volumen";

export interface GrupoBarras { cantidad: number; barra: Barra }
export interface EntradaViga {
  b: number; h: number; L: number; recub: number; // metros
  sup: GrupoBarras; inf: GrupoBarras;
  estribo: { barra: Barra; separacion: number; gancho: number }; // metros
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

  const nEst = Math.floor(largoUtil / e.estribo.separacion) + 1; // incluye primero y último, sin duplicar
  fila("E-1", "Estribo cerrado", e.estribo.barra, nEst, 2 * (bi + hi) + 2 * e.estribo.gancho);

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
