#!/bin/sh
# Bouwt LANcelot.exe (starter.c) voor Windows x64 met clang en lld, zonder Windows SDK of C-bibliotheek.
# Nodig: clang, lld-link, llvm-dlltool, llvm-rc (Linux: apt install clang lld llvm).
set -e
HIER=$(cd "$(dirname "$0")" && pwd)
UIT=${1:-$HIER/uit}
TMP=$(mktemp -d)
mkdir -p "$UIT"
printf 'LIBRARY kernel32.dll\nEXPORTS\nGetModuleFileNameW\nSetCurrentDirectoryW\nSetEnvironmentVariableW\nGetEnvironmentVariableW\nCreateDirectoryW\nCreateFileW\nCreateProcessW\nWaitForSingleObject\nGetExitCodeProcess\nCloseHandle\nExitProcess\nGetUserDefaultUILanguage\n' > "$TMP/kernel32.def"
printf 'LIBRARY user32.dll\nEXPORTS\nMessageBoxW\n' > "$TMP/user32.def"
llvm-dlltool -m i386:x86-64 -d "$TMP/kernel32.def" -l "$TMP/kernel32.lib"
llvm-dlltool -m i386:x86-64 -d "$TMP/user32.def" -l "$TMP/user32.lib"
cp "$HIER/../../public/img/lancelot.ico" "$TMP/lancelot.ico"
printf '1 ICON "lancelot.ico"\n' > "$TMP/starter.rc"
(cd "$TMP" && llvm-rc /FO starter.res starter.rc)
clang --target=x86_64-pc-windows-msvc -O2 -fno-stack-protector -fno-builtin -ffreestanding -c "$HIER/starter.c" -o "$TMP/starter.obj"
lld-link /nologo /subsystem:windows /entry:start /nodefaultlib /out:"$UIT/LANcelot.exe" "$TMP/starter.obj" "$TMP/starter.res" "$TMP/kernel32.lib" "$TMP/user32.lib"
rm -rf "$TMP"
echo "$UIT/LANcelot.exe"
