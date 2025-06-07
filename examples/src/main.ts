import { Editor, SvgRenderer } from '@logic.js/editor'
import './style.css'

const app = document.querySelector<HTMLDivElement>('#app')!

// 创建编辑器实例
const editor = new Editor({
  id: 'graph1',
  name: '示例图',
  nodes: [],
  edges: []
})

// 创建渲染器
const renderer = new SvgRenderer(app, editor)

// 添加一些示例节点
editor.addNodeToGraph({
  id: 'node1',
  name: '输入节点',
  type: 'input',
  position: { x: 100, y: 100 },
  inputs: [],
  outputs: [{
    id: 'output1',
    name: '输出',
    type: 'number',
    nodeId: 'node1'
  }]
})

editor.addNodeToGraph({
  id: 'node2',
  name: '输出节点',
  type: 'output',
  position: { x: 300, y: 100 },
  inputs: [{
    id: 'input1',
    name: '输入',
    type: 'number',
    nodeId: 'node2'
  }],
  outputs: []
})

// 添加连接
editor.connectPorts('output1', 'input1')

let nodeCount = 2;

// 添加节点按钮
const addBtn = document.getElementById('add-node')!;
addBtn.onclick = () => {
  nodeCount++;
  const nodeId = `node${nodeCount}`;
  editor.addNodeToGraph({
    id: nodeId,
    name: `节点${nodeCount}`,
    type: 'custom',
    position: { x: 100 + nodeCount * 40, y: 200 },
    inputs: [],
    outputs: []
  });
};

// 删除节点按钮
const removeBtn = document.getElementById('remove-node')!;
removeBtn.onclick = () => {
  if (nodeCount <= 2) return; // 保留初始节点
  const nodeId = `node${nodeCount}`;
  editor.removeNodeFromGraph(nodeId);
  nodeCount--;
}; 
