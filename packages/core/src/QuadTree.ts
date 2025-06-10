export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface QuadTreeItem {
  id: string;
  bounds: Bounds;
}

export class QuadTree {
  private static readonly MAX_ITEMS = 4;
  private static readonly MAX_DEPTH = 8;

  private bounds: Bounds;
  private items: QuadTreeItem[];
  private nodes: QuadTree[];
  private depth: number;

  constructor(bounds: Bounds, depth: number = 0) {
    this.bounds = bounds;
    this.items = [];
    this.nodes = [];
    this.depth = depth;
  }

  public insert(item: QuadTreeItem): boolean {
    if (!this.contains(item.bounds)) {
      return false;
    }

    if (this.items.length < QuadTree.MAX_ITEMS && this.depth === 0) {
      this.items.push(item);
      return true;
    }

    if (this.depth < QuadTree.MAX_DEPTH) {
      if (this.nodes.length === 0) {
        this.subdivide();
      }

      for (const node of this.nodes) {
        if (node.insert(item)) {
          return true;
        }
      }
    }

    this.items.push(item);
    return true;
  }

  public query(bounds: Bounds): QuadTreeItem[] {
    const result: QuadTreeItem[] = [];

    if (!this.intersects(bounds)) {
      return result;
    }

    for (const item of this.items) {
      if (this.intersects(item.bounds, bounds)) {
        result.push(item);
      }
    }

    for (const node of this.nodes) {
      result.push(...node.query(bounds));
    }

    return result;
  }

  public remove(itemId: string): boolean {
    const index = this.items.findIndex(item => item.id === itemId);
    if (index !== -1) {
      this.items.splice(index, 1);
      return true;
    }

    for (const node of this.nodes) {
      if (node.remove(itemId)) {
        return true;
      }
    }

    return false;
  }

  public clear(): void {
    this.items = [];
    this.nodes = [];
  }

  private subdivide(): void {
    const { x, y, width, height } = this.bounds;
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    this.nodes = [
      new QuadTree({ x, y, width: halfWidth, height: halfHeight }, this.depth + 1),
      new QuadTree({ x: x + halfWidth, y, width: halfWidth, height: halfHeight }, this.depth + 1),
      new QuadTree({ x, y: y + halfHeight, width: halfWidth, height: halfHeight }, this.depth + 1),
      new QuadTree({ x: x + halfWidth, y: y + halfHeight, width: halfWidth, height: halfHeight }, this.depth + 1)
    ];
  }

  private contains(bounds: Bounds): boolean {
    return (
      bounds.x >= this.bounds.x &&
      bounds.y >= this.bounds.y &&
      bounds.x + bounds.width <= this.bounds.x + this.bounds.width &&
      bounds.y + bounds.height <= this.bounds.y + this.bounds.height
    );
  }

  private intersects(bounds1: Bounds, bounds2: Bounds = this.bounds): boolean {
    return !(
      bounds1.x + bounds1.width < bounds2.x ||
      bounds1.x > bounds2.x + bounds2.width ||
      bounds1.y + bounds1.height < bounds2.y ||
      bounds1.y > bounds2.y + bounds2.height
    );
  }
} 
