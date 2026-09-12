import { Redis } from "ioredis";

/**
 * High-performance In-Memory fallback store with TTL expiration.
 * Guarantees zero-crash local development even when a Redis server
 * is not running or temporarily unavailable.
 */
class InMemoryRedis {
  constructor() {
    this.store = new Map();
    this.mode = "IN_MEMORY";

    // Periodic sweep every 30s to prune expired keys
    this.sweepInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, item] of this.store.entries()) {
        if (item.expiresAt && item.expiresAt <= now) {
          this.store.delete(key);
        }
      }
    }, 30000);

    if (this.sweepInterval.unref) {
      this.sweepInterval.unref();
    }
  }

  _isExpired(item) {
    if (!item) return true;
    if (item.expiresAt && item.expiresAt <= Date.now()) {
      return true;
    }
    return false;
  }

  async get(key) {
    const item = this.store.get(String(key));
    if (!item) return null;
    if (this._isExpired(item)) {
      this.store.delete(String(key));
      return null;
    }
    return item.value;
  }

  async set(key, value, ...args) {
    const k = String(key);
    const val = typeof value === "object" && value !== null ? JSON.stringify(value) : String(value);

    let ttlMs = null;
    let nx = false;

    for (let i = 0; i < args.length; i++) {
      const arg = String(args[i]).toUpperCase();
      if (arg === "EX" && args[i + 1] !== undefined) {
        ttlMs = Number(args[i + 1]) * 1000;
        i++;
      } else if (arg === "PX" && args[i + 1] !== undefined) {
        ttlMs = Number(args[i + 1]);
        i++;
      } else if (arg === "NX") {
        nx = true;
      }
    }

    if (nx) {
      const existing = this.store.get(k);
      if (existing && !this._isExpired(existing)) {
        return null; // Condition not met (already exists)
      }
    }

    this.store.set(k, {
      value: val,
      expiresAt: ttlMs ? Date.now() + ttlMs : null,
    });

    return "OK";
  }

  async setex(key, seconds, value) {
    return this.set(key, value, "EX", seconds);
  }

  async setnx(key, value) {
    const res = await this.set(key, value, "NX");
    return res === "OK" ? 1 : 0;
  }

  async del(...keys) {
    let count = 0;
    for (const key of keys.flat()) {
      const k = String(key);
      if (this.store.delete(k)) {
        count++;
      }
    }
    return count;
  }

  async incr(key) {
    const k = String(key);
    const existing = await this.get(k);
    let num = existing ? parseInt(existing, 10) : 0;
    if (isNaN(num)) num = 0;
    num += 1;
    const oldItem = this.store.get(k);
    this.store.set(k, {
      value: String(num),
      expiresAt: oldItem ? oldItem.expiresAt : null,
    });
    return num;
  }

  async expire(key, seconds) {
    const k = String(key);
    const item = this.store.get(k);
    if (!item || this._isExpired(item)) {
      this.store.delete(k);
      return 0;
    }
    item.expiresAt = Date.now() + Number(seconds) * 1000;
    return 1;
  }

  async ttl(key) {
    const k = String(key);
    const item = this.store.get(k);
    if (!item || this._isExpired(item)) {
      this.store.delete(k);
      return -2;
    }
    if (!item.expiresAt) return -1;
    const remainingMs = item.expiresAt - Date.now();
    return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : -2;
  }

  async flushall() {
    this.store.clear();
    return "OK";
  }

  async keys(pattern = "*") {
    const matched = [];
    const regex = new RegExp(
      "^" + pattern.replace(/([.+?^=!:${}()|[\]/\\])/g, "\\$1").replace(/\*/g, ".*") + "$"
    );
    for (const [key, item] of this.store.entries()) {
      if (!this._isExpired(item) && regex.test(key)) {
        matched.push(key);
      }
    }
    return matched;
  }

  async ping() {
    return "PONG (in-memory)";
  }
}

// ── Redis Client Initialization & Fallback Switching ─────────────────────────

