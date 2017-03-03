import * as core from "./core";

export interface Gallery {
    name: string;
    cards: pxt.CodeCard[];
}

function parseExampleMarkdown(name: string, md: string): pxt.editor.ProjectCreationOptions {
    if (!md) return undefined;

    const m =  /```blocks\s*((.|\s)+?)\s*```/i.exec(md);
    if (!m) return undefined;

    return {
        name,
        filesOverride: {
            "main.blocks": "",
            "main.ts": m[1]
        }
    };
}

function parseGalleryMardown(md: string): Gallery[] {
    if (!md) return [];

    // second level titles are categories
    // ## foo bar
    // fenced code ```cards are sections of cards
    const galleries: { name: string; cards: pxt.CodeCard[] }[] = [];
    let incard = false;
    let name: string = undefined;
    let cards: string = "";
    md.split(/\r?\n/).forEach(line => {
        // new category
        if (/^##/.test(line)) {
            name = line.substr(2).trim();
        } else if (/^```codecard$/.test(line)) {
            incard = true;
        } else if (/^```$/.test(line)) {
            incard = false;
            if (name && cards) {
                try {
                    const cardsJSON = JSON.parse(cards) as pxt.CodeCard[];
                    if (cardsJSON && cardsJSON.length > 0)
                        galleries.push({ name, cards: cardsJSON });
                } catch (e) {
                    pxt.log('invalid card format in gallery');
                }
            }
            cards = "";
            name = undefined;
        } else if (incard)
            cards += line + '\n';
    })
    return galleries;
}

export function loadGalleryAsync(name: string): Promise<Gallery[]> {
    return pxt.Cloud.downloadMarkdownAsync(name, pxt.Util.userLanguage(), pxt.Util.localizeLive)
        .then(md => parseGalleryMardown(md))
}

export function loadExampleAsync(name: string, path: string): Promise<pxt.editor.ProjectCreationOptions> {
    return pxt.Cloud.downloadMarkdownAsync(path, pxt.Util.userLanguage(), pxt.Util.localizeLive)
        .then(md => parseExampleMarkdown(name, md))
}