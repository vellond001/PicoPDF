import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, GithubAuthProvider } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Mail, Lock, Sparkles, Globe, Check } from 'lucide-react';
import localConfig from '../../firebase-applet-config.json';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

interface AccessGateProps {
  onAccessGranted: () => void;
}

export function AccessGate({ onAccessGranted }: AccessGateProps) {
  const [stage, setStage] = useState<'selection' | 'auth' | 'paywall'>('selection');
  const [user, setUser] = useState<any>(null);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Check if either real firebase env vars live or generated local applet configs exist
  const isConfigured = !!import.meta.env.VITE_FIREBASE_API_KEY || !!localConfig?.apiKey;
  const payPalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || "test";

  useEffect(() => {
    if (isConfigured && auth) {
      const unsub = onAuthStateChanged(auth, async (u) => {
        setUser(u);
        if (u) {
          try {
            const d = await getDoc(doc(db, 'users', u.uid));
            if (d.exists() && d.data().credits > 0) {
              onAccessGranted();
            } else {
              setStage('paywall');
            }
          } catch (e) {
            setStage('paywall');
          }
        }
      });
      return () => unsub();
    }
  }, [isConfigured, onAccessGranted]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!isConfigured) throw new Error("Firebase is not fully configured. Please setup your database rules.");
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      if (!isConfigured) throw new Error("Firebase is not configured. Setup keys to use real authentication.");
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGithubAuth = async () => {
    try {
      if (!isConfigured) throw new Error("Firebase is not configured. Setup keys to use real authentication.");
      const provider = new GithubAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans text-neutral-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-white border border-neutral-200 rounded-xl mb-4 shadow-sm">
          <Sparkles className="w-6 h-6 text-indigo-600" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-neutral-900">
          {stage === 'selection' ? 'Choose Edition' : (stage === 'auth' ? 'Sign In' : 'Cloud Tier')}
        </h2>
        <p className="mt-2 text-sm text-neutral-500">
          {stage === 'selection' ? 'Select how you want to run your workspace.' : (stage === 'auth' ? 'to continue to your secure workspace.' : 'Upgrade your account for cloud capabilities.')}
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-neutral-200/40 sm:rounded-2xl sm:px-10 border border-neutral-100">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-100 rounded-xl text-sm">
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            {stage === 'selection' && (
              <motion.div key="selection" initial={{opacity: 0, scale: 0.95}} animate={{opacity: 1, scale: 1}} exit={{opacity: 0, scale: 0.95}}>
                <div className="space-y-4">
                  <button 
                    onClick={() => onAccessGranted()}
                    className="w-full text-left p-4 rounded-xl border-2 border-neutral-200 hover:border-neutral-900 hover:bg-neutral-50 transition-all flex items-start gap-4"
                  >
                    <div className="p-2 bg-neutral-100 rounded-lg shrink-0">
                      <Lock className="w-6 h-6 text-neutral-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-900">Local (BYOK) Edition</h3>
                      <p className="text-sm text-neutral-500 mt-1">Bring your own API key. Run fully locally in your browser without an account.</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => setStage('auth')}
                    className="w-full text-left p-4 rounded-xl border-2 border-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-all flex items-start gap-4 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg uppercase tracking-wider">
                      Recommended
                    </div>
                    <div className="p-2 bg-indigo-100 rounded-lg shrink-0">
                      <Globe className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-indigo-900">PRO Edition</h3>
                      <p className="text-sm text-indigo-800/80 mt-1">Cloud execution and database sync. Account required.</p>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}

            {stage === 'auth' && (
              <motion.div key="auth" initial={{opacity: 0, x: -10}} animate={{opacity: 1, x: 0}} exit={{opacity: 0, x: 10}}>
                <div className="mb-4">
                  <button 
                    onClick={() => setStage('selection')}
                    className="text-sm font-medium text-neutral-500 hover:text-indigo-600 transition-colors flex items-center gap-1"
                  >
                    <span>&larr;</span> Back
                  </button>
                </div>
                <form onSubmit={handleEmailAuth} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Email address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-5 w-5 text-neutral-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm transition-colors"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-5 w-5 text-neutral-400" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm transition-colors"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900 transition-colors"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Sign in' : 'Create account')}
                  </button>
                </form>

                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-neutral-200" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-neutral-500">Or continue with</span>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <button
                      onClick={handleGoogleAuth}
                      type="button"
                      className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-neutral-200 rounded-lg shadow-sm bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Google
                    </button>
                    <button
                      onClick={handleGithubAuth}
                      type="button"
                      className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-neutral-200 rounded-lg shadow-sm bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                         <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                      </svg>
                      GitHub
                    </button>
                  </div>
                </div>

                <p className="mt-6 text-center text-sm text-neutral-600">
                  {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                  <button onClick={() => setIsLogin(!isLogin)} className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
                    {isLogin ? 'Sign up' : 'Log in'}
                  </button>
                </p>
              </motion.div>
            )}

            {stage === 'paywall' && (
              <motion.div key="paywall" initial={{opacity: 0, x: 10}} animate={{opacity: 1, x: 0}} exit={{opacity: 0, x: -10}}>
                <div className="text-center mb-6">
                  <div className="mx-auto flex items-center justify-center p-3 w-fit rounded-2xl bg-indigo-50 border border-indigo-100 mb-4">
                    <Globe className="h-6 w-6 text-indigo-600" />
                  </div>
                  <h3 className="text-lg leading-6 font-semibold text-neutral-900">Upgrade to Cloud Tier</h3>
                  <p className="mt-2 text-sm text-neutral-500 px-4">
                    Frictionless checkout powered by PayPal. Secure global processing.
                  </p>
                </div>

                <div className="bg-neutral-50 rounded-xl p-5 border border-neutral-200 mb-6 font-medium">
                  <div className="flex justify-between items-center mb-4 pb-4 border-b border-neutral-200">
                    <span className="text-neutral-700">Startup Tier</span>
                    <span className="text-lg font-bold text-neutral-900">$10.00</span>
                  </div>
                  <ul className="space-y-3 text-sm text-neutral-600 mb-4">
                    <li className="flex items-center gap-3"><Check className="h-4 w-4 text-indigo-500" /> Secure Cloud Execution</li>
                    <li className="flex items-center gap-3"><Check className="h-4 w-4 text-indigo-500" /> Universal Global Processing</li>
                  </ul>
                  
                  {payPalClientId === "test" ? (
                    <div className="mt-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                      <p className="font-semibold mb-1">Developer Mode: Missing PayPal Keys</p>
                      <p>To enable payments, please open the AI Studio <strong>Settings</strong> panel and add your <code className="bg-amber-100 px-1 rounded">VITE_PAYPAL_CLIENT_ID</code> and <code className="bg-amber-100 px-1 rounded">PAYPAL_CLIENT_SECRET</code> environment variables, then refresh the app.</p>
                      <div className="mt-4">
                        <button onClick={onAccessGranted} className="w-full py-2 bg-indigo-600 text-white rounded-lg opacity-80 hover:opacity-100">
                          Bypass Paywall (Dev Only)
                        </button>
                      </div>
                    </div>
                  ) : (
                    <PayPalScriptProvider options={{ "clientId": payPalClientId, currency: "USD", intent: "capture" }}>
                      <div className="mt-6 z-0 relative">
                        <PayPalButtons
                          style={{ layout: "vertical", shape: "rect", color: "blue" }}
                          createOrder={async (data, actions) => {
                            setError('');
                            try {
                              const res = await fetch("/api/paypal/create-order", { method: "POST" });
                              if (!res.ok) {
                                const errData = await res.json().catch(() => ({}));
                                throw new Error(errData.error || "Could not create paypal order on server.");
                              }
                              const order = await res.json();
                              if (order.id) return order.id;
                              throw new Error("Could not create paypal order");
                            } catch (err: any) {
                              setError(err.message);
                              throw err;
                            }
                          }}
                          onApprove={async (data, actions) => {
                            try {
                              const res = await fetch("/api/paypal/capture-order", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ orderID: data.orderID, userUid: user?.uid })
                              });
                              const captureResult = await res.json();
                              if (captureResult.success) {
                                if (captureResult.serverWriteFailed && user?.uid) {
                                  try {
                                    const { doc, setDoc } = await import('firebase/firestore');
                                    await setDoc(doc(db, 'users', user.uid), { premiumState: true, credits: 100 }, { merge: true });
                                    console.log("Client fallback DB write activated");
                                  } catch (e) {
                                    console.warn("Client fallback DB write failed", e);
                                  }
                                }
                                onAccessGranted();
                              } else {
                                throw new Error("Payment capture failed. Try again.");
                              }
                            } catch (err: any) {
                              setError(err.message);
                            }
                          }}
                        />
                      </div>
                    </PayPalScriptProvider>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-8">
           <div className="flex flex-col items-center justify-center space-y-3">
             <div className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Development Environment</div>
             <button
               onClick={onAccessGranted}
               className="text-sm font-medium text-neutral-500 hover:text-indigo-600 transition-colors underline underline-offset-4 decoration-neutral-300 hover:decoration-indigo-300"
             >
               Skip Login (Enter Demo Mode)
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}
