import { Port, PortData } from './Port';

export interface NodeData {
  id: string;
  name: string;
  type: string;
  position: { x: number; y: number };
  inputs?: PortData[];
  outputs?: PortData[];
}

export abstract class Node {
  protected id: string;
  protected name: string;
  protected type: string;
  protected position: { x: number; y: number };
  protected inputs: Map<string, Port>;
  protected outputs: Map<string, Port>;

  constructor(data: NodeData) {
    this.id = data.id;
    this.name = data.name;
    this.type = data.type;
    this.position = data.position;
    this.inputs = new Map();
    this.outputs = new Map();

    data.inputs?.forEach(input => {
      this.addInput(input);
    });

    data.outputs?.forEach(output => {
      this.addOutput(output);
    });
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

  public getPosition(): { x: number; y: number } {
    return this.position;
  }

  public setPosition(x: number, y: number): void {
    this.position = { x, y };
  }

  public getInputs(): Port[] {
    return Array.from(this.inputs.values());
  }

  public getOutputs(): Port[] {
    return Array.from(this.outputs.values());
  }

  public getInput(id: string): Port | undefined {
    return this.inputs.get(id);
  }

  public getOutput(id: string): Port | undefined {
    return this.outputs.get(id);
  }

  protected abstract addInput(data: PortData): void;
  protected abstract addOutput(data: PortData): void;
  protected abstract process(): void;
} 
