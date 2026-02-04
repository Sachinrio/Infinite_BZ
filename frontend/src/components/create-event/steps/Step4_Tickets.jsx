import { Plus, Ticket, Coins, Users, Trash2, Check, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export default function Step4_Tickets({ formData, updateFormData, onNext, onBack }) {

    // Draft state for the ticket currently being created/edited
    const [draft, setDraft] = useState({
        id: null,
        name: "",
        price: "",
        quantity: "",
        type: "paid" // 'free' | 'paid'
    });

    const [isEditing, setIsEditing] = useState(false);

    // Reset draft to defaults
    const resetDraft = () => {
        setDraft({
            id: null, // null means new ticket
            name: "",
            price: "",
            quantity: "",
            type: "paid"
        });
        setIsEditing(false);
    };

    const updateDraft = (field, value) => {
        let updates = { [field]: value };
        // Auto-set price for free tickets
        if (field === 'type' && value === 'free') {
            updates.price = "0";
        }
        setDraft(prev => ({ ...prev, ...updates }));
    };

    const saveTicket = () => {
        if (!draft.name || !draft.quantity) return; // Validation

        if (isEditing) {
            // Update existing
            updateFormData({
                tickets: formData.tickets.map(t => t.id === draft.id ? { ...draft } : t)
            });
        } else {
            // Add new
            updateFormData({
                tickets: [...formData.tickets, { ...draft, id: Date.now() }]
            });
        }
        resetDraft();
    };

    const editTicket = (ticket) => {
        setDraft(ticket);
        setIsEditing(true);
        // Scroll to top or focus input could go here
    };

    const removeTicket = (id) => {
        updateFormData({ tickets: formData.tickets.filter(t => t.id !== id) });
        if (isEditing && draft.id === id) resetDraft();
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="text-center space-y-2">
                <h3 className="text-3xl font-bold text-white">Ticket Classes</h3>
                <p className="text-slate-400">Create tickets for your event (Count: {formData.tickets.length})</p>
            </div>

            <div className="space-y-6">

                {/* TICKET CREATOR CARD */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>

                    <div className="flex justify-between items-center">
                        <h4 className="font-bold text-white flex items-center gap-2">
                            {isEditing ? <Edit2 size={18} className="text-indigo-400" /> : <Plus size={18} className="text-indigo-400" />}
                            {isEditing ? "Edit Ticket" : "Create New Ticket"}
                        </h4>
                        {isEditing && <button onClick={resetDraft} className="text-xs text-slate-500 hover:text-white underline">Cancel Edit</button>}
                    </div>

                    {/* Type Selector */}
                    <div className="flex gap-3 bg-black/20 p-1 rounded-xl">
                        <button
                            onClick={() => updateDraft('type', 'free')}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${draft.type === 'free' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-white'}`}
                        >
                            Free
                        </button>
                        <button
                            onClick={() => updateDraft('type', 'paid')}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${draft.type === 'paid' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-white'}`}
                        >
                            Paid
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400">TICKET NAME</label>
                            <input
                                value={draft.name}
                                onChange={(e) => updateDraft('name', e.target.value)}
                                placeholder={draft.type === 'free' ? "e.g. Free Entry" : "e.g. VIP Access"}
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all font-bold"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400">PRICE</label>
                                <div className="relative">
                                    <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-bold ${draft.type === 'free' ? 'text-slate-600' : 'text-slate-400'}`}>₹</span>
                                    <input
                                        type="number"
                                        value={draft.price}
                                        onChange={(e) => updateDraft('price', e.target.value)}
                                        disabled={draft.type === 'free'}
                                        placeholder="0"
                                        className={`w-full bg-black/20 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white focus:outline-none transition-all ${draft.type === 'free' ? 'opacity-50 cursor-not-allowed' : 'focus:border-indigo-500'}`}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400">QUANTITY</label>
                                <input
                                    type="number"
                                    value={draft.quantity}
                                    onChange={(e) => updateDraft('quantity', e.target.value)}
                                    placeholder="100"
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={saveTicket}
                        disabled={!draft.name || !draft.quantity}
                        className="w-full py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Check size={18} /> {isEditing ? "Update Ticket" : "Save Ticket"}
                    </button>
                </div>

                {/* SAVED TICKETS LIST */}
                <div className="space-y-3">
                    <AnimatePresence>
                        {formData.tickets.map(ticket => (
                            <motion.div
                                key={ticket.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-slate-900/50 border border-white/10 rounded-xl p-4 flex items-center justify-between group hover:border-white/20 transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${ticket.type === 'free' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                                        <Ticket size={18} />
                                    </div>
                                    <div>
                                        <h5 className="font-bold text-white leading-tight">{ticket.name}</h5>
                                        <p className="text-xs text-slate-400">
                                            {ticket.quantity} available • {ticket.type === 'free' ? 'Free' : `₹${ticket.price}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => editTicket(ticket)} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"><Edit2 size={16} /></button>
                                    <button onClick={() => removeTicket(ticket.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400"><Trash2 size={16} /></button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {formData.tickets.length === 0 && (
                        <div className="text-center py-8 text-slate-500 text-sm">
                            No tickets saved. Create one above!
                        </div>
                    )}
                </div>

            </div>

            <div className="flex justify-between pt-8 border-t border-white/10">
                <button onClick={onBack} className="px-6 py-3 rounded-xl text-slate-400 hover:text-white font-bold transition-colors">Back</button>
                <button
                    onClick={onNext}
                    disabled={formData.tickets.length === 0 || draft.name.length > 0}
                    className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {draft.name.length > 0 ? "Save Ticket First" : "Next Step"}
                </button>
            </div>
        </div>
    );
}
