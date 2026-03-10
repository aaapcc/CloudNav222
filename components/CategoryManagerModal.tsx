
import React, { useState } from 'react';
import { X, ArrowUp, ArrowDown, Trash2, Edit2, Plus, Check, Lock, Merge, Smile,ChevronRight, ChevronDown, GripVertical } from 'lucide-react';
import { Category, LinkItem } from '../types';
import Icon from './Icon';

interface CategoryWithVisibility extends Category {
  isVisible?: boolean;
}

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  links: LinkItem[];
  onUpdateCategories: (newCategories: Category[], newLinks?: LinkItem[]) => void;
  onDeleteCategory: (id: string) => void;
}

// 预定义常用图标列表
const COMMON_ICONS = [
  { value: 'Folder', label: '文件夹' },
  { value: 'Star', label: '收藏/星标' },
  { value: 'Code', label: '开发/代码' },
  { value: 'Palette', label: '设计/调色板' },
  { value: 'BookOpen', label: '阅读/书籍' },
  { value: 'Gamepad2', label: '游戏/娱乐' },
  { value: 'Bot', label: '人工智能/机器人' },
  { value: 'ShoppingBag', label: '购物/商店' },
  { value: 'Globe', label: '全球/网络' },
  { value: 'Server', label: '服务器/运维' },
  { value: 'Terminal', label: '终端/系统' },
  { value: 'Cpu', label: '硬件/芯片' },
  { value: 'Music', label: '音乐' },
  { value: 'Video', label: '视频' },
  { value: 'Image', label: '图片' },
  { value: 'Mail', label: '邮箱' },
  { value: 'MessageCircle', label: '社交/聊天' },
  { value: 'Briefcase', label: '办公/工作' },
  { value: 'Cloud', label: '云服务' },
  { value: 'Shield', label: '安全' },
];

const NO_PARENT_VALUE = 'no-parent';

