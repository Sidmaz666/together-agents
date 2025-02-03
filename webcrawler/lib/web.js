const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const randomUseragent = require("random-useragent");
const { randomNumber, randomDelay, fetchProxyList } = require("../utils/utils"); // Helper functions for randomness

puppeteer.use(StealthPlugin());

class PuppeteerService {
  constructor() {
    this.browser = null;
    this.page = null;
    this.pageOptions = null;
    this.waitForFunction = null;
    this.isLinkCrawlTest = null;
    this.proxyList = [];
    this.currentProxyIndex = 0;
    this.countsLimitsData = {
      millisecondsTimeoutSourceRequestCount: 600000, // 60 seconds timeout
    };
    this.isInitialized = false;
  }

  async initiate() {
    if (this.isInitialized) return;
    this.pageOptions = {
      waitUntil: "networkidle2",
      timeout: this.countsLimitsData.millisecondsTimeoutSourceRequestCount,
    };
    this.waitForFunction = 'document.querySelector("body")';
    this.isLinkCrawlTest = false;

    // Fetch proxy list
    this.proxyList = await fetchProxyList();
    if (this.proxyList.length === 0) {
      throw new Error("No proxies available");
    }

    this.browser = await this.launchBrowserWithProxy();
    this.page = await this.createPage(this.browser);
    this.isInitialized = true;
  }

  async launchBrowserWithProxy() {
    const proxy = this.proxyList[this.currentProxyIndex];
    const browser = await puppeteer.launch({
      headless: true,
      ignoreHTTPSErrors: true,
      args: [
        `--proxy-server=https://${proxy}`,
        "--no-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--disable-setuid-sandbox",
        "--no-first-run",
        "--no-zygote",
        "--ignore-certificate-errors",
        "--enable-features=NetworkService",
      ],
    });
    return browser;
  }

  async createPage(browser) {
    const userAgent = randomUseragent.getRandom();
    const page = await browser.newPage();

    // Randomize viewport size
    await page.setViewport({
      width: 1920 + Math.floor(Math.random() * 100),
      height: 3000 + Math.floor(Math.random() * 100),
      deviceScaleFactor: 1,
      hasTouch: false,
      isLandscape: false,
      isMobile: false,
    });

    await page.setUserAgent(userAgent);
    await page.setJavaScriptEnabled(true);
    await page.setDefaultNavigationTimeout(0);

    // Skip images/styles/fonts loading for performance
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (["stylesheet", "font", "image"].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Bypassing browser verification
    await this.bypassVerification(page);

    return page;
  }

  async bypassVerification(page) {
    await page.evaluateOnNewDocument(() => {
      // Pass webdriver check
      Object.defineProperty(navigator, "webdriver", {
        get: () => false,
      });

      // Pass chrome check
      window.chrome = {
        runtime: {},
        app: {
          isInstalled: false,
        },
        webstore: {
          onInstallStageChanged: {},
          onDownloadProgress: {},
        },
        csi: () => {},
        loadTimes: () => {},
      };

      // Pass notifications check
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) =>
        parameters.name === "notifications"
          ? Promise.resolve({ state: Notification.permission })
          : originalQuery(parameters);

      // Overwrite the `plugins` property
      Object.defineProperty(navigator, "plugins", {
        get: () => [
          {
            name: "Chrome PDF Plugin",
            filename: "internal-pdf-viewer",
            description: "Portable Document Format",
          },
          {
            name: "Chrome PDF Viewer",
            filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
            description: "Portable Document Format",
          },
          {
            name: "Native Client",
            filename: "internal-nacl-plugin",
            description: "Native Client Executable",
          },
        ],
      });

      // Overwrite the `languages` property
      Object.defineProperty(navigator, "languages", {
        get: () => ["en-US", "en"],
      });

      // Overwrite the `platform` property
      Object.defineProperty(navigator, "platform", {
        get: () => "Linux x86_64", // Modern and common platform
      });

      // Overwrite the `hardwareConcurrency` property
      Object.defineProperty(navigator, "hardwareConcurrency", {
        get: () => 8, // Common for modern systems
      });

      // Overwrite the `deviceMemory` property
      Object.defineProperty(navigator, "deviceMemory", {
        get: () => 8, // Common for modern systems
      });

      // Overwrite the `userAgent` property
      Object.defineProperty(navigator, "userAgent", {
        get: () =>
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36", // Modern user agent
      });

      // Overwrite the `vendor` property
      Object.defineProperty(navigator, "vendor", {
        get: () => "Google Inc.",
      });

      // Overwrite the `maxTouchPoints` property
      Object.defineProperty(navigator, "maxTouchPoints", {
        get: () => 0, // Indicates no touch support
      });

      // Overwrite the `connection` property
      Object.defineProperty(navigator, "connection", {
        get: () => ({
          downlink: 10,
          effectiveType: "4g",
          rtt: 50,
          saveData: false,
        }),
      });

      // Overwrite the `productSub` property
      Object.defineProperty(navigator, "productSub", {
        get: () => "20030107", // Common for Chrome
      });

      // Overwrite the `appVersion` property
      Object.defineProperty(navigator, "appVersion", {
        get: () =>
          "5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
      });

      // Overwrite the `product` property
      Object.defineProperty(navigator, "product", {
        get: () => "Gecko",
      });

      // Overwrite the `appCodeName` property
      Object.defineProperty(navigator, "appCodeName", {
        get: () => "Mozilla",
      });

      // Overwrite the `appName` property
      Object.defineProperty(navigator, "appName", {
        get: () => "Netscape",
      });
    });
  }

