export default interface IRoom {
  _id?: string;
  number: string;             // room number ya name
  type: 'single' | 'double' | 'suite';
  price: number;
  status: 'available' | 'occupied' | 'cleaning' | 'maintenance';
  features?: string[];        // extra features, e.g. ['wifi','ac']
  createdAt?: Date;
  updatedAt?: Date;
}
