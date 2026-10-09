import { useEffect, useMemo, useRef, useState } from "react";
import { borrarProyecto, guardarProyecto, listarProyectos } from "./almacen";
import { consolidar, csvDespiece, descargar, exportarJSON, importarJSON } from "./archivo";
import { ErrorDeDatos } from "./engine/tipos";
import { formatear } from "./engine/numeros";
import { EditorViga } from "./EditorViga";
import { EditorColumna } from "./EditorColumna";
import { ahora, COLUMNA_INICIAL, completar, DATOS_INICIALES, nuevoId, type DatosColumna, type DatosViga, type Elemento, type Proyecto } from "./modelo";

type Vista = { t: "lista" } | { t: "proyecto"; pid: string } | { t: "editor"; pid: string; eid: string };
const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-CO");
const copia = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

export function App() {
  const [proyectos, setProyectos] = useState<Proyecto[] | null>(null);
  const [vista, setVista] = useState<Vista>({ t: "lista" });
  const [aviso, setAviso] = useState("");
  const ref = useRef<Proyecto[]>([]);
  const temporizador = useRef<number>();
  ref.current = proyectos ?? [];

  useEffect(() => {
    navigator.storage?.persist?.(); // pide al navegador no borrar los datos por falta de espacio
    listarProyectos().then((l) => l.map((p) => ({ ...p, elementos: p.elementos.map((e) => (e.tipo === "viga" ? { ...e, datos: completar(e.datos) } : e)) }))).then((l) => setProyectos(l.sort((a, b) => b.actualizado.localeCompare(a.actualizado))))
      .catch(() => { setProyectos([]); setAviso("No se pudo abrir el almacenamiento local de este navegador."); });
  }, []);

  /** Actualiza un proyecto en pantalla y lo guarda; nunca borra otros datos. */
  const guardar = (p: Proyecto) => {
    p = { ...p, actualizado: ahora() };
    setProyectos(ref.current.some((x) => x.id === p.id) ? ref.current.map((x) => (x.id === p.id ? p : x)) : [p, ...ref.current]);
    guardarProyecto(p).catch(() => setAviso("No se pudo guardar. Exporta una copia JSON por seguridad."));
  };
  const proyecto = (id: string) => ref.current.find((p) => p.id === id);

  const nuevoProyecto = () => {
    const nombre = window.prompt("Nombre del proyecto", "Vivienda unifamiliar")?.trim();
    if (!nombre) return;
    const t = ahora();
    const p: Proyecto = { id: nuevoId(), nombre, creado: t, actualizado: t, elementos: [] };
    guardar(p); setVista({ t: "proyecto", pid: p.id });
  };
  const codigoNuevo = (p: Proyecto, tipo: Elemento["tipo"]) => {
    const pre = tipo === "viga" ? "V" : "C";
    let i = p.elementos.filter((e) => e.tipo === tipo).length + 1, c = "";
    do { c = `${pre}-${String(i++).padStart(2, "0")}`; } while (p.elementos.some((e) => e.codigo === c));
    return c;
  };
  const agregar = (p: Proyecto, tipo: Elemento["tipo"], datos: DatosViga | DatosColumna) => {
    const t = ahora();
    const e = { id: nuevoId(), tipo, codigo: codigoNuevo(p, tipo), datos: copia(datos), creado: t, actualizado: t } as Elemento;
    guardar({ ...p, elementos: [...p.elementos, e] });
    return e;
  };
  const cambiarDatos = (pid: string, eid: string, datos: DatosViga | DatosColumna) => {
    window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => {
      const p = proyecto(pid), e = p?.elementos.find((x) => x.id === eid);
      if (!p || !e || JSON.stringify(e.datos) === JSON.stringify(datos)) return; // abrir no modifica la fecha
      guardar({ ...p, elementos: p.elementos.map((x) => (x.id === eid ? { ...x, datos, actualizado: ahora() } as Elemento : x)) });
    }, 600);
  };
  const importar = async (f?: File) => {
    if (!f) return;
    try { const p = importarJSON(await f.text()); guardar(p); setAviso(`Importado como "${p.nombre}".`); }
    catch (x) { setAviso(x instanceof ErrorDeDatos ? x.message : "No se pudo leer el archivo."); }
  };

  if (proyectos === null) return <main className="app"><p className="pie">Abriendo tus proyectos…</p></main>;

  if (vista.t === "editor") {
    const p = proyecto(vista.pid), e = p?.elementos.find((x) => x.id === vista.eid);
    if (p && e && e.tipo === "viga")
      return <EditorViga key={e.id} titulo={e.codigo} inicial={e.datos}
        onCambio={(d) => cambiarDatos(p.id, e.id, d)} onVolver={() => setVista({ t: "proyecto", pid: p.id })} />;
    if (p && e && e.tipo === "columna")
      return <EditorColumna key={e.id} titulo={e.codigo} inicial={e.datos}
        onCambio={(d) => cambiarDatos(p.id, e.id, d)} onVolver={() => setVista({ t: "proyecto", pid: p.id })} />;
  }

  if (vista.t === "proyecto") {
    const p = proyecto(vista.pid);
    if (p) return <PantallaProyecto p={p} aviso={aviso} setAviso={setAviso}
      volver={() => setVista({ t: "lista" })}
      abrir={(eid) => setVista({ t: "editor", pid: p.id, eid })}
      nuevo={(tipo) => { const e = agregar(p, tipo, tipo === "viga" ? DATOS_INICIALES : COLUMNA_INICIAL); setVista({ t: "editor", pid: p.id, eid: e.id }); }}
      duplicar={(e) => agregar(p, e.tipo, e.datos)}
      renombrar={(e) => { const c = window.prompt("Código del elemento", e.codigo)?.trim(); if (c) guardar({ ...p, elementos: p.elementos.map((x) => (x.id === e.id ? { ...x, codigo: c, actualizado: ahora() } : x)) }); }}
      eliminar={(e) => { if (window.confirm(`¿Eliminar ${e.codigo}? No se puede deshacer.`)) guardar({ ...p, elementos: p.elementos.filter((x) => x.id !== e.id) }); }}
      renombrarProyecto={() => { const n = window.prompt("Nombre del proyecto", p.nombre)?.trim(); if (n) guardar({ ...p, nombre: n }); }} />;
  }

  return (
    <main className="app">
      <header className="cabecera"><h1>Calculadora de obra</h1><p>Tus proyectos se guardan solo en este teléfono</p></header>
      {aviso && <div className="nota alerta" onClick={() => setAviso("")}>{aviso}</div>}
      <div className="barra">
        <button className="btn principal" onClick={nuevoProyecto}>+ Nuevo proyecto</button>
        <label className="btn">Importar copia<input type="file" accept=".json,application/json" hidden onChange={(e) => { importar(e.target.files?.[0]); e.target.value = ""; }} /></label>
      </div>
      {proyectos.length === 0 ? (
        <section className="vacio"><strong>Aún no tienes proyectos</strong><p>Crea uno para guardar tus vigas y ver las cantidades de toda la obra juntas.</p></section>
      ) : proyectos.map((p) => (
        <section className="rotulo" key={p.id}>
          <div className="rotulo-fila"><strong>{p.nombre}</strong><span>{p.elementos.length} elementos · {fecha(p.actualizado)}</span></div>
          <div className="barra" style={{ padding: 10 }}>
            <button className="btn" onClick={() => setVista({ t: "proyecto", pid: p.id })}>Abrir</button>
            <button className="btn" onClick={() => { if (window.confirm(`¿Eliminar el proyecto "${p.nombre}" y todos sus elementos? Se recomienda exportar una copia antes.`)) { borrarProyecto(p.id); setProyectos(proyectos.filter((x) => x.id !== p.id)); } }}>Eliminar</button>
          </div>
        </section>
      ))}
    </main>
  );
}

