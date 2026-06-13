hljs.registerLanguage('dsc', function(hljs) {
  const COMMANDS = ["abstract", "action", "actionbar", "adjust", "adjustblock", "advancement", "age", "anchor", "animate", "animatechest", "announce", "assignment", "attach", "attack", "ban", "blockcrack", "bossbar", "braced", "break", "burn", "cast", "chat", "choose", "chunkload", "clickable", "compass", "cooldown", "copyblock", "create", "createworld", "customevent", "debug", "debugblock", "debuginvalid", "define", "definemap", "despawn", "determine", "disengage", "disguise", "displayitem", "draw", "drop", "else", "engage", "equip", "execute", "experience", "explode", "fakeequip", "fakeinternaldata", "fakeitem", "fakespawn", "feed", "filecopy", "fileread", "filewrite", "firework", "fish", "flag", "fly", "follow", "foreach", "gamerule", "give", "glow", "goto", "group", "head", "heal", "health", "hurt", "if", "image", "inject", "inventory", "invisible", "itemcooldown", "kick", "kill", "leash", "light", "log", "look", "lookclose", "map", "mark", "midi", "modifyblock", "money", "mongo", "mount", "narrate", "note", "npcbossbar", "opentrades", "oxygen", "pause", "permission", "playeffect", "playsound", "pose", "push", "pushable", "queue", "random", "ratelimit", "redis", "reflectionset", "reload", "remove", "rename", "repeat", "reset", "resourcepack", "rotate", "run", "runlater", "schematic", "scoreboard", "shoot", "showfake", "sidebar", "sign", "sit", "sleep", "sneak", "spawn", "sql", "stand", "statistic", "stop", "strike", "switch", "tablist", "take", "team", "teleport", "tick", "time", "title", "toast", "trait", "trigger", "vulnerable", "wait", "waituntil", "walk", "weather", "webget", "webserver", "while", "worldborder", "yaml", "zap"];

  const SYMBOL_OPERATORS = ["==", "!=", ">=", "<=", ">", "<", "&&", "\\|\\|", "!"];
  const WORD_OPERATORS = ["equals", "more", "less", "or_more", "or_less", "contains", "in", "matches", "and", "or"];

  const TAG = {
    scope: 'script_tag',
    begin: /</, end: />/,
    contains: []
  };

  TAG.contains.push(
    { match: /\./, scope: 'script_tag_dot' },
    {
      scope: 'script_def_name',
      begin: /(?<=<)\[/, end: /\]/,
      beginScope: 'script_tag_param_bracket',
      endScope: 'script_tag_param_bracket',
      contains: [ TAG ]
    },
    {
      scope: 'script_tag_param',
      begin: /\[/, end: /\]/,
      beginScope: 'script_tag_param_bracket',
      endScope: 'script_tag_param_bracket',
      contains: [ TAG ]
    }
  );

  return {
    name: 'DenizenScript',
    aliases: ['dsc', 'denizen'],
    case_insensitive: true,
    contains: [
      hljs.COMMENT('#', '$', {
        variants: [
          { begin: /#\s*TODO:/, scope: 'script_comment_todo' },
          { begin: /#[|+=#_@\/]/, scope: 'script_comment_header' },
          { begin: /#\s*-/, scope: 'script_comment_code' },
          { begin: /#/, scope: 'script_comment_normal' }
        ]
      }),
      TAG,
      {
        match: new RegExp(`^(\\s*)(-\\s+~?)(define|definemap)(\\s+)([a-zA-Z0-9_]+)`, 'i'),
        scope: { 2: 'syntax_dot_dash', 3: 'script_command', 5: 'script_def_name' }
      },
      {
        match: new RegExp(`^(\\s*)(-\\s+~?)(${COMMANDS.join('|')})\\b`, 'i'),
        scope: { 2: 'syntax_dot_dash', 3: 'script_command' }
      },
      {
        match: /^(\s*)(-\\s+~?)([a-zA-Z0-9_]+)/,
        scope: { 2: 'syntax_dot_dash', 3: 'syntax_command' }
      },
      {
        match: new RegExp(`\\b(?:${WORD_OPERATORS.join('|')})\\b|${SYMBOL_OPERATORS.join('|')}`, 'i'),
        scope: 'script_operator'
      },
      {
        match: /^(\s*)([a-zA-Z0-9_-]+)(:)/,
        scope: { 2: 'script_key', 3: 'script_colon' }
      },
      {
        match: /([a-zA-Z0-9_-]+)(:)(?=\s|$)/,
        scope: { 1: 'script_key_inline', 2: 'script_colon' }
      },
      {
        scope: 'script_quote_double',
        begin: /"/, end: /"/,
        contains: [hljs.BACKSLASH_ESCAPE, TAG]
      },
      {
        scope: 'script_quote_single',
        begin: /'/, end: /'/,
        contains: [hljs.BACKSLASH_ESCAPE, TAG]
      }
    ]
  };
});