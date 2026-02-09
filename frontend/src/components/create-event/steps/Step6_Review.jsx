import { useState } from 'react';
import { Calendar, Clock, MapPin, Globe, Check, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function Step6_Review({ formData, updateFormData, onSave, onBack }) {
    const [publishing, setPublishing] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    const handlePublish = async () => {
        setPublishing(true);

        try {
            // 1. Prepare Payload matching Backend Schema (EventCreate)
            // Combine Date & Time
            const startDateTime = new Date(`${formData.startDate}T${formData.startTime}:00`);
            const endDateTime = new Date(`${formData.endDate || formData.startDate}T${formData.endTime}:00`);

            // Construct Address
            const fullAddress = formData.mode === 'offline'
                ? [formData.address1, formData.address2, formData.city, formData.state, formData.postalCode, formData.country]
                    .filter(Boolean)
                    .join(", ")
                : "Online";

            const payload = {
                title: formData.title,
                description: formData.description,
                // Send as naive ISO string (strip Z) to avoid "offset-naive vs offset-aware" DB errors
                start_time: startDateTime.toISOString().replace('Z', ''),
                end_time: endDateTime.toISOString().replace('Z', ''),
                venue_name: formData.mode === 'offline' ? formData.venueName : "Online Event",
                venue_address: fullAddress,
                image_url: formData.imageUrl,
                category: formData.category,
                is_free: formData.tickets.every(t => t.price === 0), // Calculate based on tickets
                online_event: formData.mode === 'online',
                capacity: 100, // Default or add to form
                meeting_link: formData.meetingLink,
                meeting_link_private: formData.meetingLinkPrivate,
                timezone: formData.timezone,
                // organizer_name: "Host", // REMOVED: Let backend handle this from User Profile

                // Nested JSON fields
                agenda: formData.agendaItems,
                speakers: formData.speakers,

                // Map tickets to TicketClassCreate schema
                tickets: formData.tickets.map(t => ({
                    name: t.name,
                    type: t.price > 0 ? "paid" : "free",
                    price: parseFloat(t.price),
                    quantity: parseInt(t.quantity),
                    description: t.description || "",
                    min_quantity: 1,
                    max_quantity: 10
                })),

                // NEW: Pass extra fields in a raw_data wrapper if backend supports it, 
                // but checking schema, we don't see 'raw_data' in EventCreate, only in Event.
                // However, often extra fields are ignored or caused 422. 
                // We will strictly send only what is allowed.
                // If we want to save tags, we might need to put them in description or separate field if supported.
                // For now, let's append tags to description if possible or just ignore to fix 422.
            };

            // Hack: Append tags to description for now as backend has no tags field
            if (formData.tags && formData.tags.length > 0) {
                payload.description = (payload.description || "") + "\n\nTags: " + formData.tags.map(t => `#${t}`).join(" ");
            }

            // Trigger confetti
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 }
            });

            // Call save with formatted payload
            await onSave(payload);

        } catch (error) {
            console.error("Publishing preparation failed:", error);
            // Alert is handled by parent or verify generic error
            alert("Failed to prepare event data. Please check dates and times.");
        } finally {
            setPublishing(false);
        }
    };

    const calculateDuration = () => {
        if (!formData.startTime || !formData.endTime) return "N/A";
        const start = new Date(`2000/01/01 ${formData.startTime}`);
        const end = new Date(`2000/01/01 ${formData.endTime}`);
        if (end < start) end.setDate(end.getDate() + 1); // Handle overnight
        const diff = (end - start) / 1000 / 60; // minutes
        const hours = Math.floor(diff / 60);
        const mins = diff % 60;
        return `${hours}h${mins > 0 ? ` ${mins}m` : ''}`;
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return "";
        const [hours, mins] = timeStr.split(':');
        const h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${mins} ${ampm}`;
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="text-center space-y-2">
                <h3 className="text-3xl font-bold text-white">Review & Publish</h3>
                <p className="text-slate-400">Double check everything before we go live.</p>
            </div>

            {/* VALIDATION ALERTS */}
            {(() => {
                const warnings = [];
                if (!formData.imageUrl) warnings.push("Cover Image is missing");
                if (!formData.speakers || formData.speakers.length === 0) warnings.push("No Speakers added");
                if (!formData.agendaItems || formData.agendaItems.length === 0) warnings.push("Agenda is empty");

                if (warnings.length > 0) {
                    return (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-4 animate-in fade-in zoom-in-95">
                            <div className="text-amber-400 mt-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
                            </div>
                            <div>
                                <h5 className="font-bold text-amber-200">Missing Information</h5>
                                <ul className="list-disc list-inside text-sm text-amber-300/80 mt-1">
                                    {warnings.map((w, i) => <li key={i}>{w}</li>)}
                                </ul>
                                <p className="text-xs text-amber-400/50 mt-2">You can publish anyway, but we recommend adding these details.</p>
                            </div>
                        </div>
                    )
                }
                return null;
            })()}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Event Card Preview */}
                <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl group">
                    <div className="h-48 bg-black/40 relative">
                        {/* Image Loading State */}
                        {formData.imageUrl && (
                            <div className={`absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-10 transition-opacity duration-500 ${imageLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                                <div className="text-center space-y-2">
                                    <div className="animate-spin text-2xl">✨</div>
                                    <p className="text-xs font-bold text-white animate-pulse">Painting Cover Art...</p>
                                </div>
                            </div>
                        )}

                        {formData.imageUrl ? (
                            <img
                                src={formData.imageUrl}
                                alt="Cover"
                                className={`w-full h-full object-cover transition-opacity duration-700 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                                onLoad={() => setImageLoaded(true)}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600">No Image</div>
                        )}

                        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10 z-20">
                            {formData.category}
                        </div>
                    </div>
                    <div className="p-8 space-y-6">
                        <div>
                            <h4 className="text-2xl font-bold text-white mb-2">{formData.title}</h4>
                            <p className="text-slate-400 text-sm line-clamp-3 mb-4">{formData.description || "No description provided."}</p>

                            {/* Tags Display */}
                            {formData.tags && formData.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {formData.tags.map((tag, i) => (
                                        <span key={i} className="bg-indigo-500/10 text-indigo-300 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-indigo-500/20">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-3 text-sm text-slate-300">
                            <div className="flex items-center gap-3">
                                <Calendar size={16} className="text-indigo-400" />
                                <span>{formData.startDate} {formData.startTime && `at ${formatTime(formData.startTime)}`}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                {formData.mode === 'offline' ? <MapPin size={16} className="text-indigo-400" /> : <Globe size={16} className="text-indigo-400" />}
                                <span>{formData.mode === 'offline'
                                    ? [formData.venueName, formData.city, formData.country].filter(Boolean).join(", ")
                                    : 'Online Event'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="space-y-6">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <h5 className="font-bold text-white mb-4 uppercase text-xs tracking-widest text-slate-500">At a Glance</h5>
                        <ul className="space-y-4">
                            <li className="flex justify-between text-sm">
                                <span className="text-slate-400">Duration</span>
                                <span className="text-white font-bold">{calculateDuration()}</span>
                            </li>
                            <li className="flex justify-between text-sm">
                                <span className="text-slate-400">Agenda Items</span>
                                <span className="text-white font-bold">{formData.agendaItems?.length || 0} Sessions</span>
                            </li>
                            <li className="flex justify-between text-sm">
                                <span className="text-slate-400">Ticket Classes</span>
                                <span className="text-white font-bold">{formData.tickets?.length || 0} Types</span>
                            </li>
                            <li className="flex justify-between text-sm">
                                <span className="text-slate-400">Speakers</span>
                                <span className="text-white font-bold">{formData.speakers?.length || 0} Confirmed</span>
                            </li>
                        </ul>
                    </div>

                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-6">
                        <h5 className="font-bold text-indigo-300 mb-2">Ready to Launch?</h5>
                        <p className="text-xs text-indigo-400/80 mb-4">
                            Your event will be visible on the public feed immediately after publishing.
                        </p>
                        <button
                            onClick={handlePublish}
                            disabled={publishing}
                            className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
                        >
                            {publishing ? 'Publishing...' : <>Publish Event <ArrowRight size={18} /></>}
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex justify-start pt-8">
                <button onClick={onBack} className="px-6 py-3 rounded-xl text-slate-400 hover:text-white font-bold transition-colors">Back to Venue</button>
            </div>
        </div >
    );
}
