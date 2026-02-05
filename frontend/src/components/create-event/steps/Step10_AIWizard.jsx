import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Calendar, MapPin, DollarSign, ChevronRight, LayoutTemplate } from 'lucide-react';

export default function Step10_AIWizard({ formData, updateFormData, onNext }) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [loadingStage, setLoadingStage] = useState('generating'); // 'generating' | 'painting'

    // Simple Local State for Price/Type
    const [ticketType, setTicketType] = useState(formData.price && Number(formData.price) > 0 ? 'paid' : 'free');
    const [priceInput, setPriceInput] = useState(formData.price || "");

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            // 1. Prepare Single Ticket for Backend Compatibility
            const finalPrice = ticketType === 'free' ? "0" : priceInput;
            const singleTicket = {
                id: Date.now(),
                name: "General Admission",
                price: finalPrice,
                quantity: formData.capacity || 100,
                type: ticketType
            };

            // Update formData with Ticket & Price info BEFORE generating, 
            // so we have it if generation fails or for the next step.
            updateFormData({
                price: finalPrice,
                is_free: ticketType === 'free',
                tickets: [singleTicket]
            });

            // 2. Call AI API
            const payload = {
                title: formData.title,
                category: formData.category || "General",
                start_time: formData.startTime || "10:00",
                end_time: formData.endTime || "12:00"
            };

            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/ai/generate-event`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || "AI Generation failed");

            // Note: We don't block for image loading here anymore.
            // The Next Step (Review) will handle the "Painting..." loading state.

            // 4. Update with AI Content
            updateFormData({
                description: data.description,
                // Force cache-busting and fresh generation if backend is stale
                imageUrl: data.imageUrl + (data.imageUrl.includes('?') ? '&' : '?') + 'seed=' + Math.floor(Math.random() * 999999),
                tags: data.tags,
                agendaItems: data.agenda?.map((item, idx) => ({ id: Date.now() + idx, ...item })) || [],
                speakers: data.speakers?.map((item, idx) => ({ id: Date.now() + idx + 100, ...item, imageUrl: "" })) || [],
                aiGenerated: true,
                // Re-enforce tickets here just in case
                tickets: [singleTicket]
            });

            onNext();
        } catch (err) {
            console.error(err);
            alert("AI Generation Failed: " + err.message);
        } finally {
            setIsGenerating(false);
            setLoadingStage('generating');
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">

            {/* Header */}
            <div className="text-center space-y-4 mb-12">
                <div className="inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-300 px-4 py-1.5 rounded-full border border-indigo-500/20 text-sm font-bold">
                    <Sparkles size={14} /> AI Event Creator
                </div>
                <h2 className="text-4xl font-bold text-white">Create an event with AI</h2>
                <p className="text-slate-400 text-lg">Answer a few questions, and we'll build your event page instantly.</p>
            </div>

            {/* SECTION 1: TITLE */}
            <div className="space-y-4">
                <h3 className="text-2xl font-bold text-white">What's the name of your event?</h3>
                <p className="text-slate-400 text-sm">This will be your event's title. Make it catchy!</p>
                <input
                    value={formData.title}
                    onChange={(e) => updateFormData({ title: e.target.value })}
                    placeholder="Event Title"
                    className="w-full bg-transparent border-b-2 border-white/20 p-4 text-3xl font-bold text-white placeholder:text-slate-600 focus:border-indigo-500 transition-all outline-none"
                    autoFocus
                />
            </div>

            {/* SECTION 2: DATE & TIME */}
            <div className="space-y-6">
                <h3 className="text-2xl font-bold text-white">When does your event start and end?</h3>

                <div className="flex flex-col md:flex-row gap-8 bg-white/5 p-6 rounded-2xl border border-white/10">
                    <div className="flex-1 space-y-4">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Start</label>
                        <div className="grid grid-cols-2 gap-4">
                            <input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => updateFormData({ startDate: e.target.value })}
                                className="bg-slate-900 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <input
                                type="time"
                                value={formData.startTime}
                                onChange={(e) => updateFormData({ startTime: e.target.value })}
                                className="bg-slate-900 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex-1 space-y-4">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">End</label>
                        <div className="grid grid-cols-2 gap-4">
                            <input
                                type="date"
                                value={formData.endDate || formData.startDate}
                                onChange={(e) => updateFormData({ endDate: e.target.value })}
                                className="bg-slate-900 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <input
                                type="time"
                                value={formData.endTime}
                                onChange={(e) => updateFormData({ endTime: e.target.value })}
                                className="bg-slate-900 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION 3: LOCATION */}
            <div className="space-y-6">
                <h3 className="text-2xl font-bold text-white">Where is it located?</h3>

                <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-6">
                    <div className="flex gap-4 p-1 bg-slate-900 rounded-xl w-fit">
                        <button
                            onClick={() => updateFormData({ mode: 'offline' })}
                            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${formData.mode === 'offline' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Venue
                        </button>
                        <button
                            onClick={() => updateFormData({ mode: 'online' })}
                            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${formData.mode === 'online' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Online Event
                        </button>
                    </div>

                    {formData.mode === 'offline' ? (
                        <div className="space-y-4">
                            <input
                                placeholder="Venue Name (e.g. Convention Center)"
                                value={formData.venueName || ""}
                                onChange={(e) => updateFormData({ location: e.target.value, venueName: e.target.value })}
                                className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <input
                                    placeholder="Address"
                                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                                <input
                                    placeholder="City"
                                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>
                    ) : (
                        <input
                            placeholder="Link to Meeting (Zoom/Meet)..."
                            value={formData.meetingLink}
                            onChange={(e) => updateFormData({ meetingLink: e.target.value })}
                            className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    )}
                </div>
            </div>

            {/* SECTION 4: TICKETS/PRICE - REVERTED TO SIMPLE */}
            <div className="space-y-6">
                <h3 className="text-2xl font-bold text-white">How much do you want to charge for tickets?</h3>

                <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-6">

                    {/* Free / Paid Toggle */}
                    <div className="flex gap-4">
                        <button
                            onClick={() => setTicketType('free')}
                            className={`flex-1 py-8 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${ticketType === 'free' ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/10 hover:bg-white/5 opacity-60 hover:opacity-100'}`}
                        >
                            <span className="text-3xl">🎉</span>
                            <span className={`text-xl font-bold ${ticketType === 'free' ? 'text-white' : 'text-slate-400'}`}>Full Free</span>
                        </button>
                        <button
                            onClick={() => setTicketType('paid')}
                            className={`flex-1 py-8 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${ticketType === 'paid' ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10 hover:bg-white/5 opacity-60 hover:opacity-100'}`}
                        >
                            <span className="text-3xl">🎟️</span>
                            <span className={`text-xl font-bold ${ticketType === 'paid' ? 'text-white' : 'text-slate-400'}`}>Paid Ticket</span>
                        </button>
                    </div>

                    {/* Paid Inputs */}
                    {ticketType === 'paid' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <label className="text-sm font-bold text-slate-400">TICKET PRICE ($)</label>
                            <input
                                type="number"
                                value={priceInput}
                                onChange={(e) => setPriceInput(e.target.value)}
                                placeholder="e.g. 49.99"
                                className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-white text-xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    )}

                    {/* Capacity Always Visible */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-400">TOTAL CAPACITY</label>
                        <input
                            type="number"
                            value={formData.capacity}
                            onChange={(e) => updateFormData({ capacity: Number(e.target.value) })}
                            className="w-full bg-slate-900 border border-white/10 rounded-xl p-4 text-white text-xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                </div>
            </div>

            <div className="pt-8 border-t border-white/10">
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !formData.title}
                    className="w-full py-4 rounded-xl bg-orange-600 hover:bg-orange-500 hover:scale-[1.01] active:scale-[0.99] transition-all text-white font-bold text-xl shadow-xl shadow-orange-600/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isGenerating ? (
                        <>
                            <span className="animate-spin text-2xl">
                                {loadingStage === 'painting' ? '🖌️' : '✨'}
                            </span>
                            <span className="animate-pulse">
                                {loadingStage === 'painting' ? 'Painting Cover Image...' : 'Building Event...'}
                            </span>
                        </>
                    ) : (
                        <>Create Event <ChevronRight /></>
                    )}
                </button>
            </div>

        </div>
    );
}