const inMemoryFallback = new InMemoryRedis();
let activeClient = inMemoryFallback;
let nativeClient = null;
let isConnected = false;

const redisUrl = process.env.REDIS_URL || (process.env.REDIS_HOST ? `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}` : null);

if (redisUrl) {
  try {
    nativeClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy(times) {
        if (times > 3) return null; // Fall back to in-memory after 3 connection attempts
        return Math.min(times * 300, 1000);
      },
    });

    nativeClient.on("connect", () => {
      console.log("[CampusNode Redis] Connected to external Redis at", redisUrl.replace(/:[^:@]+@/, ":***@"));
      isConnected = true;
      activeClient = nativeClient;
    });

    nativeClient.on("ready", () => {
      isConnected = true;
      activeClient = nativeClient;
    });

    nativeClient.on("error", (err) => {
      if (isConnected) {
        console.warn("[CampusNode Redis] Connection error, switching to in-memory fallback:", err.message);
      }
      isConnected = false;
      activeClient = inMemoryFallback;
    });

    nativeClient.on("close", () => {
      isConnected = false;
      activeClient = inMemoryFallback;
    });

    // Attempt non-blocking connection
    nativeClient.connect().catch((err) => {
      console.log("[CampusNode Redis] Notice: External Redis unreachable. Using high-performance in-memory fallback store:", err.message);
      activeClient = inMemoryFallback;
    });
  } catch (err) {
    console.log("[CampusNode Redis] Initialization notice: Falling back to in-memory store:", err.message);
    activeClient = inMemoryFallback;
  }
} else {
  console.log("[CampusNode Redis] REDIS_URL not configured. Operating with in-memory TTL store.");
}

/**
 * Unified Redis helper proxy
 */
export const redis = {
  async get(key) {
    try {
      return await activeClient.get(key);
    } catch {
      return await inMemoryFallback.get(key);
    }
  },

  async set(key, value, ...args) {
    try {
      return await activeClient.set(key, value, ...args);
    } catch {
      return await inMemoryFallback.set(key, value, ...args);
    }
  },

  async setex(key, seconds, value) {
    try {
      return await activeClient.setex(key, seconds, value);
    } catch {
      return await inMemoryFallback.setex(key, seconds, value);
    }
  },

  async setnx(key, value) {
    try {
      return await activeClient.setnx(key, value);
    } catch {
      return await inMemoryFallback.setnx(key, value);
    }
  },

  async del(...keys) {
    try {
      return await activeClient.del(...keys);
    } catch {
      return await inMemoryFallback.del(...keys);
    }
  },

  async incr(key) {
    try {
      return await activeClient.incr(key);
    } catch {
      return await inMemoryFallback.incr(key);
    }
  },

  async expire(key, seconds) {
    try {
      return await activeClient.expire(key, seconds);
    } catch {
      return await inMemoryFallback.expire(key, seconds);
    }
  },

  async ttl(key) {
    try {
      return await activeClient.ttl(key);
    } catch {
      return await inMemoryFallback.ttl(key);
    }
  },

  async flushall() {
    try {
      return await activeClient.flushall();
    } catch {
      return await inMemoryFallback.flushall();
    }
  },

  async keys(pattern = "*") {
    try {
      return await activeClient.keys(pattern);
    } catch {
      return await inMemoryFallback.keys(pattern);
    }
  },

  /**
   * Acquire a distributed lock for a given key and TTL in seconds.
   * Returns true if lock was acquired, false if already locked.
   */
  async acquireLock(lockKey, ttlSeconds = 5) {
    const result = await this.set(lockKey, "1", "EX", ttlSeconds, "NX");
    return result === "OK" || result === 1;
  },

  /**
   * Release a distributed lock.
   */
  async releaseLock(lockKey) {
    return await this.del(lockKey);
  },

  /**
   * Returns true if connected to a real Redis server, false if using in-memory store.
   */
  isExternalRedis() {
    return isConnected && activeClient === nativeClient;
  },

  /**
   * Raw client access if needed.
   */
  getRawClient() {
    return activeClient;
  },
};

export default redis;
