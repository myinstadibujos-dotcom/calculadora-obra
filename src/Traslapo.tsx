import type { Barra } from "./engine/barras";
import type { Materiales } from "./engine/materiales";
import type { AceroProyecto } from "./modelo";

/** Cuando una barra es más larga que la varilla elegida, pregunta de cuánto será el traslapo y lo guarda en el proyecto. */
export function PedirTraslapo({ barra, acero }: { barra: Barra; acero: AceroProyecto }) {
  const clave = `lap${barra.slice(1)}`;
  return (
    <div className="nota" style={{ display: "grid", gap: 8 }}>
      <strong>¿De cuánto será el traslapo para {barra}?</strong>
      <label className="campo"><span>Traslapo {barra}</span>
        <div><input inputMode="decimal" autoFocus value={(acero.m as any)[clave] ?? ""}
          onChange={(e) => acero.cambiar({ ...acero.m, [clave]: e.target.value } as Materiales)} /><em>cm</em></div>
      </label>
      <span>Se guarda en el proyecto y se usa en todos los elementos con ese diámetro.</span>
    </div>
  );
}
