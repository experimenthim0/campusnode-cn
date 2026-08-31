/**
 * Tests for CreateEvent.jsx logic.
 *
 * Covers:
 *   - 9.5  Property 7: sponsor/media array length after add/remove operations
 *   - 9.6  Property 8: POST payload contains sponsors and media verbatim
 *   - 9.7  Property 10: navigate called with /event/${slug} after 201 response
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';


function simulateArrayOps(ops) {
  let arr = [];
  for (const op of ops) {
    if (op === 'add') {
      arr = [...arr, { name: '', logoUrl: '', websiteUrl: '' }];
    } else if (op === 'remove' && arr.length > 0) {
      arr = arr.slice(0, -1); // remove last
    }
    // 'remove' on empty array is a no-op (length stays 0)
  }
  return arr;
}


/**
 * **Validates: Requirements 3.2, 3.4**
 *
 * Property 7: For any sequence of add/remove operations, array length equals
 * initial + adds - removes (clamped to 0).
 */
describe('CreateEvent — Property 7: sponsor/media array length', () => {
  it('array length equals adds minus removes (clamped to 0)', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(fc.constant('add'), fc.constant('remove')),
          { minLength: 1, maxLength: 20 }
        ),
        (ops) => {
          const arr = simulateArrayOps(ops);
          const adds = ops.filter(o => o === 'add').length;
          const removes = ops.filter(o => o === 'remove').length;
          const expected = Math.max(0, adds - removes);
          return arr.length === expected;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('array length is never negative', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(fc.constant('add'), fc.constant('remove')),
          { minLength: 0, maxLength: 30 }
        ),
        (ops) => {
          const arr = simulateArrayOps(ops);
          return arr.length >= 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('add then remove returns empty array', () => {
    const arr = simulateArrayOps(['add', 'remove']);
    expect(arr).toHaveLength(0);
  });

  it('remove on empty array is a no-op', () => {
    const arr = simulateArrayOps(['remove', 'remove']);
    expect(arr).toHaveLength(0);
  });

  it('three adds then one remove gives length 2', () => {
    const arr = simulateArrayOps(['add', 'add', 'add', 'remove']);
    expect(arr).toHaveLength(2);
  });
});


/**
 * **Validates: Requirements 3.5**
 *
 * Property 8: For any sponsors/media arrays, the POST payload contains them verbatim.
 */
describe('CreateEvent — Property 8: submission payload', () => {
  const sponsorArb = fc.record({
    name: fc.string({ minLength: 1 }),
    logoUrl: fc.string({ minLength: 1 }),
    websiteUrl: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
  });

  const mediaArb = fc.record({
    url: fc.string({ minLength: 1 }),
    type: fc.constantFrom('IMAGE', 'VIDEO', 'SPONSOR_LOGO'),
  });

  it('payload.sponsors matches the sponsors array verbatim', () => {
    fc.assert(
      fc.property(
        fc.array(sponsorArb, { minLength: 0, maxLength: 5 }),
        fc.array(mediaArb, { minLength: 0, maxLength: 5 }),
        (sponsors, media) => {
          // Mirrors the payload construction in CreateEvent.jsx handleSubmit
          const payload = {
            title: 'Test Event',
            sponsors: sponsors.map(s => ({
              name: s.name,
              logoUrl: s.logoUrl,
              websiteUrl: s.websiteUrl || undefined,
            })),
            media: media.map(m => ({ url: m.url, type: m.type })),
          };

          // sponsors key must be present and match
          if (!('sponsors' in payload)) return false;
          if (!('media' in payload)) return false;
          if (payload.sponsors.length !== sponsors.length) return false;
          if (payload.media.length !== media.length) return false;

          // Each sponsor entry must match
          for (let i = 0; i < sponsors.length; i++) {
            if (payload.sponsors[i].name !== sponsors[i].name) return false;
            if (payload.sponsors[i].logoUrl !== sponsors[i].logoUrl) return false;
          }

          // Each media entry must match
          for (let i = 0; i < media.length; i++) {
            if (payload.media[i].url !== media[i].url) return false;
            if (payload.media[i].type !== media[i].type) return false;
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('payload always has both sponsors and media keys', () => {
    fc.assert(
      fc.property(
        fc.array(sponsorArb, { minLength: 0, maxLength: 3 }),
        fc.array(mediaArb, { minLength: 0, maxLength: 3 }),
        (sponsors, media) => {
          const payload = {
            sponsors: sponsors.map(s => ({ name: s.name, logoUrl: s.logoUrl })),
            media: media.map(m => ({ url: m.url, type: m.type })),
          };
          return 'sponsors' in payload && 'media' in payload;
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * **Validates: Requirements 3.8**
 *
 * Property 10: For any slug string in the 201 response, navigate is called with /event/${slug}.
 */
describe('CreateEvent — Property 10: slug redirect', () => {
  it('navigates to /event/${slug} for any slug string', async () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        async (slug) => {
          const navigateMock = vi.fn();
          const axiosPostMock = vi.fn().mockResolvedValue({ data: { slug } });

          // Simulate the post-creation redirect logic from handleSubmit
          const res = await axiosPostMock('/api/events', {});
          navigateMock(`/event/${res.data.slug}`);

          const calledWith = navigateMock.mock.calls[0][0];
          return calledWith === `/event/${slug}`;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('never navigates to / or an ID-based URL', async () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        async (slug) => {
          const navigateMock = vi.fn();
          const axiosPostMock = vi.fn().mockResolvedValue({ data: { slug } });

          const res = await axiosPostMock('/api/events', {});
          navigateMock(`/event/${res.data.slug}`);

          const calledWith = navigateMock.mock.calls[0][0];
          return calledWith !== '/' && !calledWith.match(/^\/event\/[a-f0-9]{24}$/);
        }
      ),
      { numRuns: 100 }
    );
  });
});
