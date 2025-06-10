import { EventEmitter } from './EventEmitter';
import { Port, PortData } from './Port';
import { Bounds } from './QuadTree';
import { Cache } from './Cache';

export interface NodeEvents {
  'moving': [x: number, y: number];
  'moved': [x: number, y: number];
  'port:added': [port: Port];
  'port:removed': [portId: string];
}

export interface NodeData {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  inputs?: Omit<PortData, 'nodeId'>[];
  outputs?: Omit<PortData, 'nodeId'>[];
}

export class Node extends EventEmitter<NodeEvents> {
  private id: string;
  private name: string;
  private type: string;
  private x: number = 0;
  private y: number = 0;
  private width: number = 100;  // Default node width
  private height: number = 60;  // Default node height
  private inputs: Map<string, Port>;
  private outputs: Map<string, Port>;

  // Use unified cache management
  private cache = new Cache<any>();

  private createPorts(portDataList: Omit<PortData, 'nodeId'>[] | undefined, portMap: Map<string, Port>): void {
    (portDataList || []).forEach(portData => {
      const port = Port.fromJSON({
        ...portData,
        nodeId: this.id
      });
      portMap.set(port.getId(), port);
      this.emit('port:added', port);
    });
  }

  constructor(data: NodeData) {
    super();
    this.id = data.id;
    this.name = data.name;
    this.type = data.type;
    this.x = data.x || 0;
    this.y = data.y || 0;
    this.inputs = new Map();
    this.outputs = new Map();

    // Create input and output ports
    this.createPorts(data.inputs, this.inputs);
    this.createPorts(data.outputs, this.outputs);
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
    return this.cache.useCache('position', () => ({ x: this.x, y: this.y }));
  }

  public setPosition(x: number, y: number): void {
    this.emit('moving', x, y);
    this.x = x;
    this.y = y;
    // Clear related cache
    this.cache.clear('position');
    this.cache.clear('bounds');
    this.emit('moved', x, y);
  }

  public getInputs(): Port[] {
    return this.cache.useCache('ports', () => ({
      inputs: Array.from(this.inputs.values()),
      outputs: Array.from(this.outputs.values())
    })).inputs;
  }

  public getOutputs(): Port[] {
    return this.cache.useCache('ports', () => ({
      inputs: Array.from(this.inputs.values()),
      outputs: Array.from(this.outputs.values())
    })).outputs;
  }

  public getInput(id: string): Port | undefined {
    return this.inputs.get(id);
  }

  public getOutput(id: string): Port | undefined {
    return this.outputs.get(id);
  }

  public addInput(port: Port): void {
    this.inputs.set(port.getId(), port);
    this.cache.clear('ports');
    this.emit('port:added', port);
  }

  public addOutput(port: Port): void {
    this.outputs.set(port.getId(), port);
    this.cache.clear('ports');
    this.emit('port:added', port);
  }

  public removeInput(portId: string): void {
    this.inputs.delete(portId);
    this.cache.clear('ports');
    this.emit('port:removed', portId);
  }

  public removeOutput(portId: string): void {
    this.outputs.delete(portId);
    this.cache.clear('ports');
    this.emit('port:removed', portId);
  }

  public toJSON(): NodeData {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      x: this.x,
      y: this.y,
      inputs: this.getInputs().map(port => port.toJSON()),
      outputs: this.getOutputs().map(port => port.toJSON())
    };
  }

  public static fromJSON(data: NodeData): Node {
    return new Node(data);
  }

  public getBounds(): Bounds {
    return this.cache.useCache('bounds', () => ({
      x: this.x - this.width / 2,
      y: this.y - this.height / 2,
      width: this.width,
      height: this.height
    }));
  }

  public setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    // Clear related cache
    this.cache.clear('bounds');
  }
} 
