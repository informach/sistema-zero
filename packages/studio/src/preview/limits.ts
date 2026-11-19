/** Shared configuration must not load the parser used to instrument running code. */
/** Continuous synchronous loop budget; it resets when the program yields. */
export const DEFAULT_LOOP_BUDGET_MS = 4_000
/** Preview heartbeat watchdog timeout. */
export const DEFAULT_HEARTBEAT_TIMEOUT_MS = 6_000
/** Shared console envelope. The sender reserves one slot for an omission summary. */
export const PREVIEW_CONSOLE_WINDOW_MS = 1_000
export const PREVIEW_CONSOLE_MESSAGE_BUDGET = 180
