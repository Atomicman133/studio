// @ts-check
import {initializeApp, cert} from 'firebase-admin/app';
import {getFirestore, Timestamp} from 'firebase-admin/firestore';
import {config} from 'dotenv';
import {readFileSync} from 'fs';
import {resolve} from 'path';

// Load environment variables from .env file
config();

// --- Firestore Initialization ---
// Determine the correct path to the service account key JSON file
const serviceAccountKeyPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  './serviceAccountKey.json';

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
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
});

const db = getFirestore('dataset1');
console.log('Successfully connected to Firestore database "dataset1".');

// --- Main Cleanup Logic ---
async function cleanupDuplicateAccomplishments() {
  console.log('Starting cleanup of duplicate accomplishments...');
  const BATCH_SIZE = 490; // Firestore batch limit is 500
  let totalLogsScanned = 0;
  let totalDuplicatesDeleted = 0;

  try {
    console.log('Fetching all training logs...');
    const logsSnapshot = await db.collection('trainingLogs').get();
    totalLogsScanned = logsSnapshot.docs.length;
    console.log(`Found ${totalLogsScanned} total training logs to process.`);

    if (totalLogsScanned === 0) {
      console.log('No training logs found. Exiting.');
      return;
    }

    const logsByServiceNumber = new Map();

    // Group logs by serviceNumber
    logsSnapshot.docs.forEach(doc => {
      const log = {id: doc.id, ...doc.data()};
      const sn = log.serviceNumber;
      if (sn) {
        if (!logsByServiceNumber.has(sn)) {
          logsByServiceNumber.set(sn, []);
        }
        logsByServiceNumber.get(sn).push(log);
      }
    });

    console.log(
      `Grouped logs into ${logsByServiceNumber.size} unique service numbers.`
    );

    let batch = db.batch();
    let batchOperations = 0;

    for (const [serviceNumber, logs] of logsByServiceNumber.entries()) {
      const uniqueLogs = new Map();
      const duplicatesToDelete = [];

      for (const log of logs) {
        if (!log.courseName || !log.completionDate) {
          continue; // Skip logs with missing essential data
        }

        // Create a unique key based on course name and completion date
        const completionDate =
          log.completionDate instanceof Timestamp
            ? log.completionDate.toDate().toISOString().split('T')[0] // YYYY-MM-DD
            : new Date(log.completionDate).toISOString().split('T')[0];
        const uniqueKey = `${log.courseName.trim().toLowerCase()}|${completionDate}`;

        if (uniqueLogs.has(uniqueKey)) {
          // This is a duplicate, mark for deletion
          duplicatesToDelete.push(log.id);
        } else {
          // This is the first time we've seen this log, keep it
          uniqueLogs.set(uniqueKey, log.id);
        }
      }

      if (duplicatesToDelete.length > 0) {
        console.log(
          `Found ${duplicatesToDelete.length} duplicate logs for service number ${serviceNumber}. Queuing for deletion.`
        );
        for (const logId of duplicatesToDelete) {
          const logRef = db.collection('trainingLogs').doc(logId);
          batch.delete(logRef);
          batchOperations++;
          totalDuplicatesDeleted++;

          if (batchOperations >= BATCH_SIZE) {
            console.log(
              `Committing batch of ${batchOperations} deletions...`
            );
            await batch.commit();
            console.log('Batch committed successfully.');
            batch = db.batch(); // Start a new batch
            batchOperations = 0;
          }
        }
      }
    }

    // Commit any remaining operations in the last batch
    if (batchOperations > 0) {
      console.log(`Committing final batch of ${batchOperations} deletions...`);
      await batch.commit();
      console.log('Final batch committed successfully.');
    }

    console.log('\n--- Cleanup Summary ---');
    console.log(`Total logs scanned: ${totalLogsScanned}`);
    console.log(`Total duplicate logs deleted: ${totalDuplicatesDeleted}`);
    console.log('Cleanup complete!');
  } catch (error) {
    console.error('An error occurred during the cleanup process:', error);
  }
}

// Run the cleanup function
cleanupDuplicateAccomplishments();
