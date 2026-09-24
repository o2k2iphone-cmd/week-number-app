import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);

test("公開HTMLの参照先とPWAアイコンが揃っている", () => {
  const html = readFileSync(new URL("index.html", root), "utf8");
  assert.ok(html.indexOf('<script defer src="./week.js"></script>') < html.indexOf('<script defer src="./app.js"></script>'));
  for (const [, relativePath] of html.matchAll(/(?:href|src)="(\.\/[^\"]+)"/g)) {
    assert.ok(readFileSync(new URL(relativePath, root)).length > 0, relativePath);
  }

  const manifest = JSON.parse(readFileSync(new URL("manifest.webmanifest", root), "utf8"));
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.scope, "./");
  assert.equal(manifest.display, "standalone");
  for (const icon of manifest.icons) {
    const png = readFileSync(new URL(icon.src, root));
    assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    const size = Number(icon.sizes.split("x")[0]);
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
  assert.ok(readFileSync(new URL("sw.js", root)).length > 0);
});
