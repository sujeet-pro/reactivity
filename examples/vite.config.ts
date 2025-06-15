import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { minify } from 'html-minifier-terser';
import type { Plugin } from 'vite';
import * as fs from 'fs';
import * as path from 'path';

// Custom plugin for HTML minification
const htmlMinifierPlugin = (): Plugin => ({
  name: 'html-minifier',
  async writeBundle(options, bundle) {
    const outDir = options.dir || '../public';
    const htmlPath = path.join(outDir, 'index.html');
    
    if (fs.existsSync(htmlPath)) {
      try {
        const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
        const minifiedHtml = await minify(htmlContent, {
          collapseWhitespace: true,
          keepClosingSlash: true,
          removeComments: true,
          removeRedundantAttributes: true,
          removeScriptTypeAttributes: true,
          removeStyleLinkTypeAttributes: true,
          useShortDoctype: true,
          minifyCSS: true,
          minifyJS: true,
          html5: true,
          removeEmptyAttributes: true,
          removeOptionalTags: false,
          removeEmptyElements: false,
        });
        
        fs.writeFileSync(htmlPath, minifiedHtml);
        console.log('✓ HTML minified successfully');
      } catch (error) {
        console.warn('HTML minification failed:', error);
      }
    }
  },
});

export default defineConfig({
  base: '/reactivity/',
  plugins: [
    viteSingleFile({
      removeViteModuleLoader: true, // Remove Vite's module loader for cleaner output
      inlinePattern: ['**/*.js', '**/*.css'], // Inline all JS and CSS
      useRecommendedBuildConfig: true, // Use recommended build config for single file
    }),
    htmlMinifierPlugin(), // Custom HTML minification after viteSingleFile
  ],
  build: {
    outDir: '../public', // Output to public folder as sibling of examples
    emptyOutDir: true, // Clear the output directory before building
    assetsDir: 'assets',
    minify: false, // Disable Vite minification - we handle it with html-minifier-terser
    rollupOptions: {
      output: {
        // Inline all dynamic imports
        inlineDynamicImports: true,
        // Prevent chunk splitting to get a single JS file
        manualChunks: undefined
      }
    },
    // Additional options to optimize for single file output
    cssCodeSplit: false, // Don't split CSS into separate files
    sourcemap: false // Disable sourcemaps for cleaner output
  },
  server: {
    port: 3000,
    open: true
  }
}); 