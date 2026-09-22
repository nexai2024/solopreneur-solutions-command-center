"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function EarlyAccessSignupForm({ slug }: { slug: string }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    try {
      const res = await fetch(`/api/early/${slug}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, company, website }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signup failed");
      setDone(true);
      toast.success(
        data.duplicate ? "You’re already on the list" : "You’re on the list"
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setPending(false);
    }
  };

  if (done) {
    return (
      <p className="text-sm text-muted-foreground">
        Thanks — we’ll reach out when a seat opens.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 max-w-md">
      <Input
        type="email"
        required
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        placeholder="Name (optional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Input
        placeholder="Company (optional)"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
      />
      {/* honeypot */}
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
      />
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin mr-1" />
        ) : null}
        Request early access
      </Button>
    </form>
  );
}
