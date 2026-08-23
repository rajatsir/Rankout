import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { subscribeLeaderboard } from "./lib/leaderboard";
import { submitEntry } from "./lib/submissions";
import { fetchYoutubeMeta } from "./lib/youtube";
import { adminLogin, adminLogout, watchAdminAuth } from "./lib/auth";
import { subscribeAllSubmissions, approveSubmission, rejectSubmission } from "./lib/admin";

function money(n) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function App() {
  const [page, setPage] = useState(location.pathname === "/admin" ? "admin" : "home");
  useEffect(() => {
    const onPop = () => setPage(location.pathname === "/admin" ? "admin" : "home");
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, []);
  return page === "admin" ? <Admin /> : <Home />;
}

function Home() {
  const [rows, setRows] = useState([]);
  const [showSubmit, setShowSubmit] = useState(false);

  // Real-time: Firestore pushes updates automatically, no polling needed.
  useEffect(() => {
    const unsub = subscribeLeaderboard(setRows, (err) => console.error("Leaderboard error:", err));
    return unsub;
  }, []);

  return (
    <div className="app">
      <header className="nav">
        <div className="brand">Rank<span>Outbid</span></div>
        <div className="navlinks"><a onClick={() => setShowSubmit(true)}>Submit Video</a><a href="#help">Help</a></div>
      </header>

      <main>
        <section className="hero">
          <div className="pill">🔴 LIVE LEADERBOARD</div>
          <h1>Get your YouTube video<br /><em>seen by more people.</em></h1>
          <p>Submit your video, make a verified promotional bid, and climb the public RankOutbid leaderboard.</p>
          <button className="primary" onClick={() => setShowSubmit(true)}>🚀 Rank My Video</button>
        </section>

        <section className="board-wrap">
          <div className="section-head"><div><h2>Live Rankings</h2><p>Highest verified promotional bid ranks first.</p></div><div className="live">● Live</div></div>
          <div className="board">
            <div className="thead"><span>Rank</span><span>Video</span><span>Channel</span><span>Verified Bid</span><span>Status</span></div>
            {rows.length === 0 && <div className="empty">No verified videos yet. Be the first to rank.</div>}
            {rows.map(r => <div className="tr" key={r.id}>
              <strong className="rank">{r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : `#${r.rank}`}</strong>
              <a className="video" href={r.youtube_url} target="_blank" rel="noreferrer">
                <img src={r.thumbnail_url || "https://placehold.co/160x90?text=YouTube"} />
                <span>{r.video_title}</span>
              </a>
              <span>{r.channel_name}</span>
              <strong>{money(r.bid_amount)}</strong>
              <span className="status approved">VERIFIED</span>
            </div>)}
          </div>
        </section>

        <section className="how">
          <h2>How RankOutbid works</h2>
          <div className="cards">
            <div><b>01</b><h3>Submit</h3><p>Paste your YouTube link, channel name and promotional bid.</p></div>
            <div><b>02</b><h3>Pay by UPI</h3><p>Pay the exact amount and submit your UTR and payment screenshot.</p></div>
            <div><b>03</b><h3>Get verified</h3><p>The admin manually verifies the payment before your entry goes live.</p></div>
            <div><b>04</b><h3>Climb the rank</h3><p>Verified entries are automatically sorted from highest to lowest bid.</p></div>
          </div>
        </section>

        <section id="help" className="help">
          <h2>Need help?</h2><p>Email <a href="mailto:princenarula964@gmail.com">princenarula964@gmail.com</a> or call <a href="tel:7999279557">7999279557</a>.</p>
        </section>
      </main>

      <footer>RankOutbid · Built by <b>ishwar</b></footer>
      {showSubmit && <Submit onClose={() => setShowSubmit(false)} onDone={() => setShowSubmit(false)} />}
    </div>
  );
}

function Submit({ onClose, onDone }) {
  const [form, setForm] = useState({ youtubeUrl: "", channelName: "", amount: "", utr: "", videoTitle: "" });
  const [meta, setMeta] = useState(null);
  const [file, setFile] = useState(null);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const preview = async () => {
    setBusy(true); setMsg("");
    const d = await fetchYoutubeMeta(form.youtubeUrl);
    setBusy(false);
    if (!d) return setMsg("Invalid or unavailable YouTube URL.");
    setMeta(d);
    setForm(f => ({ ...f, videoTitle: d.title, channelName: f.channelName || d.channel }));
    setStep(2);
  };

  const submit = async () => {
    setBusy(true); setMsg("");
    try {
      await submitEntry({
        youtubeUrl: form.youtubeUrl,
        videoTitle: form.videoTitle,
        thumbnailUrl: meta?.thumbnail,
        channelName: form.channelName,
        bidAmount: form.amount,
        utr: form.utr,
        screenshotFile: file,
      });
      setStep(4);
    } catch (e) {
      setMsg(e.message || "Submission failed.");
    } finally {
      setBusy(false);
    }
  };

  return <div className="modal"><div className="modalbox">
    <button className="close" onClick={onClose}>×</button>
    {step < 4 && <div className="steps"><span className={step >= 1 ? "on" : ""}>1</span><i /><span className={step >= 2 ? "on" : ""}>2</span><i /><span className={step >= 3 ? "on" : ""}>3</span></div>}
    {step === 1 && <><h2>Submit your video</h2><p className="muted">Enter your YouTube details.</p>
      <label>YouTube video URL<input value={form.youtubeUrl} onChange={e => setForm({ ...form, youtubeUrl: e.target.value })} placeholder="https://youtube.com/watch?v=..." /></label>
      <label>Channel name<input value={form.channelName} onChange={e => setForm({ ...form, channelName: e.target.value })} placeholder="Your channel" /></label>
      <label>Bid amount (INR)<input type="number" min="10" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="Minimum ₹10" /></label>
      {msg && <div className="error">{msg}</div>}<button className="primary full" disabled={busy} onClick={preview}>{busy ? "Checking…" : "Continue →"}</button>
    </>}
    {step === 2 && <><h2>Review your entry</h2>{meta && <div className="preview"><img src={meta.thumbnail} /><div><b>{meta.title}</b><small>{meta.channel}</small></div></div>}
      <p>Promotional bid: <strong>{money(Number(form.amount))}</strong></p>
      <div className="notice">Your payment is a promotional placement fee. Your entry becomes public only after manual payment verification.</div>
      <button className="primary full" onClick={() => setStep(3)}>Continue to UPI →</button></>}
    {step === 3 && <><h2>Pay by UPI</h2><p>Pay exactly <strong>{money(Number(form.amount))}</strong> using any UPI app.</p>
      <div className="upi"><code>7415279557@ibl</code><button onClick={() => navigator.clipboard?.writeText("7415279557@ibl")}>Copy</button><code>7999279557@axl</code><button onClick={() => navigator.clipboard?.writeText("7999279557@axl")}>Copy</button></div>
      <label>UTR / Transaction ID<input value={form.utr} onChange={e => setForm({ ...form, utr: e.target.value })} placeholder="Enter UTR after payment" /></label>
      <label>Payment screenshot (optional, max 5MB)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setFile(e.target.files?.[0] || null)} /></label>
      {msg && <div className="error">{msg}</div>}<button className="primary full" disabled={busy} onClick={submit}>{busy ? "Submitting…" : "Submit for verification"}</button></>}
    {step === 4 && <div className="success"><div>✓</div><h2>Submitted!</h2><p>Your entry is now <b>Pending Verification</b>. The leaderboard will update after the admin verifies your payment.</p><button className="primary" onClick={onDone}>Done</button></div>}
  </div></div>;
}

