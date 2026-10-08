import { type Dispatch, type ReactNode, type SetStateAction, useEffect, useState } from "react";
import { Box, Static, Text, useApp, useInput, useStdin, useStdout } from "ink";
import type { CheckResult, PackageUpdate } from "../types";
import { UpdatesFound, useFailureWarnings } from "./CheckApp";
import { Confirm } from "./Confirm";
import { Answer, Intro, Log, Outro } from "./frame";
import { MultiSelect } from "./MultiSelect";
import { renderApp } from "./render";
import { Spinner } from "./Spinner";
import { type ProgressRow, UpdateProgress, UpdateResult, type UpdateTally } from "./UpdateProgress";

export interface UpdateViewOptions {
  spinnerLabel: string;
  load: () => Promise<CheckResult>;
  interactive: boolean;
  skipSelection: boolean;
  hasGsudo: () => Promise<boolean>;
  installGsudo: () => Promise<boolean>;
  updatePackage: (update: PackageUpdate, force: boolean) => Promise<boolean>;
}

export type UpdateOutcome = "done" | "cancelled";

export interface FlowUi {
  push: (node: ReactNode) => void;
  show: (node: ReactNode) => void;
  ask: <T>(prompt: (resolve: (value: T) => void) => ReactNode) => Promise<T>;
  warn: (result: CheckResult) => void;
}

interface ForcePlan {
  available: PackageUpdate[];
  forced: PackageUpdate[];
  skipped: number;
}

const TITLE = "Updating packages";
const SELECT_MESSAGE = "Select packages to update";
const GSUDO_MESSAGE = "gsudo not found. Install it for admin elevation?";

const Rail = () => <Text color="gray">│</Text>;

function Working({ label }: { label: string }) {
  return (
    <Box flexDirection="column">
      <Rail />
      <Spinner label={label} />
    </Box>
  );
}

function ForceWarning({ packages }: { packages: PackageUpdate[] }) {
  return (
    <Box flexDirection="column">
      <Log kind="warn">Found {packages.length} package(s) that require force:</Log>
      {packages.map((update) => (
        <Text key={`${update.provider}:${update.id}`}>
          {"   "}
          <Text dimColor>•</Text> {update.name}{" "}
          <Text dimColor>({update.status === "pinned" ? "pinned" : "unknown version"})</Text>
        </Text>
      ))}
    </Box>
  );
}

async function confirm(ui: FlowUi, message: string): Promise<boolean> {
  const value = await ui.ask<boolean>((resolve) => (
    <Confirm message={message} onSubmit={resolve} />
  ));
  ui.push(<Answer question={message} answer={value ? "Yes" : "No"} />);
  return value;
}

async function loadUpdates(options: UpdateViewOptions, ui: FlowUi): Promise<CheckResult> {
  ui.show(<Working label={options.spinnerLabel} />);
  const result = await options.load();
  ui.show(null);
  ui.warn(result);
  return result;
}

async function chooseUpdates(
  options: UpdateViewOptions,
  updates: PackageUpdate[],
  ui: FlowUi
): Promise<PackageUpdate[]> {
  if (options.skipSelection) return updates;
  const selected = await ui.ask<PackageUpdate[]>((resolve) => (
    <MultiSelect
      message={`${SELECT_MESSAGE} (space to toggle, enter to confirm)`}
      updates={updates}
      onSubmit={resolve}
    />
  ));
  if (selected.length > 0) {
    ui.push(<Answer question={SELECT_MESSAGE} answer={selected.map((u) => u.name).join(", ")} />);
  }
  return selected;
}

async function offerGsudo(options: UpdateViewOptions, ui: FlowUi): Promise<void> {
  if (await options.hasGsudo()) return;
  if (!(await confirm(ui, GSUDO_MESSAGE))) return;
  ui.show(<Working label="Installing gsudo..." />);
  const installed = await options.installGsudo();
  ui.show(null);
  ui.push(
    <Log kind="step">
      {installed ? (
        <Text color="green">gsudo installed</Text>
      ) : (
        <Text color="red">Failed to install gsudo</Text>
      )}
    </Log>
  );
}

async function planForce(
  options: UpdateViewOptions,
  selected: PackageUpdate[],
  ui: FlowUi
): Promise<ForcePlan> {
  const available = selected.filter((u) => u.status === "available");
  const skippable = selected.filter((u) => u.status === "pinned" || u.status === "unknown");
  if (skippable.length > 0) ui.push(<ForceWarning packages={skippable} />);

  // Solo WinGet admite --force, y sin terminal no hay a quién preguntar
  const winget = skippable.filter((u) => u.provider === "winget");
  if (winget.length === 0 || !options.interactive) {
    return { available, forced: [], skipped: skippable.length };
  }
  await offerGsudo(options, ui);
  const forced = (await confirm(ui, `Force update ${winget.length} WinGet package(s)?`))
    ? winget
    : [];
  return { available, forced, skipped: skippable.length - forced.length };
}

async function runUpdates(
  options: UpdateViewOptions,
  plan: ForcePlan,
  ui: FlowUi
): Promise<UpdateTally> {
  let rows = queuedRows(plan);
  const setRow = (index: number, patch: Partial<ProgressRow>) => {
    rows = rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
    ui.show(<UpdateProgress rows={rows} />);
  };

  ui.push(<Log kind="step">Updating {rows.length} package(s)...</Log>);
  ui.push(<Rail />);
  for (const [index, { update, force }] of rows.entries()) {
    setRow(index, { state: "updating" });
    setRow(index, await updateOne(options, update, force));
  }
  ui.show(null);
  ui.push(<UpdateProgress rows={rows} />);
  return tally(rows, plan.skipped);
}

