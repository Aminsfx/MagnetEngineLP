// ═══════════════════════════════════════════════════════════════════
// MagnetEngine — reading Instagram's Messages page, to send one DM
// ═══════════════════════════════════════════════════════════════════
//
// Everything the Sender Tab needs to recognise on Instagram's page, in one
// place, and as little of it tied to one language as possible.
//
// How a DM goes out (owner, 2026-11-15): the Sender Tab opens Messages, types
// the handle into its search, opens the chat from the result whose username
// is exactly that handle, and sends there. Until 1.12.0 it opened each
// profile and pressed its Message button. Many profiles show no such button
// (a business profile that hides it, someone who limits who can message
// them), and every one of those was skipped, while Messages' search reaches
// the same person and sends. It also found the button by its label, so the
// label had to be known in every language.
//
// What is still read by its words, and why it holds up:
//
//   1. Messages opens with ?hl=en (`inboxUrl`), which makes Instagram render
//      that page in English whatever the account's language. It does not
//      change the account's setting.
//   2. The search box is an input, the result is the username itself, the
//      chat box is a contenteditable textbox, and logged out is read from the
//      page's links: none of those are words. Only New message, Chat and Send
//      are labels, and they are matched in the languages Operators use too.
//   3. `missStreak` decides when "not found in search" stops meaning one
//      account was deleted and starts meaning Instagram changed its page:
//      then the worker pauses and puts those DMs back.
//
// Pure: loaded as a classic script in the content scripts (before content.js)
// and in the service worker (importScripts), and evaluated by
// src/lib/igsend.test.ts against fixture pages.

