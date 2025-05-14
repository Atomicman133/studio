
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
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { StaffMember } from '@/app/staff/staff-schema';
import { staffMemberSchema, RANKS, STAFF_QUERY_KEY } from '@/app/staff/staff-schema';
import { useAuth } from '@/contexts/auth-context';

const convertTimestamps = (data: any): StaffMember => {
  // Ensure joinDate is handled correctly: null remains null, undefined becomes null, valid dates are parsed.
  let joinDateToParse = data.joinDate;
  if (data.joinDate instanceof Timestamp) {
    joinDateToParse = data.joinDate.toDate();
  } else if (data.joinDate === undefined) {
    joinDateToParse = null; // Or handle as an error if joinDate is strictly required by some logic not visible here
  }
  // For other date fields, if any, apply similar logic.

  const validatedData = staffMemberSchema.parse({
    ...data,
    joinDate: joinDateToParse,
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
  // Validate data against schema before saving
  const validatedData = staffMemberSchema.omit({ id: true }).parse(newStaffData);

  const staffCollectionRef = collection(db, 'staff');
  const dataToSave = {
    ...validatedData, // Use validated data
    joinDate: validatedData.joinDate ? Timestamp.fromDate(validatedData.joinDate) : null, 
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
  // Validate data against schema before updating
  const validatedData = staffMemberSchema.parse(updatedStaff);

  const staffDocRef = doc(db, 'staff', validatedData.id as string); // id is now definitely present
  const { id, ...dataToUpdate } = validatedData; 
  const dataToSave = {
    ...dataToUpdate,
    joinDate: dataToUpdate.joinDate ? Timestamp.fromDate(dataToUpdate.joinDate) : null, 
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
