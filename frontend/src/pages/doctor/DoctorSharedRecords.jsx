import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ensureDrPrefix } from "../../utils/drName";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
import {
  AlertCircle,
  Calendar,
  ChevronDown,
  Download,
  Eye,
  FileText,
  Hospital,
  Loader2,
  RefreshCw,
  Search,
  User,
  X,
} from "lucide-react";
import api from "../../services/api";

const RECORD_TYPES = ["All Types", "Prescription", "Blood Test", "X-Ray", "MRI", "CT Scan", "Vaccination", "Other"];

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const TYPE_COLORS = {
  Prescription: "border-blue-200 bg-blue-50 text-blue-700",
  "Blood Test":  "border-rose-200 bg-rose-50 text-rose-700",
  "X-Ray":       "border-amber-200 bg-amber-50 text-amber-700",
  MRI:           "border-purple-200 bg-purple-50 text-purple-700",
  "CT Scan":     "border-indigo-200 bg-indigo-50 text-indigo-700",
  Vaccination:   "border-emerald-200 bg-emerald-50 text-emerald-700",
  Other:         "border-slate-200 bg-slate-50 text-slate-700",
};

function Skeleton() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
      <div className="space-y-3">
        <div className="h-5 w-1/2 animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
        <div className="mt-4 h-8 animate-pulse rounded-lg bg-slate-100" />
      </div>
    </div>
  );
}

