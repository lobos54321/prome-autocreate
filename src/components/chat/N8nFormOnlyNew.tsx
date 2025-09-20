import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Video, AlertCircle } from 'lucide-react';
import VideoCreationForm from '@/components/forms/VideoCreationForm';
import { useTranslation } from 'react-i18next';
import { useVideoResult } from '@/hooks/useVideoResult';

interface VideoFormData {
  duration: string;
  productDescription: string;
  imageUrl: string;
  characterGender: string;
}

interface N8nFormOnlyProps {
  webhookUrl: string;
  onBack?: () => void;
  className?: string;
}

export default function N8nFormOnlyNew({ webhookUrl, onBack, className = '' }: N8nFormOnlyProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    message: string;
    response?: any;
    videoUrl?: string;
    isProcessing?: boolean;
  } | null>(null);

  // 使用轮询钩子
  const { result: videoResult, isPolling, error: pollingError, startPolling, stopPolling, reset: resetPolling } = useVideoResult({
    sessionId: sessionId || '',
    onResult: (result) => {
      console.log('📥 轮询获取到视频结果:', result);
      
      // 提取视频URL
      const videoUrl = extractVideoUrl(result.videoUrl || JSON.stringify(result));
      
      if (videoUrl) {
        console.log('🎉 成功提取视频URL:', videoUrl);
        setSubmitResult({
          success: true,
          message: '🎉 视频生成完成！',
          response: JSON.stringify(result, null, 2),
          videoUrl: videoUrl,
          isProcessing: false
        });
      } else {
        console.log('⚠️ 未找到视频URL，显示原始结果');
        setSubmitResult({
          success: true,
          message: '✅ 收到视频结果，请检查结果',
          response: JSON.stringify(result, null, 2),
          isProcessing: false
        });
      }
      
      setIsSubmitting(false);
    }
  });

  // 视频URL提取函数
  const extractVideoUrl = (text: string): string | null => {
    console.log('🔍 尝试提取视频URL，响应内容:', text);
    
    const urlPatterns = [
      // 直接的视频URL
      /https?:\/\/[^\s"'<>]+\.(?:mp4|avi|mov|wmv|flv|webm|mkv)/gi,
      // JSON格式的各种字段名
      /"(?:videoUrl|finalvideoURL|finalvideourl|video_url|videoLink|downloadUrl|fileUrl|mediaUrl)"?\s*:\s*"([^"]+)"/gi,
      // text/output字段中的URL
      /"(?:text|output)"?\s*:\s*"(https?:\/\/[^\s"'<>]+\.(?:mp4|avi|mov|wmv|flv|webm|mkv)[^"]*)"/gi,
    ];

    for (const pattern of urlPatterns) {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 0) {
        const url = matches[0][1] || matches[0][0];
        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
          console.log('✅ 找到视频URL:', url);
          return url;
        }
      }
    }

    console.log('❌ 未找到视频URL');
    return null;
  };

  const sendToN8n = async (formData: VideoFormData) => {
    console.log('🚀 使用三工作流架构发送请求:', formData);
    
    if (isSubmitting) {
      console.log('⏸️ 正在提交中，忽略重复请求');
      return;
    }
    
    setIsSubmitting(true);
    
    // 生成唯一会话ID
    const currentSessionId = `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(currentSessionId);
    
    // 立即显示处理状态
    setSubmitResult({
      success: true,
      message: '✅ 请求已发送，AI正在为您创作视频...',
      response: '使用新的三工作流异步架构处理您的请求...',
      isProcessing: true
    });

    try {

      // 构建消息内容（适配n8n embedded chat格式）
      const messageContent = `${formData.productDescription}\n${formData.imageUrl}\n${formData.characterGender}`;

      console.log('📤 通过N8n Embedded Chat发送消息:', messageContent);
      
      // 使用n8n embedded chat发送消息（工作流1会立即响应）
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'sendMessage',
          sessionId: currentSessionId,
          chatInput: messageContent
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ N8n工作流1立即响应:', result);
      
      // 更新处理状态，显示立即响应
      setSubmitResult({
        success: true,
        message: result.message || '✅ 请求已接收，正在生成视频...',
        response: JSON.stringify(result, null, 2),
        isProcessing: true
      });
      
      // 开始轮询检查视频结果
      console.log('🔄 开始轮询视频结果，sessionId:', currentSessionId);
      startPolling();
      
    } catch (error) {
      console.error('❌ N8n请求发送失败:', error);
      
      setSubmitResult({
        success: false,
        message: `❌ 请求失败: ${error instanceof Error ? error.message : '未知错误'}`,
        response: error instanceof Error ? error.stack : String(error),
        isProcessing: false
      });
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    console.log('🔄 重置组件状态');
    
    // 停止轮询并重置状态
    stopPolling();
    resetPolling();
    setSessionId(null);
    setSubmitResult(null);
    setIsSubmitting(false);
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-bold text-center">
            <Video className="h-8 w-8 mr-3 text-purple-600" />
            ProMe-UGC 真人反馈视频智能体
          </CardTitle>
          <div className="text-center">
            <p className="text-lg text-gray-600 mb-2">让您的产品通过真实声音发声</p>
            <p className="text-sm text-gray-500">使用N8n三工作流异步架构 + 实时回调</p>
          </div>
        </CardHeader>
        <CardContent>
          {/* 视频创作表单 */}
          <VideoCreationForm
            onSubmit={sendToN8n}
            isLoading={isSubmitting}
          />

          {/* 结果显示区域 */}
          {submitResult && (
            <div className="mt-6">
              <Alert className={submitResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                <div className="flex items-start">
                  {submitResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <AlertDescription className={`font-medium ${submitResult.success ? 'text-green-800' : 'text-red-800'}`}>
                      {submitResult.message}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>

              {/* 处理中状态 */}
              {submitResult.success && !submitResult.videoUrl && (submitResult.isProcessing || isPolling) && (
                <div className="bg-blue-50 p-4 rounded-lg mt-4 border-l-4 border-blue-500">
                  <div className="flex items-center mb-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                    <h4 className="font-semibold text-blue-800">🎬 三工作流架构正在处理...</h4>
                  </div>
                  <div className="text-sm text-blue-700 bg-blue-100 p-2 rounded">
                    <p><strong>⏱️ 预计时间：</strong> 2-15分钟</p>
                    <p><strong>💡 架构优势：</strong> 异步处理，轮询检查结果</p>
                    <p><strong>🔄 当前状态：</strong> {isPolling ? '正在轮询检查视频结果...' : '工作流2正在生成视频，完成后工作流3将自动保存结果'}</p>
                    {pollingError && <p><strong>⚠️ 轮询错误：</strong> {pollingError}</p>}
                  </div>
                </div>
              )}

              {/* 视频生成完成 */}
              {submitResult.success && submitResult.videoUrl && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200 mt-4">
                  <h4 className="font-semibold text-green-800 mb-3">🎉 视频生成完成！</h4>
                  
                  <div className="bg-white p-3 rounded border border-green-200 mb-3">
                    <p className="text-sm text-green-700 mb-2">📥 下载链接：</p>
                    <a 
                      href={submitResult.videoUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline break-all"
                    >
                      {submitResult.videoUrl}
                    </a>
                  </div>
                  
                  <div className="flex gap-2">
                    <a 
                      href={submitResult.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer" 
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                      🎬 观看视频
                    </a>
                    <button 
                      onClick={handleReset}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      🔄 创建新视频
                    </button>
                  </div>
                </div>
              )}

              {/* 响应详情 */}
              {submitResult.response && (
                <div className="mt-4">
                  <details className="bg-gray-50 p-3 rounded cursor-pointer">
                    <summary className="font-medium text-gray-700 mb-2">N8n响应详情</summary>
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap bg-white p-2 rounded border overflow-auto max-h-40">
                      {submitResult.response}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}