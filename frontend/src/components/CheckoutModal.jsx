import { useState } from 'react';
import { X, Minus, Plus, ChevronRight, CheckCircle2, Ticket, CreditCard } from 'lucide-react';

export default function CheckoutModal({ event, isOpen, onClose, onConfirm }) {
    if (!isOpen || !event) return null;

    const [step, setStep] = useState(1);
    const [tickets, setTickets] = useState(
        event.raw_data?.tickets_meta?.map(t => ({ ...t, selectedQty: event.is_free ? 1 : 0 })) ||
        [{ name: 'General Admission', price: event.is_free ? 0 : 499, selectedQty: event.is_free ? 1 : 0 }]
    );

    // Attendee State
    const [attendee, setAttendee] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: ''
    });

    const [isProcessing, setIsProcessing] = useState(false);

    // Helpers
    const updateQty = (idx, delta) => {
        const newTickets = [...tickets];
        const newQty = Math.max(0, (newTickets[idx].selectedQty || 0) + delta);
        // Optional: limit to max qty per order or available stock
        newTickets[idx].selectedQty = newQty;
        setTickets(newTickets);
    };

    const totalQty = tickets.reduce((acc, t) => acc + (t.selectedQty || 0), 0);
    const totalPrice = tickets.reduce((acc, t) => acc + ((t.selectedQty || 0) * (parseFloat(t.price) || 0)), 0);

    const handleConfirm = async () => {
        setIsProcessing(true);

        try {
            const token = localStorage.getItem('token');
            const totalAmount = totalPrice; // Use the calculated Total Price

            // 1. Create Order
            const orderRes = await fetch('/api/v1/payment/create-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    amount: Math.ceil(totalAmount),
                    currency: "INR",
                    event_id: event.id // Pass event ID for split payments
                })
            });

            if (!orderRes.ok) throw new Error("Failed to create order");
            const orderData = await orderRes.json();

            // 2. Open Razorpay
            const options = {
                key: orderData.key_id,
                amount: orderData.amount,
                currency: orderData.currency,
                name: "Infinite BZ",
                description: `Event Registration - ${event.title}`,
                order_id: orderData.id,
                handler: async function (response) {
                    await verifyAndComplete(response);
                },
                prefill: {
                    name: `${attendee.firstName} ${attendee.lastName}`,
                    email: attendee.email,
                    contact: attendee.phone
                },
                theme: {
                    color: "#0ea5e9" // primary-500
                },
                modal: {
                    ondismiss: function () {
                        setIsProcessing(false);
                    }
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response) {
                alert("Payment Failed: " + response.error.description);
                setIsProcessing(false);
            });
            rzp.open();

        } catch (error) {
            console.error(error);
            alert("Payment initialization failed");
            setIsProcessing(false);
        }
    };

    const verifyAndComplete = async (paymentDetails) => {
        try {
            const token = localStorage.getItem('token');
            const verifyRes = await fetch('/api/v1/payment/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    razorpay_order_id: paymentDetails.razorpay_order_id,
                    razorpay_payment_id: paymentDetails.razorpay_payment_id,
                    razorpay_signature: paymentDetails.razorpay_signature
                })
            });

            if (!verifyRes.ok) throw new Error("Verification failed");
            const verifyData = await verifyRes.json();

            if (verifyData.status === "success") {
                // Prepare Payload for Final Registration
                const payload = {
                    tickets: tickets.filter(t => t.selectedQty > 0),
                    attendee: attendee,
                    total_amount: totalPrice,
                    payment_id: paymentDetails.razorpay_payment_id // Pass payment ID if backend needs it
                };
                await onConfirm(payload); // Call the original prop to save ticket
                // setIsProcessing(false); // onConfirm likely handles navigation/close, but just in case
            }

        } catch (error) {
            console.error(error);
            alert("Payment verification failed! Ticket not issued.");
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                    <div>
                        <h2 className="text-xl font-bold text-white">Checkout</h2>
                        <p className="text-slate-400 text-sm">{event.title}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">

                    {/* Steps Indicator */}
                    <div className="flex items-center justify-center mb-8 gap-4">
                        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary-500' : 'text-slate-600'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-primary-500 text-slate-900' : 'bg-slate-800'}`}>1</div>
                            <span className="text-sm font-bold">Tickets</span>
                        </div>
                        <div className="h-0.5 w-8 bg-slate-800" />
                        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary-500' : 'text-slate-600'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-primary-500 text-slate-900' : 'bg-slate-800'}`}>2</div>
                            <span className="text-sm font-bold">Payment</span>
                        </div>
                    </div>

                    {/* Step 1: Ticket Selection */}
                    {step === 1 && (
                        <div className="space-y-4">
                            {tickets.map((t, idx) => (
                                <div key={idx} className={`p-4 rounded-xl border transition-all ${t.selectedQty > 0 ? 'bg-primary-500/10 border-primary-500/50' : 'bg-slate-800/50 border-slate-700/50'}`}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-bold text-white text-lg">{t.name}</h4>
                                            <p className="text-slate-400 text-sm">{t.price == 0 ? 'Free' : `₹${t.price}`}</p>
                                        </div>
                                        <div className="flex items-center gap-4 bg-slate-900 rounded-lg p-1 border border-slate-700">
                                            <button
                                                onClick={() => updateQty(idx, -1)}
                                                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                                                disabled={t.selectedQty === 0 || event.is_free}
                                            >
                                                <Minus size={16} />
                                            </button>
                                            <span className="w-8 text-center font-bold text-white">{t.selectedQty || 0}</span>
                                            <button
                                                onClick={() => updateQty(idx, 1)}
                                                className="w-8 h-8 flex items-center justify-center text-primary-500 hover:bg-primary-500/20 rounded transition-colors"
                                                disabled={event.is_free}
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Step 2: Payment & Review (Was Step 3) */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 space-y-4">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <CheckCircle2 className="text-primary-500" /> Order Summary
                                </h3>
                                <div className="space-y-2 border-b border-slate-700/50 pb-4">
                                    {tickets.filter(t => t.selectedQty > 0).map((t, idx) => (
                                        <div key={idx} className="flex justify-between text-sm">
                                            <span className="text-slate-300">{t.selectedQty} x {t.name}</span>
                                            <span className="font-bold text-white">₹{(t.selectedQty * parseFloat(t.price)).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between items-end">
                                    <span className="text-slate-400 font-bold uppercase tracking-wide">Total Payble</span>
                                    <span className="text-3xl font-black text-white">₹{totalPrice.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl flex items-start gap-3">
                                <div className="p-2 bg-slate-800 rounded-lg text-primary-500">
                                    <CreditCard size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-sm">Payment Method</h4>
                                    <p className="text-xs text-slate-500 mt-1">
                                        This is a demo secure checkout. No actual card charged.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
                    <div>
                        {step > 1 && (
                            <button
                                onClick={() => setStep(step - 1)}
                                className="text-slate-400 hover:text-white font-bold text-sm transition-colors"
                            >
                                Back
                            </button>
                        )}
                    </div>

                    <button
                        onClick={() => {
                            if (step < 2) setStep(step + 1);
                            else handleConfirm();
                        }}
                        disabled={step === 1 && totalQty === 0 || isProcessing}
                        className="bg-primary-600 hover:bg-primary-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isProcessing ? 'Processing... ' : (step === 2 ? 'Pay & Register' : 'Continue')}
                        {!isProcessing && <ChevronRight size={18} />}
                    </button>
                </div>
            </div>
        </div>
    );
}
