import React from 'react';

export const LogoMarquee = ({ events = [] }) => {
    // Derive unique sources from events + Default supported list
    const sources = React.useMemo(() => {
        // Base list of all supported aggregators
        const baseSources = [
            'Infinite BZ',
            'AllEvents',
            'Eventbrite',
            'Chennai Trade Centre',
            'Meetup'
        ];

        const uniqueSources = new Set(baseSources);

        // Add any active sources from real events
        if (events && events.length > 0) {
            events.forEach(e => {
                let source = e.raw_data?.source || 'Infinite BZ';

                // Formatting map
                const formatMap = {
                    'trade_centre': 'Chennai Trade Centre',
                    'allevents': 'AllEvents',
                    'eventbrite': 'Eventbrite',
                    'meetup': 'Meetup',
                    'infinite_bz': 'Infinite BZ',
                    'infinitebz': 'Infinite BZ'
                };

                const formatted = formatMap[source.toLowerCase()] ||
                    (source.charAt(0).toUpperCase() + source.slice(1).replace(/_/g, ' '));

                uniqueSources.add(formatted);
            });
        }

        // Convert to array of objects with mapping colors
        return Array.from(uniqueSources).map((name) => ({
            name,
            color: name.toLowerCase().includes('infinite') ? 'text-indigo-600' : 'text-slate-800'
        }));
    }, [events]);

    return (
        <div className="w-full relative overflow-hidden py-10 opacity-50 hover:opacity-100 transition-opacity duration-500 group">
            {/* Gradient Masks for fade effect */}
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#fdfdff] to-transparent z-10"></div>
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#fdfdff] to-transparent z-10"></div>

            <div className="flex w-max animate-marquee gap-20 group-hover:[animation-play-state:paused]">
                {/* Triple duplication for smooth infinite loop */}
                {[...sources, ...sources, ...sources, ...sources].map((logo, idx) => (
                    <div key={idx} className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all duration-300">
                        <span className={`text-xl font-black tracking-widest ${logo.color} whitespace-nowrap uppercase`}>
                            {logo.name}
                        </span>
                    </div>
                ))}
            </div>

            <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-25%); } // Adjusted based on 4x duplication
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
      `}</style>
        </div>
    );
};
