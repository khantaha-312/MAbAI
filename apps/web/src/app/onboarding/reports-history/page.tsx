import ReportsHistory from "@/components/reports-history/reports-history";
import Sidebar from "@/components/layout/sidebar";

export default function ReportsHistoryPage() {

  return (
   
    <main className="flex min-h-screen bg-slate-50">
      
            {/* Left sidebar */}
            <aside className="left-panel hidden w-64 flex-col border-r border-slate-200/80 bg-white/90 backdrop-blur-sm md:flex">
              <div className="h-full overflow-y-auto p-4 font-medium text-slate-500">
                <Sidebar />
              </div>
            </aside>


            <div className="flex-1 p-6">
              <ReportsHistory />
            </div>
    </main>

  ) 
}