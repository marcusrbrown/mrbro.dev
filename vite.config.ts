import path from 'node:path'
import process from 'node:process'
import react from '@vitejs/plugin-react-swc'
import {defineConfig} from 'vitest/config'

// E2E fixture mechanism (see docs/plans/2026-07-17-001-feat-first-party-blog-plan.md,
// Unit 6 KTD): when BLOG_SNAPSHOT is set, alias the snapshot import to that path so
// test builds are deterministic and independent of the committed data file. Default
// (unset) resolves to the committed `src/data/blog-snapshot.json` — no runtime switching.
const blogSnapshotAlias = process.env.BLOG_SNAPSHOT
  ? [{find: '../data/blog-snapshot.json', replacement: path.resolve(process.cwd(), process.env.BLOG_SNAPSHOT)}]
  : []

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: blogSnapshotAlias,
  },

  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      external: ['shiki', '@shikijs/core', '@shikijs/transformers'],
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@shikijs')) return 'shiki'
            if (id.includes('highlight.js')) return 'highlight'
            if (id.includes('react') || id.includes('react-dom')) return 'vendor'
            return 'vendor'
          }
          return undefined
        },
      },
    },
  },

  // GitHub Pages deployment with custom domain
  base: '/',

  // Enable GitHub Pages environment variable detection
  define: {
    __GITHUB_PAGES__: JSON.stringify(process.env.GITHUB_PAGES === 'true'),
  },

  test: {
    environment: 'happy-dom',
    environmentOptions: {
      happyDOM: {
        settings: {
          disableCSSFileLoading: true,
          disableJavaScriptFileLoading: true,
        },
      },
    },
    globals: true,
    setupFiles: './tests/setup.ts',
    // Exclude E2E, visual, and performance tests - they should only run through Playwright
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/tests/e2e/**',
      '**/tests/visual/**',
      '**/tests/performance/**',
      '**/tests/accessibility/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/node_modules/**',
        '**/dist/**',
        'src/types/**',
        'src/vite-env.d.ts',
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
})
