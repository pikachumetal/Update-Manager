import { PassThrough, Writable } from "node:stream";
import { stripVTControlCharacters } from "node:util";
import type { ReactElement } from "react";
import { render } from "ink";

// Un stdin que ink acepta como TTY con raw mode, para escribirle teclas en los tests
export function createTestStdin(): NodeJS.ReadStream {
  const stdin = new PassThrough() as unknown as NodeJS.ReadStream & { isTTY: boolean };
  stdin.isTTY = true;
  stdin.setRawMode = () => stdin;
  stdin.ref = () => stdin;
  stdin.unref = () => stdin;
  return stdin;
}

// Con `debug`, ink escribe cada frame entero en una sola escritura: la última es lo que se ve
class FrameStream extends Writable {
  columns = 80;
  frame = "";
  _write(chunk: Buffer, _encoding: string, callback: () => void) {
    this.frame = chunk.toString();
    callback();
  }
}

export const tick = () => new Promise((resolve) => setTimeout(resolve, 20));

export async function mountWithKeys(node: ReactElement) {
  const stdout = new FrameStream();
  const stdin = createTestStdin();
  const app = render(node, {
    stdout: stdout as unknown as NodeJS.WriteStream,
    stdin,
    patchConsole: false,
    interactive: true,
    debug: true,
  });
  await tick();
  const press = async (...keys: string[]) => {
    for (const key of keys) {
      stdin.write(key);
      await tick();
    }
  };
  const last = () =>
    stripVTControlCharacters(stdout.frame)
      .split("\n")
      .map((l) => l.trimEnd())
      .filter((l, i, all) => l !== "" || i < all.length - 1);
  return { app, press, last };
}
