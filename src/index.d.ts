export type TerminalEvent =
  | { type: 'clear' }
  | { type: 'session-reset' }
  | { type: 'exit' }
  | { type: 'effect'; name: string; args?: string[] }
  | { type: 'editor'; editor: string; file?: string | null }
  | Record<string, unknown>;

export interface CommandResult {
  status: number;
  stdout: string;
  stderr: string;
  events: TerminalEvent[];
  data: Array<Record<string, unknown> | unknown> | null;
}

export interface CommandContext {
  name: string;
  args: string[];
  stdin: string;
  input: Array<Record<string, unknown> | unknown> | null;
  signal: AbortSignal | null;
  terminal: TerminalCore;
  fs: MemoryFileSystem;
  user: string;
  groups: string[];
  hostname: string;
  cwd: string;
  home: string;
  env: Record<string, string>;
}

export type CommandHandler = (context: CommandContext) => CommandResult | Promise<CommandResult>;
export type TerminalPlugin = ((terminal: TerminalCore, options?: unknown) => void) | { install(terminal: TerminalCore, options?: unknown): void };
export type CommandPack = TerminalPlugin | [TerminalPlugin, unknown];

export interface TerminalProfile {
  name?: string;
  core?: Partial<TerminalOptions>;
  env?: Record<string, string>;
  aliases?: Record<string, string>;
  commandPacks?: CommandPack[];
  plugins?: CommandPack[];
  formatPipelineData?: (data: unknown[], context?: { terminal: TerminalCore }) => string;
  meta?: Record<string, unknown>;
}

export interface PersistenceAdapter {
  load(): Record<string, unknown>;
  save(state: Record<string, unknown>): void;
  reset(): void;
}

export interface TerminalOptions {
  user?: string;
  groups?: string[];
  hostname?: string;
  cwd?: string;
  home?: string;
  env?: Record<string, string>;
  aliases?: Record<string, string>;
  history?: string[];
  maxHistory?: number;
  fs?: MemoryFileSystem;
  fsOptions?: Record<string, unknown>;
  profile?: TerminalProfile | ((options: TerminalOptions) => TerminalProfile);
  plugins?: CommandPack[];
  commandPacks?: CommandPack[];
  basicCommands?: false | Record<string, unknown>;
  systemCommands?: false | Record<string, unknown>;
  caseInsensitiveCommands?: boolean;
  backslashEscapes?: boolean;
  expandGlobs?: boolean;
  maxLineLength?: number;
  maxCommandSubstitutionLength?: number;
  maxOutputBytes?: number;
  commandTimeoutMs?: number;
  formatPipelineData?: (data: unknown[], context?: { terminal: TerminalCore }) => string;
  persistence?: PersistenceAdapter;
  persistEnv?: boolean | string[];
  persistVfs?: boolean;
  restore?: boolean;
}

export class TerminalCore {
  constructor(options?: TerminalOptions);
  fs: MemoryFileSystem;
  user: string;
  groups: string[];
  hostname: string;
  cwd: string;
  home: string;
  env: Record<string, string>;
  aliases: Record<string, string>;
  history: string[];
  lastStatus: number;
  profileName: string;
  persistVfs: boolean;
  maxOutputBytes: number;
  commandTimeoutMs: number;
  persistence: PersistenceAdapter | null;
  use(plugin: TerminalPlugin, options?: unknown): this;
  register(name: string, handler: CommandHandler, meta?: Record<string, unknown>): this;
  unregister(name: string): boolean;
  hasCommand(name: string): boolean;
  command(name: string): { name: string; handler: CommandHandler; meta: Record<string, unknown> } | null;
  alias(name: string): string | null;
  setAlias(name: string, value: string): this;
  removeAlias(name: string): boolean;
  disposePlugins(): this;
  commandNames(): string[];
  complete(line: string): string[];
  completeCommand(token: string): string[];
  completePath(token: string): string[];
  envSnapshot(): Record<string, string>;
  resolve(path: string): string;
  execute(line: string, options?: { signal?: AbortSignal | null }): Promise<CommandResult>;
  snapshot(): Record<string, unknown>;
  restore(state?: Record<string, unknown>): this;
  captureInitialVfsSnapshot(): this;
  persist(): void;
  resetSessionState(): this;
}

