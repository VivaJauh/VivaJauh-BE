export type Role = 'member' | 'primary_admin' | 'secondary_admin';

export type JwtUser = {
  sub: string;
  name: string;
  email: string;
  role: Role;
  tenant_id?: string | null;
  koperasi_name?: string | null;
  koperasi_type?: string | null;
  device_id?: string;
};
