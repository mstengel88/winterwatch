import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Building2, Loader2, Mail, Plus, Trash2, UserPlus, Users, ArrowRight, Briefcase, Shield, Wrench } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getPublicWebAppUrl } from "@/lib/publicWebUrl";

type ContactRole = "manager" | "client" | "admin";
type AppUserRole =
  | "admin"
  | "manager"
  | "driver"
  | "shovel_crew"
  | "client"
  | "work_log_viewer";
type EmployeeCategory = "plow" | "shovel" | "both" | "manager" | "trucker";
type ServiceType = "plow" | "shovel" | "both";

type EmployeeDraft = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  category: EmployeeCategory;
  hourly_rate: string;
  hire_date: string;
  notes: string;
};

type AccountDraft = {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  priority: string;
  geofence_radius: string;
  service_type: ServiceType;
  notes: string;
};

type UserDraft = {
  full_name: string;
  email: string;
  phone: string;
  role: AppUserRole;
  create_employee: boolean;
  employee_category: EmployeeCategory;
};

const createEmployeeDraft = (): EmployeeDraft => ({
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  category: "both",
  hourly_rate: "",
  hire_date: "",
  notes: "",
});

const createAccountDraft = (): AccountDraft => ({
  name: "",
  address: "",
  city: "",
  state: "WI",
  zip: "",
  contact_name: "",
  contact_phone: "",
  contact_email: "",
  priority: "5",
  geofence_radius: "100",
  service_type: "both",
  notes: "",
});

const createUserDraft = (): UserDraft => ({
  full_name: "",
  email: "",
  phone: "",
  role: "manager",
  create_employee: false,
  employee_category: "manager",
});

type OnboardingResult = {
  organization: { id: string; name: string; slug: string; plan: string; status: string };
  primary_contact?: {
    email: string;
    role: string;
    invited: boolean;
    employee_created: boolean;
  } | null;
  users_created?: Array<{
    id: string;
    email: string;
    role: string;
    invited: boolean;
    employee_created: boolean;
  }>;
  employees_created: Array<{ id: string; name: string; category: string }>;
  accounts_created: Array<{ id: string; name: string; service_type: string }>;
};

type MarketingLead = Database["public"]["Tables"]["marketing_leads"]["Row"];

