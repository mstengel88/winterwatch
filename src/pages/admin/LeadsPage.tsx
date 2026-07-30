import { useEffect, useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Building2, CheckCircle2, Loader2, Mail, MapPin, MessageSquare, Phone, Snowflake, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type MarketingLead = Database["public"]["Tables"]["marketing_leads"]["Row"];
type OrganizationRow = Database["public"]["Tables"]["organizations"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

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
  const navigate = useNavigate();
  const { organizations, switchOrganization } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<MarketingLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof FILTER_OPTIONS)[number]>("all");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [jumpingLeadId, setJumpingLeadId] = useState<string | null>(null);
  const [organizationDetails, setOrganizationDetails] = useState<Record<string, Pick<OrganizationRow, "id" | "name" | "created_at">>>({});
  const [profileDetails, setProfileDetails] = useState<Record<string, Pick<ProfileRow, "id" | "full_name" | "email">>>({});

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

  useEffect(() => {
    const convertedOrganizationIds = Array.from(
      new Set(leads.map((lead) => lead.converted_organization_id).filter((value): value is string => Boolean(value))),
    );
    const convertedByIds = Array.from(
      new Set(leads.map((lead) => lead.converted_by).filter((value): value is string => Boolean(value))),
    );

    const loadSupportData = async () => {
      try {
        if (convertedOrganizationIds.length > 0) {
          const { data: organizationsData, error: organizationsError } = await supabase
            .from("organizations")
            .select("id, name, created_at")
            .in("id", convertedOrganizationIds);

          if (organizationsError) throw organizationsError;

          setOrganizationDetails(
            Object.fromEntries((organizationsData ?? []).map((organization) => [organization.id, organization])),
          );
        } else {
          setOrganizationDetails({});
        }

        if (convertedByIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", convertedByIds);

          if (profilesError) throw profilesError;

          setProfileDetails(
            Object.fromEntries((profilesData ?? []).map((profile) => [profile.id, profile])),
          );
        } else {
          setProfileDetails({});
        }
      } catch (error) {
        console.error("Failed to load lead support data:", error);
      }
    };

    void loadSupportData();
  }, [leads]);

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

  const convertedLeads = useMemo(
    () =>
      leads
        .filter((lead) => Boolean(lead.converted_organization_id))
        .sort((left, right) => {
          const leftDate = left.converted_at ?? left.updated_at;
          const rightDate = right.converted_at ?? right.updated_at;
          return new Date(rightDate).getTime() - new Date(leftDate).getTime();
        }),
    [leads],
  );

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

  const handleStartOnboarding = async (lead: MarketingLead) => {
    if (!lead.converted_organization_id) {
      const updates: Database["public"]["Tables"]["marketing_leads"]["Update"] = {};

      if (lead.status !== "onboarding") {
        updates.status = "onboarding";
      }

      if (!lead.onboarding_started_at) {
        updates.onboarding_started_at = new Date().toISOString();
      }

      if (Object.keys(updates).length > 0) {
        setSavingId(lead.id);
        try {
          const { error } = await supabase.from("marketing_leads").update(updates).eq("id", lead.id);
          if (error) throw error;

          setLeads((current) =>
            current.map((entry) =>
              entry.id === lead.id
                ? {
                    ...entry,
                    ...updates,
                    updated_at: new Date().toISOString(),
                  }
                : entry,
            ),
          );
        } catch (error) {
          console.error("Failed to start onboarding handoff:", error);
          toast({
            variant: "destructive",
            title: "Onboarding handoff failed",
            description: error instanceof Error ? error.message : "Please try again in a moment.",
          });
          return;
        } finally {
          setSavingId(null);
        }
      }
    }

    navigate(`/admin/customer-setup?lead=${lead.id}`);
  };

  const handleOpenConvertedWorkspace = async (lead: MarketingLead) => {
    if (!lead.converted_organization_id) {
      return;
    }

    setJumpingLeadId(lead.id);
    try {
      await switchOrganization(lead.converted_organization_id);
      navigate("/admin");
    } catch (error) {
      console.error("Failed to open converted workspace:", error);
      toast({
        variant: "destructive",
        title: "Workspace jump failed",
        description: error instanceof Error ? error.message : "We could not switch into that customer workspace.",
      });
    } finally {
      setJumpingLeadId(null);
    }
  };

  const getOrganizationLabel = (organizationId: string | null) => {
    if (!organizationId) {
      return "Not linked yet";
    }

    return (
      organizationDetails[organizationId]?.name ??
      organizations.find((organization) => organization.id === organizationId)?.name ??
      "Converted workspace"
    );
  };

  const getConvertedByLabel = (convertedBy: string | null) => {
    if (!convertedBy) {
      return "Unknown";
    }

    const profile = profileDetails[convertedBy];
    return profile?.full_name?.trim() || profile?.email || "Unknown";
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

      {convertedLeads.length > 0 && (
        <Card className="border-emerald-500/20 bg-emerald-500/10">
          <CardHeader>
            <CardTitle>Converted Customers</CardTitle>
            <CardDescription>
              Leads that already became live customer workspaces. Jump straight into the converted workspace from here.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-2">
            {convertedLeads.slice(0, 6).map((lead) => (
              <div
                key={`converted-${lead.id}`}
                className="rounded-2xl border border-emerald-500/20 bg-background/40 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{lead.company_name}</p>
                    <p className="text-sm text-muted-foreground">{getOrganizationLabel(lead.converted_organization_id)}</p>
                  </div>
                  <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-300">
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                    Converted
                  </Badge>
                </div>
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <p>{lead.contact_name} · {lead.email}</p>
                  <p>
                    Converted{" "}
                    {lead.converted_at
                      ? formatDistanceToNow(new Date(lead.converted_at), { addSuffix: true })
                      : formatDistanceToNow(new Date(lead.updated_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="mt-3 rounded-xl border border-border/50 bg-background/50 p-3 text-sm">
                  <div className="grid gap-2 text-muted-foreground">
                    <p>
                      Lead came in: <span className="text-foreground">{format(new Date(lead.created_at), "MMM d, yyyy h:mm a")}</span>
                    </p>
                    <p>
                      Onboarding started:{" "}
                      <span className="text-foreground">
                        {lead.onboarding_started_at ? format(new Date(lead.onboarding_started_at), "MMM d, yyyy h:mm a") : "Not started"}
                      </span>
                    </p>
                    <p>
                      Org created:{" "}
                      <span className="text-foreground">
                        {lead.converted_organization_id && organizationDetails[lead.converted_organization_id]?.created_at
                          ? format(new Date(organizationDetails[lead.converted_organization_id].created_at), "MMM d, yyyy h:mm a")
                          : "Not linked"}
                      </span>
                    </p>
                    <p>
                      Converted by: <span className="text-foreground">{getConvertedByLabel(lead.converted_by)}</span>
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => void handleOpenConvertedWorkspace(lead)}
                    disabled={jumpingLeadId === lead.id}
                  >
                    {jumpingLeadId === lead.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    Open Workspace
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/admin/customer-setup?lead=${lead.id}`)}
                  >
                    View Handoff
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
                  <TableHead className="text-right">Action</TableHead>
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
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={lead.converted_organization_id ? "secondary" : "outline"}
                        className="gap-2"
                        onClick={() =>
                          lead.converted_organization_id
                            ? void handleOpenConvertedWorkspace(lead)
                            : void handleStartOnboarding(lead)
                        }
                        disabled={jumpingLeadId === lead.id}
                      >
                        {jumpingLeadId === lead.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : lead.converted_organization_id ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <ArrowRight className="h-4 w-4" />
                        )}
                        {lead.converted_organization_id ? "Open Workspace" : "Start Onboarding"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredLeads.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
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
                  {lead.converted_organization_id ? (
                    <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/15 text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" />
                      Converted
                    </Badge>
                  ) : null}
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
                <div className="rounded-xl border border-border/50 bg-background/40 p-3 text-sm text-muted-foreground">
                  <div className="space-y-2">
                    <p>
                      Lead came in: <span className="text-foreground">{format(new Date(lead.created_at), "MMM d, yyyy h:mm a")}</span>
                    </p>
                    <p>
                      Onboarding started:{" "}
                      <span className="text-foreground">
                        {lead.onboarding_started_at ? format(new Date(lead.onboarding_started_at), "MMM d, yyyy h:mm a") : "Not started"}
                      </span>
                    </p>
                    <p>
                      Org created:{" "}
                      <span className="text-foreground">
                        {lead.converted_organization_id && organizationDetails[lead.converted_organization_id]?.created_at
                          ? format(new Date(organizationDetails[lead.converted_organization_id].created_at), "MMM d, yyyy h:mm a")
                          : "Not linked"}
                      </span>
                    </p>
                    <p>
                      Converted by: <span className="text-foreground">{getConvertedByLabel(lead.converted_by)}</span>
                    </p>
                  </div>
                </div>
                <Button
                  variant={lead.converted_organization_id ? "secondary" : "outline"}
                  className="w-full gap-2"
                  onClick={() =>
                    lead.converted_organization_id
                      ? void handleOpenConvertedWorkspace(lead)
                      : void handleStartOnboarding(lead)
                  }
                  disabled={jumpingLeadId === lead.id}
                >
                  {jumpingLeadId === lead.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : lead.converted_organization_id ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  {lead.converted_organization_id ? "Open Converted Workspace" : "Start Onboarding"}
                </Button>
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
