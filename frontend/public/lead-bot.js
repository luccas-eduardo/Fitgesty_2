/**
 * FitGesty — Motor Conversacional Proprietário de Qualificação de Leads (Pilar 5)
 * Padrão Arquitetural: Motor Conversacional Interativo & State Machine Reativa
 * Zero Dependências Externas • Acessibilidade WCAG 2.1 AA • Mobile First
 */

(function () {
  'use strict';

  // Extração de parâmetros de URL e UTMs
  function extractUtms() {
    const params = new URLSearchParams(window.location.search);
    return {
      source: params.get('utm_source'),
      medium: params.get('utm_medium'),
      campaign: params.get('utm_campaign'),
      term: params.get('utm_term'),
      content: params.get('utm_content')
    };
  }

  function getMetadata(startTime) {
    const now = new Date();
    const isMobile = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
    return {
      originUrl: window.location.href,
      referrer: document.referrer || '',
      userAgent: navigator.userAgent,
      device: isMobile ? 'mobile' : 'desktop',
      durationSeconds: Math.max(1, Math.round((now.getTime() - startTime.getTime()) / 1000)),
      utms: extractUtms()
    };
  }

  function maskPhone(value) {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits.length ? `(${digits}` : '';
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  }

  class FitGestyLeadBot {
    constructor(containerId = 'fitgesty-chat-container') {
      this.containerId = containerId;
      this.container = document.getElementById(containerId);
      this.answers = {};
      this.currentStep = 0;
      this.startTime = new Date();
      this.totalSteps = 4; // 1: Nome, 2: WhatsApp, 3: Segmento, 4: Porte
      this.initGlobalTriggerListener();
    }

    initGlobalTriggerListener() {
      document.addEventListener('click', (event) => {
        const trigger = event.target.closest('[data-open-demo-chat]');
        if (trigger) {
          event.preventDefault();
          this.open();
        }
      });
    }

    ensureContainer() {
      if (!this.container) {
        this.container = document.createElement('section');
        this.container.id = this.containerId;
        this.container.className = 'fitgesty-chat-card';
        this.container.setAttribute('aria-label', 'Chat de Demonstração e Qualificação');
        document.body.appendChild(this.container);
      }
      return this.container;
    }

    open() {
      const el = this.ensureContainer();
      el.style.display = 'block';
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });

      if (this.currentStep === 0) {
        this.renderShell();
        this.askCurrentStep();
      }
    }

    close() {
      if (this.container) {
        this.container.style.display = 'none';
      }
    }

    renderShell() {
      const el = this.ensureContainer();
      el.innerHTML = `
        <div class="chat-header">
          <div class="chat-avatar-wrapper">
            <img src="assets/icon.png" alt="FitGesty" class="chat-avatar" />
            <span class="chat-status-dot" title="Online agora"></span>
          </div>
          <div class="chat-header-info">
            <h3 class="chat-host-name">Consultor FitGesty</h3>
            <p class="chat-status-text"><span class="pulse-indicator">●</span> Online agora</p>
          </div>
          <button type="button" class="chat-close-btn" aria-label="Fechar janela de chat">&times;</button>
        </div>
        <div class="chat-progress-bar">
          <div class="chat-progress-fill" style="width: 10%;"></div>
        </div>
        <div class="chat-messages" role="log" aria-live="polite"></div>
        <div class="chat-input-area"></div>
      `;

      el.querySelector('.chat-close-btn').addEventListener('click', () => this.close());
      this.messagesEl = el.querySelector('.chat-messages');
      this.inputAreaEl = el.querySelector('.chat-input-area');
      this.progressFillEl = el.querySelector('.chat-progress-fill');
    }

    updateProgress(percent) {
      if (this.progressFillEl) {
        this.progressFillEl.style.width = `${Math.min(100, Math.max(10, percent))}%`;
      }
    }

    async simulateTyping(duration = 750) {
      const typingEl = document.createElement('div');
      typingEl.className = 'chat-bubble chat-bubble-typing';
      typingEl.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
      this.messagesEl.appendChild(typingEl);
      this.scrollToBottom();

      await new Promise(res => setTimeout(res, duration));
      typingEl.remove();
    }

    scrollToBottom() {
      if (this.messagesEl) {
        this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
      }
    }

    addHostMessage(text) {
      const msg = document.createElement('div');
      msg.className = 'chat-bubble chat-bubble-host';
      msg.innerText = text;
      this.messagesEl.appendChild(msg);
      this.scrollToBottom();
    }

    addUserMessage(text) {
      const msg = document.createElement('div');
      msg.className = 'chat-bubble chat-bubble-user';
      msg.innerText = text;
      this.messagesEl.appendChild(msg);
      this.scrollToBottom();
    }

    async askCurrentStep() {
      this.inputAreaEl.innerHTML = '';

      switch (this.currentStep) {
        case 0: // Nome do Gestor
          this.updateProgress(15);
          await this.simulateTyping(700);
          this.addHostMessage('Olá! 👋 Sou o consultor de soluções do FitGesty. Para iniciarmos a apresentação do sistema, qual é o seu nome completo?');
          this.renderTextInput({
            placeholder: 'Digite seu nome completo...',
            type: 'text',
            onSubmit: (val) => this.handleNameInput(val)
          });
          break;

        case 1: // Validação Reflexiva de Nome
          await this.simulateTyping(500);
          this.addHostMessage(`Este é o seu nome correto: "${this.answers.fullName}"?`);
          this.renderQuickReplies(['Sim, correto', 'Não, quero corrigir'], (opt) => {
            if (opt.startsWith('Sim')) {
              this.currentStep = 2;
              this.askCurrentStep();
            } else {
              this.currentStep = 0;
              this.askCurrentStep();
            }
          });
          break;

        case 2: // WhatsApp com Máscara
          this.updateProgress(45);
          await this.simulateTyping(750);
          this.addHostMessage(`Prazer em te conhecer, ${this.answers.fullName}! Qual é o seu WhatsApp com DDD para envio do link e agendamento da demonstração?`);
          this.renderTextInput({
            placeholder: '(DDD) 99999-9999',
            type: 'tel',
            mask: maskPhone,
            onSubmit: (val) => this.handlePhoneInput(val)
          });
          break;

        case 3: // E-mail Opcional / Corporativo
          this.updateProgress(65);
          await this.simulateTyping(650);
          this.addHostMessage('Qual é o seu melhor e-mail corporativo ou pessoal?');
          this.renderTextInput({
            placeholder: 'contato@exemplo.com',
            type: 'email',
            onSubmit: (val) => {
              this.answers.email = val;
              this.currentStep = 4;
              this.askCurrentStep();
            }
          });
          break;

        case 4: // Segmento do Negócio (Quick Replies Táteis)
          this.updateProgress(80);
          await this.simulateTyping(700);
          this.addHostMessage('Qual é o modelo do seu espaço fitness?');
          this.renderQuickReplies(
            ['Academia de Musculação', 'Box CrossFit / Treino Funcional', 'Studio Personal / Pilates', 'Artes Marciais / Lutas', 'Outro Formato'],
            (val) => {
              this.answers.businessType = val;
              this.currentStep = 5;
              this.askCurrentStep();
            }
          );
          break;

        case 5: // Porte de Alunos (Qualificação de Ticket)
          this.updateProgress(90);
          await this.simulateTyping(600);
          this.addHostMessage('Aproximadamente quantos alunos ou clientes ativos você possui hoje?');
          this.renderQuickReplies(
            ['Ainda vou inaugurar', 'Até 80 alunos', '81 a 250 alunos', 'Mais de 250 alunos'],
            async (val) => {
              this.answers.studentCount = val;
              await this.submitLead();
            }
          );
          break;
      }
    }

    async handleNameInput(val) {
      if (val.trim().length < 2) {
        await this.simulateTyping(450);
        this.addHostMessage('Ops! Por favor, informe seu nome completo para nos conhecermos melhor.');
        this.renderTextInput({
          placeholder: 'Digite seu nome completo...',
          type: 'text',
          onSubmit: (retryVal) => this.handleNameInput(retryVal)
        });
        return;
      }
      this.answers.fullName = val.trim();
      this.currentStep = 1;
      this.askCurrentStep();
    }

    async handlePhoneInput(val) {
      const digits = val.replace(/\D/g, '');
      if (digits.length < 10) {
        await this.simulateTyping(500);
        this.addHostMessage('Ops! O número informado precisa conter o DDD e pelo menos 10 dígitos (ex: (11) 99999-9999). Poderia digitar novamente?');
        this.renderTextInput({
          placeholder: '(DDD) 99999-9999',
          type: 'tel',
          mask: maskPhone,
          onSubmit: (retryVal) => this.handlePhoneInput(retryVal)
        });
        return;
      }
      this.answers.whatsapp = val;
      this.currentStep = 3;
      this.askCurrentStep();
    }

    renderTextInput({ placeholder, type, mask, onSubmit }) {
      const form = document.createElement('form');
      form.className = 'chat-input-form';
      form.innerHTML = `
        <input type="${type}" class="chat-text-input" placeholder="${placeholder}" required autofocus autocomplete="off" />
        <button type="submit" class="chat-send-btn" aria-label="Enviar mensagem">Enviar</button>
      `;

      const input = form.querySelector('input');
      if (mask) {
        input.addEventListener('input', (e) => {
          input.value = mask(e.target.value);
        });
      }

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const value = input.value.trim();
        if (value) {
          form.remove();
          this.addUserMessage(value);
          onSubmit(value);
        }
      });

      this.inputAreaEl.appendChild(form);
      input.focus();
    }

    renderQuickReplies(options, onSelect) {
      const container = document.createElement('div');
      container.className = 'chat-quick-replies';

      options.forEach(opt => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chat-quick-btn';
        btn.innerText = opt;
        btn.addEventListener('click', () => {
          container.remove();
          this.addUserMessage(opt);
          onSelect(opt);
        });
        container.appendChild(btn);
      });

      this.inputAreaEl.appendChild(container);
    }

    async submitLead() {
      this.inputAreaEl.innerHTML = '';
      this.updateProgress(100);
      await this.simulateTyping(900);
      this.addHostMessage('Perfeito! Estou registrando suas respostas com nossos especialistas agora… ✨');

      const payload = {
        answers: this.answers,
        metadata: getMetadata(this.startTime)
      };

      try {
        const res = await fetch('/api/leads/capturar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Falha no envio do lead');
        const data = await res.json();

        await this.simulateTyping(700);
        this.addHostMessage(`Tudo certo, ${this.answers.fullName}! Nossa equipe já recebeu sua solicitação para o seu espaço (${this.answers.businessType}). Em poucos minutos nossa equipe entrará em contato via WhatsApp no número ${this.answers.whatsapp}.`);

        // Confirmação segura de captação (sem redirecionamento externo na fase de testes)
        const ctaBox = document.createElement('div');
        ctaBox.className = 'chat-completion-cta';
        ctaBox.innerHTML = `
          <p class="chat-success-badge">✓ Solicitação confirmada com sucesso!</p>
          <div style="background:rgba(37,99,235,0.08);border:1px solid rgba(37,99,235,0.25);border-radius:10px;padding:0.85rem;margin-top:0.6rem;text-align:left;">
            <p style="font-size:0.82rem;color:var(--text);margin:0 0 0.35rem;font-weight:600;">
              Canal Oficial WhatsApp FitGesty
            </p>
            <p style="font-size:0.75rem;color:var(--text-sub);margin:0;line-height:1.4;">
              Seus dados foram vinculados à fila de atendimento prioritário. Aguarde a mensagem de um de nossos consultores de negócios diretamente no seu WhatsApp (${escapeHtml(this.answers.whatsapp)}).
            </p>
          </div>
        `;
        this.messagesEl.appendChild(ctaBox);
        this.scrollToBottom();
      } catch (err) {
        console.error('[LeadBot Submission Error]', err);
        this.addHostMessage('Houve uma instabilidade momentânea na conexão, mas suas respostas foram preservadas. Por favor, tente clicar novamente no envio.');
      }
    }
  }

  // Inicialização Automática e Exportação Global
  window.FitGestyLeadBot = FitGestyLeadBot;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new FitGestyLeadBot());
  } else {
    new FitGestyLeadBot();
  }
})();
