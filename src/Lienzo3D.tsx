import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { activar, useControlable, useMando } from "./mando";

export type Modo3D = "completo" | "armadura";
export const colorCss = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || "#888888";

export function limpiar(g: THREE.Group) {
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    const mat = m.material as (THREE.Material & { map?: THREE.Texture | null }) | (THREE.Material & { map?: THREE.Texture | null })[] | undefined;
    (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => { x.map?.dispose(); x.dispose(); });
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

/** Texto como sprite: siempre mira a la cámara y se ve sobre las demás piezas. */
function etiqueta(texto: string, alto: number, color: string) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 128;
  const x = c.getContext("2d")!;
  x.font = "bold 64px system-ui, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = color;
  x.fillText(texto, 256, 64);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
  s.scale.set(alto * 4, alto, 1);
  s.renderOrder = 10;
  return s;
}
/** Cota 3D: línea con marcas en los extremos y su texto en el centro. `tam` = alto del texto en unidades del modelo. */
export function cota3D(g: THREE.Group, a: THREE.Vector3, b: THREE.Vector3, texto: string, tam: number, color: string) {
  const dir = b.clone().sub(a).normalize();
  const perp = Math.abs(dir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const t = perp.multiplyScalar(tam * 0.3);
  const geo = new THREE.BufferGeometry().setFromPoints([a, b, a.clone().sub(t), a.clone().add(t), b.clone().sub(t), b.clone().add(t)]);
  geo.setIndex([0, 1, 2, 3, 4, 5]);
  const l = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, depthTest: false }));
  l.renderOrder = 9;
  const s = etiqueta(texto, tam, color);
  s.position.copy(a).add(b).multiplyScalar(0.5).add(new THREE.Vector3(0, tam * 0.7, 0));
  g.add(l, s);
}

interface Escena { grupo: THREE.Group; render: () => void; encuadrar: () => void; camera: THREE.PerspectiveCamera; controles: OrbitControls }
interface Props<T> { datos: T; construir: (g: THREE.Group, modo: Modo3D, d: T) => void; centro: [number, number, number]; dist: number }

/** Escena 3D genérica: cada elemento aporta solo la función que construye su modelo desde sus datos. */
export function Lienzo3D<T>(props: Props<T>) {
  const caja = useRef<HTMLDivElement>(null);
  const escena = useRef<Escena | null>(null);
  const encuadrado = useRef(false);
  const actual = useRef(props);
  actual.current = props;
  const [modo, setModo] = useState<Modo3D>("completo");
  const [sinWebGL, setSinWebGL] = useState(false);
  const { id: activoId } = useMando();

  useControlable("3d", {
    nombre: "Vista 3D", girable: true,
    mover: (dx, dy, m) => {
      const s = escena.current;
      if (!s) return;
      const off = s.camera.position.clone().sub(s.controles.target);
      if (m === "girar") {
        const sph = new THREE.Spherical().setFromVector3(off);
        sph.theta -= dx * 0.2;
        sph.phi = Math.min(Math.PI - 0.1, Math.max(0.1, sph.phi + dy * 0.15));
        off.setFromSpherical(sph);
        s.camera.position.copy(s.controles.target).add(off);
        s.camera.lookAt(s.controles.target);
      } else {
        const paso = off.length() * 0.08;
        const der = new THREE.Vector3().setFromMatrixColumn(s.camera.matrix, 0).multiplyScalar(dx * paso);
        const arr = new THREE.Vector3().setFromMatrixColumn(s.camera.matrix, 1).multiplyScalar(-dy * paso);
        const d = der.add(arr);
        s.camera.position.add(d); s.controles.target.add(d);
      }
      s.controles.update(); s.render();
    },
    zoom: (f) => {
      const s = escena.current;
      if (!s) return;
      const off = s.camera.position.clone().sub(s.controles.target).multiplyScalar(1 / f);
      s.camera.position.copy(s.controles.target).add(off);
      s.controles.update(); s.render();
    },
    reiniciar: () => escena.current?.encuadrar(),
  });

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
    escena.current = { grupo, render, encuadrar, camera, controles };
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
        <div ref={caja} className={`lienzo3d${activoId === "3d" ? " activa" : ""}`} role="img" aria-label="Modelo 3D del elemento con su armadura"
          onPointerDown={() => activar("3d")} />
      )}
      <p className="pie">Un dedo gira · dos dedos acercan o desplazan · o usa el mando.</p>
    </section>
  );
}
