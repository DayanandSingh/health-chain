import { ensureDrPrefix } from "../../utils/drName";
import {
  AlertCircle,
  Briefcase,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronDown,
  Copy,
  Edit2,
  Eye,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Phone,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  User,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

// ─── Constants ─────────────────────────────────────────────────────────────────
const AVATAR_GRADIENTS = [
  "from-blue-500 to-blue-600",
  "from-emerald-500 to-emerald-600",
  "from-purple-500 to-purple-600",
  "from-rose-500 to-rose-600",
  "from-amber-500 to-amber-600",
  "from-indigo-500 to-indigo-600",
  "from-teal-500 to-teal-600",
  "from-cyan-500 to-cyan-600",
];
const PHOTO_KEY = (uid) => `profilePhoto_${uid}`;
const MAX_PHOTO_BYTES  = 2 * 1024 * 1024;
const ACCEPTED_TYPES   = new Set(["image/jpeg", "image/jpg", "image/png"]);

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name) {
  return (name || "?").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}
function avatarGradient(name) {
  return AVATAR_GRADIENTS[(name || "?").charCodeAt(0) % AVATAR_GRADIENTS.length];
}
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}
function compressToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const MAX = 400;
        let w = img.naturalWidth, h = img.naturalHeight;
        if (w > h && w > MAX) { h = Math.round((h * MAX) / w); w = MAX; }
        else if (h > MAX)      { w = Math.round((w * MAX) / h); h = MAX; }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}
function validate(form) {
  const errs = {};
  if (!form.fullName?.trim())      errs.fullName = "Full name is required.";
  if (!form.email?.trim())         errs.email    = "Email is required.";
  else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errs.email = "Enter a valid email.";
  if (form.mobileNumber?.trim() && !/^\d{10}$/.test(form.mobileNumber.replace(/\D/g, "")))
    errs.mobileNumber = "Mobile number must be 10 digits.";
  return errs;
}

// ─── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[100]">
      <div className={`pointer-events-auto flex max-w-sm items-center gap-3 rounded-xl border px-4 py-3 shadow-lg ${
        toast.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"
      }`}>
        {toast.type === "success"
          ? <CheckCircle2 size={17} className="shrink-0 text-emerald-600" />
          : <AlertCircle  size={17} className="shrink-0 text-red-500"     />}
        <span className="text-sm font-medium">{toast.message}</span>
        <button onClick={onDismiss} className="ml-1 shrink-0 opacity-50 hover:opacity-100"><X size={14} /></button>
      </div>
    </div>
  );
}

// ─── Account Row ───────────────────────────────────────────────────────────────
function AccountRow({ label, value, mono = false }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-slate-50 px-3.5 py-3">
      <Lock size={13} className="mt-[3px] shrink-0 text-slate-300" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className={`mt-1 break-all text-sm font-semibold text-slate-800 ${mono ? "font-mono" : ""}`}>{value || "—"}</p>
      </div>
    </div>
  );
}

