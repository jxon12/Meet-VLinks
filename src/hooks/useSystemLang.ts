export function useSystemLang() {
  let lang = "en";
  try {
    lang = (navigator.language || "en").split("-")[0].toLowerCase();
  } catch {}

  const supported = ["en", "zh", "ms"];
  return supported.includes(lang) ? lang : "en";
}
