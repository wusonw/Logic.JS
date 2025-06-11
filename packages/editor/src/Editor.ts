import { Graph, GraphData, Edge, Node } from '@logic.js/core';
import type { Plugin, HistoryAction } from './plugins';


// Extend GraphEvents type
declare module '@logic.js/core' {
  interface GraphEvents {
    'history:change': [{ action: HistoryAction; canUndo: boolean; canRedo: boolean }];
    'node:dragstart': [node: Node];
    'node:dragend': [node: Node];
  }
}

export class Editor extends Graph {
  private isDragging: boolean = false;
  private dragNodeId: string | null = null;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private isPortConnecting: boolean = false;
  private connectStartPortId: string | null = null;
  private plugins: Map<string, Plugin> = new Map();

  constructor(data: GraphData) {
    super(data);
  }

  public use(plugin: Plugin): Editor {
    if (this.plugins.has(plugin.name)) {
      console.warn(`Plugin ${plugin.name} has already been installed.`);
      return this;
    }

    plugin.install(this);
    this.plugins.set(plugin.name, plugin);
    return this;
  }

  public unuse(pluginName: string): void {
    const plugin = this.plugins.get(pluginName);
    if (plugin) {
      if (plugin.destroy) {
        plugin.destroy();
      }
      this.plugins.delete(pluginName);
    }
  }

  public getPlugin<T extends Plugin>(pluginName: string): T | undefined {
    return this.plugins.get(pluginName) as T | undefined;
  }

  // Drag and drop related methods
  public startDrag(nodeId: string, x: number, y: number): void {
    this.dragNodeId = nodeId;
    this.dragStartX = x;
    this.dragStartY = y;
    this.isDragging = true;

    const node = this.getNode(nodeId);
    if (node) {
      this.emit('node:dragstart', node);
    }
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
    if (this.isDragging && this.dragNodeId) {
      const node = this.getNode(this.dragNodeId);
      if (node) {
        this.emit('node:dragend', node);
      }
    }

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
    // Destroy all plugins
    this.plugins.forEach(plugin => {
      if (plugin.destroy) {
        plugin.destroy();
      }
    });
    this.plugins.clear();

    // Clear graph data
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
