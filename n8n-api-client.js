#!/usr/bin/env node

/**
 * N8n API客户端 - 使用API密钥查看工作流配置和执行状态
 */

import https from 'https';

const N8N_BASE_URL = 'https://n8n-worker-k4m9.zeabur.app';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4ZjA0NDU1OS0wOTJjLTRjYmQtOTU0Mi05YjdjNTNjMTk3NmEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU4MDg2Mzk2fQ.v0msK0j2eoWmLf6Wqu2hKuE05XGD431cfHskGljR9UI';
const MAIN_WORKFLOW_ID = 'DdWZ4pp46LPTTEdl';
const SUB_WORKFLOW_ID = 'iEJ60phVs8VWagWD';

async function makeN8nAPIRequest(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${N8N_BASE_URL}${endpoint}`);
    
    const requestOptions = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'N8n-API-Client/1.0',
        'Authorization': `Bearer ${API_KEY}`,
        'X-N8N-API-KEY': API_KEY,
        ...options.headers
      }
    };

    if (options.body) {
      requestOptions.headers['Content-Type'] = 'application/json';
    }

    const req = https.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          statusMessage: res.statusMessage,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function getWorkflowDetails(workflowId, name = '') {
  console.log(`\n🔍 获取${name}工作流详情 (ID: ${workflowId})...`);
  
  try {
    const response = await makeN8nAPIRequest(`/rest/workflows/${workflowId}`);
    
    if (response.status === 200) {
      const workflow = JSON.parse(response.data);
      console.log(`✅ 工作流名称: ${workflow.name}`);
      console.log(`📊 节点数量: ${workflow.nodes?.length || 0}`);
      console.log(`🔗 连接数量: ${workflow.connections ? Object.keys(workflow.connections).length : 0}`);
      console.log(`🟢 激活状态: ${workflow.active ? '已激活' : '未激活'}`);
      console.log(`📅 更新时间: ${workflow.updatedAt}`);
      
      // 分析节点类型
      if (workflow.nodes) {
        console.log('\n📋 节点分析:');
        workflow.nodes.forEach((node, index) => {
          console.log(`  ${index + 1}. ${node.name} (${node.type})`);
          
          // 特别关注Chat Trigger节点
          if (node.type === 'n8n-nodes-base.chatTrigger' || 
              node.name.toLowerCase().includes('chat') ||
              node.name.toLowerCase().includes('trigger')) {
            console.log(`     🎯 触发器配置:`);
            console.log(`     ${JSON.stringify(node.parameters, null, 6)}`);
          }
          
          // 关注子工作流调用节点
          if (node.type === 'n8n-nodes-base.executeWorkflow') {
            console.log(`     🔄 子工作流调用:`);
            console.log(`     ${JSON.stringify(node.parameters, null, 6)}`);
          }
          
          // 关注HTTP请求节点
          if (node.type === 'n8n-nodes-base.httpRequest') {
            console.log(`     🌐 HTTP请求配置:`);
            console.log(`     ${JSON.stringify(node.parameters, null, 6)}`);
          }
        });
      }
      
      // 分析连接关系
      if (workflow.connections) {
        console.log('\n🔗 连接关系:');
        Object.entries(workflow.connections).forEach(([sourceNode, connections]) => {
          Object.entries(connections).forEach(([outputIndex, targets]) => {
            targets.forEach(target => {
              console.log(`  ${sourceNode}[${outputIndex}] → ${target.node}[${target.index}]`);
            });
          });
        });
      }
      
      return workflow;
    } else {
      console.log(`❌ 获取失败: ${response.status} - ${response.statusMessage}`);
      console.log(`响应: ${response.data}`);
      return null;
    }
  } catch (error) {
    console.log(`💥 请求失败: ${error.message}`);
    return null;
  }
}

async function getWorkflowExecutions(workflowId, name = '') {
  console.log(`\n📋 获取${name}工作流执行记录...`);
  
  try {
    const response = await makeN8nAPIRequest(`/rest/executions?workflowId=${workflowId}&limit=10`);
    
    if (response.status === 200) {
      const executions = JSON.parse(response.data);
      console.log(`📊 最近执行记录数量: ${executions.data?.length || 0}`);
      
      if (executions.data && executions.data.length > 0) {
        console.log('\n🕐 最近的执行记录:');
        executions.data.slice(0, 5).forEach((execution, index) => {
          const status = execution.finished ? '✅ 成功' : execution.stoppedAt ? '❌ 失败' : '🔄 运行中';
          const startTime = new Date(execution.startedAt).toLocaleString();
          console.log(`  ${index + 1}. ${status} - ${startTime}`);
          
          if (execution.stoppedAt && !execution.finished) {
            console.log(`     ⚠️ 错误时间: ${new Date(execution.stoppedAt).toLocaleString()}`);
            if (execution.data) {
              console.log(`     🔍 执行数据存在，需要详细查看`);
            }
          }
        });
        
        // 获取最新失败执行的详细信息
        const failedExecution = executions.data.find(ex => ex.stoppedAt && !ex.finished);
        if (failedExecution) {
          await getExecutionDetails(failedExecution.id);
        }
      } else {
        console.log('📝 没有找到执行记录');
      }
      
      return executions;
    } else {
      console.log(`❌ 获取失败: ${response.status} - ${response.statusMessage}`);
      return null;
    }
  } catch (error) {
    console.log(`💥 请求失败: ${error.message}`);
    return null;
  }
}

async function getExecutionDetails(executionId) {
  console.log(`\n🔍 获取执行详情 (ID: ${executionId})...`);
  
  try {
    const response = await makeN8nAPIRequest(`/rest/executions/${executionId}`);
    
    if (response.status === 200) {
      const execution = JSON.parse(response.data);
      console.log(`📋 执行状态: ${execution.finished ? '完成' : '失败'}`);
      console.log(`⏰ 开始时间: ${new Date(execution.startedAt).toLocaleString()}`);
      if (execution.stoppedAt) {
        console.log(`🛑 结束时间: ${new Date(execution.stoppedAt).toLocaleString()}`);
      }
      
      if (execution.data && execution.data.resultData) {
        console.log('\n📊 执行结果分析:');
        
        if (execution.data.resultData.error) {
          console.log(`❌ 执行错误:`);
          console.log(`   消息: ${execution.data.resultData.error.message}`);
          console.log(`   类型: ${execution.data.resultData.error.name}`);
          if (execution.data.resultData.error.stack) {
            console.log(`   堆栈: ${execution.data.resultData.error.stack.substring(0, 500)}...`);
          }
        }
        
        if (execution.data.resultData.runData) {
          console.log('\n🔄 节点执行状态:');
          Object.entries(execution.data.resultData.runData).forEach(([nodeName, nodeData]) => {
            if (nodeData && nodeData.length > 0) {
              const lastRun = nodeData[nodeData.length - 1];
              if (lastRun.error) {
                console.log(`  ❌ ${nodeName}: ${lastRun.error.message}`);
                if (lastRun.error.description) {
                  console.log(`     详情: ${lastRun.error.description}`);
                }
              } else {
                console.log(`  ✅ ${nodeName}: 执行成功`);
                if (lastRun.data && lastRun.data.main && lastRun.data.main[0]) {
                  console.log(`     数据项数: ${lastRun.data.main[0].length}`);
                }
              }
            }
          });
        }
      }
      
      return execution;
    } else {
      console.log(`❌ 获取失败: ${response.status} - ${response.statusMessage}`);
      return null;
    }
  } catch (error) {
    console.log(`💥 请求失败: ${error.message}`);
    return null;
  }
}

async function getActiveWorkflows() {
  console.log('\n🟢 获取激活的工作流列表...');
  
  try {
    const response = await makeN8nAPIRequest('/rest/active');
    
    if (response.status === 200) {
      const activeWorkflows = JSON.parse(response.data);
      console.log(`📊 激活的工作流数量: ${activeWorkflows.length || 0}`);
      
      if (activeWorkflows.length > 0) {
        activeWorkflows.forEach((workflow, index) => {
          console.log(`  ${index + 1}. ${workflow.name} (ID: ${workflow.id})`);
          if (workflow.id === MAIN_WORKFLOW_ID) {
            console.log(`     🎯 这是主工作流！`);
          }
          if (workflow.id === SUB_WORKFLOW_ID) {
            console.log(`     🔄 这是子工作流！`);
          }
        });
      }
      
      return activeWorkflows;
    } else {
      console.log(`❌ 获取失败: ${response.status} - ${response.statusMessage}`);
      return null;
    }
  } catch (error) {
    console.log(`💥 请求失败: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('🚀 N8n工作流分析工具');
  console.log(`🔗 服务器: ${N8N_BASE_URL}`);
  console.log(`🔑 API密钥: ${API_KEY.substring(0, 20)}...`);
  console.log(`🎯 主工作流ID: ${MAIN_WORKFLOW_ID}`);
  console.log(`🔄 子工作流ID: ${SUB_WORKFLOW_ID}`);

  // 1. 检查激活的工作流
  await getActiveWorkflows();
  
  // 2. 获取主工作流详情
  const mainWorkflow = await getWorkflowDetails(MAIN_WORKFLOW_ID, '主');
  
  // 3. 获取子工作流详情
  const subWorkflow = await getWorkflowDetails(SUB_WORKFLOW_ID, '子');
  
  // 4. 获取主工作流执行记录
  await getWorkflowExecutions(MAIN_WORKFLOW_ID, '主');
  
  // 5. 获取子工作流执行记录
  await getWorkflowExecutions(SUB_WORKFLOW_ID, '子');
  
  console.log('\n📋 诊断总结:');
  console.log('✅ 如果工作流显示"已激活"但仍然返回500错误');
  console.log('✅ 查看上面的执行记录和错误详情');
  console.log('✅ 重点关注Chat Trigger节点和子工作流调用的配置');
  console.log('✅ 检查变量引用是否正确 (如 $json.chatInput)');
}

main().catch(console.error);