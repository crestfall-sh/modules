export interface user {
  id: number;
  email: string;
  email_code: string;
  email_verified: boolean;
  created: string;
  user_roles?: user_role[];
}
export interface role {
  id: number;
  name: string;
  permissions: string[];
}
export interface user_role {
  id: number;
  user_id: number;
  role_id: number;
}