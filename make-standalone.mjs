import { readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";

const distIndex = await readFile("dist/index.html", "utf8");
const scriptMatch = distIndex.match(/<script[^>]+src="(.+?)"><\/script>/);
const styleMatch = distIndex.match(/<link[^>]+href="(.+?)"[^>]*>/);

if (!scriptMatch || !styleMatch) {
  throw new Error("dist/index.html에서 JS/CSS 파일을 찾지 못했습니다.");
}

const scriptPath = scriptMatch[1].replace(/^\.\//, "");
const stylePath = styleMatch[1].replace(/^\.\//, "");
const js = await readFile(join("dist", scriptPath), "utf8");
const css = await readFile(join("dist", stylePath), "utf8");

const assetPattern = /["']\.\/assets\/([^"']+\.(?:png|jpg|jpeg|webp|svg))["']/g;
const importMetaAssetPattern = /new URL\(["']([^"']+\.(?:png|jpg|jpeg|webp|svg))["'],import\.meta\.url\)\.href/g;
let bundledJs = js;
let bundledCss = css;

async function assetDataUrl(fileName) {
  const asset = await readFile(join("dist", "assets", fileName));
  const ext = extname(fileName).slice(1).toLowerCase();
  const mime = ext === "svg" ? "image/svg+xml" : `image/${ext === "jpg" ? "jpeg" : ext}`;
  return `data:${mime};base64,${asset.toString("base64")}`;
}

for (const match of js.matchAll(assetPattern)) {
  const dataUrl = await assetDataUrl(match[1]);
  bundledJs = bundledJs.replaceAll(match[0], `"${dataUrl}"`);
}

for (const match of js.matchAll(importMetaAssetPattern)) {
  const dataUrl = await assetDataUrl(match[1]);
  bundledJs = bundledJs.replaceAll(match[0], `"${dataUrl}"`);
}

const fontPattern = /url\((['"]?)(\.\/[^)'"\s]+\.woff2)\1\)/g;
for (const match of css.matchAll(fontPattern)) {
  const font = await readFile(join("dist", dirname(stylePath), match[2]));
  bundledCss = bundledCss.replaceAll(match[0], `url("data:font/woff2;base64,${font.toString("base64")}")`);
}

const html = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>실시간 시술 현황 대시보드</title>
    <style>${bundledCss}</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module">${bundledJs}</script>
  </body>
</html>
`;

await writeFile("대시보드.html", html, "utf8");
console.log("대시보드.html 생성 완료");
