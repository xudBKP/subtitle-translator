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
  const [apiUrl, setApiUrl] = useState('https://aihubmix.com/v1/chat/completions');
  const [model, setModel] = useState('gpt-4o-mini');
  const [targetLang, setTargetLang] = useState('zh');
  const [batchCount, setBatchCount] = useState(10); // 改为批次数
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
      
      try {
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
  1. 格式保持：请确保翻译后的文件格式与原文件一致
  2. 每条字幕都有其对应的时间轴，必须一对一翻译
  3. 禁止将多条字幕合并成一句
  4. 禁止拆分原字幕
  5. 每条字幕必须独立翻译，保持原有的分句结构
  6. 即使前后文意相关，也要严格按照原字幕的分句来翻译
  7. 如果存在标题部分记得标题也要翻译
  8. 对于空行或只有空格的行，请返回一个空行
  9. 每条字幕都是独立的，不要考虑上下文关系

  请直接返回翻译结果，每条翻译之间用"<splitter>"分隔，确保返回数量与原文完全一致。

  待翻译字幕：
  ${subtitleTexts.join('\n<splitter>\n')}`
              }
            ]
          })
        });

        if (!response.ok) {
          throw new Error(`API 请求失败: ${response.status}`);
        }
      
        const data = await response.json() as TranslationResponse;
        const translatedText = data.choices[0].message.content;
        const translatedArray = translatedText.split('<splitter>').map((text: string) => text.trim());

        // 检查翻译结果数量是否匹配
        if (translatedArray.length !== subtitleTexts.length) {
          console.warn(`翻译结果数量不匹配 - 原文: ${subtitleTexts.length}, 译文: ${translatedArray.length}`);
          // 如果译文数量少于原文，用原文补充
          while (translatedArray.length < subtitleTexts.length) {
            translatedArray.push(subtitleTexts[translatedArray.length]);
          }
          // 如果译文数量多于原文，截取
          if (translatedArray.length > subtitleTexts.length) {
            translatedArray.length = subtitleTexts.length;
          }
        }

        // 检查空值和undefined
        return translatedArray.map((text, index) => {
          if (!text || text === 'undefined' || text === 'null') {
            console.warn(`发现无效翻译结果，位置: ${index}, 原文: ${subtitleTexts[index]}`);
            return subtitleTexts[index];
          }
          return text;
        });
      } catch (error) {
        console.error('翻译批次出错:', error);
        return subtitleTexts;
      }
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
        const translatedSubtitles: Subtitle[] = [];
        
        // 确保批次数有效
        const actualBatchCount = Math.max(1, Math.min(batchCount, subtitles.length));
        const itemsPerBatch = Math.ceil(subtitles.length / actualBatchCount);
        
        // 处理所有完整批次
        for (let i = 0; i < subtitles.length; i += itemsPerBatch) {
          const currentBatch = subtitles.slice(i, Math.min(i + itemsPerBatch, subtitles.length));
          
          try {
            const translatedTexts = await translateBatch(currentBatch);
            
            // 确保返回的翻译结果和批次中的字幕数量匹配
            if (translatedTexts.length === currentBatch.length) {
              for (let j = 0; j < currentBatch.length; j++) {
                translatedSubtitles.push({
                  ...currentBatch[j],
                  text: translatedTexts[j] || currentBatch[j].text
                });
              }
            } else {
              console.error(`批次翻译结果数量不匹配 - 期望: ${currentBatch.length}, 实际: ${translatedTexts.length}`);
              currentBatch.forEach(subtitle => {
                translatedSubtitles.push({...subtitle});
              });
            }

            setProgress(((i + currentBatch.length) / subtitles.length) * 100);
          } catch (batchError) {
            console.error('处理批次时出错:', batchError);
            currentBatch.forEach(subtitle => {
              translatedSubtitles.push({...subtitle});
            });
          }
        }

        // 确保处理了所有字幕，包括最后一条
        if (translatedSubtitles.length !== subtitles.length) {
          console.error(`处理结果不完整: ${translatedSubtitles.length}/${subtitles.length}`);
          // 补充缺失的字幕
          for (let i = translatedSubtitles.length; i < subtitles.length; i++) {
            translatedSubtitles.push({...subtitles[i]});
          }
        }

        const output = translatedSubtitles.map(subtitle => (
          `${subtitle.index}\n${subtitle.timing}\n${subtitle.text || ''}\n`
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
                总批次数（将字幕平均分成几批翻译）
              </label>
              <Input
                type="number"
                min="1"
                max="100"
                value={batchCount}
                onChange={(e) => setBatchCount(parseInt(e.target.value) || 1)}
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