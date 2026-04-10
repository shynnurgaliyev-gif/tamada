// Shared utilities — add as the project grows

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${String(x)}`);
}
