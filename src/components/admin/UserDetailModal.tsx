import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RotateCcw, Save, Trash2, Snowflake, MessageSquare } from "lucide-react";

export interface AdminUserRow {
  user_id: string;
  plan: string;
  searches_today: number;
  leads_remaining: number;
  created_at: string;
  last_search_date: string | null;
  email: string;
  leads_count: number;
  frozen?: boolean;
  admin_message?: string | null;
  signup_ip?: string | null;
  last_ip?: string | null;
  last_ip_at?: string | null;
  company?: {
    business_name: string | null;
    website_url: string | null;
    phone: string | null;
    email: string | null;
    website_dev_price: string | null;
    current_deal: string | null;
  };
}

interface CompanyData {
  business_name: string;
  website_url: string;
  phone: string;
  email: string;
  website_dev_price: string;
  current_deal: string;
}

interface UserDetailModalProps {
  user: AdminUserRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlanChange: (userId: string, plan: "free" | "pro") => void;
  onLeadsChange: (userId: string, leads: number) => void;
  onResetSearches: (userId: string) => void;
  onSaveProfile: (userId: string, displayName: string) => void;
  onSaveCompany: (userId: string, data: CompanyData) => void;
  onDeleteUserData: (userId: string) => void;
  onToggleFrozen: (userId: string, frozen: boolean) => void;
  onSaveMessage: (userId: string, message: string) => void;
  updating: string | null;
}

export function UserDetailModal({ user, open, onOpenChange, onPlanChange, onLeadsChange, onResetSearches, onSaveProfile, onSaveCompany, onDeleteUserData, onToggleFrozen, onSaveMessage, updating }: UserDetailModalProps) {
  const [displayName, setDisplayName] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [company, setCompany] = useState<CompanyData>({
    business_name: "", website_url: "", phone: "", email: "", website_dev_price: "", current_deal: "",
  });

  useEffect(() => {
    if (user) {
      setDisplayName(user.email);
      setAdminMessage(user.admin_message || "");
      setCompany({
        business_name: user.company?.business_name || "",
        website_url: user.company?.website_url || "",
        phone: user.company?.phone || "",
        email: user.company?.email || "",
        website_dev_price: user.company?.website_dev_price || "",
        current_deal: user.company?.current_deal || "",
      });
    }
  }, [user]);

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {user.email}
            <Badge variant={user.plan === "pro" ? "default" : "secondary"} className="capitalize">{user.plan}</Badge>
            {user.frozen && <Badge variant="destructive" className="gap-1"><Snowflake className="h-3 w-3" />Frozen</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Profile */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Profile</h3>
            <div className="flex items-end gap-2 mb-3">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">Display Name</label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>
              <Button size="sm" onClick={() => onSaveProfile(user.user_id, displayName)} disabled={updating === user.user_id}>
                <Save className="h-3 w-3 mr-1" /> Save
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">User ID:</span> <span className="font-mono text-xs">{user.user_id}</span></div>
              <div><span className="text-muted-foreground">Joined:</span> {new Date(user.created_at).toLocaleDateString()}</div>
              <div><span className="text-muted-foreground">Last Active:</span> {user.last_search_date || "Never"}</div>
              <div><span className="text-muted-foreground">Leads Saved:</span> {user.leads_count}</div>
            </div>
          </section>

          <Separator />

          {/* Usage & Quota */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Usage & Quota</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">Plan</label>
                <Select value={user.plan} onValueChange={(val) => onPlanChange(user.user_id, val as "free" | "pro")} disabled={updating === user.user_id}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Leads Remaining</label>
                <Input type="number" defaultValue={user.leads_remaining} onBlur={(e) => onLeadsChange(user.user_id, parseInt(e.target.value, 10))} min={0} />
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

          <Separator />

          {/* Company Settings */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Company Settings</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Business Name</label>
                <Input value={company.business_name} onChange={(e) => setCompany(c => ({ ...c, business_name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Website</label>
                <Input value={company.website_url} onChange={(e) => setCompany(c => ({ ...c, website_url: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Phone</label>
                <Input value={company.phone} onChange={(e) => setCompany(c => ({ ...c, phone: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Email</label>
                <Input value={company.email} onChange={(e) => setCompany(c => ({ ...c, email: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Dev Price</label>
                <Input value={company.website_dev_price} onChange={(e) => setCompany(c => ({ ...c, website_dev_price: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Current Deal</label>
                <Input value={company.current_deal} onChange={(e) => setCompany(c => ({ ...c, current_deal: e.target.value }))} />
              </div>
            </div>
            <Button size="sm" className="mt-3" onClick={() => onSaveCompany(user.user_id, company)} disabled={updating === user.user_id}>
              <Save className="h-3 w-3 mr-1" /> Save Company Info
            </Button>
          </section>

          <Separator />

          {/* Account Status */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2"><Snowflake className="h-4 w-4" /> Account Status</h3>
            <div className="flex items-center justify-between rounded-md border border-border/50 p-3">
              <div>
                <p className="text-sm font-medium">Freeze account</p>
                <p className="text-xs text-muted-foreground">Frozen users cannot access the dashboard.</p>
              </div>
              <Switch checked={!!user.frozen} onCheckedChange={(v) => onToggleFrozen(user.user_id, v)} disabled={updating === user.user_id} />
            </div>
          </section>

          <Separator />

          {/* Dashboard Message */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Dashboard Message</h3>
            <p className="text-xs text-muted-foreground mb-2">Shown as a banner at the top of this user's dashboard. Leave empty and save to clear.</p>
            <Textarea rows={3} value={adminMessage} onChange={(e) => setAdminMessage(e.target.value)} placeholder="Please contact support." />
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={() => onSaveMessage(user.user_id, adminMessage)} disabled={updating === user.user_id}>
                <Save className="h-3 w-3 mr-1" /> Save Message
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setAdminMessage(""); onSaveMessage(user.user_id, ""); }} disabled={updating === user.user_id}>
                Clear
              </Button>
            </div>
          </section>

          <Separator />
          <section>
            <h3 className="text-sm font-semibold text-destructive mb-2">Danger Zone</h3>
            <p className="text-xs text-muted-foreground mb-3">This will permanently delete all of this user's leads, company settings, usage data, and profile.</p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={updating === user.user_id}>
                  <Trash2 className="h-3 w-3 mr-1" /> Delete All User Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all data for <strong>{user.email}</strong> including leads, company settings, usage tracking, and profile. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDeleteUserData(user.user_id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
