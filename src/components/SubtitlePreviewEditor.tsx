import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface SubtitleLine {
    index: number;
    timing: string;
    text: string;
    translatedText: string;
}

interface SubtitlePreviewEditorProps {
    subtitles: SubtitleLine[] | null;
    onSave?: (subtitles: SubtitleLine[]) => void;
}
  

// 生成示例数据
const generateDemoSubtitles = (count: number): SubtitleLine[] => {
  return Array.from({ length: count }, (_, i) => ({
    type: 'dialogue',
    index: i + 1,
    timing: '00:00:00,000 --> 00:00:03,000',
    text: "test",
    translatedText: "测试"
  }));
};


export default function SubtitlePreviewEditor({ 
    subtitles = null,
    onSave
  }: SubtitlePreviewEditorProps) {
  const { subtitle: t } = useTranslation();
  // 生成100条示例字幕
  const subtitleData = subtitles || generateDemoSubtitles(100);
  const [editedSubtitles, setEditedSubtitles] = useState(subtitleData);

  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpPage, setJumpPage] = useState('');
  const [subtitleNumber, setSubtitleNumber] = useState('');
  
  const subtitleRefs = useRef<{ [key: number]: HTMLTableRowElement }>({});
  
  const totalSubtitles = editedSubtitles.length;
  const totalPages = Math.ceil(totalSubtitles / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalSubtitles);
  const currentSubtitles = editedSubtitles.slice(startIndex, endIndex);

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value);
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // 添加对卡片头部的引用
  const cardHeaderRef = useRef<HTMLDivElement>(null);

  const handleJumpToPage = (e?: React.FormEvent) => {
    e?.preventDefault();
    const pageNum = parseInt(jumpPage);
    if (pageNum && pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      setJumpPage('');
      
      // 确保跳转后卡片标题完整显示
      setTimeout(() => {
        if (cardHeaderRef.current) {
          const headerRect = cardHeaderRef.current.getBoundingClientRect();
          const windowHeight = window.innerHeight;
          // 如果标题不在视口内或太靠近顶部，进行滚动
          if (headerRect.top < 0 || headerRect.top < 20) {
            window.scrollTo({
              top: window.scrollY + headerRect.top - 20, // 保留 20px 的上边距
              behavior: 'smooth'
            });
          }
        }
      }, 100);
    }
  };

  const handleSubtitleJump = (e?: React.FormEvent) => {
    e?.preventDefault();
    const num = parseInt(subtitleNumber);
    if (num && num >= 1 && num <= totalSubtitles) {
      const targetPage = Math.ceil(num / pageSize);
      setCurrentPage(targetPage);
      setSubtitleNumber('');
      
      // 使用 setTimeout 确保页面更新后再滚动
      setTimeout(() => {
        const ref = subtitleRefs.current[num];
        if (ref) {
          ref.scrollIntoView({ 
            behavior: 'smooth',
            block: 'center'
          });
          // 添加临时高亮效果
          ref.classList.add('bg-yellow-100');
          setTimeout(() => {
            ref.classList.remove('bg-yellow-100');
          }, 2000);
        }
      }, 100);
    }
  };

  // 添加键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 检查当前焦点元素是否是输入框或文本区域
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // 左方向键：上一页
      if (e.key === 'ArrowLeft') {
        setCurrentPage(prev => Math.max(1, prev - 1));
      }
      // 右方向键：下一页
      else if (e.key === 'ArrowRight') {
        setCurrentPage(prev => Math.min(totalPages, prev + 1));
      }
    };

    // 添加事件监听器
    window.addEventListener('keydown', handleKeyDown);

    // 清理函数
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [totalPages]); // 依赖 totalPages 以便在页数变化时更新

  return (
    <div className="max-w-6xl mx-auto p-4">
      <Card>
        <CardHeader ref={cardHeaderRef} className="flex flex-col space-y-4 border-b pb-4">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">{t.preview.title}</h2>
              <div className="text-sm text-gray-500 flex items-center gap-4">
                <span>{t.preview.total}：{totalSubtitles}</span>
                <span>{t.preview.range}：{startIndex + 1}-{endIndex}</span>
              </div>
            </div>
            <Button 
              className="flex items-center gap-2"
              onClick={() => onSave?.(editedSubtitles)}
            >
              <Save size={16} />
              {t.preview.save}
            </Button>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">{t.preview.display}</span>
            <select 
              className="border rounded px-2 py-1 bg-white"
              value={pageSize}
              onChange={handlePageSizeChange}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="30">30</option>
              <option value="50">50</option>
            </select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 border-b w-1/2">
                    {t.preview.original}
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 border-b w-1/2">
                    {t.preview.translated}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {currentSubtitles.map((subtitle, index) => (
                  <tr 
                    key={startIndex + index} 
                    ref={el => {
                        if (el) subtitleRefs.current[subtitle.index] = el;
                      }}
                    className="hover:bg-gray-50 group"
                    >
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-500 flex items-center gap-2">
                            <span className="font-medium">#{subtitle.index}</span>
                            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                              {subtitle.timing}
                            </span>
                          </div>
                        </div>
                        <div className="text-gray-900 whitespace-pre-wrap">
                          {subtitle.text}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <Textarea
                          value={subtitle.translatedText}
                          onChange={(e) => {
                            const newSubtitles = [...editedSubtitles];
                            const subtitleIndex = startIndex + index;
                            newSubtitles[subtitleIndex] = {
                              ...newSubtitles[subtitleIndex],
                              translatedText: e.target.value
                            };
                            setEditedSubtitles(newSubtitles);
                          }}
                          className="w-full resize-none min-h-[80px]"
                          rows={3}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t bg-white sticky bottom-0">
            

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-6">
                <div className="text-sm text-gray-600">
                  {t.preview.num} {currentPage}/{totalPages} {t.preview.page}
                </div>

                <form onSubmit={handleJumpToPage} className="flex items-center gap-3">
                  <Input
                    type="text"
                    value={jumpPage}
                    onChange={(e) => setJumpPage(e.target.value)}
                    placeholder={t.preview.jumpPage}
                    className="w-32 text-sm"
                  />
                  <Button 
                    type="submit"
                    className="h-8 px-3"
                  >
                    {t.preview.jumpTo}
                  </Button>
                </form>
              </div>

              <div className="h-8 w-px bg-gray-200" />

              <form onSubmit={handleSubtitleJump} className="flex items-center gap-3">
                <Input
                  type="text"
                  value={subtitleNumber}
                  onChange={(e) => setSubtitleNumber(e.target.value)}
                  placeholder={t.preview.jumpSubtitle}
                  className="w-32 text-sm"
                />
                <Button 
                  type="submit"
                  className="h-8 px-3"
                >
                  {t.preview.jumpTo}
                </Button>
              </form>
            </div>

            <div className="flex items-center gap-5">
              <Button
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}