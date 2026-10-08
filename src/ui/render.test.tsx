import { expect, test } from "bun:test";
import { useEffect } from "react";
import { Text, useApp } from "ink";
import { renderApp } from "./render";

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
