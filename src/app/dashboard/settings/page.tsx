import { SettingsWorkspace } from "@/components/settings/settings-workspace";
import { getProductionReadiness } from "@/lib/actions/production-readiness";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const readiness = await getProductionReadiness();

  return <SettingsWorkspace initialReadiness={readiness} />;
}
