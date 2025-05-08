
"use client"; // Required for React Query hooks

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Removed onSnapshot as it's not used in the primary useStaff hook
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  query,
  orderBy,
  // where, // If needed for filtering/querying
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { StaffMember } from '@/app/staff/staff-schema';
import { staffMemberSchema, RANKS } from '@/app/staff/staff-schema';

const STAFF_QUERY_KEY = 'staff';

// Helper to convert Firestore Timestamps to JS Dates in staff data
const convertTimestamps = (data: any): StaffMember => {
  const validatedData = staffMemberSchema.parse({
    ...data,
    // Ensure null joinDate from Firestore is converted to undefined for Zod
    joinDate: data.joinDate instanceof Timestamp
      ? data.joinDate.toDate()
      : (data.joinDate === null ? undefined : data.joinDate),
  });
  return validatedData;
};


// --- Fetch Staff ---
// Fetch staff data once using getDocs from the 'staff' collection
async function fetchStaff(): Promise<StaffMember[]> {
    // Use the db instance (potentially pointing to 'dataset1') and the 'staff' collection
    const staffCollectionRef = collection(db, 'staff');
    // Example: Order by squadron, then rank, then name (client-side sorting is also applied)
    // You might adjust the Firestore query for better performance if needed.
    const q = query(staffCollectionRef, orderBy('squadron'), orderBy('lastName')); // Basic ordering
    const querySnapshot = await getDocs(q);
    const staffList = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data()),
    }));

     // Client-side sorting (matches previous logic, ensures rank order)
    staffList.sort((a, b) => {
        const sqnCompare = (a.squadron || "Unassigned").localeCompare(b.squadron || "Unassigned");
        if (sqnCompare !== 0) return sqnCompare;

        const rankAIndex = RANKS.indexOf(a.rank);
        const rankBIndex = RANKS.indexOf(b.rank);

        // Handle cases where rank might not be in RANKS (shouldn't happen with validation)
        const effectiveRankAIndex = rankAIndex === -1 ? Infinity : rankAIndex;
        const effectiveRankBIndex = rankBIndex === -1 ? Infinity : rankBIndex;

        // Sort descending by index (higher rank first)
        if (effectiveRankAIndex !== effectiveRankBIndex) {
            return rankBIndex - effectiveRankAIndex; // Higher index (lower rank in array) comes first
        }

        // If ranks are the same, sort by name
        const lastNameCompare = a.lastName.localeCompare(b.lastName);
        if (lastNameCompare !== 0) return lastNameCompare;
        return a.firstName.localeCompare(b.firstName);
    });


    return staffList;
}

// Hook to fetch staff data using React Query
export function useStaff() {
  return useQuery<StaffMember[], Error>({
    queryKey: [STAFF_QUERY_KEY],
    queryFn: fetchStaff, // Use the fetchStaff function here
     // Add staleTime or other options as needed
     staleTime: 1000 * 60 * 5, // 5 minutes
  });
}


// --- Add Staff ---
async function addStaff(newStaffData: Omit<StaffMember, 'id'>): Promise<string> {
  const staffCollectionRef = collection(db, 'staff');
   // Prepare data for Firestore (convert Dates to Timestamps if needed)
  const dataToSave = {
    ...newStaffData,
    joinDate: newStaffData.joinDate ? Timestamp.fromDate(newStaffData.joinDate) : null, // Firestore can store null
  };
  const docRef = await addDoc(staffCollectionRef, dataToSave);
  return docRef.id;
}

export function useAddStaff() {
  const queryClient = useQueryClient();
  return useMutation<string, Error, Omit<StaffMember, 'id'>>({
    mutationFn: addStaff,
    onSuccess: () => {
      // Invalidate and refetch staff list after successful addition
      queryClient.invalidateQueries({ queryKey: [STAFF_QUERY_KEY] });
    },
  });
}

// --- Update Staff ---
async function updateStaff(updatedStaff: StaffMember): Promise<void> {
  if (!updatedStaff.id) {
    throw new Error("Staff member ID is required for update.");
  }
  const staffDocRef = doc(db, 'staff', updatedStaff.id);
  // Prepare data for Firestore (convert Dates to Timestamps)
  const { id, ...dataToUpdate } = updatedStaff; // Exclude ID from data payload
  const dataToSave = {
    ...dataToUpdate,
    joinDate: dataToUpdate.joinDate ? Timestamp.fromDate(dataToUpdate.joinDate) : null, // Firestore can store null
  };
  await updateDoc(staffDocRef, dataToSave);
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, StaffMember>({
    mutationFn: updateStaff,
    onSuccess: (_, variables) => {
      // Invalidate and refetch staff list after successful update
      queryClient.invalidateQueries({ queryKey: [STAFF_QUERY_KEY] });
       // Optionally, optimistically update the specific staff member in the cache
       queryClient.setQueryData<StaffMember[]>([STAFF_QUERY_KEY], (oldData) =>
         oldData?.map((staff) => (staff.id === variables.id ? variables : staff))
       );
    },
  });
}

// --- Delete Staff ---
async function deleteStaff(staffId: string): Promise<void> {
  if (!staffId) {
    throw new Error("Staff member ID is required for deletion.");
  }
  const staffDocRef = doc(db, 'staff', staffId);
  await deleteDoc(staffDocRef);
}

export function useDeleteStaff() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteStaff,
    onSuccess: (_, staffId) => {
      // Invalidate and refetch staff list after successful deletion
      queryClient.invalidateQueries({ queryKey: [STAFF_QUERY_KEY] });
      // Optionally, optimistically remove the staff member from the cache
      queryClient.setQueryData<StaffMember[]>([STAFF_QUERY_KEY], (oldData) =>
         oldData?.filter((staff) => staff.id !== staffId)
       );
    },
  });
}
