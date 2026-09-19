# @ ██ [ Command syntax:                                                            ] ██:
# - ██ [ /dmmo [name]         | Saves the item in your hand as "[name]"             ] ██
# - ██ [ /dmmo [name] remove  | Removes the saved item named "[name]"               ] ██
# - ██ [ /dmmo list           | Lists all of the currently saved dmmo items         ] ██

# @ ██ [ To use within scripts:                                                     ] ██:
# | ██ [ Tag usage: <server.flag[behr.denizen.dmmo_items.<[item_name]>]>        ] ██
# @ ██ [ Example:   <server.flag[behr.denizen.dmmo_items.my_fancy_item]>        ] ██
# | ██ [ Returns: ItemTag of the saved item.                                        ] ██

# @ ██ [ When comparing it to other items, use the item's flag name `dmmo_name`     ] ██:
# @ ██ [ Example 1:                                                                 ] ██
# - ██ [ - define my_held_item <player.item_in_hand>                                ] ██
# - ██ [ - if <[my_held_item].flag[dmmo_name].if_null[null]> == my_fancy_item:      ] ██
# - ██ [   - narrate "You're holding my fancy item!                                 ] ██

# @ ██ [ Example 2:                                                                 ] ██:
# - ██ [ on player clicks block:                                                    ] ██
# - ██ [ - define item_clicked_with <context.item>                                  ] ██
# - ██ [ - if <[item_clicked_with].flag[dmmo_name].if_null[null]> == my_fancy_item: ] ██
# - ██ [   - narrate "You're clicking with my fancy item!"                          ] ██

# @ ██ [ When checking if an inventory contains this item use the                   ] ██:
# | ██ [ InventoryTag.contains_item[item_flagged:<dmmo_name>] tag                   ] ██
# - ██ [ Example: <player.inventory.contains_item[item_flagged:my_fancy_item]>      ] ██
# | ██ [ Returns: TRUE / FALSE                                                      ] ██
dmmo_item_command:
  type: command
  name: dmmo
  description: Saves a mmo item to a flag to be used with scripts
  usage: /dmmo [[name] (remove)] / [list]
  permission: denizen.dmmo
  tab completion:
    1: <server.flag[behr.denizen.dmmo_items].parse[name].if_null[<list>]>
    2: remove
  script:
    - choose <context.args.size>:
      - case 1:
        - define item_name <context.args.first>
        - if <[item_name]> == list:
          - if !<server.has_flag[behr.denizen.dmmo_items]>:
            - narrate "<&[error]>There are currently no dmmo items saved."
            - stop

          - define items <server.flag[behr.denizen.dmmo_items]>
          - define count <[items].size>
          - narrate "<&b><[count]> total dmmo items<&co><n><&a><[items].keys.separated_by[<n>]>"
          - stop

        - if <server.has_flag[behr.denizen.dmmo_items.<[item_name]>]>:
          - narrate "<&[error]>There is already an item saved under the name <[item_name]>"
          - stop

        - if <player.item_in_hand> matches air:
          - narrate "<&[error]>You must be holding an item to name"
          - stop

        - define item <player.item_in_hand.with_flag[dmmo_name:<[item_name]>]>
        - flag server behr.denizen.dmmo_items.<[item_name]>:<[item]>
        - narrate "<&a><[item]> saved as dmmo item successfully"

      - case 2:
        - if <context.args.last> != remove:
          - narrate "<&[error]>Invalid usage - <&[emphasis]>/dmmo [name] (remove)"
          - stop

        - define item_name <context.args.first>
        - if !<server.has_flag[behr.denizen.dmmo_items.<[item_name]>]>:
          - narrate "<&[error]>There is no item saved under the name <[item_name]>"
          - stop

        - flag server behr.denizen.dmmo_items.<[item_name]>:!
        - narrate "<&a><[item]> dmmo item removed successfully"

      - default:
        - narrate "<&[error]>Invalid usage - <&[emphasis]>/dmmo [name] (remove)"
