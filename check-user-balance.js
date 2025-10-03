// 检查用户余额的诊断脚本
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

async function checkUserBalance() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  console.log('📊 查询所有用户余额...\n');
  
  // 查询所有用户
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, balance, created_at')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('❌ 查询失败:', error);
    return;
  }
  
  if (!users || users.length === 0) {
    console.log('⚠️ 数据库中没有用户');
    return;
  }
  
  console.log(`✅ 找到 ${users.length} 个用户:\n`);
  
  users.forEach((user, index) => {
    console.log(`用户 ${index + 1}:`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  余额: ${user.balance} 积分`);
    console.log(`  创建时间: ${new Date(user.created_at).toLocaleString()}`);
    console.log('');
  });
  
  // 查询最近的token使用记录
  console.log('\n📈 最近的token使用记录:\n');
  
  const { data: tokenRecords, error: tokenError } = await supabase
    .from('token_usage')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (tokenError) {
    console.error('❌ 查询token记录失败:', tokenError);
  } else if (tokenRecords && tokenRecords.length > 0) {
    tokenRecords.forEach((record, index) => {
      console.log(`记录 ${index + 1}:`);
      console.log(`  用户ID: ${record.user_id}`);
      console.log(`  Token数: ${record.tokens_used}`);
      console.log(`  积分: ${record.points_used}`);
      console.log(`  时间: ${new Date(record.created_at).toLocaleString()}`);
      console.log('');
    });
  } else {
    console.log('⚠️ 没有token使用记录');
  }
}

checkUserBalance().catch(console.error);
