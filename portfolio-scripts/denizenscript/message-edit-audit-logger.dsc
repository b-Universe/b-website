discord_view_edit_command_create:
  type: task
  debug: false
  script:
    - ~discordcommand id:c create group:901618453356630046 name:View_Edit type:message "description:Shows you the edit history of this message, if any."

discord_view_edit_command_handler:
  type: world
  debug: false
  events:
    on discord message modified:
      - define message <context.new_message>
      - if <context.old_message_valid>:
        - if !<[message].has_flag[behr.discord.message.original_message]>:
          - flag <[message]> behr.discord.message.original_message:<context.old_message.text> expire:30d
      - flag <[message]> behr.discord.message.edited_messages.<util.time_now.epoch_millis>:<[message].text> expire:30d

    on discord message command name:view_edit:
      #- ~discordinteraction defer interaction:<context.interaction>
      - define message <context.interaction.target_message>
      - if !<[message].was_edited>:
        - definemap embed_data:
            footer: This message has never been modfied.
            color: <color[100,0,0]>
            footer_icon: https://cdn.discordapp.com/emojis/901634983867842610.gif

        - ~discordinteraction reply interaction:<context.interaction> ephemeral <discord_embed.with_map[<[embed_data]>]>
        - stop

      - define embed_data.color <color[0,254,255]>

      - define embed_data.description <list>
      - if <[message].has_flag[behr.discord.message.original_message]>:
        - define embed_data.description <[embed_data.description].include_single[📒 **Original Message**]>
        - define original_message <[message].flag[behr.discord.message.original_message]>
        - define original_message <[original_message].replace_text[<n>].with[<n><&gt> ]>
        - define embed_data.description <[embed_data.description].include_single[<&gt> <[original_message]><n>]>
      - else:
        - define embed_data.description <[embed_data.description].include_single[📕 **Note**]>
        - define embed_data.description <[embed_data.description].include_single[<&gt> Original message failed to cache.<n>]>

      - if <[message].has_flag[behr.discord.message.edited_messages]>:
        - foreach <[message].flag[behr.discord.message.edited_messages]> as:old_message:
          - define embed_data.description <[embed_data.description].include_single[<&co>warning<&co> **Edit `<[loop_index]>`** (New message)]>
          - define old_message <[old_message].replace_text[<n>].with[<n><&gt> ]>

          - if <[embed_data.description].include_single[<&gt> <[old_message]><n>].separated_by[<n>].length> > 4000:
            - define embed_data.description <[embed_data.description].remove[1|2]>
            - define embed_data.footer "Note<&co> This message was truncated due to being over 4000 characters."
            - define embed_data.color <color[100,0,0]>
            - define embed_data.footer_icon https://cdn.discordapp.com/emojis/901634983867842610.gif

          - define embed_data.description <[embed_data.description].include_single[<&gt> <[old_message]><n>]>

      - define embed_data.description <[embed_data.description].separated_by[<n>]>

      - ~discordinteraction reply interaction:<context.interaction> ephemeral <discord_embed.with_map[<[embed_data]>]>