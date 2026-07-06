import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Edit2,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import api from "../../services/api";

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[100]">
      <div className={`pointer-events-auto flex max-w-sm items-center gap-3 rounded-xl border px-4 py-3 shadow-lg ${
        toast.type === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-800"
      }`}>
        {toast.type === "success"
          ? <CheckCircle2 size={17} className="shrink-0 text-emerald-600" />
          : <AlertCircle  size={17} className="shrink-0 text-red-500"     />}
        <span className="text-sm font-medium">{toast.message}</span>
        <button onClick={onDismiss} className="ml-1 shrink-0 opacity-50 hover:opacity-100">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Delete Confirmation Dialog ───────────────────────────────────────────────
function DeleteDialog({ onConfirm, onCancel }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <Trash2 size={20} className="text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Delete Medical Note?</h3>
        <p className="mt-2 text-sm text-slate-500">
          Are you sure you want to permanently delete this medical note?{" "}
          <span className="font-medium text-slate-700">This action cannot be undone.</span>
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Note Form Modal ──────────────────────────────────────────────────────────
function NoteModal({ note, patients, onSave, onClose }) {
  const isEdit = Boolean(note?._id);
  const [form, setForm] = useState({
    patientName:      note?.patientName      || "",
    patientId:        note?.patientId        || "",
    diagnosis:        note?.diagnosis        || "",
    symptoms:         note?.symptoms         || "",
    prescription:     note?.prescription     || "",
    recommendedTests: note?.recommendedTests || "",
    advice:           note?.advice           || "",
    followUpDate:     note?.followUpDate
      ? new Date(note.followUpDate).toISOString().slice(0, 10)
      : "",
  });
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");

  useEffect(() => {
    function onEsc(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); setErr(""); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.patientName.trim())  { setErr("Patient name is required."); return; }
    if (!form.diagnosis.trim())    { setErr("Diagnosis is required."); return; }
    if (!form.prescription.trim()) { setErr("Prescription / Medicines is required."); return; }
    setSaving(true);
    try {
      const data = {
        patientName:      form.patientName.trim(),
        patientId:        form.patientId.trim(),
        diagnosis:        form.diagnosis.trim(),
        symptoms:         form.symptoms.trim(),
        prescription:     form.prescription.trim(),
        recommendedTests: form.recommendedTests.trim(),
        advice:           form.advice.trim(),
        followUpDate:     form.followUpDate || null,
      };
      let res;
      if (isEdit) res = await api.put(`/doctor/notes/${note._id}`, data);
      else        res = await api.post("/doctor/notes", data);
      onSave(res.data.data, isEdit);
    } catch (e) {
      setErr(e.response?.data?.message || "Failed to save note.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      {/*
        flex + flex-col + max-h-[90vh] = modal is bounded to 90% of viewport height.
        The header and footer are shrink-0 (never compressed).
        The form body is flex-1 + overflow-y-auto (scrolls independently).
        min-h-0 on the form prevents flex children from overflowing their parent.
      */}
      <div className="modal-light flex w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>

        {/* ── Fixed header ─────────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="font-bold text-slate-900">{isEdit ? "Edit Note" : "Add Medical Note"}</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200">
            <X size={15} />
          </button>
        </div>

        {/* ── Form: flex column so the scrollable body + fixed footer stack ── */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">

          {/* ── Scrollable fields area ────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

            {/* Patient selection */}
            {!isEdit && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Patient Name *</label>
                  {patients.length > 0 ? (
                    <select
                      className="field"
                      value={form.patientName}
                      onChange={(e) => {
                        const sel = patients.find((p) => p.name === e.target.value);
                        set("patientName", e.target.value);
                        set("patientId", sel?.patientId || "");
                      }}
                    >
                      <option value="">Select patient…</option>
                      {patients.map((p) => (
                        <option key={p.patientId} value={p.name}>{p.name}</option>
                      ))}
                      <option value="__other__">Other (type manually)</option>
                    </select>
                  ) : (
                    <input
                      className="field"
                      placeholder="Enter patient name"
                      value={form.patientName}
                      onChange={(e) => set("patientName", e.target.value)}
                    />
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Patient ID</label>
                  <input
                    className="field"
                    placeholder="e.g. PAT-0001"
                    value={form.patientId}
                    onChange={(e) => set("patientId", e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* If "Other" selected in dropdown, show text input */}
            {!isEdit && form.patientName === "__other__" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Patient Name *</label>
                <input
                  className="field"
                  placeholder="Enter patient name"
                  value=""
                  onChange={(e) => set("patientName", e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Diagnosis <span className="text-red-500">*</span>
              </label>
              <textarea
                className="field resize-none"
                rows={2}
                placeholder="e.g. Viral Fever, Hypertension, Type 2 Diabetes…"
                value={form.diagnosis}
                onChange={(e) => set("diagnosis", e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Symptoms / Clinical Observations
              </label>
              <textarea
                className="field resize-none"
                rows={3}
                placeholder="e.g. High fever, body ache, BP 150/90, Pulse 94/min…"
                value={form.symptoms}
                onChange={(e) => set("symptoms", e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Prescription / Medicines <span className="text-red-500">*</span>
              </label>
              <textarea
                className="field resize-none"
                rows={3}
                placeholder="e.g. Paracetamol 650 mg — 1 tablet every 8 hrs for 5 days…"
                value={form.prescription}
                onChange={(e) => set("prescription", e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Recommended Tests
              </label>
              <textarea
                className="field resize-none"
                rows={2}
                placeholder="e.g. CBC, Blood Sugar, Urine Routine…"
                value={form.recommendedTests}
                onChange={(e) => set("recommendedTests", e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Lifestyle Advice</label>
              <textarea
                className="field resize-none"
                rows={2}
                placeholder="e.g. Drink plenty of water, complete bed rest…"
                value={form.advice}
                onChange={(e) => set("advice", e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Follow-up Date</label>
              <input
                type="date"
                className="field"
                value={form.followUpDate}
                onChange={(e) => set("followUpDate", e.target.value)}
              />
            </div>

            {err && (
              <p className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle size={14} /> {err}
              </p>
            )}

          </div>
          {/* ── end scrollable area ───────────────────────────────────── */}

          {/* ── Fixed footer — always visible, never overlaps fields ──── */}
          <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 px-6 py-4">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {isEdit ? "Save Changes" : "Add Note"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DoctorNotes() {
  const [notes,    setNotes]    = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(false);
  const [modal,    setModal]    = useState(null); // null | "add" | noteObj (edit)
  const [delNote,  setDelNote]  = useState(null);
  const [toast,    setToast]    = useState(null);
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState("all");

  function showToast(msg, type = "success") {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  const fetchNotes = useCallback(() => {
    setLoading(true);
    setError(false);
    api.get("/doctor/notes")
      .then((res) => setNotes(res.data.data || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  // Load patient list for the add-note dropdown
  useEffect(() => {
    api.get("/doctor/patients")
      .then((res) => {
        const pats = (res.data.data || []).map((p) => ({
          name:      p.patient?.name || p.patient?.user?.fullName || "Unknown",
          patientId: p.patient?.patientId || "",
        }));
        setPatients(pats);
      })
      .catch(() => {});
  }, []);

  function handleSave(saved, isEdit) {
    if (isEdit) {
      setNotes((prev) => prev.map((n) => (n._id === saved._id ? saved : n)));
      showToast("Note updated.");
    } else {
      setNotes((prev) => [saved, ...prev]);
      showToast("Note added.");
    }
    setModal(null);
  }

  async function handleDelete() {
    if (!delNote) return;
    try {
      await api.delete(`/doctor/notes/${delNote._id}`);
      setNotes((prev) => prev.filter((n) => n._id !== delNote._id));
      showToast("Note deleted.");
    } catch {
      showToast("Failed to delete note.", "error");
    } finally {
      setDelNote(null);
    }
  }

  function clearFilters() {
    setSearch("");
    setFilter("all");
  }

  // Derived view — never mutates `notes`
  const filteredNotes = useMemo(() => {
    // Shallow copy so sort() below does not mutate the original array
    let result = [...notes];

    // Text search across patient name, patient ID, diagnosis
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((n) =>
        (n.patientName || "").toLowerCase().includes(q) ||
        (n.patientId   || "").toLowerCase().includes(q) ||
        (n.diagnosis   || "").toLowerCase().includes(q)
      );
    }

    // Sort / date filter
    const now = new Date();
    if (filter === "newest") {
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (filter === "oldest") {
      result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (filter === "today") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      result = result.filter((n) => new Date(n.createdAt) >= start);
    } else if (filter === "week") {
      const start = new Date(now);
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      result = result.filter((n) => new Date(n.createdAt) >= start);
    } else if (filter === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      result = result.filter((n) => new Date(n.createdAt) >= start);
    }

    return result;
  }, [notes, search, filter]);

  return (
    <>
      <section className="space-y-6">

        {/* ── Page heading ───────────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Medical Notes</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Your private clinical notes for patients.</p>
        </div>

        {/* ── Toolbar: Search + Filter + Add Note ────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search input with icon */}
          <div className="relative min-w-0 flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search by patient name, ID or diagnosis…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-300 bg-white pr-4 pl-11 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-mint/20 focus:border-mint"
            />
          </div>

          {/* Filter dropdown */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="field sm:w-44"
          >
            <option value="all">All Notes</option>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="today">Today&apos;s Notes</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>

          {/* Add Note */}
          <button onClick={() => setModal("add")} className="btn shrink-0 gap-2">
            <Plus size={16} /> Add Note
          </button>
        </div>

        {/* ── Error banner ──────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4">
            <AlertCircle size={18} className="shrink-0 text-red-500" />
            <p className="text-sm text-red-700">Failed to load notes.</p>
            <button
              onClick={fetchNotes}
              className="ml-auto text-sm font-medium text-red-600 hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Loading skeleton ──────────────────────────────────────────── */}
        {loading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
                <div className="mb-3 h-5 w-1/4 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
                <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
        )}

        {/* ── Empty state: no notes at all ─────────────────────────────── */}
        {!loading && !error && notes.length === 0 && (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-100 bg-white py-16 shadow-card">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">
              <ClipboardList size={32} className="text-slate-300" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-700">No notes yet.</p>
              <p className="mt-1 text-sm text-slate-400">Add your first clinical note for a patient.</p>
            </div>
            <button onClick={() => setModal("add")} className="btn mt-2 gap-2">
              <Plus size={14} /> Add Note
            </button>
          </div>
        )}

        {/* ── Empty state: search / filter returned no results ──────────── */}
        {!loading && !error && notes.length > 0 && filteredNotes.length === 0 && (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-100 bg-white py-16 shadow-card">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">
              <Search size={28} className="text-slate-300" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-700">No medical notes found.</p>
              <p className="mt-1 text-sm text-slate-400">
                Try adjusting your search or filter, or clear them to see all notes.
              </p>
            </div>
            <button onClick={clearFilters} className="btn-secondary mt-2">
              Clear Filters
            </button>
          </div>
        )}

        {/* ── Notes grid ───────────────────────────────────────────────── */}
        {!loading && !error && filteredNotes.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredNotes.map((n) => (
              <article
                key={n._id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-card-hover"
              >
                {/* Patient info */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{n.patientName}</p>
                    {n.patientId && (
                      <p className="text-xs text-slate-500">{n.patientId}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">{fmtDate(n.createdAt)}</span>
                </div>

                <div className="h-px bg-slate-100" />

                {/* Note fields */}
                <div className="space-y-2 text-sm">
                  {n.diagnosis && (
                    <div>
                      <p className="text-xs font-medium text-slate-400">Diagnosis</p>
                      <p className="mt-0.5 line-clamp-2 text-slate-700">{n.diagnosis}</p>
                    </div>
                  )}
                  {n.prescription && (
                    <div>
                      <p className="text-xs font-medium text-slate-400">Prescription</p>
                      <p className="mt-0.5 line-clamp-2 text-slate-700">{n.prescription}</p>
                    </div>
                  )}
                  {n.advice && (
                    <div>
                      <p className="text-xs font-medium text-slate-400">Advice</p>
                      <p className="mt-0.5 line-clamp-2 text-slate-700">{n.advice}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-auto flex gap-2 pt-2">
                  <button
                    onClick={() => setModal(n)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    <Edit2 size={13} /> Edit
                  </button>
                  <button
                    onClick={() => setDelNote(n)}
                    className="flex items-center justify-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

      </section>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {modal && (
        <NoteModal
          note={modal === "add" ? null : modal}
          patients={patients}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
      {delNote && (
        <DeleteDialog
          onConfirm={handleDelete}
          onCancel={() => setDelNote(null)}
        />
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
