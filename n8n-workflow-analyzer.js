#!/usr/bin/env node

/**
 * N8n工作流深度分析工具 - 使用正确的API端点
 */

import https from 'https';

const N8N_BASE_URL = 'https://n8n-worker-k4m9.zeabur.app';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4ZjA0NDU1OS0wOTJjLTRjYmQtOTU0Mi05YjdjNTNjMTk3NmEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU4MDg2Mzk2fQ.v0msK0j2eoWmLf6Wqu2hKuE05XGD431cfHskGljR9UI';
const MAIN_WORKFLOW_ID = 'DdWZ4pp46LPTTEdl';
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
        'User-Agent': 'N8n-Workflow-Analyzer/1.0'
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

async function getAllWorkflows() {
  console.log('🔍 获取所有工作流...');
  
  try {
    const response = await makeAPIRequest('/api/v1/workflows');
    const workflows = response.data.data || [];
    
    console.log(`📊 总工作流数量: ${workflows.length}`);
    
    workflows.forEach((workflow, index) => {
      console.log(`${index + 1}. ${workflow.name} (ID: ${workflow.id})`);
      console.log(`   🟢 激活状态: ${workflow.active ? '已激活' : '未激活'}`);
      console.log(`   📅 更新时间: ${workflow.updatedAt}`);
      
      if (workflow.id === MAIN_WORKFLOW_ID) {
        console.log(`   🎯 这是主工作流！`);
      }
      if (workflow.id === SUB_WORKFLOW_ID) {
        console.log(`   🔄 这是子工作流！`);
      }
    });
    
    return workflows;
  } catch (error) {
    console.log(`❌ 获取工作流失败: ${error.message}`);
    return [];
  }
}

async function analyzeWorkflow(workflowId, name = '') {
  console.log(`\n🔍 深度分析${name}工作流 (ID: ${workflowId})...`);
  
  try {
    const response = await makeAPIRequest(`/api/v1/workflows/${workflowId}`);
    const workflow = response.data;
    
    console.log(`✅ 工作流名称: ${workflow.name}`);
    console.log(`📊 节点数量: ${workflow.nodes?.length || 0}`);
    console.log(`🔗 连接数量: ${workflow.connections ? Object.keys(workflow.connections).length : 0}`);
    console.log(`🟢 激活状态: ${workflow.active ? '已激活' : '未激活'}`);
    console.log(`📅 创建时间: ${workflow.createdAt}`);
    console.log(`📅 更新时间: ${workflow.updatedAt}`);
    
    if (workflow.nodes) {
      console.log('\n📋 节点详细分析:');
      workflow.nodes.forEach((node, index) => {
        console.log(`\n  ${index + 1}. 节点名称: ${node.name}`);
        console.log(`     节点类型: ${node.type}`);
        console.log(`     位置: (${node.position[0]}, ${node.position[1]})`);
        
        // 特别分析Chat Trigger节点
        if (node.type === 'n8n-nodes-base.chatTrigger') {
          console.log(`     🎯 这是Chat Trigger节点！`);
          console.log(`     配置参数:`);
          console.log(`     ${JSON.stringify(node.parameters, null, 8)}`);
          
          if (node.webhookId) {
            console.log(`     Webhook ID: ${node.webhookId}`);
          }
        }
        
        // 分析子工作流执行节点
        if (node.type === 'n8n-nodes-base.executeWorkflow') {
          console.log(`     🔄 这是子工作流执行节点！`);
          console.log(`     配置参数:`);
          console.log(`     ${JSON.stringify(node.parameters, null, 8)}`);
        }
        
        // 分析HTTP请求节点
        if (node.type === 'n8n-nodes-base.httpRequest') {
          console.log(`     🌐 这是HTTP请求节点！`);
          console.log(`     配置参数:`);
          console.log(`     ${JSON.stringify(node.parameters, null, 8)}`);
        }
        
        // 分析其他重要节点类型
        if (node.type.includes('set') || node.type.includes('function') || node.type.includes('code')) {
          console.log(`     ⚙️ 这是数据处理节点！`);
          console.log(`     配置参数:`);
          console.log(`     ${JSON.stringify(node.parameters, null, 8)}`);
        }
        
        if (node.parameters && Object.keys(node.parameters).length > 0) {
          if (!['n8n-nodes-base.chatTrigger', 'n8n-nodes-base.executeWorkflow', 'n8n-nodes-base.httpRequest'].includes(node.type)) {
            console.log(`     📝 参数配置:`);
            console.log(`     ${JSON.stringify(node.parameters, null, 8)}`);
          }
        }
      });
    }
    
    if (workflow.connections) {
      console.log('\n🔗 节点连接关系:');
      Object.entries(workflow.connections).forEach(([sourceNode, connections]) => {
        Object.entries(connections).forEach(([outputIndex, targets]) => {
          targets.forEach(target => {
            console.log(`  ${sourceNode}[输出${outputIndex}] → ${target.node}[输入${target.index}]`);
          });
        });
      });
    }
    
    return workflow;
  } catch (error) {
    console.log(`❌ 分析失败: ${error.message}`);
    return null;
  }
}

