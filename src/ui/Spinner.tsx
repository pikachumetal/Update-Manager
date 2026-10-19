import { Text, useAnimation } from "ink";

const FRAMES = ["◒", "◐", "◓", "◑"];

export function SpinnerFrame() {
  const { frame } = useAnimation({ interval: 80 });
  return <Text color="magenta">{FRAMES[frame % FRAMES.length]}</Text>;
}

export function Spinner({ label }: { label: string }) {
  return (
    <Text>
      <SpinnerFrame />
      {"  "}
      {label}
    </Text>
  );
}
