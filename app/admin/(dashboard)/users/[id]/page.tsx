"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { formatCents } from "@/lib/utils";

export default function AdminUserDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<{ user: Record<string, unknown>; orders: { orderNumber: string; total: number; orderStatus: string; createdAt: string }[] } | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const res = await fetch(`/api/admin/users/${id}`);
    setData(await res.json());
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleBlock(blocked: boolean) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isBlocked: blocked }),
    });
    if (!res.ok) toast.error("Could not update");
    else toast.success(blocked ? "User blocked" : "User unblocked");
    load();
  }

  if (!data?.user) return <p className="text-sm text-awok-muted">Loading…</p>;

  const u = data.user;

  return (
    <div className="min-w-0 space-y-6 sm:space-y-8">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-bold">{u.name as string}</h1>
        <p className="break-all text-sm text-awok-muted">{u.email as string}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => toggleBlock(!(u.isBlocked as boolean))}
            className="touch-manipulation rounded-full border border-white/15 px-4 py-2.5 text-xs font-semibold sm:py-2"
          >
            {(u.isBlocked as boolean) ? "Unblock user" : "Block user"}
          </button>
        </div>
      </div>
      <div>
        <h2 className="text-lg font-semibold">Recent orders</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {data.orders?.map((o) => (
            <li
              key={o.orderNumber}
              className="flex min-w-0 flex-col gap-1 rounded-lg border border-white/5 px-3 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2"
            >
              <span className="min-w-0 shrink font-mono text-xs">{o.orderNumber}</span>
              <span className="font-medium">{formatCents(o.total)}</span>
              <span className="text-xs capitalize text-awok-muted">{o.orderStatus}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
