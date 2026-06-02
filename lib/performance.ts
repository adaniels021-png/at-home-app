export function runInBackground(task: () => Promise<void>, label = 'Background task') {
  task().catch((error) => {
    console.log(`${label} failed:`, error);
  });
}

export async function withTimeout<T>(
  promiseLike: PromiseLike<T>,
  timeoutMs = 10000
): Promise<T> {
  return Promise.race([
    Promise.resolve(promiseLike),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), timeoutMs)
    ),
  ]);
}