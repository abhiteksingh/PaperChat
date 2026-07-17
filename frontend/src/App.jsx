import GeneralWorkspace from "./workspaces/general/GeneralWorkspace"
import ContractAuditorWorkspace from "./workspaces/contract-auditor/ContractAuditorWorkspace"
import SpacedLearningWorkspace from "./workspaces/spaced-learning/SpacedLearningWorkspace"
import SpreadsheetAnalyticsWorkspace from "./workspaces/spreadsheet-analytics/SpreadsheetAnalyticsWorkspace"
import InterviewSimulatorWorkspace from "./workspaces/interview-simulator/InterviewSimulatorWorkspace"

import LandingPage from "./components/LandingPage"
import { ROUTES } from "./routes"
import { useState, useEffect } from 'react'

function App() {
  const [messages, setMessages] = useState([])
  const [chatId, setChatId] = useState("")
  const [chats, setChats] = useState([])
  
  // Custom hash-based router state
  const [currentRoute, setCurrentRoute] = useState(ROUTES.LANDING.name)

  useEffect(() => {
    // Parse current hash on mount
    const handleHashChange = () => {
      const hash = window.location.hash || "#/"
      if (hash === ROUTES.CHAT.hash) {
        setCurrentRoute(ROUTES.CHAT.name)
      } else if (hash === ROUTES.LEARNING.hash) {
        setCurrentRoute(ROUTES.LEARNING.name)
      } else if (hash === ROUTES.AUDITOR.hash) {
        setCurrentRoute(ROUTES.AUDITOR.name)
      } else if (hash === ROUTES.ANALYTICS.hash) {
        setCurrentRoute(ROUTES.ANALYTICS.name)
      } else if (hash === ROUTES.SIMULATOR.hash) {
        setCurrentRoute(ROUTES.SIMULATOR.name)
      } else {
        setCurrentRoute(ROUTES.LANDING.name)
      }
    }

    handleHashChange() // Initial check
    window.addEventListener("hashchange", handleHashChange)
    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [])

  const navigateTo = (route) => {
    window.location.hash = route.hash
  }

  // Poll for updates if any chat is still processing in the background
  useEffect(() => {
    const hasProcessing = chats.some(c => c.status === "processing");
    if (!hasProcessing) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/chats");
        if (response.ok) {
          const data = await response.json();
          setChats(data.chats);
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [chats]);

  if (currentRoute === ROUTES.LANDING.name) {
    return <LandingPage onStartChat={(route) => navigateTo(route || ROUTES.CHAT)} />
  }

  const renderWorkspace = () => {
    const props = {
      chatId,
      setChatId,
      messages,
      setMessages,
      chats,
      setChats,
      onNavigateHome: () => navigateTo(ROUTES.LANDING),
      workspaceType: currentRoute
    };

    switch (currentRoute) {
      case ROUTES.AUDITOR.name:
        return <ContractAuditorWorkspace {...props} />;
      case ROUTES.LEARNING.name:
        return <SpacedLearningWorkspace {...props} />;
      case ROUTES.ANALYTICS.name:
        return <SpreadsheetAnalyticsWorkspace {...props} />;
      case ROUTES.SIMULATOR.name:
        return <InterviewSimulatorWorkspace {...props} />;
      default:
        return <GeneralWorkspace {...props} />;
    }
  };

  return (
    <div className="h-screen flex bg-[#0A0A0A] text-[#E8E8E8] font-body overflow-hidden" data-workspace={currentRoute}>
      
      {/* Self-contained Active Workspace Panel */}
      <div className="flex-1 min-w-0 h-screen">
        {renderWorkspace()}
      </div>

    </div>
  )
}

export default App;
