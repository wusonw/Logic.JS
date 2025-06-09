import { EventEmitter } from './EventEmitter';
import { Port } from './Port';

export interface EdgeEvents {
  'connected': [sourcePort: Port, targetPort: Port];
  'disconnected': [];
}

export interface EdgeData {
  id: string;
  sourcePortId: string;
  targetPortId: string;
}

export class Edge extends EventEmitter<EdgeEvents> {
  private id: string;
  private sourcePort: Port;
  private targetPort: Port;

  constructor(data: EdgeData, portMap: Map<string, Port>) {
    super();
    this.id = data.id;
    const sourcePort = portMap.get(data.sourcePortId);
    const targetPort = portMap.get(data.targetPortId);
    if (!sourcePort || !targetPort) {
      throw new Error('Port not found');
    }
    this.sourcePort = sourcePort;
    this.targetPort = targetPort;
    this.emit('connected', sourcePort, targetPort);
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

  public disconnect(): void {
    this.emit('disconnected');
  }

  public toJSON(): EdgeData {
    return {
      id: this.id,
      sourcePortId: this.sourcePort.getId(),
      targetPortId: this.targetPort.getId()
    };
  }

  public validate(): boolean { return true; }
  public transfer(): void { }
}
