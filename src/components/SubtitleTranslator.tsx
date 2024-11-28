"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Eye, EyeOff } from 'lucide-react';

interface Subtitle {
  index: number;
  timing: string;
  text: string;
}

interface TranslationResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

const LANGUAGE_OPTIONS = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'es', label: 'Español' },
  { value: 'ru', label: 'Русский' },
];

const MODEL_OPTIONS = [
  { value: 'gpt-4o-mini', label: 'GPT-4O-Mini' },
  { value: 'gpt-4o-mini-2024-07-18', label: 'GPT-4O-Mini (2024-07-18)' },
  { value: 'gpt-4-1106-preview', label: 'GPT-4-Turbo' },
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5-Turbo' },
];

export default function SubtitleTranslator() {
  const [file, setFile] = useState<File | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiUrl, setApiUrl] = useState('https://api.openai.com/v1/chat/completions');
  const [model, setModel] = useState('gpt-4o-mini');
  const [targetLang, setTargetLang] = useState('zh');
  const [batchSize, setBatchSize] = useState(0);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [translating, setTranslating] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    }
  };

  const parseSubtitle = async (content: string): Promise<Subtitle[]> => {
    const lines = content.split('\n');
    const subtitles: Subtitle[] = [];
    let currentSubtitle: Partial<Subtitle> = {};
    
    for (const line of lines) { // 改为 const
      if (/^\d+$/.test(line.trim())) {
        if (Object.keys(currentSubtitle).length > 0) {
          subtitles.push(currentSubtitle as Subtitle);
        }
        currentSubtitle = { index: parseInt(line) };
      } else if (line.includes('-->')) {
        currentSubtitle.timing = line.trim();
      } else if (line.trim() !== '') {
        if (!currentSubtitle.text) {
          currentSubtitle.text = line.trim();
        } else {
          currentSubtitle.text += '\n' + line.trim();
        }
      }
    }
    
    if (Object.keys(currentSubtitle).length > 0) {
      subtitles.push(currentSubtitle as Subtitle);
    }
    
    return subtitles;
  };

  const translateBatch = async (subtitles: Subtitle[]): Promise<string[]> => {
    const subtitleTexts = subtitles.map(s => s.text);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          ...(systemPrompt ? [{
            role: 'system' as const,
            content: systemPrompt
          }] : []),
          {
            role: 'user' as const,
            content: `请将以下${subtitleTexts.length}条字幕翻译成${LANGUAGE_OPTIONS.find(lang => lang.value === targetLang)?.label || '中文'}。

翻译规则：
1.格式保持：请确保翻译后的文件格式与原文件一致，包括任何特殊标记或结构
2.逐句翻译：每条字幕必须逐句翻译，保持时间轴不变
3.不合并或拆分：禁止将多条字幕合并成一句或拆分原字幕
4.标题翻译：如果存在标题部分，请翻译标题
5.注意回车也要保留，保证最后跟原来结构一样

请按照原文的顺序翻译，并用"---"分隔每条翻译结果。只返回翻译结果：

${subtitleTexts.join('\n---\n')}`
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status}`);
    }
  
    const data = await response.json() as TranslationResponse;
    const translatedText = data.choices[0].message.content;
    return translatedText.split('---').map((text: string) => text.trim());
  };

  const translateSubtitles = async () => {
    if (!file || !apiKey) {
      alert('请选择文件并输入API密钥');
      return;
    }

    setTranslating(true);
    setProgress(0);

    try {
      const content = await file.text();
      const subtitles = await parseSubtitle(content);
      const translatedSubtitles = [];
      
      const MAX_BATCH_SIZE = 100;
      const actualBatchSize = batchSize === 0 
        ? Math.min(subtitles.length, MAX_BATCH_SIZE)
        : Math.min(batchSize, MAX_BATCH_SIZE);
      
      for (let i = 0; i < subtitles.length; i += actualBatchSize) {
        const batch = subtitles.slice(i, i + actualBatchSize);
        const translatedTexts = await translateBatch(batch);
        
        for (let j = 0; j < batch.length; j++) {
          translatedSubtitles.push({
            ...batch[j],
            text: translatedTexts[j]
          });
        }

        setProgress(((i + batch.length) / subtitles.length) * 100);
      }

      const output = translatedSubtitles.map(subtitle => (
        `${subtitle.index}\n${subtitle.timing}\n${subtitle.text}\n`
      )).join('\n');

      const blob = new Blob([output], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `translated_${file.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error: any) {
      alert('翻译过程中出现错误：' + error.message);
    } finally {
      setTranslating(false);
      setProgress(0);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <h1 className="text-2xl font-bold">字幕翻译工具</h1>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">系统提示词（可选）</label>
            <Textarea
              placeholder="在此输入翻译要求，例如：'请在翻译时保持通俗易懂的语气，使用日常用语'"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">上传字幕文件</label>
            <Input
              type="file"
              accept=".srt,.ass"
              onChange={handleFileUpload}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">API设置</label>
            <div className="relative mb-2">
              <Input
                type={showApiKey ? "text" : "password"}
                placeholder="输入API密钥"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full pr-10"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showApiKey ? (
                  <EyeOff size={16} />
                ) : (
                  <Eye size={16} />
                )}
              </button>
            </div>
            <Input
              type="text"
              placeholder="API URL"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              className="mb-2"
            />
            <div className="grid grid-cols-2 gap-2 mb-2">
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                {MODEL_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                {LANGUAGE_OPTIONS.map(lang => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                每批翻译字幕数（0表示每批最多100条）
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                value={batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value) || 0)}
                className="w-full"
              />
            </div>
          </div>

          {translating ? (
            <div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-sm text-center mt-2">{Math.round(progress)}% 完成</p>
            </div>
          ) : (
            <Button
              onClick={translateSubtitles}
              className="w-full"
              disabled={!file || !apiKey}
            >
              开始翻译
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}