
"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  arrayUnion, // Import arrayUnion
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { StaffMember, ServiceHistoryEntry } from '@/app/staff/staff-schema';
import { staffMemberSchema, RANKS, STAFF_QUERY_KEY } from '@/app/staff/staff-schema';
import { useAuth } from '@/contexts/auth-context';
import { z } from 'zod'; // Import Zod

const convertServiceHistoryTimestampsForDisplay = (historyEntry: any): ServiceHistoryEntry => {
  return {
    ...historyEntry,
    id: historyEntry.id || crypto.randomUUID(), // Ensure ID
    effectiveDate: historyEntry.effectiveDate instanceof Timestamp ? historyEntry.effectiveDate.toDate() : new Date(historyEntry.effectiveDate),
    endDate: historyEntry.endDate instanceof Timestamp ? historyEntry.endDate.toDate() : (historyEntry.endDate ? new Date(historyEntry.endDate) : null),
  };
};

const convertServiceHistoryTimestampsForFirestore = (historyEntry: ServiceHistoryEntry): any => {
  return {
    ...historyEntry,
    id: historyEntry.id || crypto.randomUUID(),
    effectiveDate: historyEntry.effectiveDate ? Timestamp.fromDate(new Date(historyEntry.effectiveDate)) : null,
    endDate: historyEntry.endDate ? Timestamp.fromDate(new Date(historyEntry.endDate)) : null,
  };
};


const convertTimestamps = (data: any): StaffMember => {
  let joinDateToParse: Date | null = null;
  if (data.joinDate instanceof Timestamp) {
    joinDateToParse = data.joinDate.toDate();
  } else if (data.joinDate && typeof data.joinDate === 'string') {
    joinDateToParse = new Date(data.joinDate);
  } else if (data.joinDate instanceof Date) {
    joinDateToParse = data.joinDate;
  }


  const serviceHistoryForDisplay = (data.serviceHistory || []).map(convertServiceHistoryTimestampsForDisplay);

  const validatedData = staffMemberSchema.parse({
    ...data,
    joinDate: joinDateToParse,
    serviceHistory: serviceHistoryForDisplay,
  });
  return validatedData;
};


async function fetchStaff(): Promise<StaffMember[]> {
    const staffCollectionRef = collection(db, 'staff');
    const q = query(staffCollectionRef, orderBy('squadron'), orderBy('lastName'));
    const querySnapshot = await getDocs(q);
    const staffList = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data()),
    }));

    staffList.sort((a, b) => {
        const sqnCompare = (a.squadron || "Unassigned").localeCompare(b.squadron || "Unassigned");
        if (sqnCompare !== 0) return sqnCompare;

        const rankAIndex = RANKS.indexOf(a.rank);
        const rankBIndex = RANKS.indexOf(b.rank);
        const effectiveRankAIndex = rankAIndex === -1 ? Infinity : rankAIndex;
        const effectiveRankBIndex = rankBIndex === -1 ? Infinity : rankBIndex;

        if (effectiveRankAIndex !== effectiveRankBIndex) {
             return effectiveRankAIndex - effectiveRankBIndex;
        }

        const lastNameCompare = a.lastName.localeCompare(b.lastName);
        if (lastNameCompare !== 0) return lastNameCompare;
        return a.firstName.localeCompare(b.firstName);
    });

    return staffList;
}

export function useStaff() {
  const { user, loading: authLoading } = useAuth();
  return useQuery<StaffMember[], Error>({
    queryKey: [STAFF_QUERY_KEY],
    queryFn: fetchStaff,
    enabled: !!user && !authLoading && !!user.email && user.email.endsWith('@airforcecadets.gov.au'),
    staleTime: 1000 * 60 * 5,
  });
}

async function addStaff(newStaffData: Omit<StaffMember, 'id'>): Promise<string> {
  const validatedData = staffMemberSchema.omit({ id: true }).parse(newStaffData);
  const staffCollectionRef = collection(db, 'staff');
  const serviceHistoryForFirestore = (validatedData.serviceHistory || []).map(convertServiceHistoryTimestampsForFirestore);

  const dataToSave = {
    ...validatedData,
    joinDate: validatedData.joinDate ? Timestamp.fromDate(validatedData.joinDate) : null,
    serviceHistory: serviceHistoryForFirestore,
  };
  const docRef = await addDoc(staffCollectionRef, dataToSave);
  return docRef.id;
}

