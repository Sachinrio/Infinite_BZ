import { useState } from 'react';
import { Eye, EyeOff, Loader2, Calendar, MapPin, Search, ArrowRight, CheckCircle2, Linkedin, ShieldCheck, Check, X, ArrowLeft } from 'lucide-react';
import { TermsModal, PrivacyModal } from './LegalDocs';
import { GoogleLogin } from '@react-oauth/google';

export default function AuthPage({ onBack, onComplete, initialMode = 'login' }) {
    const [mode, setMode] = useState(initialMode); // 'login' | 'signup' | 'forgot'
    const [showPassword, setShowPassword] = useState(false);
    const [agreed, setAgreed] = useState(false);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const [resetStep, setResetStep] = useState(1); // 1: Email, 2: OTP & New Password
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');

    // --- Email Verification State (Signup Only) ---
    const [verifyStatus, setVerifyStatus] = useState('idle'); // 'idle', 'sending', 'pending', 'verified'
    const [verificationOtp, setVerificationOtp] = useState('');

    const sendVerificationOtp = async () => {
        if (!email) {
            setError("Please enter an email address first.");
            return;
        }
        setVerifyStatus('sending');
        setError(null);
        try {
            const res = await fetch('/api/v1/auth/verify-email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Failed to send verification code.');
            setVerifyStatus('pending');
            alert("Verification code sent to " + email);
        } catch (err) {
            setError(err.message);
            setVerifyStatus('idle');
        }
    };

    const verifyEmailOtp = async () => {
        if (!verificationOtp) {
            setError("Please enter the verification code.");
            return;
        }
        try {
            const res = await fetch('/api/v1/auth/verify-email/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp: verificationOtp }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Invalid code.');
            setVerifyStatus('verified');
            setError(null);
        } catch (err) {
            setError(err.message);
        }
    };

    // Toggle Mode
    const toggleMode = (newMode) => {
        setMode(newMode);
        setAgreed(false);
        setError(null);
        setResetStep(1);
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
        // Clear email and password fields when switching modes
        setEmail('');
        setPassword('');
    };

    const [activeModal, setActiveModal] = useState(null); // 'terms' | 'privacy' | null

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const formData = new URLSearchParams();
            formData.append('username', email);
            formData.append('password', password);

            const res = await fetch('/api/v1/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData,
            });

            const contentType = res.headers.get("content-type");
            let data;
            if (contentType && contentType.indexOf("application/json") !== -1) {
                data = await res.json();
            } else {
                const text = await res.text();
                console.error("Non-JSON response:", res.status, text);
                throw new Error(`Login failed: Server returned ${res.status}. Check console for details.`);
            }

            if (!res.ok) throw new Error(data.detail || 'Login failed');

            localStorage.setItem('token', data.access_token);
            onComplete();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/v1/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: credentialResponse.credential }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Google Login failed');

            localStorage.setItem('token', data.access_token);
            onComplete();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // 1. Client-side Validation
        if (password !== confirmPassword) {
            setError("Passwords do not match!");
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/v1/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                    full_name: fullName,
                    is_active: true
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Signup failed');

            // Auto login after signup
            await handleLogin(e);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (resetStep === 1) {
                // Step 1: Request OTP
                const res = await fetch('/api/v1/auth/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.detail || 'Request failed');

                alert(data.message); // Should say OTP sent
                setResetStep(2);
            } else {
                // Step 2: Reset Password
                // Step 2: Reset Password
                if (newPassword !== confirmPassword) {
                    throw new Error("Passwords do not match");
                }

                const res = await fetch('/api/v1/auth/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email,
                        otp,
                        new_password: newPassword
                    }),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.detail || 'Reset failed');

                alert("Password reset successfully! Please login.");
                setMode('login');
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex text-slate-200 font-sans">

            {/* LEFT PANEL (Visual) - Hidden on mobile */}
            <div className="hidden lg:flex w-1/2 relative bg-slate-900 overflow-hidden items-center justify-center">
                {/* Background Image with Overlay */}
                <div className="absolute inset-0">
                    <img
                        src="https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=2070&auto=format&fit=crop"
                        alt="Networking"
                        className="w-full h-full object-cover opacity-20 hover:scale-105 transition-transform duration-[20s]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B1221] via-[#0B1221]/80 to-primary-900/20" />
                </div>

                <div className="relative z-10 max-w-lg px-12 text-center">
                    <div className="w-16 h-16 bg-primary-500 rounded-2xl mx-auto mb-8 flex items-center justify-center shadow-2xl shadow-primary-500/30 rotate-3 hover:rotate-6 transition-transform">
                        <div className="w-8 h-8 border-4 border-white rounded-lg" />
                    </div>

                    <h1 className="text-4xl font-bold text-white mb-6 leading-tight">
                        Discover Chennai's Best Tech Meetups
                    </h1>
                    <p className="text-slate-400 text-lg mb-10 leading-relaxed">
                        Join the fastest growing network of professionals. Auto-register for events, track your attendance, and grow your career.
                    </p>

                    <div className="inline-flex items-center gap-3 bg-slate-800/50 backdrop-blur-md px-5 py-3 rounded-full border border-white/10">
                        <CheckCircle2 className="text-primary-400" size={20} />
                        <span className="text-sm font-semibold text-white">Trusted by 10,000+ Developers in India</span>
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL (Form) */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative">
                <button onClick={onBack} className="absolute top-6 left-6 p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                    <ArrowRight size={24} className="rotate-180" />
                </button>

                <div className="w-full max-w-md space-y-8">
                    {/* Header */}
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-2">
                            {mode === 'login' && 'Welcome Back'}
                            {mode === 'signup' && 'Create/Join Account'}
                            {mode === 'forgot' && 'Reset Password'}
                        </h2>
                        <p className="text-slate-400">
                            {mode === 'login' && 'Enter your details to access your dashboard.'}
                            {mode === 'signup' && 'Start your journey with us today.'}
                            {mode === 'forgot' && (
                                resetStep === 1
                                    ? 'No worries, we\'ll send you reset instructions.'
                                    : 'Check your email for the OTP.'
                            )}
                        </p>
                    </div>

                    {/* Mode Switcher */}
                    {mode !== 'forgot' && (
                        <div className="grid grid-cols-2 p-1 bg-[#0B1221] rounded-xl border border-white/10">
                            <button
                                onClick={() => toggleMode('login')}
                                className={`py-2.5 rounded-lg text-sm font-bold transition-all relative overflow-hidden ${mode === 'login' ? 'text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                            >
                                {mode === 'login' && <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-primary-800 opacity-100" />}
                                <span className="relative z-10">Log In</span>
                            </button>
                            <button
                                onClick={() => toggleMode('signup')}
                                className={`py-2.5 rounded-lg text-sm font-bold transition-all relative overflow-hidden ${mode === 'signup' ? 'text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                            >
                                {mode === 'signup' && <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-primary-800 opacity-100" />}
                                <span className="relative z-10">Sign Up</span>
                            </button>
                        </div>
                    )}

                    {/* Form */}
                    <form className="space-y-5" onSubmit={mode === 'forgot' ? handleForgotPassword : (mode === 'login' ? handleLogin : handleSignup)}>
                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg text-center">
                                {error}
                            </div>
                        )}

                        {/* FULL NAME - SIGNUP ONLY */}
                        {mode === 'signup' && (
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Full Name</label>
                                <input
                                    type="text"
                                    placeholder="John Doe"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sky-500 transition-colors placeholder:text-slate-600"
                                    required
                                />
                            </div>
                        )}

                        {/* EMAIL ADDRESS - ALL MODES */}
                        {/* EMAIL ADDRESS - ALL MODES */}
                        {(mode !== 'forgot' || resetStep === 1) && (
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                                    Email Address
                                    {mode === 'signup' && verifyStatus === 'verified' && <span className="text-green-500 ml-2">✓ Verified</span>}
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="email"
                                        placeholder="name@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className={`w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sky-500 transition-colors placeholder:text-slate-600 ${mode === 'signup' && (verifyStatus === 'verified' || verifyStatus === 'pending') ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        required={mode !== 'forgot' || resetStep === 1}
                                        disabled={(mode === 'forgot' && resetStep === 2) || (mode === 'signup' && (verifyStatus === 'verified' || verifyStatus === 'pending'))}
                                    />
                                    {mode === 'signup' && verifyStatus === 'idle' && (
                                        <button
                                            type="button"
                                            onClick={sendVerificationOtp}
                                            className="bg-slate-800 hover:bg-slate-700 text-white px-4 rounded-lg font-medium transition-colors text-sm border border-slate-700 whitespace-nowrap"
                                        >
                                            Verify
                                        </button>
                                    )}
                                </div>
                                {/* Verification OTP Input for Signup */}
                                {mode === 'signup' && verifyStatus === 'pending' && (
                                    <div className="flex gap-2 mt-2">
                                        <input
                                            type="text"
                                            placeholder="Enter OTP"
                                            value={verificationOtp}
                                            onChange={(e) => setVerificationOtp(e.target.value)}
                                            className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500 text-center tracking-widest"
                                        />
                                        <button
                                            type="button"
                                            onClick={verifyEmailOtp}
                                            className="bg-green-600 hover:bg-green-500 text-white px-4 rounded-lg font-medium transition-colors text-sm"
                                        >
                                            Confirm
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setVerifyStatus('idle')}
                                            className="bg-slate-800 hover:bg-slate-700 text-slate-400 px-3 rounded-lg font-medium transition-colors text-sm"
                                        >
                                            Change
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* FORGOT PASSWORD STEP 2 - OTP & NEW PASSWORD */}
                        {mode === 'forgot' && resetStep === 2 && (
                            <>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Enter OTP (Sent to Email)</label>
                                    <input
                                        type="text"
                                        placeholder="123456"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sky-500 transition-colors placeholder:text-slate-600 tracking-widest text-center font-mono text-lg"
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Enter new password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sky-500 transition-colors placeholder:text-slate-600 pr-10"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-3 text-slate-500 hover:text-white"
                                        >
                                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                </div>


                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Confirm New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Re-enter new password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className={`w-full bg-slate-900 border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sky-500 transition-colors placeholder:text-slate-600 pr-10 ${confirmPassword && confirmPassword !== newPassword ? 'border-red-500/50' : 'border-slate-700'}`}
                                            required
                                        />
                                    </div>
                                    {confirmPassword && confirmPassword !== newPassword && (
                                        <p className="text-xs text-red-400">Passwords do not match</p>
                                    )}
                                </div>
                            </>
                        )}


                        {/* PASSWORD - LOGIN/SIGNUP */}
                        {mode !== 'forgot' && (
                            <>
                                <div className="space-y-1.5">
                                    <div className="flex justify-between">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Password</label>
                                        {mode === 'login' && (
                                            <button type="button" onClick={() => setMode('forgot')} className="text-xs font-bold text-sky-500 hover:text-sky-400">Forgot Password?</button>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Enter your password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sky-500 transition-colors placeholder:text-slate-600 pr-10"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-3 text-slate-500 hover:text-white"
                                        >
                                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Confirm Password Field */}
                                {mode === 'signup' && (
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Confirm Password</label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Re-enter your password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className={`w-full bg-slate-900 border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sky-500 transition-colors placeholder:text-slate-600 pr-10 ${confirmPassword && confirmPassword !== password ? 'border-red-500/50' : 'border-slate-700'}`}
                                                required
                                            />
                                        </div>
                                        {confirmPassword && confirmPassword !== password && (
                                            <p className="text-xs text-red-400">Passwords do not match</p>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {/* AGREEMENT CHECKBOX */}
                        {mode === 'signup' && (
                            <div className="flex items-start gap-3 pt-2">
                                <div className="flex items-center gap-2">
                                    <div className="relative flex items-center">
                                        <input
                                            type="checkbox"
                                            id="agreed"
                                            checked={agreed}
                                            onChange={(e) => setAgreed(e.target.checked)}
                                            className="peer h-4 w-4 shrink-0 rounded border border-slate-700 bg-slate-900 ring-offset-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-50 appearance-none checked:bg-sky-500 checked:border-sky-500 transition-all cursor-pointer"
                                        />
                                        <CheckCircle2 size={12} className="absolute top-0.5 left-0.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                                    </div>
                                    <label htmlFor="agreed" className="text-sm font-medium text-slate-400 select-none cursor-pointer">
                                        I agree to the <span onClick={(e) => { e.preventDefault(); setActiveModal('terms'); }} className="text-primary-500 hover:text-primary-400 hover:underline cursor-pointer">Terms and Conditons</span> and <span onClick={(e) => { e.preventDefault(); setActiveModal('privacy'); }} className="text-primary-500 hover:text-primary-400 hover:underline cursor-pointer">Privacy Policy</span>.
                                    </label>
                                </div>
                            </div>
                        )}

                        <button
                            disabled={loading || (mode === 'signup' && (!agreed || password !== confirmPassword || verifyStatus !== 'verified')) || (mode === 'forgot' && resetStep === 2 && newPassword !== confirmPassword)}
                            type="submit"
                            className={`w-full font-bold py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 transform active:scale-[0.98] ${(loading || (mode === 'signup' && (!agreed || password !== confirmPassword || verifyStatus !== 'verified')) || (mode === 'forgot' && resetStep === 2 && newPassword !== confirmPassword))
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed hidden-spinner'
                                : 'bg-gradient-to-r from-primary-500 to-primary-700 hover:from-primary-400 hover:to-primary-600 text-slate-900 shadow-primary-500/25 ring-1 ring-white/10'
                                }`}
                        >
                            {loading ? 'Processing...' : (
                                <>
                                    {mode === 'login' && 'Sign In'}
                                    {mode === 'signup' && 'Create Account'}
                                    {mode === 'forgot' && (resetStep === 1 ? 'Send Reset Link' : 'Reset Password')}
                                </>
                            )}
                        </button>
                    </form>

                    {/* Social Login */}
                    {mode !== 'forgot' && (
                        <>
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
                                <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#0B1221] px-2 text-slate-500">Or continue with</span></div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex justify-center">
                                    <GoogleLogin
                                        onSuccess={handleGoogleSuccess}
                                        onError={() => setError("Google Login Failed")}
                                        theme="filled_black"
                                        shape="circle"
                                        size="large"
                                        width="100%"
                                        text="continue_with"
                                    />
                                </div>
                                <button className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-lg transition-colors border border-slate-700 h-[40px] mt-[1px]">
                                    <Linkedin size={20} className="text-blue-500" />
                                    <span className="text-sm font-semibold">LinkedIn</span>
                                </button>
                            </div>
                        </>
                    )}

                    {mode === 'forgot' && (
                        <button
                            onClick={() => setMode('login')}
                            className="w-full text-sm text-slate-400 hover:text-white transition-colors"
                        >
                            Back to Log In
                        </button>
                    )}
                </div>
            </div>
            {activeModal === 'terms' && <TermsModal onClose={() => setActiveModal(null)} />}
            {activeModal === 'privacy' && <PrivacyModal onClose={() => setActiveModal(null)} />}
        </div >
    )
}

