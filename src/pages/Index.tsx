import { FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, Bell, Building2, CheckCircle2, ClipboardCheck, MapPin, Shield, Snowflake, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type LeadForm = {
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  service_area: string;
  fleet_size: string;
  customer_type: string;
  message: string;
};

const featureCards = [
  {
    icon: MapPin,
    title: "Live Operations Visibility",
    description: "Track crews, accounts, equipment, and active shifts in one place while storms are happening.",
  },
  {
    icon: ClipboardCheck,
    title: "Work Logs That Stay Organized",
    description: "Capture service activity, photos, notes, and timing without chasing paper or text messages.",
  },
  {
    icon: Bell,
    title: "Notifications That Actually Help",
    description: "Push overtime, maintenance, shift, and customer communication to the right people fast.",
  },
  {
    icon: BarChart3,
    title: "Admin Reporting For Real Crews",
    description: "See what is happening across every customer workspace without bouncing between tools.",
  },
];

const audienceCards = [
  {
    title: "Snow & Ice Contractors",
    body: "Manage field crews, dispatch, equipment, overtime, and customer communication in one operating system.",
  },
  {
    title: "Property Managers",
    body: "Give customers a clean portal experience while your team keeps every site, shift, and account organized behind the scenes.",
  },
  {
    title: "Growing Service Teams",
    body: "Create customer workspaces, add employees, assign roles, and scale operations without rebuilding your process every season.",
  },
];

export default function Index() {
  const { user, roles, isAdminOrManager } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<LeadForm>({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    service_area: "",
    fleet_size: "",
    customer_type: "contractor",
    message: "",
  });

  const appCta = useMemo(() => {
    if (!user) {
      return { href: "/auth", label: "Customer Login" };
    }

    if (isAdminOrManager()) {
      return { href: "/admin", label: "Open Admin Workspace" };
    }

    if (roles.includes("shovel_crew")) {
      return { href: "/shovel", label: "Open Crew Dashboard" };
    }

    return { href: "/dashboard", label: "Open WinterWatch App" };
  }, [user, roles, isAdminOrManager]);

  const updateField = (key: keyof LeadForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!form.company_name.trim() || !form.contact_name.trim() || !form.email.trim()) {
      toast({
        variant: "destructive",
        title: "Missing details",
        description: "Add your company, contact name, and email so we can reach you.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("marketing_leads").insert({
        company_name: form.company_name.trim(),
        contact_name: form.contact_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        service_area: form.service_area.trim() || null,
        fleet_size: form.fleet_size.trim() || null,
        customer_type: form.customer_type,
        message: form.message.trim() || null,
      });

      if (error) {
        throw error;
      }

      setSubmitted(true);
      setForm({
        company_name: "",
        contact_name: "",
        email: "",
        phone: "",
        service_area: "",
        fleet_size: "",
        customer_type: "contractor",
        message: "",
      });
      toast({
        title: "Request received",
        description: "Your WinterWatch-Pro request is in. We can follow up with onboarding, pricing, or a demo.",
      });
    } catch (error) {
      console.error("Marketing lead submit failed:", error);
      toast({
        variant: "destructive",
        title: "Request failed",
        description: error instanceof Error ? error.message : "Please try again in a minute.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_35%),linear-gradient(180deg,#071120_0%,#0b1527_42%,#0f172a_100%)] text-foreground">
      <section className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link to="/" className="flex items-center gap-3">
            <img src="/favicon.png" alt="WinterWatch-Pro" className="h-11 w-11 rounded-2xl border border-white/10 object-cover shadow-lg" />
            <div>
              <p className="text-xl font-semibold tracking-tight text-white">WinterWatch-Pro</p>
              <p className="text-xs uppercase tracking-[0.24em] text-sky-200/70">Snow Operations OS</p>
            </div>
          </Link>
          <div className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            <a href="#features" className="transition hover:text-white">Features</a>
            <a href="#pricing" className="transition hover:text-white">Pricing</a>
            <a href="#customers" className="transition hover:text-white">Customers</a>
            <a href="#contact" className="transition hover:text-white">Contact</a>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" className="text-slate-200 hover:text-white">
              <Link to="/auth?portal=client">Existing Customer</Link>
            </Button>
            <Button asChild className="bg-sky-500 text-slate-950 hover:bg-sky-400">
              <Link to={appCta.href}>{appCta.label}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:py-28">
        <div className="space-y-8">
          <Badge className="w-fit border-sky-400/30 bg-sky-400/10 px-3 py-1 text-sky-100">
            Built for contractors, property managers, and winter service teams
          </Badge>
          <div className="space-y-5">
            <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-white sm:text-6xl">
              Winter service operations, customer onboarding, and crew visibility in one system.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300">
              WinterWatch-Pro gives you a public-facing customer experience and the internal control center to run crews,
              work logs, equipment, notifications, accounts, and customer workspaces without the clunky handoff between tools.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="gap-2 bg-sky-500 text-slate-950 hover:bg-sky-400">
              <a href="#contact">
                Request Demo
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
              <Link to="/auth?mode=signup&portal=client">Create Customer Account</Link>
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="border-white/10 bg-white/5">
              <CardContent className="pt-5">
                <p className="text-3xl font-semibold text-white">1</p>
                <p className="mt-2 text-sm text-slate-300">Platform for marketing, onboarding, and daily snow operations</p>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-white/5">
              <CardContent className="pt-5">
                <p className="text-3xl font-semibold text-white">24/7</p>
                <p className="mt-2 text-sm text-slate-300">Customer portal and crew access during live weather events</p>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-white/5">
              <CardContent className="pt-5">
                <p className="text-3xl font-semibold text-white">Multi-tenant</p>
                <p className="mt-2 text-sm text-slate-300">Separate customer workspaces with scoped users, accounts, and records</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="border-white/10 bg-slate-950/55 shadow-2xl shadow-sky-950/30">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-sky-500/15 p-3 text-sky-300">
                <Snowflake className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-2xl text-white">Request WinterWatch-Pro</CardTitle>
                <CardDescription className="text-slate-300">
                  Start a new customer signup, request a demo, or have us map your operation into the platform.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="space-y-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-300" />
                  <div>
                    <p className="font-medium text-white">You’re in the queue.</p>
                    <p className="text-sm text-slate-300">We received your request and can follow up with onboarding, pricing, or a demo.</p>
                  </div>
                </div>
                <Button variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={() => setSubmitted(false)}>
                  Submit Another Request
                </Button>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Company</Label>
                    <Input id="company_name" value={form.company_name} onChange={(event) => updateField("company_name", event.target.value)} placeholder="North Ridge Snow Services" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_name">Contact Name</Label>
                    <Input id="contact_name" value={form.contact_name} onChange={(event) => updateField("contact_name", event.target.value)} placeholder="Morgan Lee" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder="morgan@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} placeholder="(555) 555-1212" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="service_area">Service Area</Label>
                    <Input id="service_area" value={form.service_area} onChange={(event) => updateField("service_area", event.target.value)} placeholder="Milwaukee, Madison, Green Bay" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fleet_size">Fleet / Crew Size</Label>
                    <Input id="fleet_size" value={form.fleet_size} onChange={(event) => updateField("fleet_size", event.target.value)} placeholder="12 trucks, 35 staff" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_type">Customer Type</Label>
                  <Input id="customer_type" value={form.customer_type} onChange={(event) => updateField("customer_type", event.target.value)} placeholder="contractor, property manager, facilities team" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">What do you need?</Label>
                  <Textarea
                    id="message"
                    rows={5}
                    value={form.message}
                    onChange={(event) => updateField("message", event.target.value)}
                    placeholder="Tell us about your customers, crews, accounts, or what you want WinterWatch-Pro to handle."
                  />
                </div>
                <Button type="submit" className="w-full bg-sky-500 text-slate-950 hover:bg-sky-400" disabled={isSubmitting}>
                  {isSubmitting ? "Sending..." : "Request Setup / Demo"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10 max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-sky-200/75">Why WinterWatch-Pro</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-white">A website and operations platform built for actual winter service teams.</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {featureCards.map((item) => (
            <Card key={item.title} className="border-white/10 bg-white/5">
              <CardHeader>
                <div className="w-fit rounded-2xl bg-sky-500/15 p-3 text-sky-300">
                  <item.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-xl text-white">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-7 text-slate-300">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="customers" className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-6 lg:grid-cols-3">
          {audienceCards.map((item) => (
            <Card key={item.title} className="border-white/10 bg-slate-950/45">
              <CardHeader>
                <CardTitle className="text-2xl text-white">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="leading-7 text-slate-300">{item.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8 max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-sky-200/75">Pricing</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-white">Simple plans for launch, growth, and larger winter operations.</h2>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="text-white">Launch</CardTitle>
              <CardDescription className="text-slate-300">For smaller teams getting off spreadsheets and text threads.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-300">
              <p className="text-3xl font-semibold text-white">Starter setup</p>
              <p>Customer workspaces, crew access, core dashboards, and account management.</p>
            </CardContent>
          </Card>
          <Card className="border-sky-400/30 bg-sky-500/10 shadow-xl shadow-sky-950/20">
            <CardHeader>
              <Badge className="w-fit bg-sky-500 text-slate-950">Most Popular</Badge>
              <CardTitle className="text-white">Growth</CardTitle>
              <CardDescription className="text-slate-200">For contractors scaling customer count, crews, and reporting.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-200">
              <p className="text-3xl font-semibold text-white">Operational scale</p>
              <p>Multi-customer workspace management, reporting, notifications, and deeper onboarding support.</p>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="text-white">Enterprise</CardTitle>
              <CardDescription className="text-slate-300">For larger winter operations that need workflow shaping and rollout help.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-300">
              <p className="text-3xl font-semibold text-white">Custom rollout</p>
              <p>Dedicated onboarding, customer separation planning, and higher-touch implementation.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="contact" className="mx-auto max-w-7xl px-6 py-16">
        <Card className="border-white/10 bg-gradient-to-r from-slate-950/70 to-sky-950/40">
          <CardContent className="flex flex-col gap-6 p-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-sky-200/75">Ready to roll this out?</p>
              <h2 className="text-4xl font-semibold tracking-tight text-white">Give new customers a professional front door and give your team a better back office.</h2>
              <p className="text-slate-300">
                Use WinterWatch-Pro to market your service, onboard new customers, keep current customers logging in cleanly,
                and manage workspaces, users, employees, accounts, and equipment behind the scenes.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-sky-500 text-slate-950 hover:bg-sky-400">
                <a href="#contact">Request Demo</a>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
                <Link to="/auth?portal=client">Existing Customer Login</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
