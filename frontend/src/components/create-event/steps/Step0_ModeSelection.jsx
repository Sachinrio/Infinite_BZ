import { Pencil, Sparkles, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Step0_ModeSelection({ onSelectMode }) {
    return (
        <div className="flex flex-col items-center justify-center h-full min-h-[500px]">
            <div className="text-center mb-12 space-y-3">
                <h2 className="text-4xl font-bold text-white tracking-tight">How do you want to build your event?</h2>
                <p className="text-slate-400 text-lg">Choose the best way to get started.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                {/* MANUAL MODE */}
                <motion.button
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelectMode('manual')}
                    className="flex flex-col items-center justify-center p-10 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group text-center space-y-6"
                >
                    <div className="w-20 h-20 rounded-2xl bg-slate-800 flex items-center justify-center group-hover:bg-slate-700 transition-colors shadow-xl">
                        <Pencil size={32} className="text-slate-200" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-bold text-white">Start from scratch</h3>
                        <p className="text-slate-400 leading-relaxed px-4">Add all your event details manually, create custom tickets, and set up specific schedules.</p>
                    </div>
                    <div className="flex items-center text-indigo-400 font-bold group-hover:translate-x-1 transition-transform">
                        Build Manually <ChevronRight size={18} />
                    </div>
                </motion.button>

                {/* AI MODE */}
                <motion.button
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelectMode('ai')}
                    className="flex flex-col items-center justify-center p-10 rounded-3xl bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/20 hover:border-indigo-500/50 transition-all group text-center space-y-6 relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity blur-3xl"></div>

                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 relative z-10">
                        <Sparkles size={32} className="text-white animate-pulse" />
                    </div>
                    <div className="space-y-2 relative z-10">
                        <h3 className="text-2xl font-bold text-white">Create with AI</h3>
                        <p className="text-indigo-200/70 leading-relaxed px-4">Answer a few quick questions to generate an event that's ready to publish instantly.</p>
                    </div>
                    <div className="flex items-center text-white font-bold group-hover:translate-x-1 transition-transform relative z-10">
                        Use AI Magic <ChevronRight size={18} />
                    </div>
                </motion.button>
            </div>
        </div>
    );
}
