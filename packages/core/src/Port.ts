export interface PortData {
  id: string;
  name: string;
  type: string;
  nodeId: string;
  value?: any;
}

export abstract class Port {
  protected id: string;
  protected name: string;
  protected type: string;
  protected nodeId: string;
  protected value: any;

  constructor(data: PortData) {
    this.id = data.id;
    this.name = data.name;
    this.type = data.type;
    this.nodeId = data.nodeId;
    this.value = data.value;
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

  public abstract canConnect(port: Port): boolean;
} 
