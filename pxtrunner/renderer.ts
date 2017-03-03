
namespace pxt.runner {

    export interface ClientRenderOptions {
        snippetClass?: string;
        signatureClass?: string;
        blocksClass?: string;
        shuffleClass?: string;
        projectClass?: string;
        blocksAspectRatio?: number;
        simulatorClass?: string;
        linksClass?: string;
        namespacesClass?: string;
        codeCardClass?: string;
        tutorial?: boolean;
        snippetReplaceParent?: boolean;
        simulator?: boolean;
        hex?: boolean;
        hexName?: string;
        pxtUrl?: string;
        packageClass?: string;
        package?: string;
        showJavaScript?: boolean; // default is to show blocks first
        downloadScreenshots?: boolean
    }

    export interface WidgetOptions {
        showJs?: boolean;
        hideGutter?: boolean;
        run?: boolean;
        hexname?: string;
        hex?: string;
    }

    function appendBlocks($parent: JQuery, $svg: JQuery) {
        $parent.append($('<div class="ui content blocks"/>').append($svg));
    }

    function appendJs($parent: JQuery, $js: JQuery, woptions: WidgetOptions) {
        $parent.append($('<div class="ui content js"/>').append($js));
        $('code.highlight').each(function (i, block) {
            let hljs = pxt.docs.requireHighlightJs();
            if (hljs) hljs.highlightBlock(block);
        });
    }

    function fillWithWidget(
        options: ClientRenderOptions,
        $container: JQuery,
        $js: JQuery,
        $svg: JQuery,
        woptions: WidgetOptions = {}
    ) {
        if (!$svg || !$svg[0]) {
            let $c = $('<div class="ui segment"></div>');
            $c.append($js);
            $container.replaceWith($c);
            return;
        }

        let cdn = pxt.webConfig.pxtCdnUrl
        let images = cdn + "images"
        let $h = $('<div class="ui bottom attached tabular icon small compact menu">'
            + ' <div class="right icon menu"></div></div>');
        let $c = $('<div class="ui top attached segment"></div>');
        let $menu = $h.find('.right.menu');

        if (options.showJavaScript) {
            // blocks
            $c.append($js);

            // js menu
            if ($svg) {
                const $svgBtn = $('<a class="item blocks"><i aria-label="Blocks" class="puzzle icon"></i></a>').click(() => {
                    if ($c.find('.blocks')[0])
                        $c.find('.blocks').remove();
                    else {
                        if ($js) appendBlocks($js.parent(), $svg);
                        else appendBlocks($c, $svg);
                    }
                })
                $menu.append($svgBtn);
            }
        } else {
            // blocks
            $c.append($svg);

            // js menu
            if (woptions.showJs) {
                appendJs($c, $js, woptions);
            } else {
                const $jsBtn = $('<a class="item js"><i aria-label="JavaScript" class="align left icon"></i></a>').click(() => {
                    if ($c.find('.js')[0])
                        $c.find('.js').remove();
                    else {
                        if ($svg) appendJs($svg.parent(), $js, woptions);
                        else appendJs($c, $js, woptions);
                    }
                })
                $menu.append($jsBtn);
            }
        }

        // runner menu
        if (woptions.run) {
            let $runBtn = $('<a class="item"><i aria-label="run" class="play icon"></i></a>').click(() => {
                if ($c.find('.sim')[0])
                    $c.find('.sim').remove(); // remove previous simulators
                else {
                    let padding = '81.97%';
                    if (pxt.appTarget.simulator) padding = (100 / pxt.appTarget.simulator.aspectRatio) + '%';
                    let $embed = $(`<div class="ui card sim"><div class="ui content"><div style="position:relative;height:0;padding-bottom:${padding};overflow:hidden;"><iframe style="position:absolute;top:0;left:0;width:100%;height:100%;" src="${getRunUrl(options) + "#nofooter=1&code=" + encodeURIComponent($js.text())}" allowfullscreen="allowfullscreen" sandbox="allow-popups allow-scripts allow-same-origin" frameborder="0"></iframe></div></div></div>`);
                    $c.append($embed);
                }
            })
            $menu.append($runBtn);
        }

        if (woptions.hexname && woptions.hex) {
            let $hexBtn = $('<a class="item"><i aria-label="download" class="download icon"></i></a>').click(() => {
                BrowserUtils.browserDownloadBinText(woptions.hex, woptions.hexname, pxt.appTarget.compile.hexMimeType);
            })
            $menu.append($hexBtn);
        }

        let r = [$c];
        // don't add menu if empty
        if ($menu.children().length) r.push($h);

        // inject container
        $container.replaceWith(r);

        // download screenshots
        if (options.downloadScreenshots && woptions.hexname) {
            pxt.debug("Downloading screenshot for: " + woptions.hexname);
            let filename = woptions.hexname.substr(0, woptions.hexname.lastIndexOf('.'));
            let fontSize = window.getComputedStyle($svg.get(0).querySelector(".blocklyText")).getPropertyValue("font-size");
            const customCss = `
.blocklyMainBackground {
    stroke:none !important;
}

.blocklyText {
    font-family:'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace !important;
    font-size:${fontSize} !important;  
}

.blocklyCheckbox,
.blocklyLed {
    fill: #ff3030 !important;
    text-shadow: 0px 0px 6px #f00;
    font-size: 17pt !important;
}`;
            let svgElement = $svg.get(0) as any;
            let bbox = $svg.get(0).getBoundingClientRect();
            pxt.blocks.layout.svgToPngAsync(svgElement, customCss, 0, 0, bbox.width, bbox.height)
                .done(uri => {
                    if (uri)
                        BrowserUtils.browserDownloadDataUri(
                            uri,
                            (name || `${pxt.appTarget.nickname || pxt.appTarget.id}-${filename}`) + ".png");
                });
        }
    }

