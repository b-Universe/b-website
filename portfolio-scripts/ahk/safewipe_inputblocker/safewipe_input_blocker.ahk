#Requires AutoHotkey v2.0
#SingleInstance Force

; | ██ [ Configuration ] ██

global ICON_PATH := A_ScriptDir "\favicon.ico"
global DEFAULT_SECONDS := 30

global COLOR_BG    := "0B1216"
global COLOR_PANEL   := "0D171B"
global COLOR_PANEL_ON  := "10373C"

global COLOR_CONTROL   := "0C1519"

global COLOR_BUTTON  := "111B20"
global COLOR_BUTTON_ON := "123B40"

global COLOR_BORDER  := "42525A"
global COLOR_ACCENT  := "00E0FF"

global COLOR_TEXT    := "FFFFFF"
global COLOR_MUTED   := "8FB8CA"


; | ██ [ State ] ██

global KeyboardLocked := false
global MouseLocked := false

global KeyboardHook := 0

global KeyboardUnlockAt := 0
global MouseUnlockAt := 0


; | ██ [ GUI controls ] ██

global MainGui

global KeyboardRow
global MouseRow

global KeyboardSeconds
global MouseSeconds

global KeyboardStatus
global MouseStatus

global KeyboardButton
global MouseButton

global StartupFocus


; | ██ [ Start ] ██

CreateWindow()

SetTimer(
  UpdateCountdowns,
  200
)


; | ██ [ Emergency unlock ] ██

^!+F12::UnlockAll()


; | ██ [ Mouse lock hotkeys ] ██
;
; These remain usable while the mouse is locked.
; Enter or Space provides the normal keyboard unlock.

#HotIf MouseLocked

Enter::UnlockMouse()
NumpadEnter::UnlockMouse()
Space::UnlockMouse()

*LButton::Return
*RButton::Return
*MButton::Return

*XButton1::Return
*XButton2::Return

*WheelUp::Return
*WheelDown::Return
*WheelLeft::Return
*WheelRight::Return

#HotIf


; | ██ [ Create window ] ██

