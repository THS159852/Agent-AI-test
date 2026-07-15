import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { chromium, type Page } from "playwright";
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
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
const AUTH_SESSIONS_ROOT = path.join(MCP_ROOT, ".auth-sessions");

const DEFAULT_MAX_PAGES = 50;
const BROWSER_SLOW_MO_MS = 350;
const DEFAULT_SESSION_WAIT_SECONDS = 180;

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

function sanitizeSessionName(sessionName: string): string {
  const sanitized = sessionName.trim().replace(/[^a-zA-Z0-9._-]/g, "_");
  if (!sanitized || sanitized === "." || sanitized === "..") {
    throw new Error("Session name must contain at least one letter or number.");
  }
  return sanitized;
}

function getSessionPath(url: string, sessionName: string): string {
  return path.join(
    AUTH_SESSIONS_ROOT,
    toHostnameFolder(url),
    `${sanitizeSessionName(sessionName)}.json`
  );
}

async function sessionExists(sessionPath: string): Promise<boolean> {
  try {
    await access(sessionPath);
    return true;
  } catch {
    return false;
  }
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

function isKnownOAuthUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return [
      "accounts.google.com",
      "login.microsoftonline.com",
      "login.live.com",
    ].some((authHost) => hostname === authHost || hostname.endsWith(`.${authHost}`));
  } catch {
    return false;
  }
}

async function detectOAuthLogin(page: Page): Promise<boolean> {
  if (isKnownOAuthUrl(page.url())) {
    return true;
  }

  const oauthControls = page.locator(
    [
      'a[href*="accounts.google.com"]',
      'a[href*="login.microsoftonline.com"]',
      'a[href*="/oauth" i]',
      'a[href*="/sso" i]',
      'button:has-text("Sign in with Google")',
      'button:has-text("Continue with Google")',
      'a:has-text("Sign in with Google")',
      'a:has-text("Continue with Google")',
    ].join(", ")
  );

  return (await oauthControls.count()) > 0;
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
  "capture_browser_session",
  {
    description:
      "Open a visible browser for manual OAuth/SSO login, then save Playwright cookies and local storage as a reusable named session.",
    inputSchema: z.object({
      url: z.string().url().describe("Application login URL to open"),
      sessionName: z
        .string()
        .min(1)
        .max(80)
        .default("default")
        .describe("Local name used to save and later reuse this session"),
      successUrlContains: z
        .string()
        .optional()
        .describe("Optional URL text that identifies the authenticated landing page"),
      timeoutSeconds: z
        .number()
        .int()
        .min(30)
        .max(600)
        .optional()
        .describe("Time allowed for manual login (default 180 seconds)"),
    }),
  },
  async ({ url, sessionName, successUrlContains, timeoutSeconds }) => {
    if (isKnownOAuthUrl(url)) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                status: "error",
                message:
                  "Use the application's login URL, not the Google/Microsoft provider URL, so the authenticated return can be detected.",
                authType: "oauth_session",
                sessionName: sanitizeSessionName(sessionName),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    const browser = await launchVisibleBrowser();
    const context = await browser.newContext({ viewport: null });
    const page = await context.newPage();
    const entryOrigin = new URL(url).origin;
    const waitMs = (timeoutSeconds ?? DEFAULT_SESSION_WAIT_SECONDS) * 1000;
    const startedAt = Date.now();

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      const initialUrl = page.url();
      const initialLoginForm = await detectLoginForm(page);
      let externalOriginSeen = false;
      let authenticatedPage: Page | undefined;

      while (Date.now() - startedAt < waitMs) {
        const openPages = context
          .pages()
          .filter((candidate) => !candidate.isClosed() && candidate.url() !== "about:blank");
        const hasActiveExternalPage = openPages.some((candidate) => {
          try {
            return new URL(candidate.url()).origin !== entryOrigin;
          } catch {
            return false;
          }
        });
        externalOriginSeen ||= hasActiveExternalPage;

        for (const candidate of openPages) {
          const candidateUrl = candidate.url();

          try {
            if (new URL(candidateUrl).origin !== entryOrigin) {
              continue;
            }

            const matchesExplicitSuccess =
              Boolean(successUrlContains) && candidateUrl.includes(successUrlContains!);
            const returnedFromLogin =
              (externalOriginSeen && !hasActiveExternalPage) ||
              initialLoginForm ||
              candidateUrl !== initialUrl;
            const stillHasLoginForm = await detectLoginForm(candidate).catch(() => true);

            if (matchesExplicitSuccess || (returnedFromLogin && !stillHasLoginForm)) {
              authenticatedPage = candidate;
              break;
            }
          } catch {
            // Ignore transient browser pages and malformed URLs during OAuth redirects.
          }
        }

        if (authenticatedPage) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      if (!authenticatedPage) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  status: "error",
                  message:
                    "Timed out before authenticated login completion was detected. Retry and finish login in the visible browser.",
                  authType: "oauth_session",
                  sessionName: sanitizeSessionName(sessionName),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const sessionPath = getSessionPath(url, sessionName);
      await mkdir(path.dirname(sessionPath), { recursive: true });
      await context.storageState({ path: sessionPath });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                status: "ok",
                message: "Authenticated browser session saved locally.",
                authType: "oauth_session",
                sessionName: sanitizeSessionName(sessionName),
                finalUrl: authenticatedPage.url(),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                status: "error",
                message: error instanceof Error ? error.message : String(error),
                authType: "oauth_session",
                sessionName,
              },
              null,
              2
            ),
          },
        ],
      };
    } finally {
      await context.close().catch(() => undefined);
      await browser.close().catch(() => undefined);
    }
  }
);

