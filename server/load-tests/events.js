import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const baseUrl = (__ENV.BASE_URL || 'http://localhost:5001').replace(/\/$/, '');
const token = __ENV.AUTH_TOKEN || '';
const userId = __ENV.USER_ID || '';
const eventId = __ENV.EVENT_ID || '';
const enableWrites = __ENV.ENABLE_WRITES === 'true';

const registrationErrors = new Rate('registration_errors');
const registrationDuration = new Trend('registration_duration', true);

export const options = {
  scenarios: {
    event_reads: {
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.READ_RATE || 20),
      timeUnit: '1s',
      duration: __ENV.DURATION || '2m',
      preAllocatedVUs: Number(__ENV.PRE_ALLOCATED_VUS || 10),
      maxVUs: Number(__ENV.MAX_VUS || 50),
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    registration_errors: ['rate<0.01'],
  },
};

function headers() {
  const result = { 'Cache-Control': 'no-cache' };
  if (token) result.Authorization = `Bearer ${token}`;
  return result;
}

export default function () {
  const params = { headers: headers(), tags: { area: 'events' } };
  const health = http.get(`${baseUrl}/health`, params);
  check(health, { 'health is 200': (r) => r.status === 200 });

  const feed = http.get(`${baseUrl}/api/events?limit=20`, params);
  check(feed, {
    'event feed is successful': (r) => r.status === 200,
    'event feed is JSON': (r) => String(r.headers['Content-Type'] || '').includes('json'),
  });

  let selectedEvent = eventId;
  if (!selectedEvent && feed.status === 200) {
    try { selectedEvent = JSON.parse(feed.body)?.[0]?.id || ''; } catch (_) { /* measured by checks */ }
  }

  if (selectedEvent) {
    const detail = http.get(`${baseUrl}/api/events/${selectedEvent}?skipIncrement=true`, params);
    check(detail, { 'event detail is successful': (r) => r.status === 200 });
  }

  if (token && userId) {
    const started = Date.now();
    const mine = http.get(`${baseUrl}/api/events/user/${userId}`, params);
    registrationDuration.add(Date.now() - started);
    const ok = check(mine, { 'my events is successful': (r) => r.status === 200 });
    registrationErrors.add(!ok);
  }

  if (enableWrites && token && selectedEvent) {
    const started = Date.now();
    const registered = http.post(`${baseUrl}/api/events/${selectedEvent}/register`, '{}', {
      headers: { ...headers(), 'Content-Type': 'application/json' },
      tags: { area: 'registration-write' },
    });
    registrationDuration.add(Date.now() - started);
    const registeredOk = check(registered, {
      'registration write is accepted': (r) => [201, 400].includes(r.status),
    });
    registrationErrors.add(!registeredOk);
    sleep(0.1);
  }

  sleep(0.1);
}
