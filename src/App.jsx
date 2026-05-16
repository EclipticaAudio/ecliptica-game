import { useEffect, useRef, useState } from "react";


const TILE          = 18;
const COLS          = 20;
const ROWS          = 16;
const W             = COLS * TILE; // 360
const H             = ROWS * TILE; // 288
const TICK          = 130;
const EARBUD_TO_WIN = 10;
const NUM_THIEVES   = 3;
const NUM_ROCKS     = 12;
const NUM_PONDS     = 6;

// ── Helpers ────────────────────────────────────────────────────────
function safe(x, y, blocked) {
  const tooClose = Math.abs(x - 1) + Math.abs(y - 1) < 3;
  return !tooClose && !blocked.some(b => b.x === x && b.y === y);
}

function randomCell(blocked = []) {
  let x, y, tries = 0;
  do {
    x = Math.floor(Math.random() * COLS);
    y = Math.floor(Math.random() * ROWS);
    tries++;
  } while (!safe(x, y, blocked) && tries < 300);
  return { x, y };
}

function buildObstacles() {
  const list = [];
  for (let i = 0; i < NUM_ROCKS; i++) {
    list.push({ ...randomCell(list), kind: "rock" });
  }
  for (let i = 0; i < NUM_PONDS; i++) {
    const anchor = randomCell(list);
    const size   = 1 + Math.floor(Math.random() * 2);
    for (let s = 0; s <= size; s++) {
      const cell = { x: anchor.x + s, y: anchor.y, kind: "pond" };
      if (cell.x < COLS && safe(cell.x, cell.y, list)) list.push(cell);
    }
  }
  return list;
}

// ── Drawing ────────────────────────────────────────────────────────
function drawGround(ctx) {
  ctx.fillStyle = "#4a8a3a";
  ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if ((x + y) % 2 === 0) {
        ctx.fillStyle = "rgba(0,0,0,0.06)";
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }
  }
  // Grass tufts
  const tufts = [
    [1,1],[3,4],[6,2],[9,1],[12,3],[15,2],[18,5],[2,7],[5,6],[8,8],
    [11,7],[14,6],[17,8],[0,10],[4,11],[7,10],[10,12],[13,11],[16,10],[19,13],
    [2,14],[6,13],[9,15],[12,14],[17,15],[1,3],[14,9],[18,2],[5,13],[8,4],
  ];
  tufts.forEach(([tx, ty]) => {
    if (tx >= COLS || ty >= ROWS) return;
    const px = tx * TILE, py = ty * TILE;
    ctx.fillStyle = "#5db048";
    ctx.fillRect(px + 3,  py + 12, 2, 5);
    ctx.fillRect(px + 7,  py + 10, 2, 7);
    ctx.fillRect(px + 12, py + 13, 2, 4);
    ctx.fillStyle = "#6ec855";
    ctx.fillRect(px + 5,  py + 11, 1, 4);
    ctx.fillRect(px + 10, py + 12, 1, 5);
  });
}

function drawRock(ctx, o) {
  const px = o.x * TILE, py = o.y * TILE;
  ctx.fillStyle = "#7a7a7a";
  ctx.fillRect(px + 2, py + 5, TILE - 4, TILE - 7);
  ctx.fillStyle = "#a0a0a0";
  ctx.fillRect(px + 3, py + 5, TILE - 6, 5);
  ctx.fillRect(px + 5, py + 3, TILE - 10, 4);
  ctx.fillStyle = "#555";
  ctx.fillRect(px + 3, py + TILE - 6, TILE - 6, 4);
  ctx.fillStyle = "#686868";
  ctx.fillRect(px + 9,  py + 8, 1, 4);
  ctx.fillRect(px + 12, py + 6, 1, 4);
}

