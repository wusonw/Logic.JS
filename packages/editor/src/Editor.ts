import { Graph, GraphData, NodeData, EdgeData, Port } from '@logic.js/core';
import { EditorNode } from './EditorNode';
import { EditorEdge } from './EditorEdge';
import { EventEmitter } from './EventEmitter';

export interface EditorEvents {
  'node:added': (node: EditorNode) => void;
  'node:removed': (nodeId: string) => void;
  'node:moved': (node: EditorNode) => void;
  'edge:added': (edge: EditorEdge) => void;
  'edge:removed': (edgeId: string) => void;
  'port:connected': (edge: EditorEdge) => void;
  'port:disconnected': (edgeId: string) => void;
}

export class Editor extends Graph {
  private emitter: EventEmitter;

  constructor(data: GraphData) {
    super(data);
    this.emitter = new EventEmitter();
  }

  public on<K extends keyof EditorEvents>(event: K, listener: EditorEvents[K]): void {
    this.emitter.on(event, listener);
  }

  public off<K extends keyof EditorEvents>(event: K, listener: EditorEvents[K]): void {
    this.emitter.off(event, listener);
  }

  protected addNode(data: NodeData): void {
    const node = new EditorNode(data);
    this.nodes.set(node.getId(), node);
    this.emitter.emit('node:added', node);
  }

  protected addEdge(data: EdgeData): void {
    const edge = new EditorEdge(data);
    this.edges.set(edge.getId(), edge);
    this.emitter.emit('edge:added', edge);
  }

  protected removeNode(id: string): void {
    // 删除节点时，需要同时删除与该节点相关的所有边
    const node = this.nodes.get(id);
    if (node) {
      // 删除所有以该节点为源或目标的边
      for (const edge of this.edges.values()) {
        const sourcePort = edge.getSourcePort();
        const targetPort = edge.getTargetPort();
        if (sourcePort.getNodeId() === id || targetPort.getNodeId() === id) {
          this.edges.delete(edge.getId());
          this.emitter.emit('edge:removed', edge.getId());
        }
      }
      this.nodes.delete(id);
      this.emitter.emit('node:removed', id);
    }
  }

  protected removeEdge(id: string): void {
    this.edges.delete(id);
    this.emitter.emit('edge:removed', id);
  }

  protected validate(): boolean {
    // 验证图的完整性
    // 1. 检查所有边的源节点和目标节点是否存在
    for (const edge of this.edges.values()) {
      const sourcePort = edge.getSourcePort();
      const targetPort = edge.getTargetPort();
      const sourceNode = this.nodes.get(sourcePort.getNodeId());
      const targetNode = this.nodes.get(targetPort.getNodeId());
      if (!sourceNode || !targetNode) {
        return false;
      }
    }
    return true;
  }

  protected execute(): void {
    // 执行图的逻辑
    if (!this.validate()) {
      throw new Error('Invalid graph structure');
    }
    // TODO: 实现图的执行逻辑
  }

  // 编辑器特有的方法
  public addNodeToGraph(data: NodeData): EditorNode {
    this.addNode(data);
    return this.nodes.get(data.id) as EditorNode;
  }

  public addEdgeToGraph(data: EdgeData): EditorEdge {
    this.addEdge(data);
    return this.edges.get(data.id) as EditorEdge;
  }

  public removeNodeFromGraph(id: string): void {
    this.removeNode(id);
  }

  public removeEdgeFromGraph(id: string): void {
    this.removeEdge(id);
  }

  public moveNode(id: string, x: number, y: number): void {
    const node = this.nodes.get(id) as EditorNode;
    if (node) {
      node.setPosition(x, y);
      this.emitter.emit('node:moved', node);
    }
  }

  public connectPorts(sourcePortId: string, targetPortId: string): void {
    const sourcePort = this.findPort(sourcePortId);
    const targetPort = this.findPort(targetPortId);

    if (sourcePort && targetPort && sourcePort.canConnect(targetPort)) {
      const edge = new EditorEdge({
        id: `edge-${Date.now()}`,
        sourcePort,
        targetPort
      });
      this.edges.set(edge.getId(), edge);
      this.emitter.emit('port:connected', edge);
    }
  }

  public disconnectPorts(edgeId: string): void {
    this.removeEdge(edgeId);
    this.emitter.emit('port:disconnected', edgeId);
  }

  private findPort(portId: string): Port | undefined {
    for (const node of this.nodes.values()) {
      const input = node.getInput(portId);
      if (input) return input;
      const output = node.getOutput(portId);
      if (output) return output;
    }
    return undefined;
  }

  public getGraphData(): GraphData {
    return {
      id: this.getId(),
      name: this.getName(),
      nodes: this.getNodes().map(node => ({
        id: node.getId(),
        name: node.getName(),
        type: node.getType(),
        position: node.getPosition(),
        inputs: node.getInputs().map(port => ({
          id: port.getId(),
          name: port.getName(),
          type: port.getType(),
          nodeId: port.getNodeId()
        })),
        outputs: node.getOutputs().map(port => ({
          id: port.getId(),
          name: port.getName(),
          type: port.getType(),
          nodeId: port.getNodeId()
        }))
      })),
      edges: this.getEdges().map(edge => ({
        id: edge.getId(),
        sourcePort: edge.getSourcePort(),
        targetPort: edge.getTargetPort()
      }))
    };
  }
} 
