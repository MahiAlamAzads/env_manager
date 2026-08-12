import { CredentialVaultApp } from "@/components/credential-vault-app";
import { requirePageSession } from "@/lib/page-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function CredentialsPage() {
  await requirePageSession();
  return <CredentialVaultApp />;
}
