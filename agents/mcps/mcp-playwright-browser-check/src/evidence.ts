import { execFile } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import type { Locator, Page, Request } from "playwright";

const execFileAsync = promisify(execFile);

function safeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function isSensitiveKey(key: string): boolean {
  return /password|passwd|pwd|token|secret|authorization|cookie|api[-_]?key/i.test(key);
}

function sanitizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    for (const key of [...url.searchParams.keys()]) {
      if (isSensitiveKey(key)) {
        url.searchParams.set(key, "<REDACTED>");
      }
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}

function sanitizeBody(body: string): string {
  try {
    const parsed = JSON.parse(body) as unknown;
    const redact = (value: unknown): unknown => {
      if (Array.isArray(value)) {
        return value.map(redact);
      }
      if (value && typeof value === "object") {
        return Object.fromEntries(
          Object.entries(value).map(([key, item]) => [
            key,
            isSensitiveKey(key) ? "<REDACTED>" : redact(item),
          ])
        );
      }
      return value;
    };
    return JSON.stringify(redact(parsed));
  } catch {
    const params = new URLSearchParams(body);
    if ([...params.keys()].length === 0) {
      return body;
    }
    for (const key of [...params.keys()]) {
      if (isSensitiveKey(key)) {
        params.set(key, "<REDACTED>");
      }
    }
    return params.toString();
  }
}

export function requestToCurl(request: Request, status: number): string {
  const headers = request.headers();
  const parts = [
    `# HTTP ${status}`,
    `curl -X ${request.method()} ${shellQuote(sanitizeUrl(request.url()))}`,
  ];

  for (const [name, value] of Object.entries(headers)) {
    const lowered = name.toLowerCase();
    const safeValue =
      lowered === "authorization" || lowered === "cookie" || lowered === "proxy-authorization"
        ? "<REDACTED>"
        : value;
    parts.push(`  -H ${shellQuote(`${name}: ${safeValue}`)}`);
  }

  const postData = request.postData();
  if (postData) {
    parts.push(`  --data-raw ${shellQuote(sanitizeBody(postData))}`);
  }

  return parts.join(" \\\n");
}

export async function showTestStep(
  page: Page,
  feature: string,
  action: string,
  target?: Locator
): Promise<void> {
  await page
    .evaluate(
      ({ featureName, actionName }) => {
        const id = "__mcp_test_step_overlay__";
        let overlay = document.getElementById(id);
        if (!overlay) {
          overlay = document.createElement("div");
          overlay.id = id;
          Object.assign(overlay.style, {
            position: "fixed",
            top: "12px",
            right: "12px",
            zIndex: "2147483647",
            maxWidth: "460px",
            padding: "12px 16px",
            border: "3px solid #ffcc00",
            borderRadius: "8px",
            background: "rgba(20, 20, 20, 0.94)",
            color: "#ffffff",
            font: "bold 16px Arial, sans-serif",
            boxShadow: "0 4px 18px rgba(0,0,0,.45)",
            pointerEvents: "none",
          });
          document.documentElement.appendChild(overlay);
        }
        overlay.textContent = `TESTING: ${featureName} | ${actionName}`;
      },
      { featureName: feature, actionName: action }
    )
    .catch(() => undefined);

  if (target) {
    await target
      .evaluate((element) => {
        (element as HTMLElement).style.outline = "4px solid #ffcc00";
        (element as HTMLElement).style.outlineOffset = "3px";
        element.scrollIntoView({ block: "center", inline: "center" });
      })
      .catch(() => undefined);
  }

  await page.waitForTimeout(350);
}

export async function captureFailureScreenshot(
  page: Page,
  evidenceDir: string,
  bugId: string,
  feature: string
): Promise<string | undefined> {
  try {
    await mkdir(evidenceDir, { recursive: true });
    const filename = `${bugId}-${safeName(feature) || "feature"}.png`;
    const outputPath = path.join(evidenceDir, filename);
    await page.screenshot({ path: outputPath, fullPage: true });
    return outputPath;
  } catch {
    return undefined;
  }
}

export async function convertVideoToMp4(
  sourcePath: string,
  evidenceDir: string,
  runNumber: number,
  pageIndex: number,
  feature: string
): Promise<string | undefined> {
  if (!ffmpegPath) {
    return undefined;
  }

  try {
    await mkdir(evidenceDir, { recursive: true });
    const filename = `run-${runNumber}-page-${pageIndex}-${safeName(feature) || "feature"}.mp4`;
    const outputPath = path.join(evidenceDir, filename);
    await execFileAsync(ffmpegPath, [
      "-y",
      "-i",
      sourcePath,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-an",
      outputPath,
    ]);
    await rm(sourcePath, { force: true });
    return outputPath;
  } catch {
    return undefined;
  }
}
