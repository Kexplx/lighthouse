const { PerformanceObserver, performance } = require("perf_hooks");

class TimeObserver {
  constructor() {
    this.measurements = [];
    this.isObserving = false;

    this.observer = new PerformanceObserver((items) => {
      const { name, duration } = items.getEntries()[0];

      console.log(`${name} finished after ${Math.round(duration)} ms`);
    });
  }

  observe() {
    if (this.isObserving === false) {
      this.observer.observe({ entryTypes: ["measure"] });

      this.isObserving = true;
    }
  }

  disconnect() {
    if (this.isObserving === true) {
      this.observer.disconnect();

      this.isObserving = false;
    }
  }

  mark(name) {
    performance.mark(name);
  }

  measure(...args) {
    const [a0, a1, a2] = args;

    if (args.length == 2) {
      performance.measure(a0, a1);
    } else if (args.length == 3) {
      performance.measure(a0, a1, a2);
    }
  }
}

module.exports = TimeObserver;
