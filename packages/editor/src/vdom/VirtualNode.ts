export class VirtualNode {
  private element: SVGElement | null = null;
  private children: Map<string, VirtualNode> = new Map();
  private attributes: Map<string, string> = new Map();
  private needsUpdate: boolean = true;
  private _textContent: string = '';

  constructor(
    private type: string,
    private id: string
  ) { }

  public setAttribute(name: string, value: string) {
    if (this.attributes.get(name) !== value) {
      this.attributes.set(name, value);
      this.needsUpdate = true;
    }
  }

  public getAttribute(name: string): string | null {
    return this.attributes.get(name) || null;
  }

  public appendChild(child: VirtualNode) {
    this.children.set(child.id, child);
    this.needsUpdate = true;
  }

  public get textContent(): string {
    return this._textContent;
  }

  public set textContent(value: string) {
    if (this._textContent !== value) {
      this._textContent = value;
      this.needsUpdate = true;
    }
  }

  public update() {
    if (!this.needsUpdate) return;

    if (!this.element) {
      this.element = document.createElementNS('http://www.w3.org/2000/svg', this.type);
    }

    // 更新属性
    this.attributes.forEach((value, name) => {
      this.element?.setAttribute(name, value);
    });

    // 更新文本内容
    if (this._textContent) {
      this.element.textContent = this._textContent;
    }

    // 更新子节点
    this.children.forEach(child => {
      child.update();
      if (child.getElement()) {
        this.element?.appendChild(child.getElement()!);
      }
    });

    this.needsUpdate = false;
  }

  public getElement(): SVGElement | null {
    return this.element;
  }

  public getId(): string {
    return this.id;
  }

  public getType(): string {
    return this.type;
  }
} 
