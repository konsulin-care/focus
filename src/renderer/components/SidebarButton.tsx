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
        w-full relative
        flex ${isCollapsed ? 'justify-center' : 'justify-start'}
        items-center px-4 py-2 transition-all duration-200 mx-0
      `}
      title={isCollapsed ? label : undefined}
    >
      {/* Selection indicator: fills button with px-4 for edge gaps */}
      {isActive && (
        <div className="absolute inset-0 bg-primary rounded-lg -z-10" />
      )}
      
      {/* Content container: gap-3 for icon spacing */}
      <div className="relative flex items-center gap-3">
        <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
          {icon}
        </span>
        {!isCollapsed && <span className="font-medium truncate">{label}</span>}
      </div>
    </button>
  );
}
