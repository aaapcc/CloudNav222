import { Category, LinkItem } from "../types";

/**
 * Generates a Netscape Bookmark HTML string compatible with Chrome/Edge/Firefox import.
 */
export const generateBookmarkHtml = (links: LinkItem[], categories: Category[]): string => {
  const now = Math.floor(Date.now() / 1000);

  let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
`;

  // Helper to escape HTML special characters
  const escapeHtml = (unsafe: string) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // Group links by category
  const linksByCat = new Map<string, LinkItem[]>();
  links.forEach(link => {
    const list = linksByCat.get(link.categoryId) || [];
    list.push(link);
    linksByCat.set(link.categoryId, list);
  });

  // 递归函数：渲染分类及其子分类
  const renderCategory = (cat: Category, level: number = 1): string => {
    let result = '';
    const indent = '    '.repeat(level);
    const childIndent = '    '.repeat(level + 1);
    
    const catLinks = linksByCat.get(cat.id) || [];
    const childCats = categories.filter(c => c.parentId === cat.id);
    
    // 如果当前分类没有链接且没有子分类，跳过
    if (catLinks.length === 0 && childCats.length === 0) {
      return '';
    }
    
    // 分类标题
    result += `${indent}<DT><H3 ADD_DATE="${now}" LAST_MODIFIED="${now}">${escapeHtml(cat.name)}</H3>\n`;
    result += `${indent}<DL><p>\n`;
    
    // 先渲染当前分类的链接
    catLinks.forEach(link => {
      const date = Math.floor(link.createdAt / 1000);
      const iconAttr = link.icon ? ` ICON="${link.icon}"` : '';
      result += `${childIndent}<DT><A HREF="${link.url}" ADD_DATE="${date}"${iconAttr}>${escapeHtml(link.title)}</A>\n`;
    });
    
    // 再递归渲染子分类
    childCats.forEach(child => {
      result += renderCategory(child, level + 1);
    });
    
    result += `${indent}</DL><p>\n`;
    
    return result;
  };

  // 获取顶级分类（没有 parentId 的）
  const topLevelCats = categories.filter(c => !c.parentId);
  
  // 渲染所有顶级分类
  topLevelCats.forEach(cat => {
    html += renderCategory(cat, 1);
  });

  // 处理未分类的链接（categoryId 不存在于 categories 中）
  const validCatIds = new Set(categories.map(c => c.id));
  const uncategorized = links.filter(l => !validCatIds.has(l.categoryId));

  if (uncategorized.length > 0) {
    html += `    <DT><H3 ADD_DATE="${now}" LAST_MODIFIED="${now}">未分类</H3>\n`;
    html += `    <DL><p>\n`;
    uncategorized.forEach(link => {
        const date = Math.floor(link.createdAt / 1000);
        html += `        <DT><A HREF="${link.url}" ADD_DATE="${date}">${escapeHtml(link.title)}</A>\n`;
    });
    html += `    </DL><p>\n`;
  }

  html += `</DL><p>`;

  return html;
};

export const downloadHtmlFile = (content: string, filename: string = 'bookmarks.html') => {
  const blob = new Blob([content], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};