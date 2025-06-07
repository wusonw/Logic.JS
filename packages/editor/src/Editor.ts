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
  private edgeCounter = 0;

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
      console.log('Removing node:', id);
      console.log('Current edges:', Array.from(this.edges.keys()));

      // 获取节点的所有端口
      const nodePorts = [...node.getInputs(), ...node.getOutputs()];
      console.log('Node ports:', nodePorts.map(p => p.getId()));

      // 删除所有以该节点的任何端口为源或目标的边
      const edgesToRemove = new Set<string>();

      // 遍历所有边，检查是否与要删除的节点的任何端口相关
      for (const edge of this.edges.values()) {
        const sourcePort = edge.getSourcePort();
        const targetPort = edge.getTargetPort();

        console.log('Checking edge:', edge.getId());
        console.log('Source port:', sourcePort.getId());
        console.log('Target port:', targetPort.getId());

        // 检查源端口和目标端口是否属于要删除的节点的任何端口
        if (nodePorts.some(port => port.getId() === sourcePort.getId() || port.getId() === targetPort.getId())) {
          console.log('Adding edge to remove:', edge.getId());
          edgesToRemove.add(edge.getId());
        }
      }

      console.log('Edges to remove:', Array.from(edgesToRemove));

      // 删除所有相关的边
      edgesToRemove.forEach(edgeId => {
        console.log('Removing edge:', edgeId);
        this.edges.delete(edgeId);
        this.emitter.emit('edge:removed', edgeId);
      });

      // 删除节点
      this.nodes.delete(id);
      this.emitter.emit('node:removed', id);

      console.log('Remaining edges:', Array.from(this.edges.keys()));
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
      const edgeId = `edge-${sourcePortId}-${targetPortId}-${this.edgeCounter++}`;
      const edge = new EditorEdge({
        id: edgeId,
        sourcePort,
        targetPort
      });

      // 确保边被添加到 edges Map 中
      this.edges.set(edgeId, edge);

      // 触发事件
      this.emitter.emit('edge:added', edge);
      this.emitter.emit('port:connected', edge);

      console.log('Added edge:', edgeId);
      console.log('Current edges:', Array.from(this.edges.keys()));
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
