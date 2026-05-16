// Structured JSON logger. Replaces ad-hoc console.log with searchable, parseable output.
// Each log line is a single JSON object so it ships cleanly to Datadog, Loki, CloudWatch.

type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
};

const MIN_LEVEL: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) || (process.env.NODE_ENV === "production" ? "info" : "debug");

const REDACT_KEYS = new Set([
  "password",
  "newpassword",
  "currentpassword",
  "token",
  "accesstoken",
  "refreshtoken",
  "secret",
  "apikey",
  "authorization",
  "cookie",
  "ssn",
  "cvv",
  "pin",
  "cardnumber",
  "code",
  "otp",
  "codehash",
  "tokenhash",
]);

function redact(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redact);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    if (REDACT_KEYS.has(k.toLowerCase())) {
      out[k] = "[REDACTED]";
    } else {
      out[k] = redact(v);
    }
  }
  return out;
}

function emit(level: LogLevel, msg: string, ctx?: Record<string, unknown>) {
  if (LEVEL_RANK[level] < LEVEL_RANK[MIN_LEVEL]) return;

  const line = JSON.stringify({
    t: new Date().toISOString(),
    level,
    msg,
    ...(ctx ? (redact(ctx) as Record<string, unknown>) : {}),
  });

  if (level === "error" || level === "fatal") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}

export interface Logger {
  debug(msg: string, ctx?: Record<string, unknown>): void;
  info(msg: string, ctx?: Record<string, unknown>): void;
  warn(msg: string, ctx?: Record<string, unknown>): void;
  error(msg: string, ctx?: Record<string, unknown>): void;
  fatal(msg: string, ctx?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}

function build(bindings: Record<string, unknown>): Logger {
  return {
    debug: (m, c) => emit("debug", m, { ...bindings, ...(c || {}) }),
    info: (m, c) => emit("info", m, { ...bindings, ...(c || {}) }),
    warn: (m, c) => emit("warn", m, { ...bindings, ...(c || {}) }),
    error: (m, c) => emit("error", m, { ...bindings, ...(c || {}) }),
    fatal: (m, c) => emit("fatal", m, { ...bindings, ...(c || {}) }),
    child: (extra) => build({ ...bindings, ...extra }),
  };
}

export const logger = build({});

export function requestLogger(req: { headers: Headers; method?: string; url?: string }): Logger {
  const requestId =
    req.headers.get("x-request-id") ||
    req.headers.get("x-correlation-id") ||
    Math.random().toString(36).slice(2, 12);
  return logger.child({
    requestId,
    method: req.method,
    path: req.url ? new URL(req.url).pathname : undefined,
  });
}
