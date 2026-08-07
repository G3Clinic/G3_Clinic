import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Topbar } from '../components/Topbar';

export function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-ui-bg overflow-hidden print:h-auto print:overflow-visible print:bg-white print:block">
      <div className="contents print:hidden">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      </div>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden print:overflow-visible print:block">
        <div className="contents print:hidden">
          <Topbar onOpenSidebar={() => setIsSidebarOpen(true)} />
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar print:overflow-visible print:p-0 print:block">
          <div className="max-w-7xl mx-auto print:max-w-none">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
