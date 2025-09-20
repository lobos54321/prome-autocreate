#!/usr/bin/env node

/**
 * 获取N8n工作流的详细执行日志
 */

import https from 'https';

const N8N_BASE_URL = 'https://n8n-worker-k4m9.zeabur.app';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4ZjA0NDU1OS0wOTJjLTRjYmQtOTU0Mi05YjdjNTNjMTk3NmEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU4MDg2Mzk2fQ.v0msK0j2eoWmLf6Wqu2hKuE05XGD431cfHskGljR9UI';
const MAIN_WORKFLOW_ID = 'DdWZ4pp46LPTTEdl';

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
        'User-Agent': 'N8n-Execution-Analyzer/1.0'
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

async function getDetailedExecutions() {
  console.log('🔍 获取主工作流最近的执行详情...\n');
  
  try {
    // 获取最近的执行记录
    const response = await makeAPIRequest(`/api/v1/executions?workflowId=${MAIN_WORKFLOW_ID}&limit=10`);
    const executions = response.data.data || [];
    
    console.log(`📊 找到 ${executions.length} 条执行记录\n`);
    
    if (executions.length === 0) {
      console.log('❌ 没有找到执行记录');
      return;
    }
    
    // 分析最近的5条执行记录
    for (let i = 0; i < Math.min(5, executions.length); i++) {
      const execution = executions[i];
      console.log(`\n📋 执行记录 ${i + 1}:`);
      console.log(`   ID: ${execution.id}`);
      console.log(`   状态: ${execution.status}`);
      console.log(`   开始时间: ${new Date(execution.startedAt).toLocaleString()}`);
      
      if (execution.stoppedAt) {
        console.log(`   结束时间: ${new Date(execution.stoppedAt).toLocaleString()}`);
      }
      
      // 获取详细执行信息
      await getExecutionDetails(execution.id, i + 1);
    }
    
  } catch (error) {
    console.log(`❌ 获取执行记录失败: ${error.message}`);
  }
}

async function getExecutionDetails(executionId, index) {
  try {
    const response = await makeAPIRequest(`/api/v1/executions/${executionId}`);
    const execution = response.data;
    
    console.log(`\n🔍 执行详情 ${index}:`);
    
    if (execution.data && execution.data.resultData) {
      
      // 检查主要错误
      if (execution.data.resultData.error) {
        console.log(`\n❌ 主要错误:`);
        console.log(`   消息: ${execution.data.resultData.error.message}`);
        console.log(`   类型: ${execution.data.resultData.error.name}`);
        
        if (execution.data.resultData.error.stack) {
          console.log(`   堆栈信息:`);
          console.log(`   ${execution.data.resultData.error.stack}`);
        }
      }
      
      // 分析各节点的执行状态
      if (execution.data.resultData.runData) {
        console.log(`\n🔄 节点执行分析:`);
        
        Object.entries(execution.data.resultData.runData).forEach(([nodeName, nodeExecutions]) => {
          if (nodeExecutions && nodeExecutions.length > 0) {
            const lastExecution = nodeExecutions[nodeExecutions.length - 1];
            
            console.log(`\n   📍 节点: ${nodeName}`);
            
            if (lastExecution.error) {
              console.log(`      ❌ 错误: ${lastExecution.error.message}`);
              
              if (lastExecution.error.description) {
                console.log(`      📝 描述: ${lastExecution.error.description}`);
              }
              
              if (lastExecution.error.httpCode) {
                console.log(`      🌐 HTTP状态码: ${lastExecution.error.httpCode}`);
              }
              
              if (lastExecution.error.cause) {
                console.log(`      🔍 原因: ${JSON.stringify(lastExecution.error.cause, null, 6)}`);
              }
              
              if (lastExecution.error.stack) {
                console.log(`      📚 错误堆栈:`);
                console.log(`      ${lastExecution.error.stack}`);
              }
              
            } else if (lastExecution.data) {
              console.log(`      ✅ 成功执行`);
              
              if (lastExecution.data.main && lastExecution.data.main[0]) {
                console.log(`      📊 输出数据项: ${lastExecution.data.main[0].length}`);
                
                // 显示输出数据的前几个字段
                if (lastExecution.data.main[0][0] && lastExecution.data.main[0][0].json) {
                  const output = lastExecution.data.main[0][0].json;
                  console.log(`      📄 输出数据 (前500字符):`);
                  console.log(`      ${JSON.stringify(output, null, 6).substring(0, 500)}...`);
                }
              }
            } else {
              console.log(`      ⚠️ 状态不明确`);
            }
            
            // 显示执行时间
            if (lastExecution.startTime && lastExecution.endTime) {
              const duration = new Date(lastExecution.endTime) - new Date(lastExecution.startTime);
              console.log(`      ⏱️ 执行时长: ${duration}ms`);
            }
          }
        });
      }
      
      // 检查输入数据
      if (execution.data.executionData) {
        console.log(`\n📥 输入数据分析:`);
        
        if (execution.data.executionData.contextData) {
          console.log(`   上下文数据: ${JSON.stringify(execution.data.executionData.contextData, null, 4)}`);
        }
        
        if (execution.data.executionData.nodeExecutionStack) {
          console.log(`   节点执行栈: ${execution.data.executionData.nodeExecutionStack.length} 项`);
        }
        
        if (execution.data.executionData.metadata) {
          console.log(`   元数据: ${JSON.stringify(execution.data.executionData.metadata, null, 4)}`);
        }
      }
    }
    
  } catch (error) {
    console.log(`❌ 获取执行详情失败: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 N8n执行日志详细分析');
  console.log(`🎯 主工作流ID: ${MAIN_WORKFLOW_ID}\n`);
  
  await getDetailedExecutions();
  
  console.log('\n📋 问题排查指南:');
  console.log('1. 查看上面的错误消息和堆栈信息');
  console.log('2. 重点关注第一个失败的节点');
  console.log('3. 检查输入数据格式是否正确');
  console.log('4. 验证变量引用路径 (如 $json.chatInput)');
  console.log('5. 确认外部API调用的认证和配置');
}

main().catch(console.error);