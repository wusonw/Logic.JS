import { Editor } from './Editor';
import { Node, Edge, Port } from '@logic.js/core';

import { PerformanceMonitor } from './performance/PerformanceMonitor';
import { VirtualNode } from './vdom/VirtualNode';

export class SvgRenderer {
  private svg: SVGElement;
  private editor: Editor;
  private nodeElements: Map<string, SVGElement> = new Map();
  private edgeElements: Map<string, SVGElement> = new Map();
  private portElements: Map<string, SVGElement> = new Map();
  private updateQueue: Set<string> = new Set();
  private isUpdating: boolean = false;
  private performanceMonitor: PerformanceMonitor = PerformanceMonitor.getInstance();

  constructor(container: HTMLElement, editor: Editor) {
    this.editor = editor;
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    container.appendChild(this.svg);
    this.drawGrid();

    // 设置事件监听
    this.setupDragEvents();

    // 设置编辑器事件监听
    this.setupEventListeners();

    // 初始渲染
    this.render();
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
    this.editor.on('node:moving', this.handleNodeMoving.bind(this));
    this.editor.on('node:moved', this.handleNodeMoved.bind(this));

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

    // 监听连线开始事件
    this.editor.on('connection:start', () => {
      this.startTempLine();
    });

    // 监听连线更新事件
    this.editor.on('connection:update', (x: number, y: number) => {
      this.updateTempLine(x, y);
    });

    // 监听连线结束事件
    this.editor.on('connection:end', () => {
      this.removeTempLine();
    });
  }

  private setupDragEvents(): void {
    // 在 SVG 根元素上只处理鼠标移动和释放事件
    this.svg.addEventListener('mousemove', (e: MouseEvent) => {
      if (this.editor.getIsDragging()) {
        const rect = this.svg.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.editor.handleDrag(x, y);
      } else if (this.editor.getIsPortConnecting()) {
        const rect = this.svg.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.editor.updateConnection(x, y);
      }
    });

    this.svg.addEventListener('mouseup', () => {
      if (this.editor.getIsDragging()) {
        this.editor.endDrag();
      } else if (this.editor.getIsPortConnecting()) {
        this.editor.cancelConnection();
      }
    });

    this.svg.addEventListener('mouseleave', () => {
      if (this.editor.getIsDragging()) {
        this.editor.endDrag();
      } else if (this.editor.getIsPortConnecting()) {
        this.editor.cancelConnection();
      }
    });
  }

  private startTempLine(): void {
    // 创建临时连线元素
    const tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    tempLine.setAttribute('stroke', '#666');
    tempLine.setAttribute('stroke-width', '2');
    tempLine.setAttribute('fill', 'none');
    tempLine.setAttribute('stroke-dasharray', '5,5');
    tempLine.id = 'temp-line';
    this.svg.appendChild(tempLine);
  }

  private updateTempLine(x: number, y: number): void {
    const tempLine = document.getElementById('temp-line');
    if (!tempLine || !(tempLine instanceof SVGPathElement)) return;
    const startPortId = this.editor.getConnectionStartPortId();
    if (!startPortId) return;
    const start = this.getPortCircleCenter(startPortId);
    if (!start) return;
    // 颜色与端口一致
    const port = this.editor.getPort(startPortId);
    const color = port?.getType() === 'input' ? '#ffd600' : '#b388ff';
    tempLine.setAttribute('stroke', color);
    tempLine.setAttribute('stroke-width', '3.5');
    tempLine.setAttribute('filter', 'drop-shadow(0 0 4px rgba(0,0,0,0.4))');
    const dx = x - start.x;
    const path = `M ${start.x} ${start.y} C ${start.x + dx * 0.5} ${start.y}, ${x - dx * 0.5} ${y}, ${x} ${y}`;
    tempLine.setAttribute('d', path);
  }

  private removeTempLine(): void {
    const tempLine = document.getElementById('temp-line');
    if (tempLine) {
      tempLine.remove();
    }
  }

  private render(): void {
    this.renderNodes();
    this.renderEdges();
  }

  private renderNodes(): void {
    const nodes = this.editor.getNodes();
    nodes.forEach(node => this.renderNode(node));
  }

  private renderEdges(): void {
    const edges = this.editor.getEdges();
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
    const portSpacing = 40;
    const minHeight = 100;
    const padding = 32;
    const portCount = Math.max(inputs.length, outputs.length);
    const height = Math.max(minHeight, portCount * portSpacing + padding);
    const inputsStartY = (height - (inputs.length - 1) * portSpacing) / 2;
    inputs.forEach((port, index) => {
      const y = inputsStartY + index * portSpacing;
      const portElement = this.createPortElement(port, 'input', y);
      this.portElements.set(port.getId(), portElement);
      nodeElement.appendChild(portElement);
    });
    const outputsStartY = (height - (outputs.length - 1) * portSpacing) / 2;
    outputs.forEach((port, index) => {
      const y = outputsStartY + index * portSpacing;
      const portElement = this.createPortElement(port, 'output', y);
      this.portElements.set(port.getId(), portElement);
      nodeElement.appendChild(portElement);
    });
  }

