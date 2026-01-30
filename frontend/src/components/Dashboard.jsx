import { useState, useEffect } from 'react';
import {
    LayoutDashboard, Users, Calendar, Settings, LogOut,
    TrendingUp, AlertCircle, CheckCircle2, MoreHorizontal,
    Search, Bell, Plus, Download, MessageSquare, ClipboardList, X, Eye, UserPlus, UserMinus, Trash2, MessageCircle, RefreshCw
} from 'lucide-react';
import CityDropdown from './CityDropdown';
import CreateEventModal from './CreateEventModal';
import EventDetailModal from './EventDetailModal';
import MyEvents from './MyEvents';
import MyRegistrationsPage from './MyRegistrationsPage';
import NotificationsPage from './NotificationsPage';
import Sidebar from './Sidebar';
import EventTicketPage from './EventTicketPage';

export default function Dashboard({ user, onLogout, onNavigate, initialView, initialEventId }) {
    const [stats, setStats] = useState({
        total_users: 0,
        active_events: 0,
        ingestion_errors: 0,
        pending_approvals: 0,
        recent_events: []
    });
    const [eventsData, setEventsData] = useState({
        data: [],
        total: 0,
        page: 1,
        limit: 21
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState(""); // Track input
    const [activeSearch, setActiveSearch] = useState(""); // Track triggered search
    const [selectedCity, setSelectedCity] = useState("All Cities");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [selectedSource, setSelectedSource] = useState("All");
    const [selectedCost, setSelectedCost] = useState("All");
    const [selectedMode, setSelectedMode] = useState("All");
    const [selectedDate, setSelectedDate] = useState(""); // YYYY-MM-DD
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);

    // Initialize activeView based on prop or default to 'feed'
    // Map 'ticket-details' from URL to 'ticket' view in Dashboard
    const [activeView, setActiveView] = useState(initialView === 'ticket-details' ? 'ticket' : (initialView || 'feed'));

    // Initialize selectedInternalEvent if deep linking to a ticket
    // Note: We only have the ID here, so we might need to fetch the full event details in EventTicketPage or temporarily create a shell object
    const [selectedInternalEvent, setSelectedInternalEvent] = useState(initialEventId ? { id: initialEventId } : null);

    const [userActivities, setUserActivities] = useState([]);
    const [activitiesLoading, setActivitiesLoading] = useState(false);
    const [chatbotFilters, setChatbotFilters] = useState({}); // For chatbot-driven filters
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            const token = localStorage.getItem('token');
            // Trigger background scrape
            const res = await fetch('http://localhost:8000/api/v1/refresh-events', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                // Show a quick visual cue or toast
                // e.g. toast.success("Syncing started...") or just rely on the spinner
            } else {
                console.error("Refresh failed", res.status);
            }

            // Wait a bit and then reload the list to see if anything appeared immediately
            // or just to reset the spinner after a delay since it's a background task
            setTimeout(() => {
                fetchEvents(currentPage, activeSearch, selectedCity, selectedCategory, selectedSource, selectedCost, selectedMode, selectedDate);
                setIsRefreshing(false);
            }, 5000); // 5 seconds delay to allow some scraping to happen

        } catch (err) {
            console.error("Refresh error", err);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchDashboardStats();
        fetchUserRegistrations(); // Fetch existing registrations to show registered status
        fetchUserActivities(); // Fetch user activities for notifications
    }, []);

    // Apply chatbot filters to UI states
    useEffect(() => {
        if (Object.keys(chatbotFilters).length > 0) {
            if (chatbotFilters.category) setSelectedCategory(chatbotFilters.category);
            if (chatbotFilters.cost) setSelectedCost(chatbotFilters.cost);
            if (chatbotFilters.mode) setSelectedMode(chatbotFilters.mode);
            if (chatbotFilters.source) setSelectedSource(chatbotFilters.source);
            // Reset chatbot filters after applying
            setChatbotFilters({});
        }
    }, [chatbotFilters]);

    useEffect(() => {
        fetchEvents(currentPage, activeSearch, selectedCity, selectedCategory, selectedSource, selectedCost, selectedMode, selectedDate);
    }, [currentPage, activeSearch, selectedCity, selectedCategory, selectedSource, selectedCost, selectedMode, selectedDate]);

    const fetchDashboardStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:8000/api/v1/admin/stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (err) {
            console.error("Failed to fetch admin stats", err);
        }
    };

    const fetchUserRegistrations = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:8000/api/v1/user/registrations', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const registrations = data.registrations || [];
                setUserRegistrations(registrations);
                setUserRegistrationCount(registrations.length);
                // Also update newlyRegisteredIds to include existing registrations
                const registeredIds = registrations.map(reg => reg.id);
                setNewlyRegisteredIds(prev => [...new Set([...prev, ...registeredIds])]);
            }
        } catch (err) {
            console.error("Failed to fetch user registrations", err);
        }
    };

    const fetchUserActivities = async () => {
        setActivitiesLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:8000/api/v1/user/activities', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUserActivities(data.activities || []);
            }
        } catch (err) {
            console.error("Failed to fetch user activities", err);
        } finally {
            setActivitiesLoading(false);
        }
    };

    const fetchEvents = async (page, search = "", city = "Chennai", category = "All", source = "All", cost = "All", mode = "All", date = "") => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            // Construct Query Params
            const params = new URLSearchParams({
                page: page,
                limit: 21,
                city: city === "All Cities" ? "all" : city,
                category: category === "All" ? "all" : category,
                source: source === "All" ? "all" : source,
                is_free: cost === "All" ? "" : cost.toLowerCase(),
                mode: mode === "All" ? "" : (mode === "In Person" ? "offline" : mode.toLowerCase()),
                date: date
            });
            if (search && search.trim() !== "") {
                params.append('search', search.trim());
            }

            const res = await fetch(`http://localhost:8000/api/v1/events?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();

                // ROBUST HANDLING: Check if array or object
                if (data && Array.isArray(data.data)) {
                    // BACKEND UPGRADE: API now returns { data, total, page, limit }
                    setEventsData({
                        data: data.data,
                        total: data.total,
                        page: data.page,
                        limit: data.limit
                    });
                } else if (Array.isArray(data)) {
                    // Fallback for old structure or during transition
                    setEventsData({
                        data: data,
                        total: 100, // Mock total
                        page: page,
                        limit: 21
                    });
                } else {
                    // Fallback for empty or unexpected structure
                    setEventsData({
                        data: [],
                        total: 0,
                        page: page,
                        limit: 10
                    });
                }
            } else {
                console.error("API Error:", res.status);
            }
        } catch (err) {
            console.error("Failed to fetch events", err);
        } finally {
            setLoading(false);
        }
    };

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showCreateEventModal, setShowCreateEventModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);


    const [pendingEventId, setPendingEventId] = useState(null);
    const [pendingEventTitle, setPendingEventTitle] = useState("");
    const [newlyRegisteredIds, setNewlyRegisteredIds] = useState([]);
    const [userRegistrations, setUserRegistrations] = useState([]);
    const [userRegistrationCount, setUserRegistrationCount] = useState(0);

    const handleRegisterClick = (event) => {
        // CHECK SOURCE: If InfiniteBZ, open Detail Modal
        if (event.raw_data?.source === 'InfiniteBZ') {
            setSelectedInternalEvent(event);
            setShowDetailModal(true);
            return;
        }

        // 1. Open URL in New Tab
        window.open(event.url, '_blank');

        // 2. Show Confirmation Modal
        setPendingEventId(event.id);
        setPendingEventTitle(event.title);
        setShowConfirmModal(true);
    };

    const handleInternalRegistration = async (event, payload = null) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:8000/api/v1/events/${event.id}/register`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload || {})
            });

            let data;
            try {
                data = await res.json();
            } catch (parseErr) {
                console.error('Failed to parse response:', parseErr);
                alert(`Registration failed: Server error (${res.status})`);
                return;
            }

            if (res.ok && data.status === 'SUCCESS') {
                // Registration successful - update UI state
                setNewlyRegisteredIds(prev => [...prev, event.id]);
                alert('Registration successful!');
            } else if (data.status === 'ALREADY_REGISTERED') {
                // Already registered - still update UI
                setNewlyRegisteredIds(prev => [...prev, event.id]);
                alert('You are already registered for this event.');
            } else {
                // Registration failed - show detailed error
                const errorMessage = typeof data.detail === 'object' ? JSON.stringify(data.detail) : (data.detail || data.message || `Server error (${res.status})`);
                alert(`Registration failed: ${errorMessage}`);
                console.error('Registration failed:', data);
            }
        } catch (err) {
            console.error('Registration error:', err);
            alert('Registration failed. Please check your connection and try again.');
        }
    };

    const handleCreateEvent = async (eventData) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:8000/api/v1/events', { // Standard create endpoint
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(eventData)
            });
            const data = await res.json();

            if (res.ok) {
                alert("Event Created Successfully!");
                setShowCreateEventModal(false);
                // Refresh list
                fetchEvents(1, activeSearch, selectedCity, selectedCategory, selectedSource, selectedCost, selectedMode, selectedDate);
            } else {
                alert(`Creation Failed: ${data.message || "Unknown error"}`);
            }
        } catch (err) {
            console.error("Create event error", err);
            alert("Failed to create event");
        }
    };

    const confirmRegistration = async () => {
        if (!pendingEventId) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:8000/api/v1/events/${pendingEventId}/register`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (res.ok && data.status === 'SUCCESS') {
                // Registration successful - update UI state
                setNewlyRegisteredIds(prev => [...prev, pendingEventId]);
                alert('Registration confirmed successfully!');
                // Close modal
                setShowConfirmModal(false);
                setPendingEventId(null);
                setPendingEventTitle("");
            } else if (data.status === 'ALREADY_REGISTERED') {
                // Already registered - still update UI
                setNewlyRegisteredIds(prev => [...prev, pendingEventId]);
                alert('You are already registered for this event.');
                // Close modal
                setShowConfirmModal(false);
                setPendingEventId(null);
                setPendingEventTitle("");
            } else {
                // Registration failed - don't update UI
                alert(`Registration failed: ${data.message || 'Unknown error'}`);
            }
        } catch (err) {
            console.error("Confirmation error", err);
            alert('Registration confirmation failed. Please try again.');
        }
    };

    const handleSearch = (e) => {
        if (e.key === 'Enter') {
            setCurrentPage(1);
            setActiveSearch(searchQuery);
        }
    };

    const totalPages = Math.ceil(eventsData.total / eventsData.limit);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const getIcon = (type) => {
        const icons = {
            success: '✅',
            info: '🔔',
            warning: '⚠️',
            purple: '💜'
        };
        return icons[type] || '📌';
    };

    return (
        <div className="min-h-screen flex font-sans">
            {/* SIDEBAR (Dark Slate) */}
            {/* SIDEBAR */}
            <Sidebar
                activePage={activeView === 'feed' ? 'dashboard' : activeView}
                onNavigate={(view) => {
                    if (view === 'dashboard') setActiveView('feed');
                    else if (view === 'my-events') setActiveView('my-events');
                    else if (view === 'my-registrations') setActiveView('my-registrations');
                    else if (view === 'notifications') setActiveView('notifications');
                    else if (view === 'settings') onNavigate('settings');
                    else onNavigate(view); // Catch-all for check-in or others
                }}
                onLogout={onLogout}
                onCreateClick={() => setShowCreateEventModal(true)}
            />

            {/* MAIN CONTENT */}
            <main className="flex-1 lg:ml-64 p-8">
                {activeView === 'my-events' ? (
                    <MyEvents onCreateNew={() => onNavigate('create-event')} />
                ) : activeView === 'my-registrations' ? (
                    <MyRegistrationsPage
                        onNavigate={(view, data) => {
                            if (view === 'ticket-details') {
                                setSelectedInternalEvent(data);
                                setActiveView('ticket');
                            } else {
                                setActiveView('feed');
                            }
                        }}
                        user={user}
                    />
                ) : activeView === 'notifications' ? (
                    <NotificationsPage notifications={userActivities} />
                ) : activeView === 'ticket' ? (
                    <EventTicketPage
                        eventId={selectedInternalEvent?.id}
                        user={user}
                        onNavigate={(view) => setActiveView(view)}
                    />
                ) : (
                    <>
                        {/* Header */}
                        <header className="flex justify-between items-center mb-10">
                            <h1 className="text-2xl font-bold text-white">Events Dashboard</h1>
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search events, venues..."
                                        className="bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-primary-500 w-64 placeholder:text-slate-500"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={handleSearch}
                                    />
                                </div>
                                <button
                                    onClick={() => setShowNotifications(!showNotifications)}
                                    className="relative text-slate-500 hover:text-sky-600"
                                >
                                    <Bell size={20} />
                                    {userActivities.length > 0 && (
                                        <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
                                    )}
                                </button>
                                <div className="relative">
                                    <button
                                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                                        className="w-8 h-8 rounded-full flex items-center justify-center hover:ring-2 hover:ring-white/20 transition-all overflow-hidden"
                                    >
                                        {user?.profile_image ? (
                                            <img
                                                src={user.profile_image}
                                                alt="Profile"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-primary-500 rounded-full flex items-center justify-center text-slate-900 font-bold">
                                                {user?.full_name?.[0] || 'A'}
                                            </div>
                                        )}
                                    </button>

                                    {showProfileMenu && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setShowProfileMenu(false)} />
                                            <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 rounded-xl shadow-xl border border-slate-700 py-2 z-20 animate-in fade-in zoom-in-95 duration-200">
                                                <div className="px-4 py-3 border-b border-slate-700 mb-1">
                                                    <p className="text-sm font-bold text-white">{user?.full_name || 'Admin User'}</p>
                                                    <p className="text-xs text-slate-500 truncate">{user?.email || 'user@example.com'}</p>
                                                </div>

                                                <button
                                                    onClick={() => onNavigate('settings')}
                                                    className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2 transition-colors"
                                                >
                                                    <Settings size={16} /> Settings
                                                </button>

                                                <div className="h-px bg-slate-100 my-1" />

                                                <button
                                                    onClick={onLogout}
                                                    className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                                >
                                                    <LogOut size={16} /> Sign Out
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </header>

                        {/* KPI CARDS */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                            <StatCard
                                title="Total Events"
                                value={loading ? '...' : stats.active_events}
                                subtext="+12% vs last week"
                                subtextColor="text-green-500"
                                icon={<Calendar className="text-sky-500" size={24} />}
                            />
                            <StatCard
                                title="Free Events"
                                value={loading ? '...' : stats.free_events || 0}
                                subtext="62% of total volume"
                                subtextColor="text-slate-500"
                                icon={<Users className="text-indigo-500" size={24} />}
                            />
                            <StatCard
                                title="Auto-Registered"
                                value={loading ? '...' : userRegistrationCount}
                                subtext="Events you've registered for"
                                subtextColor="text-slate-500"
                                icon={<CheckCircle2 className="text-green-500" size={24} />}
                            />
                        </div>

                        {/* FILTERS & LIST */}
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold text-white">Upcoming Events</h2>
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    Last updated: 5m ago
                                    <button
                                        onClick={handleRefresh}
                                        disabled={isRefreshing}
                                        className={`p-1 hover:text-sky-500 transition-all ${isRefreshing ? 'animate-spin text-sky-500' : ''}`}
                                        title="Refresh Events"
                                    >
                                        <RefreshCw size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Filter Bar */}
                            <div className="flex flex-wrap gap-3 mb-8">
                                <CityDropdown selected={selectedCity} onChange={setSelectedCity} />
                                <FilterDropdown
                                    label="Industry"
                                    options={["All", "Startup", "Business", "Tech"]}
                                    selected={selectedCategory}
                                    onChange={setSelectedCategory}
                                />
                                <FilterDropdown
                                    label="Source"
                                    options={["All", "Eventbrite", "Meetup", "InfiniteBZ"]}
                                    selected={selectedSource}
                                    onChange={setSelectedSource}
                                />
                                <FilterDropdown
                                    label="Cost"
                                    options={["All", "Free", "Paid"]}
                                    selected={selectedCost}
                                    onChange={setSelectedCost}
                                />
                                <FilterDropdown
                                    label="Mode"
                                    options={["All", "Online", "In Person"]}
                                    selected={selectedMode}
                                    onChange={setSelectedMode}
                                />
                                <div className="ml-auto relative">
                                    <input
                                        type="date"
                                        className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 focus:outline-none focus:border-sky-500 hover:bg-slate-50 cursor-pointer"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                    />
                                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                </div>
                            </div>

                            {/* EVENTS GRID */}
                            <div>
                                {loading && <div className="text-center py-10 text-slate-500">Loading events...</div>}

                                {!loading && eventsData.data && eventsData.data.length > 0 && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {eventsData.data.map((event) => (
                                            <EventCard
                                                key={event.id}
                                                event={event}
                                                user={user}
                                                onNavigate={onNavigate}
                                                isRegistered={newlyRegisteredIds.includes(event.id)}
                                                onRegister={() => handleRegisterClick(event)}
                                            />
                                        ))}
                                    </div>
                                )}

                                {!loading && (!eventsData.data || eventsData.data.length === 0) && (
                                    <div className="text-center py-10 text-slate-500">No events found matching criteria.</div>
                                )}
                            </div>

                            {/* PAGINATION */}
                            <div className="flex justify-center mt-10 gap-2">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent text-slate-500 transition-colors"
                                >
                                    ‹
                                </button>

                                {Array.from({ length: totalPages || 1 }, (_, i) => i + 1).map(page => (
                                    <button
                                        key={page}
                                        onClick={() => handlePageChange(page)}
                                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${currentPage === page
                                            ? 'bg-primary-500 text-slate-900 shadow-lg shadow-primary-500/30'
                                            : 'text-slate-500 hover:bg-slate-200'
                                            }`}
                                    >
                                        {page}
                                    </button>
                                ))}

                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent text-slate-500 transition-colors"
                                >
                                    ›
                                </button>
                            </div>

                        </div>

                        {/* CONFIRMATION MODAL */}
                        {showConfirmModal && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                                <div className="bg-slate-800 border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                                    <div className="w-16 h-16 bg-primary-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <CheckCircle2 className="text-primary-500" size={32} />
                                    </div>

                                    <h3 className="text-xl font-bold text-white text-center mb-2">
                                        Did you register?
                                    </h3>
                                    <p className="text-slate-400 text-center text-sm mb-8">
                                        We opened <strong>{pendingEventTitle}</strong> in a new tab.
                                        <br />If you completed the registration there, click "Yes" to track it here.
                                    </p>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => {
                                                setShowConfirmModal(false);
                                                setPendingEventId(null);
                                                setPendingEventTitle("");
                                            }}
                                            className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-all"
                                        >
                                            No, not yet
                                        </button>
                                        <button
                                            onClick={confirmRegistration}
                                            className="flex-1 py-3 bg-primary-500 hover:bg-primary-600 text-slate-900 rounded-xl font-bold shadow-lg shadow-primary-500/20 transition-all"
                                        >
                                            Yes, I registered
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                    </>
                )}

                <CreateEventModal
                    isOpen={showCreateEventModal}
                    onClose={() => setShowCreateEventModal(false)}
                    onSave={handleCreateEvent}
                />

                <EventDetailModal
                    isOpen={showDetailModal}
                    onClose={() => setShowDetailModal(false)}
                    event={selectedInternalEvent}
                    onRegister={handleInternalRegistration}
                    isRegistered={selectedInternalEvent && newlyRegisteredIds.includes(selectedInternalEvent.id)}
                />

                {/* NOTIFICATIONS MODAL */}
                {showNotifications && (
                    <>
                        <div className="fixed inset-0 z-50" onClick={() => setShowNotifications(false)} />
                        <div className="absolute right-4 top-20 w-96 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200 max-h-96 overflow-hidden">
                            <div className="p-4 border-b border-slate-700">
                                <h3 className="text-lg font-bold text-white">Your Activities</h3>
                                <p className="text-sm text-slate-400">Recent and past event activities</p>
                            </div>

                            <div className="max-h-80 overflow-y-auto">
                                {activitiesLoading ? (
                                    <div className="p-4 text-center text-slate-500">Loading activities...</div>
                                ) : userActivities.length === 0 ? (
                                    <div className="p-4 text-center text-slate-500">No activities found</div>
                                ) : (
                                    userActivities.slice(0, 2).map((activity, index) => {
                                        const getActivityIcon = (type) => {
                                            switch (type) {
                                                case 'event_created':
                                                    return <Plus size={16} />;
                                                case 'event_registered':
                                                    return <CheckCircle2 size={16} />;
                                                case 'new_follower':
                                                    return <UserPlus size={16} />;
                                                case 'event_deleted':
                                                    return <Trash2 size={16} />;
                                                default:
                                                    return <Bell size={16} />;
                                            }
                                        };

                                        const getActivityColors = (type) => {
                                            switch (type) {
                                                case 'event_created':
                                                    return 'bg-primary-500/20 text-primary-400';
                                                case 'event_registered':
                                                    return 'bg-green-500/20 text-green-400';
                                                case 'new_follower':
                                                    return 'bg-blue-500/20 text-blue-400';
                                                case 'event_deleted':
                                                    return 'bg-red-500/20 text-red-400';
                                                default:
                                                    return 'bg-slate-500/20 text-slate-400';
                                            }
                                        };

                                        const getActivityLabel = (type) => {
                                            switch (type) {
                                                case 'event_created':
                                                    return 'Event Created';
                                                case 'event_registered':
                                                    return 'Event Registered';
                                                case 'new_follower':
                                                    return 'New Follower';
                                                case 'event_deleted':
                                                    return 'Event Deleted';
                                                default:
                                                    return 'Activity';
                                            }
                                        };

                                        return (
                                            <div key={index} className="p-4 border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                                                <div className="flex items-start gap-3">
                                                    {activity.type === 'new_follower' && activity.follower_image ? (
                                                        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                                                            <img
                                                                src={activity.follower_image}
                                                                alt={activity.follower_name || activity.follower_email}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    // Hide the broken image and show fallback emoji
                                                                    e.target.style.display = 'none';
                                                                    const fallbackDiv = e.target.nextSibling;
                                                                    if (fallbackDiv) {
                                                                        fallbackDiv.style.display = 'flex';
                                                                    }
                                                                }}
                                                                style={{ display: 'block' }}
                                                            />
                                                            <div className={`w-full h-full rounded-full flex items-center justify-center text-xl font-bold shadow-md ${getActivityColors(activity.type)}`} style={{ display: 'none' }}>
                                                                {getIcon(activity.type)}
                                                            </div>
                                                        </div>
                                                    ) : activity.type === 'event_created' && activity.event_image ? (
                                                        <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                                                            <img
                                                                src={activity.event_image}
                                                                alt={activity.title}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    // Hide the broken image and show fallback emoji
                                                                    e.target.style.display = 'none';
                                                                    const fallbackDiv = e.target.nextSibling;
                                                                    if (fallbackDiv) {
                                                                        fallbackDiv.style.display = 'flex';
                                                                    }
                                                                }}
                                                                style={{ display: 'block' }}
                                                            />
                                                            <div className={`w-full h-full rounded-full flex items-center justify-center text-xl font-bold shadow-md ${getActivityColors(activity.type)}`} style={{ display: 'none' }}>
                                                                {getIcon(activity.type)}
                                                            </div>
                                                        </div>
                                                    ) : activity.type === 'event_registered' && activity.image_url ? (
                                                        <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                                                            <img
                                                                src={activity.image_url}
                                                                alt={activity.title}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    // Hide the broken image and show fallback emoji
                                                                    e.target.style.display = 'none';
                                                                    const fallbackDiv = e.target.nextSibling;
                                                                    if (fallbackDiv) {
                                                                        fallbackDiv.style.display = 'flex';
                                                                    }
                                                                }}
                                                                style={{ display: 'block' }}
                                                            />
                                                            <div className={`w-full h-full rounded-full flex items-center justify-center text-xl font-bold shadow-md ${getActivityColors(activity.type)}`} style={{ display: 'none' }}>
                                                                {getIcon(activity.type)}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getActivityColors(activity.type)}`}>
                                                            {getActivityIcon(activity.type)}
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-white truncate">
                                                            {activity.title}
                                                        </p>
                                                        <p className="text-xs text-slate-400 mt-1">
                                                            {getActivityLabel(activity.type)} • {activity.venue || activity.follower_name || 'N/A'}
                                                        </p>
                                                        <div className="text-xs text-slate-500 mt-1">
                                                            <p>{new Date(activity.date).toLocaleDateString()}</p>
                                                            {activity.confirmation_id && (
                                                                <p className="text-primary-400 font-mono font-medium mt-1">
                                                                    ID: {activity.confirmation_id}
                                                                </p>
                                                            )}
                                                            {activity.follower_email && <p>{activity.follower_email}</p>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            <div className="p-3 border-t border-slate-700 space-y-2">
                                <button
                                    onClick={() => {
                                        setShowNotifications(false);
                                        setActiveView('notifications');
                                    }}
                                    className="w-full text-center text-sm text-primary-400 hover:text-primary-300 transition-colors"
                                >
                                    Show More
                                </button>
                                <button
                                    onClick={() => setShowNotifications(false)}
                                    className="w-full text-center text-sm text-slate-400 hover:text-white transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </>
                )}



                {/* Refresh registrations when navigating to My Registrations */}
                {activeView === 'my-registrations' && (
                    <div style={{ display: 'none' }}>
                        {/* Hidden trigger to refresh registrations when viewing My Registrations */}
                        {(() => {
                            // This will trigger when activeView changes to 'my-registrations'
                            if (activeView === 'my-registrations') {
                                // We could fetch registrations here if needed, but MyRegistrationsPage handles it
                            }
                            return null;
                        })()}
                    </div>
                )}

                {/* CHATBOT - Bottom Right Corner */}
                {activeView === 'feed' && (
                    <ChatBot onApplyFilters={setChatbotFilters} />
                )}
            </main>
        </div >
    );
}

// ChatBot Component
function ChatBot({ onApplyFilters }) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { id: 1, text: "Hi! I'm your event assistant. How can I help you today?", sender: 'bot', time: new Date() }
    ]);
    const [inputValue, setInputValue] = useState('');

    // Function to detect filter keywords and apply filters
    const detectAndApplyFilters = (message) => {
        const lowerMessage = message.toLowerCase();
        const filters = {};

        // Category filters
        if (lowerMessage.includes('ai') || lowerMessage.includes('artificial intelligence') || lowerMessage.includes('machine learning')) {
            filters.category = 'Tech';
        } else if (lowerMessage.includes('startup') || lowerMessage.includes('business')) {
            filters.category = 'Startup';
        } else if (lowerMessage.includes('tech') || lowerMessage.includes('technology')) {
            filters.category = 'Tech';
        } else if (lowerMessage.includes('music') || lowerMessage.includes('concert')) {
            filters.category = 'Music';
        } else if (lowerMessage.includes('sports') || lowerMessage.includes('fitness')) {
            filters.category = 'Sports';
        }

        // Cost filters
        if (lowerMessage.includes('free')) {
            filters.cost = 'Free';
        } else if (lowerMessage.includes('paid') || lowerMessage.includes('premium')) {
            filters.cost = 'Paid';
        }

        // Mode filters
        if (lowerMessage.includes('online') || lowerMessage.includes('virtual')) {
            filters.mode = 'Online';
        } else if (lowerMessage.includes('offline') || lowerMessage.includes('in person') || lowerMessage.includes('in-person')) {
            filters.mode = 'In Person';
        }

        // Source filters
        if (lowerMessage.includes('eventbrite')) {
            filters.source = 'Eventbrite';
        } else if (lowerMessage.includes('infinitebz') || lowerMessage.includes('infinite bz')) {
            filters.source = 'InfiniteBZ';
        }

        // Apply filters if any were detected
        if (Object.keys(filters).length > 0) {
            onApplyFilters(filters);
            return true; // Filters were applied
        }

        return false; // No filters detected
    };

    const handleSendMessage = () => {
        if (inputValue.trim()) {
            const userMessage = {
                id: messages.length + 1,
                text: inputValue,
                sender: 'user',
                time: new Date()
            };
            setMessages(prev => [...prev, userMessage]);

            const currentInput = inputValue;
            setInputValue('');

            // Check for filter keywords and apply filters
            const filtersApplied = detectAndApplyFilters(currentInput);

            // Generate bot response
            setTimeout(() => {
                let botResponse = '';

                if (filtersApplied) {
                    botResponse = "I've applied the filters you requested! The events list has been updated to show the events you're looking for.";
                } else if (currentInput.toLowerCase().includes('help') || currentInput.toLowerCase().includes('what can you do')) {
                    botResponse = "I can help you find events by category (AI, Tech, Startup, Music, Sports), cost (Free/Paid), mode (Online/In Person), or source (Eventbrite/InfiniteBZ). Just ask for 'AI events' or 'free tech events'!";
                } else if (currentInput.toLowerCase().includes('hello') || currentInput.toLowerCase().includes('hi')) {
                    botResponse = "Hello! I'm here to help you discover great events. Try asking for 'AI events' or 'free online events'!";
                } else {
                    botResponse = "I can help you filter events! Try asking for specific types like 'AI events', 'free events', 'online events', or 'tech events'.";
                }

                const botMessage = {
                    id: messages.length + 2,
                    text: botResponse,
                    sender: 'bot',
                    time: new Date()
                };
                setMessages(prev => [...prev, botMessage]);
            }, 1000);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    };

    return (
        <>
            {/* ChatBot Toggle Button */}
            <div className="fixed bottom-6 right-6 z-50">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-14 h-14 rounded-full shadow-lg transition-all duration-300 ${isOpen
                        ? 'bg-slate-700 hover:bg-slate-600'
                        : 'bg-primary-500 hover:bg-primary-400'
                        } flex items-center justify-center text-white`}
                >
                    {isOpen ? (
                        <X size={24} />
                    ) : (
                        <MessageCircle size={24} />
                    )}
                </button>
            </div>

            {/* ChatBot Window */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 w-80 h-96 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-40 flex flex-col animate-in fade-in zoom-in-95 duration-200">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-primary-500 to-indigo-600 px-4 py-3 rounded-t-2xl">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm">🤖</span>
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-sm">Event Assistant</h3>
                                <p className="text-white/80 text-xs">Online</p>
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[70%] px-3 py-2 rounded-lg text-sm ${message.sender === 'user'
                                        ? 'bg-primary-500 text-white'
                                        : 'bg-slate-700 text-slate-200'
                                        }`}
                                >
                                    <p>{message.text}</p>
                                    <span className="text-xs opacity-70 mt-1 block">
                                        {message.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-slate-700">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Ask me about events..."
                                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:border-primary-500 text-sm"
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim()}
                                className="px-4 py-2 bg-primary-500 hover:bg-primary-400 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// --- SUBCOMPONENTS ---


// function NavItem removed as it is now in Sidebar.jsx

function StatCard({ title, value, subtext, subtextColor, icon }) {
    return (
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl flex items-start justify-between hover:border-primary-500/30 transition-colors">
            <div>
                <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-white mb-1">{value}</h3>
                <p className={`text-xs ${subtextColor}`}>{subtext}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${icon.props.className?.includes('text-gold') ? 'bg-primary-500/10 text-primary-500' : 'bg-slate-700 text-slate-400'}`}>
                {icon}
            </div>
        </div>
    );
}

