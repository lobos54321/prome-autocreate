import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  CreditCard, 
  Clock, 
  Plus, 
  DollarSign,
  ArrowRight,
  Search,
  RefreshCw
} from 'lucide-react';
import { TokenUsage, BillingRecord } from '@/types';
import { servicesAPI } from '@/lib/services';
import { authService } from '@/lib/auth';

import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from 'react-i18next';

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  // Always declare hooks at top level
  const [usageRecords, setUsageRecords] = useState<TokenUsage[]>([]);
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);

  // Handle user authentication - only redirect if not loading and no user
  useEffect(() => {
    if (!isLoading && !user) {
      console.log('Dashboard: No user found after loading, redirecting to login');
      navigate('/login');
    }
  }, [user, isLoading, navigate]);

  // 加载数据时确保 catch 错误并 fallback - 移到所有 hooks 声明之后
  useEffect(() => {
    if (!user || !user.id) return;

    let cancelled = false;
    const loadData = async () => {
      try {
        const usage = await servicesAPI.getTokenUsage(user.id);
        const billing = await servicesAPI.getBillingRecords(user.id);
        if (!cancelled) {
          setUsageRecords(Array.isArray(usage) ? usage : []);
          setBillingRecords(Array.isArray(billing) ? billing : []);
        }
      } catch (error) {
        console.warn('Failed to load dashboard data:', error);
        if (!cancelled) {
          setUsageRecords([]);
          setBillingRecords([]);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{t('dashboard.verifying_identity')}</p>
          </div>
        </div>
      </div>
    );
  }

  // Early return if user is not available after loading
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{t('common.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  // 计算统计数据
  const totalSpent = billingRecords.reduce((sum, record) => typeof record.amount === 'number' ? sum + record.amount : sum, 0);
  const currentMonthUsage = usageRecords
    .filter(record => {
      const recordDate = new Date(record.timestamp);
      const now = new Date();
      if (Number.isNaN(recordDate.getTime())) return false;
      return recordDate.getMonth() === now.getMonth() && recordDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, record) => typeof record.tokensUsed === 'number' ? sum + record.tokensUsed : sum, 0);

  // 搜索过滤
  const filteredUsage = usageRecords.filter(record => 
    (record.serviceId ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredBilling = billingRecords.filter(record => 
    (record.description ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 安全日期格式化
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const refreshBalance = async () => {
    if (!user || !user.id || isRefreshingBalance) return;
    
    try {
      setIsRefreshingBalance(true);
      console.log('Manual balance refresh requested...');
      await authService.refreshBalance();
      console.log('Manual balance refresh completed');
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    } finally {
      setIsRefreshingBalance(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('dashboard.title')}</h1>
        <p className="text-gray-600">{t('dashboard.subtitle')}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.account_balance')}</CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={refreshBalance}
                disabled={isRefreshingBalance}
                title={t('dashboard.refresh_balance')}
              >
                <RefreshCw className={`h-3 w-3 ${isRefreshingBalance ? 'animate-spin' : ''}`} />
              </Button>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {user && typeof user.balance === 'number' ? Math.round(user.balance).toLocaleString() : '0'} {t('dashboard.credits')}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.low_balance_warning')}
            </p>
            <Button size="sm" className="mt-4" onClick={() => navigate('/settings')}>
              {t('dashboard.recharge_account')}
              <ArrowRight className="ml-2 h-3 w-3" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.monthly_token_usage')}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentMonthUsage.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.total_services_used', { count: usageRecords.length })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.total_consumed_credits')}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {typeof totalSpent === 'number' ? Math.round(totalSpent).toLocaleString() : '0'} {t('dashboard.credits')}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.total_billing_records', { count: billingRecords.length })}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="overview">{t('dashboard.overview')}</TabsTrigger>
          <TabsTrigger value="usage">{t('dashboard.usage_records')}</TabsTrigger>
        </TabsList>

        <div className="my-4">
          {activeTab === 'usage' && (
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder={t('dashboard.search_records')}
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          )}
        </div>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.quick_actions')}</CardTitle>
                <CardDescription>
                  {t('dashboard.quick_actions_subtitle')}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="h-24 flex flex-col gap-2" onClick={() => navigate('/services')}>
                  <Activity className="h-8 w-8 text-blue-500" />
                  <span>{t('dashboard.browse_services')}</span>
                </Button>
                <Button variant="outline" className="h-24 flex flex-col gap-2" onClick={() => navigate('/settings')}>
                  <Plus className="h-8 w-8 text-green-500" />
                  <span>{t('dashboard.recharge_account')}</span>
                </Button>
                <Button variant="outline" className="h-24 flex flex-col gap-2" onClick={() => navigate('/token-dashboard')}>
                  <Clock className="h-8 w-8 text-orange-500" />
                  <span>{t('dashboard.token_analysis')}</span>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.recent_usage')}</CardTitle>
                <CardDescription>
                  {t('dashboard.recent_usage_subtitle')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {usageRecords.slice(0, 5).map((record, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">
                        {record.serviceId?.includes('dify') ? 'ProMe AI' : 
                         record.serviceId?.includes('workflow') ? 'ProMe Workflow' : 
                         record.serviceId || 'ProMe Service'}
                      </p>
                      <p className="text-sm text-gray-500">{formatDate(record.timestamp)}</p>
                    </div>
                    <Badge variant="outline">
                      {record.tokensUsed} Tokens
                    </Badge>
                  </div>
                ))}
                {usageRecords.length === 0 && (
                  <p className="text-center text-gray-500 py-4">
                    {t('dashboard.no_usage_records')}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="usage">
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.usage_records')}</CardTitle>
              <CardDescription>
                Your complete API usage records
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredUsage.length > 0 ? (
                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-6 py-3">{t('dashboard.service')}</th>
                        <th className="px-6 py-3">{t('dashboard.session_id')}</th>
                        <th className="px-6 py-3">{t('dashboard.token_usage')}</th>
                        <th className="px-6 py-3">{t('dashboard.credits_used')}</th>
                        <th className="px-6 py-3">{t('dashboard.time')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsage.map((record, index) => (
                        <tr key={index} className="border-b">
                          <td className="px-6 py-4 font-medium">
                            {record.serviceId?.includes('dify') ? 'ProMe AI' : 
                             record.serviceId?.includes('workflow') ? 'ProMe Workflow' : 
                             record.serviceId || 'ProMe Service'}
                          </td>
                          <td className="px-6 py-4 text-gray-500">
                            {typeof record.sessionId === 'string' ? record.sessionId.substring(0, 8) + '...' : ''}
                          </td>
                          <td className="px-6 py-4">
                            {typeof record.tokensUsed === 'number' ? record.tokensUsed : ''}
                          </td>
                          <td className="px-6 py-4 text-red-600">
                            -{typeof record.cost === 'number' ? Math.round(record.cost) : '0'} {t('dashboard.credits')}
                          </td>
                          <td className="px-6 py-4 text-gray-500">
                            {formatDate(record.timestamp)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    {searchTerm ? t('dashboard.no_matching_records') : t('dashboard.no_usage_records')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
