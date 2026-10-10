import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { BARRAS } from "./engine/barras";
import { calcularColumna, geometriaColumna, type EntradaColumna, type GeometriaColumna } from "./engine/columna";
import { formatear } from "./engine/numeros";
import { ErrorDeDatos } from "./engine/tipos";
import { FaltaTraslapo, type ResultadoViga } from "./engine/viga";
import { configAcero } from "./engine/materiales";
import type { Barra } from "./engine/barras";
import { PedirTraslapo } from "./Traslapo";
import { toEntradaColumna, type AceroProyecto, type DatosColumna } from "./modelo";
import { Campo, Fila, Sel } from "./EditorViga";

const Vista3DColumna = lazy(() => import("./Vista3DColumna").then((m) => ({ default: m.Vista3DColumna })));
type Estado = { ok: true; r: ResultadoViga; e: EntradaColumna } | { ok: false; mensaje: string; falta?: Barra };

export function EditorColumna({ titulo, inicial, acero, onCambio, onVolver }: { titulo: string; inicial: DatosColumna; acero: AceroProyecto; onCambio: (d: DatosColumna) => void; onVolver: () => void }) {
  const [v, setV] = useState(inicial.v);
  const set = (k: keyof typeof v) => (x: string) => setV({ ...v, [k]: x });
  const cfg = configAcero(acero.m);
  const est: Estado = useMemo(() => {
    try {
      const entrada = toEntradaColumna({ v });
      return { ok: true, r: calcularColumna(entrada, cfg), e: entrada };
    } catch (x) {
      if (x instanceof ErrorDeDatos) return { ok: false, mensaje: x.message, falta: x instanceof FaltaTraslapo ? x.barra : undefined };
      throw x;
    }
  }, [v, acero.m]);
  useEffect(() => { onCambio({ v }); }, [v]);

  return (
    <main className="app">
      <header className="cabecera">
        <button className="btn" onClick={onVolver}>← Proyecto</button>
        <h1>{titulo}</h1>
        <p>Columna rectangular · se guarda sola en este teléfono</p>
      </header>
      <section className="entradas" aria-label="Geometría">
        <Campo et="Ancho b" u="cm" val={v.b} f={set("b")} />
        <Campo et="Alto h" u="cm" val={v.h} f={set("h")} />
        <Campo et="Altura H" u="m" val={v.H} f={set("H")} />
        <Campo et="Recubrimiento" u="cm" val={v.recub} f={set("recub")} />
        <Campo et="Margen concreto" u="%" val={v.margen} f={set("margen")} />
      </section>
      <section className="entradas" aria-label="Barras longitudinales">
        <Sel et="Diámetro" val={v.barra} f={set("barra")} />
        <Campo et="Barras cara b" u="un" val={v.nb} f={set("nb")} />
        <Campo et="Barras cara h" u="un" val={v.nh} f={set("nh")} />
        <Campo et="Pata en base" u="cm" val={v.pata} f={set("pata")} />
        <Campo et="Espera arriba" u="cm" val={v.espera} f={set("espera")} />
      </section>
      <section className="entradas" aria-label="Estribos y trabas">
        <Sel et="Estribo" val={v.be} f={set("be")} />
        <Campo et="Sep. central" u="cm" val={v.sep} f={set("sep")} />
        <Campo et="Gancho" u="cm" val={v.gancho} f={set("gancho")} />
        <Campo et="Zona extrema" u="cm" val={v.zl} f={set("zl")} />
        <Campo et="Sep. en zona" u="cm" val={v.zs} f={set("zs")} />
        <span />
        <Campo et="Trabas dir. b" u="un" val={v.ntb} f={set("ntb")} />
        <Campo et="Trabas dir. h" u="un" val={v.nth} f={set("nth")} />
        <Campo et="Gancho traba" u="cm" val={v.gtr} f={set("gtr")} />
      </section>

      {est.ok ? (
        <>
          <SeccionC g={geometriaColumna(est.e)} />
          <AlzadoC g={geometriaColumna(est.e, cfg)} />
          <Suspense fallback={<div className="nota">Cargando vista 3D…</div>}><Vista3DColumna e={est.e} acero={cfg} /></Suspense>
          <section className="rotulo" aria-live="polite">
            <Fila t="Concreto geométrico" x={`${formatear(est.r.concreto.valor, 3)} m³`} />
            <Fila t={`Concreto a comprar (+${v.margen}%)`} x={`${formatear(est.r.volumenCompra, 3)} m³`} />
            <Fila t="Formaleta" x={`${formatear(est.r.formaleta.valor, 2)} m²`} />
            {Object.entries(est.r.pesoPorBarra).map(([b, p]) => <Fila key={b} t={`Acero ${b}`} x={`${formatear(p, 1)} kg`} />)}
            <div className="rotulo-fila resultado"><span>Acero total</span><strong>{formatear(est.r.pesoTotal, 1)} kg</strong></div>
          </section>
          <section className="rotulo">
            <div className="rotulo-fila titulo">Despiece</div>
            <table className="tabla">
              <thead><tr><th>Pieza</th><th>Barra</th><th>Cant.</th><th>Corte (m)</th><th>Peso (kg)</th></tr></thead>
              <tbody>
                {est.r.despiece.map((f) => (
                  <tr key={f.id}><td>{f.descripcion}</td><td>{f.barra}</td><td>{f.cantidad}</td>
                    <td>{formatear(f.longCorte, 2)}</td><td>{formatear(f.pesoTotal, 1)}</td></tr>
                ))}
              </tbody>
            </table>
            {est.r.advertencias.map((a) => <div className="nota alerta" key={a}>Atención: {a}</div>)}
          </section>
        </>
      ) : (
        <section className="rotulo"><div className="rotulo-fila error">{est.mensaje}</div>{est.falta && <PedirTraslapo barra={est.falta} acero={acero} />}</section>
      )}
      <footer className="pie">Cálculo geométrico de cantidades. No certifica la seguridad estructural del elemento.</footer>
    </main>
  );
}

