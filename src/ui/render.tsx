import type { ReactElement } from "react";
import { type RenderOptions, render } from "ink";

export async function renderApp(
  node: ReactElement,
  options: Omit<RenderOptions, "patchConsole"> = {}
): Promise<void> {
  // Sin patchConsole, lo que escribe la consola (el `Cancelled` de Ctrl+C, el error de main) sale debajo del marco y no se pierde al desmontar
  await render(node, { ...options, patchConsole: false }).waitUntilExit();
}
