import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldOff,
  Stethoscope,
  User,
  X,
} from "lucide-react";
import api from "../services/api";
import { ensureDrPrefix } from "../utils/drName";
import { useAuth } from "../context/AuthContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  reviewed: {
    cls: "border-emerald-200 bg-emerald-50 text-emerald-700",
    label: "Reviewed",
  },
  follow_up_required: {
    cls: "border-amber-200  bg-amber-50  text-amber-700",
    label: "Follow-up Required",
  },
  completed: {
    cls: "border-blue-200   bg-blue-50   text-blue-700",
    label: "Completed",
  },
};

const FILTERS = [
  { value: "all", label: "All" },
  { value: "latest", label: "Latest (7 days)" },
  { value: "this_month", label: "This Month" },
  { value: "older", label: "Older" },
];

const GRADIENTS = [
  "from-blue-400 to-blue-600",
  "from-emerald-400 to-emerald-600",
  "from-purple-400 to-purple-600",
  "from-rose-400 to-rose-600",
  "from-amber-400 to-amber-600",
  "from-indigo-400 to-indigo-600",
  "from-teal-400 to-teal-600",
  "from-cyan-400 to-cyan-600",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pickGradient(name) {
  return GRADIENTS[(name || "?").charCodeAt(0) % GRADIENTS.length];
}

function getInitials(name) {
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
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isRecent(createdAt) {
  return Date.now() - new Date(createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;
}

function matchesSearch(note, q) {
  if (!q.trim()) return true;
  const lq = q.toLowerCase();
  return (
    (note.doctor?.fullName || "").toLowerCase().includes(lq) ||
    (note.doctor?.hospital || "").toLowerCase().includes(lq) ||
    (note.diagnosis || "").toLowerCase().includes(lq) ||
    (note.symptoms || "").toLowerCase().includes(lq) ||
    (note.prescription || "").toLowerCase().includes(lq) ||
    (note.recommendedTests || "").toLowerCase().includes(lq) ||
    (note.advice || "").toLowerCase().includes(lq)
  );
}

function matchesFilter(note, filter) {
  if (filter === "all") return true;
  const d = new Date(note.createdAt);
  const now = new Date();
  if (filter === "latest") return isRecent(note.createdAt);
  if (filter === "this_month")
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  if (filter === "older")
    return !(
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  return true;
}

// Safe HTML escaping for the PDF window
function esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── PDF generation (open new window + print) ────────────────────────────────

function printNotePDF(note, patientFullName) {
  const dr = note.doctor || {};
  const time = fmtDateTime(note.createdAt);
  const date = fmtDate(note.createdAt);
  const status = STATUS_CONFIG[note.status] || STATUS_CONFIG.reviewed;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Medical Note – ${esc(dr.fullName)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;color:#172026;background:#fff;padding:36px;font-size:13px}
    .hdr{display:flex;align-items:flex-start;justify-content:space-between;border-bottom:3px solid #2fbf9b;padding-bottom:18px;margin-bottom:24px}
    .brand{font-size:22px;font-weight:800;color:#2fbf9b;letter-spacing:-0.5px}
    .brand-sub{font-size:10px;color:#5b7285;margin-top:3px}
    .badge{display:inline-block;font-size:11px;font-weight:600;padding:3px 10px;border-radius:999px;background:#ecfdf5;border:1px solid #d1fae5;color:#065f46}
    .ts{font-size:10px;color:#94a3b8;text-align:right;margin-top:5px}
    .section{margin-bottom:20px}
    .sec-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#5b7285;margin-bottom:8px}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .info{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px}
    .info-label{font-size:9px;text-transform:uppercase;letter-spacing:.07em;color:#94a3b8;margin-bottom:3px}
    .info-value{font-size:13px;font-weight:600;color:#172026}
    .content{background:#f8fafc;border-left:3px solid #2fbf9b;border-radius:0 8px 8px 0;padding:12px 16px}
    .content-text{font-size:13px;line-height:1.7;white-space:pre-wrap;color:#172026}
    .empty{font-style:italic;color:#94a3b8}
    hr{border:none;border-top:1px solid #e2e8f0;margin:20px 0}
    .sig{border:1px dashed #cbd5e1;border-radius:8px;padding:14px 16px}
    .sig-name{font-size:16px;font-weight:700;color:#172026;border-bottom:2px solid #172026;display:inline-block;padding-bottom:2px}
    .sig-sub{font-size:11px;color:#5b7285;margin-top:5px}
    .tx{font-size:10px;font-family:monospace;color:#94a3b8;margin-top:8px;word-break:break-all}
    .footer{text-align:center;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:14px;margin-top:28px;line-height:1.6}
    @media print{body{padding:16px}}
  </style>
</head>
<body>
  <div class="hdr">
    <div>
      <div class="brand">HealthChain</div>
      <div class="brand-sub">Blockchain-Based Healthcare Record System</div>
    </div>
    <div>
      <span class="badge">${note.blockchainTxId ? "✓ Verified by Blockchain" : "✓ Verified by System"}</span>
      <div class="ts">${esc(time)}</div>
    </div>
  </div>

  <div class="section">
    <div class="sec-title">Patient Information</div>
    <div class="grid2">
      <div class="info"><div class="info-label">Patient Name</div><div class="info-value">${esc(patientFullName || note.patientName)}</div></div>
      <div class="info"><div class="info-label">Date of Note</div><div class="info-value">${esc(date)}</div></div>
    </div>
  </div>

  <div class="section">
    <div class="sec-title">Attending Physician</div>
    <div class="grid2">
      <div class="info"><div class="info-label">Doctor Name</div><div class="info-value">${esc(ensureDrPrefix(dr.fullName))}</div></div>
      <div class="info"><div class="info-label">Hospital / Clinic</div><div class="info-value">${esc(dr.hospital || "—")}</div></div>
      <div class="info"><div class="info-label">Specialization</div><div class="info-value">${esc(dr.specialization || "General Medicine")}</div></div>
      <div class="info"><div class="info-label">License No.</div><div class="info-value">${esc(dr.licenseNumber || "—")}</div></div>
    </div>
  </div>

  <div class="section">
    <div class="sec-title">Note Status</div>
    <span class="badge" style="background:#f0fdf4;border-color:#bbf7d0;color:#15803d">${esc(status.label)}</span>
  </div>

  <hr/>

  ${
    note.diagnosis
      ? `
  <div class="section">
    <div class="sec-title">Diagnosis</div>
    <div class="content"><div class="content-text">${esc(note.diagnosis)}</div></div>
  </div>`
      : ""
  }

  ${
    note.symptoms
      ? `
  <div class="section">
    <div class="sec-title">Symptoms / Clinical Observations</div>
    <div class="content"><div class="content-text">${esc(note.symptoms)}</div></div>
  </div>`
      : ""
  }

  ${
    note.prescription
      ? `
  <div class="section">
    <div class="sec-title">Prescription / Medicines</div>
    <div class="content"><div class="content-text">${esc(note.prescription)}</div></div>
  </div>`
      : ""
  }

  ${
    note.recommendedTests
      ? `
  <div class="section">
    <div class="sec-title">Recommended Tests</div>
    <div class="content"><div class="content-text">${esc(note.recommendedTests)}</div></div>
  </div>`
      : ""
  }

  ${
    note.advice
      ? `
  <div class="section">
    <div class="sec-title">Lifestyle Advice</div>
    <div class="content"><div class="content-text">${esc(note.advice)}</div></div>
  </div>`
      : ""
  }

  ${
    note.followUpDate
      ? `
  <div class="section">
    <div class="sec-title">Follow-up Date</div>
    <div class="info" style="display:inline-block">
      <div class="info-value">${esc(fmtDate(note.followUpDate))}</div>
    </div>
  </div>`
      : ""
  }

  <hr/>

  <div class="section">
    <div class="sec-title">Doctor's Digital Signature</div>
    <div class="sig">
      <div class="sig-name">${esc(ensureDrPrefix(dr.fullName) || "—")}</div>
      <div class="sig-sub">${esc(dr.specialization || "General Medicine")} · ${esc(dr.hospital || "—")}</div>
      ${dr.licenseNumber ? `<div class="sig-sub">License: ${esc(dr.licenseNumber)}</div>` : ""}
      ${note.blockchainTxId ? `<div class="tx">Blockchain TX: ${esc(note.blockchainTxId)}</div>` : ""}
    </div>
  </div>

  <div class="footer">
    This document was generated by HealthChain — Blockchain-Based Healthcare Record System<br/>
    Generated on: ${esc(time)} &nbsp;·&nbsp; Confidential medical information — handle with care
  </div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=920,height=720");
  if (!win) {
    alert(
      "Popup was blocked. Please allow popups for this site to download the PDF.",
    );
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 600);
}

// ─── DoctorAvatar ─────────────────────────────────────────────────────────────

function DoctorAvatar({ name, photoUrl, size = 52 }) {
  const [imgErr, setImgErr] = useState(false);
  const gradient = pickGradient(name);
  const initials = getInitials(name);
  const show = photoUrl && !imgErr;

  return (
    <div
      className="shrink-0 overflow-hidden rounded-full ring-2 ring-white shadow-md"
      style={{ width: size, height: size }}
    >
      {show ? (
        <img
          src={photoUrl}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setImgErr(true)}
        />
      ) : (
        <div
          className={`flex h-full w-full select-none items-center justify-center bg-gradient-to-br ${gradient} font-bold text-white`}
          style={{ fontSize: size * 0.34 }}
        >
          {initials}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton card ─────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="h-1 w-full animate-pulse bg-slate-100" />
      <div className="p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div
            className="shrink-0 animate-pulse rounded-full bg-slate-100"
            style={{ width: 48, height: 48 }}
          />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
        <div className="h-px bg-slate-100" />
        <div className="space-y-2">
          <div className="h-2.5 w-16 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="space-y-2">
          <div className="h-2.5 w-12 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="h-9 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-9 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

// ─── Note Card ────────────────────────────────────────────────────────────────

function NoteCard({ note, onView, patientName }) {
  const dr = note.doctor || {};
  const statusCfg = STATUS_CONFIG[note.status] || STATUS_CONFIG.reviewed;
  const recent = isRecent(note.createdAt);
  const summary = note.symptoms || note.prescription || note.advice || "";

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-slate-200 hover:shadow-md">
      {/* Accent strip */}
      <div className="h-1 w-full bg-mint/60 transition-all duration-200 group-hover:h-[3px] group-hover:bg-mint" />

      <div className="flex flex-1 flex-col gap-5 p-6">
        {/* ── Doctor info row ──────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <DoctorAvatar
            name={dr.fullName}
            photoUrl={dr.profilePhoto}
            size={48}
          />

          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-slate-900">
              {ensureDrPrefix(dr.fullName) || "Unknown Doctor"}
            </p>
            <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
              {dr.specialization || "General Medicine"}
            </p>
            {dr.hospital && (
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-400">
                <Building2 size={10} className="shrink-0" />
                {dr.hospital}
              </p>
            )}
          </div>

          {/* Badges */}
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold leading-none ${statusCfg.cls}`}
            >
              {statusCfg.label}
            </span>
            {recent && (
              <span className="inline-flex items-center rounded-full border border-mint/40 bg-mint/10 px-2 py-0.5 text-[9px] font-bold leading-none tracking-wide text-mint">
                Latest
              </span>
            )}
          </div>
        </div>

        {/* ── Divider ─────────────────────────────────────────────────── */}
        <div className="h-px bg-slate-100" />

        {/* ── Diagnosis ───────────────────────────────────────────────── */}
        {note.diagnosis && (
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Diagnosis
            </p>
            <p className="line-clamp-2 text-sm font-semibold text-slate-800">
              {note.diagnosis}
            </p>
          </div>
        )}

        {/* ── Summary preview — max 2 lines; full content only in View Details ── */}
        {summary && (
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Notes
            </p>
            <p className="line-clamp-2 text-sm leading-relaxed text-slate-500">
              {summary}
            </p>
          </div>
        )}

        {/* ── Meta row ────────────────────────────────────────────────── */}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-50 pt-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <Calendar size={11} />
            {fmtDate(note.createdAt)}
          </span>
          <span className="flex items-center gap-1.5">
            {note.blockchainTxId ? (
              <>
                <ShieldCheck size={11} className="text-emerald-500" />{" "}
                Blockchain
              </>
            ) : (
              <>
                <ShieldCheck size={11} className="text-slate-300" /> System
              </>
            )}
          </span>
        </div>

        {/* ── Actions ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onView(note)}
            className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-mint px-3 text-xs font-semibold text-white transition-all duration-150 hover:bg-mint/90 hover:shadow-sm active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2"
          >
            <FileText size={13} /> View Details
          </button>
          <button
            onClick={() => printNotePDF(note, patientName)}
            className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2"
          >
            <Download size={13} /> Download PDF
          </button>
        </div>
      </div>
    </article>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function NoteModal({ note, patientName, onClose }) {
  const dr = note.doctor || {};
  const statusCfg = STATUS_CONFIG[note.status] || STATUS_CONFIG.reviewed;
  const recent = isRecent(note.createdAt);

  // Close on ESC
  useEffect(() => {
    function onEsc(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  function Field({ label, value }) {
    if (!value || !value.trim()) return null;
    return (
      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-800">
          {value}
        </p>
      </div>
    );
  }

  function InfoPill({ label, value }) {
    return (
      <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-semibold text-slate-800">
          {value || "—"}
        </p>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Sticky header ─────────────────────────────────────────────── */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <DoctorAvatar
              name={dr.fullName}
              photoUrl={dr.profilePhoto}
              size={44}
            />
            <div className="min-w-0">
              <p className="truncate font-bold text-slate-900">
                {ensureDrPrefix(dr.fullName) || "Unknown Doctor"}
              </p>
              <p className="truncate text-xs text-slate-500">
                {dr.specialization || "General Medicine"}
                {dr.hospital ? ` · ${dr.hospital}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Scrollable body ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Meta chips */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <InfoPill label="Date" value={fmtDate(note.createdAt)} />
            <InfoPill label="Hospital" value={dr.hospital || "—"} />
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Status
              </p>
              <div className="mt-1">
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none ${statusCfg.cls}`}
                >
                  {statusCfg.label}
                </span>
                {recent && (
                  <span className="ml-1.5 inline-flex items-center rounded-full border border-mint/30 bg-mint/10 px-2 py-0.5 text-[10px] font-semibold leading-none text-mint">
                    Latest
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Note content — only renders sections that have data */}
          <Field label="Diagnosis" value={note.diagnosis} />
          <Field
            label="Symptoms / Clinical Observations"
            value={note.symptoms}
          />
          <Field label="Prescription / Medicines" value={note.prescription} />
          <Field label="Recommended Tests" value={note.recommendedTests} />
          <Field label="Lifestyle Advice" value={note.advice} />

          {/* Follow-up — only shown when set */}
          {note.followUpDate && (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Follow-up Date
              </p>
              <div className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                <Clock size={14} className="shrink-0 text-amber-600" />
                <p className="text-sm font-semibold text-amber-800">
                  {fmtDate(note.followUpDate)}
                </p>
              </div>
            </div>
          )}

          <div className="h-px bg-slate-100" />

          {/* Doctor signature */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Doctor's Digital Signature
            </p>
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-4">
              <p className="inline-block border-b-2 border-slate-900 pb-0.5 text-lg font-bold text-slate-900">
                {ensureDrPrefix(dr.fullName) || "—"}
              </p>
              <p className="mt-1.5 text-xs text-slate-500">
                {dr.specialization || "General Medicine"}
                {dr.hospital ? ` · ${dr.hospital}` : ""}
              </p>
              {dr.licenseNumber && (
                <p className="mt-0.5 text-xs text-slate-400">
                  License: {dr.licenseNumber}
                </p>
              )}
              {note.blockchainTxId && (
                <p className="mt-2 break-all font-mono text-[10px] text-slate-300">
                  TX: {note.blockchainTxId}
                </p>
              )}
            </div>
          </div>

          {/* Blockchain verification */}
          <div
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
              note.blockchainTxId
                ? "border-emerald-200 bg-emerald-50"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            {note.blockchainTxId ? (
              <ShieldCheck
                size={16}
                className="mt-0.5 shrink-0 text-emerald-600"
              />
            ) : (
              <ShieldOff size={16} className="mt-0.5 shrink-0 text-slate-400" />
            )}
            <div>
              <p
                className={`text-sm font-semibold ${note.blockchainTxId ? "text-emerald-800" : "text-slate-600"}`}
              >
                {note.blockchainTxId
                  ? "Verified by Blockchain"
                  : "Verified by System"}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {note.blockchainTxId
                  ? "This note is cryptographically verified on the blockchain."
                  : "This note is verified and stored securely in the HealthChain system."}
              </p>
            </div>
          </div>

          {/* Timestamps */}
          <div className="flex flex-wrap gap-4 text-xs text-slate-400">
            <span>
              <span className="font-medium text-slate-500">Created:</span>{" "}
              {fmtDateTime(note.createdAt)}
            </span>
            {note.updatedAt !== note.createdAt && (
              <span>
                <span className="font-medium text-slate-500">Updated:</span>{" "}
                {fmtDateTime(note.updatedAt)}
              </span>
            )}
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="btn-secondary px-5 py-2">
            Close
          </button>
          <button
            onClick={() => printNotePDF(note, patientName)}
            className="btn gap-2 px-5 py-2"
          >
            <Download size={14} /> Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MedicalNotes() {
  const { user } = useAuth();

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null); // note shown in modal

  const fetchNotes = useCallback(() => {
    setLoading(true);
    setError(false);
    api
      .get("/my-notes")
      .then((res) => setNotes(res.data.data || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const filtered = useMemo(
    () =>
      notes.filter((n) => matchesSearch(n, search) && matchesFilter(n, filter)),
    [notes, search, filter],
  );

  const patientName = user?.fullName || "";

  return (
    <>
      <section className="space-y-6">
        {/* ── Page header ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Medical Notes
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
              View diagnosis notes and medical recommendations shared by your
              doctors.
            </p>
          </div>
          <button
            onClick={fetchNotes}
            disabled={loading}
            className="btn-secondary gap-2 self-start"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* ── Search ──────────────────────────────────────────────────── */}
        <div className="relative">
          <Search
            size={16}
            className="absolute inset-y-0 left-3.5 my-auto text-slate-400"
          />
          <input
            type="text"
            placeholder="Search by doctor, diagnosis, hospital…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="field !pl-10"
          />
        </div>

        {/* ── Filter tabs ─────────────────────────────────────────────── */}
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 ${
                filter === value
                  ? "border-mint bg-mint text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-mint/40 hover:bg-mint/5 hover:text-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Error ───────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4">
            <AlertCircle size={18} className="shrink-0 text-red-500" />
            <p className="text-sm text-red-700">
              Failed to load medical notes.
            </p>
            <button
              onClick={fetchNotes}
              className="ml-auto text-sm font-medium text-red-600 hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Loading skeletons ────────────────────────────────────────── */}
        {loading && !error && (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} />
            ))}
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────────────────── */}
        {!loading && !error && notes.length === 0 && (
          <div className="flex flex-col items-center gap-6 rounded-2xl border border-slate-100 bg-white px-8 py-16 text-center shadow-sm">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-50">
                <Stethoscope size={44} className="text-slate-300" />
              </div>
              <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-white bg-mint/30" />
              <span className="absolute -bottom-1 -left-1 h-3 w-3 rounded-full border-2 border-white bg-blue-200" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-700">
                No medical notes available yet.
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
                Doctor notes will appear here after a doctor reviews your shared
                medical records.
              </p>
            </div>
            <Link to="/records" className="btn-secondary gap-2">
              <FileText size={14} /> Go to My Records
            </Link>
          </div>
        )}

        {/* ── No search/filter results (but notes exist) ───────────────── */}
        {!loading && !error && notes.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-100 bg-white px-8 py-12 text-center shadow-sm">
            <Search size={36} className="text-slate-200" />
            <div>
              <p className="font-semibold text-slate-600">
                No notes match your search or filter.
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Try different keywords or select "All".
              </p>
            </div>
            <button
              onClick={() => {
                setSearch("");
                setFilter("all");
              }}
              className="btn-secondary gap-2"
            >
              <X size={14} /> Clear Filters
            </button>
          </div>
        )}

        {/* ── Notes grid ───────────────────────────────────────────────── */}
        {!loading && !error && filtered.length > 0 && (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-300">
              Showing{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {filtered.length}
              </span>{" "}
              note{filtered.length !== 1 ? "s" : ""}
              {notes.length !== filtered.length && ` of ${notes.length}`}
            </p>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((note) => (
                <NoteCard
                  key={String(note._id)}
                  note={note}
                  patientName={patientName}
                  onView={setSelected}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* ── Detail modal ───────────────────────────────────────────────── */}
      {selected && (
        <NoteModal
          note={selected}
          patientName={patientName}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
