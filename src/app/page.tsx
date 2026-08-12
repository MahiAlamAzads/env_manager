import { ProjectVaultApp } from "@/components/project-vault-app";
import { requirePageSession } from "@/lib/page-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ProjectsPage() {
  await requirePageSession();
  return <ProjectVaultApp />;
}
