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

export type TerminalAction =
  | { type: 'input.set'; value: string; cursor?: number }
  | { type: 'input.insert'; text: string }
  | { type: 'input.deleteBackward' }
  | { type: 'input.clear' }
  | { type: 'input.cursor.set'; index: number }
  | { type: 'input.raw'; key: string; text?: string }
  | { type: 'input.submit' }
  | { type: 'history.prev' }
  | { type: 'history.next' }
  | { type: 'interrupt' }
  | { type: 'screen.clear' }
  | { type: 'mode.set'; mode: string; reason?: string }
  | { type: 'session.reset' }
  | { type: 'session.restore'; snapshot: Record<string, unknown> };

export interface SessionEvent {
  type: string;
  [key: string]: unknown;
}

export interface DiagnosticEvent {
  type: 'diagnostic';
  level: string;
  source: string;
  code: string;
  message: string;
  error?: unknown;
}

export interface TerminalSession {
  dispatch(action: TerminalAction | Record<string, unknown>): Promise<boolean>;
  subscribe(listener: (event: SessionEvent) => void): () => void;
  getState(): Record<string, unknown>;
  snapshot(): Record<string, unknown>;
  restore(snapshot: Record<string, unknown>): boolean;
  destroy(): void;
}

export interface DomTerminalAdapter {
  capabilities: Record<string, unknown>;
  activeInput: HTMLInputElement | null;
  lastDispatch: Promise<unknown>;
  mount(session: TerminalSession): this;
  destroy(): void;
  focus(options?: { preventScroll?: boolean }): void;
}

export interface ExtensionDefinition {
  name: string;
  requires?: string[];
  capabilities?: Record<string, boolean | { required?: boolean; reason?: string }>;
  contributions?: Record<string, unknown[]>;
  activate?: (context: Record<string, unknown>) => void | (() => void) | { dispose(): void };
  meta?: Record<string, unknown>;
}

