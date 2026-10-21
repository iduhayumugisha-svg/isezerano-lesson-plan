# ISEZERANO Lesson Plan – Rwanda CBC Teacher Hub

A production-ready educational SaaS platform for Rwandan educators from Lower Primary through Upper Secondary, strictly aligned with the **Rwanda Education Board (REB) / Ministry of Education (MINEDUC) Competence-Based Curriculum (CBC)** standards.

---

## 🌟 Key Features

1. **Zero-Barrier Public Teacher Experience**
   - **No Login or Account Required**: Rwandan teachers can immediately open the app, enter lesson parameters, generate standard CBC lesson plans, and print/export to PDF without creating an account or signing in.
   - **CBC Auto-Generator**: Instant generation of structured lesson plan outlines with Bloom's taxonomy objectives, teaching aids, 3-stage lesson development (Introduction, Development, Conclusion), generic competences, and cross-cutting issues.
   - **Official REB 8-Column Format**: Clean, printable layout matching official pedagogical monitoring inspection sheets.
   - **Tri-Lingual Support**: English, Ikinyarwanda, and Français.

2. **Secure Website Owner / Admin Account**
   - **Owner Email**: `twizerefelix90@gmail.com`
   - **Discreet Access**: Discreet entry via the footer and navigation without forcing teachers through a login modal.
   - **Admin Management Portal (`/admin`)**:
     - Platform module toggles (enable/disable secondary modules).
     - Curriculum configuration (add/remove classes and subjects).
     - Teacher directory and access status controls.
     - Usage analytics and system health checks.
     - Firebase security configuration and promotion tools.

3. **Production Firebase Architecture**
   - **Firebase Hosting**: Fast SPA delivery with root rewrites (`dist/`).
   - **Cloud Firestore**: Strict role-based access control (RBAC) via `firestore.rules`.
   - **Data Privacy**: Teacher plans remain private to local storage or strictly bound to `ownerUid` in the cloud.

---

## 🚀 Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Run the development server
npm run dev

# 3. Check TypeScript types
npm run lint

# 4. Create production build
npm run build
```

The dev server runs at `http://localhost:3000`.

---

## 🔐 Admin Setup & Provisioning

To securely designate `twizerefelix90@gmail.com` as the verified Administrator:

### Option A: Using Firebase Console (Quickest)
1. Go to the [Firebase Console](https://console.firebase.google.com/) for project `isezerano-news`.
2. Ensure the user `twizerefelix90@gmail.com` has signed in once under **Authentication > Users**.
3. Navigate to **Firestore Database** > `users` collection > document with the user's `UID`.
4. Set the field:
   - `role`: `"admin"` (string)
   - `status`: `"active"` (string)

### Option B: Using the Included Script (Cloud Shell or Local)
```bash
# Set GOOGLE_APPLICATION_CREDENTIALS to your service account key
export GOOGLE_APPLICATION_CREDENTIALS="path/to/serviceAccountKey.json"

# Run the promotion script
node scripts/setup-admin.js twizerefelix90@gmail.com
```

---

## 🚢 Deploying to Firebase Hosting & Firestore

Deploy directly from Google Cloud Shell or your local machine with Firebase CLI:

```bash
# 1. Login to Firebase CLI
firebase login

# 2. Verify active project
firebase use isezerano-news

# 3. Build optimized production bundle
npm run build

# 4. Deploy Hosting and Security Rules
firebase deploy --only hosting,firestore:rules
```

### Deployed Artifacts:
- **Hosting URL**: `https://isezerano-news.web.app` or custom domain
- **Build Directory**: `dist/`
- **Security Rules**: `firestore.rules` (enforced on Cloud Firestore)

---

## 🛡️ Security Rules Overview

- `users/{uid}`: Authenticated users can read their own profile; only administrators can promote or deactivate accounts.
- `appSettings/{settingId}`: Publicly readable by all teachers; only verified administrators can update curriculum options.
- `lesson_plans/{planId}`: Cloud plans are strictly accessible only by the owning teacher or authorized administrators.

---

## 📄 License & Compliance

Designed and built for compliance with the **Rwanda Ministry of Education (MINEDUC)** and **Rwanda Basic Education Board (REB)** Competence-Based Curriculum (CBC) framework.
