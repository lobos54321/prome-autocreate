import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Video, 
  Clock, 
  FileText, 
  Image, 
  User, 
  Send, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface VideoFormData {
  duration: string;
  productDescription: string;
  imageUrl: string;
  characterGender: string;
}

interface VideoCreationFormProps {
  onSubmit: (data: VideoFormData) => void;
  isLoading?: boolean;
  className?: string;
}

export default function VideoCreationForm({ onSubmit, isLoading = false, className = '' }: VideoCreationFormProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<VideoFormData>({
    duration: '24',
    productDescription: '',
    imageUrl: '',
    characterGender: ''
  });
  const [errors, setErrors] = useState<Partial<VideoFormData>>({});

  const validateImageUrl = (url: string): boolean => {
    if (!url) return false;
    const urlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|webp)(\?.*)?$/i;
    return urlPattern.test(url);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<VideoFormData> = {};

    if (!formData.duration) {
      newErrors.duration = '请选择视频时长';
    }

    if (!formData.productDescription.trim()) {
      newErrors.productDescription = '请输入产品描述';
    } else if (formData.productDescription.trim().length < 10) {
      newErrors.productDescription = '产品描述至少需要10个字符';
    }

    if (!formData.imageUrl.trim()) {
      newErrors.imageUrl = '请输入产品图片URL';
    } else if (!validateImageUrl(formData.imageUrl)) {
      newErrors.imageUrl = '请输入有效的图片URL（必须以.jpg、.jpeg、.png或.webp结尾）';
    }

    if (!formData.characterGender) {
      newErrors.characterGender = '请选择人物性别';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🎯 表单提交开始');
    
    if (isLoading) {
      console.log('⏸️ 表单正在提交中，忽略重复点击');
      return;
    }

    const isValid = validateForm();
    console.log('✅ 表单验证结果:', isValid);
    
    if (isValid) {
      console.log('📤 调用onSubmit，数据:', formData);
      try {
        onSubmit(formData);
      } catch (error) {
        console.error('❌ onSubmit调用失败:', error);
      }
    }
  };

  const handleInputChange = (field: keyof VideoFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const formatFormDataForN8n = (): string => {
    return `视频创作需求：

🎬 视频时长：${formData.duration}秒
📝 产品描述：${formData.productDescription}
🖼️ 产品图片：${formData.imageUrl}
👤 人物性别：${formData.characterGender}

请根据以上信息创建视频内容。`;
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center mb-4">
            <Video className="h-6 w-6 text-purple-600 mr-2" />
            <div>
              <CardTitle>{t('video.form_title', 'Video Creation Form')}</CardTitle>
              <CardDescription>{t('video.form_description', 'Please fill out the following 4 questions to create your video content')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => {
            console.log('📝 Form onSubmit 直接触发');
            handleSubmit(e);
          }} className="space-y-6">
            {/* 1. 视频时长 */}
            <div className="space-y-2">
              <Label className="flex items-center text-base font-semibold">
                <Clock className="h-4 w-4 mr-2 text-purple-600" />
                1. {t('video.duration', 'Video Duration')}
              </Label>
              <Select 
                value={formData.duration} 
                onValueChange={(value) => handleInputChange('duration', value)}
              >
                <SelectTrigger className={errors.duration ? 'border-red-500' : ''}>
                  <SelectValue placeholder="选择视频时长" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15秒</SelectItem>
                  <SelectItem value="24">24秒 (推荐)</SelectItem>
                  <SelectItem value="30">30秒</SelectItem>
                  <SelectItem value="45">45秒</SelectItem>
                  <SelectItem value="60">60秒</SelectItem>
                </SelectContent>
              </Select>
              {errors.duration && (
                <p className="text-sm text-red-500 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {errors.duration}
                </p>
              )}
              <p className="text-sm text-gray-500">建议选择24秒，最适合社交媒体平台</p>
            </div>

            {/* 2. 产品描述 */}
            <div className="space-y-2">
              <Label className="flex items-center text-base font-semibold">
                <FileText className="h-4 w-4 mr-2 text-purple-600" />
                2. {t('video.product_description', 'Product Description')}
              </Label>
              <Textarea
                value={formData.productDescription}
                onChange={(e) => handleInputChange('productDescription', e.target.value)}
                placeholder="请详细描述您的产品特点、功能、优势等..."
                rows={4}
                className={errors.productDescription ? 'border-red-500' : ''}
              />
              {errors.productDescription && (
                <p className="text-sm text-red-500 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {errors.productDescription}
                </p>
              )}
              <p className="text-sm text-gray-500">
                描述越详细，生成的视频内容越精准。请包含产品的核心卖点。
              </p>
            </div>

            {/* 3. 产品图片URL */}
            <div className="space-y-2">
              <Label className="flex items-center text-base font-semibold">
                <Image className="h-4 w-4 mr-2 text-purple-600" />
                3. 产品图片URL链接
              </Label>
              <Input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => handleInputChange('imageUrl', e.target.value)}
                placeholder="https://example.com/product-image.jpg"
                className={errors.imageUrl ? 'border-red-500' : ''}
              />
              {errors.imageUrl && (
                <p className="text-sm text-red-500 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {errors.imageUrl}
                </p>
              )}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>重要提示：</strong> 请确保URL是以 .jpg、.jpeg、.png 或 .webp 结尾的有效图片链接
                </AlertDescription>
              </Alert>
              
              {/* 图片预览 */}
              {formData.imageUrl && validateImageUrl(formData.imageUrl) && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600 mb-2">图片预览：</p>
                  <img 
                    src={formData.imageUrl} 
                    alt="产品图片预览" 
                    className="max-w-xs h-32 object-cover rounded-lg border"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            {/* 4. 人物性别 */}
            <div className="space-y-2">
              <Label className="flex items-center text-base font-semibold">
                <User className="h-4 w-4 mr-2 text-purple-600" />
                4. 视频中的人物性别
              </Label>
              <Select 
                value={formData.characterGender} 
                onValueChange={(value) => handleInputChange('characterGender', value)}
              >
                <SelectTrigger className={errors.characterGender ? 'border-red-500' : ''}>
                  <SelectValue placeholder="选择人物性别" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">男性</SelectItem>
                  <SelectItem value="female">女性</SelectItem>
                  <SelectItem value="neutral">中性/不限</SelectItem>
                </SelectContent>
              </Select>
              {errors.characterGender && (
                <p className="text-sm text-red-500 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {errors.characterGender}
                </p>
              )}
              <p className="text-sm text-gray-500">选择最适合您产品的代言人性别</p>
            </div>

            {/* 预览生成的消息 */}
            {formData.productDescription && formData.imageUrl && formData.characterGender && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                  将发送给AI的信息预览：
                </h4>
                <pre className="text-sm text-gray-700 whitespace-pre-wrap">{formatFormDataForN8n()}</pre>
              </div>
            )}

            {/* 提交按钮 */}
            <Button 
              type="submit" 
              className="w-full bg-purple-600 hover:bg-purple-700 text-white" 
              size="lg"
              disabled={isLoading}
              onClick={(e) => {
                console.log('🖱️ 按钮直接点击事件触发');
                console.log('🔍 当前isLoading:', isLoading);
                console.log('🔍 按钮是否disabled:', e.currentTarget.disabled);
              }}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  正在发送...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  发送到AI创建视频
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}