import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";

function Pulse({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-surface-raised rounded ${className ?? ""}`} />;
}

export function KpiStripSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 border-b border-border/30 py-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 py-2">
          <Pulse className="size-9 rounded-lg shrink-0" />
          <div className="space-y-2 flex-1">
            <Pulse className="h-3 w-16" />
            <Pulse className="h-7 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function QuickActionsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-6 border-b border-border/30">
      {Array.from({ length: 8 }).map((_, i) => (
        <Pulse key={i} className="h-16 rounded-lg" />
      ))}
    </div>
  );
}

export function ChartsRowSkeleton() {
  return (
    <div className="grid lg:grid-cols-3 gap-8 py-6 border-b border-border/30">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i}>
          <Pulse className="h-4 w-28 mb-2" />
          <Pulse className="h-3 w-36 mb-3" />
          <Pulse className="h-40 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function ReviewSectionSkeleton() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-2">
          <Pulse className="h-4 w-28" />
          <Pulse className="h-3 w-20" />
        </div>
        <Pulse className="h-4 w-24" />
      </div>
      <div className="divide-y divide-border/20">
        {Array.from({ length: 3 }).map((_, i) => (
          <Pulse key={i} className="h-14 w-full my-0 rounded-none" />
        ))}
      </div>
    </div>
  );
}

export function TopicsListSkeleton() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Pulse className="h-4 w-28" />
        <Pulse className="h-4 w-16" />
      </div>
      <div className="divide-y divide-border/20">
        {Array.from({ length: 4 }).map((_, i) => (
          <Pulse key={i} className="h-12 w-full my-0 rounded-none" />
        ))}
      </div>
    </div>
  );
}

/** @deprecated Use TopicsListSkeleton */
export function TopicsGridSkeleton() {
  return <TopicsListSkeleton />;
}

/** @deprecated Charts are in the top row now */
export function ForecastSkeleton() {
  return <ChartsRowSkeleton />;
}

/** @deprecated Mastery ring removed from sidebar */
export function MasterySkeleton() {
  return null;
}

export function StreakSkeleton() {
  return (
    <div>
      <div className="space-y-2 mb-4">
        <Pulse className="h-4 w-28" />
        <Pulse className="h-3 w-24" />
      </div>
      <Pulse className="h-8 w-16 mb-4" />
      <Pulse className="h-24 w-full rounded-lg" />
    </div>
  );
}

export function InsightSkeleton() {
  return (
    <div className="pt-10 lg:pt-0">
      <Pulse className="h-4 w-24 mb-4" />
      <div className="space-y-2">
        <Pulse className="h-3 w-full" />
        <Pulse className="h-3 w-5/6" />
        <Pulse className="h-3 w-4/6" />
      </div>
    </div>
  );
}

export function DashboardSkeletonContent() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-8 lg:py-12">
      <div className="h-4 w-32 bg-surface-raised rounded animate-pulse mb-3" />
      <div className="h-10 w-64 bg-surface-raised rounded animate-pulse mb-4" />
      <div className="h-4 w-96 bg-surface-raised rounded animate-pulse mb-8" />
      <KpiStripSkeleton />
      <QuickActionsSkeleton />
      <ChartsRowSkeleton />
      <div className="grid lg:grid-cols-12 gap-10 pt-8">
        <div className="lg:col-span-8 space-y-10">
          <ReviewSectionSkeleton />
          <TopicsListSkeleton />
        </div>
        <div className="lg:col-span-4 space-y-10">
          <StreakSkeleton />
          <InsightSkeleton />
        </div>
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
