

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
  pickup: Location;
  totalFare: number;
  passengerPhone?: string;
  dropoff?: Location;
  stops?: Location[];
  status: RideStatus;
  driverId: string | null;
  isNew?: boolean;
  passengerCount?: number;
  movingFee: boolean;
  notes?: string;
  paymentDetails?: {
    cash?: number;
    card?: number;
    check?: number;
    tip?: number;
    cashTip?: number;
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  scheduledTime?: Date;
  assignedAt?: Date;
  pickedUpAt?: Date;
  droppedOffAt?: Date;
  cancelledAt?: Date;
};

export type Message = {
  id: string;
  driverId: string;
  sender: 'driver' | 'dispatcher';
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
  timestamp: Date;
  isRead: boolean;
};
