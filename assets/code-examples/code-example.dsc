# # ██ [ A fancy header comment! ] ██ # #
# % ██ [ Made by Bear Riley      ] ██ % #
# todo: Make this fancier with hover displays!
my_custom_command:
  type: command
  name: checkstatus
  usage: /checkstatus [player]
  description: Checks the online status of a player.
  sub_script:
    used_wrongly:
      - narrate "<red>Command used wrongly!<reset>"
      - narrate "Just use syntax: <&[emphasis]>/checkstatus [player]"
  script:
    # Check if command was used wrongly
    - if <context.args.is_empty> || <context.args.size> > 1:
      - inject my_custom_command.sub_script.used_wrongly

    # Standard Definitions
    - define player_name <context.args.first>

    # Check the player's status
    - if <[player].is_online>:
      - narrate "<[player].name> is <green>ONLINE<reset>!"
      - narrate "Current location: <[player].location.formatted>"

    - else:
      - narrate "<[player].name> is <red>OFFLINE<reset>."
