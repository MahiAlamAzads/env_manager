"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CopyIcon,
  DownloadIcon,
  EditIcon,
  RefreshIcon,
  SaveIcon,
  SearchIcon,
  TrashIcon,
} from "@/components/icons";
import { VaultNavigation } from "@/components/vault-navigation";
import type { NameEntry, NameListResponse } from "@/types/name-entry";

type Notice = {
  type: "success" | "danger";
  message: string;
};

const DEFAULT_PAGE_SIZE = 25;

export function NameTableApp() {
  const [items, setItems] = useState<NameEntry[]>([]);
  const [nameOne, setNameOne] = useState("");
  const [nameTwo, setNameTwo] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNameOne, setEditNameOne] = useState("");
  const [editNameTwo, setEditNameTwo] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotice = useCallback((nextNotice: Notice) => {
    setNotice(nextNotice);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 3000);
  }, []);

  const loadItems = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(DEFAULT_PAGE_SIZE),
        });
        if (search.trim()) params.set("search", search.trim());

        const response = await fetch(`/api/names?${params}`, {
          cache: "no-store",
          signal,
        });
        const data = (await response.json()) as NameListResponse | { message: string };
        if (!response.ok) {
          throw new Error("message" in data ? data.message : "Could not load names.");
        }

        const list = data as NameListResponse;
        setItems(list.items);
        setTotal(list.total);
        setTotalPages(list.totalPages);

        if (page > list.totalPages) setPage(list.totalPages);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        showNotice({
          type: "danger",
          message: error instanceof Error ? error.message : "Could not load names.",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [page, search, showNotice],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => void loadItems(controller.signal), 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [loadItems]);

  useEffect(() => {
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nameOne.trim() && !nameTwo.trim()) {
      showNotice({ type: "danger", message: "Enter at least one name." });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nameOne, nameTwo }),
      });
      const data = (await response.json()) as NameEntry | { message: string };
      if (!response.ok) {
        throw new Error("message" in data ? data.message : "Could not save the name.");
      }

      setNameOne("");
      setNameTwo("");
      showNotice({ type: "success", message: "Name saved." });

      if (page === 1 && !search.trim()) {
        await loadItems();
      } else {
        setSearch("");
        setPage(1);
      }
    } catch (error) {
      showNotice({
        type: "danger",
        message: error instanceof Error ? error.message : "Could not save the name.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  function startEdit(item: NameEntry) {
    setEditingId(item.id);
    setEditNameOne(item.nameOne);
    setEditNameTwo(item.nameTwo);
  }

  async function saveEdit(id: string) {
    if (!editNameOne.trim() && !editNameTwo.trim()) {
      showNotice({ type: "danger", message: "Enter at least one name." });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/names/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nameOne: editNameOne, nameTwo: editNameTwo }),
      });
      const data = (await response.json()) as NameEntry | { message: string };
      if (!response.ok) {
        throw new Error("message" in data ? data.message : "Could not update the name.");
      }

      setEditingId(null);
      showNotice({ type: "success", message: "Name updated." });
      await loadItems();
    } catch (error) {
      showNotice({
        type: "danger",
        message: error instanceof Error ? error.message : "Could not update the name.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteItem(item: NameEntry) {
    const label = [item.nameOne, item.nameTwo].filter(Boolean).join(" / ");
    if (!window.confirm(`Delete “${label}”?`)) return;

    try {
      const response = await fetch(`/api/names/${item.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        throw new Error(data.message ?? "Could not delete the name.");
      }

      showNotice({ type: "success", message: "Name deleted." });
      await loadItems();
    } catch (error) {
      showNotice({
        type: "danger",
        message: error instanceof Error ? error.message : "Could not delete the name.",
      });
    }
  }

  async function copyText(text: string, message: string) {
    if (!text) {
      showNotice({ type: "danger", message: "Nothing to copy." });
      return;
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        textarea.remove();
        if (!copied) throw new Error("Copy command failed.");
      }
      showNotice({ type: "success", message });
    } catch {
      showNotice({ type: "danger", message: "Clipboard access was blocked." });
    }
  }

  function copyBoth(first: string, second: string) {
    const text = [first, second].filter(Boolean).join("\n");
    return copyText(text, "Both names copied.");
  }

  const firstVisible = items.length === 0 ? 0 : (page - 1) * DEFAULT_PAGE_SIZE + 1;
  const lastVisible = items.length === 0 ? 0 : firstVisible + items.length - 1;

  return (
    <main className="app-shell">
      <div className="container-xl py-3 py-lg-4">
        <VaultNavigation />
        <header className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3 mb-4">
          <div>
            <div className="eyebrow mb-1">Company data vault</div>
            <h1 className="h3 mb-1">Name Table</h1>
            <p className="text-secondary mb-0">Store, search, copy, edit, and export names.</p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <a className="btn btn-dark" href="/api/export">
              <DownloadIcon className="me-2" />
              Export Excel
            </a>
          </div>
        </header>

        {notice ? (
          <div className={`alert alert-${notice.type} py-2`} role="status">
            {notice.message}
          </div>
        ) : null}

        <section className="card border-0 shadow-sm mb-4">
          <div className="card-body p-3 p-lg-4">
            <form onSubmit={handleCreate}>
              <div className="row g-3 align-items-end">
                <div className="col-12 col-lg-5">
                  <label className="form-label" htmlFor="name-one">Name 1</label>
                  <div className="input-group">
                    <input
                      autoComplete="off"
                      className="form-control"
                      id="name-one"
                      maxLength={200}
                      onChange={(event) => setNameOne(event.target.value)}
                      placeholder="Type the first name"
                      value={nameOne}
                    />
                    <button
                      aria-label="Copy first input"
                      className="btn btn-outline-secondary"
                      onClick={() => void copyText(nameOne, "Name 1 copied.")}
                      type="button"
                    >
                      <CopyIcon />
                    </button>
                  </div>
                </div>
                <div className="col-12 col-lg-5">
                  <label className="form-label" htmlFor="name-two">Name 2</label>
                  <div className="input-group">
                    <input
                      autoComplete="off"
                      className="form-control"
                      id="name-two"
                      maxLength={200}
                      onChange={(event) => setNameTwo(event.target.value)}
                      placeholder="Type the second name"
                      value={nameTwo}
                    />
                    <button
                      aria-label="Copy second input"
                      className="btn btn-outline-secondary"
                      onClick={() => void copyText(nameTwo, "Name 2 copied.")}
                      type="button"
                    >
                      <CopyIcon />
                    </button>
                  </div>
                </div>
                <div className="col-12 col-lg-2 d-grid gap-2">
                  <button className="btn btn-dark" disabled={isSaving} type="submit">
                    <SaveIcon className="me-2" />
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
              <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
                <button
                  className="btn btn-sm btn-light border"
                  onClick={() => void copyBoth(nameOne, nameTwo)}
                  type="button"
                >
                  <CopyIcon className="me-2" />
                  Copy both inputs
                </button>
                <button
                  className="btn btn-sm btn-link text-secondary text-decoration-none"
                  onClick={() => {
                    setNameOne("");
                    setNameTwo("");
                  }}
                  type="button"
                >
                  Clear inputs
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className="card border-0 shadow-sm overflow-hidden">
          <div className="card-header bg-white border-bottom p-3 p-lg-4">
            <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
              <div>
                <h2 className="h6 mb-1">Saved names</h2>
                <div className="small text-secondary">{total.toLocaleString()} records</div>
              </div>
              <div className="d-flex gap-2 table-toolbar">
                <div className="input-group">
                  <span className="input-group-text bg-white"><SearchIcon /></span>
                  <input
                    aria-label="Search names"
                    className="form-control"
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Search"
                    type="search"
                    value={search}
                  />
                </div>
                <button
                  aria-label="Refresh names"
                  className="btn btn-outline-secondary"
                  disabled={isLoading}
                  onClick={() => void loadItems()}
                  type="button"
                >
                  <RefreshIcon />
                </button>
              </div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table align-middle mb-0 name-table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Name 1</th>
                  <th scope="col">Name 2</th>
                  <th scope="col">Saved</th>
                  <th className="text-end" scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && items.length === 0 ? (
                  <tr>
                    <td className="py-5 text-center text-secondary" colSpan={5}>Loading names...</td>
                  </tr>
                ) : null}

                {!isLoading && items.length === 0 ? (
                  <tr>
                    <td className="py-5 text-center" colSpan={5}>
                      <div className="fw-semibold">No names found</div>
                      <div className="small text-secondary">Add a name above or change your search.</div>
                    </td>
                  </tr>
                ) : null}

                {items.map((item, index) => {
                  const isEditing = editingId === item.id;
                  return (
                    <tr key={item.id}>
                      <td data-label="#" className="text-secondary small">
                        {(page - 1) * DEFAULT_PAGE_SIZE + index + 1}
                      </td>
                      <td data-label="Name 1">
                        {isEditing ? (
                          <input
                            aria-label="Edit name 1"
                            className="form-control form-control-sm"
                            maxLength={200}
                            onChange={(event) => setEditNameOne(event.target.value)}
                            value={editNameOne}
                          />
                        ) : (
                          <div className="name-cell">
                            <span className="name-value">{item.nameOne || <span className="text-secondary">—</span>}</span>
                            <button
                              aria-label="Copy name 1"
                              className="copy-cell-button"
                              onClick={() => void copyText(item.nameOne, "Name 1 copied.")}
                              type="button"
                            >
                              <CopyIcon />
                            </button>
                          </div>
                        )}
                      </td>
                      <td data-label="Name 2">
                        {isEditing ? (
                          <input
                            aria-label="Edit name 2"
                            className="form-control form-control-sm"
                            maxLength={200}
                            onChange={(event) => setEditNameTwo(event.target.value)}
                            value={editNameTwo}
                          />
                        ) : (
                          <div className="name-cell">
                            <span className="name-value">{item.nameTwo || <span className="text-secondary">—</span>}</span>
                            <button
                              aria-label="Copy name 2"
                              className="copy-cell-button"
                              onClick={() => void copyText(item.nameTwo, "Name 2 copied.")}
                              type="button"
                            >
                              <CopyIcon />
                            </button>
                          </div>
                        )}
                      </td>
                      <td data-label="Saved" className="small text-secondary text-nowrap">
                        {new Intl.DateTimeFormat(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "2-digit",
                        }).format(new Date(item.createdAt))}
                      </td>
                      <td data-label="Actions">
                        <div className="d-flex justify-content-end flex-wrap gap-1">
                          {isEditing ? (
                            <>
                              <button
                                className="btn btn-sm btn-dark"
                                disabled={isSaving}
                                onClick={() => void saveEdit(item.id)}
                                type="button"
                              >
                                Save
                              </button>
                              <button
                                className="btn btn-sm btn-light border"
                                onClick={() => setEditingId(null)}
                                type="button"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="btn btn-sm btn-light border"
                                onClick={() => void copyBoth(item.nameOne, item.nameTwo)}
                                title="Copy both names"
                                type="button"
                              >
                                <CopyIcon />
                                <span className="action-label ms-1">Both</span>
                              </button>
                              <button
                                aria-label="Edit record"
                                className="btn btn-sm btn-light border"
                                onClick={() => startEdit(item)}
                                type="button"
                              >
                                <EditIcon />
                              </button>
                              <button
                                aria-label="Delete record"
                                className="btn btn-sm btn-light border text-danger"
                                onClick={() => void deleteItem(item)}
                                type="button"
                              >
                                <TrashIcon />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="card-footer bg-white border-top p-3">
            <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2">
              <span className="small text-secondary">
                Showing {firstVisible}–{lastVisible} of {total.toLocaleString()}
              </span>
              <div className="btn-group btn-group-sm" role="group" aria-label="Pagination">
                <button
                  className="btn btn-outline-secondary"
                  disabled={page <= 1 || isLoading}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  type="button"
                >
                  Previous
                </button>
                <button className="btn btn-light border disabled" type="button">
                  {page} / {totalPages}
                </button>
                <button
                  className="btn btn-outline-secondary"
                  disabled={page >= totalPages || isLoading}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  type="button"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
