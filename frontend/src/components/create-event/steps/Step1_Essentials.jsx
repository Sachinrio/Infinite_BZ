import { Type, Calendar, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Step1_Essentials({ formData, updateFormData, onNext }) {

    const isValid = formData.title && formData.startDate && formData.endDate;

    // Helper to parse 24h time string to 12h parts
    const parseTime = (timeStr) => {
        if (!timeStr) return { hour: '12', minute: '00', period: 'AM' };
        const [h, m] = timeStr.split(':').map(Number);
        const period = h >= 12 ? 'PM' : 'AM';
        const hour = h % 12 || 12;
        return { hour: String(hour).padStart(2, '0'), minute: String(m).padStart(2, '0'), period };
    };

    // Helper to update 24h time in formData
    const handleTimeChange = (field, part, value) => {
        const current = parseTime(formData[field]);
        const newParts = { ...current, [part]: value };

        let h = parseInt(newParts.hour);
        if (newParts.period === 'PM' && h !== 12) h += 12;
        if (newParts.period === 'AM' && h === 12) h = 0;

        const time24 = `${String(h).padStart(2, '0')}:${newParts.minute}`;
        updateFormData({ [field]: time24 });
    };

    const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
    const minutes = Array.from({ length: 4 }, (_, i) => String(i * 15).padStart(2, '0')); // 00, 15, 30, 45

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="text-center space-y-2">
                <h3 className="text-3xl font-bold text-white">The Essentials</h3>
                <p className="text-slate-400">Let's start with the core details of your event.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* LEFT COL: Title & Category */}
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Event Title <span className="text-red-400">*</span></label>
                        <div className="relative group">
                            <Type className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
                            <input
                                autoFocus
                                value={formData.title}
                                onChange={(e) => updateFormData({ title: e.target.value })}
                                placeholder="e.g. Future of AI Summit 2026"
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium text-lg"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Category</label>
                        <select
                            value={formData.category}
                            onChange={(e) => updateFormData({ category: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-indigo-500/50 transition-all appearance-none cursor-pointer"
                        >
                            <option className="bg-slate-900 text-white">Conference</option>
                            <option className="bg-slate-900 text-white">Seminar</option>
                            <option className="bg-slate-900 text-white">Workshop</option>
                            <option className="bg-slate-900 text-white">Webinar</option>
                            <option className="bg-slate-900 text-white">Meetup</option>
                            <option className="bg-slate-900 text-white">Hackathon</option>
                            <option className="bg-slate-900 text-white">Business</option>
                            <option className="bg-slate-900 text-white">Technology</option>
                            <option className="bg-slate-900 text-white">Startup</option>
                            <option className="bg-slate-900 text-white">Music</option>
                            <option className="bg-slate-900 text-white">Sports</option>
                            <option className="bg-slate-900 text-white">Arts</option>
                            <option className="bg-slate-900 text-white">Networking</option>
                            <option className="bg-slate-900 text-white">Education</option>
                        </select>
                    </div>


                </div>

                {/* RIGHT COL: Date, Time, Image */}
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">When <span className="text-red-400">*</span></label>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Start Date</label>
                                    <input
                                        type="date"
                                        min={new Date().toISOString().split('T')[0]}
                                        value={formData.startDate}
                                        onChange={(e) => updateFormData({ startDate: e.target.value })}
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">End Date</label>
                                    <input
                                        type="date"
                                        min={new Date().toISOString().split('T')[0]}
                                        value={formData.endDate}
                                        onChange={(e) => updateFormData({ endDate: e.target.value })}
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Start Time</label>
                                    <div className="flex gap-1">
                                        <select
                                            value={parseTime(formData.startTime).hour}
                                            onChange={(e) => handleTimeChange('startTime', 'hour', e.target.value)}
                                            className="bg-slate-900/50 border border-white/10 rounded-lg px-2 py-2 text-white text-sm focus:border-indigo-500 outline-none flex-1 appearance-none text-center"
                                        >
                                            {hours.map(h => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                        <span className="text-white self-center">:</span>
                                        <select
                                            value={parseTime(formData.startTime).minute}
                                            onChange={(e) => handleTimeChange('startTime', 'minute', e.target.value)}
                                            className="bg-slate-900/50 border border-white/10 rounded-lg px-2 py-2 text-white text-sm focus:border-indigo-500 outline-none flex-1 appearance-none text-center"
                                        >
                                            {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                        <select
                                            value={parseTime(formData.startTime).period}
                                            onChange={(e) => handleTimeChange('startTime', 'period', e.target.value)}
                                            className="bg-slate-900/50 border border-white/10 rounded-lg px-2 py-2 text-white text-sm focus:border-indigo-500 outline-none flex-1 appearance-none text-center"
                                        >
                                            <option value="AM">AM</option>
                                            <option value="PM">PM</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">End Time</label>
                                    <div className="flex gap-1">
                                        <select
                                            value={parseTime(formData.endTime).hour}
                                            onChange={(e) => handleTimeChange('endTime', 'hour', e.target.value)}
                                            className="bg-slate-900/50 border border-white/10 rounded-lg px-2 py-2 text-white text-sm focus:border-indigo-500 outline-none flex-1 appearance-none text-center"
                                        >
                                            {hours.map(h => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                        <span className="text-white self-center">:</span>
                                        <select
                                            value={parseTime(formData.endTime).minute}
                                            onChange={(e) => handleTimeChange('endTime', 'minute', e.target.value)}
                                            className="bg-slate-900/50 border border-white/10 rounded-lg px-2 py-2 text-white text-sm focus:border-indigo-500 outline-none flex-1 appearance-none text-center"
                                        >
                                            {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                        <select
                                            value={parseTime(formData.endTime).period}
                                            onChange={(e) => handleTimeChange('endTime', 'period', e.target.value)}
                                            className="bg-slate-900/50 border border-white/10 rounded-lg px-2 py-2 text-white text-sm focus:border-indigo-500 outline-none flex-1 appearance-none text-center"
                                        >
                                            <option value="AM">AM</option>
                                            <option value="PM">PM</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Timezone</label>
                        <div className="relative group">
                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
                            <select
                                value={formData.timezone}
                                onChange={(e) => updateFormData({ timezone: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-indigo-500/50 transition-all appearance-none cursor-pointer"
                            >
                                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                                <option value="UTC">UTC</option>
                                <option value="America/New_York">America/New_York (EST)</option>
                            </select>
                        </div>
                    </div>


                </div>
            </div>

            <div className="flex justify-end pt-8">
                <button
                    onClick={onNext}
                    disabled={!isValid}
                    className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20"
                >
                    Next Step
                </button>
            </div>
        </div>
    );
}
