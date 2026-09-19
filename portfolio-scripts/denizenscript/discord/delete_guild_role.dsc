# +----+-----------------------------------------------------------------------------+----+
# | ██ | Description:                                                                | ██ |
# | ██ | Delete a role from the guild                                                | ██ |
# | ██ | Requires the `MANAGE_ROLES` permission                                      | ██ |
# | ██ | Returns a 204 empty response on success                                     | ██ |
# | ██ | Fires a `Guild Role Delete` Gateway event                                   | ██ |
# +----+-----------------------------------------------------------------------------+----+
# | ██ | Tags: None                                                                  | ██ |
# +----+-----------------------------------------------------------------------------+----+
# | ██ | Meta: https://docs.discord.com/developers/resources/guild#delete-guild-role | ██ |
# +----+-----------------------------------------------------------------------------+----+
discord_delete_guild_role:
  type: task
  definitions: guild_id|role_id
  script:
    - define url_endpoint https<&co>//discord.com/api/v10/guilds/<[guild_id]>/roles/<[role_id]>

    - definemap request_headers:
        User-Agent: B
        Authorization: Bot <secret[c]>
        X-Audit-Log-Reason: Automated role deletion via Denizen script

    - ~webget <[url_endpoint]> headers:<[request_headers]> method:DELETE
