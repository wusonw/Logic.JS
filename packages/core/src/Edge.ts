import { Port } from './Port';

export interface EdgeData {
  id: string;
  sourcePort: Port;
  targetPort: Port;
}

export class Edge {
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

  public toJSON(): { id: string; sourcePortId: string; targetPortId: string } {
    return {
      id: this.getId(),
      sourcePortId: this.sourcePort.getId(),
      targetPortId: this.targetPort.getId()
    };
  }

  public fromJSON(data: { id: string; sourcePortId: string; targetPortId: string }, portMap: Map<string, Port>): void {
    this.id = data.id;

    const sourcePort = portMap.get(data.sourcePortId);
    const targetPort = portMap.get(data.targetPortId);

    if (!sourcePort || !targetPort) {
      throw new Error('Port not found for edge');
    }

    this.sourcePort = sourcePort;
    this.targetPort = targetPort;
  }

  public static fromJSON<T extends Edge>(this: new (data: EdgeData) => T, data: { id: string; sourcePortId: string; targetPortId: string }, portMap: Map<string, Port>): T {
    const sourcePort = portMap.get(data.sourcePortId);
    const targetPort = portMap.get(data.targetPortId);
    if (!sourcePort || !targetPort) throw new Error('Port not found for edge');
    return new this({ id: data.id, sourcePort, targetPort });
  }

  public validate(): boolean { return true; }
  public transfer(): void { }
}
