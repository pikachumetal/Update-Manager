import type { ReactNode } from "react";
import { Box, Text } from "ink";
import type { PackageUpdate } from "../types";
import { providerLabel } from "./CheckApp";
import { Log } from "./frame";
import { SpinnerFrame } from "./Spinner";

export type RowState = "queued" | "updating" | "done" | "failed";

export interface ProgressRow {
  update: PackageUpdate;
  force: boolean;
  state: RowState;
  reason?: string;
}

export interface UpdateTally {
  updated: number;
  failed: number;
  skipped: number;
}

function RowStatus({ row }: { row: ProgressRow }) {
  const { update, force, state } = row;
  const versions = `${update.currentVersion} → ${update.newVersion}`;
  const forced = force ? <Text color="yellow"> (force)</Text> : null;

  switch (state) {
    case "done":
      return (
        <Text color="green">
          ✓ {update.name} {versions}
        </Text>
      );
    case "failed":
      return (
        <Text color="red">
          ✗ {update.name} {row.reason}
        </Text>
      );
    case "updating":
      return (
        <Text>
          <SpinnerFrame /> {update.name} {versions}
          {forced} updating
        </Text>
      );
    case "queued":
      return (
        <Text dimColor>
          … {update.name} {versions}
          {forced} queued
        </Text>
      );
  }
}

function Rail({ children }: { children: ReactNode }) {
  return (
    <Text>
      <Text color="gray">│</Text>
      {"  "}
      {children}
    </Text>
  );
}

export function UpdateProgress({ rows }: { rows: ProgressRow[] }) {
  const grouped = Map.groupBy(rows, (row) => row.update.provider);
  return (
    <Box flexDirection="column">
      {[...grouped].map(([providerId, group]) => {
        const { icon, name } = providerLabel(providerId);
        return (
          <Box key={providerId} flexDirection="column">
            <Rail>
              <Text dimColor>
                {icon} {name}
              </Text>
            </Rail>
            {group.map((row) => (
              <Rail key={`${providerId}:${row.update.id}`}>
                <RowStatus row={row} />
              </Rail>
            ))}
          </Box>
        );
      })}
    </Box>
  );
}

export function UpdateResult({ tally }: { tally: UpdateTally }) {
  const parts = [
    { count: tally.updated, text: `✓ ${tally.updated} updated`, color: "green" },
    { count: tally.failed, text: `✗ ${tally.failed} failed`, color: "red" },
    { count: tally.skipped, text: `⊘ ${tally.skipped} skipped`, color: "yellow" },
  ].filter((part) => part.count > 0);

  return (
    <Log kind="info">
      Result:{" "}
      {parts.map((part, index) => (
        <Text key={part.text}>
          {index > 0 && " | "}
          <Text color={part.color}>{part.text}</Text>
        </Text>
      ))}
    </Log>
  );
}
