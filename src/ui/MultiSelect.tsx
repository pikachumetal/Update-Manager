import { type ReactNode, useState } from "react";
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

function useChecked(keys: string[], initial: string[]) {
  const [checked, setChecked] = useState(() => new Set(initial));
  const toggle = (key: string) =>
    setChecked((current) => {
      const next = new Set(current);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  const toggleAll = () =>
    setChecked((current) => (current.size === keys.length ? new Set() : new Set(keys)));
  return { checked, toggle, toggleAll };
}

// `keys` va en el orden en que se ven las filas: es el que recorre el cursor
function useCheckList(
  keys: string[],
  initial: string[],
  onSubmit: (checked: Set<string>) => void,
  required = false
) {
  const { isRawModeSupported } = useStdin();
  const [cursor, setCursor] = useState(0);
  const [error, setError] = useState(false);
  const { checked, toggle, toggleAll } = useChecked(keys, initial);
  const move = (step: number) =>
    setCursor((current) => (current + step + keys.length) % keys.length);

  useInput(
    (input, key) => {
      setError(false);
      if (key.upArrow) move(-1);
      else if (key.downArrow) move(1);
      else if (input === " ") toggle(keys[cursor]);
      else if (input === "a") toggleAll();
      else if (key.return && required && checked.size === 0) setError(true);
      else if (key.return) onSubmit(checked);
    },
    { isActive: isRawModeSupported }
  );

  return { cursor, checked, error };
}

function useSelection(updates: PackageUpdate[], onSubmit: MultiSelectProps["onSubmit"]) {
  const rows = [...groupByProvider(updates).values()].flat();
  const keys = rows.map(rowKey);
  const { cursor, checked } = useCheckList(keys, keys, (selected) =>
    onSubmit(updates.filter((u) => selected.has(rowKey(u))))
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

export interface CheckOption<T> {
  value: T;
  label: ReactNode;
  hint?: string;
  checked: boolean;
}

export function CheckList<T>({
  message,
  options,
  required,
  onSubmit,
}: {
  message: string;
  options: CheckOption<T>[];
  required?: boolean;
  onSubmit: (selected: T[]) => void;
}) {
  const keys = options.map((_, index) => String(index));
  const initial = keys.filter((_, index) => options[index].checked);
  const { cursor, checked, error } = useCheckList(
    keys,
    initial,
    (selected) =>
      onSubmit(options.filter((_, index) => selected.has(String(index))).map((o) => o.value)),
    required
  );

  return (
    <Box flexDirection="column">
      <Text color="gray">│</Text>
      <Text>
        <Text color="cyan">◆</Text>
        {"  "}
        {message}
      </Text>
      {options.map((option, index) => (
        <Text key={keys[index]}>
          <Text color="gray">│</Text>
          {"  "}
          {checked.has(keys[index]) ? <Text color="cyan">◼</Text> : <Text dimColor>◻</Text>}{" "}
          <Text color={index === cursor ? "cyan" : undefined}>{option.label}</Text>
          {index === cursor && option.hint && <Text dimColor> ({option.hint})</Text>}
        </Text>
      ))}
      {error ? (
        <Text color="yellow">{"└  Please select at least one option."}</Text>
      ) : (
        <Text color="gray">└</Text>
      )}
    </Box>
  );
}
