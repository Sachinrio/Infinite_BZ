import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft } from 'lucide-react';

export default function Step4_Tickets({ formData, updateFormData, onNext, onBack }) {

    // Initialize local state based on existing formData
    // Check if we have a paid ticket existing to decide default toggle
    const hasPaidTicket = formData.tickets?.some(t => t.type === 'paid');
    const initialType = hasPaidTicket ? 'paid' : (formData.price && Number(formData.price) > 0 ? 'paid' : 'free');

    const [ticketType, setTicketType] = useState(initialType);

    // Try to get price from formData.price OR from the first paid ticket
    const initialPrice = formData.price || formData.tickets?.find(t => t.type === 'paid')?.price || "";
    const [priceInput, setPriceInput] = useState(initialPrice);

    // Sync formData updates whenever inputs change
    useEffect(() => {
        const finalPrice = ticketType === 'free' ? "0" : priceInput;
        const capacity = formData.capacity || 100;

        // Construct a single "General Admission" ticket
        const singleTicket = {
            id: 1, // Static ID for the single ticket
            name: "General Admission",
            price: finalPrice,
            quantity: capacity,
            type: ticketType
        };

        // Update formData silently so it's ready for Next/Back
        updateFormData({
            price: finalPrice,
            is_free: ticketType === 'free',
            tickets: [singleTicket]
            // Note: capacity is already in formData, usually updated by the capacity input directly
        });
    }, [ticketType, priceInput, formData.capacity]);


    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="text-center space-y-2">
                <h3 className="text-3xl font-bold text-white">Ticket Options</h3>
                <p className="text-slate-440">How do you want to charge for your event?</p>
            </div>

            <div className="max-w-3xl mx-auto space-y-8">

                {/* 1. Ticket Type Toggle */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button
                        onClick={() => setTicketType('free')}
                        className={`p-8 rounded-3xl border-2 transition-all flex flex-col items-center gap-4 group ${ticketType === 'free' ? 'border-emerald-500 bg-emerald-500/10 shadow-xl shadow-emerald-500/10' : 'border-white/10 hover:bg-white/5 opacity-60 hover:opacity-100'}`}
                    >
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl transition-transform group-hover:scale-110 ${ticketType === 'free' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                            🎉
                        </div>
                        <div className="text-center">
                            <h4 className={`text-xl font-bold ${ticketType === 'free' ? 'text-white' : 'text-slate-300'}`}>Free Event</h4>
                            <p className="text-sm text-slate-500 mt-1">No cost for attendees</p>
                        </div>
                    </button>

                    <button
                        onClick={() => setTicketType('paid')}
                        className={`p-8 rounded-3xl border-2 transition-all flex flex-col items-center gap-4 group ${ticketType === 'paid' ? 'border-indigo-500 bg-indigo-500/10 shadow-xl shadow-indigo-500/10' : 'border-white/10 hover:bg-white/5 opacity-60 hover:opacity-100'}`}
                    >
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl transition-transform group-hover:scale-110 ${ticketType === 'paid' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                            🎟️
                        </div>
                        <div className="text-center">
                            <h4 className={`text-xl font-bold ${ticketType === 'paid' ? 'text-white' : 'text-slate-300'}`}>Paid Ticket</h4>
                            <p className="text-sm text-slate-500 mt-1">Set a price per ticket</p>
                        </div>
                    </button>
                </div>

                {/* 2. Details Inputs */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-8">
                    {ticketType === 'paid' && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-4">
                            <label className="text-sm font-bold text-slate-300 uppercase tracking-widest">Ticket Price ($)</label>
                            <input
                                type="number"
                                value={priceInput}
                                onChange={(e) => setPriceInput(e.target.value)}
                                placeholder="e.g. 49.99"
                                className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-4 text-white text-2xl font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none placeholder:text-slate-700 transition-all font-mono"
                                autoFocus
                            />
                        </div>
                    )}

                    <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-300 uppercase tracking-widest">Total Capacity</label>
                        <input
                            type="number"
                            value={formData.capacity || 100}
                            onChange={(e) => updateFormData({ capacity: Number(e.target.value) })}
                            placeholder="100"
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-4 text-white text-xl font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono"
                        />
                        <p className="text-xs text-slate-500">Maximum number of attendees allowed.</p>
                    </div>
                </div>

            </div>

            <div className="flex justify-between pt-8 border-t border-white/10 max-w-5xl mx-auto">
                <button
                    onClick={onBack}
                    className="px-6 py-3 rounded-xl text-slate-400 hover:text-white font-bold transition-colors flex items-center gap-2 hover:bg-white/5"
                >
                    <ChevronLeft size={18} /> Back
                </button>
                <button
                    onClick={onNext}
                    // Validate: If paid, must have price. Always need capacity > 0
                    disabled={(ticketType === 'paid' && !priceInput) || !formData.capacity}
                    className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    Next Step <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
}
