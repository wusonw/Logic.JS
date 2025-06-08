import { Editor } from './Editor';
import { Node, Edge, Port } from '@logic.js/core';
import { throttle } from 'lodash-es';
import { PerformanceMonitor } from './performance/PerformanceMonitor';
import { VirtualNode } from './vdom/VirtualNode';

export interface RendererEvents {
  'node:added': (node: Node) => void;
  'node:removed': (nodeId: string) => void;
  'node:moved': (node: Node) => void;
  'edge:added': (edge: Edge) => void;
  'edge:removed': (edgeId: string) => void;
  'port:connected': (edge: Edge) => void;
  'port:disconnected': (edgeId: string) => void;
}

export class SvgRenderer {
  private svg: SVGElement;
  private editor: Editor;
  private nodeElements: Map<string, SVGElement>;
  private edgeElements: Map<string, SVGElement>;
  private portElements: Map<string, SVGElement>;
  private isConnecting: boolean = false;
  private connectStartPortId: string | null = null;
  private tempLine: SVGPathElement | null = null;
  private updateQueue: Set<string> = new Set();
  private isUpdating: boolean = false;
  private performanceMonitor: PerformanceMonitor;

  constructor(container: HTMLElement, editor: Editor) {
    this.editor = editor;
    this.nodeElements = new Map();
    this.edgeElements = new Map();
    this.portElements = new Map();
    this.performanceMonitor = PerformanceMonitor.getInstance();

    // 创建SVG元素
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    container.appendChild(this.svg);

    // 初始化渲染
    this.render();

    // 监听编辑器事件
    this.setupEventListeners();

    // 添加拖拽相关的事件监听
    this.setupDragListeners();
  }

  private setupEventListeners(): void {
    // 监听节点添加事件
    this.editor.on('node:added', (node: Node) => {
      this.renderNode(node);
    });

    // 监听节点删除事件
    this.editor.on('node:removed', (nodeId: string) => {
      this.removeNode(nodeId);
    });

    // 监听节点移动事件
    this.editor.on('node:moved', (node: Node) => {
      this.updateNodePosition(node);
    });

    // 监听边添加事件
    this.editor.on('edge:added', (edge: Edge) => {
      this.renderEdge(edge);
    });

    // 监听边删除事件
    this.editor.on('edge:removed', (edgeId: string) => {
      this.removeEdge(edgeId);
    });

    // 监听端口连接事件
    this.editor.on('port:connected', (edge: Edge) => {
      this.updateEdge(edge);
    });

    // 监听端口断开事件
    this.editor.on('port:disconnected', (edgeId: string) => {
      this.removeEdge(edgeId);
    });
  }

  private setupDragListeners(): void {
    this.svg.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.svg.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.svg.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.svg.addEventListener('mouseleave', this.handleMouseUp.bind(this));
    // 端口上的事件
    this.svg.addEventListener('mousedown', this.handlePortMouseDown.bind(this), true);
    this.svg.addEventListener('mouseup', this.handlePortMouseUp.bind(this), true);
  }

  private handleMouseDown(event: MouseEvent): void {
    const target = event.target as SVGElement;
    const nodeElement = target.closest('g');
    if (!nodeElement) return;

    const nodeId = Array.from(this.nodeElements.entries())
      .find(([_, element]) => element === nodeElement)?.[0];

    if (nodeId) {
      this.editor.startDrag(nodeId, event.clientX, event.clientY);
    }
  }

  private handlePortMouseDown(event: MouseEvent): void {
    const portElement = (event.target as SVGElement).closest('g');
    if (!portElement) return;
    // 查找端口ID
    const portId = Array.from(this.portElements.entries()).find(([_, el]) => el === portElement)?.[0];
    if (!portId) return;
    // 判断端口类型
    const isOutput = portElement.querySelector('circle')?.getAttribute('fill') === '#2196F3';
    const type: 'input' | 'output' = isOutput ? 'output' : 'input';
    // 只允许从输出端口开始连线
    if (type !== 'output') return;
    this.isConnecting = true;
    this.connectStartPortId = portId;
    // 创建临时连线
    this.tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.tempLine.setAttribute('stroke', '#888');
    this.tempLine.setAttribute('stroke-width', '2');
    this.tempLine.setAttribute('fill', 'none');
    this.tempLine.setAttribute('pointer-events', 'none');
    this.svg.appendChild(this.tempLine);
    event.stopPropagation();
  }

