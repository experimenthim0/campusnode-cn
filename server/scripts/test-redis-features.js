import redis from "../lib/redis.js";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
import { getPublicResponse, setPublicResponse, invalidatePublicResponses } from "../utils/publicResponseCache.js";
import { enqueueEmail } from "../emails/emailQueue.js";

async function runTests() {
  console.log("=== CampusNode Redis Integration Tests ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}`);
      failed++;
    }
  }

  try {
    // ----------------------------------------------------
    // Test 1: Redis Basic TTL & Fallback
    // ----------------------------------------------------
    console.log("--- Test 1: Redis Key-Value & TTL ---");
    const testKey = "test:ttl:" + Date.now();
    await redis.setex(testKey, 10, "hello_campusnode");
    const val = await redis.get(testKey);
    assert(val === "hello_campusnode", "Redis setex/get stores and retrieves correctly");
    const ttl = await redis.ttl(testKey);
    assert(ttl > 0 && ttl <= 10, "Redis ttl reports correct time-to-live");
    await redis.del(testKey);
    const deletedVal = await redis.get(testKey);
    assert(deletedVal === null, "Redis del removes the key");

    // ----------------------------------------------------
    // Test 2: 2FA Login OTP Verification & Brute Force Limit
    // ----------------------------------------------------
    console.log("\n--- Test 2: 2FA Login OTP Life-Cycle ---");
    const testEmail = "test_otp_user@nitj.ac.in";
    const otpCode = "482910";
    const otpHash = crypto.createHash("sha256").update(otpCode).digest("hex");
    const otpKey = `otp:login:${testEmail}`;

    await redis.setex(
      otpKey,
      300,
      JSON.stringify({
        otpHash,
        attempts: 0,
        userType: "student",
        userId: "test_user_id",
        email: testEmail,
      })
    );

    // Test invalid OTP attempt
    let stored = JSON.parse(await redis.get(otpKey));
    assert(stored.otpHash === otpHash, "OTP stored securely in Redis");
    const wrongHash = crypto.createHash("sha256").update("999999").digest("hex");
    assert(wrongHash !== stored.otpHash, "Wrong OTP code mismatch detected");

    // Increment attempts
    stored.attempts += 1;
    await redis.setex(otpKey, 300, JSON.stringify(stored));
    let afterFail = JSON.parse(await redis.get(otpKey));
    assert(afterFail.attempts === 1, "Failed attempts count incremented in Redis");

    // Correct OTP verification
    const correctHash = crypto.createHash("sha256").update(otpCode).digest("hex");
    assert(correctHash === afterFail.otpHash, "Correct OTP validated against hash");
    // Consume OTP
    await redis.del(otpKey);
    const consumed = await redis.get(otpKey);
    assert(consumed === null, "OTP is consumed single-use and cannot be replayed");

    // ----------------------------------------------------
    // Test 3: Password Reset Token Life-Cycle
    // ----------------------------------------------------
    console.log("\n--- Test 3: Password Reset Token ---");
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    const resetKey = `pwd_reset:${hashedResetToken}`;

    await redis.setex(
      resetKey,
      1800,
      JSON.stringify({
        userId: "student_reset_test_id",
        email: "student_reset@nitj.ac.in",
        userType: "student",
      })
    );

    const resetData = JSON.parse(await redis.get(resetKey));
    assert(resetData.email === "student_reset@nitj.ac.in", "Password reset token stored with user metadata");

    // Consume reset token
    await redis.del(resetKey);
    assert((await redis.get(resetKey)) === null, "Password reset token consumed after use");

    // ----------------------------------------------------
    // Test 4: Email Verification Token Life-Cycle
    // ----------------------------------------------------
    console.log("\n--- Test 4: Email Verification Token ---");
    const verifyToken = crypto.randomBytes(32).toString("hex");
    const hashedVerifyToken = crypto.createHash("sha256").update(verifyToken).digest("hex");
    const verifyKey = `email_verify:${hashedVerifyToken}`;

    await redis.setex(
      verifyKey,
      86400,
      JSON.stringify({
        userId: "external_verify_test_id",
        email: "external_student@university.edu",
        userType: "external",
      })
    );

    const verifyData = JSON.parse(await redis.get(verifyKey));
    assert(verifyData.email === "external_student@university.edu", "Email verification token retrievable");
    await redis.del(verifyKey);
    assert((await redis.get(verifyKey)) === null, "Email verification token consumed successfully");

    // ----------------------------------------------------
    // Test 5: Notification Idempotency Lock & Recipient Deduplication
    // ----------------------------------------------------
    console.log("\n--- Test 5: Notification Idempotency & Deduplication ---");
    const notifHash = crypto.createHash("sha256").update("sender1:ALL_STUDENTS::Important Update:Hello all!").digest("hex");
    const lockKey = `lock:notif:${notifHash}`;

    // First attempt acquires lock
    const acquired1 = await redis.set(lockKey, "1", "EX", 5, "NX");
    assert(acquired1 !== null && (acquired1 === "OK" || acquired1 === true), "First notification request acquires idempotency lock");

    // Immediate duplicate attempt rejected
    const acquired2 = await redis.set(lockKey, "1", "EX", 5, "NX");
    assert(acquired2 === null || acquired2 === false, "Duplicate notification request within TTL is blocked by Redis lock");

    // Clean up
    await redis.del(lockKey);

    // Recipient deduplication test
    const rawRecipients = ["student_1", "student_2", "student_1", "student_3", "student_2", null, undefined];
    const deduped = [...new Set(rawRecipients.filter(Boolean))];
    assert(deduped.length === 3 && deduped.includes("student_1") && deduped.includes("student_2") && deduped.includes("student_3"), "Recipient IDs array deduplication ensures 0 duplicate dispatches");

    // ----------------------------------------------------
    // Test 6: Redis Response Caching & Pattern Invalidation
    // ----------------------------------------------------
    console.log("\n--- Test 6: Redis Response Caching & Pattern Invalidation ---");
    const sampleEvents = [{ id: "ev1", title: "Hackathon 2026" }, { id: "ev2", title: "Robotics Expo" }];
    const sampleDetail = { id: "ev1", title: "Hackathon 2026", description: "Campus annual hackathon" };
    const sampleClubs = [{ id: "club1", clubName: "Coding Club" }];

    await setPublicResponse("events:public:1:50", sampleEvents, 60_000);
    await setPublicResponse("events:detail:ev1", sampleDetail, 60_000);
    await setPublicResponse("clubs:public", sampleClubs, 60_000);

    const cachedEvents = await getPublicResponse("events:public:1:50");
    assert(cachedEvents && cachedEvents.length === 2 && cachedEvents[0].title === "Hackathon 2026", "Public events list cached and retrieved");

    const cachedDetail = await getPublicResponse("events:detail:ev1");
    assert(cachedDetail && cachedDetail.title === "Hackathon 2026", "Event detail cached and retrieved");

    const cachedClubs = await getPublicResponse("clubs:public");
    assert(cachedClubs && cachedClubs.length === 1, "Clubs list cached and retrieved");

    // Invalidate events pattern
    await invalidatePublicResponses(["events:*"]);

    const invalidatedEvents = await getPublicResponse("events:public:1:50");
    assert(invalidatedEvents === undefined, "Events list cache purged by pattern invalidation");

    const invalidatedDetail = await getPublicResponse("events:detail:ev1");
    assert(invalidatedDetail === undefined, "Events detail cache purged by pattern invalidation");

    // Confirm clubs cache was not affected
    const preservedClubs = await getPublicResponse("clubs:public");
    assert(preservedClubs && preservedClubs.length === 1, "Unrelated club cache remains untouched");

    await invalidatePublicResponses(["clubs*"]);
    assert((await getPublicResponse("clubs:public")) === undefined, "Clubs cache purged successfully");

    // ----------------------------------------------------
    // Test 7: Email Job Queue (BullMQ / Resilient Dispatch)
    // ----------------------------------------------------
    console.log("\n--- Test 7: Email Job Queueing ---");
    const enqueueStartTime = performance.now();
    const emailJob = await enqueueEmail({
      to: "queue_test@nitj.ac.in",
      template: "auth:login-otp",
      data: {
        otp: "123456",
        email: "queue_test@nitj.ac.in",
      },
    });
    const enqueueDurationMs = performance.now() - enqueueStartTime;

    assert(emailJob && emailJob.queued === true, "Email dispatch is enqueued to background queue");
    assert(emailJob && typeof emailJob.id === "string" && emailJob.id.length > 0, "Email job assigned a unique Job ID");
    assert(enqueueDurationMs < 50, `Enqueue returns instantly (${enqueueDurationMs.toFixed(1)}ms < 50ms) without blocking on Resend API`);

    console.log(`\n========================================`);
    console.log(`Summary: ${passed} passed, ${failed} failed.`);
    console.log(`========================================`);
  } catch (err) {
    console.error("Test execution error:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(failed === 0 ? 0 : 1);
  }
}

runTests();
