import { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import EventFeed from './components/EventFeed';
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard';
import CreateEventPage from './components/CreateEventPage';
import SettingsPage from './components/SettingsPage';
import MyRegistrationsPage from './components/MyRegistrationsPage';
import OrganizerCheckInPage from './components/OrganizerCheckInPage';
import ErrorBoundary from './components/ErrorBoundary';
import OrganizerCheckIn from './components/OrganizerCheckIn';

export default function App() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null); // User state
  const [checkInEventId, setCheckInEventId] = useState(null);
  const [initialDashboardView, setInitialDashboardView] = useState(null);
  const [initialDashboardEventId, setInitialDashboardEventId] = useState(null);

  // View State: 'landing' or 'feed' or 'auth' or 'dashboard'
  const [currentView, setCurrentView] = useState('landing');
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'

  useEffect(() => {
    // Parse query params for deep linking
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    const eventId = params.get('eventId');

    if (view === 'ticket-details' && eventId) {
      setInitialDashboardView('ticket-details');
      setInitialDashboardEventId(eventId);
    }

    fetchEvents();
    checkUserSession();
  }, []);

  useEffect(() => {
    console.log("App: checkInEventId updated to:", checkInEventId);
  }, [checkInEventId]);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/v1/events');
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      // Handle new API structure { data: [], total: ... }
      if (data && Array.isArray(data.data)) {
        setEvents(data.data);
      } else if (Array.isArray(data)) {
        setEvents(data);
      } else {
        setEvents([]);
      }
    } catch (err) {
      console.error("Failed to fetch events", err);
      setError("Could not load events. Ensure backend is running.");
      setLoading(false);
    }
  };

  const calculateProfileCompleteness = (userData) => {
    if (!userData) return 0;
    const fields = [
      userData.first_name,
      userData.last_name,
      userData.email,
      userData.phone,
      userData.job_title,
      userData.company,
      userData.profile_image
    ];
    // Check for non-empty strings. dependent on how backend returns nulls (usually null)
    const filledFields = fields.filter(field => field && typeof field === 'string' && field.trim() !== '').length;
    const totalFields = fields.length;
    return Math.round((filledFields / totalFields) * 100);
  };

  const checkUserSession = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return null;
    }

    try {
      const res = await fetch('/api/v1/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        // Only redirect to dashboard if we are on landing page or auth
        // Assuming we want auto-redirect on session check too if just visited
        // For now, let's keep landing unless explicitly logged in, OR 
        // if the user refreshes on Dashboard? 
        // Let's rely on explicit navigation for now, but handle login redirection below.

        // Handle Deep Linking Redirect
        const params = new URLSearchParams(window.location.search);
        const ticketView = params.get('view') === 'ticket-details';
        const expectedEmail = params.get('email');

        if (ticketView) {
          // Security Check: If email is specified in URL, it MUST match the logged-in user (case-insensitive)
          if (expectedEmail && userData.email.toLowerCase() !== expectedEmail.toLowerCase()) {
            alert(`You are logged in as ${userData.email}, but this ticket belongs to ${expectedEmail}. Please log in with the correct account.`);

            // Clear the sensitive initial state so it doesn't persist
            setInitialDashboardView(null);
            setInitialDashboardEventId(null);

            // Clean URL
            if (window.history.pushState) {
              const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
              window.history.pushState({ path: newUrl }, '', newUrl);
            }

            localStorage.removeItem('token');
            setUser(null);
            setAuthMode('login');
            setCurrentView('auth');
          } else {
            setCurrentView('dashboard');
          }
        }
        return userData;
      } else {
        localStorage.removeItem('token');
        setUser(null);
        return null;
      }
    } catch (err) {
      console.error("Session check failed", err);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
    return null;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setCurrentView('landing');
  };

  console.log("App Render: currentView =", currentView);

  return (
    <>
      {currentView === 'landing' && (
        <LandingPage
          events={events}
          user={user}
          onNavigate={() => {
            window.scrollTo(0, 0);
            setCurrentView('feed');
          }}
          onLogin={() => {
            if (user) {
              // If already logged in, go to Dashboard
              window.scrollTo(0, 0);
              setCurrentView('dashboard');
            } else {
              setAuthMode('login');
              window.scrollTo(0, 0);
              setCurrentView('auth');
            }
          }}
          onSignup={() => {
            setAuthMode('signup');
            window.scrollTo(0, 0);
            setCurrentView('auth');
          }}
        />
      )}

      {currentView === 'feed' && (
        <EventFeed
          events={events}
          loading={loading}
          error={error}
          onBack={() => {
            window.scrollTo(0, 0);
            setCurrentView('landing');
          }}
        />
      )}

      {currentView === 'auth' && (
        <AuthPage
          initialMode={authMode}
          onBack={() => {
            window.scrollTo(0, 0);
            setCurrentView('landing');
          }}
          onComplete={async () => {
            window.scrollTo(0, 0);
            const userData = await checkUserSession(); // Refresh user state

            if (userData) {
              const completeness = calculateProfileCompleteness(userData);
              console.log("Profile completeness:", completeness);
              if (completeness >= 86) {
                setCurrentView('dashboard');
              } else {
                setCurrentView('settings');
              }
            } else {
              setCurrentView('landing');
            }
          }}
        />
      )}

      {currentView === 'dashboard' && (
        <ErrorBoundary>
          <Dashboard
            user={user}
            onLogout={handleLogout}
            onNavigate={(view, eventId) => {
              console.log("App onNavigate:", view, eventId);
              window.scrollTo(0, 0);

              if (view === 'check-in') {
                if (eventId) {
                  setCheckInEventId(eventId);
                }
                setCurrentView(view);
              } else {
                setCurrentView(view);
              }
            }}
            initialView={initialDashboardView}
            initialEventId={initialDashboardEventId}
          />
        </ErrorBoundary>
      )}

      {/* ... previous code ... */}

      {currentView === 'check-in' && (
        <OrganizerCheckInPage
          eventId={checkInEventId}
          onNavigate={(view) => {
            window.scrollTo(0, 0);
            setCurrentView(view || 'dashboard');
          }}
        />
      )}
      {currentView === 'my-registrations' && (
        <MyRegistrationsPage />
      )}

      {currentView === 'settings' && (
        <SettingsPage
          user={user}
          hideSidebar={user && calculateProfileCompleteness(user) < 86}
          onProfileUpdate={checkUserSession}
          onNavigate={(view) => {
            window.scrollTo(0, 0);
            setCurrentView(view || 'dashboard');
          }}
        />
      )}

      {currentView === 'create-event' && (
        <CreateEventPage
          onNavigate={(view) => {
            window.scrollTo(0, 0);
            setCurrentView(view || 'dashboard');
          }}
          onSave={async (eventData) => {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/v1/events', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(eventData)
            });
            if (!res.ok) {
              const err = await res.json();
              throw new Error(err.message || "Failed to create event");
            }
            return await res.json();
          }}
        />
      )}
    </>
  );
}
