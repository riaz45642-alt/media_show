import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import ErrorBoundary from './components/common/ErrorBoundary.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { LanguageProvider } from './context/LanguageContext.jsx'
import { PostsProvider } from './context/PostsContext.jsx'
import { ChatProvider } from './context/ChatContext.jsx'
import { NotificationsProvider } from './context/NotificationsContext.jsx'
import { StoriesProvider } from './context/StoriesContext.jsx'
import { VerificationGateProvider } from './context/VerificationGateContext.jsx'
import { CallProvider } from './context/CallContext.jsx'
import CallOverlay from './components/calls/CallOverlay.jsx'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <LanguageProvider>
          <ThemeProvider>
            <AuthProvider>
              <VerificationGateProvider>
                <PostsProvider>
                  <NotificationsProvider>
                    <ChatProvider>
                      <StoriesProvider>
                        <CallProvider>
                          <App />
                          <CallOverlay />
                        </CallProvider>
                      </StoriesProvider>
                    </ChatProvider>
                  </NotificationsProvider>
                </PostsProvider>
              </VerificationGateProvider>
            </AuthProvider>
          </ThemeProvider>
        </LanguageProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
