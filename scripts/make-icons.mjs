// Dependency-free PNG generation so the PWA icons can be rebuilt with Node.js.
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const baseUrl = new URL("../icons/", import.meta.url);

function roundedRect(x, y, left, top, width, height, radius) {
  const qx = Math.abs(x - (left + width / 2)) - (width / 2 - radius);
  const qy = Math.abs(y - (top + height / 2)) - (height / 2 - radius);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) <= radius;
}

function line(x, y, x1, y1, x2, y2, width) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy)) <= width / 2;
}

function colorAt(x, y) {
  const navy = [18, 61, 77, 255];
  const white = [248, 255, 253, 255];
  const mint = [72, 200, 180, 255];
  if (!roundedRect(x, y, 0, 0, 512, 512, 110)) return [0, 0, 0, 0];
  let color = navy;
  if (roundedRect(x, y, 97, 109, 318, 302, 40)) color = white;
  if (roundedRect(x, y, 97, 184, 318, 18, 0)) color = [168, 216, 208, 255];
  if (line(x, y, 178, 91, 178, 148, 29) || line(x, y, 334, 91, 334, 148, 29)) color = mint;

  const three = line(x, y, 179, 239, 252, 239, 23) ||
    line(x, y, 189, 295, 252, 295, 23) ||
    line(x, y, 179, 351, 252, 351, 23) ||
    line(x, y, 252, 239, 252, 351, 23);
  const one = line(x, y, 303, 254, 329, 233, 22) ||
    line(x, y, 329, 233, 329, 351, 23) ||
    line(x, y, 298, 351, 361, 351, 23);
  if (three || one) color = navy;
  return color;
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let i = 0; i < 8; i += 1) value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function makePng(size) {
  const rowLength = size * 4 + 1;
  const raw = Buffer.alloc(rowLength * size);
  const samples = [[.25, .25], [.75, .25], [.25, .75], [.75, .75]];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const color = [0, 0, 0, 0];
      for (const [offsetX, offsetY] of samples) {
        const sample = colorAt((x + offsetX) * 512 / size, (y + offsetY) * 512 / size);
        for (let channel = 0; channel < 4; channel += 1) color[channel] += sample[channel] / samples.length;
      }
      const position = y * rowLength + 1 + x * 4;
      for (let channel = 0; channel < 4; channel += 1) raw[position + channel] = Math.round(color[channel]);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return png;
}

for (const [name, size] of [["icon-192.png", 192], ["icon-512.png", 512], ["apple-touch-icon.png", 180]]) {
  writeFileSync(fileURLToPath(new URL(name, baseUrl)), makePng(size));
}
