// src/components/QuizHub.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  X, Globe, ChevronLeft, Activity, Brain, Moon, AlertTriangle,
  HeartHandshake, Sparkles, Anchor, BookOpen
} from "lucide-react";

/* ----------------------- i18n helpers ----------------------- */
type Lang = "en" | "zh" | "ms";
const L = <T extends Record<Lang, string>>(lang: Lang, map: T) => map[lang];

const label = {
  hub:       { en: "QUIZ HUB", zh: "测评中心", ms: "PUSAT UJIAN" },
  quiz:      { en: "HEALTH QUIZ", zh: "健康测评", ms: "UJIAN KESIHATAN" },
  language:  { en: "English", zh: "中文", ms: "Bahasa" },
  backList:  { en: "Back to list", zh: "返回列表", ms: "Kembali ke senarai" },
  viewRes:   { en: "View result", zh: "查看结果", ms: "Lihat keputusan" },
  retake:    { en: "Retake", zh: "重新作答", ms: "Ulang" },
  total:     { en: "Total score", zh: "总分", ms: "Skor keseluruhan" },
  level:     { en: "Level", zh: "级别", ms: "Tahap" },
  tipOne:    { en: "Select one option for each question.", zh: "每题选择一个选项。", ms: "Pilih satu pilihan bagi setiap soalan." },
  export:    { en: "Export report", zh: "导出报告", ms: "Eksport laporan" },
  copied:    { en: "Copied!", zh: "已复制！", ms: "Disalin!" },
  copyText:  { en: "Copy text", zh: "复制文本", ms: "Salin teks" },
};

/* ----------------------- UI tokens ----------------------- */
const glass = "bg-white/[0.06] backdrop-blur-2xl border border-white/15";
const glassSoft = "bg-white/[0.05] backdrop-blur-xl border border-white/10";
const cardHover =
  "transition transform will-change-transform hover:translate-y-[-2px] hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)] hover:bg-white/[0.08]";

/* ----------------------- Types ----------------------- */
type QItem = { id: string; text: Record<Lang, string> };
type ScaleItem = { value: number; label: Record<Lang, string> };

type QuizDef = {
  id: string;
  icon?: React.ReactNode;
  title: Record<Lang, string>;
  desc: Record<Lang, string>;
  questions: QItem[];
  scale: ScaleItem[];
  interpret: (score: number, lang: Lang) => { level: string; note: string; tips: string[] };
};

/* ----------------------- Common scales ----------------------- */
const scaleFreq: ScaleItem[] = [
  { value: 0, label: { en: "Never", zh: "从不", ms: "Tidak pernah" } },
  { value: 1, label: { en: "Rarely", zh: "很少", ms: "Jarang" } },
  { value: 2, label: { en: "Sometimes", zh: "有时", ms: "Kadang-kadang" } },
  { value: 3, label: { en: "Often", zh: "经常", ms: "Kerap" } },
  { value: 4, label: { en: "Almost always", zh: "几乎总是", ms: "Hampir selalu" } },
];

const scaleAgree: ScaleItem[] = [
  { value: 0, label: { en: "Strongly disagree", zh: "非常不同意", ms: "Sangat tidak setuju" } },
  { value: 1, label: { en: "Disagree", zh: "不同意", ms: "Tidak setuju" } },
  { value: 2, label: { en: "Neutral", zh: "一般", ms: "Neutral" } },
  { value: 3, label: { en: "Agree", zh: "同意", ms: "Setuju" } },
  { value: 4, label: { en: "Strongly agree", zh: "非常同意", ms: "Sangat setuju" } },
];

/* ----------------------- Quizzes ----------------------- */
const Q = (en: string, zh: string, ms: string): Record<Lang, string> => ({ en, zh, ms });

