/**
 * My Records — Patient-facing EHR records module.
 *
 * Features:
 *  • List all own records with search (title / type / hospital / doctor)
 *  • Upload modal with full validation, file picker, loading state
 *  • View modal with complete record details
 *  • Download attachment (fetches blob, triggers browser download)
 *  • Delete with confirmation dialog
 *  • Skeleton loading, empty state, professional toasts
 */

import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  FilePlus,
  Hospital,
  Loader2,
  Search,
  ShieldCheck,
  Stethoscope,
  Tag,
  Trash2,
  Upload,
  User,
  X,
  Eye,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import api from "../services/api";
import { ensureDrPrefix } from "../utils/drName";

// ─── Constants ─────────────────────────────────────────────────────────────────
const RECORD_TYPES = [
  "Prescription",
  "Blood Test",
  "X-Ray",
  "MRI",
  "CT Scan",
  "Vaccination",
  "Other",
];

const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png"];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const TYPE_COLORS = {
  "Prescription": "bg-blue-50 text-blue-700 border-blue-200",
  "Blood Test":   "bg-red-50 text-red-700 border-red-200",
  "X-Ray":        "bg-indigo-50 text-indigo-700 border-indigo-200",
  "MRI":          "bg-purple-50 text-purple-700 border-purple-200",
  "CT Scan":      "bg-pink-50 text-pink-700 border-pink-200",
  "Vaccination":  "bg-green-50 text-green-700 border-green-200",
  "Other":        "bg-slate-50 text-slate-600 border-slate-200",
};

const STATUS_COLORS = {
  active:   "bg-blue-50 text-blue-700",
  verified: "bg-emerald-50 text-emerald-700",
  tampered: "bg-red-50 text-red-700",
  draft:    "bg-slate-50 text-slate-500",
  archived: "bg-amber-50 text-amber-700",
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fmt(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function fileSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toasts, onDismiss }) {
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg transition-all duration-300 ${
            t.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {t.type === "success" ? (
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle size={18} className="shrink-0 text-red-500" />
          )}
          <span className="text-sm font-medium">{t.message}</span>
          <button
            onClick={() => onDismiss(t.id)}
            className="ml-2 shrink-0 text-current opacity-50 hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Skeleton loaders ─────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="animate-pulse rounded-xl border border-slate-100 bg-white p-5">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-xl bg-slate-100" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/5 rounded bg-slate-100" />
          <div className="h-3 w-3/5 rounded bg-slate-100" />
        </div>
        <div className="h-8 w-20 rounded-lg bg-slate-100" />
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ onUpload }) {
  return (
    <div className="flex flex-col items-center gap-5 rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
      <span className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-50">
        <FileText size={40} className="text-blue-400" />
      </span>
      <div>
        <p className="text-lg font-semibold text-slate-700">No medical records found.</p>
        <p className="mt-1 max-w-xs text-sm leading-relaxed text-slate-500">
          Upload your first medical record to securely store it on HealthChain.
        </p>
      </div>
      <button onClick={onUpload} className="btn gap-2">
        <FilePlus size={16} />
        Upload First Record
      </button>
    </div>
  );
}

