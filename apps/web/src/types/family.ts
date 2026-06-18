export interface FamilyMemberUser {
  id: string;
  name: string;
  email: string;
}

export interface FamilyMember {
  id: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  userId: string;
  user: FamilyMemberUser;
}

export interface Family {
  id: string;
  name: string;
  code: string;
  ownerId: string;
  members: FamilyMember[];
}
