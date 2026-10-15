<#
.SYNOPSIS
    Runs the EMI load test in JMeter CLI mode and generates an HTML dashboard.

.DESCRIPTION
    Wraps `jmeter -n` so you never have to remember the flags. Results land in
    performance/results/<timestamp>/ as results.jtl, jmeter.log and an HTML report.

.EXAMPLE
    .\run-load-test.ps1 -Smoke
    One user, 30 seconds, against dev. Always do this before a real run.

.EXAMPLE
    .\run-load-test.ps1 -Threads 50 -RampUp 60 -Duration 600

.EXAMPLE
    .\run-load-test.ps1 -Env uat -Threads 20 -VerifyOtp:$false
#>
[CmdletBinding()]
param(
    [ValidateSet('dev', 'uat', 'preprod')]
    [string] $Env = 'dev',

    [int]    $Threads  = 10,
    [int]    $RampUp   = 30,
    [int]    $Duration = 300,
    [int]    $SlaMs    = 3000,

    # OTP verification only works where the OTP is fixed (dev = 918512).
    # On uat/preprod the OTP is emailed, so pass -VerifyOtp:$false there.
    [bool]   $VerifyOtp = $true,

    # Cap the request rate instead of letting threads run flat out (requests/minute).
    [int]    $TargetRpm = 0,

    # 1 user / 30 seconds - a correctness check, not a load test.
    [switch] $Smoke,

    # Open the HTML dashboard when the run finishes.
    [switch] $Open
)

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path

# ── Locate JMeter ────────────────────────────────────────────────────────────
function Find-JMeter {
    if ($env:JMETER_HOME) {
        $candidate = Join-Path $env:JMETER_HOME 'bin\jmeter.bat'
        if (Test-Path $candidate) { return $candidate }
    }
    $onPath = Get-Command jmeter.bat -ErrorAction SilentlyContinue
    if ($onPath) { return $onPath.Source }
    $onPath = Get-Command jmeter -ErrorAction SilentlyContinue
    if ($onPath) { return $onPath.Source }
    foreach ($root in @($env:ProgramFiles, 'C:\', $env:USERPROFILE)) {
        if (-not $root) { continue }
        $guess = Get-ChildItem -Path $root -Filter 'apache-jmeter-*' -Directory -ErrorAction SilentlyContinue |
                 Sort-Object Name -Descending | Select-Object -First 1
        if ($guess) {
            $candidate = Join-Path $guess.FullName 'bin\jmeter.bat'
            if (Test-Path $candidate) { return $candidate }
        }
    }
    return $null
}

$jmeter = Find-JMeter
if (-not $jmeter) {
    Write-Host ""
    Write-Host "JMeter was not found." -ForegroundColor Red
    Write-Host ""
    Write-Host "  1. Download the binary zip from https://jmeter.apache.org/download_jmeter.cgi"
    Write-Host "  2. Unzip it, e.g. to C:\apache-jmeter-5.6.3"
    Write-Host "  3. Set JMETER_HOME once:"
    Write-Host '     [Environment]::SetEnvironmentVariable("JMETER_HOME", "C:\apache-jmeter-5.6.3", "User")'
    Write-Host "  4. Open a new terminal and run this script again."
    Write-Host ""
    Write-Host "Java is already installed on this machine, so nothing else is needed."
    exit 1
}

# ── Resolve run settings ─────────────────────────────────────────────────────
if ($Smoke) {
    $Threads  = 1
    $RampUp   = 1
    $Duration = 30
}

$host_map = @{
    dev     = 'gateway-dev.majdpay.com'
    uat     = 'gateway-uat.majdpay.com'
    preprod = 'gateway-preprod.majdpay.com'
}
$gatewayHost = $host_map[$Env]

if ($Env -ne 'dev' -and $VerifyOtp) {
    Write-Host "Note: OTP on $Env arrives by email, so the fixed OTP will fail." -ForegroundColor Yellow
    Write-Host "      Disabling the OTP step for this run (-VerifyOtp:`$false)." -ForegroundColor Yellow
    $VerifyOtp = $false
}

$stamp     = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$outDir    = Join-Path $here "results\$stamp"
$reportDir = Join-Path $outDir 'html-report'
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

$jmx      = Join-Path $here 'EMI-Load-Test.jmx'
$usersCsv = Join-Path $here 'data\users.csv'
$jtl      = Join-Path $outDir 'results.jtl'
$logFile  = Join-Path $outDir 'jmeter.log'

$jmeterArgs = @(
    '-n',
    '-t', $jmx,
    '-l', $jtl,
    '-j', $logFile,
    '-e', '-o', $reportDir,
    "-Jhost=$gatewayHost",
    "-Jthreads=$Threads",
    "-Jrampup=$RampUp",
    "-Jduration=$Duration",
    "-Jsla_ms=$SlaMs",
    "-Jverify_otp=$($VerifyOtp.ToString().ToLower())",
    "-Jusers_csv=$usersCsv"
)
if ($TargetRpm -gt 0) { $jmeterArgs += "-Jtarget_rpm=$TargetRpm" }

Write-Host ""
Write-Host "EMI Load Test" -ForegroundColor Cyan
Write-Host "  environment : $Env ($gatewayHost)"
Write-Host "  users       : $Threads   ramp-up: ${RampUp}s   duration: ${Duration}s"
Write-Host "  verify OTP  : $VerifyOtp"
Write-Host "  results     : $outDir"
Write-Host ""

& $jmeter @jmeterArgs
$exitCode = $LASTEXITCODE

Write-Host ""
if (Test-Path $jtl) {
    $rows    = Import-Csv $jtl
    $total   = $rows.Count
    $failed  = @($rows | Where-Object { $_.success -ne 'true' }).Count
    if ($total -gt 0) {
        $elapsed = $rows | ForEach-Object { [int]$_.elapsed } | Sort-Object
        $avg     = [math]::Round(($elapsed | Measure-Object -Average).Average, 0)
        $p95     = $elapsed[[math]::Floor($elapsed.Count * 0.95)]
        $errPct  = [math]::Round(100 * $failed / $total, 2)

        Write-Host "Summary" -ForegroundColor Cyan
        Write-Host "  samples : $total"
        Write-Host "  errors  : $failed ($errPct%)"
        Write-Host "  avg     : ${avg} ms"
        Write-Host "  p95     : ${p95} ms"
    }
}
Write-Host ""
Write-Host "HTML report: $reportDir\index.html"

if ($Open -and (Test-Path "$reportDir\index.html")) {
    Start-Process "$reportDir\index.html"
}

exit $exitCode