export function useAddStaff() {
  const queryClient = useQueryClient();
  return useMutation<string, Error, Omit<StaffMember, 'id'>>({
    mutationFn: addStaff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STAFF_QUERY_KEY] });
    },
  });
}

async function updateStaff(updatedStaff: StaffMember): Promise<void> {
  if (!updatedStaff.id) {
    throw new Error("Staff member ID is required for update.");
  }

  let validatedData: StaffMember;
  try {
    // Defensively ensure dates are Date objects or null before parsing
    const dataToParse = {
        ...updatedStaff,
        joinDate: updatedStaff.joinDate ? new Date(updatedStaff.joinDate) : null,
        serviceHistory: (updatedStaff.serviceHistory || []).map(entry => ({
            ...entry,
            id: entry.id || crypto.randomUUID(),
            effectiveDate: new Date(entry.effectiveDate),
            endDate: entry.endDate ? new Date(entry.endDate) : null,
        })),
    };
    validatedData = staffMemberSchema.parse(dataToParse);
  } catch (e: any) {
    if (e instanceof z.ZodError) {
        console.error("Zod validation failed during staff update. Issues:", JSON.stringify(e.issues, null, 2));
        // Log the data that failed validation for easier debugging
        console.error("Data that failed Zod validation:", JSON.stringify(updatedStaff, (key, value) =>
            // Custom replacer to handle Date objects for logging, Zod might have already stringified them if they were invalid from form
            value instanceof Date ? value.toISOString() : (value === undefined ? 'UNDEFINED' : value)
        , 2));
        const issueMessages = e.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ');
        throw new Error(`Validation Error: ${issueMessages}`);
    }
    console.error("Non-Zod error during pre-validation or parsing in updateStaff:", e);
    throw new Error("An unexpected error occurred during data validation.");
  }

  const staffDocRef = doc(db, 'staff', validatedData.id as string);
  const { id, ...dataToUpdate } = validatedData;
  const serviceHistoryForFirestore = (dataToUpdate.serviceHistory || []).map(convertServiceHistoryTimestampsForFirestore);

  const dataToSave = {
    ...dataToUpdate,
    joinDate: dataToUpdate.joinDate ? Timestamp.fromDate(dataToUpdate.joinDate) : null,
    serviceHistory: serviceHistoryForFirestore,
  };
  await updateDoc(staffDocRef, dataToSave);
}


export function useUpdateStaff() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, StaffMember>({
    mutationFn: updateStaff,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [STAFF_QUERY_KEY] });
       queryClient.setQueryData<StaffMember[]>([STAFF_QUERY_KEY], (oldData) =>
         oldData?.map((staff) => (staff.id === variables.id ? variables : staff))
       );
    },
  });
}

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
      queryClient.invalidateQueries({ queryKey: [STAFF_QUERY_KEY] });
      queryClient.setQueryData<StaffMember[]>([STAFF_QUERY_KEY], (oldData) =>
         oldData?.filter((staff) => staff.id !== staffId)
       );
    },
  });
}

// Function to add a service history entry to a staff member
// This might be used by the CSV import logic if direct batch updates are complex
export async function addServiceHistoryEntry(staffId: string, entry: ServiceHistoryEntry): Promise<void> {
  if (!staffId) throw new Error("Staff ID is required to add service history.");
  const staffDocRef = doc(db, "staff", staffId);
  const entryForFirestore = convertServiceHistoryTimestampsForFirestore({
    ...entry,
    id: entry.id || crypto.randomUUID(), // Ensure ID
  });
  await updateDoc(staffDocRef, {
    serviceHistory: arrayUnion(entryForFirestore)
  });
}

// Mutation hook for adding service history - might not be needed if CSV import handles batching directly
export function useAddServiceHistoryEntry() {
    const queryClient = useQueryClient();
    return useMutation<void, Error, { staffId: string; entry: ServiceHistoryEntry }>({
        mutationFn: ({ staffId, entry }) => addServiceHistoryEntry(staffId, entry),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: [STAFF_QUERY_KEY, variables.staffId] }); // Invalidate specific staff member
            queryClient.invalidateQueries({ queryKey: [STAFF_QUERY_KEY] }); // Invalidate all staff list
        },
    });
}
