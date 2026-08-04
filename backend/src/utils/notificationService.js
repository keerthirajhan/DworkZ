const Notification = require('../models/Notification');

// Formats a Booking's date + "HH:mm" time into "12 Aug 2026, 2:00 PM" for
// use in notification titles/messages.
function formatBookingDateTime(date, time) {
  const d = new Date(date);
  const datePart = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const [hStr, mStr] = String(time || '').split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10) || 0;
  let period = 'AM';
  let displayHour = h;
  if (!isNaN(h)) {
    period = h >= 12 ? 'PM' : 'AM';
    displayHour = h % 12 === 0 ? 12 : h % 12;
  }
  const timePart = isNaN(h) ? '' : `${displayHour}:${String(m).padStart(2, '0')} ${period}`;

  return timePart ? `${datePart}, ${timePart}` : datePart;
}

/**
 * Create a notification for a client and emit it in real time over the
 * per-client Socket.io room ("client_<clientId>", joined by the frontend
 * after login — see server.js). Silently no-ops if there's no client to
 * notify (e.g. guest/public bookings that aren't tied to a portal account).
 */
async function notifyClient({ clientId, bookingId, type, title, message, metadata }) {
  if (!clientId) return null;

  const notification = await Notification.create({
    client: clientId,
    booking: bookingId,
    type,
    title,
    message,
    metadata
  });

  global.io?.to(`client_${clientId}`).emit('newNotification', notification);

  return notification;
}

module.exports = { notifyClient, formatBookingDateTime };
