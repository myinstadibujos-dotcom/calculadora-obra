import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

/** Una vista (2D o 3D) que el mando puede controlar. dx, dy ∈ {-1, 0, 1}; zoom f > 1 acerca. */
export interface Controlador {
  nombre: string; girable?: boolean;
  mover(dx: number, dy: number, modo: "girar" | "mover"): void; zoom(f: number): void; reiniciar(): void;
}

const registro = new Map<string, Controlador>();
let activoId: string | null = null;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((f) => f());
const suscribir = (f: () => void) => { oyentes.add(f); return () => { oyentes.delete(f); }; };

function registrar(id: string, c: Controlador) {
  registro.set(id, c);
  if (!activoId) activoId = id;
  avisar();
  return () => { registro.delete(id); if (activoId === id) activoId = [...registro.keys()][0] ?? null; avisar(); };
}
export function activar(id: string) { if (registro.has(id) && activoId !== id) { activoId = id; avisar(); } }

/** Registra una vista en el mando. Usa siempre el estado más reciente de la vista. */
export function useControlable(id: string, c: Controlador) {
  const ref = useRef(c);
  ref.current = c;
  useEffect(() => registrar(id, {
    get nombre() { return ref.current.nombre; }, get girable() { return ref.current.girable; },
    mover: (dx, dy, m) => ref.current.mover(dx, dy, m), zoom: (f) => ref.current.zoom(f), reiniciar: () => ref.current.reiniciar(),
  }), [id]);
}
export function useMando() {
  useSyncExternalStore(suscribir, () => `${activoId}|${registro.size}`);
  return { id: activoId, ctrl: activoId ? registro.get(activoId) : undefined };
}

function Boton(p: { etiqueta: string; onPulsar: () => void; repetir?: boolean; children: ReactNode }) {
  const t = useRef<number>();
  const parar = () => { window.clearInterval(t.current); t.current = undefined; };
  return (
    <button className="mando-btn" aria-label={p.etiqueta}
      onPointerDown={(e) => { e.preventDefault(); p.onPulsar(); if (p.repetir !== false) t.current = window.setInterval(p.onPulsar, 90); }}
      onPointerUp={parar} onPointerLeave={parar} onPointerCancel={parar}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); p.onPulsar(); } }}>
      {p.children}
    </button>
  );
}

/** Mando en pantalla: flechas, acercar/alejar y reiniciar sobre la vista activa (la última que tocaste). */
export function Mando({ visible, cambiar }: { visible: boolean; cambiar: (v: boolean) => void }) {
  const { ctrl } = useMando();
  const [modo, setModo] = useState<"girar" | "mover">("girar");
  const m = ctrl?.girable ? modo : "mover";
  useEffect(() => { // teclado: flechas, + y -
    if (!visible) return;
    const f = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (!ctrl || /INPUT|SELECT|TEXTAREA/.test(t.tagName)) return;
      const d: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (d[e.key]) { e.preventDefault(); ctrl.mover(d[e.key][0], d[e.key][1], m); }
      else if (e.key === "+" || e.key === "=") ctrl.zoom(1.25);
      else if (e.key === "-") ctrl.zoom(0.8);
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [visible, ctrl, m]);

  if (!ctrl) return null;
  if (!visible) return <button className="mando-fab" onClick={() => cambiar(true)} aria-label="Mostrar mando">Mando</button>;
  return (
    <div className="mando" role="group" aria-label="Mando de control">
      <div className="mando-titulo"><span>{ctrl.nombre}</span><button className="mando-x" aria-label="Ocultar mando" onClick={() => cambiar(false)}>×</button></div>
      <div className="mando-cuerpo">
        <div className="mando-cruz">
          <span /><Boton etiqueta="Arriba" onPulsar={() => ctrl.mover(0, -1, m)}>▲</Boton><span />
          <Boton etiqueta="Izquierda" onPulsar={() => ctrl.mover(-1, 0, m)}>◀</Boton>
          <Boton etiqueta="Reiniciar vista" repetir={false} onPulsar={() => ctrl.reiniciar()}>●</Boton>
          <Boton etiqueta="Derecha" onPulsar={() => ctrl.mover(1, 0, m)}>▶</Boton>
          <span /><Boton etiqueta="Abajo" onPulsar={() => ctrl.mover(0, 1, m)}>▼</Boton><span />
        </div>
        <div className="mando-lado">
          <Boton etiqueta="Acercar" onPulsar={() => ctrl.zoom(1.15)}>＋</Boton>
          <Boton etiqueta="Alejar" onPulsar={() => ctrl.zoom(1 / 1.15)}>－</Boton>
          {ctrl.girable && <button className="mando-modo" onClick={() => setModo(modo === "girar" ? "mover" : "girar")}>{modo === "girar" ? "Girar" : "Mover"}</button>}
        </div>
      </div>
    </div>
  );
}
