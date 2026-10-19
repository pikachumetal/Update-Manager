import { describe, expect, test } from "bun:test";
import { Confirm } from "./Confirm";
import { mountWithKeys } from "./testStdin";

const MESSAGE = "Force update 1 WinGet package(s)?";

const confirm = () => {
  const answers: boolean[] = [];
  const node = <Confirm message={MESSAGE} onSubmit={(value) => answers.push(value)} />;
  return { node, answers };
};

describe("Confirm", () => {
  test("starts on Yes", async () => {
    const { app, last } = await mountWithKeys(confirm().node);
    expect(last()).toEqual(["│", `◆  ${MESSAGE}`, "│  ● Yes / ○ No", "└"]);
    app.unmount();
  });

  test("submits Yes on Enter", async () => {
    const { node, answers } = confirm();
    const { app, press } = await mountWithKeys(node);
    await press("\r");
    expect(answers).toEqual([true]);
    app.unmount();
  });

  test("moves to No with the arrow and submits it", async () => {
    const { node, answers } = confirm();
    const { app, press, last } = await mountWithKeys(node);
    await press("\u001B[C");
    expect(last()).toContain("│  ○ Yes / ● No");
    await press("\r");
    expect(answers).toEqual([false]);
    app.unmount();
  });

  test("picks with y and n", async () => {
    const no = confirm();
    const first = await mountWithKeys(no.node);
    await first.press("n", "\r");
    first.app.unmount();
    const yes = confirm();
    const second = await mountWithKeys(yes.node);
    await second.press("n", "y", "\r");
    second.app.unmount();
    expect([...no.answers, ...yes.answers]).toEqual([false, true]);
  });
});
