import { Editor } from '../Editor';
import { Plugin } from '.';
import { Node, Edge } from '@logic.js/core';

interface NodeMovedAction {
  type: 'node:moved';
  data: {
    id: string;
    from: { x: number; y: number };
    to: { x: number; y: number };
  };
}

interface NodeAddedAction {
  type: 'node:added';
  data: {
    id: string;
  };
}

interface NodeRemovedAction {
  type: 'node:removed';
  data: {
    id: string;
  };
}

interface EdgeAddedAction {
  type: 'edge:added';
  data: {
    id: string;
  };
}

interface EdgeRemovedAction {
  type: 'edge:removed';
  data: {
    id: string;
  };
}

export type HistoryAction =
  | NodeMovedAction
  | NodeAddedAction
  | NodeRemovedAction
  | EdgeAddedAction
  | EdgeRemovedAction;

export class History implements Plugin {
  name = 'history';
  private editor!: Editor;
  private undoStack: HistoryAction[] = [];
  private redoStack: HistoryAction[] = [];
  private maxStackSize: number;
  private isUndoRedo = false;

  constructor(options: { maxStackSize?: number } = {}) {
    this.maxStackSize = options.maxStackSize || 100;
  }

  install(editor: Editor): void {
    if (this.editor) {
      throw new Error('History plugin is already installed');
    }
    this.editor = editor;

    let lastNodePosition: { x: number; y: number } = { x: 0, y: 0 };

    editor.on('node:dragstart', (node: Node) => {
      lastNodePosition = { x: node.getPosition().x, y: node.getPosition().y };
    });

    // Listen for node movement events
    editor.on('node:dragend', (node: Node) => {
      if (this.isUndoRedo) return;
      this.pushAction({
        type: 'node:moved',
        data: {
          id: node.getId(),
          from: { ...lastNodePosition },
          to: { ...node.getPosition() }
        }
      });
    });

    // Listen for node addition events
    editor.on('node:added', (node: Node) => {
      if (this.isUndoRedo) return;
      this.pushAction({
        type: 'node:added',
        data: {
          id: node.getId()
        }
      });
    });

    // Listen for node removal events
    editor.on('node:removed', (nodeId: string) => {
      if (this.isUndoRedo) return;
      this.pushAction({
        type: 'node:removed',
        data: {
          id: nodeId
        }
      });
    });

    // Listen for edge addition events
    editor.on('edge:added', (edge: Edge) => {
      if (this.isUndoRedo) return;
      this.pushAction({
        type: 'edge:added',
        data: {
          id: edge.getId()
        }
      });
    });

    // Listen for edge removal events
    editor.on('edge:removed', (edgeId: string) => {
      if (this.isUndoRedo) return;
      this.pushAction({
        type: 'edge:removed',
        data: {
          id: edgeId
        }
      });
    });
  }

  destroy(): void {
    this.clear();
    this.editor = null as any;
  }

  private pushAction(action: HistoryAction): void {
    this.undoStack.push(action);
    this.redoStack = [];
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }
    this.emitChange();
  }

  undo(): void {
    if (this.undoStack.length === 0) return;

    this.isUndoRedo = true;
    const action = this.undoStack.pop()!;
    this.redoStack.push(action);

    switch (action.type) {
      case 'node:moved': {
        const node = this.editor.getNode(action.data.id);
        if (node) {
          node.setPosition(action.data.from.x, action.data.from.y);
        }
        break;
      }
      case 'node:added': {
        const node = this.editor.getNode(action.data.id);
        if (node) {
          this.editor.removeNode(action.data.id);
        }
        break;
      }
      case 'node:removed': {
        const node = this.editor.getNode(action.data.id);
        if (node) {
          this.editor.removeNode(action.data.id);
        }
        break;
      }
      case 'edge:added': {
        const edge = this.editor.getEdge(action.data.id);
        if (edge) {
          this.editor.removeEdge(action.data.id);
        }
        break;
      }
      case 'edge:removed': {
        const edge = this.editor.getEdge(action.data.id);
        if (edge) {
          const sourcePort = edge.getSourcePort();
          const targetPort = edge.getTargetPort();
          this.editor.addEdge(sourcePort, targetPort);
        }
        break;
      }
    }

    this.isUndoRedo = false;
    this.emitChange();
  }

  redo(): void {
    if (this.redoStack.length === 0) return;

    this.isUndoRedo = true;
    const action = this.redoStack.pop()!;
    this.undoStack.push(action);

    switch (action.type) {
      case 'node:moved': {
        const node = this.editor.getNode(action.data.id);
        if (node) {
          node.setPosition(action.data.to.x, action.data.to.y);
        }
        break;
      }
      case 'node:added': {
        const node = this.editor.getNode(action.data.id);
        if (node) {
          this.editor.addNode(node);
        }
        break;
      }
      case 'node:removed': {
        const node = this.editor.getNode(action.data.id);
        if (node) {
          this.editor.removeNode(action.data.id);
        }
        break;
      }
      case 'edge:added': {
        const edge = this.editor.getEdge(action.data.id);
        if (edge) {
          this.editor.removeEdge(action.data.id);
        }
        break;
      }
      case 'edge:removed': {
        const edge = this.editor.getEdge(action.data.id);
        if (edge) {
          this.editor.removeEdge(action.data.id);
        }
        break;
      }
    }

    this.isUndoRedo = false;
    this.emitChange();
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.emitChange();
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  private emitChange(): void {
    this.editor.emit('history:change', {
      action: this.undoStack[this.undoStack.length - 1] || null,
      canUndo: this.canUndo(),
      canRedo: this.canRedo()
    });
  }
} 
