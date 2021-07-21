const lighthouse = require("lighthouse");
const chromeLauncher = require("chrome-launcher");
const TimeObserver = require("./utils/time-observer");
const chalk = require("chalk");
const median = require("./utils/median");
const desktopConfig = require("./lighthouse-config/desktop-config");

const timeObserver = new TimeObserver();

const [url, runs, emulator] = parseArgs();
profile(url, runs, emulator);

function parseArgs() {
  let [url = "https://example.com", runs = 1, emulator = "desktop"] =
    process.argv.slice(2);

  runs = runs === 1 ? 1 : parseInt(runs);

  return [url, runs, emulator];
}

async function profile(url, runs, emulator) {
  console.log(
    `Profiling startet with this config: ${chalk.cyan(
      `{url: ${url}, runs: ${runs}, emulator: ${emulator}}`
    )}`
  );

  console.log();
  timeObserver.observe();

  const fcpTimes = [];
  const lcpTimes = [];
  const tbtTimes = [];
  const speedIndexTimes = [];
  const clsTimes = [];
  const ttiTimes = [];
  const redirectsTimes = [];
  const performanceTimes = [];

  for (let i = 0; i < runs; i++) {
    timeObserver.mark("run_start");
    const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless"] });

    const options = {
      logLevel: "error",
      onlyCategories: ["performance"],
      port: chrome.port,
    };

    const config = emulator === "desktop" ? desktopConfig : null;
    const runnerResult = await lighthouse(url, options, config);

    const {
      "speed-index": { numericValue: speedIndex },
      "total-blocking-time": { numericValue: tbt },
      "first-contentful-paint": { numericValue: fcp },
      "cumulative-layout-shift": { numericValue: cls },
      "largest-contentful-paint": { numericValue: lcp },
      interactive: { numericValue: tti },
      redirects: { numericValue: redirects },
    } = runnerResult.lhr.audits;

    fcpTimes.push(fcp);
    lcpTimes.push(lcp);
    tbtTimes.push(tbt);
    speedIndexTimes.push(speedIndex);
    clsTimes.push(cls);
    ttiTimes.push(tti);
    redirectsTimes.push(redirects);
    performanceTimes.push(runnerResult.lhr.categories.performance.score * 100);

    await chrome.kill();

    timeObserver.measure(`Run ${i + 1}`, "run_start");
  }

  // prettier-ignore
  console.log(`
The results are the medians of all ${runs} runs:
- LCP (${chalk.green("Core Web Vital")}) = ${Math.round(median(lcpTimes))} ms 
- CLS (${chalk.green("Core Web Vital")}) = ${Math.round(median(clsTimes))} ms
- FCP = ${Math.round(median(fcpTimes))} ms
- Speed Index = ${Math.round(median(speedIndexTimes))} ms
- TTI = ${Math.round(median(ttiTimes))} ms
- TBT = ${Math.round(median(tbtTimes))} ms
- Redirects = ${Math.round(median(redirectsTimes))}
- Lighthouse Performance = ${Math.round(median(performanceTimes))}`
  );
}
