import { geometriaLongitudinal } from "./engine/seccion";
import type { ConfigAcero, EntradaViga } from "./engine/viga";

/** Elevación a escala: las barras inferiores y superiores se dibujan como líneas de su diámetro real. */
export function Longitudinal({ e, acero }: { e: EntradaViga; acero?: ConfigAcero }) {
  const g = geometriaLongitudinal(e, acero);
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
      {g.barras.map((b, i) => {
        const dy = (b.grupo === "sup" ? 1 : -1) * b.d * 1.05 * cm; // la segunda barra del traslapo se dibuja pegada, hacia adentro
        return (
          <g key={i}>
            <g className={b.adicional ? "lon-barra lon-ad" : "lon-barra"} strokeWidth={b.d * cm} strokeLinecap="round" fill="none">
              <line x1={b.x0 * cm} x2={b.x1 * cm} y1={b.y * cm} y2={b.y * cm} />
              {b.patas.map((q, j) => <line key={j} x1={q[0] * cm} y1={q[1] * cm} x2={q[2] * cm} y2={q[3] * cm} />)}
              {b.zonas.map((z, j) => <line key={`o${j}`} x1={z[0] * cm} x2={z[1] * cm} y1={b.y * cm + dy} y2={b.y * cm + dy} />)}
            </g>
            {b.zonas.map((z, j) => (
              <g key={`z${j}`}>
                <rect className="sec-traslapo" x={z[0] * cm} y={b.y * cm - 1.6 * b.d * cm + dy / 2} width={(z[1] - z[0]) * cm} height={3.2 * b.d * cm} />
                {j === 0 && <text className="sec-cota" x={((z[0] + z[1]) / 2) * cm} y={b.y * cm + dy * 2.4} fontSize={fs * 0.8} textAnchor="middle">traslapo {(b.lap * 100).toFixed(0)} cm</text>}
              </g>
            ))}
          </g>
        );
      })}
      <text className="sec-cota" x={W / 2} y={H + pad * 0.75} fontSize={fs} textAnchor="middle">
        L = {g.L.toFixed(2)} m · {g.estribos.length} estribos{g.estribos.some((s) => s.zona === "ext") ? ` (${g.estribos.filter((s) => s.zona === "ext").length} en zonas extremas)` : ""}
      </text>
    </svg>
  );
}
