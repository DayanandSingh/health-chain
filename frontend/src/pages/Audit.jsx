import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ensureDrPrefix } from "../utils/drName";
import {
  Activity,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import api from "../services/api";

const ACTION_META = {
  // Authentication
  LOGIN:              { label: "Login",               color: "bg-emerald-100 text-emerald-700", desc: "User logged in"               },
  LOGOUT:             { label: "Logout",              color: "bg-slate-100   text-slate-600",   desc: "User logged out"              },
  REGISTER:           { label: "Registered",          color: "bg-slate-100   text-slate-600",   desc: "New account registered"       },
  // Medical Records
  RECORD_UPLOAD:      { label: "Record Uploaded",     color: "bg-blue-100    text-blue-700",    desc: "Medical record uploaded"      },
  RECORD_UPDATE:      { label: "Record Updated",      color: "bg-amber-100   text-amber-700",   desc: "Medical record updated"       },
  RECORD_DELETE:      { label: "Record Deleted",      color: "bg-red-100     text-red-700",     desc: "Medical record deleted"       },
  RECORD_DOWNLOAD:    { label: "Record Downloaded",   color: "bg-orange-100  text-orange-700",  desc: "Medical record downloaded"    },
  RECORD_VIEW:        { label: "Record Viewed",       color: "bg-indigo-100  text-indigo-700",  desc: "Medical record viewed"        },
  VERIFY_RECORD:      { label: "Record Verified",     color: "bg-teal-100    text-teal-700",    desc: "Record verified on blockchain"},
  // Doctor Notes
  NOTE_CREATED:       { label: "Note Created",        color: "bg-yellow-100  text-yellow-700",  desc: "Doctor note created"          },
  NOTE_UPDATED:       { label: "Note Updated",        color: "bg-yellow-100  text-yellow-700",  desc: "Doctor note updated"          },
  NOTE_DELETED:       { label: "Note Deleted",        color: "bg-yellow-100  text-yellow-700",  desc: "Doctor note deleted"          },
  // Permissions
  ACCESS_GRANT:       { label: "Permission Granted",  color: "bg-emerald-100 text-emerald-700", desc: "Patient granted doctor access."  },
  ACCESS_REVOKE:      { label: "Permission Revoked",  color: "bg-red-100     text-red-700",     desc: "Patient revoked doctor access." },
  PERMISSION_EXPIRED: { label: "Permission Expired",  color: "bg-amber-100   text-amber-700",   desc: "Permission expired"           },
  // Profile
  PROFILE_UPDATE:     { label: "Profile Updated",     color: "bg-purple-100  text-purple-700",  desc: "Profile updated"              },
  PHOTO_UPDATE:           { label: "Photo Updated",         color: "bg-purple-100  text-purple-700",  desc: "Profile photo updated"          },
  DOCTOR_REGISTRATION:    { label: "Doctor Registration",   color: "bg-emerald-100 text-emerald-700", desc: "New doctor account registered"  },
  DOCTOR_VERIFIED:            { label: "Doctor Verification",      color: "bg-blue-100  text-blue-700",  desc: "Doctor account verified"          },
  DOCTOR_REVOKED:             { label: "Verification Revoked",     color: "bg-rose-100  text-rose-700",  desc: "Doctor verification revoked"      },
  REVERIFICATION_REQUESTED:   { label: "Re-Verification Request",  color: "bg-sky-100   text-sky-700",   desc: "Doctor requested re-verification"       },
  DOCTOR_REVERIFIED:          { label: "Doctor Re-Verified",       color: "bg-blue-100  text-blue-700",  desc: "Doctor account re-verified"             },
  REVERIFICATION_DECLINED:        { label: "Re-Verification Declined", color: "bg-rose-100  text-rose-700",  desc: "Re-verification request declined"         },
  DOCTOR_INITIAL_REJECTED:        { label: "Verification Rejected",    color: "bg-rose-100  text-rose-700",  desc: "Doctor verification request rejected"     },
  INITIAL_VERIFICATION_REQUESTED: { label: "Verification Requested",   color: "bg-sky-100   text-sky-700",   desc: "Doctor submitted new verification request" },
};

function fmt(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function toTitleCase(str) {
  if (!str || typeof str !== "string") return str || "";
  return str
    .split(" ")
    .map((word) => {
      if (!word) return "";
      const lower = word.toLowerCase();
      if (lower === "dr." || lower === "dr") return "Dr.";
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ")
    .trim();
}

// Use role (when available) to decide whether to add "Dr." prefix.
// Also catches names already carrying Dr / Dr. / Doctor prefix.
function fmtPerson(rawName, role) {
  const name = rawName || "";
  if (!name) return name;
  if (role === "doctor" || /^(dr\.?\s|doctor\s)/i.test(name)) return ensureDrPrefix(name);
  return toTitleCase(name);
}

function buildDescription(log) {
  // Permission events always use the standardized wording regardless of stored description.
  if (log.action === "ACCESS_GRANT")  return "Patient granted doctor access.";
  if (log.action === "ACCESS_REVOKE") return "Patient revoked doctor access.";
  if (log.description) return log.description;
  const actor = toTitleCase(log.actorName || log.user?.fullName || "");
  if (log.action === "LOGIN"  && actor) return `${actor} logged in`;
  if (log.action === "LOGOUT" && actor) return `${actor} logged out`;
  const meta = ACTION_META[log.action];
  return meta?.desc || meta?.label || log.action;
}

function getDateBounds(filter) {
  const d = new Date();
  if (filter === "today")  { d.setHours(0, 0, 0, 0); return d; }
  if (filter === "7days")  { d.setDate(d.getDate() - 7); d.setHours(0, 0, 0, 0); return d; }
  if (filter === "30days") { d.setDate(d.getDate() - 30); d.setHours(0, 0, 0, 0); return d; }
  if (filter === "month")  { d.setDate(1); d.setHours(0, 0, 0, 0); return d; }
  return null;
}

function ActionBadge({ action }) {
  const meta = ACTION_META[action] ?? { label: action, color: "bg-slate-100 text-slate-700" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.color}`}>
      {meta.label}
    </span>
  );
}

const PER_PAGE = 25;

export default function Audit() {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [search,      setSearch]      = useState("");
  const [page,        setPage]        = useState(1);
  const [tipHovered,  setTipHovered]  = useState(false);
  const [tipFocused,  setTipFocused]  = useState(false);
  const [dateFilter,  setDateFilter]  = useState("all");
  const sectionRef = useRef(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/audit-log?limit=1000");
      setLogs(res.data.data || []);
    } catch {
      setError("Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => { setPage(1); }, [dateFilter]);
  useEffect(() => {
    sectionRef.current?.scrollIntoView({ behavior: "instant", block: "start" });
  }, [page]);

  const q = search.toLowerCase().trim();

  // Step 1 — date window
  const dateFiltered = useMemo(() => {
    const cutoff = getDateBounds(dateFilter);
    return cutoff ? logs.filter((l) => new Date(l.createdAt) >= cutoff) : logs;
  }, [logs, dateFilter]);

  // Step 2 — global search inside the date window
  const filtered = useMemo(() => q
    ? dateFiltered.filter((l) =>
        (ACTION_META[l.action]?.label          || "").toLowerCase().includes(q) ||
        (ACTION_META[l.action]?.desc           || "").toLowerCase().includes(q) ||
        (l.actorName                           || "").toLowerCase().includes(q) ||
        (l.user?.fullName                      || "").toLowerCase().includes(q) ||
        (l.user?.email                         || "").toLowerCase().includes(q) ||
        (l.targetUserName                      || "").toLowerCase().includes(q) ||
        (l.targetUserId?.fullName              || "").toLowerCase().includes(q) ||
        (l.targetUserId?.email                 || "").toLowerCase().includes(q) ||
        (l.recordTitle                         || "").toLowerCase().includes(q) ||
        (l.record?.title                       || "").toLowerCase().includes(q) ||
        (l.record?.diagnosis                   || "").toLowerCase().includes(q) ||
        (l.description                         || "").toLowerCase().includes(q)
      )
    : dateFiltered,
  [dateFiltered, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const pagedLogs  = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  return (
    <section ref={sectionRef}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink dark:text-white">Audit Logs</h1>
          <p className="mt-0.5 text-sm text-steel dark:text-slate-300">Full system event history</p>
        </div>
        <div className="flex gap-2">
          <div
            className="relative"
            onMouseEnter={() => setTipHovered(true)}
            onMouseLeave={() => setTipHovered(false)}
          >
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setTipFocused(true)}
              onBlur={() => setTipFocused(false)}
              placeholder="Search audit logs..."
              className="h-9 rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none focus:border-mint focus:ring-2 focus:ring-mint/20"
            />
            {(tipHovered || tipFocused) && (
              <div className="absolute right-0 top-full z-20 mt-1.5 w-44 rounded-xl border border-slate-100 bg-white p-3 shadow-lg">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Search by:</p>
                <ul className="space-y-1">
                  {["Event", "Description", "Actor", "Actor Email", "Affected Party", "Record / Note"].map((item) => (
                    <li key={item} className="flex items-center gap-1.5 text-xs text-slate-600">
                      <span className="text-slate-300">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 pr-7 text-sm text-slate-900 outline-none focus:border-mint focus:ring-2 focus:ring-mint/20 cursor-pointer hover:border-slate-300"
            style={{ boxShadow: "0 8px 20px rgba(0,0,0,0.08)" }}
          >
            <option style={{ backgroundColor: "#ffffff", color: "#111827" }} value="all">All Time</option>
            <option style={{ backgroundColor: "#ffffff", color: "#111827" }} value="today">Today</option>
            <option style={{ backgroundColor: "#ffffff", color: "#111827" }} value="7days">Last 7 Days</option>
            <option style={{ backgroundColor: "#ffffff", color: "#111827" }} value="30days">Last 30 Days</option>
            <option style={{ backgroundColor: "#ffffff", color: "#111827" }} value="month">This Month</option>
          </select>
          <button
            onClick={fetchLogs}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {loading && (
        <div className="mt-12 flex justify-center">
          <Loader2 size={28} className="animate-spin text-mint" />
        </div>
      )}

      {!loading && error && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="mt-12 flex flex-col items-center gap-3 py-8 text-center">
          <Activity size={36} className="text-slate-200" />
          <p className="font-semibold text-slate-500">
            {search || dateFilter !== "all" ? "No audit logs found." : "No audit events yet."}
          </p>
          {search && (
            <p className="text-sm text-slate-400">Try another keyword.</p>
          )}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="mt-6 rounded-2xl border border-slate-100 bg-white shadow-sm">

          {/* Table header — count + range */}
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <p className="text-xs text-slate-400">
              {q
                ? `${filtered.length} of ${dateFiltered.length} event${dateFiltered.length !== 1 ? "s" : ""} match`
                : `${filtered.length} event${filtered.length !== 1 ? "s" : ""} total`}
            </p>
            <p className="text-xs text-slate-400">
              Showing {(safePage - 1) * PER_PAGE + 1}–{Math.min(safePage * PER_PAGE, filtered.length)} of {filtered.length}
            </p>
          </div>

          {/* Scrollable table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3">Time</th>
                  <th className="px-5 py-3">Event</th>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3">Actor</th>
                  <th className="px-5 py-3">Affected Party</th>
                  <th className="px-5 py-3">Record / Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pagedLogs.map((log) => {
                  const actorName   = fmtPerson(log.actorName || log.user?.fullName || "—", log.user?.role);
                  const actorEmail  = log.user?.email;
                  const targetName  = fmtPerson(log.targetUserName || log.targetUserId?.fullName || "", log.targetUserId?.role);
                  const targetEmail = log.targetUserId?.email;
                  const recordName  = log.recordTitle || log.record?.title || log.record?.diagnosis || null;
                  const recordId    = !recordName && log.record?._id ? `Record ID: ${String(log.record._id).slice(0, 8)}…` : null;
                  const displayRecord = recordName || recordId;
                  const description = buildDescription(log);

                  return (
                    <tr key={log._id} className="hover:bg-slate-50/50">
                      <td className="whitespace-nowrap align-middle px-5 py-3.5 text-xs text-slate-500">
                        {fmt(log.createdAt)}
                      </td>
                      <td className="align-middle px-5 py-3.5">
                        <ActionBadge action={log.action} />
                      </td>
                      <td className="align-middle px-5 py-3.5">
                        <div className="max-w-[220px] truncate text-sm text-slate-700" title={description}>
                          {description}
                        </div>
                      </td>
                      <td className="align-middle px-5 py-3.5">
                        <div className="max-w-[160px] truncate font-medium text-slate-800" title={actorName}>
                          {actorName}
                        </div>
                        {actorEmail && (
                          <div className="max-w-[160px] truncate text-xs text-slate-400" title={actorEmail}>
                            {actorEmail}
                          </div>
                        )}
                      </td>
                      <td className="align-middle px-5 py-3.5">
                        {targetName ? (
                          <>
                            <div className="max-w-[160px] truncate font-medium text-slate-800" title={targetName}>
                              {targetName}
                            </div>
                            {targetEmail && (
                              <div className="max-w-[160px] truncate text-xs text-slate-400" title={targetEmail}>
                                {targetEmail}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="align-middle px-5 py-3.5">
                        {displayRecord ? (
                          <div
                            className="max-w-[180px] truncate text-sm text-slate-700"
                            title={log.blockchainTxId ? `${displayRecord}\nTx: ${log.blockchainTxId}` : displayRecord}
                          >
                            {displayRecord}
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
              <p className="text-xs text-slate-400">Page {safePage} of {totalPages}</p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft size={14} />
                </button>

                {(() => {
                  const range = [];
                  const delta = 2;
                  const left  = Math.max(1, safePage - delta);
                  const right = Math.min(totalPages, safePage + delta);
                  if (left > 1)           { range.push(1); if (left > 2) range.push("…"); }
                  for (let i = left; i <= right; i++) range.push(i);
                  if (right < totalPages) { if (right < totalPages - 1) range.push("…"); range.push(totalPages); }
                  return range.map((item, idx) =>
                    item === "…" ? (
                      <span key={`e${idx}`} className="px-1 text-xs text-slate-400">…</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setPage(item)}
                        className={`flex h-7 min-w-[1.75rem] items-center justify-center rounded-lg px-1 text-xs font-medium transition ${
                          safePage === item
                            ? "bg-mint text-white"
                            : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {item}
                      </button>
                    )
                  );
                })()}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

        </div>
      )}
    </section>
  );
}
