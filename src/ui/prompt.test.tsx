import { describe, expect, test } from "bun:test";
import { PromptApp } from "./prompt";
import { Select } from "./Select";
import { mountWithKeys } from "./testStdin";

const settle = () => new Promise((resolve) => setTimeout(resolve, 250));

const prompt = () => {
  const done: (string | undefined)[] = [];
  const node = (
    <PromptApp<string>
      prompt={(submit) => (
        <Select
          message="Pick"
          options={[
            { value: "a", label: "A" },
            { value: "b", label: "B" },
          ]}
          onSubmit={submit}
        />
      )}
      answer={(value) => ({ question: "Pick", answer: value.toUpperCase() })}
      onDone={(value) => done.push(value)}
    />
  );
  return { node, done };
};

describe("PromptApp", () => {
  test("writes the answer after submit", async () => {
    const { node, done } = prompt();
    const { app, press, last } = await mountWithKeys(node, { exitOnCtrlC: false });
    await press("\r");
    await settle();
    expect(last()).toContain("◇  Pick");
    expect(last()).toContain("│  A");
    expect(last()).not.toContain("│  ○ B");
    expect(done).toEqual(["a"]);
    app.unmount();
  });

  test("cancels on Ctrl+C", async () => {
    const { node, done } = prompt();
    const { app, press } = await mountWithKeys(node, { exitOnCtrlC: false });
    await press("\u0003");
    await settle();
    expect(done).toEqual([undefined]);
    app.unmount();
  });
});
