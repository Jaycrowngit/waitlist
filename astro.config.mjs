// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://waitlist.byllora.com',
  // 3003 is already allowed by the backend's CORS config
  server: { port: 3003 },
});
