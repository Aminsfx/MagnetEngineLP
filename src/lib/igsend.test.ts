import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * extension/igsend.js is how the Sender Tab reads Instagram's profile page
 * and chat. It has no build step, so it is evaluated here the way the browser
 * loads it: as a classic script defining a global.
 *
 * The fixtures are cut-down profile headers in the shapes Instagram serves:
 * a div[role=button] whose text is the label. On 2026-11-07 a whole campaign
 * was reported as "no Message button" because the page was in French.
 */
type Task = { handle: string };
type MagnetSend = {
    PAGE_LANGUAGE: string;
    NO_BUTTON_LIMIT: number;
    profileUrl: (handle: string) => string;
    findMessageButton: (doc: Document) => HTMLElement | null;
    findSendButton: (doc: Document) => HTMLElement | null;
    isLoggedOut: (doc: Document) => boolean;
    isUnavailable: (doc: Document) => boolean;
    describePage: (doc: Document) => string;
    noButtonStreak: (held: Task[] | undefined, task: Task, outcome: string, code?: string | null) => { held: Task[]; trip: boolean };
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

const profile = (buttons: string[], suggested = '') => `
    ${nav('Messages')}
    <main>
        <header>
            <h2>briarcochran</h2>
            ${buttons.map((b) => `<div role="button" tabindex="0"><div>${b}</div></div>`).join('')}
        </header>
        <div class="suggested">${suggested}</div>
    </main>`;

beforeEach(() => { document.body.innerHTML = ''; });

describe('profileUrl', () => {
    it('opens every profile in English, whatever the account is set to', () => {
        expect(Page.profileUrl('@Briar.Cochran/')).toBe('https://www.instagram.com/Briar.Cochran/?hl=en');
        expect(Page.PAGE_LANGUAGE).toBe('en');
    });
});

describe('findMessageButton', () => {
    it('finds the button in English', () => {
        const doc = page(profile(['Following', 'Message']));
        expect(Page.findMessageButton(doc)?.textContent).toBe('Message');
    });

    it('finds it in French, where it reads "Envoyer un message"', () => {
        const doc = page(profile(['Suivi(e)', 'Envoyer un message']), 'fr');
        expect(Page.findMessageButton(doc)?.textContent).toBe('Envoyer un message');
    });

    it('finds it in Korean, and by its aria-label', () => {
        const korean = page(profile(['팔로잉', '메시지 보내기']), 'ko');
        expect(Page.findMessageButton(korean)?.textContent).toBe('메시지 보내기');

        const labelled = page(`<main><header><div role="button" aria-label="Message"><svg></svg></div></header></main>`);
        expect(Page.findMessageButton(labelled)?.getAttribute('aria-label')).toBe('Message');
    });

    it("is null on a profile that only offers Follow, even with a suggested account's buttons below", () => {
        const doc = page(profile(['Follow'], '<div role="button">Follow</div><div role="button">Dismiss</div>'));
        expect(Page.findMessageButton(doc)).toBeNull();
    });

    it("never takes the nav's Messages link, even where it reads exactly like the button", () => {
        // Korean: the nav's "Messages" is 메시지, which is also a Message label.
        const doc = page(`${nav('메시지')}<main><header><div role="button">팔로우</div></header></main>`, 'ko');
        expect(Page.findMessageButton(doc)).toBeNull();
    });

    it('ignores a button that is not on screen', () => {
        const doc = page(`<main><header><div role="button" data-hidden>Message</div></header></main>`);
        expect(Page.findMessageButton(doc)).toBeNull();
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

describe('isLoggedOut / isUnavailable', () => {
    it("reads logged out from Instagram's login links, in any language", () => {
        expect(Page.isLoggedOut(page(`<main><a href="/accounts/login/?next=%2Fbriarcochran%2F">Se connecter</a></main>`, 'fr'))).toBe(true);
        expect(Page.isLoggedOut(page(`<form><input name="username"></form>`))).toBe(true);
    });

    it('is not fooled by a login link that is not on screen', () => {
        expect(Page.isLoggedOut(page(`${profile(['Message'])}<a data-hidden href="/accounts/login/">Log in</a>`))).toBe(false);
    });

    it("recognises the page for a handle that doesn't exist, in French too", () => {
        expect(Page.isUnavailable(page(`<main><h2>Sorry, this page isn’t available.</h2></main>`))).toBe(true);
        expect(Page.isUnavailable(page(`<main><span>Désolé, cette page n’est pas disponible.</span></main>`, 'fr'))).toBe(true);
        expect(Page.isUnavailable(page(profile(['Message'])))).toBe(false);
    });
});

describe('describePage', () => {
    it("says what the page showed: its language and the profile's buttons", () => {
        const doc = page(profile(['Suivre', 'Plus']), 'fr');
        expect(Page.describePage(doc)).toBe('page in "fr", buttons seen: "Suivre", "Plus"');
    });

    it('says so when there were no buttons at all', () => {
        expect(Page.describePage(page('<main><header></header></main>'))).toBe('page in "en", buttons seen: none');
    });
});

describe('noButtonStreak', () => {
    const a = { handle: 'a' }, b = { handle: 'b' }, c = { handle: 'c' };
    const skip = (held: Task[] | undefined, t: Task) => Page.noButtonStreak(held, t, 'skipped', 'no_message_button');

    it(`stops after ${Page.NO_BUTTON_LIMIT} profiles in a row with no Message button, holding all of them`, () => {
        let s = skip(undefined, a);
        expect(s).toEqual({ held: [a], trip: false });
        s = skip(s.held, b);
        expect(s).toEqual({ held: [a, b], trip: false });
        s = skip(s.held, c);
        expect(s).toEqual({ held: [a, b, c], trip: true });
    });

    it('starts again from zero after a send, a failure, or a different skip', () => {
        const held = [a, b];
        expect(Page.noButtonStreak(held, c, 'success')).toEqual({ held: [], trip: false });
        expect(Page.noButtonStreak(held, c, 'failed')).toEqual({ held: [], trip: false });
        expect(Page.noButtonStreak(held, c, 'skipped', null)).toEqual({ held: [], trip: false });
    });

    it('keeps the count through a log-out, which puts its own DM back', () => {
        expect(Page.noButtonStreak([a, b], c, 'logged_out')).toEqual({ held: [a, b], trip: false });
    });
});
