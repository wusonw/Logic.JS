import { Node, NodeData } from './Node';
import { Edge } from './Edge';
import { Port } from './Port';
import { EventEmitter } from './EventEmitter';

export interface GraphData {
  id: string;
  name: string;
  nodes?: NodeData[];
  edges?: { id: string; sourcePortId: string; targetPortId: string }[];
}

export interface GraphEvents {
  [event: string]: (...args: any[]) => void;
}

export class Graph {
  protected id: string;
  protected name: string;
  protected nodes: Map<string, Node>;
  protected edges: Map<string, Edge>;
  protected emitter: EventEmitter;

  constructor(data: GraphData) {
    this.id = data.id;
    this.name = data.name;
    this.nodes = new Map();
    this.edges = new Map();
    this.emitter = new EventEmitter();

    // 先还原所有节点和端口
    const portMap = new Map<string, Port>();
    (data.nodes || []).forEach(nodeData => {
      const node = Node.fromJSON(nodeData);
      this.nodes.set(node.getId(), node);
      node.getInputs().forEach(port => portMap.set(port.getId(), port));
      node.getOutputs().forEach(port => portMap.set(port.getId(), port));
    });

    // 再还原所有边
    (data.edges || []).forEach(edgeData => {
      const edge = Edge.fromJSON(edgeData, portMap);
      this.edges.set(edge.getId(), edge);
    });
  }

  public getId(): string {
    return this.id;
  }

  public getName(): string {
    return this.name;
  }

  public getNodes(): Node[] {
    return Array.from(this.nodes.values());
  }

  public getEdges(): Edge[] {
    return Array.from(this.edges.values());
  }

  public getNode(id: string): Node | undefined {
    return this.nodes.get(id);
  }

  public getEdge(id: string): Edge | undefined {
    return this.edges.get(id);
  }

  public getPort(id: string): Port | undefined {
    for (const node of this.nodes.values()) {
      const input = node.getInput(id);
      if (input) return input;
      const output = node.getOutput(id);
      if (output) return output;
    }
    return undefined;
  }

  public toJSON(): GraphData {
    return {
      id: this.getId(),
      name: this.getName(),
      nodes: this.getNodes().map(node => node.toJSON()),
      edges: this.getEdges().map(edge => edge.toJSON())
    };
  }

  public static fromJSON(data: GraphData): Graph {
    return new Graph(data);
  }

  public on(event: string, callback: (...args: any[]) => void): void {
    this.emitter.on(event, callback);
  }

  public off(event: string, callback: (...args: any[]) => void): void {
    this.emitter.off(event, callback);
  }

  public emit(event: string, ...args: any[]): void {
    this.emitter.emit(event, ...args);
  }
} 
