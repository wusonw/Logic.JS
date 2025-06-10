export class Cache<T> {
  private cache: Map<string, T> = new Map();

  public useCache(key: string, compute: () => T): T {
    if (!this.cache.has(key)) {
      this.cache.set(key, compute());
    }
    return this.cache.get(key)!;
  }

  public clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  public has(key: string): boolean {
    return this.cache.has(key);
  }
} 