    function renderNextSnippetAsync(cls: string,
        render: (container: JQuery, r: pxt.runner.DecompileResult) => void,
        options?: pxt.blocks.BlocksRenderOptions): Promise<void> {
        if (!cls) return Promise.resolve();

        let $el = $("." + cls).first();
        if (!$el[0]) return Promise.resolve();

        if (!options.emPixels) options.emPixels = 14;
        if (!options.layout) options.layout = pxt.blocks.BlockLayout.Flow;

        return pxt.runner.decompileToBlocksAsync($el.text(), options)
            .then((r) => {
                try {
                    render($el, r);
                } catch (e) {
                    console.error('error while rendering ' + $el.html())
                    $el.append($('<div/>').addClass("ui segment warning").text(e.message));
                }
                $el.removeClass(cls);
                return Promise.delay(1, renderNextSnippetAsync(cls, render, options));
            })
    }

    function renderSnippetsAsync(options: ClientRenderOptions): Promise<void> {
        if (options.tutorial) {
            // don't render chrome for tutorials
            return renderNextSnippetAsync(options.snippetClass, (c, r) => {
                const s = r.blocksSvg;
                if (options.snippetReplaceParent) c = c.parent();
                const segment = $('<div class="ui segment"/>').append(s);
                c.replaceWith(segment);
            }, { package: options.package, snippetMode: false });
        }

        let snippetCount = 0;
        return renderNextSnippetAsync(options.snippetClass, (c, r) => {
            let s = r.compileBlocks && r.compileBlocks.success ? $(r.blocksSvg) : undefined;
            let js = $('<code class="lang-typescript highlight"/>').text(c.text().trim());
            if (options.snippetReplaceParent) c = c.parent();
            let compiled = r.compileJS && r.compileJS.success;
            let hex = options.hex && compiled && r.compileJS.outfiles[pxtc.BINARY_HEX]
                ? r.compileJS.outfiles[pxtc.BINARY_HEX] : undefined;
            let hexname = `${appTarget.nickname || appTarget.id}-${options.hexName || ''}-${snippetCount++}.hex`;
            fillWithWidget(options, c, js, s, {
                run: options.simulator && compiled,
                hexname: hexname,
                hex: hex,
            });
        }, { package: options.package });
    }

    function decompileCallInfo(stmt: ts.Statement): pxtc.CallInfo {
        if (!stmt || stmt.kind != ts.SyntaxKind.ExpressionStatement)
            return null;

        let estmt = stmt as ts.ExpressionStatement;
        if (!estmt.expression || estmt.expression.kind != ts.SyntaxKind.CallExpression)
            return null;

        let call = estmt.expression as ts.CallExpression;
        let info = (<any>call).callInfo as pxtc.CallInfo;

        return info;
    }

