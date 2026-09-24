(() => {
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

function makeUtcDate(year, month, day) {
  // Date.UTC interprets years 0–99 as 1900–1999, so set the year explicitly.
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return date;
}

function assertYear(year) {
  if (!Number.isInteger(year) || year < 1 || year > 9999) {
    throw new RangeError("年度は0001～9999の4桁で入力してください。");
  }
}

function assertCalendarDate(year, month, day) {
  // A week in fiscal year 9999 can start in calendar year 10000.
  if (!Number.isInteger(year) || year < 1 || year > 10000 ||
      !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new RangeError("日付を確認してください。");
  }
  const date = makeUtcDate(year, month, day);
  if (date.getUTCFullYear() !== year ||
      date.getUTCMonth() + 1 !== month ||
      date.getUTCDate() !== day) {
    throw new RangeError("日付を確認してください。");
  }
  return date;
}

function fiscalStartUnchecked(year) {
  const marchFirst = makeUtcDate(year, 3, 1);
  const daysSinceMonday = (marchFirst.getUTCDay() + 6) % 7;
  return new Date(marchFirst.getTime() - daysSinceMonday * DAY_MS);
}

function fiscalYearStart(year) {
  assertYear(year);
  return fiscalStartUnchecked(year);
}

function weeksInFiscalYear(year) {
  assertYear(year);
  return (fiscalStartUnchecked(year + 1) - fiscalStartUnchecked(year)) / WEEK_MS;
}

function weekFromParts(fiscalYear, week) {
  assertYear(fiscalYear);
  const count = weeksInFiscalYear(fiscalYear);
  if (!Number.isInteger(week) || week < 1 || week > count) {
    throw new RangeError(`${fiscalYear}年度は第1週～第${count}週です。`);
  }
  return {
    fiscalYear,
    week,
    id: `${String(fiscalYear).padStart(4, "0")}${String(week).padStart(2, "0")}`,
    startDate: new Date(fiscalStartUnchecked(fiscalYear).getTime() + (week - 1) * WEEK_MS),
  };
}

function weekFromDate(year, month, day) {
  const date = assertCalendarDate(year, month, day);
  const currentYearStart = fiscalStartUnchecked(year);
  const fiscalYear = date >= currentYearStart ? year : year - 1;
  if (fiscalYear < 1) {
    throw new RangeError("この日付の年度は対応範囲外です。");
  }
  const week = Math.floor((date - fiscalStartUnchecked(fiscalYear)) / WEEK_MS) + 1;
  return weekFromParts(fiscalYear, week);
}

function parseWeekInput(value) {
  const normalized = String(value).normalize("NFKC").replace(/\s+/g, "").trim();
  let match = /^(\d{4})(\d{2})$/.exec(normalized);
  if (!match) {
    match = /^(\d{4})(?:年(?:度)?|年度|[-/・.])第?(\d{1,2})週?$/.exec(normalized);
  }
  if (!match) {
    throw new Error("週番は「202525」または「2025年25週」で入力してください。");
  }
  return weekFromParts(Number(match[1]), Number(match[2]));
}

function parseDateInput(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  if (!match) {
    throw new Error("日付を選択してください。");
  }
  const [year, month, day] = match.slice(1).map(Number);
  assertCalendarDate(year, month, day);
  return { year, month, day };
}

function formatDateInput(year, month, day) {
  assertCalendarDate(year, month, day);
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatStartDate(date) {
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${date.getUTCMonth() + 1}月${date.getUTCDate()}日（${weekdays[date.getUTCDay()]}）開始`;
}

function formatTsvDate(date) {
  return `${String(date.getUTCFullYear()).padStart(4, "0")}/${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
}

function buildTsv(startInput, endInput, maxWeeks = 520) {
  const start = parseWeekInput(startInput);
  const end = parseWeekInput(endInput);
  if (end.startDate < start.startDate) {
    throw new RangeError("終了週は開始週以降を指定してください。");
  }
  const count = Math.round((end.startDate - start.startDate) / WEEK_MS) + 1;
  if (count > maxWeeks) {
    throw new RangeError(`一度に変換できるのは${maxWeeks}週までです。`);
  }
  const ids = [];
  const dates = [];
  for (let index = 0; index < count; index += 1) {
    const date = new Date(start.startDate.getTime() + index * WEEK_MS);
    const info = weekFromDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
    ids.push(info.id);
    dates.push(formatTsvDate(date));
  }
  return { text: `${ids.join("\t")}\n${dates.join("\t")}`, count };
}

// Classic scripts also run when index.html is opened directly from the folder.
globalThis.WeekCalc = Object.freeze({
  fiscalYearStart,
  weeksInFiscalYear,
  weekFromParts,
  weekFromDate,
  parseWeekInput,
  parseDateInput,
  formatDateInput,
  formatStartDate,
  formatTsvDate,
  buildTsv,
});
})();
