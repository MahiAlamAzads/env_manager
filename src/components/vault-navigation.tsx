"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { InstallAppButton } from "@/components/install-app-button";

const links = [
  { href: "/", label: "Projects" },
  { href: "/credentials", label: "Admin Vault" },
];

export function VaultNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <div className="vault-nav card border-0 shadow-sm mb-4">
      <div className="card-body p-2 p-md-3 d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-2">
        <nav className="nav nav-pills flex-nowrap overflow-x-auto" aria-label="Vault sections">
          {links.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                className={`nav-link text-nowrap ${active ? "active" : ""}`}
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="d-flex gap-2">
          <InstallAppButton />
          <button
            className="btn btn-outline-secondary"
            disabled={loggingOut}
            onClick={() => void logout()}
            type="button"
          >
            {loggingOut ? "Locking..." : "Lock vault"}
          </button>
        </div>
      </div>
    </div>
  );
}