function PantallaProyecto(props: {
  p: Proyecto; aviso: string; setAviso: (s: string) => void; volver: () => void; abrir: (id: string) => void; nuevo: (tipo: Elemento["tipo"]) => void;
  duplicar: (e: Elemento) => void; renombrar: (e: Elemento) => void; eliminar: (e: Elemento) => void; renombrarProyecto: () => void;
}) {
  const { p } = props;
  const c = useMemo(() => consolidar(p), [p]);
  const nombreArchivo = p.nombre.replace(/[^\w\-]+/g, "_");
  return (
    <main className="app">
      <header className="cabecera">
        <button className="btn" onClick={props.volver}>← Proyectos</button>
        <h1 onClick={props.renombrarProyecto}>{p.nombre}</h1><p>Toca el nombre para cambiarlo</p>
      </header>
      {props.aviso && <div className="nota alerta" onClick={() => props.setAviso("")}>{props.aviso}</div>}
      <div className="barra">
        <button className="btn principal" onClick={() => props.nuevo("viga")}>+ Viga</button>
        <button className="btn principal" onClick={() => props.nuevo("columna")}>+ Columna</button>
        <button className="btn" disabled={!p.elementos.length} onClick={() => descargar(`${nombreArchivo}-despiece.csv`, csvDespiece(p), "text/csv;charset=utf-8")}>CSV</button>
        <button className="btn" onClick={() => descargar(`${nombreArchivo}.json`, exportarJSON(p), "application/json")}>Copia JSON</button>
      </div>
      {p.elementos.length === 0 ? (
        <section className="vacio"><strong>Este proyecto no tiene elementos</strong><p>Agrega una viga o una columna para empezar. Después podrás duplicarla y cambiar solo lo necesario.</p></section>
      ) : (
        <>
          {p.elementos.map((e, i) => {
            const f = c.filas[i];
            return (
              <section className="rotulo" key={e.id}>
                <div className="rotulo-fila"><strong>{e.codigo}</strong>
                  <span>{f.r ? `${formatear(f.r.concreto.valor, 3)} m³ · ${formatear(f.r.pesoTotal, 1)} kg` : "revisar datos"}</span></div>
                {f.error && <div className="nota alerta">{f.error}</div>}
                <div className="barra" style={{ padding: 10 }}>
                  <button className="btn" onClick={() => props.abrir(e.id)}>Abrir</button>
                  <button className="btn" onClick={() => props.duplicar(e)}>Duplicar</button>
                  <button className="btn" onClick={() => props.renombrar(e)}>Código</button>
                  <button className="btn" onClick={() => props.eliminar(e)}>Eliminar</button>
                </div>
              </section>
            );
          })}
          <section className="rotulo">
            <div className="rotulo-fila titulo">Consolidado del proyecto</div>
            <div className="rotulo-fila"><span>Concreto geométrico</span><strong>{formatear(c.concreto, 3)} m³</strong></div>
            <div className="rotulo-fila"><span>Concreto a comprar</span><strong>{formatear(c.compra, 3)} m³</strong></div>
            <div className="rotulo-fila"><span>Formaleta</span><strong>{formatear(c.formaleta, 2)} m²</strong></div>
            {Object.entries(c.acero).sort().map(([b, w]) => <div className="rotulo-fila" key={b}><span>Acero {b}</span><strong>{formatear(w, 1)} kg</strong></div>)}
            <div className="rotulo-fila resultado"><span>Acero total</span><strong>{formatear(c.aceroTotal, 1)} kg</strong></div>
            {c.filas.some((f) => f.error) && <div className="nota alerta">Los elementos con datos por revisar no están incluidos en estas sumas.</div>}
          </section>
        </>
      )}
      <footer className="pie">Cálculo geométrico de cantidades. No certifica la seguridad estructural de los elementos.</footer>
    </main>
  );
}
