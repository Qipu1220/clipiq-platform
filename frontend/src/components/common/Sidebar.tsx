import { ReactNode } from 'react';
import { Home, Users, Upload, User, Shield, Flag, MessageSquare, UserCircle, Search as SearchIcon } from 'lucide-react';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';

interface SidebarProps {
  logoSrc?: string;
  appName?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  children?: ReactNode;
  variant?: 'user' | 'staff';
}

export function Sidebar({
  logoSrc = "https://res.cloudinary.com/dranb4kom/image/upload/v1764573751/Logo_4x_vacejp.png",
  appName = "shortv",
  searchValue,
  onSearchChange,
  children,
  variant = 'user'
}: SidebarProps) {
  return (
    <div className="w-60 bg-black flex flex-col border-r border-zinc-900 flex-shrink-0">
      {/* Logo */}
      <div className="p-4 flex items-center gap-2">
        <img
          src={logoSrc}
          alt={`${appName} Logo`}
          className="w-6 h-6 object-contain"
        />
        <h1 className="text-white text-xl tracking-tight logo-text">{appName}</h1>
        {variant === 'staff' && (
          <div className="ml-auto">
            <Shield className="w-5 h-5 text-[#ff3b5c]" />
          </div>
        )}
      </div>

      {/* Search */}
      <div className="px-3 mb-4">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-zinc-900/50 border-zinc-800 text-white text-sm pl-9 pr-3 py-1.5 h-9"
            placeholder="Tìm kiếm"
          />
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <div className="px-2 space-y-1">
          {children}
        </div>
      </ScrollArea>
    </div>
  );
}

interface SidebarItemProps {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  badge?: number;
}

export function SidebarItem({ icon, label, active = false, onClick, badge }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
        active
          ? 'bg-zinc-900/80 text-white font-medium'
          : 'text-zinc-400 hover:bg-zinc-900/40 hover:text-white'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 flex-shrink-0">{icon}</div>
        <span>{label}</span>
      </div>
      {badge !== undefined && badge > 0 && (
        <div className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#ff3b5c] flex items-center justify-center text-xs text-white font-medium">
          {badge}
        </div>
      )}
    </button>
  );
}

export function SidebarDivider() {
  return <div className="h-px bg-zinc-800 my-3" />;
}
