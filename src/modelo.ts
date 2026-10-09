import type { Barra } from "./engine/barras";
import type { EntradaViga, Gancho } from "./engine/viga";
import { leerNumero as n } from "./engine/numeros";

export type Ad = { grupo: "sup" | "inf"; cant: string; barra: Barra; desde: string; long: string; ge: string; gt: string; gl: string };
export interface DatosViga {
  v: { b: string; h: string; L: string; recub: string; ns: string; bs: Barra; ni: string; bi: Barra; be: Barra;
       sep: string; gancho: string; zl: string; zs: string; sepc: string; margen: string;
       ges: string; gts: string; gls: string; gei: string; gti: string; gli: string };
  ad: Ad[];
}
export const DATOS_INICIALES: DatosViga = {
  v: { b: "30", h: "40", L: "4,00", recub: "4", ns: "2", bs: "#4", ni: "3", bi: "#5", be: "#3",
       sep: "15", gancho: "0", zl: "0", zs: "10", sepc: "2,5", margen: "5",
       ges: "ninguno", gts: "90", gls: "0", gei: "ninguno", gti: "90", gli: "0" },
  ad: [],
};

/** Convierte lo que el usuario escribió (cm y texto) en la entrada del motor (metros). */
/** Completa con valores por defecto lo que falte (datos guardados con versiones anteriores). */
export function completar(d: any): DatosViga {
  return {
    v: { ...DATOS_INICIALES.v, ...(d?.v ?? {}) },
    ad: (d?.ad ?? []).map((a: any) => ({ ge: "ninguno", gt: "90", gl: "0", ...a })),
  };
}

export function toEntrada(datos: DatosViga): EntradaViga {
  const { v, ad } = completar(datos);
  const cm = (s: string) => n(s) / 100;
  const gh = (ext: string, tipo: string, len: string): Gancho | undefined =>
    ext === "ninguno" ? undefined : { extremos: ext as Gancho["extremos"], tipo: tipo as Gancho["tipo"], pierna: cm(len) };
  return {
    b: cm(v.b), h: cm(v.h), L: n(v.L), recub: cm(v.recub),
    sup: { cantidad: n(v.ns), barra: v.bs, gancho: gh(v.ges, v.gts, v.gls) },
    inf: { cantidad: n(v.ni), barra: v.bi, gancho: gh(v.gei, v.gti, v.gli) },
    estribo: { barra: v.be, separacion: cm(v.sep), gancho: cm(v.gancho), zonaLong: cm(v.zl), zonaSep: cm(v.zs) },
    margenConcretoPct: n(v.margen), sepCapas: cm(v.sepc),
    adicionales: ad.map((a) => ({ grupo: a.grupo, cantidad: n(a.cant), barra: a.barra, desde: cm(a.desde), longitud: cm(a.long), gancho: gh(a.ge, a.gt, a.gl) })),
  };
}

export interface Elemento { id: string; tipo: "viga"; codigo: string; datos: DatosViga; creado: string; actualizado: string }
export interface Proyecto { id: string; nombre: string; creado: string; actualizado: string; elementos: Elemento[] }

export const nuevoId = (): string => crypto.randomUUID();
export const ahora = (): string => new Date().toISOString();