export interface VfsNode {
  type: 'dir' | 'file' | 'exec' | string;
  owner: string;
  user: string;
  group: string;
  perm: string;
  date: string;
  size: number;
  content?: string;
  link?: string;
  title?: string;
  meta?: Record<string, unknown>;
}

export class MemoryFileSystem {
  constructor(options?: { now?: () => Date; clockText?: string });
  nodes: Map<string, VfsNode>;
  normalize(target?: string, context?: { cwd?: string; home?: string }): string;
  dirname(path: string): string;
  basename(path: string): string;
  has(path: string): boolean;
  stat(path: string): ({ path: string } & VfsNode) | null;
  addDir(path: string, meta?: Partial<VfsNode>): string;
  ensureDir(path: string, meta?: Partial<VfsNode>): void;
  makeDir(path: string, context?: Record<string, unknown>): string;
  addFile(path: string, content?: string, meta?: Partial<VfsNode>): string;
  addExecutable(path: string, handler: CommandHandler, meta?: Partial<VfsNode>): string;
  list(path: string, context?: Record<string, unknown>): string[];
  readFile(path: string, context?: Record<string, unknown>): string;
  writeFile(path: string, content: string, context?: Record<string, unknown>): void;
  remove(path: string, context?: Record<string, unknown>): void;
  copy(source: string, target: string, context?: Record<string, unknown>): string;
  move(source: string, target: string, context?: Record<string, unknown>): string;
  chmod(path: string, mode: string, context?: Record<string, unknown>): void;
  chown(path: string, owner: string, group?: string, context?: Record<string, unknown>): void;
  canRead(path: string, context?: Record<string, unknown>): boolean;
  canWrite(path: string, context?: Record<string, unknown>): boolean;
  canExecute(path: string, context?: Record<string, unknown>): boolean;
  glob(pattern: string, context?: Record<string, unknown>): string[];
  snapshot(): Record<string, unknown>;
  restoreSnapshot(state?: Record<string, unknown>): this;
}

export class VfsError extends Error {
  code: string;
}

export function defineCommandPack(name: string, install: (terminal: TerminalCore, options?: unknown) => void, meta?: Record<string, unknown>): TerminalPlugin;
export function defineCommandPack(options: { name?: string; install: (terminal: TerminalCore, options?: unknown) => void; meta?: Record<string, unknown> }): TerminalPlugin;
export function defineProfile(name: string, options?: Omit<TerminalProfile, 'name'>): TerminalProfile;
export function defineProfile(options: TerminalProfile): TerminalProfile;
export function mergeProfileOptions(options?: TerminalOptions): TerminalOptions;
export function formatRecords(records: unknown[], columns?: string[] | null): string;
export function getRecordValue(record: unknown, property: string): unknown;
export function normalizeProperties(values: string[]): string[];
export function projectRecords(records: Array<Record<string, unknown>>, properties: string[]): Array<Record<string, unknown>>;
export function sortRecords(records: Array<Record<string, unknown>>, property: string, direction?: 'asc' | 'desc' | string): Array<Record<string, unknown>>;
export function filterRecords(records: Array<Record<string, unknown>>, property: string, operator: string, expected: unknown): Array<Record<string, unknown>>;
export const DEFAULT_TERMINAL_CSS: string;

export type DomRenderedValue = Node | string | number | false | null | undefined | DomRenderedValue[] | Iterable<DomRenderedValue>;

export interface TermletRenderer {
  name: string;
  meta: Record<string, unknown>;
  hooks: TermletRendererHooks;
}

export interface TermletRendererHooks {
  onMount?: (context: DomRenderLifecycleContext) => void | (() => void);
  onDestroy?: (context: DomRenderLifecycleContext) => void;
  onInputCreated?: (context: DomInputCreatedContext) => void;
  renderLiveInput?: (context: DomLiveInputRenderContext) => void | DomRenderedValue;
  renderInput?: (context: DomInputRenderContext) => DomRenderedValue;
  renderLine?: (context: DomLineRenderContext) => DomRenderedValue;
  renderResult?: (context: DomResultRenderContext) => DomRenderedValue | true | Promise<DomRenderedValue | true>;
  onCommand?: (context: DomCommandLifecycleContext) => void;
  onResult?: (context: DomResultLifecycleContext) => void;
  onEvent?: (context: DomEventLifecycleContext) => void;
  onError?: (context: DomErrorLifecycleContext) => void;
}

