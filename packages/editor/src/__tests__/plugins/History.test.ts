import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Editor } from '../../Editor';
import { History } from '../../plugins/History';
import { Node } from '@logic.js/core';

describe('History Plugin', () => {
  let editor: Editor;
  let history: History;

  beforeEach(() => {
    editor = new Editor({
      id: 'test-graph',
      name: 'Test Graph',
      nodes: [],
      edges: []
    });
    history = new History();
    editor.use(history);
  });

  afterEach(() => {
    editor.destroy();
  });

  describe('Basic Functionality', () => {
    it('should initialize correctly', () => {
      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(false);
    });

    it('should support clearing history', () => {
      const node = new Node({
        id: 'node1',
        name: 'Node 1',
        type: 'default',
        x: 100,
        y: 100
      });
      editor.addNode(node);
      expect(history.canUndo()).toBe(true);

      history.clear();
      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(false);
    });
  });

  describe('Node Operations', () => {
    it('should track node movement', () => {
      const nodeData = {
        id: 'node1',
        name: 'Node 1',
        type: 'test',
        x: 0,
        y: 0
      };
      const node = new Node(nodeData);
      editor.addNode(node);

      // Move node
      editor.startDrag('node1', 100, 100);
      node.setPosition(100, 100);
      editor.endDrag();

      // Undo should move node back
      history.undo();
      expect(node.getPosition()).toEqual({ x: 0, y: 0 });

      // Redo should move node again
      history.redo();
      console.log(node.getPosition());
      expect(node.getPosition()).toEqual({ x: 100, y: 100 });
    });

    it('should track node addition and removal', () => {
      const nodeData = {
        id: 'node1',
        name: 'Node 1',
        type: 'test',
        x: 0,
        y: 0
      };
      const node = new Node(nodeData);
      editor.addNode(node);

      // Remove node
      editor.removeNode('node1');
      expect(editor.getNode('node1')).toBeUndefined();

      // Undo should restore node
      history.undo();
      expect(editor.getNode('node1')).toBeDefined();

      // Redo should remove node again
      history.redo();
      expect(editor.getNode('node1')).toBeUndefined();
    });
  });

  describe('Edge Operations', () => {
    it('should track edge addition and removal', () => {
      // Create nodes with ports
      const sourceNodeData = {
        id: 'source',
        name: 'Source Node',
        type: 'test',
        x: 0,
        y: 0,
        outputs: [{ id: 'output1', name: 'Output 1', type: 'output' as const }]
      };
      const sourceNode = new Node(sourceNodeData);
      editor.addNode(sourceNode);

      const targetNodeData = {
        id: 'target',
        name: 'Target Node',
        type: 'test',
        x: 200,
        y: 0,
        inputs: [{ id: 'input1', name: 'Input 1', type: 'input' as const }]
      };
      const targetNode = new Node(targetNodeData);
      editor.addNode(targetNode);

      // Add edge
      const sourcePort = sourceNode.getOutput('output1');
      const targetPort = targetNode.getInput('input1');
      if (!sourcePort || !targetPort) {
        throw new Error('Ports not found');
      }
      const edge = editor.addEdge(sourcePort, targetPort);
      if (!edge) {
        throw new Error('Failed to create edge');
      }

      // Remove edge
      editor.removeEdge(edge.getId());
      expect(editor.getEdge(edge.getId())).toBeUndefined();

      // Undo should restore edge
      history.undo();
      expect(editor.getEdge(edge.getId())).toBeDefined();

      // Redo should remove edge again
      history.redo();
      expect(editor.getEdge(edge.getId())).toBeUndefined();
    });
  });

  describe('Stack Management', () => {
    it('should respect max stack size', () => {
      const maxStackSize = 3;
      const history = new History({ maxStackSize });
      editor.use(history);

      // Add more actions than maxStackSize
      for (let i = 0; i < maxStackSize + 2; i++) {
        const nodeData = {
          id: `node${i}`,
          name: `Node ${i}`,
          type: 'test',
          x: i * 100,
          y: 0
        };
        const node = new Node(nodeData);
        editor.addNode(node);
        node.setPosition(i * 100 + 50, 50);
      }

      // Should only be able to undo maxStackSize times
      for (let i = 0; i < maxStackSize; i++) {
        expect(history.canUndo()).toBe(true);
        history.undo();
      }
      expect(history.canUndo()).toBe(false);
    });

    it('should clear redo stack when new action is performed', () => {
      const nodeData = {
        id: 'node1',
        name: 'Node 1',
        type: 'test',
        x: 0,
        y: 0
      };
      const node = new Node(nodeData);
      editor.addNode(node);

      // Move node
      node.setPosition(100, 100);

      // Undo
      history.undo();
      expect(history.canRedo()).toBe(true);

      // Perform new action
      node.setPosition(200, 200);
      expect(history.canRedo()).toBe(false);
    });
  });

  describe('Event Handling', () => {
    it('should emit history:change event', () => {
      const changeHandler = vi.fn();
      editor.on('history:change', changeHandler);

      // Add node
      const nodeData = {
        id: 'node1',
        name: 'Node 1',
        type: 'test',
        x: 0,
        y: 0
      };
      const node = new Node(nodeData);
      editor.addNode(node);

      expect(changeHandler).toHaveBeenCalledWith({
        action: expect.objectContaining({
          type: 'node:added'
        }),
        canUndo: true,
        canRedo: false
      });
    });

    it('should not track actions during undo/redo', () => {
      const nodeData = {
        id: 'node1',
        name: 'Node 1',
        type: 'test',
        x: 0,
        y: 0
      };
      const node = new Node(nodeData);
      editor.addNode(node);

      // Move node
      node.setPosition(100, 100);

      // Undo
      history.undo();
      expect(node.getPosition()).toEqual({ x: 0, y: 0 });

      // Move during undo/redo should not be tracked
      node.setPosition(200, 200);
      history.redo();
      expect(node.getPosition()).toEqual({ x: 100, y: 100 });
    });
  });

  describe('Plugin Lifecycle', () => {
    it('should handle plugin installation and destruction correctly', () => {
      const history = new History();
      editor.use(history);

      // Add some operations
      const node = new Node({
        id: 'node1',
        name: 'Node 1',
        type: 'default',
        x: 100,
        y: 100
      });
      editor.addNode(node);
      expect(history.canUndo()).toBe(true);

      // Uninstall plugin
      editor.unuse('history');
      expect(history.canUndo()).toBe(false);

      // Reinstall plugin
      editor.use(history);
      expect(history.canUndo()).toBe(false);
    });
  });
}); 
