import { Graph, GraphData, Edge } from '@logic.js/core';

export class Editor extends Graph {
  private isDragging: boolean = false;
  private dragNodeId: string | null = null;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private isPortConnecting: boolean = false;
  private connectStartPortId: string | null = null;

  constructor(data: GraphData) {
    super(data);
  }

  // Drag and drop related methods
  public startDrag(nodeId: string, x: number, y: number): void {
    this.dragNodeId = nodeId;
    this.dragStartX = x;
    this.dragStartY = y;
    this.isDragging = true;
  }

  public handleDrag(x: number, y: number): void {
    if (!this.isDragging || !this.dragNodeId) return;

    const node = this.getNode(this.dragNodeId);
    if (!node) return;

    // Calculate relative displacement
    const dx = x - this.dragStartX;
    const dy = y - this.dragStartY;
    const { x: currentX, y: currentY } = node.getPosition();
    const newX = currentX + dx;
    const newY = currentY + dy;

    // Directly call setPosition, let Node class handle event triggering
    node.setPosition(newX, newY);

    // Update drag start point
    this.dragStartX = x;
    this.dragStartY = y;
  }

  public endDrag(): void {
    this.isDragging = false;
    this.dragNodeId = null;
    this.dragStartX = 0;
    this.dragStartY = 0;
  }

  public getIsDragging(): boolean {
    return this.isDragging;
  }

  public getCurrentDragNodeId(): string | null {
    return this.dragNodeId;
  }

  // Connection related methods
  public startConnection(portId: string): void {
    const port = this.getPort(portId);
    if (!port || port.getType() !== 'output') return;

    this.isPortConnecting = true;
    this.connectStartPortId = portId;
    this.emit('connection:start');
  }

  public updateConnection(x: number, y: number): void {
    if (!this.isPortConnecting || !this.connectStartPortId) return;
    this.emit('connection:update', x, y);
  }

  public endConnection(portId: string): Edge | undefined {
    if (!this.isPortConnecting || !this.connectStartPortId) return undefined;

    const sourcePort = this.getPort(this.connectStartPortId);
    const targetPort = this.getPort(portId);

    if (!sourcePort || !targetPort) return undefined;

    // Check if port types match
    if (sourcePort.getType() === targetPort.getType()) return undefined;

    // Create new edge
    const edge = this.addEdge(sourcePort, targetPort);

    // Reset connection state
    this.isPortConnecting = false;
    this.connectStartPortId = null;
    this.emit('connection:end');

    return edge;
  }

  public cancelConnection(): void {
    this.isPortConnecting = false;
    this.connectStartPortId = null;
    this.emit('connection:end');
  }

  public getIsPortConnecting(): boolean {
    return this.isPortConnecting;
  }

  public getConnectionStartPortId(): string | null {
    return this.connectStartPortId;
  }

  public destroy(): void {
    this.nodes.clear();
    this.edges.clear();
  }

  public getNodes() {
    return super.getNodes();
  }

  public getEdges() {
    return super.getEdges();
  }
} 
