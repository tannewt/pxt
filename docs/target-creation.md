# Target Creation

PXT is built to allow targeting different coding environment, called **targets**. 
In this page, we'll go through the steps necessary to get your target with your own blocks and runtime.

Examples of targets are:

* https://pxt.microbit.org
* https://pxt.adafruit.com
* http://microsoft.github.io/pxt-sample/

Since this is a rather technical topic, we assume that the reader is familiar with Node.JS, NPM
and JavaScript and/or C++.

* [theming](/targets/theming)
* [simulator](/targets/simulator)

A target contains the following folders:

* ``/libs``, packages (sometimes referred to as libraries) that define the JavaScript and APIs and how they should be exposed in blocks.
* ``/sim``, TypeScript source for the in-browser simulator (if any).
* ``/docs``, markdown documentation pages

## Getting started

* If you haven't do so yet, install Node.JS and the **PXT** command line

```
npm install -g pxt
```

* Get a copy of the [sample target sources](https://github.com/microsoft/pxt-sample) and open it in your favorite editor.
* Open a command prompt in the target folder and run these commands to setup the tools.

```
npm install
```

At this point, pick an identifier for your target. Use only alphanumeric characters as it will be used in various routing operations.

### Updating ``package.json``

Your target will eventually have to be published to NPM so go ahead and update the ``package.json`` file with your target id, repositories locations,
etc...
* it might be a good time to check that your target id is available in NPM as well.

### Updating ``pxtarget.json``

The ``pxtarget.json`` file contains the configuration options of your target. We'll talk about it deeply later. For now, update
the ``id``, ``corpkg``, ``name`` and ``title`` fields to reflect your target information.

* Tip: keep searching and replacing all instances of ``sample`` in `pxtarget.json`.

### Updating assets

Graphical assets are located under ``/docs/static``.

* **avatar.svg** image used in talking heads
* **loader.svg** image used in loading overlay

### Updating the ``sample`` package

* Rename the ``/libs/sample`` project to your target id, ``libs/[your target id]``
* open ``pxt.json`` under that folder and rename ``id`` field value to your target id.

### Updating the ``templates`` packages

Templates are the default projects for your target. There is one default blocks project, and one default JavaScript project.
The initial templates are empty projects.

* To change the default blocks project, modify the package under ``libs/blocksprj``
* To change the default JavaScript project, modify the package under ``libs/tsprj``

### Testing the target locally

Now that you've updated your target, it is ready to be run locally. Run the following command:

```
pxt serve
```

The editor will automatically open the target API project which you can edit directly in PXT. 
At this point, we recommend to create a new project using blocks that will serve as a sandbox. 
New projects are created under the ``/projects`` folder when testing a target locally (and are automatically "git-ignored"). You can use these projects to change your templates. Simply copy the contents of your project under ``/projects`` to one of the templates under ``/libs/templates/``.

Whenever you make a change, the local web server will trigger a build. Simply reload the page once the build is done.

## Defining APIs and Blocks

The APIs available in the PXT environment are loaded from TypeScript package (library) files
(the ones under ``/libs``). 
They can optionally be [auto-generated](/simshim) from C++ library files or from TypeScript
simulator files.

Read more about [how to annotate your APIS](/defining-blocks)
to expose them as blocks in PXT.

## Path rewriting

When uploading to PXT cloud URLs of various files are rewritten to ones pointing to the CDN.
There are three kinds of URLs on the CDN:

* `/blob/<blob_hash>/some/path/filename.ext` - where the path and file name can be arbitrary
* `/commit/<commit_hash>/path/in/that/commit/filename.ext` - where the path actually comes from the commit
* `/tree/<tree_hash>/path/in/that/tree/filename.ext` - where the path actually comes from the tree

Whenever possible, `/blob/` URLs should be used, since they only change when the file changes.
This allows for faster app updates.

For an example, compare https://pxt.microbit.org/---manifest
and https://github.com/Microsoft/pxt/blob/master/webapp/public/release.manifest

Generally, PXT will rewrite URLs starting with `/cdn/` to `/commit/...` and ones starting
with `/blb/` to `/blob/...`. This happens in manifest and HTML files, as well as some JavaScript
files (web worker sources and `embed.js`). Part of that rewriting happens client-side when uploading
(strings like `@commitCdnUrl@` and `@blobCdnUrl@` are introduced), and part happens in the cloud.

Currently, in simulator files only, all of `/cdn/`, `/sim/` and `/blb/` are rewritten
to `/blob/...`. Going forward however, simulator files should use `/blb/` explicitly
to make the intent clear.

The main reason to use `/cdn/` instead of `/blb/` is when resources require relative paths.
This is for example the case for Blockly media files.

The `/tree/...` URLs are not yet supported in rewriting.
