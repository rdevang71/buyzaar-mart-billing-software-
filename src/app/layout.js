import './globals.css';
import { RootClientWrapper } from './RootClientWrapper';

export const metadata = {
  title: 'BillingPro',
  description: 'Professional billing software',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"
        />
      </head>
      <body>
        <RootClientWrapper>{children}</RootClientWrapper>
      </body>
    </html>
  );
}