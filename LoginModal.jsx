/**
 * LoginModal.jsx
 * React Login/Signup Modal for Fitness Tracker
 * Dependencies: React 18+
 */

import { useState, useEffect, useRef, createContext, useContext } from "react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8080/api";

// ── Reusable Input Field ──────────────────────────────────────
function Field({ label, type = "text", value, onChange, placeholder, autoFocus }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#6b7a91", marginBottom:5 }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        style={{
          width:"100%", padding:"10px 14px",
          border:"1px solid #d8e2f0", borderRadius:8,
          fontFamily:"inherit", fontSize:14, color:"#1a2332",
          background:"#f8fafd", outline:"none", boxSizing:"border-box",
        }}
        onFocus={e => (e.target.style.borderColor = "#3b6ef8")}
        onBlur={e  => (e.target.style.borderColor = "#d8e2f0")}
      />
    </div>
  );
}window.onload = loadUserData;

// ── Tab Bar ───────────────────────────────────────────────────
function TabBar({ active, onChange }) {
  return (
    <div style={{ display:"flex", gap:4, background:"#e8eef7", borderRadius:10, padding:4, marginBottom:20 }}>
      {["login","signup"].map(t => (
        <button key={t} onClick={() => onChange(t)}
          style={{
            flex:1, padding:"9px 0", border:"none", borderRadius:7,
            fontFamily:"inherit", fontSize:13, fontWeight:600, cursor:"pointer",
            background: active === t ? "#fff" : "transparent",
            color:      active === t ? "#1a2332" : "#6b7a91",
            boxShadow:  active === t ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
          }}>
          {t === "login" ? "Login" : "Sign Up"}
        </button>
      ))}
    </div>
  );
}

// ── Error Box ─────────────────────────────────────────────────
function ErrorBox({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)",
      borderRadius:8, color:"#ef4444", fontSize:13, padding:"9px 12px", marginBottom:14,
    }}>{msg}</div>
  );
}

// ── Primary Button ────────────────────────────────────────────
function PrimaryBtn({ children, onClick, loading }) {
  return (
    <button onClick={onClick} disabled={loading}
      style={{
        width:"100%", padding:"12px 20px",
        background: loading ? "#6b7a91" : "#1a2332",
        color:"#fff", border:"none", borderRadius:8,
        fontFamily:"inherit", fontSize:14, fontWeight:700,
        cursor: loading ? "not-allowed" : "pointer", marginTop:4,
      }}>
      {loading ? "Please wait…" : children}
    </button>
  );
}

// ── Login Form ────────────────────────────────────────────────
function LoginForm({ onAuth }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleLogin() {
    setError("");
    if (!email || !password) return setError("Please fill in all fields.");
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/auth/login`, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");
      onAuth({ id:data.id, name:data.name, email:data.email, token:data.token });
    } catch (err) {
      // Local fallback
      const users = JSON.parse(localStorage.getItem("_users") || "[]");
      const match = users.find(u => u.email === email && u.password === btoa(password));
      if (match) {
        onAuth({ id:match.id, name:match.name, email:match.email });
      } else {
        setError(err.message || "Invalid credentials.");
      }
    } finally { setLoading(false); }
  }

  return (
    <>
      <ErrorBox msg={error} />
      <Field label="Email *"    type="email"    value={email}    onChange={setEmail}    placeholder="you@example.com" autoFocus />
      <Field label="Password *" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
      <PrimaryBtn onClick={handleLogin} loading={loading}>Login →</PrimaryBtn>
    </>
  );
}

// ── Signup Form ───────────────────────────────────────────────
function SignupForm({ onAuth }) {
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  function genId() { return Math.random().toString(36).slice(2,9); }

  async function handleSignup() {
    setError("");
    if (!name || !email || !password) return setError("Please fill in all fields.");
    if (password !== confirm)          return setError("Passwords do not match.");
    if (password.length < 6)           return setError("Password must be at least 6 characters.");
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/auth/register`, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Registration failed");
      onAuth({ id:data.id, name:data.name, email:data.email, token:data.token });
    } catch (err) {
      // Local fallback
      const users = JSON.parse(localStorage.getItem("_users") || "[]");
      if (users.find(u => u.email === email)) return setError("Email already registered.");
      const newUser = { id:genId(), name, email, password:btoa(password) };
      users.push(newUser);
      localStorage.setItem("_users", JSON.stringify(users));
      onAuth({ id:newUser.id, name, email });
    } finally { setLoading(false); }
  }

  return (
    <>
      <ErrorBox msg={error} />
      <Field label="Full Name *"          value={name}     onChange={setName}     placeholder="John Doe" autoFocus />
      <Field label="Email *"    type="email"    value={email}    onChange={setEmail}    placeholder="you@example.com" />
      <Field label="Password *" type="password" value={password} onChange={setPassword} placeholder="Min 6 characters" />
      <Field label="Confirm Password *" type="password" value={confirm} onChange={setConfirm} placeholder="Repeat password" />
      <PrimaryBtn onClick={handleSignup} loading={loading}>Create Account →</PrimaryBtn>
    </>
  );
}

