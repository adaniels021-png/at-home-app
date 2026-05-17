export function runInBackground(task: () => Promise<void>, label = 'Background task') {
  task().catch((error) => {
    console.log(`${label} failed:`, error);
  });
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = 10000,
  message = 'Request timed out.'
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeout]);
}