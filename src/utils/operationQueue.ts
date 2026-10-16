/** Order writes per account/shop. A rejected operation does not poison later retries. */
export function createOperationQueue() {
  const tails = new Map<string, Promise<unknown>>();
  return function enqueue<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const result = (tails.get(key) ?? Promise.resolve()).catch(() => undefined).then(operation);
    tails.set(key, result);
    void result.finally(() => {
      if (tails.get(key) === result) tails.delete(key);
    }).catch(() => undefined);
    return result;
  };
}