    function renderSignaturesAsync(options: ClientRenderOptions): Promise<void> {
        return renderNextSnippetAsync(options.signatureClass, (c, r) => {
            let cjs = r.compileJS;
            if (!cjs) return;
            let file = r.compileJS.ast.getSourceFile("main.ts");
            let info = decompileCallInfo(file.statements[0]);
            if (!info) return;

            let s = r.compileBlocks && r.compileBlocks.success ? $(r.blocksSvg) : undefined;
            let sig = info.decl.getText().replace(/^export/, '');
            sig = sig.slice(0, sig.indexOf('{')).trim() + ';';
            let js = $('<code class="lang-typescript highlight"/>').text(sig);
            if (options.snippetReplaceParent) c = c.parent();
            fillWithWidget(options, c, js, s, { showJs: true, hideGutter: true });
        }, { package: options.package, snippetMode: true });
    }

    function renderShuffleAsync(options: ClientRenderOptions): Promise<void> {
        return renderNextSnippetAsync(options.shuffleClass, (c, r) => {
            let s = r.blocksSvg;
            if (options.snippetReplaceParent) c = c.parent();
            let segment = $('<div class="ui segment"/>').append(s);
            c.replaceWith(segment);
        }, {
                emPixels: 14, layout: pxt.blocks.BlockLayout.Shuffle, aspectRatio: options.blocksAspectRatio,
                package: options.package
            });
    }

    function renderBlocksAsync(options: ClientRenderOptions): Promise<void> {
        return renderNextSnippetAsync(options.blocksClass, (c, r) => {
            const s = r.blocksSvg;
            if (options.snippetReplaceParent) c = c.parent();
            const segment = $('<div class="ui segment"/>').append(s);
            c.replaceWith(segment);
        }, { package: options.package, snippetMode: true });
    }

    function renderInlineBlocksAsync(options: pxt.blocks.BlocksRenderOptions): Promise<void> {
        options = Util.clone(options);
        options.emPixels = 18;
        options.snippetMode = true;

        const $els = $(`:not(pre) > code`);
        let i = 0;
        function renderNextAsync(): Promise<void> {
            if (i >= $els.length) return Promise.resolve();
            const $el = $($els[i++]);
            const text = $el.text();
            const mbtn = /^(\|+)([^\|]+)\|+$/.exec(text);
            if (mbtn) {
                const lev = mbtn[1].length == 1 ? "primary" : "";
                const txt = mbtn[2];
                $el.replaceWith($(`<button class="ui button ${lev}"/>`).text(U.rlf(txt)));
                return renderNextAsync();
            }

            const m = /^\[([^\]]+)\]$/.exec(text);
            if (!m) return renderNextAsync();

            const code = m[1];
            return pxt.runner.decompileToBlocksAsync(code, options)
                .then(r => {
                    if (r.blocksSvg) {
                        let $newel = $('<span class="block"/>').append(r.blocksSvg);
                        const file = r.compileJS.ast.getSourceFile("main.ts");
                        const stmt = file.statements[0];
                        const info = decompileCallInfo(stmt);
                        if (info && info.attrs.help)
                            $newel = $(`<a class="ui link"/>`).attr("href", `/reference/${info.attrs.help}`).append($newel);
                        $el.replaceWith($newel);
                    }
                    return Promise.delay(1, renderNextAsync());
                });
        }

