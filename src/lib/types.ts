export type RideStatus = 'pending' | 'assigned' | 'in-progress' | 'completed' | 'cancelled';

export type DriverStatus = 'available' | 'on-ride' | 'offline';

export type PaymentMethod = 'cash' | 'card' | 'check';

export type Location = {
  name: string;
  coords: { x: number; y: number };
};

export type Driver = {
  id: string;
  name: string;
  vehicle: string;
  rating: number;
  status: DriverStatus;
  location: { x: number; y: number };
};

export type Ride = {
  id: string;
  passengerPhone: string;
  pickup: Location;
  dropoff: Location;
  status: RideStatus;
  driverId: string | null;
  requestTime: Date;
  scheduledTime?: Date;
  completionTime?: Date;
  isNew?: boolean;
  passengerCount: number;
  movingFee: boolean;
  fare?: number;
  paymentMethod?: PaymentMethod;
  cardFee?: number;
};
