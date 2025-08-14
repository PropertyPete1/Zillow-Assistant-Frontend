// bg.js - Background service worker
class TabOpener {
  constructor() {
    this.limits = { perHour: 25, perDay: 75 };
    this.counters = { hour: 0, day: 0 };
    this.timestamps = { hourStart: Date.now(), dayStart: Date.now() };
    this.queue = [];
    this.paused = false;
    this.opening = false;
    this.openCount = 0; // Track opens for micro-breaks

    this.init();
  }

  async init() {
    // Load limits from storage
    const settings = await chrome.storage.sync.get({
      capHour: 25,
      capDay: 75
    });
    
    this.limits.perHour = settings.capHour;
    this.limits.perDay = settings.capDay;
  }

  resetCounters() {
    const now = Date.now();
    const hourMs = 60 * 60 * 1000;
    const dayMs = 24 * hourMs;

    // Reset hour counter
    if (now - this.timestamps.hourStart >= hourMs) {
      this.counters.hour = 0;
      this.timestamps.hourStart = now;
    }

    // Reset day counter
    if (now - this.timestamps.dayStart >= dayMs) {
      this.counters.day = 0;
      this.timestamps.dayStart = now;
    }
  }

  canOpen() {
    this.resetCounters();
    return !this.paused && 
           this.counters.hour < this.limits.perHour && 
           this.counters.day < this.limits.perDay;
  }

  async openNext() {
    if (this.opening || this.queue.length === 0 || !this.canOpen()) {
      return;
    }

    this.opening = true;
    const item = this.queue.shift();

    try {
      // Create tab
      await chrome.tabs.create({
        url: item.url,
        active: false
      });

      // Update counters
      this.counters.hour++;
      this.counters.day++;
      this.openCount++;

      console.log(`Opened tab ${this.openCount}: ${item.url}`);
      console.log(`Counters: ${this.counters.hour}/${this.limits.perHour} hour, ${this.counters.day}/${this.limits.perDay} day`);

      // Micro-break every 6-10 opens
      if (this.openCount % (6 + Math.floor(Math.random() * 5)) === 0) {
        const breakTime = 60000 + Math.random() * 120000; // 60-180s
        console.log(`Taking micro-break for ${Math.round(breakTime/1000)}s`);
        await this.sleep(breakTime);
      } else {
        // Regular jitter between opens
        const jitter = 20000 + Math.random() * 30000; // 20-50s
        await this.sleep(jitter);
      }

    } catch (error) {
      console.error('Failed to open tab:', error);
    } finally {
      this.opening = false;
      
      // Continue with next item
      if (this.queue.length > 0) {
        setTimeout(() => this.openNext(), 1000);
      }
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  addBatch(items) {
    this.queue.push(...items);
    console.log(`Added ${items.length} items to queue. Total: ${this.queue.length}`);
    
    // Start opening if not already
    if (!this.opening) {
      setTimeout(() => this.openNext(), 1000);
    }
  }

  pause() {
    this.paused = true;
    console.log('Tab opening paused');
  }

  resume() {
    this.paused = false;
    console.log('Tab opening resumed');
    
    // Resume opening if queue has items
    if (this.queue.length > 0 && !this.opening) {
      setTimeout(() => this.openNext(), 1000);
    }
  }

  setLimits(limits) {
    this.limits = { ...this.limits, ...limits };
    console.log('Updated limits:', this.limits);
  }
}

// Initialize tab opener
const tabOpener = new TabOpener();

// Handle messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'OPEN_BATCH':
      if (message.items && Array.isArray(message.items)) {
        tabOpener.addBatch(message.items);
      }
      break;

    case 'PAUSE':
      tabOpener.pause();
      break;

    case 'RESUME':
      tabOpener.resume();
      break;

    case 'SET_LIMITS':
      if (message.limits) {
        tabOpener.setLimits(message.limits);
      }
      break;
  }
});

// Handle extension install/update
chrome.runtime.onInstalled.addEventListener((details) => {
  if (details.reason === 'install') {
    console.log('Zillow FRBO Helper installed');
  } else if (details.reason === 'update') {
    console.log('Zillow FRBO Helper updated');
  }
});


