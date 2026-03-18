"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Table, Thead, Th, Tbody, Tr, Td, EmptyRow } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import { Search, Filter, MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react";
import type { ClientProfile } from "@/types";

interface ClientTableProps {
  clients: ClientProfile[];
  onDelete?: (id: string) => void;
}

type FilterStatus = "ALL" | "ACTIVE" | "EXPIRED" | "FROZEN" | "NO_MEMBERSHIP";

export function ClientTable({ clients, onDelete }: ClientTableProps) {
  const router = useRouter();
  const [search,        setSearch]        = useState("");
  const [statusFilter,  setStatusFilter]  = useState<FilterStatus>("ALL");
  const [openMenuId,    setOpenMenuId]     = useState<string | null>(null);

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      const name  = c.profile ? `${c.profile.firstName} ${c.profile.lastName}` : "";
      const query = search.toLowerCase();
      const matchSearch =
        !search ||
        name.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query) ||
        (c.profile?.phone ?? "").includes(query);

      const membership = c.memberships[0];
      const matchStatus =
        statusFilter === "ALL"
          ? true
          : statusFilter === "NO_MEMBERSHIP"
          ? c.memberships.length === 0
          : membership?.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [clients, search, statusFilter]);

  const STATUS_FILTERS: { value: FilterStatus; label: string }[] = [
    { value: "ALL",          label: "הכל" },
    { value: "ACTIVE",       label: "פעילים" },
    { value: "EXPIRED",      label: "פג תוקף" },
    { value: "FROZEN",       label: "מוקפאים" },
    { value: "NO_MEMBERSHIP", label: "ללא מנוי" },
  ];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-dim" />
          <input
            type="text"
            placeholder="חיפוש לפי שם, מייל, טלפון..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full input-base pr-9 pl-4 py-2 text-sm"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-brand-text-muted flex-shrink-0" />
          <div className="flex gap-1 flex-wrap">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === f.value
                    ? "bg-brand-accent text-black"
                    : "bg-brand-elevated text-brand-text-muted hover:text-white border border-brand-border"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-brand-text-dim">
        מציג {filtered.length} מתוך {clients.length} לקוחות
      </p>

      {/* Table */}
      <Table>
        <Thead>
          <tr>
            <Th>לקוח</Th>
            <Th>טלפון</Th>
            <Th>מנוי</Th>
            <Th>תוקף</Th>
            <Th>נרשם</Th>
            <Th className="text-center">פעולות</Th>
          </tr>
        </Thead>
        <Tbody>
          {filtered.length === 0 ? (
            <EmptyRow colSpan={6} />
          ) : (
            filtered.map((client) => {
              const membership = client.memberships[0];
              const name = client.profile
                ? `${client.profile.firstName} ${client.profile.lastName}`
                : client.email;

              return (
                <Tr
                  key={client.id}
                  onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                >
                  {/* Client */}
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-accent/25 to-brand-info/25 border border-brand-border flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-white">
                          {name[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-white text-sm">{name}</p>
                        <p className="text-xs text-brand-text-muted">{client.email}</p>
                      </div>
                    </div>
                  </Td>

                  {/* Phone */}
                  <Td>
                    <span className="text-sm">{client.profile?.phone ?? "—"}</span>
                  </Td>

                  {/* Membership */}
                  <Td>
                    {membership ? (
                      <div className="flex items-center gap-2">
                        <StatusBadge status={membership.status} />
                        <span className="text-xs text-brand-text-dim hidden lg:inline">
                          {membership.plan.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-brand-text-dim">ללא מנוי</span>
                    )}
                  </Td>

                  {/* Expiry */}
                  <Td>
                    <span className="text-sm">
                      {membership ? formatDate(membership.endDate) : "—"}
                    </span>
                  </Td>

                  {/* Joined */}
                  <Td>
                    <span className="text-sm text-brand-text-muted">
                      {formatDate(client.createdAt)}
                    </span>
                  </Td>

                  {/* Actions */}
                  <Td className="text-center">
                    <div
                      className="relative inline-block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => setOpenMenuId(openMenuId === client.id ? null : client.id)}
                        className="p-1.5 rounded-lg text-brand-text-dim hover:text-white hover:bg-brand-elevated transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {openMenuId === client.id && (
                        <div className="absolute left-0 top-8 z-20 w-36 bg-brand-elevated border border-brand-border rounded-xl shadow-surface overflow-hidden animate-slide-in">
                          <button
                            onClick={() => { router.push(`/dashboard/clients/${client.id}`); setOpenMenuId(null); }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white hover:bg-brand-surface transition-colors"
                          >
                            <Eye className="w-4 h-4" /> צפייה
                          </button>
                          <button
                            onClick={() => { router.push(`/dashboard/clients/${client.id}/edit`); setOpenMenuId(null); }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white hover:bg-brand-surface transition-colors"
                          >
                            <Pencil className="w-4 h-4" /> עריכה
                          </button>
                          <button
                            onClick={() => { onDelete?.(client.id); setOpenMenuId(null); }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-brand-error hover:bg-brand-surface transition-colors"
                          >
                            <Trash2 className="w-4 h-4" /> מחיקה
                          </button>
                        </div>
                      )}
                    </div>
                  </Td>
                </Tr>
              );
            })
          )}
        </Tbody>
      </Table>
    </div>
  );
}
