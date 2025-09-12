
export function sendBrowserNotification(title: string, body: string, icon: string = '/favicon.ico') {
  if (!("Notification" in window)) {
    console.warn("This browser does not support desktop notification");
    return;
  }

  if (Notification.permission === "granted") {
    new Notification(title, { body, icon });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        new Notification(title, { body, icon });
      }
    });
  }
}
