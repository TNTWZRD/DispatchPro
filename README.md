# DispatchPro

DispatchPro is a modern, real-time application for taxi dispatchers built with Next.js, Firebase, and Google's Gemini models. It provides a comprehensive suite of tools to manage ride requests, track drivers, and streamline dispatching operations, alongside a dedicated interface for drivers and a full administrative backend.

## Core Features

### Dispatcher Dashboard (`/`)

A central, real-time interface for all dispatching activities.

- **Real-Time Dispatch Board:** A multi-column view with "Waiting", "Scheduled", and "Cancelled" queues, alongside dedicated columns for each active driver shift. It features a responsive layout that adapts to a tabbed view on mobile.
- **Drag-and-Drop Assignment:** Intuitively assign pending rides to available drivers by dragging a ride card from the "Waiting" column to a driver's column.
- **New Call Logging:** A responsive dialog form allows for quick and efficient manual entry of new ride requests, including details like passenger count, pickup/dropoff locations, stops, scheduled times, and special fees.
- **Unified Voice Control:** A powerful voice interface allows dispatchers to perform actions hands-free. The AI can:
    - **Log New Calls:** Transcribe a dictated call from a passenger and automatically create a new ride request.
    - **Manage Rides:** Execute commands like "assign ride one to driver two," "cancel ride three," or "mark ride two as completed."
- **Integrated Chat System:**
    - **Dispatcher Logs:** A central channel for each driver to communicate with dispatch, with messages accessible to all dispatchers.
    - **Private Chat:** Dispatchers can initiate private chats with individual drivers.
    - Features include starring important messages, forwarding, and audio message transcription.
- **Ride Management & Finalization:**
    - **Status Tracking:** Follow a ride from `pending` to `assigned`, `in-progress`, and finally `completed` or `cancelled`.
    - **Fare & Payment Tracking:** After a ride is completed, dispatchers can finalize the fare and payment method (Cash, Card, Check), with automatic calculation for card processing fees.

### Driver Dashboard (`/driver`)

A dedicated, mobile-first interface for drivers to manage their assigned jobs.

- **Ride Queue:** Clearly displays the driver's current ride, followed by their queue of upcoming assigned rides for their active shift.
- **Geo-Links:** Pickup and dropoff addresses are converted into clickable links that open in a map application for easy navigation.
- **Post-Ride Detailing:** Drivers can add important post-ride information, such as a cash tip received or private notes about the trip.
- **Driver Chat:** Drivers can communicate with dispatch via the dispatch log or start private chats with other drivers.

### Admin Dashboard (`/admin`)

A comprehensive, protected section for high-level management of the entire system.

- **User & Role Management:** Invite new users via email and assign granular roles (Dispatcher, Driver, Admin, Owner).
- **Driver Management:** Create and manage driver profiles, including those who don't have a user account.
- **Fleet & Vehicle Management:** Add, edit, and track all vehicles in the fleet. View vehicle details, notes, and maintenance history.
- **Shift Management:** Start, end, and edit driver shifts. Assign drivers to vehicles and view a daily log of all shift activity and total fares earned per shift.
- **Maintenance Ticketing System:**
    - Create and manage maintenance tickets for any vehicle in the fleet.
    - Track ticket status (`open`, `in-progress`, `closed`), priority, and a full activity log with comments and status changes.
- **Auditing & Security (`/admin/auditing`)**
    - **Unpaid Rides Tracking:** Review a filterable list of all completed rides with an outstanding balance. Admins can edit ride details, add notes, and settle the final payment.
    - **Ban List Management:** Maintain a platform-wide ban list. Add, edit, or remove entries based on name, phone number, or address, with a required reason for each ban.

## Tech Stack

- **Framework:** Next.js (with App Router)
- **UI:** React, TypeScript, ShadCN UI, Tailwind CSS
- **Database & Auth:** Firebase (Firestore, Authentication)
- **Generative AI:** Google's Gemini models via Genkit
- **Real-time UI:** React State and `onSnapshot` listeners from Firestore.
- **Deployment:** Firebase App Hosting

## Getting Started

To run this project locally, you'll need Node.js and a package manager like npm. Follow these steps:

### 1. Installation

First, install the project dependencies:

```bash
npm install
```

### 2. Environment Variables

Next, you need to set up your environment variables. This project uses Firebase, Google AI (Genkit), and Google Maps.

Copy the `.env.example` file to a new `.env` file:

```bash
cp .env.example .env
```

Now, open the `.env` file and fill in the required values:

- **Firebase**: Get your project configuration from the Firebase Console (`Project Settings > General > Your apps > Web app`).
- **Genkit/Gemini**: Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
- **Google Maps**:
    1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
    2.  Create a new project or select an existing one.
    3.  Go to **APIs & Services > Credentials**.
    4.  Click **Create Credentials > API key**.
    5.  **Important**: Restrict your API key to prevent unauthorized use. For development, you can add an "HTTP referrers" restriction for `localhost`. For production, restrict it to your app's domain.
    6.  Enable the **Maps JavaScript API** and **Maps Embed API** for your project in the [API Library](https://console.cloud.google.com/apis/library).
- **Email (Nodemailer)**: If you plan to use the email invitation feature, you'll need to provide SMTP server details.

### 3. Running the Application

This project consists of two main parts: the Next.js web application and the Genkit AI service. You need to run both concurrently in separate terminal windows.

**Terminal 1: Run the Next.js App**

This command starts the main web application on `http://localhost:9002`.

```bash
npm run dev
```

**Terminal 2: Run the Genkit Service**

This command starts the Genkit development server, which watches for changes in your AI flows. The Next.js app communicates with this service for all generative AI features.

```bash
npm run genkit:watch
```

Once both services are running, you can open your browser to `http://localhost:9002` to see the application.
