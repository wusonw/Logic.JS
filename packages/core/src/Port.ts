import { EventEmitter } from './EventEmitter';
import type { Node } from './Node';

export interface PortEvents {
  'connected': [targetPort: Port];
  'disconnected': [];
  'value:changed': [value: any];
}

export interface PortData {
  id: string;
  name: string;
  type: 'input' | 'output';
  nodeId: string;
  value?: any;
}

export class Port extends EventEmitter<PortEvents> {
  private id: string;
  private name: string;
  private type: 'input' | 'output';
  private nodeId: string;
  private value: any;
  private offsetX: number = 0;  // X offset relative to node
  private offsetY: number = 0;  // Y offset relative to node

  constructor(data: PortData) {
    super();
    this.id = data.id;
    this.name = data.name;
    this.type = data.type;
    this.nodeId = data.nodeId;
    this.value = data.value;

    // Set default offset based on port type
    if (this.type === 'input') {
      this.offsetX = -10;  // Input port on the left side of node
    } else {
      this.offsetX = 10;   // Output port on the right side of node
    }
  }

  public getId(): string {
    return this.id;
  }

  public getName(): string {
    return this.name;
  }

  public getType(): 'input' | 'output' {
    return this.type;
  }

  public getNodeId(): string {
    return this.nodeId;
  }

  public getValue(): any {
    return this.value;
  }

  public setValue(value: any): void {
    this.value = value;
    this.emit('value:changed', value);
  }

  public canConnect(targetPort: Port): boolean {
    return this.type !== targetPort.type;
  }

  public connect(targetPort: Port): void {
    if (this.canConnect(targetPort)) {
      this.emit('connected', targetPort);
    }
  }

  public disconnect(): void {
    this.emit('disconnected');
  }

  public toJSON(): PortData {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      nodeId: this.nodeId,
      value: this.value
    };
  }

  public fromJSON(data: PortData): void {
    this.id = data.id;
    this.name = data.name;
    this.type = data.type;
    this.nodeId = data.nodeId;
    this.value = data.value;
  }

  public static fromJSON<T extends Port>(this: new (data: PortData) => T, data: PortData): T {
    return new this(data);
  }

  public getPosition(node: Node): { x: number; y: number } {
    const nodePos = node.getPosition();
    return {
      x: nodePos.x + this.offsetX,
      y: nodePos.y + this.offsetY
    };
  }

  public setOffset(x: number, y: number): void {
    this.offsetX = x;
    this.offsetY = y;
  }
} 
