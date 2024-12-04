"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Eye, EyeOff } from 'lucide-react';

import SubtitlePreviewEditor from '@/components/SubtitlePreviewEditor';

interface TitleInfo {
  hasTitle: boolean;
  titleLine: string;
  titleText: string;
  titlePrefix: string;
}

interface TranslationResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface SubtitleLine {
  type: 'format' | 'dialogue' | 'style' | 'info';
  content: string;
  text?: string;
  prefix?: string;
  index?: number;
  timing?: string;
}

interface TranslatedSubtitleLine {
  index: number;
  timing: string;
  text: string;
  translatedText: string;
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
  
  const [translatedSubtitles, setTranslatedSubtitles] = useState<TranslatedSubtitleLine[] | null>(null);
  const [fileInfo, setFileInfo] = useState<{
    file: File | null;
    format: 'srt' | 'ass';
    subtitleLines: SubtitleLine[];
    titleInfo: TitleInfo;
    translatedTitle: string;
  } | null>(null);
  
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
      // 重置翻译和预览相关的状态
      setTranslatedSubtitles(null);
      setFileInfo(null);
    }
  };

  interface SubtitleLine {
    type: 'format' | 'dialogue' | 'style' | 'info';
    content: string;
    text?: string;
    prefix?: string;
    index?: number;
    timing?: string;
  }
  
  // 判断字幕文件类型
  const getSubtitleFormat = (content: string): 'srt' | 'ass' => {
    if (content.includes('[Script Info]')) {
      return 'ass';
    }
    return 'srt';
  };
  
  // 解析 SRT 格式字幕
  const parseSubtitleSrt = (content: string): SubtitleLine[] => {
    // 处理 BOM
    const cleanContent = content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;
    const lines = cleanContent.split('\n');
    const subtitleLines: SubtitleLine[] = [];
    let currentIndex: number | null = null;
    let currentTiming: string | null = null;
    let currentText: string[] = [];
    
    const isValidTimestamp = (line: string): boolean => {
      // 验证时间轴格式 00:00:00,000 --> 00:00:00,000
      const timestampPattern = /^\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}$/;
      return timestampPattern.test(line.trim());
    };
  
    const processCurrentSubtitle = () => {
      if (currentIndex !== null && currentTiming !== null && currentText.length > 0) {
        // 验证当前字幕块的完整性
        if (isValidTimestamp(currentTiming)) {
          const textContent = currentText.join('\n');
          subtitleLines.push({
            type: 'dialogue',
            content: `${currentIndex}\n${currentTiming}\n${textContent}`,
            text: textContent,
            prefix: `${currentIndex}\n${currentTiming}\n`,
            index: currentIndex,
            timing: currentTiming
          });
        } else {
          console.warn(`跳过无效字幕块，序号: ${currentIndex}`);
        }
      }
      // 重置状态
      currentIndex = null;
      currentTiming = null;
      currentText = [];
    };
  
    for (let line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine === '') {
        processCurrentSubtitle();
      } else if (/^\d+$/.test(trimmedLine)) {
        // 处理上一个字幕块（如果存在）
        if (currentIndex !== null) {
          processCurrentSubtitle();
        }
        currentIndex = parseInt(trimmedLine);
      } else if (line.includes('-->')) {
        currentTiming = line;
      } else if (currentIndex !== null && currentTiming !== null) {
        currentText.push(line);
      }
    }
    
    // 处理最后一个字幕块
    processCurrentSubtitle();
    
    // 验证字幕序号的连续性
    let previousIndex = 0;
    const nonSequentialIndices = subtitleLines
      .filter(line => {
        const isSequential = line.index === previousIndex + 1;
        previousIndex = line.index as number;
        return !isSequential;
      })
      .map(line => line.index);
  
    if (nonSequentialIndices.length > 0) {
      console.warn('发现非连续的字幕序号:', nonSequentialIndices);
    }
  
    return subtitleLines;
  };
  
  // 解析 ASS 格式字幕
  const parseSubtitleAss = (content: string): SubtitleLine[] => {
    const lines = content.split('\n');
    const subtitleLines: SubtitleLine[] = [];
    
    for (const line of lines) {
      if (line.startsWith('Dialogue:')) {
        const lastCommaIndex = line.lastIndexOf(',');
        if (lastCommaIndex !== -1) {
          const prefix = line.substring(0, lastCommaIndex + 1);
          const text = line.substring(lastCommaIndex + 1).trim();
          subtitleLines.push({
            type: 'dialogue',
            content: line,
            text,
            prefix
          });
        } else {
          subtitleLines.push({ type: 'dialogue', content: line });
        }
      } else if (line.trim() === '') {
        subtitleLines.push({ type: 'format', content: '' });
      } else {
        subtitleLines.push({ type: 'format', content: line });
      }
    }
    
    return subtitleLines;
  };

  const parseTitle = (content: string, format: 'srt' | 'ass'): TitleInfo => {
    const defaultResult = { hasTitle: false, titleLine: '', titleText: '', titlePrefix: '' };
    
    if (format === 'ass') {
      const lines = content.split('\n');
      const titleLineIndex = lines.findIndex(line => line.startsWith('Title:'));
      
      if (titleLineIndex !== -1) {
        const titleLine = lines[titleLineIndex];
        const titleParts = titleLine.split(':', 2);
        if (titleParts.length === 2) {
          return {
            hasTitle: true,
            titleLine: titleLine,
            titleText: titleParts[1].trim(),
            titlePrefix: titleParts[0] + ': '
          };
        }
      }
    }
    
    return defaultResult;
  };
  
  const translateTitle = async (titleInfo: TitleInfo, targetLang: string): Promise<string> => {
    if (!titleInfo.hasTitle || !titleInfo.titleText) return titleInfo.titleLine;
  
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
            {
              role: 'user' as const,
              content: `请将以下影片标题翻译成${LANGUAGE_OPTIONS.find(lang => lang.value === targetLang)?.label || '中文'}：\n${titleInfo.titleText}
              只返回翻译结果`
            }
          ]
        })
      });
  
      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status}`);
      }
    
      const data = await response.json() as TranslationResponse;
      const translatedTitle = data.choices[0].message.content.trim();
      return `${titleInfo.titlePrefix}${translatedTitle}`;
    } catch (error) {
      console.error('标题翻译出错:', error);
      return titleInfo.titleLine;
    }
  };
  
  const translateBatch = async (subtitles: SubtitleLine[]): Promise<string[]> => {
    const textsToTranslate = subtitles
      .filter(sub => sub.type === 'dialogue' && sub.text)
      .map(sub => sub.text as string);
    
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
              content: `请将以下${textsToTranslate.length}条字幕翻译成${LANGUAGE_OPTIONS.find(lang => lang.value === targetLang)?.label || '中文'}。
  
  翻译规则(请严格遵守以下规则！)：
  . 格式保持：请确保翻译后的文件格式与原文件一致
  . 每条字幕必须独立翻译，保持原有的分句结构
  . 如果原文是空白或只有空格的行，请返回一个空行
  
  请直接返回翻译结果，每条翻译之间用"<splitter>"分隔，确保返回数量与原文完全一致：
  
  ${textsToTranslate.join('\n<splitter>\n')}`
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
      if (translatedArray.length !== textsToTranslate.length) {
        console.warn(`翻译结果数量不匹配 - 原文: ${textsToTranslate.length}, 译文: ${translatedArray.length}`);
        // 如果译文数量少于原文，用原文补充
        while (translatedArray.length < textsToTranslate.length) {
          translatedArray.push(textsToTranslate[translatedArray.length]);
        }
        // 如果译文数量多于原文，截取
        if (translatedArray.length > textsToTranslate.length) {
          translatedArray.length = textsToTranslate.length;
        }
      }
  
      return translatedArray;
    } catch (error) {
      console.error('翻译批次出错:', error);
      return textsToTranslate;
    }
  };
  
  const translateSubtitles = async () => {
    if (!file || !apiKey) {
      alert('请选择文件并输入API密钥');
      return;
    }
    
    // 重置翻译和预览相关的状态
    setTranslatedSubtitles(null);
    setFileInfo(null);

    setTranslating(true);
    setProgress(0);
  
    try {
      const content = await file.text();
      const format = getSubtitleFormat(content);
      
      // 解析并翻译标题
      const titleInfo = parseTitle(content, format);
      const translatedTitleLine = titleInfo.hasTitle 
        ? await translateTitle(titleInfo, targetLang)
        : '';
      
      const subtitleLines = format === 'ass' ? parseSubtitleAss(content) : parseSubtitleSrt(content);
      let translatedLines: SubtitleLine[] = [];
      
      // 找出所有需要翻译的行
      const dialogueLines = subtitleLines.filter(line => line.type === 'dialogue' && line.text);
      const actualBatchCount = Math.max(1, Math.min(batchCount, dialogueLines.length));
      const itemsPerBatch = Math.ceil(dialogueLines.length / actualBatchCount);
      
      // 按批次翻译
      for (let i = 0; i < dialogueLines.length; i += itemsPerBatch) {
        const currentBatch = dialogueLines.slice(i, Math.min(i + itemsPerBatch, dialogueLines.length));
        const translatedTexts = await translateBatch(currentBatch);
        
        for (let j = 0; j < currentBatch.length; j++) {
          const originalLine = currentBatch[j];
          const translatedText = translatedTexts[j] || originalLine.text;
          translatedLines.push({
            ...originalLine,
            content: format === 'ass' 
              ? `${originalLine.prefix}${translatedText}` 
              : `${originalLine.index}\n${originalLine.timing}\n${translatedText}`
          });
        }
        
        setProgress(((i + currentBatch.length) / dialogueLines.length) * 100);
      }

      const processedSubtitles = format === 'srt' 
        ? subtitleLines
            .filter(line => line.type === 'dialogue')
            .map((line, idx) => ({
              index: idx + 1,
              timing: line.timing || '',
              text: line.text || '',
              translatedText: translatedLines[idx]?.content.split('\n').slice(2).join('\n') || ''
            }))
        : subtitleLines
            .filter(line => line.type === 'dialogue')
            .map((line, idx) => {
              // 提取时间轴信息
              const parts = line.content.split(',');
              const timing = parts.slice(1, 2).join(',');
              return {
                index: idx + 1,
                timing,
                text: line.text || '',
                translatedText: translatedLines[idx]?.content.split(',').slice(-1)[0].trim() || ''
              };
            });
      
      //设置状态
      setTranslatedSubtitles(processedSubtitles);
      setFileInfo({
        file,
        format,
        subtitleLines,
        titleInfo,
        translatedTitle: translatedTitleLine
      });
  
      // 根据格式生成输出
      let output: string;
      if (format === 'ass') {
        // ASS 格式：按原始行顺序组装，替换对应的翻译内容
        const outputLines = subtitleLines.map((line, index) => {
          // 如果是标题行且有翻译，使用翻译后的标题
          if (titleInfo.hasTitle && line.content === titleInfo.titleLine) {
            return translatedTitleLine;
          }
          // 如果是对话行，使用翻译后的内容
          if (line.type === 'dialogue') {
            const dialogueIndex = subtitleLines.filter((l, i) => i < index && l.type === 'dialogue').length;
            return translatedLines[dialogueIndex]?.content || line.content;
          }
          return line.content;
        });
        output = outputLines.join('\n');
      } else {
        // SRT 格式：确保字幕之间有空行
        output = translatedLines.map(line => line.content).join('\n\n') + '\n';
      }
  
      /* 自动下载
      const blob = new Blob([output], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `translated_${file.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      */
  
    } catch (error: any) {
      alert('翻译过程中出现错误：' + error.message);
    } finally {
      setTranslating(false);
      setProgress(0);
    }
  };

  const generateAssOutput = (
    subtitles: Array<{
      index: number;
      timing: string;
      text: string;
      translatedText: string;
    }>, 
    originalLines: SubtitleLine[], 
    titleInfo: TitleInfo,
    translatedTitle: string
  ): string => {
    const headerLines = originalLines
      .filter(line => line.type !== 'dialogue')
      .map(line => {
        if (line.content === titleInfo.titleLine) {
          return translatedTitle;
        }
        return line.content;
      });
  
    const dialogueLines = subtitles.map((sub, idx) => {
      const originalDialogue = originalLines.find(
        line => line.type === 'dialogue' && 
        line.text === sub.text && 
        line.content.includes(sub.timing)
      );
      return originalDialogue 
        ? `${originalDialogue.prefix}${sub.translatedText}`
        : '';
    }).filter(Boolean);
  
    return [...headerLines, ...dialogueLines].join('\n');
  };
  
  const generateSrtOutput = (subtitles: Array<{
    index: number;
    timing: string;
    text: string;
    translatedText: string;
  }>): string => {
    return subtitles
      .map(sub => `${sub.index}\n${sub.timing}\n${sub.translatedText}`)
      .join('\n\n') + '\n';
  };

  return (
    <div>
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
    {/* 当翻译完成后显示预览编辑器 */}
    {translatedSubtitles && fileInfo && (
      <SubtitlePreviewEditor
        subtitles={translatedSubtitles}
        onSave={(updatedSubtitles: TranslatedSubtitleLine[]) => {
          // 根据文件格式生成相应的输出
          const output = fileInfo.format === 'ass'
            ? generateAssOutput(
                updatedSubtitles, 
                fileInfo.subtitleLines, 
                fileInfo.titleInfo, 
                fileInfo.translatedTitle
              )
            : generateSrtOutput(updatedSubtitles);
            
          // 下载处理后的文件
          const blob = new Blob([output], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `edited_${fileInfo.file?.name}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }}
      />
    )}
    </div>
  );
}