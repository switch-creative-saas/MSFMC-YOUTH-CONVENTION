param(
  [Parameter(Mandatory = $true)][string]$FunctionUrl,
  [Parameter(Mandatory = $true)][string]$FirstToken,
  [Parameter(Mandatory = $true)][string]$SecondToken
)

$email = 'duplicate-' + [guid]::NewGuid().ToString('N').Substring(0, 8) + '@example.test'
function New-Body([string]$Token) {
  return @{ token = $Token; source = 'home'; payload = @{ id = [guid]::NewGuid().ToString(); full_name = 'Duplicate Email Test'; email = $email; consent = $true; department_ids = @(); website = '' } } | ConvertTo-Json -Depth 5
}

Invoke-RestMethod -Uri $FunctionUrl -Method POST -ContentType 'application/json' -Body (New-Body $FirstToken) | Out-Null
$response = Invoke-WebRequest -Uri $FunctionUrl -Method POST -ContentType 'application/json' -Body (New-Body $SecondToken) -SkipHttpErrorCheck
if ($response.StatusCode -ne 409) { throw "Expected 409 for duplicate email, got $($response.StatusCode)." }
Write-Host 'Duplicate email test passed.'
