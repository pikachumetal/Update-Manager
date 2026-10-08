import type { ReactElement } from "react";
import { Text, renderToString } from "ink";
import type { UpdateProvider } from "../types";
import { Intro, Log, type LogKind, Outro } from "./frame";
import { type CheckOption, CheckList } from "./MultiSelect";
import { runPrompt } from "./prompt";
import { Select, type SelectOption } from "./Select";

export type MenuAction = "check" | "update" | "updateProvider" | "providers" | "exit";

export interface ProviderRow {
  provider: UpdateProvider;
  enabled: boolean;
  installed: boolean;
}

export const MENU_MESSAGE = "What would you like to do?";
const PROVIDER_MESSAGE = "Select provider to update";
const TOGGLE_QUESTION = "Toggle providers";

export const MENU_OPTIONS: SelectOption<MenuAction>[] = [
  { value: "check", label: "🔍 Check for updates" },
  { value: "update", label: "🔄 Update all" },
  { value: "updateProvider", label: "📦 Update by provider" },
  { value: "providers", label: "⚙️  Manage providers" },
  { value: "exit", label: "🚪 Exit" },
];

const providerName = ({ icon, name }: UpdateProvider) => `${icon} ${name}`;

export function runMenu(): Promise<MenuAction | undefined> {
  return runPrompt<MenuAction>(
    (submit) => <Select message={MENU_MESSAGE} options={MENU_OPTIONS} onSubmit={submit} />,
    (action) => ({
      question: MENU_MESSAGE,
      answer: MENU_OPTIONS.find((option) => option.value === action)?.label ?? action,
    })
  );
}

export function runProviderSelect(list: UpdateProvider[]): Promise<UpdateProvider | undefined> {
  const options = list.map((provider) => ({ value: provider, label: providerName(provider) }));
  return runPrompt<UpdateProvider>(
    (submit) => <Select message={PROVIDER_MESSAGE} options={options} onSubmit={submit} />,
    (provider) => ({ question: PROVIDER_MESSAGE, answer: providerName(provider) })
  );
}

function ProviderState({ enabled, installed }: Omit<ProviderRow, "provider">) {
  if (!installed) return <Text dimColor>(not installed)</Text>;
  return enabled ? <Text color="green">(enabled)</Text> : <Text dimColor>(disabled)</Text>;
}

export function toggleOptions(rows: ProviderRow[]): CheckOption<string>[] {
  return rows.map(({ provider, enabled, installed }) => ({
    value: provider.id,
    label: (
      <Text>
        {providerName(provider)} <ProviderState enabled={enabled} installed={installed} />
      </Text>
    ),
    hint: installed ? undefined : "not available",
    checked: enabled,
  }));
}

export function runProvidersToggle(rows: ProviderRow[]): Promise<string[] | undefined> {
  const names = new Map(rows.map(({ provider }) => [provider.id, provider.name]));
  return runPrompt<string[]>(
    (submit) => (
      <CheckList
        message={`${TOGGLE_QUESTION} (space to select, enter to confirm)`}
        options={toggleOptions(rows)}
        required
        onSubmit={submit}
      />
    ),
    (ids) => ({ question: TOGGLE_QUESTION, answer: ids.map((id) => names.get(id)).join(", ") })
  );
}

const print = (node: ReactElement) => process.stdout.write(renderToString(node) + "\n");

export const printIntro = (title: string) => print(<Intro title={title} />);
export const printLog = (kind: LogKind, text: string) => print(<Log kind={kind}>{text}</Log>);
export const printOutro = (text: string) => print(<Outro>{text}</Outro>);
