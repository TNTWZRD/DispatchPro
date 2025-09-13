


export type RideStatus = 'pending' | 'assigned' | 'in-progress' | 'completed' | 'cancelled';

export type DriverStatus = 'available' | 'on-shift' | 'offline';

export type PaymentMethod = 'cash' | 'card' | 'check';

export enum Role {
    ALL = 0,
    DRIVER = 1,
    DISPATCHER = 2,
    OWNER = 4,
    ADMIN = 8,
}

export const DISPATCHER_ID = 'dispatcher-main';

export const dispatcherUser: AppUser = {
    id: DISPATCHER_ID,
    uid: DISPATCHER_ID,
    name: 'Dispatch',
    displayName: 'Dispatch',
    email: '',
    role: Role.DISPATCHER,
};


export type Location = {
  name: string;
  coords: { x: number; y: number };
};

export type AppUser = {
    uid: string;
    id: string; 
    email: string | null;
    name: string | null;
    displayName?: string | null; // Keep for firebase compatibility, but prefer `name`
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
  currentShiftId?: string | null;
};

export type Vehicle = {
    id: string;
    nickname: string;
    make: string;
    model: string;
    year: number | null;
    vin: string;
    mileage: number | null;
    status: 'active' | 'maintenance' | 'decommissioned';
    currentShiftId: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export type Shift = {
    id: string;
    driverId: string;
    vehicleId: string;
    status: 'active' | 'inactive';
    startTime: Date;
    endTime?: Date;
}

export type MaintenanceTicket = {
    id:string;
    vehicleId: string;
    title: string;
    description: string;
    status: 'open' | 'in-progress' | 'closed';
    priority: 'low' | 'medium' | 'high';
    reportedById: string;
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
  driverId: string | null; // This will be deprecated in favor of shiftId
  shiftId?: string | null;
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
  completionTime?: Date;
};

export type Message = {
  id: string;
  threadId: string[];
  sender: 'driver' | 'dispatcher';
  senderId: string;
  recipientId: string;
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
  timestamp: Date;
  isRead: boolean;
  forwardedFrom?: string;
};
