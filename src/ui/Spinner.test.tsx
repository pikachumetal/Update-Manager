import { expect, test } from "bun:test";
import { stripVTControlCharacters } from "node:util";
import { renderToString } from "ink";
import { Spinner } from "./Spinner";

test("draws the first frame and the label", () => {
  const output = stripVTControlCharacters(
    renderToString(<Spinner label="Checking for updates..." />)
  );
  expect(output.split("\n").map((l) => l.trimEnd())).toEqual(["◒  Checking for updates..."]);
});
