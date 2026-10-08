import type { ReactElement } from "react";
import { render } from "ink";

export async function renderApp(node: ReactElement): Promise<void> {
  await render(node).waitUntilExit();
}
