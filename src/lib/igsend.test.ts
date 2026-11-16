import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * extension/igsend.js is how the Sender Tab reads Instagram's Messages page:
 * its search box, the search result for one handle, New message's Chat
 * button and the chat's Send. It has no build step, so it is evaluated here
 * the way the browser loads it: as a classic script defining a global.
 *
 * The fixtures are cut-down pages in the shapes Instagram serves: a
 * div[role=button] whose text (or whose icon's aria-label) is the label.
 */
type Task = { handle: string };
type MagnetSend = {
    PAGE_LANGUAGE: string;
    MISS_LIMIT: number;
    inboxUrl: () => string;
    findSearchBox: (doc: Document) => HTMLInputElement | null;
    findNewMessageButton: (doc: Document) => HTMLElement | null;
    findNotNowButton: (doc: Document) => HTMLElement | null;
    findSearchResult: (doc: Document, handle: string, box?: Element | null) => HTMLElement | null;
    findChatButton: (doc: Document) => HTMLElement | null;
    findComposer: (doc: Document) => HTMLElement | null;
    findSendButton: (doc: Document) => HTMLElement | null;
    isLoggedOut: (doc: Document) => boolean;
    describePage: (doc: Document) => string;
    missStreak: (held: Task[] | undefined, task: Task, outcome: string, code?: string | null) => { held: Task[]; trip: boolean };
};

function load(): MagnetSend {
    const source = readFileSync(resolve(__dirname, '../../extension/igsend.js'), 'utf8');
    const scope: Record<string, unknown> = {};
    new Function('globalThis', source)(scope);
    return scope.MagnetSend as MagnetSend;
}

const Page = load();

// jsdom lays nothing out, so every element is 0px tall. Anything not marked
// data-hidden counts as on screen.
const offsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
        configurable: true,
        get(this: HTMLElement) { return this.closest('[data-hidden]') ? 0 : 20; },
    });
});
afterAll(() => {
    if (offsetHeight) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', offsetHeight);
});

function page(html: string, lang = 'en') {
    document.documentElement.setAttribute('lang', lang);
    document.body.innerHTML = html;
    return document;
}

const nav = (messages: string) =>
    `<nav><a href="/"><span>Home</span></a><a href="/direct/inbox/"><span>${messages}</span></a></nav>`;

/** A search result as Instagram lists one: the name, then the username. */
const result = (username: string, name = 'Briar') =>
    `<div role="button" tabindex="0"><div><span>${name}</span></div><div><span>${username}</span></div></div>`;

/** Messages with its own search box at the top, and what it lists. */
const inbox = (results: string[] = [], threads = '<div role="button"><span>Old Friend</span></div>') => `
    ${nav('Messages')}
    <main>
        <section>
            <input type="text" placeholder="Search">
            <div class="results">${results.join('')}</div>
            <div class="threads">${threads}</div>
        </section>
    </main>`;

/** Messages with no search box, only the New message pencil. */
const bareInbox = (label = 'New message') => `
    ${nav('Messages')}
    <main><header><div role="button" tabindex="0"><svg aria-label="${label}"></svg></div></header></main>`;

/** New message, open over the inbox. */
const newMessage = (results: string[] = [], chat = '<div role="button" aria-disabled="true">Chat</div>') => `
    ${bareInbox()}
    <div role="dialog">
        <h1>New message</h1>
        <input name="queryBox" placeholder="Search...">
        <div>${results.join('')}</div>
        ${chat}
    </div>`;

beforeEach(() => { document.body.innerHTML = ''; });

describe('inboxUrl', () => {
    it('opens Messages in English, whatever the account is set to', () => {
        expect(Page.inboxUrl()).toBe('https://www.instagram.com/direct/inbox/?hl=en');
        expect(Page.PAGE_LANGUAGE).toBe('en');
    });
});

