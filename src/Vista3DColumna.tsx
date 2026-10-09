import * as THREE from "three";
import { cilindro, colorCss, Lienzo3D, type Modo3D } from "./Lienzo3D";
import { geometriaColumna, type EntradaColumna } from "./engine/columna";

function construir(g: THREE.Group, modo: Modo3D, e: EntradaColumna) {
  const c = geometriaColumna(e);
  const { b, h, H } = e, dE = c.dE;
  const col = { plano: colorCss("--plano"), estaca: colorCss("--estaca"), tinta: colorCss("--tinta"), suave: colorCss("--suave") };
  const gx = (x: number) => x - b / 2, gz = (y: number) => y - h / 2; // planta centrada en el origen; y = altura

  if (modo === "completo") {
    const caja = new THREE.Mesh(new THREE.BoxGeometry(b, H, h),
      new THREE.MeshStandardMaterial({ color: col.suave, transparent: true, opacity: 0.16, depthWrite: false }));
    caja.position.set(0, H / 2, 0);
    const bordes = new THREE.LineSegments(new THREE.EdgesGeometry(caja.geometry), new THREE.LineBasicMaterial({ color: col.tinta }));
    bordes.position.copy(caja.position);
    g.add(caja, bordes);
  }

  const largo = H + e.esperaSup;
  const mat = new THREE.MeshStandardMaterial({ color: col.plano });
  for (const bar of c.barras) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(bar.d / 2, bar.d / 2, largo, 14), mat);
    m.position.set(gx(bar.x), largo / 2, gz(bar.y));
    g.add(m);
    if (e.pataInf > 0) { // pata a 90° en la base, hacia el centro de la sección
      const vx = -gx(bar.x), vz = -gz(bar.y), l = Math.hypot(vx, vz);
      if (l > 1e-9)
        g.add(cilindro(new THREE.Vector3(gx(bar.x), 0, gz(bar.y)),
          new THREE.Vector3(gx(bar.x) + (vx / l) * e.pataInf, 0, gz(bar.y) + (vz / l) * e.pataInf), bar.d / 2, mat));
    }
  }

  // Estribos y trabas en una sola malla instanciada
  const w = c.estribo.w, hh = c.estribo.h;
  const total = c.niveles.length * (4 + c.trabas.length);
  if (total > 0) {
    const malla = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff }), total);
    const q = new THREE.Quaternion(), M = new THREE.Matrix4(), color = new THREE.Color();
    let i = 0;
    const poner = (px: number, py: number, pz: number, sx: number, sy: number, sz: number, c0: string) => {
      M.compose(new THREE.Vector3(px, py, pz), q, new THREE.Vector3(sx, sy, sz));
      malla.setMatrixAt(i, M); malla.setColorAt(i, color.set(c0)); i++;
    };
    for (const n of c.niveles) {
      const cn = n.zona === "ext" ? col.tinta : col.estaca;
      poner(0, n.y, hh / 2, w + dE, dE, dE, cn); poner(0, n.y, -hh / 2, w + dE, dE, dE, cn);
      poner(w / 2, n.y, 0, dE, dE, hh + dE, cn); poner(-w / 2, n.y, 0, dE, dE, hh + dE, cn);
      for (const t of c.trabas) {
        if (t[1] === t[3]) poner((gx(t[0]) + gx(t[2])) / 2, n.y, gz(t[1]), t[2] - t[0], dE, dE, col.suave);
        else poner(gx(t[0]), n.y, (gz(t[1]) + gz(t[3])) / 2, dE, dE, t[3] - t[1], col.suave);
      }
    }
    g.add(malla);
  }
}

export function Vista3DColumna({ e }: { e: EntradaColumna }) {
  return <Lienzo3D datos={e} construir={construir} centro={[0, e.H / 2, 0]} dist={Math.max(e.H * 1.1, e.b * 3, e.h * 3)} />;
}
