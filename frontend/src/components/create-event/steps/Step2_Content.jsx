import { useState, useEffect } from 'react';
import { Sparkles, Calendar, User, AlignLeft, Image as ImageIcon, Plus, Trash2, Clock, CheckCircle2, ChevronRight, ChevronLeft, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Step2_Content({ formData, updateFormData, onNext, onBack }) {
    const [activeTab, setActiveTab] = useState('description'); // 'description' | 'agenda' | 'speakers' | 'cover'
    const [isGenerating, setIsGenerating] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [aiError, setAiError] = useState(null);

    // Reset error when URL changes
    useEffect(() => {
        setImageError(false);
        setImageLoaded(false);
    }, [formData.imageUrl]);

    // --- AI GENERATION LOGIC ---
    const handleGenerate = async () => {
        setIsGenerating(true);
        setAiError(null);
        try {
            const payload = {
                title: formData.title,
                category: formData.category,
                start_time: formData.startTime || "10:00",
                end_time: formData.endTime || "12:00"
            };

            const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/v1/ai/generate-event`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error("AI Generation failed");
            const data = await response.json();

            // Transform & Update
            const updates = {
                description: data.description || formData.description,
                imageUrl: data.imageUrl || formData.imageUrl,
                tags: data.tags || formData.tags,
                aiGenerated: true
            };

            if (data.agenda) {
                updates.agendaItems = data.agenda.map((item, idx) => ({
                    id: Date.now() + idx,
                    startTime: item.startTime,
                    endTime: item.endTime,
                    title: item.title,
                    description: item.description
                }));
            }

            if (data.speakers) {
                updates.speakers = data.speakers.map((item, idx) => ({
                    id: Date.now() + idx + 100,
                    name: item.name,
                    role: item.role,
                    company: item.company,
                    imageUrl: "",
                    linkedIn: ""
                }));
            }

            updateFormData(updates);
            // Don't auto-advance tabs, let user explore
        } catch (err) {
            setAiError(err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    // --- TABS UI ---
    const tabs = [
        { id: 'description', label: 'Description', icon: AlignLeft },
        { id: 'agenda', label: 'Agenda', icon: Calendar },
        { id: 'speakers', label: 'Speakers', icon: User },
        { id: 'keywords', label: 'Keywords', icon: Tag },
        { id: 'cover', label: 'Cover Image', icon: ImageIcon },
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500 min-h-[600px] flex flex-col">

            {/* HERADER */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-white/10 pb-6">
                <div>
                    <h3 className="text-3xl font-bold text-white">Event Content</h3>
                    <p className="text-slate-400">Manage your agenda, speakers, and details.</p>
                </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === tab.id
                            ? 'bg-white text-slate-900 shadow-md'
                            : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                        {/* Optional Badges */}
                        {tab.id === 'speakers' && formData.speakers?.length > 0 &&
                            <span className="bg-indigo-500 text-white text-[10px] px-1.5 rounded-full">{formData.speakers?.length}</span>}
                    </button>
                ))}
            </div>

            {/* ERROR ALERT */}
            {aiError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
                    AI Error: {aiError}
                </div>
            )}

            {/* TAB CONTENT AREA */}
            <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden">
                <AnimatePresence mode="wait">

                    {/* AGENDA TAB */}
                    {activeTab === 'agenda' && (
                        <motion.div
                            key="agenda"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4 h-full overflow-y-auto pr-2 custom-scrollbar"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-white">Timeline ({formData.agendaItems?.length || 0} Sessions)</h4>
                                <button onClick={() => updateFormData({ agendaItems: [...(formData.agendaItems || []), { id: Date.now(), startTime: "", endTime: "", title: "" }] })} className="text-indigo-400 text-xs font-bold hover:underline">+ Add Slot</button>
                            </div>

                            {(!formData.agendaItems || formData.agendaItems.length === 0) ? (
                                <div className="text-center py-10 text-slate-500">No sessions yet. Use AI or add manually.</div>
                            ) : (
                                <div className="space-y-3">
                                    {formData.agendaItems.map((item, idx) => (
                                        <div key={item.id} className="bg-slate-900/50 border border-white/5 p-4 rounded-xl flex gap-4 group">
                                            <div className="flex flex-col gap-2 w-24 shrink-0">
                                                <input type="time" value={item.startTime} onChange={(e) => {
                                                    const newItems = [...formData.agendaItems];
                                                    newItems[idx].startTime = e.target.value;
                                                    updateFormData({ agendaItems: newItems });
                                                }} className="bg-transparent text-white text-sm font-mono focus:outline-none border-b border-transparent focus:border-indigo-500" />
                                                <input type="time" value={item.endTime} onChange={(e) => {
                                                    const newItems = [...formData.agendaItems];
                                                    newItems[idx].endTime = e.target.value;
                                                    updateFormData({ agendaItems: newItems });
                                                }} className="bg-transparent text-slate-500 text-xs font-mono focus:outline-none border-b border-transparent focus:border-indigo-500" />
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <input value={item.title} onChange={(e) => {
                                                    const newItems = [...formData.agendaItems];
                                                    newItems[idx].title = e.target.value;
                                                    updateFormData({ agendaItems: newItems });
                                                }} placeholder="Session Title" className="w-full bg-transparent font-bold text-white focus:outline-none" />
                                                <input value={item.description || ""} onChange={(e) => {
                                                    const newItems = [...formData.agendaItems];
                                                    newItems[idx].description = e.target.value;
                                                    updateFormData({ agendaItems: newItems });
                                                }} placeholder="Description..." className="w-full bg-transparent text-sm text-slate-500 focus:outline-none" />
                                            </div>
                                            <button onClick={() => {
                                                const newItems = formData.agendaItems.filter(i => i.id !== item.id);
                                                updateFormData({ agendaItems: newItems });
                                            }} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400"><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* SPEAKERS TAB */}
                    {activeTab === 'speakers' && (
                        <motion.div
                            key="speakers"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4 h-full overflow-y-auto pr-2 custom-scrollbar"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-white">Speakers ({formData.speakers?.length || 0})</h4>
                                <button onClick={() => updateFormData({ speakers: [...(formData.speakers || []), { id: Date.now(), name: "", role: "", company: "" }] })} className="text-indigo-400 text-xs font-bold hover:underline">+ Add Speaker</button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {formData.speakers.map((spk, idx) => (
                                    <div key={spk.id} className="relative bg-slate-900/50 border border-white/5 p-4 rounded-xl flex gap-3 group">
                                        <button onClick={() => {
                                            const newItems = formData.speakers.filter(s => s.id !== spk.id);
                                            updateFormData({ speakers: newItems });
                                        }} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400"><Trash2 size={14} /></button>

                                        <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center shrink-0">
                                            <User size={20} className="text-slate-500" />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <input value={spk.name} onChange={(e) => {
                                                const newItems = [...formData.speakers];
                                                newItems[idx].name = e.target.value;
                                                updateFormData({ speakers: newItems });
                                            }} placeholder="Name" className="w-full bg-transparent font-bold text-white text-sm focus:outline-none" />
                                            <input value={spk.role} onChange={(e) => {
                                                const newItems = [...formData.speakers];
                                                newItems[idx].role = e.target.value;
                                                updateFormData({ speakers: newItems });
                                            }} placeholder="Role" className="w-full bg-transparent text-xs text-slate-400 focus:outline-none" />
                                            <input value={spk.company} onChange={(e) => {
                                                const newItems = [...formData.speakers];
                                                newItems[idx].company = e.target.value;
                                                updateFormData({ speakers: newItems });
                                            }} placeholder="Company" className="w-full bg-transparent text-xs text-slate-500 focus:outline-none" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* DESCRIPTION TAB */}
                    {activeTab === 'description' && (
                        <motion.div
                            key="description"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="h-full flex flex-col"
                        >
                            <div className="space-y-3 h-full flex flex-col">
                                <label className="text-sm font-medium text-slate-300">Event Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => updateFormData({ description: e.target.value })}
                                    placeholder="AI generates this, edit freely..."
                                    className="w-full h-[500px] p-6 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-base leading-relaxed text-slate-300 custom-scrollbar shadow-inner"
                                />
                            </div>
                        </motion.div>
                    )}

                    {/* KEYWORDS TAB */}
                    {activeTab === 'keywords' && (
                        <motion.div
                            key="keywords"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="h-full space-y-6"
                        >
                            <div className="space-y-2">
                                <h4 className="font-bold text-white">Event Keywords</h4>
                                <p className="text-sm text-slate-400">Add tags to help people find your event.</p>
                            </div>

                            {/* Tag Input */}
                            <div className="flex gap-2">
                                <input
                                    placeholder="Add a keyword (e.g. AI, Tech, Networking)..."
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const val = e.target.value.trim();
                                            if (val && !formData.tags?.includes(val)) {
                                                updateFormData({ tags: [...(formData.tags || []), val] });
                                                e.target.value = '';
                                            }
                                        }
                                    }}
                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all"
                                />
                                <button className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-xl transition-colors">
                                    <Plus size={20} />
                                </button>
                            </div>

                            {/* Tag Cloud */}
                            <div className="flex flex-wrap gap-2">
                                {formData.tags?.map((tag, idx) => (
                                    <span key={idx} className="bg-indigo-500/20 text-indigo-300 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 group border border-indigo-500/20">
                                        #{tag}
                                        <button
                                            onClick={() => updateFormData({ tags: formData.tags.filter(t => t !== tag) })}
                                            className="hover:text-white transition-colors"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </span>
                                ))}
                                {(!formData.tags || formData.tags.length === 0) && (
                                    <span className="text-slate-500 text-sm italic">No keywords added yet.</span>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* COVER TAB */}
                    {activeTab === 'cover' && (
                        <motion.div
                            key="cover"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="h-full space-y-4 overflow-y-auto pr-2 custom-scrollbar"
                        >
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cover Image</label>
                                <span className="text-xs text-indigo-400 font-medium">Recommended: 1280x720px (16:9)</span>
                            </div>

                            {/* Preview Area */}
                            <div className="aspect-video bg-black/40 rounded-xl overflow-hidden relative border border-white/10 group">
                                {formData.imageUrl && !imageError ? (
                                    <>
                                        <img
                                            key={formData.imageUrl}
                                            src={formData.imageUrl}
                                            alt="Cover Preview"
                                            className={`w-full h-full object-cover transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                                            onLoad={() => setImageLoaded(true)}
                                            onError={(e) => {
                                                console.error("Image Load Error:", formData.imageUrl, e);
                                                setImageLoaded(true);
                                                setImageError(true);
                                            }}
                                        />
                                        {!imageLoaded && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-10">
                                                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                                                <p className="text-xs text-indigo-300 font-medium animate-pulse">Painting your masterpiece...</p>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-600 flex-col gap-2">
                                        {imageError ? (
                                            <>
                                                <Trash2 size={32} className="text-red-500/50" />
                                                <span className="text-red-400">Failed to load image</span>
                                                <span className="text-[10px] text-slate-600 max-w-[200px] truncate">{formData.imageUrl}</span>
                                                <button onClick={() => { setImageError(false); updateFormData({ imageUrl: '' }); }} className="text-xs hover:underline text-slate-400">Clear</button>
                                            </>
                                        ) : (
                                            <>
                                                <ImageIcon size={32} />
                                                <span>No Image Set</span>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Manual URL Input */}
                            <div className="space-y-2">
                                <label className="text-xs text-slate-500">Image URL</label>
                                <input
                                    value={formData.imageUrl}
                                    onChange={(e) => updateFormData({ imageUrl: e.target.value })}
                                    placeholder="Paste Image URL..."
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600"
                                />
                            </div>

                            <div className="relative py-2">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-white/10"></div>
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-[#1e1e24] px-2 text-slate-500">Or Upload Custom</span>
                                </div>
                            </div>

                            {/* File Upload Input */}
                            <div className="space-y-2">
                                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-indigo-500/50 hover:bg-white/5 transition-all group relative overflow-hidden">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                                        {isUploading ? (
                                            <div className="flex items-center gap-2 text-indigo-400">
                                                <span className="animate-spin text-xl">◌</span>
                                                <span className="text-sm font-medium">Uploading...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <p className="text-sm text-slate-400 group-hover:text-white transition-colors"><span className="font-bold text-indigo-400">Click to upload</span> or drag and drop</p>
                                                <p className="text-xs text-slate-600">SVG, PNG, JPG (MAX. 5MB)</p>
                                            </>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        disabled={isUploading}
                                        onChange={async (e) => {
                                            const file = e.target.files[0];
                                            if (!file) return;

                                            setIsUploading(true);
                                            try {
                                                const uploadData = new FormData();
                                                uploadData.append('file', file);

                                                const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/upload`, {
                                                    method: 'POST',
                                                    body: uploadData
                                                });

                                                if (!res.ok) throw new Error("Upload Failed");

                                                const data = await res.json();
                                                updateFormData({ imageUrl: data.url });
                                            } catch (err) {
                                                console.error(err);
                                                alert("Update failed: " + err.message);
                                            } finally {
                                                setIsUploading(false);
                                            }
                                        }}
                                    />
                                </label>
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>

            {/* ACTION FOOTER */}
            <div className="flex justify-between pt-4">
                <button
                    onClick={onBack}
                    className="px-6 py-3 rounded-xl text-slate-400 hover:text-white font-bold transition-colors flex items-center gap-2"
                >
                    <ChevronLeft size={18} /> Back
                </button>
                <button
                    onClick={onNext}
                    disabled={isGenerating || (formData.imageUrl && !imageLoaded)}
                    className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
                >
                    {isGenerating ? (
                        <><span className="animate-spin">◌</span> Generating...</>
                    ) : (formData.imageUrl && !imageLoaded) ? (
                        <><span className="animate-spin text-indigo-300">🖌️</span> Painting Image...</>
                    ) : (
                        <>Next Step <ChevronRight size={18} /></>
                    )}
                </button>
            </div>
        </div>
    );
}
