// "use client";

// import Link from "next/link";
// import {
//   Bell,
//   ChartNoAxesCombined,
//   ChartSpline,
//   Home,
//   Lightbulb,
//   Settings,
//   SquareChartGantt,
//   WalletCards,
// } from "lucide-react";

// export default function ReportsSidebar() {
//   const menuItems = [
//     {
//       name: "Dashboard",
//       icon: Home,
//       href: "/dashboard",
//     },
//     {
//       name: "Markets",
//       icon: ChartSpline,
//       href: "/markets",
//     },
//     {
//       name: "Portfolio",
//       icon: WalletCards,
//       href: "#",
//     },
//     {
//       name: "Analytics",
//       icon: ChartNoAxesCombined,
//       href: "#",
//     },
//     {
//       name: "Reports",
//       icon: SquareChartGantt,
//       href: "/reports",
//       active: true,
//     },
//     {
//       name: "Alerts",
//       icon: Bell,
//       href: "#",
//     },
//     {
//       name: "AI Insights",
//       icon: Lightbulb,
//       href: "#",
//     },
//     {
//       name: "Settings",
//       icon: Settings,
//       href: "#",
//     },
//   ];

//   return (
//     <aside className="flex min-h-screen w-52 flex-col border-r border-slate-200 bg-white">
//       {/* Logo */}
//       <div className="px-6 py-6">
//         <h1 className="text-2xl font-bold tracking-wide text-slate-800">
//           MABAI
//         </h1>

//         <p className="mt-1 text-xs text-slate-500">
//           AI Market Intelligence
//         </p>
//       </div>

//       {/* Navigation */}
//       <nav className="flex flex-col gap-2 px-3">
//         {menuItems.map((item) => {
//           const Icon = item.icon;

//           return (
//             <Link
//               key={item.name}
//               href={item.href}
//               className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium ${
//                 item.active
//                   ? "border-l-2 border-indigo-600 bg-indigo-50 text-indigo-700"
//                   : "text-slate-600"
//               }`}
//             >
//               <Icon size={18} />

//               {item.name}
//             </Link>
//           );
//         })}
//       </nav>

//       {/* Bottom section */}
//       <div className="mt-auto p-4">
//         <div className="rounded-xl bg-slate-50 p-4">
//           <p className="text-sm font-semibold text-indigo-700">
//             Upgrade to Pro
//           </p>

//           <p className="mt-2 text-xs leading-5 text-slate-500">
//             Unlock advanced reports, custom analytics, and AI insights.
//           </p>

//           <button className="mt-4 w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white">
//             Upgrade Now
//           </button>
//         </div>

//         <button className="mt-4 w-full rounded-lg border border-slate-200 py-2 text-sm text-slate-600">
//           Dark Mode
//         </button>
//       </div>
//     </aside>
//   );
// }