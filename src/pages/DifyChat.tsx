/**
 * Dify Chat Page
 * 
 * Main page for Dify native API chat interface with integrated token monitoring.
 * Now supports service-specific configurations for unified chat experience.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageSquare, 
  Zap, 
  Shield, 
  DollarSign,
  Users,
  TrendingUp,
  CheckCircle,
  Bot,
  ArrowLeft
} from 'lucide-react';
import { DifyChatInterface } from '@/components/chat/DifyChatInterface';
import { authService } from '@/lib/auth';
import { servicesAPI } from '@/lib/services';
import { User, Service } from '@/types';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export default function DifyChat() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUserAndService = async () => {
      try {
        // Load user
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);

        // Load service if serviceId is provided
        if (serviceId) {
          const serviceData = await servicesAPI.getService(serviceId);
          if (!serviceData) {
            toast.error(t('errors.not_found'));
            navigate('/services');
            return;
          }
          setService(serviceData);
        }
      } catch (error) {
        console.error('Failed to load user or service:', error);
        toast.error(t('errors.network_error'));
      } finally {
        setIsLoading(false);
      }
    };

    loadUserAndService();

    // 🔧 添加余额更新事件监听器，确保两个余额显示同步
    const handleBalanceUpdate = (event: CustomEvent) => {
      console.log('🔥 [DifyChat] Received balance-updated event:', {
        currentBalance: user?.balance,
        newBalance: event.detail.balance,
        eventDetail: event.detail,
        userId: user?.id,
        timestamp: new Date().toISOString()
      });
      
      // 只更新余额，不影响conversation_id状态
      if (event.detail.balance !== undefined && typeof event.detail.balance === 'number') {
        setUser(prev => prev ? { ...prev, balance: event.detail.balance } : null);
        console.log('✅ [DifyChat] Header balance updated:', event.detail.balance);
      }
    };

    window.addEventListener('balance-updated', handleBalanceUpdate as EventListener);

    return () => {
      window.removeEventListener('balance-updated', handleBalanceUpdate as EventListener);
    };

  }, [serviceId, navigate, user?.id]); // 添加user?.id依赖以确保事件处理器正确绑定

  // Check if Dify is configured
  // Support both chat apps (need APP_ID) and workflow apps (optional APP_ID)
  const isDifyConfigured = !!(
    import.meta.env.VITE_DIFY_API_URL &&
    import.meta.env.VITE_DIFY_API_KEY &&
    (import.meta.env.VITE_DIFY_APP_ID || true) // APP_ID optional for workflows
  );

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!isDifyConfigured) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {t('nav.chat')}
            </CardTitle>
            <CardDescription>
              {t('features.native_api_description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
Dify API not configured. Please contact administrator to set the following environment variables:
                <ul className="mt-2 list-disc list-inside text-sm">
                  <li>VITE_DIFY_API_URL</li>
                  <li>VITE_DIFY_API_KEY</li>
                  <li>VITE_DIFY_APP_ID (仅聊天应用需要，工作流应用可选)</li>
                </ul>
                <div className="mt-2 text-xs text-gray-500">
                  💡 Current system supports workflow mode, no APP_ID required
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Back to services button if we have a serviceId */}
          {service && (
            <div className="mb-6">
              <Button 
                variant="outline" 
                onClick={() => navigate('/services')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                {t('common.back')}
              </Button>
            </div>
          )}

          {/* Hero Section */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                {service ? (
                  <Bot className="h-8 w-8 text-blue-600" />
                ) : (
                  <MessageSquare className="h-8 w-8 text-blue-600" />
                )}
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {service ? service.name : t('nav.chat')}
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {service 
                ? service.description 
                : t('features.native_api_description')
              }
            </p>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6 text-center">
                <Zap className="h-10 w-10 text-yellow-500 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">{t('features.native_api_integration')}</h3>
                <p className="text-sm text-gray-600">
                  {t('features.native_api_description')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <Shield className="h-10 w-10 text-green-500 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">{t('features.accurate_billing')}</h3>
                <p className="text-sm text-gray-600">
                  {t('features.accurate_billing_description')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-10 w-10 text-blue-500 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">{t('features.streaming_response')}</h3>
                <p className="text-sm text-gray-600">
                  {t('features.streaming_response_description')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Login Required */}
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-4">{t('pages.please_login_first')}</h3>
              <p className="text-gray-600 mb-6">
                {service 
                  ? `${t('pages.login_required_description')} ${service.name}`
                  : t('pages.login_required_description')
                }
              </p>
              <div className="flex gap-4 justify-center">
                <Button 
                  onClick={() => window.location.href = '/login'}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {t('pages.login_now')}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = '/register'}
                >
                  {t('pages.create_account')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Benefits */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-center mb-8">{t('features.why_native_api')}</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">{t('features.solve_cors_restrictions')}</h4>
                  <p className="text-sm text-gray-600">
                    {t('features.solve_cors_description')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">{t('features.hundred_percent_billing')}</h4>
                  <p className="text-sm text-gray-600">
                    {t('features.hundred_percent_description')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">{t('features.better_user_experience')}</h4>
                  <p className="text-sm text-gray-600">
                    {t('features.better_ux_description')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">{t('features.real_time_balance_monitoring')}</h4>
                  <p className="text-sm text-gray-600">
                    {t('features.balance_monitoring_description')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Back to services button if we have a service */}
        {service && (
          <div className="mb-6">
            <Button 
              variant="outline" 
              onClick={() => navigate('/services')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              返回服务列表
            </Button>
          </div>
        )}

        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                {service ? (
                  <>
                    <Bot className="h-6 w-6 text-blue-600" />
                    {service.name}
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-6 w-6 text-blue-600" />
                    {t('nav.chat')}
                  </>
                )}
                <Badge variant="secondary" className="ml-2">
                  <Zap className="h-3 w-3 mr-1" />
                  {t('features.native_api_integration')}
                </Badge>
              </h1>
              <p className="text-gray-600 mt-1">
                Welcome {user.name}, {t('billing.remaining_balance', { balance: user.balance.toLocaleString() })}
                {service && (
                  <span className="ml-2 text-sm">
                    • {service.description}
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <Badge variant="outline" className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {t('billing.real_time_billing')}
              </Badge>
              {user.balance < 1000 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.href = '/pricing'}
                  className="text-orange-600 border-orange-200 hover:bg-orange-50"
                >
                  {t('billing.insufficient_balance')}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Main Chat Interface */}
        <div className="h-[calc(100vh-200px)] min-h-[600px]">
          <DifyChatInterface 
            className="h-full"
            showMetadata={false}
            enableStreaming={true}
            autoStartConversation={true}
            mode="workflow" // Enable workflow mode by default
            showWorkflowProgress={true}
            enableRetry={true}
            user={user} // 🔥 传递认证用户信息
            placeholder={service 
              ? `${t('chat.input_question')} ${service.name}...` 
              : t('chat.placeholder')
            }
            welcomeMessage={service 
              ? `您好！我是${service.name}。${service.description}有什么可以帮助您的吗？`
              : `Hi! I am your marketing content AI assistant. To create effective copywriting for you, I need to collect 4 key pieces of information:

1. **Your Product**: What product or service are you promoting?
2. **Product Features**: What are the key features or advantages of your product?
3. **Target Audience**: Who is your target customer group?
4. **Content Length**: How many words do you need for the copy?

Please share these details to start creating your marketing content!`
            }
          />
        </div>
      </div>
    </div>
  );
}