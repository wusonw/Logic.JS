import { Port } from './Port';

export interface EdgeData {
  id: string;
  sourcePort: Port;
  targetPort: Port;
}

export abstract class Edge {
  protected id: string;
  protected sourcePort: Port;
  protected targetPort: Port;

  constructor(data: EdgeData) {
    this.id = data.id;
    this.sourcePort = data.sourcePort;
    this.targetPort = data.targetPort;
  }

  public getId(): string {
    return this.id;
  }

  public getSourcePort(): Port {
    return this.sourcePort;
  }

  public getTargetPort(): Port {
    return this.targetPort;
  }

  public abstract validate(): boolean;
  public abstract transfer(): void;
} 
