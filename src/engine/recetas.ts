import type { Materiales, Receta } from "./materiales";

// Recetas que usa habitualmente el usuario (tabla que compartió en el chat de la app el 09/10/2026).
// La app no verifica su resistencia: son datos del usuario. Falta la de 4000 psi.
const rec = (psi: string, prop: string, bultos: string, cemento: string, arena: string, grava: string, agua: string): Receta => ({
  id: `usr-${psi}`, nombre: `${psi} psi · ${prop}`, cemento, arena, grava, agua,
  fuente: "Tabla del usuario (compartida en el chat de la app)", fecha: "09/10/2026",
  obs: `Proporción ${prop} (cemento:arena:grava); ${bultos} bultos (${cemento} kg). Receta del usuario; la app no verifica la resistencia que alcanza.`,
});

export const RECETAS_USUARIO: Receta[] = [
  rec("1500", "1:3:5", "4,2", "210", "0,50", "1,00", "160"),
  rec("2000", "1:3:4", "5,2", "260", "0,63", "0,84", "170"),
  rec("2500", "1:2:4", "6,0", "300", "0,48", "0,95", "170"),
  rec("3000", "1:2:3", "7,0", "350", "0,56", "0,84", "180"),
  rec("3500", "1:2:2", "8,4", "420", "0,67", "0,67", "220"),
];

export function aplicarReceta(m: Materiales, r: Receta, seleccion: string): Materiales {
  return { ...m, dosNombre: r.nombre, dosFuente: r.fuente, dosFecha: r.fecha, dosObs: r.obs,
    cemento: r.cemento, arena: r.arena, grava: r.grava, agua: r.agua, recetaSel: seleccion };
}
