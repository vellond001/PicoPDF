import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Loader2, Sparkles } from 'lucide-react';

interface PaywallProps {
  onSuccess: (sessionId?: string) => void;
  uid?: string;
}

export function Paywall({ onSuccess, uid }: PaywallProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCheckout = async (priceId: string) => {
    setIsLoading(true);
    setError('');

    try {
      const isDemo = !import.meta.env.VITE_STRIPE_PUBLIC_KEY;
      if (isDemo) {
        // Fallback demo mode logic
        setTimeout(() => {
          onSuccess("demo_session_id");
          setIsLoading(false);
        }, 1500);
        return;
      }

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId, userUid: uid || 'anonymous' }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 font-sans tracking-tight mb-4">
          Unlock the full power of PicoPDF
        </h2>
        <p className="text-lg text-neutral-500 max-w-2xl mx-auto">
          Bring your own key for free, or purchase premium credits for frictionless access to our cloud LLM models. Secure, private, and lightning fast. 
        </p>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm text-center max-w-sm mx-auto">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
        {/* Bring Your Own Key (Free) tier */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8 flex flex-col"
        >
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">Developer / BYOK</h3>
            <p className="text-neutral-500 text-sm h-10">Use your own LLM API keys. Data processed locally where possible.</p>
          </div>
          <div className="mb-6">
            <span className="text-4xl font-bold text-neutral-900">Free</span>
          </div>
          <ul className="space-y-4 mb-8 flex-1 text-sm text-neutral-600">
            <li className="flex items-start">
              <Check className="h-5 w-5 text-neutral-400 mr-3 shrink-0" />
              <span>Unlimited local PDF generation</span>
            </li>
            <li className="flex items-start">
              <Check className="h-5 w-5 text-neutral-400 mr-3 shrink-0" />
              <span>Bring your own Gemini / OpenAI keys</span>
            </li>
            <li className="flex items-start">
              <Check className="h-5 w-5 text-neutral-400 mr-3 shrink-0" />
              <span>No credit card required</span>
            </li>
          </ul>
          <div className="text-center text-sm font-medium text-neutral-500 border border-neutral-200 rounded-lg py-3 mt-auto bg-neutral-50">
            Current Plan
          </div>
        </motion.div>

        {/* Premium Checkout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-neutral-900 rounded-2xl shadow-xl border border-neutral-800 p-8 flex flex-col relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-indigo-500 rounded-full blur-3xl opacity-20 pointer-events-none" />
          
          <div className="mb-6 relative z-10">
            <h3 className="text-xl font-semibold text-white mb-2 flex items-center">
              Credit Pack
              <Sparkles className="w-5 h-5 ml-2 text-indigo-400" />
            </h3>
            <p className="text-neutral-400 text-sm h-10">Frictionless access. We handle the infrastructure and LLM costs.</p>
          </div>
          <div className="mb-6 relative z-10">
            <span className="text-4xl font-bold text-white">$10</span>
            <span className="text-neutral-400 ml-2">/ 100 Credits</span>
          </div>
          <ul className="space-y-4 mb-8 flex-1 text-sm text-neutral-300 relative z-10">
            <li className="flex items-start">
              <Check className="h-5 w-5 text-indigo-400 mr-3 shrink-0" />
              <span className="text-white">Zero configuration required</span>
            </li>
            <li className="flex items-start">
              <Check className="h-5 w-5 text-indigo-400 mr-3 shrink-0" />
              <span>Access to advanced server-side models</span>
            </li>
            <li className="flex items-start">
              <Check className="h-5 w-5 text-indigo-400 mr-3 shrink-0" />
              <span>Secure Global Processing via PayPal</span>
            </li>
          </ul>
          <button
            onClick={() => handleCheckout('price_demo_123')}
            disabled={isLoading}
            className="relative z-10 w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-neutral-900 bg-white hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900 focus:ring-offset-neutral-900 transition-colors disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-neutral-900" /> : 'Purchase Credits'}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
