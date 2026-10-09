import type { Materiales, Receta } from "./materiales";

// Recetas de REFERENCIA: valores de divulgación recogidos de una sola página web (ver fuente) el 09/10/2026.
// No están verificados contra norma ni ficha de fabricante y otras fuentes publican cifras distintas.
// Para usar la tabla que tú manejas, edita los valores o guárdala como "mi receta".
const FUENTE = "calcuapp.click · Calculadora de dosificación de concreto (tabla referencial de divulgación)";
const AVISO = "Valores referenciales sin verificar contra norma ni ficha de fabricante; otras fuentes publican cifras distintas para la misma resistencia. Contrástalos con tu tabla.";
const ref = (id: string, nombre: string, cemento: string, arena: string, grava: string, agua: string, extra: string): Receta => ({
  id, nombre, cemento, arena, grava, agua, fuente: FUENTE, fecha: "consultada el 09/10/2026", obs: `${extra}. ${AVISO}`,
});

export const RECETAS_REFERENCIA: Receta[] = [
  ref("ref-4000", "4000 psi · 1:2:2", "420", "0,67", "0,67", "190", "Según la fuente: 280 kg/cm², 27 MPa"),
  ref("ref-3555", "3555 psi · 1:2:2,5", "380", "0,60", "0,76", "180", "Según la fuente: 240 kg/cm², 24 MPa"),
  ref("ref-3224", "3224 psi · 1:2:3", "350", "0,55", "0,84", "170", "Según la fuente: 226 kg/cm², 22 MPa"),
  ref("ref-3000", "3000 psi · 1:2:3,5", "320", "0,52", "0,90", "170", "Según la fuente: 210 kg/cm², 20 MPa"),
  ref("ref-2000", "2000 psi · 1:3:5", "230", "0,55", "0,92", "150", "Según la fuente: 140 kg/cm², 14 MPa"),
];

export function aplicarReceta(m: Materiales, r: Receta, seleccion: string): Materiales {
  return { ...m, dosNombre: r.nombre, dosFuente: r.fuente, dosFecha: r.fecha, dosObs: r.obs,
    cemento: r.cemento, arena: r.arena, grava: r.grava, agua: r.agua, recetaSel: seleccion };
}