function FilterDropdown({ label, options, selected, onChange }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${selected !== 'All'
                    ? 'bg-primary-50 border-primary-200 text-primary-600'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
            >
                {label}: {selected}
                <span className="text-[10px] opacity-50">▼</span>
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full mt-2 left-0 w-40 bg-white border border-slate-200 shadow-xl rounded-lg overflow-hidden z-20">
                        {options.map((option) => (
                            <button
                                key={option}
                                onClick={() => {
                                    onChange(option);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors ${selected === option ? 'bg-primary-50 text-primary-600 font-semibold' : 'text-slate-600'}`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}

function EventCard({ event, onRegister, isRegistered, user, onNavigate }) {
    const [registering, setRegistering] = useState(false);

    // Check if current user is the creator
    const isCreator = user && event.raw_data?.created_by === user.email;

    const handleClick = async () => {
        if (event.raw_data?.source === 'InfiniteBZ') {
            onRegister(); // Parent handles opening modal
        } else if (event.is_free && event.url.includes("eventbrite")) {
            setRegistering(true);
            await onRegister();
            setRegistering(false);
        } else {
            window.open(event.url, '_blank');
        }
    };

    return (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:shadow-lg transition-shadow hover:shadow-primary-500/10 flex flex-col h-full">
            {/* Header with Date */}
            <div className="relative h-32 bg-gradient-to-r from-primary-500 to-indigo-600 flex items-center justify-center shrink-0">
                <div className="absolute top-3 left-3 bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-bold">
                    {new Date(event.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <img
                    src={event.image_url || `https://images.unsplash.com/photo-${[
                        "1540575861501-7cf05a4b125a",
                        "1505373630103-89d00c2a5851",
                        "1475721027785-f74eccf877e2",
                        "1511795409834-ef04bbd61622",
                        "1587825140708-dfaf72ae4b04",
                        "1431540015161-0bf868a2d407"
                    ][event.id % 6]}?q=80&w=1000&auto=format&fit=crop`}
                    alt={event.title}
                    className="w-full h-full object-cover absolute inset-0"
                    onError={(e) => {
                        e.target.onerror = null;
                        const fallbacks = ["1540575861501-7cf05a4b125a", "1505373630103-89d00c2a5851", "1475721027785-f74eccf877e2", "1511795409834-ef04bbd61622"];
                        e.target.src = `https://images.unsplash.com/photo-${fallbacks[event.id % 4]}?q=80&w=1000&auto=format&fit=crop`;
                    }}
                />
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col flex-1">
                {/* Event Title */}
                <h3 className="text-lg font-bold text-white mb-3 line-clamp-2 overflow-hidden h-14" style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                }}>
                    {event.title}
                </h3>

                {/* Badges */}
                <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${event.is_free ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        {event.is_free ? 'Free' : 'Paid'}
                    </span>
                    <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center gap-1">
                        {event.online_event ? '🌐 Online' : '📍 In Person'}
                    </span>
                </div>

                {/* Event Details */}
                <div className="space-y-2 mb-4 flex-1">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="font-medium text-slate-300">By {event.organizer_name || "Unknown"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>📅 {new Date(event.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        <span>•</span>
                        <span>{new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {!event.online_event && event.venue_name && (
                        <div className="flex items-start gap-2 text-xs text-slate-400">
                            <span>📍</span>
                            <div>
                                <p className="font-medium text-slate-300 line-clamp-1">{event.venue_name}</p>
                                <p className="text-slate-500 line-clamp-1">{event.venue_address || "Chennai, India"}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Source */}
                <div className="flex items-center justify-between mb-4 mt-auto">
                    <div className="flex items-center gap-2">
                        {(() => {
                            const source = event.raw_data?.source || "eventbrite";
                            const sourceLower = source.toLowerCase();

                            let label = "EB";
                            let fullName = "Eventbrite";
                            let colorClass = "bg-orange-500";
                            let textColor = "text-orange-400";

                            if (sourceLower === 'infinitebz') {
                                label = "IB";
                                fullName = "InfiniteBZ";
                                colorClass = "bg-primary-500";
                                textColor = "text-primary-400";
                            } else if (sourceLower === 'meetup') {
                                label = "M";
                                fullName = "Meetup";
                                colorClass = "bg-red-500";
                                textColor = "text-red-400";
                            } else if (sourceLower === 'trade_centre' || sourceLower === 'ctc') {
                                label = "CTC";
                                fullName = "Trade Centre";
                                colorClass = "bg-blue-500";
                                textColor = "text-blue-400";
                            } else if (sourceLower === 'allevents') {
                                label = "AE";
                                fullName = "AllEvents";
                                colorClass = "bg-yellow-500";
                                textColor = "text-yellow-400";
                            }

                            return (
                                <>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${colorClass}`}>
                                        {label}
                                    </div>
                                    <span className={`text-xs font-medium ${textColor}`}>
                                        {fullName}
                                    </span>
                                </>
                            );
                        })()}
                    </div>
                </div>

                {/* Action Button */}
                <button
                    onClick={handleClick}
                    disabled={registering || isRegistered}
                    className={`w-full py-3 rounded-lg uppercase tracking-wider font-bold transition-all inline-flex items-center justify-center gap-2 mt-auto ${isRegistered
                        ? 'bg-green-500 text-white cursor-default'
                        : registering
                            ? 'bg-slate-700 text-slate-400 cursor-wait'
                            : 'bg-primary-500 hover:bg-primary-400 text-white shadow-lg shadow-primary-500/20'
                        }`}
                >

                    {event.raw_data?.source === 'InfiniteBZ'
                        ? (
                            isRegistered ? (
                                <><CheckCircle2 size={16} /><span>Registered</span></>
                            ) : (
                                <><Eye size={16} /><span>Register</span></>
                            )
                        )
                        : (registering ? 'Processing...' : isRegistered ? 'Registered' : 'Register')
                    }

                </button >
            </div >
        </div >
    );
}

function NotificationDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    // MOCK DATA for now
    const [notifications, setNotifications] = useState([
        { id: 1, title: 'Registration Successful', message: 'You are booked for "Startup Summit"!', type: 'success', time: '2m ago', isRead: false },
        { id: 2, title: 'New Event Alert', message: '3 new tech events in Chennai.', type: 'info', time: '1h ago', isRead: false },
        { id: 3, title: 'System Update', message: 'Dashboard colors updated successfully.', type: 'info', time: '1d ago', isRead: true }
    ]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const markAsRead = (id) => {
        setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
    };

    const markAllRead = () => {
        setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2 rounded-full transition-colors ${isOpen ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-sky-500 hover:bg-slate-800'}`}
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-slate-900"></span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-80 bg-slate-800 border border-slate-700 shadow-xl rounded-xl overflow-hidden z-30 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-900/50">
                            <h3 className="text-sm font-bold text-white">Notifications</h3>
                            {unreadCount > 0 && (
                                <button onClick={markAllRead} className="text-[10px] font-bold text-sky-500 hover:text-sky-400 uppercase tracking-wide">
                                    Mark all read
                                </button>
                            )}
                        </div>

                        <div className="max-h-[300px] overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 text-sm">
                                    No notifications yet.
                                </div>
                            ) : (
                                notifications.map(n => (
                                    <div
                                        key={n.id}
                                        onClick={() => markAsRead(n.id)}
                                        className={`px-4 py-3 border-b border-slate-700/50 hover:bg-slate-700/50 transition-colors cursor-pointer flex gap-3 ${n.isRead ? 'opacity-60' : 'bg-slate-700/20'}`}
                                    >
                                        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${n.type === 'success' ? 'bg-green-500' : 'bg-sky-500'}`} />
                                        <div>
                                            <p className={`text-sm ${n.isRead ? 'font-medium text-slate-400' : 'font-bold text-white'}`}>
                                                {n.title}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                                {n.message}
                                            </p>
                                            <p className="text-[10px] text-slate-600 mt-1.5 font-medium">{n.time}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="bg-slate-900/50 px-4 py-2 text-center border-t border-slate-700">
                            <button className="text-xs font-bold text-slate-400 hover:text-white transition-colors">
                                View All Activity
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
