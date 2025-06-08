import { Graph, GraphData, NodeData, EdgeData, Port, Node, Edge } from '@logic.js/core';

export interface EditorEvents {
  'node:added': (node: Node) => void;
  'node:removed': (nodeId: string) => void;
  'node:moved': (node: Node) => void;
  'edge:added': (edge: Edge) => void;
  'edge:removed': (edgeId: string) => void;
  'port:connected': (edge: Edge) => void;
  'port:disconnected': (edgeId: string) => void;
}

export class Editor extends Graph {
  private edgeCounter = 0;
  private isDragging: boolean = false;
  private dragStartPos: { x: number; y: number } = { x: 0, y: 0 };
  private currentNodeId: string | null = null;

  constructor(data: GraphData) {
    super(data);
  }

  protected addNode(data: NodeData): void {
    const node = new Node(data);
    this.nodes.set(node.getId(), node);
    this.emitter.emit('node:added', node);
  }

  protected addEdge(data: EdgeData): void {
    const edge = new Edge(data);
    this.edges.set(edge.getId(), edge);
    this.emitter.emit('edge:added', edge);
  }

  protected removeNode(id: string): void {
    // 删除节点时，需要同时删除与该节点相关的所有边
    const node = this.nodes.get(id);
    if (node) {
      // 获取节点的所有端口
      const nodePorts = [...node.getInputs(), ...node.getOutputs()];
      // 删除所有以该节点的任何端口为源或目标的边
      const edgesToRemove = new Set<string>();
      for (const edge of this.edges.values()) {
        const sourcePort = edge.getSourcePort();
        const targetPort = edge.getTargetPort();
        if (nodePorts.some(port => port.getId() === sourcePort.getId() || port.getId() === targetPort.getId())) {
          edgesToRemove.add(edge.getId());
        }
      }
      // 删除所有相关的边
      edgesToRemove.forEach(edgeId => {
        this.edges.delete(edgeId);
        this.emitter.emit('edge:removed', edgeId);
      });
      // 删除节点
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
  public addNodeToGraph(data: NodeData): Node {
    this.addNode(data);
    return this.nodes.get(data.id) as Node;
  }

  public addEdgeToGraph(data: EdgeData): Edge {
    this.addEdge(data);
    return this.edges.get(data.id) as Edge;
  }

  public removeNodeFromGraph(id: string): void {
    this.removeNode(id);
  }

  public removeEdgeFromGraph(id: string): void {
    this.removeEdge(id);
  }

  public moveNode(id: string, x: number, y: number): void {
    const node = this.nodes.get(id) as Node;
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
      const edge = new Edge({
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

  public findPort(portId: string): Port | undefined {
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
      edges: this.getEdges().map(edge => edge.toJSON())
    };
  }

  public startDrag(nodeId: string, startX: number, startY: number): void {
    this.isDragging = true;
    this.currentNodeId = nodeId;
    this.dragStartPos = { x: startX, y: startY };
  }

  public handleDrag(currentX: number, currentY: number): void {
    if (!this.isDragging || !this.currentNodeId) return;

    const dx = currentX - this.dragStartPos.x;
    const dy = currentY - this.dragStartPos.y;

    const node = this.nodes.get(this.currentNodeId);
    if (node) {
      const currentPos = node.getPosition();
      this.moveNode(this.currentNodeId, currentPos.x + dx, currentPos.y + dy);
    }

    this.dragStartPos = { x: currentX, y: currentY };
  }

  public endDrag(): void {
    this.isDragging = false;
    this.currentNodeId = null;
  }

  public isNodeDragging(): boolean {
    return this.isDragging;
  }

  public getCurrentDragNodeId(): string | null {
    return this.currentNodeId;
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
} 
