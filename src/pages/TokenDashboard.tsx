import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart2, InfoIcon, Activity, Wallet, TrendingUp, Clock, Loader2 } from 'lucide-react';
import { authService } from '@/lib/auth';
import { isDifyEnabled } from '@/lib/dify-api-client';
import { db } from '@/lib/supabase';
import { User, TokenUsage, BillingRecord } from '@/types';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export default function TokenDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage[]>([]);
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);

  useEffect(() => {
    const initUser = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
        
        if (!currentUser) {
          navigate('/login');
          return;
        }

        if (isDifyEnabled()) {
          await loadUserData(currentUser.id);
          // Token monitoring is now handled automatically through API integration
        }
      } catch (error) {
        console.error('Failed to get current user:', error);
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };

    initUser();

    return () => {
      // Cleanup if needed
    };
  }, [navigate]);

  const loadUserData = async (userId: string) => {
    try {
      setIsDataLoading(true);
      const [usage, billing] = await Promise.all([
        db.getTokenUsage(userId),
        db.getBillingRecords(userId)
      ]);
      
      setTokenUsage(usage);
      setBillingRecords(billing);
    } catch (error) {
      console.error('Failed to load user data:', error);
      toast.error(t('token_dashboard.data_loading_failed'));
    } finally {
      setIsDataLoading(false);
    }
  };

  // Token monitoring is now handled automatically through the API integration
  // No need for separate iframe monitoring setup

  const calculateStats = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const monthlyUsage = tokenUsage.filter(usage => 
      usage.timestamp && new Date(usage.timestamp) >= startOfMonth
    );
    
    const dailyUsage = tokenUsage.filter(usage => 
      usage.timestamp && new Date(usage.timestamp) >= startOfDay
    );

    const totalTokens = tokenUsage.reduce((sum, usage) => sum + (usage.tokensUsed || 0), 0);
    const monthlyTokens = monthlyUsage.reduce((sum, usage) => sum + (usage.tokensUsed || 0), 0);
    const dailyTokens = dailyUsage.reduce((sum, usage) => sum + (usage.tokensUsed || 0), 0);
    
    const totalCost = tokenUsage.reduce((sum, usage) => sum + (usage.cost || 0), 0);
    const monthlyCost = monthlyUsage.reduce((sum, usage) => sum + (usage.cost || 0), 0);
    const dailyCost = dailyUsage.reduce((sum, usage) => sum + (usage.cost || 0), 0);

    const avgTokensPerCall = tokenUsage.length > 0 ? Math.round(totalTokens / tokenUsage.length) : 0;

    return {
      totalTokens,
      monthlyTokens,
      dailyTokens,
      totalCost,
      monthlyCost,
      dailyCost,
      avgTokensPerCall,
      usageCount: tokenUsage.length
    };
  };

  const stats = calculateStats();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{t('token_dashboard.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  if (!isDifyEnabled()) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{t('token_dashboard.title')}</h1>
          <p className="text-gray-600">{t('token_dashboard.subtitle')}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <InfoIcon className="h-5 w-5" />
              {t('token_dashboard.unavailable')}
            </CardTitle>
            <CardDescription>
              {t('token_dashboard.integration_disabled')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertDescription>
                {t('token_dashboard.enable_instruction')}
              </AlertDescription>
            </Alert>
            
            <div className="mt-6 flex gap-4">
              <Button onClick={() => navigate('/dashboard')}>
                {t('token_dashboard.back_to_dashboard')}
              </Button>
              <Button variant="outline" onClick={() => navigate('/admin')}>
                {t('token_dashboard.manage_settings')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t('token_dashboard.title')}</h1>
        <p className="text-gray-600">{t('token_dashboard.subtitle_detailed')}</p>
      </div>

      {/* Balance and Status */}
      <div className="grid gap-6 md:grid-cols-5 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('token_dashboard.current_balance')}</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user?.balance || 0}</div>
            <p className="text-xs text-muted-foreground">{t('token_dashboard.credits')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('token_dashboard.today_consumed')}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isDataLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.dailyTokens.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Token</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('token_dashboard.monthly_consumed')}</CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isDataLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.monthlyTokens.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Token</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('token_dashboard.average_per_call')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isDataLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.avgTokensPerCall}
            </div>
            <p className="text-xs text-muted-foreground">Token</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('token_dashboard.monthly_credits_consumed')}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isDataLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : Math.round(stats.monthlyCost)}
            </div>
            <p className="text-xs text-muted-foreground">{t('token_dashboard.credits')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Summary */}
      <div className="grid gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>{t('token_dashboard.usage_statistics')}</CardTitle>
            <CardDescription>
              {t('token_dashboard.token_consumption_overview')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t('token_dashboard.total_calls')}</span>
                <span className="font-medium">{stats.usageCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t('token_dashboard.total_token_consumption')}</span>
                <span className="font-medium">{stats.totalTokens.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t('token_dashboard.total_credits_consumption')}</span>
                <span className="font-medium">{Math.round(stats.totalCost)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Recent Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t('token_dashboard.recent_usage_records')}
          </CardTitle>
          <CardDescription>
            {t('token_dashboard.latest_token_consumption')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isDataLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : tokenUsage.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>{t('token_dashboard.no_usage_records')}</p>
              <p className="text-sm">{t('token_dashboard.start_using_service_hint')}</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {tokenUsage.slice(0, 10).map((usage) => (
                <div key={usage.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">
                      {usage.serviceId?.includes('dify') ? 'ProMe AI Chat' : 
                       usage.serviceId?.includes('workflow') ? 'ProMe Workflow' : 
                       usage.serviceId || 'ProMe Service'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(usage.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{usage.tokensUsed?.toLocaleString() || 0} tokens</div>
                    <div className="text-sm text-gray-500">{Math.round(usage.cost || 0)} {t('token_dashboard.credits')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex gap-4">
        <Button onClick={() => navigate('/dashboard')}>
          {t('token_dashboard.back_to_dashboard')}
        </Button>
        <Button variant="outline" onClick={() => navigate('/pricing')}>
          {t('token_dashboard.recharge_credits')}
        </Button>
      </div>
    </div>
  );
}