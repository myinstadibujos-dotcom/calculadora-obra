export const num = (x: number, d = 0) => parseFloat(x.toFixed(d)).toString().replace(".", ",");

interface P { x1: number; y1: number; x2: number; y2: number; texto: string; fs: number; lado?: -1 | 1; girar?: boolean; fuera?: boolean }

/** Cota alineada a los ejes: línea con marcas en los extremos y texto. lado −1 = arriba/izquierda, 1 = abajo/derecha. */
export function Cota({ x1, y1, x2, y2, texto, fs, lado = -1, girar = true, fuera = false }: P) {
  const hor = Math.abs(y2 - y1) < 1e-9, t = fs * 0.3, mx = (x1 + x2) / 2, my = (y1 + y2) / 2, off = lado < 0 ? -0.5 * fs : 1.3 * fs;
  let txt;
  if (hor && fuera) txt = <text x={Math.max(x1, x2) + fs * 0.5} y={y1 + fs * 0.35} fontSize={fs} textAnchor="start">{texto}</text>;
  else if (hor) txt = <text x={mx} y={y1 + off} fontSize={fs} textAnchor="middle">{texto}</text>;
  else if (!girar) txt = <text x={x1 + lado * fs * 0.5} y={my + fs * 0.35} fontSize={fs} textAnchor={lado < 0 ? "end" : "start"}>{texto}</text>;
  else txt = <text transform={`translate(${x1 + off} ${my}) rotate(-90)`} fontSize={fs} textAnchor="middle">{texto}</text>;
  return (
    <g className="cota">
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      {hor ? <><line x1={x1} y1={y1 - t} x2={x1} y2={y1 + t} /><line x1={x2} y1={y2 - t} x2={x2} y2={y2 + t} /></>
           : <><line x1={x1 - t} y1={y1} x2={x1 + t} y2={y1} /><line x1={x2 - t} y1={y2} x2={x2 + t} y2={y2} /></>}
      {txt}
    </g>
  );
}
