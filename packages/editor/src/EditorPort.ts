import { Port, PortData } from '@logic.js/core';

export class EditorPort extends Port {
  constructor(data: PortData) {
    super(data);
  }

  public canConnect(port: Port): boolean {
    // 检查端口类型是否匹配
    return this.getType() === port.getType();
  }
} 