function drawPond(ctx, o) {
  const px = o.x * TILE, py = o.y * TILE;
  ctx.fillStyle = "#2e78c8";
  ctx.fillRect(px + 1, py + 3, TILE - 2, TILE - 5);
  ctx.fillStyle = "#4a9ae0";
  ctx.fillRect(px + 3, py + 5, TILE - 8, 3);
  ctx.fillRect(px + 5, py + 9, TILE - 10, 2);
  ctx.fillStyle = "#1a5a9a";
  ctx.fillRect(px + 1, py + TILE - 5, TILE - 2, 3);
  ctx.fillStyle = "#3a7a2a";
  ctx.fillRect(px, py + 2, TILE, 3);
}

function drawEarbud(ctx, e) {
  const px = e.x * TILE, py = e.y * TILE;
  // Glow
  ctx.fillStyle = "rgba(255,200,30,0.22)";
  ctx.fillRect(px, py, TILE, TILE);
  // Case body
  ctx.fillStyle = "#c8960a";
  ctx.fillRect(px + 2, py + 6, TILE - 4, TILE - 8);
  // Case lid
  ctx.fillStyle = "#f5c518";
  ctx.fillRect(px + 2, py + 3, TILE - 4, 5);
  // Lid shine
  ctx.fillStyle = "#ffe066";
  ctx.fillRect(px + 3, py + 4, TILE - 8, 2);
  // Body shine
  ctx.fillStyle = "#e0a800";
  ctx.fillRect(px + 3, py + 8, TILE - 8, 2);
  // Hinge (left side center)
  ctx.fillStyle = "#a07000";
  ctx.fillRect(px + 2, py + 7, 2, 2);
  // Latch (right side center)
  ctx.fillStyle = "#fff8c0";
  ctx.fillRect(px + TILE - 5, py + 7, 3, 2);
  // Dark outline around case
  ctx.fillStyle = "#8a6000";
  ctx.fillRect(px + 2, py + 3, TILE - 4, 1); // top
  ctx.fillRect(px + 2, py + TILE - 3, TILE - 4, 1); // bottom
  ctx.fillRect(px + 2, py + 3, 1, TILE - 6); // left
  ctx.fillRect(px + TILE - 3, py + 3, 1, TILE - 6); // right
  // Lid divider line
  ctx.fillStyle = "#a07000";
  ctx.fillRect(px + 2, py + 7, TILE - 4, 1);
}

function drawPlayer(ctx, p) {
  const px = p.x * TILE, py = p.y * TILE;
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(px + 3, py + 15, 12, 3);
  ctx.fillStyle = "#1e3a8a";
  ctx.fillRect(px + 3, py + 7, 12, 9);
  ctx.fillStyle = "#f0d4b0";
  ctx.fillRect(px + 4, py + 1, 10, 8);
  ctx.fillStyle = "#3d1f00";
  ctx.fillRect(px + 4, py + 1, 10, 3);
  ctx.fillStyle = "#000";
  ctx.fillRect(px + 6,  py + 4, 2, 2);
  ctx.fillRect(px + 10, py + 4, 2, 2);
  ctx.fillStyle = "#162960";
  ctx.fillRect(px + 4,  py + 15, 4, 3);
  ctx.fillRect(px + 10, py + 15, 4, 3);
}

function drawThief(ctx, t) {
  const px = t.x * TILE, py = t.y * TILE;
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(px + 3, py + 15, 12, 3);
  ctx.fillStyle = "#8b0000";
  ctx.fillRect(px + 3, py + 7, 12, 9);
  ctx.fillStyle = "#f0d4b0";
  ctx.fillRect(px + 4, py + 1, 10, 8);
  ctx.fillStyle = "#1a0000";
  ctx.fillRect(px + 3, py + 1, 12, 4);
  ctx.fillRect(px + 5, py - 2, 8, 4);
  ctx.fillStyle = "#e74c3c";
  ctx.fillRect(px + 6,  py + 4, 2, 2);
  ctx.fillRect(px + 10, py + 4, 2, 2);
  ctx.fillStyle = "#5a0000";
  ctx.fillRect(px + 4,  py + 15, 4, 3);
  ctx.fillRect(px + 10, py + 15, 4, 3);
}

