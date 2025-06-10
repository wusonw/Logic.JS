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

    // Initialize quadtree with a large enough boundary
    const bounds: Bounds = {
      x: -10000,
      y: -10000,
      width: 20000,
      height: 20000
    };
    this.nodeQuadTree = new QuadTree(bounds);
    this.edgeQuadTree = new QuadTree(bounds);

    this.initializeGraph(data);
  }

  /**
   * Initialize or reinitialize the graph with given data
   * @param data Graph data to initialize with
   */
  private initializeGraph(data: GraphData): void {
    // Create nodes in batch
    const nodes = (data.nodes || []).map(nodeData => new Node(nodeData));
    this.addNodes(nodes);

    // Create edges in batch
    const portMap = this.createPortMap();
    const edges = (data.edges || []).map(edgeData => {
      const edge = new Edge(edgeData, portMap, this.nodes);
      return {
        sourcePort: edge.getSourcePort(),
        targetPort: edge.getTargetPort()
      };
    });
    this.addEdges(edges);
  }

  private createNode(nodeData: NodeData): Node {
    const node = new Node(nodeData);
    this.nodes.set(node.getId(), node);

    // Add node to quadtree
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

    // Add edge to quadtree
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
      // Update node position in quadtree
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
      // Remove node from quadtree
      this.nodeQuadTree.remove(nodeId);

      // Delete all edges related to this node
      const edgesToRemove = Array.from(this.edges.values()).filter(edge => {
        const sourcePort = edge.getSourcePort();
        const targetPort = edge.getTargetPort();
        return sourcePort.getNodeId() === nodeId || targetPort.getNodeId() === nodeId;
      });

      // First remove all related edges
      edgesToRemove.forEach(edge => {
        this.removeEdge(edge.getId());
      });

      // Then remove the node
      this.nodes.delete(nodeId);
      this.emit('node:removed', nodeId);
    }
  }

  public addEdge(sourcePort: Port, targetPort: Port): Edge | undefined {
    try {
      const edgeId = `edge-${sourcePort.getId()}-${targetPort.getId()}`;
      const edgeData: EdgeData = {
        id: edgeId,
        sourcePortId: sourcePort.getId(),
        targetPortId: targetPort.getId()
      };
      const portMap = new Map([[sourcePort.getId(), sourcePort], [targetPort.getId(), targetPort]]);

      return this.createEdge(edgeData, portMap);
    } catch (error) {
      console.warn('Failed to create edge:', error);
      return undefined;
    }
  }

  public removeEdge(edgeId: string): void {
    const edge = this.edges.get(edgeId);
    if (edge) {
      // Remove edge from quadtree
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
    // Clear quadtrees
    this.nodeQuadTree.clear();
    this.edgeQuadTree.clear();

    // Remove all edges in batch
    const edgeIds = Array.from(this.edges.keys());
    this.removeEdges(edgeIds);

    // Remove all nodes in batch
    const nodeIds = Array.from(this.nodes.keys());
    this.removeNodes(nodeIds);
  }

  /**
   * Batch add nodes
   * @param nodes Array of nodes to add
   */
  public addNodes(nodes: Node[]): void {
    nodes.forEach(node => this.addNode(node));
  }

  /**
   * Batch remove nodes
   * @param nodeIds Array of node IDs to remove
   */
  public removeNodes(nodeIds: string[]): void {
    nodeIds.forEach(nodeId => this.removeNode(nodeId));
  }

  /**
   * Batch add edges
   * @param edges Array of edges to add, each containing source and target ports
   */
  public addEdges(edges: Array<{ sourcePort: Port; targetPort: Port }>): Edge[] {
    return edges
      .map(({ sourcePort, targetPort }) => this.addEdge(sourcePort, targetPort))
      .filter((edge): edge is Edge => edge !== undefined);
  }

  /**
   * Batch remove edges
   * @param edgeIds Array of edge IDs to remove
   */
  public removeEdges(edgeIds: string[]): void {
    edgeIds.forEach(edgeId => this.removeEdge(edgeId));
  }

  public fromJSON(data: GraphData): void {
    // Clear existing data
    this.clear();

    // Update basic information
    this.id = data.id;
    this.name = data.name;

    // Initialize graph with new data
    this.initializeGraph(data);
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