CreateWindow() {
  global MainGui

  global KeyboardRow
  global MouseRow

  global KeyboardSeconds
  global MouseSeconds

  global KeyboardStatus
  global MouseStatus

  global KeyboardButton
  global MouseButton

  global StartupFocus

  global DEFAULT_SECONDS

  global COLOR_BG
  global COLOR_TEXT
  global COLOR_MUTED

  global ICON_PATH


  ; | ██ [ Main window ] ██

  MainGui := Gui(
    "+AlwaysOnTop",
    "Cleaning Lock"
  )

  MainGui.BackColor := COLOR_BG
  MainGui.MarginX := 0
  MainGui.MarginY := 0

  MainGui.OnEvent(
    "Close",
    (*) => ExitCleanly()
  )


  ; A native, off-canvas Button gives the window a focus target that is
  ; not one of the duration fields.  It remains outside the client area.
  StartupFocus := MainGui.AddButton(
    "x-1 y-1 w1 h1",
    ""
  )


  ; | ██ [ Header ] ██

  MainGui.SetFont(
    "s15 Bold c" COLOR_TEXT,
    "Segoe UI"
  )

  MainGui.AddText(
    "x22 y22 w396 h30 Center BackgroundTrans",
    "Cleaning Lock"
  )

  MainGui.SetFont(
    "s9 Norm c" COLOR_MUTED,
    "Segoe UI"
  )

  MainGui.AddText(
    "x22 y57 w396 h22 Center BackgroundTrans",
    "Disable either input device while you clean it."
  )


  ; | ██ [ Keyboard row ] ██

  KeyboardRow := CreateDeviceRow(
    MainGui,
    22,
    96,
    396,
    64,
    "⌨",
    "Keyboard"
  )

  KeyboardSeconds := CreateDarkEdit(
    MainGui,
    228,
    109,
    52,
    36,
    DEFAULT_SECONDS
  )

  MainGui.SetFont(
    "s9 c" COLOR_MUTED,
    "Segoe UI"
  )

  MainGui.AddText(
    "x288 y117 w28 h22 BackgroundTrans",
    "sec"
  )

  KeyboardButton := CreateDarkButton(
    MainGui,
    326,
    105,
    78,
    44,
    "🔒  Lock",
    ToggleKeyboard
  )


  ; | ██ [ Mouse row ] ██

  MouseRow := CreateDeviceRow(
    MainGui,
    22,
    171,
    396,
    64,
    "🖱",
    "Mouse"
  )

  MouseSeconds := CreateDarkEdit(
    MainGui,
    228,
    184,
    52,
    36,
    DEFAULT_SECONDS
  )

  MainGui.SetFont(
    "s9 c" COLOR_MUTED,
    "Segoe UI"
  )

  MainGui.AddText(
    "x288 y192 w28 h22 BackgroundTrans",
    "sec"
  )

  MouseButton := CreateDarkButton(
    MainGui,
    326,
    180,
    78,
    44,
    "🔒  Lock",
    ToggleMouse
  )


  ; | ██ [ Status ] ██

  KeyboardStatus := MainGui.AddText(
    "x22 y266 w396 h22 Center c" COLOR_MUTED " BackgroundTrans",
    "⌨  Keyboard:  Not locked"
  )


  MouseStatus := MainGui.AddText(
    "x22 y296 w396 h22 Center c" COLOR_MUTED " BackgroundTrans",
    "🖱  Mouse:  Not locked"
  )


  ; | ██ [ Unlock both ] ██

  CreateDarkButton(
    MainGui,
    22,
    333,
    396,
    44,
    "🔓  Unlock Both",
    (*) => UnlockAll()
  )


  ; | ██ [ Emergency information ] ██

  MainGui.SetFont(
    "s8 c" COLOR_MUTED,
    "Segoe UI"
  )

  MainGui.AddText(
    "x22 y398 w396 h36 Center BackgroundTrans",
    "Emergency unlock:`nCtrl + Alt + Shift + F12"
  )


  ; | ██ [ Show window ] ██

  MainGui.Show(
    "w440 h452"
  )

  ; Defer this until Windows completes its initial focus assignment.
  SetTimer(
    ClearInitialInputSelection,
    -100
  )

  EnableDarkTitleBar(
    MainGui.Hwnd
  )

  try SetWindowIcon(
    MainGui.Hwnd,
    ICON_PATH
  )
}


; | ██ [ Clear initial input selection ] ██

ClearInitialInputSelection() {
  global KeyboardSeconds
  global StartupFocus


  ; EM_SETSEL: collapse the Edit selection at the start of its value.
  SendMessage(
    0x00B1,
    0,
    0,
    ,
    "ahk_id " KeyboardSeconds.Hwnd
  )


  ; Move focus to the invisible native Button, not to the Edit control.
  StartupFocus.Focus()
}


; | ██ [ Device row ] ██

CreateDeviceRow(gui, x, y, width, height, icon, label) {
  global COLOR_PANEL
  global COLOR_BORDER
  global COLOR_TEXT


  ; | ██ [ Outer border ] ██

  Border := gui.AddText(
    "x" x
    " y" y
    " w" width
    " h" height
    " Background" COLOR_BORDER
  )


  ; | ██ [ Inner face ] ██
  ;
  ; One pixel smaller on every side so all four
  ; edges of the border remain visible.

  Face := gui.AddText(
    "x" (x + 1)
    " y" (y + 1)
    " w" (width - 2)
    " h" (height - 2)
    " Background" COLOR_PANEL
  )


  ; | ██ [ Icon ] ██

  gui.SetFont(
    "s13 c" COLOR_TEXT,
    "Segoe UI Emoji"
  )

  IconText := gui.AddText(
    "x" (x + 22)
    " y" (y + 18)
    " w36 h28 Center BackgroundTrans",
    icon
  )


  ; | ██ [ Label ] ██

  gui.SetFont(
    "s12 c" COLOR_TEXT,
    "Segoe UI"
  )

  LabelText := gui.AddText(
    "x" (x + 70)
    " y" (y + 19)
    " w130 h28 BackgroundTrans",
    label
  )


  return {
    Border: Border,
    Face: Face,
    Icon: IconText,
    Label: LabelText
  }
}


