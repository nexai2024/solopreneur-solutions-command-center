import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-8">
        <div>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to home
          </Link>
          <h1 className="text-3xl font-bold mt-4">Privacy Policy</h1>
          <p className="text-muted-foreground mt-2">Last updated: August 5, 2026</p>
        </div>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="text-lg font-semibold">What we collect</h2>
          <p>
            Solopreneur OS stores account information from Clerk (email, name), project data,
            ideas, leads, build metadata, and optional GitHub/Vercel integration tokens (encrypted
            at rest).
          </p>

          <h2 className="text-lg font-semibold">How we use data</h2>
          <p>
            Data powers your dashboard: task tracking, AI scoring, lead management, and repository
            monitoring. We do not sell personal data.
          </p>

          <h2 className="text-lg font-semibold">Third parties</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Clerk — authentication</li>
            <li>OpenAI — AI features (prompts sent when you use AI tools)</li>
            <li>Stripe — billing (if enabled)</li>
            <li>GitHub / Vercel — optional integrations you connect</li>
          </ul>

          <h2 className="text-lg font-semibold">Your rights (GDPR)</h2>
          <p>
            You may export or delete your data from Settings → Account (or contact support).
            Export includes projects, ideas, leads, and related records. Deletion is permanent.
          </p>

          <h2 className="text-lg font-semibold">Contact</h2>
          <p>
            Questions: privacy@yourdomain.com (replace with your support email before production).
          </p>
        </section>
      </div>
    </div>
  );
}
