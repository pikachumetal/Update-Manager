import { type ReactElement, useEffect, useState } from "react";
import { useApp, useInput, useStdin } from "ink";
import { Answer } from "./frame";
import { renderApp } from "./render";

interface PromptProps<T> {
  prompt: (submit: (value: T) => void) => ReactElement;
  answer: (value: T) => { question: string; answer: string };
  onDone: (value: T | undefined) => void;
}

export function PromptApp<T>({ prompt, answer, onDone }: PromptProps<T>) {
  const { exit } = useApp();
  const { isRawModeSupported } = useStdin();
  const [answered, setAnswered] = useState<{ value: T } | null>(null);

  // Se sale tras el commit del Answer: un exit() directo desmonta antes de dibujarlo
  useEffect(() => {
    if (!answered) return;
    onDone(answered.value);
    exit();
  }, [answered, onDone, exit]);

  // Con el teclado en raw mode, Ctrl+C no llega como SIGINT
  useInput(
    (input, key) => {
      if (key.ctrl && input === "c") {
        onDone(undefined);
        exit();
      }
    },
    { isActive: isRawModeSupported && !answered }
  );

  if (answered) return <Answer {...answer(answered.value)} />;
  return prompt((value) => setAnswered({ value }));
}

export async function runPrompt<T>(
  prompt: PromptProps<T>["prompt"],
  answer: PromptProps<T>["answer"]
): Promise<T | undefined> {
  let result: T | undefined;
  await renderApp(
    <PromptApp
      prompt={prompt}
      answer={answer}
      onDone={(value: T | undefined) => (result = value)}
    />,
    { exitOnCtrlC: false }
  );
  return result;
}
