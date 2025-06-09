import { Editor } from '@logic.js/editor'
import { SvgRenderer } from '@logic.js/editor'
import { GraphData, Node } from '@logic.js/core'
import './style.css'
import { sampleJSON } from './json-test'

const container = document.getElementById('app')

if (!container) {
  console.error('Editor container not found')
} else {
  const editor = new Editor({
    id: 'empty-graph',
    name: 'Empty Graph',
    nodes: [],
    edges: []
  })

  const renderer = new SvgRenderer(container, editor)

  // 添加节点按钮事件
  document.getElementById('add-node')?.addEventListener('click', () => {
    const nodeId = `node-${Date.now()}`
    const node = new Node({
      id: nodeId,
      name: 'New Node',
      type: 'default',
      x: 200,
      y: 200,
      inputs: [
        { id: `${nodeId}-input`, name: 'Input', type: 'input', nodeId }
      ],
      outputs: [
        { id: `${nodeId}-output`, name: 'Output', type: 'output', nodeId }
      ]
    })
    editor.addNode(node)
  })

  // 删除节点按钮事件
  document.getElementById('remove-node')?.addEventListener('click', () => {
    const nodes = editor.getNodes()
    if (nodes.length > 0) {
      editor.removeNode(nodes[nodes.length - 1].getId())
    }
  })

  // 添加 fromJSON 按钮
  const fromJSONButton = document.createElement('button')
  fromJSONButton.textContent = '加载示例'
  fromJSONButton.style.marginLeft = '8px'
  document.querySelector('div[style*="padding: 16px"]')?.appendChild(fromJSONButton)

  // fromJSON 按钮事件
  fromJSONButton.addEventListener('click', () => {
    // 使用实例的 fromJSON 方法更新数据
    editor.fromJSON(sampleJSON as GraphData)

    // 重新渲染
    renderer.update()
  })
} 
