# +----+-----------------------------------------------------------------------------+----+
# | ██ | Description:                                                                | ██ |
# | ██ | Modify an existing role for the guild                                       | ██ |
# | ██ | Requires the `MANAGE_ROLES` permission                                      | ██ |
# | ██ | Returns the updated role object on success                                  | ██ |
# | ██ | Fires a `Guild Role Update` Gateway event                                   | ██ |
# | ██ | All `JSON` params are optional                                              | ██ |
# +----+-----------------------------------------------------------------------------+----+
# | ██ | Tags: `<[role_id]>` - the ID of the role modified                           | ██ |
# +----+-----------------------------------------------------------------------------+----+
# | ██ | Meta: https://docs.discord.com/developers/resources/guild#modify-guild-role | ██ |
# +----+-----------------------------------------------------------------------------+----+
discord_modify_guild_role:
  type: task
  definitions: guild_id|role_id|permissions|role_name
  script:
    - define url_endpoint https<&co>//discord.com/api/v10/guilds/<[guild_id]>/roles/<[role_id]>

    - definemap request_headers:
        User-Agent: B
        Authorization: Bot <secret[c]>
        Content-Type: application/json
        X-Audit-Log-Reason: Automated role modification via Denizen script

    - definemap role_payload_map:
        name: <[role_name]>
        permissions: <[permissions]>
        color: <[color].rgb_integer>
        hoist: true
        # Input is a raw emoji, eg: 🪐, 💬, and 🦽
        unicode_emoji: null
        mentionable: true

    - define role_payload <[role_payload_map].to_json>
    - ~webget <[url_endpoint]> data:<[role_payload]> headers:<[request_headers]> method:PATCH save:role_response

    - define role_id <entry[role_response].result.parse_yaml.get[id].if_null[null]>
