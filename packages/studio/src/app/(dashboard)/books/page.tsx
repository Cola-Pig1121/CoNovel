'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Book {
  id: string;
  title: string;
  genre: string;
  genres: string[];
  premise: string;
  targetWordCount: number;
  currentWordCount: number;
  currentChapter: number;
  totalChapters: number;
  status: string;
  createdAt: string;
}

const GENRE_OPTIONS = [
  { id: 'xianxia', name: '仙侠' }, { id: 'xuanhuan', name: '玄幻' },
  { id: 'urban', name: '都市' }, { id: 'scifi', name: '科幻' },
  { id: 'mystery', name: '悬疑' }, { id: 'historical', name: '历史' },
  { id: 'infinite', name: '无限流' }, { id: 'rebirth', name: '重生' },
  { id: 'system', name: '系统流' }, { id: 'apocalypse', name: '末日' },
  { id: 'weird', name: '诡异' }, { id: 'gaming', name: '游戏' },
  { id: 'western-fantasy', name: '西幻' }, { id: 'cultivation', name: '修真' },
  { id: 'sweet-romance', name: '甜宠' }, { id: 'palace-intrigue', name: '宫斗' },
  { id: 'military', name: '军事' }, { id: 'sports', name: '体育' },
  { id: 'time-travel', name: '穿越' }, { id: 'survival', name: '末世求生' },
  { id: 'supernatural', name: '灵异' }, { id: 'fanfic', name: '同人' },
  { id: 'rule-weird', name: '规则怪谈' }, { id: 'farming', name: '种田' },
];

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [newBook, setNewBook] = useState({ title: '', premise: '', genres: [] as string[], targetWordCount: 1000000 });

  useEffect(() => {
    fetch('/api/books').then(r => r.json()).then(data => { setBooks(data.books || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleCreateBook = async () => {
    if (!newBook.title) return;
    const res = await fetch('/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newBook.title, genre: newBook.genres[0] || 'custom', genres: newBook.genres, premise: newBook.premise, targetWordCount: newBook.targetWordCount }),
    });
    if (res.ok) {
      const book = await res.json();
      // Save premise to writing guide
      if (newBook.premise) {
        await fetch(`/api/books/${book.id}/constraints`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'writing-guide.md', content: `# 写作指南\n\n## 核心设定\n${newBook.premise}\n\n## 题材\n${newBook.genres.map(g => GENRE_OPTIONS.find(o => o.id === g)?.name || g).join('、')}\n\n## 自由编写区域\n在这里编写更多的创作约束和灵感笔记。\n` }),
        });
      }
      await fetch(`/api/books/${book.id}/style`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genre: newBook.genres.join(',') }),
      });
      setBooks([...books, book]);
      setShowWizard(false);
      window.location.href = `/books/${book.id}`;
    }
  };

  const toggleGenre = (id: string) => {
    setNewBook(p => ({ ...p, genres: p.genres.includes(id) ? p.genres.filter(g => g !== id) : [...p.genres, id] }));
  };

  const statusLabels: Record<string, string> = { planning: '策划中', writing: '写作中', reviewing: '审阅中', completed: '已完成', paused: '已暂停' };
  const getGenreNames = (book: Book) => (book.genres || [book.genre] || []).map(g => GENRE_OPTIONS.find(o => o.id === g)?.name || g).filter(Boolean);

  if (loading) return <div className="p-12 text-muted">加载中...</div>;

  return (
    <div>
      <header className="flex items-center justify-between mb-8 px-12 pt-6">
        <div>
          <h2 className="font-serif text-2xl tracking-tight">小说管理</h2>
          <p className="text-muted text-sm mt-1">管理您的小说项目</p>
        </div>
        <button onClick={() => { setShowWizard(true); setWizardStep(1); }} className="btn-editorial-primary">新建项目</button>
      </header>

      <div className="px-12 pb-12">
        {books.length === 0 ? (
          <div className="card-editorial text-center py-16">
            <p className="font-serif text-lg mb-3">开始创作您的第一部小说</p>
            <p className="text-sm text-muted mb-6">点击「新建项目」，系统会引导您完成初始设置</p>
            <button onClick={() => { setShowWizard(true); setWizardStep(1); }} className="btn-editorial-primary">创建第一个项目</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {books.map(book => (
              <div key={book.id} className="card-editorial">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <Link href={`/books/${book.id}`} className="font-serif text-lg hover:underline">{book.title}</Link>
                    <p className="text-muted text-sm mt-1">{getGenreNames(book).join('、') || '未选择题材'}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs ${book.status === 'writing' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{statusLabels[book.status] || book.status}</span>
                </div>
                {book.premise && <p className="text-xs text-muted mb-3 line-clamp-2">{book.premise}</p>}
                <div className="space-y-3 mb-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted">进度</span>
                      <span className="font-mono">{book.targetWordCount > 0 ? Math.round((book.currentWordCount / book.targetWordCount) * 100) : 0}%</span>
                    </div>
                    <div className="w-full h-1 bg-border"><div className="h-1 bg-foreground" style={{ width: `${book.targetWordCount > 0 ? (book.currentWordCount / book.targetWordCount) * 100 : 0}%` }} /></div>
                  </div>
                  <div className="flex justify-between text-sm"><span className="text-muted">章节</span><span className="font-mono">{book.totalChapters || 0} 章</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted">字数</span><span className="font-mono">{(book.currentWordCount || 0).toLocaleString()} 字</span></div>
                </div>
                <div className="flex gap-2 pt-4 border-t border-border">
                  <Link href={`/books/${book.id}`} className="btn-editorial text-xs flex-1 text-center">进入项目</Link>
                  <button onClick={async () => { if (confirm('确定删除？')) { await fetch(`/api/books/${book.id}`, { method: 'DELETE' }); setBooks(books.filter(b => b.id !== book.id)); } }} className="btn-editorial text-xs text-red-600">删除</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Onboarding Wizard */}
      {showWizard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border border-border w-[40rem] max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h3 className="font-serif text-lg">创建新项目</h3>
                <p className="text-xs text-muted mt-1">步骤 {wizardStep} / 3</p>
              </div>
              <button onClick={() => setShowWizard(false)} className="text-muted hover:text-foreground">✕</button>
            </div>
            <div className="px-6 py-3 border-b border-border">
              <div className="flex gap-2">{[1, 2, 3].map(s => <div key={s} className={`flex-1 h-1 ${s <= wizardStep ? 'bg-foreground' : 'bg-border'}`} />)}</div>
            </div>

            {wizardStep === 1 && (
              <div className="px-6 py-6 space-y-6">
                <div>
                  <h4 className="font-serif text-base mb-2">书名</h4>
                  <p className="text-xs text-muted mb-3">给您的小说起一个名字</p>
                  <input type="text" value={newBook.title} onChange={e => setNewBook({ ...newBook, title: e.target.value })} className="input-editorial" placeholder="输入书名..." autoFocus />
                </div>
                <div>
                  <h4 className="font-serif text-base mb-2">核心设定</h4>
                  <p className="text-xs text-muted mb-3">用几句话描述您的小说核心想法（可选，后续可在「约束」Tab修改）</p>
                  <textarea value={newBook.premise} onChange={e => setNewBook({ ...newBook, premise: e.target.value })} className="input-editorial" rows={4} placeholder="例如：一个普通大学生意外获得修仙传承，从此踏上逆天改命之路。他要在修仙界生存，同时寻找灭门真相..." />
                </div>
                <div className="flex justify-end">
                  <button onClick={() => setWizardStep(2)} disabled={!newBook.title} className="btn-editorial-primary">下一步</button>
                </div>
              </div>
            )}

            {wizardStep === 2 && (
              <div className="px-6 py-6 space-y-6">
                <div>
                  <h4 className="font-serif text-base mb-2">选择题材</h4>
                  <p className="text-xs text-muted mb-3">可以多选，支持混合题材（如「仙侠+重生」）</p>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {GENRE_OPTIONS.map(g => (
                    <button key={g.id} onClick={() => toggleGenre(g.id)} className={`px-3 py-2 text-sm text-left border transition-colors ${newBook.genres.includes(g.id) ? 'border-foreground bg-foreground text-background' : 'border-border hover:border-foreground/50'}`}>
                      {g.name}
                    </button>
                  ))}
                </div>
                {newBook.genres.length > 0 && <p className="text-xs text-muted">已选择：{newBook.genres.map(g => GENRE_OPTIONS.find(o => o.id === g)?.name).join('、')}</p>}
                <div className="flex justify-between">
                  <button onClick={() => setWizardStep(1)} className="btn-editorial">上一步</button>
                  <button onClick={() => setWizardStep(3)} className="btn-editorial-primary">下一步</button>
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="px-6 py-6 space-y-6">
                <div>
                  <h4 className="font-serif text-base mb-2">确认创建</h4>
                  <p className="text-xs text-muted mb-3">检查以下信息</p>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-border"><span className="text-sm text-muted">书名</span><span className="text-sm font-medium">{newBook.title || '未填写'}</span></div>
                  <div className="flex justify-between py-2 border-b border-border"><span className="text-sm text-muted">题材</span><span className="text-sm">{newBook.genres.length > 0 ? newBook.genres.map(g => GENRE_OPTIONS.find(o => o.id === g)?.name).join('、') : '未选择'}</span></div>
                  <div className="flex justify-between py-2 border-b border-border"><span className="text-sm text-muted">核心设定</span><span className="text-sm text-right max-w-xs truncate">{newBook.premise || '未填写'}</span></div>
                </div>
                <div className="card-editorial bg-muted/10">
                  <p className="text-xs text-muted mb-2">创建后您可以在项目详情页中：</p>
                  <ul className="text-xs text-muted space-y-1 list-disc list-inside">
                    <li>在「约束」Tab 编写详细的写作规则</li>
                    <li>在「参考」Tab 添加参考小说并分析文风</li>
                    <li>在「风格」Tab 配置禁词和叙事风格</li>
                    <li>在「角色」Tab 设计角色档案</li>
                    <li>在「大纲」Tab 构建章节大纲</li>
                    <li>在「写作」Tab 发起创作流水线</li>
                  </ul>
                </div>
                <div className="flex justify-between">
                  <button onClick={() => setWizardStep(2)} className="btn-editorial">上一步</button>
                  <button onClick={handleCreateBook} disabled={!newBook.title} className="btn-editorial-primary">创建项目</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