server.registerTool(
  "check_browser_url",
  {
    description:
      "Open a URL in Playwright, detect authentication, crawl same-origin pages, explore features like a user, and save scan plus bug reports.",
    inputSchema: z.object({
      url: z.string().url().describe("URL to open and check in the browser"),
      username: z.string().optional().describe("Username for HTTP basic auth or login form"),
      password: z.string().optional().describe("Password for HTTP basic auth or login form"),
      sessionName: z
        .string()
        .min(1)
        .max(80)
        .optional()
        .describe("Named session previously saved by capture_browser_session"),
      maxPages: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe("Maximum number of same-origin pages to crawl (default 50)"),
    }),
  },
  async ({ url, username, password, sessionName, maxPages }) => {
    const scannedAt = new Date().toISOString();
    const maxPagesToScan = maxPages ?? DEFAULT_MAX_PAGES;
    const hostnameFolder = toHostnameFolder(url);
    const runNumber = await getNextRunNumber(hostnameFolder);
    const reportDir = path.join(REPORTS_ROOT, hostnameFolder, createRunFolderName(runNumber));
    const sessionPath = sessionName ? getSessionPath(url, sessionName) : undefined;

    if (sessionPath && !(await sessionExists(sessionPath))) {
      const report: ScanReport = {
        status: "auth_required",
        message:
          "Named browser session was not found. Run capture_browser_session and complete login first.",
        entryUrl: url,
        authType: "oauth_session",
        scannedAt,
        runNumber,
        pagesScanned: 0,
        allUris: [],
        newFeatureUris: [],
        summary: "A saved browser session is required before browser check can continue.",
      };

      return buildResponse(report);
    }

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
      ...(sessionPath ? { storageState: sessionPath } : {}),
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

      const hasOAuthLogin = await detectOAuthLogin(page);
      const looksLikeLoginPage =
        isKnownOAuthUrl(page.url()) ||
        /(?:^|\/)(?:login|sign-in|signin|auth)(?:\/|$)/i.test(new URL(page.url()).pathname);
      if (hasOAuthLogin && (!sessionPath || looksLikeLoginPage)) {
        const report: ScanReport = {
          status: "auth_required",
          message: sessionPath
            ? "Saved OAuth/SSO session is missing or expired. Capture the browser session again."
            : "OAuth/SSO login detected. Run capture_browser_session, complete login manually, then retry with sessionName.",
          entryUrl: url,
          finalUrl: page.url(),
          title: entryResult.title,
          httpStatus: entryResult.httpStatus,
          authType: "oauth_session",
          scannedAt,
          runNumber,
          pagesScanned: 0,
          allUris: [entryResult],
          newFeatureUris: [],
          summary: sessionPath
            ? "Saved OAuth/SSO session must be refreshed."
            : "A saved OAuth/SSO browser session is required.",
        };

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
