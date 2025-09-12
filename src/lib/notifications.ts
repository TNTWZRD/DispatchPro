
export function sendBrowserNotification(title: string, body: string, icon: string = '/favicon.ico') {
  if (!("Notification" in window)) {
    console.warn("This browser does not support desktop notification");
    return;
  }

  const showNotification = () => {
    if (navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, { body, icon });
      });
    } else {
      // Fallback for non-PWA contexts or if service worker isn't ready
      new Notification(title, { body, icon });
    }
  };

  if (Notification.permission === "granted") {
    showNotification();
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        showNotification();
      }
    });
  }
}
