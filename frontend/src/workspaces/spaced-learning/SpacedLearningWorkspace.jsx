import { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import UploadZone from '../../components/UploadZone';
import MessageList from '../../components/MessageList';
import ConceptGraph3D from '../../components/ConceptGraph3D';
import SpacedLearningSideBar from './SpacedLearningSideBar';
import API_BASE from '../../api';

function InfoTooltip({ text }) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative group inline-block ml-1 select-none font-sans font-normal normal-case">
      <span 
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        className="text-[8px] bg-[#EBE8E2] hover:bg-[#4C8DFF] text-zinc-500 hover:text-white w-3.5 h-3.5 inline-flex items-center justify-center rounded-full cursor-help font-bold transition-colors"
      >
        i
      </span>
      {visible && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-44 bg-white border border-[#EBE8E2] text-zinc-700 text-[8px] font-sans rounded-md p-2 shadow-xl z-50 leading-normal normal-case pointer-events-none text-left">
          {text}
        </span>
      )}
    </span>
  );
}

function SpacedLearningWorkspace({ chatId, setChatId, messages, setMessages, chats, setChats, onNavigateHome, workspaceType }) {
  const [question, setQuestion] = useState("");
  const [uploading, setUploading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [contextChip, setContextChip] = useState(null);

  // Spaced repetition review queue and outlines
  const [notesContent, setNotesContent] = useState("");
  const [flashcards, setFlashcards] = useState([
    { id: 1, topic: "Vector Search Index", interval: "Due in 1 day", grade: "Good", type: "FLASHCARD", chapter: "Chapter 1: Vectors", half_life: 2, forgotten_risk: false },
    { id: 2, topic: "Reciprocal Rank Fusion", interval: "Due in 4 days", grade: "New", type: "PRACTICE_PROBLEM", chapter: "Chapter 2: Rank Fusion", half_life: 4, forgotten_risk: false },
    { id: 3, topic: "Socratic Feedback loops", interval: "Reviewed today", grade: "Easy", type: "FLASHCARD", chapter: "Chapter 1: Vectors", half_life: 8, forgotten_risk: false }
  ]);

  const [heatmap, setHeatmap] = useState([
    { name: "TF-IDF Indexes", level: "HIGH", color: "#3ECF8E", measured_performance: 0.85 },
    { name: "BM25 Sparse search", level: "MEDIUM", color: "#FFC107", measured_performance: 0.70 },
    { name: "Pinecone dense filters", level: "LOW", color: "#FF4C4C", measured_performance: 0.35 }
  ]);

  // Expanded spaced learning workbook state
  const [chapterOverrides, setChapterOverrides] = useState({});
  const [examDate, setExamDate] = useState("");
  const [retrievalModalOpen, setRetrievalModalOpen] = useState(false);
  const [retrievalQuestions, setRetrievalQuestions] = useState([]);
  const [retrievalAnswers, setRetrievalAnswers] = useState({});
  const [showRetrievalAnswers, setShowRetrievalAnswers] = useState(false);
  const [elaborativePrompts, setElaborativePrompts] = useState([]);
  const [selectedCardTopic, setSelectedCardTopic] = useState(null);

  const currentChat = chats.find(c => c.chat_id === chatId);
  const isProcessing = currentChat?.status === "processing";
  const isFailed = currentChat?.status === "failed";

  const forgottenCount = flashcards.filter(c => c.forgotten_risk).length;

  const [leftTab, setLeftTab] = useState("notepad"); // notepad | recall

  useEffect(() => {
    setError(null);
    setSelectedCitation(null);
    setContextChip(null);
    
    if (!chatId) {
      setFlashcards([]);
      setHeatmap([]);
      setNotesContent("");
      return;
    }

    let isMounted = true;
    let timer = null;

    const fetchTreeAndInitialize = async (retryCount = 0) => {
      try {
        const activeChat = chats.find(c => c.chat_id === chatId);
        
        if (activeChat && activeChat.analysis_results_json) {
          try {
            const parsed = JSON.parse(activeChat.analysis_results_json);
            if (parsed.flashcards && parsed.flashcards.length > 0) {
              if (isMounted) {
                setFlashcards(parsed.flashcards);
                if (parsed.heatmap) setHeatmap(parsed.heatmap);
                if (parsed.exam_date) setExamDate(parsed.exam_date);
                if (parsed.notes) setNotesContent(parsed.notes);
              }
              return;
            }
          } catch (e) {
            console.error("Failed to parse spaced learning results:", e);
          }
        }

        // Fetch dynamic concept tree nodes to generate customized study items automatically!
        const response = await fetch(`${API_BASE}/chats/${chatId}/concept-tree`);
        if (response.ok && isMounted) {
          const treeData = await response.json();
          if (treeData.nodes && treeData.nodes.length > 0) {
            const keyNodes = treeData.nodes.slice(0, 12);
            
            const derivedCards = keyNodes.map((node, idx) => {
              const cleanTopic = node.label.split(': ').pop();
              const intervals = ["Due in 1 day", "Due in 2 days", "Due in 4 days"];
              const grades = ["New", "New", "New"];
              const cardTypes = ["FLASHCARD", "PRACTICE_PROBLEM"];
              
              return {
                id: idx + 100,
                topic: cleanTopic,
                question: `Explain the core principles, structure, and significance of ${cleanTopic}.`,
                summary: node.text ? (node.text.substring(0, 140) + "...") : `Key conceptual section covering ${cleanTopic}.`,
                answer_hint: `Refer to page ${node.page || 1} for definitions, citations, and structural formulas.`,
                citation: `[p.${node.page || 1}]`,
                interval: intervals[idx % intervals.length],
                grade: grades[idx % grades.length],
                type: cardTypes[idx % cardTypes.length],
                chapter: node.filename || `Chapter ${Math.floor(idx / 3) + 1}`,
                page: node.page,
                text: node.text,
                half_life: (idx + 1) * 2,
                forgotten_risk: false
              };
            });
            
            const derivedHeatmap = keyNodes.map((node) => {
              const cleanTopic = node.label.split(': ').pop();
              const colors = ["#FF4C4C", "#FFC107", "#3ECF8E"];
              const levels = ["LOW", "MEDIUM", "HIGH"];
              const performances = [0.35, 0.70, 0.85];
              const randomSel = Math.floor(Math.random() * 3);
              
              return {
                name: cleanTopic,
                level: levels[randomSel],
                color: colors[randomSel],
                measured_performance: performances[randomSel]
              };
            });
            
            setFlashcards(derivedCards);
            setHeatmap(derivedHeatmap);
            setNotesContent(`📝 Study notes initialized for textbook: ${activeChat?.title || "Document"}\n\nKey Concepts Found:\n` + keyNodes.map(n => `- ${n.label.split(': ').pop()}`).join("\n"));
          } else if (retryCount < 6 && isMounted) {
            // Auto-retry after 1.5 seconds if background parsing is still completing
            timer = setTimeout(() => fetchTreeAndInitialize(retryCount + 1), 1500);
          }
        }
      } catch (err) {
        console.error("Failed to dynamically initialize study workspace:", err);
      }
    };
    
    fetchTreeAndInitialize();
    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [chatId, currentChat?.status]);

  const onDrop = async (acceptedFiles) => {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      acceptedFiles.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch(`${API_BASE}/upload?workspace_type=spaced-learning`, {
        method: "POST",
        body: formData
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Parse failed.");

      setChatId(data.chat_id);
      setMessages([]);
      setChats(prev => [{ chat_id: data.chat_id, title: data.title, status: data.status, workspace_type: "spaced-learning" }, ...prev]);
    } catch (err) {
      setError(err.message || "Parse failed.");
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
      "application/vnd.ms-powerpoint": [".ppt"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
      "text/plain": [".txt", ".md"]
    }
  });

  const handleChatSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!question.trim() || chatLoading || isProcessing) return;

    const questionToSend = question.trim();
    setQuestion("");
    setChatLoading(true);

    const pageFilter = contextChip ? contextChip.page : null;
    setContextChip(null);

    try {
      setMessages(prev => [...prev, { role: "user", content: questionToSend }]);

      const response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          question: questionToSend,
          page: pageFilter,
          workspace_type: "study",
          exam_date: examDate || null
        })
      });

      const data = await response.json();
      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.answer,
        sources: data.sources,
        token_count: data.token_count,
        citations: data.citations
      }]);

      if (data.answer) {
        setNotesContent(prev => prev + `\n\n## Summary Takeaway\n${data.answer.substring(0, 300)}... [p.${pageFilter || 1}]`);
      }

      if (data.flashcards && data.flashcards.length > 0) {
        setFlashcards(data.flashcards);
      }
      if (data.heatmap && data.heatmap.length > 0) {
        setHeatmap(data.heatmap);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setChatLoading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json"));
      if (data && data.page) setContextChip(data);
    } catch (err) {
      console.error(err);
    }
  };

  const gradeFlashcard = async (id, newGrade) => {
    const gradeColorMap = { Again: "#FF4C4C", Good: "#FFC107", Easy: "#3ECF8E" };
    const gradeLevelMap = { Again: "LOW", Good: "MEDIUM", Easy: "HIGH" };
    const targetColor = gradeColorMap[newGrade] || "#FFC107";
    const targetLevel = gradeLevelMap[newGrade] || "MEDIUM";

    let targetTopic = "";
    setFlashcards(prev => prev.map(f => {
      if (f.id === id) {
        targetTopic = f.topic;
        return { ...f, interval: "Rescheduled", grade: newGrade };
      }
      return f;
    }));

    if (targetTopic) {
      const normT = targetTopic.toLowerCase().replace(/[^a-z0-9]/g, '');
      setHeatmap(prev => {
        let exists = false;
        const nextH = prev.map(h => {
          const normH = h.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (normH.includes(normT) || normT.includes(normH)) {
            exists = true;
            return { ...h, level: targetLevel, color: targetColor, measured_performance: newGrade === "Easy" ? 0.95 : newGrade === "Good" ? 0.70 : 0.25 };
          }
          return h;
        });
        if (!exists) {
          nextH.push({ name: targetTopic, level: targetLevel, color: targetColor, measured_performance: newGrade === "Easy" ? 0.95 : newGrade === "Good" ? 0.70 : 0.25 });
        }
        return nextH;
      });
    }

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          question: `/review ${JSON.stringify({ id, grade: newGrade })}`,
          workspace_type: "study",
          exam_date: examDate || null,
          silent: true
        })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.flashcards) setFlashcards(data.flashcards);
        if (data.heatmap) setHeatmap(data.heatmap);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleGradeNodeFromGraph = (nodeTopic, grade) => {
    const normN = nodeTopic.toLowerCase().replace(/[^a-z0-9]/g, '');
    const match = flashcards.find(f => {
      const normF = f.topic.toLowerCase().replace(/[^a-z0-9]/g, '');
      return normF.includes(normN) || normN.includes(normF);
    });
    if (match) {
      gradeFlashcard(match.id, grade);
    } else {
      const gradeColorMap = { Again: "#FF4C4C", Good: "#FFC107", Easy: "#3ECF8E" };
      const gradeLevelMap = { Again: "LOW", Good: "MEDIUM", Easy: "HIGH" };
      const targetColor = gradeColorMap[grade] || "#FFC107";
      const targetLevel = gradeLevelMap[grade] || "MEDIUM";

      setHeatmap(prev => {
        let exists = false;
        const nextH = prev.map(h => {
          const normH = h.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (normH.includes(normN) || normN.includes(normH)) {
            exists = true;
            return { ...h, level: targetLevel, color: targetColor };
          }
          return h;
        });
        if (!exists) {
          nextH.push({ name: nodeTopic, level: targetLevel, color: targetColor });
        }
        return nextH;
      });
    }
  };

  const handleSelectNode = (node) => {
    setContextChip(node);
    const cleanTopic = node.label.split(': ').pop();
    setLeftTab("recall");
    setSelectedCardTopic(cleanTopic);
    
    setTimeout(() => {
      const cardEl = document.getElementById(`recall-card-${cleanTopic.replace(/[^a-zA-Z0-9]/g, '')}`);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 150);
  };

  const handleExamDateChange = async (date) => {
    setExamDate(date);
    if (!chatId) return;
    try {
      await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          question: `/set_exam_date ${date}`,
          workspace_type: "study",
          exam_date: date
        })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const triggerRetrievalPractice = async () => {
    setRetrievalModalOpen(true);
    setRetrievalQuestions([]);
    setShowRetrievalAnswers(false);
    setRetrievalAnswers({});
    
    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          question: "Please generate a 3-question closed-book recall quiz based on the key concepts studied in this session. Return ONLY the questions in a clean list format.",
          workspace_type: "study",
          silent: true
        })
      });
      if (response.ok) {
        const data = await response.json();
        const lines = data.answer.split("\n").filter(l => l.trim().length > 0 && (l.includes("1.") || l.includes("2.") || l.includes("3.") || l.includes("?")));
        setRetrievalQuestions(lines.slice(0, 3));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getInterleavedCards = () => {
    const groups = {};
    flashcards.forEach(card => {
      const ch = card.chapter || "Chapter 1: Core Concepts";
      if (!groups[ch]) groups[ch] = [];
      groups[ch].push(card);
    });
    
    const interleaved = [];
    const keys = Object.keys(groups);
    let maxLen = 0;
    keys.forEach(k => {
      if (groups[k].length > maxLen) maxLen = groups[k].length;
    });
    
    for (let i = 0; i < maxLen; i++) {
      keys.forEach(k => {
        if (groups[k][i]) {
          interleaved.push(groups[k][i]);
        }
      });
    }
    return interleaved;
  };

  return (
    <div className="h-full bg-white text-zinc-800 flex overflow-hidden font-sans select-text">
      
      {/* Left Sidebar locked to workspace */}
      <SpacedLearningSideBar
        chats={chats}
        chatId={chatId}
        setChats={setChats}
        setChatId={setChatId}
        setMessages={setMessages}
        onNavigateHome={onNavigateHome}
        onDrop={onDrop}
        chapterOverrides={chapterOverrides}
        setChapterOverrides={setChapterOverrides}
      />

      {/* Center split Notion editor canvas & dialog */}
      <div className="flex-1 flex overflow-hidden bg-[#FAF9F6]">
        {chatId && (
          <div className="flex-grow flex flex-col h-full overflow-hidden border-r border-[#EBEAE5]">
            
            {/* Outline header */}
            <div className="h-16 border-b border-[#EBEAE5] px-6 flex items-center justify-between bg-white shrink-0 select-none">
              <span className="font-semibold text-zinc-900 text-xs font-serif italic">
                ✍️ STUDY & REPEATED RECALL // {currentChat?.title}
              </span>
              <button onClick={onNavigateHome} className="text-xs text-[#7A7A7A] hover:text-black transition cursor-pointer">Exit study</button>
            </div>

            {/* Split Content layout */}
            <div className="flex-grow flex overflow-hidden">
              {/* Left Notion rich-text text area canvas */}
              <div className="w-[320px] border-r border-[#EBEAE5] bg-white p-6 flex flex-col gap-4 overflow-hidden shrink-0 select-none text-left">
                <div className="flex border border-[#EBEAE5] bg-[#FAF9F6] shrink-0 mb-2 rounded-lg overflow-hidden p-0.5 select-none">
                  <button
                    type="button"
                    onClick={() => setLeftTab("notepad")}
                    className={`flex-1 py-1.5 text-center font-sans font-bold tracking-wider text-[9px] uppercase transition rounded-md cursor-pointer ${
                      leftTab === "notepad" 
                        ? "bg-white text-[#4C8DFF] shadow-sm font-bold" 
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    ✍️ Notepad
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeftTab("recall")}
                    className={`flex-1 py-1.5 text-center font-sans font-bold tracking-wider text-[9px] uppercase transition rounded-md cursor-pointer ${
                      leftTab === "recall" 
                        ? "bg-white text-[#4C8DFF] shadow-sm font-bold" 
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    📋 Recall stack ({getInterleavedCards().length})
                  </button>
                </div>

                {leftTab === "notepad" ? (
                  <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                    <h4 className="text-[10px] font-bold text-[#8E8D88] tracking-widest uppercase">Synthesis Board</h4>
                    
                    {/* Session Mastery Progress Ring & Daily Streak Counter */}
                    {(() => {
                      const totalItems = heatmap.length || flashcards.length || 1;
                      const gradeScores = { HIGH: 100, MEDIUM: 60, LOW: 20, Easy: 100, Good: 60, Again: 20, New: 0 };
                      const totalScore = (heatmap.length > 0 ? heatmap : flashcards).reduce((acc, item) => {
                        const lvl = item.level || item.grade || "New";
                        return acc + (gradeScores[lvl] !== undefined ? gradeScores[lvl] : 40);
                      }, 0);
                      const masteryPercentage = Math.min(100, Math.max(0, Math.round(totalScore / totalItems)));
                      const dueCardsCount = flashcards.filter(c => c.grade === "New" || (c.interval && (c.interval.includes("Due") || c.interval.includes("1 day")))).length;
                      const radius = 24;
                      const stroke = 4;
                      const normalizedRadius = radius - stroke * 2;
                      const circumference = normalizedRadius * 2 * Math.PI;
                      const strokeDashoffset = circumference - (masteryPercentage / 100) * circumference;

                      return (
                        <div className="bg-gradient-to-br from-[#4C8DFF]/10 via-white to-amber-500/5 border border-[#4C8DFF]/20 rounded-xl p-3.5 text-left font-sans shadow-sm select-none">
                          <div className="flex items-center justify-between gap-3">
                            <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                              <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg]">
                                <circle
                                  stroke="#E2E8F0"
                                  fill="transparent"
                                  strokeWidth={stroke}
                                  r={normalizedRadius}
                                  cx={radius}
                                  cy={radius}
                                />
                                <circle
                                  stroke={masteryPercentage >= 70 ? "#3ECF8E" : masteryPercentage >= 40 ? "#FFC107" : "#FF4C4C"}
                                  fill="transparent"
                                  strokeWidth={stroke}
                                  strokeDasharray={circumference + ' ' + circumference}
                                  style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                                  strokeLinecap="round"
                                  r={normalizedRadius}
                                  cx={radius}
                                  cy={radius}
                                />
                              </svg>
                              <span className="absolute font-mono text-[9px] font-bold text-zinc-800">{masteryPercentage}%</span>
                            </div>

                            <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-zinc-900 tracking-tight">Mastery Progress</span>
                                <span className="text-[8px] font-mono font-bold text-[#4C8DFF] bg-[#4C8DFF]/10 px-1.5 py-0.5 rounded">
                                  🔥 3-Day Streak
                                </span>
                              </div>
                              <p className="text-[9px] text-zinc-500 leading-tight">
                                {dueCardsCount > 0 ? `${dueCardsCount} Card(s) Due in Queue` : "All Recall Items Up To Date ✓"}
                              </p>
                              <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden mt-1">
                                <div
                                  className="h-full transition-all duration-500 rounded-full"
                                  style={{
                                    width: `${masteryPercentage}%`,
                                    backgroundColor: masteryPercentage >= 70 ? "#3ECF8E" : masteryPercentage >= 40 ? "#FFC107" : "#FF4C4C"
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Deadline Config & Alerts */}
                    <div className="flex flex-col gap-1.5 font-sans">
                      <label className="text-[9px] font-bold text-[#8E8D88] uppercase tracking-wider">Exam Deadline Date</label>
                      <input 
                        type="date"
                        value={examDate}
                        onChange={(e) => handleExamDateChange(e.target.value)}
                        className="bg-zinc-50 border border-[#EBEAE5] text-xs px-2.5 py-1.5 rounded-lg outline-none font-sans"
                      />
                    </div>

                    {forgottenCount > 0 && (
                      <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-lg text-[9px] leading-relaxed font-sans">
                        ⚠️ <strong>FORGETTING RISK DETECTED:</strong> {forgottenCount} card(s) are predicted to be forgotten before your exam on {examDate}. Resurfacing immediately in active queue.
                      </div>
                    )}

                    <textarea
                      value={notesContent}
                      onChange={(e) => setNotesContent(e.target.value)}
                      placeholder="Key concepts and outlines automatically compile here during study dialogue. Tap keys to write notes..."
                      className="flex-grow min-h-[150px] bg-zinc-50 border border-[#EBEAE5] p-4 text-xs leading-relaxed text-[#2C2C2A] placeholder-zinc-400 outline-none rounded-xl resize-none font-serif"
                    />

                    <button 
                      onClick={triggerRetrievalPractice}
                      className="w-full bg-[#4C8DFF] hover:bg-[#3B7BE6] text-white py-2 rounded-xl text-[9px] font-bold tracking-wide uppercase cursor-pointer font-sans shadow-sm shrink-0"
                    >
                      Start Retrieval Test
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                    <h4 className="text-[10px] font-bold text-[#8E8D88] tracking-widest uppercase">Spaced Recall Queue</h4>
                    <div className="space-y-3">
                      {getInterleavedCards().length === 0 ? (
                        <p className="text-zinc-400 italic text-[10px] text-center py-8">No recall items due.</p>
                      ) : (
                        getInterleavedCards().map(f => {
                          const isSelected = selectedCardTopic && f.topic.toLowerCase() === selectedCardTopic.toLowerCase();
                          return (
                            <div 
                              id={`recall-card-${f.topic.replace(/[^a-zA-Z0-9]/g, '')}`}
                              key={f.id}
                              onClick={() => setSelectedCardTopic(f.topic)}
                              onMouseEnter={() => setSelectedCardTopic(f.topic)}
                              className={`p-3.5 border rounded-xl text-left space-y-2.5 transition-all shadow-sm cursor-pointer ${
                                isSelected
                                  ? "border-[#4C8DFF] ring-2 ring-[#4C8DFF]/15 bg-[#4C8DFF]/5 shadow-md"
                                  : f.type === "PRACTICE_PROBLEM" 
                                    ? "bg-[#4C8DFF]/5 border-[#4C8DFF]/25 hover:border-[#4C8DFF]/50" 
                                    : "bg-[#FAF9F6] border-[#EBEAE5] hover:border-zinc-300"
                              }`}
                            >
                              <div className="flex justify-between items-center text-[9px] font-semibold">
                                <div className="flex items-center gap-1.5">
                                  <span className={`px-1.5 py-0.5 rounded font-mono ${
                                    f.type === "PRACTICE_PROBLEM" ? "bg-[#4C8DFF]/20 text-[#4C8DFF]" : "bg-zinc-200 text-zinc-700"
                                  }`}>
                                    {f.type || "FLASHCARD"}
                                  </span>
                                  <span className="bg-zinc-100 text-zinc-600 font-mono px-1.5 py-0.5 rounded text-[8px] font-bold">
                                    {f.citation || `p.${f.page || 1}`}
                                  </span>
                                </div>
                                <span className="text-[#4C8DFF] font-mono text-[9px]">{f.interval}</span>
                              </div>

                              <div className="space-y-1">
                                <p className="text-xs font-serif text-zinc-900 font-bold leading-normal">{f.topic}</p>
                                {f.question && (
                                  <p className="text-[10px] text-zinc-700 font-sans leading-relaxed italic">
                                    ❓ "{f.question}"
                                  </p>
                                )}
                                {f.summary && (
                                  <p className="text-[9px] text-zinc-500 font-sans leading-snug line-clamp-2">
                                    {f.summary}
                                  </p>
                                )}
                              </div>

                              {f.answer_hint && (
                                <details className="group text-[9px] font-sans">
                                  <summary className="text-[#4C8DFF] hover:underline cursor-pointer font-bold select-none">
                                    💡 View Answer Hint
                                  </summary>
                                  <p className="mt-1 p-2 bg-white border border-zinc-200 rounded text-zinc-700 leading-relaxed italic">
                                    {f.answer_hint}
                                  </p>
                                </details>
                              )}

                              {/* self-grading selectors */}
                              <div className="flex gap-2 pt-1">
                                {["Again", "Good", "Easy"].map(g => (
                                  <button 
                                    key={g} 
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      gradeFlashcard(f.id, g);
                                    }}
                                    className={`flex-1 text-[9px] font-semibold py-1 rounded border cursor-pointer transition ${
                                      f.grade === g 
                                        ? "bg-[#4C8DFF] border-[#4C8DFF] text-white font-bold" 
                                        : "bg-white border-[#EBEAE5] text-zinc-600 hover:bg-zinc-50"
                                    }`}
                                  >
                                    {g}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col h-full overflow-hidden p-6 max-w-2xl mx-auto">
                <div className="flex-1 overflow-y-auto mb-4" style={{ scrollbarWidth: 'thin' }}>
                  <MessageList
                    messages={messages}
                    chatLoading={chatLoading}
                    isProcessing={isProcessing}
                    isFailed={isFailed}
                    onSelectCitation={(cit) => setSelectedCitation(cit)}
                    isLight={true}
                  />
                </div>

                <div className="flex flex-col gap-3 shrink-0">
                  <form 
                    onSubmit={handleChatSubmit}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className="bg-white border border-[#EBEAE5] rounded-xl p-2.5 flex items-center gap-3 focus-within:border-[#4C8DFF]/40 shadow-sm"
                  >
                    {contextChip && (
                      <div className="flex items-center gap-1.5 bg-[#4C8DFF]/10 border border-[#4C8DFF]/25 text-[#4C8DFF] font-mono text-[9px] font-bold px-3 py-1.5 rounded-full shrink-0 select-none animate-fade-in">
                        <span>[Study page: p.{contextChip.page}]</span>
                        <button type="button" onClick={() => setContextChip(null)} className="hover:text-red-400 cursor-pointer ml-1">✕</button>
                      </div>
                    )}

                    <input
                      type="text"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      disabled={chatLoading || isProcessing}
                      placeholder="Ask study questions..."
                      className="flex-1 bg-transparent text-xs text-zinc-950 placeholder-zinc-400 outline-none min-w-0"
                    />

                    <button
                      type="submit"
                      disabled={!question.trim() || chatLoading || isProcessing}
                      className="bg-zinc-900 hover:bg-black text-white px-5 py-2 rounded-full text-xs font-semibold cursor-pointer shrink-0"
                    >
                      Ask
                    </button>
                  </form>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* Retrieval practice modal */}
        {retrievalModalOpen && (
          <div className="absolute inset-0 bg-zinc-900/35 backdrop-blur-sm z-50 flex items-center justify-center p-6 select-none font-sans text-xs">
            <div className="bg-white border border-[#EBEAE5] w-[420px] max-w-full rounded-[20px] p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh]">
              <div className="flex justify-between items-center border-b border-[#EBEAE5] pb-3">
                <h3 className="font-serif font-bold text-sm text-zinc-900">Retrieval Practice Quiz</h3>
                <button onClick={() => setRetrievalModalOpen(false)} className="text-zinc-400 hover:text-zinc-900 cursor-pointer">✕</button>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-4 pr-1" style={{ scrollbarWidth: 'thin' }}>
                {retrievalQuestions.length === 0 ? (
                  <p className="text-zinc-500 italic text-center py-6">Generating closed-book quiz items...</p>
                ) : (
                  retrievalQuestions.map((q, idx) => (
                    <div key={idx} className="space-y-2 text-left">
                      <p className="font-bold text-zinc-800 leading-normal">{q}</p>
                      {!showRetrievalAnswers ? (
                        <textarea
                          value={retrievalAnswers[idx] || ""}
                          onChange={(e) => setRetrievalAnswers(prev => ({ ...prev, [idx]: e.target.value }))}
                          placeholder="Type your recall answer here..."
                          className="w-full bg-zinc-50 border border-[#EBEAE5] p-2.5 rounded-lg text-xs leading-relaxed resize-none h-14 outline-none font-serif text-zinc-850"
                        />
                      ) : (
                        <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-[11px] leading-relaxed text-zinc-700">
                          <p className="font-bold text-[9px] text-zinc-400 uppercase">Your Answer:</p>
                          <p className="italic">"{retrievalAnswers[idx] || "(No answer typed)"}"</p>
                          <p className="font-bold text-[9px] text-[#4C8DFF] uppercase mt-2">Self-Verification Check:</p>
                          <p>Verify concepts against chapter text citations [p.X] in textbook references.</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
              
              {retrievalQuestions.length > 0 && (
                <div className="border-t border-[#EBEAE5] pt-3 flex justify-between gap-3">
                  {!showRetrievalAnswers ? (
                    <button 
                      onClick={() => setShowRetrievalAnswers(true)}
                      className="bg-zinc-950 hover:bg-black text-white px-5 py-2 rounded-full font-bold text-xs cursor-pointer w-full text-center"
                    >
                      Reveal Expected Answers
                    </button>
                  ) : (
                    <div className="flex gap-2 w-full">
                      <button 
                        onClick={() => {
                          setRetrievalModalOpen(false);
                          gradeFlashcard(1, "Good");
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white py-2 rounded-full font-bold text-xs cursor-pointer flex-1 text-center font-sans"
                      >
                        Grade "Good"
                      </button>
                      <button 
                        onClick={() => {
                          setRetrievalModalOpen(false);
                          gradeFlashcard(1, "Again");
                        }}
                        className="bg-amber-600 hover:bg-amber-700 text-white py-2 rounded-full font-bold text-xs cursor-pointer flex-1 text-center font-sans"
                      >
                        Grade "Again"
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {!chatId && (
          <div className="flex-1 flex flex-col h-full items-center justify-center p-6">
            <UploadZone uploading={uploading} getInputProps={getInputProps} getRootProps={getRootProps} />
          </div>
        )}
      </div>

      {/* Right Utility Pane: Full height mastery concept map */}
      {chatId && (
        <ConceptGraph3D
          chatId={chatId}
          chats={chats}
          messages={messages}
          workspaceType="study"
          heatmap={heatmap}
          highlightedTopic={selectedCardTopic}
          onSelectNode={handleSelectNode}
          onGradeNode={handleGradeNodeFromGraph}
        />
      )}

      {selectedCitation && (
        <div className="absolute right-0 top-0 h-full w-[320px] bg-white border-l border-[#EBEAE5] shadow-2xl z-30 p-6 flex flex-col gap-4 animate-fade-in text-xs">
          <div className="flex items-center justify-between border-b border-[#EBEAE5] pb-4">
            <h4 className="font-semibold text-zinc-900 font-serif">Page Citation</h4>
            <button onClick={() => setSelectedCitation(null)} className="text-xs text-[#7A7A7A] hover:text-black transition cursor-pointer">✕ Close</button>
          </div>
          
          <div className="flex justify-between items-center bg-[#FAF9F6] border border-[#EBEAE5] p-3.5 rounded-xl select-none font-sans">
            <span className="text-[10px] text-[#7A7A7A]">Page Source</span>
            <span className="font-mono text-[9px] bg-[#4C8DFF]/15 border border-[#4C8DFF]/20 text-[#4C8DFF] px-2.5 py-0.5 rounded font-bold">p.{selectedCitation.page}</span>
          </div>

          <div className="flex-1 overflow-y-auto text-xs leading-relaxed text-[#2C2C2A] bg-[#FAF9F6] border border-[#EBEAE5] p-4 rounded-xl italic font-serif">
            "{selectedCitation.text}"
          </div>
        </div>
      )}

    </div>
  );
}

export default SpacedLearningWorkspace;
