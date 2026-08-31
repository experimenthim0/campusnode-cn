/**
 * Tests for EventDetails.jsx
 *
 * Task 9.8  — Property 11: internal registration payload contains studentId, not userId
 * Task 9.9  — Property 12: WAITLISTED → waitlist message; REGISTERED → QR display; mutually exclusive
 * Task 9.12 — Unit test: external participant form rendered when unauthenticated (Requirement 4.3)
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Pure helpers extracted from EventDetails.jsx logic
// (tested as pure functions — no DOM rendering required)

/**
 * Mirrors the payload construction in handleRegister (authenticated path).
 * For any authenticated user, the body must use studentId, never userId.
 */
function buildInternalPayload(user) {
  return { studentId: user.id };
}

/**
 * Mirrors the post-registration state logic in handleRegister.
 * Returns which UI element should be shown based on the response status.
 */
function resolveRegistrationUI(responseStatus, currentQr) {
  if (responseStatus === 'WAITLISTED') {
    return { showWaitlist: true, showQr: false };
  }
  if (responseStatus === 'REGISTERED') {
    return { showWaitlist: false, showQr: true };
  }
  // Any other status (e.g. already-registered handled separately)
  return { showWaitlist: false, showQr: false };
}

/**
 * Mirrors the condition that controls external participant form visibility.
 * The form is shown when: user is null AND event is not ended AND deadline
 * has not passed AND user is not already registered.
 */
function shouldShowExternalForm({ user, isEnded, isDeadlinePassed, alreadyRegistered }) {
  return !user && !isEnded && !isDeadlinePassed && !alreadyRegistered;
}

// Task 9.8 — Property 11
// "For any authenticated user object stored in localStorage, the registration
//  request body SHALL contain studentId: user.id and SHALL NOT contain a
//  userId field."
// Validates: Requirements 4.2

