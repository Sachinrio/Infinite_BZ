import { useState, useEffect } from 'react';
import {
    Calendar, MapPin, Clock, User, Mail, Ticket, Globe, X, Share2, Heart,
    CheckCircle2, ArrowRight, Linkedin, Twitter, Shield, Star, LayoutGrid
} from 'lucide-react';
import CheckoutModal from './CheckoutModal';

export default function EventDetailModal({ event, isOpen, onClose, onRegister, isRegistered }) {
    if (!isOpen || !event) return null;

    const [activeTab, setActiveTab] = useState('about');
    const [isFollowing, setIsFollowing] = useState(false);
    const [isLoadingFollow, setIsLoadingFollow] = useState(false);
    const [isLoadingCheckFollow, setIsLoadingCheckFollow] = useState(false);
    const isInternal = event.raw_data?.source === 'InfiniteBZ';
    const isOnline = event.online_event || event.mode === 'online';

    const [showCheckout, setShowCheckout] = useState(false);

    // Check if user is already following this organizer when event changes
    useEffect(() => {
        if (event?.organizer_email) {
            checkFollowStatus();
        }
    }, [event?.organizer_email]);

    const checkFollowStatus = async () => {
        if (!event?.organizer_email) return;

        setIsLoadingCheckFollow(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/v1/user/following`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });

            if (response.ok) {
                const data = await response.json();
                const isFollowingOrganizer = data.following.some(user => user.email === event.organizer_email);
                setIsFollowing(isFollowingOrganizer);
            }
        } catch (error) {
            console.error('Error checking follow status:', error);
        } finally {
            setIsLoadingCheckFollow(false);
        }
    };

    // Use real agenda data
    const agenda = event.raw_data?.agenda || [];

    const handleFollow = async () => {
        console.log('=== FOLLOW BUTTON CLICKED ===');
        console.log('Event object:', event);
        console.log('Organizer email:', event?.organizer_email);
        console.log('Organizer name:', event?.organizer_name);
        console.log('Current following status:', isFollowing);

        // Use organizer_email if available, otherwise try to find user by name
        let targetIdentifier = event?.organizer_email;

        if (!targetIdentifier) {
            // Fallback: try to use organizer name to find the user
            console.log('No organizer email, trying to find user by name');
            targetIdentifier = event?.organizer_name;
        }

        if (!targetIdentifier) {
            console.error('❌ ERROR: No organizer email or name available');
            alert('Cannot identify the event organizer. Please try a different event.');
            return;
        }

        // If already following, don't do anything (one-way follow)
        if (isFollowing) {
            console.log('ℹ️ Already following this organizer, no action needed');
            return;
        }

        setIsLoadingFollow(true);
        console.log('⏳ Starting follow request...');

        try {
            const token = localStorage.getItem('token');
            console.log('Token exists:', !!token);

            if (!token) {
                console.error('❌ ERROR: No authentication token found');
                alert('You must be logged in to follow organizers.');
                return;
            }

            const url = `/api/v1/user/follow/${encodeURIComponent(targetIdentifier)}`;
            console.log('🌐 Making POST request to:', url);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            });

            console.log('📡 Response status:', response.status);
            console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

            if (response.ok) {
                console.log('✅ Successfully followed organizer!');
                setIsFollowing(true);

                // Show success message
                alert('Successfully followed the organizer!');
            } else {
                const errorText = await response.text();
                console.error('❌ Failed to follow user:', response.status, errorText);

                // Show error to user
                alert(`Failed to follow organizer. Error: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error('❌ Network error following user:', error);
            alert('Network error occurred. Please check your connection and try again.');
        } finally {
            setIsLoadingFollow(false);
            console.log('🏁 Follow request completed');
        }
    };

    const handleOpenMap = () => {
        if (!event.venue_name && !event.venue_address) return;

        const query = encodeURIComponent(`${event.venue_name || ''}, ${event.venue_address || ''}`);
        window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900 animate-in fade-in duration-200 overflow-hidden">
            {/* Full Screen Container */}
            <div className="w-full h-full flex flex-col relative">

                {/* Close Button - Floated fixed top right */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 z-50 p-2.5 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-all border border-white/10 group"
                >
                    <X size={24} className="group-hover:rotate-90 transition-transform" />
                </button>

                <div className="flex-1 flex overflow-hidden">
                    {/* LEFT SIDE - VISUALS & KEY INFO (45% Width) */}
                    <div className="hidden lg:flex w-[45%] h-full relative flex-col">
                        {/* Background Image with Overlay */}
                        <div className="absolute inset-0">
                            {event.image_url ? (
                                <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-800" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
                            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 to-transparent" />
                        </div>

                        {/* Content Overlay */}
                        <div className="relative z-10 p-12 mt-auto">
                            <div className="flex items-center gap-3 mb-6">
                                <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border backdrop-blur-md ${event.is_free
                                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                    : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                                    }`}>
                                    {event.is_free ? 'Free Entry' : 'Paid Ticket'}
                                </span>
                                <span className="px-4 py-1.5 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-wide border border-white/10 backdrop-blur-md">
                                    {isOnline ? 'Online Event' : 'In Person'}
                                </span>
                            </div>
                            <h1 className="text-5xl font-extrabold text-white mb-4 leading-tight">
                                {event.title}
                            </h1>
                            <p className="text-xl text-slate-300 font-medium flex items-center gap-2">
                                Hosted by <span className="text-white">{event.organizer_name}</span>
                            </p>
                        </div>
                    </div>

                    {/* RIGHT SIDE - SCROLLABLE DETAILS & REGISTRATION (55% Width) */}
                    <div className="flex-1 h-full overflow-y-auto bg-slate-900 custom-scrollbar relative">
                        <div className="p-8 md:p-12 max-w-3xl mx-auto space-y-12">

                            {/* Mobile Header (Visible only on small screens) */}
                            <div className="lg:hidden mb-8">
                                <img src={event.image_url} className="w-full h-64 object-cover rounded-2xl mb-6" />
                                <h1 className="text-3xl font-bold text-white mb-2">{event.title}</h1>
                            </div>

                            {/* KEY DETAILS GRID */}
                            <div className="grid grid-cols-1 gap-6">
                                {/* Date & Time */}
                                <div className="flex items-start gap-4 p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                                    <div className="p-3 rounded-lg bg-slate-800 text-primary-500 border border-slate-700">
                                        <Calendar size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-400 font-medium uppercase tracking-wide mb-1">Date & Time</p>
                                        <p className="text-white font-bold text-lg">
                                            {new Date(event.start_time).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                        </p>
                                        <p className="text-slate-400">
                                            {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(event.end_time || event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>

                                {/* Location */}
                                <div className="flex items-start gap-4 p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                                    <div className="p-3 rounded-lg bg-slate-800 text-primary-500 border border-slate-700">
                                        <MapPin size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-slate-400 font-medium uppercase tracking-wide mb-1">Location</p>
                                        <p className="text-white font-bold text-lg">
                                            {event.venue_name || "Online Event"}
                                        </p>
                                        <p className="text-slate-400 text-sm mb-2">
                                            {event.venue_address || "Link available after registration"}
                                        </p>
                                        {!isOnline && (
                                            <div
                                                onClick={handleOpenMap}
                                                className="h-32 bg-slate-700/30 rounded-xl w-full relative overflow-hidden group cursor-pointer border border-slate-700 active:scale-[0.98] transition-all"
                                                title="Open in Google Maps"
                                            >
                                                <div className="absolute inset-0 bg-slate-800 flex items-center justify-center text-slate-500">
                                                    <span className="text-xs">Map Preview</span>
                                                </div>
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="bg-white text-slate-900 px-3 py-1.5 rounded-lg shadow-lg text-xs font-bold flex items-center gap-1 group-hover:scale-110 transition-transform">
                                                        <MapPin size={12} className="text-red-500" /> View on Map
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* TICKET TYPES DISPLAY */}
                                {event.raw_data?.tickets_meta && event.raw_data.tickets_meta.length > 0 && (
                                    <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-2 rounded-lg bg-slate-800 text-primary-500 border border-slate-700">
                                                <Ticket size={20} />
                                            </div>
                                            <p className="text-sm text-slate-400 font-medium uppercase tracking-wide">Available Tickets</p>
                                        </div>

                                        <div className="space-y-3">
                                            {event.raw_data.tickets_meta.map((ticket, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-700/50">
                                                    <div>
                                                        <p className="font-bold text-white text-sm">{ticket.name}</p>
                                                        <p className="text-xs text-slate-500">{ticket.description || `${ticket.quantity} available`}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={`text-sm font-bold px-2 py-1 rounded-lg ${ticket.price == 0 ? 'bg-green-500/10 text-green-400' : 'bg-slate-800 text-white'}`}>
                                                            {ticket.price == 0 ? 'Free' : `₹${ticket.price}`}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* ACTIONS CARD */}
                                <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50 space-y-4">
                                    <button
                                        onClick={() => {
                                            if (!isRegistered) {
                                                setShowCheckout(true);
                                            }
                                        }}
                                        disabled={isRegistered}
                                        className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all duration-300 ${isRegistered
                                            ? 'bg-green-500/20 text-green-400 border border-green-500/50 cursor-default'
                                            : 'bg-primary-600 hover:bg-primary-500 text-white shadow-lg shadow-primary-500/25 hover:shadow-primary-500/50 hover:-translate-y-0.5'
                                            }`}
                                    >
                                        {isRegistered ? (
                                            <> <CheckCircle2 className="animate-in zoom-in spin-in-180" /> Registered </>
                                        ) : (
                                            <> <Ticket className="animate-pulse" /> Register Now </>
                                        )}
                                    </button>

                                    <button
                                        onClick={handleFollow}
                                        disabled={isLoadingFollow}
                                        className={`w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all duration-300 ${isFollowing
                                            ? 'bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30'
                                            : 'bg-slate-700/50 text-white hover:bg-slate-600 border border-slate-600/50'
                                            }`}
                                    >
                                        {isLoadingFollow ? 'Loading...' : isFollowing ? '✓ Organizer Followed' : '+ Follow Organizer'}
                                    </button>
                                </div>
                            </div>

                            {/* ORGANIZER CARD */}
                            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                                    {event.organizer_name?.[0] || 'C'}
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-white text-sm">{event.organizer_name || "Community Host"}</p>
                                    <p className="text-xs text-slate-400">Organized by {event.organizer_name?.split(' ')[0]}</p>
                                </div>

                            </div>
                            {/* TABS & CONTENT */}
                            <div className="mt-12">
                                <div className="flex gap-8 border-b border-slate-800 mb-8 overflow-x-auto">
                                    {['About', ...(agenda.length > 0 ? ['Agenda'] : []), ...(event.raw_data?.speakers?.length > 0 ? ['Speakers'] : [])].map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab.toLowerCase())}
                                            className={`pb-4 text-sm font-bold uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === tab.toLowerCase()
                                                ? 'text-primary-500 border-b-2 border-primary-500'
                                                : 'text-slate-500 hover:text-slate-300'
                                                }`}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>

                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {activeTab === 'about' && (
                                        <div className="prose prose-invert max-w-none">
                                            <p className="text-slate-300 text-lg leading-relaxed whitespace-pre-wrap">
                                                {event.description || "Join us for an immersive experience designed to connect, educate, and inspire. This event brings together the brightest minds in the industry."}
                                            </p>


                                        </div>
                                    )}

                                    {activeTab === 'agenda' && (
                                        <div className="space-y-6 relative border-l-2 border-slate-800 ml-4 pl-8">
                                            {agenda.map((item, i) => (
                                                <div key={i} className="relative">
                                                    <div className="absolute -left-[39px] top-1 h-5 w-5 rounded-full bg-slate-900 border-4 border-slate-700" />
                                                    <p className="text-sm font-bold text-primary-500 mb-1">{item.startTime} - {item.endTime}</p>
                                                    <h4 className="text-xl font-bold text-white mb-2">{item.title}</h4>
                                                    <p className="text-slate-400 text-base">{item.description}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}



                                    {activeTab === 'speakers' && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {event.raw_data?.speakers?.map((speaker, i) => (
                                                <div key={i} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex items-start gap-4">
                                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                                                        {speaker.name?.[0] || 'S'}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-white">{speaker.name}</h4>
                                                        <p className="text-primary-400 text-sm font-medium mb-1">{speaker.role} {speaker.company && `at ${speaker.company}`}</p>
                                                        {speaker.bio && <p className="text-slate-400 text-xs line-clamp-2">{speaker.bio}</p>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* REGISTRATION FOOTER/CARD */}
                            <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 -mx-8 -mb-8 p-8 flex items-center justify-between gap-6 lg:static lg:bg-transparent lg:border-none lg:p-0 lg:m-0 lg:mt-12">
                                <div>
                                    <p className="text-slate-400 text-sm mb-1 uppercase tracking-wide font-bold">Total Price</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-black text-white">
                                            {event.is_free ? 'Free' : `₹${event.raw_data?.price || 499}`}
                                        </span>
                                        {!event.is_free && <span className="text-slate-500 line-through">₹999</span>}
                                    </div>
                                </div>

                                <button
                                    onClick={() => !isRegistered && setShowCheckout(true)}
                                    disabled={isRegistered}
                                    className={`px-10 py-4 rounded-xl font-bold text-lg flex items-center gap-3 transition-all transform hover:-translate-y-1 ${isRegistered
                                        ? 'bg-green-500/20 text-green-400 cursor-default'
                                        : 'bg-primary-600 hover:bg-primary-500 text-white shadow-xl shadow-primary-600/20'
                                        }`}
                                >
                                    {isRegistered ? (
                                        <> <CheckCircle2 /> Registered </>
                                    ) : (
                                        <> <Ticket className="animate-pulse" /> Confirm Registration </>
                                    )}
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            </div>


            {/* Checkout Modal Overlay */}
            <CheckoutModal
                event={event}
                isOpen={showCheckout}
                onClose={() => setShowCheckout(false)}
                onConfirm={async (payload) => {
                    await onRegister(event, payload);
                    setShowCheckout(false);
                }}
            />

        </div>
    );
}
