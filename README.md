# ISEZERANO ONLINE – Digital News & Information Portal

A modern digital news and editorial publishing platform powered by React, TypeScript, Vite, Firebase Hosting, Cloud Firestore, and Firebase Cloud Messaging (FCM).

---

## Key Features

1. **Zero-Barrier Public News Reading Experience**
   - **No Login Required for Readers**: Visitors immediately read breaking headlines, browse categories, search articles, post moderated comments, subscribe to push announcements, and share stories to WhatsApp, Facebook, Telegram, or social channels.
   - **SEO & Social Crawler Open Graph Previews**: Static article HTML pre-rendering (`scripts/prerenderBlogMeta.ts`) and Express SSR (`server.ts`, `server/ogMeta.ts`) provide clean Open Graph metadata and `/og-blog/*` thumbnails for WhatsApp, Facebook, and X/Twitter.
   - **Tri-Lingual UI Support**: English, Ikinyarwanda, and Français.

2. **Secure Administrator-Only Account**
   - **Owner Email**: `twizerefelix90@gmail.com` (verified Google authentication)
   - **Admin Management Portal (`/admin`)**:
     - Articles & Categories CMS (`posts`, `categories`) with Rich Text editing and comment moderation (`comments`).
     - Static Website Pages CMS (`website_pages`: About Us, Contact Us, Privacy Policy, Terms & Conditions).
     - Website Design, Branding, Typography, Top Announcement Ticker, WhatsApp Contact Settings, and HilltopAds & Sponsorship Slots (`appSettings`, `siteSettings`).
     - Breaking News Push Notifications & Analytics (`announcements`, `fcm_tokens`).

3. **Production Firebase Architecture**
   - **Firebase Hosting**: Fast static delivery from `dist/` with clean URLs (`firebase.json`).
   - **Cloud Firestore & Storage**: Strictly verified single-admin write protection in `firestore.rules` and `storage.rules`.

---

## Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Run the development server
npm run dev

# 3. Check TypeScript types
npm run lint

# 4. Create production build & prerender article OG metadata
npm run build
```

The dev server runs at `http://localhost:3000`.

---

## Admin Setup & Security

Only `twizerefelix90@gmail.com` signing in with verified Google Authentication is authorized as platform Administrator across client auth, Firestore rules (`firestore.rules`), Storage rules (`storage.rules`), and FCM push endpoints.

---

## Security Rules Overview

- `posts/{postId}`: Publicly readable; Admin create/delete; public update strictly limited to exact `+1` view count increment.
- `comments/{commentId}`: Publicly readable only when `status == 'approved'` without private email/phone; public creation strictly validated as `pending`; moderation/deletion Admin-only.
- `categories`, `website_pages`, `appSettings`, `siteSettings`, `announcements`: Public read, verified Admin write.
- `users/{userId}`: Verified Admin-only access.
- `fcm_tokens/{tokenId}`: Public push subscription creation with Admin-only read/list/delete.
