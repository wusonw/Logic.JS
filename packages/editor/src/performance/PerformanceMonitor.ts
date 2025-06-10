export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private timers: Map<string, number[]>;

  private constructor() {
    this.timers = new Map();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  public start(label: string) {
    this.timers.set(label, [performance.now()]);
  }

  public end(label: string) {
    const timers = this.timers.get(label);
    if (timers) {
      const startTime = timers[0];
      const endTime = performance.now();
      const duration = endTime - startTime;
      timers.push(duration);

      // If operation time exceeds 16ms (approximately 60fps), emit warning
      if (duration > 16) {
        console.warn(`Performance warning: ${label} took ${duration.toFixed(2)}ms`);
      }

      // Only keep the last 100 records
      if (timers.length > 100) {
        timers.shift();
      }
    }
  }

  public getAverage(label: string): number {
    const timers = this.timers.get(label);
    if (!timers || timers.length < 2) return 0;
    const durations = timers.slice(1);
    return durations.reduce((a, b) => a + b, 0) / durations.length;
  }

  public getMetrics() {
    const metrics: Record<string, number> = {};
    this.timers.forEach((_, label) => {
      metrics[label] = this.getAverage(label);
    });
    return metrics;
  }
} 
