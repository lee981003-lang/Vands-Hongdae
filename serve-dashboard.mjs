import { createServer } from "node:http";
import { exec } from "node:child_process";
import { readFile } from "node:fs/promises";
import { extname, join, relative, resolve, isAbsolute } from "node:path";

const root = resolve("dist");
const port = Number(process.env.PORT || 4174);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
    const filePath = join(root, pathname);
    const safePath = relative(root, filePath);

    if (safePath.startsWith("..") || isAbsolute(safePath)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    const file = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": contentTypes[extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(file);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
});

server.listen(port, "0.0.0.0", () => {
  const url = `http://localhost:${port}/`;
  console.log(`Dashboard: ${url}`);
  console.log("Keep this window open while using the dashboard.");
  if (process.env.NO_OPEN !== "1") {
    exec(`start "" "${url}"`);
  }
});
