import { descargar, type Consolidado } from "./archivo";
import { calcularMateriales, completarMateriales, csvMateriales, type Materiales } from "./engine/materiales";
import { aplicarReceta, RECETAS_USUARIO } from "./engine/recetas";
import { formatear } from "./engine/numeros";
import { nuevoId, type Proyecto } from "./modelo";
import { Campo, Opc } from "./EditorViga";

const DEC: Record<string, number> = { kg: 1, "m³": 3, L: 1, un: 0 };
const dec = (u: string) => (u.startsWith("bultos") || u.startsWith("varillas") ? 0 : DEC[u] ?? 2);

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
  const setD = (k: keyof Materiales) => (x: string) => cambiar({ ...m, [k]: x, recetaSel: "custom" }); // editar una receta la vuelve personalizada
  const existe = m.recetaSel.startsWith("mia:") ? m.recetas.some((x) => `mia:${x.id}` === m.recetaSel) : RECETAS_USUARIO.some((x) => x.id === m.recetaSel);
  const sel = m.recetaSel === "custom" || !existe ? "custom" : m.recetaSel;
  const elegir = (v: string) => {
    const rc = v.startsWith("mia:") ? m.recetas.find((x) => `mia:${x.id}` === v) : RECETAS_USUARIO.find((x) => x.id === v);
    cambiar(rc ? aplicarReceta(m, rc, v) : { ...m, recetaSel: "custom" });
  };
  const guardarReceta = () => {
    const nombre = window.prompt("Nombre de tu receta", m.dosNombre || "Mi receta")?.trim();
    if (!nombre) return;
    const id = nuevoId();
    cambiar({ ...m, dosNombre: nombre, recetaSel: `mia:${id}`,
      recetas: [...m.recetas, { id, nombre, cemento: m.cemento, arena: m.arena, grava: m.grava, agua: m.agua, fuente: m.dosFuente || "Receta propia", fecha: m.dosFecha, obs: m.dosObs }] });
  };
  const borrarReceta = () => {
    if (window.confirm("¿Eliminar esta receta guardada? Los datos que ya están en los campos no cambian."))
      cambiar({ ...m, recetaSel: "custom", recetas: m.recetas.filter((x) => `mia:${x.id}` !== m.recetaSel) });
  };
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
            <label className="campo ancho"><span>Receta de dosificación</span>
              <div><select value={sel} onChange={(e) => elegir(e.target.value)}>
                <option value="custom">Personalizada (escribes los valores)</option>
                <optgroup label="Mis recetas habituales">
                  {RECETAS_USUARIO.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
                </optgroup>
                {m.recetas.length > 0 && (
                  <optgroup label="Guardadas en este proyecto">
                    {m.recetas.map((x) => <option key={x.id} value={`mia:${x.id}`}>{x.nombre}</option>)}
                  </optgroup>
                )}
              </select></div></label>
            <Texto et="Nombre de la dosificación" val={m.dosNombre} f={setD("dosNombre")} />
            <Texto et="Fuente" val={m.dosFuente} f={setD("dosFuente")} />
            <Texto et="Fecha de revisión" val={m.dosFecha} f={setD("dosFecha")} />
            <Texto et="Condiciones de uso y observaciones" val={m.dosObs} f={setD("dosObs")} />
            <Campo et="Cemento" u="kg/m³" val={m.cemento} f={setD("cemento")} />
            <Campo et="Arena" u="m³/m³" val={m.arena} f={setD("arena")} />
            <Campo et="Grava" u="m³/m³" val={m.grava} f={setD("grava")} />
            <Campo et="Agua" u="L/m³" val={m.agua} f={setD("agua")} />
            <Campo et="Bulto cemento" u="kg" val={m.bulto} f={set("bulto")} />
            <div className="barra" style={{ gridColumn: "1 / -1" }}>
              <button className="btn" onClick={guardarReceta}>Guardar como mi receta</button>
              {m.recetaSel.startsWith("mia:") && sel !== "custom" && <button className="btn" onClick={borrarReceta}>Eliminar mi receta</button>}
            </div>
          </>
        )}
        {c.plan.length > 0 && <div className="sub"><strong>Acero: cómo se compra</strong></div>}
        {c.plan.map((pl) => {
          const n = pl.barra.slice(1);
          return (
            <div className="item" key={pl.barra}>
              <Opc et={`${pl.barra} · compra`} val={(m as any)[`compra${n}`]} f={set(`compra${n}` as keyof Materiales)}
                op={[["kg", "Por kilos (chipa)"], ["6", "Varilla de 6 m"], ["12", "Varilla de 12 m"]]} />
              <Campo et={`Traslapo ${pl.barra}`} u="cm" val={(m as any)[`lap${n}`] ?? ""} f={set(`lap${n}` as keyof Materiales)} />
              <span />
            </div>
          );
        })}
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
