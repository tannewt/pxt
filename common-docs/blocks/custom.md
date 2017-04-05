# Custom blocks

This page provides a short introduction at defining your own blocks in PXT. 

## Custom blocks? I can't find it in the editor!

That's right. Currently, the block editor does not support functions... 
but it's possible to define functions in JavaScript and turn them into blocks 
with some comment macros.

In a nutshell, any exported JavaScript function can be turned into a block by adding a ``//% block`` comment:

```typescript
namespace fun {
    /**
    * Computes the famous Fibonacci number sequence!
    */
    //% block
    export function fib(value: number): number {
        return value <= 1 ? value : fib(value - 1) + fib(value - 2);
    }
}
```

There is quite a bit of options to control the appearance of your blocks. 
We generate a few of those in the template to get your started. 
For the complete guide, read https://makecode.com/defining-blocks.

## Storing blocks within a project

While it is possible to define functions and new blocks in ``main.ts``, it is generally preferrable
to store them in a separate file, ``custom.ts``.

In order to add ``custom.ts`` to your project,

* go to JavaScript,
* click on the **Explorer** view and expand it
* click on the ``+`` button that just appeared
* accept the dialog to add a ``custom.ts`` file in your project.

If you already have added this file to your project, simply navigate to it using the **Explorer** view.

## Using a shared project in **Add Packages...**

You can add a share project as a dependent package... and re-use all the blocks from that project. Simply click on the **Add Package...**
button, paste the shared project url and search.

## Development cycle

Once ``custom.ts`` is added to your project, you can alternate between this file and the blocks view.
The blocks will automatically be reloaded on each iteration.

If nothing shows up in your category, you might have a syntax error in your function definition.
Make sure that your code compiles and that the comments look correct.

## Sharing your blocks

The easiest way to share your blocks is to share the entire project using the [share button](/share).
If you plan to reuse those blocks further, you might consider turning them into a [package](/packages).
