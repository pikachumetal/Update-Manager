import type { ReactElement, ReactNode } from "react";
import { Box, Text, renderToString } from "ink";
import { Intro, Log, type LogKind } from "./frame";
import type { ProviderRow } from "./menu";

const PROVIDERS_TITLE = "Providers";
export const IGNORED_TITLE = "Ignored packages";

const HELP_SECTIONS: { title: string; rows: string[] }[] = [
  {
    title: "Usage:",
    rows: [
      "um                     Interactive mode",
      "um check [provider]    Check for updates",
      "um update [provider]   Update packages",
      "um providers           Manage providers",
      "um ignore <id>         Ignore a package",
      "um unignore <id>       Stop ignoring a package",
      "um ignored             List ignored packages",
    ],
  },
  {
    title: "Options:",
    rows: [
      "-y, --yes             Skip confirmation",
      "-v, --version         Show version",
      "-h, --help            Show help",
    ],
  },
  {
    title: "Examples:",
    rows: [
      "um check              Check all providers",
      "um check winget       Check only WinGet",
      "um update --yes       Update all without confirmation",
      "um providers enable chocolatey",
      "um ignore Google.GooglePlayGames",
    ],
  },
];

function RailLine({ children }: { children?: ReactNode }) {
  return (
    <Text>
      <Text color="gray">│</Text>
      {children ? "  " : ""}
      {children}
    </Text>
  );
}

const End = () => <Text color="gray">└</Text>;

function ProviderStatus({ enabled, installed }: Omit<ProviderRow, "provider">) {
  if (!installed) return <Text dimColor>not installed</Text>;
  return enabled ? <Text color="green">enabled</Text> : <Text dimColor>disabled</Text>;
}

export function ProviderList({ rows }: { rows: ProviderRow[] }) {
  return (
    <Box flexDirection="column">
      <Intro title={PROVIDERS_TITLE} />
      <RailLine />
      {rows.map(({ provider, enabled, installed }) => (
        <RailLine key={provider.id}>
          {`${provider.icon} ${provider.name.padEnd(20)} `}
          <ProviderStatus enabled={enabled} installed={installed} />
        </RailLine>
      ))}
      <End />
    </Box>
  );
}

export function IgnoredList({ ids }: { ids: string[] }) {
  if (ids.length === 0) {
    return <Notice title={IGNORED_TITLE} kind="info" text="No packages ignored" />;
  }
  return (
    <Box flexDirection="column">
      <Intro title={IGNORED_TITLE} />
      <RailLine />
      {ids.map((id) => (
        <RailLine key={id}>
          <Text dimColor>•</Text> {id}
        </RailLine>
      ))}
      <End />
    </Box>
  );
}

interface NoticeProps {
  title: string;
  kind: LogKind;
  text: string;
  hint?: string;
}

export function Notice({ title, kind, text, hint }: NoticeProps) {
  return (
    <Box flexDirection="column">
      <Intro title={title} />
      <Log kind={kind}>{text}</Log>
      {hint && (
        <RailLine>
          <Text dimColor>{hint}</Text>
        </RailLine>
      )}
    </Box>
  );
}

export function Help({ version }: { version: string }) {
  return (
    <Box flexDirection="column">
      <Intro title={`Update Manager v${version}`} />
      {HELP_SECTIONS.map(({ title, rows }) => (
        <Box key={title} flexDirection="column">
          <RailLine />
          <RailLine>
            <Text dimColor>{title}</Text>
          </RailLine>
          {rows.map((row) => (
            <RailLine key={row}>{`  ${row}`}</RailLine>
          ))}
        </Box>
      ))}
      <End />
    </Box>
  );
}

export function ErrorLine({ text, color = false }: { text: string; color?: boolean }) {
  return (
    <Text>
      <Text color={color ? "red" : undefined}>■</Text>
      {"  "}
      {text}
    </Text>
  );
}

const print = (node: ReactElement) => process.stdout.write(renderToString(node) + "\n");

export const printText = (text: string) => print(<Text>{text}</Text>);
export const printProviders = (rows: ProviderRow[]) => print(<ProviderList rows={rows} />);
export const printIgnored = (ids: string[]) => print(<IgnoredList ids={ids} />);
export const printHelp = (version: string) => print(<Help version={version} />);
export const printNotice = (props: NoticeProps) => print(<Notice {...props} />);
export const printProvidersNotice = (kind: LogKind, text: string) =>
  printNotice({ title: PROVIDERS_TITLE, kind, text });

export function printErrorLine(text: string): void {
  // El rojo solo si stderr es una terminal: `2> err.txt` queda sin escapes
  const node = <ErrorLine text={text} color={Boolean(process.stderr.isTTY)} />;
  // Sin el ancho por defecto de 80 columnas, un stack largo no se parte a media ruta
  process.stderr.write(renderToString(node, { columns: Infinity }) + "\n");
}
