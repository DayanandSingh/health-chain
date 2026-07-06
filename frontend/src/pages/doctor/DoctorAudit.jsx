import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  ClipboardList,
  Eye,
  FileText,
  KeyRound,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  Upload,
  User,
} from "lucide-react";
import api from "../../services/api";

const ACTION_META = {
  LOGIN:           { label: "Logged in",                         icon: User,          color: "text-slate-600   bg-slate-50"   },
  RECORD_VIEW:     { label: "Viewed a medical record",           icon: Eye,           color: "text-blue-600    bg-blue-50"    },
  RECORD_UPLOAD:   { label: "Record uploaded",                   icon: Upload,        color: "text-emerald-600 bg-emerald-50" },
  RECORD_DELETE:   { label: "Record deleted",                    icon: FileText,      color: "text-red-600     bg-red-50"     },
  RECORD_UPDATE:   { label: "Record updated",                    icon: FileText,      color: "text-amber-600   bg-amber-50"   },
  RECORD_DOWNLOAD: { label: "Downloaded a record",               icon: Upload,        color: "text-indigo-600  bg-indigo-50"  },
  ACCESS_GRANT:    { label: "Patient granted access",            icon: KeyRound,      color: "text-purple-600  bg-purple-50"  },
  ACCESS_REVOKE:   { label: "Access revoked",                    icon: Shield,        color: "text-red-600     bg-red-50"     },
  NOTE_CREATED:    { label: "Medical note created",              icon: ClipboardList, color: "text-teal-600    bg-teal-50"    },
  NOTE_UPDATED:    { label: "Medical note updated",              icon: ClipboardList, color: "text-amber-600   bg-amber-50"   },
  NOTE_DELETED:    { label: "Medical note deleted",              icon: ClipboardList, color: "text-red-600     bg-red-50"     },
  VERIFY_RECORD:   { label: "Blockchain verification completed", icon: CheckCircle,   color: "text-teal-600    bg-teal-50"    },
};

function formatTimestamp(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
function relativeTime(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)   return "Just now";
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "Yesterday" : `${d} days ago`;
}

function Skeleton() {
  return (
    <div className="flex gap-4">
      <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-slate-100" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}

export default function DoctorAudit() {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);
  const [search,  setSearch]  = useState("");
  const timer = useRef(null);

  const fetchLogs = useCallback(() => {
    setLoading(true);
    setError(false);
    api.get("/audit-log", { params: { limit: 100 } })
      .then((res) => setLogs(res.data.data || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  function handleSearch(val) {
    setSearch(val);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {}, 200);
  }

  const filtered = logs.filter((log) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      (ACTION_META[log.action]?.label || "").toLowerCase().includes(q) ||
      (log.metadata?.fileName || "").toLowerCase().includes(q) ||
      (log.record?.title || log.record?.diagnosis || "").toLowerCase().includes(q)
    );
  });

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Audit Logs</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">A complete record of your activity in HealthChain.</p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="btn-secondary gap-2 self-start"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute inset-y-0 left-3 my-auto text-slate-400" />
        <input
          type="text"
          placeholder="Search actions, records…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="field !pl-9"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4">
          <AlertCircle size={18} className="shrink-0 text-red-500" />
          <p className="text-sm text-red-700">Failed to load audit logs.</p>
          <button onClick={fetchLogs} className="ml-auto text-sm font-medium text-red-600 hover:underline">Retry</button>
        </div>
      )}

      {/* Main card */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
        {loading && (
          <div className="space-y-6">
            {[0,1,2,3,4].map((i) => <Skeleton key={i} />)}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <Activity size={40} className="text-slate-200" />
            <div>
              <p className="font-semibold text-slate-600">
                {search ? "No logs match your search." : "No activity yet."}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {search ? "Try different keywords." : "Your actions — views, downloads, logins — will appear here."}
              </p>
            </div>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <>
            <p className="mb-6 text-xs text-slate-400">{filtered.length} event{filtered.length !== 1 ? "s" : ""}</p>
            <div className="space-y-0">
              {filtered.map((log, i) => {
                const meta    = ACTION_META[log.action] ?? { label: log.action, icon: Activity, color: "text-slate-600 bg-slate-50" };
                const Icon    = meta.icon;
                const isLast  = i === filtered.length - 1;
                const message = log.description || meta.label;
                const detail  = log.recordTitle || log.metadata?.fileName || log.record?.title || log.record?.diagnosis || "";

                return (
                  <div key={log._id} className="relative flex gap-4 pb-8 last:pb-0">
                    {!isLast && (
                      <span className="absolute left-5 top-10 h-full w-px bg-gradient-to-b from-slate-200 to-transparent" />
                    )}
                    <span className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.color}`}>
                      <Icon size={17} />
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-0.5">
                        <p className="font-medium text-slate-900">{message}</p>
                        <span className="shrink-0 text-xs text-slate-400" title={formatTimestamp(log.createdAt)}>
                          {relativeTime(log.createdAt)}
                        </span>
                      </div>
                      {detail && <p className="mt-0.5 truncate text-sm text-slate-500">{detail}</p>}
                      <p className="mt-0.5 text-xs text-slate-400">{formatTimestamp(log.createdAt)}</p>
                      {log.blockchainTxId && (
                        <p className="mt-1 break-all font-mono text-[10px] text-slate-300">{log.blockchainTxId}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