export interface ExtensionGraph {
  activeExtensions: string[];
  skippedExtensions: string[];
  contributions: Record<string, unknown[]>;
  diagnostics: Array<Record<string, unknown>>;
  activate(context?: Record<string, unknown>): void;
  dispose(): void;
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
export function defineExtension(options: ExtensionDefinition): ExtensionDefinition;
export function validateExtension(extension: unknown): { ok: boolean; diagnostics: Array<Record<string, unknown>> };
export function composeExtensions(extensions?: Array<ExtensionDefinition | ExtensionDefinition[]>, options?: { capabilities?: Record<string, boolean> }): ExtensionGraph;
export function getExtensionDiagnostics(graph: ExtensionGraph): Array<Record<string, unknown>>;
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

export interface VisualLayer {
  root: Element;
  append(value: Node | string | number, options?: VisualLayerNodeOptions): Element | null;
  text(value: string | number, options?: VisualLayerNodeOptions): Element | null;
  clear(): void;
  destroy(): void;
}

export interface VisualLayerNodeOptions {
  kind?: string;
  className?: string;
  tagName?: string;
}

export interface VisualLayerOptions {
  document?: Document;
  name?: string;
  className?: string;
  ariaHidden?: boolean;
  append?: boolean;
  maxNodes?: number;
  tagName?: string;
}

export interface VisualTimeline {
  animate(node: Element, keyframes?: Keyframe[] | PropertyIndexedKeyframes, timing?: KeyframeAnimationOptions): { finished: Promise<unknown>; cancel(): void };
  destroy(): void;
}

export interface VisualTimelineOptions {
  duration?: number;
  reducedMotion?: boolean;
}

export interface VisualPathPoint {
  x?: number;
  y?: number;
  angle?: number;
  scale?: number;
  opacity?: number;
}

export type VisualPathSampler = (distance: number, token: Record<string, unknown>, context: Record<string, unknown>) => VisualPathPoint;

export interface VisualPathOptions {
  type?: 'line' | 'orbit' | 'sine' | 'spiral' | string;
  x?: number;
  y?: number;
  cx?: number;
  cy?: number;
  rx?: number;
  ry?: number;
  radius?: number;
  angle?: number;
  phase?: number;
  step?: number;
  amplitude?: number;
  frequency?: number;
  slope?: number;
  startRadius?: number;
  growth?: number;
}

export interface VisualTextPathOptions {
  maxTokens?: number;
  mode?: 'words' | 'chars' | string;
  split?: 'words' | 'chars' | string;
  advance?: number;
  spaceAdvance?: number;
  start?: number;
  kind?: string;
  className?: string;
  tagName?: string;
  layer?: VisualLayerOptions;
  decorate?: (node: Element, entry: VisualTextPathEntry, index: number, entries: VisualTextPathEntry[], host: VisualHost) => void;
}

export interface VisualTextPathEntry extends VisualPathPoint {
  text: string;
  index: number;
  sourceIndex: number;
  distance: number;
  kind: string;
  wordIndex: number;
  wordCharIndex: number;
  wordStartDistance: number;
  wordCenterDistance: number;
  charOffset: number;
  wordWidth: number;
  wordCenterOffset: number;
}

export interface VisualHost {
  mount: Element;
  layers: Map<string, VisualLayer>;
  layer(name?: string, options?: VisualLayerOptions): VisualLayer;
  timeline(options?: VisualTimelineOptions): VisualTimeline;
  emitText(layerName: string, text: string, options?: Record<string, unknown>): Element[];
  emitPathText(layerName: string, text: string, path: VisualPathOptions | VisualPathSampler | { sample: VisualPathSampler }, options?: VisualTextPathOptions): Element[];
  bind(session: TerminalSession, handlers?: Record<string, (event: SessionEvent, host: VisualHost) => void>): () => void;
  cleanup(disposer: () => void): () => void;
  destroy(): void;
}

export function ok(stdout?: string, extra?: Partial<CommandResult>): CommandResult;
export function fail(stderr?: string, status?: number, extra?: Partial<CommandResult>): CommandResult;
export function normalizeResult(result?: Partial<CommandResult> | string): CommandResult;
export function onDiagnostic(listener: (event: DiagnosticEvent) => void): () => void;
export function reportDiagnostic(error: unknown, context?: Record<string, unknown>): void;
export function withDiagnostic<T>(fn: () => T, context?: Record<string, unknown>): T | undefined;
export function createLinuxLikeFs(options?: Record<string, unknown>): MemoryFileSystem;
export function createTerminal(options?: TerminalOptions): TerminalCore;
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
export const TERMLET_PROTOCOL: string;
export function getActionSchema(): Record<string, unknown>;
export function getEventSchema(): Record<string, unknown>;
export function getSnapshotSchema(): Record<string, unknown>;
export function isTerminalAction(value: unknown): value is TerminalAction;
export function isTerminalEvent(value: unknown): value is SessionEvent;
export const ERR_INVALID_ACTION: string;
export const ERR_INVALID_STATE: string;
export const ERR_COMMAND_NOT_FOUND: string;
export const ERR_COMMAND_RUNNING: string;
export const ERR_COMMAND_TIMEOUT: string;
export const ERR_COMMAND_INTERRUPTED: string;
export const ERR_PERMISSION_DENIED: string;
export const ERR_PATH_NOT_FOUND: string;
export const ERR_SNAPSHOT_INVALID: string;
export const ERR_SNAPSHOT_UNSUPPORTED: string;
export const ERR_MODE_UNSUPPORTED: string;
export const ERR_CAPABILITY_DENIED: string;
export const ERR_OUTPUT_LIMIT: string;
export const ERR_INTERNAL: string;
export function createTerminalSession(terminal: TerminalCore, options?: Record<string, unknown>): TerminalSession;
export function createDomTerminalAdapter(options?: Record<string, unknown>): DomTerminalAdapter;
export function createTranscriptStore(options?: Record<string, unknown>): {
  append(entry: Record<string, unknown>): Record<string, unknown> | null;
  entries(): Array<Record<string, unknown>>;
  clear(): void;
  snapshot(): Record<string, unknown>;
  restore(snapshot: Record<string, unknown>): boolean;
};
export function createInputController(options?: Record<string, unknown>): {
  handleKey(eventLike?: Record<string, unknown>): TerminalAction[];
  insertText(text: string): TerminalAction[];
  dispose(): void;
};
export function createCompletionEngine(): {
  registerProvider(provider: Record<string, unknown> & { provide(context: Record<string, unknown>): unknown[] | Promise<unknown[]> }): () => void;
  complete(context?: Record<string, unknown>): Promise<{ requestId: number; items: Array<Record<string, unknown>>; diagnostics: Array<Record<string, unknown>> }>;
  providers(): Array<Record<string, unknown>>;
  dispose(): void;
};
export function createOutputStreamController(options?: Record<string, unknown>): {
  push(chunk?: Record<string, unknown>): Record<string, unknown>;
  result(runId?: string): { stdout: string; stderr: string; truncated: boolean };
  cancel(runId?: string): void;
  clear(): void;
};
export function createInteractionModeMachine(options?: Record<string, unknown>): {
  current(): string;
  setMode(mode: string, reason?: string): boolean;
  reset(reason?: string): void;
  subscribe(listener: (event: Record<string, unknown>) => void): () => void;
  dispose(): void;
};
export function formatJson(value: unknown, options?: Record<string, unknown>): string;
export function formatTree(tree: Record<string, unknown>, options?: Record<string, unknown>): string;
export function createCapabilityBroker(initial?: Record<string, unknown>): {
  register(name: string, capability: unknown): () => void;
  has(name: string): boolean;
  request(name: string, context?: Record<string, unknown>): Record<string, unknown>;
  audit(): Array<Record<string, unknown>>;
  dispose(): void;
};
export function createLayer(mount: Element, options?: VisualLayerOptions): VisualLayer;
export function createVisualHost(mount: Element, options?: VisualLayerOptions & { className?: string }): VisualHost;
export function createTimeline(options?: VisualTimelineOptions): VisualTimeline;
export function createPath(options?: VisualPathOptions): VisualPathSampler;
export function layoutTextPath(text: string, path: VisualPathOptions | VisualPathSampler | { sample: VisualPathSampler }, options?: VisualTextPathOptions): VisualTextPathEntry[];
export function getBounds(element: Element): { x: number; y: number; width: number; height: number };
export function tokenizeText(text: string, options?: { mode?: 'words' | 'chars' | string; split?: 'words' | 'chars' | string; maxTokens?: number }): Array<Record<string, unknown>>;
export function createSessionContractTests(options?: Record<string, unknown>): { run(): Promise<{ ok: boolean; diagnostics: Array<Record<string, unknown>> }> };
export function createAdapterContractTests(options?: Record<string, unknown>): { run(): Promise<{ ok: boolean; diagnostics: Array<Record<string, unknown>> }> };
export function createExtensionContractTests(options?: Record<string, unknown>): { run(): { ok: boolean; diagnostics: Array<Record<string, unknown>> } };
export function mountStarterTerminal(options?: Record<string, unknown>): Promise<{ terminal: TerminalCore; session: TerminalSession; adapter: DomTerminalAdapter }>;
export function mountStaticTerminal(options?: Record<string, unknown>): Promise<{ terminal: TerminalCore; session: TerminalSession; adapter: DomTerminalAdapter }>;
export function createFeedTerminal(options?: Record<string, unknown>): Promise<TerminalCore>;
export function mountFeedTerminal(options?: Record<string, unknown>): Promise<{ terminal: TerminalCore; session: TerminalSession; adapter: DomTerminalAdapter }>;
export function createHugoTerminal(options?: Record<string, unknown>): Promise<TerminalCore>;
export function mountHugoTerminal(options?: Record<string, unknown>): Promise<{ terminal: TerminalCore; session: TerminalSession; adapter: DomTerminalAdapter }>;
export function createStorageAdapter(options?: Record<string, unknown>): PersistenceAdapter;
export function createSessionStorageAdapter(options?: Record<string, unknown>): PersistenceAdapter;
export function memoryPersistenceAdapter(initialState?: Record<string, unknown>): PersistenceAdapter;
