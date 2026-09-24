(() => {
const {
  buildTsv,
  formatDateInput,
  formatStartDate,
  parseDateInput,
  parseWeekInput,
  weekFromDate,
} = globalThis.WeekCalc;

const byId = (id) => document.getElementById(id);
const shell = byId("appShell");
const panels = {
  week: byId("weekPanel"),
  date: byId("datePanel"),
  batch: byId("batchPanel"),
};
const modeButtons = [...document.querySelectorAll(".mode-button")];
const weekInput = byId("weekInput");
const dateInput = byId("dateInput");
const startWeek = byId("startWeek");
const endWeek = byId("endWeek");
const tsvOutput = byId("tsvOutput");
let todayInfo;
let weekResultInfo;
let dateResultInfo;

function switchMode(mode) {
  for (const [name, panel] of Object.entries(panels)) {
    panel.hidden = name !== mode;
  }
  for (const button of modeButtons) {
    const active = button.dataset.mode === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  }
  if (mode !== "batch" && shell.classList.contains("is-wide")) {
    setWide(false);
  }
}

function setWide(wide) {
  shell.classList.toggle("is-wide", wide);
  byId("wideButton").setAttribute("aria-pressed", String(wide));
  byId("wideButton").textContent = wide ? "標準幅に戻す" : "広く表示";
}

function updateToday() {
  const now = new Date();
  todayInfo = weekFromDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
  byId("todayDate").textContent = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
  byId("todayWeek").textContent = todayInfo.week;
  byId("todayCode").textContent = todayInfo.id;
  byId("todayStart").textContent = formatStartDate(todayInfo.startDate);
}

function updateWeek() {
  const value = weekInput.value.trim();
  const card = byId("weekResultCard");
  const result = byId("weekResult");
  const meta = byId("weekResultMeta");
  weekResultInfo = undefined;
  byId("speakWeek").hidden = true;
  meta.textContent = "";
  if (!value || value.normalize("NFKC").replace(/\s+/g, "").length < 6) {
    card.dataset.state = "empty";
    result.textContent = "週番を入力してください";
    return;
  }
  try {
    const info = parseWeekInput(value);
    weekResultInfo = info;
    card.dataset.state = "ready";
    result.textContent = formatStartDate(info.startDate);
    meta.textContent = `${info.id} ・ ${info.fiscalYear}年度 第${info.week}週`;
    byId("speakWeek").hidden = !canSpeak;
  } catch (error) {
    card.dataset.state = "error";
    result.textContent = error.message;
  }
}

function updateDate() {
  const card = byId("dateResultCard");
  const result = byId("dateResult");
  const meta = byId("dateResultMeta");
  dateResultInfo = undefined;
  byId("speakDate").hidden = true;
  if (!dateInput.value) {
    card.dataset.state = "empty";
    result.textContent = "日付を選択してください";
    meta.textContent = "";
    return;
  }
  try {
    const { year, month, day } = parseDateInput(dateInput.value);
    const info = weekFromDate(year, month, day);
    dateResultInfo = info;
    card.dataset.state = "ready";
    result.textContent = `${info.id}（${info.week}週）`;
    meta.textContent = `${info.fiscalYear}年度 ・ ${formatStartDate(info.startDate)}`;
    byId("speakDate").hidden = !canSpeak;
  } catch (error) {
    card.dataset.state = "error";
    result.textContent = error.message;
    meta.textContent = "";
  }
}

function resetBatchOutput() {
  byId("batchOutputWrap").hidden = true;
  tsvOutput.value = "";
  byId("batchMessage").textContent = "開始週と終了週を指定して生成してください。";
  byId("batchMessage").classList.remove("is-error");
}

function generateBatch(event) {
  event.preventDefault();
  const message = byId("batchMessage");
  try {
    const { text, count } = buildTsv(startWeek.value, endWeek.value);
    tsvOutput.value = text;
    tsvOutput.scrollLeft = 0;
    byId("batchCount").textContent = `${count}週分`;
    byId("batchOutputWrap").hidden = false;
    message.textContent = "Excelの左上のセルを選んで貼り付けられます。";
    message.classList.remove("is-error");
  } catch (error) {
    byId("batchOutputWrap").hidden = true;
    message.textContent = error.message;
    message.classList.add("is-error");
  }
}

async function copyTsv() {
  const message = byId("batchMessage");
  let copied = false;
  try {
    await navigator.clipboard.writeText(tsvOutput.value);
    copied = true;
  } catch {
    tsvOutput.focus();
    tsvOutput.select();
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }
  }
  message.textContent = copied
    ? "コピーしました。Excelの左上のセルに貼り付けてください。"
    : "コピーできませんでした。下のTSVを選択してコピーしてください。";
  message.classList.toggle("is-error", !copied);
}

const canSpeak = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

function speak(info) {
  if (!canSpeak || !info) return;
  const date = info.startDate;
  const spokenText = `${info.fiscalYear}年度、第${info.week}週。${date.getUTCFullYear()}年${date.getUTCMonth() + 1}月${date.getUTCDate()}日、月曜日開始です。`;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(spokenText);
  utterance.lang = "ja-JP";
  utterance.rate = 0.95;
  const japaneseVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith("ja"));
  if (japaneseVoice) utterance.voice = japaneseVoice;
  window.speechSynthesis.speak(utterance);
}

for (const button of modeButtons) {
  button.addEventListener("click", () => switchMode(button.dataset.mode));
}
weekInput.addEventListener("input", updateWeek);
dateInput.addEventListener("input", updateDate);
dateInput.addEventListener("change", updateDate);
startWeek.addEventListener("input", resetBatchOutput);
endWeek.addEventListener("input", resetBatchOutput);
byId("batchForm").addEventListener("submit", generateBatch);
byId("copyButton").addEventListener("click", copyTsv);
byId("wideButton").addEventListener("click", () => setWide(!shell.classList.contains("is-wide")));
byId("speakToday").addEventListener("click", () => speak(todayInfo));
byId("speakWeek").addEventListener("click", () => speak(weekResultInfo));
byId("speakDate").addEventListener("click", () => speak(dateResultInfo));

if (canSpeak) byId("speakToday").hidden = false;
if (typeof shell.requestFullscreen === "function") {
  const fullscreenButton = byId("fullscreenButton");
  fullscreenButton.hidden = false;
  fullscreenButton.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await shell.requestFullscreen();
      }
    } catch {
      byId("batchMessage").textContent = "全画面表示に切り替えられませんでした。広く表示をお試しください。";
    }
  });
  document.addEventListener("fullscreenchange", () => {
    fullscreenButton.textContent = document.fullscreenElement ? "全画面を終了" : "全画面";
  });
}

updateToday();
const now = new Date();
dateInput.value = formatDateInput(now.getFullYear(), now.getMonth() + 1, now.getDate());
updateDate();
updateWeek();
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) updateToday();
});

const params = new URLSearchParams(window.location.search);
if (params.has("week")) {
  weekInput.value = params.get("week");
  updateWeek();
} else if (params.has("date")) {
  dateInput.value = params.get("date");
  updateDate();
  switchMode("date");
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
})();
