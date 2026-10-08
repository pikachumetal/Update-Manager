import { useState } from "react";
import { Box, Text, useInput, useStdin } from "ink";
import type { PackageUpdate } from "../types";
import { STATUS_BADGES, providerLabel } from "./CheckApp";

interface MultiSelectProps {
  message: string;
  updates: PackageUpdate[];
  onSubmit: (selected: PackageUpdate[]) => void;
}

const groupByProvider = (updates: PackageUpdate[]) =>
  Map.groupBy(updates, (update) => update.provider);

// Un mismo id puede venir de dos providers (typescript en npm y en bun)
const rowKey = (update: PackageUpdate) => `${update.provider}:${update.id}`;

function useSelection(updates: PackageUpdate[], onSubmit: MultiSelectProps["onSubmit"]) {
  // El cursor recorre las filas en el orden en que se ven, agrupadas por provider
  const rows = [...groupByProvider(updates).values()].flat();
  const { isRawModeSupported } = useStdin();
  const [cursor, setCursor] = useState(0);
  const [checked, setChecked] = useState(() => new Set(updates.map(rowKey)));

  const toggle = (key: string) =>
    setChecked((current) => {
      const next = new Set(current);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  const toggleAll = () =>
    setChecked((current) =>
      current.size === updates.length ? new Set() : new Set(updates.map(rowKey))
    );
  const move = (step: number) =>
    setCursor((current) => (current + step + rows.length) % rows.length);

  useInput(
    (input, key) => {
      if (key.upArrow) move(-1);
      else if (key.downArrow) move(1);
      else if (input === " ") toggle(rowKey(rows[cursor]));
      else if (input === "a") toggleAll();
      else if (key.return) onSubmit(updates.filter((u) => checked.has(rowKey(u))));
    },
    { isActive: isRawModeSupported }
  );

  return { rows, cursor, checked };
}

function Row({
  update,
  checked,
  active,
}: {
  update: PackageUpdate;
  checked: boolean;
  active: boolean;
}) {
  const badge = STATUS_BADGES[update.status];
  return (
    <Text>
      <Text color="gray">│</Text>
      {"    "}
      {checked ? <Text color="cyan">◼</Text> : <Text dimColor>◻</Text>}{" "}
      <Text color={active ? "cyan" : undefined}>
        {update.name} {update.currentVersion} → {update.newVersion}
      </Text>
      {badge && <Text color={badge.color}> {badge.text}</Text>}
    </Text>
  );
}

export function MultiSelect({ message, updates, onSubmit }: MultiSelectProps) {
  const { rows, cursor, checked } = useSelection(updates, onSubmit);
  const grouped = groupByProvider(updates);

  return (
    <Box flexDirection="column">
      <Text color="gray">│</Text>
      <Text>
        <Text color="cyan">◆</Text>
        {"  "}
        {message}
      </Text>
      {[...grouped].map(([providerId, group]) => {
        const { icon, name } = providerLabel(providerId);
        return (
          <Box key={providerId} flexDirection="column">
            <Text>
              <Text color="gray">│</Text>
              {"  "}
              {icon} {name}
            </Text>
            {group.map((update) => (
              <Row
                key={rowKey(update)}
                update={update}
                checked={checked.has(rowKey(update))}
                active={rows[cursor] === update}
              />
            ))}
          </Box>
        );
      })}
      <Text color="gray">└</Text>
    </Box>
  );
}
