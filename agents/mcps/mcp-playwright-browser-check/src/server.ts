import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { chromium, type Page } from "playwright";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  buildBugReportMarkdownEn,
  buildBugReportMarkdownVi,
  runUserExploration,
  type BugReport,
} from "./exploration.js";
import type { BaselineFile, PageResult, ScanReport } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MCP_ROOT = path.resolve(__dirname, "..");
const REPORTS_ROOT = path.join(MCP_ROOT, "browser-check-reports");

const DEFAULT_MAX_PAGES = 50;
const BROWSER_SLOW_MO_MS = 350;

const server = new McpServer({
  name: "playwright-browser-check",
  version: "1.0.0",
});

async function launchVisibleBrowser() {
  return chromium.launch({
    headless: false,
    slowMo: BROWSER_SLOW_MO_MS,
    args: ["--start-maximized", "--start-fullscreen"],
  });
}

function normalizeUrl(rawUrl: string): string {
  const parsed = new URL(rawUrl);
  parsed.hash = "";

  if (parsed.pathname !== "/" && parsed.pathname.endsWith("/")) {
    parsed.pathname = parsed.pathname.slice(0, -1);
  }

  return parsed.toString();
}

function isSameOrigin(targetUrl: string, origin: string): boolean {
  try {
    return new URL(targetUrl).origin === origin;
  } catch {
    return false;
  }
}

function isNavigableHref(href: string): boolean {
  const lowered = href.trim().toLowerCase();
  return !(
    lowered.startsWith("mailto:") ||
    lowered.startsWith("tel:") ||
    lowered.startsWith("javascript:") ||
    lowered.startsWith("#")
  );
}

function toHostnameFolder(url: string): string {
  return new URL(url).hostname.replace(/[^a-zA-Z0-9.-]/g, "_");
}

function createRunFolderName(runNumber: number): string {
  const datetime = new Date().toISOString().replace(/[:.]/g, "-");
  return `run ${runNumber} - ${datetime}`;
}

async function getNextRunNumber(hostnameFolder: string): Promise<number> {
  const hostDir = path.join(REPORTS_ROOT, hostnameFolder);

  try {
    const entries = await readdir(hostDir, { withFileTypes: true });
    const runCount = entries.filter(
      (entry) => entry.isDirectory() && /^run \d+ - /.test(entry.name)
    ).length;
    return runCount + 1;
  } catch {
    return 1;
  }
}

async function probeHttpAuth(url: string): Promise<{
  needsAuth: boolean;
  authType?: string;
}> {
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });

    const wwwAuth = response.headers.get("www-authenticate");
    if (response.status === 401 && wwwAuth) {
      return { needsAuth: true, authType: wwwAuth };
    }
  } catch {
    // Some sites block fetch probes; continue with Playwright.
  }

  return { needsAuth: false };
}

async function detectLoginForm(page: Page): Promise<boolean> {
  const passwordInputs = await page.locator('input[type="password"]').count();
  if (passwordInputs === 0) {
    return false;
  }

  const usernameCandidates = await page
    .locator(
      'input[type="email"], input[name*="user" i], input[name*="email" i], input[id*="user" i], input[id*="email" i]'
    )
    .count();

  return usernameCandidates > 0 || passwordInputs > 0;
}

async function trySubmitLoginForm(
  page: Page,
  username: string,
  password: string
): Promise<boolean> {
  const usernameLocator = page
    .locator(
      'input[type="email"], input[name*="user" i], input[name*="email" i], input[id*="user" i], input[id*="email" i]'
    )
    .first();

  const passwordLocator = page.locator('input[type="password"]').first();

  if ((await usernameLocator.count()) === 0 || (await passwordLocator.count()) === 0) {
    return false;
  }

  await usernameLocator.fill(username);
  await passwordLocator.fill(password);

  const submitButton = page
    .locator(
      'button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign in")'
    )
    .first();

  if ((await submitButton.count()) > 0) {
    await submitButton.click();
  } else {
    await passwordLocator.press("Enter");
  }

  await page.waitForLoadState("domcontentloaded", { timeout: 15000 }).catch(() => undefined);
  return true;
}

async function extractInternalLinks(page: Page, origin: string): Promise<string[]> {
  const hrefs = await page.$$eval("a[href]", (anchors) =>
    anchors.map((anchor) => (anchor as HTMLAnchorElement).href)
  );

  const unique = new Set<string>();

  for (const href of hrefs) {
    if (!href || !isNavigableHref(href)) {
      continue;
    }

    try {
      const normalized = normalizeUrl(href);
      if (isSameOrigin(normalized, origin)) {
        unique.add(normalized);
      }
    } catch {
      // Ignore invalid URLs.
    }
  }

  return [...unique];
}

