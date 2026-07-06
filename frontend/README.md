# 💻 PDF Chatbot Frontend

This directory contains the user interface for the **PDF Chatbot** application. It is built as a single-page React application powered by Vite, styled using Tailwind CSS v4.

For the full system architecture, backend documentation, database setup, and detailed API guidelines, please see the main project [README.md](file:///c:/Projects/Pdf-Chatbot/PDF-Chatbot/README.md) at the root level of this repository.

## 📁 Directory Structure

The components under [src/components/](file:///c:/Projects/Pdf-Chatbot/PDF-Chatbot/frontend/src/components) are structured as follows:

*   **[App.jsx](file:///c:/Projects/Pdf-Chatbot/PDF-Chatbot/frontend/src/App.jsx)**: The top-level state controller. Holds selections for active chat sessions, lists of chats, and loaded messages.
*   **[Chat.jsx](file:///c:/Projects/Pdf-Chatbot/PDF-Chatbot/frontend/src/components/Chat.jsx)**: Main workspace. Triggers file upload requests and handles form submissions to the FastAPI server.
*   **[SideBar.jsx](file:///c:/Projects/Pdf-Chatbot/PDF-Chatbot/frontend/src/components/SideBar.jsx)**: Renders the sidebar showing previous chats list, chat selector buttons, and delete buttons.
*   **[UploadZone.jsx](file:///c:/Projects/Pdf-Chatbot/PDF-Chatbot/frontend/src/components/UploadZone.jsx)**: Handles drag-and-drop actions for PDF ingestion using `react-dropzone`.
*   **[MessageList.jsx](file:///c:/Projects/Pdf-Chatbot/PDF-Chatbot/frontend/src/components/MessageList.jsx) & [MessageBubble.jsx](file:///c:/Projects/Pdf-Chatbot/PDF-Chatbot/frontend/src/components/MessageBubble.jsx)**: Renders user prompts and AI responses, showing context badges (e.g., 📄 PDF, 🌐 Web) and token counts.
*   **[InputArea.jsx](file:///c:/Projects/Pdf-Chatbot/PDF-Chatbot/frontend/src/components/InputArea.jsx)**: Contains the text input area with Enter-to-submit keys listener.
*   **[PdfStatus.jsx](file:///c:/Projects/Pdf-Chatbot/PDF-Chatbot/frontend/src/components/PdfStatus.jsx)**: Shows the current status of the PDF.
*   **[ChatHeader.jsx](file:///c:/Projects/Pdf-Chatbot/PDF-Chatbot/frontend/src/components/ChatHeader.jsx)**: Renders the dashboard's header title and subtitle.

## 🚀 Quick Start

1.  Make sure you have Node.js (v18+) installed.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
4.  Open the application in your browser at `http://localhost:5173`.