// ── Main LoginModal Component ─────────────────────────────────
export default function LoginModal({ isOpen, onClose, onAuth }) {
  const [tab, setTab] = useState("login");
  const overlayRef    = useRef(null);

  useEffect(() => {
    const handler = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  function handleAuth(user) { onAuth(user); onClose(); }

  return (
    <>
      <div ref={overlayRef} onClick={e => { if (e.target === overlayRef.current) onClose(); }}
        style={{
          position:"fixed", inset:0, background:"rgba(10,18,35,0.45)",
          backdropFilter:"blur(3px)", zIndex:100,
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
        <div onClick={e => e.stopPropagation()}
          style={{
            background:"#fff", border:"1px solid #d8e2f0", borderRadius:18,
            padding:28, width:"min(440px, 92vw)",
            boxShadow:"0 20px 60px rgba(0,0,0,0.18)",
            fontFamily:"'DM Sans', sans-serif",
            animation:"modalIn 0.22s ease",
          }}>
          {/* Header */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
            <div>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:18, fontWeight:700 }}>
                {tab === "login" ? "🔐 Login" : "✨ Create Account"}
              </div>
              <div style={{ fontSize:12, color:"#6b7a91", marginTop:3 }}>
                {tab === "login" ? "Sign in to sync your fitness data" : "Join to track your fitness journey"}
              </div>
            </div>
            <button onClick={onClose}
              style={{
                background:"#e8eef7", border:"none", borderRadius:"50%",
                width:30, height:30, fontSize:16, cursor:"pointer",
                color:"#6b7a91", display:"flex", alignItems:"center", justifyContent:"center",
              }}>✕</button>
          </div>

          <TabBar active={tab} onChange={setTab} />

          {tab === "login"
            ? <LoginForm  onAuth={handleAuth} />
            : <SignupForm onAuth={handleAuth} />}
        </div>
      </div>
      <style>{`@keyframes modalIn { from{opacity:0;transform:scale(0.95) translateY(-8px)} to{opacity:1;transform:scale(1) translateY(0)} }`}</style>
    </>
  );
}

// ── Auth Context & Provider ───────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,      setUser]      = useState(() => {
    try { return JSON.parse(localStorage.getItem("currentUser")) || null; } catch { return null; }
  });
  const [modalOpen, setModalOpen] = useState(false);

  function login(userData) {
    setUser(userData);
    localStorage.setItem("currentUser", JSON.stringify(userData));
  }
  function logout() {
    setUser(null);
    localStorage.removeItem("currentUser");
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, openModal: () => setModalOpen(true) }}>
      {children}
      <LoginModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onAuth={u => { login(u); setModalOpen(false); }}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }