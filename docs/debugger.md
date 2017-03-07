# On-device Software Debugger

## Global flags layout

* `G[0]` - valid or invalid address - single step

## Modes of operation

Just-my-code is selected (or not) at compile time.

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
* if paused, all debugguable code should be paused
* should the time stop?

## Register not global?
* use register for unaligned breakpoint - naturally thread-local
* global 'pause' button - look on the stacks, inject breakpoints
* still need an exit sequence 
* for step-over maybe just inject breakpoints in current function
* cannot step between threads

## Rewriting strategy
* global pause - rewrite all user code to have breakpoints
* step-into - same
* step-over - rewrite current function to have breakpoint right after the function being stepped over
* if breakpoint hit - check if the breakpoint should be there and if not, fix up flash; for step-over compare flash height

## Behavior?
* step-into `fiber_sleep()`? should step into next running thread if any
* gcc usage of high registers? yes
