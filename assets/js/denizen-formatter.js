(function() {
  const operator_pattern = /\b(?:and|contains|equals|in|matches|more|not|or|or_less|or_more)\b|!==|===|!=|==|>=|<=|\|\||&&|>|<|!/gi;

  function escape_html(value) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function span(class_name, value) {
    return `<span class="${class_name}">${value}</span>`;
  }

  function find_tag_end(value, start) {
    let depth = 0;

    for (let index = start; index < value.length; index += 1) {
      if (value[index] === '<') depth += 1;
      if (value[index] === '>') {
        depth -= 1;
        if (depth === 0) return index;
      }
    }

    return -1;
  }

  function format_plain(value) {
    let result = '';
    let last_index = 0;

    for (const match of value.matchAll(operator_pattern)) {
      result += escape_html(value.slice(last_index, match.index));
      result += span('script_operator', escape_html(match[0]));
      last_index = match.index + match[0].length;
    }

    return result + escape_html(value.slice(last_index));
  }

  function format_tag(value) {
    let result = span('script_tag', '&lt;');
    let index = 1;
    let text_start = 1;
    let parameter_depth = 0;

    function current_class() {
      if (parameter_depth === 0) return 'script_tag';
      if (text_start === 2 && value[1] === '[') return 'script_def_name';
      return 'script_tag_param';
    }

    function append_text(end) {
      if (end > text_start) {
        result += span(current_class(), escape_html(value.slice(text_start, end)));
      }
    }

    while (index < value.length - 1) {
      const character = value[index];

      if (character === '<') {
        const tag_end = find_tag_end(value, index);
        if (tag_end === -1) {
          index += 1;
          continue;
        }
        append_text(index);
        result += format_tag(value.slice(index, tag_end + 1));
        index = tag_end + 1;
        text_start = index;
        continue;
      }

      if (character === '[') {
        append_text(index);
        result += span('script_tag_param_bracket', '[');
        parameter_depth += 1;
        index += 1;
        text_start = index;
        continue;
      }

      if (character === ']') {
        append_text(index);
        result += span('script_tag_param_bracket', ']');
        parameter_depth = Math.max(0, parameter_depth - 1);
        index += 1;
        text_start = index;
        continue;
      }

      if ((character === '.' || character === '|') && parameter_depth === 0) {
        append_text(index);
        result += span('script_tag_dot', escape_html(character));
        index += 1;
        text_start = index;
        continue;
      }

      index += 1;
    }

    append_text(value.length - 1);
    return result + span('script_tag', '&gt;');
  }

  function format_fragment(value) {
    let result = '';
    let index = 0;
    let plain_start = 0;

    function append_plain(end) {
      if (end > plain_start) result += format_plain(value.slice(plain_start, end));
    }

    while (index < value.length) {
      const character = value[index];

      if (character === '<') {
        const tag_end = find_tag_end(value, index);
        if (tag_end !== -1) {
          append_plain(index);
          result += format_tag(value.slice(index, tag_end + 1));
          index = tag_end + 1;
          plain_start = index;
          continue;
        }
      }

      if (character === '"' || character === "'") {
        const quote_end = value.indexOf(character, index + 1);
        if (quote_end !== -1) {
          append_plain(index);
          const class_name = character === '"' ? 'script_quote_double' : 'script_quote_single';
          result += span(class_name, escape_html(character));
          result += format_fragment(value.slice(index + 1, quote_end));
          result += span(class_name, escape_html(character));
          index = quote_end + 1;
          plain_start = index;
          continue;
        }
      }

      index += 1;
    }

    return result + format_plain(value.slice(plain_start));
  }

  function format_comment(value) {
    if (/^#\s*todo:/i.test(value)) return span('script_comment_todo', escape_html(value));
    if (/^#[|+=#_@/]/.test(value)) return span('script_comment_header', escape_html(value));
    if (/^#\s*-/.test(value)) return span('script_comment_code', escape_html(value));
    return span('script_comment_normal', escape_html(value));
  }

  function format_line(line) {
    const comment_match = line.match(/^(\s*)(#.*)$/);
    if (comment_match) return escape_html(comment_match[1]) + format_comment(comment_match[2]);

    const command_match = line.match(/^(\s*)(-\s+~?)([a-z0-9_-]+)(.*)$/i);
    if (command_match) {
      const [, indent, dash, command, rest] = command_match;
      let formatted_rest = format_fragment(rest);

      if (/^(define|definemap)$/i.test(command)) {
        const definition_match = rest.match(/^(\s+)([a-z0-9_-]+)(.*)$/i);
        if (definition_match) {
          const [, space, name, after] = definition_match;
          formatted_rest = escape_html(space)
            + span('script_def_name', escape_html(name))
            + format_fragment(after);
        }
      }

      return escape_html(indent)
        + span('syntax_dot_dash', escape_html(dash))
        + span('script_command', escape_html(command))
        + formatted_rest;
    }

    const event_match = line.match(/^(\s*)((?:on|after|at|when)\b)(.*?)(:)(.*)$/i);
    if (event_match) {
      const [, indent, prefix, event, colon, rest] = event_match;
      return escape_html(indent)
        + span('script_key_inline', escape_html(prefix))
        + format_fragment(event)
        + span('script_colon', colon)
        + format_fragment(rest);
    }

    const key_match = line.match(/^(\s*)([a-z0-9_-]+)(:)(.*)$/i);
    if (key_match) {
      const [, indent, key, colon, rest] = key_match;
      const class_name = indent.length === 0 ? 'script_key' : 'script_key_inline';
      return escape_html(indent)
        + span(class_name, escape_html(key))
        + span('script_colon', colon)
        + format_fragment(rest);
    }

    return format_fragment(line);
  }

  function format_denizen_script(source) {
    return source.split(/\r?\n/).map(format_line).join('\n');
  }

  globalThis.format_denizen_script = format_denizen_script;
})();