// ─── Field ─────────────────────────────────────────────────────────────────────
function Field({ label, error, children }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ─── Info Row (view mode) ──────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value, optional = false }) {
  const empty = !value || value === "—";
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="mt-0.5 shrink-0 text-slate-400"><Icon size={15} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-400">{label}</p>
        {empty && optional
          ? <p className="mt-0.5 text-sm italic text-slate-400">Not Provided</p>
          : <p className="mt-0.5 break-words text-sm font-medium text-slate-900">{value || "—"}</p>}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function DoctorProfile() {
  const { user: authUser, updateUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Photo
  const [photoUrl,      setPhotoUrl]      = useState(null);
  const [photoLoading,  setPhotoLoading]  = useState(false);
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const fileInputRef        = useRef(null);
  const menuRef             = useRef(null);
  const photoUploadAbortRef = useRef(null);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [form,    setForm]    = useState({});
  const [errs,    setErrs]    = useState({});
  const [saving,  setSaving]  = useState(false);

  // Wallet copy
  const [copied, setCopied] = useState(false);

  // Change password
  const [pwOpen, setPwOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" });
  const [pwErrs, setPwErrs] = useState({});

  // Toast
  const [toast, setToast] = useState(null);
  function showToast(msg, type = "success") {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 5000);
  }

  // Re-verification request
  const [rvConfirm, setRvConfirm] = useState(false);
  const [rvBusy,    setRvBusy]    = useState(false);
  const [rvDone,    setRvDone]    = useState(false);

  // ── Photo: load from localStorage + one-time server sync ────────────────────
  useEffect(() => {
    const uid = authUser?.id;
    if (!uid) return;
    const stored = localStorage.getItem(PHOTO_KEY(uid));
    if (!stored) return;
    setPhotoUrl(stored);
    // Sync to server once so Patient → Medical Notes can read it via the DB populate.
    const syncKey = `profilePhotoSynced_${uid}`;
    if (!localStorage.getItem(syncKey)) {
      const controller = new AbortController();
      photoUploadAbortRef.current = controller;
      api.put("/me/photo", { photo: stored }, { signal: controller.signal })
        .then(() => localStorage.setItem(syncKey, "1"))
        .catch(() => {});
    }
  }, [authUser?.id]);

  // ── Fallback: seed from server when localStorage is empty ────────────────────
  useEffect(() => {
    if (photoUrl) return;
    const serverPhoto = profile?.user?.profilePhoto;
    if (serverPhoto) setPhotoUrl(serverPhoto);
  }, [profile, photoUrl]);

  // ── Outside-click closes menu ────────────────────────────────────────────────
  useEffect(() => {
    if (!menuOpen) return;
    function onOut(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); }
    document.addEventListener("mousedown", onOut);
    return () => document.removeEventListener("mousedown", onOut);
  }, [menuOpen]);

  // ── ESC closes modal ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!viewModalOpen) return;
    function onEsc(e) { if (e.key === "Escape") setViewModalOpen(false); }
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [viewModalOpen]);

  // ── Fetch profile ────────────────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/doctor/profile");
      setProfile(data.data);
    } catch {
      setProfile({ user: authUser, doctor: null });
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // ── Photo upload ─────────────────────────────────────────────────────────────
  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (!ACCEPTED_TYPES.has(file.type)) { showToast("Only JPG, JPEG and PNG files are supported.", "error"); return; }
    if (file.size > MAX_PHOTO_BYTES)    { showToast("Photo must be smaller than 2 MB.", "error"); return; }
    // Cancel any in-flight sync or previous upload PUT so the latest selection wins.
    if (photoUploadAbortRef.current) {
      photoUploadAbortRef.current.abort();
    }
    const controller = new AbortController();
    photoUploadAbortRef.current = controller;

    setPhotoLoading(true);
    try {
      const base64 = await compressToBase64(file);
      if (controller.signal.aborted) return;
      setPhotoUrl(base64);
      const uid = authUser?.id;
      if (uid) {
        localStorage.setItem(PHOTO_KEY(uid), base64);
        localStorage.removeItem(`profilePhotoSynced_${uid}`);
      }
      // Persist to DB — this is what Patient → Medical Notes reads via getMyNotes populate.
      await api.put("/me/photo", { photo: base64 }, { signal: controller.signal });
      if (uid) localStorage.setItem(`profilePhotoSynced_${uid}`, "1");
      showToast("Profile photo updated.");
    } catch (err) {
      if (controller.signal.aborted) return;
      showToast("Unable to upload profile photo.", "error");
    } finally {
      if (!controller.signal.aborted) setPhotoLoading(false);
    }
  }

  // ── Edit ─────────────────────────────────────────────────────────────────────
  function startEdit() {
    const u = profile?.user || authUser || {};
    const d = profile?.doctor || {};
    setForm({
      fullName:       u.fullName      || "",
      email:          u.email         || "",
      mobileNumber:   u.mobileNumber  || "",
      specialization: d.specialization|| "",
      hospital:       d.hospital      || "",
    });
    setErrs({});
    setEditing(true);
  }

  function setField(k, v) { setForm((f) => ({ ...f, [k]: v })); if (errs[k]) setErrs((e) => ({ ...e, [k]: "" })); }

  function cancelEdit() {
    setEditing(false);
    setErrs({});
    setPwOpen(false);
    setPwForm({ current: "", newPw: "", confirm: "" });
    setPwErrs({});
  }

  async function handleSave(e) {
    e.preventDefault();
    const validation = validate(form);
    if (Object.keys(validation).length) { setErrs(validation); return; }

    const pwFilled = pwOpen && (pwForm.current || pwForm.newPw || pwForm.confirm);
    if (pwFilled) {
      const pe = {};
      if (!pwForm.current)                          pe.current = "Current password is required.";
      if (!pwForm.newPw || pwForm.newPw.length < 8) pe.newPw   = "Password must contain at least 8 characters.";
      if (pwForm.confirm !== pwForm.newPw)           pe.confirm = "Passwords do not match.";
      if (Object.keys(pe).length) { setPwErrs(pe); return; }
    }

    setSaving(true);
    try {
      const { data } = await api.put("/doctor/profile", {
        fullName:       form.fullName.trim(),
        email:          form.email.trim(),
        mobileNumber:   form.mobileNumber.trim(),
        specialization: form.specialization.trim(),
        hospital:       form.hospital.trim(),
      });
      updateUser({ fullName: data.data.fullName, email: data.data.email, mobileNumber: data.data.mobileNumber });
      setProfile((prev) => ({
        ...prev,
        user:   { ...prev?.user,   ...data.data },
        doctor: { ...prev?.doctor, name: data.data.fullName, specialization: form.specialization, hospital: form.hospital },
      }));

      if (pwFilled) {
        try {
          await api.put("/doctor/password", {
            currentPassword: pwForm.current,
            newPassword:     pwForm.newPw,
          });
        } catch (pwErr) {
          const pwMsg = pwErr.response?.data?.message || "Password update failed.";
          setPwErrs({ current: pwMsg });
          showToast(pwMsg, "error");
          return;
        }
      }

      setEditing(false);
      setPwOpen(false);
      setPwForm({ current: "", newPw: "", confirm: "" });
      setPwErrs({});
      showToast(pwFilled ? "Profile and password updated successfully." : "Profile updated successfully.");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to save.", "error");
    } finally {
      setSaving(false);
    }
  }

  // ── Copy wallet ───────────────────────────────────────────────────────────────
  function copyWallet() {
    const addr = profile?.user?.walletAddress || authUser?.walletAddress || "";
    if (!addr) return;
    navigator.clipboard.writeText(addr).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast("Wallet Address Copied!");
    }).catch(() => showToast("Could not copy.", "error"));
  }

  // ── Derived values ─────────────────────────────────────────────────────────────
  const displayUser   = profile?.user   || authUser || {};
  const displayDoctor = profile?.doctor || {};
  const fullName  = displayUser.fullName  || "—";
  const initials  = getInitials(fullName);
  const gradient  = avatarGradient(fullName);
  const wallet    = displayUser.walletAddress || "";

  const vStatus       = displayDoctor.verificationStatus          || "pending";
  const vReason       = displayDoctor.verificationReason          || null;
  const rejectionType = displayDoctor.rejectionType               || null;
  const rejectionReason = displayDoctor.rejectionReason           || null;
  const effectiveType = rejectionType || (vReason ? "revoked" : "initial");
  const rvRequested   = displayDoctor.reVerificationRequested     || rvDone;
  const rvDeclined    = displayDoctor.lastReverificationDeclined  || false;
  const activeReason  = vStatus === "rejected"
    ? (effectiveType === "revoked" ? vReason : rejectionReason)
    : null;
  const vBadge = vStatus === "verified"
    ? { label: "Verified Doctor",      cls: "border-emerald-200 bg-emerald-50 text-emerald-700" }
    : vStatus === "rejected" && effectiveType === "revoked"
    ? { label: "Verification Revoked", cls: "border-red-200 bg-red-50 text-red-700"             }
    : vStatus === "rejected"
    ? { label: "Verification Rejected",cls: "border-red-200 bg-red-50 text-red-700"             }
    : { label: "Pending Verification", cls: "border-amber-200 bg-amber-50 text-amber-700"       };

  async function handleRequestReverify() {
    setRvBusy(true);
    try {
      await api.post("/doctor/request-reverification");
      setRvDone(true);
      setRvConfirm(false);
      showToast("Re-verification request submitted successfully.");
    } catch (err) {
      setRvConfirm(false);
      showToast(err?.response?.data?.message || "Failed to submit request. Please try again.", "error");
    } finally {
      setRvBusy(false);
    }
  }

  // ── Skeleton ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <section className="space-y-6">
        <div className="h-7 w-32 animate-pulse rounded bg-slate-200" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="h-96 animate-pulse rounded-2xl bg-slate-100 lg:col-span-2" />
          <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Profile</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Manage your professional information and account details.</p>
        </div>

        {/* Main grid */}
        <div className="grid gap-6 lg:grid-cols-3">

          {/* ── Personal + Professional Information ──────────────────────── */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              {/* Card header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                    <User size={16} className="text-blue-600" />
                  </span>
                  <p className="font-semibold text-slate-900">Personal Information</p>
                </div>
                {!editing && (
                  <button onClick={startEdit} className="btn-secondary gap-1.5 px-3 py-1.5 text-xs">
                    <Edit2 size={13} /> Edit Profile
                  </button>
                )}
              </div>

              <div className="p-6">
                {/* Avatar + name */}
                <div className="mb-6 flex items-center gap-5">
                  <div ref={menuRef} className="relative shrink-0">
                    {/* Avatar button */}
                    <button
                      type="button"
                      onClick={() => setMenuOpen((p) => !p)}
                      disabled={photoLoading}
                      title="Profile photo options"
                      className="group relative block h-20 w-20 overflow-hidden rounded-full shadow-md ring-2 ring-slate-200 ring-offset-1 focus:outline-none focus:ring-blue-300 disabled:cursor-wait"
                    >
                      {photoUrl ? (
                        <img src={photoUrl} alt="Profile" className="h-full w-full object-cover" />
                      ) : (
                        <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient} text-xl font-bold text-white`}>
                          {initials}
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                        {photoLoading ? <Loader2 size={22} className="animate-spin text-white" /> : <Camera size={22} className="text-white" />}
                      </div>
                    </button>

                    {/* Camera badge */}
                    <button
                      type="button"
                      onClick={() => setMenuOpen((p) => !p)}
                      disabled={photoLoading}
                      className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-700 text-white shadow-md transition-all duration-200 hover:scale-110 hover:bg-slate-500 disabled:cursor-wait"
                    >
                      <Camera size={13} />
                    </button>

                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png" className="hidden" onChange={handlePhotoChange} />

                    {/* Dropdown */}
                    {menuOpen && (
                      <div className="absolute left-0 top-[calc(100%+8px)] z-30 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                        <button type="button" onClick={() => { setMenuOpen(false); setViewModalOpen(true); }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50"><Eye size={14} className="text-blue-600" /></span>
                          View Photo
                        </button>
                        <div className="mx-3 my-1 h-px bg-slate-100" />
                        <button type="button" onClick={() => { setMenuOpen(false); fileInputRef.current?.click(); }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50"><Camera size={14} className="text-emerald-600" /></span>
                          Change Photo
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Name + badge */}
                  <div className="min-w-0">
                    <p className="truncate text-xl font-bold text-slate-900">{ensureDrPrefix(fullName)}</p>
                    <p className="mt-0.5 text-sm text-slate-500">{displayDoctor.specialization || "Doctor"}</p>
                    <span className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${vBadge.cls}`}>
                      <ShieldCheck size={12} /> {vBadge.label}
                    </span>
                    <p className="mt-2 text-[11px] text-slate-400">Click photo to view or change it (JPG/PNG, max 2 MB)</p>
                  </div>
                </div>

                {/* ── View mode ─────────────────────────────────────── */}
                {!editing && (
                  <>
                    <div className="divide-y divide-slate-50">
                      <InfoRow icon={Mail}        label="Email Address"   value={displayUser.email} />
                      <InfoRow icon={Phone}       label="Mobile Number"   value={displayUser.mobileNumber} optional />
                      <InfoRow icon={Stethoscope} label="Specialization"  value={displayDoctor.specialization} optional />
                      <InfoRow icon={Briefcase}   label="Hospital / Clinic" value={displayDoctor.hospital} optional />
                      <InfoRow icon={KeyRound}    label="License Number"  value={displayDoctor.licenseNumber} />
                    </div>
                  </>
                )}

                {/* ── Edit mode ──────────────────────────────────────── */}
                {editing && (
                  <form onSubmit={handleSave} noValidate className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Full Name *" error={errs.fullName}>
                        <input className="field" value={form.fullName} onChange={(e) => setField("fullName", e.target.value)} />
                      </Field>
                      <Field label="Email Address *" error={errs.email}>
                        <input type="email" className="field" value={form.email} onChange={(e) => setField("email", e.target.value)} />
                      </Field>
                      <Field label="Mobile Number" error={errs.mobileNumber}>
                        <input type="tel" className="field" placeholder="10-digit number" value={form.mobileNumber} onChange={(e) => setField("mobileNumber", e.target.value)} />
                      </Field>
                      <Field label="Specialization">
                        <input className="field" placeholder="e.g. Cardiology" value={form.specialization} onChange={(e) => setField("specialization", e.target.value)} />
                      </Field>
                    </div>
                    <Field label="Hospital / Clinic">
                      <input className="field" placeholder="Hospital or clinic name" value={form.hospital} onChange={(e) => setField("hospital", e.target.value)} />
                    </Field>

                    {/* License number — read-only in edit mode */}
                    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3.5 py-3">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">License Number (read-only)</p>
                      <p className="mt-1 font-mono text-sm font-semibold text-slate-700">{displayDoctor.licenseNumber || "—"}</p>
                    </div>

                    {/* ── Change Password ──────────────────────── */}
                    <div className="rounded-lg border border-slate-200 bg-slate-50">
                      <button
                        type="button"
                        onClick={() => {
                          setPwOpen((o) => !o);
                          setPwForm({ current: "", newPw: "", confirm: "" });
                          setPwErrs({});
                        }}
                        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 hover:text-slate-900"
                      >
                        <span className="flex items-center gap-2">
                          <KeyRound size={14} className="text-slate-400" />
                          Change Password
                        </span>
                        <ChevronDown
                          size={15}
                          className={`text-slate-400 transition-transform duration-200 ${pwOpen ? "rotate-180" : ""}`}
                        />
                      </button>

                      <div className={`overflow-hidden transition-all duration-200 ${pwOpen ? "max-h-80" : "max-h-0"}`}>
                        <div className="space-y-3 border-t border-slate-200 px-4 pb-4 pt-3">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">Current Password</label>
                            <input
                              type="password"
                              className="field"
                              placeholder="Enter current password"
                              value={pwForm.current}
                              onChange={(e) => { setPwForm((f) => ({ ...f, current: e.target.value })); setPwErrs((er) => ({ ...er, current: "" })); }}
                              autoComplete="current-password"
                            />
                            {pwErrs.current && <p className="mt-1 text-xs text-red-600">{pwErrs.current}</p>}
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">New Password</label>
                            <input
                              type="password"
                              className="field"
                              placeholder="Minimum 8 characters"
                              value={pwForm.newPw}
                              onChange={(e) => { setPwForm((f) => ({ ...f, newPw: e.target.value })); setPwErrs((er) => ({ ...er, newPw: "" })); }}
                              autoComplete="new-password"
                            />
                            {pwErrs.newPw && <p className="mt-1 text-xs text-red-600">{pwErrs.newPw}</p>}
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">Confirm New Password</label>
                            <input
                              type="password"
                              className="field"
                              placeholder="Repeat new password"
                              value={pwForm.confirm}
                              onChange={(e) => { setPwForm((f) => ({ ...f, confirm: e.target.value })); setPwErrs((er) => ({ ...er, confirm: "" })); }}
                              autoComplete="new-password"
                            />
                            {pwErrs.confirm && <p className="mt-1 text-xs text-red-600">{pwErrs.confirm}</p>}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-1">
                      <button type="button" onClick={cancelEdit} disabled={saving} className="btn-secondary px-5 py-2">Cancel</button>
                      <button type="submit" disabled={saving} className="btn gap-2 px-5 py-2">
                        {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : "Save Changes"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* ── Account Information ──────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50">
                  <Lock size={15} className="text-slate-500" />
                </span>
                <p className="font-semibold text-slate-900">Account Information</p>
              </div>

              <div className="space-y-2 p-6">
                <AccountRow label="Doctor ID"       value={displayDoctor.doctorId}   mono />

                {/* Wallet with copy */}
                <div className="rounded-lg bg-slate-50 px-3.5 py-3">
                  <div className="flex items-start gap-3">
                    <Lock size={13} className="mt-[3px] shrink-0 text-slate-300" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Wallet Address</p>
                        <button
                          onClick={copyWallet}
                          className={`flex shrink-0 items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition ${
                            copied ? "bg-emerald-50 text-emerald-700" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                          }`}
                        >
                          {copied ? <><CheckCircle2 size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                        </button>
                      </div>
                      <p className="mt-1 break-all font-mono text-sm font-semibold text-slate-800">{wallet || "—"}</p>
                    </div>
                  </div>
                </div>

                <AccountRow label="Role" value="Doctor" />

                {/* Account status */}
                <div className="rounded-lg bg-slate-50 px-3.5 py-3">
                  <div className="flex items-start gap-3">
                    <Lock size={13} className="mt-[3px] shrink-0 text-slate-300" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Account Status</p>
                      <span className={`mt-1 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${vBadge.cls}`}>
                        <ShieldCheck size={11} /> {vBadge.label}
                      </span>
                      {vStatus === "rejected" && activeReason && (
                        <p className="mt-1 text-[11px] text-slate-400">Reason: {activeReason}</p>
                      )}
                      {vStatus === "rejected" && rvDeclined && !rvRequested && (
                        <div className="mt-1">
                          <p className="text-[11px] text-slate-400">
                            {effectiveType === "initial" ? "Latest Verification Request:" : "Latest Re-Verification Request:"}
                          </p>
                          <span className="mt-0.5 inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                            Declined
                          </span>
                        </div>
                      )}
                      {vStatus === "rejected" && !rvRequested && (
                        <button
                          onClick={() => setRvConfirm(true)}
                          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-100"
                        >
                          <RefreshCw size={11} />
                          {effectiveType === "initial" ? "Request Verification Again" : "Request Re-Verification"}
                        </button>
                      )}
                      {vStatus === "rejected" && rvRequested && (
                        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                          <RefreshCw size={11} />
                          {effectiveType === "initial" ? "Verification Requested" : "Re-Verification Requested"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <AccountRow label="Registration Date" value={fmtDate(displayUser.createdAt)} />
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ── View Photo Modal ────────────────────────────────────────────────── */}
      {viewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setViewModalOpen(false)}>
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setViewModalOpen(false)} className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm transition hover:bg-slate-100">
              <X size={16} />
            </button>
            <div className="flex flex-col items-center bg-gradient-to-br from-slate-100 to-slate-200 px-8 pb-6 pt-10">
              <div className="h-44 w-44 overflow-hidden rounded-full shadow-lg ring-4 ring-white">
                {photoUrl
                  ? <img src={photoUrl} alt="Profile" className="h-full w-full object-cover" />
                  : <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient} text-5xl font-bold text-white`}>{initials}</div>}
              </div>
            </div>
            <div className="px-6 pb-6 pt-4 text-center">
              <p className="text-lg font-bold text-slate-900">{ensureDrPrefix(fullName)}</p>
              <p className="mt-0.5 text-sm text-slate-500">{displayDoctor.specialization || "Doctor"}</p>
              <button
                onClick={() => { setViewModalOpen(false); setTimeout(() => fileInputRef.current?.click(), 50); }}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                <Camera size={14} /> Change Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Re-Verification Confirmation Dialog ────────────────────────────── */}
      {rvConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => { if (!rvBusy) setRvConfirm(false); }} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="font-semibold text-slate-900">
              {effectiveType === "initial" ? "Request Verification Again" : "Request Re-Verification"}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              {effectiveType === "initial"
                ? "Are you sure you want to submit a new verification request? Your request will be sent to the system administrator for review."
                : "Are you sure you want to submit your account for re-verification? Your request will be sent to the system administrator for review."}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setRvConfirm(false)}
                disabled={rvBusy}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestReverify}
                disabled={rvBusy}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
              >
                {rvBusy ? <><Loader2 size={14} className="animate-spin" /> Submitting…</> : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
