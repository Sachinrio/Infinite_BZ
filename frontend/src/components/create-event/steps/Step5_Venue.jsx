import { MapPin, Globe, Navigation } from 'lucide-react';

export default function Step5_Venue({ formData, updateFormData, onNext, onBack }) {

    // Toggle Mode
    const setMode = (mode) => updateFormData({ mode });

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="text-center space-y-2">
                <h3 className="text-3xl font-bold text-white">Location</h3>
                <p className="text-slate-400">Where will this event take place?</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                <button
                    onClick={() => setMode('offline')}
                    className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 group ${formData.mode === 'offline' ? 'bg-indigo-500/10 border-indigo-500 text-white' : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10'}`}
                >
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-colors ${formData.mode === 'offline' ? 'bg-indigo-500 text-white' : 'bg-black/30 group-hover:bg-black/50'}`}>
                        <MapPin />
                    </div>
                    <span className="font-bold text-lg">In Person</span>
                </button>

                <button
                    onClick={() => setMode('online')}
                    className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 group ${formData.mode === 'online' ? 'bg-indigo-500/10 border-indigo-500 text-white' : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10'}`}
                >
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-colors ${formData.mode === 'online' ? 'bg-indigo-500 text-white' : 'bg-black/30 group-hover:bg-black/50'}`}>
                        <Globe />
                    </div>
                    <span className="font-bold text-lg">Virtual</span>
                </button>
            </div>

            <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8">
                {formData.mode === 'offline' ? (
                    <>
                        <div className="flex-1 space-y-4 animate-in fade-in slide-in-from-top-4">

                            {/* Venue Name */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Venue Name <span className="text-red-400">*</span></label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                                    <input
                                        value={formData.venueName || ""}
                                        onChange={(e) => updateFormData({ venueName: e.target.value })}
                                        placeholder="Venue Name (e.g. Convention Center)"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all text-lg"
                                    />
                                </div>
                            </div>

                            {/* Address 1 & 2 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Address 1 <span className="text-red-400">*</span></label>
                                    <input
                                        placeholder="Address 1"
                                        value={formData.address1 || ""}
                                        onChange={(e) => updateFormData({ address1: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Address 2</label>
                                    <input
                                        placeholder="Address 2"
                                        value={formData.address2 || ""}
                                        onChange={(e) => updateFormData({ address2: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                                    />
                                </div>
                            </div>

                            {/* City, State, Zip */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">City <span className="text-red-400">*</span></label>
                                    <input
                                        placeholder="City"
                                        value={formData.city || ""}
                                        onChange={(e) => updateFormData({ city: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">State</label>
                                    <input
                                        placeholder="e.g. CA"
                                        value={formData.state || ""}
                                        onChange={(e) => updateFormData({ state: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Zip <span className="text-red-400">*</span></label>
                                    <input
                                        placeholder="Zip Code"
                                        value={formData.postalCode || ""}
                                        onChange={(e) => updateFormData({ postalCode: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Country <span className="text-red-400">*</span></label>
                                <select
                                    value={formData.country || "India"}
                                    onChange={(e) => updateFormData({ country: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                                >
                                    <option value="India">India</option>
                                    <option value="USA">USA</option>
                                    <option value="UK">UK</option>
                                    <option value="Canada">Canada</option>
                                    <option value="Australia">Australia</option>
                                </select>
                            </div>

                        </div>

                        {/* MAP PREVIEW */}
                        <div className="flex-1 h-64 md:h-auto min-h-[250px] bg-slate-900 rounded-3xl border border-white/10 overflow-hidden relative group">
                            {/* Placeholder Map - In real app use Google Maps Embed or Leaflet */}
                            <div className="absolute inset-0 bg-[url('https://api.mapbox.com/styles/v1/mapbox/dark-v10/static/80.27,13.08,12,0/600x400?access_token=pk.xxx')] bg-cover bg-center opacity-50 grayscale group-hover:grayscale-0 transition-all"></div>

                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="bg-black/60 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex flex-col items-center text-center">
                                    <Navigation className="text-indigo-400 mb-2" size={24} />
                                    <span className="font-bold text-white text-sm">Venue Location</span>
                                    <span className="text-xs text-slate-400">{formData.location || "Chennai, India"}</span>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="w-full max-w-xl mx-auto space-y-4 animate-in fade-in slide-in-from-top-4">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Meeting Link</label>
                        <div className="relative">
                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                            <input
                                value={formData.meetingLink || ""}
                                onChange={(e) => updateFormData({ meetingLink: e.target.value })}
                                placeholder="Zoom / Google Meet / Teams Link"
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all text-lg"
                            />
                        </div>
                        <p className="text-xs text-slate-500 pl-1">Link will only be visible to registered attendees.</p>

                        <div className="p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex gap-4 items-start">
                            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                                <Globe size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-white text-sm">Virtual Event Tips</h4>
                                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                    Make sure unique meeting links are generated if required.
                                    You can also stream directly to Infinite BZ via RTMP (coming soon).
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-between pt-8 border-t border-white/10">
                <button onClick={onBack} className="px-6 py-3 rounded-xl text-slate-400 hover:text-white font-bold transition-colors">Back</button>
                <button onClick={onNext} className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-600/20">Next Step</button>
            </div>
        </div>
    );
}
