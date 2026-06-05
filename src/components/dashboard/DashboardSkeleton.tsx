import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";

export function DashboardSkeletonContent() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-8 lg:py-12 animate-pulse">
      <div className="h-4 w-32 bg-surface-raised rounded mb-3" />
      <div className="h-10 w-64 bg-surface-raised rounded mb-4" />
      <div className="h-4 w-96 bg-surface-raised rounded mb-10" />
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 h-64 bg-surface rounded-2xl" />
        <div className="lg:col-span-4 h-48 bg-surface rounded-2xl" />
      </div>
    </div>
  );
}

export function DashboardLoadingShell() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileNav />
      <main className="lg:pl-64 pt-14 lg:pt-0 min-h-screen">
        <DashboardSkeletonContent />
      </main>
    </div>
  );
}
