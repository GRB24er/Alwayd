'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AdminSidebar from './AdminSidebar';
import LoadingSpinner from './LoadingSpinner';
import { Session } from 'next-auth';

// ✅ Safe extension of built-in session
interface CustomSession extends Session {
  user: Session["user"] & {
    id?: string;
    isAdmin?: boolean;
    role?: string;
    balance?: number;
  };
}

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const { data: session, status } = useSession() as { data: CustomSession | null; status: string };
  const router = useRouter();

  if (status === 'loading') {
    return <LoadingSpinner />;
  }

  if (!session || !session.user?.isAdmin) {
    router.replace('/admin/login');
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 overflow-y-auto p-6">
        {children}
      </div>
    </div>
  );
};

export default AdminLayout;
