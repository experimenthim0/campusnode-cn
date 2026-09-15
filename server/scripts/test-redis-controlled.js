import "dotenv/config";
import redis from "../lib/redis.js";
import { RedisUsageMonitor } from "../load-tests/utils/redisUsageMonitor.js";

async function testControlledValidation() {
  console.log("=== Controlled Redis Telemetry Validation ===");
  const monitor = new RedisUsageMonitor({ label: "Controlled Validation Test" });
  await monitor.init();

  const startSnap = await monitor.start();
  console.log(`Baseline total commands on server: ${startSnap.totalCommands}`);

  // Perform 10 registration locks (acquire + release = 20 commands: 10 SET, 10 DEL)
  console.log("Executing 10 registration locks...");
  for (let i = 0; i < 10; i++) {
    const lockKey = `lock:reg:testevent:${i}`;
    await redis.acquireLock(lockKey, 5);
    await redis.releaseLock(lockKey);
  }

  // Perform 10 2FA OTP cycles (setex + get + del = 30 commands: 10 SET, 10 GET, 10 DEL)
  console.log("Executing 10 2FA OTP cycles...");
  for (let i = 0; i < 10; i++) {
    const otpKey = `otp:controlled:${i}`;
    await redis.setex(otpKey, 300, JSON.stringify({ code: "123456" }));
    await redis.get(otpKey);
    await redis.del(otpKey);
  }

  const report = await monitor.stop({
    testName: "Controlled Validation",
    httpRequests: 20,
    vus: 1,
  });

  console.log(RedisUsageMonitor.formatTerminalReport(report));
  console.log(`Summary:`);
  console.log(`  Commands Generated : ${report.redis.commandsGenerated}`);
  console.log(`  Expected App Cmds  : 50 (20 locks + 30 OTP)`);
  console.log(`  Breakdown          :`, report.commandBreakdown);
}

testControlledValidation().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
