import { useMemo, useState } from "react";
import { ErrorDeDatos, ResultadoCalculo } from "./engine/tipos";
import { volumenPrisma } from "./engine/volumen";
import { formatear, leerNumero } from "./engine/numeros";

type Calculo = { ok: true; r: ResultadoCalculo } | { ok: false; mensaje: string };

export function App() {
  const [b, setB] = useState("0,30");
  const [h, setH] = useState("0,40");
  const [L, setL] = useState("4,00");

  const calculo: Calculo = useMemo(() => {
    try {
      return { ok: true, r: volumenPrisma(leerNumero(b), leerNumero(h), leerNumero(L)) };
    } catch (e) {
      if (e instanceof ErrorDeDatos) return { ok: false, mensaje: e.message };
      throw e;
    }
  }, [b, h, L]);

  return (
    <main className="app">
      <header className="cabecera">
        <h1>Calculadora de obra</h1>
        <p>Versión base · funciona sin conexión</p>
      </header>

      <section className="entradas" aria-label="Dimensiones">
        <Campo etiqueta="Ancho b" valor={b} onCambio={setB} />
        <Campo etiqueta="Altura h" valor={h} onCambio={setH} />
        <Campo etiqueta="Longitud L" valor={L} onCambio={setL} />
      </section>

      <section className="rotulo" aria-live="polite">
        {calculo.ok ? (
          <>
            <div className="rotulo-fila titulo">{calculo.r.nombre}</div>
            <div className="rotulo-fila">
              <span>Fórmula</span>
              <strong>{calculo.r.formula}</strong>
            </div>
            {calculo.r.entradas.map((e) => (
              <div className="rotulo-fila" key={e.nombre}>
                <span>{e.nombre}</span>
                <strong>
                  {formatear(e.valor, 2)} {e.unidad}
                </strong>
              </div>
            ))}
            <div className="rotulo-fila resultado">
              <span>Resultado</span>
              <strong>
                {formatear(calculo.r.valor, calculo.r.decimalesPresentacion)} {calculo.r.unidad}
              </strong>
            </div>
            {calculo.r.supuestos.map((s) => (
              <div className="nota" key={s}>
                Supuesto: {s}
              </div>
            ))}
            {calculo.r.advertencias.map((a) => (
              <div className="nota alerta" key={a}>
                Atención: {a}
              </div>
            ))}
          </>
        ) : (
          <div className="rotulo-fila error">{calculo.mensaje}</div>
        )}
      </section>

      <footer className="pie">
        Cálculo geométrico de cantidades. No certifica la seguridad estructural del elemento.
      </footer>
    </main>
  );
}

function Campo(props: { etiqueta: string; valor: string; onCambio: (v: string) => void }) {
  return (
    <label className="campo">
      <span>{props.etiqueta}</span>
      <div>
        <input
          inputMode="decimal"
          value={props.valor}
          onChange={(e) => props.onCambio(e.target.value)}
        />
        <em>m</em>
      </div>
    </label>
  );
}