  private handleMouseMove = throttle((event: MouseEvent) => {
    this.performanceMonitor.start('mouseMove');

    if (this.isConnecting && this.connectStartPortId && this.tempLine) {
      const startPortElement = this.portElements.get(this.connectStartPortId);
      if (!startPortElement) return;

      const startNode = this.editor.getNode((this.editor.findPort as any)(this.connectStartPortId)?.getNodeId());
      if (!startNode) return;

      const startPos = this.getPortAbsolutePosition(startNode.getPosition(), startPortElement, 'output');
      const svgRect = this.svg.getBoundingClientRect();
      const endX = event.clientX - svgRect.left;
      const endY = event.clientY - svgRect.top;

      // 同步计算临时路径
      const controlPoint1X = startPos.x + (endX - startPos.x) * 0.5;
      const controlPoint2X = endX - (endX - startPos.x) * 0.5;
      const path = `M ${startPos.x} ${startPos.y} C ${controlPoint1X} ${startPos.y}, ${controlPoint2X} ${endY}, ${endX} ${endY}`;
      this.tempLine.setAttribute('d', path);
    } else if (this.editor.isNodeDragging()) {
      this.editor.handleDrag(event.clientX, event.clientY);
    }

    this.performanceMonitor.end('mouseMove');
  }, 16);

  private handlePortMouseUp(event: MouseEvent): void {
    if (!this.isConnecting || !this.connectStartPortId) return;
    const portElement = (event.target as SVGElement).closest('g');
    if (!portElement) return;
    // 查找端口ID
    const portId = Array.from(this.portElements.entries()).find(([_, el]) => el === portElement)?.[0];
    if (!portId) return;
    // 判断端口类型
    const isInput = portElement.querySelector('circle')?.getAttribute('fill') === '#4CAF50';
    const type: 'input' | 'output' = isInput ? 'input' : 'output';
    // 只允许输出连到输入
    if (type !== 'input' || portId === this.connectStartPortId) {
      this.cancelTempLine();
      return;
    }
    // 调用 editor 连接端口
    this.editor.connectPorts(this.connectStartPortId, portId);
    this.cancelTempLine();
    event.stopPropagation();
  }

  private handleMouseUp(event: MouseEvent): void {
    if (this.isConnecting) {
      this.cancelTempLine();
      return;
    }
    this.editor.endDrag();
  }

  private cancelTempLine(): void {
    this.isConnecting = false;
    this.connectStartPortId = null;
    if (this.tempLine) {
      this.tempLine.remove();
      this.tempLine = null;
    }
  }

  private render(): void {
    this.renderNodes();
    this.renderEdges();
  }

  private renderNodes(): void {
    const nodes = this.editor.getNodes() as Node[];
    nodes.forEach(node => this.renderNode(node));
  }

  private renderEdges(): void {
    const edges = this.editor.getEdges() as Edge[];
    edges.forEach(edge => this.renderEdge(edge));
  }

  private renderNode(node: Node): void {
    const nodeElement = this.createNodeElement(node);
    this.nodeElements.set(node.getId(), nodeElement);
    this.svg.appendChild(nodeElement);
    this.renderPorts(node);
  }

  private renderEdge(edge: Edge): void {
    const edgeElement = this.createEdgeElement(edge);
    this.edgeElements.set(edge.getId(), edgeElement);
    this.svg.appendChild(edgeElement);
  }

  private renderPorts(node: Node): void {
    const inputs = node.getInputs();
    const outputs = node.getOutputs();
    const nodeElement = this.nodeElements.get(node.getId());
    if (!nodeElement) return;
    // 计算端口的垂直间距
    const portSpacing = 30;
    const startY = 20;
    // 渲染输入端口
    inputs.forEach((port, index) => {
      const y = startY + index * portSpacing;
      const portElement = this.createPortElement(port as Port, 'input', y);
      this.portElements.set(port.getId(), portElement);
      nodeElement.appendChild(portElement);
    });
    // 渲染输出端口
    outputs.forEach((port, index) => {
      const y = startY + index * portSpacing;
      const portElement = this.createPortElement(port as Port, 'output', y);
      this.portElements.set(port.getId(), portElement);
      nodeElement.appendChild(portElement);
    });
  }

