export default interface IUser {
  _id?: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'receptionist' | 'housekeeping' | 'guest';
  createdAt?: Date;
  updatedAt?: Date;
}
