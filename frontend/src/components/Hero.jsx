import { LogoMarquee } from './LogoMarquee';
import { MagneticButton } from './MagneticButton';
import { MouseSpotlight } from './MouseSpotlight';
import { CyclingText } from './CyclingText';
import { ThreeBackground } from './ThreeBackground';

const AnimatedText = ({ text, baseDelay = 0, className = "", useGradient = false }) => {
    return (
        <span className={className}>
            {text.split('').map((char, i) => (
                <span
                    key={i}
                    className="animate-letter inline-block" // Changed to inline-block for proper spacing
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

export const Hero = ({ events = [] }) => {
    return (
        <section className="relative pt-32 pb-24 overflow-hidden">
            <MouseSpotlight />
            <ThreeBackground />

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
                        <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.25em]">Chennai Professional Hub</span>
                    </div>

                    {/* Hero Video - Seamless Integration */}
                    <div className="relative w-full max-w-4xl mx-auto mb-0 reveal group" style={{ animationDelay: '0.2s' }}>
                        {/* The Glowing Backdrop */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>

                        {/* The Video Player Container */}
                        <div className="relative rounded-[1.8rem] shadow-2xl overflow-hidden bg-[#fdfdff] border border-white/20">
                            <video
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="w-full h-auto mix-blend-multiply dark:mix-blend-normal"
                            >
                                <source src="/hero-video-radial.mp4" type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                        </div>
                    </div>

                    <h1 className="text-5xl md:text-8xl font-black text-slate-900 mb-8 leading-[1.2] tracking-tight relative z-20" style={{ perspective: '1200px' }}>
                        <AnimatedText text="Discovery for the" baseDelay={0.2} className="block" />

                        {/* Replaced static Infinite Minded with Cycling Text */}
                        <div className="h-[1.2em] relative flex justify-center">
                            <CyclingText />
                        </div>
                    </h1>

                    <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed reveal" style={{ animationDelay: '1.8s' }}>
                        Unite with 12,000+ top-tier founders and investors. The definitive gateway to South India's business evolution.
                    </p>
                </div>

                {/* CTA Buttons with Magnetic Effect */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 reveal relative z-20" style={{ animationDelay: '2.2s' }}>
                    <MagneticButton strength={40}>
                        <button className="bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-bold px-10 py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all hover:scale-105 btn-bounce flex items-center gap-2 group">
                            Join Hub
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </button>
                    </MagneticButton>

                    <MagneticButton strength={40}>
                        <button className="bg-white text-slate-700 hover:text-indigo-600 text-lg font-bold px-10 py-4 rounded-xl border border-slate-200 hover:border-indigo-100 shadow-sm hover:shadow-md transition-all hover:scale-105 btn-bounce">
                            Explore Events
                        </button>
                    </MagneticButton>
                </div>

                {/* Logo Marquee */}
                <div className="mt-20 pt-8 border-t border-slate-100 reveal relative z-10" style={{ animationDelay: '2.5s' }}>
                    <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">Aggregated from Top Sources</p>
                    <LogoMarquee events={events} />
                </div>
            </div>
        </section>
    );
};
const FilterChip = ({ label, active }) => (
    <button className={`px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all btn-bounce border ${active ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-200 hover:text-indigo-600'
        }`}>
        {label}
    </button>
);
