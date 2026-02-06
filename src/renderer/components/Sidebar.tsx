import React from 'react';
import { Home, CirclePlay, Cog, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigation, Page } from '../store';
import SidebarButton from './SidebarButton';
import logoUrl from '@/../public/images/logo.svg';

export default function Sidebar() {
  const { currentPage, setPage, isSidebarCollapsed, toggleSidebar } = useNavigation();

  const navItems: { page: Page; icon: React.ReactNode; label: string }[] = [
    { page: 'home', icon: <Home size={20} strokeWidth={2} />, label: 'Home' },
    { page: 'test', icon: <CirclePlay size={20} strokeWidth={2} />, label: 'Start Test' },
    { page: 'settings', icon: <Cog size={20} strokeWidth={2} />, label: 'Settings' },
    { page: 'about', icon: <Info size={20} strokeWidth={2} />, label: 'About' },
  ];

  // Store logo element to avoid repetition
  const logoElement = (
    <div className="w-10 h-10 bg-white rounded-lg p-0.5 flex items-center justify-center flex-shrink-0">
      <img
        src={logoUrl}
        alt="F.O.C.U.S. Logo"
        className="w-full h-full"
      />
    </div>
  );

  return (
    // Wrapper container for sidebar and toggle positioning
    <div className="relative flex h-screen">
      {/* Sidebar */}
      <aside
        className={`
          bg-sidebar-bg backdrop-blur-sm text-sidebar-fg transition-all duration-300
          flex flex-col border-r border-sidebar-border
          ${isSidebarCollapsed ? 'w-16' : 'w-64'}
        `}
      >
        {/* Logo and Collapse Toggle */}
        <div className={`
          px-4 h-16 border-b border-sidebar-border flex items-center justify-center relative
        `}>
          {isSidebarCollapsed ? (
            logoElement
          ) : (
            <div className="flex items-center gap-2 w-full pr-8">
              {logoElement}
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold truncate">F.O.C.U.S. Assessment</span>
                <span className="text-[10px] text-muted truncate">By Konsulin Care</span>
              </div>
            </div>
          )}
        </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 items-stretch">
        {navItems.map((item) => (
          <SidebarButton
            key={item.page}
            icon={item.icon}
            label={item.label}
            isActive={currentPage === item.page}
            isCollapsed={isSidebarCollapsed}
            onClick={() => setPage(item.page)}
          />
        ))}
      </nav>
      </aside>

      {/* Collapse Toggle - Positioned relative to wrapper, not sidebar */}
      <div
        className={`
          absolute right-0 top-8 z-10
          ${isSidebarCollapsed
            ? 'translate-x-full ml-2'  // Full width + gap (8px) from collapsed sidebar
            : 'translate-x-1/2'         // Half hanging off expanded sidebar edge
          }
          -translate-y-1/2  // Center toggle vertically (toggle is 32px, logo center at 32px)
          transition-all duration-300
        `}
      >
        <button
          onClick={toggleSidebar}
          className="w-8 h-8 bg-primary rounded-full text-white flex items-center justify-center shadow-md hover:opacity-90 transition-opacity"
          title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isSidebarCollapsed ? <ChevronRight size={20} strokeWidth={2} /> : <ChevronLeft size={20} strokeWidth={2} />}
        </button>
      </div>
    </div>
  );
}
