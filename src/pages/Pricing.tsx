import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, ArrowRight, CreditCard, Zap } from 'lucide-react';
import { authService } from '@/lib/auth';
import { adminServicesAPI } from '@/lib/admin-services';
import { RechargePackage, User } from '@/types';
import { useTranslation } from 'react-i18next';

export default function Pricing() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(authService.getCurrentUserSync());
  const [rechargePackages, setRechargePackages] = useState<RechargePackage[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number>(10000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [customCredits, setCustomCredits] = useState<number>(0);

  const minimumUSD = 0.5; // 🔧 Stripe最低要求：50美分

  // 翻译套餐名称
  const translatePackageName = (name: string) => {
    const translations: { [key: string]: string } = {
      '基础套餐': t('pricing.basic_plan'),
      '推荐套餐': t('pricing.popular_plan'), 
      '高级套餐': t('pricing.advanced_plan'),
      '专业套餐': t('pricing.professional_plan')
    };
    return translations[name] || name;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load recharge packages for all users
        const packages = await adminServicesAPI.getRechargePackages();
        setRechargePackages(packages);

        // Load exchange rate
        const rate = await adminServicesAPI.getExchangeRate();
        setExchangeRate(rate);
      } catch (error) {
        console.error('Failed to load pricing data:', error);
      }
    };
    
    loadData();

    // Listen for auth state changes
    const handleAuthChange = (event: CustomEvent) => {
      setUser(event.detail.user);
    };

    window.addEventListener('auth-state-changed', handleAuthChange as EventListener);

    return () => {
      window.removeEventListener('auth-state-changed', handleAuthChange as EventListener);
    };
  }, []);

  // Calculate credits for custom amount
  useEffect(() => {
    const amount = parseFloat(customAmount);
    if (!isNaN(amount) && amount >= 0) {
      setCustomCredits(Math.floor(amount * (exchangeRate / 10))); // exchangeRate is per $10
    } else {
      setCustomCredits(0);
    }
  }, [customAmount, exchangeRate]);

  const handleSelectPackage = (packageId: string) => {
    const user = authService.getCurrentUserSync();
    if (user && authService.isAuthenticated()) {
      // Already logged in user goes directly to purchase flow
      navigate(`/purchase?package=${packageId}`);
    } else {
      // Redirect unlogged users to registration page with package parameter
      navigate(`/register?package=${packageId}`);
    }
  };

  const handleCustomRecharge = () => {
    const amount = parseFloat(customAmount);
    if (amount < minimumUSD) {
      alert(`${t('pricing.insufficient_amount')} $${minimumUSD}`);
      return;
    }

    const user = authService.getCurrentUserSync();
    if (user && authService.isAuthenticated()) {
      // Already logged in user goes directly to purchase flow
      navigate(`/purchase?custom=true&amount=${amount}`);
    } else {
      // Redirect unlogged users to registration page with custom amount
      navigate(`/register?custom=true&amount=${amount}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-4">{t('pricing.title')}</h1>
        <p className="text-xl text-gray-700 max-w-2xl mx-auto">
          {t('pricing.subtitle')}
        </p>
        {user && (
          <div className="mt-4 inline-flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg">
            <CreditCard className="h-5 w-5 text-blue-600" />
            <span className="text-blue-700">{t('pricing.current_balance')}:</span>
            <span className="font-semibold text-blue-800">{user.balance?.toLocaleString() || 0} {t('pricing.credits')}</span>
          </div>
        )}
      </div>

      <div className="w-full">
        {/* Preset Packages */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-12">
          {rechargePackages.map((pkg) => (
            <Card 
              key={pkg.id} 
              className={`${pkg.isPopular ? 'border-blue-500 shadow-lg transform scale-105' : ''} transition-all hover:shadow-md`}
            >
              {pkg.isPopular && (
                <div className="bg-blue-500 text-white text-center py-1 text-sm font-medium">
                  {t('pricing.popular')}
                </div>
              )}
              <CardHeader className="text-center">
                <CardTitle>{translatePackageName(pkg.name)}</CardTitle>
                <CardDescription className="text-2xl font-bold text-green-600">
                  ${pkg.usdAmount}
                </CardDescription>
                <div className="text-sm text-gray-600">
                  {pkg.creditsAmount.toLocaleString()} {t('pricing.credits')}
                </div>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-sm text-gray-500 mb-2">
                  {t('pricing.about_per_credit')} ${(10 / exchangeRate).toFixed(4)}
                </div>
                {pkg.discount && (
                  <div className="text-xs text-green-600 font-medium">
                    {t('pricing.best_value')} {pkg.discount}%
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  className={`w-full ${pkg.isPopular ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
                  onClick={() => handleSelectPackage(pkg.id)}
                >
                  {t('pricing.purchase_now')}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Custom Amount */}
        <Card className="max-w-md mx-auto mb-8">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              {t('pricing.custom_amount')}
            </CardTitle>
            <CardDescription>{t('pricing.minimum_amount')} ${minimumUSD}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customAmount">{t('pricing.custom_amount')} ({t('pricing.usd')})</Label>
              <Input
                id="customAmount"
                type="number"
                min={minimumUSD}
                step="0.01"
                placeholder={`${t('pricing.minimum_amount')} $${minimumUSD}`}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
              />
            </div>
            {customCredits > 0 && (
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-sm text-gray-600">{t('pricing.calculate_credits')}</p>
                <p className="text-lg font-bold text-green-600">
                  {customCredits.toLocaleString()} {t('pricing.credits')}
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full"
              onClick={handleCustomRecharge}
              disabled={!customAmount || parseFloat(customAmount) < minimumUSD}
            >
              {t('pricing.purchase_credits')}
            </Button>
          </CardFooter>
        </Card>

        {/* Credits Usage Info */}
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>{t('pricing.usage_instructions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">{t('pricing.how_to_consume')}</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-green-500 mr-2 shrink-0 mt-0.5" />
                    {t('pricing.consume_auto')}
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-green-500 mr-2 shrink-0 mt-0.5" />
                    {t('pricing.consume_model')}
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-green-500 mr-2 shrink-0 mt-0.5" />
                    {t('pricing.consume_advanced')}
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-green-500 mr-2 shrink-0 mt-0.5" />
                    {t('pricing.consume_insufficient')}
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-3">{t('pricing.credits_advantages')}</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-green-500 mr-2 shrink-0 mt-0.5" />
                    {t('pricing.advantage_paygo')}
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-green-500 mr-2 shrink-0 mt-0.5" />
                    {t('pricing.advantage_noexpiry')}
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-green-500 mr-2 shrink-0 mt-0.5" />
                    {t('pricing.advantage_transparent')}
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-green-500 mr-2 shrink-0 mt-0.5" />
                    {t('pricing.advantage_flexible')}
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-20 text-center">
        <h2 className="text-2xl font-bold mb-4">{t('pricing.questions_title')}</h2>
        <p className="mb-6 max-w-2xl mx-auto">
          {t('pricing.questions_subtitle')}
        </p>
        <Button variant="outline" size="lg">
          {t('pricing.contact_support')}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
