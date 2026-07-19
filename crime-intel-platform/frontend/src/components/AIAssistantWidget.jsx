import React, { useState, useRef, useEffect } from 'react';
import { Bot, Sparkles, Send, X, Minimize2, RefreshCw, Cpu, User } from 'lucide-react';
import { api } from '../api';

const INITIAL_MESSAGES = [
  {
    sender: 'ai',
    text: 'Tactical AI Command Assistant online (Powered by local Ollama inference). Ask me about district threat levels, suspect link graphs, or spatial crime hotspots.',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
];

const SUGGESTIONS = [
  "Summarize high-risk districts in Karnataka",
  "Explain accused relationship link graph analysis",
  "What tactical actions are recommended for crime hotspots?"
];

const AIAssistantWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = (textToSend = input) => {
    const query = textToSend.trim();
    if (!query || loading) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { sender: 'user', text: query, time };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    api.askAIAssistant(query)
      .then(res => {
        const aiMsg = {
          sender: 'ai',
          text: res.response,
          model: res.model_used || 'local-ollama',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, aiMsg]);
        setLoading(false);
      })
      .catch(err => {
        console.error("AI Assistant error:", err);
        const errorMsg = {
          sender: 'ai',
          text: "System response degraded: Unable to reach the local Ollama runtime. Reverting to rule-based tactical assistant.",
          isError: true,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, errorMsg]);
        setLoading(false);
      });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages(INITIAL_MESSAGES);
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 10000 }}>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 18px',
            background: 'linear-gradient(135deg, #18222a 0%, #0d1217 100%)',
            border: '1px solid var(--accent-blue)',
            borderRadius: '30px',
            color: 'var(--text-primary)',
            fontWeight: '700',
            fontSize: '0.8rem',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), 0 0 12px rgba(127, 191, 91, 0.2)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
          }}
        >
          <Sparkles size={16} style={{ color: 'var(--accent-blue)' }} />
          <span>AI Assistant</span>
          <span 
            style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: 'var(--accent-green)',
              boxShadow: '0 0 8px var(--accent-green)'
            }} 
          />
        </button>
      )}

      {/* Floating Chat Drawer Window */}
      {isOpen && (
        <div
          style={{
            width: '380px',
            height: '520px',
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border-hover)',
            borderRadius: '12px',
            boxShadow: '0 16px 40px rgba(0,0,0,0.85)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 16px',
              background: 'var(--surface-color)',
              borderBottom: '1px solid var(--card-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ padding: '6px', background: 'rgba(127, 191, 91, 0.1)', borderRadius: '6px', border: '1px solid rgba(127, 191, 91, 0.25)' }}>
                <Cpu size={16} style={{ color: 'var(--accent-blue)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  AI Assistant
                  <span style={{ fontSize: '0.6rem', padding: '1px 6px', background: 'rgba(127,191,91,0.15)', color: 'var(--accent-green)', borderRadius: '4px', border: '1px solid rgba(127,191,91,0.3)' }}>
                    LOCAL
                  </span>
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Intelligence & Field Query Assistant</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={clearChat}
                title="Clear conversation"
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <RefreshCw size={13} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div style={{ flexGrow: 1, padding: '14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  gap: '4px'
                }}
              >
                <div
                  style={{
                    maxWidth: '85%',
                    padding: '10px 14px',
                    borderRadius: msg.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    background: msg.sender === 'user' ? 'rgba(127, 191, 91, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    border: msg.sender === 'user' ? '1px solid rgba(127, 191, 91, 0.3)' : '1px solid var(--card-border)',
                    color: 'var(--text-primary)',
                    fontSize: '0.78rem',
                    lineHeight: '1.45',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {msg.text}
                </div>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', padding: '0 4px' }}>
                  {msg.sender === 'ai' ? (msg.model || 'local-ollama') : 'You'} • {msg.time}
                </span>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', width: 'fit-content' }}>
                <Sparkles size={14} className="spin" style={{ color: 'var(--accent-blue)' }} />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Local Ollama model generating intelligence response...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Prompt Suggestions */}
          {messages.length < 3 && (
            <div style={{ padding: '0 12px 8px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Suggested Queries:</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {SUGGESTIONS.map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(sug)}
                    style={{
                      textAlign: 'left',
                      padding: '5px 8px',
                      fontSize: '0.68rem',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--card-border)',
                      borderRadius: '4px',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                  >
                    💡 {sug}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Box */}
          <div style={{ padding: '12px', borderTop: '1px solid var(--card-border)', background: 'var(--surface-color)', display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Ask local AI assistant..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              style={{
                flexGrow: 1,
                padding: '8px 12px',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid var(--card-border)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '0.75rem',
                outline: 'none'
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              style={{
                padding: '8px 14px',
                background: input.trim() && !loading ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistantWidget;
