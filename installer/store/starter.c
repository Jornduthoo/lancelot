// LANcelot.exe: de starter van de Store-versie (MSIX). Een pakket uit de Store moet met een .exe starten,
// en een venster vol tekst zoals bij Start LANcelot.bat hoort daar niet. Deze starter:
// - start node\node.exe server.js in de map van de app, zonder zwart venster;
// - schrijft wat de server meldt naar %LOCALAPPDATA%\LANcelot\lancelot-log.txt;
// - toont een melding als de server meteen stopt met een fout (bv. alle poorten bezet).
// De server opent zelf het leerkrachtenscherm in de browser. Draait LANcelot al, dan opent hij gewoon dat scherm.
// Gebouwd zonder C-bibliotheek (zie bouw-starter.sh): alleen kernel32 en user32.
typedef unsigned short WCHAR;
typedef unsigned long DWORD;
typedef int BOOL;
typedef void *HANDLE;
typedef unsigned short WORD;
typedef unsigned char BYTE;
typedef unsigned long long SIZE_T;

typedef struct { DWORD nLength; void *lpSecurityDescriptor; BOOL bInheritHandle; } SECURITY_ATTRIBUTES;
typedef struct {
  DWORD cb; WCHAR *lpReserved; WCHAR *lpDesktop; WCHAR *lpTitle;
  DWORD dwX, dwY, dwXSize, dwYSize, dwXCountChars, dwYCountChars, dwFillAttribute, dwFlags;
  WORD wShowWindow, cbReserved2; BYTE *lpReserved2;
  HANDLE hStdInput, hStdOutput, hStdError;
} STARTUPINFOW;
typedef struct { HANDLE hProcess, hThread; DWORD dwProcessId, dwThreadId; } PROCESS_INFORMATION;

#define API __declspec(dllimport)
API DWORD __stdcall GetModuleFileNameW(HANDLE, WCHAR *, DWORD);
API BOOL __stdcall SetCurrentDirectoryW(const WCHAR *);
API BOOL __stdcall SetEnvironmentVariableW(const WCHAR *, const WCHAR *);
API DWORD __stdcall GetEnvironmentVariableW(const WCHAR *, WCHAR *, DWORD);
API BOOL __stdcall CreateDirectoryW(const WCHAR *, SECURITY_ATTRIBUTES *);
API HANDLE __stdcall CreateFileW(const WCHAR *, DWORD, DWORD, SECURITY_ATTRIBUTES *, DWORD, DWORD, HANDLE);
API BOOL __stdcall CreateProcessW(const WCHAR *, WCHAR *, SECURITY_ATTRIBUTES *, SECURITY_ATTRIBUTES *, BOOL, DWORD, void *, const WCHAR *, STARTUPINFOW *, PROCESS_INFORMATION *);
API DWORD __stdcall WaitForSingleObject(HANDLE, DWORD);
API BOOL __stdcall GetExitCodeProcess(HANDLE, DWORD *);
API BOOL __stdcall CloseHandle(HANDLE);
API void __stdcall ExitProcess(unsigned);
API WORD __stdcall GetUserDefaultUILanguage(void);
API int __stdcall MessageBoxW(HANDLE, const WCHAR *, const WCHAR *, unsigned);

#define INVALID_HANDLE ((HANDLE)(long long)-1)
#define GENERIC_WRITE 0x40000000
#define FILE_SHARE_READ 1
#define FILE_SHARE_WRITE 2
#define CREATE_ALWAYS 2
#define FILE_ATTRIBUTE_NORMAL 0x80
#define STARTF_USESHOWWINDOW 1
#define STARTF_USESTDHANDLES 0x100
#define CREATE_NO_WINDOW 0x08000000
#define WAIT_OBJECT_0 0
#define MB_ICONWARNING 0x30

void *memset(void *d, int c, SIZE_T n) { BYTE *p = d; while (n--) *p++ = (BYTE)c; return d; }

static WCHAR map[1024], cmd[2600], logmap[1024], logbestand[1100], tekst[1600];

static int lengte(const WCHAR *s) { int n = 0; while (s[n]) n++; return n; }
static void erbij(WCHAR *doel, const WCHAR *s) { int n = lengte(doel); while (*s) doel[n++] = *s++; doel[n] = 0; }

