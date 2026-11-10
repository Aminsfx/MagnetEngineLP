/**
 * A stand-in for the two Instagram screens the Sender touches: a profile, and
 * the chat that opens from its Message button.
 *
 * It is not a copy of Instagram. It has the things the Sender relies on and
 * the ways they go wrong: the profile's buttons arrive late, the page may be
 * in French, the Send control only exists once something is typed, and a
 * message counts as sent when the composer empties. What the handle starts
 * with picks the page:
 *
 *   fr.<name>     in French whatever ?hl= says (an Instagram that ignores it)
 *   nomsg.<name>  a profile that only offers Follow
 *   gone.<name>   "Sorry, this page isn't available."
 *   anything else English with ?hl=en, French without it
 */

const WORDS = {
  en: { follow: 'Follow', message: 'Message', send: 'Send', inbox: 'Messages', composer: 'Message...', gone: "Sorry, this page isn't available." },
  fr: { follow: 'Suivre', message: 'Envoyer un message', send: 'Envoyer', inbox: 'Messages', composer: 'Votre message...', gone: "Désolé, cette page n'est pas disponible." },
} as const;

export type Lang = keyof typeof WORDS;

export function langFor(handle: string, hl: string | null): Lang {
  if (handle.startsWith('fr.')) return 'fr';
  return hl === 'en' ? 'en' : 'fr';
}

/** How long the profile's buttons take to appear, as on a slow background tab. */
const RENDER_DELAY_MS = 900;

export function profilePage(handle: string, lang: Lang): string {
  const w = WORDS[lang];
  const shell = (main: string, script = '') => `<!doctype html>
<html lang="${lang}">
<head><meta charset="utf-8"><title>@${handle}</title></head>
<body>
  <nav><a href="/"><span>Home</span></a><a href="/direct/inbox/"><span>${w.inbox}</span></a></nav>
  <main>${main}</main>
  <script>${script}</script>
</body>
</html>`;

  if (handle.startsWith('gone.')) return shell(`<h2>${w.gone}</h2>`);

  const messageButton = handle.startsWith('nomsg.')
    ? ''
    : `<div role="button" tabindex="0" id="message"><div>${w.message}</div></div>`;

  return shell(
    `<header><h2>${handle}</h2><span id="buttons"></span></header>
     <section id="chat" hidden>
       <div role="textbox" contenteditable="true" aria-label="${w.composer}" id="composer"
            style="min-height:24px;border:1px solid #888"></div>
       <div role="button" tabindex="0" id="send" hidden>${w.send}</div>
     </section>`,
    `
    const handle = ${JSON.stringify(handle)};
    setTimeout(() => {
      document.getElementById('buttons').innerHTML =
        ${JSON.stringify(`<div role="button" tabindex="0" id="follow">${w.follow}</div>${messageButton}`)};
      const message = document.getElementById('message');
      if (message) message.addEventListener('click', () => {
        setTimeout(() => { document.getElementById('chat').hidden = false; }, 300);
      });
    }, ${RENDER_DELAY_MS});

    const composer = document.getElementById('composer');
    const send = document.getElementById('send');
    composer.addEventListener('input', () => { send.hidden = composer.textContent.trim() === ''; });
    send.addEventListener('click', () => {
      const text = composer.textContent;
      fetch('/__sent', { method: 'POST', body: JSON.stringify({ handle, text, lang: document.documentElement.lang }) });
      composer.textContent = '';
      send.hidden = true;
    });
    `,
  );
}
