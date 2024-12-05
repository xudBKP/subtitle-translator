import { useState, useEffect } from 'react';

// 语言选项的接口定义
interface LanguageOption {
  value: LanguageKey;
  label: string;
}

type LanguageKey = 'zh' | 'en' | 'ja' | 'ko';

interface TranslationDict {
  subtitle: {
    title: string;
    systemPrompt: {
      label: string;
      placeholder: string[];
    };
    fileUpload: {
      label: string;
      supportText: string;
    };
    apiSettings: {
      title: string;
      keyPlaceholder: string;
      urlPlaceholder: string;
    };
    translation: {
      temperature: {
        label: string;
        conservative: string;
        creative: string;
      };
      batch: {
        label: string;
      };
      progress: string;
      start: string;
    };
    preview: {
      title: string;
      total: string;
      range: string;
      save: string;
      display: string;
      jumpTo: string;
      jumpPage: string;
      jumpSubtitle: string;
      original: string;
      translated: string;
      num: string;
      page: string;
    };
  };
}



const defaultTranslations: Record<LanguageKey, TranslationDict> = {
  zh: {
    subtitle: {
      title: "字幕在线翻译编辑工具",
      systemPrompt: {
        label: "系统提示词（可选）",
        placeholder: [
          "可选择输入翻译要求，例如：\"请在翻译时使用日常用语\",或者介绍下该影片的角色，故事背景等",
          "",
          "注意：字幕文件本身语句不通顺可能导致翻译错位，请注意检查"
        ]
      },
      fileUpload: {
        label: "上传字幕文件",
        supportText: "仅支持 srt ass"
      },
      apiSettings: {
        title: "API设置",
        keyPlaceholder: "未输入 API 密钥时将使用默认 API",
        urlPlaceholder: "API URL"
      },
      translation: {
        temperature: {
          label: "Temperature",
          conservative: "更保守",
          creative: "更创造性"
        },
        batch: {
          label: "将字幕分成几批翻译(建议至少5次左右开始)"
        },
        progress: "完成",
        start: "开始翻译"
      },
      preview: {
        title: "字幕预览与编辑",
        total: "总字幕数",
        range: "当前范围",
        save: "保存并下载",
        display: "每页显示",
        jumpTo:"跳转",
        jumpPage: "页码",
        jumpSubtitle: "字幕编号",
        original: "原文",
        translated: "译文",
        num: "第",
        page: "页"
      }
    }
  },
  en: {
    subtitle: {
      title: "Subtitle Translation & Editor",
      systemPrompt: {
        label: "System Prompt (Optional)",
        placeholder: [
          "Enter translation requirements, e.g., \"Please use casual language\", or introduce characters and story background",
          "",
          "Note: Incoherent subtitle sentences may cause translation misalignment"
        ]
      },
      fileUpload: {
        label: "Upload Subtitle File",
        supportText: "Supports srt and ass only"
      },
      apiSettings: {
        title: "API Settings",
        keyPlaceholder: "Default API will be used if no API key is provided",
        urlPlaceholder: "API URL"
      },
      translation: {
        temperature: {
          label: "Temperature",
          conservative: "Conservative",
          creative: "Creative"
        },
        batch: {
          label: "Number of translation batches (recommended: at least 5)"
        },
        progress: "Complete",
        start: "Start Translation"
      },
      preview: {
        title: "Subtitle Preview & Edit",
        total: "Total Subtitles",
        range: "Current Range",
        save: "Save & Download",
        display: "Show per page",
        jumpTo:"Go",
        jumpPage: "Page numbe",
        jumpSubtitle: "Subtitle number",
        original: "Original",
        translated: "Translated",
        num: "Page",
        page: ""
      }
    }
  },
  ja: {
    subtitle: {
      title: "字幕翻訳・編集ツール",
      systemPrompt: {
        label: "システムプロンプト（任意）",
        placeholder: [
          "翻訳要件を入力してください。例：「日常的な言葉を使用してください」、または作品のキャラクターやストーリーの背景など",
          "",
          "注意：字幕文が不自然な場合、翻訳のズレが発生する可能性があります"
        ]
      },
      fileUpload: {
        label: "字幕ファイルをアップロード",
        supportText: "srtとassのみ対応"
      },
      apiSettings: {
        title: "API設定",
        keyPlaceholder: "APIキーが未入力の場合、デフォルトAPIを使用します",
        urlPlaceholder: "API URL"
      },
      translation: {
        temperature: {
          label: "Temperature",
          conservative: "より保守的",
          creative: "よりクリエイティブ"
        },
        batch: {
          label: "翻訳バッチ数（推奨：5以上）"
        },
        progress: "完了",
        start: "翻訳開始"
      },
      preview: {
        title: "字幕プレビュー・編集",
        total: "総字幕数",
        range: "現在の範囲",
        save: "保存してダウンロード",
        display: "表示件数",
        jumpTo: "移動",
        jumpPage: "ページ番号",
        jumpSubtitle: "字幕番号",
        original: "原文",
        translated: "訳文",
        num: "",
        page: "ページ"
      }
    }
  },
  ko: {
    subtitle: {
      title: "자막 번역 및 편집 도구",
      systemPrompt: {
        label: "시스템 프롬프트 (선택사항)",
        placeholder: [
          "번역 요구사항을 입력하세요. 예: \"일상적인 언어를 사용해 주세요\", 또는 작품의 캐릭터와 스토리 배경 등",
          "",
          "주의: 자막 문장이 부자연스러운 경우 번역이 어긋날 수 있습니다"
        ]
      },
      fileUpload: {
        label: "자막 파일 업로드",
        supportText: "srt 및 ass 형식만 지원"
      },
      apiSettings: {
        title: "API 설정",
        keyPlaceholder: "API 키를 입력하지 않으면 기본 API를 사용합니다",
        urlPlaceholder: "API URL"
      },
      translation: {
        temperature: {
          label: "Temperature",
          conservative: "더 보수적",
          creative: "더 창의적"
        },
        batch: {
          label: "번역 배치 수 (권장: 5회 이상)"
        },
        progress: "완료",
        start: "번역 시작"
      },
      preview: {
        title: "자막 미리보기 및 편집",
        total: "전체 자막 수",
        range: "현재 범위",
        save: "저장 및 다운로드",
        display: "페이지당 표시",
        jumpTo: "이동",
        jumpPage: "페이지 번호",
        jumpSubtitle: "자막 번호",
        original: "원문",
        translated: "번역",
        num: "",
        page: "페이지"
      }
    }
  }
};


