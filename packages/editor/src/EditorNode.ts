import { Node, NodeData, Port, PortData } from '@logic.js/core';
import { EditorPort } from './EditorPort';

export class EditorNode extends Node {
  constructor(data: NodeData) {
    super(data);
  }

  protected addInput(data: PortData): void {
    const port = new EditorPort(data);
    this.inputs.set(port.getId(), port);
  }

  protected addOutput(data: PortData): void {
    const port = new EditorPort(data);
    this.outputs.set(port.getId(), port);
  }

  protected process(): void {
    // TODO: 实现节点处理逻辑
  }
} 
