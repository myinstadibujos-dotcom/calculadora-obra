/** Convierte texto a número aceptando coma o punto decimal (formato colombiano). */
export function leerNumero(texto: string): number {
  const limpio = texto.trim().replace(",", ".");
  if (limpio === "") return NaN;
  return Number(limpio);
}

export function formatear(valor: number, decimales: number): string {
  return valor.toLocaleString("es-CO", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}
