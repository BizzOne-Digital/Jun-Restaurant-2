"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type UserRow = { _id: string; name: string; email: string; phone?: string; isBlocked?: boolean };

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);

  async function search() {
    const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setUsers(data.users ?? []);
  }

  useEffect(() => {
    void search();
    // Intentional: load once on mount; user refetches via "Search" after editing the query.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `search` closes over `q`; deps would refetch on every keystroke.
  }, []);

  return (
    <div className="min-w-0">
      <h1 className="font-display text-2xl font-bold">Customers</h1>
      <div className="mt-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, phone"
          className="min-h-11 w-full flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-base text-awok-cream sm:text-sm"
        />
        <button
          type="button"
          onClick={search}
          className="min-h-11 shrink-0 touch-manipulation rounded-full bg-awok-ember px-4 py-2 text-xs font-bold text-awok-deep sm:min-h-0 sm:self-auto"
        >
          Search
        </button>
      </div>
      <ul className="mt-6 space-y-2">
        {users.map((u) => (
          <li
            key={u._id}
            className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/30 px-3 py-3 text-sm sm:px-4"
          >
            <div className="min-w-0">
              <p className="font-medium">{u.name}</p>
              <p className="text-xs text-awok-muted">{u.email}</p>
              {u.isBlocked && <p className="text-xs text-awok-crimsonglow">Blocked</p>}
            </div>
            <Link href={`/admin/users/${u._id}`} className="shrink-0 text-xs text-awok-gold hover:underline">
              View
            </Link>
          </li>
        ))}
      </ul>
      {!users.length && <p className="mt-6 text-sm text-awok-muted">No customers found.</p>}
    </div>
  );
}