async function getWorkflowExecutions(workflowId, name = '') {
  console.log(`\n📋 获取${name}工作流执行记录...`);
  
  try {
    const response = await makeAPIRequest(`/api/v1/executions?workflowId=${workflowId}&limit=20`);
    const executions = response.data.data || [];
    
    console.log(`📊 执行记录数量: ${executions.length}`);
    
    if (executions.length > 0) {
      console.log('\n🕐 最近的执行记录:');
      executions.slice(0, 10).forEach((execution, index) => {
        const status = execution.status === 'success' ? '✅ 成功' : 
                     execution.status === 'error' ? '❌ 失败' : 
                     execution.status === 'running' ? '🔄 运行中' : 
                     `⚠️ ${execution.status}`;
        
        const startTime = new Date(execution.startedAt).toLocaleString();
        const endTime = execution.stoppedAt ? new Date(execution.stoppedAt).toLocaleString() : '未完成';
        
        console.log(`\n  ${index + 1}. ${status}`);
        console.log(`     开始时间: ${startTime}`);
        console.log(`     结束时间: ${endTime}`);
        console.log(`     执行ID: ${execution.id}`);
        
        if (execution.status === 'error' && index < 3) {
          // 获取最近3个错误执行的详细信息
          getExecutionDetails(execution.id, `${name}工作流错误详情${index + 1}`);
        }
      });
    } else {
      console.log('📝 没有找到执行记录');
    }
    
    return executions;
  } catch (error) {
    console.log(`❌ 获取执行记录失败: ${error.message}`);
    return [];
  }
}

async function getExecutionDetails(executionId, title = '') {
  console.log(`\n🔍 ${title} (执行ID: ${executionId})...`);
  
  try {
    const response = await makeAPIRequest(`/api/v1/executions/${executionId}`);
    const execution = response.data;
    
    console.log(`📋 执行状态: ${execution.status}`);
    console.log(`⏰ 开始时间: ${new Date(execution.startedAt).toLocaleString()}`);
    if (execution.stoppedAt) {
      console.log(`🛑 结束时间: ${new Date(execution.stoppedAt).toLocaleString()}`);
      const duration = new Date(execution.stoppedAt) - new Date(execution.startedAt);
      console.log(`⏱️ 执行时长: ${Math.round(duration / 1000)}秒`);
    }
    
    if (execution.data && execution.data.resultData) {
      if (execution.data.resultData.error) {
        console.log(`\n❌ 主要错误:`);
        console.log(`   消息: ${execution.data.resultData.error.message}`);
        console.log(`   类型: ${execution.data.resultData.error.name}`);
        if (execution.data.resultData.error.stack) {
          console.log(`   堆栈信息: ${execution.data.resultData.error.stack.substring(0, 500)}...`);
        }
      }
      
      if (execution.data.resultData.runData) {
        console.log(`\n🔄 各节点执行状态:`);
        Object.entries(execution.data.resultData.runData).forEach(([nodeName, nodeExecutions]) => {
          if (nodeExecutions && nodeExecutions.length > 0) {
            const lastExecution = nodeExecutions[nodeExecutions.length - 1];
            
            if (lastExecution.error) {
              console.log(`  ❌ ${nodeName}:`);
              console.log(`     错误: ${lastExecution.error.message}`);
              if (lastExecution.error.description) {
                console.log(`     描述: ${lastExecution.error.description}`);
              }
              if (lastExecution.error.httpCode) {
                console.log(`     HTTP状态码: ${lastExecution.error.httpCode}`);
              }
              if (lastExecution.error.stack) {
                console.log(`     错误堆栈: ${lastExecution.error.stack.substring(0, 300)}...`);
              }
            } else if (lastExecution.data) {
              console.log(`  ✅ ${nodeName}: 执行成功`);
              if (lastExecution.data.main && lastExecution.data.main[0]) {
                console.log(`     输出数据项: ${lastExecution.data.main[0].length}`);
                if (lastExecution.data.main[0][0] && lastExecution.data.main[0][0].json) {
                  const output = lastExecution.data.main[0][0].json;
                  console.log(`     输出数据预览: ${JSON.stringify(output, null, 6).substring(0, 200)}...`);
                }
              }
            } else {
              console.log(`  ⚠️ ${nodeName}: 状态不明确`);
            }
          }
        });
      }
      
      // 查找输入数据
      if (execution.data.executionData && execution.data.executionData.contextData) {
        console.log(`\n📥 输入数据分析:`);
        console.log(`   上下文数据: ${JSON.stringify(execution.data.executionData.contextData, null, 4)}`);
      }
    }
    
    return execution;
  } catch (error) {
    console.log(`❌ 获取执行详情失败: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('🚀 N8n工作流深度分析工具');
  console.log(`🔗 服务器: ${N8N_BASE_URL}`);
  console.log(`🎯 主工作流ID: ${MAIN_WORKFLOW_ID}`);
  console.log(`🔄 子工作流ID: ${SUB_WORKFLOW_ID}\n`);

  // 1. 获取所有工作流概览
  const allWorkflows = await getAllWorkflows();
  
  // 2. 深度分析主工作流
  const mainWorkflow = await analyzeWorkflow(MAIN_WORKFLOW_ID, '主');
  
  // 3. 深度分析子工作流
  const subWorkflow = await analyzeWorkflow(SUB_WORKFLOW_ID, '子');
  
  // 4. 获取主工作流执行记录
  await getWorkflowExecutions(MAIN_WORKFLOW_ID, '主');
  
  // 5. 获取子工作流执行记录
  await getWorkflowExecutions(SUB_WORKFLOW_ID, '子');
  
  console.log('\n🎯 问题诊断建议:');
  console.log('基于以上分析，重点检查:');
  console.log('1. Chat Trigger节点的webhook配置是否正确');
  console.log('2. 变量引用路径是否正确 (如 $json.chatInput)');
  console.log('3. 子工作流调用的参数传递是否正确');
  console.log('4. HTTP请求节点的API配置和认证');
  console.log('5. 各节点之间的数据格式是否匹配');
}

main().catch(console.error);