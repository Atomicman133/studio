import admin from 'firebase-admin';
import { readFile } from 'fs/promises';

// --- Configuration ---
// IMPORTANT: Replace this path with the actual path to your Firebase Admin SDK service account key JSON file.
// You can download this from the Firebase console: Project settings > Service accounts > Generate new private key.
// It's recommended to use an environment variable for this in production, but for a one-off script, a path is okay.
// e.g., const SERVICE_ACCOUNT_PATH = './path/to/your-service-account-key.json';
const SERVICE_ACCOUNT_PATH = './scripts/squadron-manager-ekm3y-firebase-adminsdk-fbsvc-b40d6d28d0.json'; // <<< YOU MUST UPDATE THIS PATH

// --- Firebase Initialization ---
async function initializeFirebaseAdmin() {
  try {
    const serviceAccountBuffer = await readFile(SERVICE_ACCOUNT_PATH);
    const serviceAccount = JSON.parse(serviceAccountBuffer.toString());

    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Firebase Admin SDK initialized.');
    }
    return admin.firestore();
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK: ', error);
    console.error(`Failed to read service account key from: ${SERVICE_ACCOUNT_PATH}`);
    console.error('Please ensure the path is correct and the file is accessible.');
    process.exit(1);
  }
}

async function cleanupStaffData() {
  const db = await initializeFirebaseAdmin();
  const staffRef = db.collection('staff'); // Assuming your collection is named 'staff'

  console.log('Fetching all staff records...');
  const snapshot = await staffRef.get();

  if (snapshot.empty) {
    console.log('No staff records found.');
    return;
  }

  const staffRecords = [];
  snapshot.forEach(doc => {
    staffRecords.push({ id: doc.id, ...doc.data() });
  });

  console.log(`Fetched ${staffRecords.length} staff records.`);

  const recordsByServiceNumber = staffRecords.reduce((acc, record) => {
    const key = record.serviceNumber;
    if (!key) {
      console.warn(`Record with ID ${record.id} has no serviceNumber. Skipping.`);
      return acc;
    }
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(record);
    return acc;
  }, {});

  let potentialDeletions = 0;
  const batch = db.batch();
  const recordsToDeleteIds = new Set();

  console.log(`
--- Analyzing for duplicates with blank roles ---`);

  for (const serviceNumber in recordsByServiceNumber) {
    const group = recordsByServiceNumber[serviceNumber];
    if (group.length > 1) { // Potential duplicates
      const recordsWithBlankRole = group.filter(r => !r.role || r.role.trim() === '');
      const recordsWithNonBlankRole = group.filter(r => r.role && r.role.trim() !== '');

      if (recordsWithNonBlankRole.length > 0 && recordsWithBlankRole.length > 0) {
        console.log(`
Service Number: ${serviceNumber} (Found ${group.length} records)`);
        recordsWithNonBlankRole.forEach(r => {
          console.log(`  KEEPING: ID: ${r.id}, Name: ${r.firstName} ${r.lastName}, Rank: ${r.rank}, Role: "${r.role}"`);
        });
        recordsWithBlankRole.forEach(r => {
          if (recordsToDeleteIds.has(r.id)) return; // Already marked

          console.log(`  WOULD DELETE: ID: ${r.id}, Name: ${r.firstName} ${r.lastName}, Rank: ${r.rank}, Role: (blank)`);
          // To actually delete, uncomment the next line:
          // batch.delete(staffRef.doc(r.id));
          recordsToDeleteIds.add(r.id);
          potentialDeletions++;
        });
      } else if (recordsWithNonBlankRole.length === 0 && recordsWithBlankRole.length > 1) {
        console.log(`
Service Number: ${serviceNumber} (Found ${group.length} records, ALL with blank roles)`);
        console.log(`  INFO: All records for this serviceNumber have blank roles. This script will not delete any of them. Manual review needed if you want to consolidate these.`);
      }
    }
  }

  if (potentialDeletions === 0) {
    console.log(`
No duplicate staff records with blank roles found that meet the deletion criteria (i.e., where a non-blank role version exists for the same service number).`);
    return;
  }

  console.log(`--- Summary ---`);
  console.log(`Identified ${potentialDeletions} record(s) that would be deleted.`);
  console.log('To perform the actual deletion:');
  console.log('1. Review the "WOULD DELETE" logs above carefully.');
  console.log('2. **BACK UP YOUR FIRESTORE DATA FIRST!** This operation is irreversible.');
  console.log('3. Uncomment the "batch.delete(staffRef.doc(r.id));" line in this script.');
  console.log('4. Uncomment the "await batch.commit();" line further down.');
  console.log('5. Re-run the script.');

  try {
    /*
    // To actually commit deletions, uncomment the following line:
    // await batch.commit();
    // if (potentialDeletions > 0) { // Check if potentialDeletions > 0 before logging commit
    //   console.log(`
Successfully committed deletions for ${potentialDeletions} records.`);
    // }
    */
    if (recordsToDeleteIds.size > 0) {
         console.log('Deletion lines are currently commented out. No data has been changed.');
    }
  } catch (error) {
    console.error('Error committing batch deletions: ', error);
  }
}

cleanupStaffData().catch(error => {
  console.error('Unhandled error in cleanupStaffData:', error);
});
