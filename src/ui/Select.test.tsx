import { describe, expect, test } from "bun:test";
import { Select, type SelectOption } from "./Select";
import { mountWithKeys } from "./testStdin";

const DOWN = "\u001B[B";
const UP = "\u001B[A";

const ABC: SelectOption<string>[] = [
  { value: "a", label: "A" },
  { value: "b", label: "B" },
  { value: "c", label: "C" },
];

const select = (options: SelectOption<string>[]) => {
  const submitted: string[] = [];
  const node = <Select message="Pick" options={options} onSubmit={(v) => submitted.push(v)} />;
  return { node, submitted };
};

describe("Select", () => {
  test("draws the options with the first one active", async () => {
    const { app, last } = await mountWithKeys(select(ABC).node);
    expect(last()).toEqual(["│", "◆  Pick", "│  ● A", "│  ○ B", "│  ○ C", "└"]);
    app.unmount();
  });

  test("wraps the cursor around", async () => {
    const up = select(ABC);
    const first = await mountWithKeys(up.node);
    await first.press(UP, "\r");
    expect(up.submitted).toEqual(["c"]);
    first.app.unmount();

    const down = select(ABC);
    const second = await mountWithKeys(down.node);
    await second.press(DOWN, DOWN, DOWN, "\r");
    expect(down.submitted).toEqual(["a"]);
    second.app.unmount();
  });

  test("keeps the cursor with a single option", async () => {
    const { node, submitted } = select([ABC[0]]);
    const { app, press } = await mountWithKeys(node);
    await press(DOWN, UP, "\r");
    expect(submitted).toEqual(["a"]);
    app.unmount();
  });
});