  private createNodeElement(node: Node): SVGElement {
    const nodeElement = new VirtualNode('g', node.getId());
    const { x, y } = node.getPosition();
    nodeElement.setAttribute('transform', `translate(${x}, ${y})`);

    // 计算节点高度：端口数*间距+上下边距，最小60
    const portCount = Math.max(node.getInputs().length, node.getOutputs().length);
    const portSpacing = 30;
    const minHeight = 60;
    const padding = 20;
    const height = Math.max(minHeight, portCount * portSpacing + padding);

    // 创建节点主体
    const rect = new VirtualNode('rect', `${node.getId()}-rect`);
    rect.setAttribute('width', '100');
    rect.setAttribute('height', height.toString());
    rect.setAttribute('rx', '5');
    rect.setAttribute('fill', '#fff');
    rect.setAttribute('stroke', '#333');
    rect.setAttribute('stroke-width', '2');
    nodeElement.appendChild(rect);

    // 创建节点标题
    const text = new VirtualNode('text', `${node.getId()}-text`);
    text.setAttribute('x', '50');
    text.setAttribute('y', (height / 2).toString());
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.textContent = node.getName();
    nodeElement.appendChild(text);

    nodeElement.update();
    return nodeElement.getElement() as SVGElement;
  }

  private createPortElement(port: Port, type: 'input' | 'output', y: number): SVGElement {
    const portElement = new VirtualNode('g', port.getId());

    // 创建端口圆点
    const circle = new VirtualNode('circle', `${port.getId()}-circle`);
    circle.setAttribute('r', '5');
    circle.setAttribute('fill', type === 'input' ? '#4CAF50' : '#2196F3');
    circle.setAttribute('stroke', '#333');
    circle.setAttribute('stroke-width', '1');

    // 端口在节点左侧或右侧
    const x = type === 'input' ? 0 : 100;
    circle.setAttribute('cx', x.toString());
    circle.setAttribute('cy', '0');
    portElement.appendChild(circle);

    // 创建端口标签
    const text = new VirtualNode('text', `${port.getId()}-text`);
    text.setAttribute('x', type === 'input' ? '10' : '90');
    text.setAttribute('y', '5');
    text.setAttribute('text-anchor', type === 'input' ? 'start' : 'end');
    text.textContent = port.getName();
    portElement.appendChild(text);

    // 设置g的transform
    portElement.setAttribute('transform', `translate(0, ${y})`);

    portElement.update();
    return portElement.getElement() as SVGElement;
  }

  private createEdgeElement(edge: Edge): SVGElement {
    const edgeElement = new VirtualNode('path', edge.getId());
    edgeElement.setAttribute('fill', 'none');
    edgeElement.setAttribute('stroke', '#999');
    edgeElement.setAttribute('stroke-width', '2');

    const sourcePort = edge.getSourcePort();
    const targetPort = edge.getTargetPort();
    if (sourcePort && targetPort) {
      const sourceNode = this.editor.getNode(sourcePort.getNodeId());
      const targetNode = this.editor.getNode(targetPort.getNodeId());
      if (sourceNode && targetNode) {
        const sourceNodePos = sourceNode.getPosition();
        const targetNodePos = targetNode.getPosition();

        const sourceX = sourceNodePos.x + 100;
        const sourceY = sourceNodePos.y + 30;
        const targetX = targetNodePos.x;
        const targetY = targetNodePos.y + 30;

        // 同步计算初始路径
        const controlPoint1X = sourceX + (targetX - sourceX) * 0.5;
        const controlPoint2X = targetX - (targetX - sourceX) * 0.5;
        const path = `M ${sourceX} ${sourceY} C ${controlPoint1X} ${sourceY}, ${controlPoint2X} ${targetY}, ${targetX} ${targetY}`;
        edgeElement.setAttribute('d', path);
      }
    }

    edgeElement.update();
    return edgeElement.getElement() as SVGElement;
  }

  private removeNode(nodeId: string): void {
    const nodeElement = this.nodeElements.get(nodeId);
    if (nodeElement) {
      // 删除节点相关的所有端口元素
      const node = this.editor.getNode(nodeId);
      if (node) {
        node.getInputs().forEach(port => {
          const portElement = this.portElements.get(port.getId());
          if (portElement) {
            portElement.remove();
            this.portElements.delete(port.getId());
          }
        });
        node.getOutputs().forEach(port => {
          const portElement = this.portElements.get(port.getId());
          if (portElement) {
            portElement.remove();
            this.portElements.delete(port.getId());
          }
        });
      }

      // 删除节点元素
      nodeElement.remove();
      this.nodeElements.delete(nodeId);
    }
  }

