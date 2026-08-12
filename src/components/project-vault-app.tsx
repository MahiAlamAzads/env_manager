"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CopyIcon, EditIcon, SearchIcon, TrashIcon } from "@/components/icons";
import { VaultNavigation } from "@/components/vault-navigation";
import type {
  ProjectSecretItem,
  ProjectSecretListResponse,
} from "@/types/project-secret";

type Revealed = { envValue: string };

async function copyText(value: string) {
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

export function ProjectVaultApp() {
  const [items, setItems] = useState<ProjectSecretItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [projectName, setProjectName] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [envValue, setEnvValue] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<string, Revealed>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [envValue]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      const response = await fetch(`/api/projects?${params}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as
        | ProjectSecretListResponse
        | { message: string };
      if (!response.ok)
        throw new Error(
          "message" in data ? data.message : "Could not load projects.",
        );
      const list = data as ProjectSecretListResponse;
      setItems(list.items);
      setTotal(list.total);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not load projects.",
      );
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 200);
    return () => clearTimeout(timer);
  }, [load]);

  async function reveal(item: ProjectSecretItem): Promise<Revealed> {
    const existing = revealed[item.id];
    if (existing) return existing;
    const response = await fetch(`/api/projects/${item.id}/reveal`, {
      cache: "no-store",
    });
    const data = (await response.json()) as Revealed | { message: string };
    if (!response.ok)
      throw new Error(
        "message" in data ? data.message : "Could not reveal .env.",
      );
    const secret = data as Revealed;
    setRevealed((current) => ({ ...current, [item.id]: secret }));
    return secret;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch(
        editingId ? `/api/projects/${editingId}` : "/api/projects",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectName, githubUrl, envValue }),
        },
      );
      const data = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(data.message ?? "Could not save project.");
      setProjectName("");
      setGithubUrl("");
      setEnvValue("");
      setEditingId(null);
      setRevealed({});
      setNotice("Project saved securely.");
      await load();
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not save project.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function edit(item: ProjectSecretItem) {
    try {
      const secret = await reveal(item);
      setEditingId(item.id);
      setProjectName(item.projectName);
      setGithubUrl(item.githubUrl);
      setEnvValue(secret.envValue);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not edit project.",
      );
    }
  }

  async function remove(item: ProjectSecretItem) {
    if (!window.confirm(`Delete ${item.projectName}?`)) return;
    const response = await fetch(`/api/projects/${item.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const data = (await response.json()) as { message?: string };
      setNotice(data.message ?? "Could not delete project.");
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
          <div className="eyebrow mb-1">Encrypted project storage</div>
          <h1 className="h3 mb-1">Project Secrets</h1>
          <p className="text-secondary mb-0">
            Save a GitHub repository link and the project&apos;s full .env text.
          </p>
        </div>

        {notice ? (
          <div className="alert alert-secondary py-2">{notice}</div>
        ) : null}

        <section className="card border-0 shadow-sm mb-4">
          <div className="card-body p-3 p-lg-4">
            <form onSubmit={submit}>
              <div className="row g-3">
                <div className="col-12 col-lg-4">
                  <label className="form-label" htmlFor="project-name">
                    Project name
                  </label>
                  <input
                    className="form-control"
                    id="project-name"
                    maxLength={200}
                    required
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </div>
                <div className="col-12 col-lg-8">
                  <label className="form-label" htmlFor="github-url">
                    GitHub URL
                  </label>
                  <input
                    className="form-control"
                    id="github-url"
                    maxLength={500}
                    placeholder="https://github.com/company/project"
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                  />
                </div>
                <div className="col-12">
                  <div className="d-flex justify-content-between align-items-center gap-2 mb-1">
                    <label className="form-label mb-0" htmlFor="env-value">
                      .env value
                    </label>
                    <button
                      className="btn btn-sm btn-light border"
                      type="button"
                      onClick={() => void copyText(envValue)}
                    >
                      <CopyIcon className="me-1" />
                      Copy
                    </button>
                  </div>
                  <textarea
                    ref={textareaRef}
                    className="form-control font-monospace vault-secret-textarea"
                    id="env-value"
                    placeholder={'DATABASE_URL="..."\nAPI_KEY="..."'}
                    value={envValue}
                    onChange={(e) => setEnvValue(e.target.value)}
                  />
                </div>
                <div className="col-12 d-flex flex-wrap gap-2">
                  <button
                    className="btn btn-dark"
                    disabled={saving}
                    type="submit"
                  >
                    {saving
                      ? "Saving..."
                      : editingId
                        ? "Update project"
                        : "Save project"}
                  </button>
                  {editingId ? (
                    <button
                      className="btn btn-light border"
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setProjectName("");
                        setGithubUrl("");
                        setEnvValue("");
                      }}
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </div>
            </form>
          </div>
        </section>

        <section className="card border-0 shadow-sm overflow-hidden">
          <div className="card-header bg-white p-3 d-flex flex-column flex-md-row justify-content-between gap-3 align-items-md-center">
            <div>
              <h2 className="h6 mb-1">Saved projects</h2>
              <div className="small text-secondary">{total} records</div>
            </div>
            <div className="input-group table-toolbar">
              <span className="input-group-text bg-white">
                <SearchIcon />
              </span>
              <input
                className="form-control"
                placeholder="Search project or GitHub URL"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="table-responsive">
            <table className="table align-middle mb-0 name-table vault-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>GitHub</th>
                  <th>.env</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-5 text-center text-secondary">
                      Loading...
                    </td>
                  </tr>
                ) : null}
                {!loading && !items.length ? (
                  <tr>
                    <td colSpan={4} className="py-5 text-center text-secondary">
                      No projects saved.
                    </td>
                  </tr>
                ) : null}
                {items.map((item) => {
                  const secret = revealed[item.id];
                  return (
                    <tr key={item.id}>
                      <td data-label="Project" className="fw-semibold">
                        {item.projectName}
                      </td>
                      <td data-label="GitHub">
                        {item.githubUrl ? (
                          <a
                            href={item.githubUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open repository
                          </a>
                        ) : (
                          <span className="text-secondary">—</span>
                        )}
                      </td>
                      <td data-label=".env">
                        <code className="vault-mask">
                          {secret
                            ? `${secret.envValue.slice(0, 40)}${secret.envValue.length > 40 ? "…" : ""}`
                            : "••••••••••••"}
                        </code>
                      </td>
                      <td data-label="Actions">
                        <div className="d-flex justify-content-end flex-wrap gap-1">
                          <button
                            className="btn btn-sm btn-light border"
                            type="button"
                            onClick={() =>
                              secret
                                ? setRevealed((current) => {
                                    const next = { ...current };
                                    delete next[item.id];
                                    return next;
                                  })
                                : void reveal(item).catch((error) =>
                                    setNotice(error.message),
                                  )
                            }
                          >
                            {secret ? "Hide" : "Reveal"}
                          </button>
                          <button
                            className="btn btn-sm btn-light border"
                            type="button"
                            onClick={() =>
                              void reveal(item)
                                .then((value) => copyText(value.envValue))
                                .then(() => setNotice(".env copied."))
                                .catch((error) => setNotice(error.message))
                            }
                          >
                            <CopyIcon />
                          </button>
                          <button
                            className="btn btn-sm btn-light border"
                            type="button"
                            onClick={() => void edit(item)}
                          >
                            <EditIcon />
                          </button>
                          <button
                            className="btn btn-sm btn-light border text-danger"
                            type="button"
                            onClick={() => void remove(item)}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
