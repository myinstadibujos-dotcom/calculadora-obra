import { leerNumero } from "./numeros";
import type { PlanBarra } from "./compraAcero";
import type { ConfigAcero } from "./viga";
import type { Barra } from "./barras";

/** Receta de dosificación por m³ de concreto. Los números son texto para respetar lo que escribe el usuario. */
export interface Receta {
  id: string; nombre: string; cemento: string; arena: string; grava: string; agua: string;
  fuente: string; fecha: string; obs: string;
}

/** Parámetros del proyecto, todos editables y guardados como texto. Ninguno trae valores técnicos por defecto, salvo el peso del bulto. */
export interface Materiales {
  tipo: "obra" | "premezclado";
  dosNombre: string; dosFuente: string; dosFecha: string; dosObs: string; // identificación y trazabilidad de la dosificación
  cemento: string; arena: string; grava: string; agua: string; // por m³ de concreto: kg, m³, m³, L
  bulto: string; despAcero: string; despMat: string; // kg por bulto; % de desperdicio
  alambre: string; clavos: string; separadores: string; desmoldante: string; // factores de consumo
  recetaSel: string; // "custom", id de una receta de referencia o "mia:<id>"
  recetas: Receta[]; // recetas propias guardadas en este proyecto
  // Acero: cómo se compra cada diámetro ("kg", "6" o "12" m) y traslapo en cm (vacío = sin definir)
  [clave: `compra${number}` | `lap${number}`]: string;
}
export const MATERIALES_INICIALES: Materiales = {
  tipo: "obra", dosNombre: "", dosFuente: "", dosFecha: "", dosObs: "", cemento: "", arena: "", grava: "", agua: "",
  bulto: "50", despAcero: "0", despMat: "0", alambre: "", clavos: "", separadores: "", desmoldante: "",
  recetaSel: "custom", recetas: [],
  ...(Object.fromEntries([3, 4, 5, 6, 7, 8].flatMap((n) => [[`compra${n}`, "kg"], [`lap${n}`, ""]])) as any),
};
/** Completa lo que falte y descarta valores que no sean texto (archivos viejos o dañados). */
export function completarMateriales(m: any): Materiales {
  const r: any = { ...MATERIALES_INICIALES };
  for (const k of Object.keys(MATERIALES_INICIALES)) if (typeof m?.[k] === "string") r[k] = m[k];
  if (r.tipo !== "obra" && r.tipo !== "premezclado") r.tipo = "obra";
  const CAMPOS = ["id", "nombre", "cemento", "arena", "grava", "agua", "fuente", "fecha", "obs"] as const;
  r.recetas = (Array.isArray(m?.recetas) ? m.recetas : [])
    .filter((x: any) => x && typeof x.id === "string" && typeof x.nombre === "string")
    .map((x: any) => Object.fromEntries(CAMPOS.map((k) => [k, typeof x[k] === "string" ? x[k] : ""])));
  return r;
}

export interface Totales { concretoGeom: number; concretoCompra: number; formaleta: number; aceroKg: number; plan?: PlanBarra[] }
export interface LineaMaterial { nombre: string; formula: string; teorico: number; unidad: string; compra?: number; unidadCompra?: string }
export interface ResultadoMateriales { lineas: LineaMaterial[]; avisos: string[] }

/** Convierte lo que el usuario eligió para el acero en datos que entiende el motor de cálculo. */
export function configAcero(m0?: Materiales): ConfigAcero {
  const m = completarMateriales(m0) as any;
  const compra: ConfigAcero["compra"] = {}, traslapo: ConfigAcero["traslapo"] = {};
  for (const n of [3, 4, 5, 6, 7, 8]) {
    const b = `#${n}` as Barra, c = m[`compra${n}`], l = leerNumero(m[`lap${n}`] ?? "");
    compra[b] = c === "6" || c === "12" ? c : "kg";
    if (Number.isFinite(l) && l > 0) traslapo[b] = l / 100;
  }
  return { compra, traslapo };
}

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

  lineas.push({ nombre: "Acero colocado (total)", formula: "Σ pesos teóricos del despiece, con ganchos y traslapos", teorico: t.aceroKg, unidad: "kg" });
  for (const p of t.plan ?? []) {
    if (p.varillas === undefined)
      lineas.push({ nombre: `Acero ${p.barra} por kilos`, formula: "peso colocado + desperdicio indicado", teorico: p.pesoColocado, unidad: "kg",
        compra: p.pesoColocado * (1 + dA / 100), unidadCompra: "kg" });
    else {
      lineas.push({ nombre: `Acero ${p.barra} en varillas`, formula: `piezas empaquetadas en varillas de ${p.longVarilla} m (estimación)`, teorico: p.pesoColocado, unidad: "kg",
        compra: p.varillas, unidadCompra: `varillas de ${p.longVarilla} m` });
      avisos.push(`${p.barra}: sobrante estimado ${(p.sobranteKg ?? 0).toFixed(1)} kg dentro de las varillas (el desperdicio % no se suma aquí).`);
      if (p.piezasLargas) avisos.push(`${p.barra}: ${p.piezasLargas} pieza(s) son más largas que la varilla por los ganchos; se contaron varillas completas.`);
    }
  }
  if (!(t.plan && t.plan.length)) lineas.push({ nombre: "Acero de refuerzo", formula: "peso teórico + desperdicio indicado", teorico: t.aceroKg, unidad: "kg", compra: t.aceroKg * (1 + dA / 100), unidadCompra: "kg" });

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
