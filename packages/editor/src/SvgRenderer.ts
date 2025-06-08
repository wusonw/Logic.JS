import { Editor } from './Editor';
import { EditorNode } from './EditorNode';
import { EditorEdge } from './EditorEdge';
import { EditorPort } from './EditorPort';

export interface RendererEvents {
  'node:added': (node: EditorNode) => void;
  'node:removed': (nodeId: string) => void;
  'node:moved': (node: EditorNode) => void;
  'edge:added': (edge: EditorEdge) => void;
  'edge:removed': (edgeId: string) => void;
  'port:connected': (edge: EditorEdge) => void;
  'port:disconnected': (edgeId: string) => void;
}

export class SvgRenderer {
  private svg: SVGElement;
  private editor: Editor;
  private nodeElements: Map<string, SVGElement>;
  private edgeElements: Map<string, SVGElement>;
  private portElements: Map<string, SVGElement>;

  constructor(container: HTMLElement, editor: Editor) {
    this.editor = editor;
    this.nodeElements = new Map();
    this.edgeElements = new Map();
    this.portElements = new Map();

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
    this.editor.on('node:added', (node: EditorNode) => {
      this.renderNode(node);
    });

    // 监听节点删除事件
    this.editor.on('node:removed', (nodeId: string) => {
      this.removeNode(nodeId);
    });

    // 监听节点移动事件
    this.editor.on('node:moved', (node: EditorNode) => {
      this.updateNodePosition(node);
    });

    // 监听边添加事件
    this.editor.on('edge:added', (edge: EditorEdge) => {
      this.renderEdge(edge);
    });

    // 监听边删除事件
    this.editor.on('edge:removed', (edgeId: string) => {
      this.removeEdge(edgeId);
    });

    // 监听端口连接事件
    this.editor.on('port:connected', (edge: EditorEdge) => {
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

  private handleMouseMove(event: MouseEvent): void {
    if (this.editor.isNodeDragging()) {
      this.editor.handleDrag(event.clientX, event.clientY);
    }
  }

  private handleMouseUp(): void {
    this.editor.endDrag();
  }

  private render(): void {
    this.renderNodes();
    this.renderEdges();
  }

  private renderNodes(): void {
    const nodes = this.editor.getNodes() as EditorNode[];
    nodes.forEach(node => this.renderNode(node));
  }

  private renderEdges(): void {
    const edges = this.editor.getEdges() as EditorEdge[];
    edges.forEach(edge => this.renderEdge(edge));
  }

  private renderNode(node: EditorNode): void {
    const nodeElement = this.createNodeElement(node);
    this.nodeElements.set(node.getId(), nodeElement);
    this.svg.appendChild(nodeElement);
    this.renderPorts(node);
  }

  private renderEdge(edge: EditorEdge): void {
    const edgeElement = this.createEdgeElement(edge);
    this.edgeElements.set(edge.getId(), edgeElement);
    this.svg.appendChild(edgeElement);
  }

  private renderPorts(node: EditorNode): void {
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
      const portElement = this.createPortElement(port as EditorPort, 'input', y);
      this.portElements.set(port.getId(), portElement);
      nodeElement.appendChild(portElement);
    });
    // 渲染输出端口
    outputs.forEach((port, index) => {
      const y = startY + index * portSpacing;
      const portElement = this.createPortElement(port as EditorPort, 'output', y);
      this.portElements.set(port.getId(), portElement);
      nodeElement.appendChild(portElement);
    });
  }

  private createNodeElement(node: EditorNode): SVGElement {
    const { x, y } = node.getPosition();
    const element = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    element.setAttribute('transform', `translate(${x}, ${y})`);

    // 计算节点高度：端口数*间距+上下边距，最小60
    const portCount = Math.max(node.getInputs().length, node.getOutputs().length);
    const portSpacing = 30;
    const minHeight = 60;
    const padding = 20;
    const height = Math.max(minHeight, portCount * portSpacing + padding);

    // 创建节点主体
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '100');
    rect.setAttribute('height', height.toString());
    rect.setAttribute('rx', '5');
    rect.setAttribute('fill', '#fff');
    rect.setAttribute('stroke', '#333');
    rect.setAttribute('stroke-width', '2');
    element.appendChild(rect);

    // 创建节点标题
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', '50');
    text.setAttribute('y', (height / 2).toString());
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.textContent = node.getName();
    element.appendChild(text);

    return element;
  }

