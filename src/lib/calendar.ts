// Google 日程链接
export function googleCalendarUrl(opts: {
  title: string; details?: string; startISO: string; endISO?: string;
}) {
  const { title, details = "", startISO, endISO } = opts;
  // Google 需要 UTC 无分隔形式
  const toG = (iso: string) => iso.replace(/[-:]/g, "").split(".")[0] + "Z";
  const start = toG(startISO);
  const end   = toG(endISO || new Date(new Date(startISO).getTime() + 30*60*1000).toISOString());
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    details,
    dates: `${start}/${end}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Apple/本地日历：生成 .ics 文本（可触发下载）
export function buildICS(opts: {
  uid?: string;
  title: string;
  startISO: string;
  endISO?: string;
  description?: string;
}) {
  const { uid = crypto.randomUUID(), title, startISO, endISO, description = "" } = opts;
  const fmt = (d: string) => d.replace(/[-:]/g, "").split(".")[0] + "Z";
  const dtStart = fmt(startISO);
  const dtEnd = fmt(endISO || new Date(new Date(startISO).getTime() + 30*60*1000).toISOString());
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Vlinks//ToDo//EN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${fmt(new Date().toISOString())}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeICS(title)}`,
    `DESCRIPTION:${escapeICS(description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
function escapeICS(s: string) {
  return s.replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\n/g,"\\n");
}
