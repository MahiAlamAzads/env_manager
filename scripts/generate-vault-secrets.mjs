import { randomBytes } from "node:crypto";

console.log(`APP_ACCESS_PASSWORD="${randomBytes(18).toString("base64url")}"`);
console.log(`VAULT_ENCRYPTION_KEY="${randomBytes(32).toString("base64")}"`);
console.log(`VAULT_SESSION_SECRET="${randomBytes(48).toString("base64")}"`);
