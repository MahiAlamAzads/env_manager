# Name Table / Company Vault PWA — Full Source

This archive is a complete source tree. No patch/apply script is required.

Quick start:

```bash
cp .env.example .env
npm run vault:secrets
# copy generated values into .env and set DATABASE_URL
npm install
npm run db:generate
npm run db:migrate
npm run typecheck
npm run build
npm run dev
```

Or run `./setup-full-source.sh` after configuring `.env`.

---

Internal Next.js + PostgreSQL + Prisma PWA with three protected modules:

- Names: two-name table with copy/edit/delete and Excel export.
- Projects: project name, GitHub URL, and encrypted `.env` text.
- Admin Vault: software admin URL plus encrypted email/username/password.

## Security model

`ProjectSecret.encryptedPayload` and `AdminCredential.encryptedPayload` use AES-256-GCM. The encryption key is not stored in PostgreSQL. Protected pages use an HTTP-only, SameSite=Strict signed session cookie. API and protected page responses are `no-store`; the PWA service worker never caches protected navigation responses.

This is a simple shared-password internal vault, not a multi-user enterprise password manager. For an Internet-facing deployment, add SSO/MFA or place it behind a VPN/Cloudflare Access/Tailscale and use HTTPS.

## Required environment variables

```env
DATABASE_URL="postgresql://..."
APP_ACCESS_PASSWORD="..."
VAULT_ENCRYPTION_KEY="..."
VAULT_SESSION_SECRET="..."
```

Generate strong values:

```bash
npm run vault:secrets
```

Keep `VAULT_ENCRYPTION_KEY` backed up securely. If it is lost, encrypted records cannot be recovered. If you change it after storing data, old records cannot be decrypted without a key-rotation migration.

## Database

```bash
npm install
npm run db:generate
npm run db:migrate
npm run typecheck
npm run build
```

Development:

```bash
npm run dev
```