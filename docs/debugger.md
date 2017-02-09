# On-device Software Debugger

## Global flags layout

* `G[0]` - valid or invalid address - single step
* `G[1]` - 

## Modes of operation

Just-my-code is selected at compile time.

If only one thread - switch flag at context switch.

* step-into - pause before any TS statement 
  in either all threads of execution or a specific thread (controlled by context switch callback)
* step-over - some dynamic check at the exit of every function; can hash them 8bit
  `if (waiting_for_hash == #our_hash) udf XX`
* setting breakpoint - re-flashing with `udf YY` 

## Thoughts

* Need to get a list of active threads; they have unique addresses
* Need callback just before thread switch
* re-flashing with break-points vs some dynamic check
* delimit stack frames - BL return addresses might not be enough