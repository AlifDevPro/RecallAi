"use client";

import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardTopic, WeeklyActivityDay } from "@/lib/data/dashboard";

const tooltipStyle = {
  background: "hsl(var(--surface))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "12px",
  fontSize: "12px",
};

function weaknessBarColor(mastery: number): string {
  if (mastery < 50) return "#ef4444";
  if (mastery < 70) return "#f59e0b";
  return "#6366f1";
}

type DashboardChartsProps = {
  weeklyActivity: WeeklyActivityDay[];
  forecast: { day: string; count: number }[];
  topics: DashboardTopic[];
  isLoading?: boolean;
};

export function DashboardCharts({ weeklyActivity, forecast, topics, isLoading }: DashboardChartsProps) {
  const weeklyEmpty = weeklyActivity.every((d) => d.cards === 0);
  const forecastEmpty = forecast.every((f) => f.count === 0);

  const masteryData = [...topics]
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 8)
    .map((t) => ({
      name: t.name.length > 14 ? `${t.name.slice(0, 12)}…` : t.name,
      fullName: t.name,
      mastery: t.mastery,
      due: t.due,
    }));

  if (isLoading) {
    return (
      <div className="grid lg:grid-cols-3 gap-8 py-6 border-b border-border/30">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-44 bg-surface-raised rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-8 py-6 border-b border-border/30">
      <div>
        <h3 className="text-sm font-semibold mb-0.5">Weekly activity</h3>
        <p className="text-xs text-muted-foreground mb-3">Cards reviewed per day</p>
        {weeklyEmpty ? (
          <div className="h-40 flex items-center justify-center text-sm text-muted-foreground text-center px-4">
            No reviews this week.{" "}
            <Link href="/review" className="text-primary hover:underline ml-1">
              Start a session
            </Link>
          </div>
        ) : (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyActivity} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="weeklyFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => [`${value} cards`, "Reviewed"]}
                />
                <Area
                  type="monotone"
                  dataKey="cards"
                  stroke="hsl(var(--primary))"
                  fill="url(#weeklyFill)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-0.5">Upcoming due</h3>
        <p className="text-xs text-muted-foreground mb-3">Cards due in the next 7 days</p>
        {forecastEmpty ? (
          <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
            Nothing scheduled ahead.
          </div>
        ) : (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={forecast} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => [`${value} cards`, "Due"]}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={32} fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-0.5">Topic mastery</h3>
        <p className="text-xs text-muted-foreground mb-3">Weakest topics first</p>
        {masteryData.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-sm text-muted-foreground text-center px-4">
            No topics yet.{" "}
            <Link href="/topics/new" className="text-primary hover:underline ml-1">
              Create one
            </Link>
          </div>
        ) : (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={masteryData}
                layout="vertical"
                margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={64}
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number, _name, props) => {
                    const p = props.payload as { fullName: string; due: number };
                    return [`${value}% mastery`, p.fullName + (p.due ? ` · ${p.due} due` : "")];
                  }}
                />
                <Bar dataKey="mastery" radius={[0, 4, 4, 0]} maxBarSize={14}>
                  {masteryData.map((entry, i) => (
                    <Cell key={i} fill={weaknessBarColor(entry.mastery)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
