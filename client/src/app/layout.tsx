import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { SocketProvider } from '../context/SocketContext';
import { WorkspaceProvider } from '../context/WorkspaceContext';
import { AppLayout } from '../components/layout/AppLayout';

export const metadata: Metadata = {
  title: 'TeamspaceX — Private Team Workspace',
  description: 'A fast, secure, real-time private workspace for managing projects, tasks, documents, and team collaboration.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        <ToastProvider>
          <AuthProvider>
            <WorkspaceProvider>
              <SocketProvider>
                <AppLayout>{children}</AppLayout>
              </SocketProvider>
            </WorkspaceProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
