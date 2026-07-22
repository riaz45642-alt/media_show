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
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <LanguageProvider>
          <ThemeProvider>
            <AuthProvider>
              <PostsProvider>
                <NotificationsProvider>
                  <ChatProvider>
                    <StoriesProvider>
                      <App />
                    </StoriesProvider>
                  </ChatProvider>
                </NotificationsProvider>
              </PostsProvider>
            </AuthProvider>
          </ThemeProvider>
        </LanguageProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
