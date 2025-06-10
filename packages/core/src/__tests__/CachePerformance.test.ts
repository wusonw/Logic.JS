import { describe, test, expect } from 'vitest';
import { Cache } from '../Cache';
import { Node } from '../Node';
import { Edge } from '../Edge';
import { Port } from '../Port';

describe('Cache Performance Tests', () => {
  // Simulate a computationally intensive function
  const heavyComputation = (value: number): number => {
    let result = 0;
    for (let i = 0; i < 1000000; i++) {
      result += Math.sqrt(value + i);
    }
    return result;
  };

  test('Basic Cache Performance - Repeated Access', () => {
    const cache = new Cache<number>();
    const iterations = 1000;
    const key = 'test_key';

    // Performance test without cache
    console.time('Without Cache - Repeated Access');
    for (let i = 0; i < iterations; i++) {
      heavyComputation(42); // Repeated computation of the same value
    }
    console.timeEnd('Without Cache - Repeated Access');

    // Performance test with cache
    console.time('With Cache - Repeated Access');
    for (let i = 0; i < iterations; i++) {
      cache.useCache(key, () => heavyComputation(42));
    }
    console.timeEnd('With Cache - Repeated Access');
  });

  test('Node Cache Performance - Large Scale Operations', () => {
    const nodeCount = 1000;
    const nodes: Node[] = [];

    // Create a large number of nodes
    for (let i = 0; i < nodeCount; i++) {
      nodes.push(new Node({
        id: `node-${i}`,
        name: `Node ${i}`,
        type: 'test',
        x: Math.random() * 1000,
        y: Math.random() * 1000
      }));
    }

    // Test frequent position access
    console.time('Frequent Position Access - Without Cache');
    for (let i = 0; i < 10000; i++) {
      const node = nodes[Math.floor(Math.random() * nodeCount)];
      node.getPosition();
    }
    console.timeEnd('Frequent Position Access - Without Cache');

    // Test frequent bounds access
    console.time('Frequent Bounds Access - Without Cache');
    for (let i = 0; i < 10000; i++) {
      const node = nodes[Math.floor(Math.random() * nodeCount)];
      node.getBounds();
    }
    console.timeEnd('Frequent Bounds Access - Without Cache');

    // Test node movement performance
    console.time('Node Movement Performance - Without Cache');
    for (let i = 0; i < 1000; i++) {
      const node = nodes[Math.floor(Math.random() * nodeCount)];
      node.setPosition(Math.random() * 1000, Math.random() * 1000);
      node.getBounds();
    }
    console.timeEnd('Node Movement Performance - Without Cache');
  });

  test('Edge Cache Performance - Large Scale Operations', () => {
    const nodeCount = 100;
    const edgeCount = 500;
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const portMap = new Map<string, Port>();
    const nodeMap = new Map<string, Node>();

    // Create nodes and ports
    for (let i = 0; i < nodeCount; i++) {
      const node = new Node({
        id: `node-${i}`,
        name: `Node ${i}`,
        type: 'test',
        x: Math.random() * 1000,
        y: Math.random() * 1000
      });

      const inputPort = new Port({
        id: `input-${i}`,
        name: `Input ${i}`,
        type: 'input',
        nodeId: node.getId()
      });

      const outputPort = new Port({
        id: `output-${i}`,
        name: `Output ${i}`,
        type: 'output',
        nodeId: node.getId()
      });

      node.addInput(inputPort);
      node.addOutput(outputPort);
      nodes.push(node);
      nodeMap.set(node.getId(), node);
      portMap.set(inputPort.getId(), inputPort);
      portMap.set(outputPort.getId(), outputPort);
    }

    // Create edges
    for (let i = 0; i < edgeCount; i++) {
      const sourceNode = nodes[Math.floor(Math.random() * nodeCount)];
      const targetNode = nodes[Math.floor(Math.random() * nodeCount)];

      const edge = new Edge({
        id: `edge-${i}`,
        sourcePortId: sourceNode.getOutputs()[0].getId(),
        targetPortId: targetNode.getInputs()[0].getId()
      }, portMap, nodeMap);

      edges.push(edge);
    }

    // Test frequent edge bounds access
    console.time('Frequent Edge Bounds Access - Without Cache');
    for (let i = 0; i < 10000; i++) {
      const edge = edges[Math.floor(Math.random() * edgeCount)];
      edge.getBounds();
    }
    console.timeEnd('Frequent Edge Bounds Access - Without Cache');

    // Test edge update performance during node movement
    console.time('Edge Update Performance During Node Movement - Without Cache');
    for (let i = 0; i < 1000; i++) {
      const node = nodes[Math.floor(Math.random() * nodeCount)];
      node.setPosition(Math.random() * 1000, Math.random() * 1000);
      // Update all edges connected to this node
      edges.forEach(edge => {
        if (edge.getSourcePort().getNodeId() === node.getId() ||
          edge.getTargetPort().getNodeId() === node.getId()) {
          edge.getBounds();
        }
      });
    }
    console.timeEnd('Edge Update Performance During Node Movement - Without Cache');
  });

  test('Cache Memory Usage - Large Scale Data', () => {
    const cache = new Cache<number>();
    const iterations = 100000;
    const initialMemory = process.memoryUsage().heapUsed;

    // Add a large number of cache entries
    for (let i = 0; i < iterations; i++) {
      cache.useCache(`key_${i}`, () => i);
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryUsed = (finalMemory - initialMemory) / 1024 / 1024; // Convert to MB

    console.log(`Memory used for ${iterations} cache entries: ${memoryUsed.toFixed(2)} MB`);

    // Clear cache
    cache.clear();
    const afterClearMemory = process.memoryUsage().heapUsed;
    const memoryAfterClear = (afterClearMemory - initialMemory) / 1024 / 1024;

    console.log(`Memory usage after clearing cache: ${memoryAfterClear.toFixed(2)} MB`);
  });
}); 
