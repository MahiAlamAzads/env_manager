"use client";

import { useCallback, useEffect, useState } from "react";
import { CopyIcon, EditIcon, SearchIcon, TrashIcon } from "@/components/icons";
import { VaultNavigation } from "@/components/vault-navigation";
import type { AdminCredentialItem, AdminCredentialListResponse } from "@/types/admin-credential";

type Revealed = { email: string; username: string; password: string };

async function copyText(value: string) {
  if (!value) return;
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export function CredentialVaultApp() {
  const [items, setItems] = useState<AdminCredentialItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [softwareName, setSoftwareName] = useState("");
  const [adminUrl, setAdminUrl] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<string, Revealed>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      const response = await fetch(`/api/credentials?${params}`, { cache: "no-store" });
      const data = (await response.json()) as AdminCredentialListResponse | { message: string };
      if (!response.ok) throw new Error("message" in data ? data.message : "Could not load credentials.");
      const list = data as AdminCredentialListResponse;
      setItems(list.items);
      setTotal(list.total);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not load credentials.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 200);
    return () => clearTimeout(timer);
  }, [load]);

  async function reveal(item: AdminCredentialItem): Promise<Revealed> {
    const existing = revealed[item.id];
    if (existing) return existing;
    const response = await fetch(`/api/credentials/${item.id}/reveal`, { cache: "no-store" });
    const data = (await response.json()) as Revealed | { message: string };
    if (!response.ok) throw new Error("message" in data ? data.message : "Could not reveal credential.");
    const secret = data as Revealed;
    setRevealed((current) => ({ ...current, [item.id]: secret }));
    return secret;
  }

  function clearForm() {
    setEditingId(null);
    setSoftwareName("");
    setAdminUrl("");
    setEmail("");
    setUsername("");
    setPassword("");
    setShowFormPassword(false);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch(editingId ? `/api/credentials/${editingId}` : "/api/credentials", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ softwareName, adminUrl, email, username, password }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(data.message ?? "Could not save credential.");
      clearForm();
      setRevealed({});
      setNotice("Credential saved securely.");
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save credential.");
    } finally {
      setSaving(false);
    }
  }

  async function edit(item: AdminCredentialItem) {
    try {
      const secret = await reveal(item);
      setEditingId(item.id);
      setSoftwareName(item.softwareName);
      setAdminUrl(item.adminUrl);
      setEmail(secret.email);
      setUsername(secret.username);
      setPassword(secret.password);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not edit credential.");
    }
  }

  async function remove(item: AdminCredentialItem) {
    if (!window.confirm(`Delete admin credential for ${item.softwareName}?`)) return;
    const response = await fetch(`/api/credentials/${item.id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = (await response.json()) as { message?: string };
      setNotice(data.message ?? "Could not delete credential.");
      return;
    }
    setRevealed((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });
    await load();
  }

  return (
    <main className="app-shell">
      <div className="container-xl py-3 py-lg-4">
        <VaultNavigation />
        <div className="mb-4">
          <div className="eyebrow mb-1">Encrypted internal access</div>
          <h1 className="h3 mb-1">Software Admin Vault</h1>
          <p className="text-secondary mb-0">Store each company software&apos;s admin URL, email/username, and password.</p>
        </div>

        {notice ? <div className="alert alert-secondary py-2">{notice}</div> : null}

        <section className="card border-0 shadow-sm mb-4">
          <div className="card-body p-3 p-lg-4">
            <form onSubmit={submit}>
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label" htmlFor="software-name">Software name</label>
                  <input className="form-control" id="software-name" maxLength={200} required value={softwareName} onChange={(e) => setSoftwareName(e.target.value)} />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label" htmlFor="admin-url">Admin URL</label>
                  <input className="form-control" id="admin-url" maxLength={500} placeholder="https://example.com/admin" type="url" value={adminUrl} onChange={(e) => setAdminUrl(e.target.value)} />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label" htmlFor="admin-email">Email</label>
                  <input autoComplete="off" className="form-control" id="admin-email" maxLength={320} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label" htmlFor="admin-username">Username</label>
                  <input autoComplete="off" className="form-control" id="admin-username" maxLength={200} value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
                <div className="col-12">
                  <label className="form-label" htmlFor="admin-password">Password</label>
                  <div className="input-group">
                    <input autoComplete="new-password" className="form-control font-monospace" id="admin-password" maxLength={1000} required type={showFormPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} />
                    <button className="btn btn-outline-secondary" type="button" onClick={() => setShowFormPassword((value) => !value)}>{showFormPassword ? "Hide" : "Show"}</button>
                    <button className="btn btn-outline-secondary" type="button" onClick={() => void copyText(password)}><CopyIcon /></button>
                  </div>
                </div>
                <div className="col-12 d-flex flex-wrap gap-2">
                  <button className="btn btn-dark" disabled={saving} type="submit">{saving ? "Saving..." : editingId ? "Update credential" : "Save credential"}</button>
                  {editingId ? <button className="btn btn-light border" type="button" onClick={clearForm}>Cancel</button> : null}
                </div>
              </div>
            </form>
          </div>
        </section>

        <section className="card border-0 shadow-sm overflow-hidden">
          <div className="card-header bg-white p-3 d-flex flex-column flex-md-row justify-content-between gap-3 align-items-md-center">
            <div><h2 className="h6 mb-1">Saved credentials</h2><div className="small text-secondary">{total} records</div></div>
            <div className="input-group table-toolbar"><span className="input-group-text bg-white"><SearchIcon /></span><input className="form-control" placeholder="Search software or URL" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          </div>
          <div className="table-responsive">
            <table className="table align-middle mb-0 name-table vault-table">
              <thead><tr><th>Software</th><th>Login</th><th>Password</th><th className="text-end">Actions</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={4} className="py-5 text-center text-secondary">Loading...</td></tr> : null}
                {!loading && !items.length ? <tr><td colSpan={4} className="py-5 text-center text-secondary">No credentials saved.</td></tr> : null}
                {items.map((item) => {
                  const secret = revealed[item.id];
                  const login = secret ? secret.email || secret.username || "—" : "••••••••";
                  return <tr key={item.id}>
                    <td data-label="Software"><div className="fw-semibold">{item.softwareName}</div>{item.adminUrl ? <a className="small" href={item.adminUrl} target="_blank" rel="noreferrer">Open admin</a> : null}</td>
                    <td data-label="Login"><code>{login}</code></td>
                    <td data-label="Password"><code className="vault-mask">{secret ? secret.password : "••••••••••••"}</code></td>
                    <td data-label="Actions"><div className="d-flex justify-content-end flex-wrap gap-1">
                      <button className="btn btn-sm btn-light border" type="button" onClick={() => secret ? setRevealed((current) => { const next = { ...current }; delete next[item.id]; return next; }) : void reveal(item).catch((error) => setNotice(error.message))}>{secret ? "Hide" : "Reveal"}</button>
                      <button className="btn btn-sm btn-light border" title="Copy login" type="button" onClick={() => void reveal(item).then((value) => copyText(value.email || value.username)).then(() => setNotice("Login copied.")).catch((error) => setNotice(error.message))}><CopyIcon /></button>
                      <button className="btn btn-sm btn-dark" title="Copy password" type="button" onClick={() => void reveal(item).then((value) => copyText(value.password)).then(() => setNotice("Password copied.")).catch((error) => setNotice(error.message))}>Copy password</button>
                      <button className="btn btn-sm btn-light border" type="button" onClick={() => void edit(item)}><EditIcon /></button>
                      <button className="btn btn-sm btn-light border text-danger" type="button" onClick={() => void remove(item)}><TrashIcon /></button>
                    </div></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
