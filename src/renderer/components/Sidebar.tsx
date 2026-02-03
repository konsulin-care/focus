import React from 'react';
import { useNavigation, Page } from '../store';
import SidebarButton from './SidebarButton';

// Inline SVG Icons
function HomeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export default function Sidebar() {
  const { currentPage, setPage, isSidebarCollapsed, toggleSidebar } = useNavigation();

  const navItems: { page: Page; icon: React.ReactNode; label: string }[] = [
    { page: 'home', icon: <HomeIcon />, label: 'Home' },
    { page: 'test', icon: <PlayIcon />, label: 'Start Test' },
    { page: 'settings', icon: <SettingsIcon />, label: 'Settings' },
    { page: 'about', icon: <InfoIcon />, label: 'About' },
  ];

  return (
    <aside
      className={`
        bg-gray-900 text-white transition-all duration-300
        flex flex-col h-screen
        ${isSidebarCollapsed ? 'w-16' : 'w-64'}
      `}
    >
      {/* Logo */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-center">
        {isSidebarCollapsed ? (
          <span className="text-2xl font-bold text-blue-400">F</span>
        ) : (
          <span className="text-xl font-bold">F.O.C.U.S. Assessment</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
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

      {/* Collapse Toggle */}
      <button
        onClick={toggleSidebar}
        className="p-4 hover:bg-gray-700 border-t border-gray-700 transition-colors duration-200 flex items-center justify-center"
        title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isSidebarCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
      </button>
    </aside>
  );
}
