import { useState } from 'react';
import { ArrowRight, CheckCircle2, Calendar, Database, MousePointer2, ChevronDown, ChevronUp, Clock, MapPin, Mail, Phone, MessageSquare, ExternalLink, Search, Infinity, Code, Cpu, Globe, Users, Zap, Briefcase } from 'lucide-react';

const AnimatedText = ({ text, baseDelay = 0, className = "", useGradient = false }) => {
    return (
        <span className={className}>
            {text.split('').map((char, i) => (
                <span
                    key={i}
                    className="animate-letter"
                    style={{ animationDelay: `${baseDelay + i * 0.03}s` }}
                >
                    <span className={useGradient ? 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-blue-600 to-emerald-500 animate-gradient-text' : ''}>
                        {char === ' ' ? '\u00A0' : char}
                    </span>
                </span>
            ))}
        </span>
    );
};

const CategoryCard = ({ icon: Icon, label, count, active, onClick }) => {
    return (
        <div
            onClick={onClick}
            className={`group relative p-6 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden
                ${active
                    ? 'bg-indigo-600/20 border-indigo-500/50 shadow-[0_0_30px_rgba(79,70,229,0.3)]'
                    : 'bg-white/5 border-white/10 hover:border-cyan-400/30 hover:bg-white/10 hover:shadow-[0_0_20px_rgba(34,211,238,0.1)]'
                }`}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative z-10 flex flex-col items-center text-center gap-3">
                <div className={`p-3 rounded-xl transition-colors duration-300 ${active ? 'bg-indigo-500 text-white' : 'bg-white/5 text-cyan-400 group-hover:text-cyan-300 group-hover:scale-110 transform transition-transform'}`}>
                    <Icon size={28} strokeWidth={1.5} />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-white tracking-wide uppercase">{label}</h3>
                    <p className="text-xs text-slate-400 mt-1 font-medium">{count} Events</p>
                </div>
            </div>
        </div>
    );
};

export default function LandingPage({ onNavigate, onLogin, onSignup, events, user }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [locationTerm, setLocationTerm] = useState('Chennai Central'); // Default location
    const [selectedCategory, setSelectedCategory] = useState('');

    // Filter events based on search, location, and category
    const filteredEvents = events.filter(event => {
        const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (event.description && event.description.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesLocation = locationTerm === '' || (event.venue_name && event.venue_name.toLowerCase().includes(locationTerm.toLowerCase())) ||
            (event.venue_address && event.venue_address.toLowerCase().includes(locationTerm.toLowerCase())) ||
            locationTerm === 'Chennai Central'; // Default matches all for now or specific logic
        const matchesCategory = selectedCategory === '' || (event.title.toLowerCase().includes(selectedCategory.toLowerCase())); // Simple category matching via title for now

        return matchesSearch && matchesLocation && matchesCategory;
    });

    // Determine what to show: 
    // If searching/filtering, show all matches. 
    // If no search, show top 3 upcoming.
    const isSearching = searchTerm !== '' || selectedCategory !== '' || (locationTerm !== 'Chennai Central' && locationTerm !== '');
    const eventsToDisplay = isSearching ? filteredEvents : events.slice(0, 3);

    const handleExplore = () => {
        const eventsSection = document.getElementById('events');
        if (eventsSection) {
            eventsSection.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handleChipClick = (label) => {
        if (selectedCategory === label) {
            setSelectedCategory(''); // Toggle off
        } else {
            setSelectedCategory(label);
            setSearchTerm(''); // Optional: clear text search when picking a category
        }
    };

    const categories = [
        { label: 'Founders Dinner', icon: Users, count: 12 },
        { label: 'Investor Demo', icon: Briefcase, count: 8 },
        { label: 'Web3 Coffee', icon: Globe, count: 15 },
        { label: 'Growth Lab', icon: Zap, count: 20 },
        { label: 'Tech Workshops', icon: Code, count: 42 },
        { label: 'AI Summits', icon: Cpu, count: 7 }
    ];

    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-primary-500/30">

            {/* 1. NAVBAR (Deep Contrast Header) */}
            <nav className="fixed w-full z-50 bg-slate-900/95 backdrop-blur-md border-b border-white/10 shadow-lg">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-lg shadow-white/10">
                            <Infinity className="text-primary-500" size={20} strokeWidth={3} />
                        </div>
                        <span className="text-xl font-bold text-white tracking-tight">Infinite BZ</span>
                    </div>

                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/80">
                        <a href="#" className="hover:text-white transition-colors">Home</a>
                        <a href="#about" className="hover:text-white transition-colors">About</a>
                        <a href="#events" className="hover:text-white transition-colors">Events</a>
                        <a href="#contact" className="hover:text-white transition-colors">Contact</a>
                    </div>

                    {/* Login/Signup Buttons */}
                    <div className="flex items-center gap-4">
                        {!user && (
                            <button onClick={() => onLogin()} className="hidden md:block text-sm font-medium text-white hover:text-white/80 transition-colors">
                                Log In
                            </button>
                        )}

                        <button onClick={user ? onLogin : onSignup} className="hidden md:block text-sm font-medium text-white hover:text-white/80 transition-colors">
                            {user ? `Hi, ${user.full_name?.split(' ')[0] || 'User'} (Sign Out)` : 'Sign Up'}
                        </button>

                        {!user && (
                            <button
                                onClick={onSignup}
                                className="bg-primary-500 hover:bg-primary-600 text-slate-900 text-sm font-bold px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-primary-500/20"
                            >
                                Get Started
                            </button>
                        )}
                    </div>
                </div>
            </nav>

            <section className="relative pt-32 pb-24 overflow-hidden">
                {/* Dynamic Background Elements - Animated */}
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] floating-orb"></div>
                <div className="absolute top-1/2 -right-24 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] floating-orb" style={{ animationDelay: '-5s' }}></div>
                <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px] floating-orb" style={{ animationDelay: '-8s' }}></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="max-w-4xl mx-auto text-center mb-16">
                        <div className="inline-flex items-center gap-3 bg-white shadow-xl border border-slate-100 px-5 py-2 rounded-full mb-8 transition-transform hover:scale-105 reveal">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                            </span>
                            <span className="text-slate-900 text-[10px] font-black uppercase tracking-[0.25em]">Chennai Professional Hub</span>
                        </div>

                        <h1 className="text-5xl md:text-8xl font-black text-white mb-8 leading-[1.2] tracking-tight" style={{ perspective: '1200px' }}>
                            <AnimatedText text="Discovery for the" baseDelay={0.2} className="block text-white" />
                            <AnimatedText
                                text="Infinite Minded."
                                baseDelay={0.8}
                                useGradient={true}
                                className="block"
                            />
                        </h1>

                        <p className="text-xl text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed reveal" style={{ animationDelay: '1.8s' }}>
                            Unite with 12,000+ top-tier founders and investors. The definitive gateway to South India's business evolution.
                        </p>
                    </div>

                    {/* Discovery Engine */}
                    <div className="max-w-5xl mx-auto reveal" style={{ animationDelay: '2.2s' }}>
                        <div className="glass-card p-2 rounded-[2.5rem] shadow-[0_32px_80px_-24px_rgba(79,70,229,0.15)] group transition-all duration-500 hover:shadow-[0_32px_80px_-16px_rgba(79,70,229,0.2)]">
                            <div className="flex flex-col md:flex-row items-stretch gap-2">
                                <div className="flex-1 flex flex-col justify-center px-8 py-4 border-r border-slate-100/10 last:border-0 hover:bg-slate-800/50 transition-colors rounded-3xl group/field">
                                    <label className="text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest group-focus-within/field:text-indigo-600 transition-colors">Interest</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. SaaS, Fintech"
                                        className="bg-transparent border-none p-0 focus:ring-0 text-white font-extrabold text-lg placeholder-slate-600 w-full"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>

                                <div className="flex-1 flex flex-col justify-center px-8 py-4 border-r border-slate-100/10 last:border-0 hover:bg-slate-800/50 transition-colors rounded-3xl group/field">
                                    <label className="text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest group-focus-within/field:text-indigo-600 transition-colors">Location</label>
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 text-indigo-500 animate-bounce">
                                            <MapPin strokeWidth={2.5} size={20} />
                                        </div>
                                        <input
                                            type="text"
                                            defaultValue="Chennai Central"
                                            value={locationTerm}
                                            onChange={(e) => setLocationTerm(e.target.value)}
                                            className="bg-transparent border-none p-0 focus:ring-0 text-white font-extrabold text-lg w-full"
                                        />
                                    </div>
                                </div>

                                <button onClick={handleExplore} className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-12 py-6 rounded-[1.8rem] transition-all btn-bounce shadow-xl shadow-indigo-200 flex items-center justify-center gap-3 group">
                                    Explore Hub
                                    <ArrowRight className="w-6 h-6 transform group-hover:translate-x-1 transition-transform" strokeWidth={3} />
                                </button>
                            </div>
                        </div>

                        {/* Glass-Holo Category Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 perspective-1000 mt-16">
                            {categories.map((cat, idx) => (
                                <CategoryCard
                                    key={idx}
                                    icon={cat.icon}
                                    label={cat.label}
                                    count={cat.count}
                                    active={selectedCategory === cat.label}
                                    onClick={() => handleChipClick(cat.label)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. STATS (Glassy Light) */}
            <section className="border-y border-white/10 bg-white/10 backdrop-blur-md py-12">
                <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
                    {[
                        { label: 'Platforms Aggregated', val: '15+', icon: Database },
                        { label: 'Events Listed Monthly', val: '500+', icon: Calendar },
                        { label: 'Fast Registration', val: '3 sec', icon: Clock },
                    ].map((stat, idx) => (
                        <div key={idx} className="flex items-center gap-4 justify-center md:justify-start">
                            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white">
                                <stat.icon size={24} />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-white">{stat.val}</div>
                                <div className="text-sm text-white/60 uppercase tracking-widest font-semibold">{stat.label}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 3.5 HOW IT WORKS (New Section) */}
            <section className="py-24 px-6 bg-[#0B1221]">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">How It Works</h2>
                        <p className="text-white/60">Get started in 3 simple steps. No complicated signups.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-12 relative">
                        {/* Connecting Line (Desktop) */}
                        <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-red-500/0 via-primary-500/50 to-red-500/0 border-t border-dashed border-white/20"></div>

                        {[
                            { step: "01", title: "Choose Your City", desc: "Select Chennai (more coming soon) to see local tech events.", icon: MapPin },
                            { step: "02", title: "Browse Events", desc: "Filter by free, paid, startup, or networking categories.", icon: Search },
                            { step: "03", title: "Register & Attend", desc: "Click through to the official page and secure your spot.", icon: ExternalLink }
                        ].map((item, i) => (
                            <div key={i} className="relative flex flex-col items-center text-center">
                                <div className="w-24 h-24 rounded-2xl bg-[#1A2338] border border-white/10 flex items-center justify-center text-primary-500 mb-6 relative z-10 shadow-xl shadow-black/50 group hover:-translate-y-2 transition-transform duration-300">
                                    <item.icon size={32} />
                                    <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-primary-500 text-slate-900 font-bold flex items-center justify-center text-sm border-2 border-slate-900">
                                        {item.step}
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                                <p className="text-white/60 leading-relaxed max-w-xs">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 4. WHY CHOOSE US (Glassy Light Continued) */}
            <section id="about" className="py-24 px-6 relative overflow-hidden bg-transparent">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Why Choose Us?</h2>
                        <p className="text-white/80">We aggregate data from multiple sources so you don't have to search manually.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { title: 'Unified Feed', desc: 'No more tab switching. View all Meetup, Eventbrite, and Luma events in one dashboard.', icon: Database },
                            { title: 'Curated Data', desc: 'We clean and verify data. No more broken links or outdated event times.', icon: CheckCircle2 },
                            { title: '1-Click Register', desc: 'Jump straight to the registration page. No login walls on our end.', icon: MousePointer2 },
                        ].map((item, i) => (
                            <div key={i} className="p-8 rounded-2xl bg-white/10 border border-white/10 hover:border-primary-500/30 hover:bg-white/15 transition-all group backdrop-blur-sm">
                                <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center text-white mb-6 group-hover:bg-primary-500 group-hover:text-slate-900 transition-all">
                                    <item.icon size={28} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                                <p className="text-white/70 leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 5. UPCOMING EVENTS (DYNAMIC) */}
            <section id="events" className="py-24 px-6 bg-slate-900/30">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-end mb-12">
                        <div>
                            <h2 className="text-3xl font-bold text-white mb-2">
                                {isSearching ? `Found ${eventsToDisplay.length} Matches` : 'Upcoming in Chennai'}
                            </h2>
                            <p className="text-slate-400">
                                {isSearching ? 'Events matching your search criteria.' : "Don't miss out on these popular events."}
                            </p>
                        </div>
                        <button onClick={onNavigate} className="text-sky-400 font-semibold hover:text-sky-300 flex items-center gap-2">
                            View All Events <ArrowRight size={16} />
                        </button>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {eventsToDisplay.length > 0 ? eventsToDisplay
                            .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
                            .map(event => (
                                <div key={event.id} className="group bg-slate-900 rounded-xl overflow-hidden border border-white/5 hover:border-sky-500/50 hover:shadow-xl hover:shadow-sky-500/10 transition-all hover:-translate-y-1">
                                    <div className="h-48 bg-slate-800 relative overflow-hidden">
                                        {event.image_url ? (
                                            <img src={event.image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-slate-600 bg-slate-800">
                                                <Calendar size={32} opacity={0.2} />
                                            </div>
                                        )}
                                        <div className="absolute top-3 right-3 bg-slate-950/90 px-3 py-1 rounded-full text-xs font-bold text-sky-400 border border-sky-500/20 backdrop-blur-sm">
                                            {event.is_free ? 'FREE' : 'PAID'}
                                        </div>
                                    </div>

                                    <div className="p-5 flex-1 flex flex-col h-full">
                                        <h3 className="text-lg font-bold text-white mb-3 line-clamp-2 min-h-[3.5rem] leading-tight" title={event.title}>{event.title}</h3>

                                        <div className="space-y-3 text-sm text-slate-400 mb-6 flex-1">
                                            <div className="flex items-center gap-3">
                                                <div className="p-1.5 bg-slate-800 rounded-lg text-sky-500">
                                                    <Calendar size={14} />
                                                </div>
                                                <span className="font-medium text-slate-300">
                                                    {new Date(event.start_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="p-1.5 bg-slate-800 rounded-lg text-sky-500">
                                                    <MapPin size={14} />
                                                </div>
                                                <span className="line-clamp-1">{event.venue_name}</span>
                                            </div>
                                        </div>

                                        <button onClick={() => window.open(event.url, '_blank')} className="w-full bg-slate-800 hover:bg-sky-600 hover:text-white text-slate-200 font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 group-hover:shadow-lg">
                                            <span>Register Now</span>
                                            <ExternalLink size={16} />
                                        </button>
                                    </div>
                                </div>
                            )) : (
                            <div className="col-span-3 text-center py-12 text-slate-500">
                                {isSearching ? 'No events found matching your criteria.' : 'Loading events...'}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* 6. TESTIMONIALS */}
            <section className="py-24 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-white">Loved by Chennai's Tech Scene</h2>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {[
                            { quote: "Finally a unified list. I used to check 3 different sites every Friday. This saved me so much time.", author: "Arjun K.", role: "Product Manager" },
                            { quote: "The curated data is actually accurate. Finding free networking events properly categorized is a game changer.", author: "Priya S.", role: "Freelance Developer" }
                        ].map((t, i) => (
                            <div key={i} className="bg-slate-900 p-8 rounded-2xl border border-white/5 relative">
                                <div className="text-sky-500 text-4xl font-serif absolute top-6 left-6">"</div>
                                <p className="text-lg text-slate-300 italic mb-6 pl-6 relative z-10">{t.quote}</p>
                                <div className="flex items-center gap-4 pl-6">
                                    <div className="w-10 h-10 rounded-full bg-slate-700" />
                                    <div>
                                        <div className="text-white font-bold">{t.author}</div>
                                        <div className="text-xs text-slate-500">{t.role}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 7. FAQ */}
            <section className="py-24 px-6 bg-slate-900/30">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-3xl font-bold text-white text-center mb-12">Frequently Asked Questions</h2>
                    <div className="space-y-4">
                        {[
                            { q: "Is this platform really free?", a: "Yes! Use the aggregator for free. We might add premium features for organizers later." },
                            { q: "How often are events updated?", a: "We scrape new events daily at 8:00 AM, ensuring you have the latest info." },
                            { q: "Can I post my own event?", a: "Currently we only aggregate. A 'Submit Event' feature is coming soon." }
                        ].map((faq, i) => (
                            <details key={i} className="group bg-slate-900 rounded-xl overflow-hidden border border-white/5">
                                <summary className="flex items-center justify-between p-6 cursor-pointer font-semibold text-white hover:bg-white/5 transition-colors">
                                    {faq.q}
                                    <ChevronDown className="group-open:rotate-180 transition-transform text-slate-500" />
                                </summary>
                                <div className="px-6 pb-6 text-slate-400">
                                    {faq.a}
                                </div>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* 8. FOOTER / CONTACT */}
            <footer id="contact" className="py-20 px-6 bg-[#050911] border-t border-white/5">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-6">Get in touch</h2>
                        <p className="text-slate-400 mb-8">Have questions? Want to feature your community? Drop us a line.</p>

                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-sky-500"><Mail size={20} /></div>
                                <div>
                                    <div className="text-white font-semibold">Email Us</div>
                                    <div className="text-sm text-slate-500">hello@infinitebz.com</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-sky-500"><MessageSquare size={20} /></div>
                                <div>
                                    <div className="text-white font-semibold">Help Center</div>
                                    <div className="text-sm text-slate-500">Call support available 9-5</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900 p-8 rounded-2xl border border-white/5">
                        <form className="space-y-4" onSubmit={async (e) => {
                            e.preventDefault();
                            const btn = e.target.querySelector('button');
                            const originalText = btn.innerText;
                            btn.innerText = 'Sending...';
                            btn.disabled = true;

                            const formData = {
                                first_name: e.target.first_name.value,
                                last_name: e.target.last_name.value,
                                email: e.target.email.value,
                                message: e.target.message.value
                            };

                            try {
                                const baseUrl = import.meta.env.VITE_API_URL || '';
                                const res = await fetch(`${baseUrl}/api/v1/contact`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(formData)
                                });

                                if (res.ok) {
                                    alert("Message sent! We'll get back to you soon.");
                                    e.target.reset();
                                } else {
                                    throw new Error("Failed to send");
                                }
                            } catch (err) {
                                console.error(err);
                                alert("Failed to send message. Please try again.");
                            } finally {
                                btn.innerText = originalText;
                                btn.disabled = false;
                            }
                        }}>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400">FIRST NAME</label>
                                    <input name="first_name" required type="text" className="w-full bg-[#0B1221] border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sky-500 transition-colors" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400">LAST NAME</label>
                                    <input name="last_name" required type="text" className="w-full bg-[#0B1221] border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sky-500 transition-colors" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400">EMAIL</label>
                                <input name="email" required type="email" className="w-full bg-[#0B1221] border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sky-500 transition-colors" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400">MESSAGE</label>
                                <textarea name="message" required rows={4} className="w-full bg-[#0B1221] border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sky-500 transition-colors"></textarea>
                            </div>
                            <button className="w-full bg-sky-500 hover:bg-sky-400 text-white font-bold py-4 rounded-lg transition-colors shadow-lg shadow-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
                                Send Message
                            </button>
                        </form>
                    </div>
                </div>

                <div className="border-t border-white/5 mt-20 pt-8 text-center text-sm text-slate-600">
                    © 2024 Infinite BZ. All rights reserved.
                </div>
            </footer>

            {/* CTA Bottom */}
            <section className="bg-sky-500 py-16 px-6 text-center">
                <h2 className="text-3xl font-bold text-white mb-4">Ready to expand your network?</h2>
                <p className="text-white/80 mb-8 max-w-xl mx-auto">Join 500+ professionals in Chennai and never miss an opportunity.</p>
                <div className="flex justify-center gap-4">
                    <button onClick={onSignup} className="bg-white text-sky-600 font-bold px-8 py-3 rounded-lg shadow-xl hover:bg-slate-100 transition-colors">Get Started Free</button>
                </div>
            </section>
        </div>
    )
}
