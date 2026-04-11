import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from "recharts";
import { DollarSign, TrendingUp, Users } from "lucide-react";

interface UserRow {
  user_id: string;
  plan: string;
  created_at: string;
}

interface RevenueAnalyticsProps {
  users: UserRow[];
  proPriceMonthly?: number;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--muted-foreground))"];

export function RevenueAnalytics({ users, proPriceMonthly = 49 }: RevenueAnalyticsProps) {
  const proUsers = users.filter((u) => u.plan === "pro");
  const freeUsers = users.filter((u) => u.plan === "free");
  const mrr = proUsers.length * proPriceMonthly;
  const arr = mrr * 12;

  const planDistribution = useMemo(() => [
    { name: "Pro", value: proUsers.length },
    { name: "Free", value: freeUsers.length },
  ], [proUsers.length, freeUsers.length]);

  const growthData = useMemo(() => {
    const months = new Map<string, { total: number; pro: number }>();
    const sorted = [...users].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    sorted.forEach((u) => {
      const key = new Date(u.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short" });
      const entry = months.get(key) || { total: 0, pro: 0 };
      entry.total++;
      if (u.plan === "pro") entry.pro++;
      months.set(key, entry);
    });
    let cumTotal = 0;
    let cumPro = 0;
    return Array.from(months.entries()).map(([month, data]) => {
      cumTotal += data.total;
      cumPro += data.pro;
      return { month, users: cumTotal, pro: cumPro, mrr: cumPro * proPriceMonthly };
    });
  }, [users, proPriceMonthly]);

  const chartConfig = {
    users: { label: "Total Users", color: "hsl(var(--primary))" },
    pro: { label: "Pro Users", color: "hsl(var(--chart-2, 142 71% 45%))" },
    mrr: { label: "MRR", color: "hsl(var(--primary))" },
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Revenue & Subscription Analytics</h2>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/10">
              <DollarSign className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Monthly Recurring Revenue</p>
              <p className="text-2xl font-bold text-foreground">${mrr.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Annual Recurring Revenue</p>
              <p className="text-2xl font-bold text-foreground">${arr.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Conversion Rate</p>
              <p className="text-2xl font-bold text-foreground">
                {users.length > 0 ? ((proUsers.length / users.length) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader><CardTitle className="text-base">MRR Growth</CardTitle></CardHeader>
          <CardContent>
            {growthData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <LineChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" tickFormatter={(v) => `$${v}`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="mrr" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader><CardTitle className="text-base">User Growth</CardTitle></CardHeader>
          <CardContent>
            {growthData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <BarChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="users" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pro" fill="hsl(var(--chart-2, 142 71% 45%))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
