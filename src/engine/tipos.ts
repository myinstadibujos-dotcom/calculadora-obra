// Estructura común de todo resultado del motor de cálculo.
// Cada cálculo debe poder explicarse: qué entró, qué fórmula, qué salió.
export interface Entrada {
  nombre: string;
  valor: number;
  unidad: string;
}

export interface ResultadoCalculo {
  nombre: string;
  entradas: Entrada[];
  formula: string;
  /** Valor con precisión completa. El redondeo se aplica solo al presentar. */
  valor: number;
  unidad: string;
  supuestos: string[];
  advertencias: string[];
  /** Cantidad de decimales recomendada para mostrar este resultado. */
  decimalesPresentacion: number;
}

export class ErrorDeDatos extends Error {}
