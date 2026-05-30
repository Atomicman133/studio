// @ts-nocheck
import {initializeApp, cert} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {config} from 'dotenv';
import {readFileSync} from 'fs';
import {resolve} from 'path';

// Load environment variables from .env file
config();

// --- Firestore Initialization ---
// Determine the correct path to the service account key JSON file
const serviceAccountKeyPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  './scripts/squadron-manager-ekm3y-firebase-adminsdk-fbsvc-b40d6d28d0.json'; // Using the likely path from your project


let serviceAccount;
try {
  const rawData = readFileSync(resolve(serviceAccountKeyPath), 'utf8');
  serviceAccount = JSON.parse(rawData);
} catch (error) {
  console.error(
    `Error reading or parsing service account key from ${serviceAccountKeyPath}.`
  );
  console.error(
    'Please ensure the GOOGLE_APPLICATION_CREDENTIALS environment variable is set or the file exists at the default location.'
  );
  process.exit(1);
}

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore('dataset1'); // Assuming 'dataset1' as per your firebase.json
console.log('Successfully connected to Firestore database "dataset1".');

// --- Main Cleanup Logic ---
async function cleanupDuplicateStaff() {
  console.log('Starting cleanup of duplicate staff records...');
  const BATCH_SIZE = 490; // Firestore batch limit is 500
  let totalStaffScanned = 0;
  let totalDuplicatesIdentified = 0;
  let totalDuplicatesDeleted = 0;


  try {
    console.log('Fetching all staff records...');
    const staffSnapshot = await db.collection('staff').get(); // Assuming your collection is named 'staff'
    totalStaffScanned = staffSnapshot.docs.length;
    console.log(`Found ${totalStaffScanned} total staff records to process.`);

    if (totalStaffScanned === 0) {
      console.log('No staff records found. Exiting.');
      return;
    }

    const recordsByServiceNumber = new Map();

    // Group records by serviceNumber
    staffSnapshot.docs.forEach(doc => {
      const record = {id: doc.id, ...doc.data()};
      const sn = record.serviceNumber;
      if (sn) {
        if (!recordsByServiceNumber.has(sn)) {
          recordsByServiceNumber.set(sn, []);
        }
        recordsByServiceNumber.get(sn).push(record);
      }
    });

    console.log(
      `Grouped records into ${recordsByServiceNumber.size} unique service numbers.`
    );

    let batch = db.batch();
    let batchOperations = 0;
    const recordsToDeleteIds = new Set();


    console.log('--- Analyzing for duplicates with blank roles ---');


    for (const [serviceNumber, records] of recordsByServiceNumber.entries()) {
      if (records.length > 1) { // Potential duplicates
        const recordsWithBlankRole = records.filter(r => !r.role || r.role.trim() === '');
        const recordsWithNonBlankRole = records.filter(r => r.role && r.role.trim() !== '');

        if (recordsWithNonBlankRole.length > 0 && recordsWithBlankRole.length > 0) {
          console.log(`
Service Number: ${serviceNumber} (Found ${records.length} records)`);
          recordsWithNonBlankRole.forEach(r => {
            console.log(`  KEEPING: ID: ${r.id}, Name: ${r.firstName} ${r.lastName}, Rank: ${r.rank}, Role: "${r.role}"`);
          });
          recordsWithBlankRole.forEach(r => {
            if (recordsToDeleteIds.has(r.id)) return; // Already marked

            console.log(`  WOULD DELETE: ID: ${r.id}, Name: ${r.firstName} ${r.lastName}, Rank: ${r.rank}, Role: (blank)`);
            recordsToDeleteIds.add(r.id);
            totalDuplicatesIdentified++;
          });
        } else if (recordsWithNonBlankRole.length === 0 && recordsWithBlankRole.length > 1) {
          console.log(`
Service Number: ${serviceNumber} (Found ${records.length} records, ALL with blank roles)`);
          console.log(`  INFO: All records for this serviceNumber have blank roles. This script will not delete any of them automatically. Manual review needed if you want to consolidate these.`);
        }
      }
    }

     if (totalDuplicatesIdentified === 0) {
      console.log('No duplicate staff records with blank roles found that meet the deletion criteria (i.e., where a non-blank role version exists for the same service number).');
      return;
    }


    console.log(`
--- Summary ---`);
    console.log(`Identified ${totalDuplicatesIdentified} record(s) that would be deleted.`);
    console.log('To perform the actual deletion:');
    console.log('1. Review the "WOULD DELETE" logs above carefully.');
    console.log('2. **BACK UP YOUR FIRESTORE DATA FIRST!** This operation is irreversible.');
    console.log('3. Uncomment the "batch.delete(staffRef.doc(recordId));" line in the deletion loop below.');
    console.log('4. Uncomment the "await batch.commit();" lines where batches are committed.');
    console.log('5. Re-run the script.');

    console.log('--- Queueing deletions (currently commented out) ---');
     for (const recordId of recordsToDeleteIds) {
         const staffRef = db.collection('staff').doc(recordId);
        // Uncomment the next line to enable deletion
        // batch.delete(staffRef);
        // batchOperations++;
        // totalDuplicatesDeleted++;

        // if (batchOperations >= BATCH_SIZE) {
        //     console.log(`Committing batch of ${batchOperations} deletions...`);
        //     // Uncomment the next line to commit the batch
        //     // await batch.commit();
        //     console.log('Batch committed successfully.');
        //     batch = db.batch(); // Start a new batch
        //     batchOperations = 0;
        // }
     }


    // Commit any remaining operations in the last batch (if uncommented)
    // if (batchOperations > 0) {
    //     console.log(`Committing final batch of ${batchOperations} deletions...`);
    //     // Uncomment the next line to commit the batch
    //     // await batch.commit();
    //     console.log('Final batch committed successfully.');
    // }


    if (recordsToDeleteIds.size > 0) {
         console.log('Deletion lines are currently commented out. No data has been changed.');
         console.log(`Identified ${recordsToDeleteIds.size} records for potential deletion.`);
    } else {
         console.log('No records identified for deletion.');
    }


    console.log('Cleanup process finished (deletion was commented out).');

  } catch (error) {
    console.error('An error occurred during the cleanup process:', error);
  }
}

// Run the cleanup function
cleanupDuplicateStaff();
