if_time_is_money_then_how_long_is_a_dollar:
  type: world
  events:
    after system time minutely every:10:
      - money give quantity:100 players:<server.online_players>
