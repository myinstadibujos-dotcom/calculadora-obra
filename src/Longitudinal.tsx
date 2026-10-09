import { geometriaLongitudinal } from "./engine/seccion";
import type { EntradaViga } from "./engine/viga";

/** Elevación a escala: las barras inferiores y superiores se dibujan como líneas de su diámetro real. */
export function Longitudinal({ e }: { e: EntradaViga }) {
  const g = geometriaLongitudinal(e);
  const cm = 100;
  const W = g.L * cm, H = g.h * cm;
  const pad = Math.max(W, H) * 0.1;
  const fs = Math.max(W, H) * 0.05;
  return (
    <svg className="seccion" viewBox={`${-pad} ${-pad} ${W + 2 * pad} ${H + 2 * pad}`}
         role="img" aria-label={`Vista longitudinal de ${g.L.toFixed(2)} m con ${g.estribos.length} estribos`}>
      <rect className="sec-concreto" x={0} y={0} width={W} height={H} />
      {g.estribos.map((s, i) => (
        <line key={i} className={s.zona === "ext" ? "sec-estribo est-ext" : "sec-estribo"} x1={s.x * cm} x2={s.x * cm} y1={s.y0 * cm} y2={s.y1 * cm}
              strokeWidth={s.espesor * cm} />
      ))}
      {g.barras.map((b) => (
        <line key={b.grupo} className="lon-barra" x1={b.x0 * cm} x2={b.x1 * cm} y1={b.y * cm} y2={b.y * cm}
              strokeWidth={b.d * cm} />
      ))}
      <text className="sec-cota" x={W / 2} y={H + pad * 0.75} fontSize={fs} textAnchor="middle">
        L = {g.L.toFixed(2)} m · {g.estribos.length} estribos{g.estribos.some((s) => s.zona === "ext") ? ` (${g.estribos.filter((s) => s.zona === "ext").length} en zonas extremas)` : ""}
      </text>
    </svg>
  );
}
