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

    inputs.forEach(port => {
      const portElement = this.createPortElement(port as EditorPort, 'input');
      this.portElements.set(port.getId(), portElement);
      this.nodeElements.get(node.getId())?.appendChild(portElement);
    });

    outputs.forEach(port => {
      const portElement = this.createPortElement(port as EditorPort, 'output');
      this.portElements.set(port.getId(), portElement);
      this.nodeElements.get(node.getId())?.appendChild(portElement);
    });
  }

  private createNodeElement(node: EditorNode): SVGElement {
    const { x, y } = node.getPosition();
    const element = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    element.setAttribute('transform', `translate(${x}, ${y})`);

    // 创建节点主体
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '100');
    rect.setAttribute('height', '60');
    rect.setAttribute('rx', '5');
    rect.setAttribute('fill', '#fff');
    rect.setAttribute('stroke', '#333');
    rect.setAttribute('stroke-width', '2');
    element.appendChild(rect);

    // 创建节点标题
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', '50');
    text.setAttribute('y', '30');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.textContent = node.getName();
    element.appendChild(text);

    return element;
  }

  private createPortElement(port: EditorPort, type: 'input' | 'output'): SVGElement {
    const element = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const x = type === 'input' ? 0 : 100;
    const y = 20; // 临时固定位置，实际应该根据端口索引计算

    // 创建端口圆点
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x.toString());
    circle.setAttribute('cy', y.toString());
    circle.setAttribute('r', '5');
    circle.setAttribute('fill', '#666');
    element.appendChild(circle);

    // 创建端口标签
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', type === 'input' ? '10' : '90');
    text.setAttribute('y', (y + 5).toString());
    text.setAttribute('text-anchor', type === 'input' ? 'start' : 'end');
    text.textContent = port.getName();
    element.appendChild(text);

    return element;
  }

  private createEdgeElement(edge: EditorEdge): SVGElement {
    const element = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const sourcePort = edge.getSourcePort();
    const targetPort = edge.getTargetPort();

    // 获取源端口和目标端口的位置
    const sourceElement = this.portElements.get(sourcePort.getId());
    const targetElement = this.portElements.get(targetPort.getId());

    if (sourceElement && targetElement) {
      const sourceNode = this.nodeElements.get(sourcePort.getNodeId());
      const targetNode = this.nodeElements.get(targetPort.getNodeId());

      if (sourceNode && targetNode) {
        const sourceTransform = sourceNode.getAttribute('transform');
        const targetTransform = targetNode.getAttribute('transform');

        // 解析 transform 属性获取节点位置
        const sourceMatch = sourceTransform?.match(/translate\((\d+),\s*(\d+)\)/);
        const targetMatch = targetTransform?.match(/translate\((\d+),\s*(\d+)\)/);

        if (sourceMatch && targetMatch) {
          const sourceX = parseInt(sourceMatch[1]);
          const sourceY = parseInt(sourceMatch[2]);
          const targetX = parseInt(targetMatch[1]);
          const targetY = parseInt(targetMatch[2]);

          // 获取端口的相对位置
          const sourcePortElement = sourceElement.querySelector('circle');
          const targetPortElement = targetElement.querySelector('circle');

          if (sourcePortElement && targetPortElement) {
            const sourcePortX = parseInt(sourcePortElement.getAttribute('cx') || '0');
            const sourcePortY = parseInt(sourcePortElement.getAttribute('cy') || '0');
            const targetPortX = parseInt(targetPortElement.getAttribute('cx') || '0');
            const targetPortY = parseInt(targetPortElement.getAttribute('cy') || '0');

            // 计算端口的绝对位置
            const x1 = sourceX + sourcePortX;
            const y1 = sourceY + sourcePortY;
            const x2 = targetX + targetPortX;
            const y2 = targetY + targetPortY;

            // 创建贝塞尔曲线路径
            const dx = x2 - x1;
            const dy = y2 - y1;
            const path = `M ${x1} ${y1} C ${x1 + dx / 2} ${y1}, ${x2 - dx / 2} ${y2}, ${x2} ${y2}`;

            element.setAttribute('d', path);
            element.setAttribute('stroke', '#666');
            element.setAttribute('stroke-width', '2');
            element.setAttribute('fill', 'none');
          }
        }
      }
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
    }
  }

  private updateEdge(edge: EditorEdge): void {
    const edgeElement = this.edgeElements.get(edge.getId());
    if (edgeElement) {
      const newEdgeElement = this.createEdgeElement(edge);
      edgeElement.replaceWith(newEdgeElement);
      this.edgeElements.set(edge.getId(), newEdgeElement);
    }
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
