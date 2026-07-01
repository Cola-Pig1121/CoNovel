import type { Metadata } from 'next';
import '@/styles/editorial.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ToastProvider } from '@/components/Toast';

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
    <html lang="zh-CN">
      <body className="bg-background text-foreground min-h-screen font-wenkai">
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