function queuedRows(plan: ForcePlan): ProgressRow[] {
  const ordered = [
    ...Map.groupBy([...plan.available, ...plan.forced], (u) => u.provider).values(),
  ].flat();
  return ordered.map((update) => ({
    update,
    force: plan.forced.includes(update),
    state: "queued",
  }));
}

function tally(rows: ProgressRow[], skipped: number): UpdateTally {
  const count = (state: ProgressRow["state"]) => rows.filter((r) => r.state === state).length;
  return { updated: count("done"), failed: count("failed"), skipped };
}

async function updateOne(
  options: UpdateViewOptions,
  update: PackageUpdate,
  force: boolean
): Promise<Partial<ProgressRow>> {
  try {
    return (await options.updatePackage(update, force))
      ? { state: "done" }
      : { state: "failed", reason: "failed" };
  } catch (error) {
    return { state: "failed", reason: error instanceof Error ? error.message : "Unknown error" };
  }
}

function finish(ui: FlowUi, info: string | null, outro: string) {
  if (info) ui.push(<Log kind="info">{info}</Log>);
  ui.push(<Outro>{outro}</Outro>);
}

export async function runUpdateFlow(options: UpdateViewOptions, ui: FlowUi): Promise<void> {
  const result = await loadUpdates(options, ui);
  const count = result.updates.length;
  if (count === 0) {
    ui.push(<Log kind="step">Found 0 update(s)</Log>);
    return finish(ui, null, "Done");
  }
  ui.push(<UpdatesFound doneMessage={`Found ${count} update(s)`} result={result} />);

  const selected = await chooseUpdates(options, result.updates, ui);
  if (selected.length === 0) return finish(ui, "Update cancelled", "Cancelled");

  const plan = await planForce(options, selected, ui);
  if (plan.available.length + plan.forced.length === 0) {
    return finish(ui, "No packages to update", "Done");
  }
  const tally = await runUpdates(options, plan, ui);
  ui.push(<UpdateResult tally={tally} />);
  ui.push(<Outro>Done</Outro>);
}

function createFlowUi(
  setBlocks: Dispatch<SetStateAction<ReactNode[]>>,
  setActive: Dispatch<SetStateAction<ReactNode>>,
  warn: FlowUi["warn"]
): FlowUi {
  return {
    push: (node) => setBlocks((current) => [...current, node]),
    show: (node) => setActive(() => node),
    ask: (prompt) =>
      new Promise((resolve) => {
        const done = (value: Parameters<typeof resolve>[0]) => {
          setActive(null);
          resolve(value);
        };
        setActive(() => prompt(done));
      }),
    warn,
  };
}

function useFlow(options: UpdateViewOptions) {
  const { exit } = useApp();
  const warnFailures = useFailureWarnings();
  const [blocks, setBlocks] = useState<ReactNode[]>([]);
  const [active, setActive] = useState<ReactNode>(null);
  // Se sale tras el commit del último bloque: un exit() directo desmonta antes de dibujarlo
  const [ending, setEnding] = useState<{ error?: unknown } | null>(null);

  useEffect(() => {
    if (ending) exit(ending.error as Error | undefined);
  }, [ending, exit]);

  useEffect(() => {
    const ui = createFlowUi(setBlocks, setActive, (result) => warnFailures(result.failures));
    runUpdateFlow(options, ui).then(
      () => setEnding({}),
      (error: unknown) => setEnding({ error })
    );
    // El flujo corre una sola vez por montaje: las opciones no cambian mientras dura
  }, []);

  return { blocks, active };
}

export function UpdateApp({ onCancel, ...options }: UpdateViewOptions & { onCancel: () => void }) {
  const { exit } = useApp();
  const { isRawModeSupported } = useStdin();
  const { stdout } = useStdout();
  const { blocks, active } = useFlow(options);

  // Con el teclado en raw mode, Ctrl+C no llega como SIGINT
  useInput(
    (input, key) => {
      if (key.ctrl && input === "c") {
        onCancel();
        exit();
      }
    },
    { isActive: isRawModeSupported }
  );

  const items = [<Intro key="intro" title={TITLE} />, ...blocks];
  const done = (block: ReactNode, index: number) => (
    <Box key={index} flexDirection="column">
      {block}
    </Box>
  );
  // Con TTY, lo ya hecho va en Static: si el frame dinámico pasa de la altura de la terminal, ink
  // lo repinta entero en cada tick. Sin TTY no hay repintado, y Static duplicaría los últimos bloques
  return (
    <>
      {"isTTY" in stdout && stdout.isTTY ? <Static items={items}>{done}</Static> : items.map(done)}
      {active}
    </>
  );
}

export async function runUpdateView(options: UpdateViewOptions): Promise<UpdateOutcome> {
  let outcome: UpdateOutcome = "done";
  await renderApp(<UpdateApp {...options} onCancel={() => (outcome = "cancelled")} />, {
    exitOnCtrlC: false,
  });
  return outcome;
}
