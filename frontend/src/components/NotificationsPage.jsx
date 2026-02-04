import React, { useState } from 'react';
import { X } from 'lucide-react';

const NotificationsPage = ({ notifications = [] }) => {
  const [activeTab, setActiveTab] = useState('notifications');
  const [search, setSearch] = useState('');
  const [unread, setUnread] = useState(0);
  const [showFollowerModal, setShowFollowerModal] = useState(false);
  const [selectedFollower, setSelectedFollower] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedEventQR, setSelectedEventQR] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventLoading, setEventLoading] = useState(false);

  // Transform userActivities data to notification format
  const transformedNotifications = notifications.map((activity, index) => {
    const getNotificationType = (type) => {
      switch (type) {
        case 'event_created':
          return 'success';
        case 'event_registered':
          return 'success';
        case 'new_follower':
          return 'info';
        case 'event_deleted':
          return 'warning';
        case 'event_cancelled':
          return 'error';
        case 'event_recommendation':
          return 'purple';
        default:
          return 'info';
      }
    };

    const getNotificationTitle = (type, title) => {
      switch (type) {
        case 'event_created':
          if (activity.status === 'created_global') {
            return title;
          }
          return 'Event Created';
        case 'event_registered':
          return 'Event Registration';
        case 'new_follower':
          return 'New Follower';
        case 'event_deleted':
          return 'Event Deleted';
        case 'event_cancelled':
          return 'Registration Cancelled';
        case 'event_recommendation':
          return title;
        default:
          return title || 'Activity';
      }
    };

    const getNotificationSubtitle = (activity) => {
      switch (activity.type) {
        case 'event_created':
          if (activity.status === 'created_global') {
            return activity.subtitle;
          }
          return `You created "${activity.title}"`;
        case 'event_registered':
          return `Successfully registered for "${activity.title}"`;
        case 'new_follower':
          return `${activity.follower_name || activity.follower_email} started following you`;
        case 'event_deleted':
          return `Event "${activity.title}" was deleted`;
        case 'event_cancelled':
          return `You cancelled your registration for "${activity.title.replace('Registration Cancelled: ', '')}"`;
        case 'event_recommendation':
          return activity.description || `Based on your interest in ${activity.category}`;
        default:
          return activity.venue || activity.follower_name || 'Activity details';
      }
    };

    const getNotificationAction = (type) => {
      switch (type) {
        case 'event_created':
          return 'View Event';
        case 'event_registered':
          return 'View Ticket';
        case 'new_follower':
          return 'View Profile';
        case 'event_deleted':
          return 'View History';
        case 'event_cancelled':
          return null;
        case 'event_recommendation':
          return 'View Event';
        default:
          return 'View Details';
      }
    };

    const getTimeAgo = (dateString) => {
      if (!dateString) return 'Recently';
      if (!dateString) return 'Recently';
      const activityDate = new Date(dateString);
      return activityDate.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    return {
      id: activity.id || index + 1,
      type: getNotificationType(activity.type),
      title: getNotificationTitle(activity.type, activity.title),
      subtitle: getNotificationSubtitle(activity),
      time: getTimeAgo(activity.date),
      badge: activity.confirmation_id ? true : false,
      action: getNotificationAction(activity.type)
    };
  });

  const filteredNotifications = transformedNotifications.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.subtitle.toLowerCase().includes(search.toLowerCase())
  );

  const markAsRead = (id) => {
    // Simulate marking as read
    setUnread(prev => prev > 0 ? prev - 1 : 0);
  };

  const fetchQRCode = async (eventId) => {
    setQrLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/v1/user/registrations/${eventId}/qr`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedEventQR(data);
        setShowQRModal(true);
      } else {
        console.error('Failed to fetch QR code');
        alert('Failed to load QR code. Please try again.');
      }
    } catch (error) {
      console.error('Error fetching QR code:', error);
      alert('An error occurred while loading the QR code.');
    } finally {
      setQrLoading(false);
    }
  };

  const fetchEventDetails = async (eventId) => {
    setEventLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/v1/events/${eventId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedEvent(data);
        setShowEventModal(true);
      } else {
        console.error('Failed to fetch event details');
        alert('Failed to load event details. Please try again.');
      }
    } catch (error) {
      console.error('Error fetching event details:', error);
      alert('An error occurred while loading the event details.');
    } finally {
      setEventLoading(false);
    }
  };

  const getIcon = (type) => {
    const icons = {
      success: '✅',
      info: '🔔',
      warning: '⚠️',
      error: '❌',
      purple: '✨'
    };
    return icons[type] || '📌';
  };

  return (
    <>
      <div className="min-h-screen bg-slate-900">
        <div className="w-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-white">Notifications {unread > 0 && <span className="ml-2 bg-primary-500 text-slate-900 px-2 py-1 rounded-full text-sm font-bold">{unread}</span>}</h1>
            <div className="flex items-center space-x-4">
              <input
                type="text"
                placeholder="Search notifications..."
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Notifications List */}
          <div className="space-y-6 w-full">
            {filteredNotifications.map((notif, index) => {
              const originalActivity = notifications[index]; // Get the original activity data
              return (
                <div key={notif.id} className="bg-slate-800 border border-slate-700 rounded-xl shadow-lg py-6 px-6 hover:bg-slate-750 transition-colors">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
                      <img
                        src={originalActivity.event_image || originalActivity.image_url || originalActivity.follower_image || ''}
                        alt={originalActivity.title || 'Activity'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Hide the broken image and show fallback emoji
                          e.target.style.display = 'none';
                          const fallbackDiv = e.target.nextSibling;
                          if (fallbackDiv) {
                            fallbackDiv.style.display = 'flex';
                          }
                        }}
                        style={{ display: (originalActivity.event_image || originalActivity.image_url || originalActivity.follower_image) ? 'block' : 'none' }}
                      />
                      <div className={`w-full h-full rounded-full flex items-center justify-center text-xl font-bold shadow-md ${notif.type === 'success' ? 'bg-green-100 text-green-600' :
                        notif.type === 'info' ? 'bg-blue-100 text-blue-600' :
                          notif.type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                            'bg-purple-100 text-purple-600'
                        }`} style={{ display: (originalActivity.event_image || originalActivity.image_url || originalActivity.follower_image) ? 'none' : 'flex' }}>
                        {getIcon(notif.type)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white truncate">{notif.title}</h3>
                        <span className="text-sm text-slate-400 ml-2">{notif.time}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-300">{notif.subtitle}</p>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {notif.badge && (
                        <span className="w-3 h-3 bg-primary-500 rounded-full"></span>
                      )}
                      {notif.action && (
                        <button
                          onClick={() => {
                            if (notif.action === 'View Profile' && originalActivity.type === 'new_follower') {
                              setSelectedFollower(originalActivity);
                              setShowFollowerModal(true);
                            } else if (notif.action === 'View Ticket' && originalActivity.type === 'event_registered') {
                              fetchQRCode(originalActivity.id);
                            } else if (notif.action === 'View Event' && (originalActivity.type === 'event_created' || originalActivity.type === 'event_registered' || originalActivity.type === 'event_recommendation')) {
                              fetchEventDetails(originalActivity.id);
                            } else {
                              markAsRead(notif.id);
                            }
                          }}
                          className="text-sm text-primary-400 hover:text-primary-300 font-medium px-3 py-1 rounded-md hover:bg-primary-500/10 transition-colors"
                        >
                          {notif.action}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Follower Profile Modal */}
          {showFollowerModal && selectedFollower && (
            <>
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] flex flex-col">
                  {/* Header */}
                  <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <h3 className="text-xl font-bold text-white">Follower Profile</h3>
                    <button
                      onClick={() => {
                        setShowFollowerModal(false);
                        setSelectedFollower(null);
                      }}
                      className="p-2 hover:bg-slate-700 rounded-full transition-colors"
                    >
                      <X size={20} className="text-slate-400" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-6">
                    <div className="text-center">
                      {/* Profile Image */}
                      <div className="w-24 h-24 mx-auto mb-6 rounded-full overflow-hidden flex items-center justify-center">
                        {selectedFollower.follower_image ? (
                          <img
                            src={selectedFollower.follower_image}
                            alt={selectedFollower.follower_name || selectedFollower.follower_email}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                            {selectedFollower.follower_name ?
                              selectedFollower.follower_name.split(' ').map(n => n[0]).join('').toUpperCase() :
                              selectedFollower.follower_email[0].toUpperCase()
                            }
                          </div>
                        )}
                      </div>

                      {/* Follower Details */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-1">First Name</label>
                          <div className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white">
                            {selectedFollower.follower_name ? selectedFollower.follower_name.split(' ')[0] : 'N/A'}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-1">Last Name</label>
                          <div className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white">
                            {selectedFollower.follower_name && selectedFollower.follower_name.split(' ').length > 1 ?
                              selectedFollower.follower_name.split(' ').slice(1).join(' ') :
                              'N/A'
                            }
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-1">Email ID</label>
                          <div className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white">
                            {selectedFollower.follower_email}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* QR Code Modal */}
          {showQRModal && selectedEventQR && (
            <>
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] flex flex-col">
                  {/* Header */}
                  <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <h3 className="text-xl font-bold text-white">Event Ticket</h3>
                    <button
                      onClick={() => {
                        setShowQRModal(false);
                        setSelectedEventQR(null);
                      }}
                      className="p-2 hover:bg-slate-700 rounded-full transition-colors"
                    >
                      <X size={20} className="text-slate-400" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-6">
                    <div className="text-center">
                      {/* QR Code */}
                      <div className="mb-4">
                        <img
                          src={`data:image/png;base64,${selectedEventQR.qr_code}`}
                          alt="Event QR Code"
                          className="w-48 h-48 mx-auto border-2 border-slate-500 rounded-lg shadow-lg"
                        />
                      </div>

                      {/* QR Code ID */}
                      <div className="space-y-2">
                        <div className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-3">
                          <div className="text-xs text-slate-400 mb-1">QR Code ID</div>
                          <div className="text-white font-mono text-center font-bold text-lg">
                            {selectedEventQR.confirmation_id || 'No ID available'}
                          </div>
                        </div>
                      </div>

                      {/* Event Info */}
                      {selectedEventQR.event_title && (
                        <div className="mt-4 p-3 bg-slate-700/50 rounded-lg">
                          <p className="text-sm text-slate-300">
                            <span className="font-medium text-white">Event:</span> {selectedEventQR.event_title}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Event Details Modal */}
          {showEventModal && selectedEvent && (
            <>
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] flex flex-col">
                  {/* Header */}
                  <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <h3 className="text-xl font-bold text-white">Event Details</h3>
                    <button
                      onClick={() => {
                        setShowEventModal(false);
                        setSelectedEvent(null);
                      }}
                      className="p-2 hover:bg-slate-700 rounded-full transition-colors"
                    >
                      <X size={20} className="text-slate-400" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Event Name</label>
                        <div className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white">
                          {selectedEvent.title || 'N/A'}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Organizer</label>
                        <div className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white">
                          {selectedEvent.organizer_name || 'N/A'}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Location</label>
                        <div className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white">
                          {selectedEvent.venue_name || 'N/A'}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Date</label>
                        <div className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white">
                          {selectedEvent.start_time ? new Date(selectedEvent.start_time).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Time</label>
                        <div className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white">
                          {selectedEvent.start_time ? new Date(selectedEvent.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationsPage;