describe('findSearchBox', () => {
    it('finds the search box at the top of Messages', () => {
        expect(Page.findSearchBox(page(inbox()))?.placeholder).toBe('Search');
    });

    it("takes New message's box when that is open", () => {
        expect(Page.findSearchBox(page(newMessage()))?.getAttribute('name')).toBe('queryBox');
    });

    it("never takes the site's own search in the left nav, which finds profiles, not chats", () => {
        const doc = page(`<nav><input type="text" placeholder="Search"></nav>${bareInbox()}`);
        expect(Page.findSearchBox(doc)).toBeNull();
    });

    it('ignores a box that is not on screen', () => {
        expect(Page.findSearchBox(page(`<main><input type="text" data-hidden></main>`))).toBeNull();
    });
});

describe('findNewMessageButton', () => {
    it('finds the pencil by the label on its icon, in English and in French', () => {
        expect(Page.findNewMessageButton(page(bareInbox()))).not.toBeNull();
        expect(Page.findNewMessageButton(page(bareInbox('Nouveau message'), 'fr'))).not.toBeNull();
    });

    it('finds the Send message button an empty inbox shows', () => {
        const doc = page(`<main><div role="button"><div>Send message</div></div></main>`);
        expect(Page.findNewMessageButton(doc)?.textContent).toBe('Send message');
    });

    it('is null where there is neither', () => {
        expect(Page.findNewMessageButton(page(`<main><div role="button">Requests</div></main>`))).toBeNull();
    });
});

describe('findNotNowButton', () => {
    it('declines a prompt over Messages, and never touches New message', () => {
        const prompt = `<div role="dialog"><h2>Turn on Notifications</h2><button>Turn On</button><button>Not Now</button></div>`;
        expect(Page.findNotNowButton(page(`${inbox()}${prompt}`))?.textContent).toBe('Not Now');
        expect(Page.findNotNowButton(page(newMessage()))).toBeNull();
    });
});

describe('findSearchResult', () => {
    it('picks the result whose username is exactly the handle, not a namesake listed first', () => {
        const doc = page(inbox([result('maya.builds.studio', 'Maya'), result('maya', 'Maya'), result('maya.builds', 'Maya R.')]));
        const hit = Page.findSearchResult(doc, 'maya.builds', Page.findSearchBox(doc));
        expect(hit?.getAttribute('role')).toBe('button');
        expect(hit?.textContent).toContain('Maya R.');
    });

    it('matches whatever the case, and with a leading @', () => {
        const doc = page(inbox([result('Maya.Builds')]));
        expect(Page.findSearchResult(doc, '@maya.builds', Page.findSearchBox(doc))).not.toBeNull();
    });

    it('is null while the search lists only other people', () => {
        const doc = page(inbox([result('maya.builds.studio'), result('maya.builder')]));
        expect(Page.findSearchResult(doc, 'maya.builds', Page.findSearchBox(doc))).toBeNull();
    });

    it('looks only inside New message when that is where the search was typed', () => {
        // maya.builds is a conversation behind the dialog, not one of its results.
        const doc = page(`${newMessage([result('maya.builds.studio')])}<main>${result('maya.builds')}</main>`);
        expect(Page.findSearchResult(doc, 'maya.builds', Page.findSearchBox(doc))).toBeNull();
    });

    it('never matches a username only mentioned inside a longer line', () => {
        const doc = page(inbox([], '<div role="button"><span>You: thanks maya.builds!</span></div>'));
        expect(Page.findSearchResult(doc, 'maya.builds', Page.findSearchBox(doc))).toBeNull();
    });
});

describe('findChatButton', () => {
    it('is null until someone is picked, then finds Chat', () => {
        expect(Page.findChatButton(page(newMessage([result('maya.builds')])))).toBeNull();
        const ready = page(newMessage([result('maya.builds')], '<div role="button">Chat</div>'));
        expect(Page.findChatButton(ready)?.textContent).toBe('Chat');
    });

    it('finds the older Next, and the French Discuter', () => {
        expect(Page.findChatButton(page(newMessage([], '<div role="button">Next</div>')))).not.toBeNull();
        expect(Page.findChatButton(page(newMessage([], '<div role="button">Discuter</div>'), 'fr'))).not.toBeNull();
    });

    it('never takes a Chat button outside New message', () => {
        expect(Page.findChatButton(page(`<main><div role="button">Chat</div></main>`))).toBeNull();
    });
});

