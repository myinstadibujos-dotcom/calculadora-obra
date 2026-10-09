import type { Proyecto } from "./modelo";

// Los proyectos viven solo en este dispositivo (IndexedDB). Nada se envía a servidores.
const BD = "calculadora-obra", TABLA = "proyectos";

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, fallo) => {
    const r = indexedDB.open(BD, 1);
    r.onupgradeneeded = () => { r.result.createObjectStore(TABLA, { keyPath: "id" }); };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => fallo(r.error);
  });
}
async function operar<T>(modo: IDBTransactionMode, f: (t: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const bd = await abrir();
  return new Promise((ok, fallo) => {
    const r = f(bd.transaction(TABLA, modo).objectStore(TABLA));
    r.onsuccess = () => ok(r.result);
    r.onerror = () => fallo(r.error);
  });
}
export const listarProyectos = () => operar<Proyecto[]>("readonly", (t) => t.getAll());
export const guardarProyecto = (p: Proyecto) => operar("readwrite", (t) => t.put(p));
export const borrarProyecto = (id: string) => operar("readwrite", (t) => t.delete(id));
