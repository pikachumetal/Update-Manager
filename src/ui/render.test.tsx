import { expect, test } from "bun:test";
import { useEffect } from "react";
import { Writable } from "node:stream";
import { Text, useApp, useInput } from "ink";
import { renderApp } from "./render";
import { createTestStdin, tick } from "./testStdin";

test("leaves console untouched while mounted", async () => {
  const original = console.log;
  let seen: typeof console.log | undefined;

  function Probe() {
    const { exit } = useApp();
    useEffect(() => {
      seen = console.log;
      exit();
    }, [exit]);
    return <Text>probe</Text>;
  }

  await renderApp(<Probe />);
  expect(seen).toBe(original);
});

test("passes exitOnCtrlC through", async () => {
  let pressed = false;

  function CtrlC() {
    const { exit } = useApp();
    useInput((input, key) => {
      if (key.ctrl && input === "c") {
        pressed = true;
        exit();
      }
    });
    return <Text>probe</Text>;
  }

  const stdin = createTestStdin();
  const stdout = new Writable({ write: (_chunk, _encoding, callback) => callback() });
  const done = renderApp(<CtrlC />, {
    exitOnCtrlC: false,
    stdin,
    stdout: stdout as unknown as NodeJS.WriteStream,
  });
  await tick();
  stdin.write("\u0003");
  await done;
  expect(pressed).toBe(true);
});