function SeccionC({ g }: { g: GeometriaColumna }) {
  const cm = 100, W = g.b * cm, H = g.h * cm, pad = Math.max(W, H) * 0.14, fs = Math.max(W, H) * 0.06, s = g.estribo;
  return (
    <svg className="seccion" viewBox={`${-pad} ${-pad} ${W + 2 * pad} ${H + 2 * pad}`} role="img"
         aria-label={`Sección de ${(g.b * cm).toFixed(0)} por ${(g.h * cm).toFixed(0)} cm con ${g.barras.length} barras`}>
      <rect className="sec-concreto" x={0} y={0} width={W} height={H} />
      <rect className="sec-estribo" x={s.x * cm} y={s.y * cm} width={s.w * cm} height={s.h * cm} rx={g.dE * cm * 2} strokeWidth={g.dE * cm} />
      {g.trabas.map((t, i) => <line key={i} className="sec-estribo" x1={t[0] * cm} y1={t[1] * cm} x2={t[2] * cm} y2={t[3] * cm} strokeWidth={g.dE * cm} />)}
      {g.barras.map((b, i) => <circle key={i} className="sec-barra" cx={b.x * cm} cy={b.y * cm} r={(b.d * cm) / 2} />)}
      <text className="sec-cota" x={W / 2} y={H + pad * 0.7} fontSize={fs} textAnchor="middle">b = {(g.b * cm).toFixed(0)} cm · {g.barras.length} barras</text>
      <text className="sec-cota" fontSize={fs} textAnchor="middle" transform={`translate(${-pad * 0.4} ${H / 2}) rotate(-90)`}>h = {(g.h * cm).toFixed(0)} cm</text>
    </svg>
  );
}

function AlzadoC({ g }: { g: GeometriaColumna }) {
  const cm = 100, W = g.b * cm, T = (g.H + g.espera) * cm, pad = Math.max(W, 40) * 0.35, fs = Math.max(W, 40) * 0.12;
  const ys = (y: number) => T - y * cm; // y desde la base hacia arriba
  const xs = [...new Set(g.barras.map((b) => Math.round(b.x * 1e6) / 1e6))];
  const d = g.barras[0]?.d ?? 0.016;
  return (
    <svg className="seccion alta" viewBox={`${-pad} ${-pad} ${W + 2 * pad} ${T + 2 * pad}`} role="img"
         aria-label={`Alzado de la columna de ${g.H.toFixed(2)} m con ${g.niveles.length} niveles de estribos`}>
      <rect className="sec-concreto" x={0} y={ys(g.H)} width={W} height={g.H * cm} />
      {g.niveles.map((n, i) => (
        <line key={i} className={n.zona === "ext" ? "sec-estribo est-ext" : "sec-estribo"} x1={g.recub * cm} x2={W - g.recub * cm}
              y1={ys(n.y)} y2={ys(n.y)} strokeWidth={g.dE * cm} />
      ))}
      <g className="lon-barra" strokeWidth={d * cm} strokeLinecap="round" fill="none">
        {xs.map((x, i) => {
          const sg = x < g.b / 2 ? 1 : -1; // hacia el centro de la sección
          return (
            <g key={i}>
              <line x1={x * cm} x2={x * cm} y1={ys(0)} y2={ys(g.H + g.espera)} />
              {g.pata > 0 && <line x1={x * cm} y1={ys(0)} x2={x * cm + sg * g.pata * cm} y2={ys(0)} />}
              {g.zonas.map((z, j) => <line key={`o${j}`} x1={x * cm + sg * d * cm * 1.05} x2={x * cm + sg * d * cm * 1.05} y1={ys(z[0])} y2={ys(z[1])} />)}
            </g>
          );
        })}
      </g>
      {xs.map((x, i) => g.zonas.map((z, j) => {
        const sg = x < g.b / 2 ? 1 : -1;
        return (
          <g key={`z${i}-${j}`}>
            <rect className="sec-traslapo" x={x * cm - 1.6 * d * cm + sg * d * cm * 0.5} y={ys(z[1])} width={3.2 * d * cm} height={(z[1] - z[0]) * cm} />
            {i === 0 && j === 0 && <text className="sec-cota" x={W / 2} y={ys(z[1]) - d * cm * 2} fontSize={fs * 0.7} textAnchor="middle">traslapo {(g.lap * 100).toFixed(0)} cm</text>}
          </g>
        );
      }))}
      <text className="sec-cota" x={W / 2} y={T + pad * 0.7} fontSize={fs} textAnchor="middle">H = {g.H.toFixed(2)} m · {g.niveles.length} niveles de estribos</text>
    </svg>
  );
}
