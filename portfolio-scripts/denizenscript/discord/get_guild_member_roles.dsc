# +----+-----------------------------------------------------------------------------------+----+
# | ██ | Description:                                                                      | ██ |
# | ██ | Get a member's specific roles                                                     | ██ |
# | ██ | Returns a member object containing a list of role IDs assigned to the user        | ██ |
# +----+-----------------------------------------------------------------------------------+----+
# | ██ | Tags: `<[member_roles]>` - a list of role IDs                                     | ██ |
# +----+-----------------------------------------------------------------------------------+----+
# | ██ | Meta: https://docs.discord.com/developers/resources/guild#get-guild-member        | ██ |
# +----+-----------------------------------------------------------------------------------+----+
discord_get_guild_member_roles:
  type: task
  definitions: guild_id|user_id
  script:
    - define url_endpoint https<&co>//discord.com/api/v10/guilds/<[guild_id]>/members/<[user_id]>

    - definemap request_headers:
        User-Agent: B
        Authorization: Bot <secret[c]>

    - ~webget <[url_endpoint]> headers:<[request_headers]> method:GET save:member_response

    - define member_roles <entry[member_response].result.parse_yaml.get[roles].if_null[null]>
