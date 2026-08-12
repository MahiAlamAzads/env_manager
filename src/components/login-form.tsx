"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(data.message ?? "Could not unlock vault.");
      router.replace("/");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not unlock vault.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card border-0 shadow-sm vault-login-card">
      <div className="card-body p-4 p-md-5">
        <div className="eyebrow mb-2">Internal company storage</div>
        <h1 className="h3 mb-2">Company Vault</h1>
        <p className="text-secondary mb-4">
          Unlock names, project environment values, and software admin credentials.
        </p>

        {error ? <div className="alert alert-danger py-2">{error}</div> : null}

        <label className="form-label" htmlFor="vault-password">Access password</label>
        <input
          autoComplete="current-password"
          autoFocus
          className="form-control mb-3"
          id="vault-password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
        <button className="btn btn-dark w-100" disabled={loading || !password} type="submit">
          {loading ? "Unlocking..." : "Unlock vault"}
        </button>
      </div>
    </form>
  );
}
