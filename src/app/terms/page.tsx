import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-8">
        <div>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to home
          </Link>
          <h1 className="text-3xl font-bold mt-4">Terms of Service</h1>
          <p className="text-muted-foreground mt-2">Last updated: August 5, 2026</p>
        </div>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="text-lg font-semibold">Acceptance</h2>
          <p>
            By using Solopreneur OS you agree to these terms. If you do not agree, do not use the
            service.
          </p>

          <h2 className="text-lg font-semibold">Service</h2>
          <p>
            We provide a solopreneur command center for idea validation, project tracking, leads,
            and integrations. Features may change; we will try to give reasonable notice for
            material changes.
          </p>

          <h2 className="text-lg font-semibold">Your content</h2>
          <p>
            You retain ownership of content you create. You grant us a license to store and process
            it solely to operate the service.
          </p>

          <h2 className="text-lg font-semibold">Acceptable use</h2>
          <p>
            Do not abuse AI endpoints, scrape the service, upload malware, or use the platform for
            unlawful purposes. We may suspend accounts that violate these terms.
          </p>

          <h2 className="text-lg font-semibold">Billing</h2>
          <p>
            Paid plans are billed via Stripe. Subscriptions renew until canceled. Refunds are at
            our discretion unless required by law.
          </p>

          <h2 className="text-lg font-semibold">Disclaimer</h2>
          <p>
            The service is provided &quot;as is&quot; without warranties. AI outputs are suggestions,
            not professional advice.
          </p>
        </section>
      </div>
    </div>
  );
}
