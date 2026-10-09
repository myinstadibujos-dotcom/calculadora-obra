import { calcularViga, type ResultadoViga } from "./engine/viga";
import { ErrorDeDatos } from "./engine/tipos";
import { completar, toEntrada, nuevoId, type Proyecto } from "./modelo";

export const FORMATO = 2; // sube cuando cambie la estructura guardada; agrega una migración abajo
const MIGRACIONES: Record<number, (x: any) => any> = {
  // 1 → 2: se agregan los ganchos de las barras longitudinales y de los refuerzos adicionales
  1: (o) => ({ ...o, formato: 2, proyecto: { ...o.proyecto, elementos: Array.isArray(o.proyecto?.elementos)
    ? o.proyecto.elementos.map((e: any) => (e?.datos?.v && Array.isArray(e.datos.ad) ? { ...e, datos: completar(e.datos) } : e))
    : o.proyecto?.elementos } }),
}; // MIGRACIONES[k] convierte de formato k a k+1

export function exportarJSON(p: Proyecto): string {
  return JSON.stringify({ app: "calculadora-obra", formato: FORMATO, exportado: new Date().toISOString(), proyecto: p }, null, 1);
}

const CLAVES_V = ["b", "h", "L", "recub", "ns", "bs", "ni", "bi", "be", "sep", "gancho", "zl", "zs", "sepc", "margen", "ges", "gts", "gls", "gei", "gti", "gli"];

/** Valida el archivo ANTES de tocar datos existentes. Devuelve un proyecto nuevo (ids nuevos): nunca sobrescribe. */
export function importarJSON(texto: string): Proyecto {
  let o: any;
  try { o = JSON.parse(texto); } catch { throw new ErrorDeDatos("El archivo no es un JSON válido."); }
  if (!o || o.app !== "calculadora-obra" || typeof o.formato !== "number") throw new ErrorDeDatos("Este archivo no es una copia de esta app.");
  if (o.formato > FORMATO) throw new ErrorDeDatos("La copia viene de una versión más nueva de la app. Actualiza la app e inténtalo de nuevo.");
  for (let f = o.formato; f < FORMATO; f++) o = MIGRACIONES[f](o);
  const p = o.proyecto;
  if (!p || typeof p.nombre !== "string" || !Array.isArray(p.elementos)) throw new ErrorDeDatos("La copia no contiene un proyecto válido.");
  for (const e of p.elementos) {
    const ok = e && e.tipo === "viga" && typeof e.codigo === "string" && e.datos && Array.isArray(e.datos.ad)
      && e.datos.v && CLAVES_V.every((k) => typeof e.datos.v[k] === "string");
    if (!ok) throw new ErrorDeDatos("Un elemento de la copia está incompleto o dañado; no se importó nada.");
  }
  const t = new Date().toISOString();
  return {
    id: nuevoId(), nombre: `${p.nombre} (importado)`, creado: p.creado ?? t, actualizado: t,
    elementos: p.elementos.map((e: any) => ({ ...e, id: nuevoId(), creado: e.creado ?? t, actualizado: e.actualizado ?? t })),
  };
}

export interface Consolidado {
  filas: { codigo: string; r?: ResultadoViga; error?: string }[];
  concreto: number; compra: number; formaleta: number; acero: Record<string, number>; aceroTotal: number;
}

/** Suma cada elemento una sola vez, calculado de nuevo desde sus datos (nunca de totales guardados). */
export function consolidar(p: Proyecto): Consolidado {
  const c: Consolidado = { filas: [], concreto: 0, compra: 0, formaleta: 0, acero: {}, aceroTotal: 0 };
  for (const e of p.elementos) {
    try {
      const r = calcularViga(toEntrada(e.datos));
      c.filas.push({ codigo: e.codigo, r });
      c.concreto += r.concreto.valor; c.compra += r.volumenCompra; c.formaleta += r.formaleta.valor; c.aceroTotal += r.pesoTotal;
      for (const [b, w] of Object.entries(r.pesoPorBarra)) c.acero[b] = (c.acero[b] ?? 0) + w;
    } catch (x) {
      if (!(x instanceof ErrorDeDatos)) throw x;
      c.filas.push({ codigo: e.codigo, error: x.message });
    }
  }
  return c;
}

/** CSV para Excel en español: separador ";" y coma decimal, con BOM UTF-8. */
export function csvDespiece(p: Proyecto): string {
  const num = (x: number, d: number) => x.toFixed(d).replace(".", ",");
  const txt = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lineas = [["Elemento", "Pieza", "Descripcion", "Barra", "Cantidad", "Corte (m)", "Peso (kg)"].join(";")];
  for (const f of consolidar(p).filas) {
    if (!f.r) { lineas.push([txt(f.codigo), "", txt(`SIN CALCULAR: ${f.error}`), "", "", "", ""].join(";")); continue; }
    for (const d of f.r.despiece)
      lineas.push([txt(f.codigo), d.id, txt(d.descripcion), d.barra, d.cantidad, num(d.longCorte, 3), num(d.pesoTotal, 3)].join(";"));
  }
  return "\ufeff" + lineas.join("\r\n");
}

export function descargar(nombre: string, contenido: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([contenido], { type: mime }));
  const a = document.createElement("a");
  a.href = url; a.download = nombre; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
