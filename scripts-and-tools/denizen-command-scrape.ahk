#Requires AutoHotkey v2.0

repos := [
  "https://api.github.com/repos/DenizenScript/Denizen-Core/git/trees/master?recursive=1",
  "https://api.github.com/repos/DenizenScript/Denizen/git/trees/dev?recursive=1"
]

commands := Map()

for url in repos {
  http := ComObject("WinHttp.WinHttpRequest.5.1")
  http.Open("GET", url, true)
  http.SetRequestHeader("User-Agent", "Denizen-Scraper")
  http.Send()
  http.WaitForResponse()

  jsonText := http.ResponseText
  pos := 1
  
  while (pos := RegExMatch(jsonText, "i)/commands/[^`"]*?([^/`"]+)Command\.java`"", &match, pos)) {
    cmdName := StrLower(match[1])
    commands[cmdName] := true
    pos += match.Len[0]
  }
}

output := ""
for cmd in commands {
  output .= cmd "`n"
}

output := Sort(output, "U")

if FileExist("DenizenCommands.txt") {
  FileDelete("DenizenCommands.txt")
}

FileAppend(output, "DenizenCommands.txt")
Run("DenizenCommands.txt")
