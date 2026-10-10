import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { diametroMm } from "./engine/barras";
import { geometriaLongitudinal, geometriaSeccion } from "./engine/seccion";
import { patasDeGancho, varilla, zonasTraslapo, type ConfigAcero, type EntradaViga } from "./engine/viga";

type Modo = "completo" | "armadura";
interface Escena { grupo: THREE.Group; render: () => void; encuadrar: (e: EntradaViga) => void }

const css = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || "#888888";

function limpiar(g: THREE.Group) {
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
  });
  g.clear();
}

function cilindro(a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material) {
  const dir = b.clone().sub(a), len = dir.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}

/** Construye el modelo desde los mismos datos geométricos del cálculo. Ejes: x = longitud, y = altura, z = ancho. */
function construir(g: THREE.Group, e: EntradaViga, modo: Modo, acero?: ConfigAcero) {
  limpiar(g);
  const { b, h, L, recub } = e;
  const dE = diametroMm(e.estribo.barra) / 1000;
  const col = { plano: css("--plano"), estaca: css("--estaca"), tinta: css("--tinta"), papel: css("--suave") };

  if (modo === "completo") {
    const caja = new THREE.Mesh(
      new THREE.BoxGeometry(L, h, b),
      new THREE.MeshStandardMaterial({ color: col.papel, transparent: true, opacity: 0.16, depthWrite: false })
    );
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
      g.add(cilindro(new THREE.Vector3(x1, h - y1, z), new THREE.Vector3(x2, h - y2, z), bar.d / 2, mat));
    // Traslapos: la segunda barra se dibuja pegada a la primera, en amarillo
    const off = (bar.grupo === "sup" ? -1 : 1) * bar.d * 1.05;
    for (const [za, zb] of zonasTraslapo(len, varilla(acero, barraId), acero?.traslapo[barraId] ?? 0))
      g.add(cilindro(new THREE.Vector3(x0 + za, h - bar.y + off, z), new THREE.Vector3(x0 + zb, h - bar.y + off, z), bar.d / 2, matLap));
  }

  // Estribos: 4 lados por estribo en UNA sola malla instanciada (un solo dibujo, liviano para el teléfono)
  const est = geometriaLongitudinal(e).estribos;
  if (est.length > 0) {
    const w = b - 2 * recub - dE, hh = h - 2 * recub - dE;
    const malla = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff }), est.length * 4);
    const q = new THREE.Quaternion(), M = new THREE.Matrix4(), c = new THREE.Color();
    let i = 0;
    for (const s of est) {
      c.set(s.zona === "ext" ? col.tinta : col.estaca);
      const lados: [number, number, number, number, number, number][] = [
        [s.x, h - recub - dE / 2, 0, dE, dE, w + dE],
        [s.x, recub + dE / 2, 0, dE, dE, w + dE],
        [s.x, h / 2, w / 2, dE, hh + dE, dE],
        [s.x, h / 2, -w / 2, dE, hh + dE, dE],
      ];
      for (const [px, py, pz, sx, sy, sz] of lados) {
        M.compose(new THREE.Vector3(px, py, pz), q, new THREE.Vector3(sx, sy, sz));
        malla.setMatrixAt(i, M); malla.setColorAt(i, c); i++;
      }
    }
    g.add(malla);
  }
}

export function Vista3D({ e, acero }: { e: EntradaViga; acero?: ConfigAcero }) {
  const caja = useRef<HTMLDivElement>(null);
  const escena = useRef<Escena | null>(null);
  const encuadrado = useRef(false);
  const [modo, setModo] = useState<Modo>("completo");
  const [sinWebGL, setSinWebGL] = useState(false);

  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch { setSinWebGL(true); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 200);
    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const sol = new THREE.DirectionalLight(0xffffff, 1.5);
    sol.position.set(3, 6, 4);
    scene.add(sol);
    const grupo = new THREE.Group();
    scene.add(grupo);
    const controles = new OrbitControls(camera, renderer.domElement);
    const render = () => renderer.render(scene, camera);
    controles.addEventListener("change", render); // dibuja solo cuando algo cambia: ahorra batería
    const ajustar = () => {
      const w = el.clientWidth, hh = el.clientHeight;
      if (w === 0 || hh === 0) return;
      renderer.setSize(w, hh); camera.aspect = w / hh; camera.updateProjectionMatrix(); render();
    };
    const ro = new ResizeObserver(ajustar);
    ro.observe(el);
    const encuadrar = (v: EntradaViga) => {
      const d = Math.max(v.L, v.h * 3, v.b * 3);
      camera.far = Math.max(200, d * 20); camera.updateProjectionMatrix();
      camera.position.set(v.L / 2 + d * 0.55, v.h / 2 + d * 0.45, d * 0.75);
      controles.target.set(v.L / 2, v.h / 2, 0);
      controles.update(); render();
    };
    escena.current = { grupo, render, encuadrar };
    return () => {
      ro.disconnect(); controles.dispose(); limpiar(grupo); renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
      escena.current = null; encuadrado.current = false;
    };
  }, []);

  useEffect(() => {
    const s = escena.current;
    if (!s) return;
    construir(s.grupo, e, modo, acero);
    if (!encuadrado.current) { s.encuadrar(e); encuadrado.current = true; } else s.render();
  }, [e, modo]);

  const boton = (m: Modo, t: string) => (
    <button className={modo === m ? "btn principal" : "btn"} onClick={() => setModo(m)}>{t}</button>
  );
  return (
    <section aria-label="Vista tridimensional">
      <div className="barra" style={{ marginBottom: 10 }}>
        {boton("completo", "Completo")}
        {boton("armadura", "Solo armadura")}
        <button className="btn" onClick={() => escena.current?.encuadrar(e)}>Reiniciar vista</button>
      </div>
      {sinWebGL ? (
        <div className="nota alerta">Este dispositivo o navegador no permite la vista 3D. Los cálculos no se ven afectados.</div>
      ) : (
        <div ref={caja} className="lienzo3d" role="img" aria-label="Modelo 3D de la viga con su armadura" />
      )}
      <p className="pie">Un dedo gira · dos dedos acercan o desplazan. Estribos de zona extrema en oscuro; refuerzos adicionales en oscuro.</p>
    </section>
  );
}