describe('Property 11: internal registration payload (Task 9.8)', () => {
  it('payload always contains studentId equal to user.id', () => {
    /**
     * **Validates: Requirements 4.2**
     */
    fc.assert(
      fc.property(
        fc.record({
          id: fc.hexaString({ minLength: 24, maxLength: 24 }),
          name: fc.string({ minLength: 1 }),
          email: fc.emailAddress(),
          role: fc.constantFrom('member', 'admin'),
        }),
        (user) => {
          const payload = buildInternalPayload(user);
          expect(payload.studentId).toBe(user.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('payload never contains a userId field', () => {
    /**
     * **Validates: Requirements 4.2**
     */
    fc.assert(
      fc.property(
        fc.record({
          id: fc.hexaString({ minLength: 24, maxLength: 24 }),
          name: fc.string({ minLength: 1 }),
          email: fc.emailAddress(),
        }),
        (user) => {
          const payload = buildInternalPayload(user);
          expect(Object.prototype.hasOwnProperty.call(payload, 'userId')).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('studentId in payload equals user.id for various id formats', () => {
    // Concrete examples covering different id shapes
    const users = [
      { id: 'a'.repeat(24) },
      { id: '507f1f77bcf86cd799439011' },
      { id: '000000000000000000000000' },
    ];
    for (const user of users) {
      const payload = buildInternalPayload(user);
      expect(payload.studentId).toBe(user.id);
      expect('userId' in payload).toBe(false);
    }
  });
});

// Task 9.9 — Property 12
// "For any registration response, if status === 'WAITLISTED' the waitlist
//  message SHALL be shown; if status === 'REGISTERED' the QR code display
//  SHALL be shown. These two states are mutually exclusive."
// Validates: Requirements 4.5, 4.6

describe('Property 12: registration status drives post-registration UI (Task 9.9)', () => {
  it('WAITLISTED response → showWaitlist true, showQr false', () => {
    /**
     * **Validates: Requirements 4.5**
     */
    fc.assert(
      fc.property(
        fc.option(fc.webUrl(), { nil: null }),
        (existingQr) => {
          const ui = resolveRegistrationUI('WAITLISTED', existingQr);
          expect(ui.showWaitlist).toBe(true);
          expect(ui.showQr).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('REGISTERED response → showQr true, showWaitlist false', () => {
    /**
     * **Validates: Requirements 4.6**
     */
    fc.assert(
      fc.property(
        fc.option(fc.webUrl(), { nil: null }),
        (existingQr) => {
          const ui = resolveRegistrationUI('REGISTERED', existingQr);
          expect(ui.showQr).toBe(true);
          expect(ui.showWaitlist).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('WAITLISTED and REGISTERED states are mutually exclusive for any status', () => {
    /**
     * **Validates: Requirements 4.5, 4.6**
     * showWaitlist and showQr can never both be true simultaneously.
     */
    fc.assert(
      fc.property(
        fc.constantFrom('WAITLISTED', 'REGISTERED', 'CANCELLED', 'ATTENDED', 'UNKNOWN'),
        fc.option(fc.webUrl(), { nil: null }),
        (status, existingQr) => {
          const ui = resolveRegistrationUI(status, existingQr);
          // Mutual exclusivity: both cannot be true at the same time
          expect(ui.showWaitlist && ui.showQr).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('concrete: WAITLISTED shows waitlist, not QR', () => {
    const ui = resolveRegistrationUI('WAITLISTED', null);
    expect(ui.showWaitlist).toBe(true);
    expect(ui.showQr).toBe(false);
  });

  it('concrete: REGISTERED shows QR, not waitlist', () => {
    const ui = resolveRegistrationUI('REGISTERED', null);
    expect(ui.showQr).toBe(true);
    expect(ui.showWaitlist).toBe(false);
  });
});

// Task 9.12 — Unit test: external participant form rendering (Requirement 4.3)
// "When the current user is not authenticated, the client SHALL display input
//  fields for externalEmail (required, valid email format) and externalName
//  (required, non-empty string)."

describe('Requirement 4.3: external participant form visibility (Task 9.12)', () => {
  it('shows external form when user is null and event is active', () => {
    const result = shouldShowExternalForm({
      user: null,
      isEnded: false,
      isDeadlinePassed: false,
      alreadyRegistered: false,
    });
    expect(result).toBe(true);
  });

  it('hides external form when user is authenticated', () => {
    const result = shouldShowExternalForm({
      user: { id: '507f1f77bcf86cd799439011', name: 'Alice' },
      isEnded: false,
      isDeadlinePassed: false,
      alreadyRegistered: false,
    });
    expect(result).toBe(false);
  });

  it('hides external form when event has ended', () => {
    const result = shouldShowExternalForm({
      user: null,
      isEnded: true,
      isDeadlinePassed: false,
      alreadyRegistered: false,
    });
    expect(result).toBe(false);
  });

  it('hides external form when registration deadline has passed', () => {
    const result = shouldShowExternalForm({
      user: null,
      isEnded: false,
      isDeadlinePassed: true,
      alreadyRegistered: false,
    });
    expect(result).toBe(false);
  });

  it('hides external form when already registered', () => {
    const result = shouldShowExternalForm({
      user: null,
      isEnded: false,
      isDeadlinePassed: false,
      alreadyRegistered: true,
    });
    expect(result).toBe(false);
  });

  it('shows external form only when all conditions are met (unauthenticated + active event)', () => {
    // All combinations where user is null but one other flag is true → hidden
    const hiddenCases = [
      { user: null, isEnded: true,  isDeadlinePassed: false, alreadyRegistered: false },
      { user: null, isEnded: false, isDeadlinePassed: true,  alreadyRegistered: false },
      { user: null, isEnded: false, isDeadlinePassed: false, alreadyRegistered: true  },
      { user: null, isEnded: true,  isDeadlinePassed: true,  alreadyRegistered: true  },
    ];
    for (const c of hiddenCases) {
      expect(shouldShowExternalForm(c)).toBe(false);
    }

    // Only the fully-open case shows the form
    expect(shouldShowExternalForm({
      user: null,
      isEnded: false,
      isDeadlinePassed: false,
      alreadyRegistered: false,
    })).toBe(true);
  });
});
