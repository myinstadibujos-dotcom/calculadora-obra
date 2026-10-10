import * as THREE from "three";
import { cilindro, colorCss, cota3D, Lienzo3D, type Modo3D } from "./Lienzo3D";
import { diametroMm } from "./engine/barras";
import { num } from "./Cotas";
import { geometriaLongitudinal, geometriaSeccion } from "./engine/seccion";
import { patasDeGancho, varilla, zonasTraslapo, type ConfigAcero, type EntradaViga } from "./engine/viga";
import type { Opciones } from "./opciones";

interface Datos { e: EntradaViga; acero?: ConfigAcero; op: Opciones }
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Modelo de la viga desde los mismos datos geométricos del cálculo. Ejes: x = longitud, y = altura, z = ancho. */
function construir(g: THREE.Group, modo: Modo3D, { e, acero, op }: Datos) {
  g.clear();
  const { b, h, L, recub } = e;
  const dE = diametroMm(e.estribo.barra) / 1000;
  const col = { plano: colorCss("--plano"), estaca: colorCss("--estaca"), tinta: colorCss("--tinta"), papel: colorCss("--suave") };

  if (modo === "completo") {
    const caja = new THREE.Mesh(new THREE.BoxGeometry(L, h, b),
      new THREE.MeshStandardMaterial({ color: col.papel, transparent: true, opacity: 0.16, depthWrite: false }));
    caja.position.set(L / 2, h / 2, 0);
    const bordes = new THREE.LineSegments(new THREE.EdgesGeometry(caja.geometry), new THREE.LineBasicMaterial({ color: col.tinta }));
    bordes.position.copy(caja.position);
    g.add(caja, bordes);
  }

  // Barras longitudinales y adicionales (pocas piezas: un cilindro cada una)
  const sec = geometriaSeccion(e);
  const ads = (e.adicionales ?? []).filter((a) => a.cantidad !== 0);
  let k = 0, n = 0;
  const matLap = new THREE.MeshStandardMaterial({ color: col.estaca });
  for (const bar of sec.barras) {
    let x0 = recub, len = L - 2 * recub;
    let gancho = bar.grupo === "sup" ? e.sup.gancho : e.inf.gancho;
    let barraId = bar.grupo === "sup" ? e.sup.barra : e.inf.barra;
    if (bar.adicional) {
      const a = ads[k];
      gancho = a.gancho; barraId = a.barra;
      x0 = recub + a.desde; len = a.longitud;
      if (++n === a.cantidad) { k++; n = 0; }
    }
    const geo = new THREE.CylinderGeometry(bar.d / 2, bar.d / 2, len, 14);
    geo.rotateZ(Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ color: bar.adicional ? col.tinta : col.plano });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x0 + len / 2, h - bar.y, bar.x - b / 2);
    g.add(m);
    const z = bar.x - b / 2;
    for (const [x1, y1, x2, y2] of patasDeGancho(gancho, bar.grupo, x0, x0 + len, bar.y, bar.d))
      g.add(cilindro(V(x1, h - y1, z), V(x2, h - y2, z), bar.d / 2, mat));
    // Traslapos: la segunda barra se dibuja pegada a la primera, en amarillo
    const off = (bar.grupo === "sup" ? -1 : 1) * bar.d * 1.05;
    for (const [za, zb] of zonasTraslapo(len, varilla(acero, barraId), acero?.traslapo[barraId] ?? 0))
      g.add(cilindro(V(x0 + za, h - bar.y + off, z), V(x0 + zb, h - bar.y + off, z), bar.d / 2, matLap));
  }

  // Estribos: 4 lados por estribo en UNA sola malla instanciada (un solo dibujo, liviano para el teléfono)
  const est = geometriaLongitudinal(e, acero).estribos;
  if (est.length > 0) {
    const w = b - 2 * recub - dE, hh = h - 2 * recub - dE;
    const malla = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff }), est.length * 4);
    const q = new THREE.Quaternion(), M = new THREE.Matrix4(), c = new THREE.Color();
    let i = 0;
    for (const s of est) {
      c.set(s.zona === "ext" ? col.tinta : col.estaca);
      const lados: [number, number, number, number, number, number][] = [
        [s.x, h - recub - dE / 2, 0, dE, dE, w + dE], [s.x, recub + dE / 2, 0, dE, dE, w + dE],
        [s.x, h / 2, w / 2, dE, hh + dE, dE], [s.x, h / 2, -w / 2, dE, hh + dE, dE],
      ];
      for (const [px, py, pz, sx, sy, sz] of lados) {
        M.compose(V(px, py, pz), q, V(sx, sy, sz));
        malla.setMatrixAt(i, M); malla.setColorAt(i, c); i++;
      }
    }
    g.add(malla);
  }

  // Medidas (texto como sprites)
  const tam = Math.max(L, h * 3, b * 3) * 0.03, o = tam * 1.6;
  if (op.generales) {
    cota3D(g, V(0, 0, b / 2 + o), V(L, 0, b / 2 + o), `L = ${num(L, 2)} m`, tam, col.tinta);
    cota3D(g, V(-o, 0, b / 2 + o), V(-o, h, b / 2 + o), `h = ${num(h * 100)} cm`, tam, col.tinta);
    cota3D(g, V(-o, 0, -b / 2), V(-o, 0, b / 2), `b = ${num(b * 100)} cm`, tam, col.tinta);
  }
  if (op.recubrimiento) cota3D(g, V(0, h, b / 2 + o * 0.5), V(0, h - recub, b / 2 + o * 0.5), `r = ${num(recub * 100, 1)} cm`, tam * 0.8, col.estaca);
}

export function Vista3D({ e, acero, op }: { e: EntradaViga; acero?: ConfigAcero; op: Opciones }) {
  return <Lienzo3D datos={{ e, acero, op }} construir={construir} centro={[e.L / 2, e.h / 2, 0]} dist={Math.max(e.L, e.h * 3, e.b * 3)} />;
}
