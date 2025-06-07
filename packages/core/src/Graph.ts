import { Node, NodeData } from './Node';
import { Edge, EdgeData } from './Edge';

export interface GraphData {
  id: string;
  name: string;
  nodes?: NodeData[];
  edges?: EdgeData[];
}

export abstract class Graph {
  protected id: string;
  protected name: string;
  protected nodes: Map<string, Node>;
  protected edges: Map<string, Edge>;

  constructor(data: GraphData) {
    this.id = data.id;
    this.name = data.name;
    this.nodes = new Map();
    this.edges = new Map();

    data.nodes?.forEach(node => {
      this.addNode(node);
    });

    data.edges?.forEach(edge => {
      this.addEdge(edge);
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

  protected abstract addNode(data: NodeData): void;
  protected abstract addEdge(data: EdgeData): void;
  protected abstract removeNode(id: string): void;
  protected abstract removeEdge(id: string): void;
  protected abstract validate(): boolean;
  protected abstract execute(): void;
} 
