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
    search();
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Customers</h1>
      <div className="mt-4 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, phone"
          className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
        />
        <button type="button" onClick={search} className="rounded-full bg-awok-ember px-4 py-2 text-xs font-bold text-awok-deep">
          Search
        </button>
      </div>
      <ul className="mt-6 space-y-2">
        {users.map((u) => (
          <li key={u._id} className="flex items-center justify-between rounded-xl border border-white/8 bg-black/30 px-4 py-3 text-sm">
            <div>
              <p className="font-medium">{u.name}</p>
              <p className="text-xs text-awok-muted">{u.email}</p>
              {u.isBlocked && <p className="text-xs text-awok-crimsonglow">Blocked</p>}
            </div>
            <Link href={`/admin/users/${u._id}`} className="text-xs text-awok-gold hover:underline">
              View
            </Link>
          </li>
        ))}
      </ul>
      {!users.length && <p className="mt-6 text-sm text-awok-muted">No customers found.</p>}
    </div>
  );
}
