import type { ReactNode } from "react";
import { Box, Text } from "ink";

export type LogKind = "step" | "info" | "success" | "error" | "warn";

// Símbolos y colores calcados de @clack/prompts para que check se vea igual que los comandos que aún lo usan
const LOG_SYMBOLS: Record<LogKind, { symbol: string; color: string }> = {
  step: { symbol: "◇", color: "green" },
  info: { symbol: "●", color: "blue" },
  success: { symbol: "◆", color: "green" },
  error: { symbol: "■", color: "red" },
  warn: { symbol: "▲", color: "yellow" },
};

export function Intro({ title }: { title: string }) {
  return (
    <Text>
      <Text color="gray">┌</Text>
      {"  "}
      <Text backgroundColor="cyan" color="black">{` ${title} `}</Text>
    </Text>
  );
}

export function Log({ kind, children }: { kind: LogKind; children: ReactNode }) {
  const { symbol, color } = LOG_SYMBOLS[kind];
  return (
    <Box flexDirection="column">
      <Text color="gray">│</Text>
      <Text>
        <Text color={color}>{symbol}</Text>
        {"  "}
        {children}
      </Text>
    </Box>
  );
}

export function Outro({ children }: { children: string }) {
  return (
    <Box flexDirection="column">
      <Text color="gray">│</Text>
      <Text>
        <Text color="gray">└</Text>
        {"  "}
        <Text dimColor>{children}</Text>
      </Text>
    </Box>
  );
}

export function Answer({ question, answer }: { question: string; answer: string }) {
  return (
    <Box flexDirection="column">
      <Log kind="step">{question}</Log>
      <Text>
        <Text color="gray">│</Text>
        {"  "}
        <Text dimColor>{answer}</Text>
      </Text>
    </Box>
  );
}
