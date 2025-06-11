<template>
  <div class="app">
    <div class="toolbar">
      <button @click="addNode">Add Node</button>
      <button @click="removeNode">Remove Node</button>
      <button @click="loadSample">Load Sample</button>
      <button @click="undo" :disabled="!canUndo">Undo</button>
      <button @click="redo" :disabled="!canRedo">Redo</button>
    </div>
    <div ref="container" class="editor-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Editor, History, SvgRenderer } from '@logic.js/editor'
import { GraphData, Node } from '@logic.js/core'
import { sampleJSON } from './json-test'

const container = ref<HTMLElement | null>(null)
let editor: Editor
let renderer: SvgRenderer
let history: History

const canUndo = ref(false)
const canRedo = ref(false)

onMounted(() => {
  if (!container.value) return

  editor = new Editor({
    id: 'empty-graph',
    name: 'Empty Graph',
    nodes: [],
    edges: []
  })

  renderer = new SvgRenderer(container.value, editor)

  // Install History plugin
  history = new History()
  editor.use(history)

  // Listen for history:change event
  editor.on('history:change', () => {
    canUndo.value = history.canUndo()
    canRedo.value = history.canRedo()
  })
})

const addNode = () => {
  const nodeId = `node-${Date.now()}`
  const node = new Node({
    id: nodeId,
    name: 'New Node',
    type: 'default',
    x: 200,
    y: 200,
    inputs: [
      { id: `${nodeId}-input`, name: 'Input', type: 'input' }
    ],
    outputs: [
      { id: `${nodeId}-output`, name: 'Output', type: 'output' }
    ]
  })
  editor.addNode(node)
}

const removeNode = () => {
  const nodes = editor.getNodes()
  if (nodes.length > 0) {
    editor.removeNode(nodes[nodes.length - 1].getId())
  }
}

const loadSample = () => {
  editor.fromJSON(sampleJSON as GraphData)
  renderer.update()
}

const undo = () => {
  history.undo()
}

const redo = () => {
  history.redo()
}
</script>

<style>
.app {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.toolbar {
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.toolbar button {
  margin-right: 8px;
}

.editor-container {
  flex: 1;
  background: #f5f5f5;
}
</style> 
