// ═══════════════════════════════════════════════════════════════════
// MagnetEngine — reading Instagram's profile page and chat, to send one DM
// ═══════════════════════════════════════════════════════════════════
//
// Everything the Sender Tab needs to recognise on Instagram's page, in one
// place, and none of it tied to one language.
//
// The extension used to find the profile's Message button by its English
// text alone. On 2026-11-07 a campaign ran from an Instagram account shown in
// French, where the button reads "Envoyer un message": every one of its 85
// profiles was reported as having no Message button, and the whole queue was
// used up in a night without one DM sent. So:
//
//   1. Every profile opens with ?hl=en (`profileUrl`), which makes Instagram
//      render that one page in English, whatever the account's language. It
//      does not change the account's setting: the next page without it is
//      back in the account's own language.
//   2. In case Instagram ever ignores that, the labels below are matched in
//      the languages Operators are likely to use, and the login and
//      not-found checks rely on the page's links rather than its words.
//   3. `noButtonStreak` decides when "no Message button" stops meaning one
//      person turned messages off and starts meaning Instagram changed its
//      page: then the worker pauses and puts those DMs back.
//
// Pure: loaded as a classic script in the content scripts (before content.js)
// and in the service worker (importScripts), and evaluated by
// src/lib/igsend.test.ts against fixture pages.

