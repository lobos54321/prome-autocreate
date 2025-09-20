#!/usr/bin/env node

/**
 * 分析N8n工作流的响应数据格式
 * 查看子工作流的最终输出节点，了解视频链接是如何返回的
 */

import https from 'https';

const N8N_BASE_URL = 'https://n8n-worker-k4m9.zeabur.app';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4ZjA0NDU1OS0wOTJjLTRjYmQtOTU0Mi05YjdjNTNjMTk3NmEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU4MDg2Mzk2fQ.v0msK0j2eoWmLf6Wqu2hKuE05XGD431cfHskGljR9UI';
const SUB_WORKFLOW_ID = 'iEJ60phVs8VWagWD';

async function makeAPIRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${N8N_BASE_URL}${endpoint}`);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-N8N-API-KEY': API_KEY,
        'User-Agent': 'N8n-Response-Analyzer/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          statusMessage: res.statusMessage,
          data: JSON.parse(data)
        });
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function analyzeSubWorkflowOutput() {
  console.log('🔍 分析子工作流的输出数据格式...\n');
  
  try {
    // 获取子工作流配置
    const response = await makeAPIRequest(`/api/v1/workflows/${SUB_WORKFLOW_ID}`);
    const workflow = response.data;
    
    console.log(`✅ 子工作流名称: ${workflow.name}`);
    console.log(`📊 节点数量: ${workflow.nodes?.length || 0}\n`);
    
    if (workflow.nodes) {
      console.log('🔍 分析最终输出相关的节点:\n');
      
      // 查找最终输出节点
      const outputNodes = workflow.nodes.filter(node => 
        node.type === 'n8n-nodes-base.set' ||
        node.type === 'n8n-nodes-base.respondToWebhook' ||
        node.name.toLowerCase().includes('final') ||
        node.name.toLowerCase().includes('output') ||
        node.name.toLowerCase().includes('result') ||
        node.name.toLowerCase().includes('video')
      );
      
      console.log(`📋 找到 ${outputNodes.length} 个可能的输出节点:\n`);
      
      outputNodes.forEach((node, index) => {
        console.log(`${index + 1}. 节点名称: ${node.name}`);
        console.log(`   节点类型: ${node.type}`);
        console.log(`   位置: (${node.position[0]}, ${node.position[1]})`);
        
        if (node.parameters) {
          console.log(`   配置参数:`);
          console.log(`   ${JSON.stringify(node.parameters, null, 6)}`);
        }
        console.log('');
      });
      
      // 特别查看Edit Fields节点（通常是最终输出）
      const editFieldsNode = workflow.nodes.find(node => 
        node.name === 'Edit Fields' || 
        node.type === 'n8n-nodes-base.set'
      );
      
      if (editFieldsNode) {
        console.log(`🎯 重点分析Edit Fields节点:`);
        console.log(`   节点名称: ${editFieldsNode.name}`);
        console.log(`   节点类型: ${editFieldsNode.type}`);
        
        if (editFieldsNode.parameters && editFieldsNode.parameters.assignments) {
          console.log(`\n   📝 输出字段配置:`);
          editFieldsNode.parameters.assignments.assignments.forEach((assignment, i) => {
            console.log(`   ${i + 1}. 字段名: ${assignment.name}`);
            console.log(`      字段值: ${assignment.value}`);
            console.log(`      字段类型: ${assignment.type}`);
          });
        }
      }
      
      // 分析工作流的连接，找出最终节点
      if (workflow.connections) {
        console.log(`\n🔗 分析工作流连接，找出最终输出节点:`);
        
        // 找到没有输出连接的节点（即最终节点）
        const allTargetNodes = new Set();
        Object.values(workflow.connections).forEach(connections => {
          Object.values(connections).forEach(targets => {
            targets.forEach(target => {
              allTargetNodes.add(target.node);
            });
          });
        });
        
        const allSourceNodes = new Set(Object.keys(workflow.connections));
        const finalNodes = Array.from(allSourceNodes).filter(nodeName => 
          !allTargetNodes.has(nodeName)
        );
        
        console.log(`   🎯 最终节点 (没有输出连接): ${finalNodes.join(', ')}`);
        
        // 显示这些最终节点的详细信息
        finalNodes.forEach(nodeName => {
          const node = workflow.nodes.find(n => n.name === nodeName);
          if (node) {
            console.log(`\n   📍 最终节点详情: ${nodeName}`);
            console.log(`      类型: ${node.type}`);
            if (node.parameters) {
              console.log(`      参数: ${JSON.stringify(node.parameters, null, 8)}`);
            }
          }
        });
      }
    }
    
  } catch (error) {
    console.log(`❌ 分析失败: ${error.message}`);
  }
}

async function analyzeSubWorkflowExecutions() {
  console.log('\n🔍 分析子工作流的执行记录...\n');
  
  try {
    const response = await makeAPIRequest(`/api/v1/executions?workflowId=${SUB_WORKFLOW_ID}&limit=5`);
    const executions = response.data.data || [];
    
    console.log(`📊 子工作流执行记录数量: ${executions.length}\n`);
    
    if (executions.length > 0) {
      // 分析最近一次成功的执行
      const successfulExecution = executions.find(ex => ex.status === 'success');
      
      if (successfulExecution) {
        console.log(`✅ 找到成功执行记录 (ID: ${successfulExecution.id})`);
        await analyzeExecutionOutput(successfulExecution.id);
      } else {
        console.log(`⚠️ 没有找到成功的执行记录，分析最近的执行:`);
        await analyzeExecutionOutput(executions[0].id);
      }
    } else {
      console.log(`📝 没有找到子工作流的执行记录`);
    }
    
  } catch (error) {
    console.log(`❌ 获取执行记录失败: ${error.message}`);
  }
}

async function analyzeExecutionOutput(executionId) {
  console.log(`\n🔍 分析执行输出 (ID: ${executionId})...\n`);
  
  try {
    const response = await makeAPIRequest(`/api/v1/executions/${executionId}`);
    const execution = response.data;
    
    console.log(`📋 执行状态: ${execution.status || '未知'}`);
    
    if (execution.data && execution.data.resultData && execution.data.resultData.runData) {
      console.log(`\n🔄 分析各节点的输出数据:\n`);
      
      // 查找包含视频URL的节点
      Object.entries(execution.data.resultData.runData).forEach(([nodeName, runs]) => {
        if (runs && runs.length > 0) {
          const lastRun = runs[runs.length - 1];
          
          if (lastRun.data && lastRun.data.main && lastRun.data.main[0]) {
            const outputData = lastRun.data.main[0][0];
            
            if (outputData && outputData.json) {
              const json = outputData.json;
              
              // 检查是否包含视频相关字段
              const videoFields = Object.keys(json).filter(key => 
                key.toLowerCase().includes('video') ||
                key.toLowerCase().includes('url') ||
                key.toLowerCase().includes('link') ||
                key.toLowerCase().includes('final')
              );
              
              if (videoFields.length > 0) {
                console.log(`🎥 节点 "${nodeName}" 包含视频相关字段:`);
                videoFields.forEach(field => {
                  console.log(`   ${field}: ${json[field]}`);
                });
                console.log('');
              }
              
              // 特别关注Edit Fields节点的输出
              if (nodeName === 'Edit Fields') {
                console.log(`🎯 Edit Fields节点输出 (这可能是最终返回给前端的数据):`);
                console.log(`   ${JSON.stringify(json, null, 6)}`);
                console.log('');
              }
            }
          }
        }
      });
      
      // 查找工作流的最终输出
      if (execution.data.resultData.lastNodeExecuted) {
        console.log(`🎯 最后执行的节点: ${execution.data.resultData.lastNodeExecuted}`);
        
        const lastNodeData = execution.data.resultData.runData[execution.data.resultData.lastNodeExecuted];
        if (lastNodeData && lastNodeData.length > 0) {
          const lastOutput = lastNodeData[lastNodeData.length - 1];
          if (lastOutput.data && lastOutput.data.main && lastOutput.data.main[0]) {
            console.log(`\n📄 工作流最终输出数据:`);
            console.log(`${JSON.stringify(lastOutput.data.main[0][0].json, null, 4)}`);
          }
        }
      }
    }
    
  } catch (error) {
    console.log(`❌ 分析执行输出失败: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 N8n工作流响应数据格式分析工具');
  console.log(`🔄 子工作流ID: ${SUB_WORKFLOW_ID}\n`);
  
  // 分析子工作流的输出节点配置
  await analyzeSubWorkflowOutput();
  
  // 分析子工作流的执行记录
  await analyzeSubWorkflowExecutions();
  
  console.log('\n📋 分析总结:');
  console.log('1. 查看Edit Fields节点的配置，它定义了返回给前端的数据格式');
  console.log('2. 查看最终输出数据的字段名和值');
  console.log('3. 前端需要根据这个数据格式来解析视频URL');
  console.log('4. 可能需要调整前端的视频URL检测逻辑');
}

main().catch(console.error);