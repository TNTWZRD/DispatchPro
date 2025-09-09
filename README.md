# DispatchPro

DispatchPro is a modern, real-time application for taxi dispatchers built with Next.js and Google's Gemini models. It provides a comprehensive set of tools to manage ride requests, track drivers, and streamline dispatching operations, alongside a dedicated interface for drivers.

## Core Features

### Dispatcher Dashboard

- **Real-Time Dispatch Board:** A central interface for all dispatching activities. It features a responsive layout:
    - **Desktop:** A multi-column view with "Waiting", "Scheduled", and "Cancelled" queues, alongside dedicated columns for each active driver.
    - **Mobile:** A space-efficient, tabbed interface for navigating between the waiting lists and individual drivers.
- **Drag-and-Drop Assignment (Desktop):** Intuitively assign pending rides to available drivers by dragging a ride card from the "Waiting" column to a driver's column.
- **New Call Logging:** A responsive pop-up form allows for quick and efficient manual entry of new ride requests, including details like passenger count, pickup/dropoff locations, stops, scheduled times, and special fees.
- **Unified Voice Control:** A powerful voice interface allows dispatchers to perform actions hands-free. The AI can:
    - **Log New Calls:** Transcribe a dictated call from a passenger and automatically create a new ride request.
    - **Manage Rides:** Execute commands like "assign ride one to driver two," "cancel ride three," or "mark ride two as completed."
- **AI Dispatch Assistant:** An intelligent assistant that can be prompted to analyze the current state of pending rides and available drivers to suggest optimal assignments, helping to minimize wait times.
- **Ride Management & Finalization:**
    - **Status Tracking:** Follow a ride from `pending` to `assigned`, `in-progress`, and finally `completed` or `cancelled`. Rides can be unscheduled or un-cancelled with ease.
    - **Fare & Payment Tracking:** After a ride is completed, dispatchers can finalize the fare and payment method (Cash, Card, Check). The system automatically calculates and records card processing fees.
- **Real-Time Map View:** A dynamic map that displays the current locations of all drivers and the pickup locations for pending rides, providing crucial geographical context.

### Driver Dashboard (`/driver`)

- **Mobile-First Interface:** A dedicated, streamlined view for drivers to see their assigned jobs.
- **Ride Queue:** Clearly displays the driver's current ride, followed by their queue of upcoming assigned rides.
- **Geo-Links:** Pickup and dropoff addresses are converted into clickable links that open in a map application for easy navigation.
- **Post-Ride Detailing:** Drivers can add important post-ride information, such as a cash tip received or private notes about the trip.

## Tech Stack

- **Framework:** Next.js (with App Router)
- **UI:** React, TypeScript, ShadCN UI, Tailwind CSS
- **Generative AI:** Google's Gemini models via Genkit
- **Real-time UI:** React State and Effects (No database)
- **Deployment:** Firebase App Hosting
