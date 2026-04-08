import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { RotateCcw } from "lucide-react";

export interface AdminUserRow {
  user_id: string;
  plan: string;
  searches_today: number;
  leads_remaining: number;
  created_at: string;
  last_search_date: string | null;
  email: string;
  leads_count: number;
  company?: {
    business_name: string | null;
    website_url: string | null;
    phone: string | null;
    email: string | null;
    website_dev_price: string | null;
    current_deal: string | null;
  };
}

interface UserDetailModalProps {
  user: AdminUserRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlanChange: (userId: string, plan: "free" | "pro") => void;
  onLeadsChange: (userId: string, leads: number) => void;
  onResetSearches: (userId: string) => void;
  updating: string | null;
}

export function UserDetailModal({ user, open, onOpenChange, onPlanChange, onLeadsChange, onResetSearches, updating }: UserDetailModalProps) {
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {user.email}
            <Badge variant={user.plan === "pro" ? "default" : "secondary"} className="capitalize">{user.plan}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Profile Info */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Profile</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">User ID:</span> <span className="font-mono text-xs">{user.user_id}</span></div>
              <div><span className="text-muted-foreground">Joined:</span> {new Date(user.created_at).toLocaleDateString()}</div>
              <div><span className="text-muted-foreground">Last Active:</span> {user.last_search_date || "Never"}</div>
              <div><span className="text-muted-foreground">Leads Saved:</span> {user.leads_count}</div>
            </div>
          </section>

          <Separator />

          {/* Usage Stats - Editable */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Usage & Quota</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">Plan</label>
                <Select
                  value={user.plan}
                  onValueChange={(val) => onPlanChange(user.user_id, val as "free" | "pro")}
                  disabled={updating === user.user_id}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Leads Remaining</label>
                <Input
                  type="number"
                  defaultValue={user.leads_remaining}
                  onBlur={(e) => onLeadsChange(user.user_id, parseInt(e.target.value, 10))}
                  min={0}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Searches Today</label>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{user.searches_today}</span>
                  <Button size="sm" variant="outline" onClick={() => onResetSearches(user.user_id)} disabled={updating === user.user_id}>
                    <RotateCcw className="h-3 w-3 mr-1" /> Reset
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Company Settings */}
          {user.company && (
            <>
              <Separator />
              <section>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Company Settings</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {user.company.business_name && <div><span className="text-muted-foreground">Business:</span> {user.company.business_name}</div>}
                  {user.company.website_url && <div><span className="text-muted-foreground">Website:</span> {user.company.website_url}</div>}
                  {user.company.phone && <div><span className="text-muted-foreground">Phone:</span> {user.company.phone}</div>}
                  {user.company.email && <div><span className="text-muted-foreground">Email:</span> {user.company.email}</div>}
                  {user.company.website_dev_price && <div><span className="text-muted-foreground">Dev Price:</span> {user.company.website_dev_price}</div>}
                  {user.company.current_deal && <div><span className="text-muted-foreground">Current Deal:</span> {user.company.current_deal}</div>}
                </div>
              </section>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