        return renderNextAsync();
    }

    function renderProjectAsync(options: ClientRenderOptions): Promise<void> {
        if (!options.projectClass) return Promise.resolve();

        function render(): Promise<void> {
            let $el = $("." + options.projectClass).first();
            let e = $el[0];
            if (!e) return Promise.resolve();

            $el.removeClass(options.projectClass);

            let id = pxt.Cloud.parseScriptId(e.innerText);
            if (id) {
                if (options.snippetReplaceParent) {
                    e = e.parentElement;
                    // create a new div to host the rendered code
                    let d = document.createElement("div");
                    e.parentElement.insertBefore(d, e);
                    e.parentElement.removeChild(e);

                    e = d;
                }
                return pxt.runner.renderProjectAsync(e, id)
                    .then(() => render());
            }
            else return render();
        }

        return render();
    }

    function renderLinksAsync(options: ClientRenderOptions, cls: string, replaceParent: boolean, ns: boolean): Promise<void> {
        return renderNextSnippetAsync(cls, (c, r) => {
            const cjs = r.compileJS;
            if (!cjs) return;
            const file = r.compileJS.ast.getSourceFile("main.ts");
            const stmts = file.statements.slice(0).reverse();
            const ul = $('<div />').addClass('ui cards');
            const addItem = (card: pxt.CodeCard) => {
                if (!card) return;
                ul.append(pxt.docs.codeCard.render(card, { hideHeader: true, shortName: true }));
            }
            stmts.forEach(stmt => {
                let info = decompileCallInfo(stmt);
                if (info) {
                    let block = Blockly.Blocks[info.attrs.blockId];
                    if (ns) {
                        let ii = r.compileBlocks.blocksInfo.apis.byQName[info.qName];
                        let nsi = r.compileBlocks.blocksInfo.apis.byQName[ii.namespace];
                        addItem({
                            name: nsi.name,
                            url: nsi.attributes.help || ("reference/" + nsi.name),
                            description: nsi.attributes.jsDoc,
                            blocksXml: block && block.codeCard
                                ? block.codeCard.blocksXml
                                : info.attrs.blockId
                                    ? `<xml xmlns="http://www.w3.org/1999/xhtml"><block type="${info.attrs.blockId}"></block></xml>`
                                    : undefined
                        })
                    } else if (block) {
                        let card = U.clone(block.codeCard) as pxt.CodeCard;
                        if (card) {
                            addItem(card);
                        }
                    } else {
                        // no block available here
                        addItem({
                            name: info.qName,
                            description: info.attrs.jsDoc,
                            url: info.attrs.help || undefined
                        })
                    }
                } else
                    switch (stmt.kind) {
                        case ts.SyntaxKind.ExpressionStatement:
                            let es = stmt as ts.ExpressionStatement;
                            switch (es.expression.kind) {
                                case ts.SyntaxKind.TrueKeyword:
                                case ts.SyntaxKind.FalseKeyword:
                                    addItem({
                                        name: "Boolean",
                                        url: "blocks/logic/boolean",
                                        description: lf("True or false values"),
                                        blocksXml: '<xml xmlns="http://www.w3.org/1999/xhtml"><block type="logic_boolean"><field name="BOOL">TRUE</field></block></xml>'
                                    });
                                    break;
                                default:
                                    pxt.debug(`card expr kind: ${es.expression.kind}`);
                                    break;
                            }
                            break;
                        case ts.SyntaxKind.IfStatement:
                            addItem({
                                name: ns ? "Logic" : "if",
                                url: "blocks/logic" + (ns ? "" : "/if"),
                                description: ns ? lf("Logic operators and constants") : lf("Conditional statement"),
                                blocksXml: '<xml xmlns="http://www.w3.org/1999/xhtml"><block type="controls_if"></block></xml>'
                            });
                            break;
                        case ts.SyntaxKind.WhileStatement:
                            addItem({
                                name: ns ? "Loops" : "while",
                                url: "blocks/loops" + (ns ? "" : "/while"),
                                description: ns ? lf("Loops and repetition") : lf("Repeat code while a condition is true."),
                                blocksXml: '<xml xmlns="http://www.w3.org/1999/xhtml"><block type="device_while"></block></xml>'
                            });
                            break;
                        case ts.SyntaxKind.ForStatement:
                            addItem({
                                name: ns ? "Loops" : "for",
                                url: "blocks/loops" + (ns ? "" : "/for"),
                                description: ns ? lf("Loops and repetition") : lf("Repeat code for a given number of times."),
                                blocksXml: '<xml xmlns="http://www.w3.org/1999/xhtml"><block type="controls_simple_for"></block></xml>'
                            });
                            break;
                        case ts.SyntaxKind.VariableStatement:
                            addItem({
                                name: ns ? "Variables" : "variable declaration",
                                url: "blocks/variables" + (ns ? "" : "/assign"),
                                description: ns ? lf("Variables") : lf("Assign a value to a named variable."),
                                blocksXml: '<xml xmlns="http://www.w3.org/1999/xhtml"><block type="variables_set"></block></xml>'
                            });
                            break;
                        default:
                            pxt.debug(`card kind: ${stmt.kind}`)
                    }
            })

            if (replaceParent) c = c.parent();
            c.replaceWith(ul)
        }, { package: options.package })
    }

    function fillCodeCardAsync(c: JQuery, cards: pxt.CodeCard[], options: pxt.docs.codeCard.CodeCardRenderOptions): Promise<void> {
        if (!cards || cards.length == 0) return Promise.resolve();

        if (cards.length == 0) {
            let cc = pxt.docs.codeCard.render(cards[0], options)
            c.replaceWith(cc);
        } else {
            let cd = document.createElement("div")
            cd.className = "ui cards";
            cards.forEach(card => cd.appendChild(pxt.docs.codeCard.render(card, options)));
            c.replaceWith(cd);
        }

        return Promise.resolve();
    }

    function renderNextCodeCardAsync(cls: string, options: ClientRenderOptions): Promise<void> {
        if (!cls) return Promise.resolve();

        let $el = $("." + cls).first();
        if (!$el[0]) return Promise.resolve();

        $el.removeClass(cls);
        let cards: pxt.CodeCard[];
        try {
            let js: any = JSON.parse($el.text());
            if (!Array.isArray(js)) js = [js];
            cards = js as pxt.CodeCard[];
        } catch (e) {
            console.error('error while rendering ' + $el.html())
            $el.append($('<div/>').addClass("ui segment warning").text(e.messageText));
        }

        if (options.snippetReplaceParent) $el = $el.parent();
        return fillCodeCardAsync($el, cards, { hideHeader: true })
            .then(() => Promise.delay(1, renderNextCodeCardAsync(cls, options)));
    }

    function getRunUrl(options: ClientRenderOptions) {
        return options.pxtUrl ? options.pxtUrl + '/--run' : pxt.webConfig && pxt.webConfig.runUrl ? pxt.webConfig.runUrl : '/--run';
    }

    function mergeConfig(options: ClientRenderOptions) {
        // additional config options
        if (!options.packageClass) return;
        $('.' + options.packageClass).each((i, c) => {
            let $c = $(c);
            let name = $c.text().split('\n').map(s => s.replace(/\s*/g, '')).filter(s => !!s).join(',');
            options.package = options.package ? `${options.package},${name}` : name;
            if (options.snippetReplaceParent) $c = $c.parent();
            $c.remove();
        });
    }

    export function renderAsync(options?: ClientRenderOptions): Promise<void> {
        if (!options) options = {}

        if (options.pxtUrl) options.pxtUrl = options.pxtUrl.replace(/\/$/, '');

        mergeConfig(options);
        if (options.simulatorClass) {
            // simulators
            $('.' + options.simulatorClass).each((i, c) => {
                let $c = $(c);
                let padding = '81.97%';
                if (pxt.appTarget.simulator) padding = (100 / pxt.appTarget.simulator.aspectRatio) + '%';
                let $sim = $(`<div class="ui centered card"><div class="ui content">
                    <div style="position:relative;height:0;padding-bottom:${padding};overflow:hidden;">
                    <iframe style="position:absolute;top:0;left:0;width:100%;height:100%;" allowfullscreen="allowfullscreen" frameborder="0" sandbox="allow-popups allow-scripts allow-same-origin"></iframe>
                    </div>
                    </div></div>`)
                $sim.find("iframe").attr("src", getRunUrl(options) + "#nofooter=1&code=" + encodeURIComponent($c.text().trim()));
                if (options.snippetReplaceParent) $c = $c.parent();
                $c.replaceWith($sim);
            });
        }

        return Promise.resolve()
            .then(() => renderInlineBlocksAsync(options))
            .then(() => renderShuffleAsync(options))
            .then(() => renderLinksAsync(options, options.linksClass, options.snippetReplaceParent, false))
            .then(() => renderLinksAsync(options, options.namespacesClass, options.snippetReplaceParent, true))
            .then(() => renderSignaturesAsync(options))
            .then(() => renderNextCodeCardAsync(options.codeCardClass, options))
            .then(() => renderSnippetsAsync(options))
            .then(() => renderBlocksAsync(options))
            .then(() => renderProjectAsync(options))
    }
}