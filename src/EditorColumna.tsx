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
import { Cota, num } from "./Cotas";
import { Vista2D } from "./Vista2D";
import { MenuVista, useOpciones, type Opciones } from "./opciones";
import { Mando } from "./mando";

const Vista3DColumna = lazy(() => import("./Vista3DColumna").then((m) => ({ default: m.Vista3DColumna })));
type Estado = { ok: true; r: ResultadoViga; e: EntradaColumna } | { ok: false; mensaje: string; falta?: Barra };

export function EditorColumna({ titulo, inicial, acero, onCambio, onVolver }: { titulo: string; inicial: DatosColumna; acero: AceroProyecto; onCambio: (d: DatosColumna) => void; onVolver: () => void }) {
  const [v, setV] = useState(inicial.v);
  const set = (k: keyof typeof v) => (x: string) => setV({ ...v, [k]: x });
  const cfg = configAcero(acero.m);
  const [op, setOp] = useOpciones();
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
    <main className="app editor">
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

      <MenuVista op={op} cambiar={setOp} />

      {est.ok ? (
        <>
          <SeccionC g={geometriaColumna(est.e)} op={op} />
          <AlzadoC g={geometriaColumna(est.e, cfg)} op={op} />
          <Suspense fallback={<div className="nota">Cargando vista 3D…</div>}><Vista3DColumna e={est.e} acero={cfg} op={op} /></Suspense>
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
      <Mando visible={op.mando} cambiar={(v) => setOp({ ...op, mando: v })} />
      <footer className="pie">Cálculo geométrico de cantidades. No certifica la seguridad estructural del elemento.</footer>
    </main>
  );
}

function SeccionC({ g, op }: { g: GeometriaColumna; op: Opciones }) {
  const cm = 100, W = g.b * cm, H = g.h * cm, fs = Math.max(W, H) * 0.055, s = g.estribo, r = g.recub * cm;
  return (
    <Vista2D id="sec" nombre="Sección" vb={[-fs * 3.2, -fs * 3, W + fs * 12, H + fs * 8]} etiqueta={`Sección de ${num(W)} por ${num(H)} cm con ${g.barras.length} barras`}>
      <rect className="sec-concreto" x={0} y={0} width={W} height={H} />
      <rect className="sec-estribo" x={s.x * cm} y={s.y * cm} width={s.w * cm} height={s.h * cm} rx={g.dE * cm * 2} strokeWidth={g.dE * cm} />
      {g.trabas.map((t, i) => <line key={i} className="sec-estribo" x1={t[0] * cm} y1={t[1] * cm} x2={t[2] * cm} y2={t[3] * cm} strokeWidth={g.dE * cm} />)}
      {g.barras.map((b, i) => <circle key={i} className="sec-barra" cx={b.x * cm} cy={b.y * cm} r={(b.d * cm) / 2} />)}
      {op.generales && <>
        <Cota x1={0} y1={H + fs * 1.2} x2={W} y2={H + fs * 1.2} texto={`b = ${num(W)} cm`} fs={fs} lado={1} />
        <Cota x1={-fs * 1.2} y1={0} x2={-fs * 1.2} y2={H} texto={`h = ${num(H)} cm`} fs={fs} lado={-1} />
      </>}
      {op.recubrimiento && <Cota x1={W - r} y1={H / 2} x2={W} y2={H / 2} texto={`r = ${num(r, 1)} cm`} fs={fs} fuera />}
      {op.barras && <text className="sec-cota" x={W / 2} y={-fs * 0.8} fontSize={fs} textAnchor="middle">{g.barras.length} {g.barra}</text>}
      {op.estribos && <text className="sec-cota" x={W + fs * 0.8} y={fs * 1.2} fontSize={fs} textAnchor="start">Estribo {g.estriboBarra}{g.trabas.length ? ` + ${g.trabas.length} traba(s)` : ""}</text>}
    </Vista2D>
  );
}

function AlzadoC({ g, op }: { g: GeometriaColumna; op: Opciones }) {
  const cm = 100, W = g.b * cm, T = (g.H + g.espera) * cm, fs = Math.max(W * 0.12, T * 0.03, 4);
  const ys = (y: number) => T - y * cm; // y desde la base hacia arriba
  const xs = [...new Set(g.barras.map((b) => Math.round(b.x * 1e6) / 1e6))];
  const d = g.barras[0]?.d ?? 0.016;
  const ext = g.niveles.filter((n) => n.zona === "ext"), bajo = ext.slice(0, ext.length / 2), alto = ext.slice(ext.length / 2);
  const xz = W + fs * 4.4, zona = (a: number, b: number, t: string) => <Cota x1={xz} y1={ys(a)} x2={xz} y2={ys(b)} texto={t} fs={fs * 0.9} lado={1} />;
  return (
    <Vista2D id="alzado" nombre="Alzado" alta vb={[-fs * 8, -fs * 3, W + fs * 17, T + fs * 9]} etiqueta={`Alzado de la columna de ${g.H.toFixed(2)} m con ${g.niveles.length} niveles de estribos`}>
      <rect className="sec-concreto" x={0} y={ys(g.H)} width={W} height={g.H * cm} />
      {g.niveles.map((n, i) => (
        <line key={i} className={n.zona === "ext" ? "sec-estribo est-ext" : "sec-estribo"} x1={g.recub * cm} x2={W - g.recub * cm} y1={ys(n.y)} y2={ys(n.y)} strokeWidth={g.dE * cm} />
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
      {op.traslapos && xs.map((x, i) => g.zonas.map((z, j) => {
        const sg = x < g.b / 2 ? 1 : -1;
        return (
          <g key={`z${i}-${j}`}>
            <rect className="sec-traslapo" x={x * cm - 1.6 * d * cm + sg * d * cm * 0.5} y={ys(z[1])} width={3.2 * d * cm} height={(z[1] - z[0]) * cm} />
            {i === 0 && j === 0 && <text className="sec-cota" x={W / 2} y={ys(z[1]) - d * cm * 2} fontSize={fs * 0.7} textAnchor="middle">traslapo {num(g.lap * cm, 1)} cm</text>}
          </g>
        );
      }))}
      {op.generales && <>
        <Cota x1={W + fs * 1.2} y1={ys(g.H)} x2={W + fs * 1.2} y2={ys(0)} texto={`H = ${num(g.H, 2)} m`} fs={fs} lado={1} />
        <Cota x1={0} y1={T + fs * 3.6} x2={W} y2={T + fs * 3.6} texto={`b = ${num(W)} cm`} fs={fs} lado={1} />
      </>}
      {op.recubrimiento && <Cota x1={-fs * 1.0} y1={ys(g.H)} x2={-fs * 1.0} y2={ys(g.H - g.recub)} texto={`r = ${num(g.recub * cm, 1)} cm`} fs={fs} lado={-1} girar={false} />}
      {op.ganchos && <>
        {g.espera > 0 && <Cota x1={-fs * 1.0} y1={ys(g.H + g.espera)} x2={-fs * 1.0} y2={ys(g.H)} texto={`espera ${num(g.espera * cm, 1)} cm`} fs={fs} lado={-1} girar={false} />}
        {g.pata > 0 && xs.length > 0 && <Cota x1={xs[0] * cm} y1={T + fs * 1.2} x2={xs[0] * cm + g.pata * cm} y2={T + fs * 1.2} texto={`pata ${num(g.pata * cm, 1)} cm`} fs={fs} lado={1} />}
      </>}
      {op.barras && <text className="sec-cota" x={W / 2} y={-fs * 1.0} fontSize={fs} textAnchor="middle">{g.barras.length} {g.barra}</text>}
      {op.estribos && (ext.length >= 2 ? <>
        {zona(bajo[0].y, bajo[bajo.length - 1].y, `${num(g.sepExt * cm, 1)} cm`)}
        {zona(bajo[bajo.length - 1].y, alto[0].y, `E ${g.estriboBarra} @ ${num(g.sepCen * cm, 1)} cm`)}
        {zona(alto[0].y, alto[alto.length - 1].y, `${num(g.sepExt * cm, 1)} cm`)}
      </> : g.niveles.length > 1 && zona(g.niveles[0].y, g.niveles[g.niveles.length - 1].y, `E ${g.estriboBarra} @ ${num(g.sepCen * cm, 1)} cm`))}
    </Vista2D>
  );
}
