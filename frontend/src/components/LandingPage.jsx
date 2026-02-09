import React, { useRef, useState } from 'react';
import { toPng } from 'https://esm.sh/html-to-image';
import { Header } from './Header';
import { Hero } from './Hero';
import { StrategicOpportunities } from './StrategicOpportunities';
import { CategoriesGrid } from './CategoriesGrid';
import { Testimonials } from './Testimonials';
import { CTASection } from './CTASection';
import { Footer } from './Footer';
import { AIInsights } from './AIInsights';
import { IntroAnimation } from './IntroAnimation';

// LandingPage component replaces the old design with the new component-based architecture
export default function LandingPage({ onNavigate, onLogin, onSignup, events, user }) {
    const rootRef = useRef(null);
    const [showIntro, setShowIntro] = useState(false);

    const exportPageAsPng = async () => {
        if (rootRef.current === null) return;
        try {
            const dataUrl = await toPng(rootRef.current, { cacheBust: true, backgroundColor: '#fdfdff' });
            const link = document.createElement('a');
            link.download = 'infinite-bz-snapshot.png';
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Export failed', err);
        }
    };

    return (
        <>
            {showIntro && <IntroAnimation onComplete={() => setShowIntro(false)} />}
            <div ref={rootRef} className={`landing-page-mode flex flex-col min-h-screen transition-opacity duration-1000 ${showIntro ? 'opacity-0 overflow-hidden h-screen' : 'opacity-100'}`}>
                {/* Header with login/signup props passed from parent */}
                <Header onExport={exportPageAsPng} onLogin={onLogin} onSignup={onSignup} />

                <main className="flex-grow">
                    <Hero events={events} />

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                        {/* Section Header: Categories */}
                        <div className="mb-12 reveal" style={{ animationDelay: '0.2s' }}>
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-sm font-black uppercase tracking-[0.2em] text-indigo-500 mb-2">Industries</h2>
                                    <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">Browse Chennai's Core Hubs</h3>
                                </div>
                            </div>
                            <CategoriesGrid events={events} />
                        </div>

                        <div className="flex flex-col lg:flex-row gap-16 mt-24">
                            {/* Primary Feed */}
                            <div className="flex-1 space-y-24 reveal" style={{ animationDelay: '0.4s' }}>
                                <section>
                                    <div className="flex items-end justify-between mb-12 border-b border-slate-100 pb-6">
                                        <div>
                                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Strategic Matches</h2>
                                            <p className="text-slate-500 font-medium mt-1">Founders, capital, and talent tuned to your goals.</p>
                                        </div>
                                    </div>
                                    <StrategicOpportunities events={events} />
                                </section>

                                <Testimonials />
                            </div>

                            {/* Side-Scout Panel */}
                            <aside className="lg:w-96 space-y-12 reveal" style={{ animationDelay: '0.6s' }}>
                                <div className="sticky top-28 space-y-12">
                                    <AIInsights />

                                    <div className="glass-card p-8 rounded-[2.5rem] relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors"></div>
                                        <h3 className="font-black text-slate-900 mb-6 flex items-center gap-3">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)] animate-pulse"></span>
                                            Hub Pulse
                                        </h3>
                                        <div className="space-y-6">
                                            <PulseItem label="Founders Active" value={(events?.reduce((acc, e) => acc + (e.capacity || 50), 0) + 1200).toLocaleString()} trend="+12" />
                                            <PulseItem label="Open Grants" value="₹4.2 Cr" trend="New" isSpecial />
                                            <PulseItem label="Meetup Nodes" value={events?.length || 24} trend={events?.length > 20 ? "+5" : "+2"} />
                                        </div>
                                    </div>

                                    <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-200/20 group relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-cyan-500"></div>
                                        <h4 className="text-2xl font-black mb-4 group-hover:text-indigo-400 transition-colors">Host a Summit</h4>
                                        <p className="text-slate-400 text-sm mb-8 leading-relaxed font-medium">Connect your brand with Chennai's fastest-growing venture community.</p>
                                        <button onClick={onSignup} className="bg-white text-slate-950 px-8 py-4 rounded-2xl font-black text-sm hover:bg-indigo-500 hover:text-white transition-all btn-bounce w-full">
                                            Create Event
                                        </button>
                                    </div>
                                </div>
                            </aside>
                        </div>
                    </div>

                    <CTASection />
                </main>

                <Footer />
            </div>
        </>
    );
}

const PulseItem = ({ label, value, trend, isSpecial }) => (
    <div className="flex justify-between items-center group cursor-default">
        <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-0.5">{label}</p>
            <p className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{value}</p>
        </div>
        <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter ${isSpecial ? 'bg-indigo-600 text-white' : trend.includes('+') ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
            }`}>
            {trend}
        </span>
    </div>
);