const QUIZZES: QuizDef[] = [
  /* 1) Mental Health Screening */
  {
    id: "mh_screen",
    icon: <Activity className="w-5 h-5" />,
    title: Q("Mental Health Screening", "心理健康综合筛查", "Saringan Kesihatan Mental"),
    desc: Q(
      "Screens for depression, anxiety, and interpersonal sensitivity.",
      "同时筛查抑郁、焦虑与人际敏感。",
      "Menapis risiko kemurungan, keresahan, dan sensitiviti interpersonal."
    ),
    questions: [
      { id: "q1", text: Q("I feel down or hopeless.", "我感到情绪低落或绝望。", "Saya berasa murung atau putus asa.") },
      { id: "q2", text: Q("I feel nervous or on edge.", "我容易紧张或坐立不安。", "Saya berasa gelisah atau resah.") },
      { id: "q3", text: Q("I worry about how others see me.", "我在意他人如何看待我。", "Saya risau pandangan orang lain terhadap saya.") },
      { id: "q4", text: Q("I no longer enjoy things I used to.", "我难以享受以前喜欢的事。", "Saya tidak lagi menikmati perkara yang pernah saya suka.") },
      { id: "q5", text: Q("I feel easily irritated.", "我容易被激怒。", "Saya mudah berasa marah.") },
      { id: "q6", text: Q("I avoid social interactions.", "我避免社交互动。", "Saya mengelak bergaul.") },
      { id: "q7", text: Q("I find it hard to relax.", "我很难放松下来。", "Saya sukar untuk bertenang.") },
      { id: "q8", text: Q("I feel guilty or worthless.", "我常感到内疚或无价值。", "Saya kerap rasa bersalah atau tidak berharga.") },
    ],
    scale: scaleFreq,
    interpret(score, lang) {
      const pct = (score / (4 * 8)) * 100;
      const lvl = pct < 25 ? Q("Low risk","低风险","Risiko rendah")
        : pct < 50 ? Q("Mild risk","轻度风险","Risiko ringan")
        : pct < 75 ? Q("Moderate risk","中度风险","Risiko sederhana")
                   : Q("High risk","高风险","Risiko tinggi");
      const note = pct < 50
        ? Q("Generally stable mood & stress.", "整体情绪与压力较稳定。","Emosi & stres umumnya stabil.")
        : pct < 75
        ? Q("Consider short breaks, breathing & support.","安排短休、呼吸练习并寻求支持。","Cuba rehat ringkas, pernafasan & sokongan.")
        : Q("Please seek professional help.","建议尽快寻求专业支持。","Sila dapatkan bantuan profesional.");
      const tips = [
        Q("Try 4-7-8 breathing before sleep.","睡前试试 4-7-8 呼吸法。","Cuba pernafasan 4-7-8 sebelum tidur."),
        Q("Keep a 3-line mood journal.","写 3 行心情日志。","Catat jurnal emosi 3 baris."),
      ].map((m) => m[lang]);
      return { level: lvl[lang], note: note[lang], tips };
    },
  },

  /* 2) Depression */
  {
    id: "depression",
    icon: <Brain className="w-5 h-5" />,
    title: Q("Depression Risk", "抑郁风险评估", "Risiko Kemurungan"),
    desc: Q("Screens for common depressive symptoms in daily life.","聚焦日常中的抑郁相关体验。","Menilai simptom kemurungan harian."),
    questions: [
      { id: "q1", text: Q("Little interest or pleasure in doing things.","做事的兴趣或愉悦减少。","Kurang minat atau keseronokan melakukan sesuatu.") },
      { id: "q2", text: Q("Feeling down, depressed, or hopeless.","情绪低落或绝望。","Berasa murung atau putus asa.") },
      { id: "q3", text: Q("Low energy nearly every day.","几乎每天都精力不足。","Tenaga rendah hampir setiap hari.") },
      { id: "q4", text: Q("Trouble concentrating.","难以集中注意力。","Sukar untuk fokus.") },
      { id: "q5", text: Q("Feeling like a failure or guilty.","常感失败或内疚。","Rasa gagal atau bersalah.") },
      { id: "q6", text: Q("Sleep too much or too little.","睡眠过多或过少。","Tidur terlalu banyak atau terlalu sedikit.") },
    ],
    scale: scaleFreq,
    interpret(score, lang) {
      const pct = (score / (4 * 6)) * 100;
      const lvl = pct < 25 ? Q("Minimal","极低","Minimum")
        : pct < 50 ? Q("Mild","轻度","Ringan")
        : pct < 75 ? Q("Moderate","中度","Sederhana")
                   : Q("Severe","重度","Teruk");
      const note = pct < 50
        ? Q("Low likelihood of depression.","抑郁可能性较低。","Kebarangkalian kemurungan rendah.")
        : pct < 75
        ? Q("Consider routine, light & support.","建议调整作息与光照并寻求支持。","Pertimbang rutin, cahaya pagi & sokongan.")
        : Q("Seek help promptly.","建议尽快求助。","Dapatkan bantuan segera.");
      const tips = [
        Q("Morning light + short walk.","晨光 + 短步行。","Cahaya pagi + berjalan singkat."),
        Q("Tiny tasks: 5-min start.","5 分钟起步小任务。","Tugas kecil 5 minit untuk mula."),
      ].map((m) => m[lang]);
      return { level: lvl[lang], note: note[lang], tips };
    },
  },

  /* 3) ABC Personality */
  {
    id: "type_abc",
    icon: <AlertTriangle className="w-5 h-5" />,
    title: Q("Type A/BC Personality Health","ABC 性格类型健康度","Kesihatan Personaliti Jenis A/BC"),
    desc: Q("Tendencies that correlate with stress patterns.","不同性格倾向对应不同压力模式。","Kecenderungan yang berkait dengan corak stres."),
    questions: [
      { id: "q1", text: Q("I push myself to achieve quickly.","我常强迫自己高效率达成目标。","Saya menolak diri untuk capai dengan cepat.") },
      { id: "q2", text: Q("I remain calm when under pressure.","有压力也能保持冷静。","Saya kekal tenang ketika tertekan.") },
      { id: "q3", text: Q("I avoid expressing negative feelings.","我避免表达负面情绪。","Saya elak meluahkan emosi negatif.") },
      { id: "q4", text: Q("I get impatient when things are slow.","进展慢时不耐烦。","Saya hilang sabar bila lambat.") },
      { id: "q5", text: Q("I prefer balance over competition.","我偏向平衡与和谐。","Saya suka keseimbangan berbanding persaingan.") },
      { id: "q6", text: Q("I worry my needs burden others.","我担心表达需求会麻烦他人。","Saya risau keperluan saya membebankan orang lain.") },
    ],
    scale: scaleAgree,
    interpret(score, lang) {
      const pct = (score / (4 * 6)) * 100;
      const lvl = pct < 33 ? Q("Balanced / Type-B leaning","偏 B：相对平衡","Seimbang / cenderung Jenis-B")
        : pct < 66 ? Q("Mixed traits","混合倾向","Ciri bercampur")
                   : Q("Type-A leaning","偏 A：紧迫驱动","Cenderung Jenis-A");
      const tips = [
        Q("Type-A: schedule decompression blocks.","A 型：安排放松时间块。","Jenis-A: jadualkan masa nyahtekan."),
        Q("Type-C: practice safe expression.","C 型：练习安全表达。","Jenis-C: latih ekspresi selamat."),
      ].map((m) => m[lang]);
      return { level: lvl[lang], note: "", tips };
    },
  },

  /* 4) Stress */
  {
    id: "stress",
    icon: <Activity className="w-5 h-5" />,
    title: Q("Comprehensive Stress","心理压力综合评估","Penilaian Stres Menyeluruh"),
    desc: Q("How your body & mind carry load.","身心承压的整体状态。","Bagaimana badan & minda menanggung beban."),
    questions: [
      { id: "q1", text: Q("I feel overwhelmed by tasks.","我常被任务淹没。","Saya rasa terbeban oleh tugasan.") },
      { id: "q2", text: Q("I notice physical tension.","我常感觉身体紧绷。","Saya perasan ketegangan fizikal.") },
      { id: "q3", text: Q("Small issues upset me easily.","小事容易影响情绪。","Perkara kecil mudah mengganggu emosi.") },
      { id: "q4", text: Q("It's hard to switch off.","很难“关机”放空。","Sukar untuk ‘tutup’ fikiran.") },
      { id: "q5", text: Q("Pressure leads to procrastination.","压力导致我拖延。","Tekanan menyebabkan saya bertangguh.") },
    ],
    scale: scaleFreq,
    interpret(score, lang) {
      const pct = (score / (4 * 5)) * 100;
      const lvl = pct < 25 ? Q("Low","低","Rendah")
        : pct < 50 ? Q("Mild","轻度","Ringan")
        : pct < 75 ? Q("Moderate","中度","Sederhana")
                   : Q("High","高","Tinggi");
      const tips = [
        Q("Micro-breaks + stretch every hour.","每小时微休+拉伸。","Rehat mikro + regangan setiap jam."),
        Q("Protect deep-work blocks.","保护深度专注时段。","Lindungi blok kerja mendalam."),
      ].map((m) => m[lang]);
      return { level: lvl[lang], note: "", tips };
    },
  },

  /* 5) Subconscious Knots */
  {
    id: "subconscious",
    icon: <Anchor className="w-5 h-5" />,
    title: Q("Subconscious Knots","潜意识“心结”测评","Simpulan Bawah Sedar"),
    desc: Q("Patterns that may keep emotions stuck.","识别可能让情绪卡住的内在模式。","Corak yang mungkin ‘mengikat’ emosi."),
    questions: [
      { id: "q1", text: Q("Old memories still trigger me.","旧回忆仍强烈触发我。","Memori lama masih mencetus saya.") },
      { id: "q2", text: Q("I avoid certain topics/people.","我回避特定话题或人。","Saya mengelak topik/orang tertentu.") },
      { id: "q3", text: Q("I repeat emotional loops.","我陷入重复的情绪循环。","Saya mengulang kitaran emosi.") },
      { id: "q4", text: Q("I struggle to forgive.","我难以原谅。","Saya sukar memaafkan.") },
    ],
    scale: scaleFreq,
    interpret(score, lang) {
      const pct = (score / (4 * 4)) * 100;
      const lvl = pct < 25 ? Q("Open flow","较通畅","Aliran terbuka")
        : pct < 50 ? Q("Mild knots","轻度心结","Simpulan ringan")
        : pct < 75 ? Q("Stuck points","卡点明显","Titik tersekat")
                   : Q("Deep knots","较深心结","Simpulan mendalam");
      const tips = [
        Q("Journal + name the feeling.","写下并命名情绪。","Jurnal & namakan emosi."),
        Q("Guided work with support.","在支持下做引导练习。","Kerja berpandu dengan sokongan."),
      ].map((m) => m[lang]);
      return { level: lvl[lang], note: "", tips };
    },
  },

  /* 6) Insomnia */
  {
    id: "insomnia",
    icon: <Moon className="w-5 h-5" />,
    title: Q("Insomnia Assessment","失眠心理评估","Penilaian Insomnia"),
    desc: Q("Screens sleep initiation, maintenance, and restfulness.","评估入睡、维持与睡后恢复度。","Menilai permulaan, penyelenggaraan & kesegaran tidur."),
    questions: [
      { id: "q1", text: Q("I need a long time to fall asleep.","我入睡需要很久。","Saya mengambil masa lama untuk tidur.") },
      { id: "q2", text: Q("I wake up easily at night.","我夜间容易醒来。","Saya mudah terjaga pada waktu malam.") },
      { id: "q3", text: Q("I feel unrefreshed in the morning.","我早上醒来仍不清爽。","Saya tidak segar pada waktu pagi.") },
      { id: "q4", text: Q("I worry about not sleeping.","我会因担心睡不好而焦虑。","Saya risau tentang tidak dapat tidur.") },
    ],
    scale: scaleFreq,
    interpret(score, lang) {
      const pct = (score / (4 * 4)) * 100;
      const lvl = pct < 25 ? Q("Restful","休息良好","Rehat baik")
        : pct < 50 ? Q("Mild issue","轻度困扰","Isu ringan")
        : pct < 75 ? Q("Moderate issue","中度困扰","Isu sederhana")
                   : Q("Severe issue","较重困扰","Isu teruk");
      const tips = [
        Q("Consistent wake time.","固定起床时间。","Masa bangun yang konsisten."),
        Q("Light + caffeine timing.","光照与咖啡因时机。","Cahaya pagi & masa kafein."),
      ].map((m) => m[lang]);
      return { level: lvl[lang], note: "", tips };
    },
  },

  /* 7) Burnout Risk */
  {
    id: "burnout",
    icon: <BookOpen className="w-5 h-5" />,
    title: Q("Burnout Risk","学习/工作倦怠风险","Risiko Keletihan (Burnout)"),
    desc: Q("Emotional exhaustion, cynicism, and efficacy.","情绪耗竭、玩世不恭、效能感。","Keletihan emosi, sinisme & keberkesanan."),
    questions: [
      { id: "q1", text: Q("I feel emotionally drained by my workload.","工作量让我情绪耗竭。","Saya berasa letih emosi oleh beban kerja.") },
      { id: "q2", text: Q("I feel cynical or distant about tasks.","我对任务感到冷漠/疏离。","Saya sinis atau jauh daripada tugasan.") },
      { id: "q3", text: Q("I doubt the value of what I do.","我怀疑自己做事的价值。","Saya meragui nilai apa yang saya lakukan.") },
      { id: "q4", text: Q("I rarely feel accomplished.","我很少有成就感。","Saya jarang rasa berjaya.") },
      { id: "q5", text: Q("I postpone because I'm exhausted.","因疲惫而一拖再拖。","Saya menangguh kerana keletihan.") },
    ],
    scale: scaleFreq,
    interpret(score, lang) {
      const pct = (score / (4 * 5)) * 100;
      const lvl = pct < 25 ? Q("Low","低","Rendah")
        : pct < 50 ? Q("Mild","轻度","Ringan")
        : pct < 75 ? Q("Moderate","中度","Sederhana")
                   : Q("High","高","Tinggi");
      const tips = [
        Q("Re-scope tasks: 50-80% rule.","缩小任务范围：50-80% 规则。","Skop semula tugasan: peraturan 50-80%."),
        Q("Insert recovery blocks.","加入恢复区块。","Masukkan blok pemulihan."),
      ].map((m)=>m[lang]);
      return { level: lvl[lang], note: "", tips };
    },
  },

  /* 8) Mindfulness Snapshot */
  {
    id: "mindfulness",
    icon: <Sparkles className="w-5 h-5" />,
    title: Q("Mindfulness Snapshot","当下觉察快照","Gambaran Kesedaran"),
    desc: Q("Attention, presence, non-judgmental noticing.","注意力、在场、无评判的观察。","Perhatian, kehadiran, pemerhatian tanpa menghukum."),
    questions: [
      { id: "q1", text: Q("I notice my breath when stressed.","紧张时我会觉察呼吸。","Saya perasan nafas ketika tertekan.") },
      { id: "q2", text: Q("I can return to the present gently.","我能温和回到当下。","Saya boleh kembali ke saat ini dengan lembut.") },
      { id: "q3", text: Q("I observe feelings without fusing.","我能观察情绪而不被卷入。","Saya memerhati emosi tanpa melekat.") },
      { id: "q4", text: Q("I notice body sensations.","我能觉察身体感受。","Saya peka terhadap sensasi tubuh.") },
    ],
    scale: scaleAgree,
    interpret(score, lang) {
      const pct = (score / (4 * 4)) * 100;
      const lvl = pct < 25 ? Q("Limited","较低","Terhad")
        : pct < 50 ? Q("Emerging","起步","Mula berkembang")
        : pct < 75 ? Q("Developing","发展中","Sedang berkembang")
                   : Q("Strong","良好","Kukuh");
      const tips = [
        Q("3-minute breathing space.","3 分钟呼吸空间。","Ruang pernafasan 3 minit."),
        Q("Body-scan before sleep.","睡前身体扫描。","Imbasan badan sebelum tidur."),
      ].map((m)=>m[lang]);
      return { level: lvl[lang], note: "", tips };
    },
  },

  /* 9) Social Support */
  {
    id: "support",
    icon: <HeartHandshake className="w-5 h-5" />,
    title: Q("Social Support","社会支持度","Sokongan Sosial"),
    desc: Q("Perceived availability of care & help.","感知可获得的关心与帮助。","Persepsi ketersediaan bantuan & peduli."),
    questions: [
      { id: "q1", text: Q("I have people I can talk to openly.","我有可以坦诚交谈的人。","Saya ada orang untuk berbual secara terbuka.") },
      { id: "q2", text: Q("I could get practical help if needed.","需要时能获得实际帮助。","Saya boleh dapat bantuan praktikal jika perlu.") },
      { id: "q3", text: Q("I feel cared for by someone.","我感到被某些人关心。","Saya rasa ada yang mengambil berat.") },
      { id: "q4", text: Q("I don't feel alone with problems.","面对问题我不孤单。","Saya tidak berasa bersendirian dengan masalah.") },
    ],
    scale: scaleAgree,
    interpret(score, lang) {
      const pct = (score / (4 * 4)) * 100;
      const lvl = pct < 25 ? Q("Low","低","Rendah")
        : pct < 50 ? Q("Limited","有限","Terhad")
        : pct < 75 ? Q("Good","良好","Baik")
                   : Q("Strong","强","Kukuh");
      const tips = [
        Q("Name 3 safe contacts.","写下 3 位安全联系人。","Namakan 3 kenalan selamat."),
        Q("Schedule small check-ins.","安排小型关怀互联。","Jadualkan semakan ringkas."),
      ].map((m)=>m[lang]);
      return { level: lvl[lang], note: "", tips };
    },
  },
];