(function () {
    /** The language Messages is opened in. */
    const PAGE_LANGUAGE = 'en';

    /** Where every DM starts: Messages, in English. */
    function inboxUrl() {
        return `https://www.instagram.com/direct/inbox/?hl=${PAGE_LANGUAGE}`;
    }

    /** Lowercased, single-spaced, straight apostrophes: how labels are compared. */
    function normalize(text) {
        return String(text || '')
            .normalize('NFC')
            .replace(/[‘’ʼ]/g, "'")
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    /** A handle as it is searched for and matched: lowercase, no @. */
    function cleanHandle(handle) {
        return normalize(handle).replace(/^@/, '').replace(/\/+$/, '');
    }

    // Messages' New message control (a pencil icon), and the "Send message"
    // button an empty inbox shows instead. Either opens the same search.
    const NEW_MESSAGE_LABELS = new Set([
        'New message', 'Send message', 'Compose',
        'Nouveau message', 'Envoyer un message',          // fr
        'Nuevo mensaje', 'Enviar mensaje',                // es
        'Nova mensagem', 'Enviar mensagem',               // pt
        'Neue Nachricht', 'Nachricht senden',             // de
        'Nuovo messaggio', 'Invia messaggio',             // it
        'Nieuw bericht', 'Bericht sturen',                // nl
        'Yeni mesaj', 'Mesaj gönder',                     // tr
        'Nowa wiadomość', 'Wyślij wiadomość',             // pl
        'Новое сообщение', 'Отправить сообщение',         // ru
        'Pesan baru', 'Kirim pesan',                      // id
        'Nytt meddelande', 'Skicka meddelande',           // sv
        'رسالة جديدة', 'إرسال رسالة',                       // ar
        '新しいメッセージ', 'メッセージを送信',               // ja
        '새 메시지', '메시지 보내기',                        // ko
        '新消息', '发消息', '新訊息', '傳送訊息',             // zh
    ].map(normalize));

    // The button that opens the chat once someone is picked in New message.
    // Instagram has called it Next, then Chat.
    const CHAT_LABELS = new Set([
        'Chat', 'Next',
        'Discuter', 'Suivant',                            // fr
        'Chatear', 'Siguiente',                           // es
        'Conversar', 'Avançar', 'Seguinte',               // pt
        'Weiter',                                         // de
        'Avanti',                                         // it
        'Volgende',                                       // nl
        'Sohbet', 'İleri',                                // tr
        'Czat', 'Dalej',                                  // pl
        'Чат', 'Далее',                                   // ru
        'Obrolan', 'Berikutnya', 'Selanjutnya',           // id
        'Nästa',                                          // sv
        'دردشة', 'التالي',                                 // ar
        'チャット', '次へ',                                 // ja
        '채팅', '다음',                                     // ko
        '聊天', '下一步',                                   // zh
    ].map(normalize));

    // The chat's Send control.
    const SEND_LABELS = new Set([
        'Send', 'Envoyer', 'Enviar', 'Senden', 'Invia', 'Verstuur', 'Versturen', 'Gönder',
        'Wyślij', 'Отправить', 'Kirim', 'Skicka', 'Lähetä', 'Gửi', 'ส่ง', 'Ipadala',
        'Odeslat', 'Küldés', 'Trimite', 'Αποστολή', 'Надіслати', 'إرسال', 'שליחה', 'ارسال',
        'भेजें', 'পাঠান', '送信', '보내기', '发送', '傳送',
    ].map(normalize));

    // A prompt Instagram puts over Messages ("Turn on notifications"), and
    // the button that declines it.
    const NOT_NOW_LABELS = new Set([
        'Not Now', 'Not now', 'Plus tard', 'Ahora no', 'Agora não', 'Jetzt nicht', 'Non ora',
        'Niet nu', 'Şimdi değil', 'Nie teraz', 'Не сейчас', 'Lain kali', 'Inte nu',
    ].map(normalize));

    const visible = (el) => !!el && (el.offsetHeight > 0 || el.getClientRects().length > 0);
    const inNav = (el) => !!el.closest('nav, [role="navigation"]');
    const disabled = (el) => el.disabled === true || el.getAttribute('aria-disabled') === 'true';

    /** Clickable things a person could press, outside the site's left nav. */
    function pressables(scope) {
        return [...scope.querySelectorAll('[role="button"], button, a[role="link"], a[href]')]
            .filter((el) => visible(el) && !inNav(el));
    }

    /**
     * The first pressable whose label is in `labels`: its aria-label, its
     * text, or the aria-label of the icon inside it (Instagram's icon buttons
     * carry their name on the <svg>).
     */
    function pressableLabelled(scope, labels) {
        for (const el of pressables(scope)) {
            if (labels.has(normalize(el.getAttribute('aria-label') || el.innerText || el.textContent))) return el;
            const icon = el.querySelector('svg[aria-label]');
            if (icon && labels.has(normalize(icon.getAttribute('aria-label')))) return el;
        }
        return null;
    }

    const dialogs = (doc) => [...doc.querySelectorAll('[role="dialog"]')].filter(visible);

    const TEXT_INPUTS = 'input:not([type]), input[type="text"], input[type="search"]';
    const textInputs = (scope) => [...scope.querySelectorAll(TEXT_INPUTS)]
        .filter((el) => visible(el) && !el.disabled && !inNav(el));

    /**
     * The box to search Messages with: New message's, when it is open, or
     * else the one at the top of the inbox. Never the site's own search
     * (people's profiles, not chats), which lives in the left nav.
     */
    function findSearchBox(doc) {
        for (const dialog of dialogs(doc)) {
            const [box] = textInputs(dialog);
            if (box) return box;
        }
        const main = doc.querySelector('main') || doc.body;
        return (main && textInputs(main)[0]) || null;
    }

    function findNewMessageButton(doc) {
        const main = doc.querySelector('main') || doc.body;
        return main ? pressableLabelled(main, NEW_MESSAGE_LABELS) : null;
    }

    /** "Not Now" on a prompt over Messages that has no search in it, or null. */
    function findNotNowButton(doc) {
        for (const dialog of dialogs(doc)) {
            if (textInputs(dialog).length) continue;
            const hit = pressableLabelled(dialog, NOT_NOW_LABELS);
            if (hit) return hit;
        }
        return null;
    }

    /**
     * The search result for exactly this handle, as the thing to click, or
     * null. A result shows the username on a line of its own, so the match is
     * on the whole text of an element, never on a part: searching "maya"
     * lists maya.builds and maya, and only the one asked for may be opened.
     * Looked for where the search box is (inside New message, when that is
     * where the search was typed), and never in the left nav.
     */
    function findSearchResult(doc, handle, box) {
        const want = cleanHandle(handle);
        if (!want) return null;
        const scope = (box && box.closest('[role="dialog"]')) || doc.body;
        if (!scope) return null;
        const hits = [...scope.querySelectorAll('span, div, a, p')]
            .filter((el) => !inNav(el) && !el.closest('[role="textbox"]') && visible(el)
                && cleanHandle(el.textContent) === want);
        // The innermost: a row's wrapper reads the same as the username in it
        // when the row shows nothing else.
        const innermost = hits.filter((el) => !hits.some((other) => other !== el && el.contains(other)));
        for (const el of innermost) {
            const row = el.closest('[role="button"], [role="option"], [role="checkbox"], [role="radio"], [role="listitem"], label, a[href*="/direct/"]');
            if (row && scope.contains(row)) return row;
        }
        return innermost[0] || null;
    }

    /** New message's Chat (or Next) button, once someone is picked; null before. */
    function findChatButton(doc) {
        for (const dialog of dialogs(doc)) {
            const hit = pressables(dialog).find((el) =>
                !disabled(el) && CHAT_LABELS.has(normalize(el.getAttribute('aria-label') || el.innerText || el.textContent)));
            if (hit) return hit;
        }
        return null;
    }

    /** The chat's message box, once a chat is open. */
    function findComposer(doc) {
        return [...doc.querySelectorAll('div[role="textbox"][contenteditable="true"]')].find(visible) || null;
    }

    function findSendButton(doc) {
        for (const el of doc.querySelectorAll('[role="button"][aria-label], button[aria-label]')) {
            if (visible(el) && SEND_LABELS.has(normalize(el.getAttribute('aria-label')))) return el;
        }
        for (const svg of doc.querySelectorAll('svg[aria-label]')) {
            if (!SEND_LABELS.has(normalize(svg.getAttribute('aria-label')))) continue;
            const btn = svg.closest('[role="button"], button');
            if (visible(btn)) return btn;
        }
        return pressables(doc).find((el) => SEND_LABELS.has(normalize(el.innerText || el.textContent))) || null;
    }

    /**
     * Logged out: Instagram's login form, or its links to log in or sign up,
     * on screen. Only visible ones count, so a hidden link in a signed-in
     * page can never pause a campaign.
     */
    function isLoggedOut(doc) {
        return [...doc.querySelectorAll('input[name="username"], form#loginForm, a[href*="/accounts/login"], a[href*="/accounts/emailsignup"]')]
            .some(visible);
    }

    /**
     * What the page showed, for the extension's log when the search could not
     * be used: the page's language, whether a search box was there, and the
     * buttons on screen. It is what makes the next change on Instagram's side
     * quick to fix.
     */
    function describePage(doc) {
        const scope = dialogs(doc)[0] || doc.querySelector('main') || doc.body;
        const labels = pressables(scope)
            .filter((el) => el.matches('[role="button"], button'))
            .map((el) => (el.getAttribute('aria-label') || el.innerText || el.textContent
                || (el.querySelector('svg[aria-label]') || { getAttribute: () => '' }).getAttribute('aria-label') || '')
                .replace(/\s+/g, ' ').trim())
            .filter((t) => t && t.length <= 40);
        const unique = [...new Set(labels)].slice(0, 6);
        const lang = (doc.documentElement.getAttribute('lang') || '?').slice(0, 8);
        return `page in "${lang}", search box: ${findSearchBox(doc) ? 'yes' : 'no'}, `
            + `buttons seen: ${unique.length ? unique.map((t) => `"${t}"`).join(', ') : 'none'}`;
    }

    /**
     * How many DMs in a row may fail to find their person in Messages before
     * the worker stops. One or two is accounts deleted or renamed since they
     * were found; three in a row, from a list the Operator chose, is far more
     * often Instagram's page.
     */
    const MISS_LIMIT = 3;

    /** The failures that count toward it. */
    const MISS_CODES = ['not_in_search', 'no_search_box'];

    /**
     * The worker's bookkeeping for that, kept pure so it can be tested.
     * `held` is the tasks that missed since the last one that didn't. Returns
     * the new `held` and whether to stop: on a stop, every held task goes
     * back to the front of the queue.
     */
    function missStreak(held, task, outcome, code, limit = MISS_LIMIT) {
        if (outcome === 'logged_out') return { held: held || [], trip: false };
        if (outcome === 'success' || !MISS_CODES.includes(code)) return { held: [], trip: false };
        const next = [...(held || []), task];
        return { held: next, trip: next.length >= limit };
    }

    globalThis.MagnetSend = {
        PAGE_LANGUAGE,
        MISS_LIMIT,
        MISS_CODES,
        inboxUrl,
        normalize,
        findSearchBox,
        findNewMessageButton,
        findNotNowButton,
        findSearchResult,
        findChatButton,
        findComposer,
        findSendButton,
        isLoggedOut,
        describePage,
        missStreak,
    };
})();