  private removeEdge(edgeId: string): void {
    const edgeElement = this.edgeElements.get(edgeId);
    if (edgeElement) {
      edgeElement.remove();
      this.edgeElements.delete(edgeId);
    }
  }

  private updateNodePosition(node: Node): void {
    const nodeElement = this.nodeElements.get(node.getId());
    if (nodeElement) {
      const { x, y } = node.getPosition();
      nodeElement.setAttribute('transform', `translate(${x}, ${y})`);

      // 更新与该节点相关的所有连线
      this.updateConnectedEdges(node);
    }
  }

  private updateConnectedEdges(node: Node): void {
    this.performanceMonitor.start('updateConnectedEdges');

    requestAnimationFrame(() => {
      const nodePorts = [...node.getInputs(), ...node.getOutputs()];
      const edgesToUpdate = this.editor.getEdges().filter(edge => {
        const sourcePort = edge.getSourcePort();
        const targetPort = edge.getTargetPort();
        return nodePorts.some(port =>
          port.getId() === sourcePort.getId() ||
          port.getId() === targetPort.getId()
        );
      });

      edgesToUpdate.forEach(edge => {
        this.updateQueue.add(edge.getId());
      });

      this.processUpdateQueue();
    });

    this.performanceMonitor.end('updateConnectedEdges');
  }

  private processUpdateQueue() {
    if (this.isUpdating) return;
    this.isUpdating = true;

    requestAnimationFrame(() => {
      this.updateQueue.forEach(edgeId => {
        const edge = this.editor.getEdges().find(e => e.getId() === edgeId);
        if (edge) {
          this.updateEdge(edge);
        }
      });

      this.updateQueue.clear();
      this.isUpdating = false;
    });
  }

  private updateEdge(edge: Edge): void {
    this.performanceMonitor.start('updateEdge');

    const edgeElement = this.edgeElements.get(edge.getId());
    if (!edgeElement) return;

    const sourcePort = edge.getSourcePort();
    const targetPort = edge.getTargetPort();
    if (!sourcePort || !targetPort) return;

    const sourceNode = this.editor.getNode(sourcePort.getNodeId());
    const targetNode = this.editor.getNode(targetPort.getNodeId());
    if (!sourceNode || !targetNode) return;

    const sourcePortElement = this.portElements.get(sourcePort.getId());
    const targetPortElement = this.portElements.get(targetPort.getId());
    if (!sourcePortElement || !targetPortElement) return;

    const sourcePos = this.getPortAbsolutePosition(sourceNode.getPosition(), sourcePortElement, 'output');
    const targetPos = this.getPortAbsolutePosition(targetNode.getPosition(), targetPortElement, 'input');

    // 同步计算路径
    const controlPoint1X = sourcePos.x + (targetPos.x - sourcePos.x) * 0.5;
    const controlPoint2X = targetPos.x - (targetPos.x - sourcePos.x) * 0.5;
    const path = `M ${sourcePos.x} ${sourcePos.y} C ${controlPoint1X} ${sourcePos.y}, ${controlPoint2X} ${targetPos.y}, ${targetPos.x} ${targetPos.y}`;
    edgeElement.setAttribute('d', path);

    this.performanceMonitor.end('updateEdge');
  }

  private getPortAbsolutePosition(nodePos: { x: number, y: number }, portElement: SVGElement, type: 'input' | 'output'): { x: number, y: number } {
    // g的transform: translate(0, y)
    const transform = portElement.getAttribute('transform');
    let offsetY = 0;
    if (transform) {
      const match = transform.match(/translate\(0,\s*([\d.-]+)\)/);
      if (match) offsetY = parseFloat(match[1]);
    }
    // 圆心坐标
    const circle = portElement.querySelector('circle');
    const cx = circle ? parseFloat(circle.getAttribute('cx') || '0') : 0;
    // cy始终为0
    return {
      x: nodePos.x + cx,
      y: nodePos.y + offsetY
    };
  }

  public update(): void {
    // 清除现有元素
    this.nodeElements.forEach(element => element.remove());
    this.edgeElements.forEach(element => element.remove());
    this.portElements.forEach(element => element.remove());

    this.nodeElements.clear();
    this.edgeElements.clear();
    this.portElements.clear();

    // 重新渲染
    this.render();
  }

  public getPerformanceMetrics() {
    return this.performanceMonitor.getMetrics();
  }

  public destroy() {
    // 清理资源
    this.nodeElements.clear();
    this.edgeElements.clear();
    this.portElements.clear();
    this.updateQueue.clear();
  }
} 
