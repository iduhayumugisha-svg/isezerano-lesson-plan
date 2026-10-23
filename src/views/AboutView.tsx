import React from 'react';
import { 
  GraduationCap, 
  BookOpen, 
  CheckCircle2, 
  ShieldCheck, 
  Target, 
  Users, 
  Sparkles, 
  ArrowRight,
  Layers,
  LayoutDashboard
} from 'lucide-react';
import { WebsitePage } from '../components/WebsiteHeader';

interface AboutViewProps {
  onNavigate: (page: WebsitePage) => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-14">
      
      {/* 1. Header Section */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-900 text-xs font-semibold">
          <BookOpen className="w-3.5 h-3.5 text-teal-700" />
          <span>About ISEZERANO ONLINE</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">
          Supporting Rwandan Educators in Standardized Lesson Planning
        </h1>
        <p className="text-base sm:text-lg text-slate-700 leading-relaxed font-normal">
          ISEZERANO ONLINE is a specialized educational web platform built to help primary and secondary school teachers in Rwanda prepare thorough, pedagogical, and officially aligned Competence-Based Curriculum (CBC) lesson plans.
        </p>
      </div>

      {/* Built by a Rwandan Teacher Feature Section */}
      <div className="bg-slate-900 rounded-2xl p-6 sm:p-10 border border-slate-800 text-white shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-teal-400 font-bold text-xs uppercase tracking-wider">
          <GraduationCap className="w-5 h-5 text-teal-400" />
          <span>Built by a Rwandan Teacher</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          From the Classroom of GS GITUMBA to Rwandan Educators Everywhere
        </h2>
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
          This platform was developed by a Rwandan teacher serving at <strong className="text-white font-bold">GS GITUMBA</strong>, a school located in <strong className="text-white font-bold">Buyoga Sector, Rulindo District, Northern Province, Rwanda</strong>. It was created to support fellow educators in preparing well-structured lesson plans aligned with Rwanda’s Competence-Based Curriculum (CBC) and to make lesson preparation easier, more organized, and more efficient.
        </p>
      </div>

      {/* 2. Purpose & Context */}
      <div className="bg-white rounded-2xl p-6 sm:p-10 border border-slate-200 shadow-2xs space-y-5">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center space-x-2.5">
          <Target className="w-6 h-6 text-teal-700" />
          <span>Our Purpose</span>
        </h2>
        
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          In Rwanda, the introduction of the Competence-Based Curriculum (CBC) by the Ministry of Education (MINEDUC) and the Rwanda Basic Education Board (REB) represented a transformative shift from rote memorization toward learner-centered competence development.
        </p>

        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          However, drafting detailed 8-column lesson plans by hand or in generic text editors requires extensive repetitive formatting each week. Teachers must balance instructional objectives across Bloom's Taxonomy, integrate generic competences and cross-cutting issues, and detail concrete teacher activities and learner tasks.
        </p>

        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          ISEZERANO ONLINE eliminates this mechanical friction by providing a structured, guided digital workspace tailored specifically to the official Rwandan CBC format.
        </p>
      </div>

      {/* 3. Core Principles (Honest & Transparent) */}
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Guiding Principles
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Built with respect for teachers' time, privacy, and pedagogical autonomy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3 hover:border-teal-300 transition-all">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5 text-teal-700" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">REB Standards Fidelity</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              We adhere strictly to official national guidelines without modifying the mandated 8-column structure or introducing non-standard requirements.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3 hover:border-teal-300 transition-all">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center font-bold">
              <Users className="w-5 h-5 text-teal-700" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Zero-Barrier Access</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Teachers can start drafting immediately. There is no forced sign-in wall, mandatory personal data collection, or paywall to use the core lesson plan generator.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3 hover:border-teal-300 transition-all">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5 text-teal-700" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Offline & In-Browser Resilience</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              We understand classroom connectivity in various districts may be intermittent. Data is stored safely within your device's browser local database.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Supported Framework Details */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-4">
        <h3 className="text-base font-bold text-slate-900">
          Curriculum Standards Supported:
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-700">
          <div className="flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
            <span><strong>Grades & Levels:</strong> Full coverage of Primary (P1 to P6) and Secondary (S1 to S6) levels.</span>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
            <span><strong>Objectives Structure:</strong> Bloom's Taxonomy categorization (Knowledge & Understanding, Skills, Attitudes & Values).</span>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
            <span><strong>CBC Generic Competences:</strong> Critical Thinking, Creativity & Innovation, Research & Problem Solving, Communication, Cooperation, and Lifelong Learning.</span>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
            <span><strong>Cross-Cutting Issues:</strong> Gender Education, Environment & Sustainability, Peace & Values, Comprehensive Sexuality Education, and Financial Education.</span>
          </div>
        </div>
      </div>

      {/* 5. Direct CTA */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
        <button
          onClick={() => onNavigate('dashboard')}
          className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-7 py-3 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-sm transition-all active:scale-98 cursor-pointer"
        >
          <LayoutDashboard className="w-4 h-4 text-teal-400" />
          <span>Go to Dashboard</span>
        </button>

        <button
          onClick={() => onNavigate('create')}
          className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-xl text-sm font-semibold text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-300 transition-all cursor-pointer"
        >
          <span>Create Lesson Plan</span>
          <ArrowRight className="w-4 h-4 text-teal-700" />
        </button>
      </div>

    </div>
  );
};