describe('findComposer', () => {
    it('finds the chat box once a chat is open, and nothing before', () => {
        expect(Page.findComposer(page(inbox()))).toBeNull();
        expect(Page.findComposer(page(`<main><div role="textbox" contenteditable="true"></div></main>`))).not.toBeNull();
    });
});

describe('findSendButton', () => {
    it('finds the chat Send control by its label, in French', () => {
        const doc = page(`<div role="textbox" contenteditable="true"></div><div role="button" aria-label="Envoyer"><svg></svg></div>`, 'fr');
        expect(Page.findSendButton(doc)?.getAttribute('aria-label')).toBe('Envoyer');
    });

    it('finds a button whose icon carries the label', () => {
        const doc = page(`<div role="button" id="send"><svg aria-label="Send"></svg></div>`);
        expect(Page.findSendButton(doc)?.id).toBe('send');
    });

    it('is null when the chat shows no Send control', () => {
        const doc = page(`<div role="button" aria-label="Like"><svg></svg></div><div role="button">Messages</div>`);
        expect(Page.findSendButton(doc)).toBeNull();
    });
});

describe('isLoggedOut', () => {
    it("reads logged out from Instagram's login links, in any language", () => {
        expect(Page.isLoggedOut(page(`<main><a href="/accounts/login/?next=%2Fdirect%2Finbox%2F">Se connecter</a></main>`, 'fr'))).toBe(true);
        expect(Page.isLoggedOut(page(`<form><input name="username"></form>`))).toBe(true);
    });

    it('is not fooled by a login link that is not on screen', () => {
        expect(Page.isLoggedOut(page(`${inbox()}<a data-hidden href="/accounts/login/">Log in</a>`))).toBe(false);
    });
});

describe('describePage', () => {
    it('says what the page showed: its language, whether there was a search box, and its buttons', () => {
        expect(Page.describePage(page(bareInbox('Nouveau message'), 'fr')))
            .toBe('page in "fr", search box: no, buttons seen: "Nouveau message"');
        expect(Page.describePage(page(`<main><input type="text"></main>`)))
            .toBe('page in "en", search box: yes, buttons seen: none');
    });
});

describe('missStreak', () => {
    const a = { handle: 'a' }, b = { handle: 'b' }, c = { handle: 'c' };
    const miss = (held: Task[] | undefined, t: Task) => Page.missStreak(held, t, 'skipped', 'not_in_search');

    it(`stops after ${Page.MISS_LIMIT} DMs in a row whose person search could not find, holding all of them`, () => {
        let s = miss(undefined, a);
        expect(s).toEqual({ held: [a], trip: false });
        s = miss(s.held, b);
        expect(s).toEqual({ held: [a, b], trip: false });
        s = miss(s.held, c);
        expect(s).toEqual({ held: [a, b, c], trip: true });
    });

    it('counts a Messages page with no search box toward it too', () => {
        expect(Page.missStreak([a, b], c, 'failed', 'no_search_box')).toEqual({ held: [a, b, c], trip: true });
    });

    it('starts again from zero after a send, or a failure of another kind', () => {
        const held = [a, b];
        expect(Page.missStreak(held, c, 'success')).toEqual({ held: [], trip: false });
        expect(Page.missStreak(held, c, 'failed')).toEqual({ held: [], trip: false });
        expect(Page.missStreak(held, c, 'skipped', null)).toEqual({ held: [], trip: false });
    });

    it('keeps the count through a log-out, which puts its own DM back', () => {
        expect(Page.missStreak([a, b], c, 'logged_out')).toEqual({ held: [a, b], trip: false });
    });
});