export interface DomRenderContextBase {
  renderer: DomTerminalRenderer;
  terminal: TerminalCore;
  document: Document;
  mount: Element;
  output: Element;
}

export interface DomLineRenderContext extends DomRenderContextBase {
  text: string;
  className: string;
  restoring: boolean;
}

export interface DomInputRenderContext extends DomRenderContextBase {
  prompt: string;
  command: string;
  row: Element;
  restoring: boolean;
}

export interface DomInputCreatedContext extends DomRenderContextBase {
  row: Element;
  input: HTMLInputElement;
  prompt: string;
  value: string;
  command: string;
}

export interface DomLiveInputRenderContext extends DomInputCreatedContext {
  clear: boolean;
}

export interface DomRenderLifecycleContext extends DomRenderContextBase {}

export interface DomCommandLifecycleContext extends DomRenderContextBase {
  command: string;
}

export interface DomResultLifecycleContext extends DomCommandLifecycleContext {
  result: CommandResult;
}

export interface DomEventLifecycleContext extends DomRenderContextBase {
  event: TerminalEvent;
}

export interface DomErrorLifecycleContext extends DomCommandLifecycleContext {
  error: unknown;
}

export interface DomResultRenderContext extends DomRenderContextBase {
  result: CommandResult;
  command: string;
  resetSession: boolean;
  print(text: string, className?: string): Element | null;
  printBlock(text: string, className?: string): void;
  append(rendered: DomRenderedValue, transcriptEntry?: Record<string, unknown> | null): Element | null;
  defaultRender(): void;
}

export class DomTerminalRenderer {
  constructor(core: TerminalCore, options?: {
    mount: string | Element;
    document?: Document;
    prompt?: () => string;
    history?: string[];
    className?: string;
    theme?: string;
    themeClass?: string;
    welcome?: string;
    maxLines?: number;
    persistTranscript?: boolean;
    restoreTranscript?: boolean;
    maxTranscriptEntries?: number;
    maxTranscriptBytes?: number;
    autoFocus?: boolean;
    ariaLabel?: string;
    onEvent?: (event: TerminalEvent, renderer: DomTerminalRenderer) => void;
    onCommand?: (command: string, terminal: TerminalCore) => void;
    onResult?: (result: CommandResult, command: string, terminal: TerminalCore) => void;
    onError?: (error: unknown, command: string, terminal: TerminalCore) => void;
    renderer?: TermletRenderer | TermletRenderer[];
    renderers?: TermletRenderer[];
    editorPreview?: boolean;
  });
  attach(): this;
  destroy(): this;
  focus(): void;
  print(text: string, cls?: string): Element | null;
  printBlock(text: string, cls?: string): void;
  appendLine(text: string, cls?: string, options?: Record<string, unknown>): Element | null;
  appendOutput(rendered: DomRenderedValue, transcriptEntry?: Record<string, unknown> | null): Element | null;
  renderDefaultResult(result: CommandResult, options?: { resetSession?: boolean }): void;
  renderCommandResult(result: CommandResult, command: string, options?: { resetSession?: boolean }): Promise<boolean>;
  restoreTranscript(): boolean;
  clearTranscript(): void;
  saveTranscript(): void;
  handleEvents(events?: TerminalEvent[]): void;
  abortRunning(): boolean;
}

