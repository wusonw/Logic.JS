import { Editor } from '@logic.js/editor';

// 创建一个示例 JSON 数据
export const sampleJSON = {
  id: 'test-graph',
  name: 'Test Graph',
  nodes: [
    {
      id: 'node1',
      name: 'Input Node',
      type: 'input',
      position: { x: 100, y: 100 },
      inputs: [
        { id: 'input1', name: 'Input 1', type: 'input', nodeId: 'node1' },
        { id: 'input2', name: 'Input 2', type: 'input', nodeId: 'node1' }
      ],
      outputs: [
        { id: 'output1', name: 'Output 1', type: 'output', nodeId: 'node1' },
        { id: 'output2', name: 'Output 2', type: 'output', nodeId: 'node1' }
      ]
    },
    {
      id: 'node2',
      name: 'Process Node 1',
      type: 'process',
      position: { x: 300, y: 100 },
      inputs: [
        { id: 'input3', name: 'Input 1', type: 'input', nodeId: 'node2' },
        { id: 'input4', name: 'Input 2', type: 'input', nodeId: 'node2' }
      ],
      outputs: [
        { id: 'output3', name: 'Output 1', type: 'output', nodeId: 'node2' },
        { id: 'output4', name: 'Output 2', type: 'output', nodeId: 'node2' }
      ]
    },
    {
      id: 'node3',
      name: 'Process Node 2',
      type: 'process',
      position: { x: 500, y: 100 },
      inputs: [
        { id: 'input5', name: 'Input 1', type: 'input', nodeId: 'node3' },
        { id: 'input6', name: 'Input 2', type: 'input', nodeId: 'node3' },
        { id: 'input7', name: 'Input 3', type: 'input', nodeId: 'node3' }
      ],
      outputs: [
        { id: 'output5', name: 'Output 1', type: 'output', nodeId: 'node3' },
        { id: 'output6', name: 'Output 2', type: 'output', nodeId: 'node3' }
      ]
    },
    {
      id: 'node4',
      name: 'Output Node',
      type: 'output',
      position: { x: 700, y: 100 },
      inputs: [
        { id: 'input8', name: 'Input 1', type: 'input', nodeId: 'node4' },
        { id: 'input9', name: 'Input 2', type: 'input', nodeId: 'node4' },
        { id: 'input10', name: 'Input 3', type: 'input', nodeId: 'node4' }
      ],
      outputs: [
        { id: 'output7', name: 'Output 1', type: 'output', nodeId: 'node4' }
      ]
    }
  ],
  edges: [
    {
      id: 'edge1',
      sourcePortId: 'output1',
      targetPortId: 'input3'
    },
    {
      id: 'edge2',
      sourcePortId: 'output2',
      targetPortId: 'input4'
    },
    {
      id: 'edge3',
      sourcePortId: 'output3',
      targetPortId: 'input5'
    },
    {
      id: 'edge4',
      sourcePortId: 'output4',
      targetPortId: 'input6'
    },
    {
      id: 'edge5',
      sourcePortId: 'output5',
      targetPortId: 'input8'
    },
    {
      id: 'edge6',
      sourcePortId: 'output6',
      targetPortId: 'input9'
    }
  ]
};

