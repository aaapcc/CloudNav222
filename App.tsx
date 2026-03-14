import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom'; // 新增：路由相关
import { 
  Search, Plus, Upload, Moon, Sun, Menu, 
  Trash2, Edit2, Loader2, Cloud, CheckCircle2, AlertCircle,
  Pin, Settings, Lock, CloudCog, Github, GitFork, MoreVertical,
  QrCode, Copy, LayoutGrid, List, Check, ExternalLink, ArrowRight,
  ChevronRight, ChevronDown
} from 'lucide-react';
import { 
    LinkItem, Category, DEFAULT_CATEGORIES, INITIAL_LINKS, 
    WebDavConfig, AIConfig, SiteSettings, SearchEngine, DEFAULT_SEARCH_ENGINES 
} from './types';
import Icon from './components/Icon';
import LinkModal from './components/LinkModal';
import AuthModal from './components/AuthModal';
import CategoryManagerModal from './components/CategoryManagerModal';
import BackupModal from './components/BackupModal';
import CategoryAuthModal from './components/CategoryAuthModal';
import ImportModal from './components/ImportModal';
import SettingsModal from './components/SettingsModal';
import SearchSettingsModal from './components/SearchSettingsModal';

const GITHUB_REPO_URL = 'https://github.com/sese972010/CloudNav-';

const LOCAL_STORAGE_KEY = 'cloudnav_data_cache';
const AUTH_KEY = 'cloudnav_auth_token';
const WEBDAV_CONFIG_KEY = 'cloudnav_webdav_config';
const AI_CONFIG_KEY = 'cloudnav_ai_config';
const SEARCH_ENGINES_KEY = 'cloudnav_search_engines';

