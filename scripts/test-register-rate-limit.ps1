param(
  [Parameter(Mandatory = $true)][string]$FunctionUrl,
  [Parameter(Mandatory = $true)][string]$Token,
  [string]$ForwardedFor = '203.0.113.42'
)

$body = @{
  token = $Token
  source = 'home'
  payload = @{
    id = [guid]::NewGuid().ToString()
    full_name = 'Rate Limit Test'
    email = ('rate-limit-' + [guid]::NewGuid().ToString('N').Substring(0, 8) + '@example.test')
    consent = $true
    department_ids = @()
    website = ''
  }
} | ConvertTo-Json -Depth 5

for ($attempt = 1; $attempt -le 6; $attempt++) {
  try {
    $response = Invoke-WebRequest -Uri $FunctionUrl -Method POST -ContentType 'application/json' -Headers @{ 'X-Forwarded-For' = $ForwardedFor } -Body $body -SkipHttpErrorCheck
    Write-Host "Attempt $attempt: $($response.StatusCode)"
    if ($attempt -eq 6 -and $response.StatusCode -ne 429) { throw 'Expected the sixth request to be rate limited.' }
  } catch {
    throw "Attempt $attempt failed: $($_.Exception.Message)"
  }
}
