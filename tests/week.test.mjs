import test from "node:test";
import assert from "node:assert/strict";
import "../week.js";

const {
  buildTsv,
  fiscalYearStart,
  formatStartDate,
  parseWeekInput,
  weekFromDate,
  weekFromParts,
  weeksInFiscalYear,
} = globalThis.WeekCalc;

const ymd = (date) => `${date.getUTCFullYear()}/${date.getUTCMonth() + 1}/${date.getUTCDate()}`;

test("指定された週番と開始日が一致する", () => {
  assert.equal(ymd(fiscalYearStart(2026)), "2026/2/23");
  assert.equal(ymd(weekFromParts(2026, 31).startDate), "2026/9/21");
  assert.deepEqual(
    { id: weekFromDate(2026, 9, 24).id, week: weekFromDate(2026, 9, 24).week },
    { id: "202631", week: 31 },
  );
  assert.equal(ymd(fiscalYearStart(2025)), "2025/2/24");
  assert.equal(ymd(weekFromParts(2025, 25).startDate), "2025/8/11");
  assert.equal(ymd(fiscalYearStart(2021)), "2021/3/1");
  assert.equal(formatStartDate(weekFromParts(2025, 25).startDate), "8月11日（月）開始");
});

test("年度切替の前後と53週を計算する", () => {
  assert.equal(weekFromDate(2026, 2, 22).id, "202552");
  assert.equal(weekFromDate(2026, 2, 23).id, "202601");
  assert.equal(weekFromDate(2025, 2, 23).id, "202452");
  assert.equal(weekFromDate(2025, 2, 24).id, "202501");
  assert.equal(weeksInFiscalYear(2020), 53);
  assert.equal(weekFromDate(2021, 2, 28).id, "202053");
  assert.equal(weekFromDate(2021, 3, 1).id, "202101");
  assert.equal(weeksInFiscalYear(2026), 53);
  assert.equal(weekFromDate(2027, 2, 28).id, "202653");
  assert.equal(weekFromDate(2027, 3, 1).id, "202701");
});

test("入力形式と無効な週を判定する", () => {
  assert.equal(parseWeekInput("2025年25週").id, "202525");
  assert.equal(parseWeekInput("２０２５２５").id, "202525");
  assert.equal(parseWeekInput("2025年度 第25週").id, "202525");
  assert.throws(() => parseWeekInput("202554"), /第52週/);
  assert.throws(() => parseWeekInput("202500"), /第1週/);
  assert.throws(() => weekFromDate(2025, 2, 29), /日付を確認/);
});

test("横持ちTSVの2行を生成する", () => {
  const { text, count } = buildTsv("202525", "202530");
  assert.equal(count, 6);
  assert.equal(text,
    "202525\t202526\t202527\t202528\t202529\t202530\n" +
    "2025/8/11\t2025/8/18\t2025/8/25\t2025/9/1\t2025/9/8\t2025/9/15");
  assert.equal(buildTsv("202552", "202602").text,
    "202552\t202601\t202602\n2026/2/16\t2026/2/23\t2026/3/2");
  assert.throws(() => buildTsv("202530", "202525"), /終了週/);
});

test("1900～2100年度の境界と全週を往復確認する", () => {
  const dayMs = 24 * 60 * 60 * 1000;
  for (let year = 1900; year <= 2100; year += 1) {
    const start = fiscalYearStart(year);
    const marchFirst = new Date(Date.UTC(year, 2, 1));
    assert.equal(start.getUTCDay(), 1);
    assert.ok(marchFirst - start >= 0 && marchFirst - start < 7 * dayMs);
    const previousDay = new Date(start.getTime() - dayMs);
    assert.equal(weekFromDate(previousDay.getUTCFullYear(), previousDay.getUTCMonth() + 1, previousDay.getUTCDate()).fiscalYear, year - 1);
    const count = weeksInFiscalYear(year);
    assert.ok(count === 52 || count === 53);
    for (let week = 1; week <= count; week += 1) {
      const monday = weekFromParts(year, week).startDate;
      const thursday = new Date(monday.getTime() + 3 * dayMs);
      assert.equal(weekFromDate(thursday.getUTCFullYear(), thursday.getUTCMonth() + 1, thursday.getUTCDate()).id,
        `${year}${String(week).padStart(2, "0")}`);
    }
  }
});

test("4桁で表せる最後の年度も最後の週まで生成できる", () => {
  const lastId = `9999${String(weeksInFiscalYear(9999)).padStart(2, "0")}`;
  assert.equal(buildTsv(lastId, lastId).text.split("\n")[0], lastId);
});
