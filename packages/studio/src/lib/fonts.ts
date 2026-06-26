import localFont from 'next/font/local';

// 霞鹜文楷 - 正文
export const lxgwWenKai = localFont({
  src: [
    {
      path: '../../fonts/lxgw-wenkai/LXGWWenKai-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../fonts/lxgw-wenkai/LXGWWenKai-Light.ttf',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../../fonts/lxgw-wenkai/LXGWWenKai-Medium.ttf',
      weight: '500',
      style: 'normal',
    },
  ],
  variable: '--font-wenkai',
  display: 'swap',
});

// 霞鹜文楷等宽 - 代码/标签
export const lxgwWenKaiMono = localFont({
  src: [
    {
      path: '../../fonts/lxgw-wenkai/LXGWWenKaiMono-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../fonts/lxgw-wenkai/LXGWWenKaiMono-Light.ttf',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../../fonts/lxgw-wenkai/LXGWWenKaiMono-Medium.ttf',
      weight: '500',
      style: 'normal',
    },
  ],
  variable: '--font-wenkai-mono',
  display: 'swap',
});
