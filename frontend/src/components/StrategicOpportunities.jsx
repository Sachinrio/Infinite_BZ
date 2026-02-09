
import React, { useRef } from 'react';
import { toPng } from 'https://esm.sh/html-to-image';

export const StrategicOpportunities = ({ events = [] }) => {
    // Map real events to opportunity format
    const opportunities = (events || []).slice(0, 4).map(event => ({
        id: event.id,
        title: event.title,
        // Mocking some matchmaking data for now as backend doesn't provide it yet
        matchScore: 85 + Math.floor(Math.random() * 14),
        rating: (4.5 + Math.random() * 0.4).toFixed(1),
        location: event.venue_name || 'Chennai Hub',
        date: new Date(event.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        attendees: event.capacity || 100,
        image: event.image_url || `https://images.unsplash.com/photo-1540575861501-7ad05823c9f5?q=80&w=2070&auto=format&fit=crop`,
        isTrending: (event.capacity || 0) > 100
    }));

    if (opportunities.length === 0) {
        return <div className="text-slate-500">No strategic matches found at the moment.</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16">
            {opportunities.map((opp, idx) => (
                <OpportunityCard key={opp.id} opp={opp} idx={idx} />
            ))}
        </div>
    );
};

const OpportunityCard = ({ opp, idx }) => {
    const cardRef = useRef(null);

    const downloadAsPng = async (e) => {
        e.stopPropagation();
        if (cardRef.current === null) return;
        try {
            const dataUrl = await toPng(cardRef.current, { cacheBust: true, backgroundColor: '#ffffff', pixelRatio: 2 });
            const link = document.createElement('a');
            link.download = `event-${opp.id}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Failed to export card', err);
        }
    };

    return (
        <div ref={cardRef} className="group cursor-pointer flex flex-col reveal bg-white rounded-[2.5rem]" style={{ animationDelay: `${0.2 + idx * 0.1}s` }}>
            <div className="relative aspect-[16/10] overflow-hidden rounded-[2.5rem] mb-8 bg-slate-100 border border-slate-100 shadow-sm transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-indigo-500/20 group-hover:-translate-y-2">
                <img
                    src={opp.image}
                    className="w-full h-full object-cover transition-transform duration-[4s] ease-out group-hover:scale-125 group-hover:rotate-1"
                    alt={opp.title}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                <div className="absolute top-6 left-6 flex gap-2">
                    <span className={`px-4 py-2 rounded-2xl text-[10px] font-black tracking-widest uppercase shadow-2xl backdrop-blur-xl transition-all group-hover:scale-110 ${opp.isTrending ? 'bg-orange-500 text-white' : 'bg-white/95 text-slate-900'
                        }`}>
                        {opp.isTrending ? '🔥 Hot Ticket' : 'Curated'}
                    </span>
                </div>

                <div className="absolute top-6 right-6 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110">
                    <div className="w-14 h-14 rounded-2xl bg-white/95 backdrop-blur-md flex flex-col items-center justify-center shadow-2xl border border-white/50 group/match">
                        <span className="text-[10px] font-black text-slate-400 leading-none mb-1">MATCH</span>
                        <span className="text-lg font-black text-indigo-600 leading-none">{opp.matchScore}%</span>
                    </div>
                </div>

                <div className="absolute bottom-6 left-6 right-6 translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                    <button
                        onClick={downloadAsPng}
                        className="w-full bg-white text-indigo-600 py-4 rounded-2xl font-black text-sm hover:bg-indigo-600 hover:text-white transition-all btn-bounce shadow-2xl flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Save as Intel
                    </button>
                </div>
            </div>

            <div className="flex flex-col flex-1 px-4 pb-4">
                <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-black text-indigo-600 uppercase tracking-widest transition-all group-hover:translate-x-1">{opp.date}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                    <span className="text-xs font-bold text-slate-400 group-hover:text-slate-600">Limited Capacity</span>
                </div>

                <h3 className="text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors mb-4 leading-tight tracking-tight">
                    {opp.title}
                </h3>

                <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-100 group-hover:border-indigo-100 transition-colors">
                    <div className="flex items-center gap-2">
                        <div className="flex -space-x-3 transition-all group-hover:-space-x-1">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="relative">
                                    <img src={`https://i.pravatar.cc/100?u=${opp.id}${i}`} className="w-8 h-8 rounded-xl border-2 border-white shadow-sm transition-transform hover:scale-125 hover:z-10" alt="Attendee" />
                                    <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${i === 1 ? 'bg-emerald-500 animate-pulse' : i === 2 ? 'bg-indigo-500' : 'bg-slate-500'}`}></span>
                                </div>
                            ))}
                        </div>
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">{opp.attendees}+ Hubbed</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 group-hover:bg-amber-50 group-hover:border-amber-100 transition-all">
                        <span className="text-xs font-black text-slate-900">{opp.rating}</span>
                        <svg className="w-3.5 h-3.5 text-amber-500 fill-current animate-pulse" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3-.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    </div>
                </div>
            </div>
        </div>
    );
};