  private createPortElement(port: EditorPort, type: 'input' | 'output', y: number): SVGElement {
    const element = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    // 创建端口圆点
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('r', '5');
    circle.setAttribute('fill', type === 'input' ? '#4CAF50' : '#2196F3');
    circle.setAttribute('stroke', '#333');
    circle.setAttribute('stroke-width', '1');
    // 端口在节点左侧或右侧
    const x = type === 'input' ? 0 : 100;
    circle.setAttribute('cx', x.toString());
    circle.setAttribute('cy', '0'); // y 由g的transform控制
    element.appendChild(circle);
    // 创建端口标签
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', type === 'input' ? '10' : '90');
    text.setAttribute('y', '5');
    text.setAttribute('text-anchor', type === 'input' ? 'start' : 'end');
    text.textContent = port.getName();
    element.appendChild(text);
    // 设置g的transform，y为传入参数
    element.setAttribute('transform', `translate(0, ${y})`);
    return element;
  }

  private createEdgeElement(edge: EditorEdge): SVGElement {
    const element = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    element.setAttribute('fill', 'none');
    element.setAttribute('stroke', '#999');
    element.setAttribute('stroke-width', '2');

    // 初始化边的路径
    const sourcePort = edge.getSourcePort();
    const targetPort = edge.getTargetPort();

    const sourceNode = this.editor.getNode(sourcePort.getNodeId());
    const targetNode = this.editor.getNode(targetPort.getNodeId());

    if (sourceNode && targetNode) {
      const sourceNodePos = sourceNode.getPosition();
      const targetNodePos = targetNode.getPosition();

      const sourceX = sourceNodePos.x + 100;
      const sourceY = sourceNodePos.y + 30;
      const targetX = targetNodePos.x;
      const targetY = targetNodePos.y + 30;

      const controlPoint1X = sourceX + (targetX - sourceX) * 0.5;
      const controlPoint2X = targetX - (targetX - sourceX) * 0.5;

      const path = `M ${sourceX} ${sourceY} C ${controlPoint1X} ${sourceY}, ${controlPoint2X} ${targetY}, ${targetX} ${targetY}`;
      element.setAttribute('d', path);
    }

    return element;
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

  private updateNodePosition(node: EditorNode): void {
    const nodeElement = this.nodeElements.get(node.getId());
    if (nodeElement) {
      const { x, y } = node.getPosition();
      nodeElement.setAttribute('transform', `translate(${x}, ${y})`);

      // 更新与该节点相关的所有连线
      this.updateConnectedEdges(node);
    }
  }

  private updateConnectedEdges(node: EditorNode): void {
    // 获取节点的所有端口
    const nodePorts = [...node.getInputs(), ...node.getOutputs()];

    // 遍历所有边，检查是否与当前节点相关
    for (const edge of this.editor.getEdges()) {
      const sourcePort = edge.getSourcePort();
      const targetPort = edge.getTargetPort();

      // 如果边的源端口或目标端口属于当前节点，则更新该边
      if (nodePorts.some(port => port.getId() === sourcePort.getId() || port.getId() === targetPort.getId())) {
        this.updateEdge(edge);
      }
    }
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

  private updateEdge(edge: EditorEdge): void {
    const edgeElement = this.edgeElements.get(edge.getId());
    if (!edgeElement) return;
    const sourcePort = edge.getSourcePort();
    const targetPort = edge.getTargetPort();
    // 获取源节点和目标节点
    const sourceNode = this.editor.getNode(sourcePort.getNodeId());
    const targetNode = this.editor.getNode(targetPort.getNodeId());
    if (!sourceNode || !targetNode) return;
    // 获取源端口和目标端口的元素
    const sourcePortElement = this.portElements.get(sourcePort.getId());
    const targetPortElement = this.portElements.get(targetPort.getId());
    if (!sourcePortElement || !targetPortElement) return;
    // 计算端口的绝对位置
    const sourcePos = this.getPortAbsolutePosition(sourceNode.getPosition(), sourcePortElement, 'output');
    const targetPos = this.getPortAbsolutePosition(targetNode.getPosition(), targetPortElement, 'input');
    // 创建贝塞尔曲线路径
    const controlPoint1X = sourcePos.x + (targetPos.x - sourcePos.x) * 0.5;
    const controlPoint2X = targetPos.x - (targetPos.x - sourcePos.x) * 0.5;
    const path = `M ${sourcePos.x} ${sourcePos.y} C ${controlPoint1X} ${sourcePos.y}, ${controlPoint2X} ${targetPos.y}, ${targetPos.x} ${targetPos.y}`;
    edgeElement.setAttribute('d', path);
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
} 
