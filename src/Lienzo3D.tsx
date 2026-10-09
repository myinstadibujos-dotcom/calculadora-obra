import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export type Modo3D = "completo" | "armadura";
export const colorCss = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || "#888888";

export function limpiar(g: THREE.Group) {
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
  });
  g.clear();
}

export function cilindro(a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material) {
  const dir = b.clone().sub(a), len = dir.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}

interface Escena { grupo: THREE.Group; render: () => void; encuadrar: () => void }
interface Props<T> {
  datos: T; construir: (g: THREE.Group, modo: Modo3D, d: T) => void;
  centro: [number, number, number]; dist: number;
}

/** Escena 3D genérica: cada elemento aporta solo la función que construye su modelo desde sus datos. */
export function Lienzo3D<T>(props: Props<T>) {
  const caja = useRef<HTMLDivElement>(null);
  const escena = useRef<Escena | null>(null);
  const encuadrado = useRef(false);
  const actual = useRef(props);
  actual.current = props;
  const [modo, setModo] = useState<Modo3D>("completo");
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
    controles.addEventListener("change", render);
    const ajustar = () => {
      const w = el.clientWidth, hh = el.clientHeight;
      if (w === 0 || hh === 0) return;
      renderer.setSize(w, hh); camera.aspect = w / hh; camera.updateProjectionMatrix(); render();
    };
    const ro = new ResizeObserver(ajustar);
    ro.observe(el);
    const encuadrar = () => {
      const { centro, dist } = actual.current;
      camera.far = Math.max(200, dist * 20); camera.updateProjectionMatrix();
      camera.position.set(centro[0] + dist * 0.55, centro[1] + dist * 0.45, centro[2] + dist * 0.75);
      controles.target.set(...centro);
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
    props.construir(s.grupo, modo, props.datos);
    if (!encuadrado.current) { s.encuadrar(); encuadrado.current = true; } else s.render();
  }, [props.datos, modo]);

  const boton = (m: Modo3D, t: string) => (
    <button className={modo === m ? "btn principal" : "btn"} onClick={() => setModo(m)}>{t}</button>
  );
  return (
    <section aria-label="Vista tridimensional">
      <div className="barra" style={{ marginBottom: 10 }}>
        {boton("completo", "Completo")}
        {boton("armadura", "Solo armadura")}
        <button className="btn" onClick={() => escena.current?.encuadrar()}>Reiniciar vista</button>
      </div>
      {sinWebGL ? (
        <div className="nota alerta">Este dispositivo o navegador no permite la vista 3D. Los cálculos no se ven afectados.</div>
      ) : (
        <div ref={caja} className="lienzo3d" role="img" aria-label="Modelo 3D del elemento con su armadura" />
      )}
      <p className="pie">Un dedo gira · dos dedos acercan o desplazan.</p>
    </section>
  );
}
