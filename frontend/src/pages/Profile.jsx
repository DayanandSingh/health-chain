import {
  AlertCircle,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Copy,
  Edit2,
  Eye,
  FileText,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { ADMIN_ID } from "../constants/adminConstants";

// ─── Constants ────────────────────────────────────────────────────────────────
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const GENDER_OPTIONS = [
  { value: "male",              label: "Male"              },
  { value: "female",            label: "Female"            },
  { value: "other",             label: "Other"             },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

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
const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2 MB
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png"]);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function avatarGradient(name) {
  const code = (name || "?").charCodeAt(0);
  return AVATAR_GRADIENTS[code % AVATAR_GRADIENTS.length];
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function isoToDateInput(iso) {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function labelGender(val) {
  return GENDER_OPTIONS.find((o) => o.value === val)?.label || "";
}

// Compress an image file to a small base64 JPEG (max dimension 400px).
function compressToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const MAX = 400;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > h && w > MAX) { h = Math.round((h * MAX) / w); w = MAX; }
        else if (h > MAX)     { w = Math.round((w * MAX) / h); h = MAX; }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ─── Validation ───────────────────────────────────────────────────────────────
function validate(form) {
  const errs = {};
  if (!form.fullName?.trim())    errs.fullName = "Full name is required.";
  if (!form.email?.trim())       errs.email    = "Email is required.";
  else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errs.email = "Enter a valid email address.";
  if (form.mobileNumber?.trim() && !/^\d{10}$/.test(form.mobileNumber.replace(/\D/g, "")))
    errs.mobileNumber = "Mobile number must be 10 digits.";
  if (form.dob) {
    const d = new Date(form.dob);
    if (!isNaN(d.getTime()) && d > new Date()) errs.dob = "Date of birth cannot be in the future.";
  }
  if (form.address && form.address.length > 250)
    errs.address = `Address is too long (${form.address.length}/250 characters).`;
  return errs;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[100]">
      <div
        className={`pointer-events-auto flex max-w-sm items-center gap-3 rounded-xl border px-4 py-3 shadow-lg ${
          toast.type === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-red-200 bg-red-50 text-red-800"
        }`}
      >
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

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, colorClass, bgClass, onClick }) {
  const clickable = Boolean(onClick);
  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={clickable ? `${label}: ${value}` : undefined}
      onClick={onClick}
      onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      className={`group flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-md${clickable ? " cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" : ""}`}
    >
      <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 ${bgClass}`}>
        <Icon size={20} className={colorClass} />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="mt-0.5 truncate text-lg font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

// ─── Info Row (view mode) ─────────────────────────────────────────────────────
// Pass optional={true} for fields that may not yet be filled (DOB, address, etc.)
function InfoRow({ icon: Icon, label, value, optional = false }) {
  const empty = !value || value === "—";
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="mt-0.5 shrink-0 text-slate-400">
        <Icon size={15} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-400">{label}</p>
        {empty && optional
          ? <p className="mt-0.5 text-sm italic text-slate-400">Not Provided</p>
          : <p className="mt-0.5 break-words text-sm font-medium text-slate-900">{value || "—"}</p>}
      </div>
    </div>
  );
}

// ─── Read-only Account Row ────────────────────────────────────────────────────
function AccountRow({ label, value, mono = false }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-slate-50 px-3.5 py-3">
      <Lock size={13} className="mt-[3px] shrink-0 text-slate-300" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className={`mt-1 break-all text-sm font-semibold text-slate-800 ${mono ? "font-mono" : ""}`}>
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

// ─── Form Field ───────────────────────────────────────────────────────────────
function Field({ label, error, children }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Profile() {
  const { user: authUser, updateUser } = useAuth();
  const navigate = useNavigate();

  // Remote data
  const [profile, setProfile] = useState(null);
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  // Profile photo
  const [photoUrl,     setPhotoUrl]     = useState(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const fileInputRef        = useRef(null);
  const photoUploadAbortRef = useRef(null);

  // Photo context menu + view modal
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const menuRef = useRef(null);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [form,    setForm]    = useState({});
  const [errs,    setErrs]    = useState({});
  const [saving,  setSaving]  = useState(false);

  // Wallet copy
  const [copied, setCopied] = useState(false);

  // Change password (admin edit mode)
  const [pwOpen, setPwOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" });
  const [pwErrs, setPwErrs] = useState({});

  // Admin last login (fetched from audit log)
  const [lastLoginTs, setLastLoginTs] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);
  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }

  // ── Load saved photo from localStorage ────────────────────────────────────
  useEffect(() => {
    const uid = authUser?.id;
    if (!uid) return;
    const stored = localStorage.getItem(PHOTO_KEY(uid));
    if (stored) {
      setPhotoUrl(stored);
      // One-time sync to server so doctors can see this photo; flag avoids repeat uploads.
      const syncKey = `profilePhotoSynced_${uid}`;
      if (!localStorage.getItem(syncKey)) {
        const controller = new AbortController();
        photoUploadAbortRef.current = controller;
        api.put("/me/photo", { photo: stored }, { signal: controller.signal })
          .then(() => localStorage.setItem(syncKey, "1"))
          .catch(() => {});
      }
    }
  }, [authUser?.id]);

  // ── Fallback: seed from server when localStorage is empty ─────────────────
  // Runs after fetchProfile resolves. If localStorage already set photoUrl,
  // returns immediately. Otherwise uses the profilePhoto from the API response,
  // which survives browser restarts and cross-device sessions.
  useEffect(() => {
    if (photoUrl) return;
    const serverPhoto = profile?.user?.profilePhoto;
    if (serverPhoto) setPhotoUrl(serverPhoto);
  }, [profile, photoUrl]);

  // ── Close photo menu on outside click ─────────────────────────────────────
  useEffect(() => {
    if (!menuOpen) return;
    function onOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [menuOpen]);

  // ── Close view modal on ESC ────────────────────────────────────────────────
  useEffect(() => {
    if (!viewModalOpen) return;
    function onEsc(e) {
      if (e.key === "Escape") setViewModalOpen(false);
    }
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [viewModalOpen]);

  // ── Fetch profile + stats ─────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, dashRes] = await Promise.all([
        api.get("/my-patient-profile"),
        api.get("/patient-dashboard"),
      ]);
      setProfile(profileRes.data.data);
      setStats(dashRes.data.data);
    } catch {
      setProfile({ user: authUser, patient: null });
      setStats({ totalRecords: 0, activePermissions: 0, sharedDoctors: 0 });
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // ── Fetch last login from audit log (admins only) ─────────────────────────
  useEffect(() => {
    if (!authUser) return;
    const adminRoles = ["admin", "system_admin", "hospital_admin"];
    if (!adminRoles.includes(authUser.role)) return;
    api.get("/audit-log?action=LOGIN&limit=1")
      .then((res) => {
        const entry = res.data?.data?.[0];
        if (entry?.createdAt) setLastLoginTs(entry.createdAt);
      })
      .catch(() => {});
  }, [authUser]);

  // ── Photo upload handler ──────────────────────────────────────────────────
  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-selected
    e.target.value = "";

    if (!ACCEPTED_TYPES.has(file.type)) {
      showToast("Only JPG, JPEG and PNG files are supported.", "error");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      showToast("Photo must be smaller than 2 MB.", "error");
      return;
    }

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

  // ── Edit helpers ──────────────────────────────────────────────────────────
  function startEdit() {
    const u = profile?.user || authUser || {};
    const p = profile?.patient || {};
    setForm({
      fullName:     u.fullName     || "",
      email:        u.email        || "",
      mobileNumber: u.mobileNumber || "",
      dob:          isoToDateInput(p.dob),
      gender:       p.gender       || "",
      bloodGroup:   p.bloodGroup   || "",
      address:      p.address      || "",
    });
    setErrs({});
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setErrs({});
    setPwOpen(false);
    setPwForm({ current: "", newPw: "", confirm: "" });
    setPwErrs({});
  }

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errs[key]) setErrs((e) => ({ ...e, [key]: "" }));
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave(e) {
    e.preventDefault();
    const validation = validate(form);
    if (Object.keys(validation).length) { setErrs(validation); return; }

    // Determine if the password section has any input
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
      const endpoint = isAdmin ? "/my-admin-profile" : "/my-patient-profile";
      const payload = isAdmin
        ? {
            fullName:     form.fullName.trim(),
            email:        form.email.trim(),
            mobileNumber: form.mobileNumber.trim(),
          }
        : {
            fullName:     form.fullName.trim(),
            email:        form.email.trim(),
            mobileNumber: form.mobileNumber.trim(),
            dob:          form.dob    || null,
            gender:       form.gender || undefined,
            bloodGroup:   form.bloodGroup,
            address:      form.address,
          };
      const { data } = await api.put(endpoint, payload);

      updateUser({
        fullName:     data.data.fullName,
        email:        data.data.email,
        mobileNumber: data.data.mobileNumber,
      });

      setProfile((prev) => ({
        ...prev,
        user: { ...prev?.user, ...data.data },
        patient: {
          ...prev?.patient,
          name:       form.fullName.trim(),
          dob:        form.dob ? new Date(form.dob).toISOString() : null,
          gender:     form.gender,
          bloodGroup: form.bloodGroup,
          address:    form.address,
        },
      }));

      if (pwFilled) {
        try {
          await api.put(isAdmin ? "/my-admin-password" : "/my-patient-password", {
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
      const msg = err.response?.data?.message;
      showToast(msg || "Failed to save. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  // ── Copy wallet ───────────────────────────────────────────────────────────
  function copyWallet() {
    const addr = profile?.user?.walletAddress || authUser?.walletAddress || "";
    if (!addr) return;
    navigator.clipboard.writeText(addr)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        showToast("Wallet Address Copied!");
      })
      .catch(() => showToast("Could not copy to clipboard.", "error"));
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const displayUser    = profile?.user    || authUser || {};
  const displayPatient = profile?.patient || {};
  const fullName  = displayUser.fullName    || "—";
  const initials  = getInitials(fullName);
  const gradient  = avatarGradient(fullName);
  const patientId = displayPatient.patientId || "—";
  const wallet    = displayUser.walletAddress || "";
  const isAdmin   = ["admin", "system_admin", "hospital_admin"].includes(displayUser.role);
  const role      = isAdmin ? "Administrator" : (displayUser.role || "patient").replace(/_/g, " ");

  // ── Skeleton ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <section className="space-y-6">
        <div>
          <div className="h-7 w-32 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-4 w-56 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
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
        {/* ── Page header ─────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Profile</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
            Manage your personal information and account details.
          </p>
        </div>

        {/* ── Main grid ───────────────────────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-3">

          {/* ── Personal Information ─────────────────────────────── */}
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
                  <button
                    onClick={startEdit}
                    className="btn-secondary gap-1.5 px-3 py-1.5 text-xs"
                  >
                    <Edit2 size={13} /> Edit Profile
                  </button>
                )}
              </div>

              {/* Card body */}
              <div className="p-6">
                {/* ── Avatar + name ─────────────────────────────── */}
                <div className="mb-6 flex items-center gap-5">
                  {/* Avatar with context menu */}
                  <div ref={menuRef} className="relative shrink-0">

                    {/* Avatar circle — click opens menu, NOT file picker directly */}
                    <button
                      type="button"
                      onClick={() => setMenuOpen((prev) => !prev)}
                      disabled={photoLoading}
                      title="Profile photo options"
                      className="group relative block h-20 w-20 overflow-hidden rounded-full shadow-md ring-2 ring-slate-200 ring-offset-1 focus:outline-none focus:ring-blue-300 disabled:cursor-wait"
                    >
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt="Profile"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div
                          className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient} text-xl font-bold text-white`}
                        >
                          {initials}
                        </div>
                      )}
                      {/* Hover overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                        {photoLoading
                          ? <Loader2 size={22} className="animate-spin text-white" />
                          : <Camera size={22} className="text-white" />}
                      </div>
                    </button>

                    {/* Camera badge — also opens menu */}
                    <button
                      type="button"
                      onClick={() => setMenuOpen((prev) => !prev)}
                      disabled={photoLoading}
                      title="Photo options"
                      className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-700 text-white shadow-md transition-all duration-200 hover:scale-110 hover:bg-slate-500 disabled:cursor-wait"
                    >
                      <Camera size={13} />
                    </button>

                    {/* Hidden file input — unchanged, triggered only via "Change Photo" */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      className="hidden"
                      onChange={handlePhotoChange}
                    />

                    {/* ── Photo context dropdown ─────────────────────── */}
                    {menuOpen && (
                      <div className="absolute left-0 top-[calc(100%+8px)] z-30 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                        {/* View Photo */}
                        <button
                          type="button"
                          onClick={() => { setMenuOpen(false); setViewModalOpen(true); }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                            <Eye size={14} className="text-blue-600" />
                          </span>
                          View Photo
                        </button>

                        <div className="mx-3 my-1 h-px bg-slate-100" />

                        {/* Change Photo — only this triggers the file picker */}
                        <button
                          type="button"
                          onClick={() => { setMenuOpen(false); fileInputRef.current?.click(); }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                            <Camera size={14} className="text-emerald-600" />
                          </span>
                          Change Photo
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Name + role + badge */}
                  <div className="min-w-0">
                    <p className="truncate text-xl font-bold text-slate-900">{fullName}</p>
                    <p className="mt-0.5 text-sm capitalize text-slate-500">{role}</p>
                    {displayUser.isActive && (
                      <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        <ShieldCheck size={12} /> Account Active
                      </span>
                    )}
                    <p className="mt-2 text-[11px] text-slate-400">
                      Click photo to view or change it (JPG/PNG, max 2 MB)
                    </p>
                  </div>
                </div>

                {/* ── View mode ────────────────────────────────── */}
                {!editing && (
                  <div className="divide-y divide-slate-50">
                    <InfoRow icon={Mail}  label="Email Address" value={displayUser.email} />
                    <InfoRow icon={Phone} label="Mobile Number" value={displayUser.mobileNumber} />
                    {!isAdmin && (
                      <>
                        <InfoRow icon={Calendar} label="Date of Birth" value={fmtDate(displayPatient.dob)} optional />

                        {/* Gender */}
                        <div className="flex items-start gap-3 py-2">
                          <span className="mt-0.5 shrink-0 text-slate-400"><User size={15} /></span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-slate-400">Gender</p>
                            {displayPatient.gender
                              ? <p className="mt-0.5 text-sm font-medium capitalize text-slate-900">{labelGender(displayPatient.gender)}</p>
                              : <p className="mt-0.5 text-sm italic text-slate-400">Not Provided</p>}
                          </div>
                        </div>

                        {/* Blood Group */}
                        <div className="flex items-start gap-3 py-2">
                          <span className="mt-0.5 shrink-0 text-slate-400"><ShieldCheck size={15} /></span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-slate-400">Blood Group</p>
                            {displayPatient.bloodGroup
                              ? <p className="mt-0.5 text-sm font-medium text-slate-900">{displayPatient.bloodGroup}</p>
                              : <p className="mt-0.5 text-sm italic text-slate-400">Not Provided</p>}
                          </div>
                        </div>

                        <InfoRow icon={MapPin} label="Address" value={displayPatient.address} optional />
                      </>
                    )}
                  </div>
                )}

                {/* ── Edit mode ─────────────────────────────────── */}
                {editing && (
                  <form onSubmit={handleSave} noValidate className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Full Name *" error={errs.fullName}>
                        <input
                          className="field"
                          value={form.fullName}
                          onChange={(e) => setField("fullName", e.target.value)}
                        />
                      </Field>
                      <Field label="Email Address *" error={errs.email}>
                        <input
                          type="email"
                          className="field"
                          value={form.email}
                          onChange={(e) => setField("email", e.target.value)}
                        />
                      </Field>
                      <div className={isAdmin ? "sm:col-span-2" : ""}>
                        <Field label="Mobile Number" error={errs.mobileNumber}>
                          <input
                            type="tel"
                            className="field"
                            placeholder="10-digit number"
                            value={form.mobileNumber}
                            onChange={(e) => setField("mobileNumber", e.target.value)}
                          />
                        </Field>
                      </div>
                      {!isAdmin && (
                        <>
                          <Field label="Date of Birth" error={errs.dob}>
                            <input
                              type="date"
                              className="field"
                              max={todayISO()}
                              value={form.dob}
                              onChange={(e) => setField("dob", e.target.value)}
                            />
                          </Field>
                          <Field label="Gender">
                            <select
                              className="field"
                              value={form.gender}
                              onChange={(e) => setField("gender", e.target.value)}
                            >
                              <option value="">Select gender</option>
                              {GENDER_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Blood Group">
                            <select
                              className="field"
                              value={form.bloodGroup}
                              onChange={(e) => setField("bloodGroup", e.target.value)}
                            >
                              <option value="">Select blood group</option>
                              {BLOOD_GROUPS.map((bg) => (
                                <option key={bg} value={bg}>{bg}</option>
                              ))}
                            </select>
                          </Field>
                        </>
                      )}
                    </div>

                    {!isAdmin && (
                      <Field label="Address" error={errs.address}>
                        <textarea
                          className="field resize-none"
                          rows={3}
                          maxLength={250}
                          placeholder="Enter your address"
                          value={form.address}
                          onChange={(e) => setField("address", e.target.value)}
                        />
                        <p className="mt-0.5 text-right text-xs text-slate-400">
                          {form.address?.length || 0}/250
                        </p>
                      </Field>
                    )}

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
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={saving}
                        className="btn-secondary px-5 py-2 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button type="submit" disabled={saving} className="btn gap-2 px-5 py-2">
                        {saving
                          ? <><Loader2 size={15} className="animate-spin" /> Saving…</>
                          : "Save Changes"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* ── Account Information ──────────────────────────────── */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50">
                  <Lock size={15} className="text-slate-500" />
                </span>
                <p className="font-semibold text-slate-900">Account Information</p>
              </div>

              <div className="space-y-2 p-6">
                <AccountRow
                  label={isAdmin ? "Admin ID" : "Patient ID"}
                  value={isAdmin ? ADMIN_ID : patientId}
                  mono
                />

                {/* Wallet with copy button + toast */}
                {!isAdmin && (
                  <div className="rounded-lg bg-slate-50 px-3.5 py-3">
                    <div className="flex items-start gap-3">
                      <Lock size={13} className="mt-[3px] shrink-0 text-slate-300" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Wallet Address</p>
                          <button
                            onClick={copyWallet}
                            className={`flex shrink-0 items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition ${
                              copied
                                ? "bg-emerald-50 text-emerald-700"
                                : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            }`}
                          >
                            {copied
                              ? <><CheckCircle2 size={11} /> Copied</>
                              : <><Copy size={11} /> Copy</>}
                          </button>
                        </div>
                        <p
                          className="mt-1 truncate font-mono text-sm font-semibold text-slate-800"
                          title={wallet || undefined}
                        >
                          {wallet
                            ? `${wallet.slice(0, 10)}...${wallet.slice(-8)}`
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <AccountRow
                  label="Role"
                  value={isAdmin ? "System Administrator" : role.charAt(0).toUpperCase() + role.slice(1)}
                />

                {/* Account status */}
                <div className="rounded-lg bg-slate-50 px-3.5 py-3">
                  <div className="flex items-start gap-3">
                    <Lock size={13} className="mt-[3px] shrink-0 text-slate-300" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Account Status</p>
                      <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                        <ShieldCheck size={11} /> {isAdmin ? "Active" : "Account Active"}
                      </span>
                    </div>
                  </div>
                </div>

                <AccountRow label="Registration Date" value={fmtDate(displayUser.createdAt || authUser?.createdAt)} />
                {isAdmin && (
                  <AccountRow label="Last Login" value={fmtDateTime(lastLoginTs)} />
                )}
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ── View Photo Modal ────────────────────────────────────────────── */}
      {viewModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setViewModalOpen(false)}
        >
          {/* Modal card — stop propagation so clicking inside doesn't close */}
          <div
            className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setViewModalOpen(false)}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm transition hover:bg-slate-100 hover:text-slate-800"
            >
              <X size={16} />
            </button>

            {/* Photo area */}
            <div className="bg-gradient-to-br from-slate-100 to-slate-200 px-8 pt-10 pb-6 flex flex-col items-center">
              <div className="h-44 w-44 overflow-hidden rounded-full shadow-lg ring-4 ring-white">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient} text-5xl font-bold text-white`}
                  >
                    {initials}
                  </div>
                )}
              </div>
            </div>

            {/* Name + role */}
            <div className="px-6 pb-6 pt-4 text-center">
              <p className="text-lg font-bold text-slate-900">{fullName}</p>
              <p className="mt-0.5 text-sm capitalize text-slate-500">{role}</p>
              <button
                type="button"
                onClick={() => { setViewModalOpen(false); setTimeout(() => fileInputRef.current?.click(), 50); }}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                <Camera size={14} />
                Change Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
