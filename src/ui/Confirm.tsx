import { useState } from "react";
import { Box, Text, useInput, useStdin } from "ink";

export function Confirm({
  message,
  onSubmit,
}: {
  message: string;
  onSubmit: (value: boolean) => void;
}) {
  const { isRawModeSupported } = useStdin();
  const [value, setValue] = useState(true);

  useInput(
    (input, key) => {
      if (key.leftArrow || key.rightArrow) setValue((current) => !current);
      else if (input === "y") setValue(true);
      else if (input === "n") setValue(false);
      else if (key.return) onSubmit(value);
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
      <Text>
        <Text color="gray">│</Text>
        {"  "}
        <Option label="Yes" active={value} /> / <Option label="No" active={!value} />
      </Text>
      <Text color="gray">└</Text>
    </Box>
  );
}

function Option({ label, active }: { label: string; active: boolean }) {
  return active ? (
    <Text>
      <Text color="green">●</Text> {label}
    </Text>
  ) : (
    <Text dimColor>○ {label}</Text>
  );
}
