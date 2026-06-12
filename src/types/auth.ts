export type Role = 'field_officer' | 'remote_admin';

export type JwtUser = {
  sub: string;
  name: string;
  email: string;
  role: Role;
  device_id?: string;
};
