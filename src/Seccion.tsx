import { geometriaSeccion } from "./engine/seccion";
import type { EntradaViga } from "./engine/viga";

/** Dibujo a escala de la sección transversal, generado desde los mismos datos del cálculo. */
export function Seccion({ e }: { e: EntradaViga }) {
  const g = geometriaSeccion(e);
  const cm = 100;
  const W = g.b * cm, H = g.h * cm;
  const pad = Math.max(W, H) * 0.14;
  const fs = Math.max(W, H) * 0.06;
  const s = g.estribo;
  return (
    <svg className="seccion" viewBox={`${-pad} ${-pad} ${W + 2 * pad} ${H + 2 * pad}`}
         role="img" aria-label={`Sección de ${(g.b * cm).toFixed(0)} por ${(g.h * cm).toFixed(0)} cm`}>
      <rect className="sec-concreto" x={0} y={0} width={W} height={H} />
      <rect className="sec-estribo" x={s.x * cm} y={s.y * cm} width={s.w * cm} height={s.h * cm}
            rx={s.espesor * cm * 2} strokeWidth={s.espesor * cm} />
      {g.barras.map((b, i) => (
        <circle key={i} className={b.adicional ? "sec-barra sec-ad" : "sec-barra"} cx={b.x * cm} cy={b.y * cm} r={(b.d * cm) / 2} />
      ))}
      <text className="sec-cota" x={W / 2} y={H + pad * 0.7} fontSize={fs} textAnchor="middle">
        b = {(g.b * cm).toFixed(0)} cm
      </text>
      <text className="sec-cota" fontSize={fs} textAnchor="middle"
            transform={`translate(${-pad * 0.4} ${H / 2}) rotate(-90)`}>
        h = {(g.h * cm).toFixed(0)} cm
      </text>
    </svg>
  );
}
