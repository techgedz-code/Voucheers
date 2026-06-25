"use client";

import { useEffect, useRef, useState } from "react";

/**
 * "Kick It!" — a 30-second penalty score-attack played purely for fun.
 *
 * The voucher prize is decided SERVER-SIDE (independent of the score) and is
 * revealed by the parent flow after the player taps "Claim your reward". This
 * component never picks the prize — it only entertains and reports the final
 * score for flavour.
 */

const GAME_DURATION = 30;
const GOAL_SCORE = 10;
const MIN_DRAG = 18;
const MAX_DRAG = 130;
const CIRC = 150.796;

const COLORS = [
  "#ffe94e",
  "#ff3b3b",
  "#3bff7c",
  "#3bd6ff",
  "#ff9f3b",
  "#d63bff",
  "#ffffff",
];

interface Confetti {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  life: number;
  shape: "r" | "c";
  rot: number;
  rotV: number;
}
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  life: number;
}

export function FootballGame({
  brandColor,
  onClaim,
}: {
  brandColor: string;
  onClaim: (score: number) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const powerFillRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const goalFlashRef = useRef<HTMLDivElement>(null);
  const missFlashRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<"playing" | "ended">("playing");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [highScore, setHighScore] = useState(0);
  const endScoreRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ── STATE ──
    let scoreLocal = 0;
    let timeLeftLocal = GAME_DURATION;
    let ballX = 0,
      ballY = 0,
      ballR = 0;
    let goalX = 0,
      goalY = 0,
      goalW = 0,
      goalH = 0;
    let goalDirX = 1;
    let goalSpeed = 0;
    let confetti: Confetti[] = [];
    let particles: Particle[] = [];
    let animId = 0;
    let timerInterval: ReturnType<typeof setInterval> | undefined;
    let canW = 0,
      canH = 0;

    let isDragging = false;
    let dragStartX = 0,
      dragStartY = 0;
    let aimAngle = -Math.PI / 2;
    let aimPower = 0;
    let hintHidden = false;

    let ballInFlight = false;
    let flyX = 0,
      flyY = 0,
      flyVX = 0,
      flyVY = 0,
      flyR = 0;
    let ended = false;

    // High score (fun only).
    let hs = 0;
    try {
      hs = parseInt(localStorage.getItem("kickit_hs2") || "0", 10) || 0;
    } catch {
      /* ignore */
    }
    setHighScore(hs);

    function placeGoal() {
      goalW = Math.min(canW * 0.15, 60);
      goalH = goalW * 0.6;
      goalY = canH * 0.13;
      goalX = (canW - goalW) / 2;
      goalDirX = Math.random() < 0.5 ? 1 : -1;
      updateGoalSpeed();
    }
    function updateGoalSpeed() {
      const progress = 1 - timeLeftLocal / GAME_DURATION;
      goalSpeed = 1.5 + progress * 3.5;
    }
    function placeBall() {
      ballR = Math.min(canW, canH) * 0.065;
      ballX = canW / 2 + (Math.random() - 0.5) * canW * 0.3;
      ballY = canH * 0.72 + (Math.random() - 0.5) * canH * 0.05;
      ballInFlight = false;
      isDragging = false;
      aimPower = 0;
      if (powerFillRef.current) powerFillRef.current.style.width = "0%";
      const dx = goalX + goalW / 2 - ballX;
      const dy = goalY + goalH / 2 - ballY;
      aimAngle = Math.atan2(dy, dx);
    }
    function resize() {
      canW = canvas!.width = root!.clientWidth;
      canH = canvas!.height = root!.clientHeight;
      placeGoal();
      placeBall();
    }

    function spawnConfetti(cx: number, cy: number) {
      for (let i = 0; i < 40; i++) {
        const a = Math.random() * Math.PI * 2,
          sp = 4 + Math.random() * 8;
        confetti.push({
          x: cx,
          y: cy,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 5,
          r: 4 + Math.random() * 5,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          life: 1,
          shape: Math.random() > 0.5 ? "r" : "c",
          rot: Math.random() * 360,
          rotV: (Math.random() - 0.5) * 12,
        });
      }
    }
    function spawnParticles(cx: number, cy: number, color: string, n = 12) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2,
          sp = 2 + Math.random() * 5;
        particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 2,
          r: 3 + Math.random() * 3,
          color,
          life: 1,
        });
      }
    }

    function drawPitch() {
      const c = ctx!;
      const sky = c.createLinearGradient(0, 0, 0, canH * 0.45);
      sky.addColorStop(0, "#87ceeb");
      sky.addColorStop(1, "#c8e8f4");
      c.fillStyle = sky;
      c.fillRect(0, 0, canW, canH);

      c.fillStyle = "#5ba85e";
      c.beginPath();
      for (let x = 0; x <= canW; x += 18)
        c.arc(x, canH * 0.38 + Math.sin(x * 0.18) * 6, 14 + Math.sin(x * 0.3) * 4, Math.PI, 0);
      c.closePath();
      c.fill();

      const grass = c.createLinearGradient(0, canH * 0.36, 0, canH);
      grass.addColorStop(0, "#22a03d");
      grass.addColorStop(1, "#1a7a2e");
      c.fillStyle = grass;
      c.fillRect(0, canH * 0.36, canW, canH);

      c.fillStyle = "#1e8f36";
      for (let i = 0; i < 5; i++)
        c.fillRect(0, canH * 0.36 + i * ((canH * 0.64) / 5), canW, (canH * 0.64) / 10);

      c.strokeStyle = "#ffffff33";
      c.lineWidth = 2;
      c.beginPath();
      c.arc(canW / 2, canH * 0.78, canW * 0.28, Math.PI, 0);
      c.stroke();
      c.beginPath();
      c.moveTo(0, canH * 0.75);
      c.lineTo(canW, canH * 0.75);
      c.stroke();
    }

    function drawGoal() {
      const c = ctx!;
      const x = goalX,
        y = goalY,
        w = goalW,
        h = goalH,
        post = 8;
      const progress = 1 - timeLeftLocal / GAME_DURATION;
      if (progress > 0.5) {
        const glowAlpha = (progress - 0.5) * 2;
        c.save();
        c.shadowColor = `rgba(255,80,80,${glowAlpha * 0.9})`;
        c.shadowBlur = 18 * glowAlpha;
        c.fillStyle = `rgba(255,${Math.round(255 * (1 - glowAlpha))},${Math.round(
          255 * (1 - glowAlpha)
        )},1)`;
        c.fillRect(x - post / 2, y, post, h + post);
        c.fillRect(x + w - post / 2, y, post, h + post);
        c.fillRect(x - post / 2, y - post / 2, w + post, post);
        c.shadowBlur = 0;
        c.restore();
      }

      c.strokeStyle = "#ffffff55";
      c.lineWidth = 1;
      const cols = 6,
        rows = 5;
      for (let cc = 0; cc <= cols; cc++) {
        c.beginPath();
        c.moveTo(x + cc * (w / cols), y);
        c.lineTo(x + cc * (w / cols), y + h);
        c.stroke();
      }
      for (let r = 0; r <= rows; r++) {
        c.beginPath();
        c.moveTo(x, y + r * (h / rows));
        c.lineTo(x + w, y + r * (h / rows));
        c.stroke();
      }

      c.fillStyle = "#ffffff18";
      c.fillRect(x, y, w, h);

      c.fillStyle = "#ffffff";
      c.shadowColor = "#0005";
      c.shadowBlur = 6;
      c.fillRect(x - post / 2, y, post, h + post);
      c.fillRect(x + w - post / 2, y, post, h + post);
      c.fillRect(x - post / 2, y - post / 2, w + post, post);
      c.shadowBlur = 0;

      const speedLabel = goalSpeed < 2.5 ? "🟢 SLOW" : goalSpeed < 3.8 ? "🟡 FAST" : "🔴 TURBO!";
      c.font = `bold ${Math.max(11, goalW * 0.13)}px Arial Black, Arial`;
      c.fillStyle = "#ffffffee";
      c.textAlign = "center";
      c.shadowColor = "#0005";
      c.shadowBlur = 4;
      c.fillText(speedLabel, x + w / 2, y - 10);
      c.shadowBlur = 0;
    }

    function drawPentagon(cx: number, cy: number, r: number) {
      const c = ctx!;
      c.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        i === 0
          ? c.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
          : c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      c.closePath();
      c.fill();
    }
    function drawBall(x: number, y: number, r: number) {
      const c = ctx!;
      c.fillStyle = "#00000030";
      c.beginPath();
      c.ellipse(x, y + r * 0.9, r * 0.8, r * 0.25, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#f5f5f5";
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#222";
      drawPentagon(x, y, r * 0.38);
      const offsets = [
        [0, -1],
        [0.95, -0.31],
        [0.59, 0.81],
        [-0.59, 0.81],
        [-0.95, -0.31],
      ];
      offsets.forEach(([ox, oy]) => drawPentagon(x + ox * r * 0.68, y + oy * r * 0.68, r * 0.25));
      c.strokeStyle = "#aaa";
      c.lineWidth = 1;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.stroke();
    }

    function drawAimArrow() {
      if (ballInFlight) return;
      const c = ctx!;
      const arrowLen = 55 + aimPower * 55;
      const tipX = ballX + Math.cos(aimAngle) * (ballR + arrowLen);
      const tipY = ballY + Math.sin(aimAngle) * (ballR + arrowLen);
      const baseX = ballX + Math.cos(aimAngle) * (ballR + 8);
      const baseY = ballY + Math.sin(aimAngle) * (ballR + 8);
      const r = Math.round(59 + aimPower * 196);
      const g = Math.round(255 - aimPower * 170);
      const b = Math.round(76 - aimPower * 76);
      const col = `rgb(${r},${g},${b})`;

      c.save();
      c.strokeStyle = col;
      c.lineWidth = 4 + aimPower * 3;
      c.lineCap = "round";
      c.setLineDash([10, 6]);
      c.lineDashOffset = -(performance.now() / 50) % 16;
      c.shadowColor = col;
      c.shadowBlur = 12;
      c.beginPath();
      c.moveTo(baseX, baseY);
      c.lineTo(tipX, tipY);
      c.stroke();
      c.setLineDash([]);
      c.shadowBlur = 0;

      const hSize = 14 + aimPower * 8;
      const ax = Math.cos(aimAngle),
        ay = Math.sin(aimAngle);
      const px = -ay,
        py = ax;
      c.fillStyle = col;
      c.shadowColor = col;
      c.shadowBlur = 10;
      c.beginPath();
      c.moveTo(tipX + ax * hSize, tipY + ay * hSize);
      c.lineTo(tipX + px * (hSize * 0.5), tipY + py * (hSize * 0.5));
      c.lineTo(tipX - px * (hSize * 0.5), tipY - py * (hSize * 0.5));
      c.closePath();
      c.fill();
      c.shadowBlur = 0;
      c.restore();

      if (!isDragging && aimPower === 0) {
        c.font = `bold ${Math.max(13, ballR * 0.7)}px Arial Black, Arial`;
        c.fillStyle = "#ffffffee";
        c.textAlign = "center";
        c.shadowColor = "#0006";
        c.shadowBlur = 6;
        c.fillText("DRAG & RELEASE", ballX, ballY + ballR + arrowLen + 26);
        c.shadowBlur = 0;
      }
    }

    function drawConfetti() {
      const c = ctx!;
      confetti.forEach((cf) => {
        c.save();
        c.globalAlpha = cf.life;
        c.fillStyle = cf.color;
        c.translate(cf.x, cf.y);
        c.rotate((cf.rot * Math.PI) / 180);
        if (cf.shape === "r") c.fillRect(-cf.r / 2, -cf.r / 2, cf.r, cf.r * 0.6);
        else {
          c.beginPath();
          c.arc(0, 0, cf.r * 0.5, 0, Math.PI * 2);
          c.fill();
        }
        c.restore();
      });
      particles.forEach((p) => {
        c.save();
        c.globalAlpha = p.life;
        c.fillStyle = p.color;
        c.beginPath();
        c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        c.fill();
        c.restore();
      });
    }

    function flash(ref: HTMLDivElement | null) {
      if (!ref) return;
      ref.classList.remove("fbg-show");
      void ref.offsetWidth;
      ref.classList.add("fbg-show");
    }

    function checkGoal() {
      if (!ballInFlight) return;
      if (flyX > goalX && flyX < goalX + goalW && flyY > goalY && flyY < goalY + goalH) {
        goalScored();
        return;
      }
      if (flyY < -60 || flyX < -80 || flyX > canW + 80 || flyY > canH + 80) {
        flash(missFlashRef.current);
        if (navigator.vibrate) navigator.vibrate(60);
        ballInFlight = false;
        setTimeout(() => placeBall(), 700);
      }
    }
    function goalScored() {
      scoreLocal += GOAL_SCORE;
      setScore(scoreLocal);
      spawnConfetti(flyX, flyY);
      spawnParticles(flyX, flyY, "#ffe94e", 22);
      flash(goalFlashRef.current);
      if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
      ballInFlight = false;
      goalDirX *= -1;
      setTimeout(() => placeBall(), 900);
    }

    function kick() {
      if (aimPower < 0.08) return;
      const speed = 6 + aimPower * 16;
      flyX = ballX;
      flyY = ballY;
      flyR = ballR;
      flyVX = Math.cos(aimAngle) * speed;
      flyVY = Math.sin(aimAngle) * speed;
      ballInFlight = true;
      spawnParticles(ballX, ballY, "#ffffff88", 8);
      if (navigator.vibrate) navigator.vibrate(30);
      aimPower = 0;
      if (powerFillRef.current) powerFillRef.current.style.width = "0%";
    }

    let lastTime = 0;
    function loop(ts: number) {
      const dt = Math.min((ts - lastTime) / 16.67, 3);
      lastTime = ts;
      const c = ctx!;
      c.clearRect(0, 0, canW, canH);
      drawPitch();

      if (!ballInFlight) {
        updateGoalSpeed();
        goalX += goalDirX * goalSpeed * dt;
        const minX = 4,
          maxX = canW - goalW - 4;
        if (goalX <= minX) {
          goalX = minX;
          goalDirX = 1;
        }
        if (goalX >= maxX) {
          goalX = maxX;
          goalDirX = -1;
        }
      }

      drawGoal();

      confetti = confetti.filter((cf) => cf.life > 0);
      confetti.forEach((cf) => {
        cf.x += cf.vx * dt;
        cf.y += cf.vy * dt;
        cf.vy += 0.18 * dt;
        cf.vx *= 0.99;
        cf.rot += cf.rotV * dt;
        cf.life -= 0.018 * dt;
      });
      particles = particles.filter((p) => p.life > 0);
      particles.forEach((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 0.1 * dt;
        p.life -= 0.025 * dt;
      });
      drawConfetti();

      if (ballInFlight) {
        flyX += flyVX * dt;
        flyY += flyVY * dt;
        flyR *= Math.pow(0.988, dt);
        drawBall(flyX, flyY, flyR);
        checkGoal();
      } else {
        drawAimArrow();
        drawBall(ballX, ballY, ballR);
      }

      if (!ended) animId = requestAnimationFrame(loop);
    }

    function endGame() {
      if (ended) return;
      ended = true;
      if (timerInterval) clearInterval(timerInterval);
      cancelAnimationFrame(animId);
      try {
        if (scoreLocal > hs) localStorage.setItem("kickit_hs2", String(scoreLocal));
      } catch {
        /* ignore */
      }
      endScoreRef.current = scoreLocal;
      setHighScore((prev) => Math.max(prev, scoreLocal));
      setPhase("ended");
    }

    // ── INPUT ──
    function getCanvasPos(e: TouchEvent | MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      const src = "touches" in e ? e.touches[0] : e;
      return {
        x: ((src.clientX - rect.left) / rect.width) * canW,
        y: ((src.clientY - rect.top) / rect.height) * canH,
      };
    }
    function onDown(e: TouchEvent | MouseEvent) {
      e.preventDefault();
      if (ballInFlight || ended) return;
      const p = getCanvasPos(e);
      dragStartX = p.x;
      dragStartY = p.y;
      isDragging = true;
      if (!hintHidden) {
        hintHidden = true;
        hintRef.current?.classList.add("fbg-hide");
      }
    }
    function onMove(e: TouchEvent | MouseEvent) {
      e.preventDefault();
      if (!isDragging || ballInFlight) return;
      const p = getCanvasPos(e);
      const dx = p.x - dragStartX;
      const dy = p.y - dragStartY;
      const dist = Math.hypot(dx, dy);
      if (dist > MIN_DRAG) {
        aimAngle = Math.atan2(dy, dx);
        aimPower = Math.min(1, (dist - MIN_DRAG) / (MAX_DRAG - MIN_DRAG));
        if (powerFillRef.current)
          powerFillRef.current.style.width = aimPower * 100 + "%";
      }
    }
    function onUp(e: TouchEvent | MouseEvent) {
      e.preventDefault();
      if (!isDragging || ballInFlight) return;
      isDragging = false;
      kick();
    }
    function onMouseMove(e: MouseEvent) {
      if (isDragging) onMove(e);
    }

    canvas.addEventListener("touchstart", onDown, { passive: false });
    canvas.addEventListener("touchmove", onMove, { passive: false });
    canvas.addEventListener("touchend", onUp, { passive: false });
    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup", onUp);
    window.addEventListener("resize", resize);

    // ── START ──
    resize();
    lastTime = performance.now();
    animId = requestAnimationFrame(loop);
    timerInterval = setInterval(() => {
      timeLeftLocal--;
      setTimeLeft(timeLeftLocal);
      if (timeLeftLocal <= 0) endGame();
    }, 1000);

    return () => {
      ended = true;
      cancelAnimationFrame(animId);
      if (timerInterval) clearInterval(timerInterval);
      canvas.removeEventListener("touchstart", onDown);
      canvas.removeEventListener("touchmove", onMove);
      canvas.removeEventListener("touchend", onUp);
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseup", onUp);
      window.removeEventListener("resize", resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ringOffset = CIRC * (1 - timeLeft / GAME_DURATION);
  const goals = endScoreRef.current / GOAL_SCORE;
  let stars = "⭐",
    msg = "Keep practising! 💪";
  if (goals >= 4) {
    stars = "⭐⭐";
    msg = "Nice shooting! 🎉";
  }
  if (goals >= 7) {
    stars = "⭐⭐⭐";
    msg = "You're a superstar! 🏆";
  }
  if (goals >= 11) {
    stars = "⭐⭐⭐⭐";
    msg = "LEGENDARY! 🔥";
  }

  return (
    <div
      ref={rootRef}
      className="fbg-root relative w-full overflow-hidden rounded-2xl"
      style={{ height: "min(72vh, 600px)", background: "#87ceeb", touchAction: "none" }}
    >
      <style>{`
        .fbg-canvas { display:block; width:100%; height:100%; touch-action:none; }
        .fbg-hud { position:absolute; top:0; left:0; right:0; display:flex; justify-content:space-between; align-items:center; padding:8px 14px; background:#00000030; backdrop-filter:blur(4px); z-index:10; }
        .fbg-hud .box { color:#fff; text-align:center; }
        .fbg-hud .box .lbl { font-size:.65rem; opacity:.8; text-transform:uppercase; letter-spacing:1px; }
        .fbg-hud .box .val { font-size:1.6rem; font-weight:900; line-height:1; text-shadow:0 2px 4px #0004; }
        .fbg-hint { position:absolute; bottom:78px; left:50%; transform:translateX(-50%); color:#ffffffdd; font-size:.9rem; font-weight:900; text-shadow:0 2px 4px #0006; pointer-events:none; letter-spacing:.5px; transition:opacity .4s; text-align:center; z-index:10; }
        .fbg-hint.fbg-hide { opacity:0; }
        .fbg-power { position:absolute; bottom:14px; left:50%; transform:translateX(-50%); width:150px; display:flex; flex-direction:column; align-items:center; gap:4px; pointer-events:none; z-index:10; }
        .fbg-power .plbl { color:#ffffffcc; font-size:.7rem; text-transform:uppercase; letter-spacing:1px; }
        .fbg-track { width:100%; height:13px; background:#ffffff30; border-radius:7px; overflow:hidden; }
        .fbg-fill { height:100%; width:0%; border-radius:7px; background:linear-gradient(90deg,#3bff7c,#ffe94e,#ff3b3b); transition:width .05s; }
        .fbg-flash { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; z-index:20; opacity:0; }
        .fbg-flash.fbg-show.fbg-goal { animation:fbgGoal .8s ease forwards; }
        .fbg-flash.fbg-show.fbg-miss { animation:fbgMiss .6s ease forwards; }
        @keyframes fbgGoal { 0%{opacity:0;transform:scale(.5)} 20%{opacity:1;transform:scale(1.15)} 70%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(.9)} }
        @keyframes fbgMiss { 0%{opacity:0;transform:scale(.6)} 20%{opacity:1;transform:scale(1.05)} 60%{opacity:1} 100%{opacity:0} }
        .fbg-goal span { font-size:clamp(2.6rem,12vw,5rem); font-weight:900; color:#ffe94e; text-shadow:0 4px 0 #0006,0 0 40px #fff8; letter-spacing:3px; }
        .fbg-miss span { font-size:clamp(1.6rem,8vw,3rem); font-weight:900; color:#ff6666; text-shadow:0 3px 0 #0006; }
      `}</style>

      {/* HUD */}
      <div className="fbg-hud">
        <div className="box">
          <div className="lbl">Score</div>
          <div className="val">{score}</div>
        </div>
        <svg width="50" height="50" viewBox="0 0 58 58">
          <circle cx="29" cy="29" r="24" fill="none" stroke="#fff3" strokeWidth="5" />
          <circle
            cx="29"
            cy="29"
            r="24"
            fill="none"
            stroke={timeLeft <= 8 ? "#ff3b3b" : "#ffe94e"}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={ringOffset}
            transform="rotate(-90 29 29)"
            style={{ transition: "stroke-dashoffset .2s linear" }}
          />
          <text
            x="29"
            y="35"
            textAnchor="middle"
            fill="white"
            fontSize="16"
            fontFamily="Arial Black, Arial"
            fontWeight="900"
          >
            {timeLeft}
          </text>
        </svg>
        <div className="box">
          <div className="lbl">Best</div>
          <div className="val">{highScore}</div>
        </div>
      </div>

      <canvas ref={canvasRef} className="fbg-canvas" />

      {phase === "playing" && (
        <>
          <div ref={hintRef} className="fbg-hint">
            👇 DRAG to aim · Release to KICK!
          </div>
          <div className="fbg-power">
            <div className="plbl">Power</div>
            <div className="fbg-track">
              <div ref={powerFillRef} className="fbg-fill" />
            </div>
          </div>
        </>
      )}

      <div ref={goalFlashRef} className="fbg-flash fbg-goal">
        <span>⚽ GOAL!</span>
      </div>
      <div ref={missFlashRef} className="fbg-flash fbg-miss">
        <span>😬 MISS!</span>
      </div>

      {/* END overlay */}
      {phase === "ended" && (
        <div
          className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 px-6 text-center"
          style={{ background: "linear-gradient(160deg,#1a7a2eee 0%,#0d4a1cf2 100%)" }}
        >
          <div className="text-3xl tracking-widest">{stars}</div>
          <h2 className="text-2xl font-extrabold" style={{ color: "#ffe94e" }}>
            Full Time!
          </h2>
          <div className="text-white/90">You scored</div>
          <div className="text-5xl font-black text-white">{endScoreRef.current}</div>
          <div className="text-white/90">points · {msg}</div>
          <button
            onClick={() => onClaim(endScoreRef.current)}
            className="btn mt-3 w-full max-w-xs text-white"
            style={{ background: brandColor }}
          >
            🎁 Claim your reward
          </button>
        </div>
      )}
    </div>
  );
}
