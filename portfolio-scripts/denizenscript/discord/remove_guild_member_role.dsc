# +----+--------------------------------------------------------------------------------------+----+
# | ██ | Description:                                                                         | ██ |
# | ██ | Remove a role from a guild member                                                    | ██ |
# | ██ | Requires the `MANAGE_ROLES` permission                                               | ██ |
# | ██ | Returns a 204 empty response on success                                              | ██ |
# | ██ | Fires a `Guild Member Update` Gateway event                                          | ██ |
# +----+--------------------------------------------------------------------------------------+----+
# | ██ | Tags: None                                                                           | ██ |
# +----+--------------------------------------------------------------------------------------+----+
# | ██ | Meta: https://docs.discord.com/developers/resources/guild#remove-guild-member-role   | ██ |
# +----+--------------------------------------------------------------------------------------+----+
discord_remove_guild_member_role:
  type: task
  definitions: guild_id|user_id|role_id
  script:
    - define url_endpoint https<&co>//discord.com/api/v10/guilds/<[guild_id]>/members/<[user_id]>/roles/<[role_id]>

    - definemap request_headers:
        User-Agent: B
        Authorization: Bot <secret[c]>
        X-Audit-Log-Reason: Automated member role removal via Denizen script

    - ~webget <[url_endpoint]> headers:<[request_headers]> method:DELETE
