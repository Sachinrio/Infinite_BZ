import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

// Categories are now derived from props

const TiltCard = ({ category, index }) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseX = useSpring(x, { stiffness: 500, damping: 100 });
    const mouseY = useSpring(y, { stiffness: 500, damping: 100 });

    const rotateX = useTransform(mouseY, [-0.5, 0.5], ["17.5deg", "-17.5deg"]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-17.5deg", "17.5deg"]);

    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseXFromCenter = e.clientX - rect.left - width / 2;
        const mouseYFromCenter = e.clientY - rect.top - height / 2;
        x.set(mouseXFromCenter / width);
        y.set(mouseYFromCenter / height);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.div
            style={{
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
            }}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="relative group cursor-pointer shrink-0 w-32 h-40 perspective-1000"
        >
            <div
                className="absolute inset-0 bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/20 shadow-xl transition-all duration-300 group-hover:bg-white/20 group-hover:shadow-indigo-500/20 group-hover:border-indigo-500/30"
                style={{ transform: "translateZ(0px)" }}
            >
                {/* Shimmer Effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2rem] pointer-events-none" />
            </div>

            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4" style={{ transform: "translateZ(50px)" }}>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-white/10 flex items-center justify-center text-indigo-600 group-hover:text-white group-hover:from-indigo-600 group-hover:to-indigo-500 transition-colors duration-300 shadow-sm group-hover:shadow-lg group-hover:shadow-indigo-500/40">
                    <CategoryIcon type={category.icon} />
                </div>

                <div className="text-center">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-800 block mb-1 group-hover:text-indigo-900">{category.name}</span>
                    <span className="text-[9px] font-bold text-slate-500 bg-white/50 px-2 py-0.5 rounded-full backdrop-blur-sm group-hover:bg-white/80 group-hover:text-indigo-600 transition-colors">
                        {category.eventCount} Apps
                    </span>
                </div>
            </div>
        </motion.div>
    );
};

const DEFAULT_CATEGORIES = [
    { name: 'SaaS', eventCount: 42, icon: 'cloud' },
    { name: 'Invest', eventCount: 30, icon: 'trending-up' },
    { name: 'Founders', eventCount: 18, icon: 'users' },
    { name: 'Capital', eventCount: 25, icon: 'pie-chart' },
    { name: 'Web3', eventCount: 12, icon: 'cube' },
    { name: 'HR Tech', eventCount: 8, icon: 'user-group' },
    { name: 'Fintech', eventCount: 15, icon: 'credit-card' },
];

export const CategoriesGrid = ({ events = [] }) => {
    // Derive categories from events, but keep defaults as baseline
    const categories = React.useMemo(() => {
        // 1. Create a map from defaults for easy lookup/update
        const catMap = new Map();
        DEFAULT_CATEGORIES.forEach(cat => {
            catMap.set(cat.name.toLowerCase(), { ...cat });
        });

        // 2. Process real events
        if (events && events.length > 0) {
            events.forEach(event => {
                const catName = event.category || 'Business';
                const key = catName.toLowerCase();

                // If exists (even as default), increment count. 
                // Note: For defaults, we might want to just ADD to the mock count or replace it.
                // Let's just increment to show "aliveness" on top of baseline.
                if (catMap.has(key)) {
                    const existing = catMap.get(key);
                    existing.eventCount = (existing.eventCount || 0) + 1;
                } else {
                    // New category from DB
                    catMap.set(key, {
                        name: catName,
                        eventCount: 1,
                        icon: getIconForCategory(catName)
                    });
                }
            });
        }

        // 3. Convert back to array
        return Array.from(catMap.values()).map((cat, idx) => ({
            ...cat,
            id: idx // Ensure ID is index-based for list stability
        }));
    }, [events]);

    return (
        <div className="flex gap-8 overflow-x-auto no-scrollbar py-12 px-4 -mx-4 pb-20 perspective-2000">
            {categories.map((cat, idx) => (
                <TiltCard key={cat.id} category={cat} index={idx} />
            ))}
        </div>
    );
};

const getIconForCategory = (category) => {
    const lower = category.toLowerCase();
    if (lower.includes('tech') || lower.includes('saas') || lower.includes('software')) return 'cloud';
    if (lower.includes('invest') || lower.includes('finance') || lower.includes('capital')) return 'trending-up';
    if (lower.includes('founder') || lower.includes('business') || lower.includes('startup')) return 'users';
    if (lower.includes('marketing') || lower.includes('sales')) return 'pie-chart';
    if (lower.includes('web3') || lower.includes('crypto')) return 'cube';
    if (lower.includes('hr') || lower.includes('people')) return 'user-group';
    return 'credit-card'; // Default
};

const CategoryIcon = ({ type }) => {
    switch (type) {
        case 'cloud':
            return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>;
        case 'trending-up':
            return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
        case 'users':
            return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
        case 'pie-chart':
            return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /></svg>;
        case 'cube':
            return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;
        case 'credit-card':
            return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
        default:
            return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
    }
};