  private createNodeElement(node: Node): SVGElement {
    const nodeId = node.getId();
    const nodeElement = new VirtualNode('g', `node-${nodeId}`);
    const { x, y } = node.getPosition();
    nodeElement.setAttribute('transform', `translate(${x}, ${y})`);
    nodeElement.setAttribute('id', `node-${nodeId}`);
    // 样式参数
    const portCount = Math.max(node.getInputs().length, node.getOutputs().length);
    const portSpacing = 40;
    const minHeight = 100;
    const padding = 32;
    const width = 220;
    const titlebarHeight = 32;
    const height = Math.max(minHeight, portCount * portSpacing + padding + titlebarHeight);
    // titlebar
    const titlebar = new VirtualNode('rect', `${nodeId}-titlebar`);
    titlebar.setAttribute('x', '0');
    titlebar.setAttribute('y', '0');
    titlebar.setAttribute('width', width.toString());
    titlebar.setAttribute('height', titlebarHeight.toString());
    titlebar.setAttribute('fill', '#23272e');
    titlebar.setAttribute('rx', '12');
    titlebar.setAttribute('ry', '12');
    nodeElement.appendChild(titlebar);
    // 节点主体
    const rect = new VirtualNode('rect', `${nodeId}-rect`);
    rect.setAttribute('x', '0');
    rect.setAttribute('y', titlebarHeight.toString());
    rect.setAttribute('width', width.toString());
    rect.setAttribute('height', (height - titlebarHeight).toString());
    rect.setAttribute('rx', '16');
    rect.setAttribute('fill', '#2c2f36');
    rect.setAttribute('stroke', '#444');
    rect.setAttribute('stroke-width', '2.5');
    rect.setAttribute('filter', 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))');
    nodeElement.appendChild(rect);
    // 节点标题
    const text = new VirtualNode('text', `${nodeId}-text`);
    text.setAttribute('x', (width / 2).toString());
    text.setAttribute('y', (titlebarHeight / 2 + 2).toString());
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('font-size', '17');
    text.setAttribute('font-family', 'Arial, Helvetica, sans-serif');
    text.setAttribute('font-weight', 'bold');
    text.setAttribute('fill', '#fff');
    text.setAttribute('style', 'user-select: none;');
    text.textContent = node.getName();
    nodeElement.appendChild(text);
    nodeElement.update();
    const element = nodeElement.getElement() as SVGElement;
    element.addEventListener('mousedown', (e: MouseEvent) => {
      if ((e.target as SVGElement).closest('[id^="port-"]')) return;
      const rect = this.svg.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.editor.startDrag(nodeId, x, y);
    });
    return element;
  }

  private createPortElement(port: Port, type: 'input' | 'output', y: number): SVGElement {
    const portElement = new VirtualNode('g', `port-${port.getId()}`);
    portElement.setAttribute('id', `port-${port.getId()}`);
    // 端口在节点内部，y 需加 titlebarHeight
    const titlebarHeight = 32;
    const width = 220;
    const portY = y + titlebarHeight;
    const portX = type === 'input' ? 16 : width - 16;
    portElement.setAttribute('transform', `translate(${portX}, ${portY})`);
    // 端口颜色
    const color = type === 'input' ? '#ffd600' : '#b388ff';
    const colorDark = type === 'input' ? '#c7a500' : '#7c43bd';
    // 端口圆点（缩小）
    const circle = new VirtualNode('circle', `${port.getId()}-circle`);
    circle.setAttribute('cx', '0');
    circle.setAttribute('cy', '0');
    circle.setAttribute('r', '6');
    circle.setAttribute('fill', color);
    circle.setAttribute('stroke', colorDark);
    circle.setAttribute('stroke-width', '2');
    circle.setAttribute('style', 'cursor:pointer; transition:stroke 0.2s;');
    portElement.appendChild(circle);
    // hover 高亮
    setTimeout(() => {
      const el = portElement.getElement() as SVGElement;
      if (el) {
        el.addEventListener('mouseenter', () => {
          circle.setAttribute('stroke', '#fff');
          circle.update();
        });
        el.addEventListener('mouseleave', () => {
          circle.setAttribute('stroke', colorDark);
          circle.update();
        });
      }
    }, 0);
    // 端口文本
    const text = new VirtualNode('text', `${port.getId()}-text`);
    text.setAttribute('x', type === 'input' ? '12' : '-12');
    text.setAttribute('y', '2');
    text.setAttribute('text-anchor', type === 'input' ? 'start' : 'end');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('font-size', '14');
    text.setAttribute('font-family', 'Arial, Helvetica, sans-serif');
    text.setAttribute('fill', '#fff');
    text.setAttribute('style', 'user-select: none;');
    text.textContent = port.getName();
    portElement.appendChild(text);
    portElement.update();
    const element = portElement.getElement() as SVGElement;
    if (type === 'output') {
      element.addEventListener('mousedown', (e: MouseEvent) => {
        e.stopPropagation();
        this.editor.startConnection(port.getId());
      });
    }
    if (type === 'input') {
      element.addEventListener('mouseup', (e: MouseEvent) => {
        e.stopPropagation();
        if (this.editor.getIsPortConnecting()) {
          this.editor.endConnection(port.getId());
        }
      });
    }
    return element;
  }

  private createEdgeElement(edge: Edge): SVGElement {
    const edgeElement = new VirtualNode('path', edge.getId());
    // 线颜色与端口一致
    const color = edge.getSourcePort().getType() === 'input' ? '#ffd600' : '#b388ff';
    edgeElement.setAttribute('stroke', color);
    edgeElement.setAttribute('stroke-width', '3.5');
    edgeElement.setAttribute('fill', 'none');
    edgeElement.setAttribute('filter', 'drop-shadow(0 0 4px rgba(0,0,0,0.4))');
    const source = this.getPortCircleCenter(edge.getSourcePort().getId());
    const target = this.getPortCircleCenter(edge.getTargetPort().getId());
    if (source && target) {
      const dx = target.x - source.x;
      const path = `M ${source.x} ${source.y} C ${source.x + dx * 0.5} ${source.y}, ${target.x - dx * 0.5} ${target.y}, ${target.x} ${target.y}`;
      edgeElement.setAttribute('d', path);
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
    if (edgeElement) {
      const color = edge.getSourcePort().getType() === 'input' ? '#ffd600' : '#b388ff';
      edgeElement.setAttribute('stroke', color);
      edgeElement.setAttribute('stroke-width', '3.5');
      edgeElement.setAttribute('filter', 'drop-shadow(0 0 4px rgba(0,0,0,0.4))');
      const source = this.getPortCircleCenter(edge.getSourcePort().getId());
      const target = this.getPortCircleCenter(edge.getTargetPort().getId());
      if (source && target) {
        const dx = target.x - source.x;
        const path = `M ${source.x} ${source.y} C ${source.x + dx * 0.5} ${source.y}, ${target.x - dx * 0.5} ${target.y}, ${target.x} ${target.y}`;
        edgeElement.setAttribute('d', path);
      }
    }
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

  private handleNodeMoving(node: Node, x: number, y: number): void {
    const nodeElement = this.svg.querySelector(`#node-${node.getId()}`);
    if (nodeElement) {
      nodeElement.setAttribute('transform', `translate(${x}, ${y})`);
      // 更新与该节点相关的所有边
      const edges = this.editor.getEdges();
      edges.forEach(edge => {
        if (edge.getSourcePort().getNodeId() === node.getId() || edge.getTargetPort().getNodeId() === node.getId()) {
          this.updateEdge(edge);
        }
      });
    }
  }

  private handleNodeMoved(node: Node, x: number, y: number): void {
    // 更新与该节点相关的所有边
    const edges = this.editor.getEdges();
    edges.forEach(edge => {
      if (edge.getSourcePort().getNodeId() === node.getId() || edge.getTargetPort().getNodeId() === node.getId()) {
        this.updateEdge(edge);
      }
    });
  }

  private getPortCircleCenter(portId: string): { x: number, y: number } | null {
    const portGroup = this.portElements.get(portId);
    if (!portGroup) return null;
    const circle = portGroup.querySelector('circle');
    if (!circle) return null;
    const circleRect = circle.getBoundingClientRect();
    const svgRect = this.svg.getBoundingClientRect();
    return {
      x: circleRect.left + circleRect.width / 2 - svgRect.left,
      y: circleRect.top + circleRect.height / 2 - svgRect.top
    };
  }

  // 绘制网格背景
  private drawGrid() {
    // 移除旧网格
    const oldGrid = this.svg.querySelector('#svg-bg-grid');
    if (oldGrid) oldGrid.remove();
    const grid = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    grid.setAttribute('id', 'svg-bg-grid');
    const gridSize = 32;
    const width = this.svg.clientWidth || 2000;
    const height = this.svg.clientHeight || 1200;
    for (let x = 0; x < width; x += gridSize) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x.toString());
      line.setAttribute('y1', '0');
      line.setAttribute('x2', x.toString());
      line.setAttribute('y2', height.toString());
      line.setAttribute('stroke', '#31343a');
      line.setAttribute('stroke-width', '1');
      grid.appendChild(line);
    }
    for (let y = 0; y < height; y += gridSize) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', '0');
      line.setAttribute('y1', y.toString());
      line.setAttribute('x2', width.toString());
      line.setAttribute('y2', y.toString());
      line.setAttribute('stroke', '#31343a');
      line.setAttribute('stroke-width', '1');
      grid.appendChild(line);
    }
    this.svg.insertBefore(grid, this.svg.firstChild);
    this.svg.style.background = '#23272e';
  }
} 
