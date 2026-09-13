import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['dotenv/config'],
    env: {
      SKIP_VERIFICATION: 'true',
    },
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      'routes/__tests__/rollNoAttendance.test.js',
      'routes/__tests__/aiFeedbackReview.test.js',
    ],
  },
});
