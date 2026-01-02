import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

// Load environment variables from .env before Playwright reads them
dotenv.config();

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: process.env.BASE_URL || 'https://reqres.in',
    extraHTTPHeaders: { 
        'Content-Type': 'application/json' ,
        'x-api-key': process.env.REQRES_API_KEY ?? ''
    }
  },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ]
});
