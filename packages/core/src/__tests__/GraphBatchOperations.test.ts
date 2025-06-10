import { describe, it, expect, beforeEach } from 'vitest';
import { Graph, GraphData } from '../Graph';
import { Node, NodeData } from '../Node';
import { Edge, EdgeData } from '../Edge';
import { Port } from '../Port';

describe('Graph Batch Operations', () => {
  let graph: Graph;
  let mockNodeData: NodeData[];
  let mockEdgeData: EdgeData[];

  beforeEach(() => {
    // Create mock data
    mockNodeData = [
      {
        id: 'node1',
        name: 'Node 1',
        type: 'default',
        x: 100,
        y: 100,
        inputs: [{ id: 'input1', name: 'Input 1', type: 'input', nodeId: 'node1' }],
        outputs: [{ id: 'output1', name: 'Output 1', type: 'output', nodeId: 'node1' }]
      },
      {
        id: 'node2',
        name: 'Node 2',
        type: 'default',
        x: 300,
        y: 100,
        inputs: [{ id: 'input2', name: 'Input 2', type: 'input', nodeId: 'node2' }],
        outputs: [{ id: 'output2', name: 'Output 2', type: 'output', nodeId: 'node2' }]
      }
    ];

    mockEdgeData = [
      {
        id: 'edge1',
        sourcePortId: 'output1',
        targetPortId: 'input2'
      }
    ];

    const graphData: GraphData = {
      id: 'test-graph',
      name: 'Test Graph',
      nodes: mockNodeData,
      edges: mockEdgeData
    };

    graph = new Graph(graphData);
  });

  describe('addNodes', () => {
    it('should add multiple nodes at once', () => {
      const newNodes = [
        new Node({
          id: 'node3',
          name: 'Node 3',
          type: 'default',
          x: 100,
          y: 300,
          inputs: [{ id: 'input3', name: 'Input 3', type: 'input', nodeId: 'node3' }],
          outputs: [{ id: 'output3', name: 'Output 3', type: 'output', nodeId: 'node3' }]
        }),
        new Node({
          id: 'node4',
          name: 'Node 4',
          type: 'default',
          x: 300,
          y: 300,
          inputs: [{ id: 'input4', name: 'Input 4', type: 'input', nodeId: 'node4' }],
          outputs: [{ id: 'output4', name: 'Output 4', type: 'output', nodeId: 'node4' }]
        })
      ];

      graph.addNodes(newNodes);

      expect(graph.getNodes().length).toBe(4);
      expect(graph.getNode('node3')).toBeDefined();
      expect(graph.getNode('node4')).toBeDefined();
    });
  });

  describe('removeNodes', () => {
    it('should remove multiple nodes at once', () => {
      const nodeIds = ['node1', 'node2'];
      graph.removeNodes(nodeIds);

      expect(graph.getNodes().length).toBe(0);
      expect(graph.getNode('node1')).toBeUndefined();
      expect(graph.getNode('node2')).toBeUndefined();
    });

    it('should remove all edges connected to removed nodes', () => {
      const nodeIds = ['node1', 'node2'];
      graph.removeNodes(nodeIds);

      expect(graph.getEdges().length).toBe(0);
    });
  });

  describe('addEdges', () => {
    it('should add multiple edges at once', () => {
      const node3 = new Node({
        id: 'node3',
        name: 'Node 3',
        type: 'default',
        x: 100,
        y: 300,
        inputs: [{ id: 'input3', name: 'Input 3', type: 'input', nodeId: 'node3' }],
        outputs: [{ id: 'output3', name: 'Output 3', type: 'output', nodeId: 'node3' }]
      });

      const node4 = new Node({
        id: 'node4',
        name: 'Node 4',
        type: 'default',
        x: 300,
        y: 300,
        inputs: [{ id: 'input4', name: 'Input 4', type: 'input', nodeId: 'node4' }],
        outputs: [{ id: 'output4', name: 'Output 4', type: 'output', nodeId: 'node4' }]
      });

      graph.addNodes([node3, node4]);

      const edges = [
        {
          sourcePort: node3.getOutput('output3')!,
          targetPort: node4.getInput('input4')!
        },
        {
          sourcePort: node4.getOutput('output4')!,
          targetPort: node3.getInput('input3')!
        }
      ];

      const createdEdges = graph.addEdges(edges);

      expect(createdEdges.length).toBe(2);
      expect(graph.getEdges().length).toBe(3); // Including the initial edge
    });

    it('should filter out invalid edges', () => {
      const node3 = new Node({
        id: 'node3',
        name: 'Node 3',
        type: 'default',
        x: 100,
        y: 300,
        inputs: [{ id: 'input3', name: 'Input 3', type: 'input', nodeId: 'node3' }],
        outputs: [{ id: 'output3', name: 'Output 3', type: 'output', nodeId: 'node3' }]
      });

      graph.addNodes([node3]);

      const edges = [
        {
          sourcePort: node3.getInput('input3')!, // Invalid: input port cannot be source
          targetPort: node3.getOutput('output3')!
        },
        {
          sourcePort: node3.getOutput('output3')!,
          targetPort: node3.getInput('input3')!
        }
      ];

      const createdEdges = graph.addEdges(edges);

      expect(createdEdges.length).toBe(1);
      expect(graph.getEdges().length).toBe(2); // Including the initial edge
    });
  });

  describe('removeEdges', () => {
    it('should remove multiple edges at once', () => {
      const node3 = new Node({
        id: 'node3',
        name: 'Node 3',
        type: 'default',
        x: 100,
        y: 300,
        inputs: [{ id: 'input3', name: 'Input 3', type: 'input', nodeId: 'node3' }],
        outputs: [{ id: 'output3', name: 'Output 3', type: 'output', nodeId: 'node3' }]
      });

      const node4 = new Node({
        id: 'node4',
        name: 'Node 4',
        type: 'default',
        x: 300,
        y: 300,
        inputs: [{ id: 'input4', name: 'Input 4', type: 'input', nodeId: 'node4' }],
        outputs: [{ id: 'output4', name: 'Output 4', type: 'output', nodeId: 'node4' }]
      });

      graph.addNodes([node3, node4]);

      const edges = [
        {
          sourcePort: node3.getOutput('output3')!,
          targetPort: node4.getInput('input4')!
        },
        {
          sourcePort: node4.getOutput('output4')!,
          targetPort: node3.getInput('input3')!
        }
      ];

      const createdEdges = graph.addEdges(edges);
      const edgeIds = createdEdges.map(edge => edge.getId());

      graph.removeEdges(edgeIds);

      expect(graph.getEdges().length).toBe(1); // Only the initial edge remains
    });
  });

  describe('clear', () => {
    it('should remove all nodes and edges', () => {
      graph.clear();

      expect(graph.getNodes().length).toBe(0);
      expect(graph.getEdges().length).toBe(0);
    });
  });
}); 
