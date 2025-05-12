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
import { staffMemberSchema, RANKS } from '@/app/staff/staff-schema';
import { useAuth } from '@/contexts/auth-context'; // Import useAuth

const STAFF_QUERY_KEY = 'staff';

const convertTimestamps = (data: any): StaffMember => {
  const validatedData = staffMemberSchema.parse({
    ...data,
    joinDate: data.joinDate instanceof Timestamp
      ? data.joinDate.toDate()
      : (data.joinDate === null ? undefined : data.joinDate),
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

        // Sort by rank index (lower index = higher rank)
        if (effectiveRankAIndex !== effectiveRankBIndex) {
             return effectiveRankAIndex - effectiveRankBIndex; // Lower index (higher rank) first
        }

        const lastNameCompare = a.lastName.localeCompare(b.lastName);
        if (lastNameCompare !== 0) return lastNameCompare;
        return a.firstName.localeCompare(b.firstName);
    });

    return staffList;
}

export function useStaff() {
  const { user, loading: authLoading } = useAuth(); // Get auth state
  return useQuery<StaffMember[], Error>({
    queryKey: [STAFF_QUERY_KEY],
    queryFn: fetchStaff,
    enabled: !!user && !authLoading, // Only enable query when user is authenticated and auth is not loading
    staleTime: 1000 * 60 * 5, 
  });
}

async function addStaff(newStaffData: Omit<StaffMember, 'id'>): Promise<string> {
  const staffCollectionRef = collection(db, 'staff');
  const dataToSave = {
    ...newStaffData,
    joinDate: newStaffData.joinDate ? Timestamp.fromDate(newStaffData.joinDate) : null, 
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
  const staffDocRef = doc(db, 'staff', updatedStaff.id);
  const { id, ...dataToUpdate } = updatedStaff; 
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