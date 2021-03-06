const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const TimeObserver = require('./utils/time-observer');
const chalk = require('chalk');
const fs = require("fs");
const median = require('./utils/median');
const desktopConfig = require('./lighthouse-config/desktop-config');

const timeObserver = new TimeObserver();

const [url, runs, emulator] = parseArgs();
profile(url, runs, emulator);

function parseArgs() {
  let [url = 'https://example.com', runs = 1, emulator = 'desktop'] = process.argv.slice(2);

  runs = runs === 1 ? 1 : parseInt(runs);

  return [url, runs, emulator];
}

async function profile(url, runs, emulator) {
  console.log(
    `Profiling startet with this config: ${chalk.cyan(
      `{url: ${url}, runs: ${runs}, emulator: ${emulator}}`,
    )}`,
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

  const mainBundleTotalCpuTimeTimes = [];
  const mainBundleScriptingTimeTimes = [];
  const mainBundleParsingTimeTimes = [];

  const mainBundleSizeTimes = [];
  const mainBundleGzippedTimes = [];
  const mainBundleDownloadTimes = [];

  for (let i = 0; i < runs; i++) {
    timeObserver.mark('run_start');
    const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });

    const options = {
      logLevel: 'error',
      onlyCategories: ['performance'],
      port: chrome.port,
    };

    const config = emulator === 'desktop' ? desktopConfig : null;
    const runnerResult = await lighthouse(url, options, config);

    const {
      'speed-index': { numericValue: speedIndex },
      'total-blocking-time': { numericValue: tbt },
      'first-contentful-paint': { numericValue: fcp },
      'cumulative-layout-shift': { numericValue: cls },
      'largest-contentful-paint': { numericValue: lcp },
      interactive: { numericValue: tti },
      redirects: { numericValue: redirects },
      "bootup-time": {details: {items: [mainBundleCPUTime]}},
      "network-requests": {details: {items: networkreqeusts}}
    } = runnerResult.lhr.audits;

    fcpTimes.push(fcp);
    lcpTimes.push(lcp);
    tbtTimes.push(tbt);
    clsTimes.push(cls);
    speedIndexTimes.push(speedIndex);
    ttiTimes.push(tti);
    redirectsTimes.push(redirects);

    // JS execution metrics (index.dist.js)
    mainBundleTotalCpuTimeTimes.push(mainBundleCPUTime.total);
    mainBundleScriptingTimeTimes.push(mainBundleCPUTime.scripting);
    mainBundleParsingTimeTimes.push(mainBundleCPUTime.scriptParseCompile);
    
    // Network metrics (index.dist.js)
    const mainBundleReq = networkreqeusts.find(req => req.url.endsWith("/dist/js/index.dist.js"));
    mainBundleDownloadTimes.push(mainBundleReq.endTime - mainBundleReq.startTime);
    mainBundleSizeTimes.push(mainBundleReq.resourceSize);
    mainBundleGzippedTimes.push(mainBundleReq.transferSize);

    performanceTimes.push(runnerResult.lhr.categories.performance.score * 100);

    await chrome.kill();

    timeObserver.measure(`Run ${i + 1}`, 'run_start');
  }

  const result = `
The results are the medians of all ${runs} runs:
- LCP (${chalk.green('Core Web Vital')}) = ${Math.round(median(lcpTimes))} ms 
- CLS (${chalk.green('Core Web Vital')}) = ${Math.round(median(clsTimes))} ms
- TBT (${chalk.green('Core Web Vital')}) = ${Math.round(median(tbtTimes))} ms
- FCP = ${Math.round(median(fcpTimes))} ms
- Speed Index = ${Math.round(median(speedIndexTimes))} ms
- TTI = ${Math.round(median(ttiTimes))} ms
- Redirects = ${Math.round(median(redirectsTimes))}
- index.dist.js
  - download time = ${Math.round(median(mainBundleDownloadTimes))} ms
  - transfer/gzipped size = ${Math.round(median(mainBundleGzippedTimes)) / 1000} MB
  - unpacked size = ${Math.round(median(mainBundleSizeTimes))  / 1000} MB
  - (parse + compile + execute) time = ${Math.round(median(mainBundleTotalCpuTimeTimes))} ms
- Lighthouse Performance = ${Math.round(median(performanceTimes))}`;

console.log(result);
  fs.writeFileSync("latest.txt", result);
}