const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({ 
  isOpen, 
  onClose, 
  categories, 
  links,
  onUpdateCategories,
  onDeleteCategory
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editPassword, setEditPassword] = useState('');
  
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Folder');
  const [newCatPassword, setNewCatPassword] = useState('');

  const [newCatParentId, setNewCatParentId] = useState<string>(NO_PARENT_VALUE);
  const [editParentId, setEditParentId] = useState<string>(NO_PARENT_VALUE);

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());  // 记录展开的文件夹
  const [draggedItem, setDraggedItem] = useState<string | null>(null);            // 正在拖拽的分类

  // Merge State
  const [mergingCatId, setMergingCatId] = useState<string | null>(null);
  const [targetMergeId, setTargetMergeId] = useState<string>('');

  if (!isOpen) return null;

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newCats = [...categories];
    if (direction === 'up' && index > 0) {
      [newCats[index], newCats[index - 1]] = [newCats[index - 1], newCats[index]];
    } else if (direction === 'down' && index < newCats.length - 1) {
      [newCats[index], newCats[index + 1]] = [newCats[index + 1], newCats[index]];
    }
    onUpdateCategories(newCats);
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditIcon(cat.icon || 'Folder');
    setEditPassword(cat.password || '');
    setEditParentId((cat as any).parentId || NO_PARENT_VALUE);
    setMergingCatId(null);
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;
    const newCats = categories.map(c => c.id === editingId ? { 
        ...c, 
        name: editName.trim(),
        icon: editIcon.trim(),
        password: editPassword.trim() || undefined,
        parentId: editParentId === NO_PARENT_VALUE ? undefined : editParentId
    } : c);
    onUpdateCategories(newCats);
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!newCatName.trim()) return;
    const newCat: Category = {
      id: Date.now().toString(),
      name: newCatName.trim(),
      icon: newCatIcon.trim() || 'Folder',
      password: newCatPassword.trim() || undefined,
      parentId: newCatParentId === NO_PARENT_VALUE ? undefined : newCatParentId
    };
    onUpdateCategories([...categories, newCat]);
    setNewCatName('');
    setNewCatIcon('Folder');
    setNewCatPassword('');
    setNewCatParentId(NO_PARENT_VALUE);
  };

  // 切换文件夹折叠状态
  const toggleFolder = (catId: string, e: React.MouseEvent) => {
    e.stopPropagation();  // 防止触发分类点击
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(catId)) {
        newSet.delete(catId);
      } else {
        newSet.add(catId);
      }
      return newSet;
    });
  };

  // 获取分类的所有子分类（递归）
  const getAllChildrenIds = (parentId: string): string[] => {
    const children = categories.filter(c => c.parentId === parentId);
    return children.reduce((acc, child) => {
      return [...acc, child.id, ...getAllChildrenIds(child.id)];
    }, [] as string[]);
  };

  // 拖拽相关函数
  const handleDragStart = (catId: string) => {
    setDraggedItem(catId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetId: string, targetParentId?: string) => {
    if (!draggedItem || draggedItem === targetId) return;
    
    // 防止把父分类拖到子分类下面
    const allChildren = getAllChildrenIds(draggedItem);
    if (allChildren.includes(targetId)) return;
    
    // 更新分类的 parentId
    const newCategories = categories.map(c => {
      if (c.id === draggedItem) {
        return { ...c, parentId: targetParentId };
      }
      return c;
    });
    
    onUpdateCategories(newCategories);
    setDraggedItem(null);
  };
  // 👆 到这里结束

  const openMerge = (catId: string) => {
      setMergingCatId(catId);
      // Default target is first category that is not self
      const firstTarget = categories.find(c => c.id !== catId);
      if (firstTarget) setTargetMergeId(firstTarget.id);
  };

  const executeMerge = () => {
      if (!mergingCatId || !targetMergeId) return;
      if (mergingCatId === targetMergeId) return;

      if (!confirm('确定合并吗？合并后原分类将被删除。')) return;

      // 1. Move all links
      const newLinks = links.map(l => l.categoryId === mergingCatId ? { ...l, categoryId: targetMergeId } : l);

      // 2. Remove old category
      const newCats = categories.filter(c => c.id !== mergingCatId);

      onUpdateCategories(newCats, newLinks);
      setMergingCatId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold dark:text-white">分类管理</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X className="w-5 h-5 dark:text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {categories.map((cat, index) => (
            <div 
              key={cat.id} 
              className="flex flex-col p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg group gap-2 border border-slate-100 dark:border-slate-600"
              draggable={editingId !== cat.id && mergingCatId !== cat.id}
              onDragStart={() => handleDragStart(cat.id)}
              onDragOver={handleDragOver}
              onDragEnd={() => setDraggedItem(null)}
              style={{ opacity: draggedItem === cat.id ? 0.5 : 1 }}
            >
              
              {/* 第一行：拖拽手柄 + 排序按钮 + 图标 + 名称区域 + 操作按钮 */}
              <div className="flex items-start gap-2">
                
                {/* 拖拽手柄 */}
                {editingId !== cat.id && mergingCatId !== cat.id && (
                  <div className="cursor-move text-slate-400 hover:text-blue-500 mt-1">
                    <GripVertical size={16} />
                  </div>
                )}
                
                {/* 折叠/展开按钮（只有有子分类时才显示） */}
                {categories.some(c => c.parentId === cat.id) && editingId !== cat.id && mergingCatId !== cat.id && (
                  <button
                    onClick={(e) => toggleFolder(cat.id, e)}
                    className="p-0.5 text-slate-400 hover:text-blue-500"
                  >
                    {expandedFolders.has(cat.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                )}
                
                {/* 排序按钮（没有子分类时才显示） */}
                {!categories.some(c => c.parentId === cat.id) && editingId !== cat.id && mergingCatId !== cat.id && (
                  <div className="flex flex-col gap-1 mr-2 shrink-0">
                    <button 
                      onClick={() => handleMove(index, 'up')}
                      disabled={index === 0}
                      className="p-0.5 text-slate-400 hover:text-blue-500 disabled:opacity-30"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button 
                      onClick={() => handleMove(index, 'down')}
                      disabled={index === categories.length - 1}
                      className="p-0.5 text-slate-400 hover:text-blue-500 disabled:opacity-30"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>
                )}

                {/* 图标和文字区域（保持不变） */}
                {/* ... 这里放你原有的图标和文字代码 ... */}
                
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
           <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block">添加新分类</label>
           <div className="flex flex-col gap-2">
             <div className="flex gap-2">
                 <div className="relative w-32 shrink-0">
                    <select
                        value={newCatIcon}
                        onChange={(e) => setNewCatIcon(e.target.value)}
                        className="w-full p-2 pl-2 pr-8 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm outline-none appearance-none"
                    >
                        {COMMON_ICONS.map(icon => (
                            <option key={icon.value} value={icon.value}>
                                {icon.label}
                            </option>
                        ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                        <Icon name={newCatIcon} size={16} />
                    </div>
                 </div>
                 
                 <input 
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="分类名称"
                    className="flex-1 p-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                 />
             </div>
             <div className="flex gap-2">
                 <div className="flex-1 relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text"
                        value={newCatPassword}
                        onChange={(e) => setNewCatPassword(e.target.value)}
                        placeholder="密码 (可选)"
                        className="w-full pl-8 p-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    />
                 </div>
                 {/* ===== 新增：添加时的父分类选择 ===== */}
                  <div className="flex items-center gap-2 mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-slate-400">
                      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path>
                    </svg>
                    <select
                      value={newCatParentId}
                      onChange={(e) => setNewCatParentId(e.target.value)}
                      className="flex-1 p-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={NO_PARENT_VALUE}>作为顶级分类</option>
                      {categories
                        .filter(c => !c.parentId)
                        .map(parent => (
                          <option key={parent.id} value={parent.id}>
                            {parent.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  {/* ===== 新增结束 ===== */}
                 <button 
                    onClick={handleAdd}
                    disabled={!newCatName.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
                 >
                   <Plus size={18} />
                 </button>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryManagerModal;