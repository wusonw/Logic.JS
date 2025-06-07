import { Graph, GraphData, NodeData, EdgeData } from '@logic.js/core';
import { EditorNode } from './EditorNode';
import { EditorEdge } from './EditorEdge';

export class Editor extends Graph {
  constructor(data: GraphData) {
    super(data);
  }

  protected addNode(data: NodeData): void {
    const node = new EditorNode(data);
    this.nodes.set(node.getId(), node);
  }

  protected addEdge(data: EdgeData): void {
    const edge = new EditorEdge(data);
    this.edges.set(edge.getId(), edge);
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
        }
      }
      this.nodes.delete(id);
    }
  }

  protected removeEdge(id: string): void {
    this.edges.delete(id);
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
