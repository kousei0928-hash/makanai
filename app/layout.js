import './globals.css';

export const metadata = {
  title: 'Food Loss Shop',
  description: 'フードロス削減 商品販売アプリ'
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
