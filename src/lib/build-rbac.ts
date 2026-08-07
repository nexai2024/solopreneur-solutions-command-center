import type { DbUser } from "@/lib/auth";

export type UserRole = "admin" | "dev" | "qa" | "viewer";

export type BuildPipelineStatus =
  | "queued"
  | "building"
  | "success"
  | "failed"
  | "in_qa"
  | "approved"
  | "released";

export const PIPELINE_COLUMNS: Array<{
  id: BuildPipelineStatus;
  label: string;
}> = [
  { id: "queued", label: "Queued" },
  { id: "building", label: "Building" },
  { id: "success", label: "Success" },
  { id: "failed", label: "Failed" },
  { id: "in_qa", label: "In QA" },
  { id: "approved", label: "Approved" },
  { id: "released", label: "Released" },
];

export const BUILD_PLATFORMS = ["ios", "android", "web"] as const;
export type BuildPlatform = (typeof BUILD_PLATFORMS)[number];

export const ARTIFACT_TYPES = ["apk", "aab", "ipa", "zip", "url"] as const;
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export function getUserRole(user: DbUser): UserRole {
  const role = user.role as UserRole;
  if (["admin", "dev", "qa", "viewer"].includes(role)) return role;
  return "admin";
}

export function canManageBuilds(role: UserRole): boolean {
  return role === "admin";
}

export function canUploadBuilds(role: UserRole): boolean {
  return role === "admin" || role === "dev";
}

export function canUpdatePipelineStatus(role: UserRole, status: BuildPipelineStatus): boolean {
  if (role === "admin") return true;
  if (role === "dev") return ["queued", "building", "success", "failed"].includes(status);
  if (role === "qa") return ["in_qa", "approved"].includes(status);
  return false;
}

export function canViewAndDownload(role: UserRole): boolean {
  return true;
}

export function canDeleteBuilds(role: UserRole): boolean {
  return role === "admin";
}

export function repoBuildStatusToPipeline(
  status: string
): BuildPipelineStatus {
  switch (status) {
    case "pending":
      return "queued";
    case "building":
      return "building";
    case "passed":
      return "success";
    case "failed":
      return "failed";
    default:
      return "queued";
  }
}

export function pipelineLabel(status: string): string {
  return PIPELINE_COLUMNS.find((c) => c.id === status)?.label ?? status;
}
