export interface user {
  id: number;
  email: string;
  email_code: string;
  email_verified: boolean;
  created: string;
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