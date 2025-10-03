// 用户ID验证工具

/**
 * 验证是否是有效的UUID格式
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * 检查localStorage中的用户数据，如果ID无效则清除
 * 在应用启动时调用
 */
export function validateAndCleanUserCache(): boolean {
  try {
    const currentUser = localStorage.getItem('currentUser');
    
    if (!currentUser) {
      console.log('No cached user found');
      return true; // 没有缓存用户，正常
    }
    
    const user = JSON.parse(currentUser);
    
    if (!user.id || typeof user.id !== 'string') {
      console.warn('Invalid user data structure, clearing cache');
      localStorage.clear();
      return false;
    }
    
    if (!isValidUUID(user.id)) {
      console.error('❌ Invalid user ID format detected:', user.id);
      console.log('Clearing all cache to fix the issue...');
      
      // 清除所有缓存
      localStorage.clear();
      sessionStorage.clear();
      
      // 清除所有cookies
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      
      return false; // 需要重新登录
    }
    
    console.log('✅ User cache validated:', user.email, 'UUID:', user.id);
    return true; // 缓存有效
  } catch (error) {
    console.error('Error validating user cache:', error);
    localStorage.clear();
    return false;
  }
}

/**
 * 如果发现无效用户ID，重定向到登录页
 */
export function validateUserOrRedirect(): void {
  const isValid = validateAndCleanUserCache();
  
  if (!isValid) {
    console.log('🔄 Invalid user cache detected, redirecting to login...');
    
    // 延迟跳转，让用户看到控制台信息
    setTimeout(() => {
      window.location.href = '/login';
    }, 1500);
  }
}
