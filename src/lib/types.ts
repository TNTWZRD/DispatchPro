





export type RideStatus = 'pending' | 'assigned' | 'in-progress' | 'completed' | 'cancelled';

export type DriverStatus = 'available' | 'on-ride' | 'offline';

export type PaymentMethod = 'cash' | 'card' | 'check';

export enum Role {
    ALL = 0,
    DRIVER = 1,
    DISPATCHER = 2,
    OWNER = 4,
    ADMIN = 8,
}

export type Location = {
  name: string;
  coords: { x: number; y: number };
};

export type AppUser = {
    uid: string;
    email: string | null;
    displayName: string | null;
    role: Role;
    photoURL?: string | null;
    createdAt?: Date;
}

export type Driver = {
  id: string;
  name: string;
  phoneNumber: string;
  rating: number;
  status: DriverStatus;
  location: { x: number; y: number };
};

export type Vehicle = {
    id: string;
    make: string;
    model: string;
    year: number;
    licensePlate: string;
    status: 'active' | 'maintenance' | 'decommissioned';
    currentDriverId?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

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
