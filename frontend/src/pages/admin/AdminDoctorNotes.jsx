import { useCallback, useEffect, useMemo, useState } from "react";
import { ensureDrPrefix } from "../../utils/drName";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
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

function safeVal(val) {
  if (!val || typeof val !== "string") return null;
  return val.trim() || null;
}

// ─── Avatar (photo → initials fallback) ───────────────────────────────────────

function Avatar({ name, photo, sizeCls, bgCls, textCls }) {
  const [err, setErr] = useState(false);
  if (photo && !err) {
    return (
      <img
        src={photo}
        alt={name}
        className={`${sizeCls} shrink-0 rounded-full object-cover`}
        onError={() => setErr(true)}
      />
    );
  }
  return (
    <div className={`${sizeCls} shrink-0 flex items-center justify-center rounded-full ${bgCls} ${textCls}`}>
      {initials(name)}
    </div>
  );
}

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG = {
  created:            { cls: "bg-slate-100 text-slate-600",    label: "Created"           },
  reviewed:           { cls: "bg-blue-50 text-blue-700",      label: "Reviewed"          },
  follow_up_required: { cls: "bg-amber-50 text-amber-700",    label: "Follow-up Required"},
  completed:          { cls: "bg-emerald-50 text-emerald-700", label: "Completed"         },
};
const STATUSES = ["created"];

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
      <dt className="min-w-[140px] shrink-0 text-xs font-medium text-slate-500">{label}</dt>
      <dd className="break-all text-sm text-slate-800">{String(value)}</dd>
    </div>
  );
}

function NoteModal({ note, onClose }) {
  const doctorName  = note.doctor?.fullName || "Unknown";
  const patientName = note.patientRef?.name || note.patientName || "Unknown Patient";
  const noteTitle   = safeVal(note.diagnosis) || "Doctor Note";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl" style={{ maxHeight: "90vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              <ClipboardList size={18} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">{noteTitle}</h2>
              <div className="mt-0.5">
                <StatusBadge status={note.status} />
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
          <DetailRow label="Patient"          value={patientName} />
          <DetailRow label="Patient ID"       value={note.patientRef?.patientId || safeVal(note.patientId)} />
          <DetailRow label="Doctor"           value={ensureDrPrefix(doctorName)} />
          <DetailRow label="Diagnosis"        value={safeVal(note.diagnosis)      || "Not Available"} />
          <DetailRow label="Symptoms"         value={safeVal(note.symptoms)       || "Not Available"} />
          <DetailRow label="Prescription"     value={safeVal(note.prescription)   || "Not Available"} />
          <DetailRow label="Recommended Tests"value={safeVal(note.recommendedTests) || "Not Available"} />
          <DetailRow label="Advice"           value={safeVal(note.advice)         || "Not Available"} />
          <DetailRow label="Follow-up Date"   value={note.followUpDate ? fmtDate(note.followUpDate) : null} />
          <DetailRow label="Created"          value={fmtDate(note.createdAt)} />
          <DetailRow label="Last Updated"     value={fmtDate(note.updatedAt)} />
        </dl>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const PER_PAGE = 10;

export default function AdminDoctorNotes() {
  const [notes,        setNotes]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(false);
  const [search,       setSearch]       = useState("");
  const [page,         setPage]         = useState(1);
  const [selected,     setSelected]     = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    api
      .get("/admin/doctor-notes")
      .then((res) => setNotes(res.data.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  const filtered = useMemo(() => {
    let data = notes;
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter((n) =>
        (n.diagnosis || "").toLowerCase().includes(q) ||
        (n.patientRef?.name || n.patientName || "").toLowerCase().includes(q) ||
        ensureDrPrefix(n.doctor?.fullName || "").toLowerCase().includes(q) ||
        (n.doctor?.fullName || "").toLowerCase().includes(q)
      );
    }
    return data;
  }, [notes, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged      = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Doctor Notes</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-300">
            {loading ? "Loading…" : `${filtered.length} of ${notes.length} notes`}
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
          <span className="text-sm">Failed to load doctor notes.</span>
          <button onClick={load} className="ml-auto text-xs font-semibold underline">Retry</button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by title, patient or doctor…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-mint focus:outline-none focus:ring-2 focus:ring-mint/20"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Note</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Patient</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Doctor</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Created</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {[120, 100, 100, 80, 80, 40].map((w, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-4 animate-pulse rounded bg-slate-100" style={{ width: w }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center">
                    <ClipboardList size={28} className="mx-auto mb-2 text-slate-200" />
                    <p className="text-sm text-slate-400">
                      {search ? "No notes match your search." : "No doctor notes found."}
                    </p>
                  </td>
                </tr>
              ) : (
                paged.map((n) => {
                  const doctorName  = n.doctor?.fullName || "Unknown";
                  const patientName = n.patientRef?.name || n.patientName || "Unknown Patient";
                  const noteTitle   = safeVal(n.diagnosis) || "Doctor Note";
                  return (
                    <tr key={n._id} className="transition hover:bg-slate-50">
                      {/* Note */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-50">
                            <ClipboardList size={14} className="text-purple-600" />
                          </div>
                          <span className="max-w-[160px] truncate font-medium text-slate-900">
                            {noteTitle}
                          </span>
                        </div>
                      </td>
                      {/* Patient */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <Avatar
                            name={patientName}
                            photo={null}
                            sizeCls="h-6 w-6"
                            bgCls="bg-blue-100"
                            textCls="text-xs font-semibold text-blue-700"
                          />
                          <span className="text-slate-700">{patientName}</span>
                        </div>
                      </td>
                      {/* Doctor */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <Avatar
                            name={doctorName}
                            photo={n.doctor?.profilePhoto}
                            sizeCls="h-6 w-6"
                            bgCls="bg-emerald-100"
                            textCls="text-xs font-semibold text-emerald-700"
                          />
                          <span className="whitespace-nowrap text-slate-700">{ensureDrPrefix(doctorName)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5"><StatusBadge status="created" /></td>
                      <td className="px-4 py-3.5 text-slate-400">{fmtDate(n.createdAt)}</td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => setSelected(n)}
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
      {selected && <NoteModal note={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}
