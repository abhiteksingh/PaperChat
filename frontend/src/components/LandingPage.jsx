import { useState, useEffect, useRef } from 'react';
import { ROUTES } from '../routes';

// ScrollReveal component utilizing IntersectionObserver for scroll sliding animations
function ScrollReveal({ children, className = "", delay = 0, duration = 800, threshold = 0.1, id }) {
  const domRef = useRef();
  const [isVisible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(domRef.current);
        }
      });
    }, { threshold });
    
    if (domRef.current) {
      observer.observe(domRef.current);
    }
    
    return () => {
      if (domRef.current) observer.unobserve(domRef.current);
    };
  }, [threshold]);

  return (
    <div
      ref={domRef}
      id={id}
      className={`reveal-element ${isVisible ? 'revealed' : ''} ${className}`}
      style={{
        transitionDelay: `${delay}ms`,
        transitionDuration: `${duration}ms`
      }}
    >
      {children}
    </div>
  );
}

function LandingPage({ onStartChat }) {
  const [activeWorkTab, setActiveWorkTab] = useState('Auditor');

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

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

  const [activeTabLogs, setActiveTabLogs] = useState([]);

  // Generate mock logs for visualization
  useEffect(() => {
    const events = {
      Auditor: ["Loading database schema...", "Extracting liability elements...", "Generating visual trace graph..."],
      Notepad: ["Scanning pages...", "Mapping hierarchical concepts...", "Building flashcards queue..."],
      Sandbox: ["Reading CSV columns...", "Starting parameter models...", "Calculating equation overlays..."],
      Detective: ["Parsing resume PDF...", "Running match alignment...", "Creating detective board..."]
    };
    setActiveTabLogs(events[activeWorkTab] || []);
  }, [activeWorkTab]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E8E8E8] relative overflow-x-hidden font-body">
      
      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-10%] left-[-20%] w-[600px] h-[600px] rounded-full bg-[#4C8DFF]/8 blur-[150px] pointer-events-none"></div>
      <div className="absolute top-[30%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#3ECF8E]/4 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#FF4C4C]/4 blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#FFB04C]/5 blur-[120px] pointer-events-none"></div>

      {/* Header Nav */}
      <nav className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between border-b border-[#2A2A2A]/40 relative z-20 backdrop-blur-md bg-[#070708]/30">
        <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => window.location.reload()}>
          <span className="font-display text-2xl font-medium tracking-tight text-white select-none">Docent</span>
          <span className="w-1.5 h-1.5 bg-[#4C8DFF] rounded-full mt-2 animate-pulse"></span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-xs uppercase tracking-wider text-[#9A9A9A]">
          <button onClick={() => scrollToSection("trusted-section")} className="hover:text-white transition-colors duration-200 cursor-pointer bg-transparent border-0 uppercase font-semibold">Citations & Trust</button>
          <button onClick={() => scrollToSection("how-it-works-section")} className="hover:text-white transition-colors duration-200 cursor-pointer bg-transparent border-0 uppercase font-semibold">How it works</button>
          <button onClick={() => scrollToSection("workspaces")} className="hover:text-white transition-colors duration-200 cursor-pointer bg-transparent border-0 uppercase font-semibold">Workspaces</button>
          <button onClick={() => scrollToSection("contact-us")} className="hover:text-white transition-colors duration-200 cursor-pointer bg-transparent border-0 uppercase font-semibold">Contact Us</button>
        </div>
        
        <div className="flex items-center gap-4">
          <button onClick={() => onStartChat(ROUTES.CHAT)} className="text-xs font-semibold uppercase tracking-wider text-[#9A9A9A] hover:text-white transition cursor-pointer">Log in</button>
          <button 
            onClick={() => onStartChat(ROUTES.CHAT)} 
            className="bg-[#4C8DFF] hover:bg-[#6FA2FF] text-white px-5 py-2.5 rounded-full text-xs font-bold tracking-wide shadow-[0_0_20px_rgba(76,141,255,0.15)] hover:shadow-[0_0_25px_rgba(76,141,255,0.35)] active:scale-95 transition-all duration-300 cursor-pointer"
          >
            Try Docent
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="max-w-5xl mx-auto px-6 pt-24 pb-24 text-center relative z-10">
        <ScrollReveal delay={0}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#161616]/80 border border-[#2A2A2A]/80 text-xs font-medium text-[#9D9D9C] mb-8 select-none backdrop-blur-sm shadow-md">
            <span className="text-[#4C8DFF]">⚡</span>
            <span className="tracking-wide">Now reads 40+ file types</span>
          </div>
        </ScrollReveal>
        
        <ScrollReveal delay={100}>
          <h1 className="font-display text-6xl md:text-8xl font-normal text-white tracking-tight leading-none max-w-4xl mx-auto mb-8">
            Ask your files <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-[#4C8DFF] to-[#6FA2FF]">anything.</span>
          </h1>
        </ScrollReveal>
        
        <ScrollReveal delay={200}>
          <p className="text-base md:text-xl text-[#9A9A9A] max-w-2xl mx-auto mb-12 leading-relaxed font-light">
            Upload a PDF, slide deck, or spreadsheet. Choose a workspace mindset to audit compliance, write outlines, run equations, or trace connections.
          </p>
        </ScrollReveal>
        
        <ScrollReveal delay={300}>
          <div className="flex flex-col items-center gap-3 mb-20">
            <button 
              onClick={() => onStartChat(ROUTES.CHAT)} 
              className="bg-gradient-to-r from-[#4C8DFF] to-blue-600 hover:from-[#6FA2FF] hover:to-[#4C8DFF] text-white px-9 py-4.5 rounded-full text-sm font-semibold tracking-wide shadow-[0_0_35px_rgba(76,141,255,0.25)] hover:shadow-[0_0_45px_rgba(76,141,255,0.45)] active:scale-95 transition-all duration-300 cursor-pointer"
            >
              Get Started
            </button>
            <span className="text-xs text-[#6A6A6A] font-mono tracking-wider">1 MIN SETUP • NO CARD REQUIRED</span>
          </div>
        </ScrollReveal>

        {/* Hero Visual Panel with Ghosted Watermark */}
        <ScrollReveal delay={400} className="relative max-w-2xl mx-auto h-72 flex items-center justify-center">
          {/* Watermark text */}
          <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none z-0">
            <span className="font-display text-[10rem] md:text-[14rem] font-bold text-white/[0.02] leading-none">Docent</span>
          </div>
          
          {/* Floating file card */}
          <div className="relative z-10 bg-[#161618]/60 border border-[#2A2A2E]/80 backdrop-blur-xl rounded-[24px] p-6 shadow-[0_30px_60px_rgba(0,0,0,0.5)] w-full max-w-md flex items-center justify-between transition-transform duration-500 hover:scale-[1.02]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#4C8DFF]/10 border border-[#4C8DFF]/20 flex items-center justify-center text-xl shadow-inner select-none">
                📄
              </div>
              <div className="text-left">
                <p className="font-mono text-sm text-white font-medium">Agreement-Draft.pdf</p>
                <p className="text-[10px] text-[#9A9A9A] mt-1 font-mono uppercase tracking-wider">PDF Document • 24 Chunks</p>
              </div>
            </div>
            
            <div className="bg-[#3ECF8E]/10 border border-[#3ECF8E]/20 text-[#3ECF8E] text-[10px] font-mono px-3.5 py-1.5 rounded-full font-semibold select-none flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-[#3ECF8E] rounded-full animate-pulse"></span>
              Indexed
            </div>
          </div>
        </ScrollReveal>
      </header>

      {/* Value Proposition */}
      <section id="trusted-section" className="max-w-7xl mx-auto px-6 py-28 border-t border-[#2A2A2A]/40 relative z-10">
        <ScrollReveal>
          <div className="grid md:grid-cols-2 gap-8 mb-20 items-end">
            <h2 className="font-display text-4xl md:text-5xl text-white font-normal leading-tight">
              Built to be trusted,<br />not just fast
            </h2>
            <p className="text-[#9A9A9A] text-sm leading-relaxed max-w-md font-light">
              Every response traces back directly to your files — no hallucinations. Hover or click on citation chips to view exact page excerpts in side-by-side inspection layers.
            </p>
          </div>
        </ScrollReveal>

        {/* 3-Card Grid inside one large panel */}
        <div className="bg-[#121214]/40 border border-[#2A2A30]/50 backdrop-blur-md rounded-[28px] p-6 md:p-8 grid md:grid-cols-3 gap-6 md:gap-8 shadow-inner">
          
          {/* Card 1 */}
          <ScrollReveal delay={100}>
            <div className="bg-[#09090B]/80 border border-[#222226] hover:border-[#4C8DFF]/40 rounded-[20px] p-6 text-left flex flex-col justify-between min-h-64 shadow-md transition-all duration-300 hover:scale-[1.02] group">
              <div>
                <span className="text-3xl select-none group-hover:scale-110 duration-300 block w-fit">🎯</span>
                <h3 className="font-display text-xl text-white font-normal mt-5 mb-3">Cited, not guessed</h3>
                <p className="text-xs text-[#9A9A9A] leading-relaxed font-light">
                  Clickable citation chips inline reveal exact document paragraphs inside sliding panels.
                </p>
              </div>
              <div className="mt-6 bg-[#161618]/70 p-3 rounded-xl border border-[#2A2A2E]/60 font-mono text-[9px] text-zinc-400 flex items-center justify-between select-none">
                <span>...entailment checks verified</span>
                <span className="bg-[#4C8DFF]/15 border border-[#4C8DFF]/20 text-[#4C8DFF] px-1.5 py-0.5 rounded text-[8px] hover:shadow-[0_0_10px_rgba(76,141,255,0.3)] transition font-bold select-none cursor-pointer">[p.14]</span>
              </div>
            </div>
          </ScrollReveal>

          {/* Card 2 */}
          <ScrollReveal delay={200}>
            <div className="bg-[#09090B]/80 border border-[#222226] hover:border-[#3ECF8E]/40 rounded-[20px] p-6 text-left flex flex-col justify-between min-h-64 shadow-md transition-all duration-300 hover:scale-[1.02] group">
              <div>
                <span className="text-3xl select-none group-hover:scale-110 duration-300 block w-fit">📂</span>
                <h3 className="font-display text-xl text-white font-normal mt-5 mb-3">Multi-Format Indexing</h3>
                <p className="text-xs text-[#9A9A9A] leading-relaxed font-light">
                  Indexes PDFs, PPTXs, XLSX sheets, DOCX contracts, and CSV datasets securely.
                </p>
              </div>
              <div className="mt-6 flex gap-1.5 select-none justify-center">
                {['PDF', 'DOCX', 'XLSX', 'PPTX', 'CSV'].map((ext) => (
                  <span key={ext} className="bg-[#161618]/70 border border-[#2A2A2E]/60 px-2 py-1 rounded text-[8px] font-mono text-zinc-400 font-bold tracking-wider">{ext}</span>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* Card 3 */}
          <ScrollReveal delay={300}>
            <div className="bg-[#09090B]/80 border border-[#222226] hover:border-[#FFB04C]/40 rounded-[20px] p-6 text-left flex flex-col justify-between min-h-64 shadow-md transition-all duration-300 hover:scale-[1.02] group">
              <div>
                <span className="text-3xl select-none group-hover:scale-110 duration-300 block w-fit">🧠</span>
                <h3 className="font-display text-xl text-white font-normal mt-5 mb-3">Mindset Workspaces</h3>
                <p className="text-xs text-[#9A9A9A] leading-relaxed font-light">
                  Four specialized cognitive workspaces: Auditor, Notepad Canvas, Sandbox, and Detective.
                </p>
              </div>
              <div className="mt-6 flex justify-between gap-1 text-[8px] font-mono text-zinc-400 font-bold select-none text-center">
                <span className="flex-1 bg-[#161618]/70 border border-[#2A2A2E]/60 py-1.5 px-0.5 rounded-lg">🛡️ Auditor</span>
                <span className="flex-1 bg-[#161618]/70 border border-[#2A2A2E]/60 py-1.5 px-0.5 rounded-lg">📝 Notepad</span>
                <span className="flex-1 bg-[#161618]/70 border border-[#2A2A2E]/60 py-1.5 px-0.5 rounded-lg">🔬 Sandbox</span>
              </div>
            </div>
          </ScrollReveal>

        </div>
      </section>

      {/* How It Works with Demo Mockup */}
      <section id="how-it-works-section" className="max-w-7xl mx-auto px-6 py-24 border-t border-[#2A2A2A]/40 relative z-10">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-5xl text-white font-normal mb-6">How it works</h2>
            
            {/* Pill Tabs visual Segmented Control */}
            <div className="inline-flex bg-[#161618]/80 border border-[#2A2A2E]/80 backdrop-blur-md rounded-full p-1 mb-8 shadow-inner select-none">
              {['Auditor', 'Notepad', 'Sandbox', 'Detective'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveWorkTab(tab)}
                  className="px-6 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 active:scale-95 cursor-pointer text-[#9A9A9A] hover:text-white"
                  style={activeWorkTab === tab ? { backgroundColor: '#4C8DFF', color: 'white', boxShadow: '0 4px 15px rgba(76,141,255,0.3)' } : {}}
                >
                  {tab}
                </button>
              ))}
            </div>
            
            {/* Chat demo mockup card */}
            <div className="bg-[#121214]/60 border border-[#2A2A30]/80 backdrop-blur-xl rounded-[24px] p-6 max-w-2xl mx-auto shadow-2xl text-left font-sans transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
              <div className="space-y-4 min-h-[140px] flex flex-col justify-center">
                {demoChats[activeWorkTab].map((msg, i) => (
                  <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fade-in`}>
                    <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#4C8DFF] text-white shadow-sm font-medium'
                        : 'bg-[#09090B]/80 border border-[#222226]/80 text-zinc-300'
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
        </ScrollReveal>

        {/* 4-Step Numbered Row */}
        <div className="grid md:grid-cols-4 gap-4 md:gap-6 mt-16">
          {[
            { num: '1', title: 'Upload your files', desc: 'Drag in PDFs, slide decks, or spreadsheets.' },
            { num: '2', title: 'Choose workspace', desc: 'Select Auditor, Notepad, Sandbox, or Detective board.' },
            { num: '3', title: 'Ask or interact', desc: 'Prompt the model, evaluate details, or adjust slider parameters.' },
            { num: '4', title: 'Verify citations', desc: 'Inspect answers mapped to source excerpts with page citations.' }
          ].map((step, idx) => (
            <ScrollReveal key={step.num} delay={idx * 100}>
              <div className="bg-[#121214]/60 border border-[#2A2A30]/80 backdrop-blur-md rounded-[20px] p-6 text-left shadow-sm flex flex-col justify-between min-h-40 transition-all duration-300 hover:border-[#4C8DFF]/20 hover:scale-[1.02]">
                <span className="font-mono text-[10px] bg-[#4C8DFF]/10 border border-[#4C8DFF]/20 text-[#4C8DFF] w-6 h-6 rounded-full flex items-center justify-center font-bold">{step.num}</span>
                <div className="mt-4">
                  <h4 className="font-display text-base text-white font-medium mb-1.5">{step.title}</h4>
                  <p className="text-[11px] text-[#9A9A9A] leading-relaxed font-light">{step.desc}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Specialized Cognitive Chatbots */}
      <section id="workspaces" className="max-w-7xl mx-auto px-6 py-24 border-t border-[#2A2A2A]/40 relative z-10">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-5xl text-white font-normal leading-tight">
              Choose Your Workspace Paradigm
            </h2>
            <p className="text-xs text-[#9A9A9A] mt-3 max-w-lg mx-auto leading-relaxed font-light">
              Select from four custom-engineered chatbots, each designed around a distinct user mindset, UI layout, and analysis engine.
            </p>
          </div>
        </ScrollReveal>

        {/* 4 Cards Grid */}
        <div className="grid md:grid-cols-4 gap-6">
          
          {/* Card A: Spaced Learning & Document Digest */}
          <ScrollReveal id="notepad-card" delay={0} className="h-full">
            <div 
              onClick={() => onStartChat(ROUTES.LEARNING)}
              className="bg-[#121214]/60 border border-[#2A2A30]/80 backdrop-blur-md hover:border-[#4C8DFF]/50 rounded-[24px] p-6 text-left shadow-lg hover:shadow-[0_0_30px_rgba(76,141,255,0.12)] hover:-translate-y-1.5 transition-all duration-300 cursor-pointer flex flex-col justify-between h-72 group"
            >
              <div>
                <span className="text-3xl select-none block group-hover:scale-110 duration-300 w-fit">🎓</span>
                <h3 className="font-display text-base text-white font-semibold mt-5 mb-2">Spaced Learning & Document Digest</h3>
                <p className="text-[11px] text-[#9A9A9A] leading-relaxed font-light">
                  Active recall Socratic tutoring, concept maps, and spaced repetition flashcards for lectures and manuals.
                </p>
              </div>
              <span className="text-[9px] text-[#4C8DFF] font-bold tracking-wider uppercase mt-4 flex items-center gap-1 group-hover:gap-2 transition-all">Launch Learning Mode <span className="transition-transform group-hover:translate-x-0.5">→</span></span>
            </div>
          </ScrollReveal>

          {/* Card B: Contract Compliance & Risk Auditor */}
          <ScrollReveal id="auditor-card" delay={100} className="h-full">
            <div 
              onClick={() => onStartChat(ROUTES.AUDITOR)}
              className="bg-[#121214]/60 border border-[#2A2A30]/80 backdrop-blur-md hover:border-red-500/50 rounded-[24px] p-6 text-left shadow-lg hover:shadow-[0_0_30px_rgba(239,68,68,0.12)] hover:-translate-y-1.5 transition-all duration-300 cursor-pointer flex flex-col justify-between h-72 group"
            >
              <div>
                <span className="text-3xl select-none block group-hover:scale-110 duration-300 w-fit">🛡️</span>
                <h3 className="font-display text-base text-white font-semibold mt-5 mb-2">Contract Compliance & Risk Auditor</h3>
                <p className="text-[11px] text-[#9A9A9A] leading-relaxed font-light">
                  Adversarial red-team checks, clause evaluations, and natural language logic checks for legal documents.
                </p>
              </div>
              <span className="text-[9px] text-red-400 font-bold tracking-wider uppercase mt-4 flex items-center gap-1 group-hover:gap-2 transition-all">Launch Auditor Mode <span className="transition-transform group-hover:translate-x-0.5">→</span></span>
            </div>
          </ScrollReveal>

          {/* Card C: Spreadsheet Analytics & Quantitative Sandbox */}
          <ScrollReveal id="sandbox-card" delay={200} className="h-full">
            <div 
              onClick={() => onStartChat(ROUTES.ANALYTICS)}
              className="bg-[#121214]/60 border border-[#2A2A30]/50 backdrop-blur-md hover:border-[#3ECF8E]/50 rounded-[24px] p-6 text-left shadow-lg hover:shadow-[0_0_30px_rgba(62,207,142,0.12)] hover:-translate-y-1.5 transition-all duration-300 cursor-pointer flex flex-col justify-between h-72 group"
            >
              <div>
                <span className="text-3xl select-none block group-hover:scale-110 duration-300 w-fit">📊</span>
                <h3 className="font-display text-base text-white font-semibold mt-5 mb-2">Spreadsheet Analytics & Sandbox</h3>
                <p className="text-[11px] text-[#9A9A9A] leading-relaxed font-light">
                  Numerical dataset simulations, variable sliders, parameter analysis, and graphical trace overlays.
                </p>
              </div>
              <span className="text-[9px] text-[#3ECF8E] font-bold tracking-wider uppercase mt-4 flex items-center gap-1 group-hover:gap-2 transition-all">Launch Analytics Mode <span className="transition-transform group-hover:translate-x-0.5">→</span></span>
            </div>
          </ScrollReveal>

          {/* Card D: CV Analyzer & Mock Interview Simulator */}
          <ScrollReveal id="detective-card" delay={300} className="h-full">
            <div 
              onClick={() => onStartChat(ROUTES.SIMULATOR)}
              className="bg-[#121214]/60 border border-[#2A2A30]/80 backdrop-blur-md hover:border-[#FFB04C]/50 rounded-[24px] p-6 text-left shadow-lg hover:shadow-[0_0_30px_rgba(255,176,76,0.12)] hover:-translate-y-1.5 transition-all duration-300 cursor-pointer flex flex-col justify-between h-72 group"
            >
              <div>
                <span className="text-3xl select-none block group-hover:scale-110 duration-300 w-fit">💼</span>
                <h3 className="font-display text-base text-white font-semibold mt-5 mb-2">CV Analyzer & Mock Interview Simulator</h3>
                <p className="text-[11px] text-[#9A9A9A] leading-relaxed font-light">
                  Candidate resume parsing, structural skillset profile alignment, and interactive mock roleplays.
                </p>
              </div>
              <span className="text-[9px] text-[#FFB04C] font-bold tracking-wider uppercase mt-4 flex items-center gap-1 group-hover:gap-2 transition-all">Launch Simulator Mode <span className="transition-transform group-hover:translate-x-0.5">→</span></span>
            </div>
          </ScrollReveal>

        </div>
      </section>

      {/* Testimonials Quote Grid (3x3 inside one dark panel) */}
      <section className="max-w-7xl mx-auto px-6 py-24 border-t border-[#2A2A2A]/40 relative z-10">
        <ScrollReveal>
          <h2 className="font-display text-3xl md:text-4xl text-white font-normal text-center mb-16">What people are getting done</h2>
        </ScrollReveal>
        
        <ScrollReveal delay={100}>
          <div className="bg-[#2A2A30]/20 border border-[#2D2D34]/50 rounded-[28px] overflow-hidden grid md:grid-cols-3 gap-[1px] shadow-2xl backdrop-blur-sm">
            {testimonials.map((test, idx) => (
              <div key={idx} className="bg-[#0A0A0C]/90 p-8 flex flex-col justify-between min-h-48 text-left transition-all duration-300 hover:bg-[#0C0C0E]">
                <p className="text-xs leading-relaxed text-zinc-300 italic font-light">"{test.quote}"</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#4C8DFF]/20 to-[#6FA2FF]/10 border border-[#4C8DFF]/30 flex items-center justify-center font-bold text-white text-[10px] uppercase font-mono select-none">
                    {test.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-[11px] text-white font-semibold">{test.name}</p>
                    <p className="text-[9px] text-[#9A9A9A] font-mono">{test.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* Contact Us Section */}
      <section id="contact-us" className="max-w-xl mx-auto px-6 py-24 border-t border-[#2A2A2A]/40 relative z-10">
        <ScrollReveal>
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl md:text-5xl text-white font-normal mb-3">Get in touch</h2>
            <p className="text-xs text-[#9A9A9A] max-w-sm mx-auto leading-relaxed font-light">
              Have questions or feedback? Drop us a line and we'll get back to you shortly.
            </p>
          </div>
          
          <form onSubmit={(e) => { e.preventDefault(); alert("Thanks! Your message has been sent."); }} className="space-y-4 text-left">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-wider text-[#9A9A9A] font-mono font-bold">Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="Your Name"
                  className="bg-[#121214]/60 border border-[#2A2A30]/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-700 outline-none focus:border-[#4C8DFF]/40 transition" 
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-wider text-[#9A9A9A] font-mono font-bold">Email</label>
                <input 
                  type="email" 
                  required
                  placeholder="you@example.com"
                  className="bg-[#121214]/60 border border-[#2A2A30]/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-700 outline-none focus:border-[#4C8DFF]/40 transition" 
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-wider text-[#9A9A9A] font-mono font-bold">Message</label>
              <textarea 
                required
                rows={4}
                placeholder="How can we help you?"
                className="bg-[#121214]/60 border border-[#2A2A30]/80 rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-700 outline-none focus:border-[#4C8DFF]/40 transition resize-none" 
              />
            </div>
            
            <button 
              type="submit" 
              className="w-full bg-[#4C8DFF] hover:bg-[#6FA2FF] text-white py-3 rounded-full text-xs font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(76,141,255,0.1)] cursor-pointer"
            >
              Send Message
            </button>
          </form>
        </ScrollReveal>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 pt-20 pb-12 border-t border-[#2A2A2A]/40 text-xs text-[#9A9A9A] relative z-10">
        <ScrollReveal>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-16 text-left">
            <div>
              <h4 className="font-semibold text-white mb-4 text-xs tracking-wider uppercase">Product</h4>
              <ul className="space-y-3 font-light text-zinc-400">
                <li><span className="hover:text-white transition-colors duration-200 cursor-pointer">Features</span></li>
                <li><span className="hover:text-white transition-colors duration-200 cursor-pointer">Pricing</span></li>
                <li><span className="hover:text-white transition-colors duration-200 cursor-pointer">Workspaces</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4 text-xs tracking-wider uppercase">Resources</h4>
              <ul className="space-y-3 font-light text-zinc-400">
                <li><span className="hover:text-white transition-colors duration-200 cursor-pointer">Blog</span></li>
                <li><span className="hover:text-white transition-colors duration-200 cursor-pointer">Help Center</span></li>
                <li><span className="hover:text-white transition-colors duration-200 cursor-pointer">Docs</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4 text-xs tracking-wider uppercase">Company</h4>
              <ul className="space-y-3 font-light text-zinc-400">
                <li><span className="hover:text-white transition-colors duration-200 cursor-pointer">About</span></li>
                <li><span className="hover:text-white transition-colors duration-200 cursor-pointer">Terms of Service</span></li>
                <li><span className="hover:text-white transition-colors duration-200 cursor-pointer">Privacy Policy</span></li>
              </ul>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <div className="border-t border-[#2A2A2A]/30 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 select-none">
              <span className="font-display text-lg font-medium text-white">Docent</span>
              <span className="w-1.5 h-1.5 bg-[#4C8DFF] rounded-full mt-1.5"></span>
            </div>
            <p className="font-light text-zinc-500">© 2026 Docent AI, Inc. All rights reserved.</p>
            <div className="flex gap-4 font-semibold text-[10px] text-white">
              <span className="bg-[#121214] border border-[#2A2A30] px-4 py-2 rounded-full select-none shadow-sm flex items-center gap-1.5">
                ❤️ <span className="text-zinc-300">Loved on Product Hunt</span>
              </span>
            </div>
          </div>
        </ScrollReveal>
      </footer>

    </div>
  );
}

export default LandingPage;
