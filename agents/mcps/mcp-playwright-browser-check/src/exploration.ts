import type {
  Browser,
  BrowserContext,
  Locator,
  Page,
  ConsoleMessage,
  Request,
  Response,
} from "playwright";
import {
  captureFailureScreenshot,
  convertVideoToMp4,
  requestToCurl,
  showTestStep,
} from "./evidence.js";
import type { PageResult } from "./types.js";

export type BugErrorType =
  | "page_load"
  | "console_error"
  | "network_error"
  | "form_submit"
  | "interaction"
  | "validation_error"
  | "navigation";

export type BugItem = {
  id: string;
  feature: string;
  screen: string;
  url: string;
  action: string;
  errorType: BugErrorType;
  message: string;
  details?: string;
  screenshot?: string;
  video?: string;
};

export type BugReport = {
  runNumber: number;
  scannedAt: string;
  entryUrl: string;
  totalPagesTested: number;
  totalActions: number;
  bugCount: number;
  status: "no_bugs" | "has_bugs";
  summary: string;
  bugs: BugItem[];
};

type PageMonitor = {
  consoleErrors: string[];
  pageErrors: string[];
  networkErrors: Array<{ message: string; curl: string }>;
  detach: () => void;
};

export type ExplorationResult = {
  bugReport: BugReport;
  curlErrors: string[];
};

export type ExplorationSession = {
  browser: Browser;
  context: BrowserContext;
};

export type ExplorationSessionFactory = (
  featureNumber: number,
  target: PageResult
) => Promise<ExplorationSession>;

const DESTRUCTIVE_PATTERN =
  /logout|log\s*out|sign\s*out|delete|remove|destroy|unsubscribe|đăng\s*xuất|xóa|hủy|退会|削除/i;

const NOISE_CONSOLE_PATTERN =
  /content security policy|csp|cors|cross-origin|clarity\.ms|google-analytics|googletagmanager|doubleclick|facebook\.net|hotjar|sentry\.io|favicon|third-party|refused to connect|net::err_blocked|failed to load resource: the server responded with a status of 4/i;

const DISMISS_BUTTON_TEXTS = [
  "Accept",
  "Agree",
  "Allow",
  "OK",
  "Close",
  "Got it",
  "I agree",
  "Accept all",
  "同意",
  "許可",
  "閉じる",
  "閉じる",
  "OK",
  "はい",
  "同意する",
  "すべて同意",
  "Đồng ý",
  "Đóng",
  "Cho phép",
];

const ERROR_VISIBLE_SELECTORS = [
  '[role="alert"]',
  ".error",
  ".errors",
  ".alert-danger",
  ".alert-error",
  ".invalid-feedback",
  ".field-error",
  ".form-error",
  '[aria-invalid="true"]',
].join(", ");

const MAX_LINKS_PER_PAGE = 8;
const MAX_BUTTONS_PER_PAGE = 8;
const MAX_FORMS_PER_PAGE = 3;
const MAX_VISIBLE_INPUTS = 6;

function getFeatureName(url: string, title: string): string {
  try {
    const pathname = new URL(url).pathname;
    if (pathname === "/" || pathname === "") {
      return title || "Home";
    }

    const segments = pathname.split("/").filter(Boolean);
    return decodeURIComponent(segments[segments.length - 1] ?? title ?? "Unknown");
  } catch {
    return title || "Unknown";
  }
}

function createBugId(index: number): string {
  return `BUG-${String(index).padStart(3, "0")}`;
}

function isDestructiveLabel(label: string): boolean {
  return DESTRUCTIVE_PATTERN.test(label);
}

function isNoisyConsoleMessage(message: string): boolean {
  return NOISE_CONSOLE_PATTERN.test(message);
}

