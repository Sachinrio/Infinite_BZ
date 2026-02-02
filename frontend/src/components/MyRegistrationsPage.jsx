import React, { useState, useEffect } from 'react';
import { ChevronLeft, MapPin, Clock, Users, Bookmark, Bell, HelpCircle, Calendar, CheckCircle2, QrCode, CalendarPlus } from 'lucide-react';

export default function MyRegistrationsPage({ onNavigate, user }) {
  const [activeTab, setActiveTab] = useState('going');
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [qrModal, setQrModal] = useState({ show: false, qr: '', title: '', eventId: '' });

  useEffect(() => {
    fetchUserRegistrations();
  }, []);

  const fetchUserRegistrations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/v1/user/registrations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setRegistrations(data.registrations || []);
      } else {
        setError('Failed to load registrations');
      }
    } catch (err) {
      console.error('Error fetching registrations:', err);
      setError('Failed to load registrations');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFilteredRegistrations = () => {
    const now = new Date();
    return registrations.filter(event => {
      // First check tab filter
      const eventDate = new Date(event.start_time);
      let tabMatch = false;
      if (activeTab === 'going') {
        tabMatch = eventDate > now;
      } else if (activeTab === 'past') {
        tabMatch = eventDate < now;
      } else {
        // For 'saved' or other tabs, show all
        tabMatch = true;
      }

      // Then check search filter
      const searchMatch = searchTerm === '' || event.title.toLowerCase().includes(searchTerm.toLowerCase());

      return tabMatch && searchMatch;
    });
  };

  const handleShowQr = async (eventId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:8000/api/v1/user/registrations/${eventId}/qr`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setQrModal({ show: true, qr: data.qr_code, title: data.event_title, eventId: eventId });
      } else {
        console.error('Failed to fetch QR code');
      }
    } catch (err) {
      console.error('Error fetching QR code:', err);
    }
  };

  const handleAddToCalendar = (event) => {
    const startDate = new Date(event.start_time);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // Assume 2 hours duration

    // Format dates for Google Calendar (YYYYMMDDTHHMMSS)
    const formatDate = (date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const start = formatDate(startDate);
    const end = formatDate(endDate);

    const title = encodeURIComponent(event.title);
    const details = encodeURIComponent(event.description || 'Event details');
    const location = encodeURIComponent(event.venue_name || 'Online Event');

    const googleCalendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;

    window.open(googleCalendarUrl, '_blank');
  };

  const downloadQR = () => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${qrModal.qr}`;
    link.download = `qr-code-${qrModal.title.replace(/\s+/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Store in localStorage
    localStorage.setItem(`qr_code_${qrModal.eventId}`, qrModal.qr);
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="text-2xl font-bold text-primary-500">InfiniteBZ</div>
            <div className="hidden md:flex items-center gap-3 bg-gray-100 rounded-full px-4 py-2 flex-1">
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white text-gray-800 outline-none flex-1 rounded-full px-2 py-1"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold">30% off</span>
            <button className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-slate-900 px-4 py-2 rounded-lg font-bold transition-all shadow-lg shadow-primary-500/20">
              Try Pro
            </button>
            <button className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-slate-900 px-4 py-2 rounded-lg font-bold transition-all shadow-lg shadow-primary-500/20">
              Free
            </button>

            <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center">
              {user?.profile_image ? (
                <img
                  src={user.profile_image}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-primary-500 flex items-center justify-center text-slate-900 font-bold">
                  {user?.full_name?.[0] || 'U'}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Back Link */}
        <button
          onClick={onNavigate}
          className="flex items-center gap-2 text-slate-300 mb-8 hover:text-white"
        >
          <ChevronLeft size={20} />
          Back to home page
        </button>

        {/* Title */}
        <h1 className="text-5xl font-bold text-white mb-8">Your events</h1>

        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab('going')}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition ${activeTab === 'going'
              ? 'bg-primary-500 text-slate-900'
              : 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-50'
              }`}
          >
            ✓ Going
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition ${activeTab === 'saved'
              ? 'bg-primary-500 text-slate-900'
              : 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-50'
              }`}
          >
            📌 Saved
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition ${activeTab === 'past'
              ? 'bg-primary-500 text-slate-900'
              : 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-50'
              }`}
          >
            ↩ Past
          </button>
        </div>

        {/* Filter */}
        <div className="mb-6">
          <button className="flex items-center gap-2 text-slate-300 hover:text-white">
            📅 From today <span className="ml-2">∨</span>
          </button>
        </div>

        {/* Events */}
        <div>
          {loading ? (
            <div className="text-center py-10 text-slate-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
              Loading your registrations...
            </div>
          ) : error ? (
            <div className="text-center py-10 text-red-500">
              <p>{error}</p>
              <button
                onClick={fetchUserRegistrations}
                className="mt-4 px-4 py-2 bg-primary-500 text-slate-900 rounded-lg font-bold hover:bg-primary-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : getFilteredRegistrations().length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <Calendar size={48} className="mx-auto mb-4 text-slate-600" />
              <h3 className="text-xl font-bold text-white mb-2">
                {activeTab === 'going' ? 'No upcoming events' : activeTab === 'past' ? 'No past events' : 'No registrations yet'}
              </h3>
              <p className="text-slate-400 mb-4">
                {activeTab === 'going' ? 'You have no upcoming registered events.' : activeTab === 'past' ? 'You have no past registered events.' : "You haven't registered for any events yet."}
              </p>
              {activeTab !== 'going' && activeTab !== 'past' && (
                <button
                  onClick={onNavigate}
                  className="px-6 py-3 bg-primary-500 text-slate-900 rounded-lg font-bold hover:bg-primary-600 transition-colors"
                >
                  Browse Events
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getFilteredRegistrations().map((event, index) => (
                <div key={event.id || index} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition flex flex-col">
                  <div className="relative h-32 bg-gradient-to-r from-primary-500 to-indigo-600 flex items-center justify-center">
                    <div className="absolute top-2 left-2 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      Registered
                    </div>
                    {event.image_url && (
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="w-full h-full object-cover absolute inset-0"
                      />
                    )}
                  </div>

                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2 overflow-hidden text-ellipsis" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {event.title}
                    </h3>

                    <div className="space-y-1 text-xs text-gray-700 mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        <span>{formatDate(event.start_time)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>{formatTime(event.start_time)}</span>
                      </div>
                      {!event.online_event && event.venue_name && (
                        <div className="flex items-center gap-1">
                          <MapPin size={14} />
                          <span className="truncate">{event.venue_name}</span>
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        Registered on {new Date(event.registration_date).toLocaleDateString()}
                      </div>
                    </div>



                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-gray-700 font-medium">
                        <Users size={14} />
                        <span className="text-xs">{event.ticket_type || 'Confirmed'}</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${event.is_free
                        ? 'bg-green-100 text-green-700'
                        : 'bg-orange-100 text-orange-700'
                        }`}>
                        {event.is_free ? 'Free' : 'Paid'}
                      </span>
                    </div>

                    <div className="mt-3 mt-auto">


                      {/* InfiniteBZ Ticket Button (and other locally registered events) */}
                      {(!event.url || !event.url.toLowerCase().includes('eventbrite')) && (
                        <button
                          onClick={() => onNavigate('ticket-details', event)}
                          className="w-full mt-4 bg-primary-500 hover:bg-primary-600 text-slate-900 font-bold py-2 px-4 rounded-lg transition-all shadow-lg shadow-primary-500/20 flex items-center justify-center gap-2"
                        >
                          <QrCode size={18} />
                          Show Ticket
                        </button>
                      )}

                      {/* Eventbrite Source Button */}
                      {event.url && event.url.toLowerCase().includes('eventbrite') && (
                        <a
                          href="https://www.eventbrite.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full mt-4 bg-[#F05537] hover:bg-[#d04428] text-white font-bold py-2 px-4 rounded-lg text-center transition-colors flex items-center justify-center gap-2"
                        >
                          Go to official source
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* QR Code Modal */}
      {qrModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-500 to-indigo-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">🎫</span>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">Event QR Code</h3>
                    <p className="text-white/80 text-sm">{qrModal.title}</p>
                  </div>
                </div>
                <button
                  onClick={() => setQrModal({ show: false, qr: '', title: '', eventId: '' })}
                  className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="text-center mb-6">
                <p className="text-slate-300 text-sm mb-2">Scan this QR code for event verification</p>
                <div className="inline-block bg-white p-4 rounded-xl shadow-lg">
                  <img
                    src={`data:image/png;base64,${qrModal.qr}`}
                    alt="QR Code"
                    className="w-48 h-48"
                  />
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4 mb-6">
                <h4 className="text-white font-semibold mb-2 text-sm">How to use:</h4>
                <ul className="text-slate-300 text-xs space-y-1">
                  <li>• Open your phone's camera or QR scanner</li>
                  <li>• Point it at the QR code above</li>
                  <li>• Your ticket details will be displayed</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setQrModal({ show: false, qr: '', title: '', eventId: '' })}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={downloadQR}
                  className="flex-1 bg-primary-500 hover:bg-primary-600 text-white py-3 px-4 rounded-lg font-medium transition-colors shadow-lg shadow-primary-500/20"
                >
                  Download QR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
