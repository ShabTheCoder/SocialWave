import React from 'react';
import { Shield, Lock, Eye, FileText, ChevronLeft } from 'lucide-react';
import { motion } from 'motion/react';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-4 mb-8">
        <a href="/" className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors">
          <ChevronLeft size={24} className="text-stone-600 dark:text-stone-400" />
        </a>
        <div>
          <h1 className="text-3xl font-display font-bold text-stone-900 dark:text-stone-50">Privacy Policy</h1>
          <p className="text-stone-400">Last updated: March 20, 2026</p>
        </div>
      </div>

      <div className="bg-white dark:bg-stone-900 rounded-[2.5rem] border border-black/5 dark:border-white/5 p-6 sm:p-8 md:p-12 space-y-12">
        <section className="space-y-4">
          <div className="flex items-center gap-3 text-stone-900 dark:text-stone-50">
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center">
              <Shield className="text-emerald-500" size={20} />
            </div>
            <h2 className="text-xl font-bold">Our Commitment</h2>
          </div>
          <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
            At SocialWave, your privacy is our top priority. We believe in transparency and giving you full control over your data. This policy explains how we collect, use, and protect your information.
          </p>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3 text-stone-900 dark:text-stone-50">
            <div className="w-10 h-10 bg-sky-50 dark:bg-sky-900/20 rounded-xl flex items-center justify-center">
              <Eye className="text-sky-500" size={20} />
            </div>
            <h2 className="text-xl font-bold">Information We Collect</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 bg-stone-50 dark:bg-stone-800/50 rounded-3xl border border-black/5 dark:border-white/5">
              <h3 className="font-bold mb-2">Account Info</h3>
              <p className="text-sm text-stone-500">Your name, email, and profile picture provided during authentication.</p>
            </div>
            <div className="p-6 bg-stone-50 dark:bg-stone-800/50 rounded-3xl border border-black/5 dark:border-white/5">
              <h3 className="font-bold mb-2">Content</h3>
              <p className="text-sm text-stone-500">The posts, comments, and messages you share on the platform.</p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3 text-stone-900 dark:text-stone-50">
            <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center">
              <Lock className="text-amber-500" size={20} />
            </div>
            <h2 className="text-xl font-bold">How We Protect Data</h2>
          </div>
          <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
            We use industry-standard encryption and security protocols to ensure your data stays safe. Your information is stored in a secure database and is only accessible through authenticated sessions.
          </p>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3 text-stone-900 dark:text-stone-50">
            <div className="w-10 h-10 bg-rose-50 dark:bg-rose-900/20 rounded-xl flex items-center justify-center">
              <FileText className="text-rose-500" size={20} />
            </div>
            <h2 className="text-xl font-bold">Your Rights</h2>
          </div>
          <ul className="space-y-3 text-stone-600 dark:text-stone-400">
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0" />
              <span>Right to access your data at any time.</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0" />
              <span>Right to delete your account and all associated data.</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0" />
              <span>Right to export your data for your own use.</span>
            </li>
          </ul>
        </section>

        <div className="pt-8 border-t border-black/5 dark:border-white/5">
          <p className="text-sm text-stone-400 text-center italic">
            Questions? Reach out to us at privacy@socialwave.app
          </p>
        </div>
      </div>
    </div>
  );
};