function isNoisyNetworkUrl(url: string): boolean {
  return /clarity\.ms|google-analytics|googletagmanager|doubleclick|facebook\.net|hotjar|sentry\.io|favicon/i.test(
    url
  );
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

async function getLabel(locator: Locator, fallback: string): Promise<string> {
  const text =
    (await locator.innerText().catch(() => "")) ||
    (await locator.getAttribute("aria-label")) ||
    (await locator.getAttribute("title")) ||
    (await locator.getAttribute("placeholder")) ||
    (await locator.getAttribute("name")) ||
    (await locator.getAttribute("value")) ||
    fallback;
  return text.replace(/\s+/g, " ").trim().slice(0, 80);
}

function attachPageMonitor(page: Page, origin: string): PageMonitor {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const networkErrors: Array<{ message: string; curl: string }> = [];

  const onConsole = (message: ConsoleMessage) => {
    if (message.type() !== "error") {
      return;
    }
    const text = message.text();
    if (!isNoisyConsoleMessage(text)) {
      consoleErrors.push(text);
    }
  };

  const onPageError = (error: Error) => {
    if (!isNoisyConsoleMessage(error.message)) {
      pageErrors.push(error.message);
    }
  };

  const onResponse = (response: Response) => {
    const status = response.status();
    if (status < 400) {
      return;
    }

    try {
      const responseUrl = response.url();
      if (isNoisyNetworkUrl(responseUrl)) {
        return;
      }
      if (new URL(responseUrl).origin === origin) {
        networkErrors.push({
          message: `${status} ${response.request().method()} ${responseUrl}`,
          curl: requestToCurl(response.request(), status),
        });
      }
    } catch {
      // Ignore invalid response URLs.
    }
  };

  const onRequestFailed = (request: Request) => {
    try {
      const requestUrl = request.url();
      if (isNoisyNetworkUrl(requestUrl)) {
        return;
      }
      if (new URL(requestUrl).origin === origin) {
        const failure = request.failure()?.errorText ?? "Unknown network error";
        if (isNoisyConsoleMessage(failure)) {
          return;
        }
        networkErrors.push({
          message: `REQUEST_FAILED ${request.method()} ${requestUrl}: ${failure}`,
          curl: requestToCurl(request, 0),
        });
      }
    } catch {
      // Ignore invalid request URLs.
    }
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("response", onResponse);
  page.on("requestfailed", onRequestFailed);

  return {
    consoleErrors,
    pageErrors,
    networkErrors,
    detach: () => {
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
      page.off("response", onResponse);
      page.off("requestfailed", onRequestFailed);
    },
  };
}

function drainMonitorBugs(
  monitor: PageMonitor,
  meta: { url: string; title: string; action: string },
  bugs: BugItem[],
  nextBugIndex: () => number,
  curlErrors: string[]
): void {
  const feature = getFeatureName(meta.url, meta.title);
  const screen = meta.title || feature;

  for (const message of monitor.consoleErrors) {
    bugs.push({
      id: createBugId(nextBugIndex()),
      feature,
      screen,
      url: meta.url,
      action: meta.action,
      errorType: "console_error",
      message,
    });
  }

  for (const message of monitor.pageErrors) {
    bugs.push({
      id: createBugId(nextBugIndex()),
      feature,
      screen,
      url: meta.url,
      action: meta.action,
      errorType: "console_error",
      message,
      details: "Uncaught page error",
    });
  }

  for (const networkError of monitor.networkErrors) {
    bugs.push({
      id: createBugId(nextBugIndex()),
      feature,
      screen,
      url: meta.url,
      action: meta.action,
      errorType: "network_error",
      message: networkError.message,
    });
    curlErrors.push(networkError.curl);
  }

  monitor.consoleErrors.length = 0;
  monitor.pageErrors.length = 0;
  monitor.networkErrors.length = 0;
}

async function attachScreenshotsToNewBugs(
  page: Page,
  bugs: BugItem[],
  fromIndex: number,
  evidenceDir: string
): Promise<void> {
  for (const bug of bugs.slice(fromIndex)) {
    bug.screenshot = await captureFailureScreenshot(
      page,
      evidenceDir,
      bug.id,
      bug.feature
    );
  }
}

async function detectVisibleValidationErrors(page: Page): Promise<string[]> {
  return page
    .locator(ERROR_VISIBLE_SELECTORS)
    .filter({ hasText: /.+/ })
    .allTextContents()
    .then((items) =>
      [...new Set(items.map((item) => item.trim()).filter((item) => item.length > 0))]
    )
    .catch(() => []);
}

async function fillInput(locator: Locator, inputType: string): Promise<void> {
  const type = inputType.toLowerCase();

  if (type === "email") {
    await locator.fill("autotest@example.com");
    return;
  }
  if (type === "number" || type === "range") {
    await locator.fill("1");
    return;
  }
  if (type === "tel") {
    await locator.fill("0900000000");
    return;
  }
  if (type === "url") {
    await locator.fill("https://example.com");
    return;
  }
  if (type === "date") {
    await locator.fill("2026-01-01");
    return;
  }
  if (type === "time") {
    await locator.fill("10:00");
    return;
  }
  if (type === "search") {
    await locator.fill("browser automation test");
    return;
  }

  await locator.fill("User test input");
}

async function dismissBlockingOverlays(page: Page): Promise<number> {
  let dismissed = 0;

  // Escape / click outside common dialogs
  await page.keyboard.press("Escape").catch(() => undefined);

  for (const text of DISMISS_BUTTON_TEXTS) {
    const button = page.getByRole("button", { name: text, exact: false }).first();
    if ((await button.count()) === 0) {
      continue;
    }
    if (!(await button.isVisible().catch(() => false))) {
      continue;
    }

    try {
      await button.click({ timeout: 2000 });
      dismissed += 1;
      await page.waitForTimeout(400);
    } catch {
      // Continue trying other dismiss buttons.
    }
  }

  // Cookie / consent / close icons
  const closeCandidates = page.locator(
    [
      'button[aria-label*="close" i]',
      'button[aria-label*="閉じる"]',
      'button[aria-label*="同意"]',
      '[role="dialog"] button',
      ".modal button",
      ".cookie button",
      "#cookie-banner button",
      '[class*="cookie" i] button',
      '[class*="consent" i] button',
      '[class*="overlay" i] button',
    ].join(", ")
  );

  const closeCount = Math.min(await closeCandidates.count(), 5);
  for (let index = 0; index < closeCount; index += 1) {
    const candidate = closeCandidates.nth(index);
    if (!(await candidate.isVisible().catch(() => false))) {
      continue;
    }
    const label = await getLabel(candidate, "close");
    if (isDestructiveLabel(label)) {
      continue;
    }
    try {
      await candidate.click({ timeout: 1500 });
      dismissed += 1;
      await page.waitForTimeout(300);
    } catch {
      // Ignore.
    }
  }

  // Hide leftover overlays that still block pointer events
  await page
    .evaluate(() => {
      const blockers = Array.from(
        document.querySelectorAll('[class*="overlay"], [class*="modal"], [role="dialog"]')
      ) as HTMLElement[];
      for (const element of blockers) {
        const style = window.getComputedStyle(element);
        if (style.position === "fixed" || style.position === "absolute") {
          const coversViewport =
            element.getBoundingClientRect().width > window.innerWidth * 0.5 &&
            element.getBoundingClientRect().height > window.innerHeight * 0.4;
          if (coversViewport && style.pointerEvents !== "none") {
            element.style.pointerEvents = "none";
            element.style.display = "none";
          }
        }
      }
    })
    .catch(() => undefined);

  return dismissed;
}

async function clickLikeUser(
  page: Page,
  locator: Locator,
  options?: { timeout?: number }
): Promise<void> {
  await locator.scrollIntoViewIfNeeded().catch(() => undefined);
  try {
    await locator.click({ timeout: options?.timeout ?? 5000 });
  } catch {
    await dismissBlockingOverlays(page);
    await locator.click({ timeout: options?.timeout ?? 5000, force: true });
  }
}

async function scrollLikeUser(page: Page): Promise<void> {
  await page.mouse.wheel(0, 700);
  await page.waitForTimeout(500);
  await page.mouse.wheel(0, 700);
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }));
  await page.waitForTimeout(300);
}

