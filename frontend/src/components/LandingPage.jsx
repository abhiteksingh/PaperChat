import { useState } from 'react';
import { ROUTES } from '../routes';

function LandingPage({ onStartChat }) {
  const [activeWorkTab, setActiveWorkTab] = useState('Auditor');

  const demoChats = {
    Auditor: [
      { role: 'user', content: 'Are there any liability exclusions in Section 4?' },
      { role: 'assistant', content: 'Yes, Section 4.2 excludes liability for consequential damages and indirect lost profits. Strict mutual exclusions are detailed in Section 4.3 [p.4]' }
    ],
    Notepad: [
      { role: 'user', content: 'Draft a brief executive outline of the agreement findings' },
      { role: 'assistant', content: 'Here is the summary outline:\n1. Parties involved: ACME Corp & Delta LLC [p.2]\n2. Liability limits: capped at $1.5M [p.14]\n3. Indemnification: mutual exclusions apply [p.18]' }
    ],
    Sandbox: [
      { role: 'user', content: 'Graph the velocity vector fields described in Chapter 2' },
      { role: 'assistant', content: 'Formulas in Section 2.4 define the velocity fields. I have plotted the vectors showing flow rate convergence over page 11 parameters [p.11]' }
    ],
    Detective: [
      { role: 'user', content: 'Find connections between Project Alpha emails and this spreadsheet' },
      { role: 'assistant', content: 'The timeline matches the Project Alpha email sent on May 12 with the expenses recorded on page 6 of Spreadsheet 3 [p.6]' }
    ]
  };

  const testimonials = [
    { quote: "The Auditor Desk helped us catch a major NDA conflict on Page 8 before signing.", name: "Sarah L.", role: "Corporate Attorney" },
    { quote: "Notepad Canvas let me draft a full research memo from 5 source papers in under an hour.", name: "David K.", role: "Academic Author" },
    { quote: "Adjusting model parameters dynamically in the Mental Sandbox made the equations click.", name: "Elena M.", role: "MIT Student" },
    { quote: "Tracing emails and spreadsheets on the Detective Board solved a 3-week audit in hours.", name: "Mark T.", role: "Financial Auditor" },
    { quote: "Perfect for compliance review. I can verify regulatory rules instantly.", name: "Chloe J.", role: "Ops Director" },
    { quote: "We upload quarterly sales reports and inspect numerical trends in the sandbox.", name: "Marcus P.", role: "Business Lead" },
    { quote: "JetBrains Mono on citation chips makes it feel so technical and precise.", name: "Liam R.", role: "CS Major" },
    { quote: "Brings extreme confidence to our policy reviews. No more reading text guides for hours.", name: "Sophia A.", role: "HR Director" },
    { quote: "Docent changed the way we handle complex forensic data filings.", name: "Tom W.", role: "Venture Analyst" }
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E8E8E8] font-body selection:bg-[#4C8DFF]/20 selection:text-white relative overflow-x-hidden">
      
      {/* Header Nav */}
      <nav className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between border-b border-[#2A2A2A]">
        <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => window.location.reload()}>
          <span className="font-display text-2xl font-medium tracking-tight text-white select-none">Docent</span>
          <span className="w-1.5 h-1.5 bg-[#4C8DFF] rounded-full mt-2"></span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-sm text-[#9A9A9A] font-medium">
          <a href="#workspaces" className="hover:text-white transition">Auditor Desk</a>
          <a href="#workspaces" className="hover:text-white transition">Notepad Canvas</a>
          <a href="#workspaces" className="hover:text-white transition">Mental Sandbox</a>
          <a href="#workspaces" className="hover:text-white transition">Detective Board</a>
        </div>
        
        <div className="flex items-center gap-4">
          <button onClick={() => onStartChat(ROUTES.CHAT)} className="text-sm font-medium text-[#9A9A9A] hover:text-white transition cursor-pointer">Log in</button>
          <button 
            onClick={() => onStartChat(ROUTES.CHAT)} 
            className="bg-[#4C8DFF] hover:bg-[#6FA2FF] text-white px-5 py-2.5 rounded-full text-xs font-semibold tracking-wide shadow-[0_0_20px_rgba(76,141,255,0.15)] active:scale-95 transition-all duration-150 cursor-pointer"
          >
            Try Docent
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="max-w-5xl mx-auto px-6 pt-20 pb-24 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#161616] border border-[#2A2A2A] text-xs font-medium text-[#9A9A9A] mb-8 select-none">
          <span>⚡</span>
          <span>Now reads 40+ file types</span>
        </div>
        
        <h1 className="font-display text-5xl md:text-7xl font-normal text-white tracking-tight leading-tight max-w-3xl mx-auto mb-6">
          Ask your files <span className="italic text-[#4C8DFF]">anything.</span>
        </h1>
        
        <p className="text-base md:text-lg text-[#9A9A9A] max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
          Upload a PDF, deck, or spreadsheet. Select your workspace mindset to audit, write, simulate, or map connections.
        </p>
        
        <div className="flex flex-col items-center gap-3 mb-20">
          <button 
            onClick={() => onStartChat(ROUTES.CHAT)} 
            className="bg-[#4C8DFF] hover:bg-[#6FA2FF] text-white px-8 py-4 rounded-full text-sm font-semibold tracking-wide shadow-[0_0_30px_rgba(76,141,255,0.25)] active:scale-95 transition-all duration-150 cursor-pointer"
          >
            Get started
          </button>
          <span className="text-xs text-[#9A9A9A]">1 min setup, no card required</span>
        </div>

        {/* Hero Visual Panel with Ghosted Watermark */}
        <div className="relative max-w-2xl mx-auto h-72 flex items-center justify-center">
          {/* Watermark text */}
          <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none z-0">
            <span className="font-display text-[10rem] md:text-[14rem] font-bold text-white/[0.04] leading-none">Docent</span>
          </div>
          
          {/* Floating file card */}
          <div className="relative z-10 bg-[#161616] border border-[#2A2A2A] rounded-[20px] p-6 shadow-2xl w-full max-w-md animate-fade-in flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#4C8DFF]/10 border border-[#4C8DFF]/20 flex items-center justify-center text-xl shadow-inner">📄</div>
              <div className="text-left">
                <p className="font-mono text-sm text-white font-medium">Agreement-Draft.pdf</p>
                <p className="text-xs text-[#9A9A9A] mt-0.5 font-mono">PDF Document · Indexed</p>
              </div>
            </div>
            
            <div className="bg-[#3ECF8E]/10 border border-[#3ECF8E]/20 text-[#3ECF8E] text-[10px] font-mono px-3 py-1 rounded-full font-semibold select-none">
              Indexed ✓
            </div>
          </div>
        </div>
      </header>

      {/* Value Proposition */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-[#2A2A2A]">
        <div className="grid md:grid-cols-2 gap-8 mb-16 items-end">
          <h2 className="font-display text-3xl md:text-4xl text-white font-normal leading-tight">
            Built to be trusted,<br />not just fast
          </h2>
          <p className="text-[#9A9A9A] text-sm leading-relaxed max-w-md">
            Every answer traces back to your files — nothing invented. Hover or click on citation chips to inspect exact page excerpts inside sliding panels.
          </p>
        </div>

        {/* 3-Card Grid inside one large panel */}
        <div className="bg-[#161616] border border-[#2A2A2A] rounded-[20px] p-4 md:p-8 grid md:grid-cols-3 gap-6 md:gap-8">
          
          {/* Card 1 */}
          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-[20px] p-6 text-left flex flex-col justify-between min-h-64 shadow-md">
            <div>
              <span className="text-2xl">🔍</span>
              <h3 className="font-display text-xl text-white font-normal mt-4 mb-2">Cited, not guessed</h3>
              <p className="text-xs text-[#9A9A9A] leading-relaxed">
                Clickable citation chips inline reveal exact document paragraphs inside sliding panels.
              </p>
            </div>
            <div className="mt-4 bg-[#161616] p-3 rounded-xl border border-[#2A2A2A] font-mono text-[10px] text-zinc-400 flex items-center justify-between select-none">
              <span>...entailment checks verified</span>
              <span className="bg-[#4C8DFF]/15 border border-[#4C8DFF]/20 text-[#4C8DFF] px-1.5 py-0.5 rounded text-[9px] hover:shadow-[0_0_10px_rgba(76,141,255,0.3)] transition font-bold">[p.14]</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-[20px] p-6 text-left flex flex-col justify-between min-h-64 shadow-md">
            <div>
              <span className="text-2xl">📦</span>
              <h3 className="font-display text-xl text-white font-normal mt-4 mb-2">Multi-Format Indexing</h3>
              <p className="text-xs text-[#9A9A9A] leading-relaxed">
                Indexes PDFs, PPTXs, XLSX sheets, DOCX contracts, and CSV data structures securely.
              </p>
            </div>
            <div className="mt-4 flex gap-2 select-none justify-center">
              {['PDF', 'PPTX', 'XLSX', 'DOCX', 'CSV'].map((ext) => (
                <span key={ext} className="bg-[#161616] border border-[#2A2A2A] px-2.5 py-1 rounded text-[9px] font-mono text-zinc-400 font-bold">{ext}</span>
              ))}
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-[20px] p-6 text-left flex flex-col justify-between min-h-64 shadow-md">
            <div>
              <span className="text-2xl">⚡</span>
              <h3 className="font-display text-xl text-white font-normal mt-4 mb-2">Mindset Workspaces</h3>
              <p className="text-xs text-[#9A9A9A] leading-relaxed">
                Specialized cognitive structures: Auditor Desk, Notepad Canvas, Concept Sandbox, and Detective Board.
              </p>
            </div>
            <div className="mt-4 flex justify-between gap-1 text-[9px] font-mono text-zinc-400 font-bold select-none text-center">
              <span className="flex-1 bg-[#161616] border border-[#2A2A2A] p-1.5 rounded-lg">⚖️ Auditor</span>
              <span className="flex-1 bg-[#161616] border border-[#2A2A2A] p-1.5 rounded-lg">📝 Notepad</span>
              <span className="flex-1 bg-[#161616] border border-[#2A2A2A] p-1.5 rounded-lg">📊 Sandbox</span>
            </div>
          </div>

        </div>
      </section>

      {/* How It Works with Demo Mockup */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-[#2A2A2A]">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-4xl text-white font-normal mb-4">How it works</h2>
          
          {/* Pill Tabs visual Segmented Control */}
          <div className="inline-flex bg-[#161616] border border-[#2A2A2A] rounded-full p-1 mb-8 shadow-inner select-none">
            {['Auditor', 'Notepad', 'Sandbox', 'Detective'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveWorkTab(tab)}
                className="px-6 py-2 rounded-full text-xs font-semibold transition active:scale-95 cursor-pointer text-[#9A9A9A] hover:text-white"
                style={activeWorkTab === tab ? { backgroundColor: '#4C8DFF', color: 'white' } : {}}
              >
                {tab}
              </button>
            ))}
          </div>
          
          {/* Chat demo mockup card */}
          <div className="bg-[#161616] border border-[#2A2A2A] rounded-[20px] p-6 max-w-2xl mx-auto shadow-2xl text-left font-sans">
            <div className="space-y-4">
              {demoChats[activeWorkTab].map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#4C8DFF] text-white shadow-sm'
                      : 'bg-[#0A0A0A] border border-[#2A2A2A] text-zinc-300'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <>
                        {msg.content.replace(/\[p\.\d+\]/, '')}
                        <span className="font-mono text-[9px] bg-[#4C8DFF]/15 border border-[#4C8DFF]/20 text-[#4C8DFF] px-1.5 py-0.5 rounded font-bold hover:shadow-[0_0_10px_rgba(76,141,255,0.3)] transition ml-2 cursor-pointer select-none">
                          [p.{msg.content.match(/\[p\.(\d+)\]/)?.[1] || 4}]
                        </span>
                      </>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4-Step Numbered Row */}
        <div className="grid md:grid-cols-4 gap-4 md:gap-6 mt-12">
          {[
            { num: '1', title: 'Upload your files', desc: 'Drag in PDFs, slides, or spreadsheets.' },
            { num: '2', title: 'Choose your workspace', desc: 'Select your paradigm: Auditor, Notepad, Sandbox, or Detective.' },
            { num: '3', title: 'Ask or interact', desc: 'Prompt the agent or play with slider simulation nodes.' },
            { num: '4', title: 'Trace citations', desc: 'Verify statements directly using local page caches.' }
          ].map((step) => (
            <div key={step.num} className="bg-[#161616] border border-[#2A2A2A] rounded-[20px] p-5 text-left shadow-sm flex flex-col justify-between min-h-36">
              <span className="font-mono text-[10px] bg-[#4C8DFF]/10 border border-[#4C8DFF]/20 text-[#4C8DFF] w-6 h-6 rounded-full flex items-center justify-center font-bold">{step.num}</span>
              <div className="mt-3">
                <h4 className="font-display text-sm text-white font-medium mb-1">{step.title}</h4>
                <p className="text-[11px] text-[#9A9A9A] leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Specialized Cognitive Chatbots */}
      <section id="workspaces" className="max-w-7xl mx-auto px-6 py-20 border-t border-[#2A2A2A]">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl text-white font-normal leading-tight">
            Choose Your Workspace Paradigm
          </h2>
          <p className="text-xs text-[#9A9A9A] mt-2 max-w-lg mx-auto leading-relaxed">
            Select from four custom-engineered chatbots, each designed around a distinct user mindset, layout, and analysis engine.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid md:grid-cols-4 gap-6">
          
          {/* Card A: Spaced Learning & Document Digest */}
          <div 
            onClick={() => onStartChat(ROUTES.LEARNING)}
            className="bg-[#161616] border border-[#2A2A2A] hover:border-[#4C8DFF]/40 rounded-[20px] p-6 text-left shadow-lg hover:shadow-[0_0_25px_rgba(76,141,255,0.1)] hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-72"
          >
            <div>
              <span className="text-2xl select-none">🎓</span>
              <h3 className="font-display text-base text-white font-medium mt-4 mb-2">Spaced Learning & Document Digest</h3>
              <p className="text-[11px] text-[#9A9A9A] leading-relaxed">
                Active recall Socratic tutoring, concept maps, and spaced repetition flashcards for lectures and manuals.
              </p>
            </div>
            <span className="text-[10px] text-[#4C8DFF] font-semibold tracking-wider uppercase mt-4">Launch Learning Mode →</span>
          </div>

          {/* Card B: Contract Compliance & Risk Auditor */}
          <div 
            onClick={() => onStartChat(ROUTES.AUDITOR)}
            className="bg-[#161616] border border-[#2A2A2A] hover:border-red-500/40 rounded-[20px] p-6 text-left shadow-lg hover:shadow-[0_0_25px_rgba(239,68,68,0.1)] hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-72"
          >
            <div>
              <span className="text-2xl select-none">⚖️</span>
              <h3 className="font-display text-base text-white font-medium mt-4 mb-2">Contract Compliance & Risk Auditor</h3>
              <p className="text-[11px] text-[#9A9A9A] leading-relaxed">
                Adversarial red-team checks, clause evaluations, and natural language logic checks for legal documents.
              </p>
            </div>
            <span className="text-[10px] text-red-400 font-semibold tracking-wider uppercase mt-4">Launch Auditor Mode →</span>
          </div>

          {/* Card C: Spreadsheet Analytics & Quantitative Sandbox */}
          <div 
            onClick={() => onStartChat(ROUTES.ANALYTICS)}
            className="bg-[#161616] border border-[#2A2A2A] hover:border-[#3ECF8E]/40 rounded-[20px] p-6 text-left shadow-lg hover:shadow-[0_0_25px_rgba(62,207,142,0.1)] hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-72"
          >
            <div>
              <span className="text-2xl select-none">📊</span>
              <h3 className="font-display text-base text-white font-medium mt-4 mb-2">Spreadsheet Analytics & Quantitative Sandbox</h3>
              <p className="text-[11px] text-[#9A9A9A] leading-relaxed">
                Numerical dataset simulations, variable sliders, parameter analysis, and graphical trace overlays.
              </p>
            </div>
            <span className="text-[10px] text-[#3ECF8E] font-semibold tracking-wider uppercase mt-4">Launch Analytics Mode →</span>
          </div>

          {/* Card D: CV Analyzer & Mock Interview Simulator */}
          <div 
            onClick={() => onStartChat(ROUTES.SIMULATOR)}
            className="bg-[#161616] border border-[#2A2A2A] hover:border-[#FFB04C]/40 rounded-[20px] p-6 text-left shadow-lg hover:shadow-[0_0_25px_rgba(255,176,76,0.1)] hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-72"
          >
            <div>
              <span className="text-2xl select-none">🗺️</span>
              <h3 className="font-display text-base text-white font-medium mt-4 mb-2">CV Analyzer & Mock Interview Simulator</h3>
              <p className="text-[11px] text-[#9A9A9A] leading-relaxed">
                Candidate resume parsing, structural skillset profile alignment, and interactive mock roleplays.
              </p>
            </div>
            <span className="text-[10px] text-[#FFB04C] font-semibold tracking-wider uppercase mt-4">Launch Simulator Mode →</span>
          </div>

        </div>
      </section>

      {/* Testimonials Quote Grid (3x3 inside one dark panel) */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-[#2A2A2A]">
        <h2 className="font-display text-3xl text-white font-normal text-center mb-12">What people are getting done</h2>
        
        <div className="bg-[#161616] border border-[#2A2A2A] rounded-[20px] overflow-hidden grid md:grid-cols-3 gap-[1px] bg-[#2A2A2A]">
          {testimonials.map((test, idx) => (
            <div key={idx} className="bg-[#0A0A0A] p-8 flex flex-col justify-between min-h-48 text-left">
              <p className="text-xs leading-relaxed text-zinc-300 italic">"{test.quote}"</p>
              <div className="mt-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#4C8DFF]/10 border border-[#4C8DFF]/20 text-[10px] flex items-center justify-center font-bold">👤</div>
                <div>
                  <p className="text-[11px] text-white font-semibold">{test.name}</p>
                  <p className="text-[9px] text-[#9A9A9A] font-mono">{test.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 pt-16 pb-12 border-t border-[#2A2A2A] text-xs text-[#9A9A9A]">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-12 text-left">
          <div>
            <h4 className="font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-2">
              <li><span className="hover:text-white cursor-pointer">Features</span></li>
              <li><span className="hover:text-white cursor-pointer">Pricing</span></li>
              <li><span className="hover:text-white cursor-pointer">Workspaces</span></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">Resources</h4>
            <ul className="space-y-2">
              <li><span className="hover:text-white cursor-pointer">Blog</span></li>
              <li><span className="hover:text-white cursor-pointer">Help Center</span></li>
              <li><span className="hover:text-white cursor-pointer">Docs</span></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-2">
              <li><span className="hover:text-white cursor-pointer">About</span></li>
              <li><span className="hover:text-white cursor-pointer">Terms of Service</span></li>
              <li><span className="hover:text-white cursor-pointer">Privacy Policy</span></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#2A2A2A] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 select-none">
            <span className="font-display text-lg font-medium text-white">Docent</span>
            <span className="w-1.5 h-1.5 bg-[#4C8DFF] rounded-full mt-1.5"></span>
          </div>
          <p>© 2026 Docent AI, Inc. All rights reserved.</p>
          <div className="flex gap-4 font-semibold text-[10px] text-white">
            <span className="bg-[#161616] border border-[#2A2A2A] px-3 py-1.5 rounded-full select-none shadow-sm">Loved on Product Hunt 😻</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default LandingPage;
