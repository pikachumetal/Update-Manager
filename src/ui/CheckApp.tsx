import { useEffect, useState } from "react";
import { Box, Text, renderToString, useApp, useStderr } from "ink";
import pc from "picocolors";
import { providers } from "../providers";
import type { CheckResult, PackageStatus, PackageUpdate } from "../types";
import { Intro, Log, Outro } from "./frame";
import { renderApp } from "./render";
import { Spinner } from "./Spinner";

export interface CheckViewOptions {
  spinnerLabel: string;
  load: () => Promise<CheckResult>;
  doneMessage: (result: CheckResult) => string;
}

const TITLE = "Checking for updates";

export const STATUS_BADGES: Partial<Record<PackageStatus, { text: string; color: string }>> = {
  pinned: { text: "📌 pinned", color: "yellow" },
  unknown: { text: "❓ unknown", color: "magenta" },
  error: { text: "⚠️ error", color: "red" },
};

export function providerLabel(providerId: string) {
  const provider = providers[providerId];
  return { icon: provider?.icon || "📦", name: provider?.name || providerId };
}

function UpdateLine({ update }: { update: PackageUpdate }) {
  const badge = STATUS_BADGES[update.status];
  return (
    <Text>
      {"   "}
      <Text dimColor>•</Text> {update.name} <Text dimColor>{update.currentVersion}</Text>{" "}
      <Text color="yellow">→</Text> <Text color="green">{update.newVersion}</Text>
      {badge && <Text color={badge.color}> {badge.text}</Text>}
      {update.source && <Text dimColor> [{update.source}]</Text>}
    </Text>
  );
}

function ProviderGroup({ providerId, updates }: { providerId: string; updates: PackageUpdate[] }) {
  const { icon, name } = providerLabel(providerId);
  return (
    <Box flexDirection="column">
      <Text bold>
        {icon} {name}
      </Text>
      {updates.map((update) => (
        <UpdateLine key={update.id} update={update} />
      ))}
    </Box>
  );
}

function UpToDateProvider({ providerId }: { providerId: string }) {
  const { icon, name } = providerLabel(providerId);
  return (
    <Text>
      {icon} <Text dimColor>{name}</Text> <Text color="green">✓</Text>
    </Text>
  );
}

function summaryParts(updates: PackageUpdate[]) {
  const count = (status: PackageStatus) => updates.filter((u) => u.status === status).length;
  return [
    { count: count("available"), label: "available", color: "green" },
    { count: count("pinned"), label: "pinned", color: "yellow" },
    { count: count("unknown"), label: "unknown", color: "magenta" },
  ].filter((part) => part.count > 0);
}

function Summary({ updates }: { updates: PackageUpdate[] }) {
  if (updates.length === 0) {
    return (
      <Log kind="success">
        <Text color="green">Everything is up to date!</Text>
      </Log>
    );
  }

  return (
    <Log kind="info">
      Summary:{" "}
      {summaryParts(updates).map((part, index) => (
        <Text key={part.label}>
          {index > 0 && " | "}
          <Text color={part.color}>
            {part.count} {part.label}
          </Text>
        </Text>
      ))}
    </Log>
  );
}

export function CheckReport({ doneMessage, result }: { doneMessage: string; result: CheckResult }) {
  const grouped = Map.groupBy(result.updates, (update) => update.provider);
  const upToDate = result.checkedProviders.filter((id) => !grouped.has(id));

  return (
    <Box flexDirection="column">
      <Log kind="step">{doneMessage}</Log>
      <Text> </Text>
      {[...grouped].map(([providerId, updates]) => (
        <ProviderGroup key={providerId} providerId={providerId} updates={updates} />
      ))}
      {upToDate.map((providerId) => (
        <UpToDateProvider key={providerId} providerId={providerId} />
      ))}
      <Text> </Text>
      <Summary updates={result.updates} />
      <Outro>Done</Outro>
    </Box>
  );
}

function useCheckResult(load: CheckViewOptions["load"]) {
  const { exit } = useApp();
  const { stderr, write } = useStderr();
  const [result, setResult] = useState<CheckResult | null>(null);

  useEffect(() => {
    // El aviso va por stderr para que `um check > out.txt` solo guarde el resultado
    const { yellow } = pc.createColors("isTTY" in stderr && Boolean(stderr.isTTY));
    load().then((loaded) => {
      for (const failure of loaded.failures) {
        write(yellow(`  ⚠ ${failure.providerName}: ${failure.message}`) + "\n");
      }
      setResult(loaded);
    }, exit);
  }, [load, exit, stderr, write]);

  useEffect(() => {
    if (result) exit();
  }, [result, exit]);

  return result;
}

export function CheckApp({ spinnerLabel, load, doneMessage }: CheckViewOptions) {
  const result = useCheckResult(load);
  return (
    <Box flexDirection="column">
      <Intro title={TITLE} />
      {result ? (
        <CheckReport doneMessage={doneMessage(result)} result={result} />
      ) : (
        <>
          <Text color="gray">│</Text>
          <Spinner label={spinnerLabel} />
        </>
      )}
    </Box>
  );
}

export function CheckError({ message }: { message: string }) {
  return (
    <Box flexDirection="column">
      <Intro title={TITLE} />
      <Log kind="error">{message}</Log>
    </Box>
  );
}

export function runCheckView(options: CheckViewOptions): Promise<void> {
  return renderApp(<CheckApp {...options} />);
}

export function printCheckError(message: string): void {
  process.stdout.write(renderToString(<CheckError message={message} />) + "\n");
}
