import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import { notificationService } from '../../services/notificationService';
import { AppNotification } from '../../types';
import {
  Bell,
  ShoppingCart,
  CheckCheck,
  Calendar,
  AlertTriangle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { formatDate } from '../../lib/utils';

export const Header: React.FC<{ title?: string }> = ({ title }) => {
  const { user, isCoordinator } = useAuth();
  const { totalCartQuantity } = useCart();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const list = await notificationService.getNotifications();
        setNotifications(list);
        setUnreadCount(list.filter((n) => !n.isRead).length);
      } catch {
        // Fallback for notifications if network fails
      }
    }
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <header className="h-16 bg-card border-b border-border px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Title & Today's Date */}
      <div className="flex items-center gap-4">
        {title && <h1 className="text-lg font-bold tracking-tight text-foreground">{title}</h1>}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-md border border-border">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formatDate(new Date())}</span>
        </div>
      </div>

      {/* Action shortcuts */}
      <div className="flex items-center gap-3">
        {/* Issue Cart Button for Coordinator */}
        {isCoordinator && (
          <button
            onClick={() => navigate('/issue-items')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 transition-colors shadow-sm"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Issue Cart</span>
            {totalCartQuantity > 0 && (
              <span className="bg-blue-600 text-white text-[11px] font-bold px-1.5 py-0.2 rounded-full">
                {totalCartQuantity}
              </span>
            )}
          </button>
        )}

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted relative transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-card rounded-xl border border-border shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3 bg-muted/40 border-b border-border flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Notifications ({unreadCount})
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
                  >
                    <CheckCheck className="w-3 h-3" /> Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-border/60 scrollbar-thin">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    No new notifications
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item._id}
                      className={`p-3 text-xs transition-colors hover:bg-muted/40 ${
                        !item.isRead ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {item.type.includes('overdue') ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">{item.title}</p>
                          <p className="text-muted-foreground mt-0.5 text-[11px] leading-snug">
                            {item.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground/70 mt-1">
                            {formatDate(item.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Role Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border border-border">
          <Sparkles className="w-3 h-3 text-blue-500" />
          <span className="capitalize">{user?.role || 'User'}</span>
        </div>
      </div>
    </header>
  );
};
