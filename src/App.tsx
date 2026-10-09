import { useMemo, useState } from "react";
import { BARRAS, Barra } from "./engine/barras";
import { ErrorDeDatos } from "./engine/tipos";
import { calcularViga, EntradaViga, ResultadoViga } from "./engine/viga";
import { Seccion } from "./Seccion";
import { formatear, leerNumero as n } from "./engine/numeros";

type Estado = { ok: true; r: ResultadoViga; e: EntradaViga } | { ok: false; mensaje: string };

export function App() {
  const [v, setV] = useState({
    b: "30", h: "40", L: "4,00", recub: "4", ns: "2", bs: "#4" as Barra, ni: "3", bi: "#5" as Barra,
    be: "#3" as Barra, sep: "15", gancho: "0", margen: "5",
  });
  const set = (k: keyof typeof v) => (x: string) => setV({ ...v, [k]: x });

  const est: Estado = useMemo(() => {
    try {
      const cm = (s: string) => n(s) / 100;
      const entrada: EntradaViga = {
        b: cm(v.b), h: cm(v.h), L: n(v.L), recub: cm(v.recub),
        sup: { cantidad: n(v.ns), barra: v.bs }, inf: { cantidad: n(v.ni), barra: v.bi },
        estribo: { barra: v.be, separacion: cm(v.sep), gancho: cm(v.gancho) },
        margenConcretoPct: n(v.margen),
      };
      return { ok: true, r: calcularViga(entrada), e: entrada };
    } catch (e) {
      if (e instanceof ErrorDeDatos) return { ok: false, mensaje: e.message };
      throw e;
    }
  }, [v]);

  return (
    <main className="app">
      <header className="cabecera">
        <h1>Viga de concreto</h1>
        <p>Cantidades geométricas · sin conexión</p>
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
        <Campo et="Barras inf." u="un" val={v.ni} f={set("ni")} />
        <Sel et="Diámetro" val={v.bi} f={set("bi")} />
        <span />
        <Sel et="Estribo" val={v.be} f={set("be")} />
        <Campo et="Separación" u="cm" val={v.sep} f={set("sep")} />
        <Campo et="Gancho" u="cm" val={v.gancho} f={set("gancho")} />
      </section>

      {est.ok ? (
        <>
          <Seccion e={est.e} />
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

const Fila = (p: { t: string; x: string }) => <div className="rotulo-fila"><span>{p.t}</span><strong>{p.x}</strong></div>;

function Campo(p: { et: string; u: string; val: string; f: (v: string) => void }) {
  return (
    <label className="campo"><span>{p.et}</span>
      <div><input inputMode="decimal" value={p.val} onChange={(e) => p.f(e.target.value)} /><em>{p.u}</em></div>
    </label>
  );
}
function Sel(p: { et: string; val: string; f: (v: string) => void }) {
  return (
    <label className="campo"><span>{p.et}</span>
      <div><select value={p.val} onChange={(e) => p.f(e.target.value)}>{BARRAS.map((b) => <option key={b}>{b}</option>)}</select></div>
    </label>
  );
}
