import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';

const AuthScreen = ({ onAuthSuccess, onSkip, language, translations }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [infoMsg, setInfoMsg] = useState(null);

  const t = translations[language] || translations['en'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supabase) {
      setErrorMsg("Supabase credentials are not configured in your environment variables. Please continue without an account or check .env settings.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password
        });
        if (error) throw error;
        setInfoMsg("Registration successful! If email confirmation is enabled, check your inbox. Otherwise, you can log in now.");
        setIsSignUp(false);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        if (data.session) {
          onAuthSuccess(data.session.user);
        }
      }
    } catch (err) {
      setErrorMsg(err.message || "An authentication error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-50 via-indigo-50 to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col items-center justify-center p-4 md:p-6 font-sans">
      <div className="w-full max-w-md bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 dark:border-slate-800 p-8 space-y-6 animate-fade-in">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <img 
            src="/logo.png" 
            alt="HealthCompanion Logo" 
            className="w-16 h-16 object-contain rounded-2xl border border-gray-100 dark:border-slate-700 shadow-md mb-3" 
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <h2 className="text-2xl font-black text-gray-800 dark:text-gray-150 tracking-tight">
            {t.appTitle || "HealthCompanion"}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">
            {isSignUp ? "Create your educational triage account" : "Log in to synchronize logs and chat history"}
          </p>
        </div>

        {/* Info or Error Banner */}
        {errorMsg && (
          <div className="bg-red-50 dark:bg-red-955/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 px-4 py-2.5 rounded-xl text-xs font-medium">
            ⚠️ {errorMsg}
          </div>
        )}
        {infoMsg && (
          <div className="bg-emerald-50 dark:bg-emerald-955/20 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 px-4 py-2.5 rounded-xl text-xs font-medium">
            ℹ️ {infoMsg}
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-4 py-2.5 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-blue-650 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? "Authenticating..." : (isSignUp ? "Sign Up" : "Log In")}
          </button>
        </form>

        {/* Mode Toggler */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-400">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{' '}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg(null);
              setInfoMsg(null);
            }}
            className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
          >
            {isSignUp ? "Log In here" : "Sign Up here"}
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-gray-250 dark:border-slate-800"></div>
          <span className="flex-shrink mx-4 text-gray-400 text-[10px] font-bold uppercase tracking-wider">or</span>
          <div className="flex-grow border-t border-gray-250 dark:border-slate-800"></div>
        </div>

        {/* Anonymous Bypass Button */}
        <button
          type="button"
          onClick={onSkip}
          className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-gray-700 dark:text-gray-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
        >
          <span>Continue without an account</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>

      </div>
    </div>
  );
};

export default AuthScreen;
