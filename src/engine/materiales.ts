import { leerNumero } from "./numeros";

/** Parámetros del proyecto, todos editables y guardados como texto. Ninguno trae valores técnicos por defecto, salvo el peso del bulto. */
export interface Materiales {
  tipo: "obra" | "premezclado";
  dosNombre: string; dosFuente: string; dosFecha: string; dosObs: string; // identificación y trazabilidad de la dosificación
  cemento: string; arena: string; grava: string; agua: string; // por m³ de concreto: kg, m³, m³, L
  bulto: string; despAcero: string; despMat: string; // kg por bulto; % de desperdicio
  alambre: string; clavos: string; separadores: string; desmoldante: string; // factores de consumo
}
export const MATERIALES_INICIALES: Materiales = {
  tipo: "obra", dosNombre: "", dosFuente: "", dosFecha: "", dosObs: "", cemento: "", arena: "", grava: "", agua: "",
  bulto: "50", despAcero: "0", despMat: "0", alambre: "", clavos: "", separadores: "", desmoldante: "",
};
/** Completa lo que falte y descarta valores que no sean texto (archivos viejos o dañados). */
export function completarMateriales(m: any): Materiales {
  const r: any = { ...MATERIALES_INICIALES };
  for (const k of Object.keys(MATERIALES_INICIALES)) if (typeof m?.[k] === "string") r[k] = m[k];
  if (r.tipo !== "obra" && r.tipo !== "premezclado") r.tipo = "obra";
  return r;
}

export interface Totales { concretoGeom: number; concretoCompra: number; formaleta: number; aceroKg: number }
export interface LineaMaterial { nombre: string; formula: string; teorico: number; unidad: string; compra?: number; unidadCompra?: string }
export interface ResultadoMateriales { lineas: LineaMaterial[]; avisos: string[] }

export function calcularMateriales(m0: Materiales, t: Totales): ResultadoMateriales {
  const m = completarMateriales(m0);
  const lineas: LineaMaterial[] = [], avisos: string[] = [];
  const num = (s: string, nombre: string): number | null => {
    if (s.trim() === "") return null;
    const x = leerNumero(s);
    if (!Number.isFinite(x) || x < 0) { avisos.push(`${nombre}: valor no válido, se ignoró.`); return null; }
    return x;
  };
  const dA = num(m.despAcero, "Desperdicio del acero") ?? 0, dM = num(m.despMat, "Desperdicio de materiales") ?? 0;

  lineas.push({ nombre: "Acero de refuerzo", formula: "Σ pesos teóricos del despiece", teorico: t.aceroKg, unidad: "kg",
    compra: t.aceroKg * (1 + dA / 100), unidadCompra: "kg" });

  if (m.tipo === "premezclado") {
    lineas.push({ nombre: "Concreto premezclado", formula: "Σ (V geométrico + margen de cada elemento)", teorico: t.concretoGeom, unidad: "m³", compra: t.concretoCompra, unidadCompra: "m³" });
  } else {
    const c = num(m.cemento, "Cemento"), a = num(m.arena, "Arena"), g = num(m.grava, "Grava"), w = num(m.agua, "Agua"), bulto = num(m.bulto, "Peso del bulto");
    if (c === null || a === null || g === null) {
      avisos.push("Define cemento, arena y grava por m³ para calcular el concreto preparado en obra.");
    } else {
      const f = 1 + dM / 100, V = t.concretoCompra;
      lineas.push({ nombre: "Cemento", formula: "dosificación × V a preparar", teorico: c * V, unidad: "kg",
        ...(bulto ? { compra: Math.ceil((c * V * f) / bulto - 1e-9), unidadCompra: `bultos de ${bulto} kg` } : {}) });
      lineas.push({ nombre: "Arena", formula: "dosificación × V a preparar", teorico: a * V, unidad: "m³", compra: a * V * f, unidadCompra: "m³" });
      lineas.push({ nombre: "Grava", formula: "dosificación × V a preparar", teorico: g * V, unidad: "m³", compra: g * V * f, unidadCompra: "m³" });
      if (w !== null) lineas.push({ nombre: "Agua", formula: "dosificación × V a preparar", teorico: w * V, unidad: "L" });
      avisos.push(`Dosificación "${m.dosNombre || "sin nombre"}" (fuente: ${m.dosFuente || "no indicada"}; revisada: ${m.dosFecha || "sin fecha"}). Es un dato tuyo: la app no garantiza la resistencia del concreto. V a preparar = volumen a comprar con margen.`);
    }
  }

  const consumo = (valor: string, nombre: string, base: number, formula: string, unidad: string, entero = false) => {
    const k = num(valor, nombre);
    if (k === null) return;
    lineas.push({ nombre, formula, teorico: k * base, unidad, compra: entero ? Math.ceil(k * base - 1e-9) : undefined, unidadCompra: entero ? unidad : undefined });
  };
  consumo(m.alambre, "Alambre de amarre", t.aceroKg, "factor × peso del acero", "kg");
  consumo(m.clavos, "Clavos", t.formaleta, "factor × área de formaleta", "kg");
  consumo(m.separadores, "Separadores", t.formaleta, "factor × área de formaleta", "un", true);
  consumo(m.desmoldante, "Desmoldante", t.formaleta, "factor × área de formaleta", "L");
  return { lineas, avisos };
}

export function csvMateriales(r: ResultadoMateriales): string {
  const n = (x: number) => x.toFixed(3).replace(".", ",");
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const filas = [["Concepto", "Teorico", "Unidad", "Compra", "Unidad de compra", "Formula"].join(";")];
  for (const l of r.lineas)
    filas.push([q(l.nombre), n(l.teorico), l.unidad, l.compra === undefined ? "" : n(l.compra), l.unidadCompra ? q(l.unidadCompra) : "", q(l.formula)].join(";"));
  return "\ufeff" + filas.join("\r\n");
}
