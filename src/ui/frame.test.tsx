import { describe, expect, test } from "bun:test";
import { stripVTControlCharacters } from "node:util";
import type { ReactElement } from "react";
import { renderToString } from "ink";
import { Intro, Log, Outro } from "./frame";

const lines = (node: ReactElement) =>
  stripVTControlCharacters(renderToString(node))
    .split("\n")
    .map((l) => l.trimEnd());

describe("frame", () => {
  test("draws the intro like clack", () => {
    expect(lines(<Intro title="Checking for updates" />)).toEqual(["┌   Checking for updates"]);
  });

  test("draws each log kind with its symbol", () => {
    expect(lines(<Log kind="step">Found 1 update(s)</Log>)).toEqual(["│", "◇  Found 1 update(s)"]);
    expect(lines(<Log kind="info">Summary: 1 available</Log>)).toEqual([
      "│",
      "●  Summary: 1 available",
    ]);
    expect(lines(<Log kind="success">Everything is up to date!</Log>)).toEqual([
      "│",
      "◆  Everything is up to date!",
    ]);
    expect(lines(<Log kind="error">Provider "foo" not found</Log>)).toEqual([
      "│",
      '■  Provider "foo" not found',
    ]);
  });

  test("draws a warning", () => {
    expect(lines(<Log kind="warn">Found 2 package(s) that require force:</Log>)).toEqual([
      "│",
      "▲  Found 2 package(s) that require force:",
    ]);
  });

  test("draws the outro", () => {
    expect(lines(<Outro>Done</Outro>)).toEqual(["│", "└  Done"]);
  });
});
