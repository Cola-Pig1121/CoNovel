import type { Metadata } from 'next';
import { lxgwWenKai, lxgwWenKaiMono } from '@/lib/fonts';
import '@/styles/editorial.css';

export const metadata: Metadata = {
  title: 'CoNovel - 自进化多Agent小说写作系统',
  description: '基于Vercel Eve框架的智能小说写作系统，支持15+专业Agent协作创作中文网络小说',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className={`${lxgwWenKai.variable} ${lxgwWenKaiMono.variable}`}>
      <body className="bg-background text-foreground min-h-screen font-wenkai">
        {children}
      </body>
    </html>
  );
}
