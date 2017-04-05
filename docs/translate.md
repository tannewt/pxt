# Help translate

PXT supports localized content for both PXT web app and target documentation.
The default language is currently always English.

Our translations are managed via Crowdin, a translation management platform. It is free to join
and you can volunteer to translate parts of the web site.

## Crowdin project

The project below contains the resources from https://makecode.com and the menu items of @homeurl@.

* [https://crowdin.com/project/kindscript](https://crowdin.com/project/kindscript)

If you want to help translating the editor, please sign in to Crowdin and send us a translator request.

### ~ hint

Looking to help translate **microbit.org**? Try http://translate.microbit.org/ to help the Microbit Foundation!

### ~

## Live Translations

To test your changes "live", use **beta** build and the ``?livelang=CODE`` query argument where ``CODE`` is your language ISO code. For example, to see the french translations:

* https://pxt.microbit.org/beta?livelang=fr

Note that there may be a delay of up to 5 minutes before your changes in Crowdin make it into the "live" view.

## Translating the editor interface

All the editor interface strings, like the "Download" button are in the ``strings.json`` file.

## Translating the blocks and reference documentation

You will find target specific localization files under folders in crowdin. For example, all blocks, reference translations for the **microbit** are under ``/microbit`` , one for the block definition and one for the descriptions:

* ``core-strings.json``: contains the block definitions
* ``core-jsdoc-strings.json``: contains the descriptions

The block definition should be carefully translated using the [block definition syntax](https://makecode.com/defining-blocks). 
Open the developer tools and watch the console, PXT wil validate the localized string and flag potential issues.

### Block localization guidance

* Do not capitalize blocks
* Do not translalte ``%variable`` names
* Do not reorder parameters
* Maintain the same structure of ``|`` and ``%variables%``

## Translating Documentation

Translation of documentation pages are pulled from crowdin by the cloud backend automatically.

## Translating Help menu in editor

The `pxtarget.json` file contains a number of strings which
show up on doc pages (mostly menu items and target name). These can
be localized in ``_theme.json`` files. 

Check out `pxt-sample` target for an example!
