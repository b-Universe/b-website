silky_spawners:
    type: world
    debug: false
    events:
        on player breaks spawner with:*pickaxe:
            - if !<player.item_in_hand.enchantment_map.contains[silk_touch]>:
                - stop
            - define type <context.location.spawner_type.entity_type>
            - determine "spawner[display_name=<[type].to_titlecase> Spawner;spawner_type=<[type]>]"
