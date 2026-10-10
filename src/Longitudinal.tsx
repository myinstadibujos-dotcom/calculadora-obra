import { Cota, num } from "./Cotas";
import { geometriaLongitudinal } from "./engine/seccion";
import type { ConfigAcero, EntradaViga } from "./engine/viga";
import type { Opciones } from "./opciones";
import { Vista2D } from "./Vista2D";

/** Alzado a escala con zoom: barras con su diámetro real, ganchos, traslapos, estribos por zonas y medidas. */
export function Longitudinal({ e, acero, op }: { e: EntradaViga; acero?: ConfigAcero; op: Opciones }) {
  const g = geometriaLongitudinal(e, acero);
  const cm = 100, W = g.L * cm, H = g.h * cm, r = e.recub * cm;
  const fs = Math.max(H * 0.18, W * 0.022);
  const ext = g.estribos.filter((s) => s.zona === "ext"), izq = ext.slice(0, ext.length / 2), der = ext.slice(ext.length / 2);
  const zs = (e.estribo.zonaSep ?? 0) * cm, sc = e.estribo.separacion * cm, yz = -fs * 2.8;
  const zona = (a: number, b: number, t: string) => <Cota x1={a * cm} y1={yz} x2={b * cm} y2={yz} texto={t} fs={fs * 0.9} lado={-1} />;
  return (
    <Vista2D id="long" nombre="Vista longitudinal" vb={[-fs * 6.5, -fs * 5, W + fs * 8, H + fs * 9.5]} etiqueta={`Vista longitudinal de ${g.L.toFixed(2)} m con ${g.estribos.length} estribos`}>
      <rect className="sec-concreto" x={0} y={0} width={W} height={H} />
      {g.estribos.map((s, i) => (
        <line key={i} className={s.zona === "ext" ? "sec-estribo est-ext" : "sec-estribo"} x1={s.x * cm} x2={s.x * cm} y1={s.y0 * cm} y2={s.y1 * cm} strokeWidth={s.espesor * cm} />
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
            {op.traslapos && b.zonas.map((z, j) => (
              <g key={`z${j}`}>
                <rect className="sec-traslapo" x={z[0] * cm} y={b.y * cm - 1.6 * b.d * cm + dy / 2} width={(z[1] - z[0]) * cm} height={3.2 * b.d * cm} />
                {j === 0 && <text className="sec-cota" x={((z[0] + z[1]) / 2) * cm} y={b.y * cm + dy * 2.4} fontSize={fs * 0.8} textAnchor="middle">traslapo {num(b.lap * cm, 1)} cm</text>}
              </g>
            ))}
            {op.ganchos && b.patas.map((q, j) => (Math.abs(Math.hypot(q[2] - q[0], q[3] - q[1]) - b.pierna) < 1e-6 && b.pierna > 0) && (
              <text key={`p${j}`} className="sec-cota" x={q[2] * cm} y={q[3] * cm + (b.grupo === "sup" ? fs * 1.1 : -fs * 0.5)} fontSize={fs * 0.8} textAnchor="middle">{num(b.pierna * cm, 1)} cm</text>
            ))}
            {op.barras && <text className="sec-cota" x={-fs * 0.5} y={b.y * cm + fs * 0.35} fontSize={fs * 0.9} textAnchor="end">{b.cantidad} {b.barra}{b.adicional ? " ad." : ""}</text>}
          </g>
        );
      })}
      {op.generales && <>
        <Cota x1={0} y1={H + fs * 1.4} x2={W} y2={H + fs * 1.4} texto={`L = ${num(g.L, 2)} m`} fs={fs} lado={1} />
        <Cota x1={-fs * 4.2} y1={0} x2={-fs * 4.2} y2={H} texto={`h = ${num(H)} cm`} fs={fs} lado={-1} />
      </>}
      {op.recubrimiento && <>
        <line className="cota" x1={0} y1={-fs * 0.2} x2={0} y2={-fs * 1.2} /><line className="cota" x1={r} y1={-fs * 0.2} x2={r} y2={-fs * 1.2} />
        <Cota x1={0} y1={-fs * 1.0} x2={r} y2={-fs * 1.0} texto={`r = ${num(r, 1)} cm`} fs={fs * 0.9} fuera />
      </>}
      {op.estribos && (ext.length >= 2 ? <>
        {zona(izq[0].x, izq[izq.length - 1].x, `${num(zs, 1)} cm`)}
        {zona(izq[izq.length - 1].x, der[0].x, `E ${e.estribo.barra} @ ${num(sc, 1)} cm`)}
        {zona(der[0].x, der[der.length - 1].x, `${num(zs, 1)} cm`)}
      </> : g.estribos.length > 1 && zona(g.estribos[0].x, g.estribos[g.estribos.length - 1].x, `E ${e.estribo.barra} @ ${num(sc, 1)} cm · ${g.estribos.length} un`))}
    </Vista2D>
  );
}