async function interactWithVisibleInputs(
  page: Page,
  url: string,
  title: string,
  bugs: BugItem[],
  nextBugIndex: () => number,
  bumpActions: () => void
): Promise<void> {
  const feature = getFeatureName(url, title);
  const screen = title || feature;
  const inputs = page.locator(
    'input:visible:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]):not([type="password"]):not([disabled]), textarea:visible:not([disabled])'
  );
  const count = Math.min(await inputs.count(), MAX_VISIBLE_INPUTS);

  for (let index = 0; index < count; index += 1) {
    const input = inputs.nth(index);
    const label = await getLabel(input, `input-${index + 1}`);
    bumpActions();

    try {
      await showTestStep(page, feature, `Type into "${label}"`, input);
      await input.click({ timeout: 3000 }).catch(() => undefined);
      const inputType = (await input.getAttribute("type")) ?? "text";
      await fillInput(input, inputType);
      await page.waitForTimeout(250);
    } catch (error) {
      bugs.push({
        id: createBugId(nextBugIndex()),
        feature,
        screen,
        url,
        action: `Type into "${label}"`,
        errorType: "interaction",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

async function interactWithForms(
  page: Page,
  url: string,
  title: string,
  bugs: BugItem[],
  nextBugIndex: () => number,
  bumpActions: () => void
): Promise<void> {
  const forms = page.locator("form:visible");
  const formCount = Math.min(await forms.count(), MAX_FORMS_PER_PAGE);
  const feature = getFeatureName(url, title);
  const screen = title || feature;

  for (let index = 0; index < formCount; index += 1) {
    const form = forms.nth(index);
    const hasPassword = (await form.locator('input[type="password"]').count()) > 0;
    if (hasPassword) {
      continue;
    }

    const formId = `form-${index + 1}`;
    bumpActions();

    try {
      await showTestStep(page, feature, `Fill ${formId}`, form);
      const inputs = form.locator(
        'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]):not([disabled]), textarea:not([disabled]), select:not([disabled])'
      );
      const inputCount = await inputs.count();

      for (let inputIndex = 0; inputIndex < inputCount; inputIndex += 1) {
        const input = inputs.nth(inputIndex);
        if (!(await input.isVisible().catch(() => false))) {
          continue;
        }

        const tagName = await input.evaluate((element) => element.tagName.toLowerCase());
        if (tagName === "select") {
          const optionCount = await input.locator("option").count();
          if (optionCount > 1) {
            await input.selectOption({ index: 1 });
          }
          continue;
        }

        const inputType = (await input.getAttribute("type")) ?? "text";
        if (inputType === "checkbox" || inputType === "radio") {
          await input.check({ force: true }).catch(() => undefined);
          continue;
        }

        await fillInput(input, inputType);
      }

      const submit = form
        .locator('button[type="submit"], input[type="submit"], button:not([type="button"])')
        .first();

      if ((await submit.count()) === 0) {
        continue;
      }

      const label = await getLabel(submit, "Submit");
      if (isDestructiveLabel(label)) {
        continue;
      }

      bumpActions();
      await showTestStep(page, feature, `Submit ${formId} (${label})`, submit);
      await dismissBlockingOverlays(page);
      await clickLikeUser(page, submit, { timeout: 5000 });
      await page.waitForLoadState("domcontentloaded", { timeout: 10000 }).catch(() => undefined);
      await page.waitForTimeout(800);

      const validationErrors = await detectVisibleValidationErrors(page);
      for (const message of validationErrors) {
        bugs.push({
          id: createBugId(nextBugIndex()),
          feature,
          screen,
          url: page.url(),
          action: `Submit ${formId} (${label})`,
          errorType: "validation_error",
          message,
        });
      }
    } catch (error) {
      bugs.push({
        id: createBugId(nextBugIndex()),
        feature,
        screen,
        url: page.url(),
        action: `Submit ${formId}`,
        errorType: "form_submit",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

async function interactWithButtons(
  page: Page,
  url: string,
  title: string,
  bugs: BugItem[],
  nextBugIndex: () => number,
  bumpActions: () => void
): Promise<void> {
  const buttons = page.locator(
    'button:visible, [role="button"]:visible, input[type="button"]:visible'
  );
  const buttonCount = Math.min(await buttons.count(), MAX_BUTTONS_PER_PAGE);
  const feature = getFeatureName(url, title);
  const screen = title || feature;
  const startUrl = page.url();

  for (let index = 0; index < buttonCount; index += 1) {
    const button = buttons.nth(index);
    const label = await getLabel(button, `button-${index + 1}`);
    if (!label || isDestructiveLabel(label)) {
      continue;
    }

    const inputType = await button.getAttribute("type");
    if (inputType === "submit") {
      continue;
    }

    bumpActions();

    try {
      await showTestStep(page, feature, `Click button "${label}"`, button);
      await dismissBlockingOverlays(page);
      await clickLikeUser(page, button, { timeout: 5000 });
      await page.waitForLoadState("domcontentloaded", { timeout: 8000 }).catch(() => undefined);
      await page.waitForTimeout(600);

      if (page.url() !== startUrl) {
        await dismissBlockingOverlays(page);
        await page.goBack({ waitUntil: "domcontentloaded", timeout: 10000 }).catch(() => undefined);
        await page.waitForTimeout(400);
      }
    } catch (error) {
      bugs.push({
        id: createBugId(nextBugIndex()),
        feature,
        screen,
        url: page.url(),
        action: `Click button "${label}"`,
        errorType: "interaction",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

async function navigateViaLinks(
  page: Page,
  origin: string,
  visited: Set<string>,
  bugs: BugItem[],
  nextBugIndex: () => number,
  bumpActions: () => void,
  curlErrors: string[],
  evidenceDir: string,
  monitor: PageMonitor
): Promise<string[]> {
  const discoveredScreens: string[] = [];
  const links = page.locator("a[href]:visible");
  const linkCount = Math.min(await links.count(), MAX_LINKS_PER_PAGE * 2);
  const candidates: Array<{ locator: Locator; href: string; label: string }> = [];

  for (let index = 0; index < linkCount && candidates.length < MAX_LINKS_PER_PAGE; index += 1) {
    const link = links.nth(index);
    const href = await link.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:")) {
      continue;
    }

    let absoluteHref: string;
    try {
      absoluteHref = normalizeUrl(new URL(href, page.url()).toString());
    } catch {
      continue;
    }

    if (!isSameOrigin(absoluteHref, origin) || visited.has(absoluteHref)) {
      continue;
    }

    const label = await getLabel(link, absoluteHref);
    if (isDestructiveLabel(label)) {
      continue;
    }

    candidates.push({ locator: link, href: absoluteHref, label });
  }

  for (const candidate of candidates) {
    const beforeUrl = page.url();
    const feature = getFeatureName(beforeUrl, await page.title());
    bumpActions();

    try {
      await showTestStep(page, feature, `Open screen "${candidate.label}"`, candidate.locator);
      await dismissBlockingOverlays(page);
      await clickLikeUser(page, candidate.locator, { timeout: 6000 });
      await page.waitForLoadState("domcontentloaded", { timeout: 15000 }).catch(() => undefined);
      await page.waitForTimeout(800);
      await dismissBlockingOverlays(page);

      const arrivedUrl = normalizeUrl(page.url());
      visited.add(arrivedUrl);
      discoveredScreens.push(arrivedUrl);

      const title = await page.title();
      await showTestStep(page, getFeatureName(arrivedUrl, title), `Explore screen "${candidate.label}"`);

      // Act on the newly opened screen like a user.
      await scrollLikeUser(page);
      await interactWithVisibleInputs(
        page,
        arrivedUrl,
        title,
        bugs,
        nextBugIndex,
        bumpActions
      );
      await interactWithForms(page, arrivedUrl, title, bugs, nextBugIndex, bumpActions);

      const previousBugCount = bugs.length;
      drainMonitorBugs(
        monitor,
        {
          url: arrivedUrl,
          title,
          action: `Navigate to "${candidate.label}"`,
        },
        bugs,
        nextBugIndex,
        curlErrors
      );
      await attachScreenshotsToNewBugs(page, bugs, previousBugCount, evidenceDir);

      // Return to previous screen to continue browsing.
      if (normalizeUrl(page.url()) !== normalizeUrl(beforeUrl)) {
        await page.goBack({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(async () => {
          await page.goto(beforeUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
        });
        await page.waitForTimeout(500);
        await dismissBlockingOverlays(page);
      }
    } catch (error) {
      const previousBugCount = bugs.length;
      bugs.push({
        id: createBugId(nextBugIndex()),
        feature,
        screen: await page.title().catch(() => feature),
        url: page.url(),
        action: `Open screen "${candidate.label}"`,
        errorType: "navigation",
        message: error instanceof Error ? error.message : String(error),
        details: candidate.href,
      });
      await attachScreenshotsToNewBugs(page, bugs, previousBugCount, evidenceDir);

      // Recover to original page if navigation broke the session.
      if (!page.url().startsWith(origin)) {
        await page.goto(beforeUrl, { waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => undefined);
      }
    }
  }

  return discoveredScreens;
}

async function explorePageAsUser(
  page: Page,
  target: PageResult,
  origin: string,
  visited: Set<string>,
  bugs: BugItem[],
  nextBugIndex: () => number,
  bumpActions: () => void,
  curlErrors: string[],
  evidenceDir: string
): Promise<void> {
  const monitor = attachPageMonitor(page, origin);
  const feature = getFeatureName(target.url, target.title);
  const screen = target.title || feature;

  try {
    const response = await page.goto(target.url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForTimeout(800);
    await dismissBlockingOverlays(page);
    await showTestStep(page, feature, "Open page like a user");

    const httpStatus = response?.status() ?? null;
    if (httpStatus !== null && httpStatus >= 400) {
      const previousBugCount = bugs.length;
      bugs.push({
        id: createBugId(nextBugIndex()),
        feature,
        screen,
        url: target.url,
        action: "Open page",
        errorType: "page_load",
        message: `HTTP ${httpStatus} when loading page`,
      });
      if (response) {
        curlErrors.push(requestToCurl(response.request(), httpStatus));
      }
      await attachScreenshotsToNewBugs(page, bugs, previousBugCount, evidenceDir);
      return;
    }

    bumpActions();
    visited.add(normalizeUrl(page.url()));

    // 1) Browse the page like a user
    await scrollLikeUser(page);
    await dismissBlockingOverlays(page);

    // 2) Type into visible fields
    let previousBugCount = bugs.length;
    await interactWithVisibleInputs(
      page,
      page.url(),
      await page.title(),
      bugs,
      nextBugIndex,
      bumpActions
    );
    drainMonitorBugs(
      monitor,
      { url: page.url(), title: await page.title(), action: "Type into visible inputs" },
      bugs,
      nextBugIndex,
      curlErrors
    );
    await attachScreenshotsToNewBugs(page, bugs, previousBugCount, evidenceDir);

    // 3) Fill and submit forms
    previousBugCount = bugs.length;
    await interactWithForms(
      page,
      page.url(),
      await page.title(),
      bugs,
      nextBugIndex,
      bumpActions
    );
    drainMonitorBugs(
      monitor,
      { url: page.url(), title: await page.title(), action: "Submit forms" },
      bugs,
      nextBugIndex,
      curlErrors
    );
    await attachScreenshotsToNewBugs(page, bugs, previousBugCount, evidenceDir);

    // 4) Click buttons
    previousBugCount = bugs.length;
    await interactWithButtons(
      page,
      page.url(),
      await page.title(),
      bugs,
      nextBugIndex,
      bumpActions
    );
    drainMonitorBugs(
      monitor,
      { url: page.url(), title: await page.title(), action: "Click buttons" },
      bugs,
      nextBugIndex,
      curlErrors
    );
    await attachScreenshotsToNewBugs(page, bugs, previousBugCount, evidenceDir);

    // 5) Click menu/links to open other screens, explore them, then return
    previousBugCount = bugs.length;
    const openedScreens = await navigateViaLinks(
      page,
      origin,
      visited,
      bugs,
      nextBugIndex,
      bumpActions,
      curlErrors,
      evidenceDir,
      monitor
    );
    drainMonitorBugs(
      monitor,
      {
        url: page.url(),
        title: await page.title(),
        action: `Navigate to ${openedScreens.length} other screens`,
      },
      bugs,
      nextBugIndex,
      curlErrors
    );
    await attachScreenshotsToNewBugs(page, bugs, previousBugCount, evidenceDir);
  } catch (error) {
    const previousBugCount = bugs.length;
    bugs.push({
      id: createBugId(nextBugIndex()),
      feature,
      screen,
      url: target.url,
      action: "Explore page as user",
      errorType: "interaction",
      message: error instanceof Error ? error.message : String(error),
    });
    await attachScreenshotsToNewBugs(page, bugs, previousBugCount, evidenceDir);
  } finally {
    monitor.detach();
  }
}

export async function runUserExploration(
  createSession: ExplorationSessionFactory,
  crawlResults: PageResult[],
  entryUrl: string,
  runNumber: number,
  scannedAt: string,
  evidenceDir: string
): Promise<ExplorationResult> {
  const origin = new URL(entryUrl).origin;
  const targets = crawlResults.filter((item) => item.ok);
  const bugs: BugItem[] = [];
  const curlErrors: string[] = [];
  const visited = new Set<string>();
  let totalActions = 0;
  let bugCounter = 1;

  const nextBugIndex = () => bugCounter++;
  const bumpActions = () => {
    totalActions += 1;
  };

  // Prefer starting from entry URL, then continue with remaining crawled pages.
  const orderedTargets = [...targets].sort((a, b) => {
    if (normalizeUrl(a.url) === normalizeUrl(entryUrl)) {
      return -1;
    }
    if (normalizeUrl(b.url) === normalizeUrl(entryUrl)) {
      return 1;
    }
    return 0;
  });

  for (let pageIndex = 0; pageIndex < orderedTargets.length; pageIndex += 1) {
    const target = orderedTargets[pageIndex];
    const normalized = normalizeUrl(target.url);
    if (visited.has(normalized)) {
      continue;
    }

    const session = await createSession(pageIndex + 1, target);
    const page = await session.context.newPage();
    const firstBugIndex = bugs.length;
    const video = page.video();
    try {
      try {
        await explorePageAsUser(
          page,
          target,
          origin,
          visited,
          bugs,
          nextBugIndex,
          bumpActions,
          curlErrors,
          evidenceDir
        );
      } finally {
        await page.close();
      }

      if (bugs.length > firstBugIndex && video) {
        const rawVideoPath = await video.path().catch(() => undefined);
        if (rawVideoPath) {
          const mp4Path = await convertVideoToMp4(
            rawVideoPath,
            evidenceDir,
            runNumber,
            pageIndex + 1,
            getFeatureName(target.url, target.title)
          );
          for (const bug of bugs.slice(firstBugIndex)) {
            bug.video = mp4Path;
          }
        }
      } else if (video) {
        const rawVideoPath = await video.path().catch(() => undefined);
        if (rawVideoPath) {
          const { rm } = await import("node:fs/promises");
          await rm(rawVideoPath, { force: true }).catch(() => undefined);
        }
      }
    } finally {
      await session.context.close().catch(() => undefined);
      await session.browser.close().catch(() => undefined);
    }
  }

  const bugCount = bugs.length;
  const status = bugCount === 0 ? "no_bugs" : "has_bugs";
  const summary =
    bugCount === 0
      ? `Run ${runNumber}: No UI bugs found after user-like actions on ${visited.size} screens (${totalActions} actions).`
      : `Run ${runNumber}: Found ${bugCount} bug(s) after user-like actions on ${visited.size} screens (${totalActions} actions).`;

  return {
    bugReport: {
      runNumber,
      scannedAt,
      entryUrl,
      totalPagesTested: visited.size || targets.length,
      totalActions,
      bugCount,
      status,
      summary,
      bugs,
    },
    curlErrors,
  };
}

export function buildBugReportMarkdownVi(report: BugReport): string {
  const lines = [
    `# Báo cáo lỗi - Lần chạy ${report.runNumber}`,
    "",
    `**Trạng thái:** ${report.status === "no_bugs" ? "Không có lỗi" : `Có ${report.bugCount} lỗi`}`,
    `**Thời gian:** ${report.scannedAt}`,
    `**Entry URL:** ${report.entryUrl}`,
    `**Số màn hình đã kiểm tra:** ${report.totalPagesTested}`,
    `**Số thao tác đã thực hiện:** ${report.totalActions}`,
    "",
    "## Kết quả",
    "",
    report.bugCount === 0
      ? `Lần chạy ${report.runNumber}: Không phát hiện lỗi trong ${report.totalPagesTested} màn hình đã kiểm tra.`
      : `Lần chạy ${report.runNumber}: Phát hiện ${report.bugCount} lỗi trong ${report.totalPagesTested} màn hình đã kiểm tra.`,
    "",
  ];

  if (report.bugCount === 0) {
    lines.push("Không phát hiện lỗi trong lần chạy này.");
    return lines.join("\n");
  }

  lines.push("## Danh sách lỗi", "");

  report.bugs.forEach((bug, index) => {
    lines.push(
      `### Lỗi ${index + 1}: ${bug.id}`,
      `- **Chức năng:** ${bug.feature}`,
      `- **Màn hình:** ${bug.screen}`,
      `- **URL:** ${bug.url}`,
      `- **Thao tác:** ${bug.action}`,
      `- **Loại lỗi:** ${bug.errorType}`,
      `- **Mô tả:** ${bug.message}`,
      ...(bug.details ? [`- **Chi tiết:** ${bug.details}`] : []),
      ...(bug.screenshot ? [`- **Ảnh evidence:** ${bug.screenshot}`] : []),
      ...(bug.video ? [`- **Video evidence:** ${bug.video}`] : []),
      ""
    );
  });

  return lines.join("\n");
}

export function buildBugReportMarkdownEn(report: BugReport): string {
  const lines = [
    `# Bug Report - Run ${report.runNumber}`,
    "",
    `**Status:** ${report.status === "no_bugs" ? "No bugs" : `${report.bugCount} bug(s) found`}`,
    `**Time:** ${report.scannedAt}`,
    `**Entry URL:** ${report.entryUrl}`,
    `**Screens tested:** ${report.totalPagesTested}`,
    `**Actions performed:** ${report.totalActions}`,
    "",
    "## Result",
    "",
    report.bugCount === 0
      ? `Run ${report.runNumber}: No bugs were detected across ${report.totalPagesTested} tested screens.`
      : `Run ${report.runNumber}: ${report.bugCount} bug(s) were detected across ${report.totalPagesTested} tested screens.`,
    "",
  ];

  if (report.bugCount === 0) {
    lines.push("No issues were detected in this run.");
    return lines.join("\n");
  }

  lines.push("## Bugs", "");

  report.bugs.forEach((bug, index) => {
    lines.push(
      `### Bug ${index + 1}: ${bug.id}`,
      `- **Feature:** ${bug.feature}`,
      `- **Screen:** ${bug.screen}`,
      `- **URL:** ${bug.url}`,
      `- **Action:** ${bug.action}`,
      `- **Error type:** ${bug.errorType}`,
      `- **Description:** ${bug.message}`,
      ...(bug.details ? [`- **Details:** ${bug.details}`] : []),
      ...(bug.screenshot ? [`- **Screenshot evidence:** ${bug.screenshot}`] : []),
      ...(bug.video ? [`- **Video evidence:** ${bug.video}`] : []),
      ""
    );
  });

  return lines.join("\n");
}
