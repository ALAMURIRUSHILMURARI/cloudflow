/**
 * CloudFlow Notification Service
 * 
 * ARCHITECTURAL DESIGN & AWS ROADMAP:
 * Current: Client-side event logging and notification state management.
 * Future AWS Integration:
 *   - Amazon SNS (Simple Notification Service) topics for async multi-channel alerts
 *   - Amazon Pinpoint / AWS AppSync WebSocket subscriptions for real-time push events
 *   - Amazon EventBridge rules capturing Step Function state transitions
 */

import { INITIAL_NOTIFICATIONS } from '../data/mockData';

const NOTIF_STORAGE_KEY = 'cloudflow_notifications_store';

class NotificationService {
  constructor() {
    this.initStorage();
  }

  initStorage() {
    if (!localStorage.getItem(NOTIF_STORAGE_KEY)) {
      localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(INITIAL_NOTIFICATIONS));
    }
  }

  getRawNotifications() {
    try {
      const data = localStorage.getItem(NOTIF_STORAGE_KEY);
      return data ? JSON.parse(data) : INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  }

  saveRawNotifications(notifs) {
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(notifs));
  }

  /**
   * Fetch all user notifications.
   */
  async getNotifications() {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return this.getRawNotifications();
  }

  /**
   * Mark a single notification as read.
   */
  async markAsRead(id) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const notifs = this.getRawNotifications();
    const updated = notifs.map((n) => (n.id === id ? { ...n, read: true } : n));
    this.saveRawNotifications(updated);
    return updated;
  }

  /**
   * Mark all notifications as read.
   */
  async markAllAsRead() {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const notifs = this.getRawNotifications();
    const updated = notifs.map((n) => ({ ...n, read: true }));
    this.saveRawNotifications(updated);
    return updated;
  }

  /**
   * Dispatch a new notification event.
   */
  async createNotification({ title, message, type = 'info', requestId = null }) {
    const notifs = this.getRawNotifications();
    const newNotif = {
      id: `notif-${Date.now()}`,
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
      read: false,
      requestId
    };
    const updated = [newNotif, ...notifs];
    this.saveRawNotifications(updated);
    return newNotif;
  }
}

export const notificationService = new NotificationService();
export default notificationService;
