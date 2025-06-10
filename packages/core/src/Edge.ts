import { EventEmitter } from './EventEmitter';
import { Port } from './Port';
import { Bounds } from './QuadTree';
import { Node } from './Node';
import { Cache } from './Cache';

export interface EdgeEvents {
  'connected': [sourcePort: Port, targetPort: Port];
  'disconnected': [];
}

export interface EdgeData {
  id: string;
  sourcePortId: string;
  targetPortId: string;
}

export class Edge extends EventEmitter<EdgeEvents> {
  private id: string;
  private sourcePort: Port;
  private targetPort: Port;
  private sourceNode: Node;
  private targetNode: Node;

  // 使用统一的缓存管理
  private cache = new Cache<any>();

  constructor(data: EdgeData, portMap: Map<string, Port>, nodeMap: Map<string, Node>) {
    super();
    this.id = data.id;
    const sourcePort = portMap.get(data.sourcePortId);
    const targetPort = portMap.get(data.targetPortId);
    if (!sourcePort || !targetPort) {
      throw new Error('Port not found');
    }
    this.sourcePort = sourcePort;
    this.targetPort = targetPort;

    const sourceNode = nodeMap.get(sourcePort.getNodeId());
    const targetNode = nodeMap.get(targetPort.getNodeId());
    if (!sourceNode || !targetNode) {
      throw new Error('Node not found');
    }
    this.sourceNode = sourceNode;
    this.targetNode = targetNode;

    this.emit('connected', sourcePort, targetPort);
  }

  public getId(): string {
    return this.id;
  }

  public getSourcePort(): Port {
    return this.sourcePort;
  }

  public getTargetPort(): Port {
    return this.targetPort;
  }

  public disconnect(): void {
    this.emit('disconnected');
  }

  public toJSON(): EdgeData {
    return {
      id: this.id,
      sourcePortId: this.sourcePort.getId(),
      targetPortId: this.targetPort.getId()
    };
  }

  public validate(): boolean { return true; }
  public transfer(): void { }

  public getBounds(): Bounds {
    return this.cache.useCache('bounds', () => {
      const sourcePos = this.getSourcePosition();
      const targetPos = this.getTargetPosition();

      // 计算边的边界框
      const x = Math.min(sourcePos.x, targetPos.x);
      const y = Math.min(sourcePos.y, targetPos.y);
      const width = Math.abs(targetPos.x - sourcePos.x);
      const height = Math.abs(targetPos.y - sourcePos.y);

      return { x, y, width, height };
    });
  }

  private getSourcePosition(): { x: number; y: number } {
    return this.cache.useCache('sourcePosition', () =>
      this.sourcePort.getPosition(this.sourceNode)
    );
  }

  private getTargetPosition(): { x: number; y: number } {
    return this.cache.useCache('targetPosition', () =>
      this.targetPort.getPosition(this.targetNode)
    );
  }

  // 清除所有缓存
  public clearCache(): void {
    this.cache.clear();
  }
}
