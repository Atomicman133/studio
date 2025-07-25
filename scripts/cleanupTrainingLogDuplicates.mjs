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

interface TrainingLogData {
  staffName: string;
  courseName: string;
  completionDate: string | Timestamp; // Adjust this type if needed
  // Add other properties if needed
}

async function cleanupDuplicateTrainingLogs() {
  console.log('Starting cleanup of duplicate training logs...');
  const BATCH_SIZE = 490; // Firestore batch limit is 500
  let totalLogsScanned = 0;
  let totalDuplicatesIdentified = 0;

  try {
    console.log('Fetching all training logs...');
    const logsSnapshot = await db.collection('trainingLogs').get(); // Targeting 'trainingLogs' collection
    totalLogsScanned = logsSnapshot.docs.length;
    console.log(`Found ${totalLogsScanned} total training logs to process.`);

    if (totalLogsScanned === 0) {
      console.log('No training logs found. Exiting.');
      return;
    }

    const logsByKey = new Map();

    // Group logs by staffName, courseName, and completionDate
    logsSnapshot.docs.forEach(doc => {
      const log = {id: doc.id, ...(doc.data() as TrainingLogData)};
      const staffName = log.staffName;
      const courseName = log.courseName;
      const completionDate = log.completionDate;
    
      if (!staffName || !courseName || !completionDate) {
         console.warn(`Skipping log with missing data: ID ${log.id}`);
         return; // Skip logs with missing essential data
      }


      // Create a unique key based on staffName, courseName, and completionDate
      let dateString;
      try {
          let date;
          if (completionDate instanceof Timestamp) {
              date = completionDate.toDate();
          } else if (typeof completionDate === 'string') {
               // Attempt to parse the string format "Month Day, Year at HH:MM:SS AM/PM UTC+/-Z"
               // This is a more robust parsing for your specific format
               const parts = completionDate.match(/(w+ d+, d+) at (d+:d+:d+) (w+)/);
               if (parts) {
                   // Construct a date string that Date.parse can handle
                   const datePart = parts[1];
                   const timePart = parts[2];
                   const ampm = parts[3]; // AM/PM/UTC+8 etc. - might need more complex handling for timezones if precision is needed
                   // For simplicity, let's just parse the date part and ignore the time/timezone for grouping
                   date = new Date(datePart);
               } else {
                   // Fallback to general Date parsing if the specific format doesn't match
                   date = new Date(completionDate);
               }
          } else {
              // Handle other potential date types if necessary
              date = new Date(completionDate);
          }
    
    
          if (isNaN(date.getTime())) {
               throw new Error("Invalid date"); // Throw to be caught by the catch block
          }
    
    
          // Extract only the YYYY-MM-DD part
          dateString = date.toISOString().split('T')[0];
    
    
      } catch (e) {
          console.warn(`Skipping log with invalid completionDate: ID ${log.id}, Date: ${completionDate}, Error: ${e.message}`);
          return; // Skip logs with invalid dates
      }
    
    
      const uniqueKey = `${staffName.trim().toLowerCase()}|${courseName.trim().toLowerCase()}|${dateString}`;
    
      if (!logsByKey.has(uniqueKey)) {
        logsByKey.set(uniqueKey, []);
      }
      logsByKey.get(uniqueKey).push(log);
    });

    console.log(
      `Grouped logs into ${logsByKey.size} unique combinations of staff name, course name, and completion date.`
    );

    let batch = db.batch();
    let batchOperations = 0;
    const logsToDeleteIds = new Set();


    console.log('
--- Analyzing for duplicate training logs ---');


    for (const [key, logs] of logsByKey.entries()) {
      if (logs.length > 1) { // Potential duplicates
         console.log(`
Found ${logs.length} duplicate logs for key: ${key}`);
         // Keep the first log encountered, mark the rest for deletion
         const [firstLog, ...duplicateLogs] = logs;

         console.log(`  KEEPING: ID: ${firstLog.id}, Staff: ${firstLog.staffName}, Course: ${firstLog.courseName}, Date: ${firstLog.completionDate}`);

         duplicateLogs.forEach(log => {
             if (logsToDeleteIds.has(log.id)) return; // Already marked

             console.log(`  WOULD DELETE: ID: ${log.id}, Staff: ${log.staffName}, Course: ${log.courseName}, Date: ${log.completionDate}`);
             logsToDeleteIds.add(log.id);
             totalDuplicatesIdentified++;
         });
      }
    }

     if (totalDuplicatesIdentified === 0) {
      console.log('
No duplicate training logs found based on staff name, course name, and completion date.');
      return;
    }


    console.log(`
--- Summary ---`);
    console.log(`Identified ${totalDuplicatesIdentified} duplicate log(s) that would be deleted.`);
    console.log('To perform the actual deletion:');
    console.log('1. Review the "WOULD DELETE" logs above carefully.');
    console.log('2. **BACK UP YOUR FIRESTORE DATA FIRST!** This operation is irreversible.');
    console.log('3. Uncomment the "batch.delete(logRef);" line in the deletion loop below.');
    console.log('4. Uncomment the "await batch.commit();" lines where batches are committed.');
    console.log('5. Re-run the script.');

    console.log('
--- Queueing deletions (currently commented out) ---');
     for (const logId of logsToDeleteIds) {
         const logRef = db.collection('trainingLogs').doc(logId);
        // Uncomment the next line to enable deletion
        // batch.delete(logRef);
        // batchOperations++;
        // totalDuplicatesDeleted++; // You might want to track actual deleted count if you uncomment


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


    if (logsToDeleteIds.size > 0) {
         console.log('
Deletion lines are currently commented out. No data has been changed.');
         console.log(`Identified ${logsToDeleteIds.size} logs for potential deletion.`);
    } else {
         console.log('
No logs identified for deletion.');
    }


    console.log('
Cleanup process finished (deletion was commented out).');

  } catch (error) {
    console.error('An error occurred during the cleanup process:', error);
  }
}

// Run the cleanup function
cleanupDuplicateTrainingLogs();