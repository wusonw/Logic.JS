import { Edge, EdgeData } from '@logic.js/core';

export class EditorEdge extends Edge {
  constructor(data: EdgeData) {
    super(data);
  }

  public validate(): boolean {
    const sourcePort = this.getSourcePort();
    const targetPort = this.getTargetPort();
    return sourcePort.canConnect(targetPort);
  }

  public transfer(): void {
    if (this.validate()) {
      const sourcePort = this.getSourcePort();
      const targetPort = this.getTargetPort();
      targetPort.setValue(sourcePort.getValue());
    }
  }
} 
