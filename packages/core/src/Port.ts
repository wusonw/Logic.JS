import type { Node } from './Node';

export interface PortData {
  id: string;
  name: string;
  type: string;
  nodeId: string;
  value?: any;
}

export class Port {
  protected id: string;
  protected name: string;
  protected type: string;
  protected nodeId: string;
  protected value: any;
  public node?: Node;

  constructor(data: PortData, node?: Node) {
    this.id = data.id;
    this.name = data.name;
    this.type = data.type;
    this.nodeId = data.nodeId;
    this.value = data.value;
    if (node) this.node = node;
  }

  public getId(): string {
    return this.id;
  }

  public getName(): string {
    return this.name;
  }

  public getType(): string {
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
  }

  public canConnect(port: Port): boolean {
    return true;
  }

  public toJSON(): PortData {
    return {
      id: this.getId(),
      name: this.getName(),
      type: this.getType(),
      nodeId: this.getNodeId(),
      value: this.getValue()
    };
  }

  public fromJSON(data: PortData, node?: Node): void {
    this.id = data.id;
    this.name = data.name;
    this.type = data.type;
    this.nodeId = data.nodeId;
    this.value = data.value;
    if (node) this.node = node;
  }

  public static fromJSON<T extends Port>(this: new (data: PortData) => T, data: PortData): T {
    return new this(data);
  }
} 
