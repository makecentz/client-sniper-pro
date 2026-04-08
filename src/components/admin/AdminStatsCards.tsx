import { Card, CardContent } from "@/components/ui/card";
import { Users, DollarSign, Search, Activity, UserX } from "lucide-react";

interface AdminStatsCardsProps {
  totalUsers: number;
  proUsers: number;
  freeUsers: number;
  totalLeads: number;
  activeToday: number;
  totalSearches: number;
}

export function AdminStatsCards({ totalUsers, proUsers, freeUsers, totalLeads, activeToday, totalSearches }: AdminStatsCardsProps) {
  const stats = [
    { label: "Total Users", value: totalUsers, icon: Users },
    { label: "Pro Users", value: proUsers, icon: DollarSign },
    { label: "Free Users", value: freeUsers, icon: UserX },
    { label: "Total Leads", value: totalLeads, icon: Search },
    { label: "Active Today", value: activeToday, icon: Activity },
    { label: "Total Searches", value: totalSearches, icon: Search },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
      {stats.map((s) => (
        <Card key={s.label} className="border-border/50">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <s.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
