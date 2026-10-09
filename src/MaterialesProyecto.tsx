import { descargar, type Consolidado } from "./archivo";
import { calcularMateriales, completarMateriales, csvMateriales, type Materiales } from "./engine/materiales";
import { formatear } from "./engine/numeros";
import type { Proyecto } from "./modelo";
import { Campo, Opc } from "./EditorViga";

const DEC: Record<string, number> = { kg: 1, "m³": 3, L: 1, un: 0 };
const dec = (u: string) => (u.startsWith("bultos") ? 0 : DEC[u] ?? 2);

function Texto(p: { et: string; val: string; f: (v: string) => void }) {
  return (
    <label className="campo ancho"><span>{p.et}</span>
      <div><input value={p.val} onChange={(e) => p.f(e.target.value)} /></div>
    </label>
  );
}

/** Cantidades de materiales para todo el proyecto, a partir de parámetros que define el usuario. */
export function MaterialesProyecto({ p, c, cambiar }: { p: Proyecto; c: Consolidado; cambiar: (m: Materiales) => void }) {
  const m = completarMateriales(p.materiales);
  const set = (k: keyof Materiales) => (x: string) => cambiar({ ...m, [k]: x });
  const r = calcularMateriales(m, { concretoGeom: c.concreto, concretoCompra: c.compra, formaleta: c.formaleta, aceroKg: c.aceroTotal });
  const archivo = p.nombre.replace(/[^\w\-]+/g, "_");
  return (
    <details className="rotulo">
      <summary>Materiales y consumos</summary>
      <div className="entradas" style={{ padding: 12 }}>
        <Opc et="Concreto" val={m.tipo} f={set("tipo")} op={[["obra", "Preparado en obra"], ["premezclado", "Premezclado"]]} />
        <Campo et="Desp. acero" u="%" val={m.despAcero} f={set("despAcero")} />
        <Campo et="Desp. materiales" u="%" val={m.despMat} f={set("despMat")} />
        {m.tipo === "obra" && (
          <>
            <Texto et="Nombre de la dosificación" val={m.dosNombre} f={set("dosNombre")} />
            <Texto et="Fuente" val={m.dosFuente} f={set("dosFuente")} />
            <Texto et="Fecha de revisión" val={m.dosFecha} f={set("dosFecha")} />
            <Texto et="Condiciones de uso y observaciones" val={m.dosObs} f={set("dosObs")} />
            <Campo et="Cemento" u="kg/m³" val={m.cemento} f={set("cemento")} />
            <Campo et="Arena" u="m³/m³" val={m.arena} f={set("arena")} />
            <Campo et="Grava" u="m³/m³" val={m.grava} f={set("grava")} />
            <Campo et="Agua" u="L/m³" val={m.agua} f={set("agua")} />
            <Campo et="Bulto cemento" u="kg" val={m.bulto} f={set("bulto")} />
          </>
        )}
        <Campo et="Alambre" u="kg/kg" val={m.alambre} f={set("alambre")} />
        <Campo et="Clavos" u="kg/m²" val={m.clavos} f={set("clavos")} />
        <Campo et="Separadores" u="un/m²" val={m.separadores} f={set("separadores")} />
        <Campo et="Desmoldante" u="L/m²" val={m.desmoldante} f={set("desmoldante")} />
      </div>
      <table className="tabla">
        <thead><tr><th>Material</th><th>Teórico</th><th>Compra</th></tr></thead>
        <tbody>
          {r.lineas.map((l) => (
            <tr key={l.nombre}>
              <td>{l.nombre}</td><td>{formatear(l.teorico, dec(l.unidad))} {l.unidad}</td>
              <td>{l.compra === undefined ? "—" : `${formatear(l.compra, dec(l.unidadCompra ?? l.unidad))} ${l.unidadCompra}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {r.avisos.map((a) => <div className="nota alerta" key={a}>Atención: {a}</div>)}
      <div className="nota">Los consumos solo se calculan donde escribes un factor; ninguno viene de fábrica. El acero de compra usa el desperdicio que indiques; el corte óptimo de barras comerciales aún no está incluido.</div>
      <div className="barra" style={{ padding: 10 }}>
        <button className="btn" onClick={() => descargar(`${archivo}-materiales.csv`, csvMateriales(r), "text/csv;charset=utf-8")}>CSV materiales</button>
      </div>
    </details>
  );
}