; | ██ [ Dark duration input ] ██

CreateDarkEdit(gui, x, y, width, height, value) {
  global COLOR_CONTROL
  global COLOR_BORDER
  global COLOR_TEXT


  ; | ██ [ Border ] ██

  gui.AddText(
    "x" x
    " y" y
    " w" width
    " h" height
    " Background" COLOR_BORDER
  )


  ; | ██ [ Input ] ██
  ;
  ; Leave two pixels inside the border.  Native Edit controls can paint
  ; into their final pixel, which otherwise hides the bottom edge.

  gui.SetFont(
    "s11 c" COLOR_TEXT,
    "Segoe UI"
  )

  EditControl := gui.AddEdit(
    "x" (x + 2)
    " y" (y + 2)
    " w" (width - 4)
    " h" (height - 4)
    " Center Number"
    " Background" COLOR_CONTROL
    " c" COLOR_TEXT
    " -E0x200",
    value
  )

  return EditControl
}


; | ██ [ Dark button ] ██

CreateDarkButton(gui, x, y, width, height, text, callback) {
  global COLOR_BUTTON
  global COLOR_BORDER
  global COLOR_TEXT


  ; | ██ [ Four-sided border ] ██
  ;
  ; Border occupies the full requested size.

  Border := gui.AddText(
    "x" x
    " y" y
    " w" width
    " h" height
    " Background" COLOR_BORDER
  )


  ; | ██ [ Button face ] ██
  ;
  ; Inset by two pixels on every side.  Static text controls can
  ; paint into their final pixel, so the extra pixel keeps the
  ; bottom border fully visible at every DPI scale.
  ;
  ; This leaves:
  ;
  ;   2px top
  ;   2px left
  ;   2px right
  ;   2px bottom

  Face := gui.AddText(
    "x" (x + 2)
    " y" (y + 2)
    " w" (width - 4)
    " h" (height - 4)
    " Center 0x200"
    " Background" COLOR_BUTTON
    " c" COLOR_TEXT,
    text
  )

  Face.SetFont(
    "s10 c" COLOR_TEXT,
    "Segoe UI"
  )

  Face.OnEvent(
    "Click",
    callback
  )


  return {
    Border: Border,
    Face: Face
  }
}


; | ██ [ Toggle keyboard ] ██

ToggleKeyboard(*) {
  global KeyboardLocked

  if KeyboardLocked {
    UnlockKeyboard()
    return
  }

  LockKeyboard()
}


; | ██ [ Lock keyboard ] ██

LockKeyboard() {
  global KeyboardLocked
  global KeyboardHook
  global KeyboardUnlockAt

  global KeyboardSeconds
  global KeyboardButton
  global KeyboardRow


  seconds := ReadSeconds(
    KeyboardSeconds
  )

  if seconds <= 0
    return


  ; | ██ [ Suppress keyboard input ] ██

  KeyboardHook := InputHook()

  KeyboardHook.KeyOpt(
    "{All}",
    "S"
  )

  KeyboardHook.VisibleText := false
  KeyboardHook.VisibleNonText := false

  KeyboardHook.Start()


  ; | ██ [ Begin timer ] ██

  KeyboardLocked := true

  KeyboardUnlockAt :=
    A_TickCount + (seconds * 1000)


  ; | ██ [ Update interface ] ██

  SetRowActive(
    KeyboardRow,
    true
  )

  SetButtonActive(
    KeyboardButton,
    true,
    "🔓  Unlock"
  )

  UpdateKeyboardStatus()
}


; | ██ [ Unlock keyboard ] ██

