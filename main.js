/*
 * The MIT License (MIT)
 * Copyright (c) 2013 Lance Campbell. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 */

/*jslint vars: true, plusplus: true, devel: true, regexp: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets, $ */

define(function (require, exports, module) {
    "use strict";

    // --- Required modules ---
    var PreferencesManager  = brackets.getModule("preferences/PreferencesManager"),
        Menus               = brackets.getModule("command/Menus"),
        Editor              = brackets.getModule("editor/Editor").Editor,
        EditorManager       = brackets.getModule("editor/EditorManager"),
        AppInit             = brackets.getModule("utils/AppInit"),
        CommandManager      = brackets.getModule("command/CommandManager"),
        DocumentManager     = brackets.getModule("document/DocumentManager"),
        ExtensionUtils      = brackets.getModule("utils/ExtensionUtils");

    // --- Constants ---
    var COMMAND_NAME    = "Toggle Indent Guides",
        COMMAND_ID      = "lkcampbell.toggleIndentGuides";

    // --- Local variables ---
    var _defPrefs   = { enabled: false },
        _prefs      = PreferencesManager.getPreferenceStorage(module, _defPrefs),
        _viewMenu   = Menus.getMenu(Menus.AppMenuBar.VIEW_MENU);

    // Overlay that assigns Indent Guides style to all indents in the document
    var _indentGuidesOverlay = {
        token: function (stream) {
            var char,
                first = true,
                column = stream.column(),
                i = Editor.getSpaceUnits(),
                depth = Math.floor(column / i);
            // We start at a tab stop so we can count spaceUnits or until the next tab
            while (i) {
                char = stream.next();
                switch (char) {
                case "\t":
                    i = 0;
                    break;
                case " ":
                    i--;
                    break;
                default:
                    if (first) {
                        stream.skipToEnd();
                        return null;
                    }
                    stream.backup(1);
                    i = 0;
                }
                first = false;
            }
            
            return "ig ig-d" + depth;
        }
    };

    // --- Event handlers ---
    function _updateOverlay() {
        var command     = CommandManager.get(COMMAND_ID),
            fullEditor  = null,
            codeMirror  = null;
        
        fullEditor = EditorManager.getCurrentFullEditor();
        codeMirror = fullEditor ? fullEditor._codeMirror : null;
        
        if (codeMirror) {
            codeMirror.removeOverlay(_indentGuidesOverlay);
            if (command.getChecked()) {
                codeMirror.addOverlay(_indentGuidesOverlay);
            }
            codeMirror.refresh();
        }
    }

    function _toggleIndentGuides() {
        var command = CommandManager.get(COMMAND_ID);
        
        command.setChecked(!command.getChecked());
        _prefs.setValue("enabled", command.getChecked());
        _updateOverlay();
    }

    // --- Initialize Extension ---
    AppInit.appReady(function () {
        var isEnabled = _prefs.getValue("enabled");

        // --- Register command ---
        CommandManager.register(COMMAND_NAME, COMMAND_ID, _toggleIndentGuides);

        // --- Add to View menu ---
        if (_viewMenu) {
            _viewMenu.addMenuItem(COMMAND_ID);
        }

        // Apply user preferences
        CommandManager.get(COMMAND_ID).setChecked(isEnabled);

        // Add event listeners for updating the indent guides
        $(DocumentManager).on("currentDocumentChange", _updateOverlay);

        // Load the indent guide CSS -- when done, update the overlay
        ExtensionUtils.loadStyleSheet(module, "main.css")
            .done(function () {
                _updateOverlay();
            });
    });
});
