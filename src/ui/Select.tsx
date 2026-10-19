import { useState } from "react";
import { Box, Text, useInput, useStdin } from "ink";

export interface SelectOption<T> {
  value: T;
  label: string;
}

export function Select<T>({
  message,
  options,
  onSubmit,
}: {
  message: string;
  options: SelectOption<T>[];
  onSubmit: (value: T) => void;
}) {
  const { isRawModeSupported } = useStdin();
  const [cursor, setCursor] = useState(0);
  const move = (step: number) =>
    setCursor((current) => (current + step + options.length) % options.length);

  useInput(
    (_input, key) => {
      if (key.upArrow) move(-1);
      else if (key.downArrow) move(1);
      else if (key.return) onSubmit(options[cursor].value);
    },
    { isActive: isRawModeSupported }
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
        <Text key={option.label}>
          <Text color="gray">│</Text>
          {"  "}
          {index === cursor ? (
            <Text>
              <Text color="green">●</Text> {option.label}
            </Text>
          ) : (
            <Text dimColor>○ {option.label}</Text>
          )}
        </Text>
      ))}
      <Text color="gray">└</Text>
    </Box>
  );
}
