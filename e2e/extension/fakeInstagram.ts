/**
 * A stand-in for the Instagram screens the Sender touches: Messages, its
 * search, and the chat a search result opens.
 *
 * It is not a copy of Instagram. It has the things the Sender relies on and
 * the ways they go wrong: the page's controls arrive late, search answers
 * after a pause and lists namesakes above the account asked for, the page may
 * be in French, the Send control only exists once something is typed, and a
 * message counts as sent when the composer empties.
 *
 * Two layouts, as Instagram has served both:
 *
 *   'search'  a search box at the top of the inbox; a result opens the chat
 *   'dialog'  no search box until New message is pressed; a result is picked,
 *             then Chat opens it
 *
 * Who a search finds is picked by the handle searched for:
 *
 *   gone.<name>   nobody (deleted, renamed, or it blocked you)
 *   anything else that account, listed below a namesake (<handle>.studio)
 */

const WORDS = {
  en: {
    search: 'Search', newMessage: 'New message', chat: 'Chat', send: 'Send', composer: 'Message...',
    inbox: 'Messages', nobody: 'No account found.',
  },
  fr: {
    search: 'Rechercher', newMessage: 'Nouveau message', chat: 'Discuter', send: 'Envoyer', composer: 'Votre message...',
    inbox: 'Messages', nobody: 'Aucun compte trouvé.',
  },
} as const;

export type Lang = keyof typeof WORDS;
export type Layout = 'search' | 'dialog';

/** How long Messages' controls take to appear, as on a slow background tab. */
const RENDER_DELAY_MS = 900;
/** How long a search takes to answer. */
const SEARCH_DELAY_MS = 700;

export function messagesPage(lang: Lang, layout: Layout): string {
  const w = WORDS[lang];
  return `<!doctype html>
<html lang="${lang}">
<head><meta charset="utf-8"><title>Inbox • Direct</title></head>
<body>
  <nav><a href="/"><span>Home</span></a><a href="/direct/inbox/"><span>${w.inbox}</span></a></nav>
  <main>
    <section id="inbox">
      <header id="top"></header>
      <div id="results"></div>
      <div id="threads"><div role="button" tabindex="0"><span>Old Friend</span></div></div>
    </section>
    <section id="chat" hidden>
      <div role="textbox" contenteditable="true" aria-label="${w.composer}" id="composer"
           style="min-height:24px;border:1px solid #888"></div>
      <div role="button" tabindex="0" id="send" hidden>${w.send}</div>
    </section>
  </main>
  <script>
    const w = ${JSON.stringify(w)};
    const layout = ${JSON.stringify(layout)};
    let chatWith = null;
    let picked = null;

    // Who a search finds: nobody for gone.*, else a namesake and then them.
    const found = (q) => q.startsWith('gone.') || !q ? [] : [q + '.studio', q];

    function searchBox(where, onRow) {
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = w.search;
      const list = document.createElement('div');
      let timer = null;
      input.addEventListener('input', () => {
        clearTimeout(timer);
        list.innerHTML = '';
        timer = setTimeout(() => {
          const people = found(input.value.trim().toLowerCase());
          list.innerHTML = people.length
            ? people.map((u) => '<div role="button" tabindex="0" class="row" data-user="' + u + '">'
                + '<div><span>' + u.split('.')[0] + '</span></div><div><span>' + u + '</span></div></div>').join('')
            : '<span>' + w.nobody + '</span>';
          for (const row of list.querySelectorAll('.row')) row.addEventListener('click', () => onRow(row.dataset.user, row));
        }, ${SEARCH_DELAY_MS});
      });
      where.append(input, list);
    }

    function openChat(user) {
      chatWith = user;
      document.getElementById('inbox').hidden = true;
      document.querySelector('[role="dialog"]')?.remove();
      setTimeout(() => {
        history.pushState({}, '', '/direct/t/' + user.length + '0001/');
        document.getElementById('chat').hidden = false;
      }, 300);
    }

    setTimeout(() => {
      const top = document.getElementById('top');
      if (layout === 'search') {
        searchBox(document.getElementById('results'), (user) => openChat(user));
        return;
      }
      top.innerHTML = '<div role="button" tabindex="0" id="new"><svg aria-label="' + w.newMessage + '" width="24" height="24"></svg></div>';
      document.getElementById('new').addEventListener('click', () => {
        const dialog = document.createElement('div');
        dialog.setAttribute('role', 'dialog');
        dialog.innerHTML = '<h1>' + w.newMessage + '</h1>';
        searchBox(dialog, (user, row) => {
          picked = user;
          row.setAttribute('aria-checked', 'true');
          chat.removeAttribute('aria-disabled');
        });
        const chat = document.createElement('div');
        chat.setAttribute('role', 'button');
        chat.setAttribute('aria-disabled', 'true');
        chat.textContent = w.chat;
        chat.addEventListener('click', () => { if (picked) openChat(picked); });
        dialog.append(chat);
        document.body.append(dialog);
      });
    }, ${RENDER_DELAY_MS});

    const composer = document.getElementById('composer');
    const send = document.getElementById('send');
    composer.addEventListener('input', () => { send.hidden = composer.textContent.trim() === ''; });
    send.addEventListener('click', () => {
      const text = composer.textContent;
      fetch('/__sent', { method: 'POST', body: JSON.stringify({ handle: chatWith, text, lang: document.documentElement.lang }) });
      composer.textContent = '';
      send.hidden = true;
    });
  </script>
</body>
</html>`;
}
