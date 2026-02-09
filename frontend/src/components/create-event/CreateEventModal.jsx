import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';

import ProgressBar from './ProgressBar';
import Step0_ModeSelection from './steps/Step0_ModeSelection';
import Step1_Essentials from './steps/Step1_Essentials';
import Step2_Content from './steps/Step2_Content';
import Step4_Tickets from './steps/Step4_Tickets';
import Step5_Venue from './steps/Step5_Venue';
import Step6_Review from './steps/Step6_Review';
import Step10_AIWizard from './steps/Step10_AIWizard';

const slideVariants = {
    enter: (direction) => ({
        x: direction > 0 ? 1000 : -1000,
        opacity: 0
    }),
    center: {
        zIndex: 1,
        x: 0,
        opacity: 1
    },
    exit: (direction) => ({
        zIndex: 0,
        x: direction < 0 ? 1000 : -1000,
        opacity: 0
    })
};

import BankDetailsModal from './BankDetailsModal';

export default function CreateEventModal({ isOpen, onClose, onSave, initialData = null, user }) {
    const [step, setStep] = useState(0); // 0 = Mode Select
    const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward

    // Bank Onboarding State
    const [showBankModal, setShowBankModal] = useState(false);
    const [isUserOnboarded, setIsUserOnboarded] = useState(!!user?.razorpay_account_id);

    const defaultState = {
        title: "",
        category: "Conference",
        description: "",
        startDate: "",
        startTime: "10:00",
        endDate: "",
        endTime: "12:00",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        imageUrl: "",
        mode: "offline",
        location: "",
        venueName: "",
        address1: "",
        address2: "",
        city: "",
        state: "",
        postalCode: "",
        country: "India",
        venueCoordinates: { lat: 13.0827, lng: 80.2707 },
        meetingLink: "",
        meetingLinkPrivate: true,
        agendaItems: [],
        tickets: [],
        speakers: [],
        tags: [],
        audience: "General Public",
        aiGenerated: false,
        price: "",
        capacity: 100
    };

    const [formData, setFormData] = useState(defaultState);

    useEffect(() => {
        if (isOpen) {
            setStep(0);
            if (initialData) {
                setFormData(initialData);
            } else {
                setFormData(defaultState);
            }
            // Update onboard status from prop
            setIsUserOnboarded(!!user?.razorpay_account_id);
        }
    }, [isOpen, initialData, user]);

    const updateFormData = (updates) => {
        setFormData(prev => ({ ...prev, ...updates }));
    };

    const handleNext = () => {
        // Intercept Step 3 (Tickets) exit if Paid tickets exist and User not onboarded
        if (step === 3) {
            const hasPaidTickets = formData.tickets.some(t => t.type === 'paid');

            // Strict check: Must have ID and MUST NOT be a mock ID
            const isStrictlyOnboarded = user?.razorpay_account_id && !user.razorpay_account_id.includes("mock");
            const isLocalOnboarded = isUserOnboarded && (!user?.razorpay_account_id?.includes("mock"));

            if (hasPaidTickets && !isStrictlyOnboarded && !isLocalOnboarded) {
                console.log("Blocking Next Step: Paid Ticket needs Real Bank Account");
                setShowBankModal(true);
                return;
            }
        }

        setDirection(1);
        setStep(prev => prev + 1);
    };

    const handleBankSuccess = (accountId) => {
        setIsUserOnboarded(true);
        setShowBankModal(false);
        // Automatically proceed to next step
        setDirection(1);
        setStep(prev => prev + 1);
    };

    const handleBack = () => {
        setDirection(-1);
        if (step === 10) {
            setStep(0); // AI Wizard Back -> Mode Select
        } else if (step === 1) {
            setStep(0); // Step 1 Back -> Mode Select
        } else {
            setStep(prev => prev - 1);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
            <div className="w-full h-full md:h-[90vh] md:w-[95vw] md:max-w-7xl bg-[#1a1a1a] md:rounded-3xl shadow-2xl relative flex flex-col overflow-hidden border border-white/10">

                {/* Header */}
                <div className="flex-none p-6 border-b border-white/5 flex items-center justify-between bg-[#1a1a1a]/50 backdrop-blur-md z-20">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Create Event</h2>
                            <p className="text-xs text-slate-400 font-medium">
                                {step === 0 ? "Select Mode" : step === 10 ? "AI Wizard" : "Wizard Mode"}
                            </p>
                        </div>
                    </div>

                    <div className="hidden md:block flex-1 max-w-2xl mx-12">
                        {step !== 0 && step !== 10 && <ProgressBar currentStep={step} totalSteps={5} />}
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Mobile Progress (Visible only on small screens) */}
                {step !== 0 && step !== 10 && (
                    <div className="md:hidden px-6 py-4 border-b border-white/5">
                        <ProgressBar currentStep={step} totalSteps={5} />
                    </div>
                )}

                {/* Main Content Area */}
                <div className="flex-1 relative overflow-hidden bg-[#1a1a1a]">
                    <AnimatePresence initial={false} custom={direction} mode="wait">
                        <motion.div
                            key={step}
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="absolute inset-0 overflow-y-auto px-4 py-8 md:p-12 custom-scrollbar"
                        >
                            <div className="max-w-5xl mx-auto min-h-full pb-20">
                                {step === 0 && (
                                    <Step0_ModeSelection
                                        onSelectMode={(mode) => {
                                            setDirection(1);
                                            if (mode === 'ai') setStep(10);
                                            else setStep(1);
                                        }}
                                    />
                                )}

                                {/* AI WIZARD */}
                                {step === 10 && (
                                    <Step10_AIWizard
                                        formData={formData}
                                        updateFormData={updateFormData}
                                        onNext={() => {
                                            setDirection(1);
                                            setStep(5); // Jump to Review
                                        }}
                                    />
                                )}

                                {/* MANUAL FLOW */}
                                {step === 1 && <Step1_Essentials formData={formData} updateFormData={updateFormData} onNext={handleNext} />}
                                {step === 2 && <Step2_Content formData={formData} updateFormData={updateFormData} onNext={handleNext} onBack={handleBack} />}
                                {step === 3 && <Step4_Tickets formData={formData} updateFormData={updateFormData} onNext={handleNext} onBack={handleBack} />}
                                {step === 4 && <Step5_Venue formData={formData} updateFormData={updateFormData} onNext={handleNext} onBack={handleBack} />}
                                {step === 5 && <Step6_Review formData={formData} updateFormData={updateFormData} onSave={onSave} onBack={handleBack} />}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            <BankDetailsModal
                isOpen={showBankModal}
                onClose={() => setShowBankModal(false)}
                onSuccess={handleBankSuccess}
                user={user}
            />
        </div>
    );
}