export function ok(stdout?: string, extra?: Partial<CommandResult>): CommandResult;
export function fail(stderr?: string, status?: number, extra?: Partial<CommandResult>): CommandResult;
export function normalizeResult(result?: Partial<CommandResult> | string): CommandResult;
export function createLinuxLikeFs(options?: Record<string, unknown>): MemoryFileSystem;
export function createTerminal(options?: TerminalOptions): TerminalCore;
export function createWebTerminal(options?: TerminalOptions): TerminalCore;
export function createBlogTerminal(options?: TerminalOptions): TerminalCore;
export function createWindowsTerminal(options?: TerminalOptions & { shell?: 'powershell' | 'cmd'; windowsCommands?: Record<string, unknown> }): TerminalCore;
export function basicCommandsPlugin(terminal: TerminalCore, options?: Record<string, unknown>): void;
export function systemCommandsPlugin(terminal: TerminalCore, options?: Record<string, unknown>): void;
export function effectEventsPlugin(terminal: TerminalCore, options?: Record<string, unknown>): void;
export function windowsCommandsPlugin(terminal: TerminalCore, options?: Record<string, unknown>): void;
export function toWindowsPath(path: string, drive?: string): string;
export function fromWindowsPath(path: string): string;
export function feedPostsPlugin(posts?: Array<Record<string, string>>, options?: Record<string, unknown>): TerminalPlugin;
export function fetchFeedPosts(feedUrl?: string, fetchImpl?: typeof fetch): Promise<Array<Record<string, string>>>;
export function fetchDiscoveredFeedPosts(options?: { feedUrl?: string; fetch?: typeof fetch; fetchImpl?: typeof fetch; document?: Document; baseUrl?: string }): Promise<Array<Record<string, string>>>;
export function parseFeedPosts(text: string): Array<Record<string, string>>;
export function discoverFeedUrl(doc?: Document, baseUrl?: string): string | null;
export function hugoPostsPlugin(posts?: Array<Record<string, string>>, options?: Record<string, unknown>): TerminalPlugin;
export function fetchHugoPosts(feedUrl?: string, fetchImpl?: typeof fetch): Promise<Array<Record<string, string>>>;
export function blogSandboxPreset(options?: Record<string, unknown>): TerminalPlugin;
export function injectDefaultStyles(doc?: Document): void;
export function defineRenderer(name: string, hooks: TermletRendererHooks, meta?: Record<string, unknown>): TermletRenderer;
export function defineRenderer(options: { name?: string; hooks?: TermletRendererHooks; meta?: Record<string, unknown> } & Partial<TermletRendererHooks>): TermletRenderer;
export function composeRenderers(...renderers: Array<TermletRenderer | TermletRenderer[]>): TermletRenderer;
export function createTokenLayer(mount: Element, options?: {
  document?: Document;
  root?: Element;
  className?: string;
  ariaHidden?: boolean;
  append?: boolean;
  maxGroups?: number;
}): {
  root: Element;
  emit(text: string, options?: {
    kind?: string;
    mode?: 'words' | 'chars' | string;
    split?: 'words' | 'chars' | string;
    maxTokens?: number;
    className?: string;
    tokenClassName?: string;
    tagName?: string;
    tokenTagName?: string;
    decorateToken?: (token: Element, item: Record<string, unknown>, index: number, tokens: Array<Record<string, unknown>>) => void;
    decorateGroup?: (group: Element, tokens: Array<Record<string, unknown>>) => void;
  }): Element;
  clear(): void;
  destroy(): void;
};
export function createOrbitRenderer(options?: Record<string, unknown>): TermletRenderer;
export function createRainRenderer(options?: Record<string, unknown>): TermletRenderer;
export function createOrbitNode(document: Document, text: string, options?: Record<string, unknown>): Element;
export function createRainNode(document: Document, text: string, options?: Record<string, unknown>): Element;
export function tokenizeText(text: string, options?: { mode?: 'words' | 'chars' | string; maxTokens?: number }): Array<Record<string, unknown>>;
export function mountStarterTerminal(options?: Record<string, unknown>): Promise<{ terminal: TerminalCore; renderer: DomTerminalRenderer }>;
export function mountStaticTerminal(options?: Record<string, unknown>): Promise<{ terminal: TerminalCore; renderer: DomTerminalRenderer }>;
export function createFeedTerminal(options?: Record<string, unknown>): Promise<TerminalCore>;
export function mountFeedTerminal(options?: Record<string, unknown>): Promise<{ terminal: TerminalCore; renderer: DomTerminalRenderer }>;
export function createHugoTerminal(options?: Record<string, unknown>): Promise<TerminalCore>;
export function mountHugoTerminal(options?: Record<string, unknown>): Promise<{ terminal: TerminalCore; renderer: DomTerminalRenderer }>;
export function createStorageAdapter(options?: Record<string, unknown>): PersistenceAdapter;
export function createSessionStorageAdapter(options?: Record<string, unknown>): PersistenceAdapter;
export function memoryPersistenceAdapter(initialState?: Record<string, unknown>): PersistenceAdapter;
