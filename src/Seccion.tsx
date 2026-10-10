import { Cota, num } from "./Cotas";
import { geometriaSeccion } from "./engine/seccion";
import type { EntradaViga } from "./engine/viga";
import type { Opciones } from "./opciones";
import { Vista2D } from "./Vista2D";

/** Sección transversal a escala, generada desde los mismos datos del cálculo. */
export function Seccion({ e, op }: { e: EntradaViga; op: Opciones }) {
  const g = geometriaSeccion(e);
  const cm = 100, W = g.b * cm, H = g.h * cm, fs = Math.max(W, H) * 0.055, s = g.estribo, r = e.recub * cm;
  const ads = (e.adicionales ?? []).filter((a) => a.cantidad > 0);
  const rot = (grupo: "sup" | "inf", p: typeof e.sup) =>
    [p.cantidad > 0 ? `${p.cantidad} ${p.barra}` : "", ...ads.filter((a) => a.grupo === grupo).map((a) => `+ ${a.cantidad} ${a.barra}`)].filter(Boolean).join("  ");
  return (
    <Vista2D id="sec" nombre="Sección" vb={[-fs * 3.2, -fs * 3, W + fs * 10.2, H + fs * 8]} etiqueta={`Sección de ${num(W)} por ${num(H)} cm`}>
      <rect className="sec-concreto" x={0} y={0} width={W} height={H} />
      <rect className="sec-estribo" x={s.x * cm} y={s.y * cm} width={s.w * cm} height={s.h * cm} rx={s.espesor * cm * 2} strokeWidth={s.espesor * cm} />
      {g.barras.map((b, i) => <circle key={i} className={b.adicional ? "sec-barra sec-ad" : "sec-barra"} cx={b.x * cm} cy={b.y * cm} r={(b.d * cm) / 2} />)}
      {op.generales && <>
        <Cota x1={0} y1={H + fs * 1.2} x2={W} y2={H + fs * 1.2} texto={`b = ${num(W)} cm`} fs={fs} lado={1} />
        <Cota x1={-fs * 1.2} y1={0} x2={-fs * 1.2} y2={H} texto={`h = ${num(H)} cm`} fs={fs} lado={-1} />
      </>}
      {op.recubrimiento && <Cota x1={W - r} y1={H / 2} x2={W} y2={H / 2} texto={`r = ${num(r, 1)} cm`} fs={fs} fuera />}
      {op.barras && <>
        {rot("sup", e.sup) && <text className="sec-cota" x={W / 2} y={-fs * 0.8} fontSize={fs} textAnchor="middle">Arriba: {rot("sup", e.sup)}</text>}
        {rot("inf", e.inf) && <text className="sec-cota" x={W / 2} y={H + fs * 3.9} fontSize={fs} textAnchor="middle">Abajo: {rot("inf", e.inf)}</text>}
      </>}
      {op.estribos && <text className="sec-cota" x={W + fs * 0.8} y={fs * 1.2} fontSize={fs} textAnchor="start">Estribo {e.estribo.barra}</text>}
    </Vista2D>
  );
}
