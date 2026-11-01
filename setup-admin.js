/**
 * ISEZERANO Lesson Plan - Trusted Admin Setup Script
 * 
 * Usage:
 *   1. Run in a secure server-side environment with Firebase Admin SDK credentials.
 *   2. node scripts/setup-admin.js <target_email>
 * 
 * This securely promotes a registered teacher account to 'admin' in Cloud Firestore
 * without exposing secrets or hardcoding credentials in the frontend.
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin with Application Default Credentials or Service Account
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID || 'isezerano-news'
    });
  } catch (e) {
    console.error('Error initializing Firebase Admin SDK:', e.message);
    console.error('Ensure GOOGLE_APPLICATION_CREDENTIALS or Firebase CLI login is configured.');
    process.exit(1);
  }
}

const db = admin.firestore();

async function promoteUserToAdmin(targetEmail) {
  if (!targetEmail) {
    console.error('Please specify a target email address.');
    console.log('Example: node scripts/setup-admin.js teacher@school.rw');
    process.exit(1);
  }

  const cleanEmail = targetEmail.trim().toLowerCase();
  console.log(`Searching for user with email: ${cleanEmail}...`);

  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('email', '==', cleanEmail).get();

  if (snapshot.empty) {
    console.log(`No user found with email ${cleanEmail}. The user must sign up through the application first.`);
    process.exit(1);
  }

  const batch = db.batch();
  snapshot.forEach((doc) => {
    console.log(`Promoting user ${doc.id} to Admin...`);
    batch.update(doc.ref, {
      role: 'admin',
      status: 'active',
      updatedAt: new Date().toISOString()
    });
  });

  await batch.commit();
  console.log(`✅ Success! ${cleanEmail} has been granted Admin privileges in Firestore.`);
}

const emailArg = process.argv[2] || process.env.INITIAL_ADMIN_EMAIL;
promoteUserToAdmin(emailArg);
