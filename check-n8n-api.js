#!/usr/bin/env node

/**
 * 尝试通过N8n REST API查看工作流状态
 */

import https from 'https';

const N8N_BASE_URL = 'https://n8n-worker-k4m9.zeabur.app';
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

async function checkN8nAPI() {
  console.log('🔍 尝试通过N8n REST API获取工作流信息...\n');

  // 常见的N8n API端点
  const apiEndpoints = [
    '/rest/workflows',
    '/rest/workflows/active', 
    `/rest/workflows/${MAIN_WORKFLOW_ID}`,
    `/rest/workflows/${SUB_WORKFLOW_ID}`,
    '/rest/executions',
    `/rest/executions?workflowId=${MAIN_WORKFLOW_ID}&limit=5`,
    '/api/v1/workflows',
    `/api/v1/workflows/${MAIN_WORKFLOW_ID}`,
    '/api/v1/executions',
    '/rest/active-workflows'
  ];

  for (const endpoint of apiEndpoints) {
    try {
      console.log(`📡 测试: ${endpoint}`);
      const response = await makeN8nAPIRequest(endpoint);
      
      console.log(`   状态: ${response.status} ${response.statusMessage}`);
      
      if (response.status === 200) {
        try {
          const jsonData = JSON.parse(response.data);
          console.log(`   ✅ 成功获取数据:`);
          console.log(`   ${JSON.stringify(jsonData, null, 2).substring(0, 500)}...`);
        } catch (e) {
          console.log(`   📄 非JSON响应: ${response.data.substring(0, 200)}...`);
        }
      } else if (response.status === 401) {
        console.log(`   🔒 需要API密钥认证`);
      } else if (response.status === 403) {
        console.log(`   🚫 访问被拒绝`);
      } else if (response.status === 404) {
        console.log(`   ❌ 端点不存在`);
      }
      
      console.log('');
    } catch (error) {
      console.log(`   💥 请求失败: ${error.message}\n`);
    }
  }
}

async function checkPublicWorkflowInfo() {
  console.log('🔍 尝试获取工作流的公开信息...\n');
  
  // 尝试直接访问工作流JSON导出
  const exportEndpoints = [
    `/workflow/${MAIN_WORKFLOW_ID}/export`,
    `/rest/workflows/${MAIN_WORKFLOW_ID}/export`,
    `/api/workflows/${MAIN_WORKFLOW_ID}/export`,
    `/workflows/${MAIN_WORKFLOW_ID}.json`,
    `/rest/workflows/${MAIN_WORKFLOW_ID}.json`
  ];

  for (const endpoint of exportEndpoints) {
    try {
      console.log(`📡 尝试导出: ${endpoint}`);
      const response = await makeN8nAPIRequest(endpoint);
      
      if (response.status === 200) {
        try {
          const workflowData = JSON.parse(response.data);
          console.log(`   ✅ 成功获取工作流配置!`);
          console.log(`   工作流名称: ${workflowData.name || '未知'}`);
          console.log(`   节点数量: ${workflowData.nodes?.length || 0}`);
          console.log(`   连接数量: ${workflowData.connections ? Object.keys(workflowData.connections).length : 0}`);
          
          // 查找Chat Trigger节点
          const chatTrigger = workflowData.nodes?.find(node => 
            node.type === 'n8n-nodes-base.chatTrigger' || 
            node.type === 'n8n-nodes-base.webhook' ||
            node.name?.toLowerCase().includes('chat') ||
            node.name?.toLowerCase().includes('trigger')
          );
          
          if (chatTrigger) {
            console.log(`   🎯 找到触发器节点: ${chatTrigger.name} (${chatTrigger.type})`);
            console.log(`   触发器参数:`, JSON.stringify(chatTrigger.parameters, null, 2));
          }
          
          return workflowData;
        } catch (e) {
          console.log(`   📄 非JSON响应`);
        }
      } else {
        console.log(`   ❌ ${response.status} - ${response.statusMessage}`);
      }
      
      console.log('');
    } catch (error) {
      console.log(`   💥 失败: ${error.message}\n`);
    }
  }
}

async function main() {
  console.log('🚀 N8n API探索工具');
  console.log(`服务器: ${N8N_BASE_URL}`);
  console.log(`主工作流: ${MAIN_WORKFLOW_ID}`);
  console.log(`子工作流: ${SUB_WORKFLOW_ID}\n`);

  await checkN8nAPI();
  await checkPublicWorkflowInfo();
  
  console.log('📋 如果所有API都需要认证，请提供:');
  console.log('1. N8n API密钥');
  console.log('2. 或者在N8n界面中检查工作流执行日志');
  console.log('3. 确认工作流的公开访问设置');
}

main().catch(console.error);