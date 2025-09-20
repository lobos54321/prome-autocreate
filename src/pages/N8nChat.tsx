import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageSquare, 
  Zap, 
  Settings, 
  AlertCircle, 
  ArrowLeft,
  Workflow,
  Bot,
  Users,
  Activity
} from 'lucide-react';
import { authService } from '@/lib/auth';
import { User } from '@/types';
import { useTranslation } from 'react-i18next';
import N8nFormSimple from '@/components/chat/N8nFormSimple';
// import SimpleFormTest from '@/components/debug/SimpleFormTest';

export default function N8nChat() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get N8n configuration from environment variables
  const n8nWebhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://n8n-worker-k4m9.zeabur.app/webhook/9d5986f5-fcba-42bf-b3d7-5fd94660943a/chat';
  const n8nEnabled = import.meta.env.VITE_ENABLE_N8N_INTEGRATION === 'true' || true; // 强制启用用于调试

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const currentUser = authService.getCurrentUserSync();
        setUser(currentUser);
        
        // 暂时跳过身份验证用于调试
        // if (!currentUser) {
        //   navigate('/login');
        //   return;
        // }
      } catch (error) {
        console.error('Failed to get current user:', error);
        // navigate('/login'); // 暂时注释用于调试
      } finally {
        setIsLoading(false);
      }
    };

    const handleAuthChange = (event: CustomEvent) => {
      setUser(event.detail.user);
    };

    window.addEventListener('auth-state-changed', handleAuthChange as EventListener);
    
    initializeAuth();

    return () => {
      window.removeEventListener('auth-state-changed', handleAuthChange as EventListener);
    };
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // Check if N8n integration is enabled
  if (!n8nEnabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <div className="flex items-center mb-4">
                  <Button 
                    variant="ghost" 
                    onClick={() => navigate('/')}
                    className="mr-4"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t('common.back')}
                  </Button>
                  <div className="flex items-center">
                    <Workflow className="h-8 w-8 text-blue-600 mr-3" />
                    <div>
                      <CardTitle>{t('n8n.integration_disabled')}</CardTitle>
                      <CardDescription>{t('n8n.integration_disabled_desc')}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {t('n8n.enable_instruction')}
                  </AlertDescription>
                </Alert>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">{t('n8n.required_env_vars')}</h4>
                  <code className="text-sm bg-white p-2 rounded block">
                    VITE_ENABLE_N8N_INTEGRATION=true<br/>
                    VITE_N8N_WEBHOOK_URL=your_n8n_webhook_url
                  </code>
                </div>

                <div className="flex space-x-4">
                  <Button onClick={() => navigate('/dashboard')}>
                    {t('n8n.back_to_dashboard')}
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/settings')}>
                    <Settings className="h-4 w-4 mr-2" />
                    {t('n8n.manage_settings')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.back')}
            </Button>
            <div className="flex items-center">
              <Workflow className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">ProMe-UGC Real-Person Feedback Video Agent</h1>
                <p className="text-gray-600">Let your product speak through real voices.</p>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button 
              variant="outline"
              onClick={() => navigate('/n8n-diagnostic')}
              className="flex items-center"
            >
              <Activity className="h-4 w-4 mr-2" />
              诊断连接
            </Button>
          </div>
        </div>

        {/* User Info */}
        {user && (
          <div className="mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="font-medium">{t('n8n.welcome_user', { name: user.name })}</span>
                  </div>
                  <Badge variant="secondary">
                    {t('n8n.user_id')}: {user.id?.slice(0, 8)}...
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Video Creation Form Only - 使用简化HTTP调用 + metadata传递 */}
        <div className="space-y-6">
          <N8nFormSimple
            webhookUrl={n8nWebhookUrl}
            className=""
          />
        </div>

        {/* Features */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-center mb-8">Why Choose ProMe-UGC?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Authentic Voices</h3>
                <p className="text-gray-600 text-sm">Generate realistic testimonials from diverse real people to build trust</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <Zap className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Quick Creation</h3>
                <p className="text-gray-600 text-sm">Create professional feedback videos in minutes, not hours</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <Bot className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">AI-Powered</h3>
                <p className="text-gray-600 text-sm">Advanced AI creates natural-sounding feedback tailored to your product</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}