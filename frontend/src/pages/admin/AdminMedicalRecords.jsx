import { useCallback, useEffect, useMemo, useState } from "react";
import { ensureDrPrefix } from "../../utils/drName";
import {
  AlertCircle,
  ArrowDownToLine,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  FileText,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import api from "../../services/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function truncateTx(tx) {
  if (!tx) return "";
  return tx.length > 20 ? `${tx.slice(0, 10)}...${tx.slice(-8)}` : tx;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CFG = {
  draft:    { cls: "bg-slate-100 text-slate-600", label: "Draft"    },
  active:   { cls: "bg-blue-50 text-blue-700",    label: "Active"   },
  verified: { cls: "bg-blue-50 text-blue-700",    label: "Active"   },
  tampered: { cls: "bg-rose-50 text-rose-700",    label: "Tampered" },
  archived: { cls: "bg-amber-50 text-amber-700",  label: "Archived" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || { cls: "bg-slate-100 text-slate-600", label: status || "—" };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="min-w-[130px] shrink-0 text-xs font-medium text-slate-500">{label}</dt>
      <dd className="break-all text-sm text-slate-800">{String(value)}</dd>
    </div>
  );
}

function RecordModal({ record, onClose }) {
  const patient = record.patient || {};
  const [copied, setCopied] = useState(false);

  async function downloadAttachment(att) {
    try {
      const response = await api.get(
        `/admin/medical-records/${record._id}/download/${encodeURIComponent(att.cid)}`,
        { responseType: "blob" }
      );
      const url = URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = att.fileName || att.cid;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("Download failed. The file may no longer be available.");
    }
  }

  function copyTx() {
    if (!record.blockchainTxId) return;
    navigator.clipboard.writeText(record.blockchainTxId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl" style={{ maxHeight: "90vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              <FileText size={18} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">{record.title || "Medical Record"}</h2>
              <div className="mt-0.5">
                <StatusBadge status={record.status} />
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <dl className="space-y-3 p-6">
          <DetailRow label="Title"        value={record.title || "Medical Record"} />
          <DetailRow label="Record Type"  value={record.recordType} />
          <DetailRow label="Patient"      value={patient.name || "Unknown Patient"} />
          <DetailRow label="Patient ID"   value={patient.patientId} />
          <DetailRow label="Hospital"     value={record.hospitalName} />
          <DetailRow label="Doctor"       value={ensureDrPrefix(record.doctorName)} />
          <DetailRow label="Visit Date"   value={record.visitDate ? fmtDate(record.visitDate) : null} />
          <DetailRow label="Diagnosis"    value={(record.diagnosis || "").trim() || "Not Available"} />
          <DetailRow label="Prescription" value={record.prescription} />
          <DetailRow label="Status"       value={STATUS_CFG[record.status]?.label || record.status} />

          {/* Blockchain TX — truncated with copy button */}
          {record.blockchainTxId && (
            <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
              <dt className="min-w-[130px] shrink-0 text-xs font-medium text-slate-500">Blockchain TX</dt>
              <dd className="flex items-center gap-2">
                <span className="break-all font-mono text-xs text-emerald-700">
                  {truncateTx(record.blockchainTxId)}
                </span>
                <div className="relative shrink-0">
                  <button
                    onClick={copyTx}
                    title="Copy full transaction hash"
                    className="flex items-center rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  >
                    <Copy size={13} />
                  </button>
                  {copied && (
                    <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-white">
                      Copied!
                    </span>
                  )}
                </div>
              </dd>
            </div>
          )}

          <DetailRow label="Created" value={fmtDate(record.createdAt)} />

          {/* Attachments */}
          {record.attachments?.length > 0 && (
            <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
              <dt className="min-w-[130px] shrink-0 text-xs font-medium text-slate-500">
                Attachments ({record.attachments.length})
              </dt>
              <dd className="flex-1 space-y-1.5">
                {record.attachments.map((att, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <FileText size={13} className="shrink-0 text-purple-400" />
                    <span className="min-w-0 flex-1 truncate text-xs text-slate-700">
                      {att.fileName || att.cid || `Attachment ${i + 1}`}
                    </span>
                    {att.size > 0 && (
                      <span className="shrink-0 text-[10px] text-slate-400">
                        {att.size < 1024
                          ? `${att.size} B`
                          : att.size < 1048576
                          ? `${(att.size / 1024).toFixed(1)} KB`
                          : `${(att.size / 1048576).toFixed(1)} MB`}
                      </span>
                    )}
                    <button
                      onClick={() => downloadAttachment(att)}
                      title="Download attachment"
                      className="ml-1 flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 transition hover:border-purple-300 hover:text-purple-600"
                    >
                      <ArrowDownToLine size={11} />
                      Download
                    </button>
                  </div>
                ))}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const PER_PAGE = 10;

const RECORD_TYPES = ["Prescription", "Blood Test", "X-Ray", "MRI", "CT Scan", "Vaccination", "Other"];
const STATUSES     = ["active"];

export default function AdminMedicalRecords() {
  const [records,  setRecords]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(false);
  const [search,   setSearch]   = useState("");
  const [typeFilter,   setTypeFilter]   = useState("all");
  const [page,     setPage]     = useState(1);
  const [selected, setSelected] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    api
      .get("/admin/medical-records")
      .then((res) => setRecords(res.data.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, typeFilter]);

  const filtered = useMemo(() => {
    let data = records;
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (r) =>
          r.title?.toLowerCase().includes(q) ||
          r.patient?.name?.toLowerCase().includes(q) ||
          r.hospitalName?.toLowerCase().includes(q) ||
          r.doctorName?.toLowerCase().includes(q) ||
          r.diagnosis?.toLowerCase().includes(q)
      );
    }
    if (typeFilter !== "all") data = data.filter((r) => r.recordType === typeFilter);
    return data;
  }, [records, search, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged      = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Medical Records</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-300">
            {loading ? "Loading…" : `${filtered.length} of ${records.length} records`}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-rose-700">
          <AlertCircle size={16} />
          <span className="text-sm">Failed to load records.</span>
          <button onClick={load} className="ml-auto text-xs font-semibold underline">Retry</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, patient, hospital or diagnosis…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-mint focus:outline-none focus:ring-2 focus:ring-mint/20"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:border-mint focus:outline-none focus:ring-2 focus:ring-mint/20 sm:w-44"
        >
          <option value="all">All Types</option>
          {RECORD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="min-w-[800px] w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Record</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Patient</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Hospital</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Doctor</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Blockchain</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Date</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {[40, 80, 80, 110, 90, 60, 60, 80, 32].map((w, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-4 animate-pulse rounded bg-slate-100" style={{ width: w }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center">
                    <FileText size={28} className="mx-auto mb-2 text-slate-200" />
                    <p className="text-sm text-slate-400">
                      {search || typeFilter !== "all"
                        ? "No records match your filters."
                        : "No medical records found."}
                    </p>
                  </td>
                </tr>
              ) : (
                paged.map((r) => {
                  const patient = r.patient || {};
                  return (
                    <tr key={r._id} className="transition hover:bg-slate-50">
                      {/* Record title */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-50">
                            <FileText size={14} className="text-purple-600" />
                          </div>
                          <span className="max-w-[140px] truncate font-medium text-slate-900">
                            {r.title || "Medical Record"}
                          </span>
                        </div>
                      </td>
                      {/* Patient */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                            {initials(patient.name || "Unknown Patient")}
                          </div>
                          <span className="text-slate-700">{patient.name || "Unknown Patient"}</span>
                        </div>
                      </td>
                      {/* Type */}
                      <td className="px-4 py-3.5">
                        {r.recordType ? (
                          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                            {r.recordType}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="max-w-[120px] truncate px-4 py-3.5 text-slate-500">{r.hospitalName || "—"}</td>
                      <td className="px-4 py-3.5 text-slate-500">{ensureDrPrefix(r.doctorName) || "—"}</td>
                      <td className="px-4 py-3.5"><StatusBadge status={r.status} /></td>
                      {/* Blockchain */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                          r.blockchainTxId ? "text-emerald-600" : "text-slate-400"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${r.blockchainTxId ? "bg-emerald-400" : "bg-slate-300"}`} />
                          {r.blockchainTxId ? "Verified" : "Pending"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-400">{fmtDate(r.createdAt)}</td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => setSelected(r)}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-mint/50 hover:text-mint"
                        >
                          <Eye size={12} />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && filtered.length > PER_PAGE && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
            <p className="text-xs text-slate-400">
              Page {page} of {totalPages} · {filtered.length} results
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const n = i + 1;
                return (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-medium transition ${
                      page === n ? "bg-mint text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && <RecordModal record={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}
