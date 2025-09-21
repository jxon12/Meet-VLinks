import React, { useEffect, useRef, useState } from "react";

type Props = {
  tip?: string;
  subTip?: string;
};

type Particle = {
  x: number;
  y: number;
  life: number;
  hueShift: number;
};

export default function LoadingVanGogh({
  tip = "Diving into Calm Waters",
  subTip = "breathe • flow • renew",
}: Props) {
  const [progress, setProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const tRef = useRef(0); // 时间

  // ======= 进度条（保持你的逻辑）=======
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((p) => (p >= 100 ? 100 : Math.min(100, p + Math.random() * 3)));
    }, 120);
    return () => clearInterval(timer);
  }, []);

  // ======= 画布初始化 & DPR =======
  const resize = () => {
    const c = canvasRef.current!;
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const { clientWidth, clientHeight } = c;
    c.width = Math.floor(clientWidth * dpr);
    c.height = Math.floor(clientHeight * dpr);
    const ctx = c.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  // 简单噪声/向量场（组合旋涡 + 正弦流）
  const flow = (x: number, y: number, t: number) => {
    // 归一化坐标（0~1）
    const cw = canvasRef.current!.clientWidth;
    const ch = canvasRef.current!.clientHeight;
    const u = x / cw;
    const v = y / ch;

    // 多个旋涡中心（调几个点）
    const centers = [
      { cx: 0.25, cy: 0.35, k: 0.9 },
      { cx: 0.55, cy: 0.30, k: -0.8 },
      { cx: 0.80, cy: 0.45, k: 0.6 },
      { cx: 0.40, cy: 0.65, k: -0.7 },
    ];

    let vx = 0;
    let vy = 0;

    centers.forEach(({ cx, cy, k }) => {
      const dx = u - cx;
      const dy = v - cy;
      const r2 = dx * dx + dy * dy + 0.0006; // 防止除零
      // 旋涡速度场（正负决定旋转方向）
      vx += (-dy / r2) * k;
      vy += (dx / r2) * k;
    });

    // 叠加一层轻微的正弦漂移（像海流呼吸）
    const s = Math.sin((u * 6 + t) * 0.9) * 0.15;
    const c = Math.cos((v * 6 - t) * 0.9) * 0.15;
    vx += s * 0.6;
    vy += c * 0.6;

    // 速度缩放
    const speed = 28; // 越大越快
    return { vx: vx * speed, vy: vy * speed };
  };

  // 颜色调色板（蓝青金）
  const colorFor = (y: number, speed: number, hueShift: number) => {
    // 基础色：上部偏蓝、下部偏青/金
    const hBase = 205 - (y / (canvasRef.current!.clientHeight || 1)) * 30; // 205~175
    const h = hBase + hueShift; // 每个粒子微差
    const s = 82;
    // 速度越快亮度越高（星夜波光）
    const l = Math.max(45, Math.min(75, 45 + speed * 18));
    return `hsl(${h}, ${s}%, ${l}%)`;
  };

  // 创建 & 回收粒子
  const spawn = (n: number) => {
    const c = canvasRef.current!;
    for (let i = 0; i < n; i++) {
      particlesRef.current.push({
        x: Math.random() * c.clientWidth,
        y: Math.random() * c.clientHeight,
        life: 60 + Math.random() * 140, // 带拖尾的寿命
        hueShift: (Math.random() - 0.5) * 30, // 轻微偏色
      });
    }
  };

  // 主循环
  const tick = () => {
    const c = canvasRef.current!;
    if (!c) return; // Add null check
    const ctx = c.getContext("2d")!;
    const W = c.clientWidth;
    const H = c.clientHeight;

    // 半透明覆盖，形成拖尾（数值越小，拖得越长）
    ctx.fillStyle = "rgba(0, 5, 15, 0.08)";
    ctx.fillRect(0, 0, W, H);

    // 轻微星点
    if (Math.random() < 0.2) {
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      const sx = Math.random() * W;
      const sy = Math.random() * H;
      ctx.fillRect(sx, sy, 1, 1);
    }

    tRef.current += 0.006; // 推进时间（影响流动形态）

    // 更新绘制粒子
    const ps = particlesRef.current;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      const { vx, vy } = flow(p.x, p.y, tRef.current);

      // 速度（用于亮度）
      const spd = Math.sqrt(vx * vx + vy * vy) / 36;

      // 画线（从当前位置到下一位置，形成发光线条）
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      const nx = p.x + vx * 0.016; // dt
      const ny = p.y + vy * 0.016;
      ctx.lineTo(nx, ny);
      ctx.lineWidth = 1.1;
      ctx.strokeStyle = colorFor(p.y, spd, p.hueShift);
      ctx.globalCompositeOperation = "lighter";
      ctx.stroke();

      // 更新粒子
      p.x = nx;
      p.y = ny;
      p.life -= 1;

      // 出界或生命耗尽则复活到随机位置（保持密度）
      if (p.x < -5 || p.x > W + 5 || p.y < -5 || p.y > H + 5 || p.life <= 0) {
        p.x = Math.random() * W;
        p.y = Math.random() * H;
        p.life = 60 + Math.random() * 140;
        p.hueShift = (Math.random() - 0.5) * 30;
      }
    }

    // 如果粒子过少，补齐
    const target = Math.floor((W * H) / 9500); // 密度（移动端安全）
    if (ps.length < target) spawn(target - ps.length);
    if (ps.length > target * 1.2) ps.splice(0, ps.length - Math.floor(target * 1.2));

    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    const c = canvasRef.current!;
    const ctx = c.getContext("2d", { alpha: false })!;
    // 背景底色（深海+夜空）
    const paintBG = () => {
      const g = ctx.createLinearGradient(0, 0, 0, c.clientHeight);
      g.addColorStop(0, "#030914");
      g.addColorStop(0.55, "#031022");
      g.addColorStop(1, "#02060c");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, c.clientWidth, c.clientHeight);
    };

    resize();
    paintBG();
    spawn(200); // 初始粒子
    rafRef.current = requestAnimationFrame(tick);

    const onResize = () => {
      resize();
      paintBG();
    };
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center text-white overflow-hidden">
      {/* 背景 Canvas（Van Gogh 海流） */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{
          display: "block",
          background:
            "radial-gradient(60% 60% at 50% 35%, rgba(20,70,140,0.15), rgba(0,0,0,0) 60%)",
        }}
      />

      {/* 前景 UI */}
      <div className="relative w-full max-w-md px-8 text-center z-10 select-none">
        {/* 波浪进度条 */}
        <div className="relative h-3 w-full rounded-full bg-white/10 border border-white/20 backdrop-blur-sm overflow-hidden">
          {/* 流光 */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(160,220,255,.7) 40%, rgba(255,255,255,.9) 50%, rgba(160,220,255,.7) 60%, rgba(0,0,0,0) 100%)",
              transform: `translateX(${(progress % 100) * 1.4 - 100}%)`,
              transition: "transform .28s ease",
              mixBlendMode: "screen",
            }}
          />
          {/* 填充 */}
          <div
            className="absolute h-full left-0 top-0"
            style={{
              width: `${Math.min(100, progress)}%`,
              background:
                "linear-gradient(90deg, rgba(90,180,255,.6), rgba(170,210,255,.85))",
            }}
          />
        </div>

        {/* 文案 */}
        <div className="mt-8 space-y-3">
          <div className="text-2xl font-light text-blue-100/95 tracking-wider">{tip}</div>
          <div className="text-sm text-blue-100/70 font-medium tracking-widest">{subTip}</div>
          <div className="text-lg font-mono text-blue-100/80 tracking-wide">
            {Math.min(100, Math.round(progress))}%
          </div>
        </div>

        {/* 呼吸指示器 */}
        <div className="mt-6">
          <div className="inline-flex items-center space-x-3 text-blue-100/60 text-sm">
            <div className="w-2 h-2 rounded-full bg-cyan-300/80 animate-pulse" />
            <span>{progress < 50 ? "Breathe In" : "Breathe Out"}</span>
            <div className="w-2 h-2 rounded-full bg-cyan-300/80 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