/* ------------ MH Screening: dimension mapping + helpers (radar) ------------ */
const MH_DIM = {
  dep: ["q1","q4","q8"],   // 抑郁
  anx: ["q2","q5","q7"],   // 焦虑
  sen: ["q3","q6"],        // 人际敏感
} as const;
type MhKey = keyof typeof MH_DIM;

const MH_LABEL: Record<MhKey, Record<Lang, string>> = {
  dep: { zh: "抑郁", en: "Depression", ms: "Kemurungan" },
  anx: { zh: "焦虑", en: "Anxiety", ms: "Keresahan" },
  sen: { zh: "人际敏感", en: "Interpersonal Sensitivity", ms: "Sensitiviti Interpersonal" },
};

function levelFromPct(pct: number, lang: Lang) {
  const zh = pct < 25 ? "低" : pct < 50 ? "轻度" : pct < 75 ? "中度" : "重度";
  const en = pct < 25 ? "Low" : pct < 50 ? "Mild" : pct < 75 ? "Moderate" : "Severe";
  const ms = pct < 25 ? "Rendah" : pct < 50 ? "Ringan" : pct < 75 ? "Sederhana" : "Teruk";
  return lang === "zh" ? zh : lang === "ms" ? ms : en;
}
function badgeColor(levelZh: string) {
  if (levelZh === "低") return "#22c55e";
  if (levelZh === "轻度") return "#3b82f6";
  if (levelZh === "中度") return "#f59e0b";
  return "#ef4444";
}
function calcMhDims(answers: Record<string, number>, lang: Lang) {
  const out: { key: MhKey; label: string; score: number; max: number; pct: number; lvlZh: string; lvl: string }[] = [];
  (Object.keys(MH_DIM) as MhKey[]).forEach((k) => {
    const ids = MH_DIM[k];
    const max = 4 * ids.length;
    const score = ids.reduce((s, id) => s + (Number.isFinite(answers[id]) ? (answers[id] as number) : 0), 0);
    const pct = Math.round((score / max) * 100);
    out.push({ key: k, label: MH_LABEL[k][lang], score, max, pct, lvlZh: levelFromPct(pct, "zh"), lvl: levelFromPct(pct, lang) });
  });
  return out;
}
function renderRadarSVG(dims: { pct: number; label: string }[]) {
  const size = 260, cx = 130, cy = 130, rMax = 90, N = dims.length;
  const rings = [0.33, 0.66, 1.0];
  const toXY = (i: number, pct: number) => {
    const ang = -Math.PI/2 + (2*Math.PI*i)/N;
    const r = (pct/100) * rMax;
    return [cx + r*Math.cos(ang), cy + r*Math.sin(ang)];
  };

  const area = dims.map((d,i)=>toXY(i,d.pct)).map(([x,y])=>`${x},${y}`).join(" ");

  // 轴线 + 标签（白色）
  const axes = dims.map((d,i)=>{
    const [x,y] = toXY(i,100); const [lx,ly] = toXY(i,114);
    return `
      <line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="rgba(255,255,255,.18)"/>
      <text x="${lx}" y="${ly}" font-size="12" text-anchor="middle" fill="rgba(255,255,255,.9)">${d.label}</text>`;
  }).join("");

  // 同心圆（白色，低不透明度）
  const circles = rings
    .map(rr => `<circle cx="${cx}" cy="${cy}" r="${rMax*rr}" fill="none" stroke="rgba(255,255,255,.12)"/>`)
    .join("");

  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0%" stop-color="#9ecbff" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#b3c7ff" stop-opacity="0.85"/>
    </linearGradient>
  </defs>
  ${circles}
  ${axes}
  <polygon points="${area}" fill="url(#g)" fill-opacity="0.45" stroke="rgba(147,197,253,.9)" stroke-width="2"/>
</svg>`;
}


/* ----------------------- Component ----------------------- */
export default function QuizHub({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [lang, setLang] = useState<Lang>("en");
  const [active, setActive] = useState<QuizDef | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{ score: number; level: string; note: string; tips: string[] } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (active) { setActive(null); setAnswers({}); setResult(null); }
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, onClose]);

  const canSubmit = useMemo(
    () => active?.questions.every((q) => typeof answers[q.id] === "number") ?? false,
    [active, answers]
  );

  const totalScore = useMemo(
    () => Object.values(answers).reduce((a, b) => a + (Number.isFinite(b) ? (b as number) : 0), 0),
    [answers]
  );

  const startQuiz = (q: QuizDef) => { setActive(q); setAnswers({}); setResult(null); };
  const submitQuiz = () => {
    if (!active) return;
    const r = active.interpret(totalScore, lang);
    setResult({ score: totalScore, ...r });
    setTimeout(()=>window.scrollTo({ top: 0, behavior: "smooth" }), 0);
  };
  const restart = () => { setAnswers({}); setResult(null); };

  const exportReport = () => {
    if (!active || !result) return;
    const max = active.scale[active.scale.length - 1].value * active.questions.length;
    const pct = Math.round((result.score / max) * 100);
    const title = active.title[lang];

    const tipsHtml = result.tips.map(t => `<span class="chip">${t}</span>`).join("");
    const qaHtml = active.questions.map(q => {
      const v = answers[q.id];
      const lab = active.scale.find(s => s.value === v)?.label[lang] ?? "-";
      return `<li>${q.text[lang]} — <b>${lab}</b></li>`;
    }).join("");

    const noteHtml = result.note ? `<p style="opacity:.9">${result.note}</p>` : "";

    const html = `
      <html><head><meta charset="utf-8"><title>${title} — Report</title>
      <style>
        body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica Neue,Arial;color:#111;background:#0b1222;margin:0}
        .wrap{max-width:720px;margin:40px auto;padding:24px;border-radius:16px;background:rgba(255,255,255,.06);backdrop-filter:blur(12px);color:#fff}
        h1{margin:0 0 12px;font-size:22px}
        .bar{height:12px;border-radius:8px;background:rgba(255,255,255,.15);overflow:hidden}
        .in{height:100%;background:linear-gradient(90deg,#fff,#aee);width:${pct}%}
        .chip{display:inline-block;margin:6px 6px 0 0;padding:6px 10px;border:1px solid rgba(255,255,255,.25);border-radius:999px}
        ul{margin:10px 0 0 18px}
      </style></head><body>
      <div class="wrap">
        <h1>${title}</h1>
        <div>${L(lang, label.total)}: <b>${result.score}</b> / ${max} &nbsp;&nbsp; ${L(lang, label.level)}: <b>${result.level}</b></div>
        <div style="margin:12px 0 16px" class="bar"><div class="in"></div></div>
        ${noteHtml}
        <div>${tipsHtml}</div>
        <h3 style="margin-top:18px">Q&A</h3>
        <ul>${qaHtml}</ul>
      </div></body></html>
    `;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
  };

  const copyText = async () => {
    if (!active || !result) return;
    const max = active.scale[active.scale.length - 1].value * active.questions.length;
    const pct = Math.round((result.score / max) * 100);

    const qa = active.questions.map(q => {
      const v = answers[q.id];
      const lab = active.scale.find(s => s.value === v)?.label[lang] ?? "-";
      return `• ${q.text[lang]} — ${lab}`;
    }).join("\n");

    const txt =
`${active.title[lang]}
${L(lang, label.total)}: ${result.score}/${max} (${pct}%)
${L(lang, label.level)}: ${result.level}
${result.note ? result.note + "\n" : ""}Tips:
- ${result.tips.join("\n- ")}

Q&A:
${qa}
`;
    await navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(()=>setCopied(false), 1200);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] text-white">
      {/* 背景 & 动态光斑 */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(40,80,140,0.24),transparent_60%),linear-gradient(180deg,#061224_0%,#0a1a2f_60%,#02060c_100%)]" />
      <div className="absolute inset-0 backdrop-blur-[6px]" />
      <div
        className="pointer-events-none absolute -top-20 -left-10 w-[40vw] h-[40vw] rounded-full opacity-25 blur-3xl animate-pulse"
        style={{ background: "radial-gradient(circle, rgba(147,197,253,0.25), rgba(0,0,40,0) 70%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-24 -right-10 w-[45vw] h-[45vw] rounded-full opacity-25 blur-3xl animate-[pulse_5s_ease-in-out_infinite]"
        style={{ background: "radial-gradient(circle, rgba(180,160,255,0.22), rgba(0,0,40,0) 70%)" }}
      />

      {/* 可滚动容器 */}
      <div className="relative h-full overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: "touch" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-24">
          {/* 顶栏 sticky */}
          <div className={`sticky top-0 z-10 ${glass} rounded-2xl px-3 sm:px-4 h-12 sm:h-14 flex items-center justify-between shadow-[0_10px_40px_rgba(0,0,0,0.35)]`}>
            <div className="flex items-center gap-2">
              {active ? (
                <button onClick={() => { setActive(null); setAnswers({}); setResult(null); }} className="w-9 h-9 grid place-items-center rounded-full hover:bg-white/10" aria-label="Back">
                  <ChevronLeft className="w-5 h-5" />
                </button>
              ) : (
                <button onClick={onClose} className="w-9 h-9 grid place-items-center rounded-full hover:bg-white/10" aria-label="Close">
                  <X className="w-5 h-5" />
                </button>
              )}
              <div className="text-lg sm:text-xl tracking-[0.18em] font-semibold">
                {active ? L(lang, label.quiz) : L(lang, label.hub)}
              </div>
            </div>
            <button
              onClick={() => setLang((v) => (v === "en" ? "zh" : v === "zh" ? "ms" : "en"))}
              className="h-9 pl-4 pr-3 rounded-full border border-white/25 bg-white/10 hover:bg-white/15 flex items-center gap-2 text-sm"
            >
              {lang === "en" ? label.language.en : lang === "zh" ? label.language.zh : label.language.ms}
              <Globe className="w-4 h-4 opacity-90" />
            </button>
          </div>

          {/* 主体 */}
          <div className="mt-5">
            {!active ? (
              <div className={`rounded-2xl ${glass} p-4 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]`}>
                <div className="grid sm:grid-cols-2 gap-4">
                  {QUIZZES.map((q, i) => (
                    <button
                      key={q.id}
                      onClick={() => startQuiz(q)}
                      className={`text-left rounded-2xl ${glassSoft} ${cardHover} p-5 border-white/10 group relative overflow-hidden`}
                    >
                      <span className="pointer-events-none absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10 blur-2xl opacity-0 group-hover:opacity-100 transition" />
                      <div className="flex items-center gap-3">
                        <div className="grid place-items-center w-10 h-10 rounded-2xl bg-white/10 border border-white/20">
                          <span
                            className="opacity-95 animate-[float_5s_ease-in-out_infinite] translate-y-0"
                            style={{ animationDelay: `${i * 0.2}s` }}
                          >
                            {q.icon ?? <Activity className="w-5 h-5" />}
                          </span>
                        </div>
                        <div className="text-base sm:text-lg font-semibold leading-tight">{q.title[lang]}</div>
                      </div>
                      <p className="mt-2 text-sm text-white/80 leading-relaxed">{q.desc[lang]}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className={`rounded-2xl ${glass} p-4 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]`}>
                {/* 头部 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid place-items-center w-10 h-10 rounded-2xl bg-white/10 border border-white/20">
                      {active.icon ?? <Activity className="w-5 h-5" />}
                    </div>
                    <div className="text-lg font-semibold">{active.title[lang]}</div>
                  </div>
                  <div className="text-xs text-white/80">{Object.keys(answers).length}/{active.questions.length}</div>
                </div>

                {/* 题目 */}
                {!result && (
                  <div className="mt-4 space-y-4">
                    {active.questions.map((q, idx) => (
                      <div key={q.id} className={`rounded-xl ${glassSoft} p-4 relative overflow-hidden`}>
                        <span className="pointer-events-none absolute -left-6 -bottom-6 w-24 h-24 rounded-full bg-white/5 blur-2xl" />
                        <div className="text-white text-[15px] flex items-start gap-2">
                          <span className="opacity-70 mt-0.5">{idx+1}.</span> {q.text[lang]}
                        </div>
                        <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {active.scale.map((opt) => {
                            const checked = answers[q.id] === opt.value;
                            return (
                              <label
                                key={opt.value}
                                className={`cursor-pointer rounded-lg border px-3 py-2 text-sm
                                ${checked ? "bg-white text-black border-white" : "bg-white/10 border-white/20 hover:bg-white/15"}`}
                              >
                                <input
                                  type="radio"
                                  name={q.id}
                                  className="hidden"
                                  checked={checked}
                                  onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.value }))}
                                />
                                {opt.label[lang]}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 结果 / 提交 -> 报告页 */}
                {result ? (
                  <div className="mt-6">
                    <ReportView quiz={active} answers={answers} result={result} lang={lang} />
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button onClick={restart} className="h-10 px-4 rounded-xl bg-white text-black border border-white/25 hover:bg-white/90">
                        {L(lang, label.retake)}
                      </button>
                      <button onClick={() => { setActive(null); setAnswers({}); setResult(null); }} className="h-10 px-4 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15">
                        {L(lang, label.backList)}
                      </button>
                     <button onClick={exportReport} className="h-10 px-4 rounded-xl border border-white/25 bg-white/10 hover:bg-white/15 inline-flex items-center gap-2">
  <BookOpen className="w-4 h-4" /> {L(lang, label.export)}
</button>
<button onClick={copyText} className="h-10 px-4 rounded-xl border border-white/25 bg-white/10 hover:bg-white/15">
  {copied ? L(lang, label.copied) : L(lang, label.copyText)}
</button>

                    </div>
                  </div>
                ) : (
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-xs text-white/75">{L(lang, label.tipOne)}</div>
                    <button
                      onClick={submitQuiz}
                      disabled={!canSubmit}
                      className={`h-10 px-5 rounded-xl font-medium border
                        ${canSubmit ? "bg-white text-black border-white hover:bg-white/90" : "bg-white/15 text-white/60 border-white/20 cursor-not-allowed"}`}
                    >
                      {L(lang, label.viewRes)}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 底部光斑 */}
          <div
            className="pointer-events-none mt-10 h-32 rounded-3xl blur-3xl opacity-60"
            style={{ background: "radial-gradient(circle, rgba(147,197,253,0.20), rgba(0,0,40,0) 70%)" }}
          />
        </div>
      </div>

      {/* 局部动画 keyframes */}
      <style>{`
        @keyframes float { 0%,100%{ transform: translateY(0) } 50%{ transform: translateY(-4px) } }
        @keyframes pulse { 0%,100%{ opacity:.25 } 50%{ opacity:.45 } }
      `}</style>
    </div>
  );
}

/* ----------------------- Per-quiz Report View ----------------------- */
function ReportView({
  quiz, answers, result, lang
}: {
  quiz: QuizDef;
  answers: Record<string, number>;
  result: { score: number; level: string; note: string; tips: string[] };
  lang: Lang;
}) {
  const max = quiz.scale[quiz.scale.length - 1].value * quiz.questions.length;

  if (quiz.id === "mh_screen") {
    const dims = calcMhDims(answers, lang);
    const radarSvg = renderRadarSVG(dims.map(d => ({ pct: d.pct, label: d.label })));

    const TEXTS: Record<MhKey, Record<Lang, string>> = {
      dep: {
        zh: "近段时间可能存在情绪低落/兴趣减退的迹象。建议记录情绪、安排小任务并适度运动；如有需要，考虑寻求专业支持。",
        en: "You may show low mood / reduced interest. Keep a mood log, plan small tasks and consider professional support if needed.",
        ms: "Mungkin terdapat tanda mood rendah / minat berkurang. Catat mood, rancang tugasan kecil dan pertimbangkan sokongan profesional."
      },
      anx: {
        zh: "出现明显紧张不安等焦虑表现。建议尽快学习放松训练并评估近期开销/任务，必要时寻求专业帮助。",
        en: "Noticeable anxiety (tension, restlessness). Practice relaxation, reduce near-term load and seek professional help promptly if needed.",
        ms: "Keresahan ketara. Amalkan relaksasi, kurangkan beban terdekat dan dapatkan bantuan profesional jika perlu."
      },
      sen: {
        zh: "在人际互动中更容易出现在意评价/回避。建议进行安全的人际连结与温和表达练习，建立边界感与自我肯定。",
        en: "More sensitive in interactions. Try safe check-ins, gentle expression and boundaries with self-affirmation.",
        ms: "Lebih sensitif dalam interaksi. Lakukan semakan sosial selamat, ekspresi lembut dan sempadan diri."
      }
    };

    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-white/10 border border-white/15 p-4">
          <ScoreBar title={`${L(lang, label.total)}: ${result.score} / ${max}`} value={result.score} max={max} />
          <div className="mt-2">
            {L(lang, label.level)}：<span className="font-semibold">{result.level}</span>
          </div>
          {result.note && <div className="mt-2 text-sm text-white/90 leading-relaxed">{result.note}</div>}
          <div className="mt-3 flex flex-wrap gap-2">
            {result.tips.map((t,i)=>(
              <span key={i} className="px-3 py-1 rounded-full border border-white/25 bg-white/10 text-xs">{t}</span>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-white/10 border border-white/15 p-4">
          <div
            className="w-full grid place-items-center"
            dangerouslySetInnerHTML={{ __html: radarSvg }}
          />
        </div>

        {dims.map((d, idx) => (
          <div key={d.key} className="rounded-xl bg-white/10 border border-white/15 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{idx===0 ? "🙂" : idx===1 ? "😣" : "😕"}</span>
                <div className="text-base font-semibold">{d.label}</div>
              </div>
              <span
                className="text-xs px-2 py-0.5 rounded-full border"
                style={{ borderColor: badgeColor(d.lvlZh), color: badgeColor(d.lvlZh) }}
              >
                {d.lvl}
              </span>
            </div>
            <div className="mt-2 text-sm leading-relaxed text-white/90">
              {TEXTS[d.key][lang]}
            </div>
          </div>
        ))}

        <div className="rounded-xl bg-white/10 border border-white/15 p-4">
          <div className="font-semibold mb-2">Q&A</div>
          <ul className="list-disc pl-5 space-y-1">
            {quiz.questions.map((q)=> {
              const v = answers[q.id];
              const lab = quiz.scale.find(s=>s.value===v)?.label[lang] ?? "-";
              return <li key={q.id} className="text-sm">{q.text[lang]} — <b>{lab}</b></li>;
            })}
          </ul>
        </div>
      </div>
    );
  }

  const pct = Math.max(0, Math.min(100, Math.round((result.score / max) * 100)));
  const lvlZhForColor = levelFromPct(pct, "zh");
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white/10 border border-white/15 p-4">
        <ScoreBar title={`${L(lang, label.total)}: ${result.score} / ${max}`} value={result.score} max={max}/>
        <div className="mt-2 flex items-center gap-2">
          <div>{L(lang, label.level)}：</div>
          <span
            className="text-xs px-2 py-0.5 rounded-full border"
            style={{ borderColor: badgeColor(lvlZhForColor), color: badgeColor(lvlZhForColor) }}
          >
            {result.level}
          </span>
        </div>
        {result.note && <div className="mt-2 text-sm text-white/90 leading-relaxed">{result.note}</div>}
        <div className="mt-3 flex flex-wrap gap-2">
          {result.tips.map((t,i)=>(
            <span key={i} className="px-3 py-1 rounded-full border border-white/25 bg-white/10 text-xs">{t}</span>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-white/10 border border-white/15 p-4">
        <div className="font-semibold mb-2">Q&A</div>
        <ul className="list-disc pl-5 space-y-1">
          {quiz.questions.map((q)=> {
            const v = answers[q.id];
            const lab = quiz.scale.find(s=>s.value===v)?.label[lang] ?? "-";
            return <li key={q.id} className="text-sm">{q.text[lang]} — <b>{lab}</b></li>;
          })}
        </ul>
      </div>
    </div>
  );
}

/* ---------- small sub component ---------- */
function ScoreBar({ title, value, max }: { title: string; value: number; max: number }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return (
    <div>
      <div className="text-sm mb-1">
        {title} <span className="opacity-80">({pct}%)</span>
      </div>
      <div className="h-3 rounded-full bg-white/15 overflow-hidden">
        <div
          className="h-full bg-white"
          style={{ width: `${pct}%`, transition: "width .6s ease" }}
        />
      </div>
    </div>
  );
}
