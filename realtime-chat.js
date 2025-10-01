/**
 * Floating Realtime Chat with AI Integration
 * Usage: <script src="realtime-chat.js"></script>
 * Initialize: new FloatingRealtimeChat({ username: 'User', roomName: 'room-1' });
 */

class FloatingRealtimeChat {
  constructor(options = {}) {
    this.username = options.username || 'User';
    this.roomName = options.roomName || 'default-room';
    this.isOpen = false;
    this.isAIMode = false;
    this.isConnected = false;
    this.isDragging = false;
    this.showAIPrompt = false;
    this.isAITyping = false;
    this.waitingTime = 0;
    this.messages = [];
    this.aiMessages = [];
    this.conversationHistory = [];
    this.position = { 
      x: window.innerWidth - 100, 
      y: window.innerHeight - 100 
    };
    
    this.init();
  }

  init() {
    this.injectStyles();
    this.createChatElements();
    this.attachEventListeners();
    this.simulateConnection();
  }

  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .rtc-hidden { display: none !important; }
      .rtc-button {
        position: fixed;
        width: 56px;
        height: 56px;
        background: #3b82f6;
        border-radius: 16px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        border: none;
        cursor: grab;
        z-index: 9999;
        transition: all 0.3s;
        display: flex;
        align-items: center;
        justify-content: center;
        user-select: none;
      }
      .rtc-button:hover { background: #2563eb; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); }
      .rtc-button.dragging { cursor: grabbing; }
      .rtc-window {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 384px;
        height: 600px;
        background: white;
        border-radius: 16px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        display: flex;
        flex-direction: column;
        z-index: 9998;
        animation: slideIn 0.3s ease-out;
      }
      @keyframes slideIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .rtc-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        border-bottom: 1px solid #e5e7eb;
      }
      .rtc-header-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .rtc-status {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        animation: pulse 2s infinite;
      }
      .rtc-status.connected { background: #10b981; }
      .rtc-status.waiting { background: #eab308; }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      .rtc-title {
        font-weight: 600;
        color: #1f2937;
        font-size: 16px;
      }
      .rtc-timer {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        color: #6b7280;
      }
      .rtc-close {
        background: none;
        border: none;
        color: #6b7280;
        cursor: pointer;
        padding: 4px;
        transition: color 0.2s;
      }
      .rtc-close:hover { color: #374151; }
      .rtc-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
      }
      .rtc-messages::-webkit-scrollbar { width: 6px; }
      .rtc-messages::-webkit-scrollbar-thumb {
        background: #d1d5db;
        border-radius: 3px;
      }
      .rtc-empty {
        text-align: center;
        color: #6b7280;
        font-size: 14px;
        margin-top: 40px;
      }
      .rtc-prompt {
        background: #fef3c7;
        border: 1px solid #fde047;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 16px;
      }
      .rtc-prompt-text {
        font-size: 14px;
        color: #374151;
        margin-bottom: 12px;
      }
      .rtc-prompt-buttons {
        display: flex;
        gap: 8px;
      }
      .rtc-btn {
        flex: 1;
        padding: 8px 16px;
        border-radius: 8px;
        border: none;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }
      .rtc-btn-wait {
        background: #e5e7eb;
        color: #374151;
      }
      .rtc-btn-wait:hover { background: #d1d5db; }
      .rtc-btn-ai {
        background: #3b82f6;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
      .rtc-btn-ai:hover { background: #2563eb; }
      .rtc-message {
        display: flex;
        margin-top: 8px;
      }
      .rtc-message.own { justify-content: flex-end; }
      .rtc-message-content {
        max-width: 75%;
        display: flex;
        gap: 8px;
      }
      .rtc-message.own .rtc-message-content { flex-direction: row-reverse; }
      .rtc-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #e5e7eb;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .rtc-message-body {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .rtc-message-header {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        padding: 0 12px;
      }
      .rtc-message-sender {
        font-weight: 500;
        color: #374151;
      }
      .rtc-message-time {
        color: #6b7280;
      }
      .rtc-message-bubble {
        padding: 8px 12px;
        border-radius: 12px;
        font-size: 14px;
        word-wrap: break-word;
      }
      .rtc-message.own .rtc-message-bubble {
        background: #3b82f6;
        color: white;
      }
      .rtc-message:not(.own) .rtc-message-bubble {
        background: #f3f4f6;
        color: #1f2937;
      }
      .rtc-message.ai .rtc-message-bubble {
        border: 1px solid #e5e7eb;
      }
      .rtc-typing {
        display: flex;
        justify-content: flex-start;
      }
      .rtc-typing-content {
        display: flex;
        gap: 8px;
      }
      .rtc-typing-bubble {
        background: #f3f4f6;
        border: 1px solid #e5e7eb;
        padding: 8px 12px;
        border-radius: 12px;
      }
      .rtc-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid #e5e7eb;
        border-top-color: #3b82f6;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      .typing-cursor {
        display: inline-block;
        width: 8px;
        height: 1rem;
        background-color: #374151;
        animation: blink 1s infinite;
      }
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
      }
      .rtc-input-area {
        display: flex;
        gap: 8px;
        padding: 16px;
        border-top: 1px solid #e5e7eb;
      }
      .rtc-input {
        flex: 1;
        padding: 8px 16px;
        background: #f3f4f6;
        border: none;
        border-radius: 24px;
        font-size: 14px;
        outline: none;
        transition: all 0.2s;
      }
      .rtc-input:focus {
        background: #e5e7eb;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }
      .rtc-input:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .rtc-send {
        width: 40px;
        height: 40px;
        background: #3b82f6;
        border: none;
        border-radius: 50%;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        animation: slideInRight 0.3s ease-out;
      }
      @keyframes slideInRight {
        from { opacity: 0; transform: translateX(10px); }
        to { opacity: 1; transform: translateX(0); }
      }
      .rtc-send:hover { background: #2563eb; }
      .rtc-send:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .rtc-icon { width: 20px; height: 20px; }
    `;
    document.head.appendChild(style);
  }

  createChatElements() {
    // Floating button
    this.button = document.createElement('button');
    this.button.className = 'rtc-button';
    this.button.style.left = `${this.position.x}px`;
    this.button.style.top = `${this.position.y}px`;
    this.button.innerHTML = this.getIcon('message');
    document.body.appendChild(this.button);

    // Chat window
    this.window = document.createElement('div');
    this.window.className = 'rtc-window rtc-hidden';
    this.window.innerHTML = `
      <div class="rtc-header">
        <div class="rtc-header-left">
          <div class="rtc-status waiting"></div>
          <span class="rtc-title">Chat en Vivo</span>
          <span class="rtc-timer rtc-hidden">
            ${this.getIcon('clock')}
            <span class="rtc-timer-value">0s</span>
          </span>
        </div>
        <button class="rtc-close">${this.getIcon('x')}</button>
      </div>
      <div class="rtc-messages"></div>
      <div class="rtc-input-area">
        <input 
          type="text" 
          class="rtc-input" 
          placeholder="Escribe un mensaje..." 
          disabled
        />
      </div>
    `;
    document.body.appendChild(this.window);

    // Get references
    this.messagesContainer = this.window.querySelector('.rtc-messages');
    this.input = this.window.querySelector('.rtc-input');
    this.statusDot = this.window.querySelector('.rtc-status');
    this.titleEl = this.window.querySelector('.rtc-title');
    this.timerEl = this.window.querySelector('.rtc-timer');
    this.timerValueEl = this.window.querySelector('.rtc-timer-value');
    this.closeBtn = this.window.querySelector('.rtc-close');
  }

  attachEventListeners() {
    // Button events
    this.button.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.button.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.button.addEventListener('click', (e) => {
      if (!this.isDragging) this.toggleChat();
    });

    // Close button
    this.closeBtn.addEventListener('click', () => this.toggleChat());

    // Input events
    this.input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });
  }

  handleMouseDown(e) {
    this.isDragging = true;
    this.button.classList.add('dragging');
    this.dragStart = {
      x: e.clientX - this.position.x,
      y: e.clientY - this.position.y
    };

    const mouseMoveHandler = (e) => {
      if (this.isDragging) {
        this.position.x = e.clientX - this.dragStart.x;
        this.position.y = e.clientY - this.dragStart.y;
        this.button.style.left = `${this.position.x}px`;
        this.button.style.top = `${this.position.y}px`;
      }
    };

    const mouseUpHandler = () => {
      this.isDragging = false;
      this.button.classList.remove('dragging');
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
    };

    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);
  }

  handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    this.isDragging = true;
    this.button.classList.add('dragging');
    this.dragStart = {
      x: touch.clientX - this.position.x,
      y: touch.clientY - this.position.y
    };

    const touchMoveHandler = (e) => {
      if (this.isDragging) {
        const touch = e.touches[0];
        this.position.x = touch.clientX - this.dragStart.x;
        this.position.y = touch.clientY - this.dragStart.y;
        this.button.style.left = `${this.position.x}px`;
        this.button.style.top = `${this.position.y}px`;
      }
    };

    const touchEndHandler = () => {
      this.isDragging = false;
      this.button.classList.remove('dragging');
      document.removeEventListener('touchmove', touchMoveHandler);
      document.removeEventListener('touchend', touchEndHandler);
    };

    document.addEventListener('touchmove', touchMoveHandler, { passive: false });
    document.addEventListener('touchend', touchEndHandler);
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    this.window.classList.toggle('rtc-hidden', !this.isOpen);
    
    if (this.isOpen && !this.isConnected && !this.isAIMode) {
      this.startWaitingTimer();
    }
  }

  simulateConnection() {
    setTimeout(() => {
      this.isConnected = false;
    }, 2000);
  }

  startWaitingTimer() {
    this.waitingTime = 0;
    this.timerEl.classList.remove('rtc-hidden');
    
    this.waitingInterval = setInterval(() => {
      this.waitingTime++;
      this.timerValueEl.textContent = `${this.waitingTime}s`;
    }, 1000);

    this.connectionTimeout = setTimeout(() => {
      this.showAIPromptDialog();
      clearInterval(this.waitingInterval);
    }, 30000);
  }

  showAIPromptDialog() {
    this.showAIPrompt = true;
    const promptHtml = `
      <div class="rtc-prompt">
        <p class="rtc-prompt-text">¡Ops! Parece que no hay nadie disponible por el momento, ¿Deseas chatear conmigo?</p>
        <div class="rtc-prompt-buttons">
          <button class="rtc-btn rtc-btn-wait" onclick="window.rtcChat.handleWait()">Esperar</button>
          <button class="rtc-btn rtc-btn-ai" onclick="window.rtcChat.startAIMode()">
            <svg viewBox="0 0 24 24" fill="currentColor" style="width: 16px; height: 16px;">
              <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.4047-.6813zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/>
            </svg>
            Empezar
          </button>
        </div>
      </div>
    `;
    this.messagesContainer.insertAdjacentHTML('afterbegin', promptHtml);
  }

  handleWait() {
    this.showAIPrompt = false;
    this.messagesContainer.querySelector('.rtc-prompt')?.remove();
    this.waitingTime = 0;
    this.startWaitingTimer();
  }

  startAIMode() {
    this.isAIMode = true;
    this.showAIPrompt = false;
    this.statusDot.classList.remove('waiting');
    this.statusDot.classList.add('connected');
    this.titleEl.textContent = 'Asistente IA';
    this.timerEl.classList.add('rtc-hidden');
    this.input.disabled = false;
    this.input.placeholder = 'Pregunta lo que quieras...';
    
    if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
    if (this.waitingInterval) clearInterval(this.waitingInterval);
    
    this.messagesContainer.querySelector('.rtc-prompt')?.remove();
    this.messagesContainer.innerHTML = '';
    
    this.addAITypingMessage('¡Hola! Soy tu asistente de IA. ¿En qué puedo ayudarte hoy?');
  }

  sendMessage() {
    const content = this.input.value.trim();
    if (!content) return;

    if (this.isAIMode) {
      this.addMessage({
        content,
        isOwn: true,
        sender: this.username
      });
      
      this.input.value = '';
      this.getAIResponse(content);
    } else if (this.isConnected) {
      this.addMessage({
        content,
        isOwn: true,
        sender: this.username
      });
      this.input.value = '';
    }
  }

  async getAIResponse(userMessage) {
    this.showTypingIndicator();

    const supabaseUrl = 'https://jcumgyeqckgidvcdzaoi.supabase.co/functions/v1/cloudflare-chat';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjdW1neWVxY2tnaWR2Y2R6YW9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyOTA4MzUsImV4cCI6MjA3NDg2NjgzNX0.Io0milDjBGLx3saynyi2zjHJjoRLLJzbiUDWjG3mCC0';

    try {
      const response = await fetch(
        `${supabaseUrl}?ask=${encodeURIComponent(userMessage)}`,
        {
          method: 'GET',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // Assuming the response is a JSON object with a 'response' property
      const aiResponseText = data.response || data.answer || data.message || 'Lo siento, no pude generar una respuesta.';

      this.addAITypingMessage(aiResponseText);
    } catch (error) {
      console.error('AI response error:', error);
      this.addAITypingMessage('Lo siento, ha ocurrido un error al procesar tu mensaje. Por favor, intenta nuevamente.');
    }
  }

  showTypingIndicator() {
    this.isAITyping = true;
    const typingHtml = `
      <div class="rtc-typing" id="rtc-typing-indicator">
        <div class="rtc-typing-content">
          <div class="rtc-avatar">
            <svg viewBox="0 0 24 24" fill="currentColor" style="width: 20px; height: 20px; color: #374151;">
              <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.4047-.6813zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/>
            </svg>
          </div>
          <div class="rtc-typing-bubble">
            <div class="rtc-spinner"></div>
          </div>
        </div>
      </div>
    `;
    this.messagesContainer.insertAdjacentHTML('beforeend', typingHtml);
    this.scrollToBottom();
  }

  hideTypingIndicator() {
    this.isAITyping = false;
    const indicator = document.getElementById('rtc-typing-indicator');
    if (indicator) indicator.remove();
  }

  addAITypingMessage(text) {
    this.hideTypingIndicator();

    const time = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    const messageId = `ai-message-${Date.now()}`;

    const messageHtml = `
      <div class="rtc-message ai">
        <div class="rtc-message-content">
          <div class="rtc-avatar">
            <svg viewBox="0 0 24 24" fill="currentColor" style="width: 20px; height: 20px; color: #374151;">
              <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.4047-.6813zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/>
            </svg>
          </div>
          <div class="rtc-message-body">
            <div class="rtc-message-header">
              <span class="rtc-message-sender">AI Assistant</span>
              <span class="rtc-message-time">${time}</span>
            </div>
            <div class="rtc-message-bubble" id="${messageId}">
                <span class="typing-cursor"></span>
            </div>
          </div>
        </div>
      </div>
    `;
    this.messagesContainer.insertAdjacentHTML('beforeend', messageHtml);
    this.scrollToBottom();

    const bubble = document.getElementById(messageId);
    const cursor = bubble.querySelector('.typing-cursor');
    let i = 0;

    const typingInterval = setInterval(() => {
        if (i < text.length) {
            cursor.insertAdjacentText('beforebegin', this.escapeHtml(text.charAt(i)));
            i++;
            this.scrollToBottom();
        } else {
            clearInterval(typingInterval);
            cursor.remove();
        }
    }, 30);
  }

  addMessage(message) {
    const time = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const isOwn = message.isOwn || false;
    const isAI = message.isAI || false;
    const sender = message.sender || this.username;

    const messageHtml = `
      <div class="rtc-message ${isOwn ? 'own' : ''} ${isAI ? 'ai' : ''}">
        <div class="rtc-message-content">
          ${!isOwn ? `
            <div class="rtc-avatar">
              ${isAI ? `
                <svg viewBox="0 0 24 24" fill="currentColor" style="width: 20px; height: 20px; color: #374151;">
                  <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.4047-.6813zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/>
                </svg>
              ` : `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              `}
            </div>
          ` : ''}
          <div class="rtc-message-body">
            ${!isOwn ? `
              <div class="rtc-message-header">
                <span class="rtc-message-sender">${isAI ? 'AI Assistant' : sender}</span>
                <span class="rtc-message-time">${time}</span>
              </div>
            ` : ''}
            <div class="rtc-message-bubble">${this.escapeHtml(message.content)}</div>
          </div>
        </div>
      </div>
    `;

    this.messagesContainer.insertAdjacentHTML('beforeend', messageHtml);
    this.scrollToBottom();
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  scrollToBottom() {
    setTimeout(() => {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }, 100);
  }

  getIcon(name) {
    const icons = {
      message: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
      x: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
      clock: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
      send: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>'
    };
    return icons[name] || '';
  }
}

// Auto-initialize when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.rtcChat = new FloatingRealtimeChat();
  });
} else {
  window.rtcChat = new FloatingRealtimeChat();
}