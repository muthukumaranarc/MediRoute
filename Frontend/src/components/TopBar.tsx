import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, 
  Bell, 
  RefreshCw, 
  X, 
  CheckCheck, 
  Ambulance, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  Trash2, 
  ArrowRight
} from 'lucide-react';
import { Case, CoordinationRequest, Hospital } from '../types';

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'urgent' | 'success' | 'warning' | 'info';
  read: boolean;
  targetUrl?: string;
}

interface TopBarProps {
  onRefresh: () => Promise<void> | void;
  apiConnected: boolean;
  role?: string;
  onToggleRole?: () => void;
  cases?: Case[];
  requests?: CoordinationRequest[];
  hospitals?: Hospital[];
}

export const TopBar: React.FC<TopBarProps> = ({ 
  onRefresh, 
  onToggleRole,
  cases = [],
  requests = [],
  hospitals = [] 
}) => {
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize notifications with realistic live emergency network events
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif-1',
      title: 'Critical Cardiac Dispatch',
      description: 'MR-2026-0003 requested admission from Namakkal Old Town.',
      time: '2m ago',
      type: 'urgent',
      read: false,
      targetUrl: '/ambulance/cases'
    },
    {
      id: 'notif-2',
      title: 'Hospital Bed Reserved',
      description: 'Vivekanandha Medical Care Hospital accepted trauma transfer MR-2026-0001.',
      time: '12m ago',
      type: 'success',
      read: false,
      targetUrl: '/hospital'
    },
    {
      id: 'notif-3',
      title: 'ER Capacity Warning',
      description: 'Govt Hospital Kumarapalayam has 2 emergency beds remaining.',
      time: '28m ago',
      type: 'warning',
      read: false,
      targetUrl: '/hospital'
    },
    {
      id: 'notif-4',
      title: 'Network Sync Active',
      description: 'All 20 hospital nodes across Namakkal & Erode are online.',
      time: '1h ago',
      type: 'info',
      read: true,
      targetUrl: '/hospital'
    }
  ]);

  // Close dropdown on outside click or escape key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsNotificationsOpen(false);
      }
    };

    if (isNotificationsOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isNotificationsOpen]);

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleNotificationClick = (item: NotificationItem) => {
    // Mark as read
    setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, read: true } : n));
    setIsNotificationsOpen(false);
    if (item.targetUrl) {
      navigate(item.targetUrl);
    }
  };

  const dismissNotification = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const displayedNotifications = notifications.filter(n => {
    if (notificationFilter === 'unread') return !n.read;
    return true;
  });

  const getIconForType = (type: NotificationItem['type']) => {
    switch (type) {
      case 'urgent':
        return <Ambulance className="w-4 h-4 text-rose-600" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'info':
      default:
        return <Building2 className="w-4 h-4 text-blue-600" />;
    }
  };

  const getBgForType = (type: NotificationItem['type']) => {
    switch (type) {
      case 'urgent':
        return 'bg-rose-50 border-rose-100';
      case 'success':
        return 'bg-emerald-50 border-emerald-100';
      case 'warning':
        return 'bg-amber-50 border-amber-100';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-100';
    }
  };

  return (
    <header className="mediroute-topbar" aria-label="Top status and navigation bar">
      {/* ================= DESKTOP HEADER (md and up) ================= */}
      <div className="hidden md:flex items-center justify-between w-full px-2">
        {/* Left: Search Bar with Ctrl + K */}
        <div className="relative flex items-center w-full max-w-[420px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input 
            type="text" 
            placeholder="Search case, ambulance, hospital..." 
            className="w-full pl-9 pr-16 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-xs"
          />
          <div className="absolute right-3 flex items-center pointer-events-none">
            <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-slate-400 bg-slate-100 border border-slate-200 rounded">Ctrl + K</kbd>
          </div>
        </div>

        {/* Right: Meta & Status */}
        <div className="topbar-meta-area flex items-center gap-5 relative" ref={dropdownRef}>
          {/* Status indicator */}
          <div className="topbar-network-status flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="text-xs font-semibold text-slate-700">
              Network Online
            </span>
          </div>

          {/* Notification Bell Button with Interactive Counter Badge */}
          <button 
            type="button"
            onClick={() => setIsNotificationsOpen(prev => !prev)}
            className={`relative p-2 rounded-xl transition-all cursor-pointer ${
              isNotificationsOpen 
                ? 'bg-emerald-50 text-[#16a34a]' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            aria-label="Notifications"
            title={`${unreadCount} unread emergency alerts`}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] bg-rose-500 text-white font-extrabold text-[9.5px] rounded-full flex items-center justify-center px-1 ring-2 ring-white shadow-xs animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* User Profile Avatar */}
          <div 
            onClick={onToggleRole}
            className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center cursor-pointer hover:bg-slate-300 transition-colors shadow-xs"
            title="Click to toggle active role / profile"
          >
            D
          </div>

          {/* ================= NOTIFICATION DROPDOWN POPOVER ================= */}
          {isNotificationsOpen && (
            <div className="absolute top-12 right-0 w-[380px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
              {/* Popover Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-slate-900">Notifications</span>
                  {unreadCount > 0 ? (
                    <span className="bg-rose-50 text-rose-600 font-bold text-[10.5px] px-2 py-0.5 rounded-full border border-rose-200/60">
                      {unreadCount} new
                    </span>
                  ) : (
                    <span className="bg-emerald-50 text-emerald-600 font-bold text-[10.5px] px-2 py-0.5 rounded-full">
                      All caught up
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Mark all as read"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Mark read</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsNotificationsOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="px-4 py-2 bg-white border-b border-slate-100 flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setNotificationFilter('all')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    notificationFilter === 'all' 
                      ? 'bg-slate-900 text-white' 
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  All ({notifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setNotificationFilter('unread')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    notificationFilter === 'unread' 
                      ? 'bg-slate-900 text-white' 
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              {/* Notification Items List */}
              <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100">
                {displayedNotifications.length > 0 ? (
                  displayedNotifications.map(item => (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`p-3.5 flex items-start gap-3 hover:bg-slate-50 transition-colors cursor-pointer relative group ${
                        !item.read ? 'bg-emerald-50/20' : ''
                      }`}
                    >
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-none border ${getBgForType(item.type)}`}>
                        {getIconForType(item.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <h4 className={`text-xs truncate ${!item.read ? 'font-extrabold text-slate-900' : 'font-semibold text-slate-700'}`}>
                            {item.title}
                          </h4>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap flex-none">
                            {item.time}
                          </span>
                        </div>
                        <p className="text-[11.5px] text-slate-500 leading-snug line-clamp-2">
                          {item.description}
                        </p>
                      </div>

                      {/* Unread blue dot */}
                      {!item.read && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 flex-none self-center shadow-xs" />
                      )}

                      {/* Delete notification button on hover */}
                      <button
                        type="button"
                        onClick={(e) => dismissNotification(e, item.id)}
                        className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 p-1 text-slate-400 hover:text-rose-500 transition-all cursor-pointer"
                        title="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                    <p className="text-xs font-bold text-slate-800">No notifications to show</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {notificationFilter === 'unread' ? 'You have read all your alerts.' : 'No active alerts in the network.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Popover Footer */}
              <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>108 Emergency Network</span>
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAllNotifications}
                    className="text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer text-[11px]"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear all</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= MOBILE SLIM HEADER (< md) ================= */}
      <div className="flex md:hidden items-center justify-between w-full py-0.5 px-1 relative" ref={dropdownRef}>
        {/* Brand with live status dot matching mobile screenshot */}
        <Link to="/ambulance" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-0.5 shadow-xs flex-none overflow-hidden">
            <img 
              src="/MediRoute_Logo.png" 
              alt="MediRoute 108" 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="font-extrabold text-[15px] text-slate-900 tracking-tight">MediRoute</span>
            <span className="font-bold text-[15px] text-emerald-600">108</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block ml-0.5" />
          </div>
        </Link>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          {/* Notification Bell */}
          <button 
            type="button"
            onClick={() => setIsNotificationsOpen(prev => !prev)}
            className="relative p-1 text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 text-white font-black text-[8px] rounded-full flex items-center justify-center ring-1 ring-white">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleRefreshClick}
            className="p-1 text-slate-500 hover:text-slate-700 active:scale-95 transition-transform cursor-pointer"
            aria-label="Refresh live data"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          {/* User Avatar */}
          <div 
            onClick={onToggleRole}
            className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center cursor-pointer"
          >
            D
          </div>
        </div>
      </div>
    </header>
  );
};
