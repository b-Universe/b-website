document.addEventListener('DOMContentLoaded', () => {

    // List of files to load: [target_id, file_path]
    const filesToLoad = [
        ['html-code-content', 'assets/code-examples/code-example.html'],
        ['css-code-content', 'assets/code-examples/code-example.css'],
        ['js-code-content', 'assets/code-examples/code-example.js'],
        ['denizen-code-content', 'assets/code-examples/code-example.dsc'],
        ['denizen-armor-stand-content', 'assets/code-examples/denizen-armor-stand-content.dsc']
    ];

    // --- Core Utility: HTML Escape ---
    /**
     * Correctly escapes HTML for safe display in code blocks,
     * allowing subsequent regex to operate on escaped text.
     */
    function escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;') // Must be first to prevent double-escaping
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }


    // =======================================================
    // --- CUSTOM HIGHLIGHTER FUNCTIONS (The work happens here)
    // =======================================================

    // You will need to define CSS classes for these in your main stylesheet
    // (e.g., html-tag, js-keyword, css-selector) to achieve your "bright rainbows, dark themes" aesthetic!

    function highlightHtml(code) {
        let escapedCode = escapeHtml(code);
        
        // 1. Highlight HTML Comments
        escapedCode = escapedCode.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="html-comment">$1</span>');

        // 2. PROCESS ALL TAGS: Matches <, optional /, optional !, tag name, attributes, >
        escapedCode = escapedCode.replace(/(&lt;)(\/?)(!)?([\w-]+)([^&]*?)(&gt;)/g, (match, p1_bracket_open, p2_slash, p3_bang, p4_tag_name, p5_attributes, p6_bracket_close) => {
            
            let tagName = p4_tag_name;
            let attributes = p5_attributes;

            // Skip attribute highlighting for DOCTYPE or comments
            if (tagName.toLowerCase() === 'doctype' || tagName.toLowerCase() === '!--') {
                return `<span class="html-bracket">${p1_bracket_open}${p2_slash}${p3_bang}</span><span class="html-tag-name">${tagName}</span>${attributes}<span class="html-bracket">${p6_bracket_close}</span>`;
            }

            // --- Highlight Attributes inside the tag ---
            // CORRECTED REGEX: Looks for attribute values delimited by &quot; or &#039;
            // p1: name, p2: equals, p3: value (including escaped quotes)
            attributes = attributes.replace(/([a-zA-Z0-9-]+)(=)(&quot;.*?&quot;|&#039;.*?&#039;)/g, (match, p1_name, p2_equals, p3_quoted) => {
                
                // Determine the escaped quote type and content
                const isDoubleQuote = p3_quoted.startsWith('&quot;');
                const escapedQuote = isDoubleQuote ? '&quot;' : '&#039;';
                const content = p3_quoted.slice(escapedQuote.length, -escapedQuote.length); 

                // Style name (applying dot/dash styling)
                let name = p1_name.replace(/([.-])/g, '<span class="syntax-dot-dash">$1</span>');
                
                // Style content (applying dot/dash styling)
                let styled_content = content.replace(/([.-])/g, '<span class="syntax-dot-dash">$1</span>');
                
                // Reassemble with HTML Brackets for Quotes
                return `<span class="html-attribute-name">${name}</span><span class="html-operator">${p2_equals}</span><span class="html-bracket">${escapedQuote}</span><span class="html-attribute-value">${styled_content}</span><span class="html-bracket">${escapedQuote}</span>`;
            });

            // Reassemble the whole tag
            return `<span class="html-bracket">${p1_bracket_open}${p2_slash}</span><span class="html-tag-name">${tagName}</span>${attributes}<span class="html-bracket">${p6_bracket_close}</span>`;
        });
        
        // Apply dot/dash styling to any remaining dots/dashes in the content outside of tags (e.g., in a comment or plain text)
        // NOTE: This runs on the entire block, but should be safe as attribute names/values/tags have already been styled.
        // escapedCode = escapedCode.replace(/([.-])/g, '<span class="syntax-dot-dash">$1</span>'); // Generally not needed for HTML unless text content has them.

        return escapedCode;
    }

    function highlightCss(code) {
      let escapedCode = escapeHtml(code);
      
      // 1. Highlight CSS Comments
      escapedCode = escapedCode.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="css-comment">$1</span>');
      
      // 2. Highlight Selectors
      escapedCode = escapedCode.replace(/^(\s*)([#.]?[a-zA-Z0-9-_]+)/gm, 
        (match, p1_space, p2_selector) => {
          p2_selector = p2_selector.replace(/([.-])/g, '<span class="syntax-dot-dash">$1</span>');
          return `${p1_space}<span class="css-selector">${p2_selector}</span>`;
        });
      
      // 3. Highlight Property Names
      escapedCode = escapedCode.replace(/([a-z-]+)(:)/g, 
        (match, p1_propname, p2_colon) => {
          p1_propname = p1_propname.replace(/([.-])/g, '<span class="syntax-dot-dash">$1</span>');
          return `<span class="css-property-name">${p1_propname}</span><span class="css-colon">${p2_colon}</span>`;
        });

      // 4. Highlight Property Values
      escapedCode = escapedCode.replace(/:\s*([^;{]+)/g, 
        (match, p1_value) => {
          let styled_value = p1_value.replace(/([.-])/g, '<span class="syntax-dot-dash">$1</span>');
          return `: <span class="css-property-value">${styled_value}</span>`;
        });

        return escapedCode;
    }

function highlightJavaScript(code) {
        let escapedCode = escapeHtml(code);
        
        // 1. Highlight Strings (Must run first to consume all quotes)
        escapedCode = escapedCode.replace(/(".*?"|'.*?')/g, '<span class="js-string">$1</span>');
        
        // 2. Highlight Keywords
        const keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'while', 'for', 'class', 'this', 'new', 'import', 'export', 'await', 'async', 'document', 'window'];
        const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
        escapedCode = escapedCode.replace(keywordRegex, '<span class="js-keyword">$&</span>');
        
        // 3. Highlight Comments (Must run last to ignore HTML from other steps)
        escapedCode = escapedCode.replace(/(\/\/[^\n]*)/g, '<span class="js-comment">$1</span>');
        escapedCode = escapedCode.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="js-comment">$1</span>');

        return escapedCode;
    }

    function highlightDenizenScript(rawScript) {
        // 1. Initial HTML escaping (for all characters)
        let escapedScript = rawScript.replace(/&/g, '&amp;')
                                      .replace(/</g, '&lt;')
                                      .replace(/>/g, '&gt;')
                                      .replace(/"/g, '&quot;')
                                      .replace(/'/g, '&#039;');
        
        const lines = escapedScript.split('\n');
        const specialTextKeys = ['lore', 'interact scripts', 'default constants', 'data', 'constants', 'text', 'aliases', 'slots', 'enchantments', 'input', 'description'];

        const processedLines = lines.map(line => {
            let processedLine = line;
            
            if (processedLine.trim().length === 0) return processedLine;

            // --- 1. Comment Highlighting (Runs first) ---
            const headerRegex = /^(\s*)(\#\s*([@#+\_=].*))/i;
            if (headerRegex.test(processedLine)) {
                return processedLine.replace(headerRegex, (match, p1_space, p2_comment_content) => 
                    `${p1_space}<span class="script_comment_header">${p2_comment_content}</span>`
                );
            }
            const todoRegex = /^(\s*)(\#\s*todo.*)/i;
            if (todoRegex.test(processedLine)) {
                return processedLine.replace(todoRegex, (match, p1_space, p2_comment_content) => 
                    `${p1_space}<span class="script_comment_todo">${p2_comment_content}</span>`
                );
            }
            const normalCommentRegex = /^(\s*)(\#.*)/;
            if (normalCommentRegex.test(processedLine)) {
                return processedLine.replace(normalCommentRegex, (match, p1_space, p2_comment_content) => 
                    `${p1_space}<span class="script_comment_normal">${p2_comment_content}</span>`
                );
            }


            // --- 2. Pre-Process Tags and Quotes ---

            // a) Highlight Tags
            // FIX: Using split/map to ensure dot/sub-tag coloring is correct and explicit.
            processedLine = processedLine.replace(/(&lt;)(\[?)([^<]*?)(\]?)(&gt;)/g, (match, p1_lt, p2_lbracket, p3_content, p4_rbracket, p5_gt) => {
                
                // 1. Split content by the dot character
                const contentParts = p3_content.split('.');
                
                // 2. Wrap all parts in .script_tag and re-insert the styled dot
                let finalContent = contentParts.map((part) => {
                    // Ensure text parts (like 'player', 'name') are explicitly wrapped to maintain color
                    return `<span class="script_tag">${part}</span>`;
                }).join('<span class="script_tag_dot">.</span>');

                // 3. Style the inner [ and ] brackets (must be done after the split/join)
                finalContent = finalContent.replace(/(\[)/g, '<span class="script_tag_param_bracket">$1</span>');
                finalContent = finalContent.replace(/(\])/g, '<span class="script_tag_param_bracket">$1</span>');

                // 4. Apply bracket styling (outer < and > and optional outer [ and ])
                const styledLBracket = p2_lbracket ? `<span class="script_tag_param_bracket">${p2_lbracket}</span>` : '';
                const styledRBracket = p4_rbracket ? `<span class="script_tag_param_bracket">${p4_rbracket}</span>` : '';

                // Final assembly: angle bracket + outer bracket + content + outer bracket + angle bracket
                return `<span class="script_tag_param">${p1_lt}</span>${styledLBracket}${finalContent}${styledRBracket}<span class="script_tag_param">${p5_gt}</span>`;
            });

            // b) Highlight Quotes
            // The content (which may contain styled tags) is wrapped in script_text, with quotes styled.
            processedLine = processedLine.replace(/(&quot;.*?&quot;|&#039;.*?&#039;)/g, (match, p1_string) => {
                const isDoubleQuote = p1_string.startsWith('&quot;');
                const escapedQuote = isDoubleQuote ? '&quot;' : '&#039;';
                const quoteClass = isDoubleQuote ? 'script_quote_double' : 'script_quote_single';
                const content = p1_string.slice(escapedQuote.length, -escapedQuote.length); 

                return `<span class="${quoteClass}">${escapedQuote}</span><span class="script_text">${content}</span><span class="${quoteClass}">${escapedQuote}</span>`;
            });


            // --- 3. YAML Key Highlighting ---

            // Main Script Key: key: at the start of the line (no leading whitespace)
            processedLine = processedLine.replace(/^([a-zA-Z0-9_\-]+):(\s*)(.*)/, (match, p1_key, p2_space, p3_content) => {
                let styled_value = p3_content.trim().length > 0 ? `<span class="script_text">${p3_content}</span>` : '';
                return `<span class="script_key">${p1_key}</span><span class="script_colon">:</span>${p2_space}${styled_value}`;
            });
            
            // Inline Script Key: key: with leading whitespace (indentation)
            processedLine = processedLine.replace(/^(\s+)([a-zA-Z0-9_\-\s]+):(\s*)(.*)/i, (match, p1_space, p2_key_colon, p3_val_space, p4_val_content) => {
                const keyName = p2_key_colon.slice(0, -1).trim(); 
                const keyClass = specialTextKeys.includes(keyName.toLowerCase()) ? 'script_text' : 'script_key_inline';
                
                let styled_value = p4_val_content.trim().length > 0 ? `<span class="script_text">${p4_val_content}</span>` : '';
                
                return `${p1_space}<span class="${keyClass}">${p2_key_colon}</span><span class="script_colon">:</span>${p3_val_space}${styled_value}`;
            });
            
            // --- 4. Command/List Lines (starting with -) ---
            if (processedLine.trim().startsWith('-')) {
                processedLine = processedLine.replace(/^(\s*-\s*)([a-zA-Z0-9_\-]+)(.*)/, (match, p1_dash, p2_command, p3_rest) => {
                    let result = `${p1_dash}<span class="syntax_command">${p2_command}</span>`;
                    let restOfLine = p3_rest;
                    
                    // Handle Definition Name
                    const isDefineCommand = p2_command.toLowerCase() === 'define' || p2_command.toLowerCase() === 'definemap';
                    if (isDefineCommand) {
                        const defineMatch = restOfLine.match(/^(\s*)([a-zA-Z0-9_\-]+)(.*)/);
                        if (defineMatch) {
                            const p3_space = defineMatch[1];
                            const p4_defName = defineMatch[2];
                            const p5_finalRest = defineMatch[3];
                            
                            result += `${p3_space}<span class="script_def_name">${p4_defName}</span>`;
                            restOfLine = p5_finalRest;
                        }
                    }
                    
                    // Wrap all plain text chunks that haven't been wrapped by quotes or tags in script_text
                    let parts = restOfLine.split(/(\s*<span\s+class="[^"]+"\s*>[^<]*<\/span>\s*)/g);

                    let finalRest = parts.map(part => {
                        if (part.length === 0 || part.includes('<span')) {
                            return part; 
                        }
                        return `<span class="script_text">${part}</span>`;
                    }).join('');
                    
                    // Operator Highlighting
                    const operators = ['!=', '<=', '>=', '||', '==', '<', '>', 'equals', 'more', 'less', 'or_more', 'or_less'];
                    // Match the operator only when surrounded by whitespace or string boundaries
                    const opRegex = new RegExp(`(\\s)(${operators.join('|')})(:?)(\\s|$)`, 'g');
                    finalRest = finalRest.replace(opRegex, (m, p1_space, p2_operator, p3_colon, p4_end) => {
                        return `${p1_space}<span class="script_colon">${p2_operator}</span>${p3_colon}${p4_end}`;
                    });
                    
                    // Now style standalone logic indicators
                    finalRest = finalRest.replace(/(!)/g, (m, p1_bang) => {
                        return `<span class="script_colon">${p1_bang}</span>`;
                    });


                    return result + finalRest;
                });
            }
            
            // --- 5. Number Value Highlighting ---
            processedLine = processedLine.replace(/:\s*(\d+)/g, (match, p1_number) => {
                return `: <span class="script_text">${p1_number}</span>`;
            });

            // Add default text styling for any remaining un-wrapped lines 
            if (processedLine.trim() !== '' && !processedLine.includes('<span')) {
                return processedLine.replace(/(.+)/g, (match, p1_content) => {
                    return `<span class="script_text">${p1_content}</span>`;
                });
            }
            
            return processedLine;
        }).join('\n');
        
        return processedLines;
    }


    // =======================================================
    // --- MAIN LOADER LOGIC ---
    // =======================================================

    /**
     * Fetches a file and inserts its content into the target element.
     */
    function loadCodeFile(targetId, url) {
        // Find the <code> element
        const codeContainer = document.getElementById(targetId);
        
        if (!codeContainer) return;

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.text();
            })
            .then(data => {
                let finalContent = data.trim();
                let highlighterFunction;

                // 1. Select the correct highlighter based on file extension/ID
                if (url.endsWith('.dsc') || targetId === 'denizen-code-content') {
                    highlighterFunction = highlightDenizenScript;
                } else if (url.endsWith('.html') || targetId === 'html-code-content') {
                    highlighterFunction = highlightHtml;
                } else if (url.endsWith('.css') || targetId === 'css-code-content') {
                    highlighterFunction = highlightCss;
                } else if (url.endsWith('.js') || targetId === 'js-code-content') {
                    highlighterFunction = highlightJavaScript;
                } else {
                    // Fallback to plain escaped text for unknown files
                    codeContainer.textContent = escapeHtml(finalContent);
                    return;
                }

                // 2. Apply Highlighting and set innerHTML
                finalContent = highlighterFunction(finalContent);
                // The finalContent is now an HTML string with <span> tags
                codeContainer.innerHTML = finalContent; 
            })
            .catch(error => {
                console.error(`Error loading external file ${url}:`, error);
                codeContainer.textContent = `Error loading code example from ${url}. (Check console/HTTP error.)`;
            });
    }

    // Run the loader for all files
    filesToLoad.forEach(([targetId, url]) => {
        loadCodeFile(targetId, url);
    });
});