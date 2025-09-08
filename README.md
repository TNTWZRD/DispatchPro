# DispatchPro

DispatchPro is a modern, real-time application for taxi dispatchers built with Next.js, Firebase, and Google's Gemini models. It provides a comprehensive set of tools to manage ride requests, track drivers, and streamline dispatching operations.

## Core Features

- **Real-Time Dispatch Dashboard:** A central interface for all dispatching activities. It features a responsive layout:
    - **Desktop:** A multi-column view with a "Waiting" queue and dedicated columns for each active driver.
    - **Mobile:** A space-efficient tabbed interface for navigating between the waiting list and individual drivers.
- **Drag-and-Drop Assignment (Desktop):** Intuitively assign pending rides to available drivers by dragging a ride card from the "Waiting" column to a driver's column.
- **New Call Logging:** A pop-up form allows for quick and efficient manual entry of new ride requests, including details like passenger count, pickup/dropoff locations, scheduled times, and special fees.
- **Unified Voice Control:** A single, powerful voice interface allows dispatchers to perform actions hands-free. The AI can:
    - **Log New Calls:** Transcribe a dictated call from a passenger and automatically create a new ride request.
    - **Manage Rides:** Execute commands like "assign ride one to driver two," "cancel ride three," or "mark ride two as completed."
- **Ride Management:**
    - **Status Tracking:** Follow a ride from `pending` to `assigned`, `in-progress`, and finally `completed` or `cancelled`.
    - **Fare & Payment Tracking:** After a ride is completed, dispatchers can manually set the final fare and payment method (Cash, Card, Check). The system automatically calculates and records card processing fees.
- **Real-Time Map View:** A dynamic map that displays the current locations of all drivers and the pickup locations for pending rides, providing crucial geographical context.
- **Ride History Log:** A persistent log that records details of all completed and cancelled rides for reporting and record-keeping.

## Tech Stack

- **Framework:** Next.js (with App Router)
- **UI:** React, TypeScript, ShadCN UI, Tailwind CSS
- **Generative AI:** Google's Gemini models via Genkit
- **Real-time UI:** React State and Effects
- **Deployment:** Firebase App Hosting
