import { useState, useEffect } from 'react';
import { Calendar, MapPin, BarChart3, Users, Clock, Edit, Trash2, Eye, Plus, Search, Filter, ArrowUpRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EventStatsModal from './EventStatsModal';
import CreateEventModal from './create-event/CreateEventModal';

export default function MyEvents({ onCreateNew, onNavigate }) {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statsModalOpen, setStatsModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);

    // Delete Modal State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [eventToDelete, setEventToDelete] = useState(null);

    useEffect(() => {
        fetchMyEvents();
    }, []);

    const fetchMyEvents = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/v1/events/my-events', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setEvents(data.events || []);
            }
        } catch (err) {
            console.error("Error fetching events", err);
        } finally {
            setLoading(false);
        }
    };

    // --- ACTIONS ---

    const handleDelete = (event) => {
        setEventToDelete(event);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!eventToDelete) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/v1/events/${eventToDelete.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                setEvents(prev => prev.filter(e => e.id !== eventToDelete.id));
                setDeleteModalOpen(false);
                setEventToDelete(null);
            } else {
                alert("Failed to delete. You might not be the owner.");
            }
        } catch (err) {
            console.error(err);
            alert("Error deleting event");
        }
    };

    const handleEditClick = (event) => {
        setEditingEvent(event);
        setEditModalOpen(true);
    };

    const handleUpdateEvent = async (payload) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/v1/events/${payload.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const updatedEvent = await res.json();
                setEvents(prev => prev.map(e => e.id === updatedEvent.id ? { ...updatedEvent, registration_count: e.registration_count } : e));
                setEditModalOpen(false);
                setEditingEvent(null);
            } else {
                alert("Failed to update event.");
            }
        } catch (err) {
            console.error(err);
            alert("Error updating event");
        }
    };

    const handleCreateNew = async (payload) => {
        // Wrapper to reuse CreateEventModal for both Create and Edit if needed, 
        // but here we just pass the create handler from props if strictly separating, 
        // however CreateEventModal usually needs a parent handler. 
        // In Dashboard, onCreateNew just opens the modal. 
        // Here, if we want to support creation from this page, we need to replicate Dashboard logic 
        // OR trigger the parent's creation flow.
        // For now, staying simple: MyEvents 'Create' button triggers parent onCreateNew.
        // But for EDIT, we handle it locally.
    };

    // --- RENDER HELPERS ---

    const filteredEvents = events.filter(e =>
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.venue_name || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeCount = events.length;
    const totalAttendees = events.reduce((acc, curr) => acc + (curr.registration_count || 0), 0);

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">My Events</h1>
                    <p className="text-slate-400">Manage your events, track analytics, and engage with your audience.</p>
                </div>
                <button
                    onClick={onCreateNew}
                    className="group relative px-6 py-3 bg-gradient-to-r from-primary-500 to-indigo-600 rounded-xl font-bold text-white shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    <span className="flex items-center gap-2">
                        <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                        Create New Event
                    </span>
                </button>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-800/50 border border-slate-700/50 p-6 rounded-2xl flex items-center gap-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 text-slate-700 opacity-20 group-hover:scale-110 transition-transform">
                        <Calendar size={80} />
                    </div>
                    <div className="p-4 bg-indigo-500/10 rounded-xl text-indigo-400">
                        <Calendar size={32} />
                    </div>
                    <div>
                        <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Total Events</p>
                        <h3 className="text-3xl font-bold text-white">{activeCount}</h3>
                    </div>
                </div>

                <div className="bg-slate-800/50 border border-slate-700/50 p-6 rounded-2xl flex items-center gap-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 text-slate-700 opacity-20 group-hover:scale-110 transition-transform">
                        <Users size={80} />
                    </div>
                    <div className="p-4 bg-green-500/10 rounded-xl text-green-400">
                        <Users size={32} />
                    </div>
                    <div>
                        <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Total Attendees</p>
                        <h3 className="text-3xl font-bold text-white">{totalAttendees}</h3>
                    </div>
                </div>

                <div className="bg-slate-800/50 border border-slate-700/50 p-6 rounded-2xl flex items-center gap-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 text-slate-700 opacity-20 group-hover:scale-110 transition-transform">
                        <MapPin size={80} />
                    </div>
                    <div className="p-4 bg-pink-500/10 rounded-xl text-pink-400">
                        <MapPin size={32} />
                    </div>
                    <div>
                        <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Top Location</p>
                        <h3 className="text-2xl font-bold text-white">Chennai</h3>
                    </div>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                    <input
                        type="text"
                        placeholder="Search your events..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary-500 transition-colors"
                    />
                </div>

            </div>

            {/* Events Table Container */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                {loading ? (
                    <div className="p-20 text-center text-slate-500 flex flex-col items-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500 mb-4"></div>
                        <p>Loading your dashboard...</p>
                    </div>
                ) : filteredEvents.length === 0 ? (
                    <div className="p-20 text-center">
                        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Calendar size={40} className="text-slate-600" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No events found</h3>
                        <p className="text-slate-400 max-w-sm mx-auto mb-8">Get started by creating your first event. It only takes a few minutes.</p>
                        <button onClick={onCreateNew} className="text-primary-400 hover:text-primary-300 font-bold hover:underline">
                            Create your first event &rarr;
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-950/50 text-xs uppercase font-bold text-slate-500 border-b border-slate-800">
                                <tr>
                                    <th className="px-6 py-4">Event Details</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Registrations</th>
                                    <th className="px-6 py-4">Revenue</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {filteredEvents.map(event => (
                                    <tr key={event.id} className="group hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 rounded-lg bg-slate-800 flex-shrink-0 overflow-hidden border border-slate-700/50">
                                                    {event.image_url ? (
                                                        <img src={event.image_url} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                    ) : (
                                                        <div className="w-full h-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                                                            <Calendar size={20} className="text-slate-500" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-white text-base group-hover:text-primary-400 transition-colors">{event.title}</h4>
                                                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                                        <span className="flex items-center gap-1"><Clock size={12} /> {new Date(event.start_time).toLocaleDateString()}</span>
                                                        <span className="flex items-center gap-1">
                                                            <MapPin size={12} />
                                                            {event.venue_name || 'Online'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                Active
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="w-32">
                                                <div className="flex justify-between text-xs mb-1.5">
                                                    <span className="text-white font-bold">{event.registration_count || 0}</span>
                                                    <span className="text-slate-500">/{event.raw_data?.capacity || 100}</span>
                                                </div>
                                                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary-500 rounded-full"
                                                        style={{ width: `${Math.min(((event.registration_count || 0) / (event.raw_data?.capacity || 100)) * 100, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-slate-300 font-mono text-sm">
                                                {event.is_free ? 'Free' : `₹${(event.raw_data?.price || 0) * (event.registration_count || 0)}`}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => { setSelectedEvent(event); setStatsModalOpen(true); }}
                                                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors" title="View Details"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleEditClick(event)}
                                                    className="p-2 text-indigo-400 hover:text-indigo-300 hover:bg-slate-700/50 rounded-lg transition-colors" title="Edit Event"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(event)}
                                                    className="p-2 text-red-400 hover:text-red-300 hover:bg-slate-700/50 rounded-lg transition-colors" title="Delete Event"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Stats Modal */}
            <EventStatsModal
                isOpen={statsModalOpen}
                onClose={() => setStatsModalOpen(false)}
                event={selectedEvent}
            />

            {/* Edit Modal (Reusing CreateEventModal) */}
            <CreateEventModal
                isOpen={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                onSave={handleUpdateEvent}
                initialData={editingEvent}
            />

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                                <AlertCircle size={120} className="text-red-500" />
                            </div>

                            <div className="relative z-10">
                                <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-500">
                                    <Trash2 size={24} />
                                </div>

                                <h3 className="text-xl font-bold text-white mb-2">Delete Event?</h3>
                                <p className="text-slate-400 mb-6">
                                    Are you sure you want to delete <strong className="text-white">{eventToDelete?.title}</strong>?
                                    This action cannot be undone and all data will be lost.
                                </p>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setDeleteModalOpen(false)}
                                        className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmDelete}
                                        className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all"
                                    >
                                        Delete Event
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}