// View record details modal
function ViewModal({ record, onClose }) {
  useEffect(() => {
    function onEsc(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="font-bold text-slate-900">{record.title || record.diagnosis || "Medical Record"}</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
          >
            <X size={15} />
          </button>
        </div>
        <div className="space-y-4 p-6">
          {record.recordType && (
            <div>
              <p className="text-xs text-slate-400">Record Type</p>
              <span className={`mt-1 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TYPE_COLORS[record.recordType] || TYPE_COLORS.Other}`}>
                {record.recordType}
              </span>
            </div>
          )}
          {record.patient && (
            <div>
              <p className="text-xs text-slate-400">Patient</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-800">{record.patient.name || "—"}</p>
            </div>
          )}
          {record.hospitalName && (
            <div>
              <p className="text-xs text-slate-400">Hospital / Clinic</p>
              <p className="mt-0.5 text-sm font-medium text-slate-700">{record.hospitalName}</p>
            </div>
          )}
          {record.doctorName && (
            <div>
              <p className="text-xs text-slate-400">Treating Doctor</p>
              <p className="mt-0.5 text-sm font-medium text-slate-700">{ensureDrPrefix(record.doctorName)}</p>
            </div>
          )}
          {record.visitDate && (
            <div>
              <p className="text-xs text-slate-400">Visit Date</p>
              <p className="mt-0.5 text-sm font-medium text-slate-700">{fmtDate(record.visitDate)}</p>
            </div>
          )}
          {record.diagnosis && record.title !== record.diagnosis && (
            <div>
              <p className="text-xs text-slate-400">Diagnosis / Notes</p>
              <p className="mt-0.5 text-sm text-slate-700">{record.diagnosis}</p>
            </div>
          )}
          {record.prescription && (
            <div>
              <p className="text-xs text-slate-400">Prescription / Description</p>
              <p className="mt-0.5 text-sm text-slate-700">{record.prescription}</p>
            </div>
          )}
          {record.attachments?.length > 0 && (
            <div>
              <p className="mb-2 text-xs text-slate-400">Attachments ({record.attachments.length})</p>
              <div className="space-y-1.5">
                {record.attachments.map((att) => (
                  <div key={att.cid} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                    <span className="truncate font-medium text-slate-700">{att.fileName}</span>
                    <div className="ml-3 flex shrink-0 items-center gap-1.5">
                      <PreviewBtn recordId={record._id} att={att} canDownload={record.permission?.accessLevel === "view_download"} />
                      {record.permission?.accessLevel === "view_download" && (
                        <DownloadBtn recordId={record._id} att={att} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {record.permission?.expiresAt && (
            <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Access expires: {fmtDate(record.permission.expiresAt)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewBtn({ recordId, att, canDownload }) {
  const [loading,     setLoading]     = useState(false);
  const [previewData, setPreviewData] = useState(null); // { data: ArrayBuffer, mimeType, fileName }

  async function handlePreview() {
    if (att.cid?.startsWith("mock-ipfs-")) {
      alert("This file is not available for preview.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/doctor/shared-records/${recordId}/preview/${att.cid}`, {
        responseType: "arraybuffer",
      });
      setPreviewData({
        data:        res.data,
        mimeType:    res.headers["content-type"] || "application/octet-stream",
        fileName:    att.fileName || att.cid,
        canDownload: canDownload,   // capture permission at click time
      });
    } catch {
      alert("Preview unavailable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={handlePreview}
        disabled={loading}
        className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
      >
        {loading ? <Loader2 size={11} className="animate-spin" /> : <Eye size={11} />}
        Preview
      </button>
      {previewData && (
        <FilePreviewModal
          data={previewData.data}
          mimeType={previewData.mimeType}
          fileName={previewData.fileName}
          canDownload={previewData.canDownload}
          recordId={recordId}
          att={att}
          onClose={() => setPreviewData(null)}
        />
      )}
    </>
  );
}

function DownloadBtn({ recordId, att }) {
  const [dl, setDl] = useState(false);

  async function handleDownload() {
    if (att.cid?.startsWith("mock-ipfs-")) {
      alert("This file was uploaded before download storage was enabled.");
      return;
    }
    setDl(true);
    try {
      const res = await api.get(`/doctor/shared-records/${recordId}/download/${att.cid}`, {
        responseType: "blob",
      });
      const url  = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href  = url;
      link.download = att.fileName || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      let msg = "Download failed.";
      try {
        const text = await err.response?.data?.text?.();
        const body = JSON.parse(text || "{}");
        msg = body.message || msg;
      } catch {}
      alert(msg);
    } finally {
      setDl(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={dl}
      className="ml-3 flex shrink-0 items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
    >
      {dl ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
      Download
    </button>
  );
}

// ─── PDF.js single-page renderer ──────────────────────────────────────────────
function PdfPage({ pdfDoc, pageNum }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let renderTask = null;
    let cancelled  = false;

    pdfDoc.getPage(pageNum).then((page) => {
      if (cancelled || !canvasRef.current) return;
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas   = canvasRef.current;
      canvas.width   = viewport.width;
      canvas.height  = viewport.height;
      renderTask = page.render({ canvasContext: canvas.getContext("2d"), viewport });
    });

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pdfDoc, pageNum]);

  return <canvas ref={canvasRef} className="mx-auto mb-4 block max-w-full shadow-lg" />;
}

// ─── In-app file preview modal (PDF or image) ─────────────────────────────────
function FilePreviewModal({ data, mimeType, fileName, canDownload, recordId, att, onClose }) {
  const [pdfDoc,    setPdfDoc]    = useState(null);
  const [numPages,  setNumPages]  = useState(0);
  const [pdfErr,    setPdfErr]    = useState(false);
  const isPdf = mimeType.includes("pdf");

  // Load PDF document; cancel the loading task and release the resolved proxy on cleanup
  useEffect(() => {
    if (!isPdf) return;
    let resolvedDoc = null;
    // slice(0) copies the ArrayBuffer so PDF.js can transfer the copy to the worker
    // without detaching the original — critical because React 18 Strict Mode
    // double-invokes effects and the second call would fail on a detached buffer.
    const task = getDocument({ data: data.slice(0) });
    task.promise
      .then((doc) => {
        resolvedDoc = doc;
        setPdfErr(false); // clear any error from a previous cancelled attempt
        setPdfDoc(doc);
        setNumPages(doc.numPages);
      })
      .catch((err) => {
        // "Loading aborted" is thrown when task.destroy() is called in cleanup
        // (e.g. React StrictMode unmount). It is not a real failure — ignore it.
        if (err?.message === "Loading aborted") return;
        setPdfErr(true);
      });

    return () => {
      task.destroy();          // cancels in-flight load (PDFDocumentLoadingTask.destroy)
      resolvedDoc?.cleanup();  // releases cached resources on the proxy (PDFDocumentProxy.cleanup)
    };
  }, [data, isPdf]);

  // ESC closes modal
  useEffect(() => {
    function onEsc(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  // Blob URL for images (not PDFs)
  const imgUrl = useMemo(() => {
    if (isPdf) return null;
    return URL.createObjectURL(new Blob([data], { type: mimeType }));
  }, [data, mimeType, isPdf]);
  useEffect(() => () => { if (imgUrl) URL.revokeObjectURL(imgUrl); }, [imgUrl]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" onClick={onClose}>
      {/* Header bar */}
      <div
        className="flex shrink-0 items-center justify-between gap-3 bg-slate-900 px-5 py-3"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="truncate text-sm font-medium text-slate-200">{fileName}</span>
        <div className="flex shrink-0 items-center gap-3">
          {numPages > 0 && (
            <span className="text-xs text-slate-400">{numPages} page{numPages !== 1 ? "s" : ""}</span>
          )}
          {canDownload && <DownloadBtn recordId={recordId} att={att} />}
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-700 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Scrollable PDF / image content */}
      <div
        className="flex-1 overflow-auto bg-slate-700 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {isPdf && pdfErr && (
          <div className="flex h-full items-center justify-center text-slate-300">
            <p>Unable to load PDF preview.</p>
          </div>
        )}
        {isPdf && !pdfErr && !pdfDoc && (
          <div className="flex h-full items-center justify-center">
            <Loader2 size={32} className="animate-spin text-slate-300" />
          </div>
        )}
        {isPdf && pdfDoc &&
          Array.from({ length: numPages }, (_, i) => i + 1).map((n) => (
            <PdfPage key={n} pdfDoc={pdfDoc} pageNum={n} />
          ))
        }
        {!isPdf && imgUrl && (
          <img src={imgUrl} alt={fileName} className="mx-auto max-w-full object-contain" />
        )}
      </div>
    </div>
  );
}

export default function DoctorSharedRecords() {
  const [records,  setRecords]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(false);
  const [search,   setSearch]   = useState("");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [viewing,  setViewing]  = useState(null);
  const searchTimer = useRef(null);

  const fetchRecords = useCallback((q = "", t = "All Types") => {
    setLoading(true);
    setError(false);
    const params = {};
    if (q.trim()) params.search = q.trim();
    if (t !== "All Types") params.type = t;
    api.get("/doctor/shared-records", { params })
      .then((res) => setRecords(res.data.data || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  function handleSearch(val) {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchRecords(val, typeFilter), 300);
  }

  function handleType(t) {
    setTypeFilter(t);
    fetchRecords(search, t);
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Shared Records</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Medical records shared with you by patients.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={15} className="absolute inset-y-0 left-3 my-auto text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, diagnosis or hospital…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="field !pl-9"
          />
        </div>
        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => handleType(e.target.value)}
            className="field appearance-none pr-8"
          >
            {RECORD_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute inset-y-0 right-2.5 my-auto text-slate-400" />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4">
          <AlertCircle size={18} className="shrink-0 text-red-500" />
          <p className="text-sm text-red-700">Failed to load records.</p>
          <button onClick={() => fetchRecords(search, typeFilter)} className="ml-auto text-sm font-medium text-red-600 hover:underline">
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0,1,2,3,4,5].map((i) => <Skeleton key={i} />)}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && records.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-100 bg-white py-16 shadow-card">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">
            <FileText size={32} className="text-slate-300" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-slate-700">No shared records found.</p>
            <p className="mt-1 text-sm text-slate-400">
              {search || typeFilter !== "All Types"
                ? "Try adjusting your search or filter."
                : "Records shared by your patients will appear here."}
            </p>
          </div>
        </div>
      )}

      {/* Records grid */}
      {!loading && !error && records.length > 0 && (
        <>
          <p className="text-sm text-slate-500 dark:text-slate-300">{records.length} record{records.length !== 1 ? "s" : ""} found</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {records.map((r) => {
              const typeColor = TYPE_COLORS[r.recordType] || TYPE_COLORS.Other;
              const now = new Date();
              const permExpiry = r.permission?.expiresAt ? new Date(r.permission.expiresAt) : null;
              const expiringSoon = permExpiry && permExpiry > now && (permExpiry - now) / 86400000 < 7;
              const hasAtt = r.attachments?.length > 0;

              return (
                <article
                  key={r._id}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-card-hover"
                >
                  {/* Record type badge + title */}
                  <div>
                    {r.recordType && (
                      <span className={`mb-2 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${typeColor}`}>
                        {r.recordType}
                      </span>
                    )}
                    <h3 className="font-semibold text-slate-900">{r.title || r.diagnosis || "Medical Record"}</h3>
                  </div>

                  {/* Meta rows */}
                  <div className="space-y-1.5 text-xs text-slate-500">
                    {r.patient && (
                      <div className="flex items-center gap-1.5">
                        <User size={11} className="shrink-0" />
                        <span className="truncate">{r.patient.name} · {r.patient.patientId}</span>
                      </div>
                    )}
                    {r.hospitalName && (
                      <div className="flex items-center gap-1.5">
                        <Hospital size={11} className="shrink-0" />
                        <span className="truncate">{r.hospitalName}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Calendar size={11} className="shrink-0" />
                      <span>{r.visitDate ? fmtDate(r.visitDate) : fmtDate(r.createdAt)}</span>
                    </div>
                    {permExpiry && (
                      <div className={`flex items-center gap-1.5 ${expiringSoon ? "text-amber-600" : ""}`}>
                        <RefreshCw size={11} className="shrink-0" />
                        <span>Access expires {fmtDate(r.permission.expiresAt)}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-auto flex gap-2">
                    <button
                      onClick={() => {
                        api.post(`/doctor/shared-records/${r._id}/view`).catch(() => {});
                        setViewing(r);
                      }}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      <Eye size={14} /> View
                    </button>
                    {hasAtt && r.permission?.accessLevel === "view_download" && r.attachments.slice(0, 1).map((att) => (
                      <DownloadBtn key={att.cid} recordId={r._id} att={att} />
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {/* View modal */}
      {viewing && <ViewModal record={viewing} onClose={() => setViewing(null)} />}
    </section>
  );
}