  async emulateHumanBehavior() {
    // Random mouse movements
    await this.page.mouse.move(randomNumber(100, 500), randomNumber(100, 500), {
      steps: 2,
    });
    await randomDelay(100, 500);
    let c = 0;
    await new Promise(async (resolve, _) => {
      const iv = setInterval(async () => {
        const scrollAmount = randomNumber(200, 500);
        await this.page.evaluate((scrollAmount) => {
          window.scrollBy(0, scrollAmount);
        }, scrollAmount);
        if (c >= 3) {
          resolve();
          clearInterval(iv);
        }
        c++;
      }, randomNumber(500, 1500));
    });

    // Random clicks
    await this.page.mouse.click(randomNumber(100, 500), randomNumber(100, 500));
  }

  async crawl(link) {
    if (!this.isInitialized) {
      await this.initiate();
    }
    const crawlResults = {
      isValidPage: true,
      pageSource: null,
      links: [],
      images: [],
      url: this.link,
    };
    let retryCount = 0;
    const maxRetries = this.proxyList.length;

    while (retryCount < maxRetries) {
      try {
        await this.page.goto(link, this.pageOptions);
        await this.page.waitForFunction(this.waitForFunction);

        // Emulate human behavior
        await this.emulateHumanBehavior();

        const html = await this.page.content();
        crawlResults.images = [];
        return await this.page.evaluate(
          (crawlResults, html) => {
            function parseDocument() {
              // Get the body content as a string
              let bodyContent = document.body.innerHTML;

              // Remove <style> and <script> tags from the body content
              const tempDiv = document.createElement("div");
              tempDiv.innerHTML = bodyContent;

              const styleTags = tempDiv.querySelectorAll("style");
              styleTags.forEach((style) => style.remove());

              const scriptTags = tempDiv.querySelectorAll("script");
              scriptTags.forEach((script) => script.remove());

              // Update the body content after removing the tags
              bodyContent = tempDiv.innerHTML;

              // Get all meta tags
              const metaTags = document.querySelectorAll("meta");

              // Convert meta tags to an array of strings
              const metaTagsArray = Array.from(metaTags).map(
                (meta) => meta.outerHTML
              );

              // Stringify the body content and meta tags
              const stringifiedBody = JSON.stringify(bodyContent);
              const stringifiedMetaTags = JSON.stringify(metaTagsArray);

              return {
                body: stringifiedBody,
                meta: stringifiedMetaTags,
              };
            }
            crawlResults.pageSource = parseDocument(html);
            crawlResults.textContent = document.body.innerText;
            const images = Array.from(document.querySelectorAll("img"));
            for (const img of images) {
              if (img?.src && img.src.length > 0) {
                crawlResults.images.push(img.src);
              }
            }
            const links = Array.from(document.querySelectorAll("a"));
            for (const link of links) {
              if (link?.href && link.href.length > 0) {
                crawlResults.links.push({ title: link?.alt, href: link?.href });
              }
            }
            return crawlResults; // Return the results if needed
          },
          crawlResults,
          html
        );
      } catch (error) {
        retryCount++;
        if (retryCount >= maxRetries) {
          crawlResults.isValidPage = false;
          break;
        }

        // Switch to the next proxy
        this.currentProxyIndex =
          (this.currentProxyIndex + 1) % this.proxyList.length;
        await this.close();
        this.browser = await this.launchBrowserWithProxy();
        this.page = await this.createPage(this.browser);
      }
    }

    if (this.isLinkCrawlTest) {
      this.isLinkCrawlTest = null;
    }
    return crawlResults;
  }

  async close() {
    this.isInitialized = false;
    if (this.browser) {
      await this.browser.close();
    }
  }
}

module.exports = PuppeteerService;