function Admin() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [login, setLogin] = useState({ email: "", password: "" });
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsub = watchAdminAuth((u) => { setUser(u); setAuthReady(true); });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeAllSubmissions(setRows, (err) => console.error("Admin subscribe error:", err));
    return unsub;
  }, [user]);

  const doLogin = async () => {
    setBusy(true); setError("");
    try {
      await adminLogin(login.email, login.password);
    } catch (e) {
      setError(e.message || "Invalid admin credentials.");
    } finally {
      setBusy(false);
    }
  };

  const act = async (id, type) => {
    try {
      type === "approve" ? await approveSubmission(id) : await rejectSubmission(id);
    } catch (e) {
      console.error(e);
    }
  };

  if (!authReady) return null;

  if (!user) return <div className="admin-login"><div className="loginbox">
    <div className="brand">Rank<span>Outbid</span></div>
    <h2>Developer Admin</h2>
    <label>Email<input value={login.email} onChange={e => setLogin({ ...login, email: e.target.value })} /></label>
    <label>Password<input type="password" value={login.password} onChange={e => setLogin({ ...login, password: e.target.value })} /></label>
    {error && <div className="error">{error}</div>}
    <button className="primary full" disabled={busy} onClick={doLogin}>{busy ? "Signing in…" : "Sign in"}</button>
    <a href="/">← Back to leaderboard</a>
  </div></div>;

  return <div className="admin">
    <header className="nav"><div className="brand">Rank<span>Outbid</span> <small>ADMIN</small></div><button onClick={adminLogout}>Logout</button></header>
    <main>
      <div className="admin-head"><div><h1>Submissions</h1><p>Manually verify payments before publishing rankings.</p></div></div>
      <div className="admin-table">
        {rows.map(r => <div className="admin-row" key={r.id}>
          <img src={r.thumbnail_url || "https://placehold.co/120x68?text=YT"} />
          <div className="grow">
            <b>{r.video_title}</b>
            <span>{r.channel_name} · {r.youtube_url}</span>
            <span>Bid: <strong>{money(r.bid_amount)}</strong> · UTR: <code>{r.utr}</code></span>
            {r.payment_screenshot && <a href={r.payment_screenshot} target="_blank" rel="noreferrer">View payment screenshot</a>}
          </div>
          <span className={`status ${r.status}`}>{r.status.toUpperCase()}</span>
          {r.status === "pending" && <div className="actions"><button className="approve" onClick={() => act(r.id, "approve")}>Approve Payment</button><button className="reject" onClick={() => act(r.id, "reject")}>Reject</button></div>}
        </div>)}
        {rows.length === 0 && <div className="empty">No submissions.</div>}
      </div>
    </main>
  </div>;
}

createRoot(document.getElementById("root")).render(<App />);
