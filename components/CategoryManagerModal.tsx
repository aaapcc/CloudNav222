
import React, { useState } from 'react';
import { X, ArrowUp, ArrowDown, Trash2, Edit2, Plus, Check, Lock, Merge, Smile } from 'lucide-react';
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
            <div key={cat.id} className="flex flex-col p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg group gap-2 border border-slate-100 dark:border-slate-600">
              
              {/* 第一行：排序按钮 + 图标 + 名称区域 + 操作按钮 */}
              <div className="flex items-start gap-2">
                
                {/* 排序按钮 */}
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

                {/* 图标和文字区域 */}
                {editingId === cat.id ? (
                  // 编辑模式
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <div className="relative w-32 shrink-0">
                          <select
                            value={editIcon}
                            onChange={(e) => setEditIcon(e.target.value)}
                            className="w-full p-1.5 text-sm rounded border border-blue-500 dark:bg-slate-800 dark:text-white outline-none appearance-none"
                          >
                            {COMMON_ICONS.map(icon => (
                              <option key={icon.value} value={icon.value}>{icon.label}</option>
                            ))}
                          </select>
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                            <Icon name={editIcon} size={14} />
                          </div>
                        </div>
                        <input 
                          type="text" 
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 p-1.5 px-2 text-sm rounded border border-blue-500 dark:bg-slate-800 dark:text-white outline-none"
                          placeholder="分类名称"
                          autoFocus
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Lock size={14} className="text-slate-400" />
                        <input 
                          type="text" 
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          className="flex-1 p-1.5 px-2 text-xs rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white outline-none"
                          placeholder="设置密码 (留空则不加密)"
                        />
                      </div>
                      {/* ===== 新增：父分类选择 ===== */}
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-slate-400">
                          <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path>
                        </svg>
                        <select
                          value={editParentId}
                          onChange={(e) => setEditParentId(e.target.value)}
                          className="flex-1 p-1.5 px-2 text-xs rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white outline-none"
                        >
                          <option value={NO_PARENT_VALUE}>作为顶级分类</option>
                          {categories
                            .filter(c => c.id !== cat.id && !c.parentId)
                            .map(parent => (
                              <option key={parent.id} value={parent.id}>
                                {parent.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      {/* ===== 新增结束 ===== */}
                    </div>
                  </div>
                ) : mergingCatId === cat.id ? (
                  // 合并模式
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                      <span className="text-sm dark:text-slate-200 whitespace-nowrap">合并到 →</span>
                      <select 
                        value={targetMergeId}
                        onChange={(e) => setTargetMergeId(e.target.value)}
                        className="flex-1 text-sm p-1 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                      >
                        {categories.filter(c => c.id !== cat.id).map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <button onClick={executeMerge} className="text-xs bg-blue-600 text-white px-2 py-1 rounded">确认</button>
                      <button onClick={() => setMergingCatId(null)} className="text-xs text-slate-500 px-2 py-1">取消</button>
                    </div>
                  </div>
                ) : (
                  // 正常显示模式
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      {/* 图标 */}
                      <div className="w-8 h-8 rounded bg-white dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 shrink-0">
                        {cat.icon && cat.icon.length <= 4 && !/^[a-zA-Z]+$/.test(cat.icon) 
                          ? <span className="text-lg">{cat.icon}</span> 
                          : <Icon name={cat.icon} size={16} />
                        }
                      </div>
                      
                      {/* 文字信息和下拉框 */}
                      <div className="flex flex-col">
                        {/* 分类名称 + 密码锁 */}
                        <div className="flex items-center gap-2">
                          <span className="font-medium dark:text-slate-200 truncate">{cat.name}</span>
                          {cat.password && <Lock size={12} className="text-amber-500 shrink-0" />}
                        </div>
                        
                        {/* 链接数量 */}
                        <span className="text-xs text-slate-400">{links.filter(l => l.categoryId === cat.id).length} 个链接</span>
                        
                        {/* 可见性下拉框 - 放在这里 */}
                        <div className="pt-2">
                          <select
                            value={
                              (cat as CategoryWithVisibility).isVisible === false ? "hidden" :
                              (cat as CategoryWithVisibility).isAdminOnly === true ? "admin" : "public"
                            }
                            onChange={(e) => {
                              const value = e.target.value;
                              let isVisible = true;
                              let isAdminOnly = false;
                              
                              if (value === "hidden") {
                                isVisible = false;
                                isAdminOnly = false;
                              } else if (value === "admin") {
                                isVisible = true;
                                isAdminOnly = true;
                              } else {
                                isVisible = true;
                                isAdminOnly = false;
                              }
                              
                              const updatedCategories = categories.map(c => 
                                c.id === cat.id ? { ...c, isVisible, isAdminOnly } : c
                              );
                              onUpdateCategories(updatedCategories);
                            }}
                            className="text-xs p-1 pr-6 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
                            style={{
                              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                              backgroundPosition: 'right 0.25rem center',
                              backgroundRepeat: 'no-repeat',
                              backgroundSize: '1.2em 1.2em',
                            }}
                          >
                            <option value="public" className="dark:bg-slate-800">全员可见</option>
                            <option value="admin" className="dark:bg-slate-800">👑 仅管理员可见</option>
                            <option value="hidden" className="dark:bg-slate-800">🚫 全员隐藏</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 操作按钮（编辑/合并/删除） */}
                {editingId !== cat.id && mergingCatId !== cat.id && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => startEdit(cat)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-slate-200 dark:hover:bg-slate-600 rounded" title="编辑">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => openMerge(cat.id)} className="p-1.5 text-slate-400 hover:text-purple-500 hover:bg-slate-200 dark:hover:bg-slate-600 rounded" title="合并">
                      <Merge size={14} />
                    </button>
                    <button 
                      onClick={() => { if(confirm(`确定删除"${cat.name}"分类吗？该分类下的书签将移动到"常用推荐"。`)) onDeleteCategory(cat.id); }}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
                      title="删除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
                
                {/* 编辑模式下的保存按钮 */}
                {editingId === cat.id && (
                  <button onClick={saveEdit} className="shrink-0 text-green-500 hover:bg-green-50 dark:hover:bg-slate-600 p-1.5 rounded bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-600">
                    <Check size={16} />
                  </button>
                )}
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