import { useEffect, useRef, useState, type ReactNode } from "react";
import { activar, useControlable, useMando } from "./mando";

interface Estado { z: number; cx: number; cy: number }
interface Props { id: string; nombre: string; vb: [number, number, number, number]; etiqueta: string; alta?: boolean; children: ReactNode }

/** Vista SVG con zoom y desplazamiento: gestos (pellizco y arrastre), Ctrl + rueda, o el mando. */
export function Vista2D({ id, nombre, vb, etiqueta, alta, children }: Props) {
  const [vx, vy, vw, vh] = vb;
  const [v, setV] = useState<Estado>({ z: 1, cx: vx + vw / 2, cy: vy + vh / 2 });
  const vbRef = useRef(vb);
  vbRef.current = vb;
  const ref = useRef<SVGSVGElement>(null);
  const punteros = useRef(new Map<number, { x: number; y: number }>());

  const limitar = (s: Estado): Estado => { // la vista nunca se sale del dibujo
    const [x, y, w, h] = vbRef.current;
    const z = Math.min(40, Math.max(1, s.z)), ww = w / z, hh = h / z;
    return { z, cx: Math.min(x + w - ww / 2, Math.max(x + ww / 2, s.cx)), cy: Math.min(y + h - hh / 2, Math.max(y + hh / 2, s.cy)) };
  };
  useControlable(id, {
    nombre,
    mover: (dx, dy) => setV((s) => { const [, , w, h] = vbRef.current; return limitar({ ...s, cx: s.cx + dx * 0.2 * (w / s.z), cy: s.cy + dy * 0.2 * (h / s.z) }); }),
    zoom: (f) => setV((s) => limitar({ ...s, z: s.z * f })),
    reiniciar: () => setV({ z: 1, cx: vbRef.current[0] + vbRef.current[2] / 2, cy: vbRef.current[1] + vbRef.current[3] / 2 }),
  });
  const { id: activoId } = useMando();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const f = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return; // sin Ctrl, la rueda sigue desplazando la página
      e.preventDefault();
      setV((s) => limitar({ ...s, z: s.z * (e.deltaY < 0 ? 1.2 : 1 / 1.2) }));
    };
    el.addEventListener("wheel", f, { passive: false });
    return () => el.removeEventListener("wheel", f);
  }, []);

  const c = limitar(v), w = vw / c.z, h = vh / c.z;
  const alMover = (e: React.PointerEvent) => {
    const prev = punteros.current.get(e.pointerId);
    if (!prev) return;
    const ahora = { x: e.clientX, y: e.clientY };
    if (punteros.current.size === 2) {
      const otro = [...punteros.current.entries()].find(([k]) => k !== e.pointerId)![1];
      const d0 = Math.hypot(prev.x - otro.x, prev.y - otro.y), d1 = Math.hypot(ahora.x - otro.x, ahora.y - otro.y);
      if (d0 > 0) setV((s) => limitar({ ...s, z: s.z * (d1 / d0) }));
    } else if (c.z > 1.01 && ref.current) {
      const r = ref.current.getBoundingClientRect(), k = Math.min(r.width / w, r.height / h);
      setV((s) => limitar({ ...s, cx: s.cx - (ahora.x - prev.x) / k, cy: s.cy - (ahora.y - prev.y) / k }));
    }
    punteros.current.set(e.pointerId, ahora);
  };
  const soltar = (e: React.PointerEvent) => { punteros.current.delete(e.pointerId); };

  return (
    <div className="vista2d">
      <svg ref={ref} className={`seccion${alta ? " alta" : ""}${activoId === id ? " activa" : ""}`}
        viewBox={`${c.cx - w / 2} ${c.cy - h / 2} ${w} ${h}`} role="img" aria-label={etiqueta}
        style={{ touchAction: c.z > 1.01 || vw / vh > 3 ? "none" : "pan-y" }}
        onPointerDown={(e) => { activar(id); punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); (e.currentTarget as Element).setPointerCapture?.(e.pointerId); }}
        onPointerMove={alMover} onPointerUp={soltar} onPointerCancel={soltar}>
        {children}
      </svg>
      <span className="chip-vista">{nombre}{c.z > 1.01 ? ` · ×${c.z.toFixed(1).replace(".", ",")}` : ""}</span>
    </div>
  );
}
