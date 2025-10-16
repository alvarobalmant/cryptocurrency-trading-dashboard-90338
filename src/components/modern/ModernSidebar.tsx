import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface SidebarItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge: string | null;
}

interface ModernSidebarProps {
  items: SidebarItem[];
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export default function ModernSidebar({ items, activeSection, onSectionChange }: ModernSidebarProps) {
  return (
    <>
      {/* Sidebar Desktop */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-64 lg:flex lg:flex-col lg:h-screen">
        <div className="flex flex-col h-full pt-20 pb-4 bg-white border-r border-slate-200">
          <div className="flex-1 min-h-0 px-4 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onSectionChange(item.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 text-left rounded-xl transition-all duration-200 group",
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/25"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                  style={isActive ? { background: 'linear-gradient(to right, #2563eb, #1d4ed8)', color: 'white' } : {}}
                >
                  <div className="flex items-center space-x-3">
                    <Icon 
                      className={cn(
                        "w-5 h-5 transition-colors",
                        isActive 
                          ? "text-white" 
                          : "text-slate-400 group-hover:text-slate-600"
                      )}
                      style={isActive ? { color: 'white' } : {}}
                    />
                    <span 
                      className={cn("font-medium", isActive ? "text-white" : "")}
                      style={isActive ? { color: 'white' } : {}}
                    >
                      {item.label}
                    </span>
                  </div>
                  
                  {item.badge && (
                    <Badge 
                      variant={isActive ? "secondary" : "outline"}
                      className={cn(
                        "text-xs",
                        isActive 
                          ? "bg-white/20 text-white border-white/30" 
                          : "bg-slate-100 text-slate-600"
                      )}
                      style={isActive ? { backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', borderColor: 'rgba(255,255,255,0.3)' } : {}}
                    >
                      {item.badge}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>

          {/* Área inferior da sidebar */}
          <div className="px-4 pt-4 border-t border-slate-200">
            <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-bold">✂️</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Barber+</p>
                  <p className="text-xs text-slate-500">Sistema de Gestão</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Bottom Navigation Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200">
        <div className="flex items-center justify-around py-2">
          {items.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={cn(
                  "flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-200",
                  isActive
                    ? "text-primary-600"
                    : "text-slate-400"
                )}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {item.badge && (
                    <Badge 
                      variant="destructive"
                      className="absolute -top-2 -right-2 w-4 h-4 p-0 flex items-center justify-center text-xs"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </div>
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
