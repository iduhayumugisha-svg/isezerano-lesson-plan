import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

/**
 * Prerenders OpenGraph and Twitter card metadata for social crawlers (WhatsApp, Facebook, Telegram, X)
 * when accessing blog posts directly via URL.
 */
function seoCrawlerPrerenderPlugin(): Plugin {
  return {
    name: 'seo-social-crawler-prerender',
    transformIndexHtml(html: string, ctx: any) {
      const url = ctx?.originalUrl || ctx?.url || '';
      if (!url.startsWith('/blog/')) {
        return html;
      }

      const slug = url.split('/blog/')[1]?.split('?')[0]?.replace(/\/$/, '');
      if (!slug) return html;

      let title = 'Pedagogical Article – ISEZERANO ONLINE';
      let description = 'Official educational guidance, CBC schemes of work, and school news from GS GITUMBA in Rwanda.';
      let image = 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80';

      if (slug.includes('cbc') || slug.includes('lesson-plan')) {
        title = 'Mastering the Rwanda CBC 8-Column Lesson Plan: Complete Guide for Teachers';
        description = 'Step-by-step pedagogical breakdown of Competence-Based Curriculum (CBC) lesson planning for Rwandan teachers.';
        image = 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80';
      } else if (slug.includes('stem') || slug.includes('science')) {
        title = 'Transforming STEM and Practical Science Education at GS GITUMBA';
        description = 'How GS GITUMBA in Rulindo District leverages local learning materials and science kits for hands-on experiments.';
        image = 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80';
      } else if (slug.includes('digital') || slug.includes('tools')) {
        title = 'Digital Tools in Rwandan Classrooms: Empowering Educators in 2026';
        description = 'Exploring how technology, digital lesson planning, and online teacher collaboration are raising pedagogical quality across Rwanda.';
        image = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80';
      } else {
        const words = slug.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        title = `${words} – GS GITUMBA Educational Journal`;
        description = `Read ${words} on ISEZERANO ONLINE – GS GITUMBA pedagogical journal.`;
      }

      const fullTitle = `${title} – ISEZERANO ONLINE – GS GITUMBA`;
      const canonicalUrl = `https://ais-pre-a7az4u6j4emzxaw3vwjczy-591146875574.europe-west2.run.app/blog/${slug}`;

      return html
        .replace(/<title>.*?<\/title>/, `<title>${fullTitle}</title>`)
        .replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${description}" />`)
        .replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${fullTitle}" />`)
        .replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${description}" />`)
        .replace(/<meta property="og:image" content=".*?" \/>/, `<meta property="og:image" content="${image}" />`)
        .replace(/<meta property="og:image:secure_url" content=".*?" \/>/, `<meta property="og:image:secure_url" content="${image}" />`)
        .replace(/<meta property="og:url" content=".*?" \/>/, `<meta property="og:url" content="${canonicalUrl}" />`)
        .replace(/<meta name="twitter:title" content=".*?" \/>/, `<meta name="twitter:title" content="${fullTitle}" />`)
        .replace(/<meta name="twitter:description" content=".*?" \/>/, `<meta name="twitter:description" content="${description}" />`)
        .replace(/<meta name="twitter:image" content=".*?" \/>/, `<meta name="twitter:image" content="${image}" />`);
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), seoCrawlerPrerenderPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