UnlockKeyboard() {
  global KeyboardLocked
  global KeyboardHook
  global KeyboardUnlockAt

  global KeyboardButton
  global KeyboardRow
  global KeyboardStatus

  global COLOR_MUTED


  ; | ██ [ Release keyboard ] ██

  if IsObject(KeyboardHook)
    KeyboardHook.Stop()

  KeyboardHook := 0

  KeyboardLocked := false
  KeyboardUnlockAt := 0


  ; | ██ [ Restore interface ] ██

  SetRowActive(
    KeyboardRow,
    false
  )

  SetButtonActive(
    KeyboardButton,
    false,
    "🔒  Lock"
  )

  KeyboardStatus.SetFont(
    "c" COLOR_MUTED
  )

  KeyboardStatus.Text := "⌨  Keyboard:  Not locked"
}


; | ██ [ Toggle mouse ] ██

ToggleMouse(*) {
  global MouseLocked

  if MouseLocked {
    UnlockMouse()
    return
  }

  LockMouse()
}


; | ██ [ Lock mouse ] ██

LockMouse() {
  global MouseLocked
  global MouseUnlockAt

  global MouseSeconds
  global MouseButton
  global MouseRow


  seconds := ReadSeconds(
    MouseSeconds
  )

  if seconds <= 0
    return


  ; | ██ [ Begin timer ] ██

  MouseLocked := true

  MouseUnlockAt :=
    A_TickCount + (seconds * 1000)


  ; | ██ [ Disable mouse movement ] ██

  BlockInput(
    "MouseMove"
  )


  ; | ██ [ Update interface ] ██

  SetRowActive(
    MouseRow,
    true
  )

  SetButtonActive(
    MouseButton,
    true,
    "🔓  Unlock"
  )

  UpdateMouseStatus()
}


; | ██ [ Unlock mouse ] ██

UnlockMouse() {
  global MouseLocked
  global MouseUnlockAt

  global MouseButton
  global MouseRow
  global MouseStatus

  global COLOR_MUTED


  ; | ██ [ Release mouse ] ██

  BlockInput(
    "MouseMoveOff"
  )

  MouseLocked := false
  MouseUnlockAt := 0


  ; | ██ [ Restore interface ] ██

  SetRowActive(
    MouseRow,
    false
  )

  SetButtonActive(
    MouseButton,
    false,
    "🔒  Lock"
  )

  MouseStatus.SetFont(
    "c" COLOR_MUTED
  )

  MouseStatus.Text := "🖱  Mouse:  Not locked"
}


; | ██ [ Unlock everything ] ██

UnlockAll() {
  UnlockKeyboard()
  UnlockMouse()
}


; | ██ [ Update countdowns ] ██

UpdateCountdowns() {
  global KeyboardLocked
  global MouseLocked

  if KeyboardLocked
    UpdateKeyboardStatus()

  if MouseLocked
    UpdateMouseStatus()
}


; | ██ [ Keyboard countdown ] ██

UpdateKeyboardStatus() {
  global KeyboardLocked
  global KeyboardUnlockAt
  global KeyboardStatus

  global COLOR_ACCENT


  if !KeyboardLocked
    return


  remainingSeconds := GetRemainingSeconds(
    KeyboardUnlockAt
  )


  if remainingSeconds <= 0 {
    UnlockKeyboard()
    return
  }


  KeyboardStatus.SetFont(
    "c" COLOR_ACCENT
  )

  KeyboardStatus.Text :=
    "⌨  Keyboard:  Locked (" remainingSeconds "s remaining)"
}


; | ██ [ Mouse countdown ] ██

UpdateMouseStatus() {
  global MouseLocked
  global MouseUnlockAt
  global MouseStatus

  global COLOR_ACCENT


  if !MouseLocked
    return


  remainingSeconds := GetRemainingSeconds(
    MouseUnlockAt
  )


  if remainingSeconds <= 0 {
    UnlockMouse()
    return
  }


  MouseStatus.SetFont(
    "c" COLOR_ACCENT
  )

  MouseStatus.Text :=
    "🖱  Mouse:  Locked (" remainingSeconds "s remaining)"
}


