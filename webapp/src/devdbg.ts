import * as workspace from "./workspace";
import * as data from "./data";
import * as pkg from "./package";
import * as core from "./core";
import * as compiler from "./compiler"
import * as hidbridge from "./hidbridge"

import Cloud = pxt.Cloud;
import U = pxt.Util;

const HF2_DBG_GET_GLOBAL_STATE = 0x53fc66e0;

const r32 = pxt.HF2.read32

let isHalted = false
let lastCompileResult: pxtc.CompileResult;
let haltCheckRunning = false
let onHalted = Promise.resolve();
let haltHandler: () => void;
let cachedStateInfo: StateInfo
let nextBreakpoints: number[] = []
let currBreakpoint: pxtc.Breakpoint;
let lastDebugStatus: number;
let callInfos: pxt.Map<ExtCallInfo>;

interface ExtCallInfo {
    from: pxtc.ProcDebugInfo;
    to: pxtc.ProcDebugInfo;
    stack: number;
}


export var postMessage: (msg: pxsim.DebuggerMessage) => void;

function clearAsync() {
    isHalted = false
    lastCompileResult = null
    cachedStateInfo = null
    lastDebugStatus = null
    return Promise.resolve()
}

function coreHalted() {
    return getHwStateAsync()
        .then(st => {
            nextBreakpoints = []

            let globals: pxsim.Variables = {}
            st.globals.slice(1).forEach((v, i) => {
                let loc = lastCompileResult.procDebugInfo[0].locals[i]
                if (loc)
                    globals[loc.name] = v
                else
                    globals["?" + i] = v
            })

            let pc = st.machineState.registers[15]

            let final = () => Promise.resolve()

            let stepInBkp = lastCompileResult.procDebugInfo.filter(p => p.bkptLoc == pc)[0]
            if (stepInBkp) {
                pc = stepInBkp.codeStartLoc
                st.machineState.registers[15] = pc
                final = () => restoreAsync(st.machineState)
            }

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
            return final()
        })
        .then(haltHandler)
}

function haltCheckAsync(): Promise<void> {
    if (isHalted)
        return Promise.delay(100).then(haltCheckAsync)
    return workerOpAsync("status")
        .then(res => {
            if (res.isHalted) {
                isHalted = true
                coreHalted()
            }
            return Promise.delay(300)
        })
        .then(haltCheckAsync)
}

function clearHalted() {
    isHalted = false
    onHalted = new Promise<void>((resolve, reject) => {
        haltHandler = resolve
    })
    if (!haltCheckRunning) {
        haltCheckRunning = true
        haltCheckAsync()
    }
}

function writeDebugStatusAsync(v: number) {
    if (v === lastDebugStatus) return Promise.resolve()
    lastDebugStatus = v
    return writeMemAsync(cachedStateInfo.globalsPtr, [v])
}

function setBreakpointsAsync(addrs: number[]) {
    return workerOpAsync("breakpoints", { addrs: addrs })
}

export function startDebugAsync() {
    return clearAsync()
        .then(() => compiler.compileAsync({ native: true }))
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
        .then(() => workerOpAsync("reset"))
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

export function snapshotAsync(): Promise<MachineState> {
    return workerOpAsync("snapshot")
        .then(r => r.state as MachineState)
}

export function restoreAsync(st: MachineState): Promise<void> {
    return workerOpAsync("restore", { state: st })
        .then(() => { })
}

export function resumeAsync(into = false) {
    return Promise.resolve()
        .then(() => writeDebugStatusAsync(into ? 3 : 1))
        .then(() => setBreakpointsAsync(nextBreakpoints))
        .then(() => workerOpAsync("resume"))
        .then(clearHalted)
}

export interface HwState {
    globals_addr: number;
    globals: number[];
}

export function waitForHaltAsync() {
    U.assert(haltCheckRunning)
    return onHalted
}

let hid: pxt.HF2.Wrapper
function initAsync() {
    if (hid)
        return Promise.resolve(hid)
    return hidbridge.initAsync()
        .then(d => {
            hid = d
            return d
        })
}


export function getHwStateAsync() {
    let res: HwState = {
        globals_addr: 0,
        globals: []
    }
    return initAsync()
        .then(() => hid.talkAsync(HF2_DBG_GET_GLOBAL_STATE))
        .then(buf => {
            let numGlobals = r32(buf, 0)
            res.globals_addr = r32(buf, 4)
            return hid.readWordsAsync(res.globals_addr, numGlobals)
        })
        .then(buf => {
            for (let i = 0; i < buf.length; i += 4)
                res.globals.push(r32(buf, i))
            return res
        })
}