import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle, Zap, Shield, Clock, Star, Users, Award } from 'lucide-react';
import { authService } from '@/lib/auth';
import { User } from '@/types';
import { useTranslation } from 'react-i18next';

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // 使用同步方法获取当前用户，避免重复的异步调用
        const currentUser = authService.getCurrentUserSync();
        setUser(currentUser);
      } catch (error) {
        console.error('Failed to get current user:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    // 监听认证状态变化
    const handleAuthChange = (event: CustomEvent) => {
      setUser(event.detail.user);
    };

    window.addEventListener('auth-state-changed', handleAuthChange as EventListener);
    
    initializeAuth();

    return () => {
      window.removeEventListener('auth-state-changed', handleAuthChange as EventListener);
    };
  }, []);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('home.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            {t('home.platform_title')}
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            {t('home.platform_subtitle')}
          </p>
          
          {/* 动态按钮区域 */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            {user ? (
              <>
                <Button 
                  size="lg" 
                  onClick={() => navigate('/services')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
                >
                  {t('home.browse_services')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                  className="px-8 py-3"
                >
                  {t('home.my_dashboard')}
                </Button>
              </>
            ) : (
              <>
                <Button 
                  size="lg" 
                  onClick={() => navigate('/register')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
                >
                  {t('home.register_now')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => navigate('/login')}
                  className="px-8 py-3"
                >
                  {t('home.user_login')}
                </Button>
              </>
            )}
          </div>
          
          {/* 用户状态显示 */}
          {user && (
            <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto mb-8">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <p className="text-gray-700 font-medium">{t('home.welcome_back', { name: user.name })}</p>
              </div>
              <p className="text-sm text-gray-500">{t('home.current_balance', { balance: user.balance?.toFixed(2) || '0.00' })}</p>
              {user.role === 'admin' && (
                <div className="mt-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    <Award className="h-3 w-3 mr-1" />
                    {t('home.admin_role')}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-16">
          <div className="text-center p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <Zap className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">{t('home.efficient_intelligent')}</h3>
            <p className="text-gray-600">{t('home.efficient_description')}</p>
          </div>
          
          <div className="text-center p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">{t('home.secure_reliable')}</h3>
            <p className="text-gray-600">{t('home.secure_description')}</p>
          </div>
          
          <div className="text-center p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <Clock className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">{t('home.service_247')}</h3>
            <p className="text-gray-600">{t('home.service_247_description')}</p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('home.platform_data')}</h2>
            <p className="text-gray-600">{t('home.platform_data_subtitle')}</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-blue-600 mr-2" />
                <span className="text-3xl font-bold text-gray-900">10,000+</span>
              </div>
              <p className="text-gray-600">{t('home.active_users')}</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <Star className="h-8 w-8 text-blue-600 mr-2" />
                <span className="text-3xl font-bold text-gray-900">4.8</span>
              </div>
              <p className="text-gray-600">{t('home.user_rating')}</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-blue-600 mr-2" />
                <span className="text-3xl font-bold text-gray-900">99.9%</span>
              </div>
              <p className="text-gray-600">{t('home.service_availability')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            {t('home.ready_to_start')}
          </h2>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            {t('home.ready_subtitle')}
          </p>
          
          {!user && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg"
                onClick={() => navigate('/register')}
                className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3"
              >
                {t('home.free_register')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => navigate('/pricing')}
                className="border-white text-white hover:bg-white hover:text-blue-600 px-8 py-3"
              >
                {t('home.view_pricing')}
              </Button>
            </div>
          )}
          
          {user && (
            <Button 
              size="lg"
              onClick={() => navigate('/services')}
              className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3"
            >
              {t('home.start_using_services')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