// De melding in de taal van Windows: Nederlands, Frans, Duits, Spaans, anders Engels.
static const WCHAR *melding(int start) {
  switch (GetUserDefaultUILanguage() & 0x3ff) {
    case 0x13: return start ? L"LANcelot kon niet starten. Herstart de pc en probeer opnieuw.\n\nMeer uitleg staat in:\n" : L"LANcelot is meteen gestopt. Herstart de pc en probeer opnieuw.\n\nMeer uitleg staat in:\n";
    case 0x0c: return start ? L"LANcelot n'a pas pu d\x00e9marrer. Red\x00e9marre le PC et r\x00e9essaie.\n\nPlus d'infos dans :\n" : L"LANcelot s'est arr\x00eat\x00e9 tout de suite. Red\x00e9marre le PC et r\x00e9essaie.\n\nPlus d'infos dans :\n";
    case 0x07: return start ? L"LANcelot konnte nicht starten. Starte den PC neu und versuche es erneut.\n\nMehr Infos in:\n" : L"LANcelot wurde sofort beendet. Starte den PC neu und versuche es erneut.\n\nMehr Infos in:\n";
    case 0x0a: return start ? L"LANcelot no pudo iniciarse. Reinicia el PC e int\x00e9ntalo de nuevo.\n\nM\x00e1s informaci\x00f3n en:\n" : L"LANcelot se detuvo enseguida. Reinicia el PC e int\x00e9ntalo de nuevo.\n\nM\x00e1s informaci\x00f3n en:\n";
    default: return start ? L"LANcelot could not start. Restart the PC and try again.\n\nMore details in:\n" : L"LANcelot stopped right away. Restart the PC and try again.\n\nMore details in:\n";
  }
}

static void meld(int start) {
  tekst[0] = 0;
  erbij(tekst, melding(start));
  erbij(tekst, logbestand);
  MessageBoxW(0, tekst, L"LANcelot", MB_ICONWARNING);
}

void start(void) {
  DWORD n = GetModuleFileNameW(0, map, 1000);
  while (n > 0 && map[n - 1] != L'\\') n--;
  map[n] = 0;
  SetCurrentDirectoryW(map);
  SetEnvironmentVariableW(L"LANCELOT_OPEN", L"1");

  // Het logboek van de server, naast de gegevens van de klas.
  logmap[0] = 0;
  if (!GetEnvironmentVariableW(L"LOCALAPPDATA", logmap, 900)) erbij(logmap, map);
  else { erbij(logmap, L"\\LANcelot"); CreateDirectoryW(logmap, 0); }
  logbestand[0] = 0;
  erbij(logbestand, logmap);
  erbij(logbestand, L"\\lancelot-log.txt");
  SECURITY_ATTRIBUTES erf = { sizeof(SECURITY_ATTRIBUTES), 0, 1 };
  HANDLE log = CreateFileW(logbestand, GENERIC_WRITE, FILE_SHARE_READ | FILE_SHARE_WRITE, &erf, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, 0);

  cmd[0] = 0;
  erbij(cmd, L"\""); erbij(cmd, map); erbij(cmd, L"node\\node.exe\" \"");
  erbij(cmd, map); erbij(cmd, L"server.js\"");

  STARTUPINFOW si;
  PROCESS_INFORMATION pi;
  memset(&si, 0, sizeof si);
  memset(&pi, 0, sizeof pi);
  si.cb = sizeof si;
  si.dwFlags = STARTF_USESHOWWINDOW;
  si.wShowWindow = 0;
  if (log != INVALID_HANDLE) {
    si.dwFlags |= STARTF_USESTDHANDLES;
    si.hStdOutput = si.hStdError = log;
  }
  if (!CreateProcessW(0, cmd, 0, 0, 1, CREATE_NO_WINDOW, 0, map, &si, &pi)) {
    meld(1);
    ExitProcess(1);
  }
  // Stopt de server binnen 20 seconden met een fout, dan zeggen we dat. Anders draait hij verder zonder deze starter.
  DWORD code = 0;
  if (WaitForSingleObject(pi.hProcess, 20000) == WAIT_OBJECT_0 && GetExitCodeProcess(pi.hProcess, &code) && code != 0) meld(0);
  CloseHandle(pi.hThread);
  CloseHandle(pi.hProcess);
  if (log != INVALID_HANDLE) CloseHandle(log);
  ExitProcess(0);
}