export const getBrowserLanguage = (): LanguageKey => {
    // 如果不在浏览器环境，返回默认语言
    if (typeof window === 'undefined') return 'en';
    
    try {
      const fullLang = navigator.language.toLowerCase();
      const shortLang = fullLang.split('-')[0] as string;
      
      // 使用 defaultTranslations 替代 translations
      if (fullLang in defaultTranslations) {
        return fullLang as LanguageKey;
      }
      
      if (shortLang in defaultTranslations) {
        return shortLang as LanguageKey;
      }
    } catch (error) {
      // 忽略错误
    }
    
    // 默认返回英语
    return 'en';
  };
  
  export const useTranslation = () => {
    const [currentTranslations, setCurrentTranslations] = useState(defaultTranslations['en']);
    const [isLoading, setIsLoading] = useState(true);
  
    useEffect(() => {
      const lang = getBrowserLanguage();
      setCurrentTranslations(defaultTranslations[lang]);
      setIsLoading(false);
    }, []);
  
    return { ...currentTranslations, isLoading };
  };
  
  // UI 界面语言选项
  export const UI_LANGUAGE_OPTIONS: LanguageOption[] = [
    { value: 'zh', label: '中文' },
    { value: 'en', label: 'English' },
    { value: 'ja', label: '日本語' },
    { value: 'ko', label: '한국어' }
  ];
  
  // 翻译目标语言选项
  export const TRANSLATION_TARGET_OPTIONS = [
    { value: 'zh', label: '中文' },
    { value: 'en', label: 'English' },
    { value: 'ja', label: '日本語' },
    { value: 'ko', label: '한国語' },
    { value: 'fr', label: 'Français' },
    { value: 'de', label: 'Deutsch' },
    { value: 'es', label: 'Español' },
    { value: 'ru', label: 'Русский' }
  ];
  
  export type { LanguageKey, TranslationDict, LanguageOption };