// src/app/dashboard/admin/layout.tsx
import AdminSidebar from "@/components/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <AdminSidebar />
      <main style={{ flex: 1, marginLeft: '280px' }}>
        {children}
      </main>
    </div>
  );
}