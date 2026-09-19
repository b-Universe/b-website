# +----+-----------------------------------------------------------------------------+----+
# | ██ | Description:                                                                | ██ |
# | ██ | Get a list of all roles for the guild                                       | ██ |
# | ██ | Returns an array of role objects                                            | ██ |
# +----+-----------------------------------------------------------------------------+----+
# | ██ | Tags: `<[roles_data]>` - the parsed list of role objects                    | ██ |
# +----+-----------------------------------------------------------------------------+----+
# | ██ | Meta: https://docs.discord.com/developers/resources/guild#get-guild-roles   | ██ |
# +----+-----------------------------------------------------------------------------+----+
discord_get_guild_roles:
  type: task
  definitions: guild_id
  script:
    - define url_endpoint https<&co>//discord.com/api/v10/guilds/<[guild_id]>/roles

    - definemap request_headers:
        User-Agent: B
        Authorization: Bot <secret[c]>

    - ~webget <[url_endpoint]> headers:<[request_headers]> method:GET save:roles_response

    - define roles_data <entry[roles_response].result.parse_yaml.if_null[null]>
