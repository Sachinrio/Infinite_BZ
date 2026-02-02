import React, { useState, useEffect } from 'react';

export default function EventTicketPage({ eventId, onNavigate, onCancelSuccess, user }) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [eventData, setEventData] = useState(null);
    const [qrCode, setQrCode] = useState(null);
    const [ticketId, setTicketId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (eventId) {
            fetchEventDetails();
            fetchQrCode();
        }
    }, [eventId]);

    const fetchEventDetails = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:8000/api/v1/events/${eventId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setEventData(data);
            }
        } catch (err) {
            console.error('Error fetching event details:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchQrCode = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:8000/api/v1/user/registrations/${eventId}/qr`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setQrCode(data.qr_code);
                setTicketId(data.confirmation_id);
            } else {
                if (res.status === 403 || res.status === 404) {
                    alert("You cancelled the order");
                    onNavigate('feed');
                }
            }
        } catch (err) {
            console.error('Error fetching QR code:', err);
        }
    };

    // Strict Validation Effect
    useEffect(() => {
        if (eventData && ticketId) {
            const params = new URLSearchParams(window.location.search);
            const urlTicketId = params.get('ticketId');
            const urlEventName = params.get('eventName');

            if (urlTicketId && urlTicketId !== ticketId) {
                alert(`Security Alert: The Ticket ID in the link (${urlTicketId}) does not match your ticket (${ticketId}). Access Denied.`);
                onNavigate('feed');
                return;
            }

            if (urlEventName && eventData.title) {
                // Handle potential encoding differences
                const decodedUrlName = decodeURIComponent(urlEventName);
                if (decodedUrlName !== eventData.title && urlEventName !== eventData.title) {
                    alert(`Security Alert: The Event Name in the link does not match. Access Denied.`);
                    onNavigate('feed');
                    return;
                }
            }
        }
    }, [eventData, ticketId]);

    const downloadQR = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8000/api/v1/user/registrations/${eventId}/pdf`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${eventData?.title?.replace(/\s+/g, '_') || 'event'}_ticket.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);

                // Store PDF blob in localStorage as base64
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64data = reader.result;
                    localStorage.setItem(`ticket_pdf_${eventId}`, base64data);
                };
                reader.readAsDataURL(blob);
            } else {
                console.error('Failed to download PDF');
            }
        } catch (err) {
            console.error('Error downloading PDF:', err);
        }
    };

    const cancelOrder = async () => {
        if (!window.confirm('Are you sure you want to cancel your registration for this event?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8000/api/v1/user/registrations/${eventId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                alert(data.message);
                // Trigger success callback to update parent state
                if (onCancelSuccess) {
                    onCancelSuccess();
                } else {
                    onNavigate('my-registrations');
                }
            } else {
                const errorData = await response.json();
                alert(`Failed to cancel registration: ${errorData.detail || 'Unknown error'}`);
            }
        } catch (err) {
            console.error('Error cancelling registration:', err);
            alert('Failed to cancel registration. Please try again.');
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatTime = (dateString) => {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900">
            {/* Header */}
            <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center">
                    {/* Logo */}
                    <div className="flex items-center gap-2">
                        <div className="text-2xl font-bold text-primary-500">InfiniteBZ</div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Event Card */}
                    <div className="lg:col-span-1">
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-sm">
                            {/* Event Image Header */}
                            <div className="relative bg-gradient-to-r from-blue-900 via-purple-900 to-blue-800 p-4 min-h-40">
                                {/* Diagonal stripes pattern */}
                                <div className="absolute inset-0 opacity-20">
                                    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                                        <defs>
                                            <pattern id="diagonalHatch" x="10" y="10" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
                                                <line x1="0" y1="0" x2="0" y2="20" stroke="#ff6b35" strokeWidth="15" />
                                            </pattern>
                                        </defs>
                                        <rect width="100%" height="100%" fill="url(#diagonalHatch)" />
                                    </svg>
                                </div>

                                {/* QR Code Display Area */}
                                <div className="relative z-10">
                                    <div className="bg-white rounded px-4 py-3 flex items-center justify-center">
                                        {qrCode ? (
                                            <img
                                                src={`data:image/png;base64,${qrCode}`}
                                                alt="Event QR Code"
                                                className="w-full h-32 object-contain rounded"
                                            />
                                        ) : (
                                            <div className="w-full h-32 bg-gray-100 rounded flex items-center justify-center">
                                                <span className="text-gray-500 text-sm">QR Code Loading...</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-4 text-white text-center">
                                        <h3 className="text-xl font-bold">{ticketId || "Ticket ID"}</h3>
                                    </div>
                                </div>
                            </div>

                            {/* Event Details */}
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <h2 className="text-xl font-bold text-white flex-1">
                                        {eventData?.title || "Event Name"}
                                    </h2>

                                </div>

                                {/* Event Details */}
                                <div className="mb-6">
                                    {/*<h3 className="text-lg font-semibold text-white mb-2">{eventData?.title || "Event Name"}</h3>*/}
                                    <p className="text-sm text-slate-400 mb-1">
                                        <span className="font-medium text-slate-300">Organizer:</span> {eventData?.organizer_name || "Event Organizer"}
                                    </p>
                                    <p className="text-sm text-slate-400 mb-1">
                                        <span className="font-medium text-slate-300">User:</span> {user?.full_name || "Sachin S"}
                                    </p>
                                    <p className="text-sm text-slate-400 mb-1">
                                        <span className="font-medium text-slate-300">Date:</span> {eventData?.start_time ? formatDate(eventData.start_time) : 'Fri, Jan 16'}
                                    </p>
                                    <p className="text-sm text-slate-400">
                                        <span className="font-medium text-slate-300">Time:</span> {eventData?.start_time ? formatTime(eventData.start_time) : '10:30 PM'}
                                    </p>
                                </div>

                                {/* Action Buttons */}
                                <button
                                    onClick={downloadQR}
                                    className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 px-4 rounded mb-3 transition shadow-lg shadow-primary-500/20"
                                >
                                    Download Ticket
                                </button>

                                <button
                                    onClick={cancelOrder}
                                    className="w-full border-2 border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white font-semibold py-3 px-4 rounded mb-6 transition"
                                >
                                    Cancel Order
                                </button>



                                {/* Order Info */}
                                <div className="border-t border-slate-700 pt-4">
                                    <p className="text-xs text-slate-400 mb-2">
                                        {eventData?.is_free ? 'Free' : 'Paid'} Order {eventData?.id || '14046799613'} on {eventData?.registration_date ? new Date(eventData.registration_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Jan 12, 2026'}
                                    </p>
                                    <a href="#" className="text-primary-400 hover:text-primary-300 text-xs font-medium">
                                        Report this event
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Ticket Details */}
                    <div className="lg:col-span-2">
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-sm">
                            {/* Header */}
                            <div className="flex items-center mb-8 border-b border-slate-700 pb-6">
                                <h1 className="text-3xl font-bold text-white">General Admission</h1>
                            </div>

                            {/* Contact Information */}
                            <div>
                                <h2 className="text-lg font-semibold text-white mb-6">Contact Information</h2>

                                {/* Attendee */}
                                <div className="mb-6">
                                    <label className="block text-sm font-semibold text-white mb-2">
                                        Attendee <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={user?.full_name || "SACHIN S"}
                                        readOnly
                                        className="w-full px-0 py-2 border-b border-slate-600 bg-transparent text-slate-300 text-sm focus:outline-none focus:border-primary-500"
                                    />
                                </div>

                                {/* Email */}
                                <div className="mb-6">
                                    <label className="block text-sm font-semibold text-white mb-2">
                                        Email <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={user?.email || "sachinrio74@gmail.com"}
                                        readOnly
                                        className="w-full px-0 py-2 border-b border-slate-600 bg-transparent text-slate-300 text-sm focus:outline-none focus:border-primary-500"
                                    />
                                </div>

                                {/* Delivery Method */}
                                <div className="mb-6">
                                    <label className="block text-sm font-semibold text-white mb-2">
                                        Delivery Method
                                    </label>
                                    <input
                                        type="text"
                                        value="eTicket"
                                        readOnly
                                        className="w-full px-0 py-2 border-b border-slate-600 bg-transparent text-slate-300 text-sm focus:outline-none focus:border-primary-500"
                                    />
                                </div>
                            </div>

                            {/* Back Button */}
                            <div className="mt-8">
                                <button
                                    onClick={() => onNavigate('my-registrations')}
                                    className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition"
                                >
                                    ← Back to My Registrations
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
