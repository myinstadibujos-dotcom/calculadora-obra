import { useState } from "react";

/** Qué medidas y ayudas se muestran. Se guarda en este dispositivo. */
export interface Opciones {
  generales: boolean; recubrimiento: boolean; barras: boolean; estribos: boolean; ganchos: boolean; traslapos: boolean; mando: boolean;
}
export const OPCIONES_INICIALES: Opciones = { generales: true, recubrimiento: true, barras: true, estribos: true, ganchos: true, traslapos: true, mando: true };
const CLAVE = "calculadora-obra:vista";

function leer(): Opciones {
  try {
    const o = JSON.parse(localStorage.getItem(CLAVE) ?? "{}");
    const r: any = { ...OPCIONES_INICIALES };
    for (const k of Object.keys(OPCIONES_INICIALES)) if (typeof o?.[k] === "boolean") r[k] = o[k];
    return r;
  } catch { return OPCIONES_INICIALES; }
}
export function useOpciones(): [Opciones, (o: Opciones) => void] {
  const [op, setOp] = useState<Opciones>(leer);
  const guardar = (o: Opciones) => { setOp(o); try { localStorage.setItem(CLAVE, JSON.stringify(o)); } catch { /* sin almacenamiento: se usa solo en esta sesión */ } };
  return [op, guardar];
}

const ETIQUETAS: [keyof Opciones, string][] = [
  ["generales", "Dimensiones generales (b, h, L o H)"], ["recubrimiento", "Recubrimiento"],
  ["barras", "Cantidad y diámetro de las barras"], ["estribos", "Estribos: diámetro, separaciones y zonas"],
  ["ganchos", "Ganchos, patas y esperas"], ["traslapos", "Zonas y longitud de traslapo"], ["mando", "Mando de control en pantalla"],
];

export function MenuVista({ op, cambiar }: { op: Opciones; cambiar: (o: Opciones) => void }) {
  return (
    <details className="rotulo menu-vista">
      <summary>Medidas y vista</summary>
      <div className="lista-check">
        {ETIQUETAS.map(([k, t]) => (
          <label key={k} className="check">
            <input type="checkbox" checked={op[k]} onChange={(e) => cambiar({ ...op, [k]: e.target.checked })} /><span>{t}</span>
          </label>
        ))}
        <div className="barra">
          <button className="btn" onClick={() => cambiar({ ...OPCIONES_INICIALES })}>Mostrar todo</button>
          <button className="btn" onClick={() => cambiar({ ...op, generales: false, recubrimiento: false, barras: false, estribos: false, ganchos: false, traslapos: false })}>Ocultar medidas</button>
        </div>
        <p className="pie">Se guarda en este teléfono. En el 3D se muestran las dimensiones generales y el recubrimiento; el resto aparece en las vistas 2D.</p>
      </div>
    </details>
  );
}