// ── D-Pad button ───────────────────────────────────────────────────
function DPadBtn({ label, dir, mobileKeys }) {
  return (
    <div
      onPointerDown={e => { e.preventDefault(); mobileKeys.current[dir] = true; }}
      onPointerUp={e => { e.preventDefault(); mobileKeys.current[dir] = false; }}
      onPointerLeave={e => { e.preventDefault(); mobileKeys.current[dir] = false; }}
      onPointerCancel={e => { e.preventDefault(); mobileKeys.current[dir] = false; }}
      style={{
        width: 54, height: 54, display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(255,255,255,0.13)", border: "2px solid rgba(255,255,255,0.28)",
        borderRadius: 10, fontSize: 24, color: "#fff",
        userSelect: "none", WebkitUserSelect: "none", touchAction: "none", cursor: "pointer",
      }}
    >
      {label}
    </div>
  );
}

// ── Shared styles ──────────────────────────────────────────────────
const FONT = "'Press Start 2P', monospace";
const pageStyle = {
  minHeight: "100vh", background: "#0d1f0d",
  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
  fontFamily: FONT, color: "#fff", padding: 16, boxSizing: "border-box",
};
const btn = (bg, fg = "#000") => ({
  fontFamily: FONT, fontSize: "clamp(7px,2vw,9px)",
  background: bg, color: fg, border: "none",
  padding: "12px 20px", cursor: "pointer", margin: 5,
});
const lbRow = i => ({
  display: "flex", justifyContent: "space-between",
  fontSize: "clamp(6px,1.8vw,7px)", padding: "5px 8px",
  borderBottom: "1px solid #1a3a1a",
  color: i === 0 ? "#f5c518" : i === 1 ? "#ccc" : i === 2 ? "#cd7f32" : "#8bc98b",
});

