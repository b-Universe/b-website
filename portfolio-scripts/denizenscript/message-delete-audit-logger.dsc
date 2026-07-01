discord_deletion_handler:
  type: world
  debug: false
  events:
    on discord message deleted:
      # % ██ [ Base definitions                                 ] ██
      - define channel_id <context.channel.id>

      # % ██ [ Check if the message was valid, or not           ] ██
      - if <context.old_message_valid>:
        - define message <context.old_message>
        - define user <[message].author>
        - stop if:<[user].id.equals[905309299524382811]>

      # % ██ [ Construct the embed                              ] ██
        - definemap embed_data:
            color: <color[0,255,254]>
            author_name: <[user].name>
            author_icon_url: <[user].avatar_url>
            description: <[message].text>
            title: "`[<&ns><context.channel.name>]` Click for reference"
            title_url: <[message].previous_messages[1].first.url.if_null[https<&co>//discord.com/channels/901618453356630046/<[channel_id]>]>

      # % ██ [ Add the replied message as context, if it exists ] ██
        - define replied_message <[message].replied_to.if_null[null]>
        - if <[replied_message].is_truthy>:
          - define embed_data.footer "<[replied_message].author.name><&co> <[replied_message].text.substring[0,100]>"
          - define embed_data.footer_icon <[replied_message].author.avatar_url>

      # % ██ [ Send the message ] ██
        - define embed <discord_embed.with_map[<[embed_data]>]>
        - discordmessage id:c channel:1087146392755126312 <[embed]>

      # % ██ [ Response for if the data is invalid              ] ██
      - else:
        - definemap embed_data:
            color: <color[254,0,0]>
            footer: A message was deleted but was lost before it could be cached.
            footer_icon: https<&co>//cdn.discordapp.com/emojis/901634983867842610.gif
        - discordmessage id:c channel:1087146392755126312 <[embed]>
