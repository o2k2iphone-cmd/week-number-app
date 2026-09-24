import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

test("week.jsを通常のスクリプトとして読み込める", () => {
  const context = {};
  const source = readFileSync(new URL("../week.js", import.meta.url), "utf8");
  runInNewContext(source, context);
  assert.equal(context.WeekCalc.weekFromDate(2026, 9, 24).id, "202631");
  assert.equal(context.WeekCalc.parseWeekInput("2025年25週").id, "202525");
});

test("通常のスクリプトとして画面を起動し変換できる", () => {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) {
      const classes = new Set();
      elements.set(id, {
        id,
        value: "",
        textContent: "",
        hidden: false,
        dataset: {},
        listeners: {},
        classList: {
          toggle: (name, force) => force ? classes.add(name) : classes.delete(name),
          add: (name) => classes.add(name),
          remove: (name) => classes.delete(name),
          contains: (name) => classes.has(name),
        },
        setAttribute() {},
        addEventListener(name, callback) { this.listeners[name] = callback; },
      });
    }
    return elements.get(id);
  }
  const buttons = ["week", "date", "batch"].map((mode) => {
    const button = element(`${mode}Button`);
    button.dataset.mode = mode;
    return button;
  });
  const context = {
    document: {
      getElementById: element,
      querySelectorAll: () => buttons,
      addEventListener() {},
    },
    navigator: {},
    location: { search: "" },
    URLSearchParams,
  };
  context.window = context;
  runInNewContext(readFileSync(new URL("../week.js", import.meta.url), "utf8"), context);
  runInNewContext(readFileSync(new URL("../app.js", import.meta.url), "utf8"), context);

  element("weekInput").value = "2025年25週";
  element("weekInput").listeners.input();
  assert.equal(element("weekResult").textContent, "8月11日（月）開始");

  element("startWeek").value = "202525";
  element("endWeek").value = "202526";
  element("batchForm").listeners.submit({ preventDefault() {} });
  assert.equal(element("tsvOutput").value,
    "202525\t202526\n2025/8/11\t2025/8/18");
});
