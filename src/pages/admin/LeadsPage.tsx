import { useEffect, useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Building2, Loader2, Mail, MapPin, MessageSquare, Phone, Snowflake, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type MarketingLead = Database["public"]["Tables"]["marketing_leads"]["Row"];

const LEAD_STATUSES = ["new", "contacted", "demo_scheduled", "onboarding", "closed"] as const;
const FILTER_OPTIONS = ["all", ...LEAD_STATUSES] as const;

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case "new":
      return "bg-sky-500/15 text-sky-300 border-sky-500/30";
    case "contacted":
      return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    case "demo_scheduled":
      return "bg-violet-500/15 text-violet-300 border-violet-500/30";
    case "onboarding":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "closed":
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
    default:
      return "";
  }
};

export default function LeadsPage() {
  const { toast } = useToast();
  const [leads, setLeads] = useState<MarketingLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof FILTER_OPTIONS)[number]>("all");
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadLeads = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("marketing_leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLeads(data ?? []);
    } catch (error) {
      console.error("Failed to load marketing leads:", error);
      toast({
        variant: "destructive",
        title: "Unable to load leads",
        description: error instanceof Error ? error.message : "Please try again in a moment.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadLeads();
  }, []);

  const filteredLeads = useMemo(() => {
    const query = search.trim().toLowerCase();

    return leads.filter((lead) => {
      const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
      if (!matchesStatus) return false;

      if (!query) return true;

      return [
        lead.company_name,
        lead.contact_name,
        lead.email,
        lead.phone ?? "",
        lead.service_area ?? "",
        lead.customer_type,
        lead.message ?? "",
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [leads, search, statusFilter]);

  const summary = useMemo(() => {
    return {
      total: leads.length,
      fresh: leads.filter((lead) => lead.status === "new").length,
      active: leads.filter((lead) => ["contacted", "demo_scheduled", "onboarding"].includes(lead.status)).length,
      closed: leads.filter((lead) => lead.status === "closed").length,
    };
  }, [leads]);

  const updateStatus = async (leadId: string, status: MarketingLead["status"]) => {
    setSavingId(leadId);
    try {
      const { error } = await supabase.from("marketing_leads").update({ status }).eq("id", leadId);
      if (error) throw error;

      setLeads((current) =>
        current.map((lead) => (lead.id === leadId ? { ...lead, status, updated_at: new Date().toISOString() } : lead)),
      );
      toast({
        title: "Lead updated",
        description: `Lead marked as ${status.replaceAll("_", " ")}.`,
      });
    } catch (error) {
      console.error("Failed to update lead status:", error);
      toast({
        variant: "destructive",
        title: "Status update failed",
        description: error instanceof Error ? error.message : "Please try again in a moment.",
      });
    } finally {
      setSavingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Website Leads</h1>
          <p className="text-muted-foreground">
            Review inbound customer requests from the public WinterWatch-Pro website.
          </p>
        </div>
        <Button variant="outline" onClick={() => void loadLeads()}>
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-2">
            <CardDescription>Total requests</CardDescription>
            <CardTitle className="text-3xl">{summary.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-2">
            <CardDescription>New</CardDescription>
            <CardTitle className="text-3xl text-sky-300">{summary.fresh}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-2">
            <CardDescription>In progress</CardDescription>
            <CardTitle className="text-3xl text-amber-300">{summary.active}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-2">
            <CardDescription>Closed</CardDescription>
            <CardTitle className="text-3xl text-emerald-300">{summary.closed}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border-border/50 bg-card/50">
        <CardContent className="grid gap-3 pt-6 md:grid-cols-[1fr_220px]">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search company, contact, email, phone, or service area..."
          />
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as (typeof FILTER_OPTIONS)[number])}>
            <SelectTrigger>
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {LEAD_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle>Lead queue</CardTitle>
            <CardDescription>Newest website inquiries are listed first.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <div className="font-medium">{lead.company_name}</div>
                      <div className="text-xs text-muted-foreground capitalize">{lead.customer_type.replaceAll("_", " ")}</div>
                    </TableCell>
                    <TableCell>
                      <div>{lead.contact_name}</div>
                      <div className="text-xs text-muted-foreground">{lead.email}</div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={lead.status}
                        onValueChange={(value) => void updateStatus(lead.id, value)}
                        disabled={savingId === lead.id}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LEAD_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status.replaceAll("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredLeads.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                      No leads match this filter yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {filteredLeads.slice(0, 5).map((lead) => (
            <Card key={lead.id} className="border-border/50 bg-card/50">
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{lead.company_name}</CardTitle>
                    <CardDescription>{lead.contact_name}</CardDescription>
                  </div>
                  <Badge variant="outline" className={getStatusBadgeClass(lead.status)}>
                    {lead.status.replaceAll("_", " ")}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="gap-1">
                    <Snowflake className="h-3 w-3" />
                    {lead.customer_type.replaceAll("_", " ")}
                  </Badge>
                  {lead.fleet_size ? <Badge variant="outline">{lead.fleet_size}</Badge> : null}
                  <Badge variant="outline">{format(new Date(lead.created_at), "MMM d, yyyy h:mm a")}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <UserRound className="h-4 w-4" />
                  <span>{lead.contact_name}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{lead.email}</span>
                </div>
                {lead.phone ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{lead.phone}</span>
                  </div>
                ) : null}
                {lead.service_area ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{lead.service_area}</span>
                  </div>
                ) : null}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>Source: {lead.source}</span>
                </div>
                {lead.message ? (
                  <div className="rounded-xl border border-border/50 bg-background/40 p-3 text-muted-foreground">
                    <div className="mb-2 flex items-center gap-2 text-foreground">
                      <MessageSquare className="h-4 w-4" />
                      Notes
                    </div>
                    <p className="whitespace-pre-wrap">{lead.message}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}

          {filteredLeads.length === 0 && (
            <Card className="border-border/50 bg-card/50">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                New website requests will show up here.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
