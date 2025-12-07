import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Sui Risk Index',
  description: 'On-chain Liquidity Risk Index for Sui',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Navbar />
          <main className="min-h-screen bg-gray-50">
            {children}
          </main>
          <footer className="bg-white border-t border-gray-200 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <p className="text-center text-sm text-gray-500">
                © 2025 Sui Risk Index. Built for Sui Hackathon.
              </p>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
