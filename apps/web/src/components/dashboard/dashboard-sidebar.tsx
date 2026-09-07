"use client";

import { 
  LayoutDashboard, 
  TrendingUp, 
  Bookmark, 
  Briefcase, 
  BarChart2, 
  Bell, 
  FileText, 
  Settings, 
  Zap, 
  Sun,
  ChevronDown
} from "lucide-react";

export default function DashboardSidebar() {
  return (
    <aside className=" flex flex-col justify-between p-4 ">
      
      {/* Top Section: Logo & Navigation */}
      <div className="space-y-6 ">
        
        {/* Logo Section */}
        <div className="logo-section flex flex-col items-center justify-center">
          <img src="/MABAI_Logo_transparent.png" alt="MABAI Logo" className="h-8 w-auto object-contain" />
          
          <div className="logo-section-text">
            <p>AI Market Intelligence</p>
          </div>
        </div>



        {/* Navigation Options */}
        <nav className="space-y-1">
          <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" active />
          <NavItem icon={<TrendingUp size={18} />} label="Markets" />
          <NavItem icon={<Bookmark size={18} />} label="Watchlist" />
          {/* <NavItem icon={<Briefcase size={18} />} label="Portfolio" /> */}
          <NavItem icon={<BarChart2 size={18} />} label="Analytics" />
          <NavItem icon={<Bell size={18} />} label="Alerts" />
          <NavItem icon={<FileText size={18} />} label="Reports" />
          {/* <NavItem icon={<Settings size={18} />} label="Settings" /> */}
        </nav>
      </div>

      

      {/* Bottom Section: Upgrade & Light Mode Toggle */}
      <div className=" space-y-3 pt-4">
        
        {/* Upgrade Card */}
        <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl text-white shadow-sm">
          
          <div className="flex items-center gap-2 mb-2">
            <Zap size={16} className="text-yellow-300 fill-yellow-300" />
            <h4 className="font-semibold text-sm">Upgrade to Pro</h4>
          </div>
          
          <p className="text-[11px] text-blue-100 leading-relaxed mb-3">
            Unlock advanced analytics, AI signals & more.
          </p>

          <button  type="button" className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white font-medium text-xs rounded-xl transition-colors shadow-inner flex items-center justify-center gap-1">
            Upgrade Now →
          </button>
        </div>

        {/* Theme Toggle Button */}
        <button type="button" className="w-full flex items-center justify-between p-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-xs font-medium hover:bg-gray-50 transition-colors" >

          <div className="flex items-center gap-2">
            <Sun size={16} className="text-gray-500" />
            <span>Light Mode</span>
          </div>

          <ChevronDown size={14} className="text-gray-400" />
        </button>

      </div>
    </aside>
  );
}

// NavItem Component Helper
function NavItem({ 
  icon, 
  label, 
  active = false 
}: { 
  icon: React.ReactNode; 
  label: string; 
  active?: boolean 
}) {
  return (
    <a href="#" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
        active 
          ? "bg-blue-50 text-blue-600" 
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
      }`}
    >
      <span className={active ? "text-blue-600" : "text-gray-400"}>
        {icon}
      </span>
      <span>{label}</span>
    </a>
  );
}