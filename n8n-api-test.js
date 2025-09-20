#!/usr/bin/env node

/**
 * 测试不同的N8n API认证方式和端点
 */

import https from 'https';

const N8N_BASE_URL = 'https://n8n-worker-k4m9.zeabur.app';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4ZjA0NDU1OS0wOTJjLTRjYmQtOTU0Mi05YjdjNTNjMTk3NmEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU4MDg2Mzk2fQ.v0msK0j2eoWmLf6Wqu2hKuE05XGD431cfHskGljR9UI';

async function testAPIEndpoints() {
  console.log('🔍 测试不同的N8n API端点和认证方式...\n');

  const authMethods = [
    { name: 'Bearer Token', headers: { 'Authorization': `Bearer ${API_KEY}` } },
    { name: 'X-N8N-API-KEY', headers: { 'X-N8N-API-KEY': API_KEY } },
    { name: 'Both Methods', headers: { 'Authorization': `Bearer ${API_KEY}`, 'X-N8N-API-KEY': API_KEY } },
    { name: 'Cookie Auth', headers: { 'Cookie': `n8n-auth=${API_KEY}` } }
  ];

  const endpoints = [
    '/api/v1/workflows',
    '/rest/workflows', 
    '/api/workflows',
    '/webhooks/rest/workflows',
    '/api/v1/active',
    '/rest/active',
    '/api/active',
    '/api/v1/executions',
    '/rest/executions',
    '/api/executions',
    '/health',
    '/metrics',
    '/api/v1/credentials',
    '/rest/credentials'
  ];

  for (const authMethod of authMethods) {
    console.log(`\n🔑 测试认证方式: ${authMethod.name}`);
    console.log(`   Headers: ${JSON.stringify(authMethod.headers)}`);
    
    for (const endpoint of endpoints) {
      try {
        const response = await makeRequest(endpoint, authMethod.headers);
        console.log(`   📡 ${endpoint}: ${response.status} ${response.statusMessage}`);
        
        if (response.status === 200) {
          try {
            const data = JSON.parse(response.data);
            console.log(`      ✅ 成功! 数据类型: ${Array.isArray(data) ? 'Array' : typeof data}, 长度: ${response.data.length}`);
          } catch (e) {
            console.log(`      ✅ 成功! 响应长度: ${response.data.length}`);
          }
        } else if (response.status === 401) {
          console.log(`      🔒 需要认证`);
        } else if (response.status === 404) {
          console.log(`      ❌ 端点不存在`);
        } else if (response.status === 403) {
          console.log(`      🚫 访问被拒绝`);
        }
      } catch (error) {
        console.log(`   💥 ${endpoint}: 请求失败 - ${error.message}`);
      }
    }
  }
}

async function makeRequest(endpoint, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${N8N_BASE_URL}${endpoint}`);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'N8n-API-Test/1.0',
        ...headers
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
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function testWebhookWithAPIKey() {
  console.log('\n🧪 测试webhook端点（带API密钥）...');
  
  const webhookUrl = 'https://n8n-worker-k4m9.zeabur.app/webhook/9d5986f5-fcba-42bf-b3d7-5fd94660943a/chat';
  
  const testPayload = {
    action: "sendMessage",
    sessionId: `api_test_${Date.now()}`,
    chatInput: "API测试消息"
  };

  try {
    const response = await makeRequestWithBody(webhookUrl, testPayload, {
      'X-N8N-API-KEY': API_KEY,
      'Authorization': `Bearer ${API_KEY}`
    });
    
    console.log(`📤 发送数据: ${JSON.stringify(testPayload)}`);
    console.log(`📥 响应状态: ${response.status} ${response.statusMessage}`);
    console.log(`📥 响应数据: ${response.data}`);
    
  } catch (error) {
    console.log(`💥 Webhook测试失败: ${error.message}`);
  }
}

async function makeRequestWithBody(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(body);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'N8n-API-Test/1.0',
        ...headers
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
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function decodeJWT() {
  console.log('\n🔍 解析JWT token...');
  
  try {
    const parts = API_KEY.split('.');
    if (parts.length !== 3) {
      console.log('❌ 不是有效的JWT格式');
      return;
    }
    
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    console.log('📋 JWT Header:', JSON.stringify(header, null, 2));
    console.log('📋 JWT Payload:', JSON.stringify(payload, null, 2));
    
    // 检查是否过期
    if (payload.exp) {
      const expDate = new Date(payload.exp * 1000);
      const now = new Date();
      console.log(`⏰ Token过期时间: ${expDate.toISOString()}`);
      console.log(`⏰ 当前时间: ${now.toISOString()}`);
      console.log(`✅ Token状态: ${expDate > now ? '有效' : '已过期'}`);
    } else if (payload.iat) {
      const issuedDate = new Date(payload.iat * 1000);
      console.log(`📅 Token签发时间: ${issuedDate.toISOString()}`);
    }
    
  } catch (error) {
    console.log(`❌ JWT解析失败: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 N8n API认证测试工具');
  console.log(`🔗 服务器: ${N8N_BASE_URL}`);
  
  await decodeJWT();
  await testAPIEndpoints();
  await testWebhookWithAPIKey();
  
  console.log('\n📋 测试总结:');
  console.log('如果所有API端点都返回401，可能是:');
  console.log('1. API密钥无效或已过期');
  console.log('2. 该N8n实例不支持API访问');
  console.log('3. 需要不同的认证方式');
  console.log('4. API端点路径不正确');
}

main().catch(console.error);