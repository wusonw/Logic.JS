import { describe, test, expect } from 'vitest';
import { Graph } from '../Graph';
import { Node } from '../Node';
import { Bounds } from '../QuadTree';

describe('QuadTree Performance Tests', () => {
  // Create a graph with a large number of nodes
  function createLargeGraph(nodeCount: number): Graph {
    const graph = new Graph({
      id: 'test-graph',
      name: 'Test Graph',
      nodes: [],
      edges: []
    });

    // Add nodes
    for (let i = 0; i < nodeCount; i++) {
      const node = new Node({
        id: `node-${i}`,
        name: `Node ${i}`,
        type: 'default',
        x: Math.random() * 1000,
        y: Math.random() * 1000
      });
      graph.addNode(node);
    }

    return graph;
  }

  test('Performance comparison: with vs without QuadTree', () => {
    const nodeCount = 1000;
    const graph = createLargeGraph(nodeCount);
    const bounds: Bounds = { x: 100, y: 100, width: 200, height: 200 };

    // Test performance without QuadTree
    console.time('Without QuadTree');
    const nodesWithoutQuadTree = graph.getNodes().filter(node => {
      const nodeBounds = node.getBounds();
      return (
        nodeBounds.x < bounds.x + bounds.width &&
        nodeBounds.x + nodeBounds.width > bounds.x &&
        nodeBounds.y < bounds.y + bounds.height &&
        nodeBounds.y + nodeBounds.height > bounds.y
      );
    });
    console.timeEnd('Without QuadTree');

    // Test performance with QuadTree
    console.time('With QuadTree');
    const nodesWithQuadTree = graph.getNodesInBounds(bounds);
    console.timeEnd('With QuadTree');

    // Verify results are consistent
    expect(nodesWithQuadTree.length).toBe(nodesWithoutQuadTree.length);
  });

  test('Performance impact with different node counts', () => {
    const nodeCounts = [100, 500, 1000, 2000, 5000];

    nodeCounts.forEach(count => {
      const graph = createLargeGraph(count);
      const bounds: Bounds = { x: 100, y: 100, width: 200, height: 200 };

      console.log(`\nTesting with ${count} nodes:`);

      console.time('Without QuadTree');
      const nodesWithoutQuadTree = graph.getNodes().filter(node => {
        const nodeBounds = node.getBounds();
        return (
          nodeBounds.x < bounds.x + bounds.width &&
          nodeBounds.x + nodeBounds.width > bounds.x &&
          nodeBounds.y < bounds.y + bounds.height &&
          nodeBounds.y + nodeBounds.height > bounds.y
        );
      });
      console.timeEnd('Without QuadTree');

      console.time('With QuadTree');
      const nodesWithQuadTree = graph.getNodesInBounds(bounds);
      console.timeEnd('With QuadTree');

      expect(nodesWithQuadTree.length).toBe(nodesWithoutQuadTree.length);
    });
  });
}); 