function App() {
  const navigate = useNavigate(); // 新增：用于页面跳转
  const { categoryId } = useParams<{ categoryId: string }>(); // 新增：获取URL参数

  // --- State ---
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all'); 
  const [searchQuery, setSearchQuery] = useState('');
  
  // New Search State
  const [searchMode, setSearchMode] = useState<'local' | 'external'>('local');
  const [externalEngines, setExternalEngines] = useState<SearchEngine[]>(() => {
      const saved = localStorage.getItem(SEARCH_ENGINES_KEY);
      if (saved) {
          try { return JSON.parse(saved); } catch(e) {}
      }
      // Filter out 'local' from defaults for the external list
      return DEFAULT_SEARCH_ENGINES.filter(e => e.id !== 'local');
  });
  const [activeEngineId, setActiveEngineId] = useState<string>(() => {
      return externalEngines[0]?.id || 'google';
  });
  const [isSearchSettingsOpen, setIsSearchSettingsOpen] = useState(false);

  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Site Settings - Initialized with defaults to prevent crash
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
      title: 'CloudNav - 我的导航',
      navTitle: '云航 CloudNav',
      favicon: '',
      cardStyle: 'detailed'
  });
  
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, link: LinkItem | null } | null>(null);
  
  const [qrCodeLink, setQrCodeLink] = useState<LinkItem | null>(null);

  const [unlockedCategoryIds, setUnlockedCategoryIds] = useState<Set<string>>(new Set());

  const [webDavConfig, setWebDavConfig] = useState<WebDavConfig>({
      url: '',
      username: '',
      password: '',
      enabled: false
  });

  const [aiConfig, setAiConfig] = useState<AIConfig>(() => {
      const saved = localStorage.getItem(AI_CONFIG_KEY);
      if (saved) {
          try {
              return JSON.parse(saved);
          } catch (e) {}
      }
      
      // Safe access to process env
      let defaultKey = '';
      try {
          if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
              defaultKey = process.env.API_KEY;
          }
      } catch(e) {}

      return {
          provider: 'gemini',
          apiKey: defaultKey, 
          baseUrl: '',
          model: 'gemini-2.5-flash'
      };
  });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCatManagerOpen, setIsCatManagerOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [catAuthModalData, setCatAuthModalData] = useState<Category | null>(null);
  
  const [editingLink, setEditingLink] = useState<LinkItem | undefined>(undefined);
  const [prefillLink, setPrefillLink] = useState<Partial<LinkItem> | undefined>(undefined);
  
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [authToken, setAuthToken] = useState<string>('');
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [detailCategoryId, setDetailCategoryId] = useState<string | null>(null);

  const mainRef = useRef<HTMLDivElement>(null);
  const isAutoScrollingRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // 新增：监听URL参数变化，同步 detailCategoryId
  useEffect(() => {
    if (categoryId) {
      setDetailCategoryId(categoryId);
      // 当进入分类详情页时，滚动到顶部
      setTimeout(() => {
        if (mainRef.current) {
          mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 100); // 稍微延迟一下，确保内容已经渲染
    } else {
      setDetailCategoryId(null);
    }
  }, [categoryId]);

  // 安全地获取顶级分类
  const getTopLevelCategories = useMemo(() => {
    return categories.filter(cat => !cat.parentId);
  }, [categories]);

  // 安全地获取子分类
  const getSubCategories = (parentId: string) => {
    return categories.filter(cat => cat.parentId === parentId);
  };

  // --- Helpers ---

  const loadFromLocal = () => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setLinks(parsed.links || INITIAL_LINKS);
        setCategories(parsed.categories || DEFAULT_CATEGORIES);
        if (parsed.settings) setSiteSettings(prev => ({ ...prev, ...parsed.settings }));

        // 设置默认折叠状态
        const initialCollapsed = new Set<string>();
        (parsed.categories || DEFAULT_CATEGORIES).forEach((cat: Category) => {
          const hasChildren = (parsed.categories || DEFAULT_CATEGORIES).some((c: Category) => c.parentId === cat.id);
          if (hasChildren) {
            initialCollapsed.add(cat.id);
          }
        });
        setCollapsedFolders(initialCollapsed);
        setIsDataLoaded(true);

      } catch (e) {
        setLinks(INITIAL_LINKS);
        setCategories(DEFAULT_CATEGORIES);
        setIsDataLoaded(true);
      }
    } else {
      setLinks(INITIAL_LINKS);
      setCategories(DEFAULT_CATEGORIES);
      setIsDataLoaded(true);
    }
  };

  const syncToCloud = async (newLinks: LinkItem[], newCategories: Category[], newSettings: SiteSettings, token: string) => {
    setSyncStatus('saving');
    try {
        const response = await fetch('/api/storage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-password': token
            },
            body: JSON.stringify({ links: newLinks, categories: newCategories, settings: newSettings })
        });

        if (response.status === 401) {
            setAuthToken('');
            localStorage.removeItem(AUTH_KEY);
            setIsAuthOpen(true);
            setSyncStatus('error');
            return false;
        }

        if (!response.ok) throw new Error('Network response was not ok');
        
        setSyncStatus('saved');
        setTimeout(() => setSyncStatus('idle'), 2000);
        return true;
    } catch (error) {
        console.error("Sync failed", error);
        setSyncStatus('error');
        return false;
    }
  };

  const updateData = (newLinks: LinkItem[], newCategories: Category[], newSettings: SiteSettings = siteSettings) => {
      setLinks(newLinks);
      setCategories(newCategories);
      setSiteSettings(newSettings);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ links: newLinks, categories: newCategories, settings: newSettings }));
      if (authToken) {
          syncToCloud(newLinks, newCategories, newSettings, authToken);
      }
  };

  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
    const savedToken = localStorage.getItem(AUTH_KEY);
    if (savedToken) setAuthToken(savedToken);

    const savedWebDav = localStorage.getItem(WEBDAV_CONFIG_KEY);
    if (savedWebDav) {
        try {
            setWebDavConfig(JSON.parse(savedWebDav));
        } catch (e) {}
    }

    const urlParams = new URLSearchParams(window.location.search);
    const addUrl = urlParams.get('add_url');
    if (addUrl) {
        const addTitle = urlParams.get('add_title') || '';
        window.history.replaceState({}, '', window.location.pathname);
        setPrefillLink({
            title: addTitle,
            url: addUrl,
            categoryId: 'common'
        });
        setEditingLink(undefined);
        setIsModalOpen(true);
    }

    const initData = async () => {
        try {
            const res = await fetch('/api/storage');
            if (res.ok) {
                const data = await res.json();
                if (data.links && data.links.length > 0) {
                    setLinks(data.links);
                    setCategories(data.categories || DEFAULT_CATEGORIES);
                    if (data.settings) setSiteSettings(prev => ({ ...prev, ...data.settings }));
                    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));

                    // 数据加载完成后，设置默认折叠状态
                    const initialCollapsed = new Set<string>();
                    (data.categories || DEFAULT_CATEGORIES).forEach((cat: Category) => {
                        const hasChildren = (data.categories || DEFAULT_CATEGORIES).some((c: Category) => c.parentId === cat.id);
                        if (hasChildren) {
                            initialCollapsed.add(cat.id);
                        }
                    });
                    setCollapsedFolders(initialCollapsed);
                    setIsDataLoaded(true);

                    return;
                }
            } 
        } catch (e) {
            console.warn("Failed to fetch from cloud, falling back to local.", e);
        }
        loadFromLocal();
    };

    initData();
  }, []);

  useEffect(() => {
      document.title = siteSettings.title || 'CloudNav';
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link && siteSettings.favicon) {
          link.href = siteSettings.favicon;
      }
  }, [siteSettings]);

  useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
          if (openMenuId) setOpenMenuId(null);
          if (contextMenu && contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
             setContextMenu(null);
          }
      };
      
      const handleScroll = () => {
         if (contextMenu) setContextMenu(null);
      };

      window.addEventListener('click', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true); 
      
      const handleGlobalContextMenu = (e: MouseEvent) => {
          if (contextMenu) {
              e.preventDefault();
              setContextMenu(null);
          }
      }
      window.addEventListener('contextmenu', handleGlobalContextMenu);

      return () => {
          window.removeEventListener('click', handleClickOutside);
          window.removeEventListener('scroll', handleScroll, true);
          window.removeEventListener('contextmenu', handleGlobalContextMenu);
      }
  }, [openMenuId, contextMenu]);

  useEffect(() => {
    const handleScroll = () => {
        if (isAutoScrollingRef.current) return;
        if (!mainRef.current) return;
        
        const scrollPosition = mainRef.current.scrollTop + 150;

        if (mainRef.current.scrollTop < 80) {
            setActiveCategory('all');
            return;
        }

        let currentCatId = 'all';
        for (const cat of categories) {
            const el = document.getElementById(`cat-${cat.id}`);
            if (el && el.offsetTop <= scrollPosition && (el.offsetTop + el.offsetHeight) > scrollPosition) {
                currentCatId = cat.id;
                break;
            }
        }
        if (currentCatId !== 'all') setActiveCategory(currentCatId);
    };

    const mainEl = mainRef.current;
    if (mainEl) mainEl.addEventListener('scroll', handleScroll);
    return () => mainEl?.removeEventListener('scroll', handleScroll);
  }, [categories]);

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // --- Handlers ---
  const handleLogin = async (password: string): Promise<boolean> => {
      try {
        const response = await fetch('/api/storage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-password': password
            },
            body: JSON.stringify({ links, categories, settings: siteSettings })
        });
        
        if (response.ok) {
            setAuthToken(password);
            localStorage.setItem(AUTH_KEY, password);
            setIsAuthOpen(false);
            setSyncStatus('saved');
            return true;
        }
        return false;
      } catch (e) {
          return false;
      }
  };

  const handleImportConfirm = (newLinks: LinkItem[], newCategories: Category[]) => {
      const mergedCategories = [...categories];
      newCategories.forEach(nc => {
          if (!mergedCategories.some(c => c.id === nc.id || c.name === nc.name)) {
              mergedCategories.push(nc);
          }
      });
      const mergedLinks = [...links, ...newLinks];
      updateData(mergedLinks, mergedCategories);
      setIsImportModalOpen(false);
      alert(`成功导入 ${newLinks.length} 个新书签!`);
  };

  const handleAddLink = (data: Omit<LinkItem, 'id' | 'createdAt'>) => {
    if (!authToken) { setIsAuthOpen(true); return; }
    const newLink: LinkItem = {
      ...data,
      id: Date.now().toString(),
      createdAt: Date.now()
    };
    updateData([newLink, ...links], categories);
    setPrefillLink(undefined);
  };

  const handleEditLink = (data: Omit<LinkItem, 'id' | 'createdAt'>) => {
    if (!authToken) { setIsAuthOpen(true); return; }
    if (!editingLink) return;
    const updated = links.map(l => l.id === editingLink.id ? { ...l, ...data } : l);
    updateData(updated, categories);
    setEditingLink(undefined);
  };

  const handleDeleteLink = (id: string) => {
    if (!authToken) { setIsAuthOpen(true); return; }
    if (confirm('确定删除此链接吗?')) {
      updateData(links.filter(l => l.id !== id), categories);
    }
  };

  const togglePin = (id: string) => {
      if (!authToken) { setIsAuthOpen(true); return; }
      const updated = links.map(l => l.id === id ? { ...l, pinned: !l.pinned } : l);
      updateData(updated, categories);
  };
  
  const handleCopyLink = (text: string) => {
      navigator.clipboard.writeText(text);
  };

  const handleSaveAIConfig = (config: AIConfig, newSiteSettings: SiteSettings) => {
      setAiConfig(config);
      localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
      if (authToken) {
          updateData(links, categories, newSiteSettings);
      } else {
          setSiteSettings(newSiteSettings);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ links, categories, settings: newSiteSettings }));
      }
  };

  const scrollToCategory = (catId: string) => {
      setActiveCategory(catId);
      setSidebarOpen(false);
      
      if (catId === 'all') {
          isAutoScrollingRef.current = true;
          mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
          setTimeout(() => isAutoScrollingRef.current = false, 800);
          return;
      }
      const el = document.getElementById(`cat-${catId}`);
      if (el) {
          isAutoScrollingRef.current = true;
          const top = el.offsetTop - 80;
          mainRef.current?.scrollTo({ top, behavior: 'smooth' });
          setTimeout(() => isAutoScrollingRef.current = false, 800);
      }
  };

  const handleUnlockCategory = (catId: string) => {
      setUnlockedCategoryIds(prev => new Set(prev).add(catId));
  };

  const handleUpdateCategories = (newCats: Category[], newLinks?: LinkItem[]) => {
      if (!authToken) { setIsAuthOpen(true); return; }
      updateData(newLinks || links, newCats);
  };

  const handleDeleteCategory = (catId: string) => {
      if (!authToken) { setIsAuthOpen(true); return; }
      const newCats = categories.filter(c => c.id !== catId);
      const targetId = 'common'; 
      const newLinks = links.map(l => l.categoryId === catId ? { ...l, categoryId: targetId } : l);
      if (newCats.length === 0) newCats.push(DEFAULT_CATEGORIES[0]);
      updateData(newLinks, newCats);
  };

  const handleSaveWebDavConfig = (config: WebDavConfig) => {
      setWebDavConfig(config);
      localStorage.setItem(WEBDAV_CONFIG_KEY, JSON.stringify(config));
  };

  const handleRestoreBackup = (restoredLinks: LinkItem[], restoredCategories: Category[]) => {
      updateData(restoredLinks, restoredCategories);
      setIsBackupModalOpen(false);
  };
  
  // Updated Search Logic
  const handleSearchSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!searchQuery.trim()) return;
      
      if (searchMode === 'external') {
          const engine = externalEngines.find(e => e.id === activeEngineId) || externalEngines[0];
          if (engine) {
              window.open(engine.url + encodeURIComponent(searchQuery), '_blank');
              setSearchQuery('');
          }
      }
  };

  const handleUpdateSearchEngines = (newEngines: SearchEngine[]) => {
      setExternalEngines(newEngines);
      localStorage.setItem(SEARCH_ENGINES_KEY, JSON.stringify(newEngines));
  };

  const isCategoryLocked = (catId: string) => {
      const cat = categories.find(c => c.id === catId);
      if (!cat || !cat.password) return false;
      return !unlockedCategoryIds.has(catId);
  };

  const pinnedLinks = useMemo(() => {
      return links.filter(l => l.pinned && !isCategoryLocked(l.categoryId));
  }, [links, categories, unlockedCategoryIds]);

  const searchResults = useMemo(() => {
    // Only filter locally if mode is 'local'
    if (searchMode !== 'local') return links;

    let result = links;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l => 
        l.title.toLowerCase().includes(q) || 
        l.url.toLowerCase().includes(q) ||
        (l.description && l.description.toLowerCase().includes(q))
      );
    }
    return result;
  }, [links, searchQuery, searchMode]);

  const activeExternalEngine = useMemo(() => {
      return externalEngines.find(e => e.id === activeEngineId) || externalEngines[0];
  }, [externalEngines, activeEngineId]);

  // 处理更多按钮点击 - 使用路由跳转
  const handleMoreClick = (catId: string) => {
    navigate(`/category/${catId}`);
    // 立即将滚动位置设置到顶部
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  };

  // 处理返回首页 - 使用路由跳转
  const handleBackToHome = () => {
    navigate('/');
    // 返回首页时也滚动到顶部
    setTimeout(() => {
      if (mainRef.current) {
        mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 50);
  };

  // --- Render Components ---

  const renderLinkCard = (link: LinkItem) => {
      const iconDisplay = link.icon ? (
         <img 
            src={link.icon} 
            alt="" 
            className="w-5 h-5 object-contain" 
            onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerText = link.title.charAt(0);
            }}
         />
      ) : link.title.charAt(0);
      
      const isSimple = siteSettings.cardStyle === 'simple';
      
      // 使用普通的 let 变量，而不是 useRef
      let longPressTimer: NodeJS.Timeout | null = null;
      
      const handleTouchStart = (e: React.TouchEvent, link: LinkItem) => {
        longPressTimer = setTimeout(() => {
          // 触发长按菜单
          let x = e.touches[0].clientX;
          let y = e.touches[0].clientY;
          // 边界调整
          if (x + 180 > window.innerWidth) x = window.innerWidth - 190;
          if (y + 220 > window.innerHeight) y = window.innerHeight - 230;
          setContextMenu({ x, y, link });
          
          // 轻微震动（如果设备支持）
          if (navigator.vibrate) {
            navigator.vibrate(50);
          }
        }, 500); // 长按500ms触发
      };
      
      const handleTouchEnd = () => {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      };
      
      const handleTouchMove = () => {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      };

      return (
        <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                let x = e.clientX;
                let y = e.clientY;
                if (x + 180 > window.innerWidth) x = window.innerWidth - 190;
                if (y + 220 > window.innerHeight) y = window.innerHeight - 230;
                setContextMenu({ x, y, link });
                return false;
            }}
            // 移动端长按事件
            onTouchStart={(e) => handleTouchStart(e, link)}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
            onTouchCancel={handleTouchEnd}
            className={`group relative flex flex-col ${isSimple ? 'p-2' : 'p-3'} bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-sm hover:shadow-lg hover:border-blue-200 dark:hover:border-slate-600 hover:-translate-y-0.5 transition-all duration-200 hover:bg-blue-50 dark:hover:bg-slate-750`}
            title={link.description || link.url}
        >
            <div className={`flex items-center gap-3 ${isSimple ? '' : 'mb-1.5'} pr-6`}>
                <div className={`${isSimple ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm'} rounded-lg bg-slate-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold uppercase shrink-0 overflow-hidden`}>
                    {iconDisplay}
                </div>
                <h3 className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate flex-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {link.title}
                </h3>
            </div>
            {!isSimple && (
                <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 h-4 w-full overflow-hidden">
                    {link.description || <span className="opacity-0">.</span>}
                </div>
            )}
        </a>
      );
  };

  return (
    <div className="flex h-full overflow-hidden text-slate-900 dark:text-slate-50" style={{ height: '100%', overflow: 'hidden' }}>
      
      {/* Right Click Context Menu */}
      {contextMenu && (
        <div 
            ref={contextMenuRef}
            className="fixed z-[9999] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-600 w-44 py-2 flex flex-col animate-in fade-in zoom-in duration-100 overflow-hidden"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
        >
            {/* 复制链接 - 所有人都可以 */}
            <button 
                onClick={() => { handleCopyLink(contextMenu.link!.url); setContextMenu(null); }} 
                className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors text-left"
            >
                <Copy size={16} className="text-slate-400"/> <span>复制链接</span>
            </button>
            
            {/* 显示二维码 - 所有人都可以 */}
            <button 
                onClick={() => { setQrCodeLink(contextMenu.link); setContextMenu(null); }} 
                className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors text-left"
            >
                <QrCode size={16} className="text-slate-400"/> <span>显示二维码</span>
            </button>

            {/* 只有登录用户才显示下面的操作 */}
            {authToken && (
                <>
                    <div className="h-px bg-slate-100 dark:bg-slate-700 my-1 mx-2"/>
                    
                    {/* 编辑链接 */}
                    <button 
                        onClick={() => { 
                            setEditingLink(contextMenu.link!); 
                            setIsModalOpen(true); 
                            setContextMenu(null); 
                        }} 
                        className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors text-left"
                    >
                        <Edit2 size={16} className="text-slate-400"/> <span>编辑链接</span>
                    </button>
                    
                    {/* 置顶/取消置顶 */}
                    <button 
                        onClick={() => { 
                            togglePin(contextMenu.link!.id); 
                            setContextMenu(null); 
                        }} 
                        className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors text-left"
                    >
                        <Pin size={16} className={contextMenu.link!.pinned ? "fill-current text-blue-500" : "text-slate-400"}/> 
                        <span>{contextMenu.link!.pinned ? '取消置顶' : '置顶'}</span>
                    </button>
                    
                    <div className="h-px bg-slate-100 dark:bg-slate-700 my-1 mx-2"/>
                    
                    {/* 删除链接 */}
                    <button 
                        onClick={() => { 
                            handleDeleteLink(contextMenu.link!.id); 
                            setContextMenu(null); 
                        }} 
                        className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors text-left"
                    >
                        <Trash2 size={16}/> <span>删除链接</span>
                    </button>
                </>
            )}
        </div>
      )}

      {/* QR Code Modal */}
      {qrCodeLink && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setQrCodeLink(null)}>
              <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                  <h3 className="font-bold text-lg text-slate-800">{qrCodeLink.title}</h3>
                  <div className="p-2 border border-slate-200 rounded-lg">
                    <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrCodeLink.url)}`} 
                        alt="QR Code" 
                        className="w-48 h-48"
                    />
                  </div>
                  <p className="text-xs text-slate-500 max-w-[200px] truncate">{qrCodeLink.url}</p>
              </div>
          </div>
      )}

      <AuthModal 
        isOpen={isAuthOpen} 
        onLogin={handleLogin}
        onClose={() => setIsAuthOpen(false)}
      />
      
      <CategoryAuthModal 
        isOpen={!!catAuthModalData}
        category={catAuthModalData}
        onClose={() => setCatAuthModalData(null)}
        onUnlock={handleUnlockCategory}
      />

      <CategoryManagerModal 
        isOpen={isCatManagerOpen} 
        onClose={() => setIsCatManagerOpen(false)}
        categories={categories}
        links={links}
        onUpdateCategories={handleUpdateCategories}
        onDeleteCategory={handleDeleteCategory}
      />

      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        links={links}
        categories={categories}
        onRestore={handleRestoreBackup}
        webDavConfig={webDavConfig}
        onSaveWebDavConfig={handleSaveWebDavConfig}
      />

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        existingLinks={links}
        categories={categories}
        onImport={handleImportConfirm}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        config={aiConfig}
        siteSettings={siteSettings}
        onSave={handleSaveAIConfig}
        links={links}
        categories={categories}
        onUpdateLinks={(newLinks) => updateData(newLinks, categories)}
      />

      <SearchSettingsModal
        isOpen={isSearchSettingsOpen}
        onClose={() => setIsSearchSettingsOpen(false)}
        engines={externalEngines}
        activeEngineId={activeEngineId}
        onUpdateEngines={handleUpdateSearchEngines}
        onSelectEngine={setActiveEngineId}
      />

      {/* Sidebar Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/50 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed lg:static inset-y-0 left-0 z-30 w-64 transform transition-transform duration-300 ease-in-out
          bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="h-16 flex items-center px-6 border-b border-slate-100 dark:border-slate-700 shrink-0 gap-3">
             <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/30 overflow-hidden">
                 {siteSettings.favicon ? (
                    <img src={siteSettings.favicon} alt="" className="w-full h-full object-cover" />
                 ) : (
                    "C"
                 )}
             </div>
            <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent truncate">
              {siteSettings.navTitle || 'CloudNav'}
            </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-hide">
            <button
              onClick={() => scrollToCategory('all')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeCategory === 'all' 
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <div className="p-1"><Icon name="LayoutGrid" size={18} /></div>
              <span>全部链接</span>
            </button>
            
            <div className="flex items-center justify-between pt-4 pb-2 px-4">
               <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">分类目录</span>
               {authToken && (
                 <button 
                    onClick={() => { if(!authToken) setIsAuthOpen(true); else setIsCatManagerOpen(true); }}
                    className="p-1 text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                    title="管理分类"
                 >
                    <Settings size={14} />
                 </button>
               )}
            </div>

            {/* 左侧菜单过滤，先过滤出可见的分类，然后再渲染 */}
            {getTopLevelCategories
              .filter(cat => {
                if (authToken) return cat.isVisible !== false;
                return cat.isVisible !== false && !cat.isAdminOnly;
              })
              .map(cat => {
                const isLocked = cat.password && !unlockedCategoryIds.has(cat.id);
                const isEmoji = cat.icon && cat.icon.length <= 4 && !/^[a-zA-Z]+$/.test(cat.icon);
                
                // 获取子分类
                const subCategories = categories.filter(sub => 
                  sub.parentId === cat.id && 
                  (authToken ? sub.isVisible !== false : sub.isVisible !== false && !sub.isAdminOnly)
                );
                
                const hasChildren = subCategories.length > 0;
                // 默认是折叠的（collapsed 为 true）
                const isCollapsed = collapsedFolders.has(cat.id);

                return (
                  <div key={cat.id} className="space-y-1">
                    {/* 顶级分类 */}
                    <div className="flex items-center w-full">
                      <button
                        onClick={() => scrollToCategory(cat.id)}
                        className={`flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all group ${
                          activeCategory === cat.id 
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium' 
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${activeCategory === cat.id ? 'bg-blue-100 dark:bg-blue-800' : 'bg-slate-100 dark:bg-slate-800'}`}>
                          {isLocked ? <Lock size={16} className="text-amber-500" /> : (isEmoji ? <span className="text-base leading-none">{cat.icon}</span> : <Icon name={cat.icon} size={16} />)}
                        </div>
                        <span className="truncate flex-1 text-left">
                          {cat.name}
                          {cat.isAdminOnly && authToken && (
                            <span className="ml-1.5 inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800">管</span>
                          )}
                        </span>
                      </button>
                      
                      {/* 箭头移到右侧 */}
                      {hasChildren && (
                        <button
                          onClick={() => {
                            setCollapsedFolders(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(cat.id)) {
                                newSet.delete(cat.id);  // 如果已经折叠，就展开
                              } else {
                                newSet.add(cat.id);      // 如果已经展开，就折叠
                              }
                              return newSet;
                            });
                          }}
                          className="p-2 ml-1 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                        </button>
                      )}
                    </div>
                    
                    {/* 子分类 - 默认不显示（因为 isCollapsed 初始为 true） */}
                    {!isCollapsed && hasChildren && (
                      <div className="ml-6 space-y-1">
                        {subCategories.map(sub => {
                          const isSubLocked = sub.password && !unlockedCategoryIds.has(sub.id);
                          const isSubEmoji = sub.icon && sub.icon.length <= 4 && !/^[a-zA-Z]+$/.test(sub.icon);
                          
                          return (
                            <button
                              key={sub.id}
                              onClick={() => scrollToCategory(sub.id)}
                              className={`w-full flex items-center gap-2 px-4 py-1.5 rounded-lg transition-all text-sm ${
                                activeCategory === sub.id 
                                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                              }`}
                            >
                              <div className="w-4 h-4 flex items-center justify-center">
                                {isSubLocked ? <Lock size={12} className="text-amber-500" /> : (isSubEmoji ? <span className="text-xs">{sub.icon}</span> : <Icon name={sub.icon} size={12} />)}
                              </div>
                              <span className="truncate flex-1 text-left flex items-center gap-1">
                                {sub.name}
                                {/* 新增：二级分类的「管」图标 */}
                                {sub.isAdminOnly && authToken && (
                                  <span className="inline-flex items-center px-1 rounded text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800">管</span>
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
            })}
        </div>

        {authToken && (
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
            <div className="grid grid-cols-4 gap-2 mb-2">
                <button 
                    onClick={() => { if(!authToken) setIsAuthOpen(true); else setIsImportModalOpen(true); }}
                    className="flex flex-col items-center justify-center gap-1 p-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 transition-all"
                    title="导入书签"
                >
                    <Upload size={14} />
                    <span>导入</span>
                </button>
                <button 
                    onClick={() => { if(!authToken) setIsAuthOpen(true); else setIsBackupModalOpen(true); }}
                    className="flex flex-col items-center justify-center gap-1 p-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 transition-all"
                    title="备份与恢复"
                >
                    <CloudCog size={14} />
                    <span>备份</span>
                </button>
                <button 
                    onClick={() => setIsSettingsModalOpen(true)}
                    className="flex flex-col items-center justify-center gap-1 p-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 transition-all"
                    title="AI 设置"
                >
                    <Settings size={14} />
                    <span>设置</span>
                </button>
                {/* 新增：退出登录按钮 */}
                <button 
                    onClick={() => {
                        if (confirm('确定要退出登录吗？')) {
                            setAuthToken('');
                            localStorage.removeItem(AUTH_KEY);
                            setSyncStatus('idle');
                            // 可选：刷新页面或跳转
                            window.location.reload();
                        }
                    }}
                    className="flex flex-col items-center justify-center gap-1 p-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 transition-all"
                    title="退出登录"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" x2="9" y1="12" y2="12" />
                    </svg>
                    <span>退出</span>
                </button>
            </div>
            
            <div className="flex items-center justify-between text-xs px-2 mt-2">
               <div className="flex items-center gap-1 text-slate-400">
                 {syncStatus === 'saving' && <Loader2 className="animate-spin w-3 h-3 text-blue-500" />}
                 {syncStatus === 'saved' && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                 {syncStatus === 'error' && <AlertCircle className="w-3 h-3 text-red-500" />}
                 <span className="text-green-600">已同步</span>
               </div>
            </div>
        </div>
        )}

        {/* 未登录时显示简单的登录提示 */}
        {!authToken && (
          <div className="flex sm:hidden p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
            <button
              onClick={() => setIsAuthOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 transition-all"
            >
              <Lock size={14} />
              <span>登录</span>
            </button>
          </div>
        )}
      </aside>

      <main 
          className="flex-1 flex flex-col h-full overflow-hidden relative"
          style={{ overflow: 'hidden' }}
      >
          <header className="h-16 px-4 lg:px-8 flex items-center justify-between bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 shrink-0">
            <div className="flex items-center gap-4 flex-1">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 text-slate-600 dark:text-slate-300">
                <Menu size={24} />
              </button>

              {/* Redesigned Search Bar */}
              <div className="relative w-full max-w-xl flex items-center gap-3">
                  {/* Search Mode Toggle (Pill) */}
                  <div className="bg-slate-100 dark:bg-slate-700 p-1 rounded-full hidden sm:flex items-center shrink-0">
                      <button
                          onClick={() => setSearchMode('local')}
                          className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all ${
                              searchMode === 'local' 
                              ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' 
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                          }`}
                      >
                          站内
                      </button>
                      <button
                          onClick={() => setSearchMode('external')}
                          className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all ${
                              searchMode === 'external' 
                              ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm' 
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                          }`}
                      >
                          站外
                      </button>
                  </div>

                  {/* Settings Gear (Visible only for External) */}
                  {searchMode === 'external' && (
                      <button 
                          onClick={() => setIsSearchSettingsOpen(true)}
                          className="p-2 text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors animate-in fade-in slide-in-from-left-2 duration-200 hidden sm:flex"
                          title="管理搜索引擎"
                      >
                          <Settings size={18} />
                      </button>
                  )}

                  {/* Search Input */}
                  <form onSubmit={handleSearchSubmit} className="flex-1 relative flex items-center group">
                      <input
                          ref={searchInputRef}
                          type="text"
                          placeholder={searchMode === 'local' ? "搜索书签..." : `在 ${activeExternalEngine?.name} 搜索...`}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-700/50 hover:bg-white dark:hover:bg-slate-700 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 rounded-full text-sm dark:text-white placeholder-slate-400 outline-none transition-all focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500/50"
                      />
                      <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center gap-2">
                          {searchMode === 'local' ? (
                              <Search size={16} />
                          ) : activeExternalEngine?.icon?.startsWith('http') ? (
                              <img src={activeExternalEngine.icon} className="w-4 h-4 rounded-full object-cover" />
                          ) : (
                              <Search size={16} />
                          )}
                      </div>
                      
                      {/* Visual Indicator for Search */}
                      {searchQuery && (
                          <button type="submit" className="absolute right-2 p-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-full hover:bg-blue-200 transition-colors">
                              <ArrowRight size={14} />
                          </button>
                      )}
                  </form>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-3">
              {/* 模式切换按钮 - 仅登录用户显示 */}
              {authToken && (
                <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                  <button 
                    onClick={() => updateData(links, categories, { ...siteSettings, cardStyle: 'simple' })}
                    title="简约模式"
                    className={`p-1.5 rounded transition-all ${
                      siteSettings.cardStyle === 'simple' 
                        ? 'bg-white dark:bg-slate-600 shadow text-blue-600' 
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <LayoutGrid size={16} />
                  </button>
                  <button 
                    onClick={() => updateData(links, categories, { ...siteSettings, cardStyle: 'detailed' })}
                    title="详情模式"
                    className={`p-1.5 rounded transition-all ${
                      siteSettings.cardStyle === 'detailed' 
                        ? 'bg-white dark:bg-slate-600 shadow text-blue-600' 
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <List size={16} />
                  </button>
                </div>
              )}

              <button onClick={toggleTheme} className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {!authToken && (
                  <button onClick={() => setIsAuthOpen(true)} className="hidden sm:flex items-center gap-2 bg-slate-200 dark:bg-slate-700 px-3 py-1.5 rounded-full text-xs font-medium">
                      <Cloud size={14} /> 登录
                  </button>
              )}

              {authToken && (
                <button
                  onClick={() => { if(!authToken) setIsAuthOpen(true); else { setEditingLink(undefined); setIsModalOpen(true); }}}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-full text-sm font-medium shadow-lg shadow-blue-500/30"
                >
                  <Plus size={16} /> <span className="hidden sm:inline">添加</span>
                </button>
              )}
            </div>
          </header>
          <div 
            ref={mainRef} 
            className="overflow-y-auto"
            style={{ 
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              WebkitOverflowScrolling: 'touch',
              height: 'calc(100% - 4rem)' // 明确减去头部高度 (h-16 = 4rem)
            }}
          >
            <div className="p-4 lg:p-8 space-y-8">
              {detailCategoryId ? (
                /* 分类详情页 - 替换首页内容 */
                (() => {
                    // 如果数据还没加载完，显示加载中
                    if (!isDataLoaded) {
                      return (
                        <div className="flex items-center justify-center py-20">
                          <div className="text-slate-400 flex items-center">
                            <div className="loading-spinner"></div>
                            <span>加载中...</span>
                          </div>
                        </div>
                      );
                    }

                    const cat = categories.find(c => c.id === detailCategoryId);
                    if (!cat) {
                      // 如果分类不存在，返回 404 信息
                      return (
                        <div className="text-center py-20">
                          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">分类不存在</h2>
                          <p className="text-slate-500 dark:text-slate-400 mb-8">您访问的分类ID可能已被修改或删除</p>
                          <button
                            onClick={handleBackToHome}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            返回首页
                          </button>
                        </div>
                      );
                    }
                    
                    const subCategories = getSubCategories(cat.id).filter(sub => {
                        if (authToken) return sub.isVisible !== false;
                        return sub.isVisible !== false && !sub.isAdminOnly;
                    });
                    
                    const catLinks = searchResults.filter(l => l.categoryId === cat.id);
                    const isLocked = cat.password && !unlockedCategoryIds.has(cat.id);
                    
                    return (
                        <div className="space-y-6">
                            {/* 返回首页按钮 - 使用路由跳转 */}
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => navigate('/')}
                                    className="flex items-center gap-1 px-2.5 py-1.5 text-sm bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                                    </svg>
                                    返回首页
                                </button>
                                <div className="text-sm text-slate-500">
                                    当前分类：{catLinks.length} 个链接 · {subCategories.length} 个子分类
                                </div>
                            </div>

                            {/* 分类标题 */}
                            <div className="flex items-center gap-1">
                                <div className="w-8 h-8 flex items-center justify-center">
                                    {cat.icon && cat.icon.length <= 4 && !/^[a-zA-Z]+$/.test(cat.icon) 
                                        ? <span className="text-xl">{cat.icon}</span> 
                                        : <Icon name={cat.icon} size={24} />
                                    }
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                                        {cat.name}
                                    </h1>
                                </div>
                                {cat.isAdminOnly && authToken && (
                                    <span className="ml-auto px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                                        仅管理员
                                    </span>
                                )}
                            </div>
                            
                            {/* 密码验证 */}
                            {isLocked ? (
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-12 flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4 text-amber-600 dark:text-amber-400">
                                        <Lock size={32} />
                                    </div>
                                    <h3 className="text-xl text-slate-800 dark:text-slate-200 font-medium mb-2">私密目录</h3>
                                    <p className="text-slate-500 dark:text-slate-400 mb-6">该分类已加密，需要验证密码才能查看内容</p>
                                    <button 
                                        onClick={() => setCatAuthModalData(cat)}
                                        className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
                                    >
                                        输入密码解锁
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {/* 顶级分类自己的链接 */}
                                    {catLinks.length > 0 && (
                                        <div>
                                            <div className={`grid gap-3 ${siteSettings.cardStyle === 'simple' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'}`}>
                                                {catLinks.map(link => renderLinkCard(link))}
                                            </div>
                                        </div>
                                    )}

                                    {/* 子分类 */}
                                    {subCategories.map(sub => {
                                        const subLinks = searchResults.filter(l => l.categoryId === sub.id);
                                        const isSubLocked = sub.password && !unlockedCategoryIds.has(sub.id);
                                        
                                        return (
                                            <div key={sub.id}>
                                                <div className="flex items-center gap-2 mb-4">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                        {sub.icon && sub.icon.length <= 4 && !/^[a-zA-Z]+$/.test(sub.icon) 
                                                            ? <span className="text-lg">{sub.icon}</span> 
                                                            : <Icon name={sub.icon} size={18} />
                                                        }
                                                    </div>
                                                    <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                                                        {sub.name}
                                                    </h2>
                                                    {sub.isAdminOnly && authToken && (
                                                        <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800">管</span>
                                                    )}
                                                    {isSubLocked && <Lock size={14} className="text-amber-500" />}
                                                </div>
                                                
                                                {isSubLocked ? (
                                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-8 flex flex-col items-center justify-center text-center">
                                                        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-3 text-amber-600 dark:text-amber-400">
                                                            <Lock size={24} />
                                                        </div>
                                                        <h4 className="text-slate-800 dark:text-slate-200 font-medium mb-1">私密目录</h4>
                                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">该子分类已加密，需要验证密码才能查看内容</p>
                                                        <button 
                                                            onClick={() => setCatAuthModalData(sub)}
                                                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
                                                        >
                                                            输入密码解锁
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {subLinks.length === 0 ? (
                                                            <div className="text-center py-6 text-slate-400 text-sm italic">
                                                                暂无链接
                                                            </div>
                                                        ) : (
                                                            <div className={`grid gap-3 ${siteSettings.cardStyle === 'simple' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'}`}>
                                                                {subLinks.map(link => renderLinkCard(link))}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                    
                                    {/* 如果没有内容 */}
                                    {catLinks.length === 0 && subCategories.length === 0 && (
                                        <div className="text-center py-12 text-slate-400 text-sm italic">
                                            暂无内容
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })()
              ) : (
                /* 首页内容 */
                !isDataLoaded ? (
                  // 数据还没加载完，显示加载中
                  <div className="flex items-center justify-center py-20">
                    <div className="text-slate-400 flex items-center">
                      <div className="loading-spinner"></div>
                      <span>加载中...</span>
                    </div>
                  </div>
                ) : (
                  // 数据加载完成，显示首页内容
                  <>
                    {/* 置顶链接部分 */}
                    {pinnedLinks.length > 0 && !searchQuery && (
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <Pin size={16} className="text-blue-500 fill-blue-500" />
                                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    置顶 / 常用
                                </h2>
                            </div>
                            <div className={`grid gap-3 ${siteSettings.cardStyle === 'simple' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'}`}>
                                {pinnedLinks.map(link => renderLinkCard(link))}
                            </div>
                        </section>
                    )}

                    {/* 分类列表 */}
                    {getTopLevelCategories
                      .filter(cat => {
                        if (authToken) return cat.isVisible !== false;
                        return cat.isVisible !== false && !cat.isAdminOnly;
                      })
                      .map(cat => {
                        const subCategories = getSubCategories(cat.id).filter(sub => {
                          if (authToken) return sub.isVisible !== false;
                          return sub.isVisible !== false && !sub.isAdminOnly;
                        });
                        
                        const catLinks = searchResults.filter(l => l.categoryId === cat.id);
                        const isLocked = cat.password && !unlockedCategoryIds.has(cat.id);
                        const hasChildren = subCategories.length > 0;
                        
                        if (searchQuery && searchMode === 'local' && catLinks.length === 0 && subCategories.length === 0) return null;

                        return (
                          <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-24">
                            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                              <div className="flex items-center gap-2">
                                <div className="text-slate-400">
                                  {cat.icon && cat.icon.length <= 4 && !/^[a-zA-Z]+$/.test(cat.icon) ? <span className="text-lg">{cat.icon}</span> : <Icon name={cat.icon} size={20} />}
                                </div>
                                <div className="flex items-center gap-2">
                                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                                    {cat.name}
                                  </h2>
                                  {cat.isAdminOnly && authToken && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800">管</span>
                                  )}
                                  {isLocked && <Lock size={16} className="text-amber-500" />}
                                </div>
                              </div>
                              
                              {!isLocked && (
                                <button
                                  onClick={() => handleMoreClick(cat.id)}
                                  className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                                >
                                  <span>更多</span>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m9 18 6-6-6-6"></path>
                                  </svg>
                                </button>
                              )}
                            </div>
                            
                            {isLocked ? (
                              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-8 flex flex-col items-center justify-center text-center">
                                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4 text-amber-600 dark:text-amber-400">
                                  <Lock size={24} />
                                </div>
                                <h3 className="text-slate-800 dark:text-slate-200 font-medium mb-1">私密目录</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">该分类已加密，需要验证密码才能查看内容</p>
                                <button 
                                  onClick={() => setCatAuthModalData(cat)}
                                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                  输入密码解锁
                                </button>
                              </div>
                            ) : (
                              <>
                                {/* 顶级分类自己的链接为0时显示暂无链接提示 */}
                                {catLinks.length === 0 ? (
                                  <div className="text-center py-4 text-slate-400 text-sm italic mb-6">
                                    暂无链接
                                  </div>
                                ) : (
                                  <div className={`grid gap-3 mb-6 ${siteSettings.cardStyle === 'simple' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'}`}>
                                    {catLinks.slice(0, 4).map(link => renderLinkCard(link))}
                                    {catLinks.length > 4 && (
                                      <div className="flex items-center justify-center p-4 text-sm text-slate-400 italic col-span-full">
                                        还有 {catLinks.length - 4} 个链接，点击「更多」查看全部
                                      </div>
                                    )}
                                  </div>
                                )}

                                {subCategories.slice(0, 2).map(sub => {
                                  const subLinks = searchResults.filter(l => l.categoryId === sub.id);
                                  const isSubLocked = sub.password && !unlockedCategoryIds.has(sub.id);
                                  
                                  return (
                                    <div key={sub.id} id={`cat-${sub.id}`} className="mb-6">
                                      <div className="flex items-center gap-2 mb-3">
                                        <div className="text-slate-400">
                                          {sub.icon && sub.icon.length <= 4 && !/^[a-zA-Z]+$/.test(sub.icon) ? <span className="text-lg">{sub.icon}</span> : <Icon name={sub.icon} size={18} />}
                                        </div>
                                        <h3 className="text-md font-semibold text-slate-700 dark:text-slate-300">
                                          {sub.name}
                                        </h3>
                                        {sub.isAdminOnly && authToken && (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800">管</span>
                                        )}
                                        {isSubLocked && <Lock size={14} className="text-amber-500" />}
                                      </div>
                                      
                                      {isSubLocked ? (
                                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-8 flex flex-col items-center justify-center text-center">
                                          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-3 text-amber-600 dark:text-amber-400">
                                            <Lock size={20} />
                                          </div>
                                          <h4 className="text-slate-800 dark:text-slate-200 font-medium mb-1">私密目录</h4>
                                          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">该子分类已加密，需要验证密码才能查看内容</p>
                                          <button 
                                            onClick={() => setCatAuthModalData(sub)}
                                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium transition-colors"
                                          >
                                            输入密码解锁
                                          </button>
                                        </div>
                                      ) : (
                                        <>
                                          {subLinks.length === 0 ? (
                                            <div className="text-center py-4 text-slate-400 text-sm italic">
                                              暂无链接
                                            </div>
                                          ) : (
                                            <div className={`grid gap-3 ${siteSettings.cardStyle === 'simple' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'}`}>
                                              {subLinks.slice(0, 4).map(link => renderLinkCard(link))}
                                              {subLinks.length > 4 && (
                                                <div className="flex items-center justify-center p-4 text-sm text-slate-400 italic col-span-full">
                                                  还有 {subLinks.length - 4} 个链接
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  );
                                })}
                                
                                {/* 还有 X 个子分类，点击「更多」查看全部 */}
                                {subCategories.length > 2 && (
                                  <div className="text-center py-2 text-sm text-slate-400 italic border-t border-slate-100 dark:border-slate-800 pt-4">
                                    还有 {subCategories.length - 2} 个子分类，点击
                                    <button
                                      onClick={() => handleMoreClick(cat.id)}
                                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mx-1 underline-offset-2 hover:underline italic transition-colors"
                                    >
                                      「更多」
                                    </button>
                                    查看全部
                                  </div>
                                )}
                                
                              </>
                            )}
                          </section>
                        );
                    })}
                    
                    {/* 搜索空状态 */}
                    {searchQuery && searchMode === 'local' && searchResults.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Search size={40} className="opacity-30 mb-4" />
                            <p>没有找到相关内容</p>
                            <button onClick={() => setIsModalOpen(true)} className="mt-4 text-blue-500 hover:underline">添加一个?</button>
                        </div>
                    )}
                  </>
                )
              )}
            </div>
          </div>
      </main>

      <LinkModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingLink(undefined); setPrefillLink(undefined); }}
        onSave={editingLink ? handleEditLink : handleAddLink}
        categories={categories}
        existingLinks={links}
        initialData={editingLink || (prefillLink as LinkItem)}
        aiConfig={aiConfig}
      />
    </div>
  );
}

export default App;