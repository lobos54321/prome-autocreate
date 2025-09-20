#!/usr/bin/env node

/**
 * 尝试获取N8n工作流的详细信息
 * 包括执行历史和错误日志
 */

import https from 'https';
import http from 'http';

const BASE_URL = 'https://n8n-worker-k4m9.zeabur.app';
const MAIN_WORKFLOW_ID = 'DdWZ4pp46LPTTEdl';
const SUB_WORKFLOW_ID = 'iEJ60phVs8VWagWD';
const WEBHOOK_URL = 'https://n8n-worker-k4m9.zeabur.app/webhook/9d5986f5-fcba-42bf-b3d7-5fd94660943a/chat';

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'N8n-Debug-Tool/1.0',
        'Accept': 'application/json, text/html, */*',
        ...options.headers
      }
    };

    if (options.body) {
      requestOptions.headers['Content-Type'] = 'application/json';
      requestOptions.headers['Content-Length'] = Buffer.byteLength(options.body);
    }

    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const req = protocol.request(requestOptions, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          statusMessage: res.statusMessage,
          headers: res.headers,
          data: responseData
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function checkN8nAPIEndpoints() {
  console.log('🔍 尝试检查N8n API端点...\n');

  const endpoints = [
    '/api/v1/workflows',
    '/api/workflows',
    '/rest/workflows',
    `/api/v1/workflows/${MAIN_WORKFLOW_ID}`,
    `/api/workflows/${MAIN_WORKFLOW_ID}`,
    `/rest/workflows/${MAIN_WORKFLOW_ID}`,
    '/api/v1/executions',
    '/api/executions',
    '/rest/executions',
    '/api/v1/active',
    '/api/active',
    '/rest/active'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`📡 测试端点: ${endpoint}`);
      const response = await makeRequest(`${BASE_URL}${endpoint}`);
      
      console.log(`   状态: ${response.status} ${response.statusMessage}`);
      
      if (response.status === 200) {
        console.log(`   ✅ 成功! 数据长度: ${response.data.length}`);
        
        // 尝试解析JSON
        try {
          const jsonData = JSON.parse(response.data);
          console.log(`   📊 JSON数据预览:`, JSON.stringify(jsonData, null, 2).substring(0, 500));
        } catch (e) {
          console.log(`   📄 HTML/文本数据预览:`, response.data.substring(0, 200));
        }
      } else if (response.status === 401) {
        console.log(`   🔒 需要认证`);
      } else if (response.status === 404) {
        console.log(`   ❌ 端点不存在`);
      } else {
        console.log(`   ⚠️  其他状态码`);
      }
      
      console.log('');
    } catch (error) {
      console.log(`   💥 请求失败: ${error.message}\n`);
    }
  }
}

async function testWebhookWithDebugInfo() {
  console.log('🧪 发送调试请求到webhook...\n');
  
  const debugPayload = {
    action: "sendMessage",
    sessionId: `debug_${Date.now()}`,
    chatInput: "DEBUG: 请返回工作流状态和配置信息"
  };

  try {
    const response = await makeRequest(WEBHOOK_URL, {
      method: 'POST',
      body: JSON.stringify(debugPayload),
      headers: {
        'X-Debug-Request': 'true',
        'X-Instance-Id': '84d6fd9ee10b61931a6c88e38784cd77e15da6e05b6b01cbb7ff8ef09e5710a4'
      }
    });

    console.log(`📤 发送的数据:`, JSON.stringify(debugPayload, null, 2));
    console.log(`📥 响应状态: ${response.status} ${response.statusMessage}`);
    console.log(`📥 响应头:`, JSON.stringify(response.headers, null, 2));
    console.log(`📥 响应数据:`, response.data);
    
    // 尝试从响应中提取错误信息
    if (response.status === 500) {
      console.log('\n🔍 分析500错误...');
      console.log('这表明N8n工作流内部出现了错误，常见原因：');
      console.log('1. 工作流节点配置错误');
      console.log('2. 变量引用错误 (如 $json.chatInput 路径不正确)');
      console.log('3. 外部API调用失败');
      console.log('4. 权限或认证问题');
      console.log('5. 数据格式不匹配');
    }
    
  } catch (error) {
    console.log(`💥 Webhook测试失败: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 开始N8n工作流调试...');
  console.log(`主工作流ID: ${MAIN_WORKFLOW_ID}`);
  console.log(`子工作流ID: ${SUB_WORKFLOW_ID}`);
  console.log(`Webhook URL: ${WEBHOOK_URL}\n`);

  await checkN8nAPIEndpoints();
  await testWebhookWithDebugInfo();
  
  console.log('📋 建议的下一步操作:');
  console.log('1. 登录N8n界面查看工作流执行日志');
  console.log('2. 检查主工作流中Chat Trigger节点的配置');
  console.log('3. 验证子工作流的输入输出参数');
  console.log('4. 确认所有节点的连接线正确');
  console.log('5. 检查变量表达式语法 (如 $json.chatInput)');
}

main().catch(console.error);