async function visitPage(page: Page, targetUrl: string): Promise<PageResult> {
  try {
    const response = await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    const title = await page.title();
    const httpStatus = response?.status() ?? null;

    return {
      url: normalizeUrl(page.url()),
      title,
      httpStatus,
      ok: httpStatus !== null ? httpStatus < 400 : true,
    };
  } catch (error) {
    return {
      url: targetUrl,
      title: "",
      httpStatus: null,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function crawlSite(
  context: import("playwright").BrowserContext,
  startUrl: string,
  maxPages: number
): Promise<PageResult[]> {
  const origin = new URL(startUrl).origin;
  const queue: string[] = [normalizeUrl(startUrl)];
  const visited = new Set<string>();
  const results: PageResult[] = [];

  while (queue.length > 0 && visited.size < maxPages) {
    const currentUrl = queue.shift();
    if (!currentUrl || visited.has(currentUrl)) {
      continue;
    }

    visited.add(currentUrl);
    const page = await context.newPage();

    try {
      const result = await visitPage(page, currentUrl);
      results.push(result);

      if (result.ok) {
        const links = await extractInternalLinks(page, origin);
        for (const link of links) {
          if (!visited.has(link) && !queue.includes(link)) {
            queue.push(link);
          }
        }
      }
    } finally {
      await page.close();
    }
  }

  return results;
}

function getBaselinePath(hostnameFolder: string): string {
  return path.join(REPORTS_ROOT, hostnameFolder, "baseline.json");
}

async function loadBaseline(hostnameFolder: string): Promise<string[]> {
  const baselinePath = getBaselinePath(hostnameFolder);

  try {
    const raw = await readFile(baselinePath, "utf8");
    const parsed = JSON.parse(raw) as BaselineFile;
    return parsed.uris ?? [];
  } catch {
    return [];
  }
}

async function saveBaseline(hostnameFolder: string, uris: string[]): Promise<void> {
  const baselinePath = getBaselinePath(hostnameFolder);
  await mkdir(path.dirname(baselinePath), { recursive: true });

  const payload: BaselineFile = {
    uris: [...new Set(uris)].sort(),
    lastUpdated: new Date().toISOString(),
  };

  await writeFile(baselinePath, JSON.stringify(payload, null, 2), "utf8");
}

async function writeScanFiles(
  reportDir: string,
  report: ScanReport,
  bugReport?: BugReport,
  curlErrors: string[] = []
): Promise<void> {
  await mkdir(reportDir, { recursive: true });

  const allUris = report.allUris.map((item) => item.url);
  const summaryEn = [
    "# Browser Check Report",
    "",
    report.message,
    "",
    `Run number: ${report.runNumber ?? "-"}`,
    `Entry URL: ${report.entryUrl}`,
    `Final URL: ${report.finalUrl ?? "-"}`,
    `Title: ${report.title ?? "-"}`,
    `HTTP status: ${report.httpStatus ?? "-"}`,
    `Pages scanned: ${report.pagesScanned}`,
    `New feature URIs: ${report.newFeatureUris.length}`,
    "",
    "## Bug result",
    bugReport
      ? `- Status: ${bugReport.status === "no_bugs" ? "No bugs" : `${bugReport.bugCount} bug(s) found`}`
      : "- Status: (not run)",
    bugReport ? `- Summary: ${bugReport.summary}` : "",
    "",
    "## All URIs",
    ...allUris.map((uri) => `- ${uri}`),
    "",
    "## New feature URIs",
    ...(report.newFeatureUris.length > 0
      ? report.newFeatureUris.map((uri) => `- ${uri}`)
      : ["- (none)"]),
  ];

  const summaryVi = [
    "# Báo cáo kiểm tra trình duyệt",
    "",
    report.status === "ok"
      ? `Truy cập thành công: ${report.finalUrl ?? report.entryUrl}`
      : report.message,
    "",
    `Lần chạy: ${report.runNumber ?? "-"}`,
    `URL đầu vào: ${report.entryUrl}`,
    `URL cuối: ${report.finalUrl ?? "-"}`,
    `Tiêu đề: ${report.title ?? "-"}`,
    `HTTP status: ${report.httpStatus ?? "-"}`,
    `Số trang đã quét: ${report.pagesScanned}`,
    `URI chức năng mới: ${report.newFeatureUris.length}`,
    "",
    "## Kết quả lỗi",
    bugReport
      ? `- Trạng thái: ${bugReport.status === "no_bugs" ? "Không có lỗi" : `Có ${bugReport.bugCount} lỗi`}`
      : "- Trạng thái: (chưa chạy)",
    bugReport
      ? `- Tóm tắt: ${
          bugReport.bugCount === 0
            ? `Không phát hiện lỗi trong ${bugReport.totalPagesTested} màn hình.`
            : `Phát hiện ${bugReport.bugCount} lỗi trong ${bugReport.totalPagesTested} màn hình.`
        }`
      : "",
    "",
    "## Tất cả URI",
    ...allUris.map((uri) => `- ${uri}`),
    "",
    "## URI chức năng mới",
    ...(report.newFeatureUris.length > 0
      ? report.newFeatureUris.map((uri) => `- ${uri}`)
      : ["- (không có)"]),
  ];

  const curlText =
    curlErrors.length > 0
      ? curlErrors
          .map((command, index) => `# Failed request ${index + 1}\n${command}`)
          .join("\n\n")
      : "# No failed HTTP requests were captured in this run.\n";

  const writes = [
    writeFile(path.join(reportDir, "summary-en.md"), summaryEn.join("\n"), "utf8"),
    writeFile(path.join(reportDir, "summary-vi.md"), summaryVi.join("\n"), "utf8"),
    writeFile(path.join(reportDir, "scan-report.json"), JSON.stringify(report, null, 2), "utf8"),
    writeFile(path.join(reportDir, "all-uris.json"), JSON.stringify(report.allUris, null, 2), "utf8"),
    writeFile(path.join(reportDir, "failed-requests-curl.txt"), curlText, "utf8"),
    writeFile(
      path.join(reportDir, "new-features.json"),
      JSON.stringify(
        {
          count: report.newFeatureUris.length,
          uris: report.newFeatureUris,
        },
        null,
        2
      ),
      "utf8"
    ),
  ];

  if (bugReport) {
    writes.push(
      writeFile(path.join(reportDir, "bug-report.json"), JSON.stringify(bugReport, null, 2), "utf8"),
      writeFile(
        path.join(reportDir, "bug-report-en.md"),
        buildBugReportMarkdownEn(bugReport),
        "utf8"
      ),
      writeFile(
        path.join(reportDir, "bug-report-vi.md"),
        buildBugReportMarkdownVi(bugReport),
        "utf8"
      )
    );
  }

  await Promise.all(writes);
}

function buildResponse(report: ScanReport) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(report, null, 2),
      },
    ],
  };
}

