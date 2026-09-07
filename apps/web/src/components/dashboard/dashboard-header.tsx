"use client";

import { useState, useRef, useEffect } from "react";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Menu, Search, Bell, Settings, LogOut, User, ChevronDown } from "lucide-react";

export default function DashboardHeader() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { signOut } = useClerk();
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setIsProfileOpen(false);
    await signOut();
    router.push("/sign-in");
  };

  return (
    <header className="w-full border-b border-gray-200 bg-white sticky top-0 z-50">
      <div className="flex h-16 items-center justify-between px-6 max-w-[1600px] mx-auto">

        {/* Left Section */}
        <div className="flex items-center gap-4">
          <button type="button" className="lg:hidden text-gray-600 hover:text-gray-900">
            <Menu size={20} />
          </button>

          <div className="hidden lg:block">
            <p className="text-sm font-semibold text-gray-900">Good morning, Umer 👋</p>
            <p className="text-xs text-gray-500">Here's your swing trading overview.</p>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          
          {/* Search Box */}
          <div className="hidden md:flex h-9 w-[280px] items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search markets, assets, or news..."
              className="w-full bg-transparent text-xs outline-none placeholder:text-gray-400"
            />
          </div>

          {/* Notifications Button */}
          <button type="button" className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            <Bell size={18} />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
          </button>


          {/* User Profile Dropdown */}
          <div className="relative ml-1" ref={dropdownRef}>
            <button
              type="button" onClick={() => setIsProfileOpen((prev) => !prev)}
              className="flex items-center gap-1.5 p-1 rounded-full hover:bg-gray-100 transition-colors focus:outline-none"
            >
              <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-semibold flex items-center justify-center text-xs border border-blue-200">
                U
              </div>
              <ChevronDown size={14} className="text-gray-500" />
            </button>

            {/* Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-gray-100 shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                
                {/* User Info Header */}
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-900">Umer</p>
                  <p className="text-[11px] text-gray-500 truncate">umer@example.com</p>
                </div>

                {/* Profile Links */}
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => setIsProfileOpen(false)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User size={14} className="text-gray-400" />
                    <span>My Profile</span>
                  </button>

                  
                </div>

                {/* Sign Out Action */}
                <div className="pt-1 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>

              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
}






















// import { Menu, Search, Bell, Settings } from "lucide-react";

// export default function DashboardHeader() {
//   return (
//     <header className="w-full border-b border-gray-200 bg-white">
      
//       {/* Main header area */}
//       <div className="flex min-h-[88px] items-center justify-between px-6 lg:px-10">

//         {/* ================= LEFT SIDE ================= */}
//         <div className="flex items-center gap-5">

//           {/* Hamburger button */}
//           <button type="button" ria-label="Open menu" className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100" >
//             <Menu size={22} />
//           </button>


//           {/* MABAI logo and small description */}
//           <div>
//             <h1 className="text-2xl font-bold tracking-tight text-[#2F55B7]">
//                 <img  src="/MABAI_Logo_transparent.png"  alt="MABAI Logo" />
//             </h1>

//             <p className="text-[11px] text-gray-500">
//               AI Market Intelligence
//             </p>
//           </div>


//           {/* Small vertical line */}
//           <div className="hidden h-10 w-px bg-gray-200 lg:block" />


//           {/* Greeting */}
//           <div className="hidden lg:block">
//             <h2 className="text-base font-semibold text-gray-900">
//               Good morning, Umer
//             </h2>

//             <p className="mt-1 text-sm text-gray-500">
//               Here&apos;s your swing trading overview.
//             </p>
//           </div>

//         </div>


//         {/* ================= RIGHT SIDE ================= */}
//         <div className="flex items-center gap-3">

//           {/* Search box */}
//           <div className="hidden md:flex h-10 w-[260px] items-center gap-2 rounded-lg border border-gray-200 px-3">

//             <Search size={18} className="text-gray-400" />

//             <input
//               type="text"
//               placeholder="Search markets or assets..."
//               className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
//             />

//           </div>


//           {/* Notification button */}
//           <button
//             type="button"
//             aria-label="Notifications"
//             className="relative flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
//           >
//             <Bell size={21} />

//             {/* Number of notifications */}
//             <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
//               3
//             </span>
//           </button>


//           {/* Settings button */}
//           <button
//             type="button"
//             aria-label="Settings"
//             className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
//           >
//             <Settings size={21} />
//           </button>


//           {/* User profile */}
//           {/* We will replace this with the real profile image later */}
//           <button
//             type="button"
//             aria-label="User profile"
//             className="ml-1 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-sm font-semibold text-gray-600"
//           >
//             U
//           </button>

//         </div>

//       </div>

//     </header>
//   );
// }


// "use client";

// import { Menu, Search, Bell, Settings } from "lucide-react";

// export default function DashboardHeader() {
  
//   return (
    
//     <header className="w-full border-b border-gray-200 bg-white sticky top-0 z-50">
//       <div className="flex h-16 items-center justify-between px-6 max-w-[1600px] mx-auto">

//         {/* Left Section */}
//         <div className="flex items-center gap-4">
//           <button type="button" className="lg:hidden text-gray-600 hover:text-gray-900">
//             <Menu size={20} />
//           </button>

          

//           {/* <div className="hidden h-6 w-px bg-gray-200 lg:block mx-2" /> */}

//           <div className="hidden lg:block">
//             <p className="text-sm font-semibold text-gray-900">Good morning, Umer 👋</p>
//             <p className="text-xs text-gray-500">Here's your swing trading overview.</p>
//           </div>
//         </div>

//         {/* Right Section */}
//         <div className="flex items-center gap-3">
//           <div className="hidden md:flex h-9 w-[280px] items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3">
//             <Search size={16} className="text-gray-400" />
//             <input type="text" placeholder="Search markets, assets, or news..." className="w-full bg-transparent text-xs outline-none placeholder:text-gray-400"/>
//           </div>

//           <button type="button" className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
//             <Bell size={18} />
//             <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
//           </button>

//           {/* <button type="button" className="border border-black p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
//             <Settings size={18} />
//           </button> */}

//           <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-semibold flex items-center justify-center text-xs ml-1 border border-blue-200">
//             U
//           </div>
//         </div>

//       </div>
//     </header>
//   );
// }
