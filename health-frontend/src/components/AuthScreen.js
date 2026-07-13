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
    <div className="min-h-screen bg-health-bg dark:bg-health-bg-dark flex flex-col items-center justify-center p-4 md:p-6 font-sans transition-colors duration-300">
      <div className="w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-xl border border-health-secondary/20 dark:border-slate-800 p-8 space-y-6">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-health-primary/10 dark:bg-health-primary/20 rounded-2xl flex items-center justify-center text-3xl mb-3 shadow-inner">
            🩺
          </div>
          <h2 className="text-2xl font-serif font-bold text-health-primary dark:text-health-secondary tracking-tight">
            {t.appTitle || "HealthCompanion"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
            {isSignUp ? "Create your educational triage account" : "Log in to synchronize logs and chat history"}
          </p>
        </div>

        {/* Info or Error Banner */}
        {errorMsg && (
          <div className="bg-health-emergency/10 border border-health-emergency/30 text-health-emergency px-4 py-2.5 rounded-xl text-xs font-semibold">
            ⚠️ {errorMsg}
          </div>
        )}
        {infoMsg && (
          <div className="bg-health-success/15 border border-health-success/30 text-health-success px-4 py-2.5 rounded-xl text-xs font-semibold">
            ℹ️ {infoMsg}
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-4 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-health-primary focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-health-primary focus:border-transparent transition"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-health-primary hover:bg-health-primary/95 text-white font-serif font-bold text-sm rounded-xl transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? "Authenticating..." : (isSignUp ? "Sign Up" : "Log In")}
          </button>
        </form>

        {/* Mode Toggler */}
        <div className="text-center text-xs text-slate-500 dark:text-slate-400">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{' '}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg(null);
              setInfoMsg(null);
            }}
            className="text-health-primary dark:text-health-secondary font-bold hover:underline"
          >
            {isSignUp ? "Log In here" : "Sign Up here"}
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-250 dark:border-slate-800"></div>
          <span className="flex-shrink mx-4 text-slate-400 dark:text-slate-550 text-[10px] font-bold uppercase tracking-wider">or</span>
          <div className="flex-grow border-t border-slate-250 dark:border-slate-800"></div>
        </div>

        {/* Anonymous Bypass Button */}
        <button
          type="button"
          onClick={onSkip}
          className="w-full py-2.5 bg-slate-100 hover:bg-slate-250 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
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