(function () {
    /** The language every profile is opened in. */
    const PAGE_LANGUAGE = 'en';

    function profileUrl(handle) {
        const clean = String(handle || '').trim().replace(/^@/, '').replace(/\/+$/, '');
        return `https://www.instagram.com/${encodeURIComponent(clean)}/?hl=${PAGE_LANGUAGE}`;
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

    // The profile's Message button, as Instagram labels it.
    const MESSAGE_LABELS = new Set([
        'Message', 'Send message', 'Send Message',
        'Envoyer un message',                             // fr
        'Enviar mensaje', 'Mensaje',                      // es
        'Enviar mensagem', 'Mensagem',                    // pt
        'Nachricht senden', 'Nachricht',                  // de
        'Invia messaggio', 'Messaggio',                   // it
        'Bericht sturen', 'Bericht',                      // nl
        'Mesaj gönder', 'Mesaj Gönder', 'Mesaj',          // tr
        'Wyślij wiadomość', 'Wiadomość',                  // pl
        'Отправить сообщение', 'Сообщение',               // ru
        'Kirim pesan', 'Kirim Pesan', 'Pesan',            // id
        'Skicka meddelande', 'Meddelande',                // sv
        'Send besked', 'Besked',                          // da
        'Send melding', 'Melding',                        // nb
        'Lähetä viesti', 'Viesti',                        // fi
        'Nhắn tin',                                       // vi
        'ส่งข้อความ',                                       // th
        'Magpadala ng mensahe', 'Mensahe',                // tl
        'Kirim mesej', 'Mesej',                           // ms
        'Odeslat zprávu', 'Zpráva',                       // cs
        'Üzenet küldése', 'Üzenet',                       // hu
        'Trimite mesaj', 'Mesaj',                         // ro
        'Αποστολή μηνύματος', 'Μήνυμα',                   // el
        'Надіслати повідомлення', 'Повідомлення',         // uk
        'مراسلة', 'إرسال رسالة', 'رسالة',                 // ar
        'שליחת הודעה', 'הודעה',                           // he
        'ارسال پیام', 'پیام',                             // fa
        'संदेश भेजें', 'संदेश',                             // hi
        'বার্তা পাঠান', 'মেসেজ',                            // bn
        'メッセージを送信', 'メッセージ',                    // ja
        '메시지 보내기', '메시지',                          // ko
        '发消息', '发送消息', '傳送訊息', '發送訊息', '訊息',   // zh
    ].map(normalize));

    // The chat's Send control.
    const SEND_LABELS = new Set([
        'Send', 'Envoyer', 'Enviar', 'Senden', 'Invia', 'Verstuur', 'Versturen', 'Gönder',
        'Wyślij', 'Отправить', 'Kirim', 'Skicka', 'Lähetä', 'Gửi', 'ส่ง', 'Ipadala',
        'Odeslat', 'Küldés', 'Trimite', 'Αποστολή', 'Надіслати', 'إرسال', 'שליחה', 'ارسال',
        'भेजें', 'পাঠান', '送信', '보내기', '发送', '傳送',
    ].map(normalize));

    // Instagram's page for a handle that no longer exists.
    const UNAVAILABLE_TEXTS = [
        "Sorry, this page isn't available.",
        "Désolé, cette page n'est pas disponible.",
        'Lo sentimos, esta página no está disponible.',
        'Esta página não está disponível.',
        'Diese Seite ist leider nicht verfügbar.',
        'Spiacenti, questa pagina non è disponibile.',
    ].map(normalize);

    const visible = (el) => !!el && (el.offsetHeight > 0 || el.getClientRects().length > 0);

    /**
     * Clickable things a person could press, outside the site's left nav and
     * never a link to the inbox: in Japanese or Korean the nav's "Messages"
     * reads exactly like the profile's Message button, and pressing it would
     * open the inbox instead of this person's chat.
     */
    function pressables(doc) {
        return [...doc.querySelectorAll('[role="button"], button, a[role="link"], a[href]')]
            .filter((el) => visible(el)
                && !el.closest('nav, [role="navigation"]')
                && !(el.closest('a[href]') && /\/direct\/inbox/.test(el.closest('a[href]').getAttribute('href'))));
    }

    const labelOf = (el) => normalize(el.getAttribute('aria-label') || el.innerText || el.textContent);

    /**
     * The profile's Message button, or null. Looked for in the profile header
     * first, then in the main column, so a suggested account's buttons further
     * down can never be mistaken for it.
     */
    function findMessageButton(doc) {
        const main = doc.querySelector('main');
        const scopes = main ? [main.querySelector('header'), main].filter(Boolean) : [doc.body].filter(Boolean);
        for (const scope of scopes) {
            const hit = pressables(scope).find((el) => MESSAGE_LABELS.has(labelOf(el)));
            if (hit) return hit;
        }
        return null;
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

    function isUnavailable(doc) {
        const text = normalize(doc.body ? doc.body.innerText || doc.body.textContent : '');
        return UNAVAILABLE_TEXTS.some((t) => text.includes(t));
    }

    /**
     * What the page showed, for the reason the Operator reads when no Message
     * button was found: the page's language and the profile's own buttons. It
     * is what makes the next change on Instagram's side quick to fix rather
     * than a night of DMs reported as private accounts.
     */
    function describePage(doc) {
        const scope = doc.querySelector('main header') || doc.querySelector('main') || doc.body;
        const labels = pressables(scope)
            .filter((el) => el.matches('[role="button"], button'))
            .map((el) => (el.getAttribute('aria-label') || el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim())
            .filter((t) => t && t.length <= 40);
        const unique = [...new Set(labels)].slice(0, 6);
        const lang = (doc.documentElement.getAttribute('lang') || '?').slice(0, 8);
        return `page in "${lang}", buttons seen: ${unique.length ? unique.map((t) => `"${t}"`).join(', ') : 'none'}`;
    }

    /**
     * How many profiles in a row may show no Message button before the worker
     * stops. One or two is people who turned messages off; three in a row,
     * from a list the Operator chose, is far more often Instagram's page.
     */
    const NO_BUTTON_LIMIT = 3;

    /**
     * The worker's bookkeeping for that, kept pure so it can be tested.
     * `held` is the tasks skipped for having no Message button since the last
     * profile that did have one. Returns the new `held` and whether to stop:
     * on a stop, every held task goes back to the front of the queue.
     */
    function noButtonStreak(held, task, outcome, code, limit = NO_BUTTON_LIMIT) {
        if (outcome === 'logged_out') return { held: held || [], trip: false };
        if (outcome !== 'skipped' || code !== 'no_message_button') return { held: [], trip: false };
        const next = [...(held || []), task];
        return next.length >= limit ? { held: next, trip: true } : { held: next, trip: false };
    }

    globalThis.MagnetSend = {
        PAGE_LANGUAGE,
        NO_BUTTON_LIMIT,
        profileUrl,
        normalize,
        findMessageButton,
        findSendButton,
        isLoggedOut,
        isUnavailable,
        describePage,
        noButtonStreak,
    };
})();
