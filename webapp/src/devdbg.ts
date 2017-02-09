import * as workspace from "./workspace";
import * as data from "./data";
import * as pkg from "./package";
import * as core from "./core";
import * as compiler from "./compiler"
import * as hidbridge from "./hidbridge"

import Cloud = pxt.Cloud;
import U = pxt.Util;
import H = pxt.HF2;

const HF2_DBG_GET_GLOBAL_STATE = 0x53fc66e0
const HF2_DBG_RESUME = 0x27a55931
const HF2_DBG_SET_BREAKPOINTS = 0xcfdeea17

const HF2_EV_DBG_PAUSED = 0x3692f9fd

const r32 = H.read32

interface StateInfo {
    numGlobals: number;
    globalsPtr: number;
}

let isHalted = false
let lastCompileResult: pxtc.CompileResult;
let onHalted = Promise.resolve();
let haltHandler: () => void;
let cachedStaticState: StateInfo
let nextBreakpoints: number[] = []
let currBreakpoint: pxtc.Breakpoint;
let lastDebugStatus: number;
let callInfos: pxt.Map<ExtCallInfo>;

let hid: pxt.HF2.Wrapper

interface ExtCallInfo {
    from: pxtc.ProcDebugInfo;
    to: pxtc.ProcDebugInfo;
    stack: number;
}


export var postMessage: (msg: pxsim.DebuggerMessage) => void;

function clearAsync() {
    isHalted = false
    lastCompileResult = null
    cachedStaticState = null
    lastDebugStatus = null
    return Promise.resolve()
}

function corePaused(buf: Uint8Array) {
    return getHwStateAsync()
        .then(st => {
            nextBreakpoints = []

            let w = H.decodeU32LE(buf)
            let pc = w[0]

            let globals: pxsim.Variables = {}
            st.globals.slice(1).forEach((v, i) => {
                let loc = lastCompileResult.procDebugInfo[0].locals[i]
                if (loc)
                    globals[loc.name] = v
                else
                    globals["?" + i] = v
            })

            let bb = lastCompileResult.breakpoints
            let brkMatch = bb[0]
            let bestDelta = Infinity
            for (let b of bb) {
                let delta = pc - b.binAddr
                if (delta >= 0 && delta < bestDelta) {
                    bestDelta = delta
                    brkMatch = b
                }
            }
            currBreakpoint = brkMatch
            let msg: pxsim.DebuggerBreakpointMessage = {
                type: 'debugger',
                subtype: 'breakpoint',
                breakpointId: brkMatch.id,
                globals: globals,
                stackframes: []
            }
            postMessage(msg)
        })
        .then(haltHandler)
}

function clearHalted() {
    isHalted = false
    onHalted = new Promise<void>((resolve, reject) => {
        haltHandler = resolve
    })
}

function writeDebugStatusAsync(v: number) {
    if (v === lastDebugStatus) return Promise.resolve()
    lastDebugStatus = v
    return hid.writeWordsAsync(cachedStaticState.globalsPtr, [v])
}

function setBreakpointsAsync(addrs: number[]) {
    return hid.talkAsync(HF2_DBG_SET_BREAKPOINTS, H.encodeU32LE(addrs))
}

export function startDebugAsync() {
    return clearAsync()
        .then(() => compiler.compileAsync({ native: true, debug: true }))
        .then(res => {
            lastCompileResult = res
            callInfos = {}

            let procLookup: pxtc.ProcDebugInfo[] = []
            for (let pdi of res.procDebugInfo) {
                procLookup[pdi.idx] = pdi
            }
            for (let pdi of res.procDebugInfo) {
                for (let ci of pdi.calls) {
                    callInfos[ci.addr + ""] = {
                        from: pdi,
                        to: procLookup[ci.procIndex],
                        stack: ci.stack
                    }
                }
            }

            let bb = lastCompileResult.breakpoints
            let entry = bb[1]
            for (let b of bb) {
                if (b.binAddr && b.binAddr < entry.binAddr)
                    entry = b
            }
            return setBreakpointsAsync([entry.binAddr])
        })
        .then(() => {
            let f = lastCompileResult.outfiles[pxtc.BINARY_UF2]
            let blocks = pxtc.UF2.parseFile(U.stringToUint8Array(atob(f)))
            return hid.flashAsync(blocks) // this will reset into app at the end
        })
        .then(clearHalted)
        .then(waitForHaltAsync)
        .then(res => writeDebugStatusAsync(1).then(() => res))
}

export function handleMessage(msg: pxsim.DebuggerMessage) {
    console.log("HWDBGMSG", msg)
    if (msg.type != "debugger")
        return
    let stepInto = false
    switch (msg.subtype) {
        case 'stepinto':
            stepInto = true
        case 'stepover':
            nextBreakpoints = currBreakpoint.successors.map(id => lastCompileResult.breakpoints[id].binAddr)
            resumeAsync(stepInto)
            break
    }
}

export function resumeAsync(into = false) {
    return Promise.resolve()
        .then(() => writeDebugStatusAsync(into ? 3 : 1))
        .then(() => hid.talkAsync(HF2_DBG_RESUME))
        .then(clearHalted)
}

export interface HwState {
    staticState: StateInfo;
    globals: number[];
}

export function waitForHaltAsync() {
    return onHalted
}

function initAsync() {
    if (hid)
        return Promise.resolve(hid)
    return hidbridge.initAsync()
        .then(d => {
            hid = d
            hid.onEvent(HF2_EV_DBG_PAUSED, corePaused)
            return d
        })
}

function getStaticStateAsync() {
    if (cachedStaticState) return Promise.resolve(cachedStaticState)
    return initAsync()
        .then(() => hid.talkAsync(HF2_DBG_GET_GLOBAL_STATE))
        .then(buf => (cachedStaticState = {
            numGlobals: r32(buf, 0),
            globalsPtr: r32(buf, 4)
        }))
}

export function getHwStateAsync() {
    return getStaticStateAsync()
        .then(st => hid.readWordsAsync(st.globalsPtr, st.numGlobals))
        .then(buf => {
            let res: HwState = {
                staticState: cachedStaticState,
                globals: H.decodeU32LE(buf)
            }
            return res
        })
}