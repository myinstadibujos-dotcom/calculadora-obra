import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { BARRAS, Barra } from "./engine/barras";
import { ErrorDeDatos } from "./engine/tipos";
import { calcularViga, EntradaViga, ResultadoViga } from "./engine/viga";
import { Seccion } from "./Seccion";
import { Ad, DatosViga, toEntrada } from "./modelo";
import { Longitudinal } from "./Longitudinal";
import { formatear, leerNumero as n } from "./engine/numeros";

const Vista3D = lazy(() => import("./Vista3D").then((m) => ({ default: m.Vista3D })));

type Estado = { ok: true; r: ResultadoViga; e: EntradaViga } | { ok: false; mensaje: string };

export function EditorViga({ titulo, inicial, onCambio, onVolver }: { titulo: string; inicial: DatosViga; onCambio: (d: DatosViga) => void; onVolver: () => void }) {
  const [v, setV] = useState(inicial.v);
  const [ad, setAd] = useState<Ad[]>(inicial.ad);
  const setA = (i: number, k: keyof Ad, x: string) => setAd(ad.map((a, j) => (j === i ? { ...a, [k]: x } : a)));
  const set = (k: keyof typeof v) => (x: string) => setV({ ...v, [k]: x });

  const est: Estado = useMemo(() => {
    try {
      const entrada = toEntrada({ v, ad });
      return { ok: true, r: calcularViga(entrada), e: entrada };
    } catch (e) {
      if (e instanceof ErrorDeDatos) return { ok: false, mensaje: e.message };
      throw e;
    }
  }, [v, ad]);
  useEffect(() => { onCambio({ v, ad }); }, [v, ad]);

  return (
    <main className="app">
      <header className="cabecera">
        <button className="btn" onClick={onVolver}>← Proyecto</button>
        <h1>{titulo}</h1>
        <p>Viga de concreto · se guarda sola en este teléfono</p>
      </header>
      <section className="entradas" aria-label="Geometría">
        <Campo et="Ancho b" u="cm" val={v.b} f={set("b")} />
        <Campo et="Altura h" u="cm" val={v.h} f={set("h")} />
        <Campo et="Longitud L" u="m" val={v.L} f={set("L")} />
        <Campo et="Recubrimiento" u="cm" val={v.recub} f={set("recub")} />
        <Campo et="Margen concreto" u="%" val={v.margen} f={set("margen")} />
      </section>
      <section className="entradas" aria-label="Refuerzo">
        <Campo et="Barras sup." u="un" val={v.ns} f={set("ns")} />
        <Sel et="Diámetro" val={v.bs} f={set("bs")} />
        <span />
        <Opc et="Ganchos" val={v.ges} f={set("ges")} op={EXT} />
        <Opc et="Tipo" val={v.gts} f={set("gts")} op={TIPO} />
        <Campo et="Pierna" u="cm" val={v.gls} f={set("gls")} />
        <Campo et="Barras inf." u="un" val={v.ni} f={set("ni")} />
        <Sel et="Diámetro" val={v.bi} f={set("bi")} />
        <span />
        <Opc et="Ganchos" val={v.gei} f={set("gei")} op={EXT} />
        <Opc et="Tipo" val={v.gti} f={set("gti")} op={TIPO} />
        <Campo et="Pierna" u="cm" val={v.gli} f={set("gli")} />
        <Sel et="Estribo" val={v.be} f={set("be")} />
        <Campo et="Sep. central" u="cm" val={v.sep} f={set("sep")} />
        <Campo et="Gancho" u="cm" val={v.gancho} f={set("gancho")} />
        <Campo et="Zona extrema" u="cm" val={v.zl} f={set("zl")} />
        <Campo et="Sep. en zona" u="cm" val={v.zs} f={set("zs")} />
      </section>

      <section className="entradas" aria-label="Refuerzo adicional">
        <div className="sub"><strong>Refuerzo adicional</strong>
          <button className="btn" onClick={() => setAd([...ad, { grupo: "sup", cant: "2", barra: "#5", desde: "0", long: "100", ge: "ninguno", gt: "90", gl: "0" }])}>+ Agregar</button></div>
        <Campo et="Sep. entre capas" u="cm" val={v.sepc} f={set("sepc")} />
        {ad.map((a, i) => (
          <div className="item" key={i}>
            <label className="campo"><span>Ubicación</span><div>
              <select value={a.grupo} onChange={(e) => setA(i, "grupo", e.target.value)}><option value="sup">Superior</option><option value="inf">Inferior</option></select></div></label>
            <Campo et="Cantidad" u="un" val={a.cant} f={(x) => setA(i, "cant", x)} />
            <Sel et="Diámetro" val={a.barra} f={(x) => setA(i, "barra", x)} />
            <Campo et="Desde" u="cm" val={a.desde} f={(x) => setA(i, "desde", x)} />
            <Campo et="Longitud" u="cm" val={a.long} f={(x) => setA(i, "long", x)} />
            <Opc et="Ganchos" val={a.ge} f={(x) => setA(i, "ge", x)} op={EXT} />
            <Opc et="Tipo" val={a.gt} f={(x) => setA(i, "gt", x)} op={TIPO} />
            <Campo et="Pierna" u="cm" val={a.gl} f={(x) => setA(i, "gl", x)} />
            <button className="btn" onClick={() => setAd(ad.filter((_, j) => j !== i))}>Quitar</button>
          </div>
        ))}
      </section>

      {est.ok ? (
        <>
          <Seccion e={est.e} />
          <Longitudinal e={est.e} />
          <Suspense fallback={<div className="nota">Cargando vista 3D…</div>}><Vista3D e={est.e} /></Suspense>
          <section className="rotulo" aria-live="polite">
            <Fila t="Concreto geométrico" x={`${formatear(est.r.concreto.valor, 3)} m³`} />
            <Fila t={`Concreto a comprar (+${v.margen}%)`} x={`${formatear(est.r.volumenCompra, 3)} m³`} />
            <Fila t="Formaleta" x={`${formatear(est.r.formaleta.valor, 2)} m²`} />
            {Object.entries(est.r.pesoPorBarra).map(([b, p]) => (
              <Fila key={b} t={`Acero ${b}`} x={`${formatear(p, 1)} kg`} />
            ))}
            <div className="rotulo-fila resultado"><span>Acero total</span><strong>{formatear(est.r.pesoTotal, 1)} kg</strong></div>
          </section>
          <section className="rotulo">
            <div className="rotulo-fila titulo">Despiece</div>
            <table className="tabla">
              <thead><tr><th>Pieza</th><th>Barra</th><th>Cant.</th><th>Corte (m)</th><th>Peso (kg)</th></tr></thead>
              <tbody>
                {est.r.despiece.map((f) => (
                  <tr key={f.id}>
                    <td>{f.descripcion}</td><td>{f.barra}</td><td>{f.cantidad}</td>
                    <td>{formatear(f.longCorte, 2)}</td><td>{formatear(f.pesoTotal, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {est.r.advertencias.map((a) => <div className="nota alerta" key={a}>Atención: {a}</div>)}
          </section>
        </>
      ) : (
        <section className="rotulo"><div className="rotulo-fila error">{est.mensaje}</div></section>
      )}
      <footer className="pie">Cálculo geométrico de cantidades. No certifica la seguridad estructural del elemento.</footer>
    </main>
  );
}

export const Fila = (p: { t: string; x: string }) => <div className="rotulo-fila"><span>{p.t}</span><strong>{p.x}</strong></div>;

export function Campo(p: { et: string; u: string; val: string; f: (v: string) => void }) {
  return (
    <label className="campo"><span>{p.et}</span>
      <div><input inputMode="decimal" value={p.val} onChange={(e) => p.f(e.target.value)} /><em>{p.u}</em></div>
    </label>
  );
}
export function Sel(p: { et: string; val: string; f: (v: string) => void }) {
  return (
    <label className="campo"><span>{p.et}</span>
      <div><select value={p.val} onChange={(e) => p.f(e.target.value)}>{BARRAS.map((b) => <option key={b}>{b}</option>)}</select></div>
    </label>
  );
}

const EXT: [string, string][] = [["ninguno", "Sin gancho"], ["ambos", "Ambos extremos"], ["izq", "Extremo izq."], ["der", "Extremo der."]];
const TIPO: [string, string][] = [["90", "90°"], ["135", "135°"], ["180", "180°"]];
function Opc(p: { et: string; val: string; f: (v: string) => void; op: [string, string][] }) {
  return (
    <label className="campo"><span>{p.et}</span>
      <div><select value={p.val} onChange={(e) => p.f(e.target.value)}>{p.op.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></div>
    </label>
  );
}
