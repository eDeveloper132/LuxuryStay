export default interface IUser {
  _id?: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'receptionist' | 'housekeeping' | 'guest';
  isVerified?: boolean;
  verificationToken?: string | null;
  verificationTokenExpiry?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}