export default function CustomerOnboardingPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { switchOrganization } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isSwitchingWorkspace, setIsSwitchingWorkspace] = useState(false);
  const [isLoadingLead, setIsLoadingLead] = useState(false);
  const [selectedLead, setSelectedLead] = useState<MarketingLead | null>(null);
  const [hydratedLeadId, setHydratedLeadId] = useState<string | null>(null);
  const [result, setResult] = useState<OnboardingResult | null>(null);

  const [organizationName, setOrganizationName] = useState("");
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [organizationPlan, setOrganizationPlan] = useState("launch");

  const [includePrimaryContact, setIncludePrimaryContact] = useState(true);
  const [primaryContactName, setPrimaryContactName] = useState("");
  const [primaryContactEmail, setPrimaryContactEmail] = useState("");
  const [primaryContactPhone, setPrimaryContactPhone] = useState("");
  const [primaryContactRole, setPrimaryContactRole] = useState<ContactRole>("manager");
  const [createPrimaryEmployee, setCreatePrimaryEmployee] = useState(true);
  const [primaryEmployeeCategory, setPrimaryEmployeeCategory] = useState<EmployeeCategory>("manager");
  const [assignPrimaryToAccounts, setAssignPrimaryToAccounts] = useState(false);

  const [users, setUsers] = useState<UserDraft[]>([]);
  const [employees, setEmployees] = useState<EmployeeDraft[]>([]);
  const [accounts, setAccounts] = useState<AccountDraft[]>([createAccountDraft()]);

  const canAssignPrimaryToAccounts = includePrimaryContact && primaryContactRole === "client";
  const leadId = searchParams.get("lead");

  const summary = useMemo(() => {
    const employeeCount = employees.filter((row) => row.first_name.trim() && row.last_name.trim()).length;
    const accountCount = accounts.filter((row) => row.name.trim() && row.address.trim()).length;
    const userCount = users.filter((row) => row.full_name.trim() && row.email.trim()).length;
    return {
      userCount,
      employeeCount,
      accountCount,
    };
  }, [users, employees, accounts]);

  const resultWorkspaceSteps = useMemo(() => {
    if (!result) {
      return [];
    }

    const createdUserCount =
      (result.primary_contact ? 1 : 0) +
      (result.users_created?.length ?? 0);

    return [
      {
        label: "Workspace created",
        detail: result.organization.name,
        complete: true,
      },
      {
        label: "Users",
        detail: createdUserCount > 0 ? `${createdUserCount} ready` : "Still needs logins",
        complete: createdUserCount > 0,
      },
      {
        label: "Employees",
        detail: result.employees_created.length > 0 ? `${result.employees_created.length} created` : "Still needs employees",
        complete: result.employees_created.length > 0,
      },
      {
        label: "Accounts",
        detail: result.accounts_created.length > 0 ? `${result.accounts_created.length} created` : "Still needs accounts",
        complete: result.accounts_created.length > 0,
      },
      {
        label: "Equipment",
        detail: "Add trucks, plows, and gear in the workspace",
        complete: false,
      },
    ];
  }, [result]);

  const nextWorkspaceStep = useMemo(() => {
    return resultWorkspaceSteps.find((step) => !step.complete) ?? null;
  }, [resultWorkspaceSteps]);

  const updateEmployee = (index: number, key: keyof EmployeeDraft, value: string) => {
    setEmployees((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)),
    );
  };

  const updateAccount = (index: number, key: keyof AccountDraft, value: string) => {
    setAccounts((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)),
    );
  };

  const updateUser = (index: number, key: keyof UserDraft, value: string | boolean) => {
    setUsers((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)),
    );
  };

  const resetForm = () => {
    setOrganizationName("");
    setOrganizationSlug("");
    setOrganizationPlan("launch");
    setIncludePrimaryContact(true);
    setPrimaryContactName("");
    setPrimaryContactEmail("");
    setPrimaryContactPhone("");
    setPrimaryContactRole("manager");
    setCreatePrimaryEmployee(true);
    setPrimaryEmployeeCategory("manager");
    setAssignPrimaryToAccounts(false);
    setUsers([]);
    setEmployees([]);
    setAccounts([createAccountDraft()]);
  };

  useEffect(() => {
    if (!leadId) {
      setSelectedLead(null);
      setHydratedLeadId(null);
      return;
    }

    let ignore = false;

    const loadLead = async () => {
      setIsLoadingLead(true);
      try {
        const { data, error } = await supabase
          .from("marketing_leads")
          .select("*")
          .eq("id", leadId)
          .maybeSingle();

        if (error) throw error;
        if (!ignore) {
          setSelectedLead(data ?? null);
        }
      } catch (error) {
        console.error("Error loading lead:", error);
        if (!ignore) {
          toast({
            variant: "destructive",
            title: "Lead not available",
            description: error instanceof Error ? error.message : "We could not load that lead.",
          });
        }
      } finally {
        if (!ignore) {
          setIsLoadingLead(false);
        }
      }
    };

    void loadLead();

    return () => {
      ignore = true;
    };
  }, [leadId, toast]);

  useEffect(() => {
    if (!selectedLead || hydratedLeadId === selectedLead.id) {
      return;
    }

    const inferredRole: ContactRole = selectedLead.customer_type === "property_manager" ? "client" : "manager";
    const defaultAccount = createAccountDraft();
    defaultAccount.name = selectedLead.company_name;
    defaultAccount.contact_name = selectedLead.contact_name;
    defaultAccount.contact_email = selectedLead.email;
    defaultAccount.contact_phone = selectedLead.phone ?? "";
    defaultAccount.notes = [
      selectedLead.service_area ? `Service area: ${selectedLead.service_area}` : null,
      selectedLead.fleet_size ? `Fleet size: ${selectedLead.fleet_size}` : null,
      selectedLead.message ? `Lead notes: ${selectedLead.message}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    setOrganizationName(selectedLead.company_name);
    setOrganizationSlug("");
    setIncludePrimaryContact(true);
    setPrimaryContactName(selectedLead.contact_name);
    setPrimaryContactEmail(selectedLead.email);
    setPrimaryContactPhone(selectedLead.phone ?? "");
    setPrimaryContactRole(inferredRole);
    setCreatePrimaryEmployee(inferredRole !== "client");
    setPrimaryEmployeeCategory(inferredRole === "client" ? "manager" : "manager");
    setAssignPrimaryToAccounts(inferredRole === "client");
    setUsers([]);
    setEmployees([]);
    setAccounts([defaultAccount]);
    setHydratedLeadId(selectedLead.id);
  }, [hydratedLeadId, selectedLead]);

  const clearLeadHandoff = () => {
    setSelectedLead(null);
    setHydratedLeadId(null);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("lead");
    setSearchParams(nextParams, { replace: true });
  };

  const handleSubmit = async () => {
    if (!organizationName.trim()) {
      toast({
        variant: "destructive",
        title: "Organization name required",
        description: "Add the customer organization name before continuing.",
      });
      return;
    }

    if (includePrimaryContact && (!primaryContactName.trim() || !primaryContactEmail.trim())) {
      toast({
        variant: "destructive",
        title: "Primary contact required",
        description: "Add the primary contact name and email so we can assign the first user.",
      });
      return;
    }

    setIsSaving(true);
    setResult(null);

    try {
      const payload = {
        organization: {
          name: organizationName.trim(),
          slug: organizationSlug.trim() || undefined,
          plan: organizationPlan,
          status: "active",
        },
        primary_contact: includePrimaryContact
          ? {
              full_name: primaryContactName.trim(),
              email: primaryContactEmail.trim(),
              phone: primaryContactPhone.trim() || undefined,
              role: primaryContactRole,
              create_employee: createPrimaryEmployee,
              employee_category: primaryEmployeeCategory,
            }
          : null,
        additional_users: users
          .filter((row) => row.full_name.trim() && row.email.trim())
          .map((row) => ({
            full_name: row.full_name.trim(),
            email: row.email.trim(),
            phone: row.phone.trim() || undefined,
            role: row.role,
            create_employee: row.create_employee,
            employee_category: row.employee_category,
          })),
        employees: employees
          .filter((row) => row.first_name.trim() && row.last_name.trim())
          .map((row) => ({
            first_name: row.first_name.trim(),
            last_name: row.last_name.trim(),
            email: row.email.trim() || undefined,
            phone: row.phone.trim() || undefined,
            category: row.category,
            hourly_rate: row.hourly_rate.trim() ? Number(row.hourly_rate) : null,
            hire_date: row.hire_date.trim() || null,
            notes: row.notes.trim() || null,
          })),
        accounts: accounts
          .filter((row) => row.name.trim() && row.address.trim())
          .map((row) => ({
            name: row.name.trim(),
            address: row.address.trim(),
            city: row.city.trim() || undefined,
            state: row.state.trim() || undefined,
            zip: row.zip.trim() || undefined,
            contact_name: row.contact_name.trim() || undefined,
            contact_phone: row.contact_phone.trim() || undefined,
            contact_email: row.contact_email.trim() || undefined,
            priority: row.priority.trim() ? Number(row.priority) : 5,
            geofence_radius: row.geofence_radius.trim() ? Number(row.geofence_radius) : 100,
            service_type: row.service_type,
            notes: row.notes.trim() || null,
          })),
        options: {
          assign_primary_contact_to_accounts: canAssignPrimaryToAccounts && assignPrimaryToAccounts,
          invite_redirect_to: getPublicWebAppUrl("/auth/callback"),
          marketing_lead_id: selectedLead?.id,
        },
      };

      const { data, error } = await supabase.functions.invoke("onboard-customer", {
        body: payload,
      });

      if (error) {
        throw error;
      }

      setResult(data as OnboardingResult);
      if (selectedLead) {
        setSelectedLead((current) =>
          current
            ? {
                ...current,
                status: "closed",
                converted_at: new Date().toISOString(),
                converted_organization_id: (data as OnboardingResult).organization.id,
              }
            : current,
        );
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete("lead");
        setSearchParams(nextParams, { replace: true });
      }
      toast({
        title: "Customer created",
        description: "The organization, starter records, and contact setup are ready.",
      });
      resetForm();
    } catch (error) {
      console.error("Error onboarding customer:", error);
      toast({
        variant: "destructive",
        title: "Customer setup failed",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenWorkspace = async (path: string) => {
    if (!result) return;

    setIsSwitchingWorkspace(true);
    try {
      await switchOrganization(result.organization.id);
      navigate(path);
    } catch (error) {
      console.error("Error switching to new workspace:", error);
      toast({
        variant: "destructive",
        title: "Workspace switch failed",
        description: error instanceof Error ? error.message : "The customer was created, but we could not switch into the new workspace yet.",
      });
    } finally {
      setIsSwitchingWorkspace(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Building2 className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Customer Setup</h1>
          <p className="text-muted-foreground">
            Create a new customer organization, set their first user, and seed starter data in one flow.
          </p>
        </div>
      </div>

      {isLoadingLead ? (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading lead handoff...
          </CardContent>
        </Card>
      ) : selectedLead ? (
        <Card className="border-emerald-500/20 bg-emerald-500/10">
          <CardHeader>
            <CardTitle className="text-lg">Lead Handoff Active</CardTitle>
            <CardDescription>
              {selectedLead.company_name} is prefilled from the website lead so you can move straight into onboarding.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                Contact: <span className="font-medium text-foreground">{selectedLead.contact_name}</span> · {selectedLead.email}
              </p>
              {selectedLead.service_area ? <p>Service area: {selectedLead.service_area}</p> : null}
              {selectedLead.message ? <p className="line-clamp-2">Lead notes: {selectedLead.message}</p> : null}
            </div>
            <Button variant="outline" onClick={clearLeadHandoff}>
              Clear Lead Handoff
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-6">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle>1. Organization</CardTitle>
              <CardDescription>Start with the tenant you want to add.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="organizationName">Organization Name</Label>
                <Input
                  id="organizationName"
                  value={organizationName}
                  onChange={(event) => setOrganizationName(event.target.value)}
                  placeholder="North Ridge Snow Services"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="organizationSlug">Slug</Label>
                <Input
                  id="organizationSlug"
                  value={organizationSlug}
                  onChange={(event) => setOrganizationSlug(event.target.value)}
                  placeholder="north-ridge-snow"
                />
              </div>
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select value={organizationPlan} onValueChange={setOrganizationPlan}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="launch">Launch</SelectItem>
                    <SelectItem value="growth">Growth</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>2. Primary Contact</CardTitle>
                  <CardDescription>Assign the first user for the new customer.</CardDescription>
                </div>
                <Switch checked={includePrimaryContact} onCheckedChange={setIncludePrimaryContact} />
              </div>
            </CardHeader>
            {includePrimaryContact && (
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="primaryContactName">Full Name</Label>
                  <Input
                    id="primaryContactName"
                    value={primaryContactName}
                    onChange={(event) => setPrimaryContactName(event.target.value)}
                    placeholder="Morgan Lee"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primaryContactEmail">Email</Label>
                  <Input
                    id="primaryContactEmail"
                    type="email"
                    value={primaryContactEmail}
                    onChange={(event) => setPrimaryContactEmail(event.target.value)}
                    placeholder="morgan@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primaryContactPhone">Phone</Label>
                  <Input
                    id="primaryContactPhone"
                    value={primaryContactPhone}
                    onChange={(event) => setPrimaryContactPhone(event.target.value)}
                    placeholder="(555) 555-1212"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={primaryContactRole}
                    onValueChange={(value) => setPrimaryContactRole(value as ContactRole)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Employee Category</Label>
                  <Select
                    value={primaryEmployeeCategory}
                    onValueChange={(value) => setPrimaryEmployeeCategory(value as EmployeeCategory)}
                    disabled={!createPrimaryEmployee}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                      <SelectItem value="plow">Plow</SelectItem>
                      <SelectItem value="shovel">Shovel</SelectItem>
                      <SelectItem value="trucker">Trucker</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2 flex flex-col gap-3 rounded-lg border border-border/50 bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Create employee record for this contact</p>
                      <p className="text-xs text-muted-foreground">Useful when the first contact also works inside the app.</p>
                    </div>
                    <Switch checked={createPrimaryEmployee} onCheckedChange={setCreatePrimaryEmployee} />
                  </div>
                  {canAssignPrimaryToAccounts && (
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">Assign this client to all starter accounts</p>
                        <p className="text-xs text-muted-foreground">This links the new client user to the accounts you create below.</p>
                      </div>
                      <Switch checked={assignPrimaryToAccounts} onCheckedChange={setAssignPrimaryToAccounts} />
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>3. Additional Users & Roles</CardTitle>
                <CardDescription>Add any extra login accounts this customer needs on day one.</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setUsers((current) => [...current, createUserDraft()])}>
                <Plus className="h-4 w-4" />
                Add User
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {users.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                  No extra logins yet. Add managers, drivers, shovel crew, or client users here if you want them invited now.
                </div>
              ) : (
                users.map((entry, index) => (
                  <div key={`user-${index}`} className="space-y-4 rounded-xl border border-border/50 p-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">User {index + 1}</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setUsers((current) => current.filter((_, rowIndex) => rowIndex !== index))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2 md:col-span-2">
                        <Label>Full Name</Label>
                        <Input value={entry.full_name} onChange={(event) => updateUser(index, "full_name", event.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input type="email" value={entry.email} onChange={(event) => updateUser(index, "email", event.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input value={entry.phone} onChange={(event) => updateUser(index, "phone", event.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={entry.role} onValueChange={(value) => updateUser(index, "role", value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="driver">Driver</SelectItem>
                            <SelectItem value="shovel_crew">Shovel Crew</SelectItem>
                            <SelectItem value="work_log_viewer">Work Log Viewer</SelectItem>
                            <SelectItem value="client">Client</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Employee Category</Label>
                        <Select
                          value={entry.employee_category}
                          onValueChange={(value) => updateUser(index, "employee_category", value)}
                          disabled={!entry.create_employee}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="both">Both</SelectItem>
                            <SelectItem value="plow">Plow</SelectItem>
                            <SelectItem value="shovel">Shovel</SelectItem>
                            <SelectItem value="trucker">Trucker</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-2 flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 p-4">
                        <div>
                          <p className="text-sm font-medium">Create employee record for this user</p>
                          <p className="text-xs text-muted-foreground">Turn this on when the login also needs to clock in or complete work.</p>
                        </div>
                        <Switch
                          checked={entry.create_employee}
                          onCheckedChange={(value) => updateUser(index, "create_employee", value)}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>4. Employees</CardTitle>
                <CardDescription>Add any starter employees you want created right away.</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setEmployees((current) => [...current, createEmployeeDraft()])}>
                <Plus className="h-4 w-4" />
                Add Employee
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {employees.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                  No extra employees yet. You can still create the organization without them.
                </div>
              ) : (
                employees.map((employee, index) => (
                  <div key={`employee-${index}`} className="space-y-4 rounded-xl border border-border/50 p-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">Employee {index + 1}</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEmployees((current) => current.filter((_, rowIndex) => rowIndex !== index))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>First Name</Label>
                        <Input value={employee.first_name} onChange={(event) => updateEmployee(index, "first_name", event.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Last Name</Label>
                        <Input value={employee.last_name} onChange={(event) => updateEmployee(index, "last_name", event.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input value={employee.email} onChange={(event) => updateEmployee(index, "email", event.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input value={employee.phone} onChange={(event) => updateEmployee(index, "phone", event.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={employee.category} onValueChange={(value) => updateEmployee(index, "category", value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="plow">Plow</SelectItem>
                            <SelectItem value="shovel">Shovel</SelectItem>
                            <SelectItem value="both">Both</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="trucker">Trucker</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Hourly Rate</Label>
                        <Input value={employee.hourly_rate} onChange={(event) => updateEmployee(index, "hourly_rate", event.target.value)} placeholder="28" />
                      </div>
                      <div className="space-y-2">
                        <Label>Hire Date</Label>
                        <Input type="date" value={employee.hire_date} onChange={(event) => updateEmployee(index, "hire_date", event.target.value)} />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Notes</Label>
                        <Textarea value={employee.notes} onChange={(event) => updateEmployee(index, "notes", event.target.value)} rows={2} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>5. Accounts</CardTitle>
                <CardDescription>Add the first service locations for this customer.</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setAccounts((current) => [...current, createAccountDraft()])}>
                <Plus className="h-4 w-4" />
                Add Account
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {accounts.map((account, index) => (
                <div key={`account-${index}`} className="space-y-4 rounded-xl border border-border/50 p-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">Account {index + 1}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={accounts.length === 1}
                      onClick={() => setAccounts((current) => current.filter((_, rowIndex) => rowIndex !== index))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Account Name</Label>
                      <Input value={account.name} onChange={(event) => updateAccount(index, "name", event.target.value)} placeholder="West Campus" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Address</Label>
                      <Input value={account.address} onChange={(event) => updateAccount(index, "address", event.target.value)} placeholder="123 Main St" />
                    </div>
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input value={account.city} onChange={(event) => updateAccount(index, "city", event.target.value)} />
                    </div>
                    <div className="grid gap-4 grid-cols-[1fr_1fr]">
                      <div className="space-y-2">
                        <Label>State</Label>
                        <Input value={account.state} onChange={(event) => updateAccount(index, "state", event.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>ZIP</Label>
                        <Input value={account.zip} onChange={(event) => updateAccount(index, "zip", event.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Contact Name</Label>
                      <Input value={account.contact_name} onChange={(event) => updateAccount(index, "contact_name", event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Contact Email</Label>
                      <Input value={account.contact_email} onChange={(event) => updateAccount(index, "contact_email", event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Contact Phone</Label>
                      <Input value={account.contact_phone} onChange={(event) => updateAccount(index, "contact_phone", event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Service Type</Label>
                      <Select value={account.service_type} onValueChange={(value) => updateAccount(index, "service_type", value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="plow">Plow</SelectItem>
                          <SelectItem value="shovel">Shovel</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Input value={account.priority} onChange={(event) => updateAccount(index, "priority", event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Geofence Radius (m)</Label>
                      <Input value={account.geofence_radius} onChange={(event) => updateAccount(index, "geofence_radius", event.target.value)} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Notes</Label>
                      <Textarea value={account.notes} onChange={(event) => updateAccount(index, "notes", event.target.value)} rows={2} />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-card/50 border-border/50 sticky top-24">
            <CardHeader>
              <CardTitle>Setup Summary</CardTitle>
              <CardDescription>Quick sanity check before you create the customer.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{organizationName.trim() || "Organization name not set"}</p>
                    <p className="text-xs text-muted-foreground">Plan: {organizationPlan}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">
                      {includePrimaryContact ? primaryContactEmail.trim() || "Primary contact email not set" : "No primary contact"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {includePrimaryContact ? `Role: ${primaryContactRole}` : "You can add this later."}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{summary.userCount} extra users</p>
                    <p className="text-xs text-muted-foreground">{summary.employeeCount} extra employees and {summary.accountCount} starter accounts</p>
                  </div>
                </div>
              </div>

              <Button className="w-full gap-2" onClick={handleSubmit} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Create Customer Workspace
              </Button>
              <Button variant="outline" className="w-full" onClick={resetForm} disabled={isSaving}>
                Clear Draft
              </Button>

              {result && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{result.organization.name}</p>
                    <p className="text-xs text-muted-foreground">Slug: {result.organization.slug}</p>
                  </div>
                  {result.primary_contact && (
                    <div className="text-sm text-muted-foreground">
                      Primary contact: {result.primary_contact.email}
                      {result.primary_contact.invited ? " (invite sent)" : " (existing user linked)"}
                    </div>
                  )}
                  {result.users_created && result.users_created.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      Additional users: {result.users_created.length}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{result.employees_created.length} employees</Badge>
                    <Badge variant="secondary">{result.accounts_created.length} accounts</Badge>
                  </div>
                  <div className="rounded-lg border border-border/50 bg-background/40 p-3 space-y-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">Next workspace step</p>
                      <p className="text-xs text-muted-foreground">
                        {nextWorkspaceStep
                          ? `${nextWorkspaceStep.label}: ${nextWorkspaceStep.detail}`
                          : "Core setup is in place. Open the workspace and review readiness."}
                      </p>
                    </div>
                    <div className="grid gap-2">
                      {resultWorkspaceSteps.map((step) => (
                        <div
                          key={step.label}
                          className="flex items-center justify-between gap-3 rounded-md border border-border/50 bg-background/50 px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">{step.label}</p>
                            <p className="text-xs text-muted-foreground">{step.detail}</p>
                          </div>
                          <Badge
                            variant={step.complete ? "secondary" : "outline"}
                            className={step.complete ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300" : ""}
                          >
                            {step.complete ? "Ready" : "Next"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      size="sm"
                      className="gap-2"
                      onClick={() => handleOpenWorkspace("/admin")}
                      disabled={isSwitchingWorkspace}
                    >
                      {isSwitchingWorkspace ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                      Open Admin Workspace
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => handleOpenWorkspace("/admin/users")}
                      disabled={isSwitchingWorkspace}
                    >
                      <Shield className="h-4 w-4" />
                      Users & Roles
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => handleOpenWorkspace("/admin/employees")}
                      disabled={isSwitchingWorkspace}
                    >
                      <Users className="h-4 w-4" />
                      Employees
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => handleOpenWorkspace("/admin/accounts")}
                      disabled={isSwitchingWorkspace}
                    >
                      <Briefcase className="h-4 w-4" />
                      Accounts
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => handleOpenWorkspace("/admin/equipment")}
                      disabled={isSwitchingWorkspace}
                    >
                      <Wrench className="h-4 w-4" />
                      Equipment
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