// ── Component ──────────────────────────────────────────────────────
export default function PixelEarbudGame() {
  const [screen,      setScreen]      = useState("menu");
  const [name,        setName]        = useState("");
  const [finalScore,  setFinalScore]  = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [lbLoading,   setLbLoading]   = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [hudScore,    setHudScore]    = useState(0);
  const [hudLeft,     setHudLeft]     = useState(EARBUD_TO_WIN);

  const canvasRef  = useRef(null);
  const rafRef     = useRef(null);
  const gameRef    = useRef(null);
  const mobileKeys = useRef({ up: false, down: false, left: false, right: false });

  useEffect(() => {
    fetch("https://api.jsonbin.io/v3/b/6a068089c0954111d826436c/latest")
      .then(r => r.json())
      .then(d => setLeaderboard(Array.isArray(d?.record?.leaderboard) ? d.record.leaderboard : []))
      .catch(() => {})
      .finally(() => setLbLoading(false));
  }, []);

  useEffect(() => {
    if (screen !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width  = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    const obstacles   = buildObstacles();
    const startEarbud = randomCell(obstacles);
    const thieves     = Array.from({ length: NUM_THIEVES }, () =>
      randomCell([...obstacles, startEarbud])
    );

    gameRef.current = {
      player: { x: 1, y: 1 }, earbud: startEarbud,
      thieves, obstacles, score: 0, collected: 0, lastTick: 0,
      startTime: performance.now(), elapsedMs: 0,
    };
    setHudScore(0);
    setHudLeft(EARBUD_TO_WIN);

    const keys = {};
    const onKD = e => { keys[e.key] = true;  if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault(); };
    const onKU = e => { delete keys[e.key]; };
    window.addEventListener("keydown", onKD);
    window.addEventListener("keyup",   onKU);

    function spawnEarbud() {
      const g = gameRef.current;
      g.earbud = randomCell([...g.obstacles, g.player, ...g.thieves]);
    }

    function tick(now) {
      const g  = gameRef.current;
      const mk = mobileKeys.current;
      if (now - g.lastTick < TICK) return;
      g.lastTick = now;

      let nx = g.player.x, ny = g.player.y;
      if (keys["ArrowUp"]    || keys["w"] || keys["W"] || mk.up)    ny--;
      if (keys["ArrowDown"]  || keys["s"] || keys["S"] || mk.down)  ny++;
      if (keys["ArrowLeft"]  || keys["a"] || keys["A"] || mk.left)  nx--;
      if (keys["ArrowRight"] || keys["d"] || keys["D"] || mk.right) nx++;

      const blocked = o => g.obstacles.some(b => b.x === o.x && b.y === o.y);
      if (nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS && !blocked({ x: nx, y: ny })) {
        g.player.x = nx; g.player.y = ny;
      }

      if (g.player.x === g.earbud.x && g.player.y === g.earbud.y) {
        g.score += 10; g.collected++;
        if (g.collected >= EARBUD_TO_WIN) {
          const elapsedSec = (performance.now() - g.startTime) / 1000;
          g.elapsedMs = performance.now() - g.startTime;
          // Time multiplier: under 30s = 3x, under 60s = 2x, under 90s = 1.5x, else 1x
          const mult = elapsedSec < 30 ? 2 : elapsedSec < 60 ? 1.5 : elapsedSec < 90 ? 1.2 : 1;
          const final = Math.round(g.score * mult);
          setFinalScore({ base: g.score, mult, final, elapsedMs: g.elapsedMs });
          setScreen("win"); return;
        }
        spawnEarbud();
        setHudScore(g.score); setHudLeft(EARBUD_TO_WIN - g.collected);
      }

      g.thieves.forEach(th => {
        if (Math.random() > 0.55) return;
        const dx = Math.sign(g.earbud.x - th.x), dy = Math.sign(g.earbud.y - th.y);
        const tries = Math.random() > 0.5
          ? [{ x: th.x + dx, y: th.y }, { x: th.x, y: th.y + dy }]
          : [{ x: th.x, y: th.y + dy }, { x: th.x + dx, y: th.y }];
        for (const s of tries) {
          if (s.x >= 0 && s.y >= 0 && s.x < COLS && s.y < ROWS &&
              !blocked(s) && !g.thieves.some(t => t !== th && t.x === s.x && t.y === s.y)) {
            th.x = s.x; th.y = s.y; break;
          }
        }
        if (th.x === g.earbud.x && th.y === g.earbud.y) { g.score = Math.max(0, g.score - 5); spawnEarbud(); setHudScore(g.score); }
        if (th.x === g.player.x && th.y === g.player.y) { g.score = Math.max(0, g.score - 3); setHudScore(g.score); }
      });
    }

    function render() {
      const g = gameRef.current;
      drawGround(ctx);
      g.obstacles.forEach(o => o.kind === "pond" ? drawPond(ctx, o) : drawRock(ctx, o));
      drawEarbud(ctx, g.earbud);
      g.thieves.forEach(t => drawThief(ctx, t));
      drawPlayer(ctx, g.player);
    }

    function loop(now) { tick(now); render(); rafRef.current = requestAnimationFrame(loop); }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("keydown", onKD);
      window.removeEventListener("keyup",   onKU);
    };
  }, [screen]);

  const handleStart = () => {
    if (!name.trim()) return;
    setSaved(false); setFinalScore(0); setScreen("playing");
  };

  const handleSave = async () => {
    if (saving || saved) return;
    setSaving(true);
    try {
      const res = await fetch("https://api.jsonbin.io/v3/b/6a068089c0954111d826436c/latest");
      const data = await res.json();
      const existing = Array.isArray(data?.record?.leaderboard) ? data.record.leaderboard : [];
      const scoreVal = typeof finalScore === "object" ? finalScore.final : finalScore;
      const updated  = [...existing, { name: name.trim() || "ANON", score: scoreVal }]
        .sort((a, b) => b.score - a.score).slice(0, 20);
      await fetch("/api/save-score", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ name, score }),
});
      setLeaderboard(updated); setSaved(true);
    } catch { alert("Could not save. Check connection."); }
    finally { setSaving(false); }
  };

  // ── MENU ────────────────────────────────────────────────────────
  if (screen === "menu") return (
    <div style={{ minHeight: "100vh", fontFamily: FONT, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        @keyframes birdfloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes sunpulse  { 0%,100%{opacity:1} 50%{opacity:0.7} }
        @keyframes cloudmove { 0%{transform:translateX(0)} 100%{transform:translateX(18px)} }
      `}</style>

      {/* ── Sky panel ── */}
      <div style={{ background: "linear-gradient(180deg,#5bb8f5 0%,#a8d8f0 100%)", padding: "20px 0 0", position: "relative", overflow: "hidden" }}>

        {/* Sun */}
        <div style={{ position:"absolute", top:14, right:28, width:32, height:32,
          background:"#f5c518", boxShadow:"0 0 0 4px #ffe066, 0 0 0 8px rgba(245,197,24,0.3)",
          animation:"sunpulse 2s infinite", imageRendering:"pixelated" }} />

        {/* Clouds */}
        <div style={{ position:"absolute", top:18, left:"8%", animation:"cloudmove 4s ease-in-out infinite alternate" }}>
          <div style={{ background:"#fff", width:48, height:14, position:"relative" }}>
            <div style={{ background:"#fff", width:30, height:14, position:"absolute", top:-10, left:8 }} />
          </div>
        </div>
        <div style={{ position:"absolute", top:28, right:"22%", animation:"cloudmove 5s ease-in-out infinite alternate-reverse" }}>
          <div style={{ background:"rgba(255,255,255,0.9)", width:38, height:12, position:"relative" }}>
            <div style={{ background:"rgba(255,255,255,0.9)", width:22, height:12, position:"absolute", top:-8, left:6 }} />
          </div>
        </div>

        {/* Pixel birds */}
        <div style={{ display:"flex", justifyContent:"space-around", padding:"8px 20px 0", animation:"birdfloat 2.5s ease-in-out infinite" }}>
          {["#2d5a8a","#3a6a9a"].map((c,i) => (
            <div key={i} style={{ color: c, fontSize: 18, transform: i===1?"scaleX(-1)":"none" }}>🐦</div>
          ))}
        </div>

        {/* Title sign — wooden board like reference image */}
        <div style={{ display:"flex", justifyContent:"center", padding:"12px 20px 0" }}>
          <div style={{ position:"relative", display:"inline-block" }}>
            {/* Sign post */}
            <div style={{ width:10, height:28, background:"#8B6914", margin:"0 auto" }} />
            {/* Sign board */}
            <div style={{
              background:"#c8a050", border:"4px solid #8B5e1a",
              padding:"10px 20px", textAlign:"center", marginTop:-2,
              boxShadow:"inset 0 2px 0 #e8c070, inset 0 -2px 0 #8B5e1a",
              minWidth: 220,
            }}>
              <div style={{ fontSize:"clamp(10px,3.5vw,14px)", color:"#3d1f00", lineHeight:1.6, textShadow:"1px 1px #e8c070" }}>
                COLLECT YOUR<br/>EARBUDS
              </div>
              <div style={{ fontSize:"clamp(6px,1.8vw,7px)", color:"#5a3010", marginTop:4, letterSpacing:1 }}>
                by Ecliptica Earbuds
              </div>
            </div>
          </div>
        </div>

        {/* Pixel tree right side */}
        <div style={{ position:"absolute", right:10, bottom:0, width:36 }}>
          <div style={{ width:10, height:18, background:"#8B6914", margin:"0 auto" }} />
          <div style={{ width:36, height:20, background:"#2d6e1b", marginTop:-6 }} />
          <div style={{ width:26, height:16, background:"#3a8a26", margin:"-4px auto 0" }} />
          <div style={{ width:16, height:12, background:"#4aaa30", margin:"-4px auto 0" }} />
        </div>

        {/* Pixel cat / critter bottom-left like reference */}
        <div style={{ position:"absolute", left:12, bottom:4, fontSize:22 }}>🐱</div>

        {/* Grass strip */}
        <div style={{ height:14, background:"#4a9630", marginTop:8, borderTop:"3px solid #5db048", position:"relative" }}>
          {/* Grass tufts */}
          {[8,28,55,90,130,175,220,265,300,330].map((x,i) => (
            <div key={i} style={{ position:"absolute", left:x, top:-5, width:3, height:7, background:"#5db048" }} />
          ))}
        </div>
      </div>

      {/* ── Ground panel — form + leaderboard ── */}
      <div style={{ background:"#0d1f0d", flex:1, display:"flex", flexDirection:"column", alignItems:"center", padding:"16px 16px 20px", gap:14, overflowY:"auto" }}>

        {/* How to play */}
        <div style={{ fontSize:"clamp(5px,1.6vw,7px)", color:"#8bc98b", lineHeight:2.2, textAlign:"center", border:"1px solid #2a4a2a", padding:"10px 14px", background:"rgba(0,0,0,0.3)", maxWidth:320, width:"100%" }}>
          Move: ARROWS · WASD · D-PAD<br/>
          Collect <span style={{color:"#f5c518"}}>10 earbuds</span> to win · faster = higher score<br/>
          <span style={{color:"#e74c3c"}}>Red thieves</span> steal earbuds &amp; cost points<br/>
          <span style={{color:"#7a7a7a"}}>Rocks</span> &amp; <span style={{color:"#4a9ae0"}}>ponds</span> block your path
        </div>

        {/* Name + play */}
        <input
          style={{ fontFamily:FONT, fontSize:"clamp(8px,2.5vw,10px)", background:"#000", color:"#0f0", border:"2px solid #0f0", padding:"10px 14px", outline:"none", width:"min(240px,80vw)", textAlign:"center" }}
          placeholder="ENTER YOUR NAME" maxLength={12} value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleStart()}
        />
        <button onClick={handleStart} disabled={!name.trim()} style={btn(name.trim() ? "#f5c518" : "#555")}>▶ PLAY</button>

        {/* Leaderboard */}
        <div style={{ width:"min(300px,90vw)" }}>
          <div style={{ fontSize:"clamp(7px,2vw,9px)", color:"#f5c518", marginBottom:10, textAlign:"center" }}>🏆 LEADERBOARD</div>
          {lbLoading && <div style={{ fontSize:7, color:"#aaa", textAlign:"center" }}>Loading...</div>}
          {!lbLoading && leaderboard.length === 0 && <div style={{ fontSize:7, color:"#aaa", textAlign:"center" }}>No scores yet. Be first!</div>}
          {leaderboard.slice(0,10).map((r,i) => (
            <div key={i} style={lbRow(i)}><span>#{i+1} {r.name}</span><span>{r.score} pts</span></div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── WIN ──────────────────────────────────────────────────────────
  if (screen === "win") {
    const fs = typeof finalScore === "object" ? finalScore : { base: finalScore, mult: 1, final: finalScore, elapsedMs: 0 };
    const secs = Math.floor(fs.elapsedMs / 1000);
    const mins = Math.floor(secs / 60);
    const timeStr = `${String(mins).padStart(2,"0")}:${String(secs % 60).padStart(2,"0")}`;
    return (
    <div style={pageStyle}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');`}</style>
      <div style={{ fontSize: "clamp(13px,4vw,18px)", color: "#f5c518", textAlign: "center", lineHeight: 1.8, marginBottom: 8 }}>
        YOU GOT YOUR<br />EARBUDS BACK!
      </div>
      <div style={{ fontSize: "clamp(7px,2vw,9px)", color: "#aaa", marginBottom: 16 }}>by Ecliptica Earbuds</div>

      {/* Score breakdown */}
      <div style={{ background: "rgba(0,0,0,0.4)", border: "1px solid #2a4a2a", padding: "12px 20px", marginBottom: 20, textAlign: "center", width: "min(280px,85vw)" }}>
        <div style={{ fontSize: "clamp(6px,1.8vw,7px)", color: "#aaa", marginBottom: 8 }}>COMPLETION TIME</div>
        <div style={{ fontSize: "clamp(12px,3.5vw,16px)", color: "#4a9ae0", marginBottom: 12 }}>{timeStr}</div>
        <div style={{ fontSize: "clamp(5px,1.5vw,6px)", color: "#aaa", lineHeight: 2 }}>
          BASE SCORE: {fs.base} pts<br />
          SPEED BONUS: ×{fs.mult}<br />
        </div>
        <div style={{ fontSize: "clamp(12px,3.5vw,16px)", color: "#2ecc71", marginTop: 8 }}>
          FINAL: {fs.final} pts
        </div>
        <div style={{ fontSize: "clamp(5px,1.4vw,6px)", color: "#888", marginTop: 6 }}>
          {fs.mult >= 3 ? "⚡ LIGHTNING FAST!" : fs.mult >= 2 ? "🔥 SPEED RUNNER!" : fs.mult >= 1.5 ? "👍 NICE PACE!" : "🐢 TAKE YOUR TIME"}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={handleSave} disabled={saving || saved} style={btn(saved ? "#555" : "#2ecc71")}>
          {saving ? "SAVING..." : saved ? "SAVED ✓" : "SAVE SCORE"}
        </button>
        <button onClick={() => { setSaved(false); setScreen("playing"); }} style={btn("#f5c518")}>PLAY AGAIN</button>
        <button onClick={() => { setSaved(false); setScreen("menu"); }} style={btn("#555", "#fff")}>MENU</button>
      </div>
      {saved && leaderboard.length > 0 && (
        <div style={{ marginTop: 24, width: "min(300px,90vw)" }}>
          <div style={{ fontSize: 8, color: "#f5c518", marginBottom: 10, textAlign: "center" }}>🏆 UPDATED LEADERBOARD</div>
          {leaderboard.slice(0, 5).map((r, i) => (
            <div key={i} style={lbRow(i)}><span>#{i + 1} {r.name}</span><span>{r.score} pts</span></div>
          ))}
        </div>
      )}
    </div>
  );}

  // ── GAME ─────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#0a1a0a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: FONT, padding: 8, boxSizing: "border-box", gap: 8 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');`}</style>

      {/* HUD — pure HTML, outside canvas */}
      <div style={{ width: "min(360px,100vw)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0d1f0d", border: "2px solid #2a4a2a", padding: "6px 12px", boxSizing: "border-box" }}>
        <span style={{ fontSize: "clamp(6px,2vw,9px)", color: "#f5c518" }}>SCORE: {hudScore}</span>
        <span style={{ fontSize: "clamp(5px,1.8vw,8px)", color: "#fff" }}>COLLECT: {hudLeft} MORE</span>
        <button onClick={() => setScreen("menu")} style={{ fontFamily: FONT, fontSize: "clamp(5px,1.5vw,7px)", background: "#555", color: "#fff", border: "none", padding: "4px 8px", cursor: "pointer" }}>MENU</button>
      </div>

      {/* Canvas */}
      <canvas ref={canvasRef} style={{ imageRendering: "pixelated", border: "3px solid #2a4a2a", display: "block", maxWidth: "100vw", width: "min(360px,100vw)", height: "auto" }} />

      {/* Legend */}
      <div style={{ fontSize: "clamp(5px,1.5vw,7px)", color: "#4a7a4a", textAlign: "center", lineHeight: 1.9 }}>
        🟡 collect earbud +10 &nbsp;·&nbsp; 🔴 thief contact −3 &nbsp;·&nbsp; thief steals earbud −5
      </div>

      {/* D-pad */}
    <div style={{ display: "grid", gridTemplateColumns: "68px 68px 68px", gridTemplateRows: "68px 68px", gap: 16, marginTop: 10 }}>
        <div />
        <DPadBtn label="▲" dir="up"    mobileKeys={mobileKeys} />
        <div />
        <DPadBtn label="◀" dir="left"  mobileKeys={mobileKeys} />
        <DPadBtn label="▼" dir="down"  mobileKeys={mobileKeys} />
        <DPadBtn label="▶" dir="right" mobileKeys={mobileKeys} />
      </div>
    </div>
  );
}
 