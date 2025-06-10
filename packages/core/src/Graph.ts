import { Node, NodeData } from './Node';
import { Edge, EdgeData } from './Edge';
import { Port } from './Port';
import { EventEmitter } from './EventEmitter';
import { QuadTree, Bounds } from './QuadTree';

export interface GraphEvents {
  'node:added': [node: Node];
  'node:removed': [nodeId: string];
  'edge:added': [edge: Edge];
  'edge:removed': [edgeId: string];
  'port:connected': [edge: Edge];
  'port:disconnected': [edgeId: string];
  'node:moving': [node: Node, x: number, y: number];
  'node:moved': [node: Node, x: number, y: number];
  'port:added': [port: Port];
  'port:removed': [portId: string];
  'connection:start': [];
  'connection:update': [x: number, y: number];
  'connection:end': [];
}

export interface GraphData {
  id: string;
  name: string;
  nodes: NodeData[];
  edges: EdgeData[];
}

export class Graph extends EventEmitter<GraphEvents> {
  protected id: string;
  protected name: string;
  protected nodes: Map<string, Node>;
  protected edges: Map<string, Edge>;
  protected nodeQuadTree: QuadTree;
  protected edgeQuadTree: QuadTree;

  constructor(data: GraphData) {
    super();
    this.id = data.id;
    this.name = data.name;
    this.nodes = new Map();
    this.edges = new Map();

    // 初始化四叉树，使用一个足够大的边界
    const bounds: Bounds = {
      x: -10000,
      y: -10000,
      width: 20000,
      height: 20000
    };
    this.nodeQuadTree = new QuadTree(bounds);
    this.edgeQuadTree = new QuadTree(bounds);

    // 创建节点
    (data.nodes || []).forEach(nodeData => {
      this.createNode(nodeData);
    });

    // 创建端口映射
    const portMap = this.createPortMap();

    // 创建边
    (data.edges || []).forEach(edgeData => {
      this.createEdge(edgeData, portMap);
    });
  }

  private createNode(nodeData: NodeData): Node {
    const node = new Node(nodeData);
    this.nodes.set(node.getId(), node);

    // 将节点添加到四叉树
    const bounds = node.getBounds();
    this.nodeQuadTree.insert({
      id: node.getId(),
      bounds
    });

    this.emit('node:added', node);
    this.setupNodeEventListeners(node);
    return node;
  }

  private createEdge(edgeData: EdgeData, portMap: Map<string, Port>): Edge {
    const edge = new Edge(edgeData, portMap, this.nodes);
    this.edges.set(edge.getId(), edge);

    // 将边添加到四叉树
    const bounds = edge.getBounds();
    this.edgeQuadTree.insert({
      id: edge.getId(),
      bounds
    });

    this.emit('edge:added', edge);
    this.setupEdgeEventListeners(edge);
    return edge;
  }

  private setupNodeEventListeners(node: Node): void {
    node.on('moving', (x, y) => {
      this.emit('node:moving', node, x, y);
    });

    node.on('moved', (x, y) => {
      // 更新四叉树中的节点位置
      this.nodeQuadTree.remove(node.getId());
      const bounds = node.getBounds();
      this.nodeQuadTree.insert({
        id: node.getId(),
        bounds
      });
      this.emit('node:moved', node, x, y);
    });

    node.on('port:added', (port) => {
      this.emit('port:added', port);
    });

    node.on('port:removed', (portId) => {
      this.emit('port:removed', portId);
    });
  }

  private setupEdgeEventListeners(edge: Edge): void {
    edge.on('connected', (sourcePort, targetPort) => {
      this.emit('port:connected', edge);
    });

    edge.on('disconnected', () => {
      this.emit('port:disconnected', edge.getId());
    });
  }

  private createPortMap(): Map<string, Port> {
    const portMap = new Map<string, Port>();
    this.nodes.forEach(node => {
      node.getInputs().forEach(port => portMap.set(port.getId(), port));
      node.getOutputs().forEach(port => portMap.set(port.getId(), port));
    });
    return portMap;
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

  public getNode(nodeId: string): Node | undefined {
    return this.nodes.get(nodeId);
  }

  public getEdge(edgeId: string): Edge | undefined {
    return this.edges.get(edgeId);
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

  public addNode(node: Node): void {
    this.createNode(node.toJSON());
  }

  public removeNode(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      // 从四叉树中移除节点
      this.nodeQuadTree.remove(nodeId);

      // 删除与该节点相关的所有边
      const edgesToRemove = Array.from(this.edges.values()).filter(edge => {
        const sourcePort = edge.getSourcePort();
        const targetPort = edge.getTargetPort();
        return sourcePort.getNodeId() === nodeId || targetPort.getNodeId() === nodeId;
      });

      // 先删除所有相关的边
      edgesToRemove.forEach(edge => {
        this.removeEdge(edge.getId());
      });

      // 然后删除节点
      this.nodes.delete(nodeId);
      this.emit('node:removed', nodeId);
    }
  }

  public addEdge(sourcePort: Port, targetPort: Port): Edge | undefined {
    if (!sourcePort.canConnect(targetPort)) return undefined;

    const edgeId = `edge-${sourcePort.getId()}-${targetPort.getId()}`;
    const edgeData: EdgeData = {
      id: edgeId,
      sourcePortId: sourcePort.getId(),
      targetPortId: targetPort.getId()
    };
    const portMap = new Map([[sourcePort.getId(), sourcePort], [targetPort.getId(), targetPort]]);

    return this.createEdge(edgeData, portMap);
  }

  public removeEdge(edgeId: string): void {
    const edge = this.edges.get(edgeId);
    if (edge) {
      // 从四叉树中移除边
      this.edgeQuadTree.remove(edgeId);

      edge.disconnect();
      this.edges.delete(edgeId);
      this.emit('edge:removed', edgeId);
    }
  }

  public toJSON(): GraphData {
    return {
      id: this.getId(),
      name: this.getName(),
      nodes: this.getNodes().map(node => node.toJSON()),
      edges: this.getEdges().map(edge => edge.toJSON())
    };
  }

  public clear(): void {
    // 清除四叉树
    this.nodeQuadTree.clear();
    this.edgeQuadTree.clear();

    // 先删除所有边
    this.edges.forEach(edge => {
      this.removeEdge(edge.getId());
    });
    this.edges.clear();

    // 再删除所有节点
    this.nodes.forEach(node => {
      this.removeNode(node.getId());
    });
    this.nodes.clear();
  }

  public fromJSON(data: GraphData): void {
    // 清除现有数据
    this.clear();

    // 更新基本信息
    this.id = data.id;
    this.name = data.name;

    // 先还原所有节点和端口
    const portMap = new Map<string, Port>();
    (data.nodes || []).forEach(nodeData => {
      const node = this.createNode(nodeData);
      node.getInputs().forEach(port => portMap.set(port.getId(), port));
      node.getOutputs().forEach(port => portMap.set(port.getId(), port));
    });

    // 再还原所有边
    (data.edges || []).forEach(edgeData => {
      this.createEdge(edgeData, portMap);
    });
  }

  public static fromJSON(data: GraphData): Graph {
    return new Graph(data);
  }

  public getNodesInBounds(bounds: Bounds): Node[] {
    const items = this.nodeQuadTree.query(bounds);
    return items.map(item => this.nodes.get(item.id)).filter((node): node is Node => node !== undefined);
  }

  public getEdgesInBounds(bounds: Bounds): Edge[] {
    const items = this.edgeQuadTree.query(bounds);
    return items.map(item => this.edges.get(item.id)).filter((edge): edge is Edge => edge !== undefined);
  }
} 
