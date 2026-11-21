halloween_pumpkin_patch_handler:
  type: world
  debug: false
  events:
    on thunder changes:
      - if <context.thunder>:
        - flag <context.world> halloween_thundering
      - else:
        - flag <context.world> halloween_thundering:!

    on server start:
      - foreach <server.worlds> as:world:
        - if <[world].thundering>:
          - flag <[world]> halloween_thundering
        - else:
          - flag <[world]> halloween_thundering:!

    on delta time secondly every:5 server_flagged:halloween_thundering:
      - foreach <server.worlds.filter[thundering]> as:world:
        - foreach <[world].players> as:player:
          - foreach next if:<[player].has_flag[halloween_skeletons_spawned]>

          - define pumpkins <[player].location.find_blocks[pumpkin|carved_pumpkin].within[20]>
          - foreach next if:<[pumpkins].is_empty>

          # - define valid_pumpkins <[pumpkins].filter[light.sky.is_more_than[12]]>
          - define valid_pumpkins <[pumpkins].filter_tag[<[filter_value].above[1].to_cuboid[<[filter_value].above[4]>].blocks[material.name.equals[air]]>]>
          - foreach next if:<[valid_pumpkins].is_empty>

          - foreach <[valid_pumpkins].random[3]> as:location:
            - define spawn_location <[location].center.below[0.5]>
            - modifyblock <[location]> air
            - playeffect effect:block_crack at:<[location].center> special_data:pumpkin quantity:30 offset:0.3
            - strike <[spawn_location]> no_damage
            - spawn skeleton[equipment=air|air|air|jack_o_lantern] <[spawn_location]>
            - playsound sound:entity.skeleton.ambient at:<[spawn_location]>
            - if <util.random_chance[60]>:
              - drop pumpkin_seeds <[location].center> quantity:<util.random.int[1].to[3]>
            - wait 5t

          - flag <[player]> halloween_skeletons_spawned expire:20m
