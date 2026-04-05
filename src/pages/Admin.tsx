import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, DollarSign, Search, Activity } from "lucide-react";

const stats = [
  { label: "Total Users", value: "142", icon: Users },
  { label: "Revenue (MTD)", value: "$3,480", icon: DollarSign },
  { label: "Total Searches", value: "1,847", icon: Search },
  { label: "Active Today", value: "23", icon: Activity },
];

const mockUsers = [
  { email: "john@test.com", plan: "pro", searches: 45, leads: 120, joined: "2026-03-15" },
  { email: "jane@test.com", plan: "free", searches: 8, leads: 16, joined: "2026-03-20" },
  { email: "bob@agency.com", plan: "pro", searches: 112, leads: 340, joined: "2026-02-01" },
];

const mockWebhooks = [
  { source: "stripe", event: "checkout.session.completed", time: "2 min ago" },
  { source: "resend", event: "email.delivered", time: "15 min ago" },
  { source: "stripe", event: "invoice.paid", time: "1 hour ago" },
];

const Admin = () => {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="border-border/50">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
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

        {/* Users */}
        <Card className="border-border/50">
          <CardHeader><CardTitle>Users</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Searches</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockUsers.map((u) => (
                  <TableRow key={u.email}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell><Badge variant={u.plan === "pro" ? "default" : "secondary"} className="capitalize">{u.plan}</Badge></TableCell>
                    <TableCell>{u.searches}</TableCell>
                    <TableCell>{u.leads}</TableCell>
                    <TableCell className="text-muted-foreground">{u.joined}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Webhook Logs */}
        <Card className="border-border/50">
          <CardHeader><CardTitle>Recent Webhook Events</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockWebhooks.map((w, i) => (
                  <TableRow key={i}>
                    <TableCell><Badge variant="outline" className="capitalize">{w.source}</Badge></TableCell>
                    <TableCell className="font-mono text-sm">{w.event}</TableCell>
                    <TableCell className="text-muted-foreground">{w.time}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
