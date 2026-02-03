import React from 'react';

interface SidebarButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  isCollapsed: boolean;
  onClick: () => void;
}

export default function SidebarButton({
  icon,
  label,
  isActive,
  isCollapsed,
  onClick,
}: SidebarButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-4 py-3 transition-all duration-200
        ${
          isActive
            ? 'bg-blue-600 text-white'
            : 'hover:bg-gray-700 text-gray-300 hover:text-white'
        }
        ${isCollapsed ? 'justify-center' : 'justify-start'}
      `}
      title={isCollapsed ? label : undefined}
    >
      <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
        {icon}
      </span>
      {!isCollapsed && <span className="font-medium truncate">{label}</span>}
    </button>
  );
}