server.registerTool(
  "check_browser_url",
  {
    description:
      "Open a URL in Playwright, detect authentication, crawl same-origin pages, explore features like a user, and save scan plus bug reports.",
    inputSchema: z.object({
      url: z.string().url().describe("URL to open and check in the browser"),
      username: z.string().optional().describe("Username for HTTP basic auth or login form"),
      password: z.string().optional().describe("Password for HTTP basic auth or login form"),
      maxPages: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe("Maximum number of same-origin pages to crawl (default 50)"),
    }),
  },
  async ({ url, username, password, maxPages }) => {
    const scannedAt = new Date().toISOString();
    const maxPagesToScan = maxPages ?? DEFAULT_MAX_PAGES;
    const hostnameFolder = toHostnameFolder(url);
    const runNumber = await getNextRunNumber(hostnameFolder);
    const reportDir = path.join(REPORTS_ROOT, hostnameFolder, createRunFolderName(runNumber));

    const authProbe = await probeHttpAuth(url);
    if (authProbe.needsAuth && (!username || !password)) {
      const report: ScanReport = {
        status: "auth_required",
        message:
          "URL nay yeu cau HTTP authentication. Hay gui username va password, sau do goi lai tool.",
        entryUrl: url,
        authType: authProbe.authType,
        scannedAt,
        runNumber,
        pagesScanned: 0,
        allUris: [],
        newFeatureUris: [],
        summary: "Authentication required before browser check can continue.",
      };

      return buildResponse(report);
    }

    const browser = await launchVisibleBrowser();
    const context = await browser.newContext({
      viewport: null,
      ...(username && password
        ? {
            httpCredentials: {
              username,
              password,
            },
          }
        : {}),
    });

    const page = await context.newPage();

    try {
      const entryResult = await visitPage(page, url);

      if (!entryResult.ok) {
        const report: ScanReport = {
          status: "error",
          message: `Khong the truy cap URL: ${entryResult.error ?? `HTTP ${entryResult.httpStatus}`}`,
          entryUrl: url,
          finalUrl: entryResult.url,
          title: entryResult.title,
          httpStatus: entryResult.httpStatus,
          scannedAt,
          runNumber,
          reportDir,
          pagesScanned: 0,
          allUris: [entryResult],
          newFeatureUris: [],
          summary: entryResult.error ?? "Failed to open entry URL.",
        };

        await writeScanFiles(reportDir, report);
        return buildResponse(report);
      }

      const hasLoginForm = await detectLoginForm(page);
      if (hasLoginForm && (!username || !password)) {
        const report: ScanReport = {
          status: "auth_required",
          message:
            "Trang co form dang nhap. Hay gui username va password, sau do goi lai tool.",
          entryUrl: url,
          finalUrl: page.url(),
          title: entryResult.title,
          httpStatus: entryResult.httpStatus,
          authType: "login_form",
          scannedAt,
          runNumber,
          pagesScanned: 0,
          allUris: [entryResult],
          newFeatureUris: [],
          summary: "Login form detected. Credentials are required.",
        };

        return buildResponse(report);
      }

      if (hasLoginForm && username && password) {
        const submitted = await trySubmitLoginForm(page, username, password);
        if (!submitted) {
          const report: ScanReport = {
            status: "error",
            message: "Khong the dien form dang nhap tu dong.",
            entryUrl: url,
            finalUrl: page.url(),
            title: await page.title(),
            httpStatus: entryResult.httpStatus,
            scannedAt,
            runNumber,
            reportDir,
            pagesScanned: 0,
            allUris: [entryResult],
            newFeatureUris: [],
            summary: "Failed to submit login form automatically.",
          };

          await writeScanFiles(reportDir, report);
          return buildResponse(report);
        }
      }

      const finalUrl = page.url() || url;
      const successMessage = `Truy cap thanh cong: ${finalUrl}`;
      console.log(successMessage);

      await page.close();

      const crawlResults = await crawlSite(context, finalUrl, maxPagesToScan);
      const discoveredUris = [...new Set(crawlResults.map((item) => item.url))].sort();

      const previousBaseline = await loadBaseline(hostnameFolder);
      const previousSet = new Set(previousBaseline);
      const newFeatureUris = discoveredUris.filter((uri) => !previousSet.has(uri));

      await saveBaseline(hostnameFolder, [...new Set([...previousBaseline, ...discoveredUris])]);

      console.log(`Bat dau kham pha chuc nang nhu nguoi dung tren ${crawlResults.filter((item) => item.ok).length} man hinh...`);
      const evidenceDir = path.join(reportDir, "evidences");
      const rawVideoDir = path.join(evidenceDir, "raw");
      await mkdir(rawVideoDir, { recursive: true });

      const storageState = await context.storageState();
      await context.close();
      await browser.close();

      const explorationResult = await runUserExploration(
        async () => {
          const featureBrowser = await launchVisibleBrowser();
          try {
            const featureContext = await featureBrowser.newContext({
              viewport: null,
              storageState,
              ...(username && password
                ? { httpCredentials: { username, password } }
                : {}),
              recordVideo: { dir: rawVideoDir },
            });
            return { browser: featureBrowser, context: featureContext };
          } catch (error) {
            await featureBrowser.close().catch(() => undefined);
            throw error;
          }
        },
        crawlResults,
        url,
        runNumber,
        scannedAt,
        evidenceDir
      );
      const { bugReport, curlErrors } = explorationResult;
      console.log(bugReport.summary);

      const report: ScanReport = {
        status: "ok",
        message: successMessage,
        entryUrl: url,
        finalUrl: crawlResults[0]?.url ?? finalUrl,
        title: crawlResults[0]?.title ?? entryResult.title,
        httpStatus: crawlResults[0]?.httpStatus ?? entryResult.httpStatus,
        scannedAt,
        runNumber,
        reportDir,
        pagesScanned: crawlResults.length,
        allUris: crawlResults,
        newFeatureUris,
        summary: [
          newFeatureUris.length > 0
            ? `Found ${newFeatureUris.length} new feature URI(s) compared to previous baseline.`
            : "No new feature URIs detected compared to previous baseline.",
          bugReport.summary,
        ].join(" "),
        bugReport: {
          runNumber: bugReport.runNumber,
          bugCount: bugReport.bugCount,
          status: bugReport.status,
          summary: bugReport.summary,
        },
      };

      await writeScanFiles(reportDir, report, bugReport, curlErrors);
      return buildResponse(report);
    } catch (error) {
      const report: ScanReport = {
        status: "error",
        message: error instanceof Error ? error.message : String(error),
        entryUrl: url,
        scannedAt,
        runNumber,
        reportDir,
        pagesScanned: 0,
        allUris: [],
        newFeatureUris: [],
        summary: "Unexpected error while checking browser URL.",
      };

      await writeScanFiles(reportDir, report);
      return buildResponse(report);
    } finally {
      if (browser.isConnected()) {
        await browser.close();
      }
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
