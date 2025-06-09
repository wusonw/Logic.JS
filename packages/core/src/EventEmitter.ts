type EventCallback<T extends any[]> = (...args: T) => void;

export class EventEmitter<T extends { [K in keyof T]: any[] }> {
  private events: Map<keyof T, EventCallback<any[]>[]>;

  constructor() {
    this.events = new Map();
  }

  public on<K extends keyof T>(event: K, callback: EventCallback<T[K]>): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  public off<K extends keyof T>(event: K, callback: EventCallback<T[K]>): void {
    if (!this.events.has(event)) return;
    const callbacks = this.events.get(event)!;
    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  }

  public emit<K extends keyof T>(event: K, ...args: T[K]): void {
    if (!this.events.has(event)) return;
    this.events.get(event)!.forEach(callback => callback(...args));
  }
} 
