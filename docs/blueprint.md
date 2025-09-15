# DispatchPro Technical Blueprint

This document provides a detailed technical overview of the DispatchPro application, covering its architecture, data models, component structure, and backend logic.

## 1. High-Level Architecture

DispatchPro is a full-stack Next.js application leveraging the App Router. It uses Firebase (Firestore) for its real-time database and user authentication. Generative AI features are powered by Google's Gemini models, accessed via the Genkit framework.

- **Framework**: Next.js 15 (App Router)
- **UI**: React, TypeScript, ShadCN UI, Tailwind CSS, `@hello-pangea/dnd` for drag-and-drop.
- **State Management**: Primarily React context (`AuthContext`, `ZoomContext`, `CondensedModeContext`) and component state. Data is fetched and updated in real-time using Firebase's `onSnapshot` listeners.
- **Backend/Database**: Firebase (Firestore and Authentication).
- **Generative AI**: Google Gemini via Genkit.
- **Deployment**: Firebase App Hosting.

## 2. Firestore Data Models

The entire application state is persisted in Firestore. The key collections are:

- **`users`**: Stores application user information, including roles. Linked by Firebase Auth UID.
- **`drivers`**: Stores driver-specific profiles. A user with the `DRIVER` role will have a corresponding document here. Also supports non-user drivers.
- **`vehicles`**: The fleet of vehicles. Can be assigned to shifts.
- **`shifts`**: Represents a driver's work session, linking a driver to a vehicle for a period.
- **`rides`**: The core data model for a single ride request. It tracks locations, status, assignment, and payment details.
- **`tickets`**: Maintenance tickets associated with vehicles. Each ticket has a sub-collection for its activity history.
- **`messages`**: Stores all chat messages. A `threadId` field (an array of participant IDs) is used to group messages for P2P or channel-based chats.

## 3. Core Components & UI Structure

### 3.1. Dispatcher View (`/`)

The main interface for dispatchers, built around the `DispatchDashboard` component.

- **`DispatchDashboard`**: The primary stateful component. It fetches all necessary data from Firestore (rides, drivers, shifts, etc.) and manages the overall UI state.
  - **Desktop Layout**: A multi-column, drag-and-drop interface.
    - `StrictModeDroppable` columns for "Waiting", "Scheduled", and each active driver shift.
    - Rides are represented by `RideCard` components, which are `Draggable`.
  - **Mobile Layout**: A tabbed view (`Carousel`) to switch between queues and drivers.
- **`DriverColumn`**: Renders a column for a single active driver shift, displaying their assigned rides, shift details, and actions.
- **`RideCard`**: A detailed card representing a single ride. It displays all relevant information and provides actions via a dropdown menu (assign, change status, set fare, etc.).
- **`CallLoggerForm`**: A responsive dialog/sheet for manually logging new ride requests or editing existing ones.
- **`ChatView` / Chat System**: A dialog-based messaging system allowing dispatchers to communicate with individual drivers or view a central "Dispatch Log".

### 3.2. Driver View (`/driver`)

A mobile-first dashboard for drivers, managed by the `DriverDashboard` component.

- **`DriverDashboard`**: Fetches and displays only the rides and messages relevant to the currently logged-in driver's active shift.
- **`DriverRideCard`**: A simplified version of `RideCard` tailored for drivers. Pickup/dropoff locations are links that open in a map application.
- **`DriverEditForm`**: Allows drivers to add post-ride details, such as a cash tip received or private notes.

### 3.3. Admin Section (`/admin/**`)

A protected area for managing application-wide data.

- **`/admin`**: User and Driver management.
  - `UserManagementTable`: Lists all registered users, with role-editing capabilities.
  - `DriverManagementTable`: Lists all driver profiles (including non-users).
- **`/admin/vehicles`**: Fleet management.
  - `VehicleManagementTable`: Lists all vehicles.
  - `[id]/page.tsx`: A detail page for a single vehicle, showing its info and a `MaintenanceTicketsTable`.
- **`/admin/shifts`**: Shift management.
  - `ShiftManagementTable`: Displays all shifts for a selected day. Allows for ending or editing shifts.
- **`/admin/maintenance`**: Centralized maintenance view.
  - `AllMaintenanceTicketsTable`: Lists all tickets across the entire fleet.
  - `[id]/page.tsx`: A detail page for a single ticket, showing its full activity log and allowing for status changes and comments.

## 4. Backend Logic (Next.js Server Actions)

All database mutations are handled via Next.js Server Actions, located in `src/app/actions.ts` and `src/app/admin/actions.ts`. This provides a secure and modern way to interact with the backend without writing separate API endpoints.

**Key Actions:**

- **`createDriver`, `updateDriver`, `deleteDriver`**: Manages driver profiles.
- **`createVehicle`, `updateVehicle`**: Manages the vehicle fleet.
- **`startShift`, `endShift`, `updateShift`**: Manages driver work shifts.
- **`createTicket`, `updateTicket`, `addTicketComment`**: Manages the maintenance ticketing lifecycle.
- **`sendInviteEmail`**: Sends an email invitation to new users.
- **`updateUserProfile`**: Allows users to update their own profile information.
- **`deleteMessage`, `forwardMessage`, `toggleStarMessage`**: Manages chat messages.

## 5. Genkit AI Flows

AI functionality is encapsulated in Genkit flows within the `src/ai/flows/` directory.

- **`unified-voice-flow.ts`**: The core of the voice control feature. It takes an audio recording and uses a powerful prompt to determine whether the user is logging a new call or issuing a command to manage an existing ride. It returns a structured JSON object representing the determined intent.
- **`chat-flow.ts`**: Processes chat messages. It can transcribe audio messages to text, analyze the content for urgency, and suggest quick replies.
- **`dispatching-suggestions.ts`**: An AI agent that analyzes the current state of pending rides and available drivers to suggest optimal assignments, aiming to minimize wait times.
- **`driver-eta-prediction.ts`**: A flow designed to predict a driver's ETA based on location and traffic data.