// ─── Confirmation dialog ──────────────────────────────────────────────────────
function ConfirmDialog({ title, message, onConfirm, onCancel, busy }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50">
            <Trash2 size={20} className="text-red-500" />
          </span>
          <div>
            <p className="font-semibold text-slate-900">{title}</p>
            <p className="mt-0.5 text-sm text-slate-500">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── View Modal ───────────────────────────────────────────────────────────────
function ViewModal({ record, onClose, onDownload }) {
  const typeColor = TYPE_COLORS[record.recordType] || TYPE_COLORS["Other"];
  const statusColor = STATUS_COLORS[record.status] || STATUS_COLORS.active;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <FileText size={20} className="text-blue-600" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate font-semibold text-slate-900">
                {record.title || record.diagnosis}
              </h2>
              <span className={`mt-0.5 inline-block rounded border px-2 py-0.5 text-xs font-medium ${typeColor}`}>
                {record.recordType || "Record"}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Status badge */}
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-slate-400" />
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusColor}`}>
              {record.status}
            </span>
          </div>

          {/* Detail grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {record.hospitalName && (
              <DetailItem icon={Hospital} label="Hospital / Clinic" value={record.hospitalName} />
            )}
            {record.doctorName && (
              <DetailItem icon={Stethoscope} label="Doctor" value={ensureDrPrefix(record.doctorName)} />
            )}
            {record.visitDate && (
              <DetailItem icon={Calendar} label="Visit Date" value={fmt(record.visitDate)} />
            )}
            <DetailItem icon={Clock} label="Uploaded" value={fmt(record.createdAt)} />
          </div>

          {/* Description / Prescription */}
          {record.prescription && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Description
              </p>
              <p className="rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
                {record.prescription}
              </p>
            </div>
          )}

          {/* Attachments */}
          {record.attachments?.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Attachments ({record.attachments.length})
              </p>
              <div className="space-y-2">
                {record.attachments.map((att, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText size={14} className="shrink-0 text-slate-400" />
                      <span className="truncate text-sm text-slate-700">{att.fileName}</span>
                      {att.size && (
                        <span className="shrink-0 text-xs text-slate-400">{fileSize(att.size)}</span>
                      )}
                    </div>
                    <button
                      onClick={() => onDownload(att)}
                      className="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                    >
                      <Download size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Blockchain hash */}
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Blockchain Hash
            </p>
            <p className="break-all rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-500">
              {record.recordHash}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ icon: Icon, label, value }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
        <Icon size={12} />
        {label}
      </div>
      <div className="text-sm font-medium text-slate-800">{value}</div>
    </div>
  );
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  title: "",
  recordType: "",
  hospitalName: "",
  doctorName: "",
  visitDate: "",
  description: "",
};

function UploadModal({ onClose, onSuccess }) {
  const [form, setForm]       = useState(EMPTY_FORM);
  const [file, setFile]       = useState(null);       // single file, optional
  const [errors, setErrors]   = useState({});
  const [busy, setBusy]       = useState(false);
  const fileInputRef           = useRef(null);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  }

  function validate() {
    const errs = {};
    if (!form.title.trim())     errs.title = "Record title is required.";
    if (!form.recordType)        errs.recordType = "Please select a record type.";
    if (!form.hospitalName.trim()) errs.hospitalName = "Hospital / Clinic name is required.";
    if (!form.doctorName.trim()) errs.doctorName = "Doctor name is required.";
    if (!form.visitDate)         errs.visitDate = "Visit date is required.";
    if (file) {
      if (!ALLOWED_MIME.includes(file.type))
        errs.file = "Only PDF, JPG and PNG files are allowed.";
      else if (file.size > MAX_BYTES)
        errs.file = "File size exceeds 10 MB limit.";
    }
    return errs;
  }

  function handleFile(e) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setErrors((er) => ({ ...er, file: "" }));
    if (!ALLOWED_MIME.includes(picked.type)) {
      setErrors((er) => ({ ...er, file: "Only PDF, JPG and PNG files are allowed." }));
      return;
    }
    if (picked.size > MAX_BYTES) {
      setErrors((er) => ({ ...er, file: "File size exceeds 10 MB limit." }));
      return;
    }
    setFile(picked);
  }

  async function submit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("title",        form.title.trim());
      fd.append("recordType",   form.recordType);
      fd.append("hospitalName", form.hospitalName.trim());
      fd.append("doctorName",   form.doctorName.trim());
      fd.append("visitDate",    form.visitDate);
      fd.append("description",  form.description.trim());
      if (file) fd.append("reports", file);

      const { data } = await api.post("/my-records", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onSuccess(data.data);
    } catch (err) {
      const msg = err.response?.data?.message || "Upload failed. Please try again.";
      setErrors((er) => ({ ...er, _server: msg }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-light relative z-10 flex max-h-[95vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <Upload size={20} className="text-blue-600" />
            </span>
            <div>
              <h2 className="font-semibold text-slate-900">Upload Medical Record</h2>
              <p className="text-xs text-slate-500">Securely stored on HealthChain</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="flex-1 overflow-y-auto p-5">
          {errors._server && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle size={16} className="shrink-0" />
              {errors._server}
            </div>
          )}

          <div className="space-y-4">
            {/* Record Title */}
            <Field label="Record Title *" error={errors.title}>
              <input
                className="field"
                placeholder="e.g. Annual Blood Test Report"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
              />
            </Field>

            {/* Record Type */}
            <Field label="Record Type *" error={errors.recordType}>
              <select
                className="field"
                value={form.recordType}
                onChange={(e) => set("recordType", e.target.value)}
              >
                <option value="">Select type…</option>
                {RECORD_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>

            {/* Hospital and Doctor side by side on sm+ */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Hospital / Clinic *" error={errors.hospitalName}>
                <input
                  className="field"
                  placeholder="City Hospital"
                  value={form.hospitalName}
                  onChange={(e) => set("hospitalName", e.target.value)}
                />
              </Field>
              <Field label="Doctor Name *" error={errors.doctorName}>
                <input
                  className="field"
                  placeholder="Dr. Sharma"
                  value={form.doctorName}
                  onChange={(e) => set("doctorName", e.target.value)}
                />
              </Field>
            </div>

            {/* Visit Date */}
            <Field label="Visit Date *" error={errors.visitDate}>
              <input
                type="date"
                className="field"
                max={new Date().toISOString().slice(0, 10)}
                value={form.visitDate}
                onChange={(e) => set("visitDate", e.target.value)}
              />
            </Field>

            {/* Description */}
            <Field label="Description (optional)" error={errors.description}>
              <textarea
                className="field resize-none"
                rows={3}
                placeholder="Notes about this record…"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </Field>

            {/* File Upload */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Upload Medical Report (optional)
              </label>
              <div
                className={`relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 transition ${
                  errors.file
                    ? "border-red-300 bg-red-50"
                    : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50"
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={24} className={errors.file ? "text-red-400" : "text-slate-400"} />
                {file ? (
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-700">{file.name}</p>
                    <p className="text-xs text-slate-400">{fileSize(file.size)}</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-slate-600">Click to choose file</p>
                    <p className="text-xs text-slate-400">PDF, JPG or PNG · Max 10 MB</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={handleFile}
                />
              </div>
              {file && (
                <button
                  type="button"
                  onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  className="mt-1.5 text-xs text-slate-400 underline hover:text-slate-600"
                >
                  Remove file
                </button>
              )}
              {errors.file && (
                <p className="mt-1 text-xs text-red-600">{errors.file}</p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
            >
              {busy ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Upload Record
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ─── Record Card ──────────────────────────────────────────────────────────────
function RecordCard({ record, onView, onDownload, onDelete }) {
  const typeColor   = TYPE_COLORS[record.recordType]  || TYPE_COLORS["Other"];
  const statusColor = STATUS_COLORS[record.status]     || STATUS_COLORS.active;
  const hasFile     = record.attachments?.length > 0;

  return (
    <article className="group rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition duration-200 hover:border-blue-100 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        {/* Left — icon + info */}
        <div className="flex min-w-0 items-start gap-4">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
            <FileText size={20} className="text-blue-600" />
          </span>

          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">
              {record.title || record.diagnosis}
            </p>

            {/* Metadata row */}
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              {record.recordType && (
                <span className={`rounded border px-1.5 py-0.5 font-medium ${typeColor}`}>
                  {record.recordType}
                </span>
              )}
              {record.hospitalName && (
                <span className="flex items-center gap-1">
                  <Hospital size={11} />
                  {record.hospitalName}
                </span>
              )}
              {record.doctorName && (
                <span className="flex items-center gap-1">
                  <User size={11} />
                  {ensureDrPrefix(record.doctorName)}
                </span>
              )}
              {record.visitDate && (
                <span className="flex items-center gap-1">
                  <Calendar size={11} />
                  {fmt(record.visitDate)}
                </span>
              )}
            </div>

            {/* Second row */}
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
              <span>Uploaded {fmt(record.createdAt)}</span>
              <span className={`rounded-full px-2 py-0.5 font-semibold capitalize ${statusColor}`}>
                {record.status}
              </span>
              {hasFile && (
                <span className="flex items-center gap-1 text-slate-400">
                  <FileText size={11} />
                  {record.attachments.length} file{record.attachments.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right — actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            title="View Details"
            onClick={() => onView(record)}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
          >
            <Eye size={15} />
          </button>
          {hasFile && (
            <button
              title="Download Attachment"
              onClick={() => onDownload(record.attachments[0], record)}
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600"
            >
              <Download size={15} />
            </button>
          )}
          <button
            title="Delete Record"
            onClick={() => onDelete(record)}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </article>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Records() {
  const [records, setRecords]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [fetchError, setFetchError]   = useState("");
  const [search, setSearch]           = useState("");

  const [showUpload, setShowUpload]   = useState(false);
  const [viewRecord, setViewRecord]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy]   = useState(false);

  const [toasts, setToasts]           = useState([]);

  // ── Toast helpers ──────────────────────────────────────────────────────────
  const addToast = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Fetch records ──────────────────────────────────────────────────────────
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      const { data } = await api.get("/my-records");
      setRecords(data.data || []);
    } catch {
      setFetchError("Unable to fetch records. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = records.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (r.title || r.diagnosis || "").toLowerCase().includes(q) ||
      (r.recordType || "").toLowerCase().includes(q) ||
      (r.hospitalName || "").toLowerCase().includes(q) ||
      (r.doctorName || "").toLowerCase().includes(q)
    );
  });

  // ── Upload success ─────────────────────────────────────────────────────────
  function handleUploadSuccess(newRecord) {
    setRecords((prev) => [newRecord, ...prev]);
    setShowUpload(false);
    addToast("Record uploaded successfully!");
  }

  // ── Download attachment ────────────────────────────────────────────────────
  async function handleDownload(attachment, record) {
    try {
      const response = await api.get(
        `/my-records/${record._id}/download/${encodeURIComponent(attachment.cid)}`,
        { responseType: "blob" }
      );
      const url = URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = attachment.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      const status = err.response?.status;
      let msg = "Download failed. Please try again.";
      if (status === 410 || status === 404) {
        // Error body arrives as a Blob when responseType is "blob"; parse it
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          msg = json.message || (status === 404 ? "File not found on server." : msg);
        } catch {
          msg = status === 404 ? "File not found on server." : msg;
        }
      }
      addToast(msg, "error");
    }
  }

  // ── Delete record ─────────────────────────────────────────────────────────
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await api.delete(`/my-records/${deleteTarget._id}`);
      setRecords((prev) => prev.filter((r) => r._id !== deleteTarget._id));
      addToast("Record deleted.");
    } catch {
      addToast("Failed to delete record.", "error");
    } finally {
      setDeleteBusy(false);
      setDeleteTarget(null);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <>
      <section className="space-y-6">
        {/* ── Page header ──────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Records</h1>
            <p className="mt-1 text-sm text-steel dark:text-slate-300">
              View, upload, and manage your medical records securely.
            </p>
          </div>
          <button
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:bg-blue-800"
            onClick={() => setShowUpload(true)}
          >
            <FilePlus size={16} />
            Upload Record
          </button>
        </div>

        {/* ── Search bar ───────────────────────────────────────────────── */}
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
            <Search size={16} className="text-slate-400" />
          </span>
          <input
            className="field !pl-9"
            placeholder="Search by title, type, hospital or doctor…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* ── Fetch error ───────────────────────────────────────────────── */}
        {fetchError && (
          <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
            <AlertCircle size={18} className="shrink-0 text-red-500" />
            <p className="text-sm font-medium text-red-700">{fetchError}</p>
            <button
              onClick={fetchRecords}
              className="ml-auto shrink-0 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Records list ─────────────────────────────────────────────── */}
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <SkeletonRow key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          search ? (
            /* No search results */
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center">
              <Search size={32} className="text-slate-300" />
              <p className="font-semibold text-slate-600">No matching records found.</p>
              <p className="text-sm text-slate-400">
                Try a different search term or{" "}
                <button
                  className="text-blue-600 underline"
                  onClick={() => setSearch("")}
                >
                  clear the search
                </button>
                .
              </p>
            </div>
          ) : (
            <EmptyState onUpload={() => setShowUpload(true)} />
          )
        ) : (
          <>
            {/* Record count */}
            <div className="flex items-center gap-2">
              <Tag size={14} className="text-slate-400" />
              <span className="text-sm text-slate-500 dark:text-slate-300">
                {filtered.length} record{filtered.length !== 1 ? "s" : ""}
                {search && ` matching "${search}"`}
              </span>
            </div>

            <div className="space-y-3">
              {filtered.map((r) => (
                <RecordCard
                  key={r._id}
                  record={r}
                  onView={setViewRecord}
                  onDownload={handleDownload}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={handleUploadSuccess}
        />
      )}

      {viewRecord && (
        <ViewModal
          record={viewRecord}
          onClose={() => setViewRecord(null)}
          onDownload={(att) => handleDownload(att, viewRecord)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Record"
          message={`"${deleteTarget.title || deleteTarget.diagnosis}" will be permanently removed.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          busy={deleteBusy}
        />
      )}

      {/* ── Toasts ─────────────────────────────────────────────────────────── */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