; | ██ [ Calculate remaining time ] ██

GetRemainingSeconds(unlockAt) {
  remainingMilliseconds :=
    unlockAt - A_TickCount

  if remainingMilliseconds <= 0
    return 0

  return Ceil(
    remainingMilliseconds / 1000
  )
}


; | ██ [ Validate duration ] ██

ReadSeconds(control) {
  value := Trim(
    control.Value
  )


  ; | ██ [ Require whole seconds ] ██

  if !RegExMatch(
    value,
    "^\d+$"
  ) {
    SoundBeep(
      700,
      100
    )

    return 0
  }


  seconds := value + 0


  ; | ██ [ Require positive duration ] ██

  if seconds <= 0 {
    SoundBeep(
      700,
      100
    )

    return 0
  }


  return seconds
}


; | ██ [ Device row state ] ██

SetRowActive(row, active) {
  global COLOR_BORDER
  global COLOR_ACCENT

  global COLOR_PANEL
  global COLOR_PANEL_ON


  if active {
    row.Border.Opt(
      "Background" COLOR_ACCENT
    )

    row.Face.Opt(
      "Background" COLOR_PANEL_ON
    )
  }
  else {
    row.Border.Opt(
      "Background" COLOR_BORDER
    )

    row.Face.Opt(
      "Background" COLOR_PANEL
    )
  }


  row.Border.Redraw()
  row.Face.Redraw()
}


; | ██ [ Button state ] ██

SetButtonActive(button, active, text) {
  global COLOR_BORDER
  global COLOR_ACCENT

  global COLOR_BUTTON
  global COLOR_BUTTON_ON


  if active {
    button.Border.Opt(
      "Background" COLOR_ACCENT
    )

    button.Face.Opt(
      "Background" COLOR_BUTTON_ON
    )
  }
  else {
    button.Border.Opt(
      "Background" COLOR_BORDER
    )

    button.Face.Opt(
      "Background" COLOR_BUTTON
    )
  }


  button.Face.Text := text

  button.Border.Redraw()
  button.Face.Redraw()
}


; | ██ [ Dark native title bar ] ██

EnableDarkTitleBar(hwnd) {
  darkModeEnabled := Buffer(
    4,
    0
  )

  NumPut(
    "Int",
    1,
    darkModeEnabled
  )


  ; | ██ [ Windows 11 / newer Windows 10 ] ██

  try DllCall(
    "dwmapi\DwmSetWindowAttribute",
    "Ptr", hwnd,
    "Int", 20,
    "Ptr", darkModeEnabled,
    "Int", 4
  )


  ; | ██ [ Older Windows 10 ] ██

  try DllCall(
    "dwmapi\DwmSetWindowAttribute",
    "Ptr", hwnd,
    "Int", 19,
    "Ptr", darkModeEnabled,
    "Int", 4
  )
}


; | ██ [ Window icon ] ██

SetWindowIcon(hwnd, iconPath) {
  if !FileExist(iconPath)
    return


  ; IMAGE_ICON = 1
  ; LR_LOADFROMFILE = 0x10

  largeIcon := DllCall(
    "LoadImage",
    "Ptr", 0,
    "Str", iconPath,
    "UInt", 1,
    "Int", 32,
    "Int", 32,
    "UInt", 0x10,
    "Ptr"
  )

  smallIcon := DllCall(
    "LoadImage",
    "Ptr", 0,
    "Str", iconPath,
    "UInt", 1,
    "Int", 16,
    "Int", 16,
    "UInt", 0x10,
    "Ptr"
  )


  ; | ██ [ WM_SETICON ] ██

  if largeIcon {
    SendMessage(
      0x0080,
      1,
      largeIcon,
      ,
      "ahk_id " hwnd
    )
  }

  if smallIcon {
    SendMessage(
      0x0080,
      0,
      smallIcon,
      ,
      "ahk_id " hwnd
    )
  }
}


; | ██ [ Exit safely ] ██

ExitCleanly() {
  UnlockAll()
  ExitApp()
}
