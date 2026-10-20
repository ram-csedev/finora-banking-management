const { execSync } = require('child_process');

try {
  const handleOut = execSync('powershell -Command "Get-CimInstance Win32_Process -Filter \\"ProcessId = 33136\\" | Select-Object -Property ProcessId, CommandLine, ParentProcessId | Format-List"').toString();
  console.log(handleOut);
} catch (e) {
  console.error(e);
}
