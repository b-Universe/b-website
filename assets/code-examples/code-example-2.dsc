# DenizenScript Example File
#+ ---------------------------------
#| A simple 'hello world' script
#+ ---------------------------------

#todo: Check if this syntax is right
hello_world:
    type: task
    debug: false
    script:
        # Define a player variable
        - define who_to_greet <player>

        # Use a string with nested tags and brackets
        - narrate "Hello <[who_to_greet].name>! You look amazing today! <&lt>3"

        # Check a flag on the player
        - if <player.has_flag[looking_amazing]>:
            - narrate "I've flagged you as looking amazing before!"

        # An inline tag that returns a random UUID
        - flag <player> temp_uuid:<util.random_uuid>

##ignorewarning invalid_data_line_quotes
# -    We ignore this warning because we
# -  know you should never wrap lines in
# -  quotes. keys do not require quotes.
inline_keys:
  type: data
  inventory_script_container:
    lore:
      - This is just lore text, the word 'narrate' will not be colored as a command here.
      - 'But I can use <player> tags inside single quotes.'
      - It is a key of type 'not_script_key'.
