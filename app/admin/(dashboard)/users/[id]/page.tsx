"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { formatCents } from "@/lib/utils";

export default function AdminUserDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<{ user: Record<string, unknown>; orders: { orderNumber: string; total: number; orderStatus: string; createdAt: string }[] } | null>(null);

  async function load() {
    if (!id) return;
    const res = await fetch(`/api/admin/users/${id}`);
    setData(await res.json());
  }

  useEffect(() => {
    load();
  }, [id]);

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
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">{u.name as string}</h1>
        <p className="text-sm text-awok-muted">{u.email as string}</p>
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={() => toggleBlock(!(u.isBlocked as boolean))}
            className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold"
          >
            {(u.isBlocked as boolean) ? "Unblock user" : "Block user"}
          </button>
        </div>
      </div>
      <div>
        <h2 className="text-lg font-semibold">Recent orders</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {data.orders?.map((o) => (
            <li key={o.orderNumber} className="flex justify-between rounded-lg border border-white/5 px-3 py-2">
              <span className="font-mono text-xs">{o.orderNumber}</span>
              <span>{formatCents(o.total)}</span>
              <span className="text-xs capitalize text-awok-muted">{o.orderStatus}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
