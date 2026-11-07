(() => {
    'use strict';

    // After deploying the Worker, paste its URL here (see SETUP.md), e.g. https://nirajan-agent.yourname.workers.dev
    const API_URL = 'https://agent.nirajan-koirala.workers.dev';

    const GREETING = "Hi, I'm Nirajan's AI assistant. Ask me about his education and certifications, or leave a message for him here.";
    const LEAVE_LABEL = 'Leave a message for Nirajan';
    const CHIPS = ['Who is Nirajan?', 'What are his certifications?', LEAVE_LABEL];
    const MAX_LEN = 500;

    const history = []; // {role, content}
    let busy = false;

    // ---------- Build UI ----------
    const fab = document.createElement('button');
    fab.className = 'agent-fab';
    fab.type = 'button';
    fab.setAttribute('aria-expanded', 'false');
    fab.setAttribute('aria-controls', 'agent-panel');
    fab.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg><span>Chat with my agent</span>';

    const panel = document.createElement('section');
    panel.className = 'agent-panel';
    panel.id = 'agent-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Chat with Nirajan\u2019s AI assistant');
    panel.innerHTML = `
        <div class="agent-head">
            <div><strong>Nirajan\u2019s AI assistant</strong><small>Ask a question or find how to reach him</small></div>
            <button class="agent-close" type="button" aria-label="Close chat">&times;</button>
        </div>
        <div class="agent-log" role="log" aria-live="polite"></div>
        <div class="agent-chips"></div>
        <form class="agent-form">
            <input type="text" maxlength="${MAX_LEN}" placeholder="Type your message\u2026" aria-label="Your message" autocomplete="off">
            <button type="submit">Send</button>
        </form>
        <p class="agent-note">AI replies may contain mistakes. <a href="#" class="agent-leave">Leave a message</a> &middot; <a href="mailto:contact@nirajankoirala.com.np">Email directly</a></p>`;

    document.body.append(fab, panel);

    const log = panel.querySelector('.agent-log');
    const chips = panel.querySelector('.agent-chips');
    const form = panel.querySelector('.agent-form');
    const input = form.querySelector('input');
    const sendBtn = form.querySelector('button');

    // ---------- Helpers ----------
    // Escape-free approach: textContent only, then turn bare URLs into links safely
    function addMessage(role, text) {
        const el = document.createElement('div');
        el.className = 'agent-msg ' + role;
        const parts = text.split(/(https?:\/\/[^\s)]+)/g);
        for (const part of parts) {
            if (/^https?:\/\//.test(part)) {
                const a = document.createElement('a');
                a.href = part;
                a.textContent = part;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                el.appendChild(a);
            } else {
                el.appendChild(document.createTextNode(part));
            }
        }
        log.appendChild(el);
        log.scrollTop = log.scrollHeight;
        return el;
    }

    function setBusy(state) {
        busy = state;
        sendBtn.disabled = state;
    }

    function openPanel() {
        panel.classList.add('open');
        fab.setAttribute('aria-expanded', 'true');
        if (!log.children.length) {
            addMessage('bot', GREETING);
            for (const label of CHIPS) {
                const b = document.createElement('button');
                b.type = 'button';
                b.textContent = label;
                b.addEventListener('click', () => (label === LEAVE_LABEL ? showContactForm() : send(label)));
                chips.appendChild(b);
            }
        }
        input.focus();
    }

    function closePanel() {
        panel.classList.remove('open');
        fab.setAttribute('aria-expanded', 'false');
        fab.focus();
    }

    // ---------- Chat ----------
    async function send(text) {
        text = text.trim().slice(0, MAX_LEN);
        if (!text || busy) return;

        chips.remove(); // suggestions disappear after first use
        addMessage('user', text);
        history.push({ role: 'user', content: text });
        input.value = '';
        setBusy(true);
        const pending = addMessage('bot typing', 'Typing\u2026');

        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: history }),
            });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const { reply } = await res.json();
            pending.remove();
            addMessage('bot', reply);
            history.push({ role: 'assistant', content: reply });
        } catch (e) {
            pending.remove();
            history.pop(); // drop the unanswered turn so history stays valid
            addMessage('bot', 'Sorry, I couldn\u2019t connect just now. You can email contact@nirajankoirala.com.np instead.');
        } finally {
            setBusy(false);
            input.focus();
        }
    }

    // ---------- Leave a message (emails Nirajan) ----------
    function showContactForm() {
        const existing = log.querySelector('.agent-contact');
        if (existing) { existing.querySelector('input').focus(); return; }
        chips.remove();

        const form = document.createElement('form');
        form.className = 'agent-msg bot agent-contact';
        form.innerHTML = `
            <strong>Leave a message for Nirajan</strong>
            <label>Your name<input name="name" maxlength="80" required autocomplete="name"></label>
            <label>Your email<input name="email" type="email" maxlength="200" required autocomplete="email"></label>
            <label>Message<textarea name="message" rows="4" maxlength="1500" required></textarea></label>
            <label class="agent-check"><input type="checkbox" name="copy" checked> Email me a copy of my message</label>
            <input class="agent-hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
            <div class="agent-contact-actions">
                <button type="submit">Send message</button>
                <button type="button" class="agent-cancel">Cancel</button>
            </div>
            <p class="agent-contact-status" role="status"></p>`;
        log.appendChild(form);
        log.scrollTop = log.scrollHeight;
        form.querySelector('input').focus();

        form.querySelector('.agent-cancel').addEventListener('click', () => { form.remove(); input.focus(); });
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = new FormData(form);
            const status = form.querySelector('.agent-contact-status');
            const submit = form.querySelector('button[type="submit"]');
            submit.disabled = true;
            status.textContent = 'Sending\u2026';
            let reason = '';
            try {
                const res = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'contact',
                        name: data.get('name'),
                        email: data.get('email'),
                        message: data.get('message'),
                        copy: data.get('copy') === 'on',
                        website: data.get('website'),
                    }),
                });
                const result = await res.json();
                if (!res.ok || !result.ok) {
                    reason = result.error || '';
                    if (result.debug) console.warn('Contact form debug:', result.debug);
                    throw new Error(reason || 'failed');
                }
                form.remove();
                addMessage('bot', 'Thanks! Your message was sent' + (result.copy ? ', and a copy is on its way to your inbox' : '') + '. Nirajan will reply to ' + data.get('email') + '.');
            } catch (err) {
                submit.disabled = false;
                status.textContent = (reason || 'Sorry, that did not send.') + ' Please email contact@nirajankoirala.com.np instead.';
            }
        });
    }

    // ---------- Events ----------
    fab.addEventListener('click', openPanel);
    panel.querySelector('.agent-close').addEventListener('click', closePanel);
    form.addEventListener('submit', (e) => { e.preventDefault(); send(input.value); });
    panel.querySelector('.agent-leave').addEventListener('click', (e) => { e.preventDefault(); showContactForm(); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && panel.classList.contains('open')) closePanel();
    });
    // Any element with data-leave-message opens the chat straight on the "Leave a message" form (e.g. the Contact button)
    document.querySelectorAll('[data-leave-message]').forEach((el) => el.addEventListener('click', (e) => {
        e.preventDefault();
        openPanel();
        showContactForm();
    }));
    // Any element with data-open-agent opens the chat (e.g. the hero button)
    document.querySelectorAll('[data-open-agent]').forEach((el) => el.addEventListener('click', openPanel));
})();
