/// <reference path="main.ts"/>

namespace pxt.blocks {
    export interface BlockParameter {
        name: string;
        type?: string;
        shadowType?: string;
        shadowValue?: string;
    }

    export function parameterNames(fn: pxtc.SymbolInfo): Map<BlockParameter> {
        // collect blockly parameter name mapping
        const instance = (fn.kind == pxtc.SymbolKind.Method || fn.kind == pxtc.SymbolKind.Property) && !fn.attributes.defaultInstance;
        let attrNames: Map<BlockParameter> = {};

        if (instance) attrNames["this"] = { name: "this", type: fn.namespace };
        if (fn.parameters)
            fn.parameters.forEach(pr => attrNames[pr.name] = {
                name: pr.name,
                type: pr.type,
                shadowValue: pr.defaults ? pr.defaults[0] : undefined
            });
        if (fn.attributes.block) {
            Object.keys(attrNames).forEach(k => attrNames[k].name = "");
            let rx = /%([a-zA-Z0-9_]+)(=([a-zA-Z0-9_]+))?/g;
            let m: RegExpExecArray;
            let i = 0;
            while (m = rx.exec(fn.attributes.block)) {
                if (i == 0 && instance) {
                    attrNames["this"].name = m[1];
                    if (m[3]) attrNames["this"].shadowType = m[3];
                    m = rx.exec(fn.attributes.block); if (!m) break;
                }

                let at = attrNames[fn.parameters[i++].name];
                at.name = m[1];
                if (m[3]) at.shadowType = m[3];
            }
        }
        return attrNames;
    }


    export interface FieldDescription {
        n: string;
        pre?: string;
        p?: string;
        ni: number;
    }

    export function parseFields(b: string): FieldDescription[] {
        // normalize and validate common errors
        // made while translating
        let nb = b.replace(/%\s+/g, '%');
        if (nb != b)
            pxt.log(`block has extra spaces: ${b}`);
        if (nb[0] == nb[0].toLocaleUpperCase() && nb[0] != nb[0].toLowerCase())
            pxt.log(`block is capitalized: ${b}`);

        nb = nb.replace(/\s*\|\s*/g, '|');
        return nb.split('|').map((n, ni) => {
            let m = /([^%]*)\s*%([a-zA-Z0-9_]+)/.exec(n);
            if (!m) return { n, ni };

            let pre = m[1]; if (pre) pre = pre.trim();
            let p = m[2];
            return { n, ni, pre, p };
        });
    }

    export interface HelpItem {
        name: string;
        category: string;
        url: string;
        tooltip?: string;
        operators?: Map<string[]>;
        block?: string;
    }

    let _helpResources: Map<HelpItem>;
    export function helpResources(): Map<HelpItem> {
        if (!_helpResources) cacheHelpResources();
        return _helpResources;
    }

    function cacheHelpResources(): void {
        _helpResources = {
            'device_while': {
                name: Util.lf("a loop that repeats while the condition is true"),
                tooltip: Util.lf("Run the same sequence of actions while the condition is met."),
                url: '/blocks/loops/while',
                category: 'loops'
            },
            'controls_simple_for': {
                name: Util.lf("a loop that repeats the number of times you say"),
                url: 'blocks/loops/for',
                category: 'loops'
            },
            'math_op2': {
                name: Util.lf("minimum or maximum of 2 numbers"),
                url: '/blocks/math',
                operators: {
                    'op': ["min", "max"]
                },
                category: 'math'
            },
            'math_op3': {
                name: Util.lf("absolute number"),
                tooltip: Util.lf("absolute value of a number"),
                url: '/blocks/math/abs',
                category: 'math'
            },
            'device_random': {
                name: Util.lf("pick random number"),
                tooltip: Util.lf("Returns a random integer between 0 and the specified bound (inclusive)."),
                url: '/blocks/math/random',
                category: 'math'
            },
            'math_number': {
                name: Util.lf("{id:block}number"),
                url: '/blocks/math/random',
                category: 'math'
            },
            'math_number_minmax': {
                name: Util.lf("{id:block}number"),
                url: '/blocks/math/random',
                category: 'math'
            },
            'math_arithmetic': {
                name: Util.lf("arithmetic operation"),
                url: '/blocks/math',
                operators: {
                    'OP': ["ADD", "MINUS", "MULTIPLY", "DIVIDE", "POWER"]
                },
                category: 'math'
            },
            'math_modulo': {
                name: Util.lf("division remainder"),
                tooltip: Util.lf("Return the remainder from dividing the two numbers."),
                url: '/blocks/math',
                category: 'math'
            },
            'variables_change': {
                name: Util.lf("update the value of a number variable"),
                tooltip: Util.lf("Changes the value of the variable by this amount"),
                url: '/blocks/variables/change',
                category: 'variables'
            },
            'controls_repeat_ext': {
                name: Util.lf("a loop that repeats and increments an index"),
                tooltip: Util.lf("Do some statements several times."),
                url: '/blocks/loops/repeat',
                category: 'loops'
            },
            'variables_get': {
                name: Util.lf("get the value of a variable"),
                tooltip: Util.lf("Returns the value of this variable."),
                url: '/blocks/variables',
                category: 'variables'
            },
            'variables_set': {
                name: Util.lf("assign the value of a variable"),
                tooltip: Util.lf("Sets this variable to be equal to the input."),
                url: '/blocks/variables/assign',
                category: 'variables'
            },
            'controls_if': {
                name: Util.lf("a conditional statement"),
                tooltip: Util.lf("If a value is true, then do some statements."),
                url: '/blocks/logic/if',
                category: 'logic'
            },
            'logic_compare': {
                name: Util.lf("comparing two numbers"),
                url: '/blocks/logic/boolean',
                category: 'logic'
            },
            'logic_operation': {
                name: Util.lf("boolean operation"),
                url: '/blocks/logic/boolean',
                category: 'logic'
            },
            'logic_negate': {
                name: Util.lf("logical negation"),
                tooltip: Util.lf("Returns true if the input is false. Returns false if the input is true."),
                url: '/blocks/logic/boolean',
                category: 'logic'
            },
            'logic_boolean': {
                name: Util.lf("a `true` or `false` value"),
                tooltip: Util.lf("Returns either true or false."),
                url: '/blocks/logic/boolean',
                category: 'logic'
            },
            'text': {
                name: Util.lf("a piece of text"),
                tooltip: Util.lf("A letter, word, or line of text."),
                url: 'types/string',
                category: 'text'
            },
            'text_length': {
                name: Util.lf("number of characters in the string"),
                tooltip: Util.lf("Returns the number of letters (including spaces) in the provided text."),
                url: 'types/string/length',
                category: 'text'
            },
            'text_join': {
                name: Util.lf("join items to create text"),
                tooltip: Util.lf("Create a piece of text by joining together any number of items."),
                url: 'types/string/join',
                category: 'text'
            }
        };
    }
}
