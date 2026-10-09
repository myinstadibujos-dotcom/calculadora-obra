import { Entrada, ErrorDeDatos, ResultadoCalculo } from "./tipos";

function validarPositivo(nombre: string, valor: number): void {
  if (!Number.isFinite(valor)) throw new ErrorDeDatos(`${nombre}: ingresa un número válido.`);
  if (valor <= 0) throw new ErrorDeDatos(`${nombre}: debe ser mayor que cero.`);
}

/**
 * Volumen geométrico de un elemento prismático (viga, columna rectangular, etc.).
 * Todas las dimensiones en metros. No incluye desperdicio ni margen de compra.
 */
export function volumenPrisma(ancho: number, alto: number, largo: number): ResultadoCalculo {
  validarPositivo("Ancho", ancho);
  validarPositivo("Altura", alto);
  validarPositivo("Longitud", largo);

  const advertencias: string[] = [];
  if (Math.max(ancho, alto) > 3) advertencias.push("La sección supera 3 m: verifica que esté en metros.");
  if (largo > 30) advertencias.push("La longitud supera 30 m: verifica que esté en metros.");

  const entradas: Entrada[] = [
    { nombre: "Ancho (b)", valor: ancho, unidad: "m" },
    { nombre: "Altura (h)", valor: alto, unidad: "m" },
    { nombre: "Longitud (L)", valor: largo, unidad: "m" },
  ];

  return {
    nombre: "Volumen geométrico de concreto",
    entradas,
    formula: "V = b × h × L",
    valor: ancho * alto * largo,
    unidad: "m³",
    supuestos: ["Sección rectangular constante.", "Sin desperdicio ni margen de compra."],
    advertencias,
    decimalesPresentacion: 3,
  };
